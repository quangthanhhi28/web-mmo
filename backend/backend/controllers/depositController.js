/**
 * =====================================================
 * CONTROLLER QUẢN LÝ NẠP TIỀN
 * =====================================================
 * Tạo giao dịch nạp tiền, lấy lịch sử nạp
 * Ngân hàng Việt Nam: Vietcombank, MBBank, Techcombank, BIDV
 */

const db = require('../models/database');

// =====================================================
// 1. LẤY DANH SÁCH NGÂN HÀNG & THÔNG TIN CHUYỂN KHOẢN
// =====================================================
async function getBankInfo(req, res) {
  try {
    // Thông tin ngân hàng Việt Nam (mock - trong thực tế lưu trong database hoặc config)
    const banks = [
      {
        code: 'vietcombank',
        name: 'Vietcombank',
        accountNumber: process.env.VIETCOMBANK_ACCOUNT || '1234567890',
        accountOwner: process.env.VIETCOMBANK_OWNER || 'NGUYEN VAN A',
        branch: process.env.VIETCOMBANK_BRANCH || 'Hà Nội',
        logo: 'https://via.placeholder.com/150x80?text=Vietcombank',
      },
      {
        code: 'mbbank',
        name: 'MB Bank',
        accountNumber: process.env.MBBANK_ACCOUNT || '9876543210',
        accountOwner: process.env.MBBANK_OWNER || 'TRAN VAN B',
        branch: process.env.MBBANK_BRANCH || 'TP. Hồ Chí Minh',
        logo: 'https://via.placeholder.com/150x80?text=MBBank',
      },
      {
        code: 'techcombank',
        name: 'Techcombank',
        accountNumber: process.env.TECHCOMBANK_ACCOUNT || '5555555555',
        accountOwner: process.env.TECHCOMBANK_OWNER || 'PHAM VAN C',
        branch: process.env.TECHCOMBANK_BRANCH || 'Đà Nẵng',
        logo: 'https://via.placeholder.com/150x80?text=Techcombank',
      },
      {
        code: 'bidv',
        name: 'BIDV',
        accountNumber: process.env.BIDV_ACCOUNT || '3333333333',
        accountOwner: process.env.BIDV_OWNER || 'HOANG VAN D',
        branch: process.env.BIDV_BRANCH || 'Cần Thơ',
        logo: 'https://via.placeholder.com/150x80?text=BIDV',
      },
    ];

    return res.status(200).json({
      success: true,
      data: {
        banks: banks,
      },
    });
  } catch (error) {
    console.error('Get Bank Info Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin ngân hàng',
      error: error.message,
    });
  }
}

// =====================================================
// 2. TẠO GIAO DỊCH NẠP TIỀN (CHỜ DUYỆT)
// =====================================================
async function createDeposit(req, res) {
  try {
    const userId = req.user.id;
    const { amount, bankName } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!amount || !bankName) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp số tiền và ngân hàng',
      });
    }

    // Kiểm tra số tiền (tối thiểu 10.000 VND)
    if (amount < 10000) {
      return res.status(400).json({
        success: false,
        message: 'Số tiền nạp tối thiểu là 10.000 VND',
      });
    }

    // Kiểm tra ngân hàng hợp lệ
    const validBanks = ['vietcombank', 'mbbank', 'techcombank', 'bidv'];
    if (!validBanks.includes(bankName.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Ngân hàng không hợp lệ',
      });
    }

    // Tạo mã giao dịch: USER_ID + TIMESTAMP
    const timestamp = Date.now();
    const transactionCode = `NP${userId}${timestamp}`;

    // Thêm giao dịch vào database
    const result = await db.insert(
      `INSERT INTO deposits (user_id, transaction_code, amount, bank_name, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [userId, transactionCode, amount, bankName.toUpperCase()]
    );

    return res.status(201).json({
      success: true,
      message: 'Tạo giao dịch nạp tiền thành công. Vui lòng chuyển khoản theo thông tin bên dưới',
      data: {
        depositId: result.insertId,
        transactionCode: transactionCode,
        amount: amount,
        bankName: bankName,
        bankInfo: getBankInfoByName(bankName),
        transferContent: `Nap tien ${transactionCode}`,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Hết hạn sau 24h
      },
    });
  } catch (error) {
    console.error('Create Deposit Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi tạo giao dịch nạp tiền',
      error: error.message,
    });
  }
}

// =====================================================
// 3. KIỂM TRA GIAO DỊCH / QUAY LẠI KHI ĐÃ CHUYỂN KHOẢN
// =====================================================
async function confirmDeposit(req, res) {
  try {
    const userId = req.user.id;
    const depositId = req.body.depositId;

    if (!depositId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ID giao dịch',
      });
    }

    // Lấy thông tin giao dịch
    const deposit = await db.getOne(
      'SELECT id, user_id, amount, status, created_at FROM deposits WHERE id = ? AND user_id = ?',
      [depositId, userId]
    );

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Giao dịch không tồn tại',
      });
    }

    // Kiểm tra trạng thái
    if (deposit.status === 'approved') {
      return res.status(200).json({
        success: true,
        message: 'Giao dịch đã được duyệt',
        data: {
          status: 'approved',
          amount: deposit.amount,
        },
      });
    }

    if (deposit.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Giao dịch đã bị từ chối',
        data: {
          status: 'rejected',
        },
      });
    }

    // Trạng thái: pending - đang chờ duyệt
    return res.status(200).json({
      success: true,
      message: 'Giao dịch đang chờ duyệt. Vui lòng chờ admin xác nhận',
      data: {
        status: 'pending',
        amount: deposit.amount,
        createdAt: deposit.created_at,
      },
    });
  } catch (error) {
    console.error('Confirm Deposit Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi kiểm tra giao dịch',
      error: error.message,
    });
  }
}

// =====================================================
// 4. LẤY LỊCH SỬ NẠP TIỀN
// =====================================================
async function getDepositHistory(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const deposits = await db.getAll(
      `SELECT id, transaction_code, amount, bank_name, status, created_at, approved_at
       FROM deposits
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const total = await db.getOne(
      'SELECT COUNT(*) as count FROM deposits WHERE user_id = ?',
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        deposits: deposits,
        pagination: {
          total: total.count,
          limit: limit,
          offset: offset,
          hasMore: (offset + limit) < total.count,
        },
      },
    });
  } catch (error) {
    console.error('Get Deposit History Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy lịch sử nạp tiền',
      error: error.message,
    });
  }
}

// =====================================================
// 5. HÀM HỖ TRỢ - Lấy thông tin ngân hàng theo tên
// =====================================================
function getBankInfoByName(bankName) {
  const bankMap = {
    vietcombank: {
      name: 'Vietcombank',
      accountNumber: process.env.VIETCOMBANK_ACCOUNT || '1234567890',
      accountOwner: process.env.VIETCOMBANK_OWNER || 'NGUYEN VAN A',
    },
    mbbank: {
      name: 'MB Bank',
      accountNumber: process.env.MBBANK_ACCOUNT || '9876543210',
      accountOwner: process.env.MBBANK_OWNER || 'TRAN VAN B',
    },
    techcombank: {
      name: 'Techcombank',
      accountNumber: process.env.TECHCOMBANK_ACCOUNT || '5555555555',
      accountOwner: process.env.TECHCOMBANK_OWNER || 'PHAM VAN C',
    },
    bidv: {
      name: 'BIDV',
      accountNumber: process.env.BIDV_ACCOUNT || '3333333333',
      accountOwner: process.env.BIDV_OWNER || 'HOANG VAN D',
    },
  };

  return bankMap[bankName.toLowerCase()] || null;
}

module.exports = {
  getBankInfo,
  createDeposit,
  confirmDeposit,
  getDepositHistory,
};
