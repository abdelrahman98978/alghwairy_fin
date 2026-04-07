import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Lock, 
  ShieldCheck, 
  ShieldAlert, 
  Settings, 
  Plus,
  CheckCircle2,
  X,
  Fingerprint
} from 'lucide-react';
import { supabase } from '../lib/supabase';
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

export default function RolesView({ showToast, t }: RolesProps) {
  const [employees, setEmployees] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    role: 'Admin'
  });

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      setEmployees(Array.isArray(data) ? (data as UserRole[]) : []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      await fetchEmployees();
    };
    init();
  }, [fetchEmployees]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.password) {
      showToast(t.lang === 'en' ? 'Name and Password required' : 'الاسم وكلمة المرور مطلوبة', 'error');
      return;
    }

    const { error } = await supabase.from('user_roles').insert([{
      name: formData.name,
      password: formData.password,
      role: formData.role,
      user_id: Math.random().toString(36).substr(2, 9)
    }]);

    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      showToast('Success', 'success');
      setShowAddModal(false);
      setFormData({ name: '', password: '', role: 'Admin' });
      fetchEmployees();
    }
  };

  const enrollBiometric = async (user: UserRole) => {
    if (!window.PublicKeyCredential) {
      showToast(t.lang === 'en' ? 'Biometrics not supported on this device/browser' : 'الجهاز أو المتصفح لا يدعم المصادقة الحيوية', 'error');
      return;
    }

    try {
      showToast(t.lang === 'en' ? 'Initializing Sovereign Protocol...' : 'جاري بدء البروتوكول السيادي...', 'success');
      
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      
      const userId = new TextEncoder().encode(user.user_id);
      
      const options: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: { name: "Alghwairy Sovereign Ledger", id: window.location.hostname || "localhost" },
          user: {
            id: userId,
            name: user.name || user.role,
            displayName: user.name || user.role
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          timeout: 60000,
          attestation: "direct",
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "required"
          }
        }
      };

      const credential = await navigator.credentials.create(options) as PublicKeyCredential;
      
      if (credential) {
        // We store the raw credential data in the user record in our local DB
        const biometricData = {
          id: credential.id,
          rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          type: credential.type
        };

        const { error } = await supabase.from('user_roles').update({
          biometric_key: JSON.stringify(biometricData)
        }).eq('id', user.id);

        if (error) {
          showToast(t.lang === 'en' ? 'Storage Error' : 'خطأ في الربط السحابي المحلي', 'error');
        } else {
          showToast(t.lang === 'en' ? 'Biometric ID Synchronized Successfully' : 'تم ربط البصمة السيادية بنجاح', 'success');
          fetchEmployees();
        }
      }
    } catch (err: unknown) {
      console.error('WebAuthn Error:', err);
      showToast(t.lang === 'en' ? 'Verification Canceled or Failed' : 'تم إلغاء عملية البصمة أو فشل التعرف', 'error');
    }
  };

  const deleteEmployee = async (id: string, name: string) => {
    if (confirm(t.lang === 'en' ? `Are you sure you want to revoke access for ${name}?` : `هل أنت متأكد من سحب صلاحيات ${name}؟`)) {
      const { error } = await supabase.from('user_roles').delete().eq('id', id);
      if (error) {
        showToast('Error revoking access', 'error');
      } else {
        showToast(t.lang === 'en' ? 'Access Revoked' : 'تم سحب الصلاحيات بنجاح', 'success');
        fetchEmployees();
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
         <StatsCard icon={<CheckCircle2 size={24} color="var(--success)" />} label={t.lang === 'en' ? 'Active Sessions' : 'الجلسات النشطة'} value={employees.length > 0 ? 1 : 0} />
         <StatsCard icon={<ShieldAlert size={24} color="var(--error)" />} label={t.lang === 'en' ? 'Auth Alerts' : 'تنبيهات الأمان'} value="0" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr', gap: '2rem' }}>
         <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)' }}>
            <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', marginBottom: '2rem', fontWeight: 900, color: 'var(--primary)' }}>Sovereign Access Matrix</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
               <RoleItem title="System Administrator" sub="Full Access" access="100% Sovereign" icon={<Lock size={18} />} color="var(--primary)" />
               <RoleItem title="Chief Financial Officer" sub="CFO" access="Financial Controls" icon={<ShieldCheck size={18} />} color="var(--secondary)" />
               <RoleItem title="Sovereign Accountant" sub="Administrative" access="Operational" icon={<Settings size={18} />} color="var(--primary)" />
               <RoleItem title="Security Auditor" sub="Read-Only" access="Mirror Logs" icon={<Users size={18} />} color="var(--outline)" />
            </div>
         </div>

         <div className="card" style={{ background: 'var(--surface-container-low)', border: '1px solid var(--surface-container-high)', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontFamily: 'Tajawal', marginBottom: '2rem', fontWeight: 900, color: 'var(--primary)' }}>Staff Activity Hub</h3>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>Syncing...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                   {employees.map((emp, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', borderRadius: '14px', border: '1px solid white', background: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                         <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ width: 36, height: 36, background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem', color: 'var(--secondary)' }}>{emp.role.charAt(0)}</div>
                            <div>
                               <p style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0, color: 'var(--primary)' }}>{emp.name || emp.role}</p>
                               <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{emp.role} • ID: {emp.id.split('-')[0].toUpperCase()}</span>
                            </div>
                         </div>
                         <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                             <button 
                              onClick={() => enrollBiometric(emp)}
                              className="btn-executive" 
                              style={{ 
                                padding: '0.4rem 0.8rem', 
                                background: emp.biometric_key ? 'rgba(27, 94, 32, 0.1)' : 'var(--surface-container-high)', 
                                color: emp.biometric_key ? 'var(--success)' : 'var(--primary)', 
                                border: 'none', 
                                fontSize: '0.7rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                              }}
                            >
                               <Fingerprint size={14} /> 
                               {emp.biometric_key ? (t.lang === 'en' ? 'Enrolled' : 'مُفعّل') : (t.lang === 'en' ? 'Enroll Bio' : 'ربط بصمة')}
                            </button>
                            <button 
                               onClick={() => deleteEmployee(emp.id, emp.name || emp.role)}
                               className="btn-executive"
                               style={{ 
                                 padding: '0.4rem', 
                                 background: 'rgba(186, 26, 26, 0.05)', 
                                 color: 'var(--error)', 
                                 border: 'none',
                                 display: 'flex',
                                 alignItems: 'center',
                                 justifyContent: 'center'
                               }}
                             >
                                <X size={14} />
                             </button>
                            <span style={{ fontSize: '0.7rem', color: idx === 0 ? 'var(--success)' : 'var(--outline)', fontWeight: 900 }}>{idx === 0 ? 'ACTIVE' : 'IDLE'}</span>
                         </div>
                      </div>
                   ))}
                </div>
            )}
         </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '480px', padding: '3rem', position: 'relative', border: 'none' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center' }}>Assign Sovereign Role</h3>
             <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'en' ? 'Full Legal Name' : 'اسم المستخدم (الاسم الكامل)'}</label>
                    <input required type="text" placeholder={t.lang === 'en' ? 'Username / Full Name' : 'الاسم الكامل'} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'en' ? 'Secure Password' : 'كلمة المرور السرية'}</label>
                    <input required type="password" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
                 </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>Authorization Tier</label>
                   <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-executive" style={{ fontWeight: 800 }}>
                      <option value="Admin">System Administrator</option>
                      <option value="CFO">Chief Financial Officer (CFO)</option>
                      <option value="Accountant">Sovereign Accountant</option>
                      <option value="Auditor">Security Auditor</option>
                   </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                   <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, padding: '0.8rem', border: 'none', background: 'var(--surface-container-high)', color: 'var(--on-surface)', borderRadius: '12px', fontWeight: 800 }}>Cancel</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '0.8rem', border: 'none' }}>Confirm Authorization</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}

function StatsCard({ icon, label, value }: StatsCardProps) {
  return (
    <div className="card" style={{ padding: '1.5rem 2rem', borderInlineStart: '5px solid var(--primary)' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ padding: '1rem', borderRadius: '16px', background: 'var(--surface-container-high)', color: 'var(--primary)' }}>{icon}</div>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.4rem 0.8rem', borderRadius: '10px' }}>SECURE</span>
       </div>
       <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontWeight: 800, marginBottom: '0.4rem' }}>{label}</p>
       <h3 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900, color: 'var(--primary)' }}>{value}</h3>
    </div>
  );
}

interface RoleItemProps {
  title: string;
  sub: string;
  access: string;
  icon: React.ReactNode;
  color: string;
}

function RoleItem({ title, sub, access, icon, color }: RoleItemProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', border: '1px solid var(--surface-container-high)', borderRadius: '16px', transition: 'all 0.2s' }}>
       <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
          <div style={{ padding: '0.8rem', background: 'var(--surface-container-low)', borderRadius: '12px', color: color }}>{icon}</div>
          <div>
             <h4 style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0, color: 'var(--primary)' }}>{title}</h4>
             <span style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{sub}</span>
          </div>
       </div>
       <span style={{ fontSize: '0.7rem', fontWeight: 950, background: 'var(--primary)', color: 'var(--secondary)', padding: '0.5rem 1.2rem', borderRadius: '20px' }}>{access}</span>
    </div>
  );
}
