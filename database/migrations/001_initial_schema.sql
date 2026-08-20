-- Initial schema for jewellery-pos
-- Migration: 001_initial_schema.sql

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

-- Roles table (for future extensibility)
CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Shops table
CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    phone TEXT,
    email TEXT,
    gstin TEXT,
    pan TEXT,
    state_code TEXT,
    logo_filename TEXT,
    invoice_footer TEXT,
    terms_conditions TEXT,
    rounding_mode TEXT NOT NULL DEFAULT 'PER_ITEM' CHECK (rounding_mode IN ('PER_ITEM', 'AGGREGATE')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Metals table
CREATE TABLE IF NOT EXISTS metals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Purities table
CREATE TABLE IF NOT EXISTS purities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metal_id INTEGER NOT NULL REFERENCES metals(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    percentage REAL NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (metal_id, code)
);

-- Metal rates table
CREATE TABLE IF NOT EXISTS metal_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metal_id INTEGER NOT NULL REFERENCES metals(id) ON DELETE RESTRICT,
    purity_id INTEGER NOT NULL REFERENCES purities(id) ON DELETE RESTRICT,
    rate_per_gram REAL NOT NULL,
    effective_date DATE NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (metal_id, purity_id, effective_date)
);

-- Tax settings table
CREATE TABLE IF NOT EXISTS tax_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tax_type TEXT NOT NULL DEFAULT 'CGST_SGST' CHECK (tax_type IN ('CGST_SGST', 'IGST')),
    cgst_rate REAL NOT NULL DEFAULT 1.5,
    sgst_rate REAL NOT NULL DEFAULT 1.5,
    igst_rate REAL NOT NULL DEFAULT 3.0,
    is_default INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mobile TEXT,
    address TEXT,
    birth_date DATE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Product presets table
CREATE TABLE IF NOT EXISTS product_presets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    english_name TEXT,
    marathi_name TEXT,
    metal_id INTEGER NOT NULL REFERENCES metals(id) ON DELETE RESTRICT,
    purity_id INTEGER NOT NULL REFERENCES purities(id) ON DELETE RESTRICT,
    hsn_sac TEXT,
    making_charge_method TEXT CHECK (making_charge_method IN ('FIXED', 'PER_GRAM', 'PERCENTAGE')),
    making_charge_value REAL,
    making_charge_per_gram_base TEXT DEFAULT 'net_weight' CHECK (making_charge_per_gram_base IN ('net_weight', 'gross_weight')),
    wastage_base TEXT DEFAULT 'metal_value' CHECK (wastage_base IN ('metal_value', 'metal_value_plus_making')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (english_name IS NOT NULL OR marathi_name IS NOT NULL)
);

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_date DATE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'cancelled', 'returned')),
    tax_type TEXT NOT NULL DEFAULT 'CGST_SGST' CHECK (tax_type IN ('CGST_SGST', 'IGST')),
    rounding_mode TEXT NOT NULL DEFAULT 'PER_ITEM' CHECK (rounding_mode IN ('PER_ITEM', 'AGGREGATE')),
    amount_in_words_language TEXT NOT NULL DEFAULT 'EN' CHECK (amount_in_words_language IN ('EN', 'MR', 'BOTH')),
    invoice_language TEXT NOT NULL DEFAULT 'ENGLISH' CHECK (invoice_language IN ('ENGLISH', 'MARATHI', 'BILINGUAL')),
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalized_at DATETIME
);

-- Drafts table (persistent draft storage)
CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    invoice_date DATE NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    items_json TEXT NOT NULL DEFAULT '[]',
    payments_json TEXT NOT NULL DEFAULT '[]',
    tax_type TEXT NOT NULL DEFAULT 'CGST_SGST' CHECK (tax_type IN ('CGST_SGST', 'IGST')),
    rounding_mode TEXT NOT NULL DEFAULT 'PER_ITEM' CHECK (rounding_mode IN ('PER_ITEM', 'AGGREGATE')),
    invoice_language TEXT NOT NULL DEFAULT 'ENGLISH' CHECK (invoice_language IN ('ENGLISH', 'MARATHI', 'BILINGUAL')),
    invoice_discount_method TEXT NOT NULL DEFAULT 'NONE' CHECK (invoice_discount_method IN ('NONE', 'FIXED', 'PERCENTAGE')),
    invoice_discount_value REAL NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invoice versions table
CREATE TABLE IF NOT EXISTS invoice_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    customer_snapshot_json TEXT NOT NULL,
    items_json TEXT NOT NULL,
    rates_json TEXT NOT NULL,
    tax_json TEXT NOT NULL,
    payments_json TEXT NOT NULL,
    totals_json TEXT NOT NULL,
    shop_snapshot_json TEXT NOT NULL,
    update_reason TEXT NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (invoice_id, version_number)
);

-- Invoice items table (denormalized for historical snapshots)
CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_version_id INTEGER NOT NULL REFERENCES invoice_versions(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_name_english TEXT NOT NULL,
    product_name_marathi TEXT NOT NULL,
    metal_id INTEGER NOT NULL REFERENCES metals(id) ON DELETE RESTRICT,
    purity_id INTEGER NOT NULL REFERENCES purities(id) ON DELETE RESTRICT,
    hsn_sac TEXT,
    gross_weight REAL NOT NULL,
    stone_weight REAL NOT NULL DEFAULT 0,
    net_weight REAL NOT NULL,
    metal_rate REAL NOT NULL,
    metal_value REAL NOT NULL,
    making_charge_method TEXT NOT NULL CHECK (making_charge_method IN ('FIXED', 'PER_GRAM', 'PERCENTAGE')),
    making_charge_value REAL NOT NULL,
    making_charge_amount REAL NOT NULL,
    wastage_method TEXT NOT NULL DEFAULT 'NONE' CHECK (wastage_method IN ('NONE', 'FIXED', 'PERCENTAGE')),
    wastage_value REAL NOT NULL DEFAULT 0,
    wastage_amount REAL NOT NULL DEFAULT 0,
    stone_value REAL NOT NULL DEFAULT 0,
    other_charges_json TEXT NOT NULL DEFAULT '[]',
    discount_method TEXT NOT NULL DEFAULT 'NONE' CHECK (discount_method IN ('NONE', 'FIXED', 'PERCENTAGE')),
    discount_value REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    taxable_value REAL NOT NULL,
    total_value REAL NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_version_id INTEGER NOT NULL REFERENCES invoice_versions(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    amount REAL NOT NULL,
    reference_number TEXT,
    date DATETIME NOT NULL,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Invoice templates table
CREATE TABLE IF NOT EXISTS invoice_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    language TEXT NOT NULL CHECK (language IN ('ENGLISH', 'MARATHI', 'BILINGUAL')),
    template_content TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods table
CREATE TABLE IF NOT EXISTS payment_methods (
    code TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    is_custom INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
);

-- Cloud backup logs table
CREATE TABLE IF NOT EXISTS cloud_backup_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL CHECK (provider IN ('gdrive', 'github')),
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
    error_message TEXT,
    trigger TEXT NOT NULL CHECK (trigger IN ('interval', 'daily', 'app_close', 'db_write', 'manual')),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table (for refresh tokens)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

-- Migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    checksum TEXT NOT NULL,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backup settings table
CREATE TABLE IF NOT EXISTS backup_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auto_backup_enabled INTEGER NOT NULL DEFAULT 0,
    backup_interval_hours INTEGER NOT NULL DEFAULT 24,
    backup_location TEXT,
    retention_count INTEGER NOT NULL DEFAULT 30,
    encrypt_backups INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed default backup settings
INSERT OR IGNORE INTO backup_settings (id, auto_backup_enabled, backup_interval_hours, retention_count, encrypt_backups) VALUES
    (1, 0, 24, 30, 0);

-- Insert default data
INSERT OR IGNORE INTO metals (name, code, active) VALUES
    ('Gold', 'GOLD', 1),
    ('Silver', 'SILVER', 1);

INSERT OR IGNORE INTO purities (metal_id, name, code, percentage, active) VALUES
    (1, '24K', '24K', 99.9, 1),
    (1, '22K', '22K', 91.6, 1),
    (1, '18K', '18K', 75.0, 1),
    (2, '999', '999', 99.9, 1),
    (2, '925', '925', 92.5, 1);

INSERT OR IGNORE INTO tax_settings (tax_type, cgst_rate, sgst_rate, igst_rate, is_default) VALUES
    ('CGST_SGST', 1.5, 1.5, 3.0, 1);

INSERT OR IGNORE INTO payment_methods (code, label, is_custom, sort_order, active) VALUES
    ('CASH', 'Cash', 0, 1, 1),
    ('UPI', 'UPI', 0, 2, 1),
    ('CARD', 'Card', 0, 3, 1),
    ('BANK_TRANSFER', 'Bank Transfer', 0, 4, 1);

-- Default roles
INSERT OR IGNORE INTO roles (name, description) VALUES
    ('ADMIN', 'Full system access'),
    ('USER', 'Standard billing user');

-- Default permissions
INSERT OR IGNORE INTO permissions (code, description) VALUES
    ('CREATE_BILL', 'Create new bills'),
    ('EDIT_BILL', 'Edit existing bills'),
    ('VIEW_SALES', 'View sales history'),
    ('VIEW_INVOICE_HISTORY', 'View invoice version history'),
    ('PRINT_INVOICE', 'Print invoices'),
    ('MANAGE_CUSTOMERS', 'Manage customers'),
    ('MANAGE_PRODUCT_PRESETS', 'Manage product presets'),
    ('MANAGE_RATES', 'Manage metal rates'),
    ('MANAGE_TAX_SETTINGS', 'Manage tax settings'),
    ('MANAGE_USERS', 'Manage users'),
    ('VIEW_SALES_REPORT', 'View sales reports'),
    ('VIEW_AUDIT_LOG', 'View audit log'),
    ('BACKUP_DATABASE', 'Backup database'),
    ('RESTORE_DATABASE', 'Restore database'),
    ('MANAGE_SHOP_SETTINGS', 'Manage shop settings');

-- Role permissions
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'ADMIN';

INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'USER'
AND p.code IN ('CREATE_BILL', 'EDIT_BILL', 'VIEW_SALES', 'VIEW_INVOICE_HISTORY', 'PRINT_INVOICE', 'MANAGE_CUSTOMERS', 'MANAGE_PRODUCT_PRESETS', 'MANAGE_RATES');

-- Default app settings
INSERT OR IGNORE INTO app_settings (key, value, description) VALUES
    ('schema_version', '1', 'Current database schema version'),
    ('app_version', '1.0.0', 'Application version');