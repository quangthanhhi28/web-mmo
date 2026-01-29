/**
 * =====================================================
 * INDEX.JS - TRANG CHỦ
 * ===================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  loadFeaturedProducts();
  updateStats();
  setupFAQ();
});

// Load sản phẩm nổi bật
async function loadFeaturedProducts() {
  try {
    const response = await productAPI.getFeaturedProducts();
    const container = document.getElementById('featuredProducts');
    
    if (response.success) {
      container.innerHTML = response.data.products.map(product => `
        <div class="product-card">
          <div class="product-image">
            <i class="fab fa-${getProductIcon(product.category)}"></i>
            ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
          </div>
          <div class="product-body">
            <p class="product-category">${getCategoryName(product.category)}</p>
            <h4 class="product-name">${product.name}</h4>
            <p class="product-price">${formatCurrency(product.price)}</p>
            <div class="product-footer">
              <button class="btn btn-primary btn-sm" onclick="goToProduct(${product.id})">
                <i class="fas fa-eye"></i> Xem
              </button>
              <button class="btn btn-outline btn-sm" onclick="quickBuy(${product.id})">
                <i class="fas fa-shopping-cart"></i>
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading featured products:', error);
  }
}

// Cập nhật thống kê
async function updateStats() {
  try {
    const response = await productAPI.getProductStats();
    if (response.success) {
      document.getElementById('userCount').textContent = formatNumber(response.data.stats.total_products * 40); // Mock
      document.getElementById('orderCount').textContent = formatNumber(response.data.stats.sold_resources * 100); // Mock
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Setup FAQ accordion
function setupFAQ() {
  document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', function() {
      const item = this.closest('.faq-item');
      const answer = item.querySelector('.faq-answer');
      const isOpen = answer.style.display === 'block';
      
      // Đóng tất cả FAQ khác
      document.querySelectorAll('.faq-answer').forEach(a => {
        a.style.display = 'none';
      });
      
      // Toggle item hiện tại
      answer.style.display = isOpen ? 'none' : 'block';
      item.classList.toggle('active');
    });
  });
}

// Navigate to product page
function goToProduct(productId) {
  window.location.href = `/product.html?id=${productId}`;
}

// Quick buy
function quickBuy(productId) {
  if (!isLoggedIn()) {
    showToast('Vui lòng đăng nhập để mua hàng', 'warning');
    window.location.href = '/login.html';
    return;
  }
  
  window.location.href = `/product.html?id=${productId}&buy=true`;
}

// Helper functions
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
