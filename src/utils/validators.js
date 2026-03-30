export function validatePAN(pan) {
  if (!pan || pan.trim() === '') {
    return { valid: true, message: '' }; // PAN is optional unless required
  }
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const upperPAN = pan.trim().toUpperCase();
  if (!panRegex.test(upperPAN)) {
    return { valid: false, message: 'PAN must be in format: ABCDE1234F (5 letters, 4 digits, 1 letter)' };
  }
  return { valid: true, message: '' };
}

export function validateAadhaar(aadhaar) {
  if (!aadhaar || aadhaar.trim() === '') {
    return { valid: true, message: '' }; // Aadhaar is optional
  }
  const cleaned = aadhaar.trim().replace(/\s/g, '');
  if (!/^\d{12}$/.test(cleaned)) {
    return { valid: false, message: 'Aadhaar must be exactly 12 digits' };
  }
  // Verhoeff algorithm check digit validation
  const d = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
  const p = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
  let c = 0;
  const digits = cleaned.split('').reverse();
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][parseInt(digits[i])]];
  }
  if (c !== 0) {
    return { valid: false, message: 'Invalid Aadhaar number' };
  }
  return { valid: true, message: '' };
}

export function validateEmail(email) {
  if (!email || email.trim() === '') {
    return { valid: false, message: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: 'Please enter a valid email address' };
  }
  return { valid: true, message: '' };
}

export function validatePhone(phone) {
  if (!phone || phone.trim() === '') {
    return { valid: true, message: '' }; // Phone is optional unless required
  }
  const phoneRegex = /^[6-9]\d{9}$|^\+91[6-9]\d{9}$|^\+91-[6-9]\d{9}$/;
  const cleaned = phone.trim().replace(/[\s-]/g, '');
  if (!phoneRegex.test(cleaned)) {
    return { valid: false, message: 'Please enter a valid 10-digit Indian phone number' };
  }
  return { valid: true, message: '' };
}

export function validateAmount(amount) {
  if (amount === '' || amount === null || amount === undefined) {
    return { valid: false, message: 'Amount is required' };
  }
  const num = parseFloat(amount);
  if (isNaN(num)) {
    return { valid: false, message: 'Amount must be a valid number' };
  }
  if (num <= 0) {
    return { valid: false, message: 'Amount must be greater than zero' };
  }
  if (num > 999999999) {
    return { valid: false, message: 'Amount is too large' };
  }
  return { valid: true, message: '' };
}

export function validateRequired(value, fieldName) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { valid: false, message: `${fieldName} is required` };
  }
  return { valid: true, message: '' };
}
