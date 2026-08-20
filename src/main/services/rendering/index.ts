// Rendering Service - Handlebars template rendering and Electron print/PDF

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import Handlebars from 'handlebars';

export interface InvoiceRenderData {
  invoiceNumber: string;
  invoiceDate: string;
  customer: any;
  items: any[];
  payments: any[];
  totals: any;
  shop: any;
  tax: any;
  rates: any;
  language: string;
}

function getTemplatesDir(): string {
  const userData = app.getPath('userData');
  return path.join(userData, 'templates', 'invoice');
}

function getBundledTemplatesDir(): string {
  return path.join(__dirname, '..', '..', '..', 'templates', 'invoice');
}

function ensureTemplatesDir(): void {
  const dir = getTemplatesDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    copyBundledTemplates();
  }
}

function copyBundledTemplates(): void {
  const srcDir = getBundledTemplatesDir();
  const destDir = getTemplatesDir();

  if (!fs.existsSync(srcDir)) return;

  const files = fs.readdirSync(srcDir);
  for (const file of files) {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  }
}

function loadTemplate(language: string): HandlebarsTemplateDelegate {
  ensureTemplatesDir();

  const templatePath = path.join(getTemplatesDir(), `${language.toLowerCase()}.hbs`);

  if (!fs.existsSync(templatePath)) {
    // Fallback to default template
    const defaultPath = path.join(getTemplatesDir(), 'default.hbs');
    if (fs.existsSync(defaultPath)) {
      return Handlebars.compile(fs.readFileSync(defaultPath, 'utf-8'));
    }
    // Last resort: basic inline template
    return Handlebars.compile(getBasicTemplate());
  }

  return Handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));
}

function getBasicTemplate(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice {{invoiceNumber}}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
    .header { text-align: center; margin-bottom: 20px; }
    .shop-name { font-size: 24px; font-weight: bold; }
    .invoice-title { font-size: 18px; margin: 10px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
    .info-box { border: 1px solid #ddd; padding: 10px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .text-right { text-align: right; }
    .totals { text-align: right; margin-bottom: 20px; }
    .total-row { display: flex; justify-content: space-between; margin: 5px 0; }
    .grand-total { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 5px; }
    .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">{{shop.name}}</div>
    <div>{{shop.address}}, {{shop.city}} - {{shop.pincode}}</div>
    <div>Phone: {{shop.phone}} | Email: {{shop.email}}</div>
    <div>GSTIN: {{shop.gstin}}</div>
    <div class="invoice-title">TAX INVOICE</div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <strong>Invoice No:</strong> {{invoiceNumber}}<br>
      <strong>Date:</strong> {{formatDate invoiceDate}}<br>
      <strong>State:</strong> {{shop.state}} ({{shop.state_code}})
    </div>
    <div class="info-box">
      <strong>Customer:</strong> {{customer.name}}<br>
      <strong>Mobile:</strong> {{customer.mobile}}<br>
      <strong>Address:</strong> {{customer.address}}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Description</th>
        <th>Gross Wt</th>
        <th>Stone Wt</th>
        <th>Net Wt</th>
        <th>Rate/g</th>
        <th>Metal Value</th>
        <th>Making</th>
        <th>Wastage</th>
        <th>Stone</th>
        <th>Other</th>
        <th>Taxable</th>
      </tr>
    </thead>
    <tbody>
      {{#each items}}
      <tr>
        <td>{{line_number}}</td>
        <td>{{product_name_english}}{{#if product_name_marathi}} / {{product_name_marathi}}{{/if}}</td>
        <td class="text-right">{{formatWeight gross_weight}}</td>
        <td class="text-right">{{formatWeight stone_weight}}</td>
        <td class="text-right">{{formatWeight net_weight}}</td>
        <td class="text-right">{{formatCurrency metal_rate}}</td>
        <td class="text-right">{{formatCurrency metal_value}}</td>
        <td class="text-right">{{formatCurrency making_charge_amount}}</td>
        <td class="text-right">{{formatCurrency wastage_amount}}</td>
        <td class="text-right">{{formatCurrency stone_value}}</td>
        <td class="text-right">{{formatCurrency other_charges_taxable}}</td>
        <td class="text-right">{{formatCurrency taxable_value}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row"><span>Metal Value:</span><span>{{formatCurrency totals.metal_value}}</span></div>
    <div class="total-row"><span>Making Charges:</span><span>{{formatCurrency totals.making_charge_amount}}</span></div>
    <div class="total-row"><span>Wastage:</span><span>{{formatCurrency totals.wastage_amount}}</span></div>
    <div class="total-row"><span>Stone Value:</span><span>{{formatCurrency totals.stone_value}}</span></div>
    <div class="total-row"><span>Other Charges:</span><span>{{formatCurrency totals.other_charges_taxable}}</span></div>
    <div class="total-row"><span>Discount:</span><span>{{formatCurrency totals.discount_amount}}</span></div>
    <div class="total-row"><span>Taxable Value:</span><span>{{formatCurrency totals.taxable_value}}</span></div>
    <div class="total-row"><span>CGST ({{tax.cgst_rate}}%):</span><span>{{formatCurrency totals.cgst}}</span></div>
    <div class="total-row"><span>SGST ({{tax.sgst_rate}}%):</span><span>{{formatCurrency totals.sgst}}</span></div>
    <div class="total-row"><span>IGST ({{tax.igst_rate}}%):</span><span>{{formatCurrency totals.igst}}</span></div>
    <div class="total-row grand-total"><span>Grand Total:</span><span>{{formatCurrency totals.grand_total}}</span></div>
    <div class="total-row"><span>Amount in Words:</span><span>{{totals.amount_in_words}}</span></div>
  </div>

  <div class="footer">
    <p>{{shop.invoice_footer}}</p>
    <p>{{shop.terms_conditions}}</p>
    <p>This is a computer generated invoice.</p>
  </div>
</body>
</html>
`;
}

function registerHelpers(): void {
  Handlebars.registerHelper('formatCurrency', (value: number) => {
    if (typeof value !== 'number') return '₹0.00';
    return '₹' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  });

  Handlebars.registerHelper('formatWeight', (value: number) => {
    if (typeof value !== 'number') return '0.000';
    return value.toFixed(3);
  });

  Handlebars.registerHelper('formatDate', (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });
}

registerHelpers();

export async function renderInvoiceToHTML(invoiceId: number, versionNumber: number = 1): Promise<string> {
  const pool = await getPool();

  // Get invoice
  const invoice = await pool.query(sql`SELECT * FROM invoices WHERE id = ${invoiceId}`);
  if (invoice.length === 0) throw new Error('Invoice not found');

  const inv = invoice[0];

  // Get version
  const version = await pool.query(sql`
    SELECT * FROM invoice_versions WHERE invoice_id = ${invoiceId} AND version_number = ${versionNumber}
  `);
  if (version.length === 0) throw new Error('Version not found');

  const ver = version[0];

  // Parse JSON fields
  const customer = JSON.parse(ver.customer_snapshot_json || '{}');
  const items = JSON.parse(ver.items_json || '[]');
  const payments = JSON.parse(ver.payments_json || '[]');
  const totals = JSON.parse(ver.totals_json || '{}');
  const shop = JSON.parse(ver.shop_snapshot_json || '{}');
  const tax = JSON.parse(ver.tax_json || '{}');

  // Load template
  const template = loadTemplate(inv.invoice_language || 'ENGLISH');

  // Render
  const html = template({
    invoiceNumber: inv.invoice_number,
    invoiceDate: inv.invoice_date,
    customer,
    items,
    payments,
    totals,
    shop,
    tax,
    language: inv.invoice_language,
  });

  return html;
}

export async function printInvoice(invoiceId: number, versionNumber: number = 1): Promise<{ success: boolean; error?: string }> {
  try {
    const html = await renderInvoiceToHTML(invoiceId, versionNumber);

    // Create a hidden BrowserWindow for printing
    const { BrowserWindow } = require('electron');
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    // Wait for content to load
    await new Promise<void>((resolve, reject) => {
      printWindow.webContents.once('did-finish-load', () => resolve());
      printWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => reject(new Error(errorDescription)));
      setTimeout(() => reject(new Error('Print window load timeout')), 10000);
    });

    // Print
    printWindow.webContents.print({
      silent: false, // Show print dialog
      printBackground: true,
      margins: { marginType: 'none' },
    });

    // Close window after print dialog
    setTimeout(() => {
      if (!printWindow.isDestroyed()) printWindow.close();
    }, 5000);

    return { success: true };
  } catch (error: any) {
    console.error('Print invoice error:', error);
    return { success: false, error: error.message };
  }
}

export async function printInvoiceToPDF(invoiceId: number, versionNumber: number = 1, outputPath?: string): Promise<{ success: boolean; path?: string; error?: string }> {
  try {
    const html = await renderInvoiceToHTML(invoiceId, versionNumber);

    const { BrowserWindow } = require('electron');
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    await new Promise<void>((resolve, reject) => {
      printWindow.webContents.once('did-finish-load', () => resolve());
      printWindow.webContents.once('did-fail-load', (event, errorCode, errorDescription) => reject(new Error(errorDescription)));
      setTimeout(() => reject(new Error('Print window load timeout')), 10000);
    });

    const pdfPath = outputPath || path.join(app.getPath('userData'), `invoice-${invoiceId}-v${versionNumber}.pdf`);

    const pdfData = await printWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: { marginType: 'none' },
      landscape: false,
    });

    fs.writeFileSync(pdfPath, pdfData);

    if (!printWindow.isDestroyed()) printWindow.close();

    return { success: true, path: pdfPath };
  } catch (error: any) {
    console.error('Print to PDF error:', error);
    return { success: false, error: error.message };
  }
}

export async function printInvoicePreview(invoiceId: number, versionNumber: number = 1): Promise<{ success: boolean; error?: string }> {
  try {
    const html = await renderInvoiceToHTML(invoiceId, versionNumber);

    const { BrowserWindow } = require('electron');
    const previewWindow = new BrowserWindow({
      width: 900,
      height: 700,
      title: `Invoice Preview - ${invoiceId}`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    return { success: true };
  } catch (error: any) {
    console.error('Print preview error:', error);
    return { success: false, error: error.message };
  }
}