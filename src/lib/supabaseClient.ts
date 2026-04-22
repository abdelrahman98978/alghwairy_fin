import { createClient } from '@supabase/supabase-js';

/**
 * Sovereign Cloud Bridge (Supabase REST)
 * جسر المزامنة السحابي - يعمل عبر واجهة البرمجة مباشرة لضمان الخفة والسيادة
 */

let _supabase: any = null;

export const getSupabase = () => {
  if (_supabase) return _supabase;
  
  const url = localStorage.getItem('sov_supabase_url') || '';
  const key = localStorage.getItem('sov_supabase_key') || '';
  
  if (!url || !key) return null;
  
  try {
    _supabase = createClient(url, key);
    return _supabase;
  } catch (err) {
    console.error('Supabase Initialization Error:', err);
    return null;
  }
};

// Exporting a proxy or a dummy object is safer than null for existing imports
export const supabase = new Proxy({} as any, {
  get: (_target, prop) => {
    const client = getSupabase();
    if (!client) {
      console.warn(`Supabase client not initialized. Attempted to access: ${String(prop)}`);
      
      // Recursive dummy chain that returns itself for any access or call
      const createDummy = (): any => {
        const dummy: any = (..._args: any[]) => createDummy();
        
        // Add specific chainable methods and promise behavior
        Object.assign(dummy, {
          from: () => dummy,
          select: () => dummy,
          upsert: () => dummy,
          insert: () => dummy,
          update: () => dummy,
          delete: () => dummy,
          eq: () => dummy,
          single: () => dummy,
          order: () => dummy,
          limit: () => dummy,
          then: (onfulfilled: any) => 
            Promise.resolve({ data: null, error: new Error('Supabase not configured') }).then(onfulfilled)
        });

        // Use Proxy to make the dummy object infinitely deep
        return new Proxy(dummy, {
          get: (t, p) => {
            if (p === 'then') return t.then;
            if (p in t) return t[p];
            return createDummy();
          }
        });
      };

      const dummy = createDummy();
      return typeof prop === 'string' && ['from', 'auth', 'storage'].includes(prop) 
        ? (['auth', 'storage'].includes(prop) ? dummy : () => dummy)
        : dummy;
    }
    const value = client[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export const supabaseClient = {
  getSettings: () => {
    return {
      url: localStorage.getItem('sov_supabase_url') || '',
      key: localStorage.getItem('sov_supabase_key') || '',
      enabled: localStorage.getItem('sov_cloud_sync') === 'true'
    };
  },

  /**
   * Sync the sovereign ledger to the cloud
   * رفع السجل السيادي إلى السحابة
   */
  uploadLedger: async (data: any) => {
    const { url, key, enabled } = supabaseClient.getSettings();
    if (!enabled || !url || !key) return;

    try {
      const response = await fetch(`${url}/rest/v1/sovereign_sync?select=*`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: 'main_ledger',
          data: data,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error(await response.text());
      console.log('Cloud Sync: Ledger uploaded successfully');
      return true;
    } catch (err) {
      console.error('Cloud Sync Upload Failure:', err);
      return false;
    }
  },

  /**
   * Download the sovereign ledger from the cloud
   * تحميل السجل السيادي من السحابة
   */
  downloadLedger: async () => {
    const { url, key, enabled } = supabaseClient.getSettings();
    if (!enabled || !url || !key) return null;

    try {
      const response = await fetch(`${url}/rest/v1/sovereign_sync?id=eq.main_ledger`, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error(await response.text());
      const result = await response.json();
      return result.length > 0 ? result[0].data : null;
    } catch (err) {
      console.error('Cloud Sync Download Failure:', err);
      return null;
    }
  }
};
