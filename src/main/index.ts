// Main process entry point
import { app, BrowserWindow, ipcMain, protocol, session } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { runMigrations, getSchemaVersion, getPool, closePool } from './database';
import * as authService from './services/auth';
import * as invoiceService from './services/invoice';

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

    // Verify schema version
    const currentVersion = await getSchemaVersion();
    console.log(`Database schema version: ${currentVersion}`);

    createWindow();
  } catch (error) {
    console.error('Failed to initialize app:', error);
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

// Specific placeholder handlers that the preload expects
ipcMain.handle('customers:getAll', placeholderHandler);
ipcMain.handle('customers:getById', placeholderHandler);
ipcMain.handle('customers:create', placeholderHandler);
ipcMain.handle('customers:update', placeholderHandler);
ipcMain.handle('customers:delete', placeholderHandler);
ipcMain.handle('customers:search', placeholderHandler);

ipcMain.handle('metals:getAll', placeholderHandler);
ipcMain.handle('metals:create', placeholderHandler);
ipcMain.handle('metals:update', placeholderHandler);
ipcMain.handle('metals:delete', placeholderHandler);

ipcMain.handle('purities:getAll', placeholderHandler);
ipcMain.handle('purities:getByMetal', placeholderHandler);
ipcMain.handle('purities:create', placeholderHandler);
ipcMain.handle('purities:update', placeholderHandler);
ipcMain.handle('purities:delete', placeholderHandler);

ipcMain.handle('rates:getCurrent', placeholderHandler);
ipcMain.handle('rates:getHistory', placeholderHandler);
ipcMain.handle('rates:setRate', placeholderHandler);

ipcMain.handle('productPresets:getAll', placeholderHandler);
ipcMain.handle('productPresets:getById', placeholderHandler);
ipcMain.handle('productPresets:create', placeholderHandler);
ipcMain.handle('productPresets:update', placeholderHandler);
ipcMain.handle('productPresets:delete', placeholderHandler);

ipcMain.handle('tax:getSettings', placeholderHandler);
ipcMain.handle('tax:updateSettings', placeholderHandler);

ipcMain.handle('invoices:createVersion', placeholderHandler);
ipcMain.handle('invoices:compareVersions', placeholderHandler);
ipcMain.handle('invoices:cancelInvoice', placeholderHandler);
ipcMain.handle('invoices:returnInvoice', placeholderHandler);

ipcMain.handle('shop:getSettings', placeholderHandler);
ipcMain.handle('shop:updateSettings', placeholderHandler);
ipcMain.handle('shop:uploadLogo', placeholderHandler);
ipcMain.handle('shop:getLogoVersions', placeholderHandler);

ipcMain.handle('backup:createLocalBackup', placeholderHandler);
ipcMain.handle('backup:restoreLocalBackup', placeholderHandler);
ipcMain.handle('backup:getCloudConfig', placeholderHandler);
ipcMain.handle('backup:updateCloudConfig', placeholderHandler);
ipcMain.handle('backup:testCloudConnection', placeholderHandler);
ipcMain.handle('backup:runCloudBackup', placeholderHandler);
ipcMain.handle('backup:listCloudBackups', placeholderHandler);
ipcMain.handle('backup:restoreFromCloud', placeholderHandler);
ipcMain.handle('backup:getBackupLogs', placeholderHandler);

ipcMain.handle('templates:getTemplates', placeholderHandler);
ipcMain.handle('templates:saveTemplate', placeholderHandler);
ipcMain.handle('templates:getDefaultTemplate', placeholderHandler);

ipcMain.handle('audit:getLogs', placeholderHandler);
ipcMain.handle('audit:exportLogs', placeholderHandler);
ipcMain.handle('audit:purgeOldLogs', placeholderHandler);

ipcMain.handle('paymentMethods:getAll', placeholderHandler);
ipcMain.handle('paymentMethods:create', placeholderHandler);
ipcMain.handle('paymentMethods:update', placeholderHandler);
ipcMain.handle('paymentMethods:delete', placeholderHandler);