// Shared types for the entire application

export type Metal = {
  id: number;
  name: string;
  code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Purity = {
  id: number;
  metal_id: number;
  name: string;
  code: string;
  percentage: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type TaxType = 'CGST_SGST' | 'IGST';
export type InvoiceLanguage = 'ENGLISH' | 'MARATHI' | 'BILINGUAL';
export type RoundingMode = 'PER_ITEM' | 'AGGREGATE';
export type AmountInWordsLanguage = 'EN' | 'MR' | 'BOTH';
export type InvoiceStatus = 'draft' | 'finalized' | 'cancelled' | 'returned';
export type MakingChargeMethod = 'FIXED' | 'PER_GRAM' | 'PERCENTAGE';
export type WastageMethod = 'NONE' | 'FIXED' | 'PERCENTAGE';
export type DiscountMethod = 'NONE' | 'FIXED' | 'PERCENTAGE';

export type Customer = {
  id: number;
  name: string;
  mobile?: string;
  address?: string;
  birth_date?: string;
  created_at: string;
  updated_at: string;
};

export type ProductPreset = {
  id: number;
  english_name?: string;
  marathi_name?: string;
  metal_id: number;
  purity_id: number;
  hsn_sac?: string;
  making_charge_method?: MakingChargeMethod;
  making_charge_value?: number;
  making_charge_per_gram_base: 'net_weight' | 'gross_weight';
  wastage_base: 'metal_value' | 'metal_value_plus_making';
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type InvoiceItem = {
  line_number: number;
  product_name_english: string;
  product_name_marathi: string;
  metal_id: number;
  purity_id: number;
  hsn_sac?: string;
  gross_weight: number;
  stone_weight: number;
  net_weight: number;
  metal_rate: number;
  metal_value: number;
  making_charge_method: MakingChargeMethod;
  making_charge_value: number;
  making_charge_amount: number;
  wastage_method: WastageMethod;
  wastage_value: number;
  wastage_amount: number;
  stone_value: number;
  other_charges: OtherCharge[];
  discount_method: DiscountMethod;
  discount_value: number;
  discount_amount: number;
  taxable_value: number;
  total_value: number;
};

export type OtherCharge = {
  label: string;
  amount: number;
  is_taxable: boolean;
};

export type Payment = {
  method: string;
  amount: number;
  reference_number?: string;
  date: string;
  notes?: string;
};

export type InvoiceVersion = {
  id: number;
  invoice_id: number;
  version_number: number;
  items: InvoiceItem[];
  rates: RateSnapshot[];
  tax: TaxSnapshot;
  payments: Payment[];
  totals: InvoiceTotals;
  update_reason: string;
  created_by: number;
  created_at: string;
};

export type InvoiceTotals = {
  metal_value: number;
  making_charge_amount: number;
  wastage_amount: number;
  stone_value: number;
  other_charges_taxable: number;
  other_charges_nontaxable: number;
  discount_amount: number;
  taxable_value: number;
  cgst: number;
  sgst: number;
  igst: number;
  grand_total: number;
  amount_in_words: string;
};

export type RateSnapshot = {
  metal_id: number;
  purity_id: number;
  metal_name: string;
  purity_name: string;
  rate_per_gram: number;
};

export type TaxSnapshot = {
  tax_type: TaxType;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
};

export type User = {
  id: number;
  name: string;
  username: string;
  role: 'ADMIN' | 'USER';
  active: boolean;
  last_login_at?: string;
  created_at: string;
};

export type Role = 'ADMIN' | 'USER';

export type Permission =
  | 'CREATE_BILL'
  | 'EDIT_BILL'
  | 'VIEW_SALES'
  | 'VIEW_INVOICE_HISTORY'
  | 'PRINT_INVOICE'
  | 'MANAGE_CUSTOMERS'
  | 'MANAGE_PRODUCT_PRESETS'
  | 'MANAGE_RATES'
  | 'MANAGE_TAX_SETTINGS'
  | 'MANAGE_USERS'
  | 'VIEW_SALES_REPORT'
  | 'VIEW_AUDIT_LOG'
  | 'BACKUP_DATABASE'
  | 'RESTORE_DATABASE'
  | 'MANAGE_SHOP_SETTINGS';

export type ShopSettings = {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  state_code?: string;
  logo_filename?: string;
  invoice_footer?: string;
  terms_conditions?: string;
  rounding_mode: RoundingMode;
};

export type BackupProviderType = 'gdrive' | 'github';

export type BackupTrigger = 'interval' | 'daily' | 'app_close' | 'db_write' | 'manual';

export type CloudBackupLog = {
  id: number;
  provider: BackupProviderType;
  file_name: string;
  file_size: number;
  status: 'success' | 'failed';
  error_message?: string;
  trigger: BackupTrigger;
  created_at: string;
};

export type AuditLog = {
  id: number;
  user_id?: number;
  action: string;
  entity_type: string;
  entity_id?: string;
  description?: string;
  created_at: string;
};