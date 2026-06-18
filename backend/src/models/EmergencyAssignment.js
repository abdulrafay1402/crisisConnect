const { query } = require('../config/database');

class EmergencyAssignment {
  static async createTables() {
    await query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EmergencyTeamAssignment' AND xtype='U')
      CREATE TABLE EmergencyTeamAssignment (
        assignmentID VARCHAR(10) PRIMARY KEY,
        emergencyID VARCHAR(10) NOT NULL,
        teamID VARCHAR(10) NOT NULL,
        role VARCHAR(50) NULL,
        assignedBy VARCHAR(10) NULL,
        notes NVARCHAR(500) NULL,
        assignedDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_EmergencyTeam UNIQUE (emergencyID, teamID)
      )
    `);

    await query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EmergencyNGOAssignment' AND xtype='U')
      CREATE TABLE EmergencyNGOAssignment (
        assignmentID VARCHAR(10) PRIMARY KEY,
        emergencyID VARCHAR(10) NOT NULL,
        ngoID VARCHAR(10) NOT NULL,
        role VARCHAR(50) NULL,
        assignedBy VARCHAR(10) NULL,
        notes NVARCHAR(500) NULL,
        assignedDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_EmergencyNGO UNIQUE (emergencyID, ngoID)
      )
    `);
  }

  static async generateTeamAssignmentId() {
    const r = await query('SELECT TOP 1 assignmentID FROM EmergencyTeamAssignment ORDER BY assignmentID DESC');
    if (r.recordset.length === 0) return 'ETA001';
    const num = parseInt(r.recordset[0].assignmentID.substring(3), 10) + 1;
    return `ETA${String(num).padStart(3, '0')}`;
  }

  static async generateNGOAssignmentId() {
    const r = await query('SELECT TOP 1 assignmentID FROM EmergencyNGOAssignment ORDER BY assignmentID DESC');
    if (r.recordset.length === 0) return 'ENA001';
    const num = parseInt(r.recordset[0].assignmentID.substring(3), 10) + 1;
    return `ENA${String(num).padStart(3, '0')}`;
  }

  static async getTeamsForEmergency(emergencyID) {
    const r = await query(
      `SELECT eta.*, rt.teamName, rt.specialization, rt.teamSize
       FROM EmergencyTeamAssignment eta
       LEFT JOIN RescueTeam rt ON rt.teamID = eta.teamID
       WHERE eta.emergencyID = @emergencyID
       ORDER BY eta.assignedDate DESC`,
      { emergencyID }
    );
    return r.recordset;
  }

  static async getNGOsForEmergency(emergencyID) {
    const r = await query(
      `SELECT ena.*, n.ngoName, n.focusArea
       FROM EmergencyNGOAssignment ena
       LEFT JOIN NGO n ON n.ngoID = ena.ngoID
       WHERE ena.emergencyID = @emergencyID
       ORDER BY ena.assignedDate DESC`,
      { emergencyID }
    );
    return r.recordset;
  }

  static async getAllForEmergency(emergencyID) {
    const [teams, ngos] = await Promise.all([
      EmergencyAssignment.getTeamsForEmergency(emergencyID),
      EmergencyAssignment.getNGOsForEmergency(emergencyID)
    ]);
    return { teams, ngos };
  }

  static async assignTeam(emergencyID, teamID, role, assignedBy, notes) {
    const exists = await query(
      'SELECT 1 FROM EmergencyTeamAssignment WHERE emergencyID = @emergencyID AND teamID = @teamID',
      { emergencyID, teamID }
    );
    if (exists.recordset.length > 0) {
      return null;
    }

    const assignmentID = await EmergencyAssignment.generateTeamAssignmentId();
    await query(
      `INSERT INTO EmergencyTeamAssignment (assignmentID, emergencyID, teamID, role, assignedBy, notes)
       VALUES (@assignmentID, @emergencyID, @teamID, @role, @assignedBy, @notes)`,
      { assignmentID, emergencyID, teamID, role: role || 'Response', assignedBy: assignedBy || null, notes: notes || null }
    );
    return assignmentID;
  }

  static async assignNGO(emergencyID, ngoID, role, assignedBy, notes) {
    const exists = await query(
      'SELECT 1 FROM EmergencyNGOAssignment WHERE emergencyID = @emergencyID AND ngoID = @ngoID',
      { emergencyID, ngoID }
    );
    if (exists.recordset.length > 0) {
      return null;
    }

    const assignmentID = await EmergencyAssignment.generateNGOAssignmentId();
    await query(
      `INSERT INTO EmergencyNGOAssignment (assignmentID, emergencyID, ngoID, role, assignedBy, notes)
       VALUES (@assignmentID, @emergencyID, @ngoID, @role, @assignedBy, @notes)`,
      { assignmentID, emergencyID, ngoID, role: role || 'Relief', assignedBy: assignedBy || null, notes: notes || null }
    );
    return assignmentID;
  }

  static async removeTeamFromEmergency(emergencyID, teamID) {
    await query(
      'DELETE FROM EmergencyTeamAssignment WHERE emergencyID = @emergencyID AND teamID = @teamID',
      { emergencyID, teamID }
    );
  }

  static async removeNGOFromEmergency(emergencyID, ngoID) {
    await query(
      'DELETE FROM EmergencyNGOAssignment WHERE emergencyID = @emergencyID AND ngoID = @ngoID',
      { emergencyID, ngoID }
    );
  }
}

module.exports = EmergencyAssignment;
