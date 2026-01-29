/**
 * =====================================================
 * SHOP.JS - TRANG CỬA HÀNG
 * ===================================================== */

let currentPage = 1;
const itemsPerPage = 12;
let filters = {
  category: null,
  duration: null,
  status: 'in_stock',
};

document.addEventListener('DOMContentLoaded', () => {
  setupFilters();
  loadProducts();
});

// Setup filters
function setupFilters() {
  // Category filters
  document.querySelectorAll('input[data-filter="category"]').forEach(input => {
    input.addEventListener('change', (e) => {
      if (e.target.checked) {
        filters.category = e.target.value;
      } else {
        filters.category = null;
      }
      currentPage = 1;
      loadProducts();
    });
  });

  // Duration filters
  document.querySelectorAll('input[data-filter="duration"]').forEach(input => {
    input.addEventListener('change', (e) => {
      if (e.target.checked) {
        filters.duration = e.target.value;
      } else {
        filters.duration = null;
      }
      currentPage = 1;
      loadProducts();
    });
  });

  // Price range
  const priceRange = document.getElementById('priceRange');
  if (priceRange) {
    priceRange.addEventListener('change', (e) => {
      document.getElementById('priceDisplay').textContent = formatNumber(e.target.value);
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', loadProducts);
  }

  // Reset filters
  document.getElementById('resetFilters').addEventListener('click', () => {
    document.querySelectorAll('input[data-filter]').forEach(input => {
      input.checked = false;
    });
    filters = { category: null, duration: null, status: 'in_stock' };
    document.getElementById('sortSelect').value = 'created_at-desc';
    currentPage = 1;
    loadProducts();
  });
}

// Load products
async function loadProducts() {
  try {
    const loader = showLoading('Đang tải sản phẩm...');

    const sortValue = document.getElementById('sortSelect').value;
    const [sort, order] = sortValue.split('-');

    const filterObj = {
      category: filters.category,
      status: filters.status,
      sort: sort,
      order: order.toUpperCase(),
      limit: itemsPerPage,
      offset: (currentPage - 1) * itemsPerPage,
    };

    const response = await productAPI.getProducts(filterObj);

    hideLoading();

    if (response.success) {
      renderProducts(response.data.products);
      renderPagination(response.data.pagination);
    }
  } catch (error) {
    hideLoading();
    showToast('Lỗi tải sản phẩm: ' + error.message, 'error');
  }
}

// Render products
function renderProducts(products) {
  const container = document.getElementById('productsGrid');
  
  if (products.length === 0) {
    container.innerHTML = '<p style="text-align: center; grid-column: 1/-1;">Không có sản phẩm nào</p>';
    return;
  }

  container.innerHTML = products.map(product => `
    <div class="product-card">
      <div class="product-image">
        <i class="fab fa-${getProductIcon(product.category)}"></i>
        ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
      </div>
      <div class="product-body">
        <p class="product-category">${getCategoryName(product.category)}</p>
        <h4 class="product-name">${product.name}</h4>
        <p style="font-size: 0.875rem; color: var(--text-secondary);">Thời hạn: ${product.durationMonths} tháng</p>
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
  `).join('');
}

// Render pagination
function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  const maxPages = Math.ceil(pagination.total / itemsPerPage);

  if (maxPages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  if (currentPage > 1) {
    html += `<button class="pagination-btn" onclick="changePage(${currentPage - 1})"><i class="fas fa-chevron-left"></i></button>`;
  }

  // Page numbers
  for (let i = 1; i <= maxPages; i++) {
    html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
  }

  // Next button
  if (currentPage < maxPages) {
    html += `<button class="pagination-btn" onclick="changePage(${currentPage + 1})"><i class="fas fa-chevron-right"></i></button>`;
  }

  container.innerHTML = html;
}

// Change page
function changePage(page) {
  currentPage = page;
  loadProducts();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Navigate to product
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

// Helpers
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
