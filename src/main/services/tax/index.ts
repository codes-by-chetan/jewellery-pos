// Tax Service - Settings and Calculation

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import Decimal from 'decimal.js';
import { TaxType, RoundingMode } from '../../../shared/types';
import { round } from '../../../shared/utilities';
import { MONEY_DECIMAL_PLACES, DEFAULT_TAX_RATES } from '../../../shared/constants';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

// Settings interfaces
export interface TaxSettings {
  id: number;
  tax_type: 'CGST_SGST' | 'IGST';
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  is_default: number;
  created_at: string;
  updated_at: string;
}

// Calculation interfaces
export interface TaxRates {
  cgst: number;
  sgst: number;
  igst: number;
}

export interface TaxResult {
  cgst: Decimal;
  sgst: Decimal;
  igst: Decimal;
  totalTax: Decimal;
}

export async function getSettings(): Promise<TaxSettings | null> {
  const pool = await getPool();
  const result = await pool.query(sql`SELECT * FROM tax_settings WHERE is_default = 1`);
  if (result.length === 0) return null;
  return result[0];
}

export async function updateSettings(input: Partial<TaxSettings>): Promise<TaxSettings | null> {
  const pool = await getPool();

  // If setting a new default, unset old defaults
  if (input.is_default === 1) {
    await pool.query(sql`UPDATE tax_settings SET is_default = 0`);
  }

  const updatesToApply: string[] = [];

  if (input.tax_type !== undefined) { updatesToApply.push(`tax_type = ${input.tax_type}`); }
  if (input.cgst_rate !== undefined) { updatesToApply.push(`cgst_rate = ${input.cgst_rate}`); }
  if (input.sgst_rate !== undefined) { updatesToApply.push(`sgst_rate = ${input.sgst_rate}`); }
  if (input.igst_rate !== undefined) { updatesToApply.push(`igst_rate = ${input.igst_rate}`); }
  if (input.is_default !== undefined) { updatesToApply.push(`is_default = ${input.is_default ? 1 : 0}`); }

  if (updatesToApply.length === 0) return getSettings();

  updatesToApply.push('updated_at = CURRENT_TIMESTAMP');

  // Get the default record ID
  const defaultRecord = await pool.query(sql`SELECT id FROM tax_settings WHERE is_default = 1 OR id = 1 LIMIT 1`);
  if (defaultRecord.length === 0) return null;

  const query = sql`UPDATE tax_settings SET ${sql.unsafe(updatesToApply.join(', '))} WHERE id = ${defaultRecord[0].id}`;
  await pool.query(query);
  return getSettings();
}

// Tax Calculation Functions
export function calculateTax(
  taxableValue: Decimal,
  taxType: TaxType,
  rates: TaxRates,
  roundingMode: RoundingMode
): TaxResult {
  const cgstRate = new Decimal(rates.cgst).dividedBy(100);
  const sgstRate = new Decimal(rates.sgst).dividedBy(100);
  const igstRate = new Decimal(rates.igst).dividedBy(100);

  let cgst = new Decimal(0);
  let sgst = new Decimal(0);
  let igst = new Decimal(0);

  if (taxType === 'CGST_SGST') {
    cgst = round(taxableValue.times(cgstRate), MONEY_DECIMAL_PLACES);
    sgst = round(taxableValue.times(sgstRate), MONEY_DECIMAL_PLACES);
  } else {
    igst = round(taxableValue.times(igstRate), MONEY_DECIMAL_PLACES);
  }

  const totalTax = round(cgst.plus(sgst).plus(igst), MONEY_DECIMAL_PLACES);

  return { cgst, sgst, igst, totalTax };
}

/**
 * Calculate tax per item (for PER_ITEM rounding mode)
 * Each item's taxable value is rounded individually, then tax is calculated on each
 */
export function calculateTaxPerItem(
  items: { taxableValue: Decimal }[],
  taxType: TaxType,
  rates: TaxRates
): { cgst: Decimal; sgst: Decimal; igst: Decimal; totalTax: Decimal } {
  const cgstRate = new Decimal(rates.cgst).dividedBy(100);
  const sgstRate = new Decimal(rates.sgst).dividedBy(100);
  const igstRate = new Decimal(rates.igst).dividedBy(100);

  let totalCgst = new Decimal(0);
  let totalSgst = new Decimal(0);
  let totalIgst = new Decimal(0);

  for (const item of items) {
    const taxableValue = round(item.taxableValue, MONEY_DECIMAL_PLACES);

    if (taxType === 'CGST_SGST') {
      totalCgst = totalCgst.plus(round(taxableValue.times(cgstRate), MONEY_DECIMAL_PLACES));
      totalSgst = totalSgst.plus(round(taxableValue.times(sgstRate), MONEY_DECIMAL_PLACES));
    } else {
      totalIgst = totalIgst.plus(round(taxableValue.times(igstRate), MONEY_DECIMAL_PLACES));
    }
  }

  const totalTax = round(totalCgst.plus(totalSgst).plus(totalIgst), MONEY_DECIMAL_PLACES);

  return { cgst: totalCgst, sgst: totalSgst, igst: totalIgst, totalTax };
}

export function calculateGrandTotal(
  finalTaxableValue: Decimal,
  otherChargesNonTaxable: Decimal,
  taxResult: TaxResult
): Decimal {
  return round(
    finalTaxableValue.plus(otherChargesNonTaxable).plus(taxResult.totalTax),
    MONEY_DECIMAL_PLACES
  );
}

// Default tax rates for jewellery
export const DEFAULT_TAX_RATES_CALC: TaxRates = {
  cgst: 1.5,
  sgst: 1.5,
  igst: 3.0,
};