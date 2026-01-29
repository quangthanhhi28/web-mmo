/**
 * =====================================================
 * CONTROLLER XỬ LÝ XÁC THỰC (Auth)
 * =====================================================
 * Quản lý đăng ký, đăng nhập, thay đổi mật khẩu
 */

const bcrypt = require('bcryptjs');
const db = require('../models/database');
const { generateToken } = require('../middleware/auth');

// =====================================================
// 1. ĐĂNG KÝ TÀI KHOẢN MỚI
// =====================================================
async function registerUser(req, res) {
  try {
    const { email, username, password, confirmPassword, fullName } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email || !username || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin',
      });
    }

    // Kiểm tra email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email không hợp lệ',
      });
    }

    // Kiểm tra mật khẩu trùng khớp
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu nhập lại không khớp',
      });
    }

    // Kiểm tra độ dài mật khẩu
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự',
      });
    }

    // Kiểm tra username đã tồn tại chưa
    const existingUser = await db.getOne(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email hoặc username đã tồn tại',
      });
    }

    // Hash mật khẩu bằng bcrypt (độ khó: 10)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Thêm user vào database
    const result = await db.insert(
      `INSERT INTO users (email, username, password_hash, full_name, user_tier) 
       VALUES (?, ?, ?, ?, 'user')`,
      [email, username, passwordHash, fullName || username]
    );

    const userId = result.insertId;

    // Tạo ví cho user mới
    await db.insert(
      'INSERT INTO wallets (user_id, balance, total_deposited, total_spent) VALUES (?, 0, 0, 0)',
      [userId]
    );

    // Tạo điểm tích lũy cho user
    await db.insert(
      'INSERT INTO loyalty_points (user_id, total_points) VALUES (?, 0)',
      [userId]
    );

    // Đăng ký thành công
    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công',
      data: {
        userId: userId,
        email: email,
        username: username,
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi đăng ký tài khoản',
      error: error.message,
    });
  }
}

// =====================================================
// 2. ĐĂNG NHẬP
// =====================================================
async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập email và mật khẩu',
      });
    }

    // Tìm user trong database
    const user = await db.getOne(
      'SELECT id, email, username, password_hash, full_name, user_tier, is_locked, locked_until FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      // Ghi log lỗi đăng nhập
      await logLoginAttempt(null, req.ip, req.headers['user-agent'], 'failed', 'Email không tồn tại');
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    // Kiểm tra tài khoản bị khóa
    if (user.is_locked && new Date(user.locked_until) > new Date()) {
      await logLoginAttempt(user.id, req.ip, req.headers['user-agent'], 'failed', 'Tài khoản bị khóa');
      return res.status(403).json({
        success: false,
        message: `Tài khoản bị khóa. Hãy thử lại lúc ${new Date(user.locked_until).toLocaleString('vi-VN')}`,
      });
    }

    // So sánh mật khẩu
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Ghi log lỗi đăng nhập
      await logLoginAttempt(user.id, req.ip, req.headers['user-agent'], 'failed', 'Mật khẩu sai');
      return res.status(401).json({
        success: false,
        message: 'Email hoặc mật khẩu không chính xác',
      });
    }

    // Đăng nhập thành công - Tạo JWT token
    const token = generateToken({
      id: user.id,
      email: user.email,
      username: user.username,
    });

    // Cập nhật last_login
    await db.update(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Ghi log đăng nhập thành công
    await logLoginAttempt(user.id, req.ip, req.headers['user-agent'], 'success', null);

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          userTier: user.user_tier,
        },
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi đăng nhập',
      error: error.message,
    });
  }
}

// =====================================================
// 3. THAY ĐỔI MẬT KHẨU
// =====================================================
async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    // Kiểm tra dữ liệu đầu vào
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng điền đầy đủ thông tin',
      });
    }

    // Kiểm tra mật khẩu mới trùng khớp
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu mới nhập lại không khớp',
      });
    }

    // Kiểm tra độ dài mật khẩu
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu phải có ít nhất 6 ký tự',
      });
    }

    // Lấy user từ database
    const user = await db.getOne(
      'SELECT id, password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại',
      });
    }

    // Kiểm tra mật khẩu cũ
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password_hash);

    if (!isOldPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mật khẩu cũ không chính xác',
      });
    }

    // Hash mật khẩu mới
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Cập nhật mật khẩu
    await db.update(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Thay đổi mật khẩu thành công',
    });
  } catch (error) {
    console.error('Change Password Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi thay đổi mật khẩu',
      error: error.message,
    });
  }
}

// =====================================================
// 4. HÀM HỖ TRỢ - Ghi log lịch sử đăng nhập
// =====================================================
async function logLoginAttempt(userId, ipAddress, userAgent, status, reason) {
  try {
    // Xác định vị trí từ IP (tạm thời: hard code)
    let location = 'Unknown';
    if (ipAddress.includes('127.0.0.1') || ipAddress.includes('::1')) {
      location = 'Localhost';
    }

    const isSuspicious = status === 'failed' ? true : false; // Nếu login fail thì đánh dấu suspicious

    await db.insert(
      `INSERT INTO login_history (user_id, ip_address, user_agent, status, failure_reason, location, is_suspicious) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, ipAddress, userAgent, status, reason, location, isSuspicious ? 1 : 0]
    );
  } catch (error) {
    console.error('Log Login Attempt Error:', error);
  }
}

module.exports = {
  registerUser,
  loginUser,
  changePassword,
};
