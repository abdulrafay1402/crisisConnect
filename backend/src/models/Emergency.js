const { query } = require('../config/database');

class Emergency {
  static _hasDisasterColumn = null;

  static async hasDisasterColumn() {
    if (Emergency._hasDisasterColumn !== null) return Emergency._hasDisasterColumn;
    const r = await query(`SELECT 1 as ok
      FROM sys.columns
      WHERE object_id = OBJECT_ID('Emergency') AND name = 'disasterID'`);
    Emergency._hasDisasterColumn = r.recordset.length > 0;
    return Emergency._hasDisasterColumn;
  }

  static async generateNextId() {
    const r = await query('SELECT TOP 1 emergencyID FROM Emergency ORDER BY emergencyID DESC');
    if (r.recordset.length === 0) return 'EMG001';
    const num = parseInt(r.recordset[0].emergencyID.substring(3)) + 1;
    return `EMG${num.toString().padStart(3, '0')}`;
  }
  static async findById(emergencyID) {
    const r = await query('SELECT * FROM Emergency WHERE emergencyID = @emergencyID', { emergencyID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query(`SELECT e.*, c.name as citizenName, rt.teamName
      FROM Emergency e
      LEFT JOIN Citizen c ON e.citizenID = c.citizenID
      LEFT JOIN RescueTeam rt ON e.assignedTeamID = rt.teamID
      ORDER BY e.[timestamp] DESC`);
    return r.recordset;
  }
  static async findPending() {
    const r = await query(`SELECT e.*, c.name as citizenName, rt.teamName
      FROM Emergency e
      LEFT JOIN Citizen c ON e.citizenID = c.citizenID
      LEFT JOIN RescueTeam rt ON e.assignedTeamID = rt.teamID
      WHERE e.status = 'Pending' ORDER BY e.[timestamp] DESC`);
    return r.recordset;
  }
  static async findByCitizen(citizenID) {
    const r = await query('SELECT * FROM Emergency WHERE citizenID = @citizenID ORDER BY [timestamp] DESC', { citizenID });
    return r.recordset;
  }
  static async findByTeam(teamID) {
    const r = await query(`SELECT DISTINCT e.*, c.name as citizenName, rt.teamName
      FROM Emergency e
      LEFT JOIN Citizen c ON e.citizenID = c.citizenID
      LEFT JOIN RescueTeam rt ON e.assignedTeamID = rt.teamID
      LEFT JOIN EmergencyTeamAssignment eta ON eta.emergencyID = e.emergencyID
      WHERE e.assignedTeamID = @teamID OR eta.teamID = @teamID
      ORDER BY e.[timestamp] DESC`, { teamID });
    return r.recordset;
  }
  static async findByNGO(ngoID) {
    const r = await query(`SELECT DISTINCT e.*, c.name as citizenName, rt.teamName
      FROM Emergency e
      LEFT JOIN Citizen c ON e.citizenID = c.citizenID
      LEFT JOIN RescueTeam rt ON e.assignedTeamID = rt.teamID
      LEFT JOIN EmergencyNGOAssignment ena ON ena.emergencyID = e.emergencyID
      WHERE ena.ngoID = @ngoID
      ORDER BY e.[timestamp] DESC`, { ngoID });
    return r.recordset;
  }
  static async insert(e) {
    const emergencyID = e.emergencyID || await Emergency.generateNextId();
    const hasGPS = e.latitude != null && e.longitude != null;
    const hasDisasterColumn = await Emergency.hasDisasterColumn();
    if (hasGPS) {
      await query(
        hasDisasterColumn
          ? `INSERT INTO Emergency (emergencyID,citizenID,location,latitude,longitude,emergencyType,description,disasterID,[timestamp],status)
             VALUES (@emergencyID,@citizenID,@location,@latitude,@longitude,@emergencyType,@description,@disasterID,GETDATE(),'Pending')`
          : `INSERT INTO Emergency (emergencyID,citizenID,location,latitude,longitude,emergencyType,description,[timestamp],status)
             VALUES (@emergencyID,@citizenID,@location,@latitude,@longitude,@emergencyType,@description,GETDATE(),'Pending')`,
        hasDisasterColumn
          ? { emergencyID, citizenID: e.citizenID, location: e.location,
              latitude: parseFloat(e.latitude), longitude: parseFloat(e.longitude),
              emergencyType: e.emergencyType, description: e.description || null,
              disasterID: e.disasterID || null }
          : { emergencyID, citizenID: e.citizenID, location: e.location,
              latitude: parseFloat(e.latitude), longitude: parseFloat(e.longitude),
              emergencyType: e.emergencyType, description: e.description || null }
      );
    } else {
      await query(
        hasDisasterColumn
          ? `INSERT INTO Emergency (emergencyID,citizenID,location,emergencyType,description,disasterID,[timestamp],status)
             VALUES (@emergencyID,@citizenID,@location,@emergencyType,@description,@disasterID,GETDATE(),'Pending')`
          : `INSERT INTO Emergency (emergencyID,citizenID,location,emergencyType,description,[timestamp],status)
             VALUES (@emergencyID,@citizenID,@location,@emergencyType,@description,GETDATE(),'Pending')`,
        hasDisasterColumn
          ? { emergencyID, citizenID: e.citizenID, location: e.location,
              emergencyType: e.emergencyType, description: e.description || null,
              disasterID: e.disasterID || null }
          : { emergencyID, citizenID: e.citizenID, location: e.location,
              emergencyType: e.emergencyType, description: e.description || null }
      );
    }
    return emergencyID;
  }
  static async assignTeam(emergencyID, teamID) {
    await query("UPDATE Emergency SET assignedTeamID = @teamID, status = 'Assigned', responseTime = GETDATE() WHERE emergencyID = @emergencyID", { emergencyID, teamID });
  }
  static async setPrimaryTeam(emergencyID, teamID) {
    await query('UPDATE Emergency SET assignedTeamID = @teamID WHERE emergencyID = @emergencyID', { emergencyID, teamID: teamID || null });
  }
  static async resolve(emergencyID) {
    await query("UPDATE Emergency SET status = 'Resolved', resolvedTime = GETDATE() WHERE emergencyID = @emergencyID", { emergencyID });
  }
  static async updateStatus(emergencyID, status) {
    await query('UPDATE Emergency SET status = @status WHERE emergencyID = @emergencyID', { emergencyID, status });
  }
  static async delete(emergencyID) {
    await query('DELETE FROM Emergency WHERE emergencyID = @emergencyID', { emergencyID });
  }
}

module.exports = Emergency;
