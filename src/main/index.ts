// Main process entry point
import { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { runMigrations, getSchemaVersion, getPool, closePool, checkSchemaVersion } from './database';
import * as authService from './services/auth';
import * as invoiceService from './services/invoice';
import * as renderingService from './services/rendering';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Register custom protocol for OAuth
protocol.handle('myapp', (request) => {
  // Handle OAuth redirect
  console.log('Protocol request:', request.url);
  return new Response('Auth complete, you can close this window.', {
    headers: { 'Content-Type': 'text/html' },
  });
});

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: 'default',
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

app.on('ready', async () => {
  try {
    // Run migrations
    await runMigrations();

    // Verify schema version - refuse to open if mismatched
    const expectedVersion = 1; // Should match count of migration files
    const versionCheck = await checkSchemaVersion(expectedVersion);
    console.log(`Database schema version: ${versionCheck.current} (expected: ${versionCheck.expected})`);

    if (!versionCheck.valid) {
      console.error(`Schema version mismatch! Expected ${versionCheck.expected}, got ${versionCheck.current}`);
      // Show error dialog and quit
      const { dialog } = require('electron');
      dialog.showErrorBox(
        'Database Schema Mismatch',
        `The application expects database schema version ${versionCheck.expected}, but found version ${versionCheck.current}.\n\n` +
        'This usually means the database was created by a different version of the application.\n\n' +
        'Please update the application or restore from a compatible backup.'
      );
      app.quit();
      return;
    }

    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    const { dialog } = require('electron');
    dialog.showErrorBox('Initialization Error', `Failed to initialize app: ${error instanceof Error ? error.message : String(error)}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  // Handle app-close backup trigger
  console.log('App closing, running cleanup...');
  await closePool();
});

// IPC Handlers - Auth
ipcMain.handle('auth:createAdmin', async (_event, input) => {
  try {
    // Check if admin already exists
    const pool = await getPool();
    const admins = await pool.query(`SELECT COUNT(*) as count FROM users WHERE role = 'ADMIN' AND active = 1`);
    if (admins[0].count > 0) {
      return { success: false, error: 'Administrator already exists' };
    }

    const user = await authService.createAdmin(input);
    return { success: true, user };
  } catch (error: any) {
    console.error('Create admin error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:login', async (_event, username, password) => {
  try {
    const result = await authService.login(username, password);
    if (!result) {
      return { success: false, error: 'Invalid username or password' };
    }
    return { success: true, ...result };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:refreshAccessToken', async (_event, refreshToken) => {
  try {
    const token = await authService.refreshAccessToken(refreshToken);
    return token;
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return null;
  }
});

ipcMain.handle('auth:logout', async (_event, refreshToken) => {
  try {
    await authService.logout(refreshToken);
  } catch (error: any) {
    console.error('Logout error:', error);
  }
});

ipcMain.handle('auth:validateToken', async (_event, token) => {
  try {
    const payload = await authService.validateAccessToken(token);
    return { valid: !!payload, payload };
  } catch (error: any) {
    console.error('Validate token error:', error);
    return { valid: false };
  }
});

ipcMain.handle('auth:getCurrentUser', async () => {
  // Token validation should be done by the caller
  return null;
});

ipcMain.handle('auth:getAllUsers', async () => {
  try {
    return await authService.getAllUsers();
  } catch (error: any) {
    console.error('Get all users error:', error);
    return [];
  }
});

ipcMain.handle('auth:createUser', async (_event, input) => {
  try {
    const user = await authService.createUser(input);
    return { success: true, user };
  } catch (error: any) {
    console.error('Create user error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:updateUser', async (_event, userId, updates) => {
  try {
    const user = await authService.updateUser(userId, updates);
    return { success: true, user };
  } catch (error: any) {
    console.error('Update user error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('auth:deleteUser', async (_event, userId) => {
  try {
    return await authService.deleteUser(userId);
  } catch (error: any) {
    console.error('Delete user error:', error);
    return false;
  }
});

// IPC Handlers - Invoices (Drafts)
ipcMain.handle('invoices:createDraft', async (_event, input) => {
  try {
    const draftId = await invoiceService.createDraft(input);
    return { draftId };
  } catch (error: any) {
    console.error('Create draft error:', error);
    return { error: error.message };
  }
});

ipcMain.handle('invoices:updateDraft', async (_event, draftId, input) => {
  try {
    return await invoiceService.updateDraft(draftId, input);
  } catch (error: any) {
    console.error('Update draft error:', error);
    return false;
  }
});

ipcMain.handle('invoices:getDraft', async (_event, draftId) => {
  try {
    return await invoiceService.getDraft(draftId);
  } catch (error: any) {
    console.error('Get draft error:', error);
    return null;
  }
});

ipcMain.handle('invoices:deleteDraft', async (_event, draftId) => {
  try {
    return await invoiceService.deleteDraft(draftId);
  } catch (error: any) {
    console.error('Delete draft error:', error);
    return false;
  }
});

ipcMain.handle('invoices:getAllDrafts', async () => {
  try {
    return await invoiceService.getAllDrafts();
  } catch (error: any) {
    console.error('Get all drafts error:', error);
    return [];
  }
});

ipcMain.handle('invoices:finalizeInvoice', async (_event, draftId) => {
  try {
    // Get user from context (in real app, from token)
    // For now, use first admin user
    const pool = await getPool();
    const admins = await pool.query(`SELECT id FROM users WHERE role = 'ADMIN' AND active = 1 LIMIT 1`);
    if (admins.length === 0) {
      return { success: false, error: 'No admin user found' };
    }
    const result = await invoiceService.finalizeInvoice(draftId, admins[0].id);
    if (!result) {
      return { success: false, error: 'Draft not found' };
    }
    return { success: true, invoiceNumber: result.invoiceNumber };
  } catch (error: any) {
    console.error('Finalize invoice error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('invoices:getInvoice', async (_event, invoiceId) => {
  try {
    return await invoiceService.getInvoice(invoiceId);
  } catch (error: any) {
    console.error('Get invoice error:', error);
    return null;
  }
});

ipcMain.handle('invoices:getLatestVersion', async (_event, invoiceId) => {
  try {
    return await invoiceService.getLatestVersion(invoiceId);
  } catch (error: any) {
    console.error('Get latest version error:', error);
    return null;
  }
});

ipcMain.handle('invoices:getSalesHistory', async (_event, filters) => {
  try {
    return await invoiceService.getSalesHistory(filters);
  } catch (error: any) {
    console.error('Get sales history error:', error);
    return { invoices: [], total: 0, page: 1, limit: 20 };
  }
});

ipcMain.handle('utils:getAppVersion', () => {
  return app.getVersion();
});

ipcMain.handle('utils:getUserDataPath', () => {
  return app.getPath('userData');
});

// Placeholder handlers for other services
const placeholderHandler = (_event: any, ..._args: any[]) => {
  console.log('Handler not yet implemented:', _event);
  return { success: false, error: 'Not implemented' };
};

const services = [
  'customers', 'metals', 'purities', 'rates', 'productPresets',
  'tax', 'shop', 'backup', 'templates', 'audit', 'paymentMethods'
];

for (const svc of services) {
  // Get all methods for this service from the preload
  // For now, just add a catch-all
  ipcMain.handle(`${svc}:*`, placeholderHandler);
}

// Import all services
import * as customersService from './services/customers';
import * as metalsService from './services/metals';
import * as puritiesService from './services/purities';
import * as ratesService from './services/rates';
import * as productPresetsService from './services/productPresets';
import * as taxService from './services/tax';
import * as shopService from './services/shop';
import * as backupService from './services/backup';
import * as templatesService from './services/templates';
import * as auditService from './services/audit';
import * as paymentMethodsService from './services/paymentMethods';

// Customers IPC
ipcMain.handle('customers:getAll', async (_event, filters) => {
  try {
    return await customersService.getAll(filters);
  } catch (error: any) {
    console.error('Get all customers error:', error);
    return [];
  }
});

ipcMain.handle('customers:getById', async (_event, id) => {
  try {
    return await customersService.getById(id);
  } catch (error: any) {
    console.error('Get customer by id error:', error);
    return null;
  }
});

ipcMain.handle('customers:create', async (_event, input) => {
  try {
    const customer = await customersService.create(input);
    return { success: true, customer };
  } catch (error: any) {
    console.error('Create customer error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:update', async (_event, id, input) => {
  try {
    const customer = await customersService.update(id, input);
    return { success: true, customer };
  } catch (error: any) {
    console.error('Update customer error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('customers:delete', async (_event, id) => {
  try {
    return await customersService.remove(id);
  } catch (error: any) {
    console.error('Delete customer error:', error);
    return false;
  }
});

ipcMain.handle('customers:search', async (_event, query) => {
  try {
    return await customersService.search(query);
  } catch (error: any) {
    console.error('Search customers error:', error);
    return [];
  }
});

// Metals IPC
ipcMain.handle('metals:getAll', async () => {
  try {
    return await metalsService.getAll();
  } catch (error: any) {
    console.error('Get all metals error:', error);
    return [];
  }
});

ipcMain.handle('metals:create', async (_event, input) => {
  try {
    const metal = await metalsService.create(input);
    return { success: true, metal };
  } catch (error: any) {
    console.error('Create metal error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('metals:update', async (_event, id, input) => {
  try {
    const metal = await metalsService.update(id, input);
    return { success: true, metal };
  } catch (error: any) {
    console.error('Update metal error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('metals:delete', async (_event, id) => {
  try {
    return await metalsService.remove(id);
  } catch (error: any) {
    console.error('Delete metal error:', error);
    return false;
  }
});

// Purities IPC
ipcMain.handle('purities:getAll', async (_event, metalId) => {
  try {
    return await puritiesService.getAll(metalId);
  } catch (error: any) {
    console.error('Get all purities error:', error);
    return [];
  }
});

ipcMain.handle('purities:getByMetal', async (_event, metalId) => {
  try {
    return await puritiesService.getByMetal(metalId);
  } catch (error: any) {
    console.error('Get purities by metal error:', error);
    return [];
  }
});

ipcMain.handle('purities:create', async (_event, input) => {
  try {
    const purity = await puritiesService.create(input);
    return { success: true, purity };
  } catch (error: any) {
    console.error('Create purity error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purities:update', async (_event, id, input) => {
  try {
    const purity = await puritiesService.update(id, input);
    return { success: true, purity };
  } catch (error: any) {
    console.error('Update purity error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('purities:delete', async (_event, id) => {
  try {
    return await puritiesService.remove(id);
  } catch (error: any) {
    console.error('Delete purity error:', error);
    return false;
  }
});

// Rates IPC
ipcMain.handle('rates:getCurrent', async () => {
  try {
    return await ratesService.getCurrent();
  } catch (error: any) {
    console.error('Get current rates error:', error);
    return [];
  }
});

ipcMain.handle('rates:getHistory', async (_event, metalId, purityId) => {
  try {
    return await ratesService.getHistory(metalId, purityId);
  } catch (error: any) {
    console.error('Get rate history error:', error);
    return [];
  }
});

ipcMain.handle('rates:setRate', async (_event, input) => {
  try {
    const rate = await ratesService.setRate(input);
    return { success: true, rate };
  } catch (error: any) {
    console.error('Set rate error:', error);
    return { success: false, error: error.message };
  }
});

// Product Presets IPC
ipcMain.handle('productPresets:getAll', async (_event, filters) => {
  try {
    return await productPresetsService.getAll(filters);
  } catch (error: any) {
    console.error('Get all presets error:', error);
    return [];
  }
});

ipcMain.handle('productPresets:getById', async (_event, id) => {
  try {
    return await productPresetsService.getById(id);
  } catch (error: any) {
    console.error('Get preset by id error:', error);
    return null;
  }
});

ipcMain.handle('productPresets:create', async (_event, input) => {
  try {
    const preset = await productPresetsService.create(input);
    return { success: true, preset };
  } catch (error: any) {
    console.error('Create preset error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('productPresets:update', async (_event, id, input) => {
  try {
    const preset = await productPresetsService.update(id, input);
    return { success: true, preset };
  } catch (error: any) {
    console.error('Update preset error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('productPresets:delete', async (_event, id) => {
  try {
    return await productPresetsService.remove(id);
  } catch (error: any) {
    console.error('Delete preset error:', error);
    return false;
  }
});

// Tax IPC
ipcMain.handle('tax:getSettings', async () => {
  try {
    return await taxService.getSettings();
  } catch (error: any) {
    console.error('Get tax settings error:', error);
    return null;
  }
});

ipcMain.handle('tax:updateSettings', async (_event, input) => {
  try {
    const settings = await taxService.updateSettings(input);
    return { success: true, settings };
  } catch (error: any) {
    console.error('Update tax settings error:', error);
    return { success: false, error: error.message };
  }
});

// Invoices - Versioning IPC
ipcMain.handle('invoices:createVersion', async (_event, invoiceId, input) => {
  try {
    return await invoiceService.createVersion(invoiceId, input);
  } catch (error: any) {
    console.error('Create version error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('invoices:compareVersions', async (_event, invoiceId, v1, v2) => {
  try {
    return await invoiceService.compareVersions(invoiceId, v1, v2);
  } catch (error: any) {
    console.error('Compare versions error:', error);
    return null;
  }
});

ipcMain.handle('invoices:cancelInvoice', async (_event, invoiceId, reason) => {
  try {
    return await invoiceService.cancelInvoice(invoiceId, reason);
  } catch (error: any) {
    console.error('Cancel invoice error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('invoices:returnInvoice', async (_event, invoiceId, input) => {
  try {
    return await invoiceService.returnInvoice(invoiceId, input);
  } catch (error: any) {
    console.error('Return invoice error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('invoices:getVersionHistory', async (_event, invoiceId) => {
  try {
    return await invoiceService.getVersionHistory(invoiceId);
  } catch (error: any) {
    console.error('Get version history error:', error);
    return [];
  }
});

ipcMain.handle('invoices:getInvoice', async (_event, invoiceId) => {
  try {
    return await invoiceService.getInvoice(invoiceId);
  } catch (error: any) {
    console.error('Get invoice error:', error);
    return null;
  }
});

ipcMain.handle('invoices:getLatestVersion', async (_event, invoiceId) => {
  try {
    return await invoiceService.getLatestVersion(invoiceId);
  } catch (error: any) {
    console.error('Get latest version error:', error);
    return null;
  }
});

// Shop IPC
ipcMain.handle('shop:getSettings', async () => {
  try {
    return await shopService.getSettings();
  } catch (error: any) {
    console.error('Get shop settings error:', error);
    return null;
  }
});

ipcMain.handle('shop:updateSettings', async (_event, input) => {
  try {
    const settings = await shopService.updateSettings(input);
    return { success: true, settings };
  } catch (error: any) {
    console.error('Update shop settings error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('shop:uploadLogo', async (_event, file) => {
  try {
    const result = await shopService.uploadLogo(file);
    return { success: true, ...result };
  } catch (error: any) {
    console.error('Upload logo error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('shop:getLogoVersions', async () => {
  try {
    return await shopService.getLogoVersions();
  } catch (error: any) {
    console.error('Get logo versions error:', error);
    return [];
  }
});

// Backup IPC
ipcMain.handle('backup:createLocalBackup', async () => {
  try {
    const result = await backupService.createLocalBackup();
    return { success: true, ...result };
  } catch (error: any) {
    console.error('Create local backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:restoreLocalBackup', async (_event, filename) => {
  try {
    return await backupService.restoreLocalBackup(filename);
  } catch (error: any) {
    console.error('Restore local backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:getCloudConfig', async () => {
  try {
    return await backupService.getCloudConfig();
  } catch (error: any) {
    console.error('Get cloud config error:', error);
    return null;
  }
});

ipcMain.handle('backup:updateCloudConfig', async (_event, config) => {
  try {
    return await backupService.updateCloudConfig(config);
  } catch (error: any) {
    console.error('Update cloud config error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:testCloudConnection', async () => {
  try {
    return await backupService.testCloudConnection();
  } catch (error: any) {
    console.error('Test cloud connection error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:runCloudBackup', async (_event, trigger) => {
  try {
    return await backupService.runCloudBackup(trigger);
  } catch (error: any) {
    console.error('Run cloud backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:listCloudBackups', async () => {
  try {
    return await backupService.listCloudBackups();
  } catch (error: any) {
    console.error('List cloud backups error:', error);
    return [];
  }
});

ipcMain.handle('backup:restoreFromCloud', async (_event, fileId, passphrase) => {
  try {
    return await backupService.restoreFromCloud(fileId, passphrase);
  } catch (error: any) {
    console.error('Restore from cloud error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:getBackupLogs', async () => {
  try {
    return await backupService.getBackupLogs();
  } catch (error: any) {
    console.error('Get backup logs error:', error);
    return [];
  }
});

ipcMain.handle('backup:listBackups', async () => {
  try {
    return await backupService.listBackups();
  } catch (error: any) {
    console.error('List backups error:', error);
    return [];
  }
});

ipcMain.handle('backup:deleteBackup', async (_event, filename) => {
  try {
    return await backupService.deleteBackup(filename);
  } catch (error: any) {
    console.error('Delete backup error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup:getSettings', async () => {
  try {
    return await backupService.getSettings();
  } catch (error: any) {
    console.error('Get backup settings error:', error);
    return null;
  }
});

ipcMain.handle('backup:updateSettings', async (_event, input) => {
  try {
    return await backupService.updateSettings(input);
  } catch (error: any) {
    console.error('Update backup settings error:', error);
    return null;
  }
});

// Templates IPC
ipcMain.handle('templates:getTemplates', async (_event, language) => {
  try {
    return await templatesService.getTemplates(language);
  } catch (error: any) {
    console.error('Get templates error:', error);
    return [];
  }
});

ipcMain.handle('templates:saveTemplate', async (_event, language, content) => {
  try {
    const template = await templatesService.saveTemplate(language, content);
    return { success: true, template };
  } catch (error: any) {
    console.error('Save template error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('templates:getDefaultTemplate', async (_event, language) => {
  try {
    return await templatesService.getDefaultTemplate(language);
  } catch (error: any) {
    console.error('Get default template error:', error);
    return '';
  }
});

// Audit IPC
ipcMain.handle('audit:getLogs', async (_event, filters) => {
  try {
    return await auditService.getLogs(filters);
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    return [];
  }
});

ipcMain.handle('audit:exportLogs', async (_event, dateFrom, dateTo) => {
  try {
    return await auditService.exportLogs(dateFrom, dateTo);
  } catch (error: any) {
    console.error('Export audit logs error:', error);
    return '';
  }
});

ipcMain.handle('audit:purgeOldLogs', async (_event, beforeDate) => {
  try {
    return await auditService.purgeOldLogs(beforeDate);
  } catch (error: any) {
    console.error('Purge old logs error:', error);
    return { success: false, deletedCount: 0 };
  }
});

// Payment Methods IPC
ipcMain.handle('paymentMethods:getAll', async () => {
  try {
    return await paymentMethodsService.getAll();
  } catch (error: any) {
    console.error('Get payment methods error:', error);
    return [];
  }
});

ipcMain.handle('paymentMethods:create', async (_event, input) => {
  try {
    const method = await paymentMethodsService.create(input);
    return { success: true, method };
  } catch (error: any) {
    console.error('Create payment method error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('paymentMethods:update', async (_event, code, input) => {
  try {
    const method = await paymentMethodsService.update(code, input);
    return { success: true, method };
  } catch (error: any) {
    console.error('Update payment method error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('paymentMethods:delete', async (_event, code) => {
  try {
    return await paymentMethodsService.remove(code);
  } catch (error: any) {
    console.error('Delete payment method error:', error);
    return false;
  }
});

// Rendering IPC
ipcMain.handle('rendering:renderInvoiceToHTML', async (_event, invoiceId, versionNumber) => {
  try {
    const html = await renderingService.renderInvoiceToHTML(invoiceId, versionNumber);
    return { success: true, html };
  } catch (error: any) {
    console.error('Render invoice to HTML error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rendering:printInvoice', async (_event, invoiceId, versionNumber) => {
  try {
    return await renderingService.printInvoice(invoiceId, versionNumber);
  } catch (error: any) {
    console.error('Print invoice error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rendering:printInvoiceToPDF', async (_event, invoiceId, versionNumber, outputPath) => {
  try {
    return await renderingService.printInvoiceToPDF(invoiceId, versionNumber, outputPath);
  } catch (error: any) {
    console.error('Print invoice to PDF error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('rendering:printInvoicePreview', async (_event, invoiceId, versionNumber) => {
  try {
    return await renderingService.printInvoicePreview(invoiceId, versionNumber);
  } catch (error: any) {
    console.error('Print invoice preview error:', error);
    return { success: false, error: error.message };
  }
});