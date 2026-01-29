/**
 * =====================================================
 * UTILITY FUNCTIONS - CÁC HÀM HỖ TRỢ
 * =====================================================
 * Các hàm dùng chung cho tất cả pages
 */

/* =====================================================
   TOAST NOTIFICATIONS
   ===================================================== */

/**
 * Hiển thị toast notification
 * @param {string} message - Nội dung thông báo
 * @param {string} type - Loại: success, error, warning, info
 * @param {number} duration - Thời lượng (ms)
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const iconMap = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-circle',
    info: 'fa-info-circle',
  };
  
  toast.innerHTML = `
    <i class="fas ${iconMap[type] || 'fa-info-circle'} toast-icon"></i>
    <div class="toast-content">
      <p class="toast-message">${message}</p>
    </div>
    <i class="fas fa-times toast-close" onclick="this.parentElement.remove()"></i>
  `;
  
  container.appendChild(toast);
  
  // Tự động xóa sau duration
  setTimeout(() => {
    toast.remove();
  }, duration);
}

/* =====================================================
   FORMAT FUNCTIONS
   ===================================================== */

/**
 * Format tiền tệ VND
 * @param {number} amount - Số tiền
 * @returns {string} - Tiền đã format
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format số điểm
 * @param {number} points - Số điểm
 * @returns {string} - Số đã format
 */
function formatNumber(number) {
  return new Intl.NumberFormat('vi-VN').format(number);
}

/**
 * Format ngày tháng
 * @param {string|Date} date - Ngày
 * @param {string} format - Định dạng (default: 'dd/MM/yyyy HH:mm')
 */
function formatDate(date, format = 'dd/MM/yyyy HH:mm') {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  };

  return date.toLocaleString('vi-VN', options);
}

/**
 * Format thời gian tương đối (e.g., "2 giờ trước")
 * @param {string|Date} date - Ngày
 */
function formatTimeAgo(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }

  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  const intervals = {
    năm: 31536000,
    tháng: 2592000,
    tuần: 604800,
    ngày: 86400,
    giờ: 3600,
    phút: 60,
  };

  for (const [key, value] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / value);
    if (interval >= 1) {
      return `${interval} ${key} trước`;
    }
  }

  return 'Vừa xong';
}

/* =====================================================
   VALIDATION FUNCTIONS
   ===================================================== */

/**
 * Validate email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate username
 */
function isValidUsername(username) {
  return username.length >= 3 && username.length <= 20;
}

/**
 * Validate password
 */
function isValidPassword(password) {
  return password.length >= 6;
}

/**
 * Validate phone
 */
function isValidPhone(phone) {
  const phoneRegex = /^(\+84|0)[0-9]{9}$/;
  return phoneRegex.test(phone);
}

/* =====================================================
   DOM FUNCTIONS
   ===================================================== */

/**
 * Hiển thị/ẩn password
 */
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

/**
 * Sao chép text vào clipboard
 */
function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  const text = element.textContent;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Đã sao chép!', 'success', 2000);
  }).catch(() => {
    showToast('Lỗi sao chép', 'error');
  });
}

/**
 * Lấy giá trị form
 */
function getFormData(formId) {
  const form = document.getElementById(formId);
  const formData = new FormData(form);
  return Object.fromEntries(formData);
}

/**
 * Set giá trị form
 */
function setFormData(formId, data) {
  const form = document.getElementById(formId);
  for (const [key, value] of Object.entries(data)) {
    const input = form.elements[key];
    if (input) {
      input.value = value;
    }
  }
}

/**
 * Clear form
 */
function clearForm(formId) {
  const form = document.getElementById(formId);
  form.reset();
}

/**
 * Disable form
 */
function disableForm(formId, disabled = true) {
  const form = document.getElementById(formId);
  const elements = form.elements;
  for (let i = 0; i < elements.length; i++) {
    elements[i].disabled = disabled;
  }
}

/* =====================================================
   NAVIGATION & AUTH
   ===================================================== */

/**
 * Cập nhật navbar khi đăng nhập/đăng xuất
 */
function updateNavbar() {
  const authDiv = document.getElementById('navbarAuth');
  const user = getCurrentUser();

  if (isLoggedIn() && user) {
    authDiv.innerHTML = `
      <span class="user-info" id="userInfo">
        <i class="fas fa-user-circle"></i>
        <span>${user.username}</span>
      </span>
      <a href="profile.html" class="btn btn-outline btn-sm">Hồ Sơ</a>
      <a href="#" class="btn btn-outline btn-sm" id="logoutBtn">Đăng Xuất</a>
    `;

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  } else {
    authDiv.innerHTML = `
      <a href="login.html" class="btn btn-outline">Đăng Nhập</a>
      <a href="register.html" class="btn btn-primary">Đăng Ký</a>
    `;
  }
}

/**
 * Kiểm tra auth và redirect
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/login.html';
    return false;
  }
  return true;
}

/* =====================================================
   HAMBURGER MENU
   ===================================================== */

/**
 * Setup hamburger menu
 */
function setupHamburgerMenu() {
  const hamburger = document.getElementById('hamburger');
  const navbarMenu = document.getElementById('navbarMenu');

  if (!hamburger || !navbarMenu) return;

  hamburger.addEventListener('click', () => {
    navbarMenu.classList.toggle('active');
  });

  // Close menu khi click link
  navbarMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navbarMenu.classList.remove('active');
    });
  });

  // Close menu khi click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.navbar')) {
      navbarMenu.classList.remove('active');
    }
  });
}

/* =====================================================
   TABS
   ===================================================== */

/**
 * Switch tab
 */
function switchTab(tabName) {
  // Ẩn tất cả tab
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Bỏ active từ tất cả nút
  document.querySelectorAll('.menu-item, .tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Hiển thị tab được chọn
  const activeTab = document.getElementById(tabName);
  if (activeTab) {
    activeTab.classList.add('active');
  }

  // Set active cho button
  document.querySelectorAll('[data-tab]').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    }
  });
}

/* =====================================================
   LOADING
   ===================================================== */

/**
 * Hiển thị loading spinner
 */
function showLoading(message = 'Đang tải...') {
  const loader = document.createElement('div');
  loader.className = 'loading-overlay';
  loader.innerHTML = `
    <div class="loader">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
  document.body.appendChild(loader);
  return loader;
}

/**
 * Ẩn loading spinner
 */
function hideLoading() {
  const loader = document.querySelector('.loading-overlay');
  if (loader) {
    loader.remove();
  }
}

/* =====================================================
   MODAL
   ===================================================== */

/**
 * Tạo modal
 */
function createModal(title, content, actions = []) {
  const modal = document.createElement('div');
  modal.className = 'modal active';
  
  let actionsHtml = '';
  actions.forEach(action => {
    actionsHtml += `<button class="btn btn-${action.type || 'primary'}" onclick="${action.onclick}">${action.label}</button>`;
  });

  modal.innerHTML = `
    <div class="modal-overlay" onclick="this.closest('.modal').remove()"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close" onclick="this.closest('.modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      <div class="modal-footer">
        ${actionsHtml}
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  return modal;
}

/* =====================================================
   STORAGE
   ===================================================== */

/**
 * Set localStorage
 */
function setStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/**
 * Get localStorage
 */
function getStorage(key) {
  const value = localStorage.getItem(key);
  return value ? JSON.parse(value) : null;
}

/**
 * Remove localStorage
 */
function removeStorage(key) {
  localStorage.removeItem(key);
}

/* =====================================================
   OTHER UTILITIES
   ===================================================== */

/**
 * Delay (async)
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Detect offline
 */
function isOnline() {
  return navigator.onLine;
}

/**
 * Get URL parameters
 */
function getUrlParam(paramName) {
  const params = new URLSearchParams(window.location.search);
  return params.get(paramName);
}

/**
 * Scroll to element
 */
function scrollToElement(elementId, offset = 0) {
  const element = document.getElementById(elementId);
  if (element) {
    const position = element.offsetTop - offset;
    window.scrollTo({
      top: position,
      behavior: 'smooth',
    });
  }
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function
 */
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/* =====================================================
   INITIALIZE ON LOAD
   ===================================================== */

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();
  setupHamburgerMenu();

  // Setup tab buttons
  document.querySelectorAll('.menu-item, .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn.dataset.tab) {
        e.preventDefault();
        switchTab(btn.dataset.tab);
      }
    });
  });

  // Setup preset amount buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const amount = btn.dataset.amount;
      const input = document.getElementById('customAmount');
      if (input) {
        input.value = amount;
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  // Kiểm tra online/offline
  window.addEventListener('online', () => {
    showToast('Kết nối internet khôi phục', 'success');
  });

  window.addEventListener('offline', () => {
    showToast('Mất kết nối internet', 'warning');
  });
});

/* ===== KẾT THÚC UTILS ===== */
