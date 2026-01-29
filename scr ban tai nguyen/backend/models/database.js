/**
 * =====================================================
 * DATABASE CONNECTION - MYSQL
 * =====================================================
 * File này quản lý kết nối đến MySQL database
 * Sử dụng mysql2/promise cho async/await
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Tạo connection pool để tái sử dụng kết nối
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'scr_ban_tai_nguyen',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

/**
 * Hàm thực thi query
 * @param {string} sql - Câu lệnh SQL
 * @param {array} params - Tham số truyền vào
 * @returns {object} - Kết quả query
 */
async function executeQuery(sql, params = []) {
  try {
    const connection = await pool.getConnection();
    const [results] = await connection.execute(sql, params);
    await connection.end();
    return results;
  } catch (error) {
    console.error('Database Error:', error.message);
    throw error;
  }
}

/**
 * Hàm lấy một bản ghi
 * @param {string} sql - Câu lệnh SQL
 * @param {array} params - Tham số truyền vào
 * @returns {object} - Một bản ghi hoặc null
 */
async function getOne(sql, params = []) {
  const results = await executeQuery(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Hàm lấy tất cả bản ghi
 * @param {string} sql - Câu lệnh SQL
 * @param {array} params - Tham số truyền vào
 * @returns {array} - Danh sách bản ghi
 */
async function getAll(sql, params = []) {
  return await executeQuery(sql, params);
}

/**
 * Hàm insert dữ liệu
 * @param {string} sql - Câu lệnh SQL
 * @param {array} params - Tham số truyền vào
 * @returns {object} - {insertId, affectedRows}
 */
async function insert(sql, params = []) {
  const results = await executeQuery(sql, params);
  return {
    insertId: results.insertId,
    affectedRows: results.affectedRows,
  };
}

/**
 * Hàm update dữ liệu
 * @param {string} sql - Câu lệnh SQL
 * @param {array} params - Tham số truyền vào
 * @returns {object} - {affectedRows, changedRows}
 */
async function update(sql, params = []) {
  const results = await executeQuery(sql, params);
  return {
    affectedRows: results.affectedRows,
    changedRows: results.changedRows,
  };
}

/**
 * Hàm delete dữ liệu
 * @param {string} sql - Câu lệnh SQL
 * @param {array} params - Tham số truyền vào
 * @returns {object} - {affectedRows}
 */
async function deleteRecord(sql, params = []) {
  const results = await executeQuery(sql, params);
  return {
    affectedRows: results.affectedRows,
  };
}

/**
 * Hàm kiểm tra kết nối database
 * @returns {boolean} - true nếu kết nối thành công
 */
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    const result = await connection.query('SELECT 1');
    await connection.end();
    console.log('✓ Database connection successful');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
}

// Export các hàm
module.exports = {
  executeQuery,
  getOne,
  getAll,
  insert,
  update,
  deleteRecord,
  testConnection,
  pool,
};
