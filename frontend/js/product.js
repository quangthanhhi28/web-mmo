/**
 * =====================================================
 * PRODUCT.JS - TRANG CHI TIẾT SẢN PHẨM
 * ===================================================== */

let currentProduct = null;
let relatedProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  loadProductDetail();
});

// Load product detail
async function loadProductDetail() {
  try {
    const productId = getUrlParam('id');
    const shouldBuy = getUrlParam('buy');

    if (!productId) {
      showToast('Không tìm thấy sản phẩm', 'error');
      window.location.href = '/shop.html';
      return;
    }

    const loader = showLoading('Đang tải chi tiết sản phẩm...');

    const response = await productAPI.getProductById(productId);

    hideLoading();

    if (response.success) {
      currentProduct = response.data;
      renderProductDetail();
      loadRelatedProducts();

      // Auto-open purchase if buy param set
      if (shouldBuy === 'true') {
        await delay(500);
        handleBuyNow();
      }
    } else {
      showToast(response.message || 'Lỗi tải sản phẩm', 'error');
    }
  } catch (error) {
    hideLoading();
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Render product detail
function renderProductDetail() {
  const product = currentProduct;
  const breadcrumb = document.getElementById('breadcrumb');
  const productImage = document.getElementById('productImage');
  const productInfo = document.getElementById('productInfo');
  const productTabs = document.getElementById('productTabs');

  // Breadcrumb
  breadcrumb.innerHTML = `
    <a href="/index.html" style="color: var(--primary);">Trang chủ</a> /
    <a href="/shop.html" style="color: var(--primary);">Cửa hàng</a> /
    <span>${product.name}</span>
  `;

  // Product image
  productImage.innerHTML = `
    <div style="font-size: 5rem; color: var(--primary); text-align: center;">
      <i class="fab fa-${getProductIcon(product.category)}"></i>
    </div>
  `;

  // Product info
  const categoryName = getCategoryName(product.category);
  const rating = Math.floor(Math.random() * 2) + 4; // Demo: 4-5 stars
  const reviewCount = Math.floor(Math.random() * 500) + 100; // Demo: 100-600 reviews

  productInfo.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <p style="color: var(--primary); font-size: 0.875rem; font-weight: 600; margin: 0; margin-bottom: 0.5rem;">
        ${categoryName}
      </p>
      <h1 style="margin: 0; font-size: 2rem; margin-bottom: 0.5rem;">
        ${product.name}
      </h1>
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
        <div style="display: flex; color: #fbbf24;">
          ${[...Array(rating)].map(() => '<i class="fas fa-star"></i>').join('')}
          ${[...Array(5 - rating)].map(() => '<i class="far fa-star"></i>').join('')}
        </div>
        <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">
          ${rating}.0/5.0 (${reviewCount} đánh giá)
        </p>
      </div>
    </div>

    <div style="padding: 1.5rem; background-color: var(--bg-secondary); border-radius: 8px; margin-bottom: 1.5rem;">
      <div style="display: flex; align-items: baseline; gap: 1rem; margin-bottom: 0.5rem;">
        <span style="font-size: 0.875rem; color: var(--text-secondary); text-decoration: line-through;">
          ${formatCurrency(product.price + product.price * 0.1)}
        </span>
        <span style="font-size: 2.5rem; font-weight: bold; color: var(--primary);">
          ${formatCurrency(product.price)}
        </span>
        <span style="padding: 0.5rem 1rem; background-color: #ef4444; color: white; border-radius: 4px; font-weight: 600;">
          Giảm 10%
        </span>
      </div>
      <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">
        Thời hạn: ${product.duration_months} tháng
      </p>
    </div>

    <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
      <button class="btn btn-primary" onclick="handleBuyNow()" style="flex: 1;">
        <i class="fas fa-shopping-cart"></i> Mua ngay
      </button>
      <button class="btn btn-outline" onclick="handleAddWishlist()" style="flex: 1;">
        <i class="fas fa-heart"></i> Thêm yêu thích
      </button>
    </div>

    <div style="background-color: var(--bg-secondary); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
      <h3 style="margin-top: 0; margin-bottom: 1rem;">
        <i class="fas fa-info-circle"></i> Thông tin sản phẩm
      </h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
          <strong>Danh mục:</strong> ${categoryName}
        </li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
          <strong>Thời hạn:</strong> ${product.duration_months} tháng
        </li>
        <li style="padding: 0.5rem 0; border-bottom: 1px solid var(--border-color);">
          <strong>Trạng thái:</strong> <span style="color: var(--primary); font-weight: 600;">Còn hàng</span>
        </li>
        <li style="padding: 0.5rem 0;">
          <strong>Hoàn tiền:</strong> ${product.cashback_percent || 0}%
        </li>
      </ul>
    </div>

    <div style="background-color: var(--bg-secondary); padding: 1.5rem; border-radius: 8px;">
      <h3 style="margin-top: 0; margin-bottom: 1rem;">
        <i class="fas fa-user-tie"></i> Thông tin bán hàng
      </h3>
      <p style="margin: 0; margin-bottom: 0.5rem;">
        <strong>Cửa hàng:</strong> Premium Store
      </p>
      <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">
        Cửa hàng uy tín, bán hàng chất lượng cao
      </p>
    </div>
  `;

  // Tabs
  productTabs.innerHTML = `
    <div class="tabs">
      <button class="tab-button active" data-tab="description">Mô tả</button>
      <button class="tab-button" data-tab="comparison">So sánh</button>
      <button class="tab-button" data-tab="reviews">Đánh giá</button>
    </div>

    <div id="description" class="tab-content active">
      <h3>Mô tả sản phẩm</h3>
      <p>${product.description || 'Tài khoản cao cấp, đảm bảo chất lượng, an toàn tuyệt đối. Hỗ trợ kỹ thuật 24/7.'}</p>
      
      <h4>Tính năng chính:</h4>
      <ul>
        <li>Tài khoản mới, chưa sử dụng</li>
        <li>Mật khẩu mạnh, an toàn</li>
        <li>Hỗ trợ đổi mật khẩu</li>
        <li>Bảo hành ${product.duration_months} tháng</li>
        <li>Hoàn tiền 100% nếu lỗi</li>
      </ul>

      <h4>Cách sử dụng:</h4>
      <ol>
        <li>Nhận thông tin tài khoản qua email</li>
        <li>Đăng nhập vào ứng dụng</li>
        <li>Bắt đầu sử dụng ngay lập tức</li>
        <li>Có thể đổi mật khẩu và email phục hồi</li>
      </ol>
    </div>

    <div id="comparison" class="tab-content">
      <h3>So sánh các gói</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: var(--bg-secondary);">
            <th style="padding: 1rem; text-align: left; border: 1px solid var(--border-color);">Tính năng</th>
            <th style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);">1 tháng</th>
            <th style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);">3 tháng</th>
            <th style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);">6 tháng</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 1rem; border: 1px solid var(--border-color);">Giá</td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);">Từ 20k</td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);">Từ 50k</td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);">Từ 90k</td>
          </tr>
          <tr style="background-color: var(--bg-secondary);">
            <td style="padding: 1rem; border: 1px solid var(--border-color);">Sử dụng đồng thời</td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
          </tr>
          <tr>
            <td style="padding: 1rem; border: 1px solid var(--border-color);">Hỗ trợ kỹ thuật</td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
          </tr>
          <tr style="background-color: var(--bg-secondary);">
            <td style="padding: 1rem; border: 1px solid var(--border-color);">Đổi mật khẩu</td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
          </tr>
          <tr>
            <td style="padding: 1rem; border: 1px solid var(--border-color);">Hoàn tiền 100%</td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
            <td style="padding: 1rem; text-align: center; border: 1px solid var(--border-color);"><i class="fas fa-check" style="color: var(--primary);"></i></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div id="reviews" class="tab-content">
      <h3>Đánh giá của khách hàng</h3>
      
      <div style="margin-bottom: 2rem;">
        <h4>Đánh giá trung bình</h4>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div style="font-size: 2.5rem; font-weight: bold; color: var(--primary);">4.7</div>
          <div>
            <div style="display: flex; color: #fbbf24; margin-bottom: 0.5rem;">
              ${[...Array(5)].map(() => '<i class="fas fa-star"></i>').join('')}
            </div>
            <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">Dựa trên 487 đánh giá</p>
          </div>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 1rem;">
        ${generateSampleReviews().map(review => `
          <div style="padding: 1rem; background-color: var(--bg-secondary); border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
              <div>
                <p style="margin: 0; font-weight: 600;">${review.user}</p>
                <div style="display: flex; color: #fbbf24; font-size: 0.875rem;">
                  ${[...Array(review.rating)].map(() => '<i class="fas fa-star"></i>').join('')}
                  ${[...Array(5 - review.rating)].map(() => '<i class="far fa-star"></i>').join('')}
                </div>
              </div>
              <p style="margin: 0; font-size: 0.875rem; color: var(--text-secondary);">${review.date}</p>
            </div>
            <p style="margin: 0; color: var(--text-secondary);">${review.comment}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Setup tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

// Load related products
async function loadRelatedProducts() {
  try {
    const response = await productAPI.getProducts({
      category: currentProduct.category,
      limit: 4,
      offset: 0,
    });

    if (response.success) {
      relatedProducts = response.data.products.filter(p => p.id !== currentProduct.id);
      renderRelatedProducts();
    }
  } catch (error) {
    console.error('Lỗi tải sản phẩm liên quan:', error);
  }
}

// Render related products
function renderRelatedProducts() {
  const container = document.getElementById('relatedProducts');

  if (relatedProducts.length === 0) {
    return;
  }

  container.innerHTML = `
    <h3 style="margin-top: 2rem; margin-bottom: 1.5rem;">Sản phẩm liên quan</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem;">
      ${relatedProducts.map(product => `
        <div class="product-card">
          <div class="product-image">
            <i class="fab fa-${getProductIcon(product.category)}"></i>
          </div>
          <div class="product-body">
            <p class="product-category">${getCategoryName(product.category)}</p>
            <h4 class="product-name">${product.name}</h4>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">Thời hạn: ${product.duration_months} tháng</p>
            <p class="product-price">${formatCurrency(product.price)}</p>
            <div class="product-footer">
              <button class="btn btn-primary btn-sm" onclick="goToProduct(${product.id})">
                <i class="fas fa-eye"></i> Xem
              </button>
              <button class="btn btn-outline btn-sm" onclick="quickBuy(${product.id})">
                <i class="fas fa-cart-plus"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Handle buy now
async function handleBuyNow() {
  try {
    if (!isLoggedIn()) {
      showToast('Vui lòng đăng nhập để mua hàng', 'warning');
      window.location.href = '/login.html';
      return;
    }

    const confirm = window.confirm(`Mua ${currentProduct.name} với giá ${formatCurrency(currentProduct.price)}?`);
    
    if (!confirm) return;

    const loader = showLoading('Đang xử lý thanh toán...');

    const response = await orderAPI.purchaseProduct({
      product_id: currentProduct.id,
      voucher_code: null,
    });

    hideLoading();

    if (response.success) {
      const order = response.data;
      showToast('Mua hàng thành công! Đơn #' + order.id, 'success');

      setTimeout(() => {
        const details = `Đơn hàng #${order.id} - ${currentProduct.name}\n\n`;
        const message = details + 
          `Email: ${order.resource_email || 'N/A'}\n` +
          `Mật khẩu: ${order.resource_password || 'N/A'}\n` +
          `Ghi chú: ${order.resource_notes || 'Không có'}\n\n` +
          `Hoàn tiền: ${formatCurrency(order.cashback_earned || 0)}\n` +
          `Điểm thưởng: ${order.points_earned || 0} điểm`;
        
        alert(details + message);
        window.location.href = '/profile.html?tab=orders';
      }, 1000);
    } else {
      showToast(response.message || 'Lỗi mua hàng', 'error');
    }
  } catch (error) {
    hideLoading();
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Handle add to wishlist
function handleAddWishlist() {
  const wishlist = getStorage('wishlist') || [];
  
  if (wishlist.find(id => id === currentProduct.id)) {
    showToast('Sản phẩm đã trong yêu thích', 'warning');
    return;
  }

  wishlist.push(currentProduct.id);
  setStorage('wishlist', wishlist);
  showToast('Thêm vào yêu thích thành công', 'success');
}

// Helpers
function goToProduct(productId) {
  window.location.href = `/product.html?id=${productId}`;
}

function quickBuy(productId) {
  if (!isLoggedIn()) {
    showToast('Vui lòng đăng nhập để mua hàng', 'warning');
    window.location.href = '/login.html';
    return;
  }
  
  window.location.href = `/product.html?id=${productId}&buy=true`;
}

function getProductIcon(category) {
  const icons = {
    'netflix_pre': 'netflix',
    'spotify_pre': 'spotify',
    'youtube_pre': 'youtube',
  };
  return icons[category] || 'play';
}

function getCategoryName(category) {
  const names = {
    'netflix_pre': 'Netflix Premium',
    'spotify_pre': 'Spotify Premium',
    'youtube_pre': 'YouTube Premium',
  };
  return names[category] || 'Premium';
}

function generateSampleReviews() {
  return [
    {
      user: 'Nguyễn Văn A',
      rating: 5,
      date: '2 ngày trước',
      comment: 'Tuyệt vời! Tài khoản hoạt động ngay lập tức, không có vấn đề gì. Hỗ trợ cũng rất nhanh.'
    },
    {
      user: 'Trần Thị B',
      rating: 5,
      date: '1 tuần trước',
      comment: 'Sản phẩm chất lượng cao, đúng như mô tả. Sẽ mua lại lần tới.'
    },
    {
      user: 'Lê Văn C',
      rating: 4,
      date: '2 tuần trước',
      comment: 'Tốt, nhưng thời gian gửi tài khoản có chút muộn. Nhưng cuối cùng đã nhận được.'
    },
    {
      user: 'Phạm Thị D',
      rating: 5,
      date: '1 tháng trước',
      comment: 'Rất hài lòng với chất lượng dịch vụ. Giá cả cạnh tranh.'
    }
  ];
}
