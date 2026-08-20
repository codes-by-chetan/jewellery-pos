# Jewellery Billing Application — Product & Technical Plan

## 1. Overview

Build a Windows desktop jewellery billing application using:

- **React** — application UI
- **Electron** — desktop shell and native OS integration
- **SQLite** — local database
- **TypeScript** — primary language
- **Handlebars** — invoice template rendering
- **Electron/Chromium printing** — A4 print and PDF generation

The first client is **Kalashree Jewellers**, but the application must be reusable for other jewellery shops.

The initial product is a **billing and invoice-management system**, not an inventory-management system.

The application must focus on:

- Accurate jewellery price calculation
- Fast bill creation
- Customer management
- Product presets
- Gold/silver/other metal rate management
- Tax calculation
- English/Marathi billing
- Printing and PDF generation
- User authentication
- Admin controls
- Sales history
- Immutable invoice versioning
- Version comparison and audit history
- Local backup and restore

Inventory, barcode, purchasing, old-gold exchange (मोड़), cloud synchronization, and advanced reporting are future extensions.

---

# 2. Technology Stack

## Required

```text
React
Electron
TypeScript
SQLite
Handlebars
Vite
Electron Builder
```

Recommended supporting libraries:

```text
@databases/sqlite
Zod
decimal.js
```

`decimal.js` is used inside the `PricingService`/`TaxService` for all monetary and weight arithmetic.

`Puppeteer` / `Playwright` are **not** used. Electron's own Chromium (`BrowserWindow` + `webContents.print()` / `webContents.printToPDF()`) provides print preview, A4 printing, and PDF generation natively — bundling a second Chromium would only bloat the installer and complicate native-module rebuilds.

Use TypeScript throughout the application.

Use SQLite as the source of truth for local application data.

The database must be stored in Electron's user-data directory, not beside the installed executable.

---

# 2a. Project Setup — CLI Commands

Use **electron-forge** for scaffolding and build configuration (handles native modules, webpack/vite, packaging automatically).

```bash
# 1. Create project with electron-forge (includes React + TypeScript + Vite template)
npx create-electron-app@latest jewellery-pos --template=vite-typescript

cd jewellery-pos

# 2. Install core dependencies
npm install react react-dom react-router-dom
npm install @databases/sqlite decimal.js zod handlebars
npm install -D @types/react @types/react-dom @types/node

# 3. Install Electron tooling
npm install -D electron-builder electron-rebuild @electron-forge/cli @electron-forge/plugin-vite @electron-forge/maker-squirrel

# 4. Configure @databases/sqlite (no native build needed - uses better-sqlite3 under the hood but with async API)
# No rebuild step required unlike better-sqlite3 directly

# 5. Development
npm start          # Runs both Vite dev server and Electron

# 6. Build for production
npm run make       # Creates Windows installer in ./out/make/
```

**Why @databases/sqlite over better-sqlite3 directly:**
- Same performance (uses better-sqlite3 internally)
- Promise-based async API fits React/Electron IPC patterns better
- No manual `electron-rebuild` needed - works out of the box on Windows
- TypeScript-first with excellent type inference
- Connection pooling built-in

---

# 3. Application Architecture

The application is a self-contained desktop application.

```text
┌────────────────────────────────────────────┐
│              Electron Desktop App          │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │            React Renderer            │  │
│  │                                      │  │
│  │ Dashboard                            │  │
│  │ New Bill                             │  │
│  │ Customers                            │  │
│  │ Product Presets                      │  │
│  │ Rates                                │  │
│  │ Sales History                        │  │
│  │ Settings                             │  │
│  │ Admin                                │  │
│  └──────────────────────────────────────┘  │
│                    │                       │
│              Electron IPC                  │
│                    │                       │
│  ┌──────────────────────────────────────┐  │
│  │          Electron Main Process       │  │
│  │                                      │  │
│  │ Authentication                       │  │
│  │ Database Access                      │  │
│  │ Pricing Engine                       │  │
│  │ Tax Engine                           │  │
│  │ Invoice Engine                       │  │
│  │ Versioning Engine                    │  │
│  │ Template Engine                      │  │
│  │ Print/PDF Service                    │  │
│  │ Backup Service (Local + Cloud)       │  │
│  │   ├─ Local Backup/Restore            │  │
│  │   ├─ Cloud Provider Abstraction      │  │
│  │   │  ├─ Google Drive Provider        │  │
│  │   │  └─ GitHub Provider              │  │
│  │   ├─ Scheduler (interval, daily,     │  │
│  │   │     app-close, on-DB-write)      │  │
│  │   ├─ Encryption (optional AES-256)   │  │
│  │   └─ Retention Policy                │  │
│  └──────────────────────────────────────┘  │
│                    │                       │
│                SQLite DB                   │
└────────────────────────────────────────────┘
```

The React renderer must never directly access SQLite.

Use Electron `preload` and `contextBridge` for communication.

Do not enable unrestricted Node access in the renderer.

---

# 3a. Cloud Backup Architecture (Detail)

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│  Backup Service │────▶│ Provider Adapter │────▶│ Google Drive   │
│  (Main Process) │     │  (Interface)     │     │   API v3       │
└────────┬────────┘     └────────┬─────────┘     └────────────────┘
         │                       │
         │     ┌─────────────────┴─────────────────┐
         │     │        Scheduler                  │
         │     │  • Interval (configurable hours)  │
         │     │  • Daily (configurable HH:MM)     │
         │     │  • App Close (before-quit)        │
         │     │  • DB Write (debounced 5s)        │
         │     └─────────────────┬─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  Encryption     │     │  Retention       │
│  (Optional)     │     │  (Count-based)   │
│  AES-256-GCM    │     │  Default: 30     │
└─────────────────┘     └──────────────────┘
```

The React renderer must never directly access SQLite.

Use Electron `preload` and `contextBridge` for communication.

Do not enable unrestricted Node access in the renderer.

---

# 4. First-Launch Setup

On first application launch, check whether an administrator exists.

If no administrator exists, display:

```text
Create Administrator

Name
Username
Password
Confirm Password

[ Create Administrator ]
```

After successful setup, redirect to login.

Passwords must never be stored in plain text.

Use **bcryptjs** (pure JS, no native deps) for password hashing. Salt rounds = 12.

---

### Authentication Token Strategy (Confirmed Decision)

- **Access token**: JWT, TTL 15 minutes, signed with app secret (stored in `app_settings`)
- **Refresh token**: random 64-char string, stored **hashed** (bcryptjs) in `user_sessions` table, TTL 7 days
- On access token expiry: renderer calls `/auth/refresh`, main process validates refresh token hash, issues new access token
- Refresh token rotates on each use (old hash invalidated)
- Logout: delete refresh token from `user_sessions`
- Session table:

```text
user_sessions
  id              (PK)
  user_id         (FK users.id)
  refresh_token_hash
  expires_at
  created_at
  last_used_at
  ip_address      (optional, localhost for desktop)
```

---

# 5. Login System

Every application user must authenticate.

Login screen:

```text
Username
Password

[ Login ]
```

Minimum roles:

```text
ADMIN
USER
```

Design the permissions system so additional roles/permissions can be introduced later.

---

# 6. User Management

Admins can:

- Create users
- Disable/enable users
- Change user roles
- Reset passwords
- View user activity
- View sales associated with a user

User record:

```text
id
name
username
password_hash
role
active
created_at
updated_at
last_login_at
```

Do not delete user records if they have historical activity. Prefer disabling users.

---

# 7. Permissions

Use permission-based authorization rather than hardcoded role checks.

Initial permissions:

```text
CREATE_BILL
EDIT_BILL
VIEW_SALES
VIEW_INVOICE_HISTORY
PRINT_INVOICE
MANAGE_CUSTOMERS
MANAGE_PRODUCT_PRESETS
MANAGE_RATES
MANAGE_TAX_SETTINGS
MANAGE_USERS
VIEW_SALES_REPORT
VIEW_AUDIT_LOG
BACKUP_DATABASE
RESTORE_DATABASE
MANAGE_SHOP_SETTINGS
```

The ADMIN role receives all permissions by default.

The USER role receives the normal billing permissions.

---

# 8. Dashboard

Create a simple dashboard showing:

```text
Today's Bills
Today's Sales
Draft Bills
Current Gold Rates
Current Silver Rates
Recent Invoices
```

Quick actions:

```text
New Bill
Customers
Rates
Sales History
```

Do not overbuild analytics in the first version.

---

# 9. Shop Configuration

Admin settings:

```text
Shop Name
Address
City
State
Pincode
Phone
Email
GSTIN
PAN
State Code
Logo
Invoice Footer
Terms & Conditions
Rounding Mode               (PER_ITEM | AGGREGATE, default: PER_ITEM)
```

Support a custom shop logo.

If the shop has no logo, use the **generated generic SVG emblem** (simple gold ring design) converted to PNG at build time as the default.

**Runtime location: `userData` directory.** Logos are stored in Electron's `userData` folder (e.g., `%APPDATA%/jewellery-pos/logos/`), **not** beside the installed executable.

**Logo versioning for historical invoices:**
- Each logo upload creates a versioned file: `logo-v1.png`, `logo-v2.png`, etc.
- Invoice version snapshot stores the logo filename used (e.g., `logo-v3.png`)
- Old invoices always render with the logo version active at their creation
- User can change logo anytime in Settings → Shop Configuration

This ensures:
- Backups include all logo versions (§47).
- Updates/reinstalls don't lose custom logos.
- Per-user isolation on shared machines.
- Historical invoice fidelity preserved.

---

# 10. Metal Management

Support multiple metals.

Initial examples:

```text
Gold
Silver
```

Design the model so more metals can be added later.

Metal record:

```text
id
name
code
active
created_at
updated_at
```

---

# 11. Purity Management

Purities must be configurable per metal.

Examples:

```text
Gold
24K
22K
18K

Silver
999
925
```

Purity record:

```text
id
metal_id
name
code
percentage
active
created_at
updated_at
```

---

# 12. Rate Management

Create a dedicated **Rates** page.

The user can update rates whenever the shop changes them.

Example:

| Metal | Purity | Rate / Gram |
|---|---|---:|
| Gold | 24K | ₹7,700 |
| Gold | 22K | ₹7,135 |
| Gold | 18K | ₹5,850 |
| Silver | 999 | ₹105 |
| Silver | 925 | ₹98 |

Provide:

```text
Current Rates
Rate History
```

Do not simply overwrite rate history.

Every invoice/version must store the exact rate used.

Changing today's rate must never change an older invoice.

---

# 13. Rate History

Record:

```text
metal_id
purity_id
rate_per_gram
effective_date
created_by
created_at
```

---

# 14. Tax Configuration

Tax rates must be configurable.

Initial support:

```text
CGST
SGST
IGST
```

Example defaults:

```text
CGST: 1.5%
SGST: 1.5%
IGST: 3%
```

Do not hardcode these inside calculation formulas.

Store tax rates used on every invoice/version.

Changing tax settings later must not modify historical invoices.

### Tax Type Selection (Confirmed Decision)

Each invoice stores a data-driven `tax_type` field.

```text
CGST_SGST    (default for the MVP — intra-state sales)
IGST
```

- The invoice's `tax_type` drives whether CGST+SGST or IGST is applied.
- **Default: `CGST_SGST`** for all local sales.
- **Skip the state-code auto-detect logic in the MVP.** The `TaxService` decides purely from the stored `tax_type`, so `IGST` can be added later as a per-invoice choice without reworking the engine.
- The `TaxService` interface is designed so the CGST/SGST vs IGST decision is data-driven, not hardcoded.

### Default Tax Rates (Confirmed Decision)

```text
CGST: 1.5%
SGST: 1.5%
IGST: 3%
```
Standard for gold/silver jewellery in most Indian states. Configurable in shop settings.

---

# 15. Customer Management

Customer fields:

```text
Name              REQUIRED
Mobile            optional
Address           optional
Birth Date        optional
```

Birth date is for internal use only.

It must:

- be saved
- be searchable/filterable
- be available for future birthday/reminder features

Birth date must NOT appear on the invoice.

Customer records must be reusable across multiple bills.

---

# 16. Customer Search

Search existing customers using:

```text
Name
Mobile Number
Customer ID
```

When selecting a customer, populate their existing information into the bill.

Creating a bill should not automatically overwrite the customer's master record without explicit user action.

---

# 17. Product Presets

There is intentionally no inventory system in the first version.

A preset is a shortcut for commonly sold jewellery items.

Example:

```text
Gold Ring
Gold Chain
Gold Nose Pin
Silver Chain
Silver Anklet
```

Preset fields:

```text
id
english_name
marathi_name
metal_id
purity_id
hsn_sac                    optional
making_charge_method       optional
making_charge_value        optional
active
created_at
updated_at
```

At least one of:

```text
English Name
Marathi Name
```

must be present.

The optional fields must remain optional.

---

### HSN/SAC Validation at Finalize (Confirmed Decision)

- **Optional on presets and manual items** — user can leave blank
- **On finalize**: if any item lacks HSN/SAC, show a warning toast but **allow finalization**
- Warning message: "Some items are missing HSN/SAC codes. This may affect GST compliance. Continue anyway?"
- Rationale: Some jewellery items may not have standard HSN codes; don't block legitimate sales

---

# 18. Product Name Fallback Rule

If English exists:

```text
English = English Name
```

Otherwise:

```text
English = Marathi Name
```

If Marathi exists:

```text
Marathi = Marathi Name
```

Otherwise:

```text
Marathi = English Name
```

Examples:

Both names:

```text
English: Gold Ring
Marathi: सोन्याची अंगठी
```

Only English:

```text
English: Gold Ring
Marathi: Gold Ring
```

Only Marathi:

```text
English: सोन्याची अंगठी
Marathi: सोन्याची अंगठी
```

Neither:

```text
Reject the preset
```

Validation message:

```text
Please provide an English or Marathi product name.
```

---

# 19. Product Preset Selection

New Bill supports:

### Preset workflow

```text
Select Product Preset
        ↓
Automatically populate:
    Product Name
    Metal
    Purity
    HSN/SAC if configured
    Making charge defaults if configured
```

### Manual workflow

The user may type any product name without having a preset.

Product presets are conveniences, not inventory records.

---

# 20. New Bill

New Bill should contain:

```text
Invoice Number
Invoice Date
Customer
Product Items
Payment
Discount
Tax
```

---

### Payment Methods (Confirmed Decision)

Support an **extensible enum** with custom additions:

```text
CASH
UPI
CARD
BANK_TRANSFER
CUSTOM_1
CUSTOM_2
...
```

- Default methods: `CASH`, `UPI`, `CARD`, `BANK_TRANSFER`
- Admin can add custom payment methods in Settings → Payment Methods
- Each payment record stores: `method`, `amount`, `reference_number`, `date`, `notes`
- Support partial payments (multiple payment records per invoice)
- `payments` table stores all payment entries linked to invoice version

The user can add multiple products.

Example:

```text
Item 1
Gold Ring

Item 2
Gold Nose Pin

Item 3
Silver Chain
```

---

# 21. Invoice Item Fields

Each item should support:

```text
Product Name - English
Product Name - Marathi
Metal
Purity
HSN/SAC
Gross Weight
Stone Weight
Net Weight
Metal Rate
Metal Value
Making Charge Method
Making Charge Value
Making Charge Amount
Wastage
Stone Value
Other Charge
Discount
Taxable Value
Total Value
```

Not every field needs to be visible at all times. Advanced fields may be collapsible.

---

# 22. Weight Calculation

Default:

```text
net_weight = gross_weight - stone_weight
```

Validation:

```text
gross_weight >= 0
stone_weight >= 0
stone_weight <= gross_weight
net_weight >= 0
```

Recommended precision:

```text
Weight: 3 decimal places
Money: 2 decimal places
Rate: 2 decimal places
```

**Use `decimal.js` for all weight and monetary arithmetic** in the `PricingService`/`TaxService`. Store computed values as `Decimal` (not floats) and round only at presentation boundaries. This avoids floating-point drift across rate × weight × quantity chains.

---

# 23. Metal Value

Default:

```text
metal_value = net_weight × metal_rate
```

Centralize rounding rules in the pricing service.

---

# 24. Making Charges

Support:

```text
FIXED
PER_GRAM
PERCENTAGE
```

**PERCENTAGE base: Metal Value only** (net_weight × rate). Confirmed decision.

**PER_GRAM base: Net weight by default. Configurable per preset** — add `making_charge_per_gram_base` field to `product_presets` (values: 'net_weight' | 'gross_weight').

A product preset may provide a default method/value.

The user can override it for a specific invoice item.

The invoice stores the actual method/value used.

---

# 25. Wastage

Support:

```text
NONE
PERCENTAGE
FIXED
```

**PERCENTAGE base: Metal Value only** (net_weight × rate) by default. **Configurable per preset** — add `wastage_base` field to `product_presets` (values: 'metal_value' | 'metal_value_plus_making').

Keep the exact business calculation inside the pricing engine so it can change without modifying the UI.

---

# 26. Stone Charges

Support at minimum:

```text
Stone Value
```

Future options:

```text
Stone Weight
Stone Quantity
Stone Rate
Diamond Details
```

Do not implement a gemstone inventory system in the MVP.

---

# 27. Other Charges

Support a generic:

```text
Other Charges
```

field for future client-specific charges.

**Taxable configurable per charge** — each "Other Charge" entry includes `is_taxable` boolean (default: true). When true, added to taxable value before tax; when false, added after tax as separate line item.

---

# 28. Discount

Support:

```text
FIXED
PERCENTAGE
```

Ensure discounts cannot create invalid negative values (line totals and invoice taxable value must remain ≥ 0).

### Discount Precedence & Tax Base (Confirmed Decision)

**All discounts reduce the taxable base.** Tax (CGST/SGST/IGST) is calculated on the **post-discount** taxable value.

Flow (from §31):

```
Item Discount → Item Total → Aggregate Items → Invoice Discount → Taxable Value → CGST/SGST/IGST → Grand Total
```

Both item-level and invoice-level discounts are subtracted **before** tax is applied. This is the standard GST-compliant approach and keeps the invoice legally clean.

---

### Rounding Configuration (Confirmed Decision)

Support two rounding modes, configurable in tax settings:

```text
PER_ITEM        (default — GST standard)
AGGREGATE
```

**Per-item rounding (PER_ITEM):**
- Each line item's taxable value rounded to 2dp
- Each line item's CGST/SGST/IGST rounded to 2dp
- Grand total = sum of rounded line totals + sum of rounded taxes

**Aggregate rounding (AGGREGATE):**
- Sum all items with full precision (Decimal)
- Calculate tax on aggregate taxable value
- Round only final CGST/SGST/IGST and grand total to 2dp

Store `rounding_mode` on each invoice version so historical invoices retain their calculation method.

---

# 29. Pricing Engine

Create one authoritative:

```text
PricingService
```

It handles:

```text
Weight
Metal Value
Making Charges
Wastage
Stone Charges
Other Charges
Discount
Taxable Value
```

Do not duplicate billing formulas between React, printing, or templates.

---

# 30. Tax Engine

Create:

```text
TaxService
```

It calculates:

```text
CGST
SGST
IGST
```

The invoice/version stores:

```text
Tax Rate
Tax Amount
```

---

# 31. Invoice Calculation Flow

```text
User Input
    ↓
Validation
    ↓
Net Weight
    ↓
Metal Rate
    ↓
Metal Value
    ↓
Wastage
    ↓
Making Charges
    ↓
Stone Charges
    ↓
Other Charges
    ↓
Item Discount
    ↓
Item Total
    ↓
Aggregate Items
    ↓
Invoice Discount
    ↓
Taxable Value
    ↓
CGST / SGST / IGST
    ↓
Grand Total
    ↓
Amount in Words
```

Preview and finalization must use the same calculation engine.

---

### Amount in Words — Language Support (Confirmed Decision)

Support configurable language per invoice language mode:

| Invoice Language | Amount in Words Language |
|------------------|--------------------------|
| ENGLISH          | English                  |
| MARATHI          | Marathi                  |
| BILINGUAL        | Both (English first, then Marathi on new line) |

Format (Indian numbering — lakhs/crores):
- English: "Rupees Seven Lakh Fifty Thousand Only"
- Marathi: "सात लाख पचास हजार रुपये मात्र"

Store `amount_in_words_language` on invoice version snapshot.

---

# 32. Invoice Numbering

Finalized invoices require unique invoice numbers with a year-month prefix.

Format:

```text
2025-08-0001
2025-08-0002
2025-08-0003
```

Pattern: `yyyy-mm-{sequential}` — e.g., `2025-08-0001`.

- The sequential counter **resets each month** (based on invoice date).
- Invoice number allocation must be transaction-safe (DB-level `SELECT MAX ... FOR UPDATE` or equivalent).
- Do not generate final numbers independently in the UI.
- **Overflow**: after 9999, continues to 10000 (5+ digits) — no hard limit.

### Invoice Statuses (Confirmed Decision)

```text
draft
finalized
cancelled
returned
```

- `draft` — work in progress, no invoice number allocated
- `finalized` — completed sale, has invoice number, immutable (versioned on edit)
- `cancelled` — voided after finalization, retained for audit, no financial impact
- `returned` — credit note / return, links to original invoice, negative quantities allowed

### Draft Bills

- Drafts are stored **separately** in a `draft_bills` table (or `invoices` with `status = 'draft'`).
- Drafts do **not** consume an invoice number.
- Drafts carry a temporary `draft_id` (UUID) for editing/resumption.
- On finalization, the next invoice number is allocated atomically and the draft is converted → `invoices` + `invoice_versions` (V1).

---

# 33. Invoice Versioning

Finalized invoices are immutable.

Editing a finalized invoice creates a new version.

Example:

```text
Invoice 799

Version 1
Version 2
Version 3
```

Invoice number stays:

```text
799
```

Version changes:

```text
799 / V1
799 / V2
799 / V3
```

The latest version is the current version.

---

# 34. Version Snapshot Model

Every version stores a complete snapshot:

```text
Invoice
│
├── Version 1
│   ├── Customer Snapshot
│   ├── Items
│   ├── Rates
│   ├── Tax
│   ├── Payment
│   └── Totals
│
├── Version 2
│   ├── Customer Snapshot
│   ├── Items
│   ├── Rates
│   ├── Tax
│   ├── Payment
│   └── Totals
│
└── Version 3
    ├── Customer Snapshot
    ├── Items
    ├── Rates
    ├── Tax
    ├── Payment
    └── Totals
```

This is preferable to storing only changed fields.

---

# 35. Invoice Edit Workflow

```text
Sales History
    ↓
Open Invoice
    ↓
Edit
    ↓
Load latest version
    ↓
Make changes
    ↓
Require reason
    ↓
Recalculate
    ↓
Create new version
```

Never overwrite an old version.

If V2 is latest, create V3.

---

# 36. Update Reason

Editing an existing invoice requires:

```text
Reason for Update *
```

Examples:

```text
Customer address correction
Wrong weight entered
Making charge correction
Product name correction
Tax correction
Customer mobile number correction
```

Store:

```text
reason
created_by
created_at
```

Reject the version save if reason is empty.

---

# 37. Version Compare Mode

Support:

```text
Compare Version 1 → Version 2
```

Display field-level differences.

Example:

| Field | Version 1 | Version 2 |
|---|---|---|
| Customer Name | Manoj Shinde | Manoj Shinde |
| Mobile | 9876543210 | 9876500000 |
| Gross Weight | 2.800g | 2.900g |
| Gold Rate | ₹7,135 | ₹7,135 |
| Making Charges | ₹3,200 | ₹3,500 |
| Grand Total | ₹37,349 | ₹38,012 |

Also display:

```text
Changed By
Changed At
Reason
```

Provide:

```text
All Fields
Changed Only
```

Highlight changed values.

---

# 38. Sales History

Every user can access Sales History.

Columns:

```text
Invoice No.
Latest Version
Date
Customer
Mobile
Created/Updated By
Grand Total
Status
```

Filters:

```text
Search
Date From
Date To
Customer Filter
User Filter
Status Filter
```

Actions:

```text
View
Edit
Versions
Compare
Print
PDF
```

Never physically delete finalized invoices.

---

# 39. Audit Log

Audit important actions:

```text
User Login
User Logout
Invoice Created
Invoice Version Created
Invoice Printed
Invoice PDF Generated
Customer Created
Rate Changed
Tax Setting Changed
Product Preset Changed
User Created
User Disabled
Backup Created
Backup Restored
```

Audit entry:

```text
id
user_id
action
entity_type
entity_id
description
created_at
```

Never log passwords.

### Audit Log Retention (Confirmed Decision)

- Audit logs never auto-deleted (legal requirement)
- **Soft cap: warn admin at 1,000,000 rows**
- On warning: show toast + admin notification
- Provide **"Purge Old Logs"** UI in Admin → Audit: select date range, confirm deletion
- Export to CSV before purge (recommended)
- Retention policy: user-controlled, not automatic

---

# 40. Historical Snapshot Rules

Every finalized invoice version retains:

```text
Shop Information
Customer Information used on invoice
Product Names
Metal
Purity
HSN/SAC
Metal Rate
Weights
Making Charges
Wastage
Stone Charges
Other Charges
Discount
Tax Rates
Tax Amounts
Payment Information
Grand Total
Amount in Words
```

Changing current shop settings, customer records, product presets, rates, or tax settings must not alter historical versions.

---

# 41. English / Marathi / Bilingual Billing

Support:

```text
ENGLISH
MARATHI
BILINGUAL
```

All modes use the same invoice data.

Birth date and other internal-only data must never appear on the invoice.

Product name fallback rules always apply.

---

# 42. Invoice Template

Use the current Kalashree Jewellers HTML bill as the default design reference.

Preserve:

- A4 portrait
- Dark charcoal section headers
- Light grey table headers
- Consistent closed borders
- Compact generic gold emblem
- Shop details
- Invoice details
- Customer details
- Multiple-item jewellery table
- Purity and weights
- Rate
- Making charges
- Stone value
- Tax calculations
- Amount in words
- Grand total
- Payment details
- Terms
- Signatures

The default generic jewellery emblem is used when a shop has no logo.

**Runtime location: `userData` directory.** The Handlebars template files (`jewellery-tax-invoice.hbs`, plus English/Marathi/Bilingual variants) are copied from the app's bundled resources into `userData/templates/invoice/` on first run. This allows:
- Backups to include the exact template used (§47).
- Future template customization per shop without app updates.
- Updates/reinstalls don't lose custom templates.

---

# 43. Handlebars

Separate calculations from presentation.

Handlebars receives already-calculated values.

Examples:

```handlebars
{{invoice.number}}
{{invoice.version}}
{{customer.name}}
{{item.metal}}
{{item.purity}}
{{item.grossWeight}}
{{item.netWeight}}
{{item.metalRate}}
{{item.metalValue}}
{{item.makingChargeAmount}}
{{invoice.totals.grandTotal}}
```

Items:

```handlebars
{{#each invoice.items}}
...
{{/each}}
```

Do not hardcode item count.

---

# 44. Template Helpers

Presentation-only helpers:

```text
formatCurrency
formatWeight
formatDate
amountInWords
```

Do not place financial formulas in Handlebars helpers.

---

# 45. Printing and PDF

Support:

```text
Print Preview
Print
Save PDF
```

Invoice size:

```text
A4 portrait
```

Use:

```css
@page {
    size: A4 portrait;
    margin: 0;
}

-webkit-print-color-adjust: exact;
print-color-adjust: exact;
```

Electron/Chromium printing must enable backgrounds where supported.

---

# 46. Rendering Pipeline

```text
Invoice Version
        ↓
Build Template Data
        ↓
Handlebars
        ↓
HTML
        ↓
Electron/Chromium
        ↓
A4 Print Preview
        ↓
Printer / PDF
```

The same invoice version must produce the same financial values for preview, print, and PDF.

---

# 47. Backup and Restore

Backup must include:

```text
SQLite database
Invoice templates (from userData)
Shop configuration
Logos (from userData)
Required application configuration
```

Example filename:

```text
jewellery-backup-YYYY-MM-DD-HHmm.zip
```

### Schema-Version Stamp (Confirmed Decision)

- The database stores a `schema_version` value (e.g., `5` corresponding to the latest migration `005_...`).
- This value is written by the migration runner on every successful migration.
- On application start, the app reads `schema_version` and **refuses to open** if it doesn't match the code's expected version — user must run migrations (or the app auto-runs them) before proceeding.
- On **restore**, the backup zip **must include the schema_version** (stored in a `manifest.json` inside the zip). The restore process:
  1. Creates automatic safety backup of current DB.
  2. Reads `manifest.json` from the backup zip.
  3. **Compares backup's `schema_version` with the running app's expected version.**
  4. If mismatched → **abort with clear error** ("Backup schema version X does not match application version Y. Restore not allowed.").
  5. If matched → proceed with atomic restore, then reload/restart.

This prevents silent corruption when restoring an old backup into a newer app (or vice versa).

Before restore:

1. Create an automatic safety backup.
2. Validate the backup (checksum, manifest, schema_version match).
3. Ask for confirmation.
4. Restore atomically where possible.
5. Reload/restart the application if required.

---

# 47a. Cloud Backup (Confirmed Decision)

Support **two providers**, user-configurable:

```text
Google Drive    (OAuth2, Drive API v3, app-specific folder)
GitHub          (Personal Access Token, private repo, commit backup zip)
```

**Provider Interface** — clean abstraction so future providers can be added:

```typescript
interface BackupProvider {
  authenticate(config: ProviderConfig): Promise<void>
  upload(filePath: string, fileName: string): Promise<UploadResult>
  list(): Promise<BackupFile[]>
  download(fileId: string, destPath: string): Promise<void>
  delete(fileId: string): Promise<void>
  testConnection(): Promise<boolean>
}
```

### Configuration UI (Settings → Cloud Backup)

| Field | Description |
|-------|-------------|
| Provider | Dropdown: Google Drive / GitHub |
| Enable Auto-Backup | Toggle |
| **Triggers** (all configurable) | |
| • Interval (hours) | e.g., every 4 hours |
| • Daily at HH:MM | e.g., 02:00 |
| • On app close | Graceful shutdown backup |
| • **On every DB write** | Immediate backup after each finalized invoice / version creation / rate change / customer change (debounced 5s) |
| Retention | Keep last N backups (default: 30) |
| Encryption | Optional AES-256-GCM; user sets passphrase on first enable |
| Test Connection | Button to validate credentials |
| Last Backup | Timestamp + status |

### Encryption (Optional)

- If enabled: derive key from user passphrase (PBKDF2, 100k iterations) + **random salt stored in `app_settings`** (non-secret)
- Encrypt zip with AES-256-GCM before upload
- Passphrase **never stored**; derived key cached in memory only during session
- Encrypted filename: `jewellery-backup-YYYY-MM-DD-HHmm.zip.enc`
- Restore prompts for passphrase if backup is encrypted

### Provider Auth Details (Confirmed Decision)

**Google Drive**: Use Electron protocol handler `myapp://auth` as OAuth2 redirect URI. Register `myapp` protocol in `forge.config`. On auth, open browser, user logs in, Drive redirects to `myapp://auth?code=...`, main process captures code, exchanges for tokens.

**GitHub**: Personal Access Token (PAT) with `repo` scope (full private repo access). User pastes PAT in config UI. Tokens stored encrypted in `app_settings` if encryption enabled.

### Scheduler

- Runs in Electron main process (not renderer)
- Uses `node-cron` or `setInterval` + persistent `lastRun` timestamps in `app_settings`
- On-app-close trigger: listen for `before-quit`, run backup synchronously (with timeout)
- On-DB-write trigger: debounced 5 seconds; coalesces multiple rapid writes

### Database Additions

**app_settings** (extend existing):
- `cloud_backup_provider` (TEXT: 'gdrive' | 'github' | null)
- `cloud_backup_config` (JSON: provider-specific config, encrypted at rest if encryption enabled)
- `cloud_backup_triggers` (JSON: { intervalHours?, dailyTime?, onAppClose?, onDbWrite? })
- `cloud_backup_retention_count` (INTEGER, default 30)
- `cloud_backup_encryption_enabled` (BOOLEAN, default false)
- `cloud_backup_last_run` (DATETIME)
- `cloud_backup_last_status` (TEXT: 'success' | 'failed' | 'pending')

**cloud_backup_logs** (new table):
- `id` (PK)
- `provider` (TEXT)
- `file_name` (TEXT)
- `file_size` (INTEGER)
- `status` (TEXT: 'success' | 'failed')
- `error_message` (TEXT, nullable)
- `trigger` (TEXT: 'interval' | 'daily' | 'app_close' | 'db_write' | 'manual')
- `created_at` (DATETIME)

### Restore from Cloud

- Admin → Backup → "Restore from Cloud"
- Lists cloud backups (newest first) with date, size, trigger
- Download → validate (checksum, manifest, schema_version) → restore (same as local restore flow)
- If encrypted: prompt for passphrase before download

---

# 48. Database Tables

Initial schema:

```text
users
roles
permissions
role_permissions
shops
customers
metals
purities
metal_rates
tax_settings
product_presets
invoices
invoice_versions
invoice_items
payments
audit_logs
invoice_templates
app_settings
payment_methods
cloud_backup_logs
```

Key column additions (confirmed decisions):

**shops**
- `rounding_mode` (TEXT, 'PER_ITEM' | 'AGGREGATE', default 'PER_ITEM')

**invoices**
- `status` (TEXT, 'draft' | 'finalized' | 'cancelled' | 'returned', default 'draft')

**invoice_versions**
- `rounding_mode` (TEXT, copied from shop at finalization)
- `amount_in_words_language` (TEXT, 'EN' | 'MR' | 'BOTH')

**payments**
- `method` (TEXT, references payment_methods.code)
- `amount` (DECIMAL)
- `reference_number` (TEXT, optional)
- `date` (DATETIME)
- `notes` (TEXT, optional)

**payment_methods** (new table)
- `code` (TEXT, PK) — e.g., 'CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'CUSTOM_1'
- `label` (TEXT) — display name
- `is_custom` (BOOLEAN) — true for admin-added methods
- `sort_order` (INTEGER)
- `active` (BOOLEAN)

**product_presets** (additional columns)
- `wastage_base` (TEXT: 'metal_value' | 'metal_value_plus_making', default 'metal_value')
- `making_charge_per_gram_base` (TEXT: 'net_weight' | 'gross_weight', default 'net_weight')

**cloud_backup_logs** (new table)
- `id` (PK)
- `provider` (TEXT: 'gdrive' | 'github')
- `file_name` (TEXT)
- `file_size` (INTEGER)
- `status` (TEXT: 'success' | 'failed')
- `error_message` (TEXT, nullable)
- `trigger` (TEXT: 'interval' | 'daily' | 'app_close' | 'db_write' | 'manual')
- `created_at` (DATETIME)

Use migrations.

Example:

```text
database/migrations/
    001_initial_schema.sql
    002_authentication.sql
    003_rates.sql
    004_product_presets.sql
    005_invoice_versioning.sql
```

Use transactions for:

- Invoice finalization
- Invoice version creation
- Invoice number generation
- User creation
- Restore operations

---

# 49. Security

Electron:

```text
contextIsolation: true
nodeIntegration: false
```

Use preload + `contextBridge`.

The renderer must not directly access:

- filesystem
- SQLite
- shell
- child processes

Only expose narrowly scoped IPC methods.

Validate all IPC inputs.

---

# 50. React Pages

Recommended routes:

```text
/login
/setup/admin
/dashboard
/billing/new
/billing/drafts
/sales
/sales/:invoiceId
/sales/:invoiceId/versions
/sales/:invoiceId/compare
/customers
/products
/rates
/settings
/admin/users
/admin/reports
/admin/audit
/admin/backup
```

---

# 51. Billing UI

Prioritize speed and simple data entry.

Example:

```text
NEW BILL

Customer
[ Search Customer ] [ + New Customer ]

Customer Name
Mobile
Address

------------------------------------------------

ITEMS

[ Select Preset ]
[ Product Name ]

Metal
Purity
Gross Weight
Stone Weight
Net Weight
Current Rate

Making Charge
Wastage
Stone Value
Other Charges
Discount

[ + Add Item ]

------------------------------------------------

Bill Items

Item | Metal | Purity | Net Weight | Rate | Total
------------------------------------------------

TOTALS

Metal Value
Making
Wastage
Stone
Other
Discount
Taxable Amount
CGST
SGST
Grand Total

[ Save Draft ] [ Preview ] [ Finalize ]
```

Support efficient keyboard navigation.

---

# 52. Current Rate Behavior

Selecting:

```text
Metal = Gold
Purity = 22K
```

automatically loads the current rate.

Example:

```text
Current Rate: ₹7,135/g
```

On finalization, the rate becomes part of the invoice version snapshot.

Editing an old invoice initially uses the latest version's stored rate, not today's current rate.

If the user intentionally changes it, record the new value in the new version.

---

# 53. Product Preset Behavior

Selecting a preset should auto-populate:

```text
Name
Metal
Purity
HSN/SAC if configured
Making charge defaults if configured
```

The user can override bill-specific values.

Editing a product preset is a separate operation and must not modify historical invoices.

---

# 54. Inventory Exclusion

Do not implement in the MVP:

```text
Stock quantity
Purchase orders
Warehouse
Stock ledger
Barcode inventory
Automatic stock deduction
```

Product presets are not inventory.

---

# 55. Future Compatibility

Design interfaces so future modules can be added:

```text
Inventory
Barcode
Purchase
Old Gold Exchange / मोड
Customer Ledger
Accounts
Detailed Reports
Cloud Backup
LAN Multi-PC Mode
Multi-Shop
Online Sync
```

Do not implement them unless explicitly requested.

---

# 56. Future Old Gold Exchange / मोड

Keep the pricing model extensible for:

```text
exchange_items
    description
    gross_weight
    stone_weight
    net_weight
    metal
    purity
    applicable_rate
    deductions
    exchange_value
```

Future calculation:

```text
New Jewellery Value
-
Old Gold Exchange Value
=
Net Payable
```

Do not include this workflow in the MVP.

---

# 57. Future LAN Expansion

The MVP is a self-contained desktop application.

Do not force a LAN server into the first version.

Keep service boundaries clean so a future host/client architecture can expose the same business services over a local API.

Potential future structure:

```text
Host Electron App
       │
       ├── SQLite
       ├── Billing Services
       └── LAN API
             │
       ┌─────┴─────┐
       │           │
 Client PC 1   Client PC 2
```

The core billing, calculation, and versioning logic must remain reusable.

---

# 58. Recommended Project Structure

```text
src/
├── main/
│   ├── index.ts
│   ├── database/
│   ├── services/
│   │   ├── auth/
│   │   ├── billing/
│   │   ├── pricing/
│   │   ├── tax/
│   │   ├── customers/
│   │   ├── products/
│   │   ├── rates/
│   │   ├── invoice/
│   │   ├── versioning/
│   │   ├── printing/
│   │   └── backup/
│   └── ipc/
│
├── preload/
│   └── index.ts
│
├── renderer/
│   ├── app/
│   ├── pages/
│   ├── components/
│   ├── features/
│   │   ├── billing/
│   │   ├── customers/
│   │   ├── products/
│   │   ├── rates/
│   │   ├── sales/
│   │   └── admin/
│   ├── hooks/
│   └── services/
│
├── shared/
│   ├── types/
│   ├── schemas/
│   ├── constants/
│   └── utilities/
│
templates/
└── invoice/
    ├── jewellery-tax-invoice.hbs
    ├── english/
    ├── marathi/
    └── bilingual/

assets/
└── logos/
    └── default-jewellery-logo.png

database/
└── migrations/

tests/
├── unit/
├── integration/
└── e2e/
```

---

# 59. Development Phases

## Phase 1 — Foundation

Set up:

```text
Electron
React
Vite
TypeScript
SQLite
Electron Builder
```

Confirm:

- application launches
- secure preload works
- database opens
- migrations run

## Phase 2 — Authentication

Implement:

- Admin first-run setup
- Login
- Roles
- Permissions
- User management

## Phase 3 — Master Data

Implement:

- Metals
- Purities
- Rates
- Tax settings
- Product presets
- Customers

## Phase 4 — Pricing Engine

Implement and test:

- Net weight
- Metal value
- Making
- Wastage
- Stone
- Other charges
- Discounts
- Tax
- Grand total
- Amount in words

## Phase 5 — Billing

Implement:

- New bill
- Multiple products
- Customer selection
- Product presets
- Manual products
- Drafts
- Finalization

## Phase 6 — Invoice Template

Convert the existing HTML design to Handlebars.

Implement:

- English
- Marathi
- Bilingual
- Dynamic item rows

## Phase 7 — Printing

Implement:

- Preview
- A4 printing
- PDF generation
- Printer selection

## Phase 8 — Sales History and Versioning

Implement:

- Sales history
- Invoice versions
- Edit invoice
- Mandatory update reason
- Cancel / Return workflow
- Audit log
- Compare mode
- Keyboard shortcuts (§64.4)
- HSN/SAC warning at finalize (§17)

## Phase 9 — Backup (Local + Cloud)

Implement:

- Local backup / restore
- Safety backup before restore
- **Cloud backup provider abstraction** (Google Drive, GitHub)
- Cloud backup configuration UI
- Auto-backup scheduler (interval, daily, app-close, on-DB-write)
- Retention policy (count-based)
- Optional AES-256-GCM encryption
- Cloud backup logs / history
- Restore from cloud

## Phase 10 — Polish

Improve:

- Keyboard navigation
- Validation
- Error handling
- Empty states
- Loading states
- Performance
- Installer
- Documentation

---

# 60. Testing Requirements

**Testing approach: Manual E2E via UI and use cases** (no automated unit tests).

Use the following as manual test checklists during development and UAT:

Pricing tests:

```text
2.8g × 22K rate
Gross - Stone = Net
Fixed making
Per gram making
Percentage making
Wastage
Stone value
Discount
CGST
SGST
IGST
Multiple items
```

Versioning tests:

```text
Create V1
Edit V1 → create V2
Edit V2 → create V3
V1 unchanged
V2 unchanged
V3 latest
Reason required
Created by recorded
Compare detects changed fields
```

Rounding tests:

```text
PER_ITEM vs AGGREGATE produce different totals for mixed items
PER_ITEM matches GST standard (sum of rounded line taxes)
AGGREGATE matches decimal sum (round only final)
Both modes store rounding_mode on version
```

Cancellation tests:

```text
Finalize → Cancel retains invoice number, status = cancelled
Cancel shows in Sales History with strikethrough
Cancelled invoice cannot be edited
Returned invoice links to original, negative quantities
```

Rate tests:

```text
Old invoice uses old rate
New invoice uses new rate
Editing historical invoice starts from latest version's rate
```

Amount in words tests:

```text
English: 750000 → "Rupees Seven Lakh Fifty Thousand Only"
Marathi: 750000 → "सात लाख पचास हजार रुपये मात्र"
Bilingual: both on separate lines
Zero: "Rupees Zero Only"
Decimal: 750000.50 → "Rupees Seven Lakh Fifty Thousand and Fifty Paise Only"
```

HSN/SAC tests:

```text
Finalize with missing HSN/SAC shows warning toast
Finalize proceeds after confirmation
Finalize with all HSN/SAC shows no warning
```

Authentication tests:

```text
Admin setup
Login
Invalid password
Disabled user
Permission enforcement
```

Cloud backup tests:

```text
Google Drive auth → upload → download → restore
GitHub auth → upload → download → restore
Auto-backup: interval trigger fires
Auto-backup: daily trigger fires at configured time
Auto-backup: app-close trigger runs on graceful exit
Auto-backup: on-DB-write debounced (5s) coalesces rapid writes
Retention: deletes oldest when count > N
Encryption: backup encrypted, restore prompts passphrase
Encryption: wrong passphrase fails restore
Provider switch: can change provider, re-authenticate
Test Connection button validates credentials
Cloud backup logs recorded with trigger type
```

---

# 61. Definition of Done

The MVP is complete when this workflow works:

```text
First Launch
    ↓
Create Admin
    ↓
Login
    ↓
Configure Shop
    ↓
Configure Metals/Purities
    ↓
Enter Current Rates
    ↓
Configure Tax
    ↓
Create Product Presets
    ↓
Create/Select Customer
    ↓
Create New Bill
    ↓
Add Multiple Products
    ↓
Select Presets or Enter Product Manually
    ↓
Enter Weight/Pricing Data
    ↓
Automatic Calculations
    ↓
Choose Invoice Language
    ↓
Preview Bill
    ↓
Finalize
    ↓
Invoice Version 1
    ↓
Print / PDF
    ↓
Sales History
    ↓
Edit Existing Invoice
    ↓
Enter Reason
    ↓
Invoice Version 2
    ↓
Compare V1 vs V2
    ↓
Print Latest Version
```

Also verify:

- Logo change shows old logo on historical invoices, new logo on new invoices
- Cloud backup (GDrive/GitHub) runs on configured triggers, restores correctly
- Encryption toggle works; wrong passphrase fails restore
- Audit log grows; purge UI works without data loss
- Keyboard shortcuts don't conflict with system shortcuts
- Print margins 10mm — no cut-off at edges
- Returned invoice generates negative credit note

---

# 62. Product Principles

1. Billing accuracy comes first.
2. Historical invoices must never change silently.
3. Rates are time-sensitive and must be snapshotted.
4. Finalized invoices are immutable.
5. Every edit creates a version.
6. Every version records who changed it and why.
7. The calculation engine is independent from the UI.
8. The invoice template is independent from the calculation engine.
9. Product presets are shortcuts, not inventory.
10. Customer birth date is internal and never appears on the invoice.
11. English and Marathi are presentation layers over the same invoice data.
12. The MVP should remain focused and reliable.

---

# 63. Final Technology Decision

```text
Frontend:
React + TypeScript

Desktop:
Electron + TypeScript

Build:
Vite + Electron Builder

Database:
SQLite + @databases/sqlite

Validation:
Zod

Invoice:
Handlebars + HTML/CSS

Rendering:
Chromium through Electron

Packaging:
Windows EXE installer
```

Do not introduce a separate Node/Express LAN backend into the first version.

The Electron main process is the application backend for the MVP.

Keep service boundaries clean so LAN functionality can be introduced later without replacing the core architecture.

---

# 64. Confirmed Implementation Notes

The following decisions were ratified during plan review:

### 64.1 Zod Usage Locations

Use Zod schemas for:

- IPC input validation (every `ipcMain.handle` handler validates args)
- React form validation (shared schema imported from `shared/schemas`)
- Database entity hydration (parse DB rows → typed objects)
- Payment method configuration validation

Place schemas in `shared/schemas/`. Import the same schema on both main and renderer sides.

### 64.2 SQLite Configuration

- Enable **WAL mode** (`PRAGMA journal_mode=WAL`) for concurrent read safety
- `PRAGMA foreign_keys=ON` for referential integrity
- Wrap invoice finalization, version creation, user creation, and restore in explicit `BEGIN TRANSACTION` / `COMMIT`
- Use `SELECT MAX(invoice_number) ... FOR UPDATE` (or app-level mutex) for atomic invoice number allocation

### 64.3 Electron Auto-Update

- Use `electron-updater` with `electron-builder`'s Squirrel.Windows maker
- Auto-check on startup, prompt user before applying
- Preserve `userData` directory across updates (DB, templates, logos survive)

### 64.4 Keyboard Shortcuts (Billing UI)

| Key | Action |
|-----|--------|
| `F2` | Edit selected row |
| `F3` | Search customer |
| `Enter` | Move to next field / add item |
| `Ctrl+S` | Save draft |
| `Ctrl+P` | Preview |
| `Ctrl+Enter` | Finalize |
| `Esc` | Cancel current action |
| `Ctrl+N` | New bill |
| `Ctrl+F` | Search (sales history / customers) |
| `Ctrl+E` | Edit invoice (from sales history) |
| `Ctrl+V` | View versions (from sales history) |
| `Alt+C` | Compare versions |
| `Ctrl+1..9` | Quick preset selection (first 9 presets) |

Implement as a global key handler in the New Bill page. Avoid system-reserved shortcuts (Ctrl+W, Ctrl+R, Ctrl+Shift+I, Alt+F4, Win+L). Disable renderer dev-tools in production.

### 64.5 Audit Log Retention

- Audit logs never auto-deleted (legal requirement)
- Soft cap: warn admin at 1,000,000 rows; show toast + admin notification
- Provide **"Purge Old Logs"** UI in Admin → Audit: select date range, confirm deletion
- Export to CSV before purge (recommended)
- See §39 for full audit retention policy

### 64.6 Amount in Words Utility

- Implement `amountInWords(amount: Decimal, lang: 'EN' | 'MR' | 'BOTH'): string` in `shared/utilities/`
- Reused by `PricingService`, Handlebars helper, and preview
- Indian numbering system (lakhs/crores), not Western (thousands/millions)

### 64.7 Logo Generation

- Generate generic SVG emblem (gold ring) at `assets/logos/default-jewellery-logo.svg`
- Convert to PNG at build time (`sharp` or build script) → `default-jewellery-logo.png`
- First run: copy to `userData/logos/logo-v1.png` if no custom logo exists
- Each upload creates `logo-v{N}.png`; invoice version stores filename reference

### 64.8 Template Customization UI

- Settings → Templates: basic in-app editor (textarea + live preview)
- User edits `.hbs` files directly via UI
- Changes saved to `userData/templates/invoice/`
- Reset to default button restores bundled template
- No syntax validation beyond Handlebars compile check

### 64.9 Testing Strategy

- **No automated unit tests** — user prefers manual e2e testing via UI and use cases
- Manual test cases documented in §61 (Definition of Done) and §60 (test scenarios as checklists)
- Optional: lightweight smoke test script for migration runner + DB open on CI

### 64.10 Migration Runner

- Custom simple runner: sequential `.sql` files in `database/migrations/`
- `migrations` table tracks applied migrations (filename, checksum, applied_at)
- On startup: read `schema_version` from `app_settings`, compare with latest migration number
- If mismatch: auto-run pending migrations or refuse to open (configurable)

### 64.11 Print Margins

- A4 portrait with **10mm safe margins** all sides (avoids printer cut-off)
- CSS: `@page { size: A4 portrait; margin: 10mm; }`
- `-webkit-print-color-adjust: exact; print-color-adjust: exact;`

### 64.12 Returned Invoices (Negative Support)

- Pricing engine handles negative quantities, net_weight, metal_value, making, tax cleanly
- `returned` status invoices link to original via `original_invoice_id`
- Credit note generated (negative grand total)
- Shown in Sales History with "RETURNED" badge

### 64.13 Default Tax Rates

- CGST 1.5%, SGST 1.5%, IGST 3% (standard for gold/silver jewellery)
- Configurable in shop settings; stored per invoice version snapshot
