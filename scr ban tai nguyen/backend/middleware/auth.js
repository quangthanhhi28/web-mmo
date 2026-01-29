/**
 * =====================================================
 * MIDDLEWARE XÁC THỰC JWT
 * =====================================================
 * Kiểm tra và xác thực JWT token từ header
 * Bảo vệ các route cần quyền
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware: Kiểm tra JWT token
 * Yêu cầu: Authorization: Bearer <token>
 */
const authenticateToken = (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

    // Nếu không có token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để tiếp tục',
      });
    }

    // Xác thực token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        // Token hết hạn hoặc không hợp lệ
        return res.status(403).json({
          success: false,
          message: 'Token không hợp lệ hoặc đã hết hạn',
        });
      }

      // Token hợp lệ - lưu thông tin user vào req
      req.user = user;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực',
      error: error.message,
    });
  }
};

/**
 * Middleware: Kiểm tra quyền Admin
 * Chỉ admin mới được phép truy cập
 */
const isAdmin = (req, res, next) => {
  try {
    // Kiểm tra xem có token không (phải đã qua authenticateToken trước)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn phải đăng nhập trước',
      });
    }

    // Kiểm tra xem user có phải admin không
    // Cách 1: Lưu role trong JWT
    // Cách 2: Kiểm tra trong database (nên làm bất đồng bộ)
    
    // Tạm thời sử dụng: nếu user_id = 1 là admin (có thể thay đổi)
    if (req.user.id !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập tài nguyên này',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra quyền',
      error: error.message,
    });
  }
};

/**
 * Middleware: Kiểm tra tài khoản có bị khóa không
 */
const checkAccountStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }

    const db = require('./database');
    const user = await db.getOne(
      'SELECT is_locked, locked_until FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại',
      });
    }

    // Nếu tài khoản bị khóa
    if (user.is_locked) {
      // Kiểm tra xem đã hết thời gian khóa chưa
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        return res.status(403).json({
          success: false,
          message: `Tài khoản của bạn đã bị khóa. Hãy thử lại lúc ${new Date(user.locked_until).toLocaleString('vi-VN')}`,
        });
      } else {
        // Hết thời gian khóa - mở khóa
        await db.update(
          'UPDATE users SET is_locked = false, locked_until = null WHERE id = ?',
          [req.user.id]
        );
      }
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra trạng thái tài khoản',
      error: error.message,
    });
  }
};

/**
 * Hàm tạo JWT token
 * @param {object} userData - Dữ liệu user {id, email, username}
 * @param {string} expiresIn - Thời gian hết hạn (mặc định từ .env)
 * @returns {string} - JWT token
 */
const generateToken = (userData, expiresIn = process.env.JWT_EXPIRE || '7d') => {
  return jwt.sign(
    {
      id: userData.id,
      email: userData.email,
      username: userData.username,
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Hàm verify token và lấy payload
 * @param {string} token - JWT token
 * @returns {object|null} - Payload hoặc null nếu token không hợp lệ
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  isAdmin,
  checkAccountStatus,
  generateToken,
  verifyToken,
};
