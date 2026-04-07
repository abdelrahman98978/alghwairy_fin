/* 
  Sovereign Offline Ledger Engine (v4) - Enterprise Grade
  Fully Isolated & Standalone
*/

interface DatabaseRow {
  id?: string;
  created_at?: string;
  [key: string]: unknown; // Use unknown for indexing flexibility
}

interface QueryResult<T = unknown> {
  data: T | null;
  error: { message: string } | null;
  count?: number;
}

interface QueryBuilder<T = unknown> {
  select: (query?: string) => QueryBuilder<T>;
  eq: (col: string, val: unknown) => QueryBuilder<T>;
  neq: (col: string, val: unknown) => QueryBuilder<T>;
  not: (col: string, op: string, val: unknown) => QueryBuilder<T>;
  gt: (col: string, val: unknown) => QueryBuilder<T>;
  lt: (col: string, val: unknown) => QueryBuilder<T>;
  in: (col: string, vals: unknown[]) => QueryBuilder<T>;
  is: (col: string, val: unknown) => QueryBuilder<T>;
  match: (obj: Record<string, unknown>) => QueryBuilder<T>;
  ilike: (col: string, pattern: string) => QueryBuilder<T>;
  contains: (col: string, val: unknown) => QueryBuilder<T>;
  order: (col: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  limit: (n: number) => QueryBuilder<T>;
  single: () => Promise<QueryResult<T>>;
  count: () => Promise<QueryResult<number>>;
  insert: (rows: DatabaseRow[] | DatabaseRow) => QueryBuilder<T>;
  update: (updates: Partial<DatabaseRow>) => {
    eq: (col: string, val: unknown) => Promise<QueryResult<T[]>>;
  };
  delete: () => {
    eq: (col: string, val: unknown) => Promise<QueryResult<T[]>>;
  };
  upsert: (rows: DatabaseRow[] | DatabaseRow) => QueryResult<T[]>;
  then: (resolve: (val: QueryResult<T[]>) => void) => void;
}

class LocalSovereignClient {
  private getTableData(table: string): DatabaseRow[] {
    const raw = localStorage.getItem(`sov_db_${table}`);
    try {
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setTableData(table: string, data: DatabaseRow[]) {
    localStorage.setItem(`sov_db_${table}`, JSON.stringify(data));
  }

  async clearAll() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sov_db_')) {
        localStorage.removeItem(key);
      }
    });
    return { error: null };
  }

  from<T = unknown>(table: string) {
    let dataset = this.getTableData(table);

    const queryBuilder: QueryBuilder<T> = {
      select: (query: string = '*'): QueryBuilder<T> => {
        if (query.includes('(*)')) {
          const relation = query.match(/(\w+)\(\*\)/);
          if (relation) {
            const relTable = relation[1];
            const relData = this.getTableData(relTable);
            dataset = dataset.map(row => {
               const fk = relTable.endsWith('s') ? relTable.slice(0, -1) + '_id' : relTable + '_id';
               return {
                 ...row,
                 [relTable]: relData.find(r => r.id === row[fk]) || null
               };
            });
          }
        }
        return queryBuilder;
      },

      eq: (col: string, val: unknown) => {
        dataset = dataset.filter(r => r[col] === val);
        return queryBuilder;
      },

      neq: (col: string, val: unknown) => {
        dataset = dataset.filter(r => r[col] !== val);
        return queryBuilder;
      },

      not: (col: string, op: string, val: unknown) => {
        if (op === 'is') {
          if (val === null) {
             dataset = dataset.filter(r => r[col] != null);
          } else {
             dataset = dataset.filter(r => r[col] !== val);
          }
        } else if (op === 'eq') {
          dataset = dataset.filter(r => r[col] !== val);
        }
        return queryBuilder;
      },

      gt: (col: string, val: unknown) => {
        dataset = dataset.filter(r => Number(r[col]) > Number(val));
        return queryBuilder;
      },

      lt: (col: string, val: unknown) => {
        dataset = dataset.filter(r => Number(r[col]) < Number(val));
        return queryBuilder;
      },

      in: (col: string, vals: unknown[]) => {
        dataset = dataset.filter(r => vals.includes(r[col]));
        return queryBuilder;
      },

      is: (col: string, val: unknown) => {
        if (val === null) {
          dataset = dataset.filter(r => r[col] == null);
        } else {
          dataset = dataset.filter(r => r[col] === val);
        }
        return queryBuilder;
      },

      match: (obj: Record<string, unknown>) => {
        Object.keys(obj).forEach(key => {
          dataset = dataset.filter(r => r[key] === obj[key]);
        });
        return queryBuilder;
      },

      ilike: (col: string, pattern: string) => {
        const regex = new RegExp(pattern.replace(/%/g, '.*'), 'i');
        dataset = dataset.filter(r => regex.test((r[col] as string) || ''));
        return queryBuilder;
      },

      contains: (col: string, val: unknown) => {
        dataset = dataset.filter(r => {
           const colVal = r[col];
           if (Array.isArray(colVal)) return colVal.includes(val);
           return false;
        });
        return queryBuilder;
      },

      order: (col: string, { ascending = true } = {}) => {
        dataset.sort((a, b) => {
          const valA = (a[col] as string | number) || '';
          const valB = (b[col] as string | number) || '';
          if (valA < valB) return ascending ? -1 : 1;
          if (valA > valB) return ascending ? 1 : -1;
          return 0;
        });
        return queryBuilder;
      },

      limit: (n: number) => {
        dataset = dataset.slice(0, n);
        return queryBuilder;
      },

      single: async (): Promise<QueryResult<T>> => {
        return { data: (dataset[0] as unknown as T) || null, error: null };
      },

      count: async (): Promise<QueryResult<number>> => {
        return { data: dataset.length, error: null };
      },

      insert: (rows: DatabaseRow[] | DatabaseRow) => {
        const rowArray = Array.isArray(rows) ? rows : [rows];
        const currentAll = this.getTableData(table);
        const newRows = rowArray.map(r => ({
          ...r,
          id: r.id || Math.random().toString(36).substr(2, 9),
          created_at: new Date().toISOString()
        }));
        this.setTableData(table, [...currentAll, ...newRows]);
        dataset = newRows;
        return queryBuilder as unknown as QueryBuilder<T>;
      },

      update: (updates: Partial<DatabaseRow>) => {
        const updateMethod = {
          eq: async (col_u: string, val_u: unknown): Promise<QueryResult<T[]>> => {
            const all = this.getTableData(table);
            const updated = all.map(r => r[col_u] === val_u ? { ...r, ...updates } : r);
            this.setTableData(table, updated);
            return { data: updated as unknown as T[], error: null };
          }
        };
        return updateMethod;
      },

      delete: () => {
        const deleteMethod = {
          eq: async (col_d: string, val_d: unknown): Promise<QueryResult<T[]>> => {
            const all = this.getTableData(table);
            const filtered = all.filter(r => r[col_d] !== val_d);
            this.setTableData(table, filtered);
            return { data: filtered as unknown as T[], error: null };
          }
        };
        return deleteMethod;
      },

      upsert: (rows: DatabaseRow[] | DatabaseRow): QueryResult<T[]> => {
        const rowArray = Array.isArray(rows) ? rows : [rows];
        const all = this.getTableData(table);
        rowArray.forEach(r => {
          const idx = all.findIndex(old => old.id === r.id);
          if (idx > -1) all[idx] = { ...all[idx], ...r };
          else all.push({ ...r, id: r.id || Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString() });
        });
        this.setTableData(table, all);
        return { data: rowArray as unknown as T[], error: null };
      },

      then: (resolve: (val: QueryResult<T[]>) => void) => {
        resolve({
          data: dataset as unknown as T[],
          error: null,
          count: dataset.length
        });
      }
    };

    return queryBuilder as unknown as QueryBuilder<T>;
  }
}

export const supabase = new LocalSovereignClient();
