/**
 * Export - Gestor de Exportación, Importación e Informes en KASH
 */

import { store } from './store.js';

export function exportToJSON() {
  const dataStr = JSON.stringify(store.data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kash_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCSV() {
  const transactions = store.getTransactions();
  if (!transactions || transactions.length === 0) {
    alert('No hay movimientos registrados para exportar.');
    return;
  }

  const headers = ['ID', 'Fecha', 'Tipo', 'Categoría', 'Monto', 'Notas'];
  const rows = transactions.map(tx => {
    const cat = store.getCategoryById(tx.categoryId);
    const tipo = tx.type === 'income' ? 'Ingreso' : 'Gasto';
    const noteEscaped = `"${(tx.note || '').replace(/"/g, '""')}"`;
    return [tx.id, tx.date, tipo, `"${cat.name}"`, tx.amount.toFixed(2), noteEscaped];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kash_movimientos_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importFromJSON(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (store.importData(parsed)) {
        if (onSuccess) onSuccess();
      } else {
        if (onError) onError('Formato de archivo no válido.');
      }
    } catch (err) {
      if (onError) onError('Error al procesar el archivo JSON.');
    }
  };
  reader.readAsText(file);
}
