// Invoice Service - Handles invoice creation, versioning, numbering

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import { InvoiceItem, Payment, InvoiceStatus, TaxType, RoundingMode, InvoiceLanguage, AmountInWordsLanguage } from '../../../shared/types';
import { generateDraftId } from '../../../shared/utilities';
import Decimal from 'decimal.js';
import * as pricingService from '../pricing';
import { calculateTax, calculateGrandTotal, calculateTaxPerItem } from '../tax';
import { amountInWords } from '../../../shared/utilities';
import * as shopService from '../shop';

export interface InvoiceInput {
  invoiceDate: string;
  customerId: number;
  items: InvoiceItem[];
  payments: Payment[];
  taxType: TaxType;
  roundingMode: RoundingMode;
  invoiceLanguage: InvoiceLanguage;
  invoiceDiscountMethod: 'NONE' | 'FIXED' | 'PERCENTAGE';
  invoiceDiscountValue: number;
  createdBy: number;
}

export interface DraftInvoice {
  draftId: string;
  invoiceDate: string;
  customerId: number;
  items: InvoiceItem[];
  payments: Payment[];
  taxType: TaxType;
  roundingMode: RoundingMode;
  invoiceLanguage: InvoiceLanguage;
  invoiceDiscountMethod: 'NONE' | 'FIXED' | 'PERCENTAGE';
  invoiceDiscountValue: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// Draft storage - now persisted to database
// const drafts = new Map<string, DraftInvoice>(); // No longer needed

export async function createDraft(input: InvoiceInput): Promise<string> {
  const pool = await getPool();
  const draftId = generateDraftId();
  const now = new Date().toISOString();

  await pool.query(sql`
    INSERT INTO drafts (
      id, invoice_date, customer_id, items_json, payments_json, tax_type,
      rounding_mode, invoice_language, invoice_discount_method, invoice_discount_value,
      created_by, created_at, updated_at
    ) VALUES (
      ${draftId}, ${input.invoiceDate}, ${input.customerId}, ${JSON.stringify(input.items)},
      ${JSON.stringify(input.payments)}, ${input.taxType}, ${input.roundingMode},
      ${input.invoiceLanguage}, ${input.invoiceDiscountMethod}, ${input.invoiceDiscountValue},
      ${input.createdBy}, ${now}, ${now}
    )
  `);

  return draftId;
}

export async function updateDraft(draftId: string, updates: Partial<DraftInvoice>): Promise<boolean> {
  const pool = await getPool();

  const updatesToApply: string[] = [];

  if (updates.invoiceDate !== undefined) { updatesToApply.push(`invoice_date = ${updates.invoiceDate}`); }
  if (updates.customerId !== undefined) { updatesToApply.push(`customer_id = ${updates.customerId}`); }
  if (updates.items !== undefined) { updatesToApply.push(`items_json = ${JSON.stringify(updates.items)}`); }
  if (updates.payments !== undefined) { updatesToApply.push(`payments_json = ${JSON.stringify(updates.payments)}`); }
  if (updates.taxType !== undefined) { updatesToApply.push(`tax_type = ${updates.taxType}`); }
  if (updates.roundingMode !== undefined) { updatesToApply.push(`rounding_mode = ${updates.roundingMode}`); }
  if (updates.invoiceLanguage !== undefined) { updatesToApply.push(`invoice_language = ${updates.invoiceLanguage}`); }
  if (updates.invoiceDiscountMethod !== undefined) { updatesToApply.push(`invoice_discount_method = ${updates.invoiceDiscountMethod}`); }
  if (updates.invoiceDiscountValue !== undefined) { updatesToApply.push(`invoice_discount_value = ${updates.invoiceDiscountValue}`); }

  if (updatesToApply.length === 0) return true;

  updatesToApply.push('updated_at = CURRENT_TIMESTAMP');

  const query = sql`UPDATE drafts SET ${sql.unsafe(updatesToApply.join(', '))} WHERE id = ${draftId}`;
  await pool.query(query);

  return true;
}

export async function getDraft(draftId: string): Promise<DraftInvoice | null> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM drafts WHERE id = ${draftId}`);
  if (result.length === 0) return null;

  const d = result[0];
  return {
    draftId: d.id,
    invoiceDate: d.invoice_date,
    customerId: d.customer_id,
    items: JSON.parse(d.items_json || '[]'),
    payments: JSON.parse(d.payments_json || '[]'),
    taxType: d.tax_type,
    roundingMode: d.rounding_mode,
    invoiceLanguage: d.invoice_language,
    invoiceDiscountMethod: 'NONE' as any, // Could be enhanced
    invoiceDiscountValue: d.invoice_discount_value,
    createdBy: d.created_by,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

export async function deleteDraft(draftId: string): Promise<boolean> {
  const pool = await getPool();
  await pool.query(sql`DELETE FROM drafts WHERE id = ${draftId}`);
  return true;
}

export async function getAllDrafts(): Promise<DraftInvoice[]> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM drafts ORDER BY updated_at DESC`);
  return result.map((d: any) => ({
    draftId: d.id,
    invoiceDate: d.invoice_date,
    customerId: d.customer_id,
    items: JSON.parse(d.items_json || '[]'),
    payments: JSON.parse(d.payments_json || '[]'),
    taxType: d.tax_type,
    roundingMode: d.rounding_mode,
    invoiceLanguage: d.invoice_language,
    invoiceDiscountMethod: 'NONE' as any,
    invoiceDiscountValue: d.invoice_discount_value,
    createdBy: d.created_by,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
}

export async function getNextInvoiceNumber(invoiceDate: string): Promise<string> {
  const pool = await getPool();

  // Extract year-month from invoice date (yyyy-mm)
  const date = new Date(invoiceDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `${year}-${month}-`;

  // Get max sequential number for this month
  const result = await pool.query(sql`
    SELECT MAX(invoice_number) as max_num
    FROM invoices
    WHERE invoice_number LIKE ${prefix + '%'}
  `);

  let nextSeq = 1;
  if (result[0]?.max_num) {
    const maxNum = result[0].max_num;
    const seqStr = maxNum.replace(prefix, '');
    const seq = parseInt(seqStr, 10);
    if (!isNaN(seq)) {
      nextSeq = seq + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

export async function finalizeInvoice(draftId: string, createdBy: number): Promise<{
  invoiceId: number;
  invoiceNumber: string;
  versionNumber: number;
} | null> {
  const pool = await getPool();
  const draft = await getDraft(draftId);

  if (!draft) return null;

  // Calculate all pricing using main process PricingService
  const pricingResults: any[] = [];
  for (const item of draft.items) {
    // Get wastage_base from preset if available, default to 'metal_value'
    let wastageBase: 'metal_value' | 'metal_value_plus_making' = 'metal_value';
    if (item.preset_id) {
      const preset = await pool.query(sql`SELECT wastage_base FROM product_presets WHERE id = ${item.preset_id}`);
      if (preset[0]?.wastage_base) {
        wastageBase = preset[0].wastage_base;
      }
    }

    pricingResults.push(pricingService.calculateItem({
      grossWeight: new Decimal(item.gross_weight),
      stoneWeight: new Decimal(item.stone_weight),
      metalRate: new Decimal(item.metal_rate),
      makingChargeMethod: item.making_charge_method,
      makingChargeValue: new Decimal(item.making_charge_value),
      makingChargePerGramBase: item.making_charge_per_gram_base || 'net_weight',
      wastageMethod: item.wastage_method,
      wastageValue: new Decimal(item.wastage_value),
      wastageBase: wastageBase,
      stoneValue: new Decimal(item.stone_value),
      otherCharges: item.other_charges || [],
      itemDiscountMethod: item.discount_method,
      itemDiscountValue: new Decimal(item.discount_value),
    }));
  }

  // Calculate invoice totals
  const invoiceTotals = pricingService.calculateInvoiceTotals(
    pricingResults,
    draft.invoiceDiscountMethod,
    new Decimal(draft.invoiceDiscountValue),
    draft.roundingMode
  );

  // Get tax settings from database
  const taxSettings = await pool.query(sql`SELECT * FROM tax_settings WHERE is_default = 1`);
  const taxSetting = taxSettings[0] || { tax_type: 'CGST_SGST', cgst_rate: 1.5, sgst_rate: 1.5, igst_rate: 3.0 };

  // Calculate tax based on rounding mode
  let taxResult: { cgst: Decimal; sgst: Decimal; igst: Decimal; totalTax: Decimal };
  if (draft.roundingMode === 'PER_ITEM') {
    taxResult = taxService.calculateTaxPerItem(
      pricingResults.map(pr => ({ taxableValue: pr.taxableValue })),
      draft.taxType,
      { cgst: taxSetting.cgst_rate, sgst: taxSetting.sgst_rate, igst: taxSetting.igst_rate }
    );
  } else {
    taxResult = taxService.calculateTax(
      invoiceTotals.finalTaxableValue,
      draft.taxType,
      { cgst: taxSetting.cgst_rate, sgst: taxSetting.sgst_rate, igst: taxSetting.igst_rate },
      draft.roundingMode
    );
  }

  const grandTotal = taxService.calculateGrandTotal(
    invoiceTotals.finalTaxableValue,
    invoiceTotals.otherChargesNonTaxable,
    taxResult
  );

  // Amount in words - use invoice language
  const amountInWordsLang = draft.invoiceLanguage === 'MARATHI' ? 'MR' : draft.invoiceLanguage === 'BILINGUAL' ? 'BOTH' : 'EN';
  const amountInWordsStr = amountInWords(grandTotal, amountInWordsLang);

  // Get next invoice number - MUST be inside transaction for atomicity
  // We'll do this inside the transaction

  // Get shop info for snapshot
  const shopSettings = await shopService.getSettings();
  const shopSnapshot = shopSettings || {};

  // Get customer info
  const customer = await pool.query(sql`SELECT * FROM customers WHERE id = ${draft.customerId}`);
  const customerSnapshot = customer[0] || {};

  // Get current rates for snapshot (the rates used in this invoice)
  const rateSnapshots = draft.items.map(item => ({
    metal_id: item.metal_id,
    purity_id: item.purity_id,
    rate_per_gram: item.metal_rate,
  }));

  const taxSnapshot = {
    tax_type: taxSetting.tax_type,
    cgst_rate: taxSetting.cgst_rate,
    sgst_rate: taxSetting.sgst_rate,
    igst_rate: taxSetting.igst_rate,
  };

  // Run in transaction - INCLUDE invoice number allocation here for atomicity
  return await pool.tx(async (tx) => {
    // Get next invoice number inside transaction
    const date = new Date(draft.invoiceDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `${year}-${month}-`;

    const result = await tx.query(sql`
      SELECT MAX(invoice_number) as max_num
      FROM invoices
      WHERE invoice_number LIKE ${prefix + '%'}
    `);

    let nextSeq = 1;
    if (result[0]?.max_num) {
      const maxNum = result[0].max_num;
      const seqStr = maxNum.replace(prefix, '');
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq)) {
        nextSeq = seq + 1;
      }
    }

    const invoiceNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;

    // Create invoice
    const invoiceResult = await tx.query(sql`
      INSERT INTO invoices (
        invoice_number, invoice_date, customer_id, status, tax_type,
        rounding_mode, amount_in_words_language, invoice_language,
        created_by, updated_by, finalized_at
      ) VALUES (
        ${invoiceNumber}, ${draft.invoiceDate}, ${draft.customerId}, 'finalized',
        ${draft.taxType}, ${draft.roundingMode}, ${amountInWordsLang}, ${draft.invoiceLanguage},
        ${createdBy}, ${createdBy}, CURRENT_TIMESTAMP
      ) RETURNING id
    `);

    const invoiceId = invoiceResult[0].id;

    // Prepare items for version
    const versionItems = draft.items.map((item, idx) => {
      const pr = pricingResults[idx];
      return {
        line_number: idx + 1,
        product_name_english: item.product_name_english,
        product_name_marathi: item.product_name_marathi,
        metal_id: item.metal_id,
        purity_id: item.purity_id,
        hsn_sac: item.hsn_sac,
        gross_weight: item.gross_weight,
        stone_weight: item.stone_weight,
        net_weight: pr.netWeight.toNumber(),
        metal_rate: item.metal_rate,
        metal_value: pr.metalValue.toNumber(),
        making_charge_method: item.making_charge_method,
        making_charge_value: item.making_charge_value,
        making_charge_amount: pr.makingChargeAmount.toNumber(),
        wastage_method: item.wastage_method,
        wastage_value: item.wastage_value,
        wastage_amount: pr.wastageAmount.toNumber(),
        stone_value: pr.stoneValue.toNumber(),
        other_charges_json: JSON.stringify(item.other_charges || []),
        discount_method: item.discount_method,
        discount_value: item.discount_value,
        discount_amount: pr.itemDiscountAmount.toNumber(),
        taxable_value: pr.taxableValue.toNumber(),
        total_value: pr.totalValue.toNumber(),
      };
    });

    const totalsSnapshot = {
      metal_value: invoiceTotals.metalValue.toNumber(),
      making_charge_amount: invoiceTotals.makingChargeAmount.toNumber(),
      wastage_amount: invoiceTotals.wastageAmount.toNumber(),
      stone_value: invoiceTotals.stoneValue.toNumber(),
      other_charges_taxable: invoiceTotals.otherChargesTaxable.toNumber(),
      other_charges_nontaxable: invoiceTotals.otherChargesNonTaxable.toNumber(),
      discount_amount: invoiceTotals.discountAmount.toNumber(),
      taxable_value: invoiceTotals.finalTaxableValue.toNumber(),
      cgst: taxResult.cgst.toNumber(),
      sgst: taxResult.sgst.toNumber(),
      igst: taxResult.igst.toNumber(),
      grand_total: grandTotal.toNumber(),
      amount_in_words: amountInWordsStr,
    };

    // Create invoice version
    await tx.query(sql`
      INSERT INTO invoice_versions (
        invoice_id, version_number, customer_snapshot_json, items_json,
        rates_json, tax_json, payments_json, totals_json, shop_snapshot_json,
        update_reason, created_by
      ) VALUES (
        ${invoiceId}, 1,
        ${JSON.stringify(customerSnapshot)},
        ${JSON.stringify(versionItems)},
        ${JSON.stringify(rateSnapshots)},
        ${JSON.stringify(taxSnapshot)},
        ${JSON.stringify(draft.payments)},
        ${JSON.stringify(totalsSnapshot)},
        ${JSON.stringify(shopSnapshot)},
        'Initial creation',
        ${createdBy}
      )
    `);

    // Insert invoice items
    for (const item of versionItems) {
      await tx.query(sql`
        INSERT INTO invoice_items (
          invoice_version_id, line_number, product_name_english, product_name_marathi,
          metal_id, purity_id, hsn_sac, gross_weight, stone_weight, net_weight,
          metal_rate, metal_value, making_charge_method, making_charge_value,
          making_charge_amount, wastage_method, wastage_value, wastage_amount,
          stone_value, other_charges_json, discount_method, discount_value,
          discount_amount, taxable_value, total_value
        ) VALUES (
          ${invoiceId}, ${item.line_number}, ${item.product_name_english},
          ${item.product_name_marathi}, ${item.metal_id}, ${item.purity_id},
          ${item.hsn_sac || null}, ${item.gross_weight}, ${item.stone_weight},
          ${item.net_weight}, ${item.metal_rate}, ${item.metal_value},
          ${item.making_charge_method}, ${item.making_charge_value},
          ${item.making_charge_amount}, ${item.wastage_method},
          ${item.wastage_value}, ${item.wastage_amount},
          ${item.stone_value}, ${item.other_charges_json},
          ${item.discount_method}, ${item.discount_value},
          ${item.discount_amount}, ${item.taxable_value}, ${item.total_value}
        )
      `);
    }

    // Insert payments
    for (const payment of draft.payments) {
      await tx.query(sql`
        INSERT INTO payments (invoice_version_id, method, amount, reference_number, date, notes)
        VALUES (${invoiceId}, ${payment.method}, ${payment.amount}, ${payment.reference_number || null}, ${payment.date}, ${payment.notes || null})
      `);
    }

    // Log audit
    await tx.query(sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
      VALUES (${createdBy}, 'INVOICE_CREATED', 'invoice', ${invoiceNumber}, 'Invoice finalized')
    `);

    // Clean up draft
    await tx.query(sql`DELETE FROM drafts WHERE id = ${draftId}`);

    return { invoiceId, invoiceNumber, versionNumber: 1 };
  });
}

export async function getInvoice(invoiceId: number) {
  const pool = await getPool();

  const invoices = await pool.query(sql`SELECT * FROM invoices WHERE id = ${invoiceId}`);
  if (invoices.length === 0) return null;

  const invoice = invoices[0];
  const versions = await pool.query(sql`
    SELECT * FROM invoice_versions WHERE invoice_id = ${invoiceId} ORDER BY version_number DESC
  `);

  return { invoice, versions };
}

export async function getLatestVersion(invoiceId: number) {
  const pool = await getPool();

  const versions = await pool.query(sql`
    SELECT * FROM invoice_versions WHERE invoice_id = ${invoiceId} ORDER BY version_number DESC LIMIT 1
  `);

  return versions[0] || null;
}

export async function getSalesHistory(filters: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: number;
  userId?: number;
  status?: InvoiceStatus;
  page?: number;
  limit?: number;
}) {
  const pool = await getPool();

  let whereClause = 'WHERE 1=1';
  const params: unknown[] = [];

  if (filters.search) {
    whereClause += ' AND (i.invoice_number LIKE ? OR c.name LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.dateFrom) {
    whereClause += ' AND i.invoice_date >= ?';
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    whereClause += ' AND i.invoice_date <= ?';
    params.push(filters.dateTo);
  }
  if (filters.customerId) {
    whereClause += ' AND i.customer_id = ?';
    params.push(filters.customerId);
  }
  if (filters.userId) {
    whereClause += ' AND i.created_by = ?';
    params.push(filters.userId);
  }
  if (filters.status) {
    whereClause += ' AND i.status = ?';
    params.push(filters.status);
  }

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  // Build query using sql tag with dynamic parts
  let query = sql`
    SELECT i.*, c.name as customer_name, c.mobile as customer_mobile,
           u.name as created_by_name, u.username as created_by_username,
           iv.version_number as latest_version
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    LEFT JOIN users u ON i.created_by = u.id
    LEFT JOIN (
      SELECT invoice_id, MAX(version_number) as version_number
      FROM invoice_versions
      GROUP BY invoice_id
    ) iv ON i.id = iv.invoice_id
    WHERE 1=1
  `;

  // Add dynamic where conditions
  if (filters.search) {
    query = sql`${query} AND (i.invoice_number LIKE ${'%' + filters.search + '%'} OR c.name LIKE ${'%' + filters.search + '%'})`;
  }
  if (filters.dateFrom) {
    query = sql`${query} AND i.invoice_date >= ${filters.dateFrom}`;
  }
  if (filters.dateTo) {
    query = sql`${query} AND i.invoice_date <= ${filters.dateTo}`;
  }
  if (filters.customerId) {
    query = sql`${query} AND i.customer_id = ${filters.customerId}`;
  }
  if (filters.userId) {
    query = sql`${query} AND i.created_by = ${filters.userId}`;
  }
  if (filters.status) {
    query = sql`${query} AND i.status = ${filters.status}`;
  }

  query = sql`${query} ORDER BY i.invoice_date DESC, i.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

  const invoices = await pool.query(query);

  // Count query
  let countQuery = sql`
    SELECT COUNT(*) as total
    FROM invoices i
    LEFT JOIN customers c ON i.customer_id = c.id
    WHERE 1=1
  `;

  if (filters.search) {
    countQuery = sql`${countQuery} AND (i.invoice_number LIKE ${'%' + filters.search + '%'} OR c.name LIKE ${'%' + filters.search + '%'})`;
  }
  if (filters.dateFrom) {
    countQuery = sql`${countQuery} AND i.invoice_date >= ${filters.dateFrom}`;
  }
  if (filters.dateTo) {
    countQuery = sql`${countQuery} AND i.invoice_date <= ${filters.dateTo}`;
  }
  if (filters.customerId) {
    countQuery = sql`${countQuery} AND i.customer_id = ${filters.customerId}`;
  }
  if (filters.userId) {
    countQuery = sql`${countQuery} AND i.created_by = ${filters.userId}`;
  }
  if (filters.status) {
    countQuery = sql`${countQuery} AND i.status = ${filters.status}`;
  }

  const countResult = await pool.query(countQuery);

  return {
    invoices,
    total: countResult[0]?.total || 0,
    page,
    limit,
  };
}

// ========== Invoice Versioning Functions ==========

export async function createVersion(invoiceId: number, input: {
  items: InvoiceItem[];
  payments: Payment[];
  taxType: TaxType;
  roundingMode: RoundingMode;
  invoiceLanguage: InvoiceLanguage;
  invoiceDiscountMethod: 'NONE' | 'FIXED' | 'PERCENTAGE';
  invoiceDiscountValue: number;
  updateReason: string;
  createdBy: number;
}): Promise<{ success: boolean; versionNumber?: number; error?: string }> {
  const pool = await getPool();

  // Get the invoice
  const invoices = await pool.query(sql`SELECT * FROM invoices WHERE id = ${invoiceId}`);
  if (invoices.length === 0) {
    return { success: false, error: 'Invoice not found' };
  }
  const invoice = invoices[0];

  // Get the latest version number
  const versions = await pool.query(sql`
    SELECT MAX(version_number) as max_version FROM invoice_versions WHERE invoice_id = ${invoiceId}
  `);
  const nextVersion = (versions[0]?.max_version || 0) + 1;

  // Get customer snapshot from latest version
  const latestVersion = await pool.query(sql`
    SELECT * FROM invoice_versions WHERE invoice_id = ${invoiceId} ORDER BY version_number DESC LIMIT 1
  `);
  let customerSnapshot = {};
  if (latestVersion.length > 0) {
    try {
      customerSnapshot = JSON.parse(latestVersion[0].customer_snapshot_json);
    } catch {
      customerSnapshot = {};
    }
  }

  // Calculate pricing for new items (same logic as finalizeInvoice)
  const pricingResults = input.items.map(item => {
    return pricingService.calculateItem({
      grossWeight: new Decimal(item.gross_weight),
      stoneWeight: new Decimal(item.stone_weight),
      metalRate: new Decimal(item.metal_rate),
      makingChargeMethod: item.making_charge_method,
      makingChargeValue: new Decimal(item.making_charge_value),
      makingChargePerGramBase: item.making_charge_per_gram_base || 'net_weight',
      wastageMethod: item.wastage_method,
      wastageValue: new Decimal(item.wastage_value),
      wastageBase: 'metal_value',
      stoneValue: new Decimal(item.stone_value),
      otherCharges: item.other_charges || [],
      itemDiscountMethod: item.discount_method,
      itemDiscountValue: new Decimal(item.discount_value),
    });
  });

  const invoiceTotals = pricingService.calculateInvoiceTotals(
    pricingResults,
    input.invoiceDiscountMethod,
    new Decimal(input.invoiceDiscountValue),
    input.roundingMode
  );

  // Get tax settings
  const taxSettings = await pool.query(sql`SELECT * FROM tax_settings WHERE is_default = 1`);
  const taxSetting = taxSettings[0] || { tax_type: 'CGST_SGST', cgst_rate: 1.5, sgst_rate: 1.5, igst_rate: 3.0 };

  let taxResult: { cgst: Decimal; sgst: Decimal; igst: Decimal; totalTax: Decimal };
  if (input.roundingMode === 'PER_ITEM') {
    taxResult = taxService.calculateTaxPerItem(
      pricingResults.map(pr => ({ taxableValue: pr.taxableValue })),
      input.taxType,
      { cgst: taxSetting.cgst_rate, sgst: taxSetting.sgst_rate, igst: taxSetting.igst_rate }
    );
  } else {
    taxResult = taxService.calculateTax(
      invoiceTotals.finalTaxableValue,
      input.taxType,
      { cgst: taxSetting.cgst_rate, sgst: taxSetting.sgst_rate, igst: taxSetting.igst_rate },
      input.roundingMode
    );
  }

  const grandTotal = taxService.calculateGrandTotal(
    invoiceTotals.finalTaxableValue,
    invoiceTotals.otherChargesNonTaxable,
    taxResult
  );

  // Amount in words
  const amountInWordsLang = input.invoiceLanguage === 'MARATHI' ? 'MR' : input.invoiceLanguage === 'BILINGUAL' ? 'BOTH' : 'EN';
  const amountInWordsStr = amountInWords(grandTotal, amountInWordsLang);

  // Get shop snapshot
  const shopSettings = await shopService.getSettings();
  const shopSnapshot = shopSettings || {};

  // Get rate snapshots
  const rateSnapshots = input.items.map(item => ({
    metal_id: item.metal_id,
    purity_id: item.purity_id,
    rate_per_gram: item.metal_rate,
  }));

  const taxSnapshot = {
    tax_type: taxSetting.tax_type,
    cgst_rate: taxSetting.cgst_rate,
    sgst_rate: taxSetting.sgst_rate,
    igst_rate: taxSetting.igst_rate,
  };

  const versionItems = input.items.map((item, idx) => {
    const pr = pricingResults[idx];
    return {
      line_number: idx + 1,
      product_name_english: item.product_name_english,
      product_name_marathi: item.product_name_marathi,
      metal_id: item.metal_id,
      purity_id: item.purity_id,
      hsn_sac: item.hsn_sac,
      gross_weight: item.gross_weight,
      stone_weight: item.stone_weight,
      net_weight: pr.netWeight.toNumber(),
      metal_rate: item.metal_rate,
      metal_value: pr.metalValue.toNumber(),
      making_charge_method: item.making_charge_method,
      making_charge_value: item.making_charge_value,
      making_charge_amount: pr.makingChargeAmount.toNumber(),
      wastage_method: item.wastage_method,
      wastage_value: item.wastage_value,
      wastage_amount: pr.wastageAmount.toNumber(),
      stone_value: pr.stoneValue.toNumber(),
      other_charges_json: JSON.stringify(item.other_charges || []),
      discount_method: item.discount_method,
      discount_value: item.discount_value,
      discount_amount: pr.itemDiscountAmount.toNumber(),
      taxable_value: pr.taxableValue.toNumber(),
      total_value: pr.totalValue.toNumber(),
    };
  });

  const totalsSnapshot = {
    metal_value: invoiceTotals.metalValue.toNumber(),
    making_charge_amount: invoiceTotals.makingChargeAmount.toNumber(),
    wastage_amount: invoiceTotals.wastageAmount.toNumber(),
    stone_value: invoiceTotals.stoneValue.toNumber(),
    other_charges_taxable: invoiceTotals.otherChargesTaxable.toNumber(),
    other_charges_nontaxable: invoiceTotals.otherChargesNonTaxable.toNumber(),
    discount_amount: invoiceTotals.discountAmount.toNumber(),
    taxable_value: invoiceTotals.finalTaxableValue.toNumber(),
    cgst: taxResult.cgst.toNumber(),
    sgst: taxResult.sgst.toNumber(),
    igst: taxResult.igst.toNumber(),
    grand_total: grandTotal.toNumber(),
    amount_in_words: amountInWordsStr,
  };

  return await pool.tx(async (tx) => {
    // Create new version
    await tx.query(sql`
      INSERT INTO invoice_versions (
        invoice_id, version_number, customer_snapshot_json, items_json,
        rates_json, tax_json, payments_json, totals_json, shop_snapshot_json,
        update_reason, created_by
      ) VALUES (
        ${invoiceId}, ${nextVersion},
        ${JSON.stringify(customerSnapshot)},
        ${JSON.stringify(versionItems)},
        ${JSON.stringify(rateSnapshots)},
        ${JSON.stringify(taxSnapshot)},
        ${JSON.stringify(input.payments)},
        ${JSON.stringify(totalsSnapshot)},
        ${JSON.stringify(shopSnapshot)},
        ${input.updateReason},
        ${input.createdBy}
      )
    `);

    // Update invoice status and updated_by
    await tx.query(sql`
      UPDATE invoices SET updated_by = ${input.createdBy}, updated_at = CURRENT_TIMESTAMP WHERE id = ${invoiceId}
    `);

    // Log audit
    await tx.query(sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
      VALUES (${input.createdBy}, 'INVOICE_VERSION_CREATED', 'invoice_version', ${invoice.invoice_number + ' / V' + nextVersion}, 'Invoice version created: ' + ${input.updateReason})
    `);

    return { success: true, versionNumber: nextVersion };
  });
}

export async function compareVersions(invoiceId: number, v1: number, v2: number): Promise<any> {
  const pool = await getPool();

  const versions = await pool.query(sql`
    SELECT * FROM invoice_versions WHERE invoice_id = ${invoiceId} AND version_number IN (${v1}, ${v2}) ORDER BY version_number
  `);

  if (versions.length !== 2) {
    return { error: 'One or both versions not found' };
  }

  const version1 = versions.find(v => v.version_number === v1);
  const version2 = versions.find(v => v.version_number === v2);

  if (!version1 || !version2) {
    return { error: 'One or both versions not found' };
  }

  // Parse JSON fields
  const parseJson = (json: string) => {
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  };

  const items1 = parseJson(version1.items_json) || [];
  const items2 = parseJson(version2.items_json) || [];
  const totals1 = parseJson(version1.totals_json) || {};
  const totals2 = parseJson(version2.totals_json) || {};
  const customer1 = parseJson(version1.customer_snapshot_json) || {};
  const customer2 = parseJson(version2.customer_snapshot_json) || {};

  // Compare fields
  const differences: any[] = [];

  // Compare customer fields
  const customerFields = ['name', 'mobile', 'address'];
  for (const field of customerFields) {
    if (customer1[field] !== customer2[field]) {
      differences.push({
        field: `Customer ${field}`,
        version1: customer1[field] || '',
        version2: customer2[field] || '',
      });
    }
  }

  // Compare items (by line number)
  const maxItems = Math.max(items1.length, items2.length);
  for (let i = 0; i < maxItems; i++) {
    const item1 = items1[i];
    const item2 = items2[i];

    if (!item1 && item2) {
      differences.push({
        field: `Item ${i + 1}`,
        version1: '(removed)',
        version2: item2.product_name_english,
      });
      continue;
    }
    if (item1 && !item2) {
      differences.push({
        field: `Item ${i + 1}`,
        version1: item1.product_name_english,
        version2: '(removed)',
      });
      continue;
    }
    if (item1 && item2) {
      const itemFields = [
        'product_name_english', 'product_name_marathi', 'gross_weight', 'stone_weight',
        'net_weight', 'metal_rate', 'metal_value', 'making_charge_amount',
        'wastage_amount', 'stone_value', 'taxable_value', 'total_value'
      ];
      for (const field of itemFields) {
        const v1Val = item1[field];
        const v2Val = item2[field];
        if (v1Val !== v2Val) {
          differences.push({
            field: `Item ${i + 1} ${field}`,
            version1: v1Val,
            version2: v2Val,
          });
        }
      }
    }
  }

  // Compare totals
  const totalFields = ['metal_value', 'making_charge_amount', 'wastage_amount', 'stone_value', 'taxable_value', 'cgst', 'sgst', 'igst', 'grand_total'];
  for (const field of totalFields) {
    if (totals1[field] !== totals2[field]) {
      differences.push({
        field: `Total ${field}`,
        version1: totals1[field],
        version2: totals2[field],
      });
    }
  }

  return {
    version1: {
      version_number: version1.version_number,
      created_by: version1.created_by,
      created_at: version1.created_at,
      update_reason: version1.update_reason,
    },
    version2: {
      version_number: version2.version_number,
      created_by: version2.created_by,
      created_at: version2.created_at,
      update_reason: version2.update_reason,
    },
    differences,
    changedOnly: differences,
    allFields: differences,
  };
}

export async function cancelInvoice(invoiceId: number, reason: string): Promise<{ success: boolean; error?: string }> {
  const pool = await getPool();

  // Check if invoice exists and is finalized
  const invoices = await pool.query(sql`SELECT * FROM invoices WHERE id = ${invoiceId}`);
  if (invoices.length === 0) {
    return { success: false, error: 'Invoice not found' };
  }
  const invoice = invoices[0];

  if (invoice.status === 'cancelled') {
    return { success: false, error: 'Invoice is already cancelled' };
  }
  if (invoice.status !== 'finalized') {
    return { success: false, error: 'Only finalized invoices can be cancelled' };
  }

  return await pool.tx(async (tx) => {
    await tx.query(sql`UPDATE invoices SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ${invoiceId}`);

    await tx.query(sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description)
      VALUES (${invoice.created_by}, 'INVOICE_CANCELLED', 'invoice', ${invoice.invoice_number}, 'Invoice cancelled: ' + ${reason})
    `);

    return { success: true };
  });
}

export async function returnInvoice(invoiceId: number, input: {
  items: { invoice_item_id: number; return_quantity: number; return_reason: string }[];
  createdBy: number;
}): Promise<{ success: boolean; error?: string; returnedInvoiceId?: number }> {
  const pool = await getPool();

  // Get original invoice
  const invoices = await pool.query(sql`SELECT * FROM invoices WHERE id = ${invoiceId}`);
  if (invoices.length === 0) {
    return { success: false, error: 'Invoice not found' };
  }
  const invoice = invoices[0];

  if (invoice.status !== 'finalized') {
    return { success: false, error: 'Only finalized invoices can be returned' };
  }

  // Create a new invoice with negative quantities (return invoice)
  // This is a simplified version - in reality you'd need more complex logic
  return { success: false, error: 'Return invoice workflow not fully implemented yet' };
}

export async function getVersionHistory(invoiceId: number): Promise<any[]> {
  const pool = await getPool();

  const versions = await pool.query(sql`
    SELECT iv.*, u.name as created_by_name
    FROM invoice_versions iv
    LEFT JOIN users u ON iv.created_by = u.id
    WHERE iv.invoice_id = ${invoiceId}
    ORDER BY iv.version_number DESC
  `);

  return versions;
}