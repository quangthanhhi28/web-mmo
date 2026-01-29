-- =====================================================
-- DATABASE SCHEMA - BÁN TÀI NGUYÊN PREMIUM VIỆT NAM
-- =====================================================
-- Khởi tạo database MySQL
CREATE DATABASE IF NOT EXISTS scr_ban_tai_nguyen;
USE scr_ban_tai_nguyen;

-- =====================================================
-- BẢNG NGƯỜI DÙNG (Users)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  
  -- Cấp bậc người dùng: user / vip_silver / vip_gold / vip_diamond
  user_tier VARCHAR(50) DEFAULT 'user',
  
  -- Bảo mật: 2FA enable/disable
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  two_fa_secret VARCHAR(255),
  
  -- Trạng thái tài khoản
  is_active BOOLEAN DEFAULT TRUE,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_until DATETIME,
  locked_reason VARCHAR(255),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login DATETIME
);

-- =====================================================
-- BẢNG VÍ NGƯỜI DÙNG (Wallets)
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  
  -- Số dư hiện tại (VND)
  balance BIGINT DEFAULT 0,
  
  -- Thống kê
  total_deposited BIGINT DEFAULT 0,  -- Tổng tiền đã nạp
  total_spent BIGINT DEFAULT 0,       -- Tổng tiền đã chi
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- BẢNG SẢN PHẨM PREMIUM (Products)
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Tên sản phẩm
  name VARCHAR(255) NOT NULL,
  
  -- Loại sản phẩm: netflix_pre / spotify_pre / youtube_pre
  category VARCHAR(100) NOT NULL,
  
  -- Thời hạn (đơn vị: tháng)
  duration_months INT NOT NULL,
  
  -- Giá bán (VND)
  price BIGINT NOT NULL,
  
  -- Trạng thái hàng: in_stock / out_of_stock
  status VARCHAR(50) DEFAULT 'in_stock',
  
  -- Mô tả chi tiết
  description TEXT,
  
  -- Badge: hot_seller / recommended / best_price / new
  badge VARCHAR(50),
  
  -- Chiết khấu theo cấp bậc (JSON: {"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15})
  tier_discounts JSON,
  
  -- Cashback %
  cashback_percent DECIMAL(5,2) DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =====================================================
-- BẢNG ĐƠN HÀNG (Orders)
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  
  -- Giá mua lúc đó (lưu để theo dõi lịch sử)
  price_paid BIGINT NOT NULL,
  
  -- Chiết khấu áp dụng %
  discount_applied DECIMAL(5,2) DEFAULT 0,
  
  -- Tiền thực tế trả
  actual_price BIGINT NOT NULL,
  
  -- Cashback nhận được
  cashback_earned BIGINT DEFAULT 0,
  
  -- Trạng thái: pending / completed / cancelled
  status VARCHAR(50) DEFAULT 'completed',
  
  -- Tài nguyên được cấp
  resource_email VARCHAR(255),
  resource_password VARCHAR(255),
  resource_notes TEXT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- =====================================================
-- BẢNG TÀI NGUYÊN PREMIUM (Premium Resources)
-- =====================================================
CREATE TABLE IF NOT EXISTS premium_resources (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL,
  
  -- Loại trạng thái: available / sold / expired
  status VARCHAR(50) DEFAULT 'available',
  
  -- Email / Tài khoản
  resource_email VARCHAR(255),
  
  -- Mật khẩu (có thể mã hóa thêm)
  resource_password VARCHAR(255),
  
  -- Ghi chú riêng
  notes TEXT,
  
  -- Thời gian hết hạn
  expiry_date DATETIME,
  
  -- Ngày bán
  sold_at DATETIME,
  
  -- ID đơn hàng khi được bán
  order_id INT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- =====================================================
-- BẢNG NẠP TIỀN (Deposits)
-- =====================================================
CREATE TABLE IF NOT EXISTS deposits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  
  -- Mã giao dịch duy nhất (USERID + TIMESTAMP)
  transaction_code VARCHAR(100) UNIQUE NOT NULL,
  
  -- Số tiền nạp (VND)
  amount BIGINT NOT NULL,
  
  -- Ngân hàng: vietcombank / mbbank / techcombank / bidv / momo
  bank_name VARCHAR(100) NOT NULL,
  
  -- Số tài khoản nhận
  account_number VARCHAR(50),
  
  -- Tên chủ tài khoản
  account_owner VARCHAR(255),
  
  -- Trạng thái: pending / approved / rejected
  status VARCHAR(50) DEFAULT 'pending',
  
  -- Lý do từ chối (nếu có)
  rejection_reason VARCHAR(255),
  
  -- Admin duyệt
  approved_by INT,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- BẢNG LỊCH SỬ ĐĂNG NHẬP (Login History)
-- =====================================================
CREATE TABLE IF NOT EXISTS login_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  
  -- IP Address
  ip_address VARCHAR(50),
  
  -- User Agent (thiết bị)
  user_agent TEXT,
  
  -- Trạng thái: success / failed
  status VARCHAR(50) DEFAULT 'success',
  
  -- Lý do thất bại
  failure_reason VARCHAR(255),
  
  -- Vị trí địa lý (có thể lấy từ IP)
  location VARCHAR(255),
  
  -- Có phải đăng nhập lạ không
  is_suspicious BOOLEAN DEFAULT FALSE,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- BẢNG VOUCHER
-- =====================================================
CREATE TABLE IF NOT EXISTS vouchers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  
  -- Mã voucher
  code VARCHAR(100) UNIQUE NOT NULL,
  
  -- Loại giảm: percent / fixed
  discount_type VARCHAR(50),
  
  -- Giá trị giảm
  discount_value BIGINT NOT NULL,
  
  -- Số lần sử dụng tối đa
  max_uses INT,
  
  -- Số lần đã sử dụng
  used_count INT DEFAULT 0,
  
  -- Hạn sử dụng
  expiry_date DATETIME,
  
  -- Áp dụng cho cấp nào: all / vip_silver / vip_gold / vip_diamond
  applicable_tier VARCHAR(100) DEFAULT 'all',
  
  -- Tối thiểu mua
  min_order_value BIGINT DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (id) REFERENCES vouchers(id)
);

-- =====================================================
-- BẢNG VOUCHER CÓ THỂ CLAIM (User Vouchers)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_vouchers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  voucher_id INT NOT NULL,
  
  -- Đã dùng chưa
  is_used BOOLEAN DEFAULT FALSE,
  
  -- Thời gian claim
  claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Thời gian dùng
  used_at DATETIME,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE
);

-- =====================================================
-- BẢNG ĐIỂM TÍCH LŨY (Points)
-- =====================================================
CREATE TABLE IF NOT EXISTS loyalty_points (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL UNIQUE,
  
  -- Tổng điểm
  total_points BIGINT DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- BẢNG NHẬT KÝ THAO TÁC ADMIN (Audit Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  admin_id INT NOT NULL,
  
  -- Hành động: create_product / delete_product / approve_deposit / lock_user
  action VARCHAR(255) NOT NULL,
  
  -- Chi tiết
  details JSON,
  
  -- IP Admin
  ip_address VARCHAR(50),
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =====================================================
-- CHỈ MỤC (Indexes)
-- =====================================================
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_username ON users(username);
CREATE INDEX idx_user_tier ON users(user_tier);
CREATE INDEX idx_wallet_user_id ON wallets(user_id);
CREATE INDEX idx_product_category ON products(category);
CREATE INDEX idx_order_user_id ON orders(user_id);
CREATE INDEX idx_order_created ON orders(created_at);
CREATE INDEX idx_deposit_user_id ON deposits(user_id);
CREATE INDEX idx_deposit_status ON deposits(status);
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_premium_resource_status ON premium_resources(status);

-- =====================================================
-- DỮ LIỆU MẪU
-- =====================================================

-- 1. Thêm Admin
INSERT INTO users (email, username, password_hash, full_name, user_tier) VALUES
('admin@scr.vn', 'admin', '$2b$10$YmF0Y0ppcEQyT1Exck1lRe5JNhBGrHFI2Z0Ci9GBZKLKZqLVLQN4O', 'Quản Trị Viên', 'user');

-- 2. Tạo ví cho admin
INSERT INTO wallets (user_id, balance, total_deposited) VALUES
(1, 1000000000, 0);

-- 3. Thêm sản phẩm mẫu
INSERT INTO products (name, category, duration_months, price, status, description, badge, tier_discounts, cashback_percent) VALUES
('Netflix Premium 1 Tháng', 'netflix_pre', 1, 79000, 'in_stock', 'Tài khoản Netflix Premium 1 tháng', 'recommended', '{"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15}', 2),
('Netflix Premium 3 Tháng', 'netflix_pre', 3, 199000, 'in_stock', 'Tài khoản Netflix Premium 3 tháng', 'best_price', '{"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15}', 2),
('Netflix Premium 6 Tháng', 'netflix_pre', 6, 379000, 'in_stock', 'Tài khoản Netflix Premium 6 tháng', 'hot_seller', '{"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15}', 3),
('Spotify Premium 1 Tháng', 'spotify_pre', 1, 29000, 'in_stock', 'Tài khoản Spotify Premium 1 tháng', 'recommended', '{"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15}', 2),
('Spotify Premium 3 Tháng', 'spotify_pre', 3, 79000, 'in_stock', 'Tài khoản Spotify Premium 3 tháng', 'best_price', '{"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15}', 2),
('Spotify Premium 6 Tháng', 'spotify_pre', 6, 149000, 'in_stock', 'Tài khoản Spotify Premium 6 tháng', 'hot_seller', '{"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15}', 3),
('YouTube Premium 1 Tháng', 'youtube_pre', 1, 33900, 'in_stock', 'Tài khoản YouTube Premium 1 tháng', 'new', '{"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15}', 2),
('YouTube Premium 3 Tháng', 'youtube_pre', 3, 99900, 'in_stock', 'Tài khoản YouTube Premium 3 tháng', 'best_price', '{"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15}', 2),
('YouTube Premium 6 Tháng', 'youtube_pre', 6, 199900, 'in_stock', 'Tài khoản YouTube Premium 6 tháng', 'hot_seller', '{"user": 0, "vip_silver": 5, "vip_gold": 10, "vip_diamond": 15}', 3);

-- 4. Thêm voucher mẫu
INSERT INTO vouchers (code, discount_type, discount_value, max_uses, expiry_date, applicable_tier, min_order_value) VALUES
('FIRST50', 'fixed', 50000, 100, DATE_ADD(NOW(), INTERVAL 30 DAY), 'all', 100000),
('VIP10', 'percent', 10, 999, DATE_ADD(NOW(), INTERVAL 90 DAY), 'vip_silver', 50000),
('DIAMOND20', 'percent', 20, 999, DATE_ADD(NOW(), INTERVAL 90 DAY), 'vip_diamond', 0);

-- 5. Thêm bảng QR code ngân hàng (tạo thêm nếu cần)
-- Lưu ý: Thông tin ngân hàng này có thể thay đổi, không để công khai trong database
-- Sẽ lưu trong file config riêng và bảo mật

-- =====================================================
-- KẾT THÚC
-- =====================================================
