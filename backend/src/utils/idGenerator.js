const { getPool, sql } = require('../config/database');

const generateId = async (prefix, table, idColumn) => {
  const pool = getPool();
  const result = await pool.request()
    .input('prefix', sql.VarChar, prefix + '%')
    .query(`SELECT TOP 1 ${idColumn} FROM ${table} WHERE ${idColumn} LIKE @prefix ORDER BY ${idColumn} DESC`);

  if (result.recordset.length === 0) {
    return prefix + '001';
  }

  const lastId = result.recordset[0][idColumn];
  const numPart = parseInt(lastId.replace(prefix, ''));
  return prefix + String(numPart + 1).padStart(3, '0');
};

module.exports = { generateId };
