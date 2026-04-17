import { useState, useEffect, useMemo } from 'react';
import { 
  Download, Printer
} from 'lucide-react';
import type { Transaction } from '../App';
import type { Translations } from '../types/translations';

interface StatementsProps {
  transactions: Transaction[];
  t: Translations['statements'];
}

type StatementTab = 'pnl' | 'balance' | 'trial';

export default function StatementsView({ transactions, t }: StatementsProps) {
  const [activeTab, setActiveTab] = useState<StatementTab>('pnl');
  const [loading, setLoading] = useState(true);
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
        // Realistic analysis simulation
        setStats({
          cogs: 125000,
          salaries: 45000,
          assets: {
            bank: 520000,
            cash: 18000,
            receivables: 85000
          },
          liabilities: {
            payables: 45000,
            tax: (transactions.reduce((acc, t) => acc + (t.type.includes('إيراد') ? Number(t.amount) : 0), 0) * 0.15) // Simulated VAT
          }
        });
      } catch (err) {
        console.error("Statement analysis error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [transactions]);

  const revenueTrans = useMemo(() => transactions.filter(t => t.type.includes('إيراد')), [transactions]);
  const expenseTrans = useMemo(() => transactions.filter(t => t.type.includes('مصروف')), [transactions]);

  const totalRevenue = revenueTrans.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalExpenses = expenseTrans.reduce((acc, t) => acc + Number(t.amount || 0), 0);
  
  const netIncome = (totalRevenue - stats.cogs) - totalExpenses - stats.salaries;

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
        <div style={{ display: 'flex', gap: '0.8rem' }} className="no-print">
           <button className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none' }}>
              <Download size={18} /> تصدير PDF
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

      {activeTab === 'pnl' && (
        <IncomeStatement revenue={totalRevenue} cogs={stats.cogs} expenses={totalExpenses} salaries={stats.salaries} />
      )}
      {activeTab === 'balance' && (
        <BalanceSheet assets={stats.assets} liabilities={stats.liabilities} equity={netIncome + 1000000} />
      )}
      {activeTab === 'trial' && (
        <TrialBalance transactions={transactions} stats={stats} />
      )}
      
      <footer style={{ marginTop: '4rem', padding: '2rem', borderTop: '1px solid var(--surface-container-high)', textAlign: 'center', opacity: 0.6 }}>
        <p style={{ fontWeight: 800, margin: 0 }}>نظام الإدارة المالية السيادي — دقة . شفافية . امتثال</p>
      </footer>
    </div>
  );
}

function IncomeStatement({ revenue, cogs, expenses, salaries }: any) {
  const gp = revenue - cogs;
  const net = gp - expenses - salaries;

  return (
    <div className="card shadow-royal" style={{ padding: 0, maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ padding: '2rem 3rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
         <h2 style={{ margin: 0, fontWeight: 950, color: 'var(--primary)', letterSpacing: '-0.5px' }}>قائمة الدخل السنوية</h2>
         <p style={{ margin: '0.4rem 0 0 0', color: 'var(--secondary)', fontWeight: 700, fontSize: '0.85rem' }}>للفترة المالية المنتهية في 31 ديسمبر 2024</p>
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

function BalanceSheet({ assets, liabilities, equity }: any) {
  const totalAssets = Object.values(assets).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
  const totalLiab = Object.values(liabilities).reduce((a: number, b: any) => a + (Number(b) || 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div className="card shadow-royal" style={{ padding: 0 }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
           <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--primary)' }}>الأصول (Assets)</h3>
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

function TrialBalance({ transactions, stats }: any) {
  return (
    <div className="card shadow-royal" style={{ padding: 0 }}>
       <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)' }}>
          <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--primary)' }}>ميزان المراجعة (Trial Balance)</h3>
       </div>
       <table className="sovereign-table">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--surface-container-high)' }}>
               <th style={{ textAlign: 'right', padding: '1rem 2rem' }}>الحساب</th>
               <th style={{ textAlign: 'center' }}>مدين (Dr)</th>
               <th style={{ textAlign: 'center' }}>دائن (Cr)</th>
            </tr>
          </thead>
          <tbody>
            <StatementRow label="البنوك" value={stats.assets.bank} />
            <StatementRow label="مصروفات الموظفين" value={stats.salaries} />
            <StatementRow label="تكاليف الخدمات" value={stats.cogs} />
            <StatementRow label="الإيرادات" value={transactions.reduce((acc: number, t: any) => acc + (t.type.includes('إيراد') ? Number(t.amount) : 0), 0)} type="minus" />
            <StatementRow label="حقوق الملكية" value={1000000} type="minus" />
            {/* ... other accounts */}
          </tbody>
       </table>
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
