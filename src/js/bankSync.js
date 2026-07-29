/**
 * BankSync - Módulo de Integración Bancaria (Open Banking PSD2 & Sandbox)
 * Soporta bancos tradicionales, neobancos y plataformas de inversión.
 */

import { store } from './store.js';

export const SUPPORTED_BANKS = [
  { id: 'bank_bbva', name: 'BBVA', icon: '🏦', color: '#004481' },
  { id: 'bank_santander', name: 'Banco Santander', icon: '🔴', color: '#ec0000' },
  { id: 'bank_caixa', name: 'CaixaBank / imagin', icon: '🔵', color: '#00a9e0' },
  { id: 'bank_trade_republic', name: 'Trade Republic', icon: '📈', color: '#000000' },
  { id: 'bank_myinvestor', name: 'MyInvestor', icon: '🐂', color: '#e30613' },
  { id: 'bank_kutxabank', name: 'Kutxabank', icon: '🟢', color: '#00875a' },
  { id: 'bank_sabadell', name: 'Banco Sabadell', icon: '🟡', color: '#0072ce' },
  { id: 'bank_ing', name: 'ING', icon: '🟧', color: '#ff6200' },
  { id: 'bank_revolut', name: 'Revolut', icon: '🟣', color: '#0075ff' },
  { id: 'bank_n26', name: 'N26', icon: '⬛', color: '#36a18b' },
  { id: 'bank_bankinter', name: 'Bankinter', icon: '🟠', color: '#ff6600' }
];

// Datos simulados para prueba instantánea Sandbox
const SANDBOX_MOCK_DATA = {
  bank_trade_republic: {
    accountName: 'Cuenta Efectivo & Inversión Trade Republic',
    balance: 4250.00,
    category: 'Inversiones & Valores',
    icon: '📈',
    transactions: [
      { date: '2026-07-28', amount: 13.28, type: 'income', categoryId: 'cat_invest_return', note: 'Interés Efectivo Trade Republic 3.75%' },
      { date: '2026-07-20', amount: 150.00, type: 'expense', categoryId: 'cat_invest_return', note: 'Plan Ahorro iShares MSCI World ETF' }
    ]
  },
  bank_myinvestor: {
    accountName: 'Cuenta Remunerada & Fondos MyInvestor',
    balance: 8900.50,
    category: 'Fondos & Remunerada',
    icon: '🐂',
    transactions: [
      { date: '2026-07-29', amount: 24.50, type: 'income', categoryId: 'cat_invest_return', note: 'Intereses Cuenta Remunerada MyInvestor' },
      { date: '2026-07-15', amount: 200.00, type: 'expense', categoryId: 'cat_invest_return', note: 'Aportación Fondo Vanguard Global Index' }
    ]
  },
  bank_kutxabank: {
    accountName: 'Cuenta Corriente Kutxabank',
    balance: 2650.00,
    category: 'Cuenta Bancaria',
    icon: '🟢',
    transactions: [
      { date: '2026-07-27', amount: 1620.00, type: 'income', categoryId: 'cat_salary', note: 'Nómina Kutxabank (Auto-Sync)' },
      { date: '2026-07-24', amount: 52.30, type: 'expense', categoryId: 'cat_food', note: 'COMPRA EROSKI (Auto-Sync)' }
    ]
  },
  bank_bbva: {
    accountName: 'Cuenta Nómina BBVA',
    balance: 3450.80,
    category: 'Cuenta Bancaria',
    icon: '🏦',
    transactions: [
      { date: '2026-07-28', amount: 1450.00, type: 'income', categoryId: 'cat_salary', note: 'Nómina BBVA (Auto-Sync)' },
      { date: '2026-07-27', amount: 64.20, type: 'expense', categoryId: 'cat_food', note: 'MERCADONA S.A. (Auto-Sync)' }
    ]
  },
  bank_revolut: {
    accountName: 'Cuenta Personal Revolut',
    balance: 1280.50,
    category: 'Banco Digital',
    icon: '🟣',
    transactions: [
      { date: '2026-07-29', amount: 14.99, type: 'expense', categoryId: 'cat_leisure', note: 'NETFLIX DIGITAL (Auto-Sync)' }
    ]
  },
  bank_santander: {
    accountName: 'Cuenta Ahorro Santander',
    balance: 5600.00,
    category: 'Ahorro',
    icon: '🔴',
    transactions: [
      { date: '2026-07-20', amount: 200.00, type: 'income', categoryId: 'cat_invest_return', note: 'Intereses Santander Ahorro' }
    ]
  }
};

class BankSyncService {
  constructor() {
    this.connections = this.loadConnections();
  }

  loadConnections() {
    try {
      const raw = localStorage.getItem('kash_bank_connections');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  saveConnections() {
    localStorage.setItem('kash_bank_connections', JSON.stringify(this.connections));
  }

  getConnections() {
    return this.connections;
  }

  connectBankSandbox(bankId) {
    const bankInfo = SUPPORTED_BANKS.find(b => b.id === bankId) || SUPPORTED_BANKS[0];
    const mock = SANDBOX_MOCK_DATA[bankId] || {
      accountName: `Cuenta ${bankInfo.name}`,
      balance: 1500.00,
      category: 'Cuenta Bancaria',
      icon: bankInfo.icon,
      transactions: [
        { date: new Date().toISOString().split('T')[0], amount: 50.00, type: 'expense', categoryId: 'cat_food', note: `Movimiento ${bankInfo.name}` }
      ]
    };

    const connectionId = 'conn_' + Date.now();
    const newConnection = {
      id: connectionId,
      bankId: bankInfo.id,
      bankName: bankInfo.name,
      accountName: mock.accountName,
      icon: mock.icon,
      lastSynced: new Date().toISOString(),
      status: 'active',
      mode: 'sandbox'
    };

    this.connections.push(newConnection);
    this.saveConnections();

    // Add Asset to KASH Portfolio
    const asset = store.addAsset({
      name: `${mock.accountName}`,
      category: mock.category,
      amount: mock.balance,
      icon: mock.icon
    });

    // Import initial transactions
    mock.transactions.forEach(t => {
      store.addTransaction({
        type: t.type,
        categoryId: t.categoryId,
        amount: t.amount,
        date: t.date,
        note: t.note
      });
    });

    return { connection: newConnection, asset };
  }

  disconnectBank(id) {
    this.connections = this.connections.filter(c => c.id !== id);
    this.saveConnections();
  }

  syncAllBanks() {
    let syncedCount = 0;
    this.connections.forEach(conn => {
      conn.lastSynced = new Date().toISOString();
      syncedCount++;
    });
    this.saveConnections();
    return syncedCount;
  }
}

export const bankSync = new BankSyncService();
