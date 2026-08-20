// Shared Zod schemas for validation

import { z } from 'zod';

export const metalSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(50),
  code: z.string().min(1).max(20).toUpperCase(),
  active: z.boolean().default(true),
});

export const puritySchema = z.object({
  id: z.number().optional(),
  metal_id: z.number().int().positive(),
  name: z.string().min(1).max(20),
  code: z.string().min(1).max(20).toUpperCase(),
  percentage: z.number().positive().max(100),
  active: z.boolean().default(true),
});

export const customerSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(100),
  mobile: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  birth_date: z.string().date().optional(),
});

export const productPresetSchema = z.object({
  id: z.number().optional(),
  english_name: z.string().max(100).optional(),
  marathi_name: z.string().max(100).optional(),
  metal_id: z.number().int().positive(),
  purity_id: z.number().int().positive(),
  hsn_sac: z.string().max(20).optional(),
  making_charge_method: z.enum(['FIXED', 'PER_GRAM', 'PERCENTAGE']).optional(),
  making_charge_value: z.number().nonnegative().optional(),
  making_charge_per_gram_base: z.enum(['net_weight', 'gross_weight']).default('net_weight'),
  wastage_base: z.enum(['metal_value', 'metal_value_plus_making']).default('metal_value'),
  active: z.boolean().default(true),
}).refine(data => data.english_name || data.marathi_name, {
  message: 'Please provide an English or Marathi product name.',
  path: ['english_name'],
});

export const invoiceItemSchema = z.object({
  product_name_english: z.string().min(1).max(100),
  product_name_marathi: z.string().min(1).max(100),
  metal_id: z.number().int().positive(),
  purity_id: z.number().int().positive(),
  hsn_sac: z.string().max(20).optional(),
  gross_weight: z.number().nonnegative().max(999999.999),
  stone_weight: z.number().nonnegative().max(999999.999),
  metal_rate: z.number().nonnegative().max(999999.99),
  making_charge_method: z.enum(['FIXED', 'PER_GRAM', 'PERCENTAGE']),
  making_charge_value: z.number().nonnegative().max(999999.99),
  wastage_method: z.enum(['NONE', 'FIXED', 'PERCENTAGE']).default('NONE'),
  wastage_value: z.number().nonnegative().max(999999.99).default(0),
  stone_value: z.number().nonnegative().max(999999.99).default(0),
  other_charges: z.array(z.object({
    label: z.string().min(1).max(50),
    amount: z.number().nonnegative().max(999999.99),
    is_taxable: z.boolean().default(true),
  })).default([]),
  discount_method: z.enum(['NONE', 'FIXED', 'PERCENTAGE']).default('NONE'),
  discount_value: z.number().nonnegative().max(999999.99).default(0),
}).refine(data => data.stone_weight <= data.gross_weight, {
  message: 'Stone weight cannot exceed gross weight.',
  path: ['stone_weight'],
});

export const paymentSchema = z.object({
  method: z.string().min(1).max(50),
  amount: z.number().positive().max(99999999.99),
  reference_number: z.string().max(100).optional(),
  date: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const shopSettingsSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  gstin: z.string().max(15).optional(),
  pan: z.string().max(10).optional(),
  state_code: z.string().max(2).optional(),
  invoice_footer: z.string().max(500).optional(),
  terms_conditions: z.string().max(1000).optional(),
  rounding_mode: z.enum(['PER_ITEM', 'AGGREGATE']).default('PER_ITEM'),
});

export const taxSettingsSchema = z.object({
  tax_type: z.enum(['CGST_SGST', 'IGST']).default('CGST_SGST'),
  cgst_rate: z.number().nonnegative().max(100).default(1.5),
  sgst_rate: z.number().nonnegative().max(100).default(1.5),
  igst_rate: z.number().nonnegative().max(100).default(3.0),
});

export const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(100),
});

export const createAdminSchema = z.object({
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const userSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(100),
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100).optional(),
  role: z.enum(['ADMIN', 'USER']),
  active: z.boolean().default(true),
});

export const rateSchema = z.object({
  metal_id: z.number().int().positive(),
  purity_id: z.number().int().positive(),
  rate_per_gram: z.number().positive().max(999999.99),
  effective_date: z.string().date(),
});

export const invoiceCreateSchema = z.object({
  invoice_date: z.string().date(),
  customer_id: z.number().int().positive(),
  items: z.array(invoiceItemSchema).min(1).max(100),
  payments: z.array(paymentSchema).min(1),
  tax_type: z.enum(['CGST_SGST', 'IGST']),
  rounding_mode: z.enum(['PER_ITEM', 'AGGREGATE']),
  invoice_language: z.enum(['ENGLISH', 'MARATHI', 'BILINGUAL']),
  invoice_discount_method: z.enum(['NONE', 'FIXED', 'PERCENTAGE']).default('NONE'),
  invoice_discount_value: z.number().nonnegative().max(999999.99).default(0),
});

export const cloudBackupConfigSchema = z.object({
  provider: z.enum(['gdrive', 'github']),
  enabled: z.boolean().default(false),
  config: z.object({
    // Google Drive
    access_token: z.string().optional(),
    refresh_token: z.string().optional(),
    folder_id: z.string().optional(),
    // GitHub
    token: z.string().optional(),
    owner: z.string().optional(),
    repo: z.string().optional(),
    branch: z.string().default('main'),
  }),
  triggers: z.object({
    intervalHours: z.number().int().positive().optional(),
    dailyTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
    onAppClose: z.boolean().default(false),
    onDbWrite: z.boolean().default(false),
  }),
  retentionCount: z.number().int().positive().default(30),
  encryptionEnabled: z.boolean().default(false),
  encryptionPassphrase: z.string().optional(),
});

export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  date_from: z.string().date().optional(),
  date_to: z.string().date().optional(),
});

export const invoiceFilterSchema = paginationSchema.merge(dateRangeSchema).extend({
  search: z.string().optional(),
  customer_id: z.number().int().positive().optional(),
  user_id: z.number().int().positive().optional(),
  status: z.enum(['draft', 'finalized', 'cancelled', 'returned']).optional(),
});

// Type exports
export type MetalInput = z.infer<typeof metalSchema>;
export type PurityInput = z.infer<typeof puritySchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type ProductPresetInput = z.infer<typeof productPresetSchema>;
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ShopSettingsInput = z.infer<typeof shopSettingsSchema>;
export type TaxSettingsInput = z.infer<typeof taxSettingsSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateAdminInput = z.infer<typeof createAdminSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type RateInput = z.infer<typeof rateSchema>;
export type InvoiceCreateInput = z.infer<typeof invoiceCreateSchema>;
export type CloudBackupConfigInput = z.infer<typeof cloudBackupConfigSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type InvoiceFilterInput = z.infer<typeof invoiceFilterSchema>;