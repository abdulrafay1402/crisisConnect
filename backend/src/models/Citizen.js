const { query } = require('../config/database');

class Citizen {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 citizenID FROM Citizen ORDER BY citizenID DESC');
    if (r.recordset.length === 0) return 'CIT001';
    const num = parseInt(r.recordset[0].citizenID.substring(3)) + 1;
    return `CIT${num.toString().padStart(3, '0')}`;
  }
  static async findById(citizenID) {
    const r = await query('SELECT * FROM Citizen WHERE citizenID = @citizenID', { citizenID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT * FROM Citizen ORDER BY registrationDate DESC');
    return r.recordset;
  }
  static async findByUsername(username) {
    const r = await query('SELECT * FROM Citizen WHERE username = @username', { username });
    return r.recordset[0] || null;
  }
  static async findByCnic(cnic) {
    const r = await query('SELECT * FROM Citizen WHERE cnic = @cnic', { cnic });
    return r.recordset[0] || null;
  }
  static async insert(c) {
    const citizenID = c.citizenID || await Citizen.generateNextId();
    await query(`INSERT INTO Citizen (citizenID,name,cnic,contactNumber,email,address,city,dateOfBirth,username,password,registrationDate,isActive)
      VALUES (@citizenID,@name,@cnic,@contactNumber,@email,@address,@city,@dateOfBirth,@username,@password,GETDATE(),1)`,
      { citizenID, name: c.name, cnic: c.cnic, contactNumber: c.contactNumber, email: c.email, address: c.address, city: c.city, dateOfBirth: c.dateOfBirth || null, username: c.username, password: c.password });
    return citizenID;
  }
  static async update(c) {
    await query(`UPDATE Citizen SET name=@name,contactNumber=@contactNumber,email=@email,address=@address,city=@city,isActive=@isActive WHERE citizenID=@citizenID`,
      { citizenID: c.citizenID, name: c.name, contactNumber: c.contactNumber, email: c.email, address: c.address, city: c.city, isActive: c.isActive });
  }
  static async delete(citizenID) {
    await query('DELETE FROM Citizen WHERE citizenID = @citizenID', { citizenID });
  }
  static async updatePassword(citizenID, password) {
    await query('UPDATE Citizen SET password = @password WHERE citizenID = @citizenID', { citizenID, password });
  }
}

module.exports = Citizen;
