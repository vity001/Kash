/**
 * OCR - Módulo de Escaneo de Tickets y Auto-clasificación Inteligente
 * Utiliza Tesseract.js para procesar imágenes de tickets/recibos en el navegador.
 */

// Reglas de auto-clasificación por palabras clave de comercios comunes
const MERCHANT_CATEGORY_MAP = [
  { keywords: ['mercadona', 'carrefour', 'lidl', 'dia', 'alcampo', 'alimerka', 'eroski', 'consum', 'supermercado', 'fruteria', 'carniceria', 'panaderia'], catId: 'cat_food', name: 'Alimentación', icon: '🛒' },
  { keywords: ['repsol', 'cepsa', 'bp', 'gasolinera', 'combustible', 'peaje', 'renfe', 'uber', 'cabify', 'metro', 'taller', 'parking', 'estacionamiento'], catId: 'cat_transport', name: 'Transporte', icon: '🚗' },
  { keywords: ['zara', 'h&m', 'pull', 'bershka', 'mango', 'primark', 'decathlon', 'nike', 'adidas', 'el corte ingles', 'ropa', 'calzado'], catId: 'cat_leisure', name: 'Ocio y Compras', icon: '🛍️' },
  { keywords: ['mcdonald', 'burger king', 'dominos', 'telepizza', 'starbucks', 'restaurante', 'bar', 'cafeteria', 'pizzeria', 'cerveceria'], catId: 'cat_leisure', name: 'Restauración / Ocio', icon: '🍔' },
  { keywords: ['iberdrola', 'endesa', 'naturgy', 'aqualia', 'vodafone', 'movistar', 'orange', 'digi', 'luz', 'agua', 'gas', 'internet'], catId: 'cat_services', name: 'Servicios / Suministros', icon: '💡' },
  { keywords: ['farmacia', 'hospital', 'clinica', 'dentista', 'optica', 'salud', 'parafarmacia'], catId: 'cat_health', name: 'Salud', icon: '🩺' }
];

export async function processReceiptImage(imageFile, onProgress) {
  if (typeof Tesseract === 'undefined') {
    throw new Error('La librería Tesseract.js no está cargada.');
  }

  // Visual Progress Update
  if (onProgress) onProgress(10, 'Iniciando motor de reconocimiento OCR...');

  const worker = await Tesseract.createWorker('spa'); // Spanish OCR language
  if (onProgress) onProgress(40, 'Analizando texto del ticket...');

  const ret = await worker.recognize(imageFile);
  await worker.terminate();

  if (onProgress) onProgress(80, 'Extrayendo datos de compra...');

  const rawText = ret.data.text || '';
  console.log('📄 OCR Texto extraído:', rawText);

  // Extract total amount, date, and merchant
  const parsedData = parseReceiptText(rawText);
  if (onProgress) onProgress(100, '¡Ticket analizado con éxito!');

  return {
    rawText,
    ...parsedData
  };
}

function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  let amount = 0;
  let date = new Date().toISOString().split('T')[0];
  let merchant = 'Compra según Ticket';
  let matchedCat = null;

  // 1. Merchant & Category Detection (Iterate lines)
  const lowerText = text.toLowerCase();
  for (const rule of MERCHANT_CATEGORY_MAP) {
    for (const kw of rule.keywords) {
      if (lowerText.includes(kw)) {
        matchedCat = rule;
        // Capitalize merchant name
        merchant = kw.charAt(0).toUpperCase() + kw.slice(1);
        break;
      }
    }
    if (matchedCat) break;
  }

  // 2. Amount Extraction (Look for TOTAL, IMPORTE, SUMA, EUR or highest standalone currency figure)
  const amountRegexes = [
    /(?:TOTAL|IMPORTE|SUMA|A\s+PAGAR|TOTAL\s+EUR)\s*[:=]?\s*(\d+[\.,]\d{2})/i,
    /(\d+[\.,]\d{2})\s*(?:€|EUR)/i,
    /€\s*(\d+[\.,]\d{2})/i
  ];

  for (const regex of amountRegexes) {
    const match = text.match(regex);
    if (match && match[1]) {
      amount = parseFloat(match[1].replace(',', '.'));
      if (amount > 0) break;
    }
  }

  // Fallback: If no explicit TOTAL keyword found, extract highest currency pattern
  if (!amount || amount <= 0) {
    const allPrices = text.match(/\b\d+[\.,]\d{2}\b/g);
    if (allPrices && allPrices.length > 0) {
      const parsedPrices = allPrices.map(p => parseFloat(p.replace(',', '.'))).filter(p => p > 0 && p < 5000);
      if (parsedPrices.length > 0) {
        amount = Math.max(...parsedPrices);
      }
    }
  }

  // 3. Date Extraction (DD/MM/YYYY or YYYY-MM-DD)
  const dateMatch = text.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (dateMatch) {
    let day = dateMatch[1].padStart(2, '0');
    let month = dateMatch[2].padStart(2, '0');
    let year = dateMatch[3];
    if (year.length === 2) year = '20' + year;

    // Validate date format YYYY-MM-DD
    if (parseInt(month) <= 12 && parseInt(day) <= 31) {
      date = `${year}-${month}-${day}`;
    }
  }

  return {
    amount: amount || 0,
    date: date,
    merchant: merchant,
    suggestedCategory: matchedCat ? matchedCat.catId : 'cat_food'
  };
}
