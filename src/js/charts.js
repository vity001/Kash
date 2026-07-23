/**
 * Charts - Visualización gráfica para KASH & NETO
 */

import { store } from './store.js';

let netWorthChartInstance = null;
let categoryChartInstance = null;

export function renderCharts() {
  renderNetWorthChart();
  renderCategoryExpensesChart();
}

function renderNetWorthChart() {
  const canvas = document.getElementById('netWorthChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const history = store.data.netWorthHistory || [];
  const labels = history.map(h => h.month);
  const netWorthData = history.map(h => h.netWorth);

  if (netWorthChartInstance) {
    netWorthChartInstance.destroy();
  }

  const ctx = canvas.getContext('2d');
  const theme = store.getSettings().theme || 'teal';
  
  const accentColors = {
    teal: '#0d9488',
    purple: '#7c3aed',
    blue: '#2563eb',
    rose: '#e11d48',
    orange: '#ea580c'
  };
  const primaryColor = accentColors[theme] || '#0d9488';

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, `${primaryColor}66`);
  gradient.addColorStop(1, `${primaryColor}00`);

  netWorthChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Patrimonio Neto',
        data: netWorthData,
        borderColor: primaryColor,
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: primaryColor,
        pointRadius: 5,
        pointHoverRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              const sym = store.getSettings().currencySymbol || '€';
              return ` Patrimonio: ${context.parsed.y.toLocaleString('es-ES')} ${sym}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#8895b0' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#8895b0',
            callback: function(val) {
              const sym = store.getSettings().currencySymbol || '€';
              return val >= 1000 ? (val / 1000) + 'k ' + sym : val + ' ' + sym;
            }
          }
        }
      }
    }
  });
}

function renderCategoryExpensesChart() {
  const canvas = document.getElementById('categoryChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const transactions = store.getTransactions().filter(t => t.type === 'expense');
  const catTotals = {};

  transactions.forEach(t => {
    catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
  });

  const labels = [];
  const data = [];
  const colors = [];

  Object.keys(catTotals).forEach(catId => {
    const cat = store.getCategoryById(catId);
    labels.push(cat.icon + ' ' + cat.name);
    data.push(catTotals[catId]);
    colors.push(cat.color || '#0d9488');
  });

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  if (data.length === 0) {
    labels.push('Sin gastos registrados');
    data.push(1);
    colors.push('#374151');
  }

  const ctx = canvas.getContext('2d');

  categoryChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#111827'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#f0f4ff', font: { family: 'Inter', size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const sym = store.getSettings().currencySymbol || '€';
              return ` ${context.label}: ${context.parsed.toLocaleString('es-ES')} ${sym}`;
            }
          }
        }
      },
      cutout: '70%'
    }
  });
}
