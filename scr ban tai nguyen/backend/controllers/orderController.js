/**
 * =====================================================
 * CONTROLLER QUẢN LÝ ĐƠN HÀNG
 * =====================================================
 * Mua sản phẩm, lấy lịch sử mua hàng
 */

const db = require('../models/database');

// =====================================================
// 1. MUA HÀNG / TẠO ĐƠN HÀNG
// =====================================================
async function purchaseProduct(req, res) {
  try {
    const userId = req.user.id;
    const { productId, voucherId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn sản phẩm',
      });
    }

    // 1. Kiểm tra sản phẩm tồn tại
    const product = await db.getOne(
      'SELECT id, name, price, status, tier_discounts, cashback_percent FROM products WHERE id = ?',
      [productId]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại',
      });
    }

    if (product.status === 'out_of_stock') {
      return res.status(400).json({
        success: false,
        message: 'Sản phẩm hết hàng',
      });
    }

    // 2. Lấy thông tin user và ví
    const user = await db.getOne(
      'SELECT user_tier FROM users WHERE id = ?',
      [userId]
    );

    const wallet = await db.getOne(
      'SELECT balance, total_spent FROM wallets WHERE user_id = ?',
      [userId]
    );

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Ví không tồn tại',
      });
    }

    // 3. Tính giá sau chiết khấu
    let basePrice = product.price;
    let discountPercent = 0;
    let discountAmount = 0;

    // Áp dụng chiết khấu theo cấp bậc
    const tierDiscounts = product.tier_discounts ? JSON.parse(product.tier_discounts) : {};
    if (tierDiscounts[user.user_tier]) {
      discountPercent = tierDiscounts[user.user_tier];
      discountAmount = Math.floor(basePrice * discountPercent / 100);
    }

    let finalPrice = basePrice - discountAmount;

    // 4. Áp dụng voucher (nếu có)
    if (voucherId) {
      const voucher = await db.getOne(
        `SELECT discount_type, discount_value FROM vouchers 
         WHERE id = ? AND expiry_date > NOW() AND used_count < max_uses`,
        [voucherId]
      );

      if (voucher) {
        if (voucher.discount_type === 'percent') {
          const voucherDiscount = Math.floor(finalPrice * voucher.discount_value / 100);
          finalPrice -= voucherDiscount;
        } else if (voucher.discount_type === 'fixed') {
          finalPrice -= voucher.discount_value;
        }
        finalPrice = Math.max(finalPrice, 0); // Không được âm
      }
    }

    // 5. Kiểm tra số dư
    if (wallet.balance < finalPrice) {
      return res.status(400).json({
        success: false,
        message: `Số dư không đủ. Bạn cần thêm ${finalPrice - wallet.balance} VND`,
        needed: finalPrice - wallet.balance,
        balance: wallet.balance,
      });
    }

    // 6. Lấy tài nguyên (account)
    const resource = await db.getOne(
      `SELECT id, resource_email, resource_password, notes FROM premium_resources 
       WHERE product_id = ? AND status = 'available' LIMIT 1`,
      [productId]
    );

    if (!resource) {
      return res.status(400).json({
        success: false,
        message: 'Không còn tài nguyên có sẵn',
      });
    }

    // 7. Tính cashback
    const cashbackPercent = product.cashback_percent || 0;
    const cashbackAmount = Math.floor(finalPrice * cashbackPercent / 100);

    // 8. Tạo đơn hàng
    const orderResult = await db.insert(
      `INSERT INTO orders (user_id, product_id, price_paid, discount_applied, actual_price, cashback_earned, status, resource_email, resource_password, resource_notes)
       VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?)`,
      [userId, productId, basePrice, discountPercent, finalPrice, cashbackAmount, resource.resource_email, resource.resource_password, resource.notes]
    );

    const orderId = orderResult.insertId;

    // 9. Cập nhật tài nguyên thành "sold"
    await db.update(
      'UPDATE premium_resources SET status = "sold", sold_at = NOW(), order_id = ? WHERE id = ?',
      [orderId, resource.id]
    );

    // 10. Trừ tiền từ ví
    const newBalance = wallet.balance - finalPrice;
    await db.update(
      `UPDATE wallets SET balance = ?, total_spent = total_spent + ? WHERE user_id = ?`,
      [newBalance, finalPrice, userId]
    );

    // 11. Cộng cashback vào ví
    if (cashbackAmount > 0) {
      await db.update(
        `UPDATE wallets SET balance = balance + ? WHERE user_id = ?`,
        [cashbackAmount, userId]
      );
    }

    // 12. Cộng điểm tích lũy
    const pointsEarned = Math.floor(finalPrice / 1000); // 1000 VND = 1 point
    if (pointsEarned > 0) {
      await db.update(
        'UPDATE loyalty_points SET total_points = total_points + ? WHERE user_id = ?',
        [pointsEarned, userId]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Mua hàng thành công',
      data: {
        orderId: orderId,
        product: {
          id: product.id,
          name: product.name,
        },
        pricing: {
          originalPrice: basePrice,
          discountPercent: discountPercent,
          discountAmount: discountAmount,
          finalPrice: finalPrice,
        },
        resource: {
          email: resource.resource_email,
          password: resource.resource_password,
          notes: resource.notes,
        },
        cashback: {
          amount: cashbackAmount,
          percentage: cashbackPercent,
        },
        wallet: {
          newBalance: newBalance + cashbackAmount,
        },
        pointsEarned: pointsEarned,
      },
    });
  } catch (error) {
    console.error('Purchase Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi mua hàng',
      error: error.message,
    });
  }
}

// =====================================================
// 2. LẤY LỊCH SỬ MUA HÀNG
// =====================================================
async function getOrderHistory(req, res) {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // Lấy lịch sử mua hàng
    const orders = await db.getAll(
      `SELECT 
        o.id, o.product_id, o.price_paid, o.discount_applied, o.actual_price, 
        o.cashback_earned, o.status, o.created_at,
        p.name as product_name, p.category, p.duration_months
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Lấy tổng số đơn
    const total = await db.getOne(
      'SELECT COUNT(*) as count FROM orders WHERE user_id = ?',
      [userId]
    );

    // Format response
    const formattedOrders = orders.map(o => ({
      orderId: o.id,
      product: {
        id: o.product_id,
        name: o.product_name,
        category: o.category,
        durationMonths: o.duration_months,
      },
      pricing: {
        originalPrice: o.price_paid,
        discountApplied: o.discount_applied,
        finalPrice: o.actual_price,
      },
      cashbackEarned: o.cashback_earned,
      status: o.status,
      purchasedAt: o.created_at,
    }));

    return res.status(200).json({
      success: true,
      data: {
        orders: formattedOrders,
        pagination: {
          total: total.count,
          limit: limit,
          offset: offset,
          hasMore: (offset + limit) < total.count,
        },
      },
    });
  } catch (error) {
    console.error('Get Order History Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy lịch sử mua hàng',
      error: error.message,
    });
  }
}

// =====================================================
// 3. LẤY CHI TIẾT ĐƠN HÀNG
// =====================================================
async function getOrderDetails(req, res) {
  try {
    const userId = req.user.id;
    const orderId = req.params.id;

    const order = await db.getOne(
      `SELECT 
        o.id, o.product_id, o.price_paid, o.discount_applied, o.actual_price,
        o.cashback_earned, o.status, o.resource_email, o.resource_password, 
        o.resource_notes, o.created_at,
        p.name as product_name, p.category, p.description, p.duration_months
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.id = ? AND o.user_id = ?`,
      [orderId, userId]
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Đơn hàng không tồn tại',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        product: {
          id: order.product_id,
          name: order.product_name,
          category: order.category,
          description: order.description,
          durationMonths: order.duration_months,
        },
        pricing: {
          originalPrice: order.price_paid,
          discountApplied: order.discount_applied,
          finalPrice: order.actual_price,
        },
        resource: {
          email: order.resource_email,
          password: order.resource_password,
          notes: order.resource_notes,
        },
        cashbackEarned: order.cashback_earned,
        status: order.status,
        purchasedAt: order.created_at,
      },
    });
  } catch (error) {
    console.error('Get Order Details Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy chi tiết đơn hàng',
      error: error.message,
    });
  }
}

module.exports = {
  purchaseProduct,
  getOrderHistory,
  getOrderDetails,
};
