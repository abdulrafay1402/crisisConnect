const { query } = require('../config/database');

class DisasterAssignment {
  // ── Team Assignments ────────────────────────────────────────────
  static async generateTeamAssignmentId() {
    const r = await query('SELECT TOP 1 assignmentID FROM DisasterTeamAssignment ORDER BY assignmentID DESC');
    if (r.recordset.length === 0) return 'DTA001';
    const num = parseInt(r.recordset[0].assignmentID.substring(3)) + 1;
    return `DTA${num.toString().padStart(3, '0')}`;
  }

  static async getTeamsForDisaster(disasterID) {
    const r = await query(
      `SELECT dta.*, rt.teamName, rt.specialization, rt.teamSize, rt.status as teamStatus, a.name as assignedByName
       FROM DisasterTeamAssignment dta
       LEFT JOIN RescueTeam rt ON dta.teamID = rt.teamID
       LEFT JOIN Admin a ON dta.assignedBy = a.adminID
       WHERE dta.disasterID = @disasterID ORDER BY dta.assignedDate DESC`,
      { disasterID }
    );
    return r.recordset;
  }

  static async assignTeam(disasterID, teamID, role, assignedBy, notes) {
    const exists = await query(
      'SELECT 1 FROM DisasterTeamAssignment WHERE disasterID = @disasterID AND teamID = @teamID',
      { disasterID, teamID }
    );
    if (exists.recordset.length > 0) {
      return null;
    }

    const assignmentID = await DisasterAssignment.generateTeamAssignmentId();
    await query(
      `INSERT INTO DisasterTeamAssignment (assignmentID, disasterID, teamID, role, assignedBy, notes)
       VALUES (@assignmentID, @disasterID, @teamID, @role, @assignedBy, @notes)`,
      { assignmentID, disasterID, teamID, role: role || 'Rescue', assignedBy: assignedBy || null, notes: notes || null }
    );
    return assignmentID;
  }

  static async removeTeamAssignment(assignmentID) {
    await query('DELETE FROM DisasterTeamAssignment WHERE assignmentID = @assignmentID', { assignmentID });
  }

  static async removeTeamFromDisaster(disasterID, teamID) {
    await query('DELETE FROM DisasterTeamAssignment WHERE disasterID = @disasterID AND teamID = @teamID', { disasterID, teamID });
  }

  // ── NGO Assignments ────────────────────────────────────────────
  static async generateNGOAssignmentId() {
    const r = await query('SELECT TOP 1 assignmentID FROM DisasterNGOAssignment ORDER BY assignmentID DESC');
    if (r.recordset.length === 0) return 'DNA001';
    const num = parseInt(r.recordset[0].assignmentID.substring(3)) + 1;
    return `DNA${num.toString().padStart(3, '0')}`;
  }

  static async getNGOsForDisaster(disasterID) {
    const r = await query(
      `SELECT dna.*, n.ngoName, n.focusArea, n.status as ngoStatus, a.name as assignedByName
       FROM DisasterNGOAssignment dna
       LEFT JOIN NGO n ON dna.ngoID = n.ngoID
       LEFT JOIN Admin a ON dna.assignedBy = a.adminID
       WHERE dna.disasterID = @disasterID ORDER BY dna.assignedDate DESC`,
      { disasterID }
    );
    return r.recordset;
  }

  static async assignNGO(disasterID, ngoID, role, assignedBy, notes) {
    const exists = await query(
      'SELECT 1 FROM DisasterNGOAssignment WHERE disasterID = @disasterID AND ngoID = @ngoID',
      { disasterID, ngoID }
    );
    if (exists.recordset.length > 0) {
      return null;
    }

    const assignmentID = await DisasterAssignment.generateNGOAssignmentId();
    await query(
      `INSERT INTO DisasterNGOAssignment (assignmentID, disasterID, ngoID, role, assignedBy, notes)
       VALUES (@assignmentID, @disasterID, @ngoID, @role, @assignedBy, @notes)`,
      { assignmentID, disasterID, ngoID, role: role || 'Relief', assignedBy: assignedBy || null, notes: notes || null }
    );
    return assignmentID;
  }

  static async removeNGOAssignment(assignmentID) {
    await query('DELETE FROM DisasterNGOAssignment WHERE assignmentID = @assignmentID', { assignmentID });
  }

  static async removeNGOFromDisaster(disasterID, ngoID) {
    await query('DELETE FROM DisasterNGOAssignment WHERE disasterID = @disasterID AND ngoID = @ngoID', { disasterID, ngoID });
  }

  // ── Combined ────────────────────────────────────────────────────
  static async getAllForDisaster(disasterID) {
    const teams = await DisasterAssignment.getTeamsForDisaster(disasterID);
    const ngos = await DisasterAssignment.getNGOsForDisaster(disasterID);
    return { teams, ngos };
  }
}

module.exports = DisasterAssignment;
