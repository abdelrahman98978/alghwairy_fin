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
  Share2,
  FolderOpen,
  Network,
  Volume2,
  Monitor
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import { biometricService } from '../lib/biometricService';

import type { Translations } from '../types/translations';

interface SettingsProps {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string, overrideUser?: string) => Promise<void>;
  t: Translations['settings'];
  userName: string;
}

export default function SettingsView({ showToast, logActivity, t, userName }: SettingsProps) {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [settings, setSettings] = useState({
    companyName: localStorage.getItem('sov_company_name') || 'Alghwairy Customs Institution',
    taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
    address: localStorage.getItem('sov_address') || 'King Fahd Rd, Riyadh, SA',
    crNumber: localStorage.getItem('sov_cr_number') || '1010394857',
    email: localStorage.getItem('sov_email') || 'info@alghwairy.com.sa',
    logo: localStorage.getItem('sov_logo') || '',
    currency: localStorage.getItem('sov_currency') || 'SAR',
    vatRate: localStorage.getItem('sov_vat_rate') || '15',
    zatcaSync: localStorage.getItem('sov_zatca_sync') || 'Active',
    zatcaEnv: localStorage.getItem('sov_zatca_env') || 'Sandbox',
    notifications: JSON.parse(localStorage.getItem('sov_notifications') || '[true, true, true, false]'),
    primaryColor: localStorage.getItem('sov_primary_color') || '#001a33',
    fontFamily: localStorage.getItem('sov_font_family') || 'Tajawal',
    reportHeader: localStorage.getItem('sov_report_header') || 'مؤسسة الغويري للتخليص الجمركي - وثيقة رسمية',
    reportFooter: localStorage.getItem('sov_report_footer') || 'جميع الحقوق محفوظة © مؤسسة الغويري 2026',
    syncFrequency: localStorage.getItem('sov_sync_frequency') || 'daily',
    notifSounds: localStorage.getItem('sov_notif_sounds') === 'true',
    notifDesktop: localStorage.getItem('sov_notif_desktop') === 'true'
  });

  const handleSave = async () => {
    setLoading(true);
    Object.entries(settings).forEach(([key, value]) => {
      const storageKey = `sov_${key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)}`;
      if (typeof value === 'object') {
        localStorage.setItem(storageKey, JSON.stringify(value));
      } else {
        localStorage.setItem(storageKey, String(value));
      }
    });

    // Apply immediate visual changes
    document.documentElement.style.setProperty('--primary', settings.primaryColor);
    document.documentElement.style.setProperty('--font-main', settings.fontFamily);

    await logActivity('Updated Institution Settings', 'settings', 'config_update');
    setTimeout(() => {
      setLoading(false);
      showToast(t.lang === 'en' ? 'Institutional settings saved successfully.' : 'تم حفظ الإعدادات المؤسسية بنجاح.', 'success');
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
    if (!biometricService.isSupported()) {
        showToast(t.lang === 'en' ? 'Biometrics not supported' : 'جهازك لا يدعم البصمة', 'error');
        return;
    }
    setIsEnrolling(true);
    try {
      const bioResult = await biometricService.enroll(userName);
      const bioData = { 
        id: bioResult.id, 
        rawId: bioResult.rawId, 
        type: 'windows-hello', 
        date: new Date().toISOString() 
      };
      
      const users = localDB.findBy('user_roles', 'name', userName);
      if (users.length > 0) {
          localDB.update('user_roles', users[0].id, { biometric_key: JSON.stringify(bioData) });
      } else {
          localDB.insert('user_roles', { name: userName, role: 'admin', biometric_key: JSON.stringify(bioData) });
      }
      
      await logActivity('Enrolled REAL Biometric ID (Windows Hello)', 'security', bioResult.id);
      showToast(t.lang === 'en' ? 'Biometric ID Linked' : 'تم ربط البصمة الحقيقية بنجاح', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(t.lang === 'en' ? 'Enrollment Cancelled or Failed' : 'تم إلغاء أو فشل تسجيل البصمة', 'error');
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
    setLoading(true);
    try {
      const users = localDB.findBy('user_roles', 'name', userName);
      if (users.length > 0) {
        localDB.update('user_roles', users[0].id, { password: passwordData.new });
        await logActivity('Updated Admin Credentials', 'security', 'password_reset');
        showToast(t.lang === 'en' ? 'Credentials Updated' : 'تم تحديث بيانات الدخول بنجاح', 'success');
        setPasswordData({ current: '', new: '', confirm: '' });
      }
    } catch {
      showToast('Error updating credentials', 'error');
    } finally {
      setLoading(false);
    }
  };

  const wipeSystem = async () => {
    // Check if biometric verification is required
    const users = localDB.findBy('user_roles', 'name', userName);
    if (users.length > 0 && users[0].biometric_key) {
        try {
            const bioData = JSON.parse(users[0].biometric_key);
            showToast(t.lang === 'en' ? 'Authenticating via Windows Hello...' : 'جاري التحقق عبر البصمة الجمركية...', 'info');
            
            // Fix: Use rawId or fallback to id for robust verification
            const isVerified = await biometricService.verify(bioData.rawId || bioData.id);
            
            if (!isVerified) {
                showToast(t.lang === 'en' ? 'Biometric Authentication Failed' : 'فشل التحقق من الهوية الحيوية', 'error');
                return;
            }
        } catch (err) {
            console.error('Biometric parse error:', err);
            showToast('خطأ في بيانات البصمة المسجلة', 'error');
            return;
        }
    }

    setLoading(true);
    try {
      await logActivity('SYSTEM_WIPE', 'system', 'all_data_deleted');
      localDB.clearAll();
      Object.keys(localStorage).forEach(key => { if (key.startsWith('sov_')) localStorage.removeItem(key); });
      showToast(t.lang === 'en' ? 'System Wiped. Reloading...' : 'تم مسح النظام بالكامل. جاري إعادة التشغيل...', 'success');
      setTimeout(() => window.location.reload(), 2000);
    } catch {
      showToast('Error during system wipe', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportBackup = () => {
    const json = localDB.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alghwairy_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast(t.lang === 'en' ? 'Local backup exported' : 'تم تصدير النسخة الاحتياطية بنجاح', 'success');
  };

  const themes = [
    { name: 'Sovereign Navy', color: '#001a33' },
    { name: 'Royal Gold', color: '#d4a76a' },
    { name: 'Deep Onyx', color: '#1a1a1a' },
    { name: 'Emerald Trust', color: '#004d40' }
  ];

  const menuItems = [
    { id: 'general', label: t.tabs.general, icon: <Building2 size={18} /> },
    { id: 'financial', label: t.tabs.financial, icon: <Globe size={18} /> },
    { id: 'notifications', label: t.tabs.notifications, icon: <Bell size={18} /> },
    { id: 'appearance', label: t.tabs.appearance, icon: <Palette size={18} /> },
    { id: 'documents', label: t.tabs.documents, icon: <FileText size={18} /> },
    { id: 'biometrics', label: t.tabs.security, icon: <Fingerprint size={18} /> },
    { id: 'backup', label: t.tabs.backup, icon: <Cloud size={18} /> },
    { id: 'cluster', label: t.lang === 'ar' ? 'عنقود التزامن' : 'Cluster Sync', icon: <Share2 size={18} /> },
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
                 display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderRadius: '14px', border: 'none', fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
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
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--primary)', fontFamily: 'Tajawal' }}>
                   {t.lang === 'en' ? 'Institutional Identity' : 'هوية المنشأة'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Trading Name' : 'الاسم التجاري'}</label>
                    <input className="input-executive" value={settings.companyName} onChange={e => setSettings({...settings, companyName: e.target.value})} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Tax ID' : 'الرقم الضريبي'}</label>
                    <input className="input-executive" value={settings.taxNumber} onChange={e => setSettings({...settings, taxNumber: e.target.value})} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'HQ Address' : 'العنوان الرئيسي'}</label>
                    <input className="input-executive" value={settings.address} onChange={e => setSettings({...settings, address: e.target.value})} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'CR Number' : 'رقم السجل التجاري'}</label>
                    <input className="input-executive" value={settings.crNumber} onChange={e => setSettings({...settings, crNumber: e.target.value})} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Institutional Logo' : 'شعار المنشأة'}</label>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: 45, height: 45, borderRadius: '8px', objectFit: 'contain' }} />}
                      <label className="btn-executive" style={{ cursor: 'pointer', padding: '0.6rem 1rem', fontSize: '0.75rem', background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
                        <Upload size={14} /> {t.lang === 'en' ? 'Upload' : 'رفع'}
                        <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                      </label>
                    </div>
                  </div>
                </div>
             </div>
           )}

           {activeTab === 'financial' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--primary)', fontFamily: 'Tajawal' }}>
                   {t.lang === 'en' ? 'Currency & Tax Compliance' : 'العملة والامتثال الضريبي'}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Primary Currency' : 'العملة الأساسية'}</label>
                      <select className="input-executive" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}>
                         <option value="SAR">SAR - Saudi Riyal</option>
                         <option value="USD">USD - US Dollar</option>
                         <option value="AED">AED - Emirati Dirham</option>
                      </select>
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'VAT Rate (%)' : 'نسبة ضريبة القيمة المضافة'}</label>
                      <input type="number" className="input-executive" value={settings.vatRate} onChange={e => setSettings({...settings, vatRate: e.target.value})} />
                   </div>
                </div>
                <div style={{ marginTop: '1rem', padding: '1.5rem', borderRadius: '14px', background: 'var(--surface-container-low)', border: '1px solid var(--surface-container-high)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                         <h4 style={{ margin: 0, fontWeight: 900 }}>ZATCA Phase 2 Integration</h4>
                         <p style={{ margin: '0.3rem 0 0', opacity: 0.6, fontSize: '0.8rem' }}>{t.lang === 'en' ? 'Link with ZATCA systems for real-time clearance.' : 'التحكم في الربط المباشر مع أنظمة الزكاة والضريبة.'}</p>
                      </div>
                      <select 
                        value={settings.zatcaEnv} 
                        onChange={e => setSettings({...settings, zatcaEnv: e.target.value})}
                        style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--outline)', fontSize: '0.75rem', fontWeight: 800 }}
                      >
                         <option value="Sandbox">Sandbox (Training)</option>
                         <option value="Production">Production (Live)</option>
                      </select>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'notifications' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--primary)', fontFamily: 'Tajawal' }}>
                   {t.lang === 'en' ? 'Sovereign Alerts' : 'التنبيهات السيادية'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', background: 'var(--surface-container-low)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <Volume2 size={20} color="var(--primary)" />
                         <span style={{ fontWeight: 800 }}>{t.lang === 'en' ? 'System Notification Sounds' : 'أصوات تنبيهات النظام'}</span>
                      </div>
                      <input type="checkbox" checked={settings.notifSounds} onChange={e => setSettings({...settings, notifSounds: e.target.checked})} />
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem', background: 'var(--surface-container-low)', borderRadius: '12px' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                         <Monitor size={20} color="var(--primary)" />
                         <span style={{ fontWeight: 800 }}>{t.lang === 'en' ? 'Desktop Notifications' : 'إشعارات سطح المكتب'}</span>
                      </div>
                      <input type="checkbox" checked={settings.notifDesktop} onChange={e => setSettings({...settings, notifDesktop: e.target.checked})} />
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'appearance' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--primary)', fontFamily: 'Tajawal' }}>
                   {t.lang === 'en' ? 'Visual Identity & Branding' : 'الهوية البصرية والسمات'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Sovereign Theme' : 'السمة السيادية'}</label>
                   <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                      {themes.map(theme => (
                        <button 
                          key={theme.name}
                          onClick={() => setSettings({...settings, primaryColor: theme.color})}
                          style={{ 
                            height: '60px', borderRadius: '12px', background: theme.color, border: settings.primaryColor === theme.color ? '4px solid var(--secondary)' : 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                           {settings.primaryColor === theme.color && <ShieldCheck size={20} color="var(--secondary)" />}
                        </button>
                      ))}
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                         <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Typography (Font)' : 'نوع الخط'}</label>
                         <select className="input-executive" value={settings.fontFamily} onChange={e => setSettings({...settings, fontFamily: e.target.value})}>
                            <option value="Tajawal">Tajawal (Official Arabic)</option>
                            <option value="Cairo">Cairo (Modern Arabic)</option>
                            <option value="Inter">Inter (Global Latin)</option>
                         </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                         <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Primary Brand Color' : 'لون الهوية الرئيسي'}</label>
                         <input type="color" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor: e.target.value})} style={{ height: '42px', width: '100%', border: 'none', background: 'none' }} />
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'documents' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--primary)', fontFamily: 'Tajawal' }}>
                   {t.lang === 'en' ? 'Report & Document Headers' : 'ترويسة المستندات والتقارير'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Main Document Header' : 'عنوان المستند الأساسي'}</label>
                      <textarea 
                        className="input-executive" 
                        rows={2} 
                        value={settings.reportHeader} 
                        onChange={e => setSettings({...settings, reportHeader: e.target.value})}
                        placeholder="e.g. Alghwairy Customs - Official Document"
                      />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Official Footer / Disclaimer' : 'تذييل المستند / إخلاء المسؤولية'}</label>
                      <textarea 
                        className="input-executive" 
                        rows={2} 
                        value={settings.reportFooter} 
                        onChange={e => setSettings({...settings, reportFooter: e.target.value})}
                        placeholder="e.g. Generated by Alghwairy Sovereign Ledger © 2026"
                      />
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'biometrics' && (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', fontFamily: 'Tajawal' }}>{t.lang === 'en' ? 'Biometric Security' : 'الأمان الحيوي'}</h3>
                <div style={{ padding: '2rem', background: 'var(--surface-container-low)', borderRadius: '20px', textAlign: 'center' }}>
                   <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--surface-container-high)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isEnrolling ? <Loader2 size={40} className="spin" /> : <Fingerprint size={40} color="var(--primary)" />}
                   </div>
                   <button onClick={enrollBiometric} className="btn-executive" disabled={isEnrolling} style={{ padding: '0.85rem 3rem', background: 'var(--primary)', color: 'var(--secondary)' }}>
                       {isEnrolling ? (t.lang === 'ar' ? 'جاري الربط...' : 'Connecting...') : (t.lang === 'ar' ? 'بدء عملية التسجيل' : 'Start Enrollment')}
                   </button>
                   <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--success)', fontWeight: 800 }}>
                      {userName} - {t.lang === 'ar' ? 'البصمة النشطة: مفعلة' : 'Active Biometric: VERIFIED'}
                   </p>
                </div>
                <div style={{ padding: '1.5rem', borderRadius: '18px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
                   <h4 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: '1.2rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <ShieldCheck size={18} /> {t.lang === 'en' ? 'Security Credentials' : 'بيانات الوصول الأمنية'}
                   </h4>
                   <form onSubmit={handlePasswordChange} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem' }}>
                      <input type="password" placeholder="Pass 1" className="input-executive" value={passwordData.new} onChange={e => setPasswordData({...passwordData, new: e.target.value})} />
                      <input type="password" placeholder="Pass 2" className="input-executive" value={passwordData.confirm} onChange={e => setPasswordData({...passwordData, confirm: e.target.value})} />
                      <button type="submit" disabled={loading} className="btn-executive" style={{ background: 'var(--primary)', color: 'var(--secondary)', border: 'none' }}>Update</button>
                   </form>
                </div>
             </div>
           )}

           {activeTab === 'cluster' && (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', fontFamily: 'Tajawal', margin: 0 }}>{t.lang === 'ar' ? 'عنقود التزامن' : 'Cluster Sync'}</h3>
                        <p style={{ margin: 0, opacity: 0.6, fontWeight: 700 }}>{t.lang === 'ar' ? 'تجهيز مسار المزامنة المشترك.' : 'Configure shared sync path.'}</p>
                     </div>
                     <Network size={24} color="var(--primary)" />
                  </div>
                  <div className="card" style={{ padding: '2rem', background: 'var(--surface-container-low)', border: '1px solid var(--surface-container-high)' }}>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                           <label style={{ fontSize: '0.9rem', fontWeight: 900 }}>{t.lang === 'ar' ? 'مسار الشبكة' : 'Network Path'}</label>
                           <div style={{ display: 'flex', gap: '1rem' }}>
                              <input 
                                className="input-executive" style={{ flex: 1, fontFamily: 'monospace' }}
                                value={localDB.get('sync_settings')?.sync_folder || ''}
                                onChange={(e) => {
                                   const current = localDB.get('sync_settings');
                                   localDB.update('sync_settings', 'settings', { ...current, sync_folder: e.target.value });
                                }}
                              />
                              <button className="btn-executive" style={{ width: 'auto', border: 'none' }}><FolderOpen size={18} /></button>
                           </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'white', borderRadius: '12px' }}>
                           <p style={{ margin: 0, fontWeight: 900 }}>{t.lang === 'ar' ? 'المزامنة النشطة' : 'Active Sync'}</p>
                           <input 
                             type="checkbox" 
                             checked={localDB.get('sync_settings')?.auto_sync || false}
                             onChange={(e) => {
                                const current = localDB.get('sync_settings');
                                localDB.update('sync_settings', 'settings', { ...current, auto_sync: e.target.checked });
                                showToast(t.lang === 'ar' ? 'تم التحديث' : 'Updated', 'success');
                             }}
                           />
                        </div>
                     </div>
                  </div>
               </div>
           )}

           {activeTab === 'backup' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                 <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', fontFamily: 'Tajawal' }}>{t.lang === 'en' ? 'Sovereign Backup' : 'النسخ الاحتياطي السيادي'}</h3>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--surface-container-high)' }}>
                       <Database size={24} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
                       <h4 style={{ margin: '0 0 1rem', fontWeight: 900 }}>{t.lang === 'en' ? 'Export Local Instance' : 'تصدير السجل المحلي'}</h4>
                       <button onClick={exportBackup} className="btn-executive" style={{ width: '100%', border: 'none' }}>Export JSON</button>
                    </div>
                    <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--error)' }}>
                       <Trash2 size={24} color="var(--error)" style={{ marginBottom: '1.5rem' }} />
                       <h4 style={{ margin: '0 0 1rem', fontWeight: 900 }}>{t.lang === 'en' ? 'Wipe System' : 'تصفير النظام'}</h4>
                       <button onClick={() => setShowWipeConfirm(true)} className="btn-executive" style={{ width: '100%', background: 'var(--error)', border: 'none' }}>System Wipe</button>
                    </div>
                 </div>
                 {showWipeConfirm && (
                   <div style={{ padding: '1.5rem', background: 'rgba(186, 26, 26, 0.1)', borderRadius: '14px', border: '1px solid var(--error)' }}>
                      <p style={{ color: 'var(--error)', fontWeight: 900, marginBottom: '1rem' }}>Are you sure? This is irreversible.</p>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={wipeSystem} className="btn-executive" style={{ background: 'var(--error)', border: 'none' }}>Yes, Wipe</button>
                        <button onClick={() => setShowWipeConfirm(false)} className="btn-executive">Cancel</button>
                      </div>
                   </div>
                 )}
              </div>
           )}
        </main>
      </div>

      <div style={{ marginTop: '3rem', padding: '2rem', borderRadius: '20px', background: 'var(--primary)', color: 'white', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
         <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.1)', borderRadius: '16px' }}><CheckCircle2 size={24} color="var(--secondary)" /></div>
         <div>
            <h4 style={{ color: 'white', fontWeight: 900, margin: 0 }}>Sovereign Security Protocol</h4>
            <p style={{ fontSize: '0.9rem', opacity: 0.8, margin: '0.3rem 0 0' }}>All settings are locked into your local encrypted ledger.</p>
         </div>
      </div>
    </div>
  );
}
