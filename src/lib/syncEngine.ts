import { localDB } from './localDB';
import { supabaseClient } from './supabaseClient';

/**
 * Sovereign Sync Engine
 * محرك التزامن السيادي - يعمل عبر الشبكة المحلية (LAN) والسحابة (Cloud)
 */

export const syncEngine = {
  /**
   * Start the sync watcher
   * يبدأ مراقبة التزامن عبر المجلد المشترك والسحابة
   */
  start: () => {
    const settings = localDB.get('sync_settings');
    const cloudSettings = supabaseClient.getSettings();
    
    if (!settings?.auto_sync && !cloudSettings.enabled) return;

    // Initial cloud pull if in browser (web mode)
    if (!(window as any).process) {
      syncEngine.pullFromCloud();
    }

    // Check every 60 seconds for cloud/LAN sync
    setInterval(async () => {
       await syncEngine.processSync();
    }, 60000);
  },

  /**
   * Pull data from cloud (specifically for browser access)
   */
  pullFromCloud: async () => {
    console.log('Cloud Sync: Pulling latest ledger...');
    const cloudData = await supabaseClient.downloadLedger();
    if (cloudData) {
      // Merge logic: Simple overwrite for now as this is a sovereign single-node focus
      localStorage.setItem('alghwairy_db', JSON.stringify(cloudData));
      console.log('Cloud Sync: Local database updated from cloud.');
      // Force reload or state update might be needed here depending on App.tsx structure
    }
  },

  /**
   * Manually trigger sync pulse
   */
  processSync: async () => {
    const settings = localDB.get('sync_settings');
    const cloudSettings = supabaseClient.getSettings();

    // 1. LAN Sync (Electron only)
    if (settings?.sync_folder && (window as any).require) {
      try {
        const fs = (window as any).require('fs');
        const path = (window as any).require('path');
        const pulseFile = path.join(settings.sync_folder, `node_${settings.device_id}_pulse.json`);
        fs.writeFileSync(pulseFile, JSON.stringify({
          device_id: settings.device_id,
          timestamp: new Date().toISOString(),
          version: localDB.get('version')
        }));
      } catch (err) {
        console.error('LAN Sync Failure:', err);
      }
    }

    // 2. Cloud Sync
    if (cloudSettings.enabled) {
      const fullData = JSON.parse(localStorage.getItem('alghwairy_db') || '{}');
      await supabaseClient.uploadLedger(fullData);
    }

    localDB.update('sync_settings', 'settings', { last_sync: new Date().toISOString() });
  },

  /**
   * Prepare a hand-off packet (Manual Export)
   */
  generateSyncPacket: () => {
    return localDB.exportJSON();
  }
};
