require('dotenv').config();

const parseBool = (v, fallback = false) => {
  if (v === undefined || v === null || v === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const useMsnodesqlv8 = parseBool(process.env.DB_USE_MSNODESQLV8, true);
const sql = useMsnodesqlv8 ? require('mssql/msnodesqlv8') : require('mssql');

const poolConfig = {
  max: parseInt(process.env.DB_POOL_MAX || '10', 10),
  min: parseInt(process.env.DB_POOL_MIN || '0', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT_MS || '30000', 10)
};

const buildConfig = () => {
  const dbServer = process.env.DB_SERVER || '.\\SQLEXPRESS';
  const dbName = process.env.DB_NAME || 'DisasterManagement';
  const dbPort = parseInt(process.env.DB_PORT || '1433', 10);
  const trustServerCertificate = parseBool(process.env.DB_TRUST_SERVER_CERTIFICATE, true);
  const encrypt = parseBool(process.env.DB_ENCRYPT, false);
  const connTimeout = parseInt(process.env.DB_CONNECTION_TIMEOUT_MS || '15000', 10);
  const reqTimeout = parseInt(process.env.DB_REQUEST_TIMEOUT_MS || '15000', 10);

  // Highest priority: explicit connection string.
  if (process.env.DB_CONNECTION_STRING) {
    return {
      connectionString: process.env.DB_CONNECTION_STRING,
      pool: poolConfig,
      connectionTimeout: connTimeout,
      requestTimeout: reqTimeout
    };
  }

  // SQL Authentication mode (portable across machines/environments).
  if (process.env.DB_USER && process.env.DB_PASSWORD) {
    return {
      server: dbServer,
      database: dbName,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: dbPort,
      pool: poolConfig,
      connectionTimeout: connTimeout,
      requestTimeout: reqTimeout,
      options: {
        encrypt,
        trustServerCertificate
      }
    };
  }

  // Windows integrated auth mode for local development.
  return {
    connectionString: `Driver={ODBC Driver 17 for SQL Server};Server=${dbServer};Database=${dbName};Trusted_Connection=yes;TrustServerCertificate=${trustServerCertificate ? 'yes' : 'no'};`,
    pool: poolConfig,
    connectionTimeout: connTimeout,
    requestTimeout: reqTimeout
  };
};

const config = buildConfig();

let pool = null;

const connectDB = async () => {
  try {
    if (pool) return pool;
    pool = await sql.connect(config);
    console.log('Connected to SQL Server database');
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

const getPool = () => {
  if (!pool) throw new Error('Database not connected. Call connectDB first.');
  return pool;
};

const closeDB = async () => {
  if (pool) { await pool.close(); pool = null; }
};

const query = async (queryString, params = {}) => {
  const p = getPool();
  const request = p.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return await request.query(queryString);
};

const transaction = async (operations) => {
  const p = getPool();
  const trans = new sql.Transaction(p);
  try {
    await trans.begin();
    const result = await operations(trans);
    await trans.commit();
    return result;
  } catch (error) {
    await trans.rollback();
    throw error;
  }
};

module.exports = { sql, connectDB, getPool, closeDB, query, transaction };
