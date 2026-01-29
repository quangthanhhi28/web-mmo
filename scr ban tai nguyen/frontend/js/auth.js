/**
 * =====================================================
 * AUTH.JS - XỬ LÝ ĐĂNG NHẬP / ĐĂNG KÝ
 * =====================================================
 * Quản lý form login/register, xác thực dữ liệu
 */

// Nhận diện trang hiện tại
const currentPage = window.location.pathname;
const isLoginPage = currentPage.includes('login');
const isRegisterPage = currentPage.includes('register');

document.addEventListener('DOMContentLoaded', async () => {
  if (isLoginPage) {
    initLoginPage();
  } else if (isRegisterPage) {
    initRegisterPage();
  }
});

// =====================================================
// LOGIN PAGE
// =====================================================

async function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Validate
    if (!isValidEmail(email)) {
      showToast('Email không hợp lệ', 'error');
      return;
    }

    if (!isValidPassword(password)) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
      return;
    }

    try {
      const loader = showLoading('Đang đăng nhập...');

      const response = await authAPI.login(email, password);

      if (response.success) {
        // Lưu token và user info
        saveAuthData(response.data.token, response.data.user);

        showToast('Đăng nhập thành công!', 'success');
        
        // Redirect sau 1 giây
        await delay(1000);
        window.location.href = '/profile.html';
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      hideLoading();
    }
  });
}

// =====================================================
// REGISTER PAGE
// =====================================================

async function initRegisterPage() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const terms = document.querySelector('input[name="terms"]').checked;

    // Validate
    let hasError = false;

    if (!fullName) {
      showToast('Vui lòng nhập họ tên', 'error');
      hasError = true;
    }

    if (!isValidEmail(email)) {
      showToast('Email không hợp lệ', 'error');
      hasError = true;
    }

    if (!isValidUsername(username)) {
      showToast('Username phải từ 3-20 ký tự', 'error');
      hasError = true;
    }

    if (!isValidPassword(password)) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
      hasError = true;
    }

    if (password !== confirmPassword) {
      showToast('Mật khẩu không trùng khớp', 'error');
      hasError = true;
    }

    if (!terms) {
      showToast('Bạn phải đồng ý với điều khoản sử dụng', 'error');
      hasError = true;
    }

    if (hasError) return;

    try {
      const loader = showLoading('Đang đăng ký...');

      const response = await authAPI.register(email, username, password, confirmPassword, fullName);

      if (response.success) {
        showToast('Đăng ký thành công! Hãy đăng nhập', 'success');
        
        // Redirect sang login
        await delay(2000);
        window.location.href = '/login.html';
      }
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      hideLoading();
    }
  });
}
