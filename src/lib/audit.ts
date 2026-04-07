import { supabase } from './supabase';

export const logActivity = async (action: string, entity: string, entity_id: string, details?: Record<string, unknown>) => {
  try {
    const { error } = await supabase.from('activity_logs').insert([
      {
        user_email: 'admin@alghwairy.com', // In a real app, from auth session
        action,
        entity,
        entity_id,
        details: details || {}
      }
    ]);
    
    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};
