// Template Service

import { sql } from '../../database/connection';
import { getPool } from '../../database/connection';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface Template {
  id: number;
  name: string;
  language: 'ENGLISH' | 'MARATHI' | 'BILINGUAL';
  template_content: string;
  is_default: number;
  created_at: string;
  updated_at: string;
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
    // Copy bundled templates on first run
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

export async function getTemplates(language: string): Promise<Template[]> {
  ensureTemplatesDir();

  const pool = await getPool();
  let query = sql`SELECT * FROM invoice_templates WHERE 1=1`;

  if (language) {
    query = sql`${query} AND language = ${language}`;
  }

  query = sql`${query} ORDER BY is_default DESC, name`;

  const result = await pool.query(query);
  return result;
}

export async function saveTemplate(language: string, content: string): Promise<Template> {
  ensureTemplatesDir();

  const pool = await getPool();
  const now = new Date().toISOString();
  const name = `custom-${language.toLowerCase()}-${Date.now()}`;

  const result = await pool.query(sql`
    INSERT INTO invoice_templates (name, language, template_content, is_default, created_at, updated_at)
    VALUES (${name}, ${language}, ${content}, 0, ${now}, ${now})
    RETURNING *
  `);

  // Also save to file system
  const filepath = path.join(getTemplatesDir(), `${language.toLowerCase()}-custom.hbs`);
  fs.writeFileSync(filepath, content);

  return result[0];
}

export async function getDefaultTemplate(language: string): Promise<string> {
  ensureTemplatesDir();

  const pool = await getPool();
  const result = await pool.query(sql`
    SELECT * FROM invoice_templates WHERE language = ${language} AND is_default = 1
  `);

  if (result.length > 0) {
    return result[0].template_content;
  }

  // Fallback to file system
  const filepath = path.join(getTemplatesDir(), `${language.toLowerCase()}.hbs`);
  if (fs.existsSync(filepath)) {
    return fs.readFileSync(filepath, 'utf-8');
  }

  // Return basic default template
  return getBasicTemplate(language);
}

function getBasicTemplate(language: string): string {
  const templates: Record<string, string> = {
    ENGLISH: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: sans-serif; font-size: 12px; }
    .header { text-align: center; margin-bottom: 20px; }
    .section { margin-bottom: 15px; border: 1px solid #333; }
    .section-header { background: #333; color: white; padding: 5px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
    th { background: #f0f0f0; }
    .totals { text-align: right; margin-top: 20px; }
    .footer { margin-top: 30px; font-size: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{shop.name}}</h1>
    <p>{{shop.address}}</p>
    <p>GSTIN: {{shop.gstin}}</p>
  </div>
  <div class="section">
    <div class="section-header">TAX INVOICE</div>
    <p>Invoice No: {{invoice.number}} / V{{invoice.version}}</p>
    <p>Date: {{invoice.date}}</p>
    <p>Customer: {{customer.name}}</p>
  </div>
  <table>
    <thead>
      <tr><th>Item</th><th>Metal</th><th>Purity</th><th>Gross Wt</th><th>Stone Wt</th><th>Net Wt</th><th>Rate</th><th>Amount</th></tr>
    </thead>
    <tbody>
      {{#each invoice.items}}
      <tr>
        <td>{{product_name_english}}</td>
        <td>{{metal_name}}</td>
        <td>{{purity_name}}</td>
        <td>{{gross_weight}}g</td>
        <td>{{stone_weight}}g</td>
        <td>{{net_weight}}g</td>
        <td>₹{{metal_rate}}/g</td>
        <td>₹{{total_value}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <div class="totals">
    <p>Grand Total: ₹{{invoice.totals.grand_total}}</p>
    <p>{{invoice.totals.amount_in_words}}</p>
  </div>
</body>
</html>`,
    MARATHI: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>कर बिल</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 12px; }
    .header { text-align: center; margin-bottom: 20px; }
    .section { margin-bottom: 15px; border: 1px solid #333; }
    .section-header { background: #333; color: white; padding: 5px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
    th { background: #f0f0f0; }
    .totals { text-align: right; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{shop.name}}</h1>
    <p>{{shop.address}}</p>
    <p>GSTIN: {{shop.gstin}}</p>
  </div>
  <div class="section">
    <div class="section-header">कर बिल</div>
    <p>बिल क्रमांक: {{invoice.number}} / V{{invoice.version}}</p>
    <p>दिनांक: {{invoice.date}}</p>
    <p>ग्राहक: {{customer.name}}</p>
  </div>
  <table>
    <thead>
      <tr><th>वस्तू</th><th>धातू</th><th>शुद्धता</th><th>एकूण वजन</th><th>स्टोन वजन</th><th>नेट वजन</th><th>दर</th><th>रक्कम</th></tr>
    </thead>
    <tbody>
      {{#each invoice.items}}
      <tr>
        <td>{{product_name_marathi}}</td>
        <td>{{metal_name}}</td>
        <td>{{purity_name}}</td>
        <td>{{gross_weight}}g</td>
        <td>{{stone_weight}}g</td>
        <td>{{net_weight}}g</td>
        <td>₹{{metal_rate}}/g</td>
        <td>₹{{total_value}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <div class="totals">
    <p>एकूण: ₹{{invoice.totals.grand_total}}</p>
    <p>{{invoice.totals.amount_in_words}}</p>
  </div>
</body>
</html>`,
    BILINGUAL: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice / कर बिल</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body { font-family: 'Noto Sans Devanagari', sans-serif; font-size: 12px; }
    .header { text-align: center; margin-bottom: 20px; }
    .section { margin-bottom: 15px; border: 1px solid #333; }
    .section-header { background: #333; color: white; padding: 5px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 5px; text-align: left; }
    th { background: #f0f0f0; }
    .totals { text-align: right; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{shop.name}}</h1>
    <p>{{shop.address}}</p>
    <p>GSTIN: {{shop.gstin}}</p>
  </div>
  <div class="section">
    <div class="section-header">TAX INVOICE / कर बिल</div>
    <p>Invoice No: {{invoice.number}} / V{{invoice.version}} | बिल क्रमांक: {{invoice.number}} / V{{invoice.version}}</p>
    <p>Date: {{invoice.date}} | दिनांक: {{invoice.date}}</p>
    <p>Customer: {{customer.name}} | ग्राहक: {{customer.name}}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Item / वस्तू</th>
        <th>Metal / धातू</th>
        <th>Purity / शुद्धता</th>
        <th>Gross Wt / एकूण वजन</th>
        <th>Stone Wt / स्टोन वजन</th>
        <th>Net Wt / नेट वजन</th>
        <th>Rate / दर</th>
        <th>Amount / रक्कम</th>
      </tr>
    </thead>
    <tbody>
      {{#each invoice.items}}
      <tr>
        <td>{{product_name_english}} / {{product_name_marathi}}</td>
        <td>{{metal_name}}</td>
        <td>{{purity_name}}</td>
        <td>{{gross_weight}}g</td>
        <td>{{stone_weight}}g</td>
        <td>{{net_weight}}g</td>
        <td>₹{{metal_rate}}/g</td>
        <td>₹{{total_value}}</td>
      </tr>
      {{/each}}
    </tbody>
  </table>
  <div class="totals">
    <p>Grand Total: ₹{{invoice.totals.grand_total}} | एकूण: ₹{{invoice.totals.grand_total}}</p>
    <p>{{invoice.totals.amount_in_words}}</p>
  </div>
</body>
</html>`,
  };

  return templates[language] || templates.ENGLISH;
}