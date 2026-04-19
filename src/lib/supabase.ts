import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing credentials. Cloud sync will be disabled.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Health check and auto-migration logic
export async function checkCloudConnection() {
  if (!supabaseUrl) return false;
  try {
    const { data, error } = await supabase.from('ledger_accounts').select('id').limit(1);
    return !error;
  } catch (e) {
    return false;
  }
}
