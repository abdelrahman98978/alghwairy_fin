import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Real Supabase Client (Primary)
export const supabase = (supabaseUrl && supabaseUrl !== 'https://your-project-id.supabase.co') 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (new (class LocalSovereignClient {
      // Mock implementation for offline/local-only mode
      private getTableData(table: string): DatabaseRow[] {
        const raw = localStorage.getItem(`sov_db_${table}`);
        try { return raw ? JSON.parse(raw) : []; } catch { return []; }
      }

      private setTableData(table: string, data: DatabaseRow[]) {
        localStorage.setItem(`sov_db_${table}`, JSON.stringify(data));
      }

      async clearAll() {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sov_db_')) localStorage.removeItem(key);
        });
        return { error: null };
      }

      from(table: string) {
        let dataset = this.getTableData(table);
        const queryBuilder: any = {
          select: (query: string = '*') => {
            if (query && query.includes('(*)')) {
              const relation = query.match(/(\w+)\(\*\)/);
              if (relation) {
                const relTable = relation[1];
                const relData = this.getTableData(relTable);
                dataset = dataset.map(row => {
                  const fk = relTable.endsWith('s') ? relTable.slice(0, -1) + '_id' : relTable + '_id';
                  return { ...row, [relTable]: relData.find(r => r.id === row[fk]) || null };
                });
              }
            }
            return queryBuilder;
          },
          eq: (col: string, val: any) => { dataset = dataset.filter(r => r[col] === val); return queryBuilder; },
          neq: (col: string, val: any) => { dataset = dataset.filter(r => r[col] !== val); return queryBuilder; },
          order: (col: string, { ascending = true } = {}) => {
            dataset.sort((a, b) => {
              const valA = a[col] || '';
              const valB = b[col] || '';
              return ascending ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
            });
            return queryBuilder;
          },
          limit: (n: number) => { dataset = dataset.slice(0, n); return queryBuilder; },
          insert: (rows: any) => {
            const rowArray = Array.isArray(rows) ? rows : [rows];
            const currentAll = this.getTableData(table);
            const newRows = rowArray.map(r => ({ ...r, id: r.id || Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() }));
            this.setTableData(table, [...currentAll, ...newRows]);
            dataset = newRows;
            return queryBuilder;
          },
          update: (updates: any) => ({
            eq: async (col: string, val: any) => {
              const all = this.getTableData(table);
              const updated = all.map(r => r[col] === val ? { ...r, ...updates } : r);
              this.setTableData(table, updated);
              return { data: updated, error: null };
            }
          }),
          delete: () => ({
            eq: async (col: string, val: any) => {
              const all = this.getTableData(table);
              const filtered = all.filter(r => r[col] !== val);
              this.setTableData(table, filtered);
              return { data: filtered, error: null };
            }
          }),
          then: (resolve: any) => resolve({ data: dataset, error: null, count: dataset.length })
        };
        return queryBuilder;
      }
    })() as any);

interface DatabaseRow {
  id?: string;
  created_at?: string;
  [key: string]: any;
}
