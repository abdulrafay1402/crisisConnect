const { getPool } = require('../config/database');

const logAction = async (userId, userRole, action, entity, entityId, details = null) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('userId', userId)
      .input('userRole', userRole)
      .input('action', action)
      .input('entity', entity)
      .input('entityId', entityId)
      .input('details', details ? JSON.stringify(details) : null)
      .query(`
        INSERT INTO AuditLog (userID, userRole, action, entity, entityID, details, timestamp)
        VALUES (@userId, @userRole, @action, @entity, @entityId, @details, GETDATE())
      `);
  } catch {
    // Audit logging should never break the main flow
  }
};

const getAuditLogs = async (filters = {}) => {
  try {
    const pool = await getPool();
    let query = 'SELECT TOP 200 * FROM AuditLog WHERE 1=1';
    const request = pool.request();
    if (filters.entity) {
      query += ' AND entity = @entity';
      request.input('entity', filters.entity);
    }
    if (filters.userId) {
      query += ' AND userID = @userId';
      request.input('userId', filters.userId);
    }
    query += ' ORDER BY timestamp DESC';
    const result = await request.query(query);
    return result.recordset;
  } catch {
    return [];
  }
};

module.exports = { logAction, getAuditLogs };
