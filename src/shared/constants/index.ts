// Shared constants

export const DEFAULT_TAX_RATES = {
  CGST: 1.5,
  SGST: 1.5,
  IGST: 3.0,
} as const;

export const DEFAULT_ROUNDING_MODE: 'PER_ITEM' | 'AGGREGATE' = 'PER_ITEM';

export const DEFAULT_INVOICE_LANGUAGE: 'ENGLISH' | 'MARATHI' | 'BILINGUAL' = 'ENGLISH';

export const DEFAULT_AMOUNT_IN_WORDS_LANGUAGE: 'EN' | 'MR' | 'BOTH' = 'EN';

export const INVOICE_NUMBER_PREFIX = ''; // Using yyyy-mm-NNNN format

export const MAX_INVOICE_ITEMS = 100;

export const WEIGHT_DECIMAL_PLACES = 3;

export const MONEY_DECIMAL_PLACES = 2;

export const RATE_DECIMAL_PLACES = 2;

export const INVOICE_VERSION_SEPARATOR = ' / V';

export const SESSION_ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const SESSION_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const BCRYPT_SALT_ROUNDS = 12;

export const AUDIT_LOG_WARNING_THRESHOLD = 1_000_000;

export const CLOUD_BACKUP_DEFAULT_RETENTION = 30;

export const CLOUD_BACKUP_DB_WRITE_DEBOUNCE_MS = 5000;

export const ENCRYPTION_PBKDF2_ITERATIONS = 100_000;

export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export const PROTOCOL_HANDLER = 'myapp';

export const KEYBOARD_SHORTCUTS = {
  NEW_BILL: 'Ctrl+N',
  EDIT_ROW: 'F2',
  SEARCH_CUSTOMER: 'F3',
  NEXT_FIELD: 'Enter',
  SAVE_DRAFT: 'Ctrl+S',
  PREVIEW: 'Ctrl+P',
  FINALIZE: 'Ctrl+Enter',
  CANCEL: 'Esc',
  SEARCH: 'Ctrl+F',
  EDIT_INVOICE: 'Ctrl+E',
  VIEW_VERSIONS: 'Ctrl+V',
  COMPARE: 'Alt+C',
  PRESET_1: 'Ctrl+1',
  PRESET_2: 'Ctrl+2',
  PRESET_3: 'Ctrl+3',
  PRESET_4: 'Ctrl+4',
  PRESET_5: 'Ctrl+5',
  PRESET_6: 'Ctrl+6',
  PRESET_7: 'Ctrl+7',
  PRESET_8: 'Ctrl+8',
  PRESET_9: 'Ctrl+9',
} as const;

export const MAKING_CHARGE_METHODS = ['FIXED', 'PER_GRAM', 'PERCENTAGE'] as const;

export const WASTAGE_METHODS = ['NONE', 'FIXED', 'PERCENTAGE'] as const;

export const DISCOUNT_METHODS = ['NONE', 'FIXED', 'PERCENTAGE'] as const;

export const INVOICE_STATUSES = ['draft', 'finalized', 'cancelled', 'returned'] as const;

export const TAX_TYPES = ['CGST_SGST', 'IGST'] as const;

export const INVOICE_LANGUAGES = ['ENGLISH', 'MARATHI', 'BILINGUAL'] as const;

export const ROUNDING_MODES = ['PER_ITEM', 'AGGREGATE'] as const;

export const PAYMENT_METHODS_DEFAULT = [
  { code: 'CASH', label: 'Cash', sortOrder: 1 },
  { code: 'UPI', label: 'UPI', sortOrder: 2 },
  { code: 'CARD', label: 'Card', sortOrder: 3 },
  { code: 'BANK_TRANSFER', label: 'Bank Transfer', sortOrder: 4 },
] as const;

export const DEFAULT_METALS = [
  { name: 'Gold', code: 'GOLD' },
  { name: 'Silver', code: 'SILVER' },
] as const;

export const DEFAULT_PURITIES = {
  GOLD: [
    { name: '24K', code: '24K', percentage: 99.9 },
    { name: '22K', code: '22K', percentage: 91.6 },
    { name: '18K', code: '18K', percentage: 75.0 },
  ],
  SILVER: [
    { name: '999', code: '999', percentage: 99.9 },
    { name: '925', code: '925', percentage: 92.5 },
  ],
} as const;

export const PRINT_MARGIN_MM = 10;

export const MAX_LOGO_VERSIONS = 100;