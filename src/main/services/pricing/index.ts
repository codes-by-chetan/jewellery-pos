// Pricing Service - Core calculation engine
// All monetary and weight arithmetic uses Decimal.js

import Decimal from 'decimal.js';
import { InvoiceItem, OtherCharge, MakingChargeMethod, WastageMethod, DiscountMethod, RoundingMode } from '../../../shared/types';
import { round, add, subtract, multiply, divide } from '../../../shared/utilities';
import { MONEY_DECIMAL_PLACES, WEIGHT_DECIMAL_PLACES } from '../../../shared/constants';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface PricingInputs {
  grossWeight: Decimal;
  stoneWeight: Decimal;
  metalRate: Decimal;
  makingChargeMethod: MakingChargeMethod;
  makingChargeValue: Decimal;
  makingChargePerGramBase: 'net_weight' | 'gross_weight';
  wastageMethod: WastageMethod;
  wastageValue: Decimal;
  wastageBase: 'metal_value' | 'metal_value_plus_making';
  stoneValue: Decimal;
  otherCharges: OtherCharge[];
  itemDiscountMethod: DiscountMethod;
  itemDiscountValue: Decimal;
}

export interface PricingResult {
  netWeight: Decimal;
  metalValue: Decimal;
  makingChargeAmount: Decimal;
  wastageAmount: Decimal;
  stoneValue: Decimal;
  otherChargesTaxable: Decimal;
  otherChargesNonTaxable: Decimal;
  itemDiscountAmount: Decimal;
  taxableValue: Decimal;
  totalValue: Decimal;
}

export function calculateNetWeight(grossWeight: Decimal, stoneWeight: Decimal): Decimal {
  return round(subtract(grossWeight, stoneWeight), WEIGHT_DECIMAL_PLACES);
}

export function calculateMetalValue(netWeight: Decimal, metalRate: Decimal): Decimal {
  return round(multiply(netWeight, metalRate), MONEY_DECIMAL_PLACES);
}

export function calculateMakingCharge(
  makingChargeMethod: MakingChargeMethod,
  makingChargeValue: Decimal,
  base: Decimal,
  netWeight: Decimal,
  grossWeight: Decimal,
  perGramBase: 'net_weight' | 'gross_weight'
): Decimal {
  switch (makingChargeMethod) {
    case 'FIXED':
      return round(makingChargeValue, MONEY_DECIMAL_PLACES);
    case 'PER_GRAM':
      const weightBase = perGramBase === 'net_weight' ? netWeight : grossWeight;
      return round(multiply(weightBase, makingChargeValue), MONEY_DECIMAL_PLACES);
    case 'PERCENTAGE':
      // Percentage of base (metal value)
      return round(multiply(base, divide(makingChargeValue, 100)), MONEY_DECIMAL_PLACES);
    default:
      return new Decimal(0);
  }
}

export function calculateWastage(
  wastageMethod: WastageMethod,
  wastageValue: Decimal,
  metalValue: Decimal,
  makingChargeAmount: Decimal,
  wastageBase: 'metal_value' | 'metal_value_plus_making'
): Decimal {
  if (wastageMethod === 'NONE') return new Decimal(0);

  const base = wastageBase === 'metal_value_plus_making'
    ? add(metalValue, makingChargeAmount)
    : metalValue;

  switch (wastageMethod) {
    case 'FIXED':
      return round(wastageValue, MONEY_DECIMAL_PLACES);
    case 'PERCENTAGE':
      return round(multiply(base, divide(wastageValue, 100)), MONEY_DECIMAL_PLACES);
    default:
      return new Decimal(0);
  }
}

export function calculateOtherCharges(otherCharges: OtherCharge[]): {
  taxable: Decimal;
  nonTaxable: Decimal;
} {
  let taxable = new Decimal(0);
  let nonTaxable = new Decimal(0);

  for (const charge of otherCharges) {
    const amount = new Decimal(charge.amount);
    if (charge.is_taxable) {
      taxable = add(taxable, amount);
    } else {
      nonTaxable = add(nonTaxable, amount);
    }
  }

  return {
    taxable: round(taxable, MONEY_DECIMAL_PLACES),
    nonTaxable: round(nonTaxable, MONEY_DECIMAL_PLACES),
  };
}

export function calculateItemDiscount(
  discountMethod: DiscountMethod,
  discountValue: Decimal,
  subtotal: Decimal
): Decimal {
  if (discountMethod === 'NONE') return new Decimal(0);

  switch (discountMethod) {
    case 'FIXED':
      return round(Decimal.min(discountValue, subtotal), MONEY_DECIMAL_PLACES);
    case 'PERCENTAGE':
      return round(Decimal.min(multiply(subtotal, divide(discountValue, 100)), subtotal), MONEY_DECIMAL_PLACES);
    default:
      return new Decimal(0);
  }
}

export function calculateItem(inputs: PricingInputs): PricingResult {
  const netWeight = calculateNetWeight(inputs.grossWeight, inputs.stoneWeight);
  const metalValue = calculateMetalValue(netWeight, inputs.metalRate);

  const makingChargeAmount = calculateMakingCharge(
    inputs.makingChargeMethod,
    inputs.makingChargeValue,
    metalValue,
    netWeight,
    inputs.grossWeight,
    inputs.makingChargePerGramBase
  );

  const wastageAmount = calculateWastage(
    inputs.wastageMethod,
    inputs.wastageValue,
    metalValue,
    makingChargeAmount,
    inputs.wastageBase
  );

  const { taxable: otherChargesTaxable, nonTaxable: otherChargesNonTaxable } = calculateOtherCharges(inputs.otherCharges);

  // Subtotal before item discount
  const subtotalBeforeDiscount = add(
    add(add(add(metalValue, makingChargeAmount), wastageAmount), inputs.stoneValue),
    otherChargesTaxable
  );

  const itemDiscountAmount = calculateItemDiscount(
    inputs.itemDiscountMethod,
    inputs.itemDiscountValue,
    subtotalBeforeDiscount
  );

  const taxableValue = round(subtract(subtotalBeforeDiscount, itemDiscountAmount), MONEY_DECIMAL_PLACES);
  const totalValue = round(add(taxableValue, otherChargesNonTaxable), MONEY_DECIMAL_PLACES);

  return {
    netWeight,
    metalValue,
    makingChargeAmount,
    wastageAmount,
    stoneValue: round(inputs.stoneValue, MONEY_DECIMAL_PLACES),
    otherChargesTaxable,
    otherChargesNonTaxable,
    itemDiscountAmount,
    taxableValue,
    totalValue,
  };
}

export function calculateInvoiceTotals(
  items: PricingResult[],
  invoiceDiscountMethod: DiscountMethod,
  invoiceDiscountValue: Decimal,
  roundingMode: RoundingMode
): {
  metalValue: Decimal;
  makingChargeAmount: Decimal;
  wastageAmount: Decimal;
  stoneValue: Decimal;
  otherChargesTaxable: Decimal;
  otherChargesNonTaxable: Decimal;
  discountAmount: Decimal;
  taxableValue: Decimal;
  invoiceDiscountAmount: Decimal;
  finalTaxableValue: Decimal;
} {
  // Sum all items
  const metalValue = items.reduce((sum, i) => add(sum, i.metalValue), new Decimal(0));
  const makingChargeAmount = items.reduce((sum, i) => add(sum, i.makingChargeAmount), new Decimal(0));
  const wastageAmount = items.reduce((sum, i) => add(sum, i.wastageAmount), new Decimal(0));
  const stoneValue = items.reduce((sum, i) => add(sum, i.stoneValue), new Decimal(0));
  const otherChargesTaxable = items.reduce((sum, i) => add(sum, i.otherChargesTaxable), new Decimal(0));
  const otherChargesNonTaxable = items.reduce((sum, i) => add(sum, i.otherChargesNonTaxable), new Decimal(0));
  const discountAmount = items.reduce((sum, i) => add(sum, i.itemDiscountAmount), new Decimal(0));

  const taxableValue = round(
    subtract(
      add(
        add(
          add(
            add(
              add(metalValue, makingChargeAmount),
              wastageAmount
            ),
            stoneValue
          ),
          otherChargesTaxable
        ),
        discountAmount
      ),
      new Decimal(0) // placeholder for invoice discount
    ),
    MONEY_DECIMAL_PLACES
  );

  // Calculate invoice discount
  const invoiceDiscountAmount = invoiceDiscountMethod === 'NONE'
    ? new Decimal(0)
    : invoiceDiscountMethod === 'FIXED'
      ? round(Decimal.min(invoiceDiscountValue, taxableValue), MONEY_DECIMAL_PLACES)
      : round(Decimal.min(multiply(taxableValue, divide(invoiceDiscountValue, 100)), taxableValue), MONEY_DECIMAL_PLACES);

  const finalTaxableValue = round(subtract(taxableValue, invoiceDiscountAmount), MONEY_DECIMAL_PLACES);

  return {
    metalValue,
    makingChargeAmount,
    wastageAmount,
    stoneValue,
    otherChargesTaxable,
    otherChargesNonTaxable,
    discountAmount,
    taxableValue,
    invoiceDiscountAmount,
    finalTaxableValue,
  };
}

/**
 * Per-item rounding: round each line item's taxable value and tax
 */
export function roundPerItem(value: Decimal): Decimal {
  return round(value, MONEY_DECIMAL_PLACES);
}

/**
 * Aggregate rounding: no intermediate rounding, only final
 */
export function roundAggregate(value: Decimal): Decimal {
  return value; // No rounding at this stage
}