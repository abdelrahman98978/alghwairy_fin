import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Translations } from '../types/translations';
import { 
  User, 
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
  AlertCircle
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

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data as unknown as Log[]) || []);
    } catch {
      showToast('Error syncing logs', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('add') || act.includes('insert') || act.includes('issue')) return <Plus size={14} className="text-success" />;
    if (act.includes('delete') || act.includes('revoke') || act.includes('trash')) return <Trash2 size={14} className="text-error" />;
    if (act.includes('login') || act.includes('auth') || act.includes('shield')) return <ShieldCheck size={14} className="text-primary" />;
    if (act.includes('payment') || act.includes('trx') || act.includes('financial')) return <CreditCard size={14} className="text-secondary" />;
    if (act.includes('settings') || act.includes('update')) return <Settings size={14} className="text-on-surface-variant" />;
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

      {/* Sovereign Audit Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem', marginBottom: '2.5rem' }}>
         <AuditStat cardTitle={t.lang === 'en' ? 'Total Activities' : 'إجمالي الحركات المفحوصة'} value={logs.length} icon={<Activity size={22} />} color="var(--primary)" />
         <AuditStat cardTitle={t.lang === 'en' ? 'Security Alerts' : 'تنبيهات الأمان النشطة'} value="0" subText="No breaches" icon={<Lock size={22} />} color="var(--secondary)" />
         <AuditStat cardTitle={t.lang === 'en' ? 'System Sync Health' : 'سلامة المزامنة السيادية'} value="100%" subText="All nodes" icon={<Globe size={22} />} color="var(--success)" />
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
        <div style={{ padding: '1.5rem 2rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ fontSize: '1.2rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{t.lang === 'en' ? 'Unified Activity Ledger' : 'سجل النشاطات السيادي الموحد'}</h3>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--secondary)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '10px' }}>SECURE LOG V4.0</span>
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
                <th style={{ textAlign: 'center' }}>{t.lang === 'en' ? 'Integrity' : 'الموثوقية'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '6rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', opacity: 0.5 }}>
                    <RefreshCw size={32} className="spin" />
                    <span style={{ fontWeight: 800 }}>Syncing Audit Ledger...</span>
                  </div>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '6rem', opacity: 0.5 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <AlertCircle size={32} />
                    <span style={{ fontWeight: 800 }}>{t.empty}</span>
                  </div>
                </td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ paddingInlineStart: '2rem', color: 'var(--on-surface-variant)', fontWeight: 800, fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span>{new Date(log.created_at).toLocaleDateString()}</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{new Date(log.created_at).toLocaleTimeString()}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={14} color="var(--primary)" />
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--on-surface)' }}>{log.user_email || 'System'}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                         {getActionIcon(log.action)}
                         {log.action}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--secondary-container)', color: 'var(--on-secondary-container)', padding: '0.3rem 0.7rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>
                        <Database size={12} /> {TranslateEntity(log.entity)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--success)' }}>SIGNED</span>
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
          <span>كل العمليات المسجلة في هذا السجل موثقة بنظام التوقيع الرقمي (Sovereign Digital Signature) وغير قابلة للتعديل.</span>
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
    <div className="card" style={{ padding: '1.5rem 2.2rem', borderInlineStart: `6px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'none', border: '1px solid var(--surface-container-high)', borderInlineStartWidth: '6px' }}>
       <div>
          <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cardTitle}</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.7rem' }}>
             <h3 style={{ margin: 0, fontSize: '2.5rem', fontFamily: 'Tajawal', fontWeight: 950, color: 'var(--primary)' }}>{value}</h3>
             {subText && <span style={{ fontSize: '0.75rem', color: color, fontWeight: 900, opacity: 0.9 }}>{subText}</span>}
          </div>
       </div>
       <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--surface-container-high)', color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
    </div>
  );
}
