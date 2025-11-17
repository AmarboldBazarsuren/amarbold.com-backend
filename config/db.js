const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: 'Z',
  dateStrings: true,
  
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL холболт амжилтгүй:', err.message);
    return;
  }
  console.log('✅ MySQL амжилттай холбогдлоо');
  connection.release();
});

pool.on('error', (err) => {
  console.error('❌ Database pool алдаа:', err);
});

module.exports = promisePool;