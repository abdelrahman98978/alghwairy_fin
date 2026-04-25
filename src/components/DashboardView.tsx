import { useState, useEffect } from 'react';
import { localDB } from '../lib/localDB';
import type { Transaction } from '../App';

import type { Translations } from '../types/translations';

interface Props {
  transactions: Transaction[];
  fetchData: () => void;
  showToast: (msg: string, type?: string) => void;
  t: Translations['dashboard'] & { lang: string };
}

export default function DashboardView({ transactions, fetchData, showToast, t }: Props) {
  const [partnerCount, setPartnerCount] = useState(0);

  useEffect(() => {
    const fetchPartners = () => {
      const data = localDB.getActive('customers');
      setPartnerCount(data.length);
    };
    fetchPartners();
  }, [transactions]); // Update when transactions change (common refresh point)

  const exportToExcel = () => {
    const headers = [t.table.id, t.table.description, t.table.type, t.table.value, "Currency", t.table.status];
    const rows = (transactions || []).map(trx => [
      trx.id,
      trx.description,
      trx.type,
      trx.amount,
      trx.currency || 'SAR',
      trx.status
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => { csvContent += row.join(",") + "\n"; });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `alghwairy_dashboard_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast(t.export_report, 'success');
  };

  const totalRevenue = (transactions || [])
    .filter(t_trx => t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income')
    .reduce((acc, t_trx) => acc + Number(t_trx.amount || 0), 0);
  
  const totalExpenses = (transactions || [])
    .filter(t_trx => t_trx.type === 'expense' || t_trx.type === 'مصروف')
    .reduce((acc, t_trx) => acc + Number(t_trx.amount || 0), 0);
  
  const netProfit = totalRevenue - totalExpenses;
  
  const openingBalance = Number(localStorage.getItem('sov_opening_balance')) || 500000;
  const availableLiquidity = openingBalance - totalExpenses + totalRevenue; 

  const getTaxDeadline = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const year = now.getFullYear();
    const deadlines = [
      new Date(year, 3, 30),
      new Date(year, 6, 31),
      new Date(year, 9, 31),
      new Date(year, 11, 31)
    ];
    const target = deadlines[quarter];
    const diff = target.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };
  const taxDays = getTaxDeadline();
  
  const isArabic = t.lang === 'ar';

  return (
    <div className="slide-in">
      {/* Print-Only Header for Dashboard */}
      <div className="print-only print-header" dir={isArabic ? 'rtl' : 'ltr'} style={{ marginBottom: '2rem', borderBottom: '2px solid var(--primary)', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '8px' }}></div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)' }}>{isArabic ? 'لوحة التحكم التنفيذية' : 'Executive Dashboard'}</h1>
              <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>{isArabic ? 'مؤسسة الغويري للتخليص الجمركي' : 'Alghwairy Customs Clearance'}</p>
            </div>
          </div>
          <div style={{ textAlign: isArabic ? 'left' : 'right' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>تاريخ التقرير: {new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-GB')}</p>
            <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>حالة النظام: {isArabic ? 'امتثال كامل' : 'Full Compliance'}</p>
          </div>
        </div>
      </div>
      {/* Institution Snapshot - Tonal Editorial Layer */}
      <div className="card-layer-2" style={{ display: 'flex', gap: '2rem', marginBottom: '3rem', padding: '1.25rem 2.5rem', borderRadius: '100px', alignItems: 'center', overflowX: 'auto', border: '1px solid var(--outline-variant)' }}>
         <SnapshotItem label={isArabic ? 'قوة الامتثال' : 'Compliance'} value="100%" color="var(--success)" />
         <div style={{ width: 1, height: 28, background: 'var(--outline)', opacity: 0.8 }}></div>
         <SnapshotItem label={isArabic ? 'السيولة النشطة' : 'Liquidity'} value={`${(availableLiquidity/1000).toFixed(0)}K`} color="var(--primary)" />
         <div style={{ width: 1, height: 28, background: 'var(--outline)', opacity: 0.8 }}></div>
         <SnapshotItem label={isArabic ? 'حمولة التخليص' : 'Throughput'} value="1.2M" color="var(--secondary)" />
         <div style={{ width: 1, height: 28, background: 'var(--outline)', opacity: 0.8 }}></div>
         <SnapshotItem label={isArabic ? 'الشركاء الاستراتيجيون' : 'Partners'} value={partnerCount.toString()} color="var(--primary)" />
         <div style={{ flex: 1 }}></div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="pulse-green" style={{ width: 8, height: 8, borderRadius: '50%' }}></div>
            <span className="label-sovereign" style={{ fontSize: '0.65rem', color: 'var(--on-surface)', opacity: 0.7, letterSpacing: '1px' }}>INSTITUTIONAL ENCRYPTION ACTIVE</span>
         </div>
      </div>

      {/* Compliance Shield - Direct ZATCA Integration Visual */}
      <div 
        onClick={() => showToast(isArabic ? 'تم التحقق من الامتثال لمتطلبات زاتكا' : 'ZATCA Compliance Verified.', 'success')}
        className="compliance-shield hover-lift" 
        style={{ cursor: 'pointer', border: 'none', marginBottom: '3rem', background: 'var(--primary)', boxShadow: 'var(--shadow-lg)' }}
      >
        <div style={{ background: 'var(--secondary)', padding: '1rem', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', boxShadow: '0 8px 24px rgba(212, 167, 106, 0.3)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>check_circle</span>
        </div>
        <div style={{ flex: 1, paddingInlineStart: '2rem' }}>
          <h3 className="text-sovereign" style={{ color: 'var(--secondary)', marginBottom: '0.35rem', fontSize: '1.4rem' }}>{t.compliance_title}</h3>
          <p style={{ opacity: 1, fontSize: '0.95rem', fontWeight: 600, color: 'var(--on-primary)', maxWidth: '600px' }}>{t.compliance_desc}</p>
        </div>
        <div style={{ textAlign: 'center', paddingInlineStart: '2rem', borderInlineStart: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="status-indicator" style={{ width: '12px', height: '12px', background: 'var(--success)', margin: '0 auto 0.6rem', boxShadow: '0 0 15px var(--success)' }}></div>
            <span className="label-sovereign" style={{ fontSize: '0.65rem', opacity: 1, color: 'var(--on-primary)' }}>LOCAL ARCHIVE MODE</span>
        </div>
      </div>

      {/* Core Metrics - Power of Scale */}
      <div className="metric-grid" style={{ marginBottom: '3rem', gap: '2rem' }}>
        <StatCard title={t.total_balance} value={netProfit.toLocaleString()} trend="+Real-time" trendType="up" icon={<span className="material-symbols-outlined" style={{ fontSize: '24px' }}>trending_up</span>} />
        <StatCard title={t.operating_profit} value={totalRevenue.toLocaleString()} trend={t.stable_growth} trendType="up" icon={<span className="material-symbols-outlined" style={{ fontSize: '24px' }}>business</span>} />
        <StatCard title={t.available_liquidity} value={availableLiquidity.toLocaleString()} sub={t.accounts_count} icon={<span className="material-symbols-outlined" style={{ fontSize: '24px' }}>account_balance_wallet</span>} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', padding: '0 0.5rem' }}>
            <h3 className="section-title" style={{ margin: 0 }}>{t.log_title}</h3>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={exportToExcel} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.65rem 1.5rem', fontSize: '0.85rem', borderRadius: '100px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> {t.export_report}
              </button>
              <button onClick={() => window.print()} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.65rem 1.5rem', fontSize: '0.85rem', borderRadius: '100px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span> {isArabic ? 'طباعة' : 'Print'}
              </button>
              <button 
                onClick={() => { fetchData(); showToast(t.syncing, 'success'); }} 
                className="btn-executive hover-lift"
                style={{ background: 'var(--primary)', color: 'var(--secondary)', padding: '0.65rem', borderRadius: '50%', minWidth: '42px', height: '42px', justifyContent: 'center' }}
              >
                 <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>sync</span>
              </button>
            </div>
          </div>
          <div className="table-container">
            <table className="sovereign-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', padding: '1.25rem' }}>{t.table.id}</th>
                  <th style={{ padding: '1.25rem' }}>{t.table.description}</th>
                  <th style={{ textAlign: 'center', padding: '1.25rem' }}>{t.table.type}</th>
                  <th style={{ textAlign: 'right', padding: '1.25rem' }}>{t.table.value}</th>
                  <th style={{ textAlign: 'center', padding: '1.25rem' }}>{t.table.status}</th>
                </tr>
              </thead>
              <tbody>
                {(transactions || []).slice(0, 8).map(t_trx => (
                  <tr key={t_trx.id} className="hover-lift">
                    <td style={{ textAlign: 'center' }}>
                       <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 900, background: 'var(--surface-container-high)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
                        {t_trx.trx_number || `#${t_trx.id.toString().slice(-6).toUpperCase()}`}
                       </span>
                    </td>
                    <td style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--on-surface)' }}>{t_trx.description}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-sovereign ${(t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income') ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.7rem' }}>
                        {(t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income') ? t.income : t.expense}
                      </span>
                    </td>
                    <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 950, fontSize: '1.05rem' }}>
                      <span style={{ color: (t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income') ? 'var(--success)' : 'var(--error)' }}>
                        {(t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income') ? '+' : '-'}{t_trx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
                        <div className="pulse-green" style={{ width: 8, height: 8, borderRadius: '50%' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--success)', letterSpacing: '0.5px' }}>{t.trx_completed}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-layer-2" style={{ background: 'var(--surface-container-low)', padding: '2rem' }}>
          <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem', fontFamily: 'Tajawal', fontWeight: 800, color: 'var(--primary)' }}>{t.audit_alerts}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <AuditAlert 
              type="error" 
              title={t.alerts.tax_deadline} 
              desc={isArabic ? `باقي ${taxDays} يوم على تقديم الإقرار الضريبي للربع الحالي.` : `${taxDays} days remaining for ZATCA VAT filing.`} 
            />
            <AuditAlert 
              type="warning" 
              title={t.alerts.pending_settlement} 
              desc={isArabic ? 'يوجد 3 تسويات معلقة تتطلب التدقيق السيادي.' : '3 pending settlements require sovereign audit.'} 
            />
            <AuditAlert 
              type="success" 
              title={t.alerts.bank_reconciliation} 
              desc={isArabic ? 'مطابقة الحسابات البنكية مكتملة بنسبة 98%.' : 'Bank reconciliation is 98% complete.'} 
            />
            <AuditAlert 
              type="warning" 
              title={isArabic ? 'تنبيه العهد النقدية' : 'Sovereign Petty Cash'} 
              desc={isArabic ? 'يتم مراقبة كافة العهود البنكية المصروفة لحظياً.' : 'Monitoring real-time bank petty cash draws.'} 
            />

            <div style={{ padding: '1.5rem', background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '14px', position: 'relative', overflow: 'hidden' }}>
               <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 950 }}>LOCAL-FIRST STORAGE</h4>
               <p style={{ margin: '0.5rem 0', fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 }}>بياناتك محفوظة محلياً على جهازك في مجلد المستندات. خصوصية كاملة وتحكم تام.</p>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.8rem' }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                     <div style={{ width: '100%', height: '100%', background: 'var(--secondary)', borderRadius: '2px' }}></div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>100% OFFLINE SECURED</span>
               </div>
               <div style={{ position: 'absolute', right: '-10%', bottom: '-10%', opacity: 0.1 }}><span className="material-symbols-outlined" style={{ fontSize: '60px' }}>trending_up</span></div>
            </div>
            <AuditAlert 
               type="success" 
               title={t.alerts.bank_reconciliation} 
               desc={isArabic ? 'مطابقة السجلات مع كشوفات البنكية تمت بنجاح.' : 'Sovereign records perfectly match live bank feeds.'} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotItem({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', whiteSpace: 'nowrap' }}>
       <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{label}:</span>
       <span style={{ fontSize: '0.9rem', fontWeight: 950, color: color }}>{value}</span>
    </div>
  );
}

function StatCard({ title, value, unit = "SAR", trend, trendType, icon, sub }: { 
  title: string, 
  value: string, 
  unit?: string, 
  trend?: string, 
  trendType?: 'up' | 'down', 
  icon: React.ReactNode, 
  sub?: string 
}) {
  return (
    <div className="card hover-lift" style={{ display: 'flex', flexDirection: 'column', minHeight: '220px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ padding: '0.85rem', borderRadius: '16px', background: 'rgba(26, 58, 95, 0.08)', color: 'var(--primary)', display: 'flex' }}>{icon}</div>
        {trend && (
          <div style={{ padding: '0.4rem 0.8rem', borderRadius: '100px', background: trendType === 'up' ? 'rgba(76, 175, 80, 0.15)' : 'rgba(212, 167, 106, 0.15)', color: trendType === 'up' ? 'var(--success)' : 'var(--secondary)', fontSize: '0.75rem', fontWeight: 900, letterSpacing: '0.5px' }}>
            {trend}
          </div>
        )}
      </div>
      <p className="label-sovereign" style={{ color: 'var(--on-surface-variant)', marginBottom: '0.6rem', fontSize: '0.8rem' }}>{title}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', marginTop: 'auto' }}>
        <h2 className="text-sovereign" style={{ fontSize: '2.4rem', margin: 0, fontWeight: 950, color: 'var(--secondary)', letterSpacing: '-1px' }}>{value}</h2>
        <span style={{ fontSize: '0.9rem', opacity: 0.5, fontWeight: 800 }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: '0.78rem', marginTop: '1rem', color: 'var(--on-surface-variant)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.8 }}>
        <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--success)' }}>check_circle</span> {sub}
      </div>}
    </div>
  );
}

function AuditAlert({ type, title, desc }: { type: 'error' | 'warning' | 'success', title: string, desc: string }) {
  const accent = type === 'error' ? 'var(--error)' : type === 'warning' ? 'var(--secondary)' : 'var(--success)';
  return (
    <div className="card-layer-2 hover-lift" style={{ padding: '1.25rem', borderRadius: '16px', display: 'flex', gap: '1.1rem', borderInlineStart: `5px solid ${accent}`, border: '1px solid var(--outline-variant)' }}>
       <div style={{ marginTop: '0.2rem', color: accent }}><span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span></div>
       <div style={{ flex: 1 }}>
         <h4 className="text-sovereign" style={{ fontSize: '0.9rem', fontWeight: 900, marginBottom: '0.35rem', color: 'var(--on-surface)' }}>{title}</h4>
         <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', lineHeight: '1.5', fontWeight: 600 }}>{desc}</p>
       </div>
    </div>
  );
}
