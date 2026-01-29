/**
 * =====================================================
 * PROFILE.JS - TRANG HỒ SƠ CÁ NHÂN
 * ===================================================== */

let currentUserProfile = null;

document.addEventListener('DOMContentLoaded', () => {
  loadUserProfile();
  setupTabSwitching();
  setupFormSubmissions();
});

// Load user profile
async function loadUserProfile() {
  try {
    if (!isLoggedIn()) {
      showToast('Vui lòng đăng nhập', 'warning');
      window.location.href = '/login.html';
      return;
    }

    const response = await userAPI.getProfile();

    if (response.success) {
      currentUserProfile = response.data;
      renderOverviewTab();
      renderInfoTab();
      updateProfileDisplay();
    } else {
      showToast(response.message || 'Lỗi tải hồ sơ', 'error');
    }
  } catch (error) {
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Setup tab switching
function setupTabSwitching() {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      switchTab(tabName);

      // Load data for specific tabs
      if (tabName === 'orders') loadOrderHistory();
      if (tabName === 'deposits') loadDepositHistory();
      if (tabName === 'security') loadLoginHistory();
    });
  });
}

// Setup form submissions
function setupFormSubmissions() {
  // Update profile form
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileUpdate);
  }

  // Change password form
  const passwordForm = document.getElementById('passwordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordChange);
  }

  // 2FA button
  const enable2FABtn = document.getElementById('enable2FABtn');
  if (enable2FABtn) {
    enable2FABtn.addEventListener('click', handleEnable2FA);
  }

  const verify2FABtn = document.getElementById('verify2FABtn');
  if (verify2FABtn) {
    verify2FABtn.addEventListener('click', handleVerify2FA);
  }
}

// Render overview tab
function renderOverviewTab() {
  const container = document.getElementById('overviewContent');
  const user = currentUserProfile.user;
  const wallet = currentUserProfile.wallet;
  const tierName = getTierName(user.user_tier);

  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-wallet"></i>
        </div>
        <div class="stat-content">
          <p class="stat-label">Số dư ví</p>
          <p class="stat-value">${formatCurrency(wallet.balance)}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-shopping-bag"></i>
        </div>
        <div class="stat-content">
          <p class="stat-label">Tổng chi tiêu</p>
          <p class="stat-value">${formatCurrency(wallet.total_spent)}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-star"></i>
        </div>
        <div class="stat-content">
          <p class="stat-label">Điểm thành viên</p>
          <p class="stat-value">${currentUserProfile.loyalty_points.total_points || 0}</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">
          <i class="fas fa-crown"></i>
        </div>
        <div class="stat-content">
          <p class="stat-label">Cấp độ</p>
          <p class="stat-value">${tierName}</p>
        </div>
      </div>
    </div>

    <div class="recent-orders">
      <h3><i class="fas fa-history"></i> Đơn hàng gần đây</h3>
      <div id="recentOrdersList" style="margin-top: 1rem;">
        <p style="text-align: center; color: var(--text-secondary);">Đang tải...</p>
      </div>
    </div>
  `;

  loadRecentOrders();
}

// Load recent orders
async function loadRecentOrders() {
  try {
    const response = await orderAPI.getOrderHistory({ limit: 5, offset: 0 });

    if (response.success) {
      const container = document.getElementById('recentOrdersList');
      const orders = response.data.orders;

      if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Chưa có đơn hàng nào</p>';
        return;
      }

      container.innerHTML = orders.map(order => `
        <div class="order-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 0.5rem;">
          <div>
            <p style="font-weight: 500;">${order.product_name}</p>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">Đơn #${order.id}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-weight: 600; color: var(--primary);">${formatCurrency(order.price)}</p>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">${formatDate(order.created_at)}</p>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Lỗi tải đơn hàng:', error);
  }
}

// Render info tab
function renderInfoTab() {
  const container = document.getElementById('infoContent');
  const user = currentUserProfile.user;

  container.innerHTML = `
    <form id="profileForm" class="form">
      <div class="form-group">
        <label for="fullName">Họ và tên</label>
        <input type="text" id="fullName" name="full_name" value="${user.full_name || ''}" placeholder="Nhập họ tên" required>
      </div>

      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" value="${user.email}" disabled style="background-color: var(--bg-secondary); cursor: not-allowed;">
      </div>

      <div class="form-group">
        <label for="username">Tên đăng nhập</label>
        <input type="text" id="username" value="${user.username}" disabled style="background-color: var(--bg-secondary); cursor: not-allowed;">
      </div>

      <div class="form-group">
        <label for="phone">Số điện thoại</label>
        <input type="tel" id="phone" name="phone" value="${user.phone || ''}" placeholder="Nhập số điện thoại">
      </div>

      <button type="submit" class="btn btn-primary">
        <i class="fas fa-save"></i> Cập nhật hồ sơ
      </button>
    </form>
  `;
}

// Handle profile update
async function handleProfileUpdate(e) {
  e.preventDefault();

  try {
    const formData = new FormData(e.target);
    const data = {
      full_name: formData.get('full_name'),
      phone: formData.get('phone'),
    };

    // Validation
    if (!data.full_name || data.full_name.trim().length < 2) {
      showToast('Vui lòng nhập họ tên hợp lệ', 'error');
      return;
    }

    if (data.phone && !isValidPhone(data.phone)) {
      showToast('Số điện thoại không hợp lệ', 'error');
      return;
    }

    const response = await userAPI.updateProfile(data);

    if (response.success) {
      currentUserProfile.user = { ...currentUserProfile.user, ...data };
      showToast('Cập nhật hồ sơ thành công', 'success');
    } else {
      showToast(response.message || 'Lỗi cập nhật', 'error');
    }
  } catch (error) {
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Handle password change
async function handlePasswordChange(e) {
  e.preventDefault();

  try {
    const formData = new FormData(e.target);
    const oldPassword = formData.get('oldPassword');
    const newPassword = formData.get('newPassword');
    const confirmPassword = formData.get('confirmPassword');

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Vui lòng điền đầy đủ thông tin', 'error');
      return;
    }

    if (!isValidPassword(newPassword)) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Mật khẩu xác nhận không khớp', 'error');
      return;
    }

    const response = await authAPI.changePassword(oldPassword, newPassword);

    if (response.success) {
      e.target.reset();
      showToast('Đổi mật khẩu thành công', 'success');
    } else {
      showToast(response.message || 'Lỗi đổi mật khẩu', 'error');
    }
  } catch (error) {
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Handle enable 2FA
async function handleEnable2FA() {
  try {
    const response = await userAPI.enable2FA();

    if (response.success) {
      const secret = response.data.secret;
      showToast('Mã bảo mật: ' + secret, 'success');
      alert(`Mã bảo mật:\n${secret}\n\nVui lòng lưu mã này ở nơi an toàn!`);
    }
  } catch (error) {
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Handle verify 2FA
async function handleVerify2FA() {
  try {
    const code = prompt('Nhập mã xác minh 2FA (demo: 000000):');
    if (!code) return;

    const response = await userAPI.verify2FA(code);

    if (response.success) {
      showToast('Bật 2FA thành công', 'success');
      currentUserProfile.user.twofa_enabled = true;
      loadUserProfile();
    } else {
      showToast(response.message || 'Mã xác minh sai', 'error');
    }
  } catch (error) {
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Load order history
async function loadOrderHistory() {
  try {
    const container = document.getElementById('ordersContent');
    container.innerHTML = '<p style="text-align: center;">Đang tải...</p>';

    const response = await orderAPI.getOrderHistory({ limit: 20, offset: 0 });

    if (response.success) {
      const orders = response.data.orders;

      if (orders.length === 0) {
        container.innerHTML = '<p style="text-align: center;">Chưa có đơn hàng nào</p>';
        return;
      }

      container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color);">
              <th style="padding: 1rem; text-align: left;">Sản phẩm</th>
              <th style="padding: 1rem; text-align: left;">Giá</th>
              <th style="padding: 1rem; text-align: left;">Ngày mua</th>
              <th style="padding: 1rem; text-align: left;">Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(order => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 1rem;">${order.product_name}</td>
                <td style="padding: 1rem;">${formatCurrency(order.price)}</td>
                <td style="padding: 1rem;">${formatDate(order.created_at)}</td>
                <td style="padding: 1rem;">
                  <button class="btn btn-sm btn-outline" onclick="viewOrderDetails(${order.id})">
                    Chi tiết
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (error) {
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// View order details
async function viewOrderDetails(orderId) {
  try {
    const response = await orderAPI.getOrderDetails(orderId);

    if (response.success) {
      const order = response.data;
      let details = `Đơn hàng #${order.id}\n\n`;
      details += `Sản phẩm: ${order.product_name}\n`;
      details += `Giá: ${formatCurrency(order.price)}\n`;
      details += `Ngày mua: ${formatDate(order.created_at)}\n\n`;
      details += `Email: ${order.resource_email || 'N/A'}\n`;
      details += `Mật khẩu: ${order.resource_password || 'N/A'}\n`;
      details += `Ghi chú: ${order.resource_notes || 'Không có'}\n`;

      alert(details);
    }
  } catch (error) {
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Load deposit history
async function loadDepositHistory() {
  try {
    const container = document.getElementById('depositsContent');
    container.innerHTML = '<p style="text-align: center;">Đang tải...</p>';

    const response = await depositAPI.getDepositHistory({ limit: 20, offset: 0 });

    if (response.success) {
      const deposits = response.data.deposits;

      if (deposits.length === 0) {
        container.innerHTML = '<p style="text-align: center;">Chưa có lịch sử nạp tiền nào</p>';
        return;
      }

      container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color);">
              <th style="padding: 1rem; text-align: left;">Mã giao dịch</th>
              <th style="padding: 1rem; text-align: left;">Số tiền</th>
              <th style="padding: 1rem; text-align: left;">Ngân hàng</th>
              <th style="padding: 1rem; text-align: left;">Trạng thái</th>
              <th style="padding: 1rem; text-align: left;">Ngày nạp</th>
            </tr>
          </thead>
          <tbody>
            ${deposits.map(deposit => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 1rem;">${deposit.transaction_code}</td>
                <td style="padding: 1rem;">${formatCurrency(deposit.amount)}</td>
                <td style="padding: 1rem;">${deposit.bank_name}</td>
                <td style="padding: 1rem;">
                  <span style="padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; background-color: ${getStatusColor(deposit.status)}; color: white;">
                    ${getStatusName(deposit.status)}
                  </span>
                </td>
                <td style="padding: 1rem;">${formatDate(deposit.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (error) {
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Load login history
async function loadLoginHistory() {
  try {
    const container = document.getElementById('securityContent');
    
    if (!container) return;

    container.innerHTML = `
      <div style="margin-bottom: 2rem;">
        <h3>Bảo mật tài khoản</h3>
        <button class="btn btn-primary" id="enable2FABtn" style="margin-top: 1rem;">
          <i class="fas fa-shield-alt"></i> Bật 2FA
        </button>
        <button class="btn btn-outline" id="verify2FABtn" style="margin-top: 1rem; margin-left: 0.5rem;">
          <i class="fas fa-check"></i> Xác minh 2FA
        </button>
      </div>

      <h3 style="margin-top: 2rem;">Thay đổi mật khẩu</h3>
      <form id="passwordForm" class="form">
        <div class="form-group">
          <label for="oldPassword">Mật khẩu hiện tại</label>
          <input type="password" id="oldPassword" name="oldPassword" required>
        </div>

        <div class="form-group">
          <label for="newPassword">Mật khẩu mới</label>
          <input type="password" id="newPassword" name="newPassword" required>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Xác nhận mật khẩu</label>
          <input type="password" id="confirmPassword" name="confirmPassword" required>
        </div>

        <button type="submit" class="btn btn-primary">
          <i class="fas fa-key"></i> Đổi mật khẩu
        </button>
      </form>

      <h3 style="margin-top: 2rem;">Lịch sử đăng nhập</h3>
      <div id="loginHistoryList" style="margin-top: 1rem;">
        <p style="text-align: center;">Đang tải...</p>
      </div>
    `;

    // Reload setup for new forms
    setupFormSubmissions();

    // Load login history
    const response = await userAPI.getLoginHistory({ limit: 20, offset: 0 });

    if (response.success) {
      const history = response.data.login_history;
      const list = document.getElementById('loginHistoryList');

      if (history.length === 0) {
        list.innerHTML = '<p style="text-align: center;">Không có lịch sử đăng nhập</p>';
        return;
      }

      list.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color);">
              <th style="padding: 1rem; text-align: left;">Thời gian</th>
              <th style="padding: 1rem; text-align: left;">IP Address</th>
              <th style="padding: 1rem; text-align: left;">Trạng thái</th>
              <th style="padding: 1rem; text-align: left;">Vị trí</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(log => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 1rem;">${formatDate(log.created_at)}</td>
                <td style="padding: 1rem;">${log.ip_address}</td>
                <td style="padding: 1rem;">
                  <span style="padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.875rem; background-color: ${log.status === 'success' ? '#10b981' : '#ef4444'}; color: white;">
                    ${log.status === 'success' ? 'Thành công' : 'Thất bại'}
                  </span>
                </td>
                <td style="padding: 1rem;">${log.location || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }
  } catch (error) {
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Update profile display in navbar
function updateProfileDisplay() {
  const user = currentUserProfile.user;
  const userDisplay = document.querySelector('.user-display');
  if (userDisplay) {
    userDisplay.textContent = user.full_name || user.username;
  }
}

// Helpers
function getTierName(tier) {
  const tiers = {
    1: 'Thành viên cơ bản',
    2: 'Thành viên Bạc',
    3: 'Thành viên Vàng',
    4: 'Thành viên Bạch Kim',
  };
  return tiers[tier] || 'Cơ bản';
}

function getStatusColor(status) {
  const colors = {
    'pending': '#f59e0b',
    'approved': '#10b981',
    'rejected': '#ef4444',
  };
  return colors[status] || '#6b7280';
}

function getStatusName(status) {
  const names = {
    'pending': 'Đang chờ',
    'approved': 'Đã phê duyệt',
    'rejected': 'Bị từ chối',
  };
  return names[status] || status;
}
