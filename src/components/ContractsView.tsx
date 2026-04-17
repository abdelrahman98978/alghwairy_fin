import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Truck, User, 
  DollarSign, Clock, X, FileCheck, Download, Briefcase, ShieldCheck
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import type { Contract } from '../lib/localDB';

interface ContractsViewProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  logActivity: (action: string, entity: string, entity_id?: string) => void;
  t: any;
}

export default function ContractsView({ showToast, logActivity, t }: ContractsViewProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'client' | 'transporter'>('client');
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Omit<Contract, 'id'>>({
    type: 'client',
    entity_id: '',
    entity_name: '',
    contract_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    value: 0,
    terms: '',
    status: 'active',
    transport_expenses: 0
  });

  const loadData = useCallback(() => {
    const data = (localDB.getActive('contracts') || []) as Contract[];
    const custs = (localDB.getActive('customers') || []) as any[];
    setContracts(data);
    setCustomers(custs);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entity = customers.find(c => c.id === formData.entity_id);
    const finalData = { ...formData, entity_name: entity?.name || 'طرف مجهول' };
    
    try {
      if (selectedContract) {
        localDB.update('contracts', selectedContract.id, finalData);
        logActivity('تعديل عقد لوجستي', 'contracts', selectedContract.id);
        showToast(t.lang === 'ar' ? 'تم تحديث العقد السيادي بنجاح' : 'Sovereign contract updated successfully', 'success');
      } else {
        const inserted = localDB.insert('contracts', finalData);
        logActivity('إنشاء عقد سيادي جديد', 'contracts', inserted.id);
        showToast(t.lang === 'ar' ? 'تم إنشاء العقد اللوجستي بنجاح' : 'Logistic contract created successfully', 'success');
      }
      
      setShowModal(false);
      loadData();
      resetForm();
    } catch (error) {
      showToast('Error saving contract', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      type: activeTab,
      entity_id: '',
      entity_name: '',
      contract_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      value: 0,
      terms: '',
      status: 'active',
      transport_expenses: 0
    });
    setSelectedContract(null);
  };

  const filtered = useMemo(() => contracts.filter(c => 
    c.type === activeTab && 
    (c.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.terms.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [contracts, activeTab, searchTerm]);

  // Global KPIs
  const totalValue = useMemo(() => filtered.reduce((sum, c) => sum + (Number(c.value) || 0), 0), [filtered]);
  const activeCount = useMemo(() => filtered.filter(c => c.status === 'active').length, [filtered]);
  const expiringCount = useMemo(() => filtered.filter(c => {
    if (!c.expiry_date) return false;
    const diff = new Date(c.expiry_date).getTime() - new Date().getTime();
    return diff > 0 && diff < (30 * 24 * 60 * 60 * 1000); // 30 days
  }).length, [filtered]);

  return (
    <div className="slide-in" dir="rtl">
      {/* Header */}
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>إدارة العقود السيادية</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>عقود الشحن والخدمات اللوجستية المعتمدة</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
           <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-executive">
              <Plus size={18} /> إضافة عقد جديد
           </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', background: 'var(--surface-container-low)', padding: '0.5rem', borderRadius: '16px', alignSelf: 'flex-start', width: 'fit-content' }}>
        <button 
          onClick={() => setActiveTab('client')}
          style={{
            padding: '0.7rem 1.5rem', borderRadius: '12px', border: 'none',
            background: activeTab === 'client' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'client' ? 'var(--secondary)' : 'var(--on-surface-variant)',
            fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem',
            transition: 'all 0.3s'
          }}
        >
          <User size={18} /> عقود العملاء
        </button>
        <button 
          onClick={() => setActiveTab('transporter')}
          style={{
            padding: '0.7rem 1.5rem', borderRadius: '12px', border: 'none',
            background: activeTab === 'transporter' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'transporter' ? 'var(--secondary)' : 'var(--on-surface-variant)',
            fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem',
            transition: 'all 0.3s'
          }}
        >
          <Truck size={18} /> عقود الناقلين
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <KPICard title="إجمالي قيمة العقود" value={totalValue.toLocaleString()} icon={<DollarSign size={22} />} color="var(--primary)" />
        <KPICard title="العقود النشطة" value={activeCount.toString()} icon={<FileCheck size={22} />} color="var(--success)" />
        <KPICard title="عقود قاربت على الانتهاء" value={expiringCount.toString()} icon={<Clock size={22} />} color="var(--secondary)" />
      </div>

      {/* Search & List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
        <div style={{ padding: '1.5rem 2rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
            <input 
              type="text" 
              placeholder="البحث في العقود..." 
              className="input-executive" 
              style={{ width: '100%', paddingRight: '3rem' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', padding: '0.5rem 1rem' }}>
              <Download size={16} /> كشف كامل
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table">
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2rem' }}>الطرف المتعاقد</th>
                <th>تاريخ العقد</th>
                <th style={{ textAlign: 'center' }}>القيمة</th>
                {activeTab === 'transporter' && <th style={{ textAlign: 'center' }}>مصاريف التشغيل</th>}
                <th style={{ textAlign: 'center' }}>تاريخ الانتهاء</th>
                <th style={{ textAlign: 'center', paddingInlineEnd: '2rem' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '5rem', fontWeight: 800, opacity: 0.5 }}>لا توجد عقود مسجلة لهذا النوع</td></tr>
              ) : (
                filtered.map(contract => (
                  <tr key={contract.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedContract(contract); setFormData(contract); setShowModal(true); }}>
                    <td style={{ paddingInlineStart: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ padding: '0.6rem', background: 'var(--surface-container-high)', borderRadius: '10px', color: 'var(--primary)' }}>
                          {contract.type === 'client' ? <User size={16} /> : <Briefcase size={16} />}
                        </div>
                        <div>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', display: 'block' }}>{contract.entity_name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>ID: {contract.id?.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.9rem' }}>{contract.contract_date}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900 }}>{(Number(contract.value) || 0).toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>ر.س</span></td>
                    {activeTab === 'transporter' && <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--error)' }}>{(Number(contract.transport_expenses) || 0).toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>ر.س</span></td>}
                    <td style={{ textAlign: 'center', fontWeight: 800, color: isNearExpiry(contract.expiry_date) ? 'var(--error)' : 'inherit' }}>{contract.expiry_date || '-'}</td>
                    <td style={{ textAlign: 'center', paddingInlineEnd: '2rem' }}>
                      <span className="badge-sovereign" style={{ 
                        background: contract.status === 'active' ? 'rgba(27, 94, 32, 0.1)' : 'rgba(186, 26, 26, 0.1)',
                        color: contract.status === 'active' ? 'var(--success)' : 'var(--error)'
                      }}>
                        {contract.status === 'active' ? 'نشط' : 'ملغى'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '720px', padding: 0, position: 'relative', border: 'none' }}>
            <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary)', padding: '0.8rem', borderRadius: '14px', color: 'var(--secondary)' }}><FileCheck size={22} /></div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
                  {selectedContract ? 'تعديل عقد سيادي' : 'عقد سيادي جديد'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                 <FormField label="نوع العقد">
                    <select className="input-executive" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} style={{ fontWeight: 800 }}>
                       <option value="client">عقد عميل الاستيراد</option>
                       <option value="transporter">عقد مزود خدمة نقل</option>
                    </select>
                 </FormField>
                 <FormField label="الطرف الثاني">
                    <select className="input-executive" value={formData.entity_id} onChange={e => setFormData({...formData, entity_id: e.target.value})} required style={{ fontWeight: 700 }}>
                       <option value="">اختر من القائمة...</option>
                       {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </FormField>
                 <FormField label="تاريخ البدء">
                    <input type="date" className="input-executive" value={formData.contract_date} onChange={e => setFormData({...formData, contract_date: e.target.value})} />
                 </FormField>
                 <FormField label="تاريخ الانتهاء">
                    <input type="date" className="input-executive" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                 </FormField>
                 <FormField label="القيمة المتفق عليها">
                    <input type="number" className="input-executive" style={{ fontWeight: 900, color: 'var(--primary)' }} value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
                 </FormField>
                 {formData.type === 'transporter' && (
                    <FormField label="سعر التشغيل المتفق عليه">
                       <input type="number" className="input-executive" style={{ fontWeight: 900, color: 'var(--error)' }} value={formData.transport_expenses} onChange={e => setFormData({...formData, transport_expenses: Number(e.target.value)})} />
                    </FormField>
                 )}
                 <div style={{ gridColumn: 'span 2' }}>
                    <FormField label="البنود والشروط السيادية">
                       <textarea className="input-executive" rows={4} value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} style={{ resize: 'none' }} placeholder="..." />
                    </FormField>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                 <button type="button" onClick={() => setShowModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none' }}>إلغاء</button>
                 <button type="submit" className="btn-executive" style={{ flex: 2, border: 'none' }}>
                    <ShieldCheck size={20} /> اعتماد وحفظ العقد
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function isNearExpiry(dateStr?: string) {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return diff > 0 && diff < (30 * 24 * 60 * 60 * 1000);
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{label}</label>
      {children}
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderInlineStart: `5px solid ${color}` }}>
      <div>
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 800, marginBottom: '0.4rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)', margin: 0, fontFamily: 'Tajawal', fontWeight: 900 }}>
          {value} {title.includes('قيمة') ? <small style={{ fontSize: '0.8rem', opacity: 0.5 }}>SAR</small> : ''}
        </h3>
      </div>
      <div style={{ padding: '1rem', borderRadius: '14px', background: 'var(--surface-container-high)', color }}>{icon}</div>
    </div>
  );
}
