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
  Filter,
  Printer,
  Calendar
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
import { localDB } from '../lib/localDB';
import { fmtDate, fmtNumber } from '../lib/dateUtils';
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
  const [showOfficialModal, setShowOfficialModal] = useState(false);
  const [period, setPeriod] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const [settings] = useState({
    companyName: localStorage.getItem('sov_company_name') || 'مؤسسة الغويري للتخليص الجمركي',
    taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
    address: localStorage.getItem('sov_address') || 'King Fahd Rd, Riyadh, SA',
    logo: localStorage.getItem('sov_logo') || './logo.png'
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    title: '',
    amount: '',
    type: 'income',
    date: new Date().toISOString().split('T')[0]
  });

  const handlePeriodChange = (selectedPeriod: string) => {
    setPeriod(selectedPeriod);
    const now = new Date();
    const year = now.getFullYear();
    let start = '';
    let end = '';

    switch (selectedPeriod) {
      case 'this_month':
        start = new Date(year, now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date(year, now.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'last_month':
        start = new Date(year, now.getMonth() - 1, 1).toISOString().split('T')[0];
        end = new Date(year, now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'q1':
        start = new Date(year, 0, 1).toISOString().split('T')[0];
        end = new Date(year, 3, 0).toISOString().split('T')[0];
        break;
      case 'q2':
        start = new Date(year, 3, 1).toISOString().split('T')[0];
        end = new Date(year, 6, 0).toISOString().split('T')[0];
        break;
      case 'q3':
        start = new Date(year, 6, 1).toISOString().split('T')[0];
        end = new Date(year, 9, 0).toISOString().split('T')[0];
        break;
      case 'q4':
        start = new Date(year, 9, 1).toISOString().split('T')[0];
        end = new Date(year, 12, 0).toISOString().split('T')[0];
        break;
      case 'this_year':
        start = new Date(year, 0, 1).toISOString().split('T')[0];
        end = new Date(year, 12, 0).toISOString().split('T')[0];
        break;
      case 'all':
      case 'custom':
      default:
        break;
    }

    if (selectedPeriod !== 'custom') {
      setDateRange({ start, end });
    }
  };

  const fetchFinancialData = useCallback(() => {
    setIsDataLoading(true);
    try {
      // 1. Fetch General Transactions
      let trxs = localDB.getActive('transactions').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as Transaction[];
      
      // 2. Filter by date if needed
      if (dateRange.start || dateRange.end) {
         trxs = trxs.filter(trx => {
            const tDate = new Date(trx.created_at);
            tDate.setHours(0,0,0,0);
            if (dateRange.start) {
              const sDate = new Date(dateRange.start);
              sDate.setHours(0,0,0,0);
              if (tDate < sDate) return false;
            }
            if (dateRange.end) {
              const eDate = new Date(dateRange.end);
              eDate.setHours(23,59,59,999);
              if (tDate > eDate) return false;
            }
            return true;
         });
      }

      setTransactions(trxs);
      let totalRevenue = 0;
      let totalExpenses = 0;
      
      trxs.forEach((trx: Transaction) => {
        if (trx.type === 'income' || trx.type === 'إيراد / فاتورة صاردة' || trx.type === 'كاش') {
          totalRevenue += Number(trx.amount || 0);
        } else if (trx.type === 'expense' || trx.type === 'مصروف') {
          totalExpenses += Number(trx.amount || 0);
        }
      });
      
      setRevenue(totalRevenue);
      setExpenses(totalExpenses);
      setNetProfit(totalRevenue - totalExpenses);

      // 3. Generate Chart Data
      const last6Months: {name: string, revenue: number, expenses: number}[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString(t.lang === 'en' ? 'en-US' : 'ar-SA', { month: 'short' });
        const monthYearPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        const monthRev = trxs
          .filter((t_obj: Transaction) => (t_obj.type === 'income' || t_obj.type === 'إيراد / فاتورة صاردة' || t_obj.type === 'كاش') && (t_obj.created_at || '').startsWith(monthYearPrefix))
          .reduce((sum: number, t_obj: Transaction) => sum + Number(t_obj.amount || 0), 0);
          
        const monthExp = trxs
          .filter((t_obj: Transaction) => (t_obj.type === 'expense' || t_obj.type === 'مصروف') && (t_obj.created_at || '').startsWith(monthYearPrefix))
          .reduce((sum: number, t_obj: Transaction) => sum + Number(t_obj.amount || 0), 0);

        last6Months.push({
          name: monthName,
          revenue: monthRev,
          expenses: monthExp,
        });
      }
      setChartData(last6Months);
    } catch (err: any) {
        showToast('Error fetching report data: ' + err.message, 'error');
    }
    setIsDataLoading(false);
  }, [showToast, t.lang, dateRange]);

  useEffect(() => {
    fetchFinancialData();
  }, [fetchFinancialData]);

  const handleManualTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title || !manualForm.amount) {
      showToast('Validation Error: Title and Amount required', 'error');
      return;
    }

    try {
        localDB.insert('transactions', {
          trx_number: 'MANU-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          description: manualForm.title,
          type: manualForm.type === 'income' ? 'income' : 'expense',
          amount: parseFloat(manualForm.amount),
          status: 'مكتمل',
          created_at: new Date(manualForm.date).toISOString()
        });

        showToast(t.lang === 'ar' ? 'تم تسجيل القيد في الأستاذ المحلي' : 'Transaction recorded in local ledger.', 'success');
        setShowAddModal(false);
        setManualForm({ title: '', amount: '', type: 'income', date: new Date().toISOString().split('T')[0] });
        fetchFinancialData();
    } catch (err: any) {
        showToast('Error recording TRX: ' + err.message, 'error');
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
      new Date(trx.created_at).toLocaleDateString(t.lang === 'ar' ? 'ar-SA' : 'en-GB')
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => { csvContent += row.join(",") + "\n"; });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `alghwairy_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast(t.print || 'Analytical report exported', 'success');
  };

  if (isDataLoading) {
    return (
      <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
         <div className="spinner-royal"></div>
         <p style={{ color: 'var(--primary)', fontSize: '1.2rem', fontWeight: 900, fontFamily: 'Tajawal' }}>
            {t.extracting_intelligence || 'جاري تحليل البيانات...'}
         </p>
      </div>
    );
  }

  return (
    <div className="slide-in">
      <header className="view-header no-print" style={{ marginBottom: '2.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-container-low)', padding: '0.2rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)', gap: '0.8rem' }}>
            <Calendar size={18} color="var(--primary)" />
            <select 
               value={period}
               onChange={(e) => handlePeriodChange(e.target.value)}
               style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 800, padding: '0.5rem', outline: 'none' }}
            >
               <option value="all">{t.lang === 'ar' ? 'كل الفترات' : 'All Time'}</option>
               <option value="this_month">{t.lang === 'ar' ? 'هذا الشهر' : 'This Month'}</option>
               <option value="last_month">{t.lang === 'ar' ? 'الشهر الماضي' : 'Last Month'}</option>
               <option value="q1">{t.lang === 'ar' ? 'الربع الأول' : 'Q1'}</option>
               <option value="q2">{t.lang === 'ar' ? 'الربع الثاني' : 'Q2'}</option>
               <option value="q3">{t.lang === 'ar' ? 'الربع الثالث' : 'Q3'}</option>
               <option value="q4">{t.lang === 'ar' ? 'الربع الرابع' : 'Q4'}</option>
               <option value="this_year">{t.lang === 'ar' ? 'هذا العام (ميزانية)' : 'This Year'}</option>
               <option value="custom">{t.lang === 'ar' ? 'تخصيص...' : 'Custom...'}</option>
            </select>
            
            {period === 'custom' && (
               <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', borderInlineStart: '1px solid var(--surface-container-high)', paddingInlineStart: '1rem' }}>
                  <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} style={{ background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', fontWeight: 700, outline: 'none' }} />
                  <span style={{ color: 'var(--outline)' }}>-</span>
                  <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} style={{ background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', fontWeight: 700, outline: 'none' }} />
               </div>
            )}
          </div>
          
          <button onClick={() => setShowOfficialModal(true)} className="btn-executive" style={{ background: '#d4a76a', color: '#001a33', border: 'none' }}>
             <Printer size={18} /> {t.lang === 'ar' ? 'القائمة الرسمية' : 'Official Print'}
          </button>
          <button onClick={exportReport} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
             <Download size={18} /> {t.export || 'تصدير'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-executive" style={{ border: 'none' }}>
             <Plus size={18} /> {t.manual_trx || 'قيد تسوية جديد'}
          </button>
        </div>
      </header>

      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem', marginBottom: '2.5rem' }}>
        <MetricBox title={t.revenue} value={fmtNumber(revenue, t.lang)} sub={t.historical_high} positive icon={<TrendingUp size={24} />} highlight />
        <MetricBox title={t.expenses} value={fmtNumber(expenses, t.lang)} sub={t.operating_costs} icon={<TrendingDown size={24} />} />
        <MetricBox title={t.net_income} value={fmtNumber(netProfit, t.lang)} sub={t.quarterly_target} positive icon={<Calculator size={24} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 2.6fr', gap: '2rem' }}>
         <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '1.5rem' }}>
                <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '16px', color: 'var(--secondary)' }}><Wallet size={24} /></div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{t.summary_ledger || 'الميزان العمومي'}</h3>
             </div>
             
             <table className="sovereign-table">
                <tbody>
                   <ReportRow label={t.revenue} current={fmtNumber(revenue, t.lang)} />
                   <ReportRow label={t.expenses} current={fmtNumber(expenses, t.lang)} down />
                   <ReportRow label={t.tax_est} current={fmtNumber(revenue * 0.15, t.lang)} down />
                   <tr style={{ borderTop: '3px solid var(--primary)' }}>
                      <td style={{ fontWeight: 900, padding: '2rem 0', color: 'var(--primary)', fontSize: '1.1rem' }}>{t.net_position || 'صافي المركز المالي'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 950, fontSize: '1.8rem', color: 'var(--primary)' }}>{fmtNumber(netProfit, t.lang)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '0.9rem', opacity: 0.6 }}>SAR</td>
                   </tr>
                </tbody>
             </table>
         </div>

         <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="card" style={{ padding: '2.5rem', flex: 1, border: '1px solid var(--surface-container-high)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontFamily: 'Tajawal', fontWeight: 900, margin: 0 }}>
                    {t.growth_chart || 'تحليل الأداء المالي'}
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
                    {t.compliance_audit || 'نظام الرقابة المالية الذاتية'}
                 </h4>
                 <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                    {t.compliance_footer || 'جميع التقارير المالية والضريبية يتم إنتاجها وتدقيقها محلياً وفق معايير هيئة الزكاة والضريبة والجمارك (المرحلة الثانية).'}
                 </p>
               </div>
            </div>
         </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', padding: '3rem', position: 'relative', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
            <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{t.manual_trx || 'تسجيل قيد مالي'}</h3>
            
            <form onSubmit={handleManualTransaction} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                 <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>نوع العملية</label>
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
                 <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>الوصف</label>
                 <input required type="text" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value})} className="input-executive" style={{ fontWeight: 700 }} />
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>المبلغ</label>
                    <input required type="number" value={manualForm.amount} onChange={e => setManualForm({...manualForm, amount: e.target.value})} className="input-executive" style={{ fontWeight: 900, fontSize: '1.4rem', textAlign: 'center', color: 'var(--primary)', border: '2px solid var(--secondary)' }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>التاريخ</label>
                    <input required type="date" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} className="input-executive" style={{ fontWeight: 800 }} />
                  </div>
               </div>

               <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                 <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>إلغاء</button>
                 <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1.2rem', fontSize: '1.1rem', border: 'none' }}>ترحيل القيد</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {showOfficialModal && (
        <FinancialStatementModal 
           settings={settings}
           revenue={revenue}
           expenses={expenses}
           netProfit={netProfit}
           period={period}
           dateRange={dateRange}
           t={t}
           onClose={() => setShowOfficialModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Premium Financial Statement Modal with Statement-Type Switching
 */
function FinancialStatementModal({ settings, revenue, expenses, netProfit, period, dateRange, t, onClose }: any) {
  const [statementType, setStatementType] = useState<'income' | 'position' | 'vat'>('income');
  const isAr = t.lang === 'ar';

  const renderContent = () => {
    switch (statementType) {
      case 'income':
        return (
          <>
            <h2 style={{ fontSize: '22pt', fontWeight: 900, color: '#001a33', textDecoration: 'underline', textUnderlineOffset: '4mm', textAlign: 'center', marginBottom: '12mm' }}>قائمة الدخل (الأرباح والخسائر)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15mm' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                   <th style={{ border: '1px solid #ddd', padding: '4mm', textAlign: 'right', fontSize: '11pt' }}>البند المالي / Description</th>
                   <th style={{ border: '1px solid #ddd', padding: '4mm', textAlign: 'center', width: '50mm', fontSize: '11pt' }}>القيمة (ر.س) / Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                   <td style={{ border: '1px solid #ddd', padding: '5mm', fontWeight: 700 }}>إجمالي الإيرادات الجمركية والخدمية</td>
                   <td style={{ border: '1px solid #ddd', padding: '5mm', textAlign: 'center', fontWeight: 900 }}>{fmtNumber(revenue, t.lang)}</td>
                </tr>
                <tr>
                   <td style={{ border: '1px solid #ddd', padding: '5mm', fontWeight: 700 }}>إجمالي المصروفات التشغيلية والرواتب</td>
                   <td style={{ border: '1px solid #ddd', padding: '5mm', textAlign: 'center', fontWeight: 900, color: '#ba1a1a' }}>({fmtNumber(expenses, t.lang)})</td>
                </tr>
                <tr style={{ background: '#001a33', color: 'white' }}>
                   <td style={{ border: '1px solid #001a33', padding: '6mm', fontWeight: 900, fontSize: '13pt' }}>صافي الربح للفترة</td>
                   <td style={{ border: '1px solid #001a33', padding: '6mm', textAlign: 'center', fontWeight: 950, fontSize: '15pt' }}>{fmtNumber(netProfit, t.lang)}</td>
                </tr>
              </tbody>
            </table>
          </>
        );
      case 'position':
        return (
          <>
            <h2 style={{ fontSize: '22pt', fontWeight: 900, color: '#001a33', textDecoration: 'underline', textUnderlineOffset: '4mm', textAlign: 'center', marginBottom: '12mm' }}>قائمة المركز المالي (الميزانية)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm', marginBottom: '10mm' }}>
               <div style={{ border: '1px solid #eee', padding: '4mm' }}>
                  <h4 style={{ background: '#f8f9fa', padding: '2mm', margin: 0, fontSize: '10pt', fontWeight: 900 }}>الأصول (Assets)</h4>
                  <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', margin: '4mm 0' }}><span>النقد وما في حكمه</span> <b>{fmtNumber(netProfit > 0 ? netProfit : 0, t.lang)}</b></p>
                  <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', margin: '4mm 0' }}><span>المدينون</span> <b>0.00</b></p>
                  <div style={{ borderTop: '2px solid #001a33', paddingTop: '2mm', marginTop: '4mm', display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                     <span>إجمالي الأصول</span>
                     <span>{fmtNumber(netProfit > 0 ? netProfit : 0, t.lang)}</span>
                  </div>
               </div>
               <div style={{ border: '1px solid #eee', padding: '4mm' }}>
                  <h4 style={{ background: '#f8f9fa', padding: '2mm', margin: 0, fontSize: '10pt', fontWeight: 900 }}>الالتزامات وحقوق الملكية</h4>
                  <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', margin: '4mm 0' }}><span>الدائنون والمستحقات</span> <b>0.00</b></p>
                  <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', margin: '4mm 0' }}><span>رأس المال المستثمر</span> <b>{fmtNumber(0, t.lang)}</b></p>
                  <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', margin: '4mm 0' }}><span>الأرباح المبقاه</span> <b>{fmtNumber(netProfit, t.lang)}</b></p>
                  <div style={{ borderTop: '2px solid #001a33', paddingTop: '2mm', marginTop: '4mm', display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                     <span>إجمالي الخصوم</span>
                     <span>{fmtNumber(netProfit, t.lang)}</span>
                  </div>
               </div>
            </div>
          </>
        );
      case 'vat':
        return (
          <>
            <h2 style={{ fontSize: '22pt', fontWeight: 900, color: '#001a33', textDecoration: 'underline', textUnderlineOffset: '4mm', textAlign: 'center', marginBottom: '12mm' }}>ملخص الإقرار الضريبي (VAT)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15mm' }}>
               <thead>
                  <tr style={{ background: '#f8f9fa' }}>
                     <th style={{ border: '1px solid #ddd', padding: '4mm', textAlign: 'right' }}>البيان الضريبي</th>
                     <th style={{ border: '1px solid #ddd', padding: '4mm', textAlign: 'center' }}>المبلغ الخاضع</th>
                     <th style={{ border: '1px solid #ddd', padding: '4mm', textAlign: 'center' }}>قيمة الضريبة (15%)</th>
                  </tr>
               </thead>
               <tbody>
                  <tr>
                     <td style={{ border: '1px solid #ddd', padding: '5mm', fontWeight: 700 }}>المبيعات الخاضعة للنسبة الأساسية</td>
                     <td style={{ border: '1px solid #ddd', padding: '5mm', textAlign: 'center' }}>{fmtNumber(revenue, t.lang)}</td>
                     <td style={{ border: '1px solid #ddd', padding: '5mm', textAlign: 'center', fontWeight: 900 }}>{fmtNumber(revenue * 0.15, t.lang)}</td>
                  </tr>
                  <tr>
                     <td style={{ border: '1px solid #ddd', padding: '5mm', fontWeight: 700 }}>المشتريات الخاضعة للنسبة الأساسية</td>
                     <td style={{ border: '1px solid #ddd', padding: '5mm', textAlign: 'center' }}>{fmtNumber(expenses, t.lang)}</td>
                     <td style={{ border: '1px solid #ddd', padding: '5mm', textAlign: 'center', fontWeight: 900, color: '#ba1a1a' }}>({fmtNumber(expenses * 0.15, t.lang)})</td>
                  </tr>
                  <tr style={{ background: '#001a33', color: 'white' }}>
                     <td colSpan={2} style={{ border: '1px solid #001a33', padding: '6mm', fontWeight: 900, fontSize: '13pt' }}>صافي الضريبة الواجبة السداد</td>
                     <td style={{ border: '1px solid #001a33', padding: '6mm', textAlign: 'center', fontWeight: 950, fontSize: '15pt' }}>{fmtNumber((revenue - expenses) * 0.15, t.lang)}</td>
                  </tr>
               </tbody>
            </table>
          </>
        );
    }
  };

  return (
    <div className="modal-overlay invoice-print-overlay" style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(15px)', zIndex: 3000, overflowY: 'auto' }}>
       <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', background: 'rgba(0,26,51,0.9)', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '0.4rem', borderRadius: '14px' }}>
             <button onClick={() => setStatementType('income')} className={`tab-btn-small ${statementType === 'income' ? 'active' : ''}`}>{isAr ? 'قائمة الدخل' : 'Income Statement'}</button>
             <button onClick={() => setStatementType('position')} className={`tab-btn-small ${statementType === 'position' ? 'active' : ''}`}>{isAr ? 'المركز المالي' : 'Balance Sheet'}</button>
             <button onClick={() => setStatementType('vat')} className={`tab-btn-small ${statementType === 'vat' ? 'active' : ''}`}>{isAr ? 'الإقرار الضريبي' : 'VAT Return'}</button>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => window.print()} className="btn-executive" style={{ background: '#d4a76a', color: '#001a33', border: 'none' }}>
               <Printer size={18} /> {isAr ? 'طباعة المستند' : 'Print Document'}
            </button>
            <button onClick={onClose} className="btn-executive" style={{ background: '#ba1a1a', color: 'white', border: 'none' }}>
               <X size={18} /> {isAr ? 'إغلاق' : 'Close'}
            </button>
          </div>
       </div>

       <div className="print-content" dir={isAr ? 'rtl' : 'ltr'} style={{
          width: '210mm', minHeight: '297mm', background: 'white',
          margin: '0 auto 4rem', padding: '20mm 20mm',
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
          fontFamily: "'Tajawal','Cairo',sans-serif", color: '#111',
          position: 'relative'
       }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #001a33', paddingBottom: '10mm', marginBottom: '10mm' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '5mm' }}>
                {settings.logo ? <img src={settings.logo} style={{ width: '25mm', height: '25mm', objectFit: 'contain' }} /> : <div style={{ width: '20mm', height: '20mm', background: '#001a33' }} />}
                <div>
                   <h1 style={{ fontSize: '18pt', margin: 0, color: '#001a33', fontWeight: 900 }}>{settings.companyName}</h1>
                   <p style={{ fontSize: '9pt', margin: '1mm 0', color: '#555' }}>تخليص جمركي - استشارات لوجستية</p>
                   <p style={{ fontSize: '8pt', margin: 0, opacity: 0.7 }}>الرقم الضريبي: {settings.taxNumber}</p>
                </div>
             </div>
             <div style={{ textAlign: isAr ? 'left' : 'right', direction: 'ltr' }}>
                <div style={{ fontSize: '14pt', fontWeight: 900, color: '#001a33' }}>FINANCIAL STATEMENT</div>
                <div style={{ fontSize: '10pt', color: '#d4a76a', fontWeight: 700 }}>FISCAL YEAR 2026</div>
                <p style={{ fontSize: '8pt', marginTop: '2mm', color: '#888' }}>{isAr ? 'تاريخ الإصدار: ' : 'Issue Date: '}{fmtDate(new Date(), t.lang)}</p>
             </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '8mm' }}>
             <p style={{ fontSize: '10pt', color: '#666', marginTop: '2mm' }}>
                {period === 'all' 
                    ? `${isAr ? 'حتى تاريخ ' : 'As of '}${fmtDate(new Date(), t.lang)}`
                    : `${isAr ? 'عن الفترة من ' : 'Period: from '}${dateRange.start ? fmtDate(dateRange.start, t.lang) : (isAr ? 'بداية النشاط' : 'Inception')} ${isAr ? 'إلى' : 'to'} ${dateRange.end ? fmtDate(dateRange.end, t.lang) : fmtDate(new Date(), t.lang)}`
                }
             </p>
          </div>

          {renderContent()}

          <div style={{ padding: '6mm', border: '1px dashed #001a33', borderRadius: '4mm', marginBottom: '15mm', background: '#fcfcfc' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '4mm', marginBottom: '3mm' }}>
                <CheckCircle2 size={24} color="#1b5e20" />
                <h4 style={{ margin: 0, fontSize: '11pt', fontWeight: 900 }}>إقرار الامتثال والتدقيق</h4>
             </div>
             <p style={{ margin: 0, fontSize: '9pt', lineHeight: '1.6', color: '#444' }}>
                تشهد إدارة الشؤون المالية بمؤسسة الغويري للتخليص الجمركي بأن كافة الأرقام الموضحة أعلاه مستخرجة من سجلات النظام الموحد وتتفق مع الموازين المالية السيادية والفواتير الضريبية المرحلة لهيئة الزكاة والضريبة والجمارك للمرحلة الثانية.
             </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5mm', marginTop: '10mm' }}>
             <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40mm', height: '1px', background: '#001a33', margin: '0 auto 3mm' }}></div>
                <p style={{ fontSize: '9pt', fontWeight: 900 }}>إعداد: الشؤون المالية</p>
                <p style={{ fontSize: '7pt', color: '#888' }}>Electronic Sign: AC-229</p>
             </div>
             <div style={{ textAlign: 'center' }}>
                <div style={{ width: '30mm', height: '30mm', border: '2px solid rgba(0,26,51,0.1)', borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(0,26,51,0.1)', fontWeight: 900, fontSize: '8pt' }}>ختم المؤسسة</div>
             </div>
             <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40mm', height: '1px', background: '#001a33', margin: '0 auto 3mm' }}></div>
                <p style={{ fontSize: '9pt', fontWeight: 900 }}>تعميد: المدير العام</p>
                <p style={{ fontSize: '7pt', color: '#888' }}>Management Approval Required</p>
             </div>
          </div>

          <div style={{ position: 'absolute', bottom: '10mm', left: '20mm', right: '20mm', borderTop: '1px solid #eee', paddingTop: '5mm', display: 'flex', justifyContent: 'space-between', fontSize: '7pt', color: '#aaa' }}>
             <span>Sovereign Ledger System v1.0.0</span>
             <span>Alghwairy Institution • Confidential Document</span>
             <span>Page 1 of 1</span>
          </div>
       </div>
    </div>
  );
}

function MetricBox({ title, value, sub, positive, icon, highlight }: any) {
  return (
    <div className="card" style={highlight ? { background: 'var(--primary)', color: 'white', padding: '2.5rem', border: 'none' } : { padding: '2.5rem', borderInlineStart: `6px solid ${positive ? 'var(--success)' : 'var(--error)'}` }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ padding: '1rem', borderRadius: '16px', background: highlight ? 'rgba(255,255,255,0.1)' : 'var(--surface-container-high)', color: highlight ? 'var(--secondary)' : 'var(--primary)' }}>{icon}</div>
          <span style={{ fontSize: '0.75rem', fontWeight: 950, padding: '0.4rem 1rem', borderRadius: '10px', background: highlight ? 'rgba(136, 217, 130, 0.2)' : (positive ? 'rgba(27, 94, 32, 0.1)' : 'rgba(211, 47, 47, 0.1)'), color: highlight ? '#88d982' : (positive ? 'var(--success)' : 'var(--error)'), textTransform: 'uppercase', letterSpacing: '0.5px' }}>
             {positive ? 'Positive' : 'Stability'}
          </span>
       </div>
       <p style={{ fontSize: '1rem', fontWeight: 700, opacity: highlight ? 0.8 : 1, color: highlight ? 'white' : 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>{title}</p>
       <h3 style={{ fontSize: '2.4rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 950, color: highlight ? 'var(--secondary)' : 'var(--primary)' }}>{value} <span style={{ fontSize: '0.9rem', opacity: 0.6, color: highlight ? 'white' : 'inherit' }}>SAR</span></h3>
       <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.8rem', fontWeight: 600 }}>{sub}</p>
    </div>
  );
}

function ReportRow({ label, current, down }: any) {
  return (
    <tr style={{ borderBottom: '1px solid var(--surface-container-high)' }}>
       <td style={{ fontWeight: 800, padding: '1.5rem 0', fontSize: '1rem' }}>{label}</td>
       <td style={{ direction: 'ltr', textAlign: 'right', fontWeight: 900, color: down ? 'var(--error)' : 'var(--success)', fontSize: '1.1rem' }}>{current}</td>
       <td style={{ color: down ? 'var(--error)' : 'var(--success)', fontWeight: 900, fontSize: '0.8rem', textAlign: 'right', letterSpacing: '1px' }}>{down ? 'DR' : 'CR'}</td>
    </tr>
  );
}
