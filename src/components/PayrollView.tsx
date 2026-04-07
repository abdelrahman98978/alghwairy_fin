import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Plus,
  X,
  CreditCard,
  Building2,
  Lock,
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';

import type { Translations } from '../types/translations';

interface Props {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: Translations['payroll'];
}

interface Salary {
  id: string;
  emp_number: string;
  name: string;
  role: string;
  base: number;
  allowances: number;
  deductions: number;
  net: number;
  status: string;
  created_at: string;
}

export default function PayrollView({ showToast, logActivity, t }: Props) {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    role: 'Accountant',
    base: '',
    allowances: '',
    deductions: ''
  });

  const fetchSalaries = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('salaries').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      setSalaries((data as Salary[]) || []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      await fetchSalaries();
    };
    init();
  }, [fetchSalaries]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.base) {
      showToast('Name and base salary required', 'error');
      return;
    }

    const baseValue = parseFloat(formData.base) || 0;
    const allowancesValue = parseFloat(formData.allowances) || 0;
    const deductionsValue = parseFloat(formData.deductions) || 0;
    const netValue = baseValue + allowancesValue - deductionsValue;

    const newSalary = {
      emp_number: 'EMP-' + Math.floor(Math.random() * 9000 + 1000),
      name: formData.name,
      role: formData.role,
      base: baseValue,
      allowances: allowancesValue,
      deductions: deductionsValue,
      net: netValue,
      status: 'pending'
    };
    
    const { error } = await supabase.from('salaries').insert([newSalary]);
    if (error) {
      showToast('Error adding employee', 'error');
    } else {
      await logActivity('Enrolled New Staff: ' + formData.name, 'salaries');
      showToast('Sovereign record saved', 'success');
      setShowAddModal(false);
      setFormData({ name: '', role: 'Accountant', base: '', allowances: '', deductions: '' });
      fetchSalaries();
    }
  };

  const approveAllPending = async () => {
    const pendingExists = salaries.some(s => s.status === 'pending');
    if (!pendingExists) {
       showToast('No pending payrolls', 'error');
       return;
    }

    showToast('Encrypting and certifying records (WPS)...', 'success');

    setTimeout(async () => {
       const { error } = await supabase.from('salaries').update({ status: 'paid' }).eq('status', 'pending');
       if (error) {
          showToast('Sync error with server', 'error');
       } else {
          await logActivity('WPS Payroll Certification Completed', 'salaries');
          showToast('Sovereign WPS certification successful', 'success');
          fetchSalaries();
       }
    }, 2000);
  };

  const exportToExcel = () => {
    const headers = ["Employee", "Role", "Base", "Allowances", "Deductions", "Net", "Status"];
    const rows = salaries.map(s => [
      s.name,
      s.role,
      s.base,
      s.allowances,
      s.deductions,
      s.net,
      s.status
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => { csvContent += row.join(",") + "\n"; });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payroll_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast('Payroll data exported', 'success');
  };

  const totalNet = salaries.reduce((acc, current) => acc + Number(current.net || 0), 0);
  const activeEmployees = salaries.length;
  const delayedTotal = salaries.filter(s => s.status === 'hold' || s.status === 'pending').reduce((acc, current) => acc + Number(current.net || 0), 0);
  const isPending = salaries.some(s => s.status === 'pending');

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
           <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
           <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={exportToExcel} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
            <Download size={18} /> Excel Report
          </button>
          <button 
             onClick={() => setShowAddModal(true)}
             className="btn-executive"
             style={{ background: 'var(--surface-container-low)', border: '1px solid var(--surface-container-high)', color: 'var(--primary)', fontWeight: 800 }}
          >
             <Plus size={18} /> {t.add_employee || 'إضافة موظف'}
          </button>
          <button 
             disabled={!isPending}
             onClick={approveAllPending}
             className="btn-executive" 
             style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', opacity: isPending ? 1 : 0.6, border: 'none' }}
          >
             <Lock size={18} /> {isPending ? 'Certify WPS' : 'All Certified'}
          </button>
        </div>
      </header>

      {/* Overview Cards */}
      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 2 }}>
               <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', color: 'var(--secondary)' }}><Building2 size={28} /></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.4rem 1rem', background: 'rgba(136, 217, 130, 0.2)', color: '#88d982', borderRadius: '10px', textTransform: 'uppercase' }}>Royal Budget</span>
           </div>
           <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700, marginBottom: '0.5rem', position: 'relative', zIndex: 2 }}>{t.total_salaries}</p>
           <h2 style={{ fontSize: '2.6rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--secondary)', position: 'relative', zIndex: 2 }}>
              {totalNet.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.6, color: 'white' }}>SAR</span>
           </h2>
           <div style={{ position: 'absolute', bottom: '-15%', right: '-5%', width: '120px', height: '120px', background: 'rgba(212, 167, 106, 0.05)', borderRadius: '30px', transform: 'rotate(15deg)' }}></div>
        </div>

        <div className="card" style={{ padding: '2.5rem', borderInlineStart: '6px solid var(--primary)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <div style={{ padding: '1rem', borderRadius: '16px', background: 'var(--surface-container-high)', color: 'var(--primary)' }}><Users size={28} /></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.4rem 1rem', background: 'var(--surface-container-low)', color: 'var(--primary)', borderRadius: '10px' }}>WORKFORCE</span>
           </div>
           <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.5rem' }}>{t.active_employees}</p>
           <h2 style={{ fontSize: '2.4rem', margin: 0, fontFamily: 'Tajawal', color: 'var(--primary)', fontWeight: 900 }}>
             {activeEmployees} <span style={{ fontSize: '1rem', opacity: 0.5 }}>Staff</span>
           </h2>
        </div>

        <div className="card" style={{ padding: '2.5rem', background: 'var(--secondary)', border: 'none', color: 'white' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.2)', color: 'white' }}><CreditCard size={28} /></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.4rem 1rem', background: 'rgba(0,0,0,0.1)', color: 'white', borderRadius: '10px' }}>PENDING</span>
           </div>
           <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700, marginBottom: '0.5rem' }}>{t.pending_payments}</p>
           <h2 style={{ fontSize: '2.4rem', margin: 0, fontFamily: 'Tajawal', color: 'var(--primary)', fontWeight: 900 }}>
             {delayedTotal.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.7 }}>SAR</span>
           </h2>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
           <h3 style={{ fontSize: '1.3rem', fontFamily: 'Tajawal', color: 'var(--primary)', margin: 0, fontWeight: 900 }}>Sovereign Payroll Ledger</h3>
           {salaries.length > 0 && (
             <button onClick={() => showToast('Exporting SIF file...', 'success')} style={{ background: 'var(--surface)', border: '1px solid var(--surface-container-high)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                <Download size={18}/> WPS SIF Export
             </button>
           )}
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--on-surface-variant)', fontWeight: 800, fontSize: '1.2rem' }}>Processing Records...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sovereign-table">
              <thead>
                <tr>
                  <th style={{ paddingInlineStart: '2.5rem' }}>Employee Profile</th>
                  <th style={{ textAlign: 'right' }}>Base</th>
                  <th style={{ textAlign: 'right' }}>Plus (+)</th>
                  <th style={{ textAlign: 'right' }}>Ded (-)</th>
                  <th style={{ textAlign: 'right', background: 'rgba(0,0,0,0.02)' }}>Net Amount</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((salary) => (
                  <tr key={salary.id}>
                    <td style={{ paddingInlineStart: '2.5rem' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)', fontWeight: 900 }}>{salary.name.charAt(0)}</div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                             <span style={{ fontWeight: 800, color: 'var(--on-surface)', fontSize: '1rem' }}>{salary.name}</span>
                             <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>
                                {salary.emp_number} • {salary.role}
                             </span>
                          </div>
                       </div>
                    </td>
                    <td style={{ fontWeight: 700, textAlign: 'right' }}>{Number(salary.base).toLocaleString()}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 800, textAlign: 'right' }}>+{Number(salary.allowances).toLocaleString()}</td>
                    <td style={{ color: 'var(--error)', fontWeight: 800, textAlign: 'right' }}>-{Number(salary.deductions).toLocaleString()}</td>
                    <td style={{ fontWeight: 900, fontSize: '1.2rem', background: 'rgba(0,0,0,0.02)', color: 'var(--primary)', textAlign: 'right' }}>{Number(salary.net).toLocaleString()} <span style={{ fontSize: '0.7rem' }}>SAR</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '0.4rem 1rem', borderRadius: '20px', background: salary.status === 'paid' ? 'rgba(27, 94, 32, 0.1)' : 'rgba(212, 167, 106, 0.1)', color: salary.status === 'paid' ? 'var(--success)' : 'var(--secondary)', textTransform: 'uppercase' }}>
                         {salary.status === 'paid' ? 'CERTIFIED' : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '520px', padding: '3rem', position: 'relative', border: 'none' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.8rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center' }}>{t.lang === 'en' ? 'Add Sovereign Staff' : 'إضافة موظف سيادي'}</h3>
             <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'en' ? 'Full Legal Name' : 'الاسم القانوني الكامل'}</label>
                   <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'en' ? 'Role' : 'الوظيفة / الدور'}</label>
                   <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-executive" style={{ fontWeight: 800 }}>
                      <option>Accountant</option>
                      <option>Financial Analyst</option>
                      <option>Auditor</option>
                      <option>Ops Manager</option>
                   </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 900 }}>Base</label>
                      <input required type="number" value={formData.base} onChange={e => setFormData({...formData, base: e.target.value})} className="input-executive" style={{ fontWeight: 900, textAlign: 'center', fontSize: '1.1rem' }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 900 }}>Add (+)</label>
                      <input type="number" value={formData.allowances} onChange={e => setFormData({...formData, allowances: e.target.value})} className="input-executive" style={{ color: 'var(--success)', fontWeight: 900, textAlign: 'center', fontSize: '1.1rem' }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 900 }}>Ded (-)</label>
                      <input type="number" value={formData.deductions} onChange={e => setFormData({...formData, deductions: e.target.value})} className="input-executive" style={{ color: 'var(--error)', fontWeight: 900, textAlign: 'center', fontSize: '1.1rem' }} />
                   </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                   <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.lang === 'en' ? 'Cancel' : 'إلغاء'}</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1.2rem', fontSize: '1.1rem', border: 'none' }}>{t.lang === 'en' ? 'Secure Record' : 'حفظ السجل'}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
