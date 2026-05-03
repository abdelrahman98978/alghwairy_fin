import { useState, useEffect, useCallback, useMemo } from 'react';
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

    try {
        const data = localDB.getActive('payroll')
          .filter((s: any) => s.period === currentPeriod || !s.period)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setSalaries((data as Salary[]) || []);
    } catch (err: any) {
        showToast('Error: ' + err.message, 'error');
    }

  }, [showToast, currentPeriod]);

  useEffect(() => {
    fetchSalaries();
  }, [fetchSalaries]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.base || !formData.iban) {
      showToast(t.lang === 'ar' ? 'يرجى إكمال البيانات' : 'Please complete all fields', 'error');
      return;
    }

    const baseValue = parseFloat(formData.base) || 0;
    const allowancesValue = parseFloat(formData.allowances) || 0;
    const deductionsValue = parseFloat(formData.deductions) || 0;
    const gosiValue = formData.applyGosi ? (baseValue * 0.0975) : 0;
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
        await logActivity('Enrolled Staff: ' + formData.name, 'payroll', record.id);
        showToast(t.enroll_success, 'success');
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
       showToast(t.no_pending, 'error');
       return;
    }

    showToast(t.certify_confirm, 'success');

    setTimeout(async () => {
       try {
           pendingSalaries.forEach(s => {
               localDB.update('payroll', s.id, { status: 'paid' });
           });
           await logActivity('Payroll Certification: ' + currentPeriod, 'payroll');
           showToast(t.certify_success, 'success');
           fetchSalaries();
       } catch (err: any) {
           showToast('Error: ' + err.message, 'error');
       }
    }, 1500);
  };

  const exportSIF = () => {
    const headers = ["RecordType", "EmpID", "BankCode", "IBAN", "NetSalary", "BaseSalary", "Allowances", "Deductions", "Period"];
    const rows = salaries.map(s => [
      "SAL", s.emp_number, "SNB", s.iban, s.net.toFixed(2), s.base.toFixed(2), s.allowances.toFixed(2), (s.deductions + s.gosi).toFixed(2), s.period
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n";
    rows.forEach(row => { csvContent += row.join(",") + "\n"; });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Alghwairy_WPS_${currentPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast(t.sif_success, 'success');
  };

  const stats = useMemo(() => {
    return {
      totalNet: salaries.reduce((acc, s) => acc + Number(s.net || 0), 0),
      activeEmployees: salaries.length,
      pendingTotal: salaries.filter(s => s.status === 'pending').reduce((acc, s) => acc + Number(s.net || 0), 0),
      isPending: salaries.some(s => s.status === 'pending')
    };
  }, [salaries]);

  return (
    <div className="accounting-view-container" dir={t.lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title">{t.title}</h2>
          <p className="view-subtitle">{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="payroll-period-selector">
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>calendar_month</span>
            <input type="month" value={currentPeriod} onChange={e => setCurrentPeriod(e.target.value)} />
          </div>
          <button onClick={() => setShowAddModal(true)} className="btn-sovereign-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person_add</span> {t.add_staff_title}
          </button>
          <button 
            disabled={!stats.isPending}
            onClick={approveAllPending}
            className="btn-sovereign-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', opacity: stats.isPending ? 1 : 0.6 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>{stats.isPending ? 'lock_open' : 'verified_user'}</span> 
            {stats.isPending ? t.certify_payroll : t.certified_badge}
          </button>
        </div>
      </header>

      <div className="metrics-grid-stable">
        <SummaryMetric title={t.total_salaries} value={stats.totalNet.toLocaleString()} unit="SAR" icon="account_balance_wallet" accent="blue" />
        <SummaryMetric title={t.active_employees} value={stats.activeEmployees.toString()} unit="Staff" icon="groups" accent="gold" />
        <SummaryMetric title={t.pending_payments} value={stats.pendingTotal.toLocaleString()} unit="SAR" icon="pending_actions" accent="red" />
      </div>

      <div className="card shadow-elite" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="payroll-table-header">
          <div>
            <h3 className="section-title-premium" style={{ margin: 0 }}>{t.ledger_title}</h3>
            <p className="section-subtitle-premium" style={{ margin: 0 }}>{t.subtitle}</p>
          </div>
          <button onClick={exportSIF} className="btn-action-small" style={{ gap: '0.6rem', padding: '0.8rem 1.2rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span> {t.sif_export}
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table">
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2.5rem' }}>{t.table_employee}</th>
                <th style={{ textAlign: 'right' }}>{t.table_base}</th>
                <th style={{ textAlign: 'right' }}>{t.table_plus}</th>
                <th style={{ textAlign: 'right' }}>{t.table_ded} / GOSI</th>
                <th style={{ textAlign: 'right' }}>{t.table_net}</th>
                <th style={{ textAlign: 'center' }}>DOCS</th>
                <th style={{ textAlign: 'center', paddingInlineEnd: '2.5rem' }}>{t.table_status}</th>
              </tr>
            </thead>
            <tbody>
              {salaries.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '5rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>{t.no_records}</td></tr>
              ) : (
                salaries.map(salary => (
                  <tr key={salary.id}>
                    <td style={{ paddingInlineStart: '2.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="icon-box" style={{ background: 'var(--primary)', color: 'var(--secondary)', width: 40, height: 40, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                          {salary.name.charAt(0)}
                        </div>
                        <div>
                          <span style={{ fontWeight: 800, color: 'var(--on-surface)', fontSize: '1rem', display: 'block' }}>{salary.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{salary.emp_number} • {salary.role}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}><span className="item-amount">{salary.base.toLocaleString()}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="item-amount" style={{ color: 'var(--success)' }}>+{salary.allowances.toLocaleString()}</span></td>
                    <td style={{ textAlign: 'right' }}><span className="item-amount" style={{ color: 'var(--error)' }}>-{(salary.deductions + (salary.gosi || 0)).toLocaleString()}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="item-amount" style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{salary.net.toLocaleString()}</span> 
                      <span style={{ fontSize: '0.7rem', marginInlineStart: '0.4rem', opacity: 0.6, fontWeight: 900 }}>SAR</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => { setSelectedSalary(salary); setShowSlipModal(true); }} className="btn-action-small">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                      </button>
                    </td>
                    <td style={{ textAlign: 'center', paddingInlineEnd: '2.5rem' }}>
                      <span className={`badge-sovereign ${salary.status === 'paid' ? 'status-active' : 'status-pending'}`}>
                        {salary.status === 'paid' ? t.status_certified : t.status_pending}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '650px', padding: 0 }}>
            <div className="modal-header-premium" style={{ background: 'var(--surface-container-low)', padding: '2rem 2.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <div className="icon-container-gold" style={{ width: '45px', height: '45px', background: 'var(--primary)', color: 'var(--secondary)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person_add</span>
                </div>
                <h3 className="section-title-premium" style={{ margin: 0, fontSize: '1.5rem' }}>{t.add_staff_title}</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn-icon"><span className="material-symbols-outlined" style={{ fontSize: '28px' }}>close</span></button>
            </div>

            <form onSubmit={handleManualAdd} className="modal-body-premium" style={{ padding: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 1000 }}>{t.full_name_label}</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-premium" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 1000 }}>{t.role_label}</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="input-premium">
                    <option>Accountant</option>
                    <option>Customs Specialist</option>
                    <option>Operations Manager</option>
                    <option>Logistics Lead</option>
                    <option>Public Relations</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 1000 }}>{t.iban_label}</label>
                  <input required type="text" placeholder="SA..." value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} className="input-premium" style={{ fontFamily: 'monospace' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 1000 }}>{t.bank_label}</label>
                  <select value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} className="input-premium">
                    <option>Saudi National Bank (SNB)</option>
                    <option>Al Rajhi Bank</option>
                    <option>Riyad Bank</option>
                    <option>SABB</option>
                    <option>Banque Saudi Fransi</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 1000 }}>{t.base_label}</label>
                  <input required type="number" value={formData.base} onChange={e => setFormData({...formData, base: e.target.value})} className="input-premium" style={{ textAlign: 'center', fontWeight: 1000 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 1000 }}>{t.plus_label}</label>
                  <input type="number" value={formData.allowances} onChange={e => setFormData({...formData, allowances: e.target.value})} className="input-premium" style={{ textAlign: 'center', fontWeight: 1000, color: 'var(--success)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 1000 }}>{t.ded_label}</label>
                  <input type="number" value={formData.deductions} onChange={e => setFormData({...formData, deductions: e.target.value})} className="input-premium" style={{ textAlign: 'center', fontWeight: 1000, color: 'var(--error)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface-container-low)', padding: '1.2rem', borderRadius: '16px', border: '1px dashed var(--primary)', marginBottom: '2rem' }}>
                <input type="checkbox" id="gosi_check" checked={formData.applyGosi} onChange={e => setFormData({...formData, applyGosi: e.target.checked})} style={{ width: '20px', height: '20px', cursor: 'pointer' }} />
                <label htmlFor="gosi_check" style={{ fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer' }}>{t.gosi_deduction} (9.75% Saudi Staff Rule)</label>
              </div>

              <div style={{ display: 'flex', gap: '1.2rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-sovereign-outline" style={{ flex: 1, padding: '1.2rem' }}>{t.cancel}</button>
                <button type="submit" className="btn-sovereign-primary" style={{ flex: 2, padding: '1.2rem', gap: '0.8rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>verified</span> {t.secure_record}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Slip Modal */}
      {showSlipModal && selectedSalary && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '800px', padding: 0, background: '#fff', color: '#000' }}>
            <div className="no-print" style={{ padding: '1.5rem 2rem', background: '#001a33', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '24px 24px 0 0' }}>
              <span style={{ fontWeight: 1000, fontSize: '1.1rem' }}>{t.slip.preview_title}</span>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => window.print()} className="btn-sovereign-primary" style={{ background: '#fff', color: '#001a33', border: 'none', padding: '0.6rem 1.2rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>print</span> PRINT
                </button>
                <button onClick={() => setShowSlipModal(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>close</span>
                </button>
              </div>
            </div>
            
            <div className="payroll-slip-content" style={{ padding: '3rem', fontFamily: 'Tajawal' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #001a33', paddingBottom: '2rem', marginBottom: '3rem' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 1000, color: '#001a33' }}>ALGHWAIRY</h1>
                  <p style={{ margin: 0, fontWeight: 800, opacity: 0.7 }}>Customs Clearance & Logistics</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 1000, color: '#001a33' }}>مؤسسة الغويري</h1>
                  <p style={{ margin: 0, fontWeight: 800, opacity: 0.7 }}>للتخليص الجمركي والخدمات اللوجستية</p>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h2 style={{ textDecoration: 'underline', marginBottom: '0.5rem', fontWeight: 1000 }}>{t.slip.preview_title}</h2>
                <p style={{ fontWeight: 900, fontSize: '1.1rem' }}>{t.period_label}: {selectedSalary.period}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem', padding: '2rem', background: '#f8f9fa', borderRadius: '20px', border: '1px solid #eee' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0 }}><strong>Employee:</strong> {selectedSalary.name}</p>
                  <p style={{ margin: 0 }}><strong>ID:</strong> {selectedSalary.emp_number}</p>
                  <p style={{ margin: 0 }}><strong>Role:</strong> {selectedSalary.role}</p>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={{ margin: 0 }}><strong>Bank:</strong> {selectedSalary.bank_name}</p>
                  <p style={{ margin: 0 }}><strong>IBAN:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 1000 }}>{selectedSalary.iban}</span></p>
                </div>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #001a33', background: '#001a33', color: '#fff' }}>
                    <th style={{ textAlign: 'right', padding: '1.2rem', fontWeight: 1000 }}>{t.slip.description}</th>
                    <th style={{ textAlign: 'center', padding: '1.2rem', fontWeight: 1000 }}>{t.slip.earnings} / {t.slip.deductions}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1.2rem', fontWeight: 800 }}>Base Salary / الراتب الأساسي</td>
                    <td style={{ textAlign: 'center', padding: '1.2rem', fontWeight: 1000 }}>{selectedSalary.base.toLocaleString()} SAR</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1.2rem', fontWeight: 800 }}>Allowances / البدلات</td>
                    <td style={{ textAlign: 'center', padding: '1.2rem', fontWeight: 1000, color: '#2e7d32' }}>+{selectedSalary.allowances.toLocaleString()} SAR</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1.2rem', fontWeight: 800 }}>Deductions / الاستقطاعات</td>
                    <td style={{ textAlign: 'center', padding: '1.2rem', fontWeight: 1000, color: '#d32f2f' }}>-{selectedSalary.deductions.toLocaleString()} SAR</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '1.2rem', fontWeight: 800 }}>GOSI / التأمينات الاجتماعية</td>
                    <td style={{ textAlign: 'center', padding: '1.2rem', fontWeight: 1000, color: '#d32f2f' }}>-{(selectedSalary.gosi || 0).toLocaleString()} SAR</td>
                  </tr>
                  <tr style={{ background: '#f8f9fa' }}>
                    <td style={{ padding: '1.5rem', fontWeight: 1000, color: '#001a33', fontSize: '1.1rem' }}>NET SALARY / صافي الراتب</td>
                    <td style={{ textAlign: 'center', padding: '1.5rem', fontWeight: 1000, fontSize: '1.6rem', color: '#001a33' }}>{selectedSalary.net.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>SAR</span></td>
                  </tr>
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '220px', borderBottom: '2px solid #001a33', marginBottom: '0.8rem' }}></div>
                  <p style={{ fontWeight: 900, fontSize: '0.9rem' }}>Company Stamp / ختـــم المؤسسة</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '220px', borderBottom: '2px solid #001a33', marginBottom: '0.8rem' }}></div>
                  <p style={{ fontWeight: 900, fontSize: '0.9rem' }}>Employee Signature / توقيع الموظف</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryMetric({ title, value, unit, icon, accent = 'blue' }: { title: string; value: string; unit: string; icon: string; accent?: 'blue' | 'red' | 'gold' | 'success' }) {
  return (
    <div className={`card-executive accent-${accent}`}>
      <div className="card-executive-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="card-executive-content">
        <div className="card-executive-title">{title}</div>
        <div className="card-executive-value-group">
          <span className="card-executive-value">{value}</span>
          <span className="card-executive-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}
