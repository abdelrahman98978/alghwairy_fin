/**
 * localDB.ts
 * قاعدة بيانات محلية تعمل على ملف JSON محفوظ على جهازك
 * تعمل بدون إنترنت - بيانات دائمة على القرص الصلب
 */

const DB_VERSION = 1;

export interface Contract {
  id: string;
  type: 'client' | 'transporter';
  entity_id: string;
  entity_name: string;
  contract_date: string;
  expiry_date: string;
  value: number;
  terms: string;
  status: 'active' | 'expired';
  transport_expenses?: number;
}

export interface Invoice {
  id: string;
  customer_id: string;
  amount: number;
  vat: number;
  total: number;
  status: string;
  reference_number: string;
  is_settlement: boolean;
  created_at: string;
  invoice_type?: 'internal' | 'final';
  statement_number?: string;
  bol_number?: string;
  operation_number?: string;
  customs_fees?: number;
  port_fees?: number;
  transport_fees?: number;
  cargo_value?: number;
  transport_expenses?: number;
  profit?: number;
  customers?: any;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference_type: string;
  reference_id: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  status: 'posted' | 'draft';
  reference?: string;
  debit_acc?: string;
  credit_acc?: string;
  is_automated?: boolean;
}

export interface LedgerAccount {
  id: string;
  code?: string;
  name: string;
  name_ar: string;
  name_en?: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
}

interface DBSchema {
  version: number;
  customers: any[];
  invoices: Invoice[];
  transactions: any[];
  expenses: any[];
  payroll: any[];
  activity_logs: any[];
  user_roles: any[];
  prepayments: any[];
  sovereign_messages: any[];
  sovereign_files: any[];
  contracts: Contract[];
  journal_entries: JournalEntry[];
  ledger_accounts: LedgerAccount[];
  sync_settings: {
    last_sync: string;
    sync_folder: string;
    device_id: string;
    auto_sync: boolean;
  };
}

const DEFAULT_DB: DBSchema = {
  version: DB_VERSION,
  customers: [],
  invoices: [],
  transactions: [],
  expenses: [],
  payroll: [],
  activity_logs: [],
  user_roles: [
    { id: '1', role: 'Admin', permissions: ['*'] }
  ],
  prepayments: [],
  sovereign_messages: [],
  sovereign_files: [],
  contracts: [],
  journal_entries: [],
  ledger_accounts: [
    { id: 'acc-1', name: 'Cash', name_ar: 'الصندوق', type: 'asset', balance: 0 },
    { id: 'acc-2', name: 'Bank', name_ar: 'البنك', type: 'asset', balance: 0 },
    { id: 'acc-3', name: 'Accounts Receivable', name_ar: 'العملاء', type: 'asset', balance: 0 },
    { id: 'acc-4', name: 'Accounts Payable', name_ar: 'الموردون', type: 'liability', balance: 0 },
    { id: 'acc-5', name: 'Sales Revenue', name_ar: 'إيرادات المبيعات', type: 'equity', balance: 0 },
    { id: 'acc-6', name: 'Expenses', name_ar: 'المصروفات', type: 'expense', balance: 0 }
  ],
  sync_settings: {
    last_sync: new Date().toISOString(),
    sync_folder: '',
    device_id: 'NODE-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    auto_sync: false
  }
};

// Paths for Electron fs access
function getDbPath(): string | null {
  try {
    if ((window as any).require) {
      const path = (window as any).require('path');
      const os = (window as any).require('os');
      const fs = (window as any).require('fs');
      const dir = path.join(os.homedir(), 'Documents', 'Alghwairy_Data');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      return path.join(dir, 'alghwairy_database.json');
    }
  } catch (e) {
    console.warn('[localDB] Not in Electron context');
  }
  return null;
}

function readFromDisk(): DBSchema {
  const dbPath = getDbPath();
  if (dbPath) {
    try {
      const fs = (window as any).require('fs');
      if (fs.existsSync(dbPath)) {
        const raw = fs.readFileSync(dbPath, 'utf-8');
        return { ...DEFAULT_DB, ...JSON.parse(raw) };
      }
    } catch (e) {
      console.error('[localDB] Failed to read from disk:', e);
    }
  }
  
  const saved = localStorage.getItem('alghwairy_db');
  return saved ? { ...DEFAULT_DB, ...JSON.parse(saved) } : DEFAULT_DB;
}

function writeToDisk(data: DBSchema) {
  const dbPath = getDbPath();
  const serialized = JSON.stringify(data, null, 2);
  
  if (dbPath) {
    try {
      const fs = (window as any).require('fs');
      fs.writeFileSync(dbPath, serialized, 'utf-8');
    } catch (e) {
      console.error('[localDB] Failed to write to disk:', e);
    }
  }
  
  localStorage.setItem('alghwairy_db', serialized);
}

export const localDB = {
  get: (collection: keyof DBSchema) => {
    const db = readFromDisk();
    return db[collection];
  },

  getAll: (collection: keyof DBSchema) => {
    return localDB.get(collection);
  },
  
  getActive: (collection: keyof DBSchema) => {
    const data = localDB.get(collection);
    if (Array.isArray(data)) {
      return data.filter((item: any) => !item.deleted_at);
    }
    return data;
  },

  insert: (collection: keyof DBSchema, item: any) => {
    const db = readFromDisk();
    const newItem = {
      ...item,
      id: item.id || Math.random().toString(36).substring(2, 11),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    (db[collection] as any[]).push(newItem);
    writeToDisk(db);
    return newItem;
  },

  addJournalEntry: (entry: Omit<JournalEntry, 'id'>) => {
    const inserted = localDB.insert('journal_entries', entry);
    
    // Update Ledger Balances
    const db = readFromDisk();
    
    // Debit side
    const debitAcc = db.ledger_accounts.find(a => a.name === entry.debit_account || a.name_ar === entry.debit_account || a.id === entry.debit_account);
    if (debitAcc) {
      debitAcc.balance += entry.amount;
    }
    
    // Credit side
    const creditAcc = db.ledger_accounts.find(a => a.name === entry.credit_account || a.name_ar === entry.credit_account || a.id === entry.credit_account);
    if (creditAcc) {
      creditAcc.balance -= entry.amount; // Basic accounting logic: Credit decreases balance for Assets, increases for Liabilities/Revenue. 
      // Simplified: Just update the numeric balance property.
    }
    
    writeToDisk(db);
    return inserted;
  },

  update: (collection: keyof DBSchema, id: string, updates: any) => {
    const db = readFromDisk();
    const index = (db[collection] as any[]).findIndex((item: any) => item.id === id);
    if (index !== -1) {
      db[collection][index] = {
        ...db[collection][index],
        ...updates,
        updated_at: new Date().toISOString()
      };
      writeToDisk(db);
      return db[collection][index];
    }
    return null;
  },

  softDelete: (collection: keyof DBSchema, id: string) => {
    return localDB.update(collection, id, { deleted_at: new Date().toISOString() });
  },

  delete: (collection: keyof DBSchema, id: string) => {
    const db = readFromDisk();
    db[collection] = (db[collection] as any[]).filter((item: any) => item.id !== id);
    writeToDisk(db);
  },
  
  clearAll: () => {
    writeToDisk(DEFAULT_DB);
  }
};

// Helper exports for backward compatibility
export const getContracts = () => Promise.resolve(localDB.getActive('contracts'));
export const addContract = (data: any) => Promise.resolve(localDB.insert('contracts', data));
export const updateContract = (data: any) => Promise.resolve(localDB.update('contracts', data.id, data));
