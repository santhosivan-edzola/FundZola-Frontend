export const DONOR_TYPES = [
  'Individual',
  'Corporate',
  'Trust',
  'Society',
  'Foundation',
  'Other',
];

export const PAYMENT_MODES = [
  'Cash',
  'Cheque',
  'NEFT/RTGS',
  'UPI',
  'Demand Draft',
  'Online Transfer',
];

export const FUND_CATEGORIES = [
  'Education',
  'Healthcare',
  'Infrastructure',
  'Relief Fund',
  'Scholarship',
  'Research',
  'Environment',
  'Women Empowerment',
  'Child Welfare',
  'General',
];

export const EXPENSE_CATEGORIES = [
  'Salaries',
  'Operations',
  'Events',
  'Infrastructure',
  'Medical Aid',
  'Educational Aid',
  'Administrative',
  'Travel',
  'Equipment',
  'Other',
];

export const STORAGE_KEYS = {
  DONORS: 'fz_donors',
  DONATIONS: 'fz_donations',
  EXPENSES: 'fz_expenses',
  ORG_SETTINGS: 'fz_org_settings',
};

export const DEFAULT_ORG = {
  orgName: 'My Charitable Foundation',
  address: '123, Main Street, Sector 5',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  phone: '+91-22-12345678',
  email: 'info@myfoundation.org',
  registrationNumber: 'REG/2020/001234',
  pan80G: 'AAATM1234A',
  signatory: 'Dr. A. Kumar',
  signatoryDesignation: 'Secretary',
};
