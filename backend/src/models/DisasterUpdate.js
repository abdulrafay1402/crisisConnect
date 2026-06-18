const { query } = require('../config/database');

class DisasterUpdate {
  static async createTable() {
    await query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DisasterUpdate' AND xtype='U')
      CREATE TABLE DisasterUpdate (
        updateID INT IDENTITY(1,1) PRIMARY KEY,
        disasterID VARCHAR(10) NOT NULL FOREIGN KEY REFERENCES Disaster(disasterID),
        senderID VARCHAR(10) NOT NULL,
        senderRole VARCHAR(20) NOT NULL,
        senderName VARCHAR(100),
        message NVARCHAR(MAX) NOT NULL,
        createdAt DATETIME DEFAULT GETDATE()
      )
    `);
  }

  static async insert({ disasterID, senderID, senderRole, senderName, message }) {
    await query(
      `INSERT INTO DisasterUpdate (disasterID, senderID, senderRole, senderName, message)
       VALUES (@disasterID, @senderID, @senderRole, @senderName, @message)`,
      { disasterID, senderID, senderRole, senderName: senderName || null, message }
    );

    const latest = await query(
      `SELECT MAX(updateID) as updateID FROM DisasterUpdate
       WHERE disasterID = @disasterID AND senderID = @senderID`,
      { disasterID, senderID }
    );
    return latest.recordset[0]?.updateID || null;
  }

  static async getByDisaster(disasterID) {
    const r = await query(
      `SELECT * FROM DisasterUpdate WHERE disasterID = @disasterID ORDER BY createdAt DESC`,
      { disasterID }
    );
    return r.recordset;
  }

  static async getByDisasterForAdmin(disasterID) {
    const r = await query(
      `SELECT * FROM DisasterUpdate WHERE disasterID = @disasterID ORDER BY createdAt DESC`,
      { disasterID }
    );
    return r.recordset;
  }

  static async delete(updateID) {
    await query('DELETE FROM DisasterUpdate WHERE updateID = @updateID', { updateID });
  }
}

module.exports = DisasterUpdate;
