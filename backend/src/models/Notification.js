const { getPool, sql } = require('../config/database');

class Notification {
  static async findForUser(targetRole, targetUserID, limit = 50) {
    const pool = getPool();
    const r = await pool.request()
      .input('targetRole', sql.VarChar, targetRole)
      .input('targetUserID', sql.VarChar, targetUserID || null)
      .query(`SELECT TOP 50 * FROM Notification
              WHERE (targetRole = @targetRole AND targetUserID IS NULL)
                 OR targetUserID = @targetUserID
              ORDER BY createdDate DESC`);
    return r.recordset;
  }

  static async getUnreadCount(targetRole, targetUserID) {
    const pool = getPool();
    const r = await pool.request()
      .input('targetRole', sql.VarChar, targetRole)
      .input('targetUserID', sql.VarChar, targetUserID || null)
      .query(`SELECT COUNT(*) as count FROM Notification
              WHERE isRead = 0
                AND ((targetRole = @targetRole AND targetUserID IS NULL) OR targetUserID = @targetUserID)`);
    return r.recordset[0].count;
  }

  static async insert(n) {
    const pool = getPool();
    await pool.request()
      .input('targetRole', sql.VarChar, n.targetRole || 'Admin')
      .input('targetUserID', sql.VarChar, n.targetUserID || null)
      .input('category', sql.VarChar, n.category || 'general')
      .input('title', sql.VarChar, n.title)
      .input('message', sql.NVarChar(sql.MAX), n.message)
      .input('relatedEntity', sql.VarChar, n.relatedEntity || null)
      .input('relatedID', sql.VarChar, n.relatedID || null)
      .input('redirectPath', sql.VarChar, n.redirectPath || null)
      .query(`INSERT INTO Notification (targetRole, targetUserID, category, title, message, relatedEntity, relatedID, redirectPath, createdDate)
              VALUES (@targetRole, @targetUserID, @category, @title, @message, @relatedEntity, @relatedID, @redirectPath, GETDATE())`);
  }

  static async markRead(notificationID) {
    const pool = getPool();
    await pool.request()
      .input('notificationID', sql.Int, notificationID)
      .query('UPDATE Notification SET isRead = 1 WHERE notificationID = @notificationID');
  }

  static async markAllRead(targetRole, targetUserID) {
    const pool = getPool();
    await pool.request()
      .input('targetRole', sql.VarChar, targetRole)
      .input('targetUserID', sql.VarChar, targetUserID || null)
      .query(`UPDATE Notification SET isRead = 1
              WHERE isRead = 0
                AND ((targetRole = @targetRole AND targetUserID IS NULL) OR targetUserID = @targetUserID)`);
  }

  static async delete(notificationID) {
    const pool = getPool();
    await pool.request()
      .input('notificationID', sql.Int, notificationID)
      .query('DELETE FROM Notification WHERE notificationID = @notificationID');
  }
}

module.exports = Notification;
