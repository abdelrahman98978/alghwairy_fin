
/**
 * Sovereign Cloud Bridge (Supabase REST)
 * جسر المزامنة السحابي - يعمل عبر واجهة البرمجة مباشرة لضمان الخفة والسيادة
 */

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
