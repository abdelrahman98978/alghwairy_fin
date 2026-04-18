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
  signed?: boolean;
  signature_date?: string;
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
  carrier_id?: string;
  carrier?: any;
  items?: { description: string; amount: number }[];
  zatca_certified?: boolean;
  zatca_xml?: string;
  zatca_cert_date?: string;
  paid_amount?: number;
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

export interface FixedAsset {
  id: string;
  name_ar: string;
  name_en: string;
  purchase_date: string;
  purchase_value: number;
  depreciation_rate: number; // yearly percentage
  salvage_value: number;
  category: string;
  useful_life: number; // in years
  created_at: string;
  status: 'active' | 'disposed';
}

export interface Product {
  id: string;
  sku: string;
  name_ar: string;
  name_en: string;
  category: string;
  unit: string;
  purchase_price: number;
  selling_price: number;
  quantity_on_hand: number;
  min_stock_level: number;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  type: 'in' | 'out' | 'adjustment' | 'return';
  quantity: number;
  unit_price: number;
  date: string;
  reference_type: 'invoice' | 'purchase_order' | 'manual';
  reference_id: string;
  notes?: string;
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
  shipments: any[];
  tax_returns: any[];
  petty_cash: any[];
  role_permissions: any[];
  fixed_assets: FixedAsset[];
  scheduled_reports: { id: string, name: string, type: string, frequency: string, nextRun: string, status: string }[];
  sync_settings: {
    last_sync: string;
    sync_folder: string;
    device_id: string;
    auto_sync: boolean;
  };
  backups?: any[];
  audit_logs?: any[];
  products: Product[];
  inventory_movements: InventoryMovement[];
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
    { id: 'acc-3', name: 'Accounts Receivable', name_ar: 'العملاء', type: 'asset', balance: 125000 },
    { id: 'acc-4', name: 'Accounts Payable', name_ar: 'الموردون', type: 'liability', balance: 45000 },
    { id: 'acc-5', name: 'Sales Revenue', name_ar: 'إيرادات المبيعات', type: 'revenue', balance: 350000 },
    { id: 'acc-6', name: 'Expenses', name_ar: 'المصروفات', type: 'expense', balance: 85000 },
    { id: 'acc-7', name: 'Transport Expenses', name_ar: 'مصاريف النقل', type: 'expense', balance: 12000 },
    { id: 'acc-8', name: 'Depreciation Expense', name_ar: 'مصروف الإهلاك', type: 'expense', balance: 0 },
    { id: 'acc-9', name: 'Accumulated Depreciation', name_ar: 'مجمع الإهلاك', type: 'asset', balance: 0 },
    { id: 'acc-10', name: 'Customs Duties', name_ar: 'الرسوم الجمركية', type: 'expense', balance: 50000 },
    { id: 'acc-11', name: 'Port Fees', name_ar: 'رسوم الموانئ', type: 'expense', balance: 8000 }
  ],
  shipments: [],
  tax_returns: [],
  petty_cash: [],
  role_permissions: [],
  fixed_assets: [],
  scheduled_reports: [
    { id: '1', name: 'تقرير الأرباح اليومي', type: 'Profit', frequency: 'Daily (11 PM)', nextRun: '2024-05-20', status: 'Active' },
    { id: '2', name: 'كشف الأستاذ الشهري', type: 'Ledger', frequency: 'Monthly', nextRun: '2024-06-01', status: 'Active' },
    { id: '3', name: 'ميزانية المراجعة السنوية', type: 'Balance', frequency: 'Yearly', nextRun: '2025-01-01', status: 'Active' }
  ],
  sync_settings: {
    last_sync: new Date().toISOString(),
    sync_folder: '',
    device_id: 'NODE-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
    auto_sync: false
  },
  products: [],
  inventory_movements: []
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
  get: <K extends keyof DBSchema>(collection: K): DBSchema[K] => {
    const db = readFromDisk();
    return db[collection];
  },

  getAll: <K extends keyof DBSchema>(collection: K): DBSchema[K] => {
    return localDB.get(collection);
  },
  
  getActive: <K extends keyof DBSchema>(collection: K): DBSchema[K] => {
    const data = localDB.get(collection);
    if (Array.isArray(data)) {
      return data.filter((item: any) => !item.deleted_at) as any;
    }
    return data;
  },

  insert: <K extends keyof DBSchema>(collection: K, item: any): any => {
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
    
    // Update Ledger Balances with proper accounting logic
    const db = readFromDisk();
    
    const updateBalance = (accountIdentifier: string, amount: number, isDebit: boolean) => {
      const acc = db.ledger_accounts.find(a => 
        a.name === accountIdentifier || 
        a.name_ar === accountIdentifier || 
        a.id === accountIdentifier
      );
      
      if (acc) {
        // Assets and Expenses: Debit increases balance, Credit decreases balance
        // Liabilities, Equity, and Revenue: Debit decreases balance, Credit increases balance
        const isNaturalDebit = acc.type === 'asset' || acc.type === 'expense';
        
        if (isDebit) {
          acc.balance += isNaturalDebit ? amount : -amount;
        } else {
          acc.balance += isNaturalDebit ? -amount : amount;
        }
      }
    };

    updateBalance(entry.debit_account, entry.amount, true);
    updateBalance(entry.credit_account, entry.amount, false);
    
    writeToDisk(db);
    return inserted;
  },

  addInventoryMovement: (movement: Omit<InventoryMovement, 'id'>) => {
    const inserted = localDB.insert('inventory_movements', movement);
    
    // Update Product Stock Level
    const db = readFromDisk();
    const product = db.products.find(p => p.id === movement.product_id);
    if (product) {
      if (movement.type === 'in' || movement.type === 'return') {
        product.quantity_on_hand += movement.quantity;
      } else if (movement.type === 'out' || movement.type === 'adjustment') {
        product.quantity_on_hand -= movement.quantity;
      }
      product.updated_at = new Date().toISOString();
      writeToDisk(db);
    }
    
    return inserted;
  },

  findById: <K extends keyof DBSchema>(collection: K, id: string) => {
    const data = localDB.get(collection);
    if (!Array.isArray(data)) return null;
    return data.find((item: any) => item.id === id) || null;
  },

  findBy: <K extends keyof DBSchema>(collection: K, key: string, value: any) => {
    const data = localDB.get(collection);
    if (!Array.isArray(data)) return [];
    return data.filter((item: any) => item[key] === value);
  },

  update: <K extends keyof DBSchema>(collection: K, id: string, updates: any) => {

    const db = readFromDisk();
    const data = db[collection];
    if (Array.isArray(data)) {
      const index = data.findIndex((item: any) => item.id === id);
      if (index !== -1) {
        data[index] = {
          ...data[index],
          ...updates,
          updated_at: new Date().toISOString()
        };
        writeToDisk(db);
        return data[index];
      }
    } else if (typeof data === 'object' && data !== null) {
      db[collection] = {
        ...(data as any),
        ...updates
      };
      writeToDisk(db);
      return db[collection];
    }
    return null;
  },

  exportJSON: () => {
    return JSON.stringify(readFromDisk(), null, 2);
  },

  importJSON: (json: string) => {
    try {
      const data = JSON.parse(json);
      writeToDisk(data);
      return true;
    } catch {
      return false;
    }
  },

  softDelete: (collection: keyof DBSchema, id: string) => {
    return localDB.update(collection, id, { deleted_at: new Date().toISOString() });
  },

  delete: (collection: keyof DBSchema, id: string) => {
    const db = readFromDisk() as any;
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
