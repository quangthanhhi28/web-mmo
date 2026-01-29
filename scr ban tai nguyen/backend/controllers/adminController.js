/**
 * =====================================================
 * CONTROLLER QUẢN LÝ ADMIN
 * =====================================================
 * Duyệt nạp tiền, quản lý sản phẩm, tài nguyên
 */

const db = require('../models/database');

// =====================================================
// 1. DUYỆT GIAO DỊCH NẠP TIỀN
// =====================================================
async function approveDeposit(req, res) {
  try {
    const adminId = req.user.id; // Admin đang duyệt
    const { depositId, approve } = req.body; // approve: true/false

    if (!depositId || approve === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp depositId và trạng thái duyệt',
      });
    }

    // Lấy thông tin giao dịch
    const deposit = await db.getOne(
      'SELECT id, user_id, amount, status FROM deposits WHERE id = ?',
      [depositId]
    );

    if (!deposit) {
      return res.status(404).json({
        success: false,
        message: 'Giao dịch không tồn tại',
      });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Giao dịch đã được xử lý rồi',
      });
    }

    if (approve) {
      // Duyệt giao dịch
      // 1. Cập nhật trạng thái giao dịch thành 'approved'
      await db.update(
        'UPDATE deposits SET status = "approved", approved_by = ?, approved_at = NOW() WHERE id = ?',
        [adminId, depositId]
      );

      // 2. Cộng tiền vào ví người dùng
      await db.update(
        `UPDATE wallets SET balance = balance + ?, total_deposited = total_deposited + ? WHERE user_id = ?`,
        [deposit.amount, deposit.amount, deposit.user_id]
      );

      // 3. Ghi log thao tác admin
      await logAdminAction(adminId, 'approve_deposit', {
        depositId: depositId,
        userId: deposit.user_id,
        amount: deposit.amount,
      });

      return res.status(200).json({
        success: true,
        message: 'Duyệt giao dịch nạp tiền thành công',
        data: {
          depositId: depositId,
          status: 'approved',
          amount: deposit.amount,
        },
      });
    } else {
      // Từ chối giao dịch
      const rejectionReason = req.body.reason || 'Không đủ điều kiện';

      await db.update(
        'UPDATE deposits SET status = "rejected", rejection_reason = ? WHERE id = ?',
        [rejectionReason, depositId]
      );

      // Ghi log
      await logAdminAction(adminId, 'reject_deposit', {
        depositId: depositId,
        userId: deposit.user_id,
        reason: rejectionReason,
      });

      return res.status(200).json({
        success: true,
        message: 'Từ chối giao dịch nạp tiền',
        data: {
          depositId: depositId,
          status: 'rejected',
        },
      });
    }
  } catch (error) {
    console.error('Approve Deposit Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi duyệt giao dịch',
      error: error.message,
    });
  }
}

// =====================================================
// 2. LẤY DANH SÁCH GIAO DỊCH CHỜ DUYỆT
// =====================================================
async function getPendingDeposits(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const deposits = await db.getAll(
      `SELECT d.id, d.transaction_code, d.amount, d.bank_name, d.status, d.created_at, 
              u.email, u.username
       FROM deposits d
       JOIN users u ON d.user_id = u.id
       WHERE d.status = 'pending'
       ORDER BY d.created_at ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const total = await db.getOne(
      'SELECT COUNT(*) as count FROM deposits WHERE status = "pending"',
      []
    );

    return res.status(200).json({
      success: true,
      data: {
        deposits: deposits,
        pagination: {
          total: total.count,
          limit: limit,
          offset: offset,
        },
      },
    });
  } catch (error) {
    console.error('Get Pending Deposits Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách giao dịch',
      error: error.message,
    });
  }
}

// =====================================================
// 3. THÊM TÀI NGUYÊN PREMIUM
// =====================================================
async function addPremiumResource(req, res) {
  try {
    const adminId = req.user.id;
    const { productId, email, password, notes, expiryDate } = req.body;

    if (!productId || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp productId, email, password',
      });
    }

    // Kiểm tra sản phẩm
    const product = await db.getOne(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại',
      });
    }

    // Thêm tài nguyên
    const result = await db.insert(
      `INSERT INTO premium_resources (product_id, status, resource_email, resource_password, notes, expiry_date)
       VALUES (?, 'available', ?, ?, ?, ?)`,
      [productId, email, password, notes || null, expiryDate || null]
    );

    // Ghi log
    await logAdminAction(adminId, 'add_resource', {
      resourceId: result.insertId,
      productId: productId,
      email: email,
    });

    return res.status(201).json({
      success: true,
      message: 'Thêm tài nguyên thành công',
      data: {
        resourceId: result.insertId,
      },
    });
  } catch (error) {
    console.error('Add Premium Resource Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi thêm tài nguyên',
      error: error.message,
    });
  }
}

// =====================================================
// 4. LẤY DANH SÁCH TÀI NGUYÊN
// =====================================================
async function getPremiumResources(req, res) {
  try {
    const productId = req.query.productId;
    const status = req.query.status || 'available'; // available / sold / expired
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    let query = `SELECT r.id, r.product_id, r.status, r.resource_email, r.notes, 
                        r.sold_at, r.expiry_date, r.created_at, p.name as product_name
                 FROM premium_resources r
                 JOIN products p ON r.product_id = p.id
                 WHERE 1=1`;
    const params = [];

    if (productId) {
      query += ' AND r.product_id = ?';
      params.push(productId);
    }

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const resources = await db.getAll(query, params);

    // Lấy tổng
    let countQuery = 'SELECT COUNT(*) as count FROM premium_resources WHERE 1=1';
    const countParams = [];

    if (productId) {
      countQuery += ' AND product_id = ?';
      countParams.push(productId);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const total = await db.getOne(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: {
        resources: resources,
        pagination: {
          total: total.count,
          limit: limit,
          offset: offset,
        },
      },
    });
  } catch (error) {
    console.error('Get Premium Resources Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách tài nguyên',
      error: error.message,
    });
  }
}

// =====================================================
// 5. THÊM / SỬA / XÓA SẢN PHẨM
// =====================================================
async function createProduct(req, res) {
  try {
    const adminId = req.user.id;
    const { name, category, durationMonths, price, description, badge } = req.body;

    if (!name || !category || !durationMonths || !price) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp thông tin sản phẩm',
      });
    }

    const result = await db.insert(
      `INSERT INTO products (name, category, duration_months, price, status, description, badge)
       VALUES (?, ?, ?, ?, 'in_stock', ?, ?)`,
      [name, category, durationMonths, price, description || null, badge || null]
    );

    await logAdminAction(adminId, 'create_product', {
      productId: result.insertId,
      name: name,
    });

    return res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm thành công',
      data: {
        productId: result.insertId,
      },
    });
  } catch (error) {
    console.error('Create Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi thêm sản phẩm',
      error: error.message,
    });
  }
}

async function updateProduct(req, res) {
  try {
    const adminId = req.user.id;
    const productId = req.params.id;
    const { name, price, status, description, badge } = req.body;

    let updateQuery = 'UPDATE products SET ';
    const params = [];
    const fields = [];

    if (name) {
      fields.push('name = ?');
      params.push(name);
    }
    if (price) {
      fields.push('price = ?');
      params.push(price);
    }
    if (status) {
      fields.push('status = ?');
      params.push(status);
    }
    if (description) {
      fields.push('description = ?');
      params.push(description);
    }
    if (badge) {
      fields.push('badge = ?');
      params.push(badge);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp thông tin cần cập nhật',
      });
    }

    updateQuery += fields.join(', ') + ' WHERE id = ?';
    params.push(productId);

    await db.update(updateQuery, params);

    await logAdminAction(adminId, 'update_product', {
      productId: productId,
    });

    return res.status(200).json({
      success: true,
      message: 'Cập nhật sản phẩm thành công',
    });
  } catch (error) {
    console.error('Update Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật sản phẩm',
      error: error.message,
    });
  }
}

async function deleteProduct(req, res) {
  try {
    const adminId = req.user.id;
    const productId = req.params.id;

    await db.deleteRecord('DELETE FROM products WHERE id = ?', [productId]);

    await logAdminAction(adminId, 'delete_product', {
      productId: productId,
    });

    return res.status(200).json({
      success: true,
      message: 'Xóa sản phẩm thành công',
    });
  } catch (error) {
    console.error('Delete Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xóa sản phẩm',
      error: error.message,
    });
  }
}

// =====================================================
// 6. DASHBOARD ADMIN - THỐNG KÊ
// =====================================================
async function getAdminDashboard(req, res) {
  try {
    // Doanh thu hôm nay
    const revenueToday = await db.getOne(
      `SELECT SUM(actual_price) as total FROM orders 
       WHERE DATE(created_at) = CURDATE()`,
      []
    );

    // Tổng doanh thu
    const totalRevenue = await db.getOne(
      'SELECT SUM(actual_price) as total FROM orders',
      []
    );

    // Tổng số user
    const totalUsers = await db.getOne(
      'SELECT COUNT(*) as count FROM users WHERE id != 1',
      []
    );

    // Tổng giao dịch pending
    const pendingDeposits = await db.getOne(
      'SELECT COUNT(*) as count FROM deposits WHERE status = "pending"',
      []
    );

    // Sản phẩm bán chạy nhất (7 ngày)
    const topProducts = await db.getAll(
      `SELECT p.id, p.name, COUNT(o.id) as sold_count 
       FROM products p
       LEFT JOIN orders o ON p.id = o.product_id
       WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY p.id
       ORDER BY sold_count DESC
       LIMIT 5`,
      []
    );

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          revenueToday: revenueToday.total || 0,
          totalRevenue: totalRevenue.total || 0,
          totalUsers: totalUsers.count || 0,
          pendingDeposits: pendingDeposits.count || 0,
        },
        topProducts: topProducts,
      },
    });
  } catch (error) {
    console.error('Get Admin Dashboard Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy thông tin dashboard',
      error: error.message,
    });
  }
}

// =====================================================
// HÀM HỖ TRỢ - Ghi log thao tác admin
// =====================================================
async function logAdminAction(adminId, action, details) {
  try {
    await db.insert(
      `INSERT INTO audit_logs (admin_id, action, details, ip_address)
       VALUES (?, ?, ?, ?)`,
      [adminId, action, JSON.stringify(details), '127.0.0.1']
    );
  } catch (error) {
    console.error('Log Admin Action Error:', error);
  }
}

module.exports = {
  approveDeposit,
  getPendingDeposits,
  addPremiumResource,
  getPremiumResources,
  createProduct,
  updateProduct,
  deleteProduct,
  getAdminDashboard,
};
