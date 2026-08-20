// IPC wrapper for renderer process - maps to electronAPI exposed in preload

declare global {
  interface Window {
    electronAPI: {
      auth: {
        createAdmin: (input: any) => Promise<any>;
        login: (username: string, password: string) => Promise<any>;
        refreshAccessToken: (refreshToken: string) => Promise<any>;
        logout: (refreshToken: string) => Promise<any>;
        validateToken: (token: string) => Promise<any>;
        getCurrentUser: () => Promise<any>;
        getAllUsers: () => Promise<any>;
        createUser: (input: any) => Promise<any>;
        updateUser: (userId: number, updates: any) => Promise<any>;
        deleteUser: (userId: number) => Promise<any>;
      };
      customers: {
        getAll: (filters?: any) => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (input: any) => Promise<any>;
        update: (id: number, input: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        search: (query: string) => Promise<any>;
      };
      metals: {
        getAll: () => Promise<any>;
        create: (input: any) => Promise<any>;
        update: (id: number, input: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      purities: {
        getAll: (metalId?: number) => Promise<any>;
        getByMetal: (metalId: number) => Promise<any>;
        create: (input: any) => Promise<any>;
        update: (id: number, input: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      rates: {
        getCurrent: () => Promise<any>;
        getHistory: (metalId: number, purityId: number) => Promise<any>;
        setRate: (input: any) => Promise<any>;
      };
      productPresets: {
        getAll: (filters?: any) => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (input: any) => Promise<any>;
        update: (id: number, input: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
      };
      invoices: {
        createDraft: (input: any) => Promise<any>;
        updateDraft: (draftId: number, input: any) => Promise<any>;
        getDraft: (draftId: number) => Promise<any>;
        deleteDraft: (draftId: number) => Promise<any>;
        getAllDrafts: () => Promise<any>;
        finalizeInvoice: (draftId: number) => Promise<any>;
        createInvoice: (input: any) => Promise<any>;
        getInvoice: (invoiceId: number) => Promise<any>;
        getLatestVersion: (invoiceId: number) => Promise<any>;
        getSalesHistory: (filters: any) => Promise<any>;
        getVersionHistory: (invoiceId: number) => Promise<any>;
      };
      tax: {
        getSettings: () => Promise<any>;
        updateSettings: (input: any) => Promise<any>;
        getDefault: () => Promise<any>;
      };
      shop: {
        getSettings: () => Promise<any>;
        updateSettings: (input: any) => Promise<any>;
      };
      backup: {
        createBackup: () => Promise<any>;
        listBackups: () => Promise<any>;
        restoreBackup: (fileName: string) => Promise<any>;
        deleteBackup: (fileName: string) => Promise<any>;
        getSettings: () => Promise<any>;
        updateSettings: (input: any) => Promise<any>;
      };
      templates: {
        getAll: () => Promise<any>;
        getById: (id: number) => Promise<any>;
        create: (input: any) => Promise<any>;
        update: (id: number, input: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
        getDefaultTemplate: (language: string) => Promise<string>;
      };
      audit: {
        getLogs: (filters: any) => Promise<any>;
        exportLogs: (dateFrom: string, dateTo: string) => Promise<string>;
        purgeOldLogs: (beforeDate: string) => Promise<any>;
      };
      paymentMethods: {
        getAll: () => Promise<any>;
        create: (input: any) => Promise<any>;
        update: (code: string, input: any) => Promise<any>;
        delete: (code: string) => Promise<any>;
      };
      users: {
        getAll: () => Promise<any>;
        create: (input: any) => Promise<any>;
        update: (userId: number, updates: any) => Promise<any>;
        delete: (userId: number) => Promise<any>;
      };
    };
  }
}

// Export typed invoke functions for each API namespace
export const ipc = {
  auth: {
    createAdmin: (input: any) => window.electronAPI.auth.createAdmin(input),
    login: (username: string, password: string) => window.electronAPI.auth.login(username, password),
    refreshAccessToken: (refreshToken: string) => window.electronAPI.auth.refreshAccessToken(refreshToken),
    logout: (refreshToken: string) => window.electronAPI.auth.logout(refreshToken),
    validateToken: (token: string) => window.electronAPI.auth.validateToken(token),
    getCurrentUser: () => window.electronAPI.auth.getCurrentUser(),
    getAllUsers: () => window.electronAPI.auth.getAllUsers(),
    createUser: (input: any) => window.electronAPI.auth.createUser(input),
    updateUser: (userId: number, updates: any) => window.electronAPI.auth.updateUser(userId, updates),
    deleteUser: (userId: number) => window.electronAPI.auth.deleteUser(userId),
  },
  customers: {
    getAll: (filters?: any) => window.electronAPI.customers.getAll(filters),
    getById: (id: number) => window.electronAPI.customers.getById(id),
    create: (input: any) => window.electronAPI.customers.create(input),
    update: (id: number, input: any) => window.electronAPI.customers.update(id, input),
    delete: (id: number) => window.electronAPI.customers.delete(id),
    search: (query: string) => window.electronAPI.customers.search(query),
  },
  metals: {
    getAll: () => window.electronAPI.metals.getAll(),
    create: (input: any) => window.electronAPI.metals.create(input),
    update: (id: number, input: any) => window.electronAPI.metals.update(id, input),
    delete: (id: number) => window.electronAPI.metals.delete(id),
  },
  purities: {
    getAll: (metalId?: number) => window.electronAPI.purities.getAll(metalId),
    getByMetal: (metalId: number) => window.electronAPI.purities.getByMetal(metalId),
    create: (input: any) => window.electronAPI.purities.create(input),
    update: (id: number, input: any) => window.electronAPI.purities.update(id, input),
    delete: (id: number) => window.electronAPI.purities.delete(id),
  },
  rates: {
    getCurrent: () => window.electronAPI.rates.getCurrent(),
    getHistory: (metalId: number, purityId: number) => window.electronAPI.rates.getHistory(metalId, purityId),
    setRate: (input: any) => window.electronAPI.rates.setRate(input),
  },
  productPresets: {
    getAll: (filters?: any) => window.electronAPI.productPresets.getAll(filters),
    getById: (id: number) => window.electronAPI.productPresets.getById(id),
    create: (input: any) => window.electronAPI.productPresets.create(input),
    update: (id: number, input: any) => window.electronAPI.productPresets.update(id, input),
    delete: (id: number) => window.electronAPI.productPresets.delete(id),
  },
  invoices: {
    createDraft: (input: any) => window.electronAPI.invoices.createDraft(input),
    updateDraft: (draftId: number, input: any) => window.electronAPI.invoices.updateDraft(draftId, input),
    getDraft: (draftId: number) => window.electronAPI.invoices.getDraft(draftId),
    deleteDraft: (draftId: number) => window.electronAPI.invoices.deleteDraft(draftId),
    getAllDrafts: () => window.electronAPI.invoices.getAllDrafts(),
    finalizeInvoice: (draftId: number) => window.electronAPI.invoices.finalizeInvoice(draftId),
    createInvoice: (input: any) => window.electronAPI.invoices.createInvoice(input),
    getInvoice: (invoiceId: number) => window.electronAPI.invoices.getInvoice(invoiceId),
    getLatestVersion: (invoiceId: number) => window.electronAPI.invoices.getLatestVersion(invoiceId),
    getSalesHistory: (filters: any) => window.electronAPI.invoices.getSalesHistory(filters),
    getVersionHistory: (invoiceId: number) => window.electronAPI.invoices.getVersionHistory(invoiceId),
  },
  tax: {
    getSettings: () => window.electronAPI.tax.getSettings(),
    updateSettings: (input: any) => window.electronAPI.tax.updateSettings(input),
    getDefault: () => window.electronAPI.tax.getDefault(),
  },
  shop: {
    getSettings: () => window.electronAPI.shop.getSettings(),
    updateSettings: (input: any) => window.electronAPI.shop.updateSettings(input),
  },
  backup: {
    createBackup: () => window.electronAPI.backup.createLocalBackup(),
    listBackups: () => window.electronAPI.backup.listBackups(),
    restoreBackup: (fileName: string) => window.electronAPI.backup.restoreLocalBackup(fileName),
    deleteBackup: (fileName: string) => window.electronAPI.backup.deleteBackup(fileName),
    getSettings: () => window.electronAPI.backup.getSettings(),
    updateSettings: (input: any) => window.electronAPI.backup.updateSettings(input),
  },
  templates: {
    getAll: () => window.electronAPI.templates.getTemplates("en"),
    getById: (id: number) => window.electronAPI.templates.getById(id),
    create: (input: any) => window.electronAPI.templates.saveTemplate(input.language, input.content),
    update: (id: number, input: any) => window.electronAPI.templates.update(id, input),
    delete: (id: number) => window.electronAPI.templates.delete(id),
    getDefaultTemplate: (language: string) => window.electronAPI.templates.getDefaultTemplate(language),
  },
  audit: {
    getLogs: (filters: any) => window.electronAPI.audit.getLogs(filters),
    exportLogs: (dateFrom: string, dateTo: string) => window.electronAPI.audit.exportLogs(dateFrom, dateTo),
    purgeOldLogs: (beforeDate: string) => window.electronAPI.audit.purgeOldLogs(beforeDate),
  },
  paymentMethods: {
    getAll: () => window.electronAPI.paymentMethods.getAll(),
    create: (input: any) => window.electronAPI.paymentMethods.create(input),
    update: (code: string, input: any) => window.electronAPI.paymentMethods.update(code, input),
    delete: (code: string) => window.electronAPI.paymentMethods.delete(code),
  },
  users: {
    getAll: () => window.electronAPI.users.getAll(),
    create: (input: any) => window.electronAPI.users.create(input),
    update: (userId: number, updates: any) => window.electronAPI.users.update(userId, updates),
    delete: (userId: number) => window.electronAPI.users.delete(userId),
  },
};

// Helper for dynamic channel invocation (fallback)
export async function invokeIpc<T>(channel: string, ...args: any[]): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI) {
    // Parse channel like "auth:login" to call window.electronAPI.auth.login()
    const [namespace, method] = channel.split(':');
    if (namespace && method && window.electronAPI[namespace as keyof typeof window.electronAPI]) {
      const api = window.electronAPI[namespace as keyof typeof window.electronAPI] as any;
      if (api[method]) {
        return api[method](...args);
      }
    }
  }
  return Promise.reject(new Error(`IPC not available or unknown channel: ${channel}`));
}