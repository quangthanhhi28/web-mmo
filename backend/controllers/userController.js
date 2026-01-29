/**
 * =====================================================
 * CONTROLLER QUẢN LÝ HỒ SƠ NGƯỜI DÙNG
 * =====================================================
 * Lấy thông tin user, cập nhật profile, quản lý ví
 */

const db = require('../models/database');

// =====================================================
// 1. LẤY THÔNG TIN HỒ SƠ NGƯỜI DÙNG
// =====================================================
async function getUserProfile(req, res) {
  try {
    const userId = req.user.id;

    // Lấy thông tin user
    const user = await db.getOne(
      `SELECT id, email, username, full_name, phone, user_tier, 
              two_fa_enabled, is_active, created_at, last_login 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Người dùng không tồn tại',
      });
    }

    // Lấy thông tin ví
    const wallet = await db.getOne(
      `SELECT balance, total_deposited, total_spent 
       FROM wallets WHERE user_id = ?`,
      [userId]
    );

    // Lấy điểm tích lũy
    const points = await db.getOne(
      'SELECT total_points FROM loyalty_points WHERE user_id = ?',
      [userId]
    );

    // Tính chiết khấu theo cấp bậc
    const tierDiscount = getTierDiscount(user.user_tier);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          phone: user.phone,
          userTier: user.user_tier,
          tierDiscount: tierDiscount,
          twoFAEnabled: user.two_fa_enabled,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: user.last_login,
        },
        wallet: {
          balance: wallet ? wallet.balance : 0,
          totalDeposited: wallet ? wallet.total_deposited : 0,
          totalSpent: wallet ? wallet.total_spent : 0,
        },
        loyaltyPoints: {
          totalPoints: points ? points.total_points : 0,
        },
      },
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin hồ sơ',
      error: error.message,
    });
  }
}

// =====================================================
// 2. CẬP NHẬT HỒ SƠ NGƯỜI DÙNG
// =====================================================
async function updateUserProfile(req, res) {
  try {
    const userId = req.user.id;
    const { fullName, phone } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!fullName && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp thông tin cần cập nhật',
      });
    }

    // Cập nhật thông tin
    let updateQuery = 'UPDATE users SET ';
    const params = [];
    const updateFields = [];

    if (fullName) {
      updateFields.push('full_name = ?');
      params.push(fullName);
    }

    if (phone) {
      updateFields.push('phone = ?');
      params.push(phone);
    }

    updateQuery += updateFields.join(', ') + ' WHERE id = ?';
    params.push(userId);

    await db.update(updateQuery, params);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công',
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật thông tin',
      error: error.message,
    });
  }
}

// =====================================================
// 3. LẤY THÔNG TIN VÍ
// =====================================================
async function getWalletInfo(req, res) {
  try {
    const userId = req.user.id;

    const wallet = await db.getOne(
      `SELECT id, user_id, balance, total_deposited, total_spent, 
              created_at, updated_at 
       FROM wallets WHERE user_id = ?`,
      [userId]
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Ví không tồn tại',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        walletId: wallet.id,
        balance: wallet.balance,
        totalDeposited: wallet.total_deposited,
        totalSpent: wallet.total_spent,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at,
      },
    });
  } catch (error) {
    console.error('Get Wallet Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin ví',
      error: error.message,
    });
  }
}

// =====================================================
// 4. LẤY LỊCH SỬ ĐĂNG NHẬP
// =====================================================
async function getLoginHistory(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Lấy lịch sử đăng nhập
    const history = await db.getAll(
      `SELECT id, ip_address, user_agent, status, location, is_suspicious, created_at 
       FROM login_history WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Lấy tổng số bản ghi
    const total = await db.getOne(
      'SELECT COUNT(*) as count FROM login_history WHERE user_id = ?',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        loginHistory: history,
        pagination: {
          total: total.count,
          limit: limit,
          offset: offset,
          hasMore: (offset + limit) < total.count,
        },
      },
    });
  } catch (error) {
    console.error('Get Login History Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy lịch sử đăng nhập',
      error: error.message,
    });
  }
}

// =====================================================
// 5. HÀM HỖ TRỢ - Lấy chiết khấu theo cấp bậc
// =====================================================
function getTierDiscount(userTier) {
  // Lưu ý: Này là dự tính, giá trị thực tế lấy từ database
  const discounts = {
    user: 0,
    vip_silver: 5,
    vip_gold: 10,
    vip_diamond: 15,
  };
  return discounts[userTier] || 0;
}

// =====================================================
// 6. BẬT/TẮT 2FA (Google Authenticator Mock)
// =====================================================
async function enable2FA(req, res) {
  try {
    const userId = req.user.id;
    // Tạo secret (mock - trong thực tế dùng speakeasy hoặc similar)
    const secret = 'mock-2fa-secret-' + Math.random().toString(36).substring(7);

    // Lưu secret vào database (tạm thời chưa enabled)
    await db.update(
      'UPDATE users SET two_fa_secret = ? WHERE id = ?',
      [secret, userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Hãy quét mã QR bằng Google Authenticator và xác nhận',
      data: {
        secret: secret,
        qrCode: `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(secret)}`,
      },
    });
  } catch (error) {
    console.error('Enable 2FA Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi bật 2FA',
      error: error.message,
    });
  }
}

async function verify2FA(req, res) {
  try {
    const userId = req.user.id;
    const { code } = req.body;

    // Kiểm tra code (mock)
    // Trong thực tế: dùng speakeasy.totp.verify()
    if (code !== '000000') { // Tạm thời: hardcode '000000' là code đúng
      return res.status(400).json({
        success: false,
        message: 'Mã xác thực không chính xác',
      });
    }

    // Bật 2FA
    await db.update(
      'UPDATE users SET two_fa_enabled = true WHERE id = ?',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Bật 2FA thành công',
    });
  } catch (error) {
    console.error('Verify 2FA Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực 2FA',
      error: error.message,
    });
  }
}

module.exports = {
  getUserProfile,
  updateUserProfile,
  getWalletInfo,
  getLoginHistory,
  enable2FA,
  verify2FA,
};
