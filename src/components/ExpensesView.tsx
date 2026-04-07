import { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, 
  Users, 
  Plus, 
  X,
  CheckCircle2,
  TrendingDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Translations } from '../types/translations';

interface ExpensesProps {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: Translations['expenses'];
  lang: string;
}

interface Expense {
  id: string;
  exp_number: string;
  title: string;
  category: string;
  amount: number;
  status: string;
  date: string;
  created_at: string;
}

export default function ExpensesView({ showToast, logActivity, t, lang }: ExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Operational',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      setExpenses((data as Expense[]) || []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      await fetchExpenses();
    };
    init();
  }, [fetchExpenses]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount) {
      showToast(lang === 'ar' ? 'خطأ في التحقق من البيانات' : 'Validation Error', 'error');
      return;
    }

    const newExpense = {
      exp_number: 'EXP-' + Math.floor(Math.random() * 90000 + 10000),
      title: formData.title,
      category: formData.category,
      amount: parseFloat(formData.amount),
      status: 'Approved',
      date: formData.date
    };
    
    const { error } = await supabase.from('expenses').insert([newExpense]);
    if (error) {
      showToast(lang === 'ar' ? 'خطأ في تسجيل المصروف' : 'Error recording expense', 'error');
    } else {
      await logActivity('Recorded Sovereign Expense: ' + formData.title + ' (' + formData.amount + ' SAR)', 'expenses');
      showToast(lang === 'ar' ? 'تم تسجيل المصروف السيادي بنجاح.' : 'Sovereign expense recorded.', 'success');
      setShowAddModal(false);
      setFormData({ title: '', category: 'Operational', amount: '', date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
    }
  };

  const totalOperating = expenses.reduce((acc, current) => acc + Number(current.amount || 0), 0);
  const employeePettyCash = 42500; 
  const cashBalance = 245800 - totalOperating; 

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
           <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
           <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <button 
           onClick={() => setShowAddModal(true)}
           className="btn-executive" 
           style={{ border: 'none' }}
        >
           <Plus size={18} /> {t.record_new_expense}
        </button>
      </header>

      {/* Cash Flow Summary */}
      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.8rem', marginBottom: '2.5rem' }}>
         <div className="card" style={{ background: 'var(--primary)', color: 'white', padding: '2.5rem', border: 'none', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 2 }}>
               <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', color: 'var(--secondary)' }}><Wallet size={28} /></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(136, 217, 130, 0.2)', color: '#88d982', padding: '0.4rem 1rem', borderRadius: '10px' }}>AUDITED</span>
            </div>
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700, marginBottom: '0.5rem', position: 'relative', zIndex: 2 }}>{t.current_cash_balance}</p>
            <h2 style={{ fontSize: '2.6rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 950, color: 'var(--secondary)', position: 'relative', zIndex: 2 }}>{cashBalance.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.6, color: 'white' }}>SAR</span></h2>
            <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: '120px', height: '120px', background: 'rgba(212, 167, 106, 0.05)', borderRadius: '30px', transform: 'rotate(15deg)' }}></div>
         </div>

         <div className="card" style={{ padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <div style={{ padding: '1rem', borderRadius: '16px', background: 'var(--surface-container-high)', color: 'var(--primary)' }}><Users size={28} /></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'var(--surface-container-low)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '10px' }}>STAFF PETTY</span>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.5rem' }}>{t.total_petty_cash}</p>
            <h2 style={{ fontSize: '2.4rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)' }}>{employeePettyCash.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.5 }}>SAR</span></h2>
         </div>

         <div className="card" style={{ padding: '2.5rem', borderInlineStart: '6px solid var(--error)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(186, 26, 26, 0.1)', color: 'var(--error)' }}><TrendingDown size={28} /></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, background: 'rgba(186, 26, 26, 0.1)', color: 'var(--error)', padding: '0.4rem 1rem', borderRadius: '10px' }}>OUTFLOW</span>
            </div>
            <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.5rem' }}>{t.total_expenses}</p>
            <h2 style={{ fontSize: '2.4rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--error)' }}>{totalOperating.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.5 }}>SAR</span></h2>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '2rem' }}>
         {/* Expense Log */}
         <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
            <div style={{ padding: '1.5rem 2.5rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ fontSize: '1.3rem', fontFamily: 'Tajawal', margin: 0, fontWeight: 900, color: 'var(--primary)' }}>{t.recent_expenses_ledger}</h3>
               <button className="btn-executive" style={{ background: 'white', color: 'var(--primary)', border: '1px solid var(--surface-container-high)', padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 800 }}>Audit All</button>
            </div>
            {loading ? (
               <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>Loading Expenditures...</div>
            ) : (
               <div style={{ overflowX: 'auto' }}>
                  <table className="sovereign-table">
                     <thead>
                        <tr>
                           <th style={{ paddingInlineStart: '2.5rem' }}>{t.table.date}</th>
                           <th>{t.table.description}</th>
                           <th style={{ textAlign: 'center' }}>{t.table.id}</th>
                           <th style={{ textAlign: 'right', paddingInlineEnd: '2.5rem' }}>{t.table.amount}</th>
                        </tr>
                     </thead>
                     <tbody>
                        {expenses.map(expense => (
                           <ExpenseRow 
                              key={expense.id || expense.exp_number}
                              date={expense.date || new Date(expense.created_at).toISOString().split('T')[0]} 
                              desc={expense.title} 
                              cat={expense.category} 
                              method={expense.exp_number} 
                              amount={Number(expense.amount).toLocaleString()} 
                           />
                        ))}
                     </tbody>
                  </table>
               </div>
            )}
         </div>

         {/* Petty Cash Balances */}
         <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'Tajawal', margin: 0, fontWeight: 900 }}>{t.active_petty_cash}</h3>
              <Users size={20} color="var(--primary)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
               <PettyCashItem name={lang === 'ar' ? 'كمال الهاشمي' : 'Kamal Al-Hashimi'} amount="8,500" used="6,200" percentage={73} lang={lang} />
               <PettyCashItem name={lang === 'ar' ? 'فيصل الحريبي' : 'Faisal Al-Huraibi'} amount="12,000" used="4,500" percentage={37} lang={lang} />
               <PettyCashItem name={lang === 'ar' ? 'سارة العتيبي' : 'Sara Al-Otaibi'} amount="5,000" used="1,200" percentage={24} lang={lang} />
               <PettyCashItem name={lang === 'ar' ? 'أحمد منصور' : 'Ahmed Mansour'} amount="15,000" used="14,800" percentage={98} warning lang={lang} />
            </div>

            <div style={{ marginTop: '3.5rem', padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: '16px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
               <CheckCircle2 size={24} color="var(--success)" style={{ marginTop: '0.2rem' }} />
               <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 900, marginBottom: '0.4rem', color: 'var(--primary)', fontSize: '0.9rem' }}>Financial Authority Notice:</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.8, lineHeight: '1.6', margin: 0, fontWeight: 500 }}>
                    {t.financial_authority_notice}
                  </p>
               </div>
            </div>
         </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '480px', padding: '3rem', position: 'relative', border: 'none' }}>
            <button 
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}
            ><X size={24} /></button>
            <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center' }}>{t.record_new_expense}</h3>
            
            <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.description_label}</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input-executive" style={{ fontWeight: 600, fontSize: '1rem' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.amount_sar_label}</label>
                  <input required type="number" min="0" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="input-executive" style={{ fontWeight: 900, fontSize: '1.2rem', textAlign: 'center', color: 'var(--primary)', border: '2px solid var(--secondary)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.date_label}</label>
                  <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="input-executive" style={{ fontWeight: 800 }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.category_label}</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="input-executive" style={{ fontWeight: 800 }}>
                  <option value="Operational">{lang === 'ar' ? 'مصاريف تشغيلية' : 'Operational Expenses'}</option>
                  <option value="Maintenance">{lang === 'ar' ? 'صيانة وإصلاحات' : 'Maintenance & Repairs'}</option>
                  <option value="Utilities">{lang === 'ar' ? 'فواتير وخدمات' : 'Utilities & Services'}</option>
                  <option value="Government">{lang === 'ar' ? 'رسوم حكومية' : 'Government Fees'}</option>
                  <option value="Administrative">{lang === 'ar' ? 'مصاريف إدارية' : 'Administrative Expenses'}</option>
                  <option value="Petty">{lang === 'ar' ? 'تغذية العهدة' : 'Petty Cash Refill'}</option>
                </select>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.cancel}</button>
                <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1.2rem', fontSize: '1.1rem', border: 'none' }}>{t.record_expense}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface ExpenseRowProps {
  date: string;
  desc: string;
  cat: string;
  method: string;
  amount: string;
}

function ExpenseRow({ date, desc, cat, method, amount }: ExpenseRowProps) {
  return (
    <tr style={{ borderBottom: '1px solid var(--surface-container-high)' }}>
       <td style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.7, paddingInlineStart: '2.5rem' }}>{date}</td>
       <td>
          <p style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{desc}</p>
          <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{cat}</span>
       </td>
       <td style={{ textAlign: 'center' }}><span style={{ fontSize: '0.75rem', background: 'var(--surface-container-high)', padding: '0.4rem 0.8rem', borderRadius: '6px', fontWeight: 800, color: 'var(--primary)' }}>{method}</span></td>
       <td style={{ fontWeight: 900, color: 'var(--error)', direction: 'ltr', textAlign: 'right', paddingInlineEnd: '2.5rem', fontSize: '1.1rem' }}>-{amount}</td>
    </tr>
  );
}

interface PettyCashItemProps {
  name: string;
  amount: string;
  used: string;
  percentage: number;
  warning?: boolean;
  lang: string;
}

function PettyCashItem({ name, amount, used, percentage, warning, lang }: PettyCashItemProps) {
  return (
    <div>
       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--on-surface)' }}>{name}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--on-surface-variant)' }}>{used} / {amount} SAR</span>
       </div>
       <div style={{ width: '100%', height: 10, background: 'var(--surface-container-high)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ 
            width: `${percentage}%`, 
            height: '100%', 
            background: warning ? 'var(--error)' : 'var(--primary)',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: `0 0 10px ${warning ? 'var(--error)' : 'var(--primary)'}44`
          }}></div>
       </div>
       <div style={{ marginTop: '0.4rem', textAlign: (lang === 'ar' ? 'right' : 'left') }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 900, color: warning ? 'var(--error)' : 'var(--primary)' }}>{percentage}% {lang === 'ar' ? 'من المخصص' : 'Allocation'}</span>
       </div>
    </div>
  );
}
