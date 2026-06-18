const { query } = require('../config/database');

class RescueTeam {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 teamID FROM RescueTeam ORDER BY teamID DESC');
    if (r.recordset.length === 0) return 'RT001';
    const num = parseInt(r.recordset[0].teamID.substring(2)) + 1;
    return `RT${num.toString().padStart(3, '0')}`;
  }
  static async findById(teamID) {
    const r = await query('SELECT * FROM RescueTeam WHERE teamID = @teamID', { teamID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT * FROM RescueTeam ORDER BY registrationDate DESC');
    return r.recordset;
  }
  static async findAvailable() {
    const r = await query("SELECT * FROM RescueTeam WHERE status = 'Available' AND isActive = 1");
    return r.recordset;
  }
  static async findByUsername(username) {
    const r = await query('SELECT * FROM RescueTeam WHERE username = @username', { username });
    return r.recordset[0] || null;
  }
  static async insert(t) {
    const teamID = t.teamID || await RescueTeam.generateNextId();
    await query(`INSERT INTO RescueTeam (teamID,teamName,specialization,teamSize,contactNumber,email,location,city,status,username,password,registrationDate,isActive)
      VALUES (@teamID,@teamName,@specialization,@teamSize,@contactNumber,@email,@location,@city,'Pending',@username,@password,GETDATE(),0)`,
      { teamID, teamName: t.teamName, specialization: t.specialization, teamSize: t.teamSize || 5, contactNumber: t.contactNumber, email: t.email, location: t.location, city: t.city, username: t.username, password: t.password });
    return teamID;
  }
  static async update(t) {
    await query(`UPDATE RescueTeam SET teamName=@teamName,specialization=@specialization,teamSize=@teamSize,contactNumber=@contactNumber,email=@email,location=@location,city=@city,isActive=@isActive WHERE teamID=@teamID`,
      { teamID: t.teamID, teamName: t.teamName, specialization: t.specialization, teamSize: t.teamSize, contactNumber: t.contactNumber, email: t.email, location: t.location, city: t.city, isActive: t.isActive });
  }
  static async updateStatus(teamID, status) {
    await query('UPDATE RescueTeam SET status = @status WHERE teamID = @teamID', { teamID, status });
  }
  static async approve(teamID, approvedBy) {
    await query('UPDATE RescueTeam SET isActive = 1, status = @status, approvedBy = @approvedBy, approvalDate = GETDATE() WHERE teamID = @teamID',
      { teamID, status: 'Available', approvedBy: approvedBy || null });
  }
  static async reject(teamID) {
    await query('UPDATE RescueTeam SET isActive = 0, status = @status WHERE teamID = @teamID',
      { teamID, status: 'Inactive' });
  }
  static async delete(teamID) {
    await query('DELETE FROM RescueTeam WHERE teamID = @teamID', { teamID });
  }
  static async updatePassword(teamID, password) {
    await query('UPDATE RescueTeam SET password = @password WHERE teamID = @teamID', { teamID, password });
  }
  static async getStats() {
    const r = await query('SELECT status, isActive FROM RescueTeam');
    const rows = r.recordset || [];
    let available = 0;
    let deployed = 0;
    let active = 0;

    for (const row of rows) {
      if (row.status === 'Available') available += 1;
      if (row.status === 'Deployed') deployed += 1;
      if (row.isActive) active += 1;
    }

    return { total: rows.length, available, deployed, active };
  }
}

module.exports = RescueTeam;
