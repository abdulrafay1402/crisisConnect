const { query } = require('../config/database');

class EmergencyContact {
  static async generateNextId() {
    const r = await query('SELECT TOP 1 contactID FROM EmergencyContact ORDER BY contactID DESC');
    if (r.recordset.length === 0) return 'EC001';
    const num = parseInt(r.recordset[0].contactID.substring(2)) + 1;
    return `EC${num.toString().padStart(3, '0')}`;
  }
  static async findById(contactID) {
    const r = await query('SELECT * FROM EmergencyContact WHERE contactID = @contactID', { contactID });
    return r.recordset[0] || null;
  }
  static async findAll() {
    const r = await query('SELECT * FROM EmergencyContact ORDER BY serviceName');
    return r.recordset;
  }
  static async findByCity(city) {
    const r = await query('SELECT * FROM EmergencyContact WHERE city = @city ORDER BY serviceName', { city });
    return r.recordset;
  }
  static async findByService(serviceName) {
    const r = await query('SELECT * FROM EmergencyContact WHERE serviceName LIKE @serviceName ORDER BY city', { serviceName: `%${serviceName}%` });
    return r.recordset;
  }
  static async insert(c) {
    const contactID = c.contactID || await EmergencyContact.generateNextId();
    await query(`INSERT INTO EmergencyContact (contactID,serviceName,contactNumber,city,isActive)
      VALUES (@contactID,@serviceName,@contactNumber,@city,1)`,
      { contactID, serviceName: c.serviceName, contactNumber: c.contactNumber || c.phoneNumber, city: c.city || null });
    return contactID;
  }
  static async update(contactID, c) {
    await query(`UPDATE EmergencyContact SET serviceName=@serviceName, contactNumber=@contactNumber, city=@city, isActive=@isActive WHERE contactID = @contactID`,
      { contactID, serviceName: c.serviceName, contactNumber: c.contactNumber || c.phoneNumber, city: c.city || null, isActive: c.isActive !== undefined ? c.isActive : true });
  }
  static async delete(contactID) {
    await query('DELETE FROM EmergencyContact WHERE contactID = @contactID', { contactID });
  }
}

module.exports = EmergencyContact;
