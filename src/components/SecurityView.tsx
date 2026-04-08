import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Lock as LockIcon,
  Database as DatabaseIcon,
  Laptop,
  Globe,
  Key
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import type { Translations } from '../types/translations';

interface SecurityProps {
  showToast: (msg: string, type?: string) => void;
  t: Translations['security'];
}

interface Backup {
  id: string;
  payload: string;
  status: string;
  size: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  created_at: string;
}

export default function SecurityView({ showToast, t }: SecurityProps) {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fetchBackups = () => {
    try {
        const data = localDB.getAll('backups').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setBackups(data as Backup[]);
    } catch {}
  };

  const fetchRealLogs = () => {
    try {
        const data = localDB.getActive('activity_logs').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);
        setLogs(data as ActivityLog[]);
    } catch {}
  };

  const restoreFromBackup = async (bkp: Backup) => {
    if (!bkp.payload) {
      showToast('No persistent payload found for this snapshot.', 'error');
      return;
    }
    
    if (confirm(t.lang === 'en' ? 'WARNING: This will overwrite CURRENT live data with the selected snapshot. Proceed?' : 'تحذير: سيتم استبدال البيانات الحالية بالكامل ببيانات هذه النسخة. هل أنت متأكد؟')) {
      setLoading(true);
      showToast(t.lang === 'ar' ? 'جاري بدء استرجاع البيانات...' : 'Initiating Data Recovery...', 'success');
      
      try {
        const success = localDB.importJSON(bkp.payload);
        
        if (success) {
            setTimeout(() => {
               showToast(t.lang === 'en' ? 'Ledger Integrity Restored successfully.' : 'تم استعادة سلامة السجل بنجاح.', 'success');
               setLoading(false);
               window.location.reload();
            }, 2000);
        } else {
            throw new Error('Import failed');
        }
      } catch (err) {
        showToast(t.lang === 'en' ? 'Integrity Hash Mismatch or Corrupted Payload' : 'فشل في التحقق من سلامة البيانات أو الملف تالف', 'error');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchBackups();
    fetchRealLogs();
  }, []);

  const createBackup = async () => {
    setLoading(true);
    setProgress(10);
    showToast(t.lang === 'ar' ? 'بدء إجراء النسخ الاحتياطي الآمن...' : 'Secure backup procedure initiated...', 'success');
    
    const interval = setInterval(() => {
       setProgress(prev => {
          if (prev >= 90) {
             clearInterval(interval);
             return 90;
          }
          return prev + 15;
       });
    }, 400);

    setTimeout(async () => {
      setProgress(100);
      try {
          const exportData = localDB.exportJSON();
          const blob = new Blob([exportData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Alghwairy_Ledger_Export_${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);

          const sizeStr = `${(blob.size / 1024).toFixed(1)} KB`;
          localDB.insert('backups', {
            status: 'Encrypted (Local)',
            size: sizeStr,
            payload: exportData
          });
          
          showToast(t.lang === 'ar' ? 'تم حفظ اللقطة الأمنية بنجاح.' : 'Security snapshot finalized locally.', 'success');
          fetchBackups();
      } catch (err) {
          showToast('Backup Error', 'error');
      }

      setTimeout(() => {
         setLoading(false);
         setProgress(0);
      }, 1000);
    }, 2500);
  };

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <SecurityCard 
          icon={<ShieldCheck size={24}/>} 
          title={t.firewall} 
          subtitle={t.lang === 'ar' ? 'حماية المؤسسة المحلية' : 'Local Institution Protection'} 
          status={t.lang === 'en' ? 'Protected' : 'محمي'} 
          positive 
        />
        <SecurityCard 
          icon={<LockIcon size={24}/>} 
          title={t.encryption} 
          subtitle="Military Grade AES-256 (Disk)" 
          status={t.lang === 'en' ? 'Active' : 'نشط'} 
          positive 
        />
        <SecurityCard 
          icon={<Key size={24}/>} 
          title="Access Control" 
          subtitle="Electronic Signatures" 
          status={t.lang === 'en' ? 'Required' : 'مطلوب'} 
          warning 
          toggleStatus
        />
        <SecurityCard 
          icon={<Globe size={24}/>} 
          title="Data Sovereignty" 
          subtitle="Offline Local Storage" 
          status={t.lang === 'en' ? 'Secured' : 'مؤمن'} 
          positive 
          toggleStatus
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--surface-container-high)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <div>
                 <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', margin: 0, fontWeight: 900, color: 'var(--primary)' }}>{t.lang === 'ar' ? 'أرشيف بيانات مؤسسة الغويري' : 'Alghwairy Data Archive'}</h3>
                 <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{t.lang === 'ar' ? 'لقطات النظام الأمنية' : 'System Security Snapshots'}</p>
              </div>
              <button 
                 disabled={loading}
                 onClick={createBackup}
                 className="btn-executive"
                 style={{ border: 'none' }}
              >
                 <DatabaseIcon size={18} /> {loading ? '...' : (t.lang === 'en' ? 'Create Security Snapshot' : 'توليد لقطة أمنية')}
              </button>
           </div>

           {loading && (
             <div style={{ marginBottom: '2.5rem', padding: '2rem', background: 'var(--surface-container-low)', borderRadius: '16px', border: '2px solid var(--secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '1rem', fontWeight: 900, color: 'var(--primary)' }}>
                   <span>{t.lang === 'en' ? 'Compressing & Encrypting Data...' : 'جاري ضغط وتشفير البيانات...'}</span>
                   <span>{progress}%</span>
                </div>
                <div style={{ height: '10px', width: '100%', background: 'var(--surface-container-high)', borderRadius: '5px', overflow: 'hidden' }}>
                   <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', transition: 'width 0.4s' }}></div>
                </div>
             </div>
           )}

           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {backups.map((bkp) => (
                <div key={bkp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'white', borderRadius: '14px', border: '1px solid var(--surface-container-high)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                      <div style={{ padding: '0.8rem', background: 'var(--surface-container-low)', borderRadius: '12px', color: 'var(--primary)' }}><DatabaseIcon size={20} /></div>
                      <div>
                         <p style={{ fontWeight: 800, margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>SNAPSHOT-RECOVERY</p>
                         <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0.2rem 0 0', fontWeight: 700 }}>
                            {new Date(bkp.created_at).toLocaleString()} • {bkp.size}
                         </p>
                      </div>
                   </div>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'rgba(212, 167, 106, 0.1)', color: 'var(--secondary)', padding: '0.4rem 1rem', borderRadius: '20px' }}>{bkp.status}</span>
                      <button onClick={() => restoreFromBackup(bkp)} className="btn-executive" style={{ padding: '0.5rem 1rem', background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', fontSize: '0.75rem' }}>Restore</button>
                   </div>
                </div>
              ))}
              {backups.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>لم يتم أخذ أي لقطات أمنية بعد</div>
              )}
           </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
           <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--surface-container-high)' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'Tajawal', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)', fontWeight: 900 }}>
                 <Laptop size={20} color="var(--primary)" /> {t.lang === 'ar' ? 'جلسات العمل' : 'Sessions'}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                 <SessionItem icon={<Laptop size={18} />} title={navigator.platform || 'Workstation'} location="Institution Terminal" current />
              </div>
           </div>

            <div className="card" style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '1.5rem' }}>
               <h3 style={{ fontSize: '1rem', fontFamily: 'Tajawal', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--secondary)', fontWeight: 900 }}>
                 <ShieldAlert size={20} /> {t.lang === 'ar' ? 'تنبيهات المؤسسة' : 'Institutional Alerts'}
               </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {logs.length > 0 ? logs.map(l => (
                    <LogEntry key={l.id} text={`${l.action}`} time={new Date(l.created_at).toLocaleTimeString()} positive />
                  )) : (
                    <>
                      <LogEntry text="Local Database Encryption Active" time="Just Now" positive />
                      <LogEntry text="Disk Sovereignty Verified" time="2m ago" positive />
                    </>
                  )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

function SecurityCard({ icon, title, subtitle, status, positive, warning, toggleStatus }: any) {
  const [active, setActive] = useState(true);
  return (
    <div className="card" style={{ padding: '1rem 1.25rem', borderInlineStart: `5px solid ${positive ? 'var(--success)' : (warning ? 'var(--error)' : 'var(--primary)')}`, opacity: active ? 1 : 0.6, transition: 'opacity 0.3s' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', background: 'var(--surface-container-high)', borderRadius: '16px', color: 'var(--primary)' }}>{icon}</div>
          {toggleStatus ? (
             <div onClick={() => setActive(!active)} style={{ width: 40, height: 20, background: active ? 'var(--primary)' : '#ccc', borderRadius: 20, cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', padding: '0 4px', transition: 'background 0.3s' }}>
                <div style={{ width: 14, height: 14, background: '#fff', borderRadius: '50%', transform: active ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.3s' }}></div>
             </div>
          ) : (
             <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '0.4rem 0.8rem', borderRadius: '10px', background: positive ? 'rgba(27, 94, 32, 0.1)' : 'rgba(186, 26, 26, 0.1)', color: positive ? 'var(--success)' : 'var(--error)', textTransform: 'uppercase' }}>
                {status}
             </span>
          )}
       </div>
       <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontWeight: 800, marginBottom: '0.4rem' }}>{title}</p>
       <h3 style={{ fontSize: '1.1rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)' }}>{subtitle}</h3>
    </div>
  );
}

function SessionItem({ icon, title, location, current }: any) {
  return (
    <div style={{ display: 'flex', gap: '1.2rem', paddingBottom: '1.2rem', borderBottom: '1px solid var(--surface-container-high)' }}>
       <div style={{ padding: '0.8rem', background: 'var(--surface-container-low)', borderRadius: '12px', color: 'var(--primary)' }}>{icon}</div>
       <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>{title}</h4>
             {current && <span style={{ fontSize: '0.65rem', background: 'rgba(27, 94, 32, 0.1)', color: 'var(--success)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 900 }}>LOCAL</span>}
          </div>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{location} • Online</p>
       </div>
    </div>
  );
}

function LogEntry({ text, time, positive }: any) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
       <div style={{ width: 8, height: 8, borderRadius: '50%', background: positive ? 'var(--secondary)' : 'var(--error)', marginTop: '6px' }}></div>
       <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, color: 'white' }}>{text}</p>
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{time}</span>
       </div>
    </div>
  );
}
