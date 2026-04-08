import { localDB } from './localDB';

export const logActivity = (action: string, entity: string, entity_id: string, details?: Record<string, unknown>) => {
  try {
    localDB.insert('activity_logs', {
      user_email: 'admin@alghwairy.com', // In a real app, from auth session
      action,
      entity,
      entity_id,
      details: details || {}
    });
  } catch (err) {
    console.error('Audit Log Error:', err);
  }
};
