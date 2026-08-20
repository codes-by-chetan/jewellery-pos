// Shared utilities

import Decimal from 'decimal.js';

/**
 * Format currency to 2 decimal places with Indian number formatting
 */
export function formatCurrency(amount: number | Decimal, showSymbol = true): string {
  const d = new Decimal(amount);
  const formatted = d.toFixed(2);
  const parts = formatted.split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const result = `${integerPart}.${parts[1]}`;
  return showSymbol ? `₹${result}` : result;
}

/**
 * Format weight to 3 decimal places
 */
export function formatWeight(weight: number | Decimal): string {
  const d = new Decimal(weight);
  return d.toFixed(3);
}

/**
 * Format date as DD/MM/YYYY
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Convert number to Indian numbering system words (English)
 */
function numberToWordsEnglish(num: number): string {
  if (num === 0) return 'Zero';

  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n: number): string {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result.trim();
  }

  let result = '';
  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  if (crores > 0) {
    result += convertHundreds(crores) + ' Crore ';
  }

  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  if (lakhs > 0) {
    result += convertHundreds(lakhs) + ' Lakh ';
  }

  const thousands = Math.floor(num / 1000);
  num %= 1000;
  if (thousands > 0) {
    result += convertHundreds(thousands) + ' Thousand ';
  }

  if (num > 0) {
    result += convertHundreds(num) + ' ';
  }

  return result.trim();
}

/**
 * Convert number to Indian numbering system words (Marathi)
 */
function numberToWordsMarathi(num: number): string {
  if (num === 0) return 'शून्य';

  const ones = ['', 'एक', 'दोन', 'तीन', 'चार', 'पाच', 'सहा', 'सात', 'आठ', 'नऊ'];
  const teens = ['दहा', 'अकरा', 'बारा', 'तेरा', 'चौदा', 'पंधरा', 'शोळा', 'सत्रा', 'अठरा', 'एकोणीस'];
  const tens = ['', '', 'वीस', 'तीस', 'चालीस', 'पन्नास', 'साठ', 'सत्तर', 'ऐंशी', 'नव्वे'];
  const hundreds = 'शंभर';
  const thousands = 'हजार';
  const lakhs = 'लाख';
  const crores = 'कोटी';

  function convertHundreds(n: number): string {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' ' + hundreds + ' ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      result += ones[n] + ' ';
    }
    return result.trim();
  }

  let result = '';
  const cr = Math.floor(num / 10000000);
  num %= 10000000;
  if (cr > 0) {
    result += convertHundreds(cr) + ' ' + crores + ' ';
  }

  const lk = Math.floor(num / 100000);
  num %= 100000;
  if (lk > 0) {
    result += convertHundreds(lk) + ' ' + lakhs + ' ';
  }

  const th = Math.floor(num / 1000);
  num %= 1000;
  if (th > 0) {
    result += convertHundreds(th) + ' ' + thousands + ' ';
  }

  if (num > 0) {
    result += convertHundreds(num) + ' ';
  }

  return result.trim();
}

/**
 * Convert amount to words in specified language
 */
export function amountInWords(amount: number | Decimal, lang: 'EN' | 'MR' | 'BOTH' = 'EN'): string {
  const d = new Decimal(amount);
  const rupees = Math.floor(d.toNumber());
  const paise = Math.round((d.minus(rupees)).times(100).toNumber());

  const rupeeWords = lang === 'MR' ? numberToWordsMarathi(rupees) : numberToWordsEnglish(rupees);
  const paiseWords = paise > 0
    ? (lang === 'MR'
      ? ' आणि ' + numberToWordsMarathi(paise) + ' पैसा'
      : ' and ' + numberToWordsEnglish(paise) + ' Paise')
    : '';

  const suffix = lang === 'MR' ? ' रुपये मात्र' : ' Only';
  const prefix = lang === 'MR' ? '' : 'Rupees ';

  const result = `${prefix}${rupeeWords}${paiseWords}${suffix}`;

  if (lang === 'BOTH') {
    const en = amountInWords(amount, 'EN');
    const mr = amountInWords(amount, 'MR');
    return `${en}\n${mr}`;
  }

  return result;
}

/**
 * Round to specified decimal places
 */
export function round(value: number | Decimal, places: number): Decimal {
  const d = new Decimal(value);
  return d.toDecimalPlaces(places);
}

/**
 * Safe decimal arithmetic
 */
export function add(...values: (number | Decimal)[]): Decimal {
  return values.reduce((acc, v) => new Decimal(acc).plus(v), new Decimal(0));
}

export function subtract(a: number | Decimal, b: number | Decimal): Decimal {
  return new Decimal(a).minus(b);
}

export function multiply(a: number | Decimal, b: number | Decimal): Decimal {
  return new Decimal(a).times(b);
}

export function divide(a: number | Decimal, b: number | Decimal): Decimal {
  return new Decimal(a).div(b);
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate draft ID (UUID)
 */
export function generateDraftId(): string {
  return generateUUID();
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Deep clone
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}