/**
 * UI - Controlador de Interfaz de Usuario para KASH
 */

import { store } from './store.js';
import { renderCharts } from './charts.js';
import { exportToJSON, exportToCSV, importFromJSON } from './export.js';
import { processReceiptImage } from './ocr.js';
import { bankSync, SUPPORTED_BANKS } from './bankSync.js';

let currentReceiptImageData = null;

export function initUI() {
  setupNavigation();
  setupModals();
  setupForms();
  setupOCRScanner();
  setupBankSync();
  setupSettingsAndThemes();
  setupQuickTemplates();
  updateAllViews();
}

export function updateAllViews() {
  applyTheme(store.getSettings().theme || 'teal');
  updateSummaryCards();
  renderStreak();
  renderQuickTemplates();
  renderTransactionsList();
  renderAssetsAndLiabilities();
  renderConnectedBanks();
  renderBudgetsAndGoals();
  renderCategoriesList();
  renderCharts();
}

// -------------------------------------------------------------
// Theme Management
// -------------------------------------------------------------
function applyTheme(themeName) {
  document.body.className = '';
  document.body.classList.add(`theme-${themeName}`);
  store.updateSettings({ theme: themeName });

  document.querySelectorAll('.theme-pick-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeName);
  });
}

function setupSettingsAndThemes() {
  document.querySelectorAll('.theme-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      applyTheme(theme);
      renderCharts();
    });
  });

  const currencySelect = document.getElementById('setting-currency');
  if (currencySelect) {
    currencySelect.value = store.getSettings().currency || 'EUR';
    currencySelect.addEventListener('change', (e) => {
      const curr = e.target.value;
      const symbols = { EUR: '€', USD: '$', MXN: '$', GBP: '£' };
      store.updateSettings({ currency: curr, currencySymbol: symbols[curr] || '€' });
      updateAllViews();
      showToast('Divisa actualizada');
    });
  }

  // Export / Import
  document.getElementById('btn-export-json')?.addEventListener('click', exportToJSON);
  document.getElementById('btn-export-csv')?.addEventListener('click', exportToCSV);

  const fileInput = document.getElementById('input-import-json');
  document.getElementById('btn-trigger-import')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      importFromJSON(file, () => { updateAllViews(); showToast('Datos importados con éxito'); }, (err) => alert(err));
    }
  });

  document.getElementById('btn-reset-data')?.addEventListener('click', () => {
    if (confirm('⚠️ ¿Estás seguro de restablecer todos los datos?')) {
      store.resetAllData();
      updateAllViews();
      showToast('Datos restablecidos');
    }
  });
}

// -------------------------------------------------------------
// Navigation Tabs
// -------------------------------------------------------------
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn, .mobile-tab');
  const viewSections = document.querySelectorAll('.view-section');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;

      navBtns.forEach(b => b.classList.remove('active'));
      viewSections.forEach(s => s.classList.remove('active'));

      document.querySelectorAll(`[data-view="${targetView}"]`).forEach(b => b.classList.add('active'));
      const activeSection = document.getElementById(`view-${targetView}`);
      if (activeSection) activeSection.classList.add('active');

      if (targetView === 'dashboard') renderCharts();
    });
  });
}

// -------------------------------------------------------------
// Summary & Streak
// -------------------------------------------------------------
function updateSummaryCards() {
  const sym = store.getSettings().currencySymbol || '€';
  const netWorth = store.getNetWorth();
  const totalAssets = store.getTotalAssets();
  const totalLiabilities = store.getTotalLiabilities();
  const summary = store.getMonthlySummary();

  setText('card-net-worth', `${formatMoney(netWorth)} ${sym}`);
  setText('card-assets', `${formatMoney(totalAssets)} ${sym}`);
  setText('card-liabilities', `${formatMoney(totalLiabilities)} ${sym}`);
  setText('card-income', `+${formatMoney(summary.income)} ${sym}`);
  setText('card-expense', `-${formatMoney(summary.expense)} ${sym}`);
  setText('card-savings', `${formatMoney(summary.savings)} ${sym} (${summary.savingsRate}%)`);
}

function renderStreak() {
  const streak = store.getSettings().streakDays || 0;
  const streakEl = document.getElementById('streak-counter');
  if (streakEl) {
    streakEl.textContent = `🔥 ${streak} días seguidos`;
  }
}

// -------------------------------------------------------------
// Bank Sync & Connection Setup
// -------------------------------------------------------------
function setupBankSync() {
  const btnConnectBank = document.getElementById('btn-open-bank-modal');
  const btnSyncHeader = document.getElementById('btn-sync-banks-header');
  const modalBank = document.getElementById('modal-bank');
  const bankGrid = document.getElementById('bank-selection-grid');

  btnConnectBank?.addEventListener('click', () => showModal(modalBank));
  btnSyncHeader?.addEventListener('click', () => {
    const synced = bankSync.syncAllBanks();
    updateAllViews();
    showToast(synced > 0 ? `🟢 ${synced} banco(s) sincronizado(s)` : 'No hay bancos conectados aún');
  });

  // Render Banks List inside Modal
  if (bankGrid) {
    bankGrid.innerHTML = SUPPORTED_BANKS.map(b => `
      <div class="bank-card-pick" data-bank-id="${b.id}">
        <span class="bank-icon-lg">${b.icon}</span>
        <div class="font-bold text-sm mb-1">${b.name}</div>
        <button class="btn btn-secondary text-xs" style="width: 100%;">Conectar (Sandbox)</button>
      </div>
    `).join('');

    bankGrid.querySelectorAll('.bank-card-pick').forEach(card => {
      card.addEventListener('click', () => {
        const bankId = card.dataset.bankId;
        const result = bankSync.connectBankSandbox(bankId);
        hideModal(modalBank);
        updateAllViews();
        showToast(`🎉 ¡${result.connection.accountName} conectada con éxito!`);
      });
    });
  }
}

function renderConnectedBanks() {
  const container = document.getElementById('connected-banks-list');
  if (!container) return;

  const connections = bankSync.getConnections();
  if (connections.length === 0) {
    container.innerHTML = `
      <div class="card text-center p-4">
        <p class="text-secondary text-sm mb-3">No tienes ningún banco conectado aún.</p>
        <button class="btn btn-primary text-xs" onclick="document.getElementById('modal-bank').classList.add('active')">
          🏛️ Conectar mi primer Banco
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = connections.map(c => `
    <div class="item-card flex-between">
      <div class="flex-center gap-3">
        <span class="item-icon">${c.icon}</span>
        <div>
          <div class="font-bold">${escapeHtml(c.accountName)}</div>
          <div class="text-xs text-muted">Sincronizado: ${new Date(c.lastSynced).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
      </div>
      <div class="flex-center gap-2">
        <span class="category-badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981;">🟢 Conectado</span>
        <button class="btn-icon danger text-xs" data-disconnect-bank="${c.id}">🗑️</button>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-disconnect-bank]').forEach(btn => {
    btn.addEventListener('click', () => {
      bankSync.disconnectBank(btn.dataset.disconnectBank);
      updateAllViews();
      showToast('Banco desconectado');
    });
  });
}

// -------------------------------------------------------------
// OCR Ticket Scanner Setup
// -------------------------------------------------------------
function setupOCRScanner() {
  const btnScan = document.getElementById('btn-open-ocr-modal');
  const modalOCR = document.getElementById('modal-ocr');
  const ocrFileInput = document.getElementById('ocr-file-input');
  const ocrDropzone = document.getElementById('ocr-dropzone');
  const ocrStatus = document.getElementById('ocr-status');
  const ocrProgressBar = document.getElementById('ocr-progress-bar');
  const ocrPreviewImg = document.getElementById('ocr-preview-img');

  btnScan?.addEventListener('click', () => showModal(modalOCR));
  ocrDropzone?.addEventListener('click', () => ocrFileInput?.click());

  ocrFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      currentReceiptImageData = ev.target.result;
      if (ocrPreviewImg) {
        ocrPreviewImg.src = currentReceiptImageData;
        ocrPreviewImg.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);

    ocrStatus.style.display = 'block';
    ocrStatus.textContent = '⏳ Leyendo ticket con IA...';
    if (ocrProgressBar) ocrProgressBar.style.width = '20%';

    try {
      const result = await processReceiptImage(file, (percent, msg) => {
        if (ocrProgressBar) ocrProgressBar.style.width = `${percent}%`;
        if (ocrStatus) ocrStatus.textContent = msg;
      });

      hideModal(modalOCR);

      const modalTx = document.getElementById('modal-transaction');
      document.getElementById('tx-amount').value = result.amount || '';
      document.getElementById('tx-note').value = `${result.merchant} (Escaneado)`;
      document.getElementById('tx-date').value = result.date || new Date().toISOString().split('T')[0];
      document.getElementById('tx-category').value = result.suggestedCategory;

      const thumb = document.getElementById('tx-receipt-thumbnail');
      if (thumb) {
        thumb.src = currentReceiptImageData;
        thumb.style.display = 'block';
      }

      showModal(modalTx);
      showToast(`✨ Ticket reconocido: ${result.merchant} - ${result.amount} €`);

    } catch (err) {
      console.error('Error en OCR:', err);
      if (ocrStatus) ocrStatus.textContent = '❌ No se pudo leer el ticket. Puedes ingresar los datos manualmente.';
    }
  });
}

// -------------------------------------------------------------
// Quick Templates
// -------------------------------------------------------------
function setupQuickTemplates() {}

function renderQuickTemplates() {
  const container = document.getElementById('quick-templates-row');
  if (!container) return;

  const tmpls = store.getTemplates();
  const sym = store.getSettings().currencySymbol || '€';

  container.innerHTML = tmpls.map(t => {
    return `
      <div class="tmpl-btn" data-tmpl-id="${t.id}">
        <span class="tmpl-ic">${t.icon}</span>
        <span class="tmpl-nm">${escapeHtml(t.name)}</span>
        <span class="tmpl-am">-${t.amount}${sym}</span>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.tmpl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.tmplId;
      const t = tmpls.find(x => x.id === id);
      if (t) {
        store.addTransaction({
          type: t.type,
          categoryId: t.categoryId,
          amount: t.amount,
          note: `Plantilla: ${t.name}`,
          date: new Date().toISOString().split('T')[0]
        });
        updateAllViews();
        showToast(`⚡ Transacción rápida: ${t.name}`);
      }
    });
  });
}

// -------------------------------------------------------------
// Transactions View & Photo Modal
// -------------------------------------------------------------
function renderTransactionsList() {
  const container = document.getElementById('transactions-table-body');
  if (!container) return;

  const typeFilter = document.getElementById('filter-type')?.value || 'all';
  const searchQuery = (document.getElementById('filter-search')?.value || '').toLowerCase();
  const sym = store.getSettings().currencySymbol || '€';

  let list = store.getTransactions();

  if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
  if (searchQuery) {
    list = list.filter(t => {
      const cat = store.getCategoryById(t.categoryId);
      return t.note.toLowerCase().includes(searchQuery) || cat.name.toLowerCase().includes(searchQuery);
    });
  }

  if (list.length === 0) {
    container.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-muted">No se encontraron movimientos registrados.</td></tr>`;
    return;
  }

  container.innerHTML = list.map(tx => {
    const cat = store.getCategoryById(tx.categoryId);
    const isIncome = tx.type === 'income';
    const sign = isIncome ? '+' : '-';
    const colorClass = isIncome ? 'text-success' : 'text-danger';
    const photoBadge = tx.receiptImage ? `<button class="btn-icon" data-view-receipt="${tx.id}">📄 Ticket</button>` : '-';

    return `
      <tr>
        <td class="font-mono text-sm text-secondary">${tx.date}</td>
        <td>
          <span class="category-badge" style="background: ${cat.color}22; color: ${cat.color}; border: 1px solid ${cat.color}44;">
            ${cat.icon} ${cat.name}
          </span>
        </td>
        <td class="text-secondary">${escapeHtml(tx.note || '-')}</td>
        <td class="font-bold ${colorClass}">${sign}${formatMoney(tx.amount)} ${sym}</td>
        <td>${photoBadge}</td>
        <td class="text-right">
          <button class="btn-icon danger text-sm" data-delete-tx="${tx.id}" title="Eliminar">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');

  container.querySelectorAll('[data-delete-tx]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('¿Eliminar esta transacción?')) {
        store.deleteTransaction(btn.dataset.deleteTx);
        updateAllViews();
        showToast('Transacción eliminada');
      }
    });
  });

  container.querySelectorAll('[data-view-receipt]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = store.getTransactions().find(t => t.id === btn.dataset.viewReceipt);
      if (tx && tx.receiptImage) {
        const modalImg = document.getElementById('modal-view-image');
        const img = document.getElementById('view-image-content');
        if (img) img.src = tx.receiptImage;
        showModal(modalImg);
      }
    });
  });
}

// -------------------------------------------------------------
// Assets & Liabilities
// -------------------------------------------------------------
function renderAssetsAndLiabilities() {
  const assetsContainer = document.getElementById('assets-list');
  const liabilitiesContainer = document.getElementById('liabilities-list');
  const sym = store.getSettings().currencySymbol || '€';

  if (assetsContainer) {
    const assets = store.getAssets();
    assetsContainer.innerHTML = assets.length === 0
      ? '<p class="text-muted text-sm py-4">No hay activos registrados.</p>'
      : assets.map(a => `
        <div class="item-card flex-between">
          <div class="flex-center gap-3">
            <span class="item-icon">${a.icon}</span>
            <div>
              <div class="font-bold">${escapeHtml(a.name)}</div>
              <div class="text-xs text-muted">${escapeHtml(a.category)}</div>
            </div>
          </div>
          <div class="flex-center gap-3">
            <div class="font-bold text-success">+${formatMoney(a.amount)} ${sym}</div>
            <button class="btn-icon danger text-xs" data-delete-asset="${a.id}">🗑️</button>
          </div>
        </div>
      `).join('');

    assetsContainer.querySelectorAll('[data-delete-asset]').forEach(btn => {
      btn.addEventListener('click', () => { store.deleteAsset(btn.dataset.deleteAsset); updateAllViews(); showToast('Activo eliminado'); });
    });
  }

  if (liabilitiesContainer) {
    const liabilities = store.getLiabilities();
    liabilitiesContainer.innerHTML = liabilities.length === 0
      ? '<p class="text-muted text-sm py-4">No hay pasivos registrados.</p>'
      : liabilities.map(l => `
        <div class="item-card flex-between">
          <div class="flex-center gap-3">
            <span class="item-icon">${l.icon}</span>
            <div>
              <div class="font-bold">${escapeHtml(l.name)}</div>
              <div class="text-xs text-muted">${escapeHtml(l.category)}</div>
            </div>
          </div>
          <div class="flex-center gap-3">
            <div class="font-bold text-danger">-${formatMoney(l.amount)} ${sym}</div>
            <button class="btn-icon danger text-xs" data-delete-liability="${l.id}">🗑️</button>
          </div>
        </div>
      `).join('');

    liabilitiesContainer.querySelectorAll('[data-delete-liability]').forEach(btn => {
      btn.addEventListener('click', () => { store.deleteLiability(btn.dataset.deleteLiability); updateAllViews(); showToast('Pasivo eliminado'); });
    });
  }
}

// -------------------------------------------------------------
// Budgets & Goals View
// -------------------------------------------------------------
function renderBudgetsAndGoals() {
  const budgetsContainer = document.getElementById('budgets-list');
  const goalsContainer = document.getElementById('goals-list');
  const sym = store.getSettings().currencySymbol || '€';

  if (budgetsContainer) {
    const budgets = store.getBudgets();
    budgetsContainer.innerHTML = budgets.length === 0
      ? '<p class="text-muted text-sm py-2">Sin presupuestos activos.</p>'
      : budgets.map(b => {
        const cat = store.getCategoryById(b.categoryId);
        const spent = store.getCategorySpentThisMonth(b.categoryId);
        const percent = Math.min(100, Math.round((spent / b.limit) * 100));
        const isOver = spent > b.limit;

        return `
          <div class="mb-3 p-3 card">
            <div class="flex-between mb-1">
              <span class="font-bold text-sm">${cat.icon} ${cat.name}</span>
              <span class="text-xs ${isOver ? 'text-danger font-bold' : 'text-secondary'}">
                ${formatMoney(spent)} / ${formatMoney(b.limit)} ${sym} (${percent}%)
              </span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill ${isOver ? 'danger' : ''}" style="width: ${percent}%;"></div>
            </div>
          </div>
        `;
      }).join('');
  }

  if (goalsContainer) {
    const goals = store.getGoals();
    goalsContainer.innerHTML = goals.length === 0
      ? '<p class="text-muted text-sm py-2">Sin metas de ahorro registradas.</p>'
      : goals.map(g => {
        const percent = Math.min(100, Math.round((g.saved / g.target) * 100));
        return `
          <div class="mb-3 p-3 card">
            <div class="flex-between mb-1">
              <span class="font-bold text-sm">${g.icon} ${escapeHtml(g.name)}</span>
              <span class="text-xs text-success font-bold">${formatMoney(g.saved)} / ${formatMoney(g.target)} ${sym} (${percent}%)</span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill success" style="width: ${percent}%;"></div>
            </div>
          </div>
        `;
      }).join('');
  }
}

// -------------------------------------------------------------
// Categories View
// -------------------------------------------------------------
function renderCategoriesList() {
  const container = document.getElementById('categories-grid');
  if (!container) return;

  const categories = store.getCategories();
  container.innerHTML = categories.map(c => `
    <div class="card p-4 flex-between">
      <div class="flex-center gap-3">
        <span class="p-2 rounded" style="background: ${c.color}33;">${c.icon}</span>
        <div>
          <div class="font-bold">${escapeHtml(c.name)}</div>
          <div class="text-xs text-muted">${c.type === 'income' ? 'Ingreso' : 'Gasto'}</div>
        </div>
      </div>
      <span class="badge" style="background: ${c.color};">●</span>
    </div>
  `).join('');

  const txCatSelect = document.getElementById('tx-category');
  if (txCatSelect) {
    txCatSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
  }
}

// -------------------------------------------------------------
// Modals & Form Handlers
// -------------------------------------------------------------
function setupModals() {
  const modalTx = document.getElementById('modal-transaction');
  const modalAsset = document.getElementById('modal-asset');
  const modalCat = document.getElementById('modal-category');

  document.getElementById('btn-open-tx-modal')?.addEventListener('click', () => {
    currentReceiptImageData = null;
    const thumb = document.getElementById('tx-receipt-thumbnail');
    if (thumb) thumb.style.display = 'none';
    showModal(modalTx);
  });

  document.getElementById('btn-open-asset-modal')?.addEventListener('click', () => showModal(modalAsset));
  document.getElementById('btn-open-cat-modal')?.addEventListener('click', () => showModal(modalCat));

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) hideModal(modal);
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) hideModal(e.target);
  });
}

function setupForms() {
  // Add Transaction
  const txForm = document.getElementById('form-transaction');
  txForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = document.getElementById('tx-type').value;
    const categoryId = document.getElementById('tx-category').value;
    const amount = document.getElementById('tx-amount').value;
    const date = document.getElementById('tx-date').value || new Date().toISOString().split('T')[0];
    const note = document.getElementById('tx-note').value;

    if (!amount || amount <= 0) { alert('Monto no válido.'); return; }

    store.addTransaction({ type, categoryId, amount, date, note, receiptImage: currentReceiptImageData });
    updateAllViews();
    hideModal(document.getElementById('modal-transaction'));
    txForm.reset();
    currentReceiptImageData = null;
    showToast('Transacción guardada');
  });

  // Add Asset/Liability
  const assetForm = document.getElementById('form-asset');
  assetForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const isLiability = document.getElementById('asset-is-liability').checked;
    const name = document.getElementById('asset-name').value;
    const category = document.getElementById('asset-category').value;
    const amount = document.getElementById('asset-amount').value;
    const icon = document.getElementById('asset-icon').value || (isLiability ? '💳' : '🏦');

    if (isLiability) store.addLiability({ name, category, amount, icon });
    else store.addAsset({ name, category, amount, icon });

    updateAllViews();
    hideModal(document.getElementById('modal-asset'));
    assetForm.reset();
    showToast('Elemento guardado');
  });

  // Filters
  document.getElementById('filter-type')?.addEventListener('change', renderTransactionsList);
  document.getElementById('filter-search')?.addEventListener('input', renderTransactionsList);
}

function showModal(modal) { if (modal) modal.classList.add('active'); }
function hideModal(modal) { if (modal) modal.classList.remove('active'); }

function showToast(msg) {
  const toast = document.getElementById('toast-notification');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('active');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function formatMoney(amount) {
  return (amount || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
