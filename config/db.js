const mysql = require('mysql2');
require('dotenv').config();

// MySQL Connection Pool үүсгэх
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  maxIdle: 10,
  idleTimeout: 60000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: '+08:00',
  connectTimeout: 10000  // 10 секунд
});

// Promise-based connection
const promisePool = pool.promise();

// 🔥 Database холболт шалгах (server унахгүй)
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL холболт амжилтгүй:', err.message);
    console.error('⚠️  Server database-гүйгээр ажиллаж байна');
    // ❌ process.exit(1) УСТГАСАН - Server унахгүй
    return;
  }
  console.log('✅ MySQL амжилттай холбогдлоо');
  connection.release();
});

// 🔥 Pool-ын error event handler
pool.on('error', (err) => {
  console.error('❌ Database pool алдаа:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('🔄 Database холболт тасарсан, автоматаар дахин холбогдож байна...');
  } else if (err.code === 'ER_CON_COUNT_ERROR') {
    console.error('🚨 Хэт олон database холболт!');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('🚨 Database server унтарсан байна!');
  } else {
    console.error('🚨 Database алдаа:', err.code);
  }
});

// 🔥 Query wrapper - алдаа гарвал user-friendly мессеж өгнө
const safeQuery = async (query, params) => {
  try {
    return await promisePool.query(query, params);
  } catch (error) {
    console.error('❌ Database query алдаа:', error.message);
    // Алдааг throw хийхийн оронд null буцаана
    if (error.code === 'ER_DUP_ENTRY') {
      throw new Error('Давхардсан өгөгдөл');
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      throw new Error('Database table олдсонгүй');
    } else if (error.code === 'PROTOCOL_CONNECTION_LOST') {
      throw new Error('Database холболт тасарсан');
    }
    throw new Error('Database алдаа гарлаа');
  }
};

module.exports = promisePool;
module.exports.safeQuery = safeQuery;