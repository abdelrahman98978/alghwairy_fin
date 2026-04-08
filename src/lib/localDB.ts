/**
 * localDB.ts
 * قاعدة بيانات محلية تعمل على ملف JSON محفوظ على جهازك
 * تعمل بدون إنترنت - بيانات دائمة على القرص الصلب
 */

const DB_VERSION = 1;

interface DBSchema {
  version: number;
  customers: any[];
  invoices: any[];
  transactions: any[];
  expenses: any[];
  payroll: any[];
  activity_logs: any[];
  user_roles: any[];
  prepayments: any[];
  petty_cash: any[];
  backups: any[];
  tax_returns: any[];
  audit_logs: any[];
  shipments: any[];
  role_permissions: any[];
  sovereign_messages: any[];
  sovereign_files: any[];
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
  user_roles: [],
  prepayments: [],
  petty_cash: [],
  backups: [],
  tax_returns: [],
  audit_logs: [],
  shipments: [],
  role_permissions: [
    { id: 'rp-admin', role: 'Admin', permissions: ['dashboard', 'customers', 'accounting', 'invoices', 'prepayments', 'expenses', 'petty_cash', 'tax', 'payroll', 'reports', 'statements', 'security', 'roles', 'audit_logs', 'data_import', 'settings', 'trash'] },
    { id: 'rp-cfo', role: 'CFO', permissions: ['dashboard', 'customers', 'accounting', 'invoices', 'prepayments', 'expenses', 'petty_cash', 'payroll', 'reports', 'statements', 'audit_logs', 'settings'] },
    { id: 'rp-accountant', role: 'Accountant', permissions: ['dashboard', 'customers', 'invoices', 'prepayments', 'expenses', 'petty_cash', 'tax'] },
    { id: 'rp-auditor', role: 'Auditor', permissions: ['dashboard', 'customers', 'accounting', 'invoices', 'prepayments', 'expenses', 'petty_cash', 'tax', 'payroll', 'reports', 'statements', 'audit_logs'] }
  ],
  sovereign_messages: [],
  sovereign_files: [],
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
  // Fallback: localStorage
  const raw = localStorage.getItem('alghwairy_localdb');
  if (raw) {
    try { return { ...DEFAULT_DB, ...JSON.parse(raw) }; } catch {}
  }
  return { ...DEFAULT_DB };
}

function writeToDisk(db: DBSchema): void {
  const dbPath = getDbPath();
  const json = JSON.stringify(db, null, 2);
  if (dbPath) {
    try {
      const fs = (window as any).require('fs');
      fs.writeFileSync(dbPath, json, 'utf-8');
      return;
    } catch (e) {
      console.error('[localDB] Failed to write to disk:', e);
    }
  }
  // Fallback: localStorage
  localStorage.setItem('alghwairy_localdb', json);
}

// In-memory DB (loaded once at startup)
let _db: DBSchema = readFromDisk();

export const localDB = {
  // --- CORE READ/WRITE ---
  _save() {
    writeToDisk(_db);
  },

  // Get a specific table or property
  get(table: keyof DBSchema): any {
    return _db[table];
  },

  // Get all records from a table
  getAll(table: keyof DBSchema): any[] {
    if (table === 'version') return [];
    return (_db[table] as any[]) || [];
  },

  // Insert a new record
  insert(table: keyof DBSchema, record: any): any {
    if (table === 'version') return record;
    if (!record.id) record.id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substr(2);
    if (!record.created_at) record.created_at = new Date().toISOString();
    (_db[table] as any[]).push(record);
    this._save();
    return record;
  },

  // Update a record by id
  update(table: keyof DBSchema, id: string, changes: any): boolean {
    if (table === 'version') return false;
    const arr = _db[table] as any[];
    const idx = arr.findIndex(r => r.id === id);
    if (idx === -1) return false;
    arr[idx] = { ...arr[idx], ...changes, updated_at: new Date().toISOString() };
    this._save();
    return true;
  },

  // Delete a record by id (soft delete via deleted_at)
  softDelete(table: keyof DBSchema, id: string): boolean {
    return this.update(table, id, { deleted_at: new Date().toISOString() });
  },

  // Hard delete a record
  delete(table: keyof DBSchema, id: string): boolean {
    if (table === 'version') return false;
    const arr = _db[table] as any[];
    const before = arr.length;
    (_db[table] as any[]) = arr.filter(r => r.id !== id);
    this._save();
    return (_db[table] as any[]).length < before;
  },

  // Find by field
  findBy(table: keyof DBSchema, field: string, value: any): any[] {
    return this.getAll(table).filter(r => r[field] === value);
  },

  // Get active records only (not soft-deleted)
  getActive(table: keyof DBSchema): any[] {
    return this.getAll(table).filter(r => !r.deleted_at);
  },

  // Find single record by id
  findById(table: keyof DBSchema, id: string): any | null {
    return this.getAll(table).find(r => r.id === id) || null;
  },

  // Reload from disk (useful after external changes)
  reload() {
    _db = readFromDisk();
  },

  // Export entire DB as JSON string
  exportJSON(): string {
    return JSON.stringify(_db, null, 2);
  },

  // Import from JSON
  importJSON(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      _db = { ...DEFAULT_DB, ...imported };
      this._save();
      return true;
    } catch {
      return false;
    }
  },

  // Clear all data (reset to default)
  clearAll() {
    _db = { ...DEFAULT_DB };
    this._save();
  },

  // Get DB file path info
  getInfo(): { path: string | null; size: string } {
    const dbPath = getDbPath();
    let size = 'N/A';
    if (dbPath) {
      try {
        const fs = (window as any).require('fs');
        if (fs.existsSync(dbPath)) {
          const stats = fs.statSync(dbPath);
          size = (stats.size / 1024).toFixed(1) + ' KB';
        }
      } catch {}
    }
    return { path: dbPath, size };
  }
};
