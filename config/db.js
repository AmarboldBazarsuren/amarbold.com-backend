const mysql = require('mysql2');
require('dotenv').config();

// MySQL Connection Pool үүсгэх
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Promise-based connection
const promisePool = pool.promise();

// Database холболт шалгах
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL холболт амжилтгүй:', err.message);
    process.exit(1);
  }
  console.log('✅ MySQL амжилттай холбогдлоо');
  connection.release();
});

module.exports = promisePool;