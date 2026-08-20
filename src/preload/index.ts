// Preload script - Secure bridge between renderer and main process

import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for the exposed API
interface AuthAPI {
  createAdmin: (input: { name: string; username: string; password: string; confirmPassword: string }) => Promise<{ success: boolean; error?: string }>;
  login: (username: string, password: string) => Promise<{ success: boolean; user?: any; accessToken?: string; refreshToken?: string; error?: string }>;
  refreshAccessToken: (refreshToken: string) => Promise<string | null>;
  logout: (refreshToken: string) => Promise<void>;
  validateToken: (token: string) => Promise<{ valid: boolean; payload?: any }>;
  getCurrentUser: () => Promise<any>;
  getAllUsers: () => Promise<any[]>;
  createUser: (input: any) => Promise<{ success: boolean; user?: any; error?: string }>;
  updateUser: (userId: number, updates: any) => Promise<{ success: boolean; user?: any; error?: string }>;
  deleteUser: (userId: number) => Promise<boolean>;
}

interface CustomersAPI {
  getAll: (filters?: any) => Promise<any[]>;
  getById: (id: number) => Promise<any>;
  create: (input: any) => Promise<{ success: boolean; customer?: any; error?: string }>;
  update: (id: number, input: any) => Promise<{ success: boolean; customer?: any; error?: string }>;
  delete: (id: number) => Promise<boolean>;
  search: (query: string) => Promise<any[]>;
}

interface MetalsAPI {
  getAll: () => Promise<any[]>;
  create: (input: any) => Promise<{ success: boolean; metal?: any; error?: string }>;
  update: (id: number, input: any) => Promise<{ success: boolean; metal?: any; error?: string }>;
  delete: (id: number) => Promise<boolean>;
}

interface PuritiesAPI {
  getAll: (metalId?: number) => Promise<any[]>;
  getByMetal: (metalId: number) => Promise<any[]>;
  create: (input: any) => Promise<{ success: boolean; purity?: any; error?: string }>;
  update: (id: number, input: any) => Promise<{ success: boolean; purity?: any; error?: string }>;
  delete: (id: number) => Promise<boolean>;
}

interface RatesAPI {
  getCurrent: () => Promise<any[]>;
  getHistory: (metalId: number, purityId: number) => Promise<any[]>;
  setRate: (input: any) => Promise<{ success: boolean; rate?: any; error?: string }>;
}

interface ProductPresetsAPI {
  getAll: (filters?: any) => Promise<any[]>;
  getById: (id: number) => Promise<any>;
  create: (input: any) => Promise<{ success: boolean; preset?: any; error?: string }>;
  update: (id: number, input: any) => Promise<{ success: boolean; preset?: any; error?: string }>;
  delete: (id: number) => Promise<boolean>;
}

interface TaxAPI {
  getSettings: () => Promise<any>;
  updateSettings: (input: any) => Promise<{ success: boolean; error?: string }>;
}

interface InvoiceAPI {
  createDraft: (input: any) => Promise<{ draftId?: string; error?: string }>;
  updateDraft: (draftId: string, input: any) => Promise<boolean>;
  getDraft: (draftId: string) => Promise<any>;
  deleteDraft: (draftId: string) => Promise<boolean>;
  getAllDrafts: () => Promise<any[]>;
  finalizeInvoice: (draftId: string) => Promise<{ success: boolean; invoiceNumber?: string; error?: string }>;
  createInvoice: (input: any) => Promise<{ success: boolean; invoiceNumber?: string; invoiceId?: number; error?: string }>;
  getInvoice: (invoiceId: number) => Promise<any>;
  getLatestVersion: (invoiceId: number) => Promise<any>;
  getSalesHistory: (filters: any) => Promise<any>;
  createVersion: (invoiceId: number, input: any) => Promise<{ success: boolean; versionNumber?: number; error?: string }>;
  compareVersions: (invoiceId: number, v1: number, v2: number) => Promise<any>;
  cancelInvoice: (invoiceId: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  returnInvoice: (invoiceId: number, input: any) => Promise<{ success: boolean; error?: string }>;
}

interface ShopAPI {
  getSettings: () => Promise<any>;
  updateSettings: (input: any) => Promise<{ success: boolean; error?: string }>;
  uploadLogo: (file: any) => Promise<{ success: boolean; filename?: string; error?: string }>;
  getLogoVersions: () => Promise<string[]>;
}

interface BackupAPI {
  createLocalBackup: () => Promise<{ success: boolean; filename?: string; error?: string }>;
  restoreLocalBackup: (filename: string) => Promise<{ success: boolean; error?: string }>;
  getCloudConfig: () => Promise<any>;
  updateCloudConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
  testCloudConnection: () => Promise<{ success: boolean; error?: string }>;
  runCloudBackup: (trigger: string) => Promise<{ success: boolean; error?: string }>;
  listCloudBackups: () => Promise<any[]>;
  restoreFromCloud: (fileId: string, passphrase?: string) => Promise<{ success: boolean; error?: string }>;
  getBackupLogs: () => Promise<any[]>;
}

interface TemplateAPI {
  getTemplates: (language: string) => Promise<any[]>;
  saveTemplate: (language: string, content: string) => Promise<{ success: boolean; error?: string }>;
  getDefaultTemplate: (language: string) => Promise<string>;
}

interface AuditAPI {
  getLogs: (filters: any) => Promise<any[]>;
  exportLogs: (dateFrom: string, dateTo: string) => Promise<string>;
  purgeOldLogs: (beforeDate: string) => Promise<{ success: boolean; deletedCount: number }>;
}

interface PaymentMethodsAPI {
  getAll: () => Promise<any[]>;
  create: (input: any) => Promise<{ success: boolean; method?: any; error?: string }>;
  update: (code: string, input: any) => Promise<{ success: boolean; method?: any; error?: string }>;
  delete: (code: string) => Promise<boolean>;
}

interface RenderingAPI {
  renderInvoiceToHTML: (invoiceId: number, versionNumber?: number) => Promise<{ success: boolean; html?: string; error?: string }>;
  printInvoice: (invoiceId: number, versionNumber?: number) => Promise<{ success: boolean; error?: string }>;
  printInvoiceToPDF: (invoiceId: number, versionNumber?: number, outputPath?: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  printInvoicePreview: (invoiceId: number, versionNumber?: number) => Promise<{ success: boolean; error?: string }>;
}

// Expose the API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Auth
  auth: {
    createAdmin: (input: any) => ipcRenderer.invoke('auth:createAdmin', input),
    login: (username: string, password: string) => ipcRenderer.invoke('auth:login', username, password),
    refreshAccessToken: (refreshToken: string) => ipcRenderer.invoke('auth:refreshAccessToken', refreshToken),
    logout: (refreshToken: string) => ipcRenderer.invoke('auth:logout', refreshToken),
    validateToken: (token: string) => ipcRenderer.invoke('auth:validateToken', token),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    getAllUsers: () => ipcRenderer.invoke('auth:getAllUsers'),
    createUser: (input: any) => ipcRenderer.invoke('auth:createUser', input),
    updateUser: (userId: number, updates: any) => ipcRenderer.invoke('auth:updateUser', userId, updates),
    deleteUser: (userId: number) => ipcRenderer.invoke('auth:deleteUser', userId),
  },

  // Customers
  customers: {
    getAll: (filters?: any) => ipcRenderer.invoke('customers:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('customers:getById', id),
    create: (input: any) => ipcRenderer.invoke('customers:create', input),
    update: (id: number, input: any) => ipcRenderer.invoke('customers:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('customers:delete', id),
    search: (query: string) => ipcRenderer.invoke('customers:search', query),
  },

  // Metals
  metals: {
    getAll: () => ipcRenderer.invoke('metals:getAll'),
    create: (input: any) => ipcRenderer.invoke('metals:create', input),
    update: (id: number, input: any) => ipcRenderer.invoke('metals:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('metals:delete', id),
  },

  // Purities
  purities: {
    getAll: (metalId?: number) => ipcRenderer.invoke('purities:getAll', metalId),
    getByMetal: (metalId: number) => ipcRenderer.invoke('purities:getByMetal', metalId),
    create: (input: any) => ipcRenderer.invoke('purities:create', input),
    update: (id: number, input: any) => ipcRenderer.invoke('purities:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('purities:delete', id),
  },

  // Rates
  rates: {
    getCurrent: () => ipcRenderer.invoke('rates:getCurrent'),
    getHistory: (metalId: number, purityId: number) => ipcRenderer.invoke('rates:getHistory', metalId, purityId),
    setRate: (input: any) => ipcRenderer.invoke('rates:setRate', input),
  },

  // Product Presets
  productPresets: {
    getAll: (filters?: any) => ipcRenderer.invoke('productPresets:getAll', filters),
    getById: (id: number) => ipcRenderer.invoke('productPresets:getById', id),
    create: (input: any) => ipcRenderer.invoke('productPresets:create', input),
    update: (id: number, input: any) => ipcRenderer.invoke('productPresets:update', id, input),
    delete: (id: number) => ipcRenderer.invoke('productPresets:delete', id),
  },

  // Tax
  tax: {
    getSettings: () => ipcRenderer.invoke('tax:getSettings'),
    updateSettings: (input: any) => ipcRenderer.invoke('tax:updateSettings', input),
  },

  // Invoices
  invoices: {
    createDraft: (input: any) => ipcRenderer.invoke('invoices:createDraft', input),
    updateDraft: (draftId: string, input: any) => ipcRenderer.invoke('invoices:updateDraft', draftId, input),
    getDraft: (draftId: string) => ipcRenderer.invoke('invoices:getDraft', draftId),
    deleteDraft: (draftId: string) => ipcRenderer.invoke('invoices:deleteDraft', draftId),
    getAllDrafts: () => ipcRenderer.invoke('invoices:getAllDrafts'),
    finalizeInvoice: (draftId: string) => ipcRenderer.invoke('invoices:finalizeInvoice', draftId),
    createInvoice: (input: any) => ipcRenderer.invoke('invoices:createInvoice', input),
    getInvoice: (invoiceId: number) => ipcRenderer.invoke('invoices:getInvoice', invoiceId),
    getLatestVersion: (invoiceId: number) => ipcRenderer.invoke('invoices:getLatestVersion', invoiceId),
    getSalesHistory: (filters: any) => ipcRenderer.invoke('invoices:getSalesHistory', filters),
    createVersion: (invoiceId: number, input: any) => ipcRenderer.invoke('invoices:createVersion', invoiceId, input),
    compareVersions: (invoiceId: number, v1: number, v2: number) => ipcRenderer.invoke('invoices:compareVersions', invoiceId, v1, v2),
    cancelInvoice: (invoiceId: number, reason: string) => ipcRenderer.invoke('invoices:cancelInvoice', invoiceId, reason),
    returnInvoice: (invoiceId: number, input: any) => ipcRenderer.invoke('invoices:returnInvoice', invoiceId, input),
  },

  // Shop
  shop: {
    getSettings: () => ipcRenderer.invoke('shop:getSettings'),
    updateSettings: (input: any) => ipcRenderer.invoke('shop:updateSettings', input),
    uploadLogo: (file: any) => ipcRenderer.invoke('shop:uploadLogo', file),
    getLogoVersions: () => ipcRenderer.invoke('shop:getLogoVersions'),
  },

  // Backup
  backup: {
    createLocalBackup: () => ipcRenderer.invoke('backup:createLocalBackup'),
    restoreLocalBackup: (filename: string) => ipcRenderer.invoke('backup:restoreLocalBackup', filename),
    getCloudConfig: () => ipcRenderer.invoke('backup:getCloudConfig'),
    updateCloudConfig: (config: any) => ipcRenderer.invoke('backup:updateCloudConfig', config),
    testCloudConnection: () => ipcRenderer.invoke('backup:testCloudConnection'),
    runCloudBackup: (trigger: string) => ipcRenderer.invoke('backup:runCloudBackup', trigger),
    listCloudBackups: () => ipcRenderer.invoke('backup:listCloudBackups'),
    restoreFromCloud: (fileId: string, passphrase?: string) => ipcRenderer.invoke('backup:restoreFromCloud', fileId, passphrase),
    getBackupLogs: () => ipcRenderer.invoke('backup:getBackupLogs'),
    listBackups: () => ipcRenderer.invoke('backup:listBackups'),
    createBackup: () => ipcRenderer.invoke('backup:createBackup'),
    deleteBackup: (filename: string) => ipcRenderer.invoke('backup:deleteBackup', filename),
    getSettings: () => ipcRenderer.invoke('backup:getSettings'),
    updateSettings: (input: any) => ipcRenderer.invoke('backup:updateSettings', input),
  },

  // Templates
  templates: {
    getTemplates: (language: string) => ipcRenderer.invoke('templates:getTemplates', language),
    saveTemplate: (language: string, content: string) => ipcRenderer.invoke('templates:saveTemplate', language, content),
    getDefaultTemplate: (language: string) => ipcRenderer.invoke('templates:getDefaultTemplate', language),
  },

  // Audit
  audit: {
    getLogs: (filters: any) => ipcRenderer.invoke('audit:getLogs', filters),
    exportLogs: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('audit:exportLogs', dateFrom, dateTo),
    purgeOldLogs: (beforeDate: string) => ipcRenderer.invoke('audit:purgeOldLogs', beforeDate),
  },

  // Payment Methods
  paymentMethods: {
    getAll: () => ipcRenderer.invoke('paymentMethods:getAll'),
    create: (input: any) => ipcRenderer.invoke('paymentMethods:create', input),
    update: (code: string, input: any) => ipcRenderer.invoke('paymentMethods:update', code, input),
    delete: (code: string) => ipcRenderer.invoke('paymentMethods:delete', code),
  },

  // Rendering
  rendering: {
    renderInvoiceToHTML: (invoiceId: number, versionNumber?: number) => ipcRenderer.invoke('rendering:renderInvoiceToHTML', invoiceId, versionNumber),
    printInvoice: (invoiceId: number, versionNumber?: number) => ipcRenderer.invoke('rendering:printInvoice', invoiceId, versionNumber),
    printInvoiceToPDF: (invoiceId: number, versionNumber?: number, outputPath?: string) => ipcRenderer.invoke('rendering:printInvoiceToPDF', invoiceId, versionNumber, outputPath),
    printInvoicePreview: (invoiceId: number, versionNumber?: number) => ipcRenderer.invoke('rendering:printInvoicePreview', invoiceId, versionNumber),
  },

  // Utility
  utils: {
    getAppVersion: () => ipcRenderer.invoke('utils:getAppVersion'),
    getUserDataPath: () => ipcRenderer.invoke('utils:getUserDataPath'),
  },
});

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: {
      auth: AuthAPI;
      customers: CustomersAPI;
      metals: MetalsAPI;
      purities: PuritiesAPI;
      rates: RatesAPI;
      productPresets: ProductPresetsAPI;
      tax: TaxAPI;
      invoices: InvoiceAPI;
      shop: ShopAPI;
      backup: BackupAPI;
      templates: TemplateAPI;
      audit: AuditAPI;
      paymentMethods: PaymentMethodsAPI;
      rendering: RenderingAPI;
      utils: {
        getAppVersion: () => Promise<string>;
        getUserDataPath: () => Promise<string>;
      };
    };
  }
}