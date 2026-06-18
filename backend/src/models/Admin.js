const { query } = require('../config/database');

class Admin {
  static async generateNextId() {
    const result = await query('SELECT TOP 1 adminID FROM Admin ORDER BY adminID DESC');
    if (result.recordset.length === 0) return 'ADM001';
    const num = parseInt(result.recordset[0].adminID.substring(3)) + 1;
    return `ADM${num.toString().padStart(3, '0')}`;
  }
  static async findById(adminID) {
    const r = await query('SELECT * FROM Admin WHERE adminID = @adminID', { adminID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT * FROM Admin ORDER BY createdDate DESC');
    return r.recordset;
  }
  static async findByUsername(username) {
    const r = await query('SELECT * FROM Admin WHERE username = @username', { username });
    return r.recordset[0] || null;
  }
  static async insert(a) {
    const adminID = a.adminID || await Admin.generateNextId();
    await query(`INSERT INTO Admin (adminID,name,username,password,role,email,contactNumber,createdDate,isActive)
      VALUES (@adminID,@name,@username,@password,@role,@email,@contactNumber,GETDATE(),1)`,
      { adminID, name: a.name, username: a.username, password: a.password, role: a.role || 'Admin', email: a.email, contactNumber: a.contactNumber });
    return adminID;
  }
  static async update(a) {
    await query(`UPDATE Admin SET name=@name,email=@email,contactNumber=@contactNumber,isActive=@isActive WHERE adminID=@adminID`,
      { adminID: a.adminID, name: a.name, email: a.email, contactNumber: a.contactNumber, isActive: a.isActive });
  }
  static async delete(adminID) {
    await query('DELETE FROM Admin WHERE adminID = @adminID', { adminID });
  }
  static async updateLastLogin(adminID) {
    await query('UPDATE Admin SET lastLogin = GETDATE() WHERE adminID = @adminID', { adminID });
  }
  static async updatePassword(adminID, password) {
    await query('UPDATE Admin SET password = @password WHERE adminID = @adminID', { adminID, password });
  }
}

module.exports = Admin;
