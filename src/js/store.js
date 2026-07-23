/**
 * Store - Gestor de estado unificado para KASH
 */

const STORAGE_KEY = 'kash_app_data_v3';

const DEFAULT_CATEGORIES = [
  { id: 'cat_food', name: 'Alimentación / Super', icon: '🛒', color: '#10b981', type: 'expense' },
  { id: 'cat_housing', name: 'Vivienda y Alquiler', icon: '🏠', color: '#6366f1', type: 'expense' },
  { id: 'cat_transport', name: 'Transporte y Coche', icon: '🚗', color: '#f59e0b', type: 'expense' },
  { id: 'cat_leisure', name: 'Ocio y Restauración', icon: '🍔', color: '#ec4899', type: 'expense' },
  { id: 'cat_services', name: 'Servicios y Luz', icon: '💡', color: '#06b6d4', type: 'expense' },
  { id: 'cat_health', name: 'Salud y Cuidados', icon: '🩺', color: '#ef4444', type: 'expense' },
  { id: 'cat_salary', name: 'Nómina / Sueldo', icon: '💼', color: '#10b981', type: 'income' },
  { id: 'cat_invest_return', name: 'Rendimientos e Inversiones', icon: '📈', color: '#8b5cf6', type: 'income' },
  { id: 'cat_freelance', name: 'Freelance / Ventas', icon: '💻', color: '#3b82f6', type: 'income' }
];

// Estado inicial limpio (Completamente a cero)
const INITIAL_DATA = {
  settings: {
    currency: 'EUR',
    currencySymbol: '€',
    theme: 'teal',
    streakDays: 0,
    lastLoggedDate: ''
  },
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  assets: [],
  liabilities: [],
  budgets: [],
  goals: [],
  templates: [
    { id: 'tmpl_1', name: 'Supermercado', icon: '🛒', categoryId: 'cat_food', type: 'expense', amount: 30.00 },
    { id: 'tmpl_2', name: 'Gasolina', icon: '⛽', categoryId: 'cat_transport', type: 'expense', amount: 50.00 },
    { id: 'tmpl_3', name: 'Café', icon: '☕', categoryId: 'cat_leisure', type: 'expense', amount: 2.00 }
  ],
  netWorthHistory: []
};

class Store {
  constructor() {
    this.data = this.loadData();
  }

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...INITIAL_DATA, ...parsed };
      }
    } catch (e) {
      console.warn('Error cargando localStorage:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }

  // Transactions
  getTransactions() {
    return [...this.data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  addTransaction(tx) {
    const newTx = {
      id: 'tx_' + Date.now(),
      date: tx.date || new Date().toISOString().split('T')[0],
      type: tx.type || 'expense',
      categoryId: tx.categoryId,
      amount: parseFloat(tx.amount),
      note: tx.note || '',
      receiptImage: tx.receiptImage || null
    };
    this.data.transactions.unshift(newTx);
    this.updateStreak();
    this.updateNetWorthHistory();
    this.save();
    return newTx;
  }

  deleteTransaction(id) {
    this.data.transactions = this.data.transactions.filter(t => t.id !== id);
    this.updateNetWorthHistory();
    this.save();
  }

  // Assets & Liabilities
  getAssets() { return this.data.assets; }
  addAsset(asset) {
    const newAsset = { id: 'ast_' + Date.now(), name: asset.name, category: asset.category || 'Otros', amount: parseFloat(asset.amount), icon: asset.icon || '💰' };
    this.data.assets.push(newAsset);
    this.updateNetWorthHistory();
    this.save();
    return newAsset;
  }
  deleteAsset(id) {
    this.data.assets = this.data.assets.filter(a => a.id !== id);
    this.updateNetWorthHistory();
    this.save();
  }

  getLiabilities() { return this.data.liabilities; }
  addLiability(liability) {
    const newLia = { id: 'lia_' + Date.now(), name: liability.name, category: liability.category || 'Otros', amount: parseFloat(liability.amount), icon: liability.icon || '💳' };
    this.data.liabilities.push(newLia);
    this.updateNetWorthHistory();
    this.save();
    return newLia;
  }
  deleteLiability(id) {
    this.data.liabilities = this.data.liabilities.filter(l => l.id !== id);
    this.updateNetWorthHistory();
    this.save();
  }

  // Calculations
  getTotalAssets() {
    return this.data.assets.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
  }
  getTotalLiabilities() {
    return this.data.liabilities.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  }
  getNetWorth() {
    return this.getTotalAssets() - this.getTotalLiabilities();
  }

  updateNetWorthHistory() {
    const now = new Date();
    const monthsNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const monthLabel = `${monthsNames[now.getMonth()]} ${now.getFullYear()}`;

    const currentNet = this.getNetWorth();
    const currentAssets = this.getTotalAssets();
    const currentLiabilities = this.getTotalLiabilities();

    if (!this.data.netWorthHistory) this.data.netWorthHistory = [];

    const existingIdx = this.data.netWorthHistory.findIndex(h => h.month === monthLabel);
    if (existingIdx >= 0) {
      this.data.netWorthHistory[existingIdx] = { month: monthLabel, assets: currentAssets, liabilities: currentLiabilities, netWorth: currentNet };
    } else {
      this.data.netWorthHistory.push({ month: monthLabel, assets: currentAssets, liabilities: currentLiabilities, netWorth: currentNet });
    }
  }

  getMonthlySummary() {
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    let income = 0;
    let expense = 0;

    this.data.transactions.forEach(tx => {
      if (tx.date.startsWith(currentMonth)) {
        if (tx.type === 'income') income += tx.amount;
        if (tx.type === 'expense') expense += tx.amount;
      }
    });

    const savings = income - expense;
    const savingsRate = income > 0 ? ((savings / income) * 100).toFixed(1) : 0;

    return { income, expense, savings, savingsRate };
  }

  // Budgets
  getBudgets() { return this.data.budgets || []; }
  saveBudget(catId, limit) {
    if (!this.data.budgets) this.data.budgets = [];
    const idx = this.data.budgets.findIndex(b => b.categoryId === catId);
    if (idx >= 0) {
      this.data.budgets[idx].limit = parseFloat(limit);
    } else {
      this.data.budgets.push({ categoryId: catId, limit: parseFloat(limit) });
    }
    this.save();
  }
  getCategorySpentThisMonth(catId) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return this.data.transactions
      .filter(t => t.categoryId === catId && t.type === 'expense' && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0);
  }

  // Goals
  getGoals() { return this.data.goals || []; }
  addGoal(goal) {
    if (!this.data.goals) this.data.goals = [];
    const newGoal = { id: 'g_' + Date.now(), name: goal.name, icon: goal.icon || '🎯', target: parseFloat(goal.target), saved: parseFloat(goal.saved || 0) };
    this.data.goals.push(newGoal);
    this.save();
    return newGoal;
  }
  deleteGoal(id) {
    this.data.goals = (this.data.goals || []).filter(g => g.id !== id);
    this.save();
  }

  // Quick Templates
  getTemplates() { return this.data.templates || []; }

  // Categories
  getCategories() { return this.data.categories; }
  getCategoryById(id) {
    return this.data.categories.find(c => c.id === id) || { name: 'Sin categoría', icon: '❓', color: '#9ca3af' };
  }
  addCategory(cat) {
    const newCat = { id: 'cat_' + Date.now(), name: cat.name, icon: cat.icon || '📌', color: cat.color || '#0d9488', type: cat.type || 'expense' };
    this.data.categories.push(newCat);
    this.save();
    return newCat;
  }

  // Streak Counter
  updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const last = this.data.settings.lastLoggedDate;

    if (last === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (last === yesterdayStr) {
      this.data.settings.streakDays = (this.data.settings.streakDays || 0) + 1;
    } else {
      this.data.settings.streakDays = 1;
    }

    this.data.settings.lastLoggedDate = today;
    this.save();
  }

  // Settings
  getSettings() { return this.data.settings; }
  updateSettings(newSettings) {
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.save();
  }

  importData(importedData) {
    if (importedData && typeof importedData === 'object') {
      this.data = { ...INITIAL_DATA, ...importedData };
      this.save();
      return true;
    }
    return false;
  }

  resetAllData() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.save();
  }
}

export const store = new Store();
