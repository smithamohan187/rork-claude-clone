// backend/src/config/database.ts
const { Pool } = require('pg');

/*const pool = new Pool({
  //host: process.env.DB_HOST,
  host: `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`,
  //port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  //password: process.env.DB_PASSWORD,
  password: process.env.DB_PASS,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});*/

const isCloudRun = !!process.env.INSTANCE_CONNECTION_NAME;

const pool = new Pool({
  host: isCloudRun
    ? `/cloudsql/${process.env.INSTANCE_CONNECTION_NAME}`
    : process.env.DB_HOST || 'localhost',
  port: isCloudRun ? undefined : (process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  max: parseInt(process.env.DB_POOL_MAX) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ DB connection failed:', err.message);
    console.error('   Check DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in backend/.env');
    return;
  }
  release();
  console.log('✅ PostgreSQL connected');
});

// Helper: run a query
const query = (text, params) => pool.query(text, params);

// Helper: get a client for transactions
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };