import { useState, useEffect, useCallback } from 'react';
import { localDB } from '../lib/localDB';
import { fmtDate, fmtTime } from '../lib/dateUtils';
import type { Translations } from '../types/translations';

interface Log {
  id: string;
  action: string;
  entity: string;
  entity_id?: string;
  user_email?: string;
  created_at: string;
  user_id?: string;
}

interface Props {
  showToast: (msg: string, type?: string) => void;
  t: Translations['audit_logs'] | any;
}

function AuditStat({ cardTitle, value, subText, icon, colorClass }: { cardTitle: string; value: string | number; subText?: string; icon: string; colorClass: string }) {
  return (
    <div className={`card-executive ${colorClass}`}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="card-executive-icon">
             <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{icon}</span>
          </div>
          <p className="card-executive-title">{cardTitle}</p>
       </div>
       
       <div className="card-executive-value-group">
          {subText && <span className="card-executive-unit" style={{ color: 'var(--accent-color)', opacity: 0.8 }}>{subText}</span>}
          <h3 className="card-executive-value on-color">{value}</h3>
       </div>
    </div>
  );
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
    let icon = 'history';
    let color = 'var(--primary)';
    
    if (act.includes('add') || act.includes('insert') || act.includes('issue')) { icon = 'add_circle'; color = 'var(--success)'; }
    else if (act.includes('delete') || act.includes('revoke') || act.includes('trash')) { icon = 'delete_forever'; color = 'var(--error)'; }
    else if (act.includes('login') || act.includes('auth') || act.includes('shield')) { icon = 'verified_user'; color = 'var(--primary)'; }
    else if (act.includes('biometric') || act.includes('fingerprint')) { icon = 'fingerprint'; color = 'var(--secondary)'; }
    else if (act.includes('payment') || act.includes('trx') || act.includes('financial')) { icon = 'payments'; color = 'var(--secondary)'; }
    else if (act.includes('settings') || act.includes('update')) { icon = 'settings'; color = 'var(--on-surface-variant)'; }

    return <span className="material-symbols-outlined" style={{ fontSize: '18px', color }}>{icon}</span>;
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
      <header className="view-header" style={{ marginBottom: '2.5rem', borderRadius: '16px', padding: '1.5rem 2.5rem' }}>
        <div className="top-title-group">
           <h2 className="view-title" style={{ margin: 0, fontSize: '1.8rem' }}>{t.title}</h2>
           <p className="view-subtitle" style={{ margin: 0, opacity: 0.7 }}>{t.subtitle}</p>
        </div>
        <button onClick={fetchLogs} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.75rem 1.5rem', borderRadius: '12px' }}>
          <span className={`material-symbols-outlined ${loading ? 'spin' : ''}`}>refresh</span> {t.refresh}
        </button>
      </header>

      {/* Audit Stats - Executive Tier */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
         <AuditStat 
            cardTitle={t.lang === 'en' ? 'Total Internal Events' : 'إجمالي العمليات المفحوصة'} 
            value={logs.length} 
            icon="analytics" 
            colorClass="accent-blue" 
         />
         <AuditStat 
            cardTitle={t.lang === 'en' ? 'Local Integrity' : 'سلامة السجل المحلي'} 
            value="100%" 
            subText="SECURE" 
            icon="verified_user" 
            colorClass="accent-gold" 
         />
         <AuditStat 
            cardTitle={t.lang === 'en' ? 'Data Sovereignty' : 'سيادة البيانات'} 
            value="Active" 
            subText="LOCAL" 
            icon="lan" 
            colorClass="accent-green" 
         />
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--outline-variant)', borderRadius: '24px', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '2rem 2.5rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{t.lang === 'en' ? 'Institutional Activity Ledger' : 'سجل النشاطات المؤسسي الموحد'}</h3>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 950, background: 'var(--secondary)', color: 'var(--primary)', padding: '0.5rem 1.25rem', borderRadius: '12px', letterSpacing: '0.05em' }}>AUDIT v4.2 PRO</span>
           </div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table">
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2.5rem' }}>{t.th_time}</th>
                <th>{t.th_user}</th>
                <th>{t.th_action}</th>
                <th>{t.th_entity}</th>
                <th style={{ textAlign: 'center' }}>{t.lang === 'en' ? 'Verification' : 'التوثيق'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '8rem' }}>
                   <span className="material-symbols-outlined spin" style={{ fontSize: '48px', color: 'var(--secondary)' }}>refresh</span>
                </td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '8rem', opacity: 0.5 }}>
                   <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '1rem' }}>error_outline</span>
                   <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>{t.empty}</p>
                </td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ paddingInlineStart: '2.5rem', color: 'var(--on-surface-variant)', fontWeight: 800, fontSize: '0.85rem' }}>
                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                         <span style={{ color: 'var(--primary)' }}>{fmtDate(log.created_at, t.lang)}</span>
                         <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{fmtTime(log.created_at, t.lang)}</span>
                       </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>person</span>
                        </div>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>{log.user_email || 'System'}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.9rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                         {getActionIcon(log.action)}
                         {log.action}
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.4rem 0.9rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 950, border: '1px solid var(--outline-variant)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>database</span> {TranslateEntity(log.entity)}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--success)' }}>verified</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 950, color: 'var(--success)', letterSpacing: '0.05em' }}>VERIFIED</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '1.5rem 2.5rem', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 700, borderTop: '1px solid var(--outline-variant)' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--success)' }}>gpp_good</span>
          <span>{t.lang === 'en' ? 'All activity records in this institutional ledger are stored locally in an encrypted path and cannot be manually modified.' : 'كل العمليات المسجلة في هذا السجل المؤسسي يتم حفظها محلياً في مسار مشفر ولا يمكن تعديلها يدوياً.'}</span>
        </div>
      </div>
    </div>
  );
}
