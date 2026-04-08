import { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Plus,
  X,
  Building2,
  Lock,
  Download,
  Printer,
  Calendar,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { localDB } from '../lib/localDB';
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
  gosi: number;
  net: number;
  status: string;
  period: string;
  iban: string;
  bank_name: string;
  created_at: string;
}

export default function PayrollView({ showToast, logActivity, t }: Props) {
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSalary, setSelectedSalary] = useState<Salary | null>(null);
  const [showSlipModal, setShowSlipModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    role: 'Accountant',
    base: '',
    allowances: '',
    deductions: '',
    iban: '',
    bank_name: 'Saudi National Bank (SNB)',
    applyGosi: true
  });

  const fetchSalaries = useCallback(() => {
    setLoading(true);
    try {
        const data = localDB.getActive('payroll')
          .filter((s: any) => s.period === currentPeriod || !s.period) // Fallback for old records
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSalaries((data as Salary[]) || []);
    } catch (err: any) {
        showToast('Error: ' + err.message, 'error');
    }
    setLoading(false);
  }, [showToast, currentPeriod]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.base || !formData.iban) {
      showToast(t.lang === 'ar' ? 'يرجى إكمال البيانات (الاسم، الراتب، الآيبان)' : 'Please complete all fields (Name, Base, IBAN)', 'error');
      return;
    }

    const baseValue = parseFloat(formData.base) || 0;
    const allowancesValue = parseFloat(formData.allowances) || 0;
    const deductionsValue = parseFloat(formData.deductions) || 0;
    const gosiValue = formData.applyGosi ? (baseValue * 0.0975) : 0; // Estimation for Saudi GOSI
    const netValue = baseValue + allowancesValue - deductionsValue - gosiValue;

    const newSalary = {
      emp_number: 'AL-' + Math.floor(Math.random() * 90000 + 10000),
      name: formData.name,
      role: formData.role,
      base: baseValue,
      allowances: allowancesValue,
      deductions: deductionsValue,
      gosi: gosiValue,
      net: netValue,
      status: 'pending',
      period: currentPeriod,
      iban: formData.iban,
      bank_name: formData.bank_name
    };
    
    try {
        const record = localDB.insert('payroll', newSalary);
        await logActivity('Enrolled Staff for ' + currentPeriod + ': ' + formData.name, 'payroll', record.id);
        showToast(t.lang === 'ar' ? 'تم تسجيل الموظف سيادياً' : 'Staff record secured under sovereign ledger.', 'success');
        setShowAddModal(false);
        setFormData({ name: '', role: 'Accountant', base: '', allowances: '', deductions: '', iban: '', bank_name: 'Saudi National Bank (SNB)', applyGosi: true });
        fetchSalaries();
    } catch (err: any) {
        showToast('Error adding employee', 'error');
    }
  };

  const approveAllPending = async () => {
    const pendingSalaries = salaries.filter(s => s.status === 'pending');
    if (pendingSalaries.length === 0) {
       showToast(t.lang === 'ar' ? 'لا توجد مسيرات معلقة لهذه الفترة' : 'No pending payrolls for this period', 'error');
       return;
    }

    showToast(t.lang === 'ar' ? 'جاري توثيق مسيرات الرواتب السيادية...' : 'Certifying Sovereign Payroll Records...', 'success');

    setTimeout(async () => {
       try {
           pendingSalaries.forEach(s => {
               localDB.update('payroll', s.id, { status: 'paid' });
           });
           await logActivity('Sovereign Payroll Certification for ' + currentPeriod, 'payroll');
           showToast(t.lang === 'ar' ? 'تم اعتماد رواتب المؤسسة بنجاح' : 'Sovereign Payroll Certification Successful', 'success');
           fetchSalaries();
       } catch (err: any) {
           showToast('Error: ' + err.message, 'error');
       }
    }, 1500);
  };

  const exportSIF = () => {
    const headers = ["RecordType", "EmpID", "BankCode", "IBAN", "NetSalary", "BaseSalary", "Allowances", "Deductions", "Period"];
    const rows = salaries.map(s => [
      "SAL",
      s.emp_number,
      "SNB",
      s.iban,
      s.net.toFixed(2),
      s.base.toFixed(2),
      s.allowances.toFixed(2),
      (s.deductions + s.gosi).toFixed(2),
      s.period
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => { csvContent += row.join(",") + "\n"; });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Alghwairy_WPS_SIF_${currentPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast(t.lang === 'ar' ? 'تم توليد ملف SIF الخاص بحماية الأجور' : 'WPS SIF File Generated Successfully', 'success');
  };

  const totalNet = salaries.reduce((acc, current) => acc + Number(current.net || 0), 0);
  const activeEmployees = salaries.length;
  const delayedTotal = salaries.filter(s => s.status === 'pending').reduce((acc, current) => acc + Number(current.net || 0), 0);
  const isPending = salaries.some(s => s.status === 'pending');

  const handlePrintSlip = (salary: Salary) => {
    setSelectedSalary(salary);
    setShowSlipModal(true);
  };

  return (
    <div className="slide-in no-print">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.4rem' }}>
              <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
              <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--primary)', color: 'var(--secondary)', padding: '0.2rem 0.6rem', borderRadius: '4px' }}>SOVEREIGN HUB</span>
           </div>
           <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ background: 'var(--surface-container-low)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
             <Calendar size={18} color="var(--primary)" />
             <input 
                type="month" 
                value={currentPeriod} 
                onChange={(e) => setCurrentPeriod(e.target.value)}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, fontFamily: 'Tajawal', outline: 'none', cursor: 'pointer' }}
             />
          </div>
          <button 
             onClick={() => setShowAddModal(true)}
             className="btn-executive"
             style={{ background: 'var(--surface-container-low)', border: '1px solid var(--surface-container-high)', color: 'var(--primary)', fontWeight: 800 }}
          >
             <Plus size={18} /> {t.add_staff_title || 'إضافة كادر'}
          </button>
          <button 
             disabled={!isPending}
             onClick={approveAllPending}
             className="btn-executive" 
             style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', opacity: isPending ? 1 : 0.6, border: 'none' }}
          >
             <Lock size={18} /> {isPending ? (t.lang === 'ar' ? 'اعتماد المسيرات' : 'Certify Payroll') : (t.lang === 'ar' ? 'تم الاعتماد السيادي' : 'Sovereign Certified')}
          </button>
        </div>
      </header>

      {/* Overview Cards */}
      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 2 }}>
               <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(255,255,255,0.1)', color: 'var(--secondary)' }}><Building2 size={28} /></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.4rem 1rem', background: 'rgba(136, 217, 130, 0.2)', color: '#88d982', borderRadius: '10px', textTransform: 'uppercase' }}>{currentPeriod} BUDGET</span>
           </div>
           <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', fontWeight: 700, marginBottom: '0.5rem', position: 'relative', zIndex: 2 }}>{t.total_salaries}</p>
           <h2 style={{ fontSize: '2.6rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--secondary)', position: 'relative', zIndex: 2 }}>
              {totalNet.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.6, color: 'white' }}>SAR</span>
           </h2>
        </div>

        <div className="card" style={{ padding: '2.5rem', borderInlineStart: '6px solid var(--primary)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <div style={{ padding: '1rem', borderRadius: '16px', background: 'var(--surface-container-high)', color: 'var(--primary)' }}><Users size={28} /></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.4rem 1rem', background: 'var(--surface-container-low)', color: 'var(--primary)', borderRadius: '10px' }}>ENROLLED</span>
           </div>
           <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.5rem' }}>{t.active_employees}</p>
           <h2 style={{ fontSize: '2.4rem', margin: 0, fontFamily: 'Tajawal', color: 'var(--primary)', fontWeight: 900 }}>
             {activeEmployees} <span style={{ fontSize: '1rem', opacity: 0.5 }}>Staff</span>
           </h2>
        </div>

        <div className="card" style={{ padding: '2.5rem', background: 'var(--secondary)', border: 'none', color: 'var(--primary)' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
               <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(0,0,0,0.05)', color: 'var(--primary)' }}><ShieldCheck size={28} /></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 900, padding: '0.4rem 1rem', background: 'rgba(0,0,0,0.05)', color: 'var(--primary)', borderRadius: '10px' }}>WPS STATUS</span>
           </div>
           <p style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: 700, marginBottom: '0.5rem', opacity: 0.8 }}>{t.pending_payments}</p>
           <h2 style={{ fontSize: '2.4rem', margin: 0, fontFamily: 'Tajawal', color: 'var(--primary)', fontWeight: 900 }}>
             {delayedTotal.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.7 }}>SAR</span>
           </h2>
        </div>
      </div>

      {/* Main Table Area */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
        <div style={{ padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.3rem', fontFamily: 'Tajawal', color: 'var(--primary)', margin: 0, fontWeight: 900 }}>{t.ledger_title}</h3>
              <span style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.2rem 0.8rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900 }}>{currentPeriod}</span>
           </div>
           <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button 
                onClick={exportSIF} 
                style={{ background: 'white', border: '1px solid var(--surface-container-high)', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                 <Download size={18}/> {t.sif_export || 'SIF Export'}
              </button>
           </div>
        </div>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: '6rem', color: 'var(--on-surface-variant)', fontWeight: 800, fontSize: '1.2rem' }}>Audit in progress...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sovereign-table">
              <thead>
                <tr>
                  <th style={{ paddingInlineStart: '2.5rem' }}>{t.table_employee}</th>
                  <th style={{ textAlign: 'right' }}>{t.table_base}</th>
                  <th style={{ textAlign: 'right' }}>{t.table_plus}</th>
                  <th style={{ textAlign: 'right' }}>{t.table_ded} / GOSI</th>
                  <th style={{ textAlign: 'right', background: 'rgba(0,0,0,0.02)' }}>{t.table_net}</th>
                  <th style={{ textAlign: 'center' }}>DOCS</th>
                  <th style={{ textAlign: 'center' }}>{t.table_status}</th>
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
                    <td style={{ color: 'var(--error)', fontWeight: 800, textAlign: 'right' }}>-{Number(salary.deductions + (salary.gosi || 0)).toLocaleString()}</td>
                    <td style={{ fontWeight: 900, fontSize: '1.2rem', background: 'rgba(0,0,0,0.02)', color: 'var(--primary)', textAlign: 'right' }}>{Number(salary.net).toLocaleString()} <span style={{ fontSize: '0.7rem' }}>SAR</span></td>
                    <td style={{ textAlign: 'center' }}>
                       <button onClick={() => handlePrintSlip(salary)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', opacity: 0.7 }}>
                          <FileText size={20} />
                       </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, padding: '0.4rem 1rem', borderRadius: '20px', background: salary.status === 'paid' ? 'rgba(27, 94, 32, 0.1)' : 'rgba(212, 167, 106, 0.1)', color: salary.status === 'paid' ? 'var(--success)' : 'var(--secondary)', textTransform: 'uppercase' }}>
                         {salary.status === 'paid' ? t.status_certified : t.status_pending}
                      </span>
                    </td>
                  </tr>
                ))}
                {salaries.length === 0 && (
                   <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '5rem', opacity: 0.6, fontWeight: 800, color: 'var(--primary)' }}>NO RECORDS FOR {currentPeriod}</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '600px', padding: '3rem', position: 'relative', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.8rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center' }}>{t.add_staff_title}</h3>
             <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.full_name_label}</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-executive" />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.role_label}</label>
                      <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-executive">
                         <option>Accountant</option>
                         <option>Customs Specialist</option>
                         <option>Operations Manager</option>
                         <option>Logistics Lead</option>
                         <option>Public Relations</option>
                      </select>
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.iban_label}</label>
                      <input required type="text" placeholder="SA..." value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} className="input-executive" style={{ fontFamily: 'monospace', letterSpacing: '1px' }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.bank_label}</label>
                      <select value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="input-executive">
                         <option>Saudi National Bank (SNB)</option>
                         <option>Al Rajhi Bank</option>
                         <option>Riyad Bank</option>
                         <option>SABB</option>
                         <option>Banque Saudi Fransi</option>
                      </select>
                   </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 900 }}>{t.base_label}</label>
                      <input required type="number" value={formData.base} onChange={e => setFormData({...formData, base: e.target.value})} className="input-executive" style={{ fontWeight: 900, textAlign: 'center' }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 900 }}>{t.plus_label}</label>
                      <input type="number" value={formData.allowances} onChange={e => setFormData({...formData, allowances: e.target.value})} className="input-executive" style={{ color: 'var(--success)', fontWeight: 900, textAlign: 'center' }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: 900 }}>{t.ded_label}</label>
                      <input type="number" value={formData.deductions} onChange={e => setFormData({...formData, deductions: e.target.value})} className="input-executive" style={{ color: 'var(--error)', fontWeight: 900, textAlign: 'center' }} />
                   </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface-container-low)', padding: '1rem', borderRadius: '12px', border: '1px dashed var(--primary)' }}>
                   <input 
                      type="checkbox" 
                      id="gosi_check" 
                      checked={formData.applyGosi} 
                      onChange={e => setFormData({...formData, applyGosi: e.target.checked})}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                   />
                   <label htmlFor="gosi_check" style={{ fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}>{t.gosi_deduction} (9.75% Saudi Staff Rule)</label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                   <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.cancel}</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1.2rem', fontSize: '1.1rem', border: 'none' }}>{t.secure_record}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {showSlipModal && selectedSalary && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.9)', zIndex: 4000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '800px', background: 'white', padding: 0, overflow: 'hidden', border: 'none' }}>
             <div className="no-print" style={{ padding: '1rem 2rem', background: 'var(--primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--secondary)', fontWeight: 900 }}>SALARY SLIP PREVIEW</span>
                <div style={{ display: 'flex', gap: '1rem' }}>
                   <button onClick={() => window.print()} className="btn-executive" style={{ background: 'var(--secondary)', color: 'var(--primary)', border: 'none', padding: '0.4rem 1rem' }}><Printer size={16} /> PRINT</button>
                   <button onClick={() => setShowSlipModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                </div>
             </div>
             
             {/* Actual Slip Component */}
             <div id="salary-slip-content" style={{ padding: '4rem', color: '#000', fontFamily: 'Tajawal' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #000', paddingBottom: '2rem', marginBottom: '3rem' }}>
                   <div>
                      <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>ALGHWAIRY</h1>
                      <p style={{ margin: 0, fontWeight: 700, opacity: 0.7 }}>Customs Clearance & Logistics</p>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900 }}>مؤسسة الغويري</h1>
                      <p style={{ margin: 0, fontWeight: 700, opacity: 0.7 }}>للتخليص الجمركي والخدمات اللوجستية</p>
                   </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                   <h2 style={{ textDecoration: 'underline', marginBottom: '0.5rem' }}>SALARY SLIP / مسير راتب</h2>
                   <p style={{ fontWeight: 800 }}>Period / الفترة: {selectedSalary.period}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '3rem', padding: '2rem', background: '#f8f8f8', borderRadius: '12px' }}>
                   <div>
                      <p style={{ margin: '0.5rem 0' }}><strong>Employee:</strong> {selectedSalary.name}</p>
                      <p style={{ margin: '0.5rem 0' }}><strong>ID:</strong> {selectedSalary.emp_number}</p>
                      <p style={{ margin: '0.5rem 0' }}><strong>Role:</strong> {selectedSalary.role}</p>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: '0.5rem 0' }}><strong>Bank:</strong> {selectedSalary.bank_name}</p>
                      <p style={{ margin: '0.5rem 0' }}><strong>IBAN:</strong> {selectedSalary.iban}</p>
                   </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4rem' }}>
                   <thead>
                      <tr style={{ borderBottom: '2px solid #000' }}>
                         <th style={{ textAlign: 'left', padding: '1rem' }}>Description / البيان</th>
                         <th style={{ textAlign: 'right', padding: '1rem' }}>Earnings (+ / -)</th>
                      </tr>
                   </thead>
                   <tbody>
                      <tr>
                         <td style={{ padding: '1rem' }}>Base Salary / الراتب الأساسي</td>
                         <td style={{ textAlign: 'right', padding: '1rem' }}>{selectedSalary.base.toLocaleString()} SAR</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '1rem' }}>Allowances / البدلات</td>
                         <td style={{ textAlign: 'right', padding: '1rem' }}>+{selectedSalary.allowances.toLocaleString()} SAR</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '1rem' }}>Deductions / الاستقطاعات</td>
                         <td style={{ textAlign: 'right', padding: '1rem' }}>-{selectedSalary.deductions.toLocaleString()} SAR</td>
                      </tr>
                      <tr>
                         <td style={{ padding: '1rem' }}>GOSI / التأمينات الاجتماعية</td>
                         <td style={{ textAlign: 'right', padding: '1rem' }}>-{(selectedSalary.gosi || 0).toLocaleString()} SAR</td>
                      </tr>
                      <tr style={{ borderTop: '2px solid #000', background: '#eee' }}>
                         <td style={{ padding: '1rem', fontWeight: 900 }}>NET SALARY / صافي الراتب</td>
                         <td style={{ textAlign: 'right', padding: '1rem', fontWeight: 900, fontSize: '1.4rem' }}>{selectedSalary.net.toLocaleString()} SAR</td>
                      </tr>
                   </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6rem' }}>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '200px', borderBottom: '1px solid #000', marginBottom: '0.5rem' }}></div>
                      <p>Company Stamp / ختـــم المؤسسة</p>
                   </div>
                   <div style={{ textAlign: 'center' }}>
                      <div style={{ width: '200px', borderBottom: '1px solid #000', marginBottom: '0.5rem' }}></div>
                      <p>Employee Signature / توقيع الموظف</p>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Styles for print slips */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #salary-slip-content, #salary-slip-content * { visibility: visible; }
          #salary-slip-content { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
