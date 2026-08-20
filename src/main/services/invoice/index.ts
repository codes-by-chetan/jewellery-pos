// Invoice Service - Handles invoice creation, versioning, numbering

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import { InvoiceItem, Payment, InvoiceStatus, TaxType, RoundingMode, InvoiceLanguage, AmountInWordsLanguage } from '../../../shared/types';
import { generateDraftId } from '../../../shared/utilities';
import * as pricingService from '../pricing';
import { calculateTax, calculateGrandTotal, DEFAULT_TAX_RATES_CALC } from '../tax';
import { amountInWords } from '../../../shared/utilities';

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

// In-memory draft storage (could be moved to DB table if needed)
const drafts = new Map<string, DraftInvoice>();

export async function createDraft(input: InvoiceInput): Promise<string> {
  const draftId = generateDraftId();
  const now = new Date().toISOString();

  const draft: DraftInvoice = {
    draftId,
    ...input,
    createdAt: now,
    updatedAt: now,
  };

  drafts.set(draftId, draft);
  return draftId;
}

export async function updateDraft(draftId: string, updates: Partial<DraftInvoice>): Promise<boolean> {
  const draft = drafts.get(draftId);
  if (!draft) return false;

  Object.assign(draft, updates, { updatedAt: new Date().toISOString() });
  return true;
}

export async function getDraft(draftId: string): Promise<DraftInvoice | null> {
  return drafts.get(draftId) || null;
}

export async function deleteDraft(draftId: string): Promise<boolean> {
  return drafts.delete(draftId);
}

export async function getAllDrafts(): Promise<DraftInvoice[]> {
  return Array.from(drafts.values()).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
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
  const draft = drafts.get(draftId);

  if (!draft) return null;

  // Calculate all pricing
  const pricingResults = draft.items.map(item => {
    return pricingService.calculateItem({
      grossWeight: new Decimal(item.gross_weight),
      stoneWeight: new Decimal(item.stone_weight),
      metalRate: new Decimal(item.metal_rate),
      makingChargeMethod: item.making_charge_method,
      makingChargeValue: new Decimal(item.making_charge_value),
      makingChargePerGramBase: item.making_charge_per_gram_base || 'net_weight',
      wastageMethod: item.wastage_method,
      wastageValue: new Decimal(item.wastage_value),
      wastageBase: 'metal_value', // Will need to get from preset
      stoneValue: new Decimal(item.stone_value),
      otherCharges: item.other_charges || [],
      itemDiscountMethod: item.discount_method,
      itemDiscountValue: new Decimal(item.discount_value),
    });
  });

  // Calculate invoice totals
  const invoiceTotals = pricingService.calculateInvoiceTotals(
    pricingResults,
    draft.invoiceDiscountMethod,
    new Decimal(draft.invoiceDiscountValue),
    draft.roundingMode
  );

  // Calculate tax
  const taxResult = taxService.calculateTax(
    invoiceTotals.finalTaxableValue,
    draft.taxType,
    { cgst: 1.5, sgst: 1.5, igst: 3.0 }, // Should come from tax settings
    draft.roundingMode
  );

  const grandTotal = taxService.calculateGrandTotal(
    invoiceTotals.finalTaxableValue,
    invoiceTotals.otherChargesNonTaxable,
    taxResult
  );

  // Amount in words
  const amountInWordsStr = amountInWords(grandTotal, 'EN');

  // Get next invoice number
  const invoiceNumber = await getNextInvoiceNumber(draft.invoiceDate);

  // Get shop info for snapshot
  const shop = await pool.query(sql`SELECT * FROM shops WHERE id = 1`);
  const shopSnapshot = shop[0] || {};

  // Get customer info
  const customer = await pool.query(sql`SELECT * FROM customers WHERE id = ${draft.customerId}`);
  const customerSnapshot = customer[0] || {};

  // Get current rates for snapshot
  const rates = await pool.query(sql`
    SELECT mr.*, m.name as metal_name, p.name as purity_name
    FROM metal_rates mr
    JOIN metals m ON mr.metal_id = m.id
    JOIN purities p ON mr.purity_id = p.id
    WHERE mr.effective_date = (
      SELECT MAX(effective_date) FROM metal_rates mr2
      WHERE mr2.metal_id = mr.metal_id AND mr2.purity_id = mr.purity_id
    )
  `);

  const rateSnapshots = rates.map(r => ({
    metal_id: r.metal_id,
    purity_id: r.purity_id,
    metal_name: r.metal_name,
    purity_name: r.purity_name,
    rate_per_gram: r.rate_per_gram,
  }));

  // Get tax settings
  const taxSettings = await pool.query(sql`SELECT * FROM tax_settings WHERE is_default = 1`);
  const taxSetting = taxSettings[0] || { tax_type: 'CGST_SGST', cgst_rate: 1.5, sgst_rate: 1.5, igst_rate: 3.0 };

  const taxSnapshot = {
    tax_type: taxSetting.tax_type,
    cgst_rate: taxSetting.cgst_rate,
    sgst_rate: taxSetting.sgst_rate,
    igst_rate: taxSetting.igst_rate,
  };

  // Run in transaction
  return await pool.tx(async (tx) => {
    // Create invoice
    const invoiceResult = await tx.query(sql`
      INSERT INTO invoices (
        invoice_number, invoice_date, customer_id, status, tax_type,
        rounding_mode, amount_in_words_language, invoice_language,
        created_by, updated_by, finalized_at
      ) VALUES (
        ${invoiceNumber}, ${draft.invoiceDate}, ${draft.customerId}, 'finalized',
        ${draft.taxType}, ${draft.roundingMode}, 'EN', ${draft.invoiceLanguage},
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
    drafts.delete(draftId);

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