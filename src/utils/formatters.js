export function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
];
const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
];

function convertBelow100(n) {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
}

function convertBelow1000(n) {
  if (n < 100) return convertBelow100(n);
  return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertBelow100(n % 100) : '');
}

function numberToWordsInner(n) {
  if (n === 0) return 'Zero';
  if (n < 1000) return convertBelow1000(n);
  if (n < 100000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    return convertBelow100(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convertBelow1000(remainder) : '');
  }
  if (n < 10000000) {
    const lakhs = Math.floor(n / 100000);
    const remainder = n % 100000;
    return convertBelow100(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + numberToWordsInner(remainder) : '');
  }
  const crores = Math.floor(n / 10000000);
  const remainder = n % 10000000;
  return numberToWordsInner(crores) + ' Crore' + (remainder !== 0 ? ' ' + numberToWordsInner(remainder) : '');
}

export function numberToWords(num) {
  const n = Math.floor(parseFloat(num) || 0);
  if (n === 0) return 'Rupees Zero Only';
  return 'Rupees ' + numberToWordsInner(n) + ' Only';
}

export function maskPAN(pan) {
  if (!pan || pan.length !== 10) return pan || '-';
  return pan.substring(0, 3) + 'XX' + pan.substring(5);
}
