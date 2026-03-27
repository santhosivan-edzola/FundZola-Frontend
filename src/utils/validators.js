export function validatePAN(pan) {
  if (!pan || pan.trim() === '') {
    return { valid: true, message: '' }; // PAN is optional unless required
  }
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const upperPAN = pan.trim().toUpperCase();
  if (!panRegex.test(upperPAN)) {
    return { valid: false, message: 'PAN must be in format: ABCDE1234F' };
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
