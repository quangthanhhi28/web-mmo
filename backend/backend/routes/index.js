/**
 * =====================================================
 * ĐỊNH TUYẾN CHÍNH (Main Routes)
 * =====================================================
 * Kết nối tất cả các route con
 */

const express = require('express');
const router = express.Router();

// Import các controller
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const orderController = require('../controllers/orderController');
const depositController = require('../controllers/depositController');
const adminController = require('../controllers/adminController');

// Import middleware
const { authenticateToken, isAdmin, checkAccountStatus } = require('../middleware/auth');

// =====================================================
// ROUTE XÁC THỰC (Auth) - KHÔNG CẦN TOKEN
// =====================================================

// POST /api/auth/register - Đăng ký tài khoản mới
router.post('/auth/register', authController.registerUser);

// POST /api/auth/login - Đăng nhập
router.post('/auth/login', authController.loginUser);

// =====================================================
// ROUTE NGƯỜI DÙNG - CẦN TOKEN
// =====================================================

// GET /api/user/profile - Lấy thông tin hồ sơ
router.get('/user/profile', authenticateToken, checkAccountStatus, userController.getUserProfile);

// PUT /api/user/profile - Cập nhật hồ sơ
router.put('/user/profile', authenticateToken, checkAccountStatus, userController.updateUserProfile);

// POST /api/user/change-password - Thay đổi mật khẩu
router.post('/user/change-password', authenticateToken, checkAccountStatus, authController.changePassword);

// GET /api/user/wallet - Lấy thông tin ví
router.get('/user/wallet', authenticateToken, checkAccountStatus, userController.getWalletInfo);

// GET /api/user/login-history - Lấy lịch sử đăng nhập
router.get('/user/login-history', authenticateToken, checkAccountStatus, userController.getLoginHistory);

// GET /api/user/enable-2fa - Bật 2FA
router.get('/user/enable-2fa', authenticateToken, checkAccountStatus, userController.enable2FA);

// POST /api/user/verify-2fa - Xác thực 2FA
router.post('/user/verify-2fa', authenticateToken, checkAccountStatus, userController.verify2FA);

// =====================================================
// ROUTE SẢN PHẨM - KHÔNG CẦN TOKEN (PUBLIC)
// =====================================================

// GET /api/products - Lấy danh sách sản phẩm
router.get('/products', productController.getProducts);

// GET /api/products/:id - Lấy chi tiết sản phẩm
router.get('/products/:id', productController.getProductById);

// GET /api/products/featured/all - Lấy sản phẩm nổi bật
router.get('/products/featured/all', productController.getFeaturedProducts);

// GET /api/products/stats/dashboard - Thống kê sản phẩm
router.get('/products/stats/dashboard', productController.getProductStats);

// =====================================================
// ROUTE ĐƠN HÀNG - CẦN TOKEN
// =====================================================

// POST /api/order/buy - Mua sản phẩm
router.post('/order/buy', authenticateToken, checkAccountStatus, orderController.purchaseProduct);

// GET /api/order/history - Lấy lịch sử mua hàng
router.get('/order/history', authenticateToken, checkAccountStatus, orderController.getOrderHistory);

// GET /api/order/:id - Lấy chi tiết đơn hàng
router.get('/order/:id', authenticateToken, checkAccountStatus, orderController.getOrderDetails);

// =====================================================
// ROUTE NẠP TIỀN - CẦN TOKEN
// =====================================================

// GET /api/deposit/banks - Lấy thông tin ngân hàng
router.get('/deposit/banks', depositController.getBankInfo);

// POST /api/deposit/create - Tạo giao dịch nạp tiền
router.post('/deposit/create', authenticateToken, checkAccountStatus, depositController.createDeposit);

// POST /api/deposit/confirm - Kiểm tra giao dịch
router.post('/deposit/confirm', authenticateToken, checkAccountStatus, depositController.confirmDeposit);

// GET /api/deposit/history - Lấy lịch sử nạp tiền
router.get('/deposit/history', authenticateToken, checkAccountStatus, depositController.getDepositHistory);

// =====================================================
// ROUTE ADMIN - CẦN TOKEN ADMIN
// =====================================================

// POST /api/admin/deposit/approve - Duyệt giao dịch nạp tiền
router.post('/admin/deposit/approve', authenticateToken, isAdmin, adminController.approveDeposit);

// GET /api/admin/deposit/pending - Lấy giao dịch chờ duyệt
router.get('/admin/deposit/pending', authenticateToken, isAdmin, adminController.getPendingDeposits);

// POST /api/admin/resource/add - Thêm tài nguyên
router.post('/admin/resource/add', authenticateToken, isAdmin, adminController.addPremiumResource);

// GET /api/admin/resource/list - Lấy danh sách tài nguyên
router.get('/admin/resource/list', authenticateToken, isAdmin, adminController.getPremiumResources);

// POST /api/admin/product/create - Thêm sản phẩm
router.post('/admin/product/create', authenticateToken, isAdmin, adminController.createProduct);

// PUT /api/admin/product/:id - Sửa sản phẩm
router.put('/admin/product/:id', authenticateToken, isAdmin, adminController.updateProduct);

// DELETE /api/admin/product/:id - Xóa sản phẩm
router.delete('/admin/product/:id', authenticateToken, isAdmin, adminController.deleteProduct);

// GET /api/admin/dashboard - Lấy dashboard admin
router.get('/admin/dashboard', authenticateToken, isAdmin, adminController.getAdminDashboard);

// =====================================================
// ROUTE MẶC ĐỊNH - 404
// =====================================================

router.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route không tồn tại',
  });
});

module.exports = router;
