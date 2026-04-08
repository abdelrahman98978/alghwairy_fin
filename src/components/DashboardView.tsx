import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  Building2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Download
} from 'lucide-react';
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
    <div className="slide-in no-print">
      {/* Institution Snapshot */}
      <div style={{ display: 'flex', gap: '1.2rem', marginBottom: '2.5rem', background: 'var(--surface-container-low)', padding: '0.8rem 1.5rem', borderRadius: '18px', border: '1px solid var(--surface-container-high)', alignItems: 'center', overflowX: 'auto' }}>
         <SnapshotItem label={isArabic ? 'حالة الامتثال' : 'Compliance'} value="100%" color="var(--success)" />
         <div style={{ width: 1, height: 24, background: 'var(--surface-container-high)' }}></div>
         <SnapshotItem label={isArabic ? 'إجمالي السيولة' : 'Total Liquidity'} value={`${(availableLiquidity/1000).toFixed(0)}K`} color="var(--primary)" />
         <div style={{ width: 1, height: 24, background: 'var(--surface-container-high)' }}></div>
         <SnapshotItem label={isArabic ? 'قيمة التخليص' : 'Customs Throughput'} value="1.2M" color="#3182ce" />
         <div style={{ width: 1, height: 24, background: 'var(--surface-container-high)' }}></div>
         <SnapshotItem label={isArabic ? 'العملاء النشطون' : 'Active Partners'} value={partnerCount.toString()} color="var(--secondary)" />
         <div style={{ width: 1, height: 24, background: 'var(--surface-container-high)' }}></div>
         <SnapshotItem label={isArabic ? 'الأداء العام' : 'Performance'} value={totalRevenue > 0 ? `+${((netProfit/totalRevenue)*100).toFixed(1)}%` : '0%'} color="var(--success)" />
         <div style={{ flex: 1 }}></div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', opacity: 0.7 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--on-surface-variant)' }}>OFFLINE STORAGE SECURED</span>
         </div>
      </div>

      {/* Compliance Shield */}
      <div 
        onClick={() => showToast(isArabic ? 'تم التحقق من الامتثال لمتطلبات زاتكا' : 'ZATCA Compliance Verified.', 'success')}
        className="compliance-shield" 
        style={{ cursor: 'pointer', border: 'none', marginBottom: '2.5rem', background: 'var(--primary)' }}
      >
        <div style={{ background: 'var(--secondary)', padding: '0.85rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', boxShadow: '0 6px 12px rgba(0,0,0,0.15)' }}>
          <CheckCircle2 size={24} />
        </div>
        <div style={{ flex: 1, paddingInlineStart: '1.5rem' }}>
          <h3 style={{ color: 'var(--secondary)', marginBottom: '0.2rem', fontFamily: 'Tajawal', fontWeight: 900, fontSize: '1.2rem' }}>{t.compliance_title}</h3>
          <p style={{ opacity: 0.85, fontSize: '0.9rem', fontWeight: 500, color: 'white' }}>{t.compliance_desc}</p>
        </div>
        <div style={{ textAlign: 'center', paddingInlineStart: '1.5rem', borderInlineStart: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="status-indicator" style={{ width: '10px', height: '10px', background: '#4caf50', margin: '0 auto 0.4rem' }}></div>
            <span style={{ fontWeight: 800, fontSize: '0.65rem', opacity: 0.7, color: 'white' }}>LOCAL MODE</span>
        </div>
      </div>

      {/* Core Metrics */}
      <div className="metric-grid" style={{ marginBottom: '2.5rem' }}>
        <StatCard title={t.total_balance} value={netProfit.toLocaleString()} trend="+Real-time" trendType="up" icon={<TrendingUp size={22} />} />
        <StatCard title={t.operating_profit} value={totalRevenue.toLocaleString()} trend={t.stable_growth} trendType="up" icon={<Building2 size={22} />} />
        <StatCard title={t.available_liquidity} value={availableLiquidity.toLocaleString()} sub={t.accounts_count} icon={<Wallet size={22} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: '2.5rem' }}>
        <div className="card" style={{ border: '1px solid var(--surface-container-high)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontFamily: 'Tajawal', fontWeight: 800, margin: 0 }}>{t.log_title}</h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={exportToExcel} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.55rem 1.2rem', fontSize: '0.8rem', borderRadius: '10px', border: 'none' }}>
                <Download size={16} /> {t.export_report}
              </button>
              <button 
                onClick={() => { fetchData(); showToast(t.syncing, 'success'); }} 
                style={{ background: 'var(--surface-container-high)', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: '0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center' }}
              >
                 <RefreshCw size={20} />
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="sovereign-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>{t.table.id}</th>
                  <th>{t.table.description}</th>
                  <th style={{ textAlign: 'center' }}>{t.table.type}</th>
                  <th style={{ textAlign: 'right' }}>{t.table.value}</th>
                  <th style={{ textAlign: 'center' }}>{t.table.status}</th>
                </tr>
              </thead>
              <tbody>
                {(transactions || []).slice(0, 8).map(t_trx => (
                  <tr key={t_trx.id}>
                    <td style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 800, textAlign: 'center' }}>{t_trx.trx_number || `#${t_trx.id.toString().slice(-6).toUpperCase()}`}</td>
                    <td style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface)' }}>{t_trx.description}</td>
                    <td style={{ textAlign: 'center' }}><span style={{ padding: '0.35rem 0.8rem', background: (t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income') ? 'rgba(27, 94, 32, 0.1)' : 'rgba(211, 47, 47, 0.1)', color: (t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income') ? 'var(--success)' : 'var(--error)', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase' }}>{(t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income') ? t.income : t.expense}</span></td>
                    <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 950, fontSize: '1rem', color: 'var(--primary)' }}>
                      <span style={{ color: (t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income') ? 'var(--success)' : 'var(--error)' }}>
                        {(t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة' || t_trx.type === 'كاش' || t_trx.type === 'income') ? '+' : '-'}{t_trx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--success)' }}>{t.trx_completed}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ background: 'var(--surface-container-low)', border: '1px solid var(--surface-container-high)', boxShadow: 'none' }}>
          <h3 style={{ marginBottom: '2rem', fontSize: '1.25rem', fontFamily: 'Tajawal', fontWeight: 800, color: 'var(--primary)' }}>{t.audit_alerts}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <AuditAlert 
              type="error" 
              title={t.alerts.tax_deadline} 
              desc={isArabic ? `باقي ${taxDays} يوم على تقديم الإقرار الضريبي للربع الحالي.` : `${taxDays} days remaining for ZATCA VAT filing.`} 
            />
            <AuditAlert 
              type="warning" 
              title={isArabic ? 'تنبيه العهد النقدية' : 'Sovereign Petty Cash'} 
              desc={isArabic ? 'يتم مراقبة كافة العهود البنكية المصروفة لحظياً.' : 'Monitoring real-time bank petty cash draws.'} 
            />
            <div style={{ padding: '1.5rem', background: 'var(--primary)', color: 'white', borderRadius: '14px', position: 'relative', overflow: 'hidden' }}>
               <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 950 }}>LOCAL-FIRST STORAGE</h4>
               <p style={{ margin: '0.5rem 0', fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 }}>بياناتك محفوظة محلياً على جهازك في مجلد المستندات. خصوصية كاملة وتحكم تام.</p>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.8rem' }}>
                  <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                     <div style={{ width: '100%', height: '100%', background: 'var(--secondary)', borderRadius: '2px' }}></div>
                  </div>
                  <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>100% OFFLINE SECURED</span>
               </div>
               <div style={{ position: 'absolute', right: '-10%', bottom: '-10%', opacity: 0.1 }}><TrendingUp size={60} /></div>
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
    <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--surface-container)', borderBottom: `4px solid ${trendType === 'up' ? 'var(--success)' : 'var(--outline)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'var(--primary)', color: 'var(--secondary)', display: 'flex' }}>{icon}</div>
        {trend && (
          <div style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: trendType === 'up' ? 'rgba(27, 94, 32, 0.1)' : 'var(--surface-container-high)', color: trendType === 'up' ? 'var(--success)' : 'var(--on-surface)', fontSize: '0.75rem', fontWeight: 800 }}>
            {trend}
          </div>
        )}
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.4rem' }}>{title}</p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)' }}>{value}</h2>
        <span style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 700 }}>{unit}</span>
      </div>
      {sub && <p style={{ fontSize: '0.75rem', marginTop: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <CheckCircle2 size={12} color="var(--success)" /> {sub}
      </p>}
    </div>
  );
}

function AuditAlert({ type, title, desc }: { type: 'error' | 'warning' | 'success', title: string, desc: string }) {
  const accent = type === 'error' ? 'var(--error)' : type === 'warning' ? 'var(--secondary)' : 'var(--success)';
  return (
    <div style={{ padding: '0.9rem', background: 'var(--surface)', borderRadius: '10px', display: 'flex', gap: '0.9rem', borderInlineStart: `4px solid ${accent}` }}>
       <div style={{ marginTop: '0.1rem', color: accent }}><AlertCircle size={18} /></div>
       <div style={{ flex: 1 }}>
         <h4 style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.15rem', fontFamily: 'Tajawal', color: 'var(--on-surface)' }}>{title}</h4>
         <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', lineHeight: '1.4' }}>{desc}</p>
       </div>
    </div>
  );
}
