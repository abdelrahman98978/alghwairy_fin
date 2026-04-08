import { supabase } from './supabase';

interface SyncQueueItem {
  id: string; // internal queue id
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  recordId?: string; // used for updates/deletes
  timestamp: number;
}

export const offlineSync = {
  // --- CACHE & READ ---
  async getCache(table: string) {
    const raw = localStorage.getItem(`sov_cache_${table}`);
    if (raw) return JSON.parse(raw);
    return null;
  },

  async setCache(table: string, data: any[]) {
    localStorage.setItem(`sov_cache_${table}`, JSON.stringify(data));
  },

  // Perform a read taking network into account
  async read(table: string) {
    if (navigator.onLine) {
      try {
        const { data, error } = await supabase.from(table).select('*');
        if (!error && data) {
          await this.setCache(table, data);
          return data;
        }
      } catch (e) {
         console.warn(`[Network Offline] Falling back to local cache for ${table}`);
      }
    }
    // Fallback to cache if offline
    return (await this.getCache(table)) || [];
  },

  // --- QUEUE & WRITE ---
  getQueue(): SyncQueueItem[] {
    const raw = localStorage.getItem('sov_sync_queue');
    return raw ? JSON.parse(raw) : [];
  },

  setQueue(queue: SyncQueueItem[]) {
    localStorage.setItem('sov_sync_queue', JSON.stringify(queue));
  },

  addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp'>) {
    const queue = this.getQueue();
    queue.push({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    });
    this.setQueue(queue);
  },

  // Insert offline handling
  async insert(table: string, record: any) {
    if (!record.id) record.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9);
    
    // Add to Local Cache Instantly
    const cache = (await this.getCache(table)) || [];
    cache.push(record);
    await this.setCache(table, cache);
    
    // Put to Queue
    this.addToQueue({ table, operation: 'insert', data: record });
  },

  // Update offline handling
  async update(table: string, id: string, record: any) {
    // Add to Local Cache Instantly
    const cache = (await this.getCache(table)) || [];
    const idx = cache.findIndex((c: any) => c.id === id);
    if (idx !== -1) {
      cache[idx] = { ...cache[idx], ...record };
    }
    await this.setCache(table, cache);
    
    // Put to Queue
    this.addToQueue({ table, operation: 'update', data: record, recordId: id });
  },

  // Delete offline handling
  async delete(table: string, id: string) {
    // Modify Local Cache Instantly
    const cache = (await this.getCache(table)) || [];
    const filtered = cache.filter((c: any) => c.id !== id);
    await this.setCache(table, filtered);
    
    // Put to Queue
    this.addToQueue({ table, operation: 'delete', data: null, recordId: id });
  },

  // --- BACKGROUND SYNC MECHANISM ---
  async processSyncQueue() {
    if (!navigator.onLine) return; // Only process if online
    
    const queue = this.getQueue();
    if (queue.length === 0) return;

    console.log(`[OfflineSync] Processing ${queue.length} pending operations...`);
    const successfulIds: string[] = [];

    for (const item of queue) {
      try {
        let error = null;
        if (item.operation === 'insert') {
          const res = await supabase.from(item.table).insert([item.data]);
          error = res.error;
        } else if (item.operation === 'update' && item.recordId) {
          const res = await supabase.from(item.table).update(item.data).eq('id', item.recordId);
          error = res.error;
        } else if (item.operation === 'delete' && item.recordId) {
          const res = await supabase.from(item.table).delete().eq('id', item.recordId);
          error = res.error;
        }
        
        // If there's an error like duplicate key on insert, we shouldn't infinitely loop it. 
        // We will just mark it as processed if we hit constraint errors to prevent deadlocks, 
        // or properly fail and retry next time if it's network/downtime.
        if (!error || error.code === '23505') { // 23505 is unique violation
            successfulIds.push(item.id);
        }
      } catch (e) {
        console.error('[OfflineSync] Failed to sync item', item, e);
      }
    }

    // Keep only un-successful items
    const newQueue = queue.filter(q => !successfulIds.includes(q.id));
    this.setQueue(newQueue);
    
    if (successfulIds.length > 0) {
      console.log(`[OfflineSync] Successfully pushed ${successfulIds.length} operations. Remaining operations: ${newQueue.length}`);
    }
  }
};
