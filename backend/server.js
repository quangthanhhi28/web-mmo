/**
 * =====================================================
 * SERVER CHÍNH - BÁN TÀI NGUYÊN PREMIUM
 * =====================================================
 * NodeJS + Express
 * Khởi động máy chủ backend
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Import database và routes
const db = require('./models/database');
const apiRoutes = require('./routes/index');

// =====================================================
// KHỞI TẠO EXPRESS APP
// =====================================================
const app = express();
const PORT = process.env.PORT || 5000;

// =====================================================
// MIDDLEWARE
// =====================================================

// CORS - Cho phép frontend truy cập
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Body Parser - Xử lý JSON/URL-encoded
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Middleware log request
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleString('vi-VN')}] ${req.method} ${req.path}`);
  next();
});

// =====================================================
// ROUTES
// =====================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server đang chạy',
    timestamp: new Date(),
  });
});

// API routes - tất cả route nằm trong /api
app.use('/api', apiRoutes);

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================

// Xử lý lỗi 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint không tồn tại',
    path: req.path,
  });
});

// Xử lý lỗi chung
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Lỗi server',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// =====================================================
// KHỞI ĐỘNG SERVER
// =====================================================

async function startServer() {
  try {
    // Kiểm tra kết nối database
    const dbConnected = await db.testConnection();

    if (!dbConnected) {
      console.error('✗ Không thể kết nối database');
      process.exit(1);
    }

    // Khởi động server
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════╗
║  BÁN TÀI NGUYÊN PREMIUM - BACKEND SERVER           ║
╠════════════════════════════════════════════════════╣
║  Server đang chạy tại: http://localhost:${PORT}      ║
║  Environment: ${process.env.NODE_ENV || 'development'}                   ║
║  Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}    ║
╚════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('✗ Lỗi khởi động server:', error.message);
    process.exit(1);
  }
}

// Chạy server
startServer();

// =====================================================
// XỬ LÝ GRACEFUL SHUTDOWN
// =====================================================

process.on('SIGTERM', () => {
  console.log('\nSIGTERM nhận được - Đóng server...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT nhận được - Đóng server...');
  process.exit(0);
});

module.exports = app;
