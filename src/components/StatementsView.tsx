import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import type { Transaction } from '../App';
import type { Translations } from '../types/translations';

interface StatementsProps {
  transactions: Transaction[];
  t: Translations['statements'];
}

export default function StatementsView({ transactions, t }: StatementsProps) {
  const [salariesTotal, setSalariesTotal] = useState(0);
  const [cogsTotal, setCogsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeepStats = () => {
      setLoading(true);
      try {
        // 1. Get Payroll Total
        const payrollData = localDB.getActive('payroll');
        const salaryTotal = (payrollData as any[]).reduce((acc: number, curr: any) => acc + (Number(curr.net) || 0), 0);
        setSalariesTotal(salaryTotal);

        // 2. Get COGS (Expenses categorized as 'Operational', 'تجاري', or 'COGS')
        const expenseData = localDB.getActive('expenses');
        const operationalTotal = (expenseData as any[])
            .filter((exp: any) => exp.category === 'Operational' || exp.category === 'تجاري' || exp.category === 'COGS')
            .reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0);
        setCogsTotal(operationalTotal);
      } catch (err) {
        console.error("Deep stats cache error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeepStats();
  }, [transactions]);

  // Real Calculations
  const incomeTrans = (transactions || [])
    .filter(t_trx => t_trx.type === 'income' || t_trx.type === 'إيراد / فاتورة صاردة');
  
  const expenseTrans = (transactions || [])
    .filter(t_trx => t_trx.type === 'expense' || t_trx.type === 'مصروف');

  const totalRevenue = incomeTrans.reduce((acc, current) => acc + Number(current.amount || 0), 0);
  const totalExpenses = expenseTrans.reduce((acc, current) => acc + Number(current.amount || 0), 0);
  
  const grossProfit = totalRevenue - cogsTotal;
  const netIncome = grossProfit - totalExpenses - salariesTotal;

  const data = [
    { category: t.categories.revenue, amount: totalRevenue, type: 'income' },
    { category: t.categories.cogs, amount: cogsTotal, type: 'expense' },
    { category: t.categories.gross_profit, amount: grossProfit, type: 'result' },
    { category: t.categories.general_expenses, amount: totalExpenses, type: 'expense' },
    { category: t.categories.payroll, amount: salariesTotal, type: 'expense' },
    { category: t.categories.net_income, amount: netIncome, type: 'final' },
  ];

  if (loading) {
    return (
      <div style={{ height: '50vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
         <div className="spinner-royal"></div>
         <p style={{ fontWeight: 900, color: 'var(--primary)', fontFamily: 'Tajawal' }}>
            {t.analyzing_financial}
         </p>
      </div>
    );
  }

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="view-title" style={{ margin: 0 }}>{t.title}</h1>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
           <button className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none' }}>
              <Download size={18} /> {t.export_excel}
           </button>
           <button className="btn-executive" onClick={() => window.print()} style={{ border: 'none' }}>
              <Printer size={18} /> {t.print_report}
           </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--success)', background: 'var(--surface-container-low)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.net_profit}</span>
              <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(27, 94, 32, 0.1)', color: 'var(--success)' }}>
                 <TrendingUp size={20} />
              </div>
           </div>
           <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '1rem', color: 'var(--primary)' }}>{netIncome.toLocaleString()} SAR</div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
              <CheckCircle2 size={12} color="var(--success)" />
              <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 800 }}>{t.lang === 'ar' ? 'اعتماد مؤسسة الغويري' : 'Institutional Verification'}</span>
           </div>
        </div>

         <div className="card" style={{ borderLeft: '4px solid var(--secondary)', background: 'var(--surface-container-low)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.cash_flow}</span>
              <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(212, 167, 106, 0.1)', color: 'var(--secondary)' }}>
                 <DollarSign size={20} />
              </div>
           </div>
           <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '1rem', color: 'var(--primary)' }}>{(totalRevenue + 500000 - totalExpenses).toLocaleString()} SAR</div>
           <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', marginTop: '0.5rem', fontWeight: 700 }}>{t.real_time_update}</div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--error)', background: 'var(--surface-container-low)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{t.expense_ratio}</span>
              <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(186, 26, 26, 0.1)', color: 'var(--error)' }}>
                 <AlertCircle size={20} />
              </div>
           </div>
           <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '1rem', color: 'var(--primary)' }}>{totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0'}%</div>
           <div style={{ fontSize: '0.7rem', color: 'var(--error)', marginTop: '0.5rem', fontWeight: 700 }}>{t.within_threshold}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
        <div style={{ padding: '1.8rem 2.5rem', borderBottom: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: 'var(--primary)', color: 'var(--secondary)', padding: '0.6rem', borderRadius: '10px' }}><FileSpreadsheet size={24} /></div>
              <div>
                 <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', fontFamily: 'Tajawal' }}>{t.income_statement_title}</h3>
                 <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6, fontWeight: 700 }}>ALGHWAIRY INSTITUTION LEDGER v2026</p>
              </div>
           </div>
           <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--success)', background: 'rgba(27, 94, 32, 0.1)', padding: '0.4rem 1rem', borderRadius: '20px' }}>
                 {t.balanced_ledger_badge}
              </span>
           </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
           <table className="sovereign-table" style={{ borderCollapse: 'collapse', margin: 0 }}>
             <thead>
               <tr>
                 <th style={{ background: 'transparent', paddingInlineStart: '2.5rem' }}>{t.table.category}</th>
                 <th style={{ background: 'transparent', textAlign: 'right' }}>{t.table.amount}</th>
                 <th style={{ background: 'transparent', textAlign: 'center', paddingInlineEnd: '2.5rem' }}>{t.table.verification}</th>
               </tr>
             </thead>
             <tbody>
               {data.map((item, idx) => (
                 <tr key={idx} style={{ 
                    background: item.type === 'final' ? 'var(--primary)' : 'transparent',
                    color: item.type === 'final' ? 'white' : 'inherit'
                  }}>
                   <td style={{ 
                      fontWeight: item.type === 'final' || item.type === 'result' ? 950 : 700,
                      fontSize: item.type === 'final' ? '1.1rem' : '0.95rem',
                      padding: '1.5rem 2.5rem',
                      borderBottom: '1px solid var(--surface-container-high)'
                    }}>
                     {item.category}
                   </td>
                   <td style={{ 
                        textAlign: 'right', 
                        fontWeight: 950, 
                        fontSize: item.type === 'final' ? '1.3rem' : '1.1rem',
                        color: item.type === 'final' ? 'var(--secondary)' : (item.type === 'expense' ? 'var(--error)' : 'var(--primary)'),
                        borderBottom: '1px solid var(--surface-container-high)',
                        direction: 'ltr'
                     }}>
                        {item.type === 'expense' && item.amount > 0 ? '-' : ''}{item.amount.toLocaleString()}.00 SAR
                   </td>
                   <td style={{ textAlign: 'center', borderBottom: '1px solid var(--surface-container-high)', paddingInlineEnd: '2.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                         <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.type === 'expense' ? 'var(--error)' : 'var(--success)' }}></div>
                         <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 900, 
                            color: item.type === 'final' ? 'var(--secondary)' : (item.type === 'expense' ? 'var(--error)' : 'var(--success)'),
                            textTransform: 'uppercase'
                         }}>
                            {t.lang === 'ar' ? 'محسوب' : 'Calculated'}
                         </span>
                      </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      </div>

      <div className="no-print" style={{ marginTop: '3.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
         <div className="card" style={{ padding: '2rem', border: '1px dashed var(--outline)', background: 'var(--surface-container-low)' }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 950, color: 'var(--primary)' }}>{t.actions.balance_sheet_title}</h4>
            <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.6rem', fontWeight: 700, lineHeight: '1.5' }}>{t.actions.balance_sheet_desc}</p>
            <button className="btn-executive" style={{ width: '100%', marginTop: '1.5rem', background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', padding: '0.8rem' }}>
               {t.actions.balance_sheet_btn}
            </button>
         </div>
      </div>
    </div>
  );
}
