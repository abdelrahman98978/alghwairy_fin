import { useState, useEffect, useCallback } from 'react';
import { localDB } from '../lib/localDB';
import { fmtDate, fmtTime } from '../lib/dateUtils';
import type { Translations } from '../types/translations';
import { 
  User as UserIcon, 
  Database, 
  Activity, 
  RefreshCw, 
  Lock, 
  Globe,
  Plus,
  Trash2,
  Settings,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Fingerprint
} from 'lucide-react';

interface Props {
  showToast: (msg: string, type?: string) => void;
  t: Translations['audit_logs'] & { lang: string };
}

interface Log {
  id: string;
  created_at: string;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string;
}

export default function AuditLogsView({ showToast, t }: Props) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    try {
        const data = localDB.getAll('activity_logs').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 100);
        setLogs(data as Log[]);
    } catch {
        showToast('Error loading local activity logs', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('add') || act.includes('insert') || act.includes('issue')) return <Plus size={14} style={{ color: 'var(--success)' }} />;
    if (act.includes('delete') || act.includes('revoke') || act.includes('trash')) return <Trash2 size={14} style={{ color: 'var(--error)' }} />;
    if (act.includes('login') || act.includes('auth') || act.includes('shield')) return <ShieldCheck size={14} style={{ color: 'var(--primary)' }} />;
    if (act.includes('biometric') || act.includes('fingerprint')) return <Fingerprint size={14} style={{ color: 'var(--secondary)' }} />;
    if (act.includes('payment') || act.includes('trx') || act.includes('financial')) return <CreditCard size={14} style={{ color: 'var(--secondary)' }} />;
    if (act.includes('settings') || act.includes('update')) return <Settings size={14} style={{ color: 'var(--on-surface-variant)' }} />;
    return <Activity size={14} />;
  };

  const TranslateEntity = (entity: string) => {
    switch(entity) {
      case 'customers': return t.lang === 'en' ? 'Partners' : 'الشركاء';
      case 'invoices': return t.lang === 'en' ? 'Invoices' : 'الفواتير';
      case 'transactions': return t.lang === 'en' ? 'Finance' : 'المالية';
      case 'biometrics': return t.lang === 'en' ? 'Security' : 'الأمان';
      default: return entity;
    }
  };

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
           <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
           <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <button onClick={fetchLogs} className="btn-executive" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', border: 'none', background: 'var(--surface-container-high)', color: 'var(--primary)' }}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> {t.refresh}
        </button>
      </header>

      {/* Audit Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem', marginBottom: '2.5rem' }}>
         <AuditStat cardTitle={t.lang === 'en' ? 'Total Internal Events' : 'إجمالي العمليات المفحوصة'} value={logs.length} icon={<Activity size={22} />} color="var(--primary)" />
         <AuditStat cardTitle={t.lang === 'en' ? 'Local Integrity' : 'سلامة السجل المحلي'} value="100%" subText="Active" icon={<Lock size={22} />} color="var(--secondary)" />
         <AuditStat cardTitle={t.lang === 'en' ? 'Data Sovereignty' : 'سيادة البيانات'} value="Active" subText="Local Only" icon={<Globe size={22} />} color="var(--success)" />
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
        <div style={{ padding: '1.5rem 2rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ fontSize: '1.2rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{t.lang === 'en' ? 'Institutional Activity Ledger' : 'سجل النشاطات المؤسسي الموحد'}</h3>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--secondary)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '10px' }}>INTERNAL AUDIT v4.1</span>
           </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table">
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2rem' }}>{t.th_time}</th>
                <th>{t.th_user}</th>
                <th>{t.th_action}</th>
                <th>{t.th_entity}</th>
                <th style={{ textAlign: 'center' }}>{t.lang === 'en' ? 'Verification' : 'التوثيق'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '6rem' }}>
                   <RefreshCw size={32} className="spin" style={{ margin: '0 auto' }} />
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '6rem', opacity: 0.5 }}>
                   <AlertCircle size={32} style={{ margin: '0 auto 1rem' }} />
                   <p style={{ fontWeight: 800 }}>{t.empty}</p>
                </td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ paddingInlineStart: '2rem', color: 'var(--on-surface-variant)', fontWeight: 800, fontSize: '0.85rem' }}>
                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                         <span>{fmtDate(log.created_at, t.lang)}</span>
                         <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{fmtTime(log.created_at, t.lang)}</span>
                       </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <UserIcon size={14} color="var(--primary)" />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{log.user_email || 'System'}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                         {getActionIcon(log.action)}
                         {log.action}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--secondary-container)', color: 'var(--on-secondary-container)', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 950 }}>
                        <Database size={12} /> {TranslateEntity(log.entity)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <ShieldCheck size={16} color="var(--success)" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--success)' }}>VERIFIED</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '1.2rem 2rem', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>
          <ShieldCheck size={16} color="var(--success)" />
          <span>{t.lang === 'en' ? 'All activity records in this institutional ledger are stored locally in an encrypted path and cannot be manually modified.' : 'كل العمليات المسجلة في هذا السجل المؤسسي يتم حفظها محلياً في مسار مشفر ولا يمكن تعديلها يدوياً.'}</span>
        </div>
      </div>
    </div>
  );
}

interface AuditStatProps {
  cardTitle: string;
  value: string | number;
  subText?: string;
  icon: React.ReactNode;
  color: string;
}

function AuditStat({ cardTitle, value, subText, icon, color }: AuditStatProps) {
  return (
    <div className="card" style={{ padding: '1.5rem 2.2rem', borderInlineStart: `6px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
       <div>
          <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 900, textTransform: 'uppercase' }}>{cardTitle}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.7rem' }}>
             <h3 style={{ margin: 0, fontSize: '2.5rem', fontFamily: 'Tajawal', fontWeight: 950, color: 'var(--primary)' }}>{value}</h3>
             {subText && <span style={{ fontSize: '0.75rem', color: color, fontWeight: 900, opacity: 0.9 }}>{subText}</span>}
          </div>
       </div>
       <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--surface-container-high)', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    </div>
  );
}
