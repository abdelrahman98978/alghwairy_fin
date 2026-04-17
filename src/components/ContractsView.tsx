// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';

import { 
  Plus, Search, FileText, Trash2, CheckCircle, AlertCircle, Truck, User, 
  Calendar, DollarSign, ArrowUpRight, ShieldCheck, Download, Printer, X, 
  ChevronRight, Briefcase
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import type { Contract } from '../lib/localDB';

interface ContractsViewProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  logActivity: (action: string, details: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  t: any;
}

export const ContractsView: React.FC<ContractsViewProps> = ({ showToast, logActivity, t }) => {
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
        logActivity('تعديل عقد', `تم تعديل عقد ${finalData.entity_name}`, 'info');
        showToast('تم تحديث العقد بنجاح', 'success');
      } else {
        localDB.insert('contracts', finalData);
        logActivity('إنشاء عقد', `تم إنشاء عقد جديد لـ ${finalData.entity_name}`, 'success');
        showToast('تم إنشاء العقد بنجاح', 'success');
      }
      
      setShowModal(false);
      loadData();
      resetForm();
    } catch (error) {
      showToast('خطأ في حفظ العقد', 'error');
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

  const filtered = contracts.filter(c => 
    c.type === activeTab && 
    (c.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) || c.terms.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="slide-in" dir="rtl" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <header className="view-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>نظام التعاقدات السيادي</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>إدارة عقود العملاء وشركات النقل اللوجستي</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-executive"
        >
          <Plus size={18} />
          إضافة عقد جديد
        </button>
      </header>

      <div className="view-container">
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <TabButton active={activeTab === 'client'} onClick={() => setActiveTab('client')} icon={<User size={18} />} label="عقود العملاء" />
          <TabButton active={activeTab === 'transporter'} onClick={() => setActiveTab('transporter')} icon={<Truck size={18} />} label="عقود الناقلين" />
        </div>

        <div className="metric-grid">
          <ContractStat title="العقود النشطة" value={filtered.filter(c => c.status === 'active').length} color="blue" />
          <ContractStat title="قيمة الالتزامات" value={filtered.reduce((sum, c) => sum + (Number(c.value) || 0), 0)} color="green" />
          {activeTab === 'transporter' && <ContractStat title="مصاريف النقل" value={filtered.reduce((sum, c) => sum + (Number(c.transport_expenses) || 0), 0)} color="red" />}
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="sovereign-table">
              <thead>
                <tr>
                  <th>الطرف المتعاقد</th>
                  <th>تاريخ البدء</th>
                  <th>القيمة الإجمالية</th>
                  {activeTab === 'transporter' && <th>مصاريف النقل</th>}
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(contract => (
                  <tr key={contract.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedContract(contract); setFormData(contract); setShowModal(true); }}>
                    <td>
                      <div style={{ fontWeight: 900, color: 'var(--on-surface)' }}>{contract.entity_name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{contract.id}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--on-surface-variant)' }}>{contract.contract_date}</td>
                    <td style={{ fontWeight: 900, color: 'var(--secondary)' }}>{(Number(contract.value) || 0).toLocaleString()} ر.س</td>
                    {activeTab === 'transporter' && <td style={{ fontWeight: 900, color: 'var(--error)' }}>{(Number(contract.transport_expenses) || 0).toLocaleString()} ر.س</td>}
                    <td>
                      <span className="badge-sovereign" style={{ 
                        backgroundColor: contract.status === 'active' ? 'var(--success-container)' : 'var(--error-container)', 
                        color: contract.status === 'active' ? 'var(--success)' : 'var(--error)' 
                      }}>
                        {contract.status === 'active' ? 'نشط' : 'ملغى'}
                      </span>
                    </td>
                    <td>
                      <button className="btn-executive" style={{ padding: '0.5rem', background: 'var(--surface-container)', color: 'var(--primary)' }}>
                        <FileText size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="card" style={{ width: '100%', maxWidth: '800px', padding: 0, margin: '2rem auto' }}>
             <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: 'var(--primary)' }}>{selectedContract ? 'تعديل بيانات العقد' : 'إنشاء عقد جديد'}</h2>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                  <X size={24} />
                </button>
             </div>
             <form onSubmit={handleSubmit} style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 900, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>نوع التعاقد</label>
                  <select className="input-executive" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="client">عقد عميل (تخليص)</option>
                    <option value="transporter">عقد ناقل (لوجستي)</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 900, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>اسم الطرف</label>
                  <select className="input-executive" value={formData.entity_id} onChange={e => setFormData({...formData, entity_id: e.target.value})} required>
                    <option value="">اختر الطرف...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 900, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>تاريخ العقد</label>
                  <input type="date" className="input-executive" value={formData.contract_date} onChange={e => setFormData({...formData, contract_date: e.target.value})} />
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 900, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>تاريخ الانتهاء</label>
                  <input type="date" className="input-executive" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                </div>
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 900, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>القيمة الكلية</label>
                  <input type="number" className="input-executive" style={{ color: 'var(--primary)', fontWeight: 900 }} value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
                </div>
                {formData.type === 'transporter' && (
                  <div style={{ gridColumn: 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 900, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>مصاريف التشغيل/النقل</label>
                    <input type="number" className="input-executive" style={{ color: 'var(--error)', fontWeight: 900 }} value={formData.transport_expenses} onChange={e => setFormData({...formData, transport_expenses: Number(e.target.value)})} />
                  </div>
                )}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 900, color: 'var(--on-surface-variant)', marginBottom: '0.5rem' }}>الشروط والأحكام</label>
                  <textarea rows={3} className="input-executive" value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} placeholder="اكتب شروط العقد هنا..." />
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: '1rem' }}>
                  <button type="submit" className="btn-executive" style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem', background: 'var(--primary)', color: 'var(--on-primary)' }}>
                    حفظ بيانات العقد السيادي
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', 
        borderRadius: 'var(--radius-md)', fontWeight: 900, cursor: 'pointer', border: 'none',
        background: active ? 'var(--secondary)' : 'var(--surface)', 
        color: active ? 'var(--on-secondary-container)' : 'var(--on-surface-variant)',
        boxShadow: active ? '0 8px 20px rgba(212, 167, 106, 0.3)' : 'var(--shadow-sm)',
        transition: 'all 0.3s'
      }}
    >
       {icon}
       <span>{label}</span>
    </button>
  );
}

interface ContractStatProps {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'red';
}

function ContractStat({ title, value, color }: ContractStatProps) {
  const bgColors = { blue: 'var(--surface-container-low)', green: 'var(--success-container)', red: 'var(--error-container)' };
  const textColors = { blue: 'var(--primary)', green: 'var(--success)', red: 'var(--error)' };
  
  return (
    <div className="card" style={{ background: bgColors[color], borderColor: 'transparent' }}>
       <p style={{ fontSize: '0.875rem', fontWeight: 900, opacity: 0.7, marginBottom: '0.5rem', color: textColors[color] }}>{title}</p>
       <h3 style={{ fontSize: '2rem', margin: 0, fontWeight: 900, color: textColors[color] }}>{value.toLocaleString()}</h3>
    </div>
  );
}
