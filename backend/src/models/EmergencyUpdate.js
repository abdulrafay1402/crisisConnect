const { query } = require('../config/database');

class EmergencyUpdate {
  static async createTable() {
    await query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EmergencyUpdate' AND xtype='U')
      CREATE TABLE EmergencyUpdate (
        updateID INT IDENTITY(1,1) PRIMARY KEY,
        emergencyID VARCHAR(10) NOT NULL FOREIGN KEY REFERENCES Emergency(emergencyID),
        senderID VARCHAR(10) NOT NULL,
        senderRole VARCHAR(20) NOT NULL,
        senderName VARCHAR(100),
        message NVARCHAR(MAX) NOT NULL,
        createdAt DATETIME DEFAULT GETDATE()
      )
    `);
  }

  static async insert({ emergencyID, senderID, senderRole, senderName, message }) {
    await query(
      `INSERT INTO EmergencyUpdate (emergencyID, senderID, senderRole, senderName, message)
       VALUES (@emergencyID, @senderID, @senderRole, @senderName, @message)`,
      { emergencyID, senderID, senderRole, senderName: senderName || null, message }
    );

    const latest = await query(
      `SELECT MAX(updateID) as updateID FROM EmergencyUpdate
       WHERE emergencyID = @emergencyID AND senderID = @senderID`,
      { emergencyID, senderID }
    );
    return latest.recordset[0]?.updateID || null;
  }

  static async getByEmergency(emergencyID) {
    const r = await query(
      `SELECT * FROM EmergencyUpdate WHERE emergencyID = @emergencyID ORDER BY createdAt DESC`,
      { emergencyID }
    );
    return r.recordset;
  }
}

module.exports = EmergencyUpdate;