import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Lock, 
  ShieldAlert, 
  Plus,
  X,
  Fingerprint,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import { biometricService } from '../lib/biometricService';
import { ALL_MODULES } from '../lib/permissions';
import type { Translations } from '../types/translations';

interface RolesProps {
  showToast: (msg: string, type?: string) => void;
  t: Translations['roles'];
}

interface UserRole {
  id: string;
  name?: string;
  password?: string;
  role: string;
  user_id: string;
  created_at: string;
  biometric_key?: string;
}

interface RolePermission {
  id: string;
  role: string;
  permissions: string[];
}

export default function RolesView({ showToast, t }: RolesProps) {
  const [employees, setEmployees] = useState<UserRole[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    role: 'Admin'
  });

  // Biometric Enrollment State
  const [isScanning, setIsScanning] = useState(false);
  const [targetUser, setTargetUser] = useState<UserRole | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  const fetchData = useCallback(() => {
    setLoading(true);
    try {
        const users = localDB.getAll('user_roles').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const perms = localDB.getAll('role_permissions');
        setEmployees(users as UserRole[]);
        setRolePermissions(perms as RolePermission[]);
    } catch {
        showToast('Error loading institutional roles', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePermission = (roleId: string, module: string) => {
    const roleConfig = rolePermissions.find(r => r.id === roleId);
    if (!roleConfig) return;

    let newPermissions = [...roleConfig.permissions];
    if (newPermissions.includes(module)) {
      newPermissions = newPermissions.filter(m => m !== module);
    } else {
      newPermissions.push(module);
    }

    try {
      localDB.update('role_permissions', roleId, { permissions: newPermissions });
      showToast(t.lang === 'ar' ? `تم تحديث صلاحية ${module}` : `Permission ${module} updated`, 'success');
      fetchData();
    } catch {
      showToast('Error updating matrix', 'error');
    }
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.password) {
      showToast(t.lang === 'en' ? 'Name and Password required' : 'الاسم وكلمة المرور مطلوبة', 'error');
      return;
    }

    try {
        localDB.insert('user_roles', {
          name: formData.name,
          password: formData.password,
          role: formData.role,
          user_id: Math.random().toString(36).substr(2, 9)
        });
        showToast(t.lang === 'ar' ? 'تمت إضافة المستخدم بنجاح' : 'User added successfully', 'success');
        setShowAddModal(false);
        setFormData({ name: '', password: '', role: 'Admin' });
        fetchData();
    } catch (err) {
        showToast('Error inserting into local database', 'error');
    }
  };

  const enrollBiometric = async (user: UserRole) => {
    if (!biometricService.isSupported()) {
        showToast(t.lang === 'en' ? 'Biometrics not supported' : 'جهازك لا يدعم البصمة', 'error');
        return;
    }
    
    setTargetUser(user);
    setIsScanning(true);
    setScanProgress(30);
    
    try {
      // Trigger REAL Windows Hello Enrollment
      const bioResult = await biometricService.enroll(user.name || 'Staff');
      setScanProgress(100);
      
      const biometricData = {
        id: bioResult.id,
        rawId: bioResult.rawId,
        type: 'windows-hello',
        date: new Date().toISOString()
      };

      localDB.update('user_roles', user.id, {
        biometric_key: JSON.stringify(biometricData)
      });

      showToast(t.lang === 'en' ? 'Biometric ID Linked' : 'تم ربط البصمة الحقيقية بنجاح', 'success');
      fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(t.lang === 'en' ? 'Enrollment Cancelled or Failed' : 'تم إلغاء أو فشل تسجيل البصمة', 'error');
    } finally {
      setIsScanning(false);
      setTargetUser(null);
      setScanProgress(0);
    }
  };

  const deleteEmployee = async (id: string, name: string) => {
    if (confirm(t.lang === 'en' ? `Are you sure you want to revoke access for ${name}?` : `هل أنت متأكد من سحب صلاحيات ${name}؟`)) {
      try {
          localDB.delete('user_roles', id);
          showToast(t.lang === 'en' ? 'Access Revoked' : 'تم سحب الصلاحيات بنجاح', 'success');
          fetchData();
      } catch {
          showToast('Error deleting from local database', 'error');
      }
    }
  };

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-executive" style={{ border: 'none' }}>
          <Plus size={18} /> {t.add_role}
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
         <StatsCard icon={<Users size={24} />} label={t.lang === 'en' ? 'Total Authorized' : 'إجمالي المخولين'} value={employees.length} />
         <StatsCard icon={<Shield size={24} color="var(--success)" />} label={t.lang === 'en' ? 'Roles Defined' : 'رتب وظيفية'} value={rolePermissions.length} />
         <StatsCard icon={<ShieldAlert size={24} color="var(--error)" />} label={t.lang === 'en' ? 'Security Alerts' : 'تنبيهات الأمان'} value="0" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
         {/* PERMISSIONS MATRIX SECTION */}
         <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)', overflowX: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                <div style={{ background: 'var(--primary)', color: 'var(--secondary)', padding: '0.8rem', borderRadius: '12px' }}><Lock size={20} /></div>
                <div>
                   <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', margin: 0, fontWeight: 900, color: 'var(--primary)' }}>مصفوفة الصلاحيات المؤسسية</h3>
                   <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>التحكم الديناميكي في مستويات الوصول لكل رتبة</p>
                </div>
            </div>

            <table className="sovereign-table" style={{ width: '100%', minWidth: '800px' }}>
                <thead>
                   <tr>
                      <th style={{ textAlign: 'right', padding: '1rem' }}>القسم / الوحدة</th>
                      {rolePermissions.map(rp => (
                        <th key={rp.id} style={{ textAlign: 'center', padding: '1rem' }}>{rp.role}</th>
                      ))}
                   </tr>
                </thead>
                <tbody>
                   {ALL_MODULES.map(module => (
                     <tr key={module} style={{ borderBottom: '1px solid var(--surface-container-high)' }}>
                        <td style={{ fontWeight: 800, padding: '1.2rem', color: 'var(--primary)', fontSize: '0.9rem' }}>
                           {module.toUpperCase().replace('_', ' ')}
                        </td>
                        {rolePermissions.map(rp => (
                          <td key={rp.id} style={{ textAlign: 'center', padding: '1rem' }}>
                             <button 
                               onClick={() => togglePermission(rp.id, module)}
                               style={{ 
                                 background: 'none', 
                                 border: 'none', 
                                 cursor: 'pointer',
                                 color: rp.permissions.includes(module) ? 'var(--success)' : 'var(--outline)',
                                 transition: 'transform 0.2s'
                               }}
                               className="btn-hover-scale"
                             >
                                {rp.permissions.includes(module) ? <Eye size={20} /> : <EyeOff size={20} />}
                             </button>
                          </td>
                        ))}
                     </tr>
                   ))}
                </tbody>
            </table>
         </div>

         {/* USER LIST SECTION */}
         <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)' }}>
            <h3 style={{ fontSize: '1.3rem', fontFamily: 'Tajawal', marginBottom: '2rem', fontWeight: 900, color: 'var(--primary)' }}>سجل المستخدمين المعتمدين</h3>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>جاري جلب البيانات...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.2rem' }}>
                   {employees.map((emp, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderRadius: '14px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                         <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ width: 44, height: 44, background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.1rem', color: 'var(--secondary)' }}>{emp.role.charAt(0)}</div>
                            <div>
                               <p style={{ fontWeight: 900, fontSize: '1rem', margin: 0, color: 'var(--primary)' }}>{emp.name || emp.role}</p>
                               <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{emp.role.toUpperCase()} • ID: {emp.id.split('-')[0].toUpperCase()}</span>
                            </div>
                         </div>
                         <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                             <button 
                               onClick={() => enrollBiometric(emp)}
                               className="btn-executive" 
                               style={{ 
                                 padding: '0.5rem', 
                                 minWidth: 'auto',
                                 background: emp.biometric_key ? 'rgba(27, 94, 32, 0.1)' : 'var(--surface-container-high)', 
                                 color: emp.biometric_key ? 'var(--success)' : 'var(--primary)', 
                                 border: 'none', 
                               }}
                               title={emp.biometric_key ? (t.lang === 'en' ? 'Biometric Enrolled' : 'البصمة مفعلة') : (t.lang === 'en' ? 'Enroll Biometrics' : 'تفعيل البصمة')}
                             >
                                <Fingerprint size={18} /> 
                             </button>
                             <button 
                                onClick={() => deleteEmployee(emp.id, emp.name || emp.role)}
                                className="btn-executive"
                                style={{ 
                                  padding: '0.5rem', 
                                  minWidth: 'auto',
                                  background: 'rgba(186, 26, 26, 0.05)', 
                                  color: 'var(--error)', 
                                  border: 'none',
                                }}
                              >
                                 <X size={18} />
                              </button>
                         </div>
                      </div>
                   ))}
                </div>
            )}
         </div>
      </div>

      {/* Biometric Enrollment Modal */}
      {isScanning && targetUser && (
        <div className="modal-overlay" style={{ background: 'rgba(5, 12, 28, 0.92)', backdropFilter: 'blur(15px)', zIndex: 2000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '4rem 3rem', textAlign: 'center', border: '1px solid rgba(212, 167, 106, 0.2)', background: 'var(--primary)' }}>
             <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 3rem' }}>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid rgba(212, 167, 106, 0.1)' }}></div>
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '4px solid var(--secondary)', borderBottomColor: 'transparent', transform: `rotate(${scanProgress * 3.6}deg)`, transition: 'transform 0.1s linear' }}></div>
                <div style={{ position: 'absolute', inset: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)' }}>
                   <Fingerprint size={60} className={scanProgress < 100 ? "pulse" : ""} />
                </div>
             </div>
             
             <h3 style={{ color: 'white', fontSize: '1.8rem', fontWeight: 950, marginBottom: '0.8rem', fontFamily: 'Tajawal' }}>
                {t.lang === 'ar' ? 'جاري الفحص الحيوي' : 'Biometric Scanning'}
             </h3>
             <p style={{ color: 'var(--secondary)', opacity: 0.8, fontSize: '1rem', fontWeight: 700, marginBottom: '3rem' }}>
                {targetUser.name || targetUser.role} • {t.lang === 'ar' ? 'بروتوكول أمن مؤسسي' : 'Institutional Protocol'}
             </p>

             <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', marginBottom: '1.5rem' }}>
                <div style={{ width: `${scanProgress}%`, height: '100%', background: 'var(--secondary)', transition: 'width 0.2s ease-out' }}></div>
             </div>
             
             <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>
                <Shield size={16} /> {scanProgress < 100 ? (t.lang === 'ar' ? 'جاري تحليل الأنماط...' : 'Analyzing Patterns...') : (t.lang === 'ar' ? 'اكتمل التحقق' : 'Verification Complete')}
             </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '480px', padding: '3rem', position: 'relative', border: 'none' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center' }}>تخصيص صلاحيات الوصول</h3>
             <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'en' ? 'Full Legal Name' : 'الاسم الكامل للمستخدم'}</label>
                    <input required type="text" placeholder={t.lang === 'en' ? 'Username / Full Name' : 'أدخل الاسم...'} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'en' ? 'Secure Password' : 'كلمة المرور'}</label>
                    <input required type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
                 </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>مرتبة الوصول</label>
                   <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-executive" style={{ fontWeight: 800 }}>
                      <option value="Admin">System Administrator</option>
                      <option value="CFO">Chief Financial Officer (CFO)</option>
                      <option value="Accountant">Executive Accountant</option>
                      <option value="Auditor">Compliance Auditor</option>
                   </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                   <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, padding: '0.8rem', border: 'none', background: 'var(--surface-container-high)', color: 'var(--on-surface)', borderRadius: '12px', fontWeight: 800 }}>إلغاء</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '0.8rem', border: 'none' }}>تأكيد الصلاحية</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ icon, label, value }: any) {
  return (
    <div className="card" style={{ padding: '1.5rem 2rem', borderInlineStart: '5px solid var(--primary)' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ padding: '1rem', borderRadius: '16px', background: 'var(--surface-container-high)', color: 'var(--primary)' }}>{icon}</div>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '10px' }}>OFFLINE</span>
       </div>
       <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontWeight: 800, marginBottom: '0.4rem' }}>{label}</p>
       <h3 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900, color: 'var(--primary)' }}>{value}</h3>
    </div>
  );
}
