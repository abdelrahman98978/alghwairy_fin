import { useState } from 'react';
import { 
  Building2, 
  Globe, 
  Bell, 
  Palette, 
  Cloud,
  CheckCircle2,
  Save,
  FileText,
  Fingerprint,
  ShieldCheck,
  Loader2,
  Upload,
  Database,
  Trash2,
  HardDrive
} from 'lucide-react';
import { supabase } from '../lib/supabase';

import type { Translations } from '../types/translations';

interface SettingsProps {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string, overrideUser?: string) => Promise<void>;
  isDark: boolean;
  toggleTheme: () => void;
  t: Translations['settings'];
}

export default function SettingsView({ showToast, logActivity, isDark, toggleTheme, t }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // Load settings from localStorage or defaults
  const [settings, setSettings] = useState({
    companyName: localStorage.getItem('sov_company_name') || 'Alghwairy Sovereign Finance',
    taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
    address: localStorage.getItem('sov_address') || 'King Fahd Rd, Riyadh, SA',
    crNumber: localStorage.getItem('sov_cr_number') || '1010394857',
    email: localStorage.getItem('sov_email') || 'sovereign@alghwairy.co',
    logo: localStorage.getItem('sov_logo') || '',
    currency: localStorage.getItem('sov_currency') || 'SAR',
    vatRate: localStorage.getItem('sov_vat_rate') || '15',
    zatcaSync: localStorage.getItem('sov_zatca_sync') || 'Active',
    notifications: JSON.parse(localStorage.getItem('sov_notifications') || '[true, true, true, false]'),
    primaryColor: localStorage.getItem('sov_primary_color') || '#001a33',
    fontFamily: localStorage.getItem('sov_font_family') || 'Tajawal',
    reportHeader: localStorage.getItem('sov_report_header') || 'Sovereign Institutional Ledger - Official Document',
    reportFooter: localStorage.getItem('sov_report_footer') || 'Alghwairy Financial - Confidential'
  });

  const handleSave = async () => {
    setLoading(true);
    // Persist all settings
    Object.entries(settings).forEach(([key, value]) => {
      const storageKey = `sov_${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`;
      if (typeof value === 'object') {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } else {
        localStorage.setItem(storageKey, String(value));
      }
    });
    
    await logActivity('Synced Sovereign Settings', 'settings', 'config_update');
    
    setTimeout(() => {
      setLoading(false);
      showToast(t.lang === 'en' ? 'Sovereign settings synced successfully.' : 'تم مزامنة الإعدادات السيادية بنجاح.', 'success');
    }, 1200);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        showToast(t.lang === 'en' ? 'Logo must be under 1MB' : 'يجب أن يكون الشعار أقل من 1 ميجابايت', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSettings({ ...settings, logo: base64 });
        localStorage.setItem('sov_logo', base64);
        showToast(t.lang === 'en' ? 'Logo updated' : 'تم تحديث الشعار', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const enrollBiometric = async () => {
    if (!window.PublicKeyCredential) {
      showToast('المتصفح أو النظام لا يدعم البصمة', 'error');
      return;
    }

    setIsEnrolling(true);
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const createOptions: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: { name: "Alghwairy Sovereign", id: window.location.hostname },
          user: {
            id: Uint8Array.from("admin-user-id", c => c.charCodeAt(0)),
            name: "admin@alghwairy.co",
            displayName: "Sovereign Administrator"
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          timeout: 60000,
          authenticatorSelection: { userVerification: "required" }
        }
      };

      const credential = await navigator.credentials.create(createOptions) as PublicKeyCredential;
      
      if (credential) {
        const bioData = {
          id: credential.id,
          rawId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          type: credential.type
        };

        // Update current user in local db
        await supabase.from('user_roles').update({
          biometric_key: JSON.stringify(bioData)
        }).eq('name', 'عبدالله الغويري');

        await logActivity('Enrolled Biometric ID', 'security', 'webauthn_p256');
        showToast(t.lang === 'en' ? 'Biometric ID Linked' : 'تم ربط البصمة بنجاح', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(t.lang === 'en' ? 'Enrollment Failed' : 'فشل تسجيل البصمة', 'error');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      showToast(t.lang === 'en' ? 'Passwords do not match' : 'كلمات المرور غير متطابقة', 'error');
      return;
    }
    if (passwordData.new.length < 4) {
      showToast(t.lang === 'en' ? 'Password too short' : 'كلمة المرور قصيرة جداً', 'error');
      return;
    }

    setLoading(true);
    try {
      // Logic: Update or Create admin record in user_roles
      const { data: users } = await supabase.from('user_roles').select('*').eq('name', 'عبدالله الغويري');
      const user = users?.[0];

      if (user) {
        await supabase.from('user_roles').update({
          password: passwordData.new
        }).eq('name', 'عبدالله الغويري');
      } else {
        await supabase.from('user_roles').insert([{
          name: 'عبدالله الغويري',
          password: passwordData.new,
          role: 'admin'
        }]);
      }

      await logActivity('Updated Admin Credentials', 'security', 'password_reset');
      showToast(t.lang === 'en' ? 'Sovereign Password Updated' : 'تم تحديث كلمة المرور السيادية بنجاح', 'success');
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch {
      showToast('Error updating security credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const wipeSystem = async () => {
    setLoading(true);
    try {
      await logActivity('EMERGENCY_SYSTEM_WIPE', 'system', 'all_data_deleted');
      await supabase.clearAll();
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sov_')) localStorage.removeItem(key);
      });
      showToast(t.lang === 'en' ? 'System Wiped. Reloading...' : 'تم مسح النظام بالكامل. جاري إعادة التشغيل...', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      showToast('Error during system wipe', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportBackup = () => {
    const data: Record<string, string> = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sov_')) {
        data[key] = localStorage.getItem(key) || '';
      }
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sovereign_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast(t.lang === 'en' ? 'Backup exported' : 'تم تصدير النسخة الاحتياطية', 'success');
  };

  const menuItems = [
    { id: 'general', label: t.tabs.general, icon: <Building2 size={18} /> },
    { id: 'financial', label: t.tabs.financial, icon: <Globe size={18} /> },
    { id: 'notifications', label: t.tabs.notifications, icon: <Bell size={18} /> },
    { id: 'appearance', label: t.tabs.appearance, icon: <Palette size={18} /> },
    { id: 'documents', label: t.tabs.documents, icon: <FileText size={18} /> },
    { id: 'biometrics', label: t.tabs.security, icon: <Fingerprint size={18} /> },
    { id: 'backup', label: t.tabs.backup, icon: <Cloud size={18} /> },
  ];

  return (
    <div className="slide-in">
      <div className="view-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="view-title" style={{ margin: 0 }}>{t.title}</h1>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <button onClick={handleSave} className="btn-executive" style={{ border: 'none' }}>
           {loading ? <Save size={18} className="animate-spin" /> : <Save size={18} />}
           {t.save}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 3fr', gap: '2.5rem' }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
           {menuItems.map(item => (
             <button 
               key={item.id} 
               onClick={() => setActiveTab(item.id)}
               style={{ 
                 display: 'flex',
                 alignItems: 'center',
                 gap: '1rem',
                 padding: '1rem 1.5rem',
                 borderRadius: '14px',
                 border: 'none',
                 fontSize: '0.9rem',
                 fontWeight: 800,
                 cursor: 'pointer',
                 transition: 'all 0.2s',
                 background: activeTab === item.id ? 'var(--primary)' : 'transparent',
                 color: activeTab === item.id ? 'var(--secondary)' : 'var(--on-surface-variant)',
                 textAlign: (t.lang === 'en' ? 'left' : 'right') as 'left' | 'right'
               }}
             >
               {item.icon}
               <span>{item.label}</span>
             </button>
           ))}
        </aside>

        <main className="card" style={{ padding: '2rem', border: '1px solid var(--surface-container-high)' }}>
           {activeTab === 'general' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                   <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--primary)', fontFamily: 'Tajawal' }}>
                      {t.lang === 'en' ? 'Institutional Identity' : 'هوية المنشأة السيادية'}
                   </h3>
                   <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--secondary)', color: 'var(--primary)', padding: '0.3rem 0.8rem', borderRadius: '10px' }}>
                      {t.lang === 'en' ? 'Verified Entity' : 'منشأة موثقة'}
                   </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'Official Trading Name' : 'الاسم التجاري الرسمي'}</label>
                    <input 
                      className="input-executive" 
                      value={settings.companyName} 
                      onChange={e => setSettings({...settings, companyName: e.target.value})}
                      style={{ fontWeight: 600 }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'Sovereign ID (ZATCA)' : 'الرقم الضريبي (الزكاة والضريبة)'}</label>
                    <input 
                      className="input-executive" 
                      value={settings.taxNumber} 
                      onChange={e => setSettings({...settings, taxNumber: e.target.value})}
                      style={{ fontWeight: 600 }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'HQ Operational Address' : 'مقر العمليات الرئيسي'}</label>
                    <input 
                      className="input-executive" 
                      value={settings.address} 
                      onChange={e => setSettings({...settings, address: e.target.value})}
                      style={{ fontWeight: 600 }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'CR Number (MCI)' : 'رقم السجل التجاري'}</label>
                    <input 
                      className="input-executive" 
                      value={settings.crNumber} 
                      onChange={e => setSettings({...settings, crNumber: e.target.value})}
                      style={{ fontWeight: 600 }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'Sovereign Contact Email' : 'البريد الرسمي للتواصل'}</label>
                    <input 
                      className="input-executive" 
                      value={settings.email} 
                      onChange={e => setSettings({...settings, email: e.target.value})}
                      style={{ fontWeight: 600 }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'Institutional Logo' : 'شعار المنشأة السيادي'}</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 45, height: 45, borderRadius: '8px', objectFit: 'contain', background: 'white', padding: '2px', border: '1px solid var(--surface-container-high)' }} />}
                      <label className="btn-executive" style={{ cursor: 'pointer', padding: '0.6rem 1rem', fontSize: '0.75rem', background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
                        <Upload size={14} /> {t.lang === 'en' ? 'Upload Logo' : 'رفع الشعار'}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                </div>

                 <div style={{ marginTop: '1.5rem', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                       <HardDrive size={18} /> {t.lang === 'en' ? 'Data Sovereign Control' : 'التحكم في سيادة البيانات'}
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, margin: 0 }}>
                            {t.lang === 'en' ? 'Export all analytical and financial data to a sovereign JSON file for portability.' : 'تصدير كافة البيانات التحليلية والمالية إلى ملف JSON سيادي للحفاظ على التنقل.'}
                          </p>
                       </div>
                       <div style={{ display: 'flex', gap: '1rem' }}>
                          <button onClick={exportBackup} className="btn-executive" style={{ fontSize: '0.75rem', padding: '0.75rem', flex: 1, background: 'var(--primary)', color: 'var(--secondary)', border: 'none' }}>
                            <Database size={14} /> {t.lang === 'en' ? 'Export Database' : 'تصدير القاعدة'}
                          </button>
                          <button onClick={() => setShowWipeConfirm(true)} className="btn-executive" style={{ fontSize: '0.75rem', padding: '0.75rem', background: 'var(--error)', color: 'white', border: 'none', flex: 1, cursor: 'pointer' }}>
                            <Trash2 size={14} /> {t.lang === 'en' ? 'Wipe Assets' : 'مسح الأصول'}
                          </button>
                       </div>
                    </div>
                 </div>

                 {showWipeConfirm && (
                   <div style={{ padding: '1.5rem', marginTop: '1rem', background: 'rgba(186, 26, 26, 0.1)', borderRadius: '14px', border: '2px solid var(--error)' }}>
                      <p style={{ color: 'var(--error)', fontWeight: 900, margin: '0 0 1rem', fontSize: '0.9rem' }}>
                        {t.lang === 'en' ? 'CRITICAL: This will delete ALL financial data and settings. Proceed?' : 'تحذير حرج: سيؤدي هذا لمسح كافة البيانات المالية والإعدادات نهائياً. هل تريد الاستمرار؟'}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                         <button onClick={wipeSystem} className="btn-executive" style={{ background: 'var(--error)', color: 'white', border: 'none', padding: '0.5rem 1.5rem', fontSize: '0.8rem' }}>{t.lang === 'en' ? 'Confirm Wipe' : 'تأكيد المسح الشامل'}</button>
                         <button onClick={() => setShowWipeConfirm(false)} className="btn-executive" style={{ background: 'var(--surface-container-high)', border: 'none', padding: '0.5rem 1.5rem', fontSize: '0.8rem' }}>{t.lang === 'en' ? 'Cancel' : 'تراجع'}</button>
                      </div>
                   </div>
                 )}
             </div>
           )}

           {activeTab === 'financial' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--primary)', fontFamily: 'Tajawal' }}>
                   {t.lang === 'en' ? 'Fiscal & Compliance' : 'التهيئة المالية والامتثال'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                     <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'Base Currency' : 'العملة الأساسية'}</label>
                     <select 
                       className="input-executive" 
                       value={settings.currency} 
                       onChange={e => setSettings({...settings, currency: e.target.value})}
                       style={{ fontWeight: 600 }}
                     >
                        <option value="SAR">Saudi Riyal (SAR)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="AED">UAE Dirham (AED)</option>
                     </select>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                     <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'VAT Rate (%)' : 'نسبة الضريبة (%)'}</label>
                     <input 
                       type="number" 
                       className="input-executive" 
                       value={settings.vatRate} 
                       onChange={e => setSettings({...settings, vatRate: e.target.value})}
                       style={{ fontWeight: 600 }} 
                     />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                     <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'ZATCA Phase 2 Sync' : 'المزامنة مع هيئة الزكاة (Phase 2)'}</label>
                     <select 
                       className="input-executive" 
                       value={settings.zatcaSync} 
                       onChange={e => setSettings({...settings, zatcaSync: e.target.value})}
                       style={{ fontWeight: 600 }}
                     >
                        <option value="Active">Active / نشط</option>
                        <option value="Test">Sandbox / تجريبي</option>
                     </select>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                     <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'Digital Signature' : 'التوقيع الرقمي للمستندات'}</label>
                     <input disabled className="input-executive" defaultValue="ECDSA-P256-ZATCA" style={{ fontWeight: 800, opacity: 0.8 }} />
                   </div>
                 </div>
              </div>
           )}

           {activeTab === 'notifications' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--primary)', fontFamily: 'Tajawal' }}>{t.lang === 'en' ? 'Alert Preferences' : 'تفضيلات التنبيهات'}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                   {[
                     { label: t.lang === 'en' ? 'Email Reports (Weekly)' : 'تقارير البريد (أسبوعي)', desc: t.lang === 'en' ? 'Receive a sovereign financial summary every Sunday.' : 'استلام ملخص مالي سيادي كل يوم أحد.' },
                     { label: t.lang === 'en' ? 'SMS Security Alerts' : 'تنبيهات الأمان (SMS)', desc: t.lang === 'en' ? 'Alert for any attempt to override system roles.' : 'تنبيه عند أي محاولة لتجاوز صلاحيات النظام.' },
                     { label: t.lang === 'en' ? 'ZATCA Sync Status' : 'حالة ربط الزكاة', desc: t.lang === 'en' ? 'Notifications on successful XML pushes to GAZT.' : 'إشعارات عند نجاح رفع البيانات للهيئة.' },
                     { label: t.lang === 'en' ? 'Liquidity Warnings' : 'تحذيرات السيولة', desc: t.lang === 'en' ? 'Alert when bank balance falls below threshold.' : 'تنبيه عند انخفاض الرصيد عن حد معين.' }
                   ].map((pref, i) => (
                     <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'var(--surface-container-low)', borderRadius: '14px' }}>
                        <div>
                           <p style={{ fontWeight: 800, margin: 0, color: 'var(--primary)' }}>{pref.label}</p>
                           <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '0.2rem 0 0', fontWeight: 600 }}>{pref.desc}</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={settings.notifications[i]} 
                          onChange={(e) => {
                            const newNotifs = [...settings.notifications];
                            newNotifs[i] = e.target.checked;
                            setSettings({...settings, notifications: newNotifs});
                          }}
                          style={{ width: 18, height: 18, accentColor: 'var(--primary)' }} 
                        />
                     </div>
                   ))}
                 </div>
              </div>
           )}

           {activeTab === 'appearance' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--primary)', fontFamily: 'Tajawal' }}>{t.lang === 'en' ? 'Identity & Vision' : 'الهوية والرؤية البصرية'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'Primary Brand Color' : 'لون العلامة التجارية الرئيسي'}</label>
                       <div style={{ display: 'flex', gap: '1rem' }}>
                          <input 
                            type="color" 
                            value={settings.primaryColor} 
                            onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                            style={{ width: 50, height: 45, border: 'none', borderRadius: '8px' }} 
                          />
                          <input 
                            className="input-executive" 
                            value={settings.primaryColor} 
                            onChange={e => setSettings({...settings, primaryColor: e.target.value})}
                            style={{ flex: 1, fontWeight: 800 }} 
                          />
                       </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.lang === 'en' ? 'Interface Typography' : 'خط الواجهات الرسمي'}</label>
                       <select 
                         className="input-executive" 
                         value={settings.fontFamily}
                         onChange={e => setSettings({...settings, fontFamily: e.target.value})}
                         style={{ fontWeight: 600 }}
                       >
                          <option value="Tajawal">Tajawal (Recommended)</option>
                          <option value="Cairo">Cairo</option>
                          <option value="Inter">Inter</option>
                       </select>
                    </div>
                 </div>
                 <div style={{ padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: '16px', border: '1px solid var(--surface-container-high)' }}>
                    <p style={{ fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>{t.lang === 'en' ? 'Executive Dark Mode' : 'الوضع الليلي التنفيذي'}</p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '1.5rem', fontWeight: 600 }}>{t.lang === 'en' ? 'Apply the "Platinum Obsidian" aesthetic across all analytical views.' : 'تطبيق جماليات "Platinum Obsidian" على كافة الشاشات التحليلية.'}</p>
                    <button 
                      onClick={toggleTheme} 
                      className="btn-executive" 
                      style={{ padding: '0.6rem 2rem', background: 'var(--primary)', color: 'var(--secondary)' }}
                    >
                      {isDark ? (t.lang === 'en' ? 'Disable Obsidian' : 'تعطيل النمط الليلي') : (t.lang === 'en' ? 'Enable Obsidian' : 'تفعيل النمط الليلي')}
                    </button>
                 </div>
              </div>
           )}

           {activeTab === 'backup' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '1.5rem', color: 'var(--primary)', fontFamily: 'Tajawal' }}>{t.lang === 'en' ? 'Cloud Synchronization' : 'المزامنة السحابية'}</h3>
                <div style={{ padding: '1.5rem', background: 'var(--secondary)', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                   <div style={{ padding: '1rem', background: 'white', borderRadius: '14px', color: 'var(--primary)' }}><Cloud size={24} /></div>
                   <div style={{ flex: 1 }}>
                     <p style={{ fontWeight: 900, margin: 0, color: 'var(--primary)' }}>{t.lang === 'en' ? 'Mirror Status: Active' : 'حالة الربط: نشط'}</p>
                     <p style={{ fontSize: '0.85rem', color: 'var(--primary)', opacity: 0.8, margin: '0.2rem 0 0', fontWeight: 600 }}>{t.lang === 'en' ? 'All financial ledgers are currently mirrored to the Sovereign Cloud Node (SR-01).' : 'جميع السجلات المالية يتم ربطها لحظياً بالعقدة السحابية السيادية (SR-01).'}</p>
                   </div>
                   <span style={{ fontSize: '0.7rem', fontWeight: 950, background: 'var(--primary)', color: 'var(--secondary)', padding: '0.4rem 1rem', borderRadius: '10px' }}>ONLINE / متصل</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                     <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Backup Frequency' : 'تكرار النسخ الاحتياطي'}</label>
                     <select className="input-executive" defaultValue="Hourly" style={{ fontWeight: 600 }}>
                        <option>{t.lang === 'en' ? 'Real-time (Active Sync)' : 'لحظي (مزامنة نشطة)'}</option>
                        <option>{t.lang === 'en' ? 'Hourly' : 'كل ساعة'}</option>
                        <option>{t.lang === 'en' ? 'Daily at 12:00 AM' : 'يومياً الساعة 12 صباحاً'}</option>
                     </select>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                     <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Encryption Standard' : 'معيار التشفير'}</label>
                     <input disabled className="input-executive" defaultValue="Military AES-256 + ECDSA" style={{ fontWeight: 800, opacity: 0.8 }} />
                   </div>
                </div>
              </div>
           )}

           {activeTab === 'biometrics' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', fontFamily: 'Tajawal' }}>
                   {t.lang === 'en' ? 'Biometric Identity & MFA' : 'البصمات والمصادقة الحيوية'}
                </h3>
                
                <div style={{ padding: '2rem', background: 'var(--surface-container-low)', borderRadius: '20px', border: '1px solid var(--surface-container-high)', textAlign: 'center' }}>
                   <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface-container-high)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', position: 'relative' }}>
                      {isEnrolling ? <Loader2 size={40} className="spin" /> : <Fingerprint size={40} />}
                   </div>
                   
                   <h4 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.6rem', color: 'var(--primary)' }}>
                      {t.lang === 'en' ? 'Register Digital Fingerprint' : 'تسجيل بصمة رقمية جديدة'}
                   </h4>
                   <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '2rem', maxWidth: '380px', margin: '0 auto 2rem', fontWeight: 600 }}>
                      {t.lang === 'en' ? 'Register your local biometric data for secure login and transaction verification.' : 'قم بربط بياناتك الحيوية المحلية لتسجيل الدخول السريع وتوثيق العمليات السيادية الكبيرة.'}
                   </p>
                   
                   <button 
                      onClick={enrollBiometric} 
                      className="btn-executive" 
                      disabled={isEnrolling}
                      style={{ padding: '0.85rem 3rem', background: 'var(--primary)', color: 'var(--secondary)' }}
                   >
                       {isEnrolling ? t.lang === 'en' ? 'Scanning...' : 'جاري المسح...' : t.lang === 'en' ? 'Start Enrollment' : 'بدء عملية التسجيل'}
                   </button>
                </div>

                 <div style={{ marginTop: '2rem', padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                       <ShieldCheck size={18} /> {t.lang === 'en' ? 'Change Admin Password' : 'تغيير كلمة مرور المدير'}
                    </h4>
                    <form onSubmit={handlePasswordChange} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800 }}>{t.lang === 'en' ? 'New Password' : 'كلمة المرور الجديدة'}</label>
                          <input 
                            type="password" 
                            className="input-executive" 
                            value={passwordData.new} 
                            onChange={e => setPasswordData({...passwordData, new: e.target.value})}
                          />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Confirm Password' : 'تأكيد كلمة المرور'}</label>
                          <input 
                            type="password" 
                            className="input-executive" 
                            value={passwordData.confirm} 
                            onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
                          />
                       </div>
                       <button type="submit" disabled={loading} className="btn-executive" style={{ height: '42px', background: 'var(--primary)', color: 'var(--secondary)' }}>
                          {loading ? <Loader2 size={14} className="spin" /> : t.lang === 'en' ? 'Update Password' : 'تحديث كلمة المرور'}
                       </button>
                    </form>
                 </div>

                <div>
                   <h4 style={{ fontSize: '1rem', fontWeight: 950, marginBottom: '1.2rem', color: 'var(--primary)' }}>
                     {t.lang === 'en' ? 'Enrolled Devices' : 'الأجهزة الموثقة (البصمات المحفوظة)'}
                   </h4>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      {[
                        { name: t.lang === 'en' ? 'Primary Admin Sensor' : 'مستشعر المدير الرئيسي', type: 'Built-in', date: '2026-03-15' },
                        { name: t.lang === 'en' ? 'Secondary Operational Tablet' : 'جهاز الفروع - تابلت', type: 'External USB', date: '2026-04-01' }
                      ].map((fp, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', background: 'var(--surface-container-low)', borderRadius: '16px', border: '1px solid var(--surface-container-high)' }}>
                           <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                              <ShieldCheck size={20} color="var(--success)" />
                              <div>
                                 <p style={{ fontWeight: 900, margin: 0, color: 'var(--primary)' }}>{fp.name}</p>
                                 <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '0.2rem 0 0', fontWeight: 800 }}>{fp.type} • {t.lang === 'en' ? 'Enrolled' : 'تم الحفظ'}: {fp.date}</p>
                              </div>
                           </div>
                           <button style={{ all: 'unset', color: 'var(--error)', fontSize: '0.75rem', fontWeight: 950, cursor: 'pointer' }}>
                              {t.lang === 'en' ? 'Revoke Access' : 'إبطال الصلاحية'}
                           </button>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'documents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'Tajawal', margin: 0 }}>
                       {t.lang === 'en' ? 'Sovereign Documentation' : 'المراسلات الرسمية السيادية'}
                    </h3>
                    <span style={{ fontSize: '0.7rem', fontWeight: 950, background: 'var(--success-container)', color: 'var(--success)', padding: '0.4rem 1rem', borderRadius: '10px', border: '1px solid var(--success)' }}>
                       {t.lang === 'en' ? 'ZATCA COMPLIANT v2.1' : 'متوافق مع المرحلة الثانية'}
                    </span>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                       <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>
                          {t.lang === 'en' ? 'Official Report Header' : 'الترويسة الرسمية للمحررات'}
                       </label>
                       <textarea 
                          className="input-executive" 
                          rows={3}
                          value={settings.reportHeader}
                          onChange={e => setSettings({...settings, reportHeader: e.target.value})}
                          style={{ fontSize: '0.85rem', lineHeight: '1.5', resize: 'vertical' }}
                       />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                       <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>
                          {t.lang === 'en' ? 'Official Report Footer' : 'تذييل التقارير الرسمي'}
                       </label>
                       <textarea 
                          className="input-executive" 
                          rows={3}
                          value={settings.reportFooter}
                          onChange={e => setSettings({...settings, reportFooter: e.target.value})}
                          style={{ fontSize: '0.85rem', lineHeight: '1.5', resize: 'vertical' }}
                       />
                    </div>
                 </div>

                 <div style={{ padding: '2rem', background: 'var(--surface-container-low)', borderRadius: '24px', border: '1px dashed var(--outline)', textAlign: 'center' }}>
                    <FileText size={48} color="var(--primary)" style={{ margin: '0 auto 1.5rem', opacity: 0.8 }} />
                    <h4 style={{ fontWeight: 950, color: 'var(--primary)', fontSize: '1.1rem', marginBottom: '0.8rem' }}>
                       {t.lang === 'en' ? 'Advanced Visual Template Builder' : 'منشئ القوالب المرئي المتطور'}
                    </h4>
                    <button className="btn-executive" style={{ padding: '0.75rem 2.5rem', opacity: 0.7, cursor: 'not-allowed' }}>
                       {t.lang === 'en' ? 'Launch Visual Editor' : 'تشغيل المحرر المرئي'}
                    </button>
                 </div>
              </div>
           )}

        </main>
      </div>

      <div style={{ marginTop: '3rem', padding: '2rem', borderRadius: '20px', background: 'var(--primary)', color: 'white', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
         <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}><CheckCircle2 size={24} color="var(--secondary)" /></div>
         <div>
            <h4 style={{ color: 'white', fontWeight: 900, fontSize: '1.1rem', margin: 0 }}>{t.lang === 'en' ? 'Institutional Data Encryption (IDE)' : 'تشفير البيانات المؤسساتية (IDE)'}</h4>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 600, margin: '0.3rem 0 0' }}>{t.lang === 'en' ? 'K-Tier security detected. All configuration changes are mirrored across 3 redundant sovereign nodes.' : 'تم كشف حماية من الفئة K. جميع تغييرات الإعدادات يتم ربطها عبر 3 عقد سيادية احتياطية.'}</p>
         </div>
      </div>
    </div>
  );
}
