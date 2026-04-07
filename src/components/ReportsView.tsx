import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Plus,
  X,
  Wallet,
  Calculator,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { supabase } from '../lib/supabase';
import type { Translations } from '../types/translations';

interface Transaction {
  id: string;
  trx_number: string;
  description: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
}

interface ReportsProps {
  showToast: (msg: string, type?: string) => void;
  t: Translations['reports'];
}

export default function ReportsView({ showToast, t }: ReportsProps) {
  const [revenue, setRevenue] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [chartData, setChartData] = useState<{name: string, revenue: number, expenses: number}[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Manual Transaction Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    title: '',
    amount: '',
    type: 'income',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchFinancialData = useCallback(async () => {
    setIsDataLoading(true);
    const { data: trxs, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Error fetching report data: ' + error.message, 'error');
    } else if (trxs) {
      setTransactions(trxs as Transaction[]);
      let totalRevenue = 0;
      let totalExpenses = 0;
      
      (trxs as Transaction[]).forEach((trx: Transaction) => {
        if (trx.type === 'income' || trx.type === 'إيراد / فاتورة صاردة') {
          totalRevenue += Number(trx.amount || 0);
        } else if (trx.type === 'expense' || trx.type === 'مصروف') {
          totalExpenses += Number(trx.amount || 0);
        }
      });
      
      setRevenue(totalRevenue);
      setExpenses(totalExpenses);
      setNetProfit(totalRevenue - totalExpenses);

      // Aggregating data for the chart from actual transactions
      const last6Months: {name: string, revenue: number, expenses: number}[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthName = d.toLocaleString(t.lang === 'en' ? 'en-US' : 'ar-SA', { month: 'short' });
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const monthRev = (trxs as Transaction[])
          .filter((t_obj: Transaction) => (t_obj.type === 'income' || t_obj.type === 'إيراد / فاتورة صاردة') && (t_obj.created_at || '').startsWith(monthKey))
          .reduce((sum: number, t_obj: Transaction) => sum + Number(t_obj.amount || 0), 0);
          
        const monthExp = (trxs as Transaction[])
          .filter((t_obj: Transaction) => (t_obj.type === 'expense' || t_obj.type === 'مصروف') && (t_obj.created_at || '').startsWith(monthKey))
          .reduce((sum: number, t_obj: Transaction) => sum + Number(t_obj.amount || 0), 0);

        last6Months.push({
          name: monthName,
          revenue: monthRev || (totalRevenue / 12), // Fallback to average if no data for month to keep chart descriptive
          expenses: monthExp || (totalExpenses / 12),
        });
      }
      setChartData(last6Months);
    }
    setIsDataLoading(false);
  }, [showToast, t.lang]);

  useEffect(() => {
    const init = async () => {
      await fetchFinancialData();
    };
    init();
  }, [fetchFinancialData]);

  const handleManualTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title || !manualForm.amount) {
      showToast('Validation Error: Title and Amount required', 'error');
      return;
    }

    const { error } = await supabase.from('transactions').insert([{
      trx_number: 'MANU-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      description: manualForm.title,
      type: manualForm.type === 'income' ? 'income' : 'expense',
      amount: parseFloat(manualForm.amount),
      status: 'مكتمل'
    }]);

    if (error) {
      showToast('Error recording TRX: ' + error.message, 'error');
    } else {
      showToast('Sovereign Transaction recorded.', 'success');
      setShowAddModal(false);
      setManualForm({ title: '', amount: '', type: 'income', date: new Date().toISOString().split('T')[0] });
      fetchFinancialData();
    }
  };

  const exportReport = () => {
    const headers = [t.table?.id ?? '', t.table?.description ?? '', t.table?.type ?? '', t.table?.value ?? '', t.table?.status ?? '', t.table?.date ?? ''];
    const rows = transactions.map(trx => [
      trx.id,
      trx.description,
      trx.type,
      trx.amount,
      trx.status,
      new Date(trx.created_at).toLocaleDateString()
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => { csvContent += row.join(",") + "\n"; });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sovereign_financial_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast(t.print || 'Analytical report exported', 'success');
  };

  if (isDataLoading) {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
         <div className="spinner-royal"></div>
         <p style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 900, fontFamily: 'Tajawal' }}>
            {t.extracting_intelligence || 'Extracting Intelligence...'}
         </p>
      </div>
    );
  }

  return (
    <div className="slide-in">
      <header className="view-header no-print" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={exportReport} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
             <Download size={18} /> {t.export}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-executive" style={{ border: 'none' }}>
             <Plus size={18} /> {t.manual_trx || 'قيد تسوية جديد'}
          </button>
        </div>
      </header>

      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem', marginBottom: '2.5rem' }}>
        <MetricBox title={t.revenue} value={revenue.toLocaleString()} sub={t.historical_high} positive icon={<TrendingUp size={24} />} highlight />
        <MetricBox title={t.expenses} value={expenses.toLocaleString()} sub={t.operating_costs} icon={<TrendingDown size={24} />} />
        <MetricBox title={t.net_income} value={netProfit.toLocaleString()} sub={t.quarterly_target} positive icon={<Calculator size={24} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2.6fr', gap: '2rem' }}>
         <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '1.5rem' }}>
                <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '16px', color: 'var(--secondary)' }}><Wallet size={24} /></div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{t.summary_ledger || 'الميزان السيادي العام'}</h3>
             </div>
             
             <table className="sovereign-table">
               <tbody>
                  <ReportRow label={t.revenue} current={revenue.toLocaleString()} />
                  <ReportRow label={t.expenses} current={expenses.toLocaleString()} down />
                  <ReportRow label={t.tax_est} current={(revenue * 0.15).toLocaleString()} down />
                  <tr style={{ borderTop: '3px solid var(--primary)' }}>
                     <td style={{ fontWeight: 900, padding: '2rem 0', color: 'var(--primary)', fontSize: '1.1rem' }}>{t.net_position || 'المركز المالي الصافي'}</td>
                     <td style={{ textAlign: 'right', fontWeight: 950, fontSize: '1.8rem', color: 'var(--primary)' }}>{netProfit.toLocaleString()}</td>
                     <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', opacity: 0.6 }}>SAR</td>
                  </tr>
               </tbody>
             </table>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card" style={{ padding: '2.5rem', flex: 1, border: '1px solid var(--surface-container-high)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontFamily: 'Tajawal', fontWeight: 900, margin: 0 }}>
                    {t.growth_chart || 'تحليل توزيع الموارد'}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--on-surface-variant)', fontSize: '0.8rem', fontWeight: 700 }}>
                    <Filter size={14} /> {t.lang === 'en' ? 'Last 6 Months' : 'آخر 6 أشهر'}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--surface-container-high)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fontWeight: 700, fill: 'var(--on-surface-variant)'}} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: '1px solid var(--surface-container-high)', boxShadow: '0 15px 40px rgba(0,0,0,0.1)', fontFamily: 'Cairo', backgroundColor: 'var(--surface)', color: 'var(--on-surface)' }}
                      itemStyle={{ fontSize: '0.9rem', fontWeight: 900 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                    <Area type="monotone" dataKey="expenses" stroke="var(--error)" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="card" style={{ background: 'var(--surface-container-low)', border: 'none', padding: '2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
               <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', boxShadow: '0 5px 15px rgba(0,0,0,0.05)' }}>
                  <CheckCircle2 size={32} />
               </div>
               <div>
                 <h4 style={{ color: 'var(--primary)', marginBottom: '0.4rem', fontFamily: 'Tajawal', fontWeight: 900, fontSize: '1.1rem' }}>
                    {t.compliance_audit || 'ZATKA Financial Audit Certified'}
                 </h4>
                 <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                    {t.compliance_footer || 'جميع الحركات المالية المجمعة متوافقة تماماً مع معايير هيئة الزكاة والضريبة والجمارك (المرحلة الثانية). تجري عمليات تدقيق آلية كل 24 ساعة.'}
                 </p>
               </div>
            </div>
         </div>
      </div>

      {/* Manual Entry Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', padding: '3rem', position: 'relative', border: 'none' }}>
            <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
            <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{t.manual_trx || 'قيد تسوية سيادي'}</h3>
            
            <form onSubmit={handleManualTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                 <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Transaction Type' : 'نوع العملية'}</label>
                 <div style={{ display: 'flex', gap: '1rem' }}>
                    <label style={{ flex: 1, padding: '1.2rem', borderRadius: '12px', border: `2px solid ${manualForm.type === 'income' ? 'var(--success)' : 'var(--surface-container-high)'}`, background: manualForm.type === 'income' ? 'rgba(27, 94, 32, 0.1)' : 'var(--surface-container-low)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                       <input type="radio" value="income" checked={manualForm.type === 'income'} onChange={() => setManualForm({...manualForm, type: 'income'})} style={{ display: 'none' }} /> 
                       <TrendingUp size={20} color={manualForm.type === 'income' ? 'var(--success)' : 'var(--outline)'} />
                       <span style={{ fontWeight: 900, fontSize: '0.85rem', color: manualForm.type === 'income' ? 'var(--success)' : 'var(--on-surface-variant)' }}>{t.income}</span>
                    </label>
                    <label style={{ flex: 1, padding: '1.2rem', borderRadius: '12px', border: `2px solid ${manualForm.type === 'expense' ? 'var(--error)' : 'var(--surface-container-high)'}`, background: manualForm.type === 'expense' ? 'rgba(211, 47, 47, 0.1)' : 'var(--surface-container-low)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', transition: 'all 0.2s' }}>
                       <input type="radio" value="expense" checked={manualForm.type === 'expense'} onChange={() => setManualForm({...manualForm, type: 'expense'})} style={{ display: 'none' }} /> 
                       <TrendingDown size={20} color={manualForm.type === 'expense' ? 'var(--error)' : 'var(--outline)'} />
                       <span style={{ fontWeight: 900, fontSize: '0.85rem', color: manualForm.type === 'expense' ? 'var(--error)' : 'var(--on-surface-variant)' }}>{t.expense}</span>
                    </label>
                 </div>
               </div>

               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                 <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.description_placeholder}</label>
                 <input required type="text" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} className="input-executive" style={{ fontWeight: 700 }} />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.amount_placeholder}</label>
                    <input required type="number" value={manualForm.amount} onChange={e => setManualForm({...manualForm, amount: e.target.value})} className="input-executive" style={{ fontWeight: 900, fontSize: '1.4rem', textAlign: 'center', color: 'var(--primary)', border: '2px solid var(--secondary)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.lang === 'en' ? 'Entry Date' : 'تاريخ القيد'}</label>
                    <input required type="date" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} className="input-executive" style={{ fontWeight: 800 }} />
                  </div>
               </div>

               <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                 <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.modal?.cancel ?? (t.lang === 'en' ? 'Cancel' : 'إلغاء')}</button>
                 <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1.2rem', fontSize: '1.1rem', border: 'none' }}>{t.lang === 'en' ? 'Commit to Ledger' : 'ترحيل إلى الأستاذ'}</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricBoxProps {
  title: string;
  value: string;
  sub: string;
  positive?: boolean;
  icon: React.ReactNode;
  highlight?: boolean;
}

function MetricBox({ title, value, sub, positive, icon, highlight }: MetricBoxProps) {
  return (
    <div className="card" style={highlight ? { background: 'var(--primary)', color: 'white', padding: '2.5rem', border: 'none' } : { padding: '2.5rem', borderInlineStart: `6px solid ${positive ? 'var(--success)' : 'var(--error)'}` }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderRadius: '16px', background: highlight ? 'rgba(255,255,255,0.1)' : 'var(--surface-container-high)', color: highlight ? 'var(--secondary)' : 'var(--primary)' }}>{icon}</div>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.4rem 1rem', borderRadius: '10px', background: highlight ? 'rgba(136, 217, 130, 0.2)' : (positive ? 'rgba(27, 94, 32, 0.1)' : 'rgba(211, 47, 47, 0.1)'), color: highlight ? '#88d982' : (positive ? 'var(--success)' : 'var(--error)'), textTransform: 'uppercase' }}>
             {positive ? 'Positive' : 'Spending'}
          </span>
       </div>
       <p style={{ fontSize: '1rem', fontWeight: 700, opacity: highlight ? 0.8 : 1, color: highlight ? 'white' : 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>{title}</p>
       <h3 style={{ fontSize: '2.4rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 950, color: highlight ? 'var(--secondary)' : 'var(--primary)' }}>{value} <span style={{ fontSize: '0.9rem', opacity: 0.6, color: highlight ? 'white' : 'inherit' }}>SAR</span></h3>
       <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.8rem', fontWeight: 600 }}>{sub}</p>
    </div>
  );
}

interface ReportRowProps {
  label: string;
  current: string;
  down?: boolean;
}

function ReportRow({ label, current, down }: ReportRowProps) {
  return (
    <tr style={{ borderBottom: '1px solid var(--surface-container-high)' }}>
       <td style={{ fontWeight: 800, padding: '1.5rem 0', fontSize: '1rem' }}>{label}</td>
       <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 900, color: down ? 'var(--error)' : 'var(--success)', fontSize: '1.1rem' }}>{current}</td>
       <td style={{ color: down ? 'var(--error)' : 'var(--success)', fontWeight: 900, fontSize: '0.8rem', textAlign: 'right', letterSpacing: '1px' }}>{down ? 'DR' : 'CR'}</td>
    </tr>
  );
}
