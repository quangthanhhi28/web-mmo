/**
 * =====================================================
 * API CLIENT - XỬ LÝ GỌI API
 * =====================================================
 * Lớp API để giao tiếp với backend
 */

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Lấy token từ localStorage
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * Hàm fetch API chung
 * @param {string} endpoint - Endpoint API
 * @param {object} options - Tùy chọn (method, body, headers)
 */
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Headers mặc định
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Thêm token nếu có
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    // Nếu response không thành công
    if (!response.ok) {
      // Nếu lỗi 401 - token hết hạn, logout
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
      }

      throw new Error(data.message || 'Lỗi API');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/* =====================================================
   AUTH API
   ===================================================== */

const authAPI = {
  /**
   * Đăng ký tài khoản mới
   */
  register: async (email, username, password, confirmPassword, fullName) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        username,
        password,
        confirmPassword,
        fullName,
      }),
    });
  },

  /**
   * Đăng nhập
   */
  login: async (email, password) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
      }),
    });
  },

  /**
   * Thay đổi mật khẩu
   */
  changePassword: async (oldPassword, newPassword, confirmPassword) => {
    return apiCall('/user/change-password', {
      method: 'POST',
      body: JSON.stringify({
        oldPassword,
        newPassword,
        confirmPassword,
      }),
    });
  },
};

/* =====================================================
   USER API
   ===================================================== */

const userAPI = {
  /**
   * Lấy thông tin hồ sơ
   */
  getProfile: async () => {
    return apiCall('/user/profile', {
      method: 'GET',
    });
  },

  /**
   * Cập nhật thông tin hồ sơ
   */
  updateProfile: async (fullName, phone) => {
    return apiCall('/user/profile', {
      method: 'PUT',
      body: JSON.stringify({
        fullName,
        phone,
      }),
    });
  },

  /**
   * Lấy thông tin ví
   */
  getWallet: async () => {
    return apiCall('/user/wallet', {
      method: 'GET',
    });
  },

  /**
   * Lấy lịch sử đăng nhập
   */
  getLoginHistory: async (limit = 10, offset = 0) => {
    return apiCall(`/user/login-history?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  },

  /**
   * Bật 2FA
   */
  enable2FA: async () => {
    return apiCall('/user/enable-2fa', {
      method: 'GET',
    });
  },

  /**
   * Xác thực 2FA
   */
  verify2FA: async (code) => {
    return apiCall('/user/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },
};

/* =====================================================
   PRODUCT API
   ===================================================== */

const productAPI = {
  /**
   * Lấy danh sách sản phẩm với filter
   */
  getProducts: async (filters = {}) => {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.order) params.append('order', filters.order);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    return apiCall(`/products?${params.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Lấy chi tiết sản phẩm
   */
  getProductById: async (productId) => {
    return apiCall(`/products/${productId}`, {
      method: 'GET',
    });
  },

  /**
   * Lấy sản phẩm nổi bật
   */
  getFeaturedProducts: async () => {
    return apiCall('/products/featured/all', {
      method: 'GET',
    });
  },

  /**
   * Lấy thống kê sản phẩm
   */
  getProductStats: async () => {
    return apiCall('/products/stats/dashboard', {
      method: 'GET',
    });
  },
};

/* =====================================================
   ORDER API
   ===================================================== */

const orderAPI = {
  /**
   * Mua sản phẩm
   */
  purchaseProduct: async (productId, voucherId = null) => {
    return apiCall('/order/buy', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        voucherId,
      }),
    });
  },

  /**
   * Lấy lịch sử mua hàng
   */
  getOrderHistory: async (limit = 10, offset = 0) => {
    return apiCall(`/order/history?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  },

  /**
   * Lấy chi tiết đơn hàng
   */
  getOrderDetails: async (orderId) => {
    return apiCall(`/order/${orderId}`, {
      method: 'GET',
    });
  },
};

/* =====================================================
   DEPOSIT API
   ===================================================== */

const depositAPI = {
  /**
   * Lấy danh sách ngân hàng
   */
  getBankInfo: async () => {
    return apiCall('/deposit/banks', {
      method: 'GET',
    });
  },

  /**
   * Tạo giao dịch nạp tiền
   */
  createDeposit: async (amount, bankName) => {
    return apiCall('/deposit/create', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        bankName,
      }),
    });
  },

  /**
   * Kiểm tra/xác nhận giao dịch
   */
  confirmDeposit: async (depositId) => {
    return apiCall('/deposit/confirm', {
      method: 'POST',
      body: JSON.stringify({
        depositId,
      }),
    });
  },

  /**
   * Lấy lịch sử nạp tiền
   */
  getDepositHistory: async (limit = 10, offset = 0) => {
    return apiCall(`/deposit/history?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  },
};

/* =====================================================
   ADMIN API
   ===================================================== */

const adminAPI = {
  /**
   * Duyệt giao dịch nạp tiền
   */
  approveDeposit: async (depositId, approve, reason = null) => {
    return apiCall('/admin/deposit/approve', {
      method: 'POST',
      body: JSON.stringify({
        depositId,
        approve,
        reason,
      }),
    });
  },

  /**
   * Lấy danh sách giao dịch chờ duyệt
   */
  getPendingDeposits: async (limit = 20, offset = 0) => {
    return apiCall(`/admin/deposit/pending?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  },

  /**
   * Thêm tài nguyên
   */
  addPremiumResource: async (productId, email, password, notes, expiryDate) => {
    return apiCall('/admin/resource/add', {
      method: 'POST',
      body: JSON.stringify({
        productId,
        email,
        password,
        notes,
        expiryDate,
      }),
    });
  },

  /**
   * Lấy danh sách tài nguyên
   */
  getPremiumResources: async (productId = null, status = 'available', limit = 20, offset = 0) => {
    const params = new URLSearchParams();
    if (productId) params.append('productId', productId);
    params.append('status', status);
    params.append('limit', limit);
    params.append('offset', offset);

    return apiCall(`/admin/resource/list?${params.toString()}`, {
      method: 'GET',
    });
  },

  /**
   * Thêm sản phẩm
   */
  createProduct: async (name, category, durationMonths, price, description, badge) => {
    return apiCall('/admin/product/create', {
      method: 'POST',
      body: JSON.stringify({
        name,
        category,
        durationMonths,
        price,
        description,
        badge,
      }),
    });
  },

  /**
   * Cập nhật sản phẩm
   */
  updateProduct: async (productId, updates) => {
    return apiCall(`/admin/product/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Xóa sản phẩm
   */
  deleteProduct: async (productId) => {
    return apiCall(`/admin/product/${productId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Lấy dashboard admin
   */
  getDashboard: async () => {
    return apiCall('/admin/dashboard', {
      method: 'GET',
    });
  },
};

/* =====================================================
   HELPER FUNCTIONS
   ===================================================== */

/**
 * Kiểm tra xem user đã đăng nhập hay chưa
 */
function isLoggedIn() {
  return !!getToken();
}

/**
 * Lấy user hiện tại
 */
function getCurrentUser() {
  const userJson = localStorage.getItem('user');
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Lưu token và user info
 */
function saveAuthData(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Logout
 */
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}
