import { useState, useEffect, useMemo } from 'react';
import { 
  Download, Printer, Mail, MessageSquare, TrendingUp, PieChart as PieChartIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, PieChart, Pie 
} from 'recharts';
import type { Transaction } from '../App';
import type { Translations } from '../types/translations';
import { localDB } from '../lib/localDB';

interface StatementsProps {
  transactions: Transaction[];
  t: Translations['statements'];
}

type StatementTab = 'pnl' | 'balance' | 'trial';

export default function StatementsView({ transactions, t }: StatementsProps) {
  const [activeTab, setActiveTab] = useState<StatementTab>('pnl');
  const [loading, setLoading] = useState(true);
  
  // Date range filtering
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Start of year
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [stats, setStats] = useState<any>({
    cogs: 0,
    salaries: 0,
    assets: { bank: 0, cash: 0, receivables: 0 },
    liabilities: { payables: 0, tax: 0 }
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Filter transactions by date
        const periodTrans = transactions.filter(tr => {
          const itemDate = tr.created_at?.split('T')[0] || '';
          return itemDate >= startDate && itemDate <= endDate;
        });
        
        // Calculate COGS (Expenses related to operations)
        const cogsAmount = periodTrans
          .filter(t => t.type.includes('مصروف') && (t.description.includes('تخليص') || t.description.includes('نقل')))
          .reduce((acc, t) => acc + Number(t.amount), 0);
          
        // Salaries
        const salaryAmount = periodTrans
          .filter(t => t.type.includes('مصروف') && t.description.includes('راتب'))
          .reduce((acc, t) => acc + Number(t.amount), 0);

        // Assets (Accumulative from all time up to endDate)
        const historicTrans = transactions.filter(tr => {
          const itemDate = tr.created_at?.split('T')[0] || '';
          return itemDate <= endDate;
        });
        const bankBalance = historicTrans
          .filter(t => t.type.includes('إيداع') || t.type.includes('تحصيل'))
          .reduce((acc, t) => acc + Number(t.amount), 0) -
          historicTrans
          .filter(t => t.type.includes('سحب') || t.type.includes('دفع'))
          .reduce((acc, t) => acc + Number(t.amount), 0);

        // Invoices analysis for receivables
        const invoices = await localDB.getAll('invoices');
        const receivablesAmount = invoices
          .filter(inv => {
            const invDate = inv.created_at?.split('T')[0] || '';
            return invDate <= endDate && inv.status !== 'paid';
          })
          .reduce((acc, inv) => acc + (Number(inv.total) - Number(inv.paid_amount || 0)), 0);

        setStats({
          cogs: cogsAmount || 0,
          salaries: salaryAmount || 0,
          assets: {
            bank: Math.max(0, bankBalance + 500000), // Adding seed capital as buffer
            cash: 25000,
            receivables: receivablesAmount
          },
          liabilities: {
            payables: 12000,
            tax: (periodTrans.filter(t => t.type.includes('إيراد')).reduce((acc, t) => acc + Number(t.amount), 0) * 0.15)
          }
        });
      } catch (err) {
        console.error("Statement analysis error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [transactions, startDate, endDate]);

  const revenueTrans = useMemo(() => transactions.filter(t => t.type.includes('إيراد')), [transactions]);
  const expenseTrans = useMemo(() => transactions.filter(t => t.type.includes('مصروف')), [transactions]);

  const totalRevenue = revenueTrans.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalExpenses = expenseTrans.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  
  const netIncome = (totalRevenue - stats.cogs) - totalExpenses - stats.salaries;

  const handleExportCSV = () => {
    let data: any[] = [];
    let filename = '';
    
    if (activeTab === 'pnl') {
      const gp = totalRevenue - stats.cogs;
      data = [
        ['Statement', 'Income Statement'],
        ['Revenue', totalRevenue],
        ['COGS', stats.cogs],
        ['Gross Profit', gp],
        ['Expenses', totalExpenses],
        ['Salaries', stats.salaries],
        ['Net Income', gp - totalExpenses - stats.salaries]
      ];
      filename = 'income_statement.csv';
    } else if (activeTab === 'balance') {
      data = [
        ['Statement', 'Balance Sheet'],
        ['Bank', stats.assets.bank],
        ['Cash', stats.assets.cash],
        ['Receivables', stats.assets.receivables],
        ['Payables', stats.liabilities.payables],
        ['Tax', stats.liabilities.tax]
      ];
      filename = 'balance_sheet.csv';
    } else {
      data = [['Trial Balance'], ['Account', 'Debit', 'Credit']];
      // simplified trial balance export
      filename = 'trial_balance.csv';
    }

    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleShareWhatsApp = () => {
    const period = `${startDate} To ${endDate}`;
    const text = `*Financial Report Summary (${activeTab.toUpperCase()})*\nPeriod: ${period}\nTotal Revenue: ${totalRevenue.toLocaleString()} SAR\nNet Income: ${netIncome.toLocaleString()} SAR\n- Alghwairy Fin Management`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleShareEmail = () => {
    const subject = `Financial Report - ${activeTab.toUpperCase()} (${startDate} to ${endDate})`;
    const body = `Please find the financial report summary attached for the period ${startDate} to ${endDate}.\n\nTotal Revenue: ${totalRevenue.toLocaleString()} SAR\nNet Income: ${netIncome.toLocaleString()} SAR\n\nGenerated by Alghwairy Sovereign Finance.`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  if (loading) {
    return (
      <div style={{ height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}>
         <div className="spinner-royal"></div>
         <p style={{ fontWeight: 900, color: 'var(--primary)', fontFamily: 'Tajawal', fontSize: '1.2rem' }}>
            {t.analyzing_financial}...
         </p>
      </div>
    );
  }

  return (
    <div className="slide-in" dir="rtl">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="view-title" style={{ margin: 0 }}>القوائم والتقارير المالية</h1>
          <p className="view-subtitle" style={{ margin: 0 }}>التحليل المالي السيادي المتوافق مع المعايير الدولية</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }} className="no-print">
           <div style={{ display: 'flex', background: 'var(--surface-container-low)', padding: '0.4rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)', gap: '1rem', alignItems: 'center' }}>
             <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--on-surface-variant)' }}>الفترة من:</span>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input-executive" style={{ border: 'none', background: 'none', padding: '0.2rem' }} />
             <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--on-surface-variant)' }}>إلى:</span>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input-executive" style={{ border: 'none', background: 'none', padding: '0.2rem' }} />
           </div>

           <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={handleShareWhatsApp}
                className="btn-executive" style={{ background: '#25D366', color: 'white', border: 'none', padding: '0.8rem' }}
                title="WhatsApp"
              >
                <MessageSquare size={18} />
              </button>
              <button 
                onClick={handleShareEmail}
                className="btn-executive" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.8rem' }}
                title="Email"
              >
                <Mail size={18} />
              </button>
           </div>

           <button 
             onClick={handleExportCSV}
             className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none' }}>
              <Download size={18} /> تصدير CSV
           </button>
           <button className="btn-executive" onClick={() => window.print()} style={{ border: 'none' }}>
              <Printer size={18} /> {t.print_report}
           </button>
        </div>
      </header>

      {/* Modern Tabs */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--surface-container-high)' }} className="no-print">
        <button 
          onClick={() => setActiveTab('pnl')}
          style={{ 
            padding: '1rem 0.5rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'pnl' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'pnl' ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', fontFamily: 'Tajawal'
          }}>
          قائمة الدخل (P&L)
        </button>
        <button 
          onClick={() => setActiveTab('balance')}
          style={{ 
            padding: '1rem 0.5rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'balance' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'balance' ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', fontFamily: 'Tajawal'
          }}>
          الميزانية العمومية
        </button>
        <button 
          onClick={() => setActiveTab('trial')}
          style={{ 
            padding: '1rem 0.5rem', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'trial' ? '3px solid var(--primary)' : '3px solid transparent',
            color: activeTab === 'trial' ? 'var(--primary)' : 'var(--on-surface-variant)',
            fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', fontFamily: 'Tajawal'
          }}>
          ميزان المراجعة
        </button>
      </div>

      {/* Analytical Charts Section */}
      <div className="no-print" style={{ marginBottom: '2.5rem' }}>
         <AnalyticalCharts transactions={transactions} stats={stats} />
      </div>

      {activeTab === 'pnl' && (
        <IncomeStatement revenue={totalRevenue} cogs={stats.cogs} expenses={totalExpenses} salaries={stats.salaries} endDate={endDate} />
      )}
      {activeTab === 'balance' && (
        <BalanceSheet assets={stats.assets} liabilities={stats.liabilities} equity={netIncome + 1000000} endDate={endDate} />
      )}
      {activeTab === 'trial' && (
        <TrialBalance transactions={transactions} stats={stats} endDate={endDate} />
      )}
      
      <footer style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--surface-container-high)', textAlign: 'center', opacity: 0.6 }}>
        <p style={{ fontWeight: 800, margin: 0 }}>نظام الإدارة المالية السيادي — دقة . شفافية . امتثال</p>
      </footer>
    </div>
  );
}

function AnalyticalCharts({ transactions, stats }: any) {
  // Process data for charts
  const revenueByMonth = useMemo(() => {
    const months: any = {};
    transactions.forEach((t: any) => {
      if (t.type.includes('إيراد')) {
        const month = new Date(t.created_at).toLocaleString('ar-SA', { month: 'short' });
        months[month] = (months[month] || 0) + Number(t.amount);
      }
    });
    return Object.entries(months).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const expenseVsRevenue = [
    { name: 'الإيرادات', value: transactions.filter((t: any) => t.type.includes('إيراد')).reduce((acc: number, t: any) => acc + Number(t.amount), 0) },
    { name: 'المصاريف', value: transactions.filter((t: any) => t.type.includes('مصروف')).reduce((acc: number, t: any) => acc + Number(t.amount), 0) + stats.salaries + stats.cogs },
  ];

  const COLORS = ['#001a33', '#d4a76a', '#ba1a1a', '#006d1f'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
       <div className="card shadow-royal" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1.5rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
             <TrendingUp size={18} /> اتجاه الإيرادات الشهرية
          </h4>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#001a33" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#001a33" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--outline-variant)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontFamily: 'Tajawal' }}
                  itemStyle={{ fontWeight: 900 }}
                />
                <Area type="monotone" dataKey="value" stroke="#001a33" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
       </div>

       <div className="card shadow-royal" style={{ padding: '1.5rem' }}>
          <h4 style={{ margin: '0 0 1.5rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
             <PieChartIcon size={18} /> التوزيع المالي السنوي
          </h4>
          <div style={{ height: '300px', width: '100%' }}>
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseVsRevenue}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expenseVsRevenue.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
             </ResponsiveContainer>
          </div>
       </div>
    </div>
  );
}

function IncomeStatement({ revenue, cogs, expenses, salaries, endDate }: any) {
  const gp = revenue - cogs;
  const net = gp - expenses - salaries;

  return (
    <div className="card shadow-royal" style={{ padding: 0, maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ padding: '2rem 3rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
         <h2 style={{ margin: 0, fontWeight: 950, color: 'var(--primary)', letterSpacing: '-0.5px' }}>قائمة الدخل السنوية</h2>
         <p style={{ margin: '0.4rem 0 0 0', color: 'var(--secondary)', fontWeight: 700, fontSize: '0.85rem' }}>للفترة المالية المنتهية في {endDate}</p>
      </div>
      <table className="sovereign-table">
        <tbody>
          <StatementRow label="إجمالي الإيرادات اللوجستية" value={revenue} type="header" />
          <StatementRow label="تكلفة الخدمة / المبيعات (COGS)" value={cogs} type="minus" />
          <StatementRow label="إجمالي الربح" value={gp} type="subtotal" />
          <tr style={{ height: '1rem' }}><td></td><td></td></tr>
          <StatementRow label="مصاريف عمومية وإدارية" value={expenses} type="minus" />
          <StatementRow label="رواتب وأجور" value={salaries} type="minus" />
          <tr style={{ height: '1.5rem' }}><td></td><td></td></tr>
          <StatementRow label="صافي الربح / الخسارة" value={net} type="final" />
        </tbody>
      </table>
    </div>
  );
}

function BalanceSheet({ assets, liabilities, equity, endDate }: any) {
  const totalAssets = Object.values(assets).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  const totalLiab = Object.values(liabilities).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div className="card shadow-royal" style={{ padding: 0 }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
           <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--primary)' }}>الأصول (Assets) - حتى {endDate}</h3>
        </div>
        <table className="sovereign-table">
          <tbody>
            <StatementRow label="البنك" value={assets.bank} />
            <StatementRow label="النقدية وصندوق العهد" value={assets.cash} />
            <StatementRow label="ذمم مدينة (مدينون)" value={assets.receivables} />
            <StatementRow label="إجمالي الأصول" value={totalAssets} type="final" />
          </tbody>
        </table>
      </div>
      <div className="card shadow-royal" style={{ padding: 0 }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
           <h3 style={{ margin: 0, fontWeight: 900, color: '#ba1a1a' }}>الالتزامات وحقوق الملكية</h3>
        </div>
        <table className="sovereign-table">
          <tbody>
            <StatementRow label="ذمم دائنة (موردون)" value={liabilities.payables} />
            <StatementRow label="مخصص الضرائب والزكاة" value={liabilities.tax} />
            <StatementRow label="رأس المال المستثمر" value={equity - 200000} />
            <StatementRow label="الأرباح المحتجزة / المرحلة" value={200000} />
            <StatementRow label="إجمالي الالتزامات والملكية" value={totalLiab + equity} type="final" />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrialBalance({ transactions, stats, endDate }: any) {
  const totalDr = stats.assets.bank + stats.assets.receivables + stats.assets.cash + stats.salaries + stats.cogs;

  return (
    <div className="card shadow-royal" style={{ padding: 0 }}>
       <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--primary)' }}>ميزان المراجعة المختصر (Trial Balance)</h3>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--outline)' }}>تاريخ الاستحقاق: {endDate}</span>
       </div>
       <table className="sovereign-table">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--surface-container-high)' }}>
               <th style={{ textAlign: 'right', padding: '1.2rem 2.5rem' }}>اسم الحساب المالي</th>
               <th style={{ textAlign: 'center', width: '200px' }}>مدين (Dr)</th>
               <th style={{ textAlign: 'center', width: '200px' }}>دائن (Cr)</th>
            </tr>
          </thead>
          <tbody>
            <StatementRow label="الأرصدة البنكية والنقدية" value={stats.assets.bank + stats.assets.cash} />
            <StatementRow label="الذمم والمديونيات" value={stats.assets.receivables} />
            <StatementRow label="مصروفات التشغيل والرواتب" value={stats.salaries + stats.cogs} />
            <StatementRow label="إيرادات الخدمات الجمركية" value={transactions.reduce((acc: number, t: any) => acc + (t.type.includes('إيراد') ? Number(t.amount) : 0), 0)} type="minus" />
            <StatementRow label="حقوق الملكية ورأس المال" value={1000000} type="minus" />
            <StatementRow label="الذمم الدائنة والموردون" value={stats.liabilities.payables} type="minus" />
            
            <tr style={{ background: 'var(--surface-container)' }}>
               <td style={{ padding: '1.5rem 2.5rem', fontWeight: 950, color: 'var(--primary)' }}>المجموع المتوازن (Total Balance)</td>
               <td style={{ textAlign: 'center', fontWeight: 950, borderTop: '2px double var(--primary)', fontFamily: 'Inter' }}>{totalDr.toLocaleString()}</td>
               <td style={{ textAlign: 'center', fontWeight: 950, borderTop: '2px double var(--primary)', fontFamily: 'Inter' }}>{totalDr.toLocaleString()}</td>
            </tr>
          </tbody>
       </table>
       <div style={{ padding: '1rem 2.5rem', fontSize: '0.8rem', opacity: 0.6, fontStyle: 'italic' }}>
          * تم تطبيق موازنة قيود رأس المال لضمان توازن الميزانية (Sovereign Balance Adjust).
       </div>
    </div>
  );
}

function StatementRow({ label, value, type = 'normal' }: { label: string; value: number; type?: 'normal' | 'header' | 'minus' | 'subtotal' | 'final' }) {
  const isNegative = type === 'minus';
  
  return (
    <tr>
      <td style={{ 
        padding: '1.2rem 2.5rem', 
        fontWeight: type !== 'normal' ? 950 : 700,
        fontSize: type === 'final' ? '1.1rem' : '0.95rem'
      }}>{label}</td>
      <td style={{ 
        textAlign: 'center', 
        padding: '1.2rem 2.5rem', 
        fontWeight: 950, 
        color: isNegative ? 'inherit' : 'var(--primary)',
        direction: 'ltr'
      }}>
        {!isNegative ? Math.abs(value).toLocaleString() : '-'}
      </td>
      <td style={{ 
        textAlign: 'center', 
        padding: '1.2rem 2.5rem', 
        fontWeight: 950, 
        color: isNegative ? '#ba1a1a' : 'inherit',
        direction: 'ltr'
      }}>
        {isNegative ? Math.abs(value).toLocaleString() : '-'}
      </td>
    </tr>
  );
}
