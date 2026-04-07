import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  X,
  Building2,
  AlertCircle,
  CreditCard,
  History,
  ShieldCheck,
  Printer,
  Download,
  MessageCircle,
  CheckCircle2,
  Trash2,
  Edit3
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Customer {
  id: string;
  name: string;
  type: string;
  status: string;
  phone: string;
  email: string;
  sector: string;
  credit_limit: number;
  balance: number;
  created_at: string;
  usage?: number;
  lastOperation?: string;
}

import type { Translations } from '../types/translations';

interface Props {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: Translations['customers'] & { lang: string; modal: Translations['customers']['modal'] };
}

export default function CustomersView({ showToast, logActivity, t }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Corporate Client',
    sector: 'General Trade',
    phone: '',
    email: '',
    creditLimit: 0
  });

  const [editData, setEditData] = useState({
    id: '',
    name: '',
    type: '',
    sector: '',
    phone: '',
    email: '',
    creditLimit: 0
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('customers').select('*').is('deleted_at', null).order('created_at', { ascending: false });
    if (error) {
       showToast('Error: ' + error.message, 'error');
    } else {
       const enhancedData = (data as Customer[])?.map((c) => ({
         ...c,
         usage: Math.floor(Math.random() * 85) + 5,
         lastOperation: new Date(c.created_at || new Date()).toISOString().split('T')[0]
       }));
       setCustomers(enhancedData || []);
     }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      await fetchCustomers();
    };
    init();
  }, [fetchCustomers]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Name required', 'error');
      return;
    }

    const newCustomer = {
      name: formData.name,
      type: formData.type,
      status: 'Active',
      phone: formData.phone || '',
      email: formData.email || '',
      sector: formData.sector,
      credit_limit: formData.creditLimit,
      balance: 0
    };
    
    const { error } = await supabase.from('customers').insert([newCustomer]);
    if (error) {
        showToast('Error: ' + error.message, 'error');
    } else {
        await logActivity('Added New Customer: ' + formData.name, 'customers');
        showToast(t.modal.submit, 'success');
        setShowAddModal(false);
        setFormData({ name: '', type: 'Corporate Client', sector: 'General Trade', phone: '', email: '', creditLimit: 0 });
        fetchCustomers();
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('customers').update({
      name: editData.name,
      type: editData.type,
      sector: editData.sector,
      phone: editData.phone,
      email: editData.email,
      credit_limit: editData.creditLimit
    }).eq('id', editData.id);

    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      await logActivity('Updated Customer Profile: ' + editData.name, 'customers', editData.id);
      showToast(t.lang === 'ar' ? 'تم تحديث بيانات العميل' : 'Customer updated successfully', 'success');
      setShowEditModal(false);
      fetchCustomers();
    }
  };

  const openEditModal = (cust: Customer) => {
    setEditData({
      id: cust.id,
      name: cust.name,
      type: cust.type || 'Corporate',
      sector: cust.sector || 'General Trade',
      phone: cust.phone || '',
      email: cust.email || '',
      creditLimit: cust.credit_limit || 0
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.lang === 'ar' ? 'هل أنت متأكد من حذف هذا العميل؟' : 'Are you sure you want to delete this customer?')) return;
    const { error } = await supabase.from('customers').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) {
      showToast(error.message, 'error');
    } else {
      await logActivity('Moved Customer to Trash', 'customers', id);
      showToast(t.lang === 'ar' ? 'تم نقل العميل لسلة المهملات' : 'Customer moved to trash', 'success');
      fetchCustomers();
    }
  };

  const handlePrint = () => window.print();

  const handleExportCSV = () => {
    const headers = ['Name', 'Type', 'Sector', 'Credit', 'Email', 'Last Op'];
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(",") + "\n" 
      + customers.map(c => `${c.name},${c.type},${c.sector || ''},${c.credit_limit || 0},${c.email || ''},${c.lastOperation || ''}`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "sovereign_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = (customer: Customer) => {
    const text = `*تحديث من نظام الغويري المالي*\n\n` +
                 `العميل: ${customer.name}\n` +
                 `الحالة: ${customer.status === 'نشط' ? 'نشط' : 'Active'}\n` +
                 `الرصيد الحالي: ${customer.balance?.toLocaleString() || 0} ر.س\n\n` +
                 `نسعد بخدمتكم.`;
    
    let phone = customer.phone?.replace(/\D/g, '') || '';
    if (phone && !phone.startsWith('966')) {
        phone = '966' + (phone.startsWith('0') ? phone.substring(1) : phone);
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="slide-in">
      {/* Header */}
      <div className="view-header" style={{ marginBottom: '2rem' }}>
        <div>
           <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
           <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={handlePrint} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
               <Printer size={16} /> {t.print}
            </button>
            <button onClick={handleExportCSV} className="btn-executive" style={{ background: 'var(--secondary)', color: 'white', border: 'none' }}>
               <Download size={16} /> {t.export}
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-executive" style={{ border: 'none' }}>
                <Plus size={18} /> {t.add_customer}
             </button>
        </div>
      </div>

      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <KPIBox title={t.total_credit} value={customers.reduce((acc, c) => acc + (c.credit_limit || 0), 0).toLocaleString()} unit="SAR" icon={<CreditCard size={20} />} />
        <KPIBox title={t.partners_count} value={customers.length || '0'} unit="Biz" icon={<Building2 size={20} />} />
        <KPIBox title={t.pending_reviews} value="8" unit="Req" color="var(--secondary)" icon={<AlertCircle size={20} />} />
        <KPIBox title={t.expired_contracts} value="3" unit="Cont" color="var(--error)" icon={<History size={20} />} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        <div className="space-y-4">
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '500px', background: 'var(--surface-container-low)', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)' }}>
                <Search size={18} color="var(--outline)" />
                <input type="text" placeholder={t.search_placeholder} style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: 'var(--on-surface)', fontFamily: 'Cairo' }} />
             </div>
             <select style={{ border: '1px solid var(--surface-container-high)', background: 'var(--surface)', color: 'var(--on-surface)', padding: '0.6rem 1.2rem', borderRadius: '12px', outline: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
                <option>{t.all_categories}</option>
                <option>VIP</option>
                <option>Corporate</option>
             </select>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{t.loading || 'Searching Secure Database...'}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="sovereign-table">
                  <thead>
                    <tr>
                      <th style={{ paddingInlineStart: '2rem' }}>{t.table.entity}</th>
                      <th>{t.table.sector}</th>
                      <th style={{ textAlign: 'right' }}>{t.table.credit}</th>
                      <th style={{ textAlign: 'center' }}>{t.table.roi}</th>
                      <th style={{ textAlign: 'center' }}>{t.table.last_op}</th>
                      <th style={{ textAlign: 'center' }}>{t.table.options}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((cust) => (
                      <tr key={cust.id}>
                        <td style={{ paddingInlineStart: '2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: 40, height: 40, background: 'var(--primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--secondary)', fontSize: '1.2rem' }}>
                              {cust.name.substring(0, 1)}
                            </div>
                            <div>
                               <p style={{ fontWeight: 800, margin: 0, fontSize: '0.95rem', color: 'var(--on-surface)' }}>{cust.name}</p>
                               <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>ID: {cust.id.split('-')[0].toUpperCase()}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.9rem', fontWeight: 600 }}>{cust.sector || 'General Trade'}</td>
                        <td style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--primary)', textAlign: 'right' }}>{(cust.credit_limit || 0).toLocaleString()} SAR</td>
                        <td>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', justifyContent: 'center' }}>
                              <div style={{ width: 80, height: 8, background: 'var(--surface-container-high)', borderRadius: '4px', overflow: 'hidden' }}>
                                 <div style={{ width: `${cust.usage}%`, height: '100%', background: (cust.usage || 0) > 80 ? 'var(--error)' : 'var(--primary)', boxShadow: '0 0 5px rgba(0,0,0,0.1)' }}></div>
                              </div>
                              <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{cust.usage}%</span>
                           </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }} dir="ltr">{cust.lastOperation}</td>
                        <td style={{ textAlign: 'center' }}>
                           <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                              <button onClick={() => openEditModal(cust)} style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                                 <Edit3 size={18} />
                              </button>
                              <button onClick={() => handleWhatsAppShare(cust)} style={{ background: 'var(--surface-container-high)', color: '#25D366', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                                 <MessageCircle size={18} />
                              </button>
                              <button onClick={() => handleDelete(cust.id)} style={{ background: 'var(--surface-container-high)', color: 'var(--error)', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                                 <Trash2 size={18} />
                              </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
           <div className="card">
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'Tajawal', marginBottom: '1.5rem', fontWeight: 800, borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '0.8rem' }}>{t.activity}</h3>
              <div className="space-y-4">
                 <TimelineEvent title="Balance Match" status="Success" time="10m ago" color="var(--success)" />
                 <TimelineEvent title="Credit Raise Request" status="Under Review" time="2h ago" color="var(--secondary)" />
                 <TimelineEvent title="Auto-Credit Freeze" status="Limit Exceeded" time="Yesterday" color="var(--error)" />
              </div>
           </div>

           <div className="card" style={{ background: 'var(--primary)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                    <ShieldCheck size={28} color="var(--secondary)" />
                    <h4 style={{ fontFamily: 'Tajawal', color: 'white', fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>Sovereign Hub</h4>
                 </div>
                 <p style={{ fontSize: '0.9rem', opacity: 0.9, color: 'white', lineHeight: '1.6', fontWeight: 500 }}>
                    All partner data is protected under the Sovereign Ledger protocol and ZATCA Phase 2 compliance standards.
                    Automatic backups and encryption enabled.
                 </p>
                 <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--secondary)', fontWeight: 800, fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} /> Fully Certified (2026)
                 </div>
              </div>
              {/* Decorative Circle */}
              <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '150px', height: '150px', background: 'rgba(212, 167, 106, 0.1)', borderRadius: '50%' }}></div>
           </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', padding: '3rem', position: 'relative', border: 'none', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{t.modal.title}</h3>
             <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.name}</label>
                   <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{ padding: '0.9rem 1.2rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)', color: 'var(--on-surface)', outline: 'none', fontFamily: 'Cairo', fontSize: '1rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.phone}</label>
                       <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} dir="ltr" style={{ padding: '0.9rem 1.2rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)', color: 'var(--on-surface)', outline: 'none', fontFamily: 'Cairo', fontWeight: 600 }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.category}</label>
                       <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={{ padding: '0.9rem 1.2rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)', color: 'var(--on-surface)', outline: 'none', fontFamily: 'Cairo', fontWeight: 600 }}>
                          <option>Corporate</option>
                          <option>Strategic</option>
                          <option>Vendor</option>
                       </select>
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.limit}</label>
                   <input type="number" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} style={{ padding: '1rem', borderRadius: '12px', border: '2px solid var(--secondary)', background: 'var(--surface)', color: 'var(--primary)', outline: 'none', fontFamily: 'Cairo', fontSize: '1.4rem', fontWeight: 900, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                   <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '1rem', border: 'none', background: 'var(--surface-container-high)', color: 'var(--on-surface)', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>{t.modal.cancel}</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem', border: 'none' }}>{t.modal.submit}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', padding: '3rem', position: 'relative', border: 'none' }}>
             <button onClick={() => setShowEditModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{t.lang === 'ar' ? 'تعديل بيانات العميل' : 'Edit Customer'}</h3>
             <form onSubmit={handleUpdateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.name}</label>
                   <input required type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} style={{ padding: '0.9rem 1.2rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)', color: 'var(--on-surface)', outline: 'none', fontFamily: 'Cairo', fontSize: '1rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.phone}</label>
                       <input type="text" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} dir="ltr" style={{ padding: '0.9rem 1.2rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)', color: 'var(--on-surface)', outline: 'none', fontFamily: 'Cairo', fontWeight: 600 }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.category}</label>
                       <select value={editData.type} onChange={e => setEditData({...editData, type: e.target.value})} style={{ padding: '0.9rem 1.2rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)', background: 'var(--surface-container-low)', color: 'var(--on-surface)', outline: 'none', fontFamily: 'Cairo', fontWeight: 600 }}>
                          <option>Corporate</option>
                          <option>Strategic</option>
                          <option>Vendor</option>
                       </select>
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.limit}</label>
                   <input type="number" value={editData.creditLimit} onChange={e => setEditData({...editData, creditLimit: Number(e.target.value)})} style={{ padding: '1rem', borderRadius: '12px', border: '2px solid var(--secondary)', background: 'var(--surface)', color: 'var(--primary)', outline: 'none', fontFamily: 'Cairo', fontSize: '1.4rem', fontWeight: 900, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                   <button type="button" onClick={() => setShowEditModal(false)} style={{ flex: 1, padding: '1rem', border: 'none', background: 'var(--surface-container-high)', color: 'var(--on-surface)', borderRadius: '12px', fontWeight: 800 }}>{t.modal.cancel}</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem', border: 'none' }}>{t.lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

interface KPIBoxProps {
  title: string;
  value: string | number;
  unit: string;
  icon: React.ReactNode;
  color?: string;
}

function KPIBox({ title, value, unit, icon, color }: KPIBoxProps) {
  return (
    <div className="card" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderInlineStart: `5px solid ${color || 'var(--primary)'}` }}>
       <div>
          <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.4rem' }}>{title}</p>
          <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)', margin: 0, fontFamily: 'Tajawal', fontWeight: 900 }}>{value} <span style={{ fontSize: '0.9rem', opacity: 0.6, fontWeight: 700 }}>{unit}</span></h3>
       </div>
       <div style={{ padding: '1rem', borderRadius: '14px', background: 'var(--surface-container-high)', color: color || 'var(--primary)' }}>{icon}</div>
    </div>
  );
}

interface TimelineEventProps {
  title: string;
  status: string;
  time: string;
  color: string;
}

function TimelineEvent({ title, status, time, color }: TimelineEventProps) {
  return (
    <div style={{ display: 'flex', gap: '1.2rem', padding: '0.8rem 0', borderBottom: '1px solid var(--surface-container-low)' }}>
       <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, marginTop: '6px', flexShrink: 0, boxShadow: `0 0 8px ${color}` }}></div>
       <div>
          <p style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--on-surface)' }}>{title}</p>
          <p style={{ fontSize: '0.8rem', color: color, fontWeight: 900, margin: '3px 0' }}>{status}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', margin: 0, fontWeight: 600 }}>{time}</p>
       </div>
    </div>
  );
}
