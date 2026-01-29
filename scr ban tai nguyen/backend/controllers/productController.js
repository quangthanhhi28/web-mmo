/**
 * =====================================================
 * CONTROLLER QUẢN LÝ SẢN PHẨM
 * =====================================================
 * Lấy danh sách sản phẩm, chi tiết sản phẩm
 */

const db = require('../models/database');

// =====================================================
// 1. LẤY DANH SÁCH SẢN PHẨM (Có filter)
// =====================================================
async function getProducts(req, res) {
  try {
    // Lấy filter từ query
    const category = req.query.category || null; // netflix_pre / spotify_pre / youtube_pre
    const status = req.query.status || 'in_stock'; // in_stock / out_of_stock
    const sort = req.query.sort || 'created_at'; // price / created_at / name
    const order = req.query.order || 'ASC'; // ASC / DESC
    const limit = parseInt(req.query.limit) || 12;
    const offset = parseInt(req.query.offset) || 0;

    // Xây dựng query
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Sắp xếp
    const validSortFields = ['created_at', 'price', 'name'];
    const validOrders = ['ASC', 'DESC'];
    const sortField = validSortFields.includes(sort) ? sort : 'created_at';
    const sortOrder = validOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

    query += ` ORDER BY ${sortField} ${sortOrder} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Lấy dữ liệu
    const products = await db.getAll(query, params);

    // Lấy tổng số sản phẩm
    let countQuery = 'SELECT COUNT(*) as count FROM products WHERE 1=1';
    const countParams = [];

    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    const total = await db.getOne(countQuery, countParams);

    // Format dữ liệu response
    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      durationMonths: p.duration_months,
      price: p.price,
      status: p.status,
      description: p.description,
      badge: p.badge,
      tierDiscounts: p.tier_discounts ? JSON.parse(p.tier_discounts) : {},
      cashbackPercent: p.cashback_percent,
    }));

    return res.status(200).json({
      success: true,
      data: {
        products: formattedProducts,
        pagination: {
          total: total.count,
          limit: limit,
          offset: offset,
          hasMore: (offset + limit) < total.count,
        },
      },
    });
  } catch (error) {
    console.error('Get Products Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy danh sách sản phẩm',
      error: error.message,
    });
  }
}

// =====================================================
// 2. LẤY CHI TIẾT SẢN PHẨM
// =====================================================
async function getProductById(req, res) {
  try {
    const productId = req.params.id;

    const product = await db.getOne(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Sản phẩm không tồn tại',
      });
    }

    // Lấy số lượng tài nguyên còn available
    const availableCount = await db.getOne(
      'SELECT COUNT(*) as count FROM premium_resources WHERE product_id = ? AND status = "available"',
      [productId]
    );

    // Format response
    const response = {
      id: product.id,
      name: product.name,
      category: product.category,
      durationMonths: product.duration_months,
      price: product.price,
      status: product.status,
      description: product.description,
      badge: product.badge,
      tierDiscounts: product.tier_discounts ? JSON.parse(product.tier_discounts) : {},
      cashbackPercent: product.cashback_percent,
      availableCount: availableCount.count,
    };

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Get Product Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy chi tiết sản phẩm',
      error: error.message,
    });
  }
}

// =====================================================
// 3. LẤY SẢN PHẨM HOT / RECOMMENDED
// =====================================================
async function getFeaturedProducts(req, res) {
  try {
    // Lấy sản phẩm có badge hot_seller hoặc recommended
    const products = await db.getAll(
      `SELECT * FROM products 
       WHERE badge IN ('hot_seller', 'recommended', 'best_price') 
       AND status = 'in_stock' 
       LIMIT 6`,
      []
    );

    const formattedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      durationMonths: p.duration_months,
      price: p.price,
      status: p.status,
      badge: p.badge,
      cashbackPercent: p.cashback_percent,
    }));

    return res.status(200).json({
      success: true,
      data: {
        products: formattedProducts,
      },
    });
  } catch (error) {
    console.error('Get Featured Products Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy sản phẩm nổi bật',
      error: error.message,
    });
  }
}

// =====================================================
// 4. LẤY THỐNG KÊ SẢN PHẨM (cho admin)
// =====================================================
async function getProductStats(req, res) {
  try {
    // Lấy sản phẩm bán chạy nhất (7 ngày gần đây)
    const topSelling = await db.getAll(
      `SELECT p.id, p.name, p.category, COUNT(o.id) as sold_count 
       FROM products p 
       LEFT JOIN orders o ON p.id = o.product_id 
       WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY p.id 
       ORDER BY sold_count DESC 
       LIMIT 5`,
      []
    );

    // Lấy tổng sản phẩm, hàng có sẵn, đã bán
    const stats = await db.getOne(
      `SELECT 
        (SELECT COUNT(*) FROM products) as total_products,
        (SELECT COUNT(*) FROM premium_resources WHERE status = 'available') as available_resources,
        (SELECT COUNT(*) FROM premium_resources WHERE status = 'sold') as sold_resources,
        (SELECT COUNT(*) FROM premium_resources WHERE status = 'expired') as expired_resources
       `,
      []
    );

    return res.status(200).json({
      success: true,
      data: {
        stats: stats,
        topSellingProducts: topSelling,
      },
    });
  } catch (error) {
    console.error('Get Product Stats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê sản phẩm',
      error: error.message,
    });
  }
}

module.exports = {
  getProducts,
  getProductById,
  getFeaturedProducts,
  getProductStats,
};
