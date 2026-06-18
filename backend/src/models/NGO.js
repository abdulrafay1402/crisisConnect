const { query } = require('../config/database');

class NGO {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 ngoID FROM NGO ORDER BY ngoID DESC');
    if (r.recordset.length === 0) return 'NGO001';
    const num = parseInt(r.recordset[0].ngoID.substring(3)) + 1;
    return `NGO${num.toString().padStart(3, '0')}`;
  }
  static async findById(ngoID) {
    const r = await query('SELECT * FROM NGO WHERE ngoID = @ngoID', { ngoID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT * FROM NGO ORDER BY registrationDate DESC');
    return r.recordset;
  }
  static async findAvailable() {
    const r = await query("SELECT * FROM NGO WHERE status = 'Available' AND isActive = 1");
    return r.recordset;
  }
  static async findByUsername(username) {
    const r = await query('SELECT * FROM NGO WHERE username = @username', { username });
    return r.recordset[0] || null;
  }
  static async findByRegistrationNumber(registrationNumber) {
    const r = await query('SELECT * FROM NGO WHERE registrationNumber = @registrationNumber', { registrationNumber });
    return r.recordset[0] || null;
  }
  static async insert(n) {
    const ngoID = n.ngoID || await NGO.generateNextId();
    await query(`INSERT INTO NGO (ngoID,ngoName,registrationNumber,contactNumber,email,address,city,focusArea,status,username,password,registrationDate,isActive)
      VALUES (@ngoID,@ngoName,@registrationNumber,@contactNumber,@email,@address,@city,@focusArea,'Pending',@username,@password,GETDATE(),0)`,
      { ngoID, ngoName: n.ngoName, registrationNumber: n.registrationNumber, contactNumber: n.contactNumber, email: n.email, address: n.address, city: n.city, focusArea: n.focusArea, username: n.username, password: n.password });
    return ngoID;
  }
  static async update(n) {
    await query(`UPDATE NGO SET ngoName=@ngoName,contactNumber=@contactNumber,email=@email,address=@address,city=@city,focusArea=@focusArea,isActive=@isActive WHERE ngoID=@ngoID`,
      { ngoID: n.ngoID, ngoName: n.ngoName, contactNumber: n.contactNumber, email: n.email, address: n.address, city: n.city, focusArea: n.focusArea, isActive: n.isActive });
  }
  static async updateStatus(ngoID, status) {
    await query('UPDATE NGO SET status = @status WHERE ngoID = @ngoID', { ngoID, status });
  }
  static async approve(ngoID, approvedBy) {
    await query('UPDATE NGO SET isActive = 1, status = @status, approvedBy = @approvedBy, approvalDate = GETDATE() WHERE ngoID = @ngoID',
      { ngoID, status: 'Available', approvedBy: approvedBy || null });
  }
  static async reject(ngoID) {
    await query('UPDATE NGO SET isActive = 0, status = @status WHERE ngoID = @ngoID',
      { ngoID, status: 'Rejected' });
  }
  static async delete(ngoID) {
    await query('DELETE FROM NGO WHERE ngoID = @ngoID', { ngoID });
  }
  static async updatePassword(ngoID, password) {
    await query('UPDATE NGO SET password = @password WHERE ngoID = @ngoID', { ngoID, password });
  }
  static async getStats() {
    const r = await query('SELECT status, isActive FROM NGO');
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

module.exports = NGO;
