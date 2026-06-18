const { query } = require('../config/database');

class Disaster {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 disasterID FROM Disaster ORDER BY disasterID DESC');
    if (r.recordset.length === 0) return 'DIS001';
    const num = parseInt(r.recordset[0].disasterID.substring(3)) + 1;
    return `DIS${num.toString().padStart(3, '0')}`;
  }
  static async findById(disasterID) {
    const r = await query('SELECT * FROM Disaster WHERE disasterID = @disasterID', { disasterID });
    return r.recordset[0] || null;
  }
  static async findAll(filters = {}) {
    let q = 'SELECT * FROM Disaster WHERE 1=1';
    const params = {};
    if (filters.status) { q += ' AND status = @status'; params.status = filters.status; }
    if (filters.type) { q += ' AND type = @type'; params.type = filters.type; }
    if (filters.severity) { q += ' AND severity = @severity'; params.severity = filters.severity; }
    if (filters.city) { q += ' AND location LIKE @city'; params.city = `%${filters.city}%`; }
    q += ' ORDER BY reportedDate DESC';
    const r = await query(q, params);
    return r.recordset;
  }
  static async findActive() {
    const r = await query("SELECT * FROM Disaster WHERE status IN ('Reported','Active','Under Control') ORDER BY reportedDate DESC");
    return r.recordset;
  }
  static async insert(d) {
    const disasterID = d.disasterID || await Disaster.generateNextId();
    const hasGPS = d.latitude != null && d.longitude != null;
    await query(
      hasGPS
        ? `INSERT INTO Disaster (disasterID,type,location,latitude,longitude,severity,status,reportedDate,description,affectedArea,estimatedCasualties,estimatedDamage,reportedByType,reportedByID)
           VALUES (@disasterID,@type,@location,@latitude,@longitude,@severity,'Reported',GETDATE(),@description,@affectedArea,@estimatedCasualties,@estimatedDamage,@reportedByType,@reportedByID)`
        : `INSERT INTO Disaster (disasterID,type,location,severity,status,reportedDate,description,affectedArea,estimatedCasualties,estimatedDamage,reportedByType,reportedByID)
           VALUES (@disasterID,@type,@location,@severity,'Reported',GETDATE(),@description,@affectedArea,@estimatedCasualties,@estimatedDamage,@reportedByType,@reportedByID)`,
      hasGPS
        ? {
            disasterID,
            type: d.type,
            location: d.location,
            latitude: parseFloat(d.latitude),
            longitude: parseFloat(d.longitude),
            severity: d.severity,
            description: d.description || null,
            affectedArea: d.affectedArea || null,
            estimatedCasualties: d.estimatedCasualties || 0,
            estimatedDamage: d.estimatedDamage || null,
            reportedByType: d.reportedByType,
            reportedByID: d.reportedByID
          }
        : {
            disasterID,
            type: d.type,
            location: d.location,
            severity: d.severity,
            description: d.description || null,
            affectedArea: d.affectedArea || null,
            estimatedCasualties: d.estimatedCasualties || 0,
            estimatedDamage: d.estimatedDamage || null,
            reportedByType: d.reportedByType,
            reportedByID: d.reportedByID
          }
    );
    return disasterID;
  }
  static async update(d) {
    await query(`UPDATE Disaster SET type=@type,location=@location,latitude=@latitude,longitude=@longitude,severity=@severity,status=@status,description=@description,affectedArea=@affectedArea,estimatedCasualties=@estimatedCasualties,estimatedDamage=@estimatedDamage WHERE disasterID=@disasterID`,
      { disasterID: d.disasterID, type: d.type, location: d.location, latitude: d.latitude, longitude: d.longitude, severity: d.severity, status: d.status, description: d.description, affectedArea: d.affectedArea, estimatedCasualties: d.estimatedCasualties, estimatedDamage: d.estimatedDamage });
  }
  static async assignTeam(disasterID, teamID) {
    await query('UPDATE Disaster SET assignedTeamID = @teamID WHERE disasterID = @disasterID', { disasterID, teamID });
  }
  static async assignNGO(disasterID, ngoID) {
    await query('UPDATE Disaster SET assignedNGOID = @ngoID WHERE disasterID = @disasterID', { disasterID, ngoID });
  }
  static async resolve(disasterID) {
    await query("UPDATE Disaster SET status = 'Resolved', resolvedDate = GETDATE() WHERE disasterID = @disasterID", { disasterID });
  }
  static async updateStatus(disasterID, status) {
    await query('UPDATE Disaster SET status = @status WHERE disasterID = @disasterID', { disasterID, status });
  }
  static async delete(disasterID) {
    await query('DELETE FROM Disaster WHERE disasterID = @disasterID', { disasterID });
  }
  static async getStats() {
    const r = await query('SELECT status, severity FROM Disaster');
    const rows = r.recordset || [];
    const stats = { total: rows.length, active: 0, resolved: 0, critical: 0 };

    for (const row of rows) {
      if (['Reported', 'Active', 'Under Control'].includes(row.status)) stats.active += 1;
      if (row.status === 'Resolved') stats.resolved += 1;
      if (row.severity === 'Critical') stats.critical += 1;
    }

    return stats;
  }
  static async getByType() {
    const r = await query('SELECT type, COUNT(*) as count FROM Disaster GROUP BY type ORDER BY count DESC');
    return r.recordset;
  }
  static async findByReporter(reportedByType, reportedByID) {
    const r = await query('SELECT * FROM Disaster WHERE reportedByType = @reportedByType AND reportedByID = @reportedByID ORDER BY reportedDate DESC', { reportedByType, reportedByID });
    return r.recordset;
  }
  static async findAssignedForTeam(teamID) {
    const r = await query(
      `SELECT DISTINCT d.*, dta.role, dta.notes, dta.assignedDate
       FROM Disaster d
       LEFT JOIN DisasterTeamAssignment dta
         ON d.disasterID = dta.disasterID
        AND dta.teamID = @teamID
       WHERE d.assignedTeamID = @teamID
          OR dta.teamID IS NOT NULL
       ORDER BY d.reportedDate DESC`,
      { teamID }
    );
    return r.recordset;
  }
  static async findAssignedForNGO(ngoID) {
    const r = await query(
      `SELECT DISTINCT d.*, dna.role, dna.notes, dna.assignedDate
       FROM Disaster d
       LEFT JOIN DisasterNGOAssignment dna
         ON d.disasterID = dna.disasterID
        AND dna.ngoID = @ngoID
       WHERE d.assignedNGOID = @ngoID
          OR dna.ngoID IS NOT NULL
       ORDER BY d.reportedDate DESC`,
      { ngoID }
    );
    return r.recordset;
  }
}

module.exports = Disaster;
