import { localDB } from './localDB';

/**
 * Institutional Permissions Helper
 * منظومة التحقق من الصلاحيات المؤسسية
 */

export type AppModule = 
  | 'dashboard' 
  | 'customers' 
  | 'accounting' 
  | 'invoices' 
  | 'prepayments' 
  | 'expenses' 
  | 'petty_cash' 
  | 'tax' 
  | 'payroll' 
  | 'reports' 
  | 'statements' 
  | 'security' 
  | 'roles' 
  | 'audit_logs' 
  | 'data_import' 
  | 'settings' 
  | 'trash'
  | 'contracts';

/**
 * Checks if a specific role has access to a module based on the dynamic matrix in localDB.
 */
export function hasPermission(role: string, module: AppModule): boolean {
  // Normalize role name (Admin vs admin)
  const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
  
  // Custom logic for raw system roles if they differ
  const rName = normalizedRole === 'Cfo' ? 'CFO' : normalizedRole;

  try {
    const rolesTable = localDB.getAll('role_permissions');
    const roleConfig = rolesTable.find(r => r.role === rName);
    
    if (!roleConfig) {
      // Emergency Fallback: If no config found, only Admin gets everything
      return rName === 'Admin';
    }
    
    return roleConfig.permissions.includes(module);
  } catch (e) {
    console.error('[Permissions] Check failed', e);
    return rName === 'Admin'; // Safety fallback
  }
}

/**
 * Returns the full list of modules managed by the system.
 */
export const ALL_MODULES: AppModule[] = [
  'dashboard', 
  'customers', 
  'accounting', 
  'invoices', 
  'prepayments', 
  'expenses', 
  'petty_cash', 
  'tax', 
  'payroll', 
  'reports', 
  'statements', 
  'security', 
  'roles', 
  'audit_logs', 
  'data_import', 
  'settings', 
  'trash',
  'contracts'
];
