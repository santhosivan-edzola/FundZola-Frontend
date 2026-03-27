export function generateId() {
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2, 9);
  const random2 = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${random1}-${random2}`;
}

export function generateReceiptNumber(donations = []) {
  const year = new Date().getFullYear();
  const prefix = `FZ-${year}-`;
  const existing = (donations || [])
    .map((d) => d.receiptNumber || '')
    .filter((r) => r.startsWith(prefix))
    .map((r) => parseInt(r.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));

  const max = existing.length > 0 ? Math.max(...existing) : 0;
  const next = (max + 1).toString().padStart(4, '0');
  return `${prefix}${next}`;
}
