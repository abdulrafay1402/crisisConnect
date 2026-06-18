const { query } = require('../config/database');

class Message {
  static async createTable() {
    await query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Message' AND xtype='U')
      CREATE TABLE Message (
        messageID INT IDENTITY(1,1) PRIMARY KEY,
        senderID VARCHAR(10) NOT NULL,
        senderRole VARCHAR(20) NOT NULL,
        receiverID VARCHAR(10) NOT NULL,
        receiverRole VARCHAR(20) NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        messageType VARCHAR(20) DEFAULT 'text',
        isRead BIT DEFAULT 0,
        sentDate DATETIME DEFAULT GETDATE()
      )
    `);
    // Add messageType column if table already exists without it
    await query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Message') AND name = 'messageType')
      ALTER TABLE Message ADD messageType VARCHAR(20) DEFAULT 'text'
    `);
  }

  static async insert({ senderID, senderRole, receiverID, receiverRole, content, messageType = 'text' }) {
    await query(
      `INSERT INTO Message (senderID, senderRole, receiverID, receiverRole, content, messageType)
       VALUES (@senderID, @senderRole, @receiverID, @receiverRole, @content, @messageType)`,
      { senderID, senderRole, receiverID, receiverRole, content, messageType }
    );

    const r = await query(
      `SELECT messageID, sentDate, messageType
       FROM Message
       WHERE senderID = @senderID AND receiverID = @receiverID AND content = @content
       ORDER BY messageID DESC`,
      { senderID, receiverID, content }
    );
    return r.recordset[0] || null;
  }

  static async getConversation(userA_ID, userB_ID) {
    const r = await query(
      `SELECT * FROM Message
       WHERE (senderID = @userA AND receiverID = @userB)
          OR (senderID = @userB AND receiverID = @userA)
       ORDER BY sentDate ASC`,
      { userA: userA_ID, userB: userB_ID }
    );
    return r.recordset;
  }

  static async markRead(receiverID, senderID) {
    await query(
      `UPDATE Message SET isRead = 1
       WHERE receiverID = @receiverID AND senderID = @senderID AND isRead = 0`,
      { receiverID, senderID }
    );
  }

  static async getContacts(userID, userRole) {
    const r = await query(
      `SELECT senderID, senderRole, receiverID, receiverRole, content, isRead, sentDate
       FROM Message
       WHERE senderID = @userID OR receiverID = @userID
       ORDER BY sentDate DESC`,
      { userID }
    );

    const map = new Map();
    for (const msg of r.recordset) {
      const isSent = msg.senderID === userID;
      const contactID = isSent ? msg.receiverID : msg.senderID;
      const contactRole = isSent ? msg.receiverRole : msg.senderRole;
      const key = `${contactID}|${contactRole}`;

      if (!map.has(key)) {
        map.set(key, {
          contactID,
          contactRole,
          lastMessageDate: msg.sentDate,
          lastMessage: msg.content,
          unreadCount: 0
        });
      }

      if (msg.receiverID === userID && !msg.isRead) {
        map.get(key).unreadCount += 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate));
  }

  static async getUnreadCount(userID) {
    const r = await query(
      `SELECT COUNT(*) as count FROM Message WHERE receiverID = @userID AND isRead = 0`,
      { userID }
    );
    return r.recordset[0].count;
  }

  // Get available contacts (teams for NGOs, NGOs for teams)
  static async getAvailableTeams() {
    const r = await query(`SELECT teamID, teamName, specialization, contactNumber, status
      FROM RescueTeam
      WHERE isActive = 1 AND status = 'Available'
      ORDER BY teamName`);
    return r.recordset;
  }

  static async getAvailableNGOs() {
    const r = await query(`SELECT ngoID, ngoName, focusArea, contactNumber, status
      FROM NGO
      WHERE isActive = 1 AND status = 'Available'
      ORDER BY ngoName`);
    return r.recordset;
  }

  static async isApprovedTeam(teamID) {
    const r = await query(`SELECT 1 as ok
      FROM RescueTeam
      WHERE teamID = @teamID AND isActive = 1 AND status = 'Available'`, { teamID });
    return r.recordset.length > 0;
  }

  static async isApprovedNGO(ngoID) {
    const r = await query(`SELECT 1 as ok
      FROM NGO
      WHERE ngoID = @ngoID AND isActive = 1 AND status = 'Available'`, { ngoID });
    return r.recordset.length > 0;
  }

  static async getAvailableCitizens() {
    const r = await query(`SELECT citizenID, name, city, contactNumber FROM Citizen WHERE isActive = 1 ORDER BY name`);
    return r.recordset;
  }
}

module.exports = Message;
