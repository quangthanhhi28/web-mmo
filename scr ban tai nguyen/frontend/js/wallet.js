/**
 * =====================================================
 * WALLET.JS - TRANG NẠP TIỀN VÍ
 * ===================================================== */

let selectedBank = null;
let selectedAmount = 0;
let bankOptions = [];

document.addEventListener('DOMContentLoaded', () => {
  loadBankOptions();
  setupAmountPresets();
  setupBankSelection();
  setupAmountInput();
  loadWalletBalance();
  loadDepositHistory();
});

// Load bank options
async function loadBankOptions() {
  try {
    const response = await depositAPI.getBankInfo();

    if (response.success) {
      bankOptions = response.data.banks;
      renderBankSelect();
    }
  } catch (error) {
    showToast('Lỗi tải thông tin ngân hàng: ' + error.message, 'error');
  }
}

// Render bank select dropdown
function renderBankSelect() {
  const select = document.getElementById('bankSelect');

  select.innerHTML = `
    <option value="">-- Chọn ngân hàng --</option>
    ${bankOptions.map(bank => `
      <option value="${bank.name}">${bank.name}</option>
    `).join('')}
  `;

  select.addEventListener('change', handleBankChange);
}

// Setup amount presets
function setupAmountPresets() {
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const amount = parseInt(btn.getAttribute('data-preset'));
      selectedAmount = amount;
      document.getElementById('customAmount').value = formatNumber(amount);
      document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateTransferDisplay();
    });
  });
}

// Setup bank selection
function setupBankSelection() {
  document.getElementById('bankSelect').addEventListener('change', handleBankChange);
}

function handleBankChange(e) {
  const bankName = e.target.value;

  if (!bankName) {
    document.getElementById('bankInfo').innerHTML = '<p style="color: var(--text-secondary);">Vui lòng chọn ngân hàng</p>';
    selectedBank = null;
    return;
  }

  selectedBank = bankOptions.find(b => b.name === bankName);
  updateTransferDisplay();
}

// Setup custom amount input
function setupAmountInput() {
  const customAmount = document.getElementById('customAmount');

  customAmount.addEventListener('input', () => {
    const value = customAmount.value.replace(/\D/g, '');
    selectedAmount = parseInt(value) || 0;
    customAmount.value = value ? formatNumber(value) : '';
    document.querySelectorAll('[data-preset]').forEach(b => b.classList.remove('active'));
    updateTransferDisplay();
  });
}

// Update transfer display
function updateTransferDisplay() {
  const container = document.getElementById('bankInfo');

  if (!selectedBank || selectedAmount < 10000) {
    container.innerHTML = '<p style="color: var(--text-secondary);">Vui lòng chọn ngân hàng và nhập số tiền ≥ 10,000 VND</p>';
    return;
  }

  const transactionCode = `NP${getCurrentUser()?.id || 'USER'}${Date.now()}`;

  container.innerHTML = `
    <div class="bank-details">
      <h4 style="margin-bottom: 1.5rem;">Thông tin chuyển khoản</h4>

      <div class="detail-row">
        <span class="label">Tên ngân hàng:</span>
        <span class="value">${selectedBank.name}</span>
      </div>

      <div class="detail-row">
        <span class="label">Số tài khoản:</span>
        <span class="value">${selectedBank.account_number}</span>
        <button type="button" class="copy-btn" onclick="copyToClipboard('${selectedBank.account_number}')">
          <i class="fas fa-copy"></i>
        </button>
      </div>

      <div class="detail-row">
        <span class="label">Chủ tài khoản:</span>
        <span class="value">${selectedBank.account_owner}</span>
      </div>

      <div class="detail-row">
        <span class="label">Nội dung chuyển:</span>
        <span class="value">${transactionCode}</span>
        <button type="button" class="copy-btn" onclick="copyToClipboard('${transactionCode}')">
          <i class="fas fa-copy"></i>
        </button>
      </div>

      <div class="detail-row">
        <span class="label">Số tiền:</span>
        <span class="value">${formatCurrency(selectedAmount)}</span>
      </div>

      <div class="divider" style="margin: 1.5rem 0;"></div>

      <div style="background-color: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
          <i class="fas fa-info-circle"></i> Hướng dẫn chuyển khoản:
        </p>
        <ol style="font-size: 0.875rem; color: var(--text-secondary); padding-left: 1.5rem;">
          <li>Vào ứng dụng ngân hàng của bạn</li>
          <li>Chọn "Chuyển tiền" hoặc "Thanh toán"</li>
          <li>Nhập thông tin tài khoản nhận ở trên</li>
          <li>Nhập nội dung chuyển khoản (mã giao dịch)</li>
          <li>Xác nhận và hoàn tất</li>
        </ol>
      </div>

      <button type="button" class="btn btn-primary" onclick="confirmDeposit('${transactionCode}')">
        <i class="fas fa-check"></i> Xác nhận đã chuyển khoản
      </button>

      <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem; text-align: center;">
        <i class="fas fa-clock"></i> Hạn nộp: 30 phút
      </p>
    </div>

    <div style="margin-top: 2rem; text-align: center; padding: 1rem; background-color: var(--bg-secondary); border-radius: 8px; border: 2px dashed var(--border-color);">
      <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">QR Code (Sẵn sàng để sử dụng)</p>
      <div style="font-size: 3rem; color: var(--primary);">
        <i class="fas fa-qrcode"></i>
      </div>
      <p style="font-size: 0.875rem; color: var(--text-secondary);">Quét mã QR bằng ứng dụng ngân hàng</p>
    </div>
  `;
}

// Confirm deposit
async function confirmDeposit(transactionCode) {
  try {
    if (!selectedBank || selectedAmount < 10000) {
      showToast('Vui lòng chọn ngân hàng và số tiền hợp lệ', 'error');
      return;
    }

    const confirmAction = confirm(
      `Xác nhận nạp ${formatCurrency(selectedAmount)} vào ${selectedBank.name}?\n\nNội dung chuyển: ${transactionCode}`
    );

    if (!confirmAction) return;

    const loader = showLoading('Đang xử lý...');

    const response = await depositAPI.createDeposit({
      amount: selectedAmount,
      bank_name: selectedBank.name,
      transaction_code: transactionCode,
    });

    hideLoading();

    if (response.success) {
      showToast('Yêu cầu nạp tiền đã được ghi nhận! Sẽ được duyệt trong thời gian sớm nhất.', 'success');
      
      // Reset form
      document.getElementById('bankSelect').value = '';
      document.getElementById('customAmount').value = '';
      selectedAmount = 0;
      selectedBank = null;
      updateTransferDisplay();
      loadDepositHistory();
      loadWalletBalance();

      // Delay then show info
      await delay(2000);
      alert('Yêu cầu nạp tiền của bạn sẽ được quản lý viên phê duyệt trong 1-2 giờ.\n\nBạn có thể kiểm tra lịch sử nạp tiền ở phía dưới để xem trạng thái.');
    } else {
      showToast(response.message || 'Lỗi tạo yêu cầu nạp tiền', 'error');
    }
  } catch (error) {
    hideLoading();
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// Load wallet balance
async function loadWalletBalance() {
  try {
    const response = await userAPI.getWallet();

    if (response.success) {
      const wallet = response.data.wallet;
      const balanceDisplay = document.getElementById('walletBalance');

      if (balanceDisplay) {
        balanceDisplay.innerHTML = `
          <div style="text-align: center;">
            <p style="color: var(--text-secondary); margin-bottom: 0.5rem;">Số dư ví</p>
            <p style="font-size: 2rem; font-weight: bold; color: var(--primary);">
              ${formatCurrency(wallet.balance)}
            </p>
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 1rem;">
              Đã nạp: ${formatCurrency(wallet.total_deposited)}<br>
              Đã chi tiêu: ${formatCurrency(wallet.total_spent)}
            </p>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Lỗi tải số dư ví:', error);
  }
}

// Load deposit history
async function loadDepositHistory() {
  try {
    const response = await depositAPI.getDepositHistory({ limit: 10, offset: 0 });

    if (response.success) {
      const deposits = response.data.deposits;
      const container = document.getElementById('depositHistory');

      if (deposits.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Chưa có lịch sử nạp tiền</p>';
        return;
      }

      container.innerHTML = `
        <div class="deposit-list">
          ${deposits.map(deposit => `
            <div class="deposit-item">
              <div class="deposit-icon">
                <i class="fas fa-university"></i>
              </div>
              <div class="deposit-info">
                <p class="deposit-bank">${deposit.bank_name}</p>
                <p class="deposit-code">${deposit.transaction_code}</p>
              </div>
              <div class="deposit-amount">
                <p style="font-weight: 600; color: var(--primary);">${formatCurrency(deposit.amount)}</p>
                <p style="font-size: 0.875rem; color: var(--text-secondary);">${formatDate(deposit.created_at)}</p>
              </div>
              <div class="deposit-status">
                <span class="status-badge ${deposit.status}">
                  ${getStatusName(deposit.status)}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  } catch (error) {
    console.error('Lỗi tải lịch sử nạp:', error);
  }
}

// Helper
function getStatusName(status) {
  const names = {
    'pending': 'Chờ duyệt',
    'approved': 'Đã phê duyệt',
    'rejected': 'Bị từ chối',
  };
  return names[status] || status;
}

// CSS for deposit items
const style = document.createElement('style');
style.textContent = `
  .deposit-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .deposit-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background-color: var(--bg-secondary);
  }

  .deposit-icon {
    width: 3rem;
    height: 3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--primary);
    color: white;
    border-radius: 50%;
    font-size: 1.25rem;
  }

  .deposit-info {
    flex: 1;
  }

  .deposit-bank {
    font-weight: 600;
    margin: 0;
  }

  .deposit-code {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0.25rem 0 0;
  }

  .deposit-amount {
    text-align: right;
  }

  .deposit-amount p {
    margin: 0;
  }

  .deposit-status {
    text-align: center;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .status-badge.pending {
    background-color: #fef3c7;
    color: #92400e;
  }

  .status-badge.approved {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status-badge.rejected {
    background-color: #fee2e2;
    color: #7f1d1d;
  }

  .bank-details {
    background-color: var(--bg-secondary);
    padding: 1.5rem;
    border-radius: 8px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--border-color);
  }

  .detail-row:last-of-type {
    border-bottom: none;
  }

  .detail-row .label {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .detail-row .value {
    font-weight: 600;
    color: var(--primary);
  }

  .copy-btn {
    background: none;
    border: none;
    color: var(--primary);
    cursor: pointer;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .copy-btn:hover {
    opacity: 0.8;
  }

  .divider {
    height: 1px;
    background-color: var(--border-color);
  }

  @media (max-width: 768px) {
    .deposit-item {
      flex-direction: column;
      text-align: center;
    }

    .deposit-amount {
      text-align: center;
      width: 100%;
    }

    .detail-row {
      flex-direction: column;
      gap: 0.5rem;
    }

    .detail-row .label {
      width: 100%;
      text-align: left;
    }

    .detail-row .value {
      width: 100%;
      text-align: right;
    }
  }
`;
document.head.appendChild(style);
