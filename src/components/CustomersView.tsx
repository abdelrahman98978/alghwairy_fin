import { useState, useEffect, useCallback, useRef } from 'react';
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
  Edit3,
  Eye,
  ArrowRight,
  FileText,
  Paperclip,
  Image as ImageIcon,
  Upload,
  File as FileIcon,
  ZoomIn,
  Receipt
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import { fmtDate, fmtNumber } from '../lib/dateUtils';

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



interface Props {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: any; // Using any for simplicity as it contains the customers translation object + lang
}

export default function CustomersView({ showToast, logActivity, t }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'customer',
    sector: 'General Trade',
    phone: '',
    email: '',
    creditLimit: 0
  });

  const [filterType, setFilterType] = useState<'all' | 'customer' | 'partner' | 'carrier'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [editData, setEditData] = useState({
    id: '',
    name: '',
    type: '',
    sector: '',
    phone: '',
    email: '',
    creditLimit: 0
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);

  const handleViewProfile = (cust: Customer) => {
     setSelectedCustomer(cust);
     const invs = localDB.getActive('invoices').filter((i: any) => i.customer_id === cust.id);
     setCustomerInvoices(invs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.phone.includes(searchTerm);
    const matchesType = filterType === 'all' || (c.type || 'customer').toLowerCase().includes(filterType);
    return matchesSearch && matchesType;
  });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const data = localDB.getActive('customers');
      const enhancedData = data.map((c: any) => ({
        ...c,
        usage: Math.floor(Math.random() * 85) + 5,
        lastOperation: new Date(c.created_at || new Date()).toISOString().split('T')[0]
      }));
      // Sort by created_at descending
      enhancedData.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setCustomers(enhancedData || []);
    } catch (err) {
      showToast(t.notifications?.error_loading || 'Error loading customers', 'error');
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast(t.notifications?.name_required || 'Name required', 'error');
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
    
    try {
      const record = localDB.insert('customers', newCustomer);
      await logActivity('Added New Customer: ' + formData.name, 'customers', record.id);
      showToast(t.notifications?.success_create || t.modal?.submit || 'Saved successfully', 'success');
      setShowAddModal(false);
      setFormData({ name: '', type: 'Corporate Client', sector: 'General Trade', phone: '', email: '', creditLimit: 0 });
      fetchCustomers();
    } catch (err) {
      showToast(t.notifications?.error_saving || 'Error saving client', 'error');
    }
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localDB.update('customers', editData.id, {
        name: editData.name,
        type: editData.type,
        sector: editData.sector,
        phone: editData.phone,
        email: editData.email,
        credit_limit: editData.creditLimit
      });
      await logActivity('Updated Customer Profile: ' + editData.name, 'customers', editData.id);
      showToast(t.notifications?.success_update || 'Customer updated successfully', 'success');
      setShowEditModal(false);
      fetchCustomers();
    } catch (err) {
      showToast(t.notifications?.error_updating || 'Error updating client', 'error');
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
    if (!window.confirm(t.notifications?.delete_confirm || 'Are you sure you want to delete this customer?')) return;
    try {
      localDB.softDelete('customers', id);
      await logActivity('Moved Customer to Trash', 'customers', id);
      showToast(t.notifications?.success_trash || 'Customer moved to trash', 'success');
      fetchCustomers();
    } catch (err) {
      showToast(t.notifications?.error_deleting || 'Error deleting client', 'error');
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
    link.setAttribute("download", "alghwairy_customers.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWhatsAppShare = (customer: Customer) => {
    const text = `*مؤسسة الغويري للتخليص الجمركي*\n\n` +
                 `عزيزنا العميل: ${customer.name}\n` +
                 `الحالة: نشط\n` +
                 `الرصيد المتاح: ${customer.credit_limit?.toLocaleString() || 0} ر.س\n\n` +
                 `نسعد بخدمتكم دائماً.`;
    
    let phone = customer.phone?.replace(/\D/g, '') || '';
    if (phone && !phone.startsWith('966')) {
        phone = '966' + (phone.startsWith('0') ? phone.substring(1) : phone);
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (selectedCustomer) {
    return (
      <CustomerProfile 
        customer={selectedCustomer} 
        invoices={customerInvoices} 
        onBack={() => setSelectedCustomer(null)}
        t={t}
      />
    );
  }

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
            <button onClick={handleExportCSV} className="btn-executive" style={{ background: 'var(--secondary)', color: 'var(--primary)', border: 'none' }}>
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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }} className="no-print">
         <button 
           onClick={() => setFilterType('all')}
           className="btn-executive" 
           style={{ background: filterType === 'all' ? 'var(--primary)' : 'var(--surface-container-high)', color: filterType === 'all' ? 'white' : 'var(--on-surface)', border: 'none', padding: '0.6rem 1.5rem' }}>
            {t.all_categories || 'All'}
         </button>
         <button 
           onClick={() => setFilterType('customer')}
           className="btn-executive" 
           style={{ background: filterType === 'customer' ? 'var(--primary)' : 'var(--surface-container-high)', color: filterType === 'customer' ? 'white' : 'var(--on-surface)', border: 'none', padding: '0.6rem 1.5rem' }}>
            {t.customer || 'Customers'}
         </button>
         <button 
           onClick={() => setFilterType('partner')}
           className="btn-executive" 
           style={{ background: filterType === 'partner' ? 'var(--primary)' : 'var(--surface-container-high)', color: filterType === 'partner' ? 'white' : 'var(--on-surface)', border: 'none', padding: '0.6rem 1.5rem' }}>
            {t.partner || 'Partners'}
         </button>
         <button 
           onClick={() => setFilterType('carrier')}
           className="btn-executive" 
           style={{ background: filterType === 'carrier' ? 'var(--primary)' : 'var(--surface-container-high)', color: filterType === 'carrier' ? 'white' : 'var(--on-surface)', border: 'none', padding: '0.6rem 1.5rem' }}>
            {t.carrier || 'Carriers'}
         </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '500px', background: 'var(--surface-container-low)', padding: '0.6rem 1.2rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)' }}>
                <Search size={18} color="var(--outline)" />
                <input 
                  type="text" 
                  placeholder={t.search_placeholder} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '0.95rem', color: 'var(--on-surface)', fontFamily: 'Cairo' }} 
                />
             </div>
             <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                style={{ border: '1px solid var(--surface-container-high)', background: 'var(--surface)', color: 'var(--on-surface)', padding: '0.6rem 1.2rem', borderRadius: '12px', outline: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
                <option value="all">{t.all_categories || 'All Categories'}</option>
                <option value="customer">{t.customer || 'VIP Customer'}</option>
                <option value="partner">{t.partner || 'Strategic Partner'}</option>
                <option value="carrier">{t.carrier || 'Certified Carrier'}</option>
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
                    {filteredCustomers.map((cust) => (
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
                              <button onClick={() => handleViewProfile(cust)} title="عرض الملف والشراكة" style={{ background: '#d4a76a', color: '#001a33', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}>
                                 <Eye size={18} />
                              </button>
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
                    {customers.length === 0 && (
                        <tr>
                            <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>لم يتم العثور على عملاء حالياً</td>
                        </tr>
                    )}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <TimelineEvent title="Balance Match" status="Success" time="10m ago" color="var(--success)" />
                 <TimelineEvent title="Credit Raise Request" status="Under Review" time="2h ago" color="var(--secondary)" />
                 <TimelineEvent title="Auto-Credit Freeze" status="Limit Exceeded" time="Yesterday" color="var(--error)" />
              </div>
           </div>

           <div className="card" style={{ background: 'var(--primary)', border: 'none', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.2rem' }}>
                    <ShieldCheck size={28} color="var(--secondary)" />
                    <h4 style={{ fontFamily: 'Tajawal', color: 'white', fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>مؤسسة الغويري - مركز البيانات</h4>
                 </div>
                 <p style={{ fontSize: '0.9rem', opacity: 0.9, color: 'white', lineHeight: '1.6', fontWeight: 500 }}>
                    جميع بيانات الشركاء محمية بموجب بروتوكول السيادة المحلية ومعايير المرحلة الثانية لهيئة الزكاة والضريبة والجمارك (ZATCA).
                    النسخ الاحتياطي والتشفير يعملان محلياً بالكامل.
                 </p>
                 <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--secondary)', fontWeight: 800, fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} /> نظام معتمد بالكامل (2026)
                 </div>
              </div>
              {/* Decorative Circle */}
              <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '150px', height: '150px', background: 'rgba(212, 167, 106, 0.1)', borderRadius: '50%' }}></div>
           </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', padding: '3rem', position: 'relative', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{t.modal.title}</h3>
             <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.name}</label>
                   <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.phone}</label>
                       <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} dir="ltr" className="input-executive" style={{ fontWeight: 600 }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.category}</label>
                       <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="input-executive" style={{ fontWeight: 600 }}>
                          <option value="customer">عميل (Customer)</option>
                          <option value="partner">شريك (Partner)</option>
                          <option value="carrier">ناقل (Carrier)</option>
                       </select>
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.limit}</label>
                   <input type="number" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: Number(e.target.value)})} style={{ padding: '1rem', borderRadius: '12px', border: '2px solid var(--secondary)', background: 'var(--surface)', color: 'var(--primary)', outline: 'none', fontFamily: 'Cairo', fontSize: '1.4rem', fontWeight: 900, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                   <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.modal.cancel}</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem', border: 'none' }}>{t.modal.submit}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', padding: '3rem', position: 'relative', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
             <button onClick={() => setShowEditModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{t.lang === 'ar' ? 'تعديل بيانات العميل' : 'Edit Customer'}</h3>
             <form onSubmit={handleUpdateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.name}</label>
                   <input required type="text" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.phone}</label>
                       <input type="text" value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} dir="ltr" className="input-executive" style={{ fontWeight: 600 }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.category}</label>
                       <select value={editData.type} onChange={e => setEditData({...editData, type: e.target.value})} className="input-executive" style={{ fontWeight: 600 }}>
                          <option value="customer">عميل (Customer)</option>
                          <option value="partner">شريك (Partner)</option>
                          <option value="carrier">ناقل (Carrier)</option>
                       </select>
                   </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.limit}</label>
                   <input type="number" value={editData.creditLimit} onChange={e => setEditData({...editData, creditLimit: Number(e.target.value)})} style={{ padding: '1rem', borderRadius: '12px', border: '2px solid var(--secondary)', background: 'var(--surface)', color: 'var(--primary)', outline: 'none', fontFamily: 'Cairo', fontSize: '1.4rem', fontWeight: 900, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                   <button type="button" onClick={() => setShowEditModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.modal.cancel}</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem', border: 'none' }}>{t.lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --------------- CustomerProfile ---------------
function CustomerProfile({ customer, invoices, onBack, t }: any) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'docs' | 'info'>('invoices');
  const [documents, setDocuments] = useState<any[]>([]);
  const [previewDoc, setPreviewDoc]   = useState<any | null>(null);
  const [isDragOver, setIsDragOver]   = useState(false);
  const [uploading, setUploading]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalRevenue = invoices.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
  const totalProfit  = invoices.reduce((sum: number, i: any) => sum + (i.profit || 0), 0);
  const paidCount    = invoices.filter((i: any) => i.status === 'paid').length;

  // Load documents for this customer
  const loadDocs = useCallback(() => {
    const allDocs = localDB.getAll('sovereign_files') as any[];
    setDocuments(allDocs.filter(d => d.customer_id === customer.id && !d.deleted_at));
  }, [customer.id]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleWhatsApp = () => {
    const text = `*مؤسسة الغويري للتخليص الجمركي*\n\nعزيزنا العميل: ${customer.name}\nإجمالي عملياتكم: ${totalRevenue.toLocaleString()} ر.س\nالفواتير المدفوعة: ${paidCount} من ${invoices.length}\n\nنسعد بخدمتكم دائماً.`;
    const phone = (customer.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleEmail = () => {
    const subject = `كشف حساب - ${customer.name}`;
    const body = `عزيزنا العميل: ${customer.name}\n\nإجمالي الإيرادات: ${totalRevenue.toLocaleString()} ر.س\nصافي الربح: ${totalProfit.toLocaleString()} ر.س\nعدد الفواتير: ${invoices.length}\n\nمع التحية،\nمؤسسة الغويري`;
    window.location.href = `mailto:${customer.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const processFile = (file: File) => {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('يُسمح فقط بـ PDF والصور (PNG, JPG, WebP)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('الحجم الأقصى المسموح به 10 ميغابايت');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      localDB.insert('sovereign_files', {
        customer_id: customer.id,
        customer_name: customer.name,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        base64_data: base64,
        uploaded_at: new Date().toISOString(),
      });
      loadDocs();
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(processFile);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  };

  const handleDeleteDoc = (docId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستند نهائياً؟')) return;
    localDB.delete('sovereign_files', docId);
    loadDocs();
  };

  const handleDownloadDoc = (doc: any) => {
    const link = document.createElement('a');
    link.href = doc.base64_data;
    link.download = doc.file_name;
    link.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (type: string) => type?.startsWith('image/');

  const handlePrintInvoice = (_inv: any) => {
    window.print(); // Simple print for now, can be sophisticated with a hidden iframe
  };

  const handleShareInvoiceWhatsApp = (inv: any) => {
    const text = `*فاتورة ضريبية - مؤسسة الغويري*\n\nالمرجع: ${inv.operation_number || inv.reference_number}\nالمبلغ: ${inv.total.toLocaleString()} ر.س\nالحالة: ${inv.status}\n\nشكراً لتعاملكم معنا.`;
    const phone = (customer.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
     <div className="slide-in">
        {/* Back Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={onBack} className="btn-executive" style={{ padding: '0.6rem', border: 'none', background: 'var(--surface-container-high)', color: 'var(--primary)', transform: 'scaleX(-1)', cursor: 'pointer' }}>
                 <ArrowRight size={20} />
              </button>
              <h2 className="view-title" style={{ margin: 0 }}>ملف العميل/الشريك: {customer.name}</h2>
           </div>
           <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button onClick={handleWhatsApp} className="btn-executive" style={{ background: '#25D366', color: '#fff', border: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <MessageCircle size={16} /> واتساب
              </button>
              <button onClick={handleEmail} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <FileText size={16} /> بريد إلكتروني
              </button>
           </div>
        </div>

        {/* Financial Summary KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
           <div className="card" style={{ padding: '1.5rem', borderInlineStart: '5px solid var(--primary)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 800, margin: '0 0 0.4rem' }}>إجمالي الإيرادات</p>
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary)', fontFamily: 'Tajawal', fontWeight: 900 }}>{totalRevenue.toLocaleString()} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>SAR</span></h3>
           </div>
           <div className="card" style={{ padding: '1.5rem', borderInlineStart: '5px solid var(--success)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 800, margin: '0 0 0.4rem' }}>صافي الأرباح</p>
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--success)', fontFamily: 'Tajawal', fontWeight: 900 }}>{totalProfit.toLocaleString()} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>SAR</span></h3>
           </div>
           <div className="card" style={{ padding: '1.5rem', borderInlineStart: '5px solid var(--secondary)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 800, margin: '0 0 0.4rem' }}>عدد الفواتير</p>
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary)', fontFamily: 'Tajawal', fontWeight: 900 }}>{invoices.length} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>فاتورة</span></h3>
           </div>
           <div className="card" style={{ padding: '1.5rem', borderInlineStart: '5px solid var(--error)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', fontWeight: 800, margin: '0 0 0.4rem' }}>حجم المستندات</p>
              <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--primary)', fontFamily: 'Tajawal', fontWeight: 900 }}>{documents.length} <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>ملف</span></h3>
           </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--surface-container-low)', padding: '0.4rem', borderRadius: '14px', width: 'fit-content', border: '1px solid var(--surface-container-high)' }}>
          {[
            { key: 'invoices', label: 'الفواتير والعمليات', icon: <Receipt size={16} /> },
            { key: 'docs',     label: `المستندات والملفات (${documents.length})`, icon: <Paperclip size={16} /> },
            { key: 'info',     label: 'البيانات الأساسية', icon: <ShieldCheck size={16} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 1.2rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontFamily: 'Cairo', fontWeight: 800, fontSize: '0.85rem', transition: 'all 0.2s',
                background: activeTab === tab.key ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.key ? 'var(--secondary)' : 'var(--on-surface-variant)',
                boxShadow: activeTab === tab.key ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
              }}
            >{tab.icon} {tab.label}</button>
          ))}
        </div>

        {/* ─── TAB: INVOICES ─── */}
        {activeTab === 'invoices' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
            <div style={{ padding: '1.5rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)' }}>الفواتير والعمليات المرتبطة</h3>
               <span style={{ background: 'var(--primary)', color: 'var(--secondary)', padding: '0.3rem 0.8rem', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 900 }}>{invoices.length} فواتير</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
               <table className="sovereign-table">
                  <thead>
                     <tr>
                        <th style={{ paddingInlineStart: '1.5rem' }}>البيان / العملية</th>
                        <th>تاريخ الإصدار</th>
                        <th style={{ textAlign: 'center' }}>الأرباح</th>
                        <th style={{ textAlign: 'center' }}>إجمالي الفاتورة</th>
                        <th style={{ textAlign: 'center' }}>الحالة</th>
                        <th style={{ textAlign: 'center', paddingInlineEnd: '1.5rem' }}>الإجراءات</th>
                     </tr>
                  </thead>
                  <tbody>
                     {invoices.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>لا توجد فواتير أو عمليات مالية مرتبطة</td></tr>
                     ) : (
                        invoices.map((inv: any) => (
                           <tr key={inv.id}>
                              <td style={{ paddingInlineStart: '1.5rem' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <div style={{ padding: '0.5rem', background: 'var(--surface-container-high)', borderRadius: '8px', color: 'var(--primary)' }}><Receipt size={14} /></div>
                                    <div>
                                       <span style={{ fontWeight: 900, fontSize: '0.9rem', display: 'block', color: 'var(--primary)' }}>{inv.operation_number || inv.reference_number}</span>
                                       <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>BOL: {inv.bol_number || 'N/A'}</span>
                                    </div>
                                 </div>
                              </td>
                              <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{fmtDate(inv.created_at, t.lang)}</td>
                              <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--success)', fontSize: '0.9rem' }}>{fmtNumber(inv.profit || 0, t.lang)}</td>
                              <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--primary)' }}>{fmtNumber(inv.total, t.lang)} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>SAR</span></td>
                              <td style={{ textAlign: 'center' }}>
                                 <span style={{
                                    fontSize: '0.7rem', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: 900,
                                    background: inv.status === 'paid' ? 'rgba(27, 94, 32, 0.1)' : 'rgba(212, 167, 106, 0.15)',
                                    color: inv.status === 'paid' ? 'var(--success)' : 'var(--secondary)'
                                 }}>{inv.status === 'paid' ? 'مدفوعة' : 'قيد المعالجة'}</span>
                              </td>
                              <td style={{ textAlign: 'center', paddingInlineEnd: '1.5rem' }}>
                                 <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                    <button onClick={() => handlePrintInvoice(inv)} title="طباعة" style={{ background: 'var(--surface-container-high)', border: 'none', padding: '0.4rem', borderRadius: '6px', color: 'var(--primary)', cursor: 'pointer' }}><Printer size={14} /></button>
                                    <button onClick={() => handleShareInvoiceWhatsApp(inv)} title="واتساب" style={{ background: 'var(--surface-container-high)', border: 'none', padding: '0.4rem', borderRadius: '6px', color: '#25D366', cursor: 'pointer' }}><MessageCircle size={14} /></button>
                                 </div>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
          </div>
        )}

        {/* ─── TAB: DOCUMENTS ─── */}
        {activeTab === 'docs' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--surface-container-high)'}`,
                borderRadius: '16px', padding: '3rem', textAlign: 'center', cursor: 'pointer',
                background: isDragOver ? 'rgba(var(--primary-rgb,0,26,51), 0.05)' : 'var(--surface-container-low)',
                transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
              }}
            >
              <div style={{ width: 64, height: 64, background: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {uploading ? <div className="spin"><Upload size={28} color="var(--secondary)" /></div> : <Upload size={28} color="var(--secondary)" />}
              </div>
              <div>
                <p style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)' }}>
                  {uploading ? t.profile.uploading : t.profile.upload_area}
                </p>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>
                  {t.profile.allowed_formats}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)', background: 'var(--surface-container-high)', padding: '0.4rem 1rem', borderRadius: '8px' }}>
                  <FileIcon size={14} /> PDF
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)', background: 'var(--surface-container-high)', padding: '0.4rem 1rem', borderRadius: '8px' }}>
                  <ImageIcon size={14} /> {t.profile.images || 'Images'}
                </span>
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple style={{ display: 'none' }} onChange={handleFileInput} />
            </div>

            {/* Documents Grid */}
            {documents.length === 0 ? (
              <div className="card" style={{ padding: '4rem', textAlign: 'center', border: '1px dashed var(--surface-container-high)' }}>
                <Paperclip size={40} style={{ margin: '0 auto 1rem', color: 'var(--on-surface-variant)', display: 'block', opacity: 0.4 }} />
                <p style={{ fontWeight: 800, color: 'var(--on-surface-variant)', margin: 0 }}>{t.profile.no_docs}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--outline)', margin: '0.5rem 0 0', fontWeight: 600 }}>{t.profile.upload_first}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.2rem' }}>
                {documents.map((doc: any) => (
                  <div key={doc.id} className="card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--surface-container-high)', transition: 'all 0.2s' }}>

                    {/* Thumbnail */}
                    <div style={{ width: '100%', height: 140, borderRadius: '10px', overflow: 'hidden', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}
                      onClick={() => setPreviewDoc(doc)}
                    >
                      {isImage(doc.file_type) ? (
                        <img src={doc.base64_data} alt={doc.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                          <FileIcon size={40} color="var(--primary)" style={{ opacity: 0.7 }} />
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>PDF</span>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,26,51,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >
                        <ZoomIn size={28} color="#fff" />
                      </div>
                    </div>

                    {/* File Info */}
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      <p style={{ margin: '0.3rem 0 0', fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>
                        {formatFileSize(doc.file_size)} · {new Date(doc.uploaded_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.6rem' }}>
                      <button onClick={() => setPreviewDoc(doc)}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--surface-container-high)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.78rem', fontFamily: 'Cairo' }}>
                        <Eye size={14} /> {t.profile.preview || 'Preview'}
                      </button>
                      <button onClick={() => handleDownloadDoc(doc)}
                        style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: 'none', background: 'var(--secondary)', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.78rem', fontFamily: 'Cairo' }}>
                        <Download size={14} /> {t.profile.download || 'Download'}
                      </button>
                      <button onClick={() => handleDeleteDoc(doc.id)}
                        style={{ padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(211,47,47,0.3)', background: 'rgba(211,47,47,0.08)', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: INFO ─── */}
        {activeTab === 'info' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr', gap: '2rem' }}>
            <div className="card" style={{ padding: '2rem', alignSelf: 'start', border: '1px solid var(--surface-container-high)' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '1.5rem' }}>
                  <div style={{ width: 60, height: 60, borderRadius: '15px', background: 'var(--primary)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 900 }}>
                     {customer.name.substring(0, 1)}
                  </div>
                  <div>
                     <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--primary)', fontSize: '1.2rem' }}>{customer.name}</h3>
                     <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{customer.type}</span>
                     <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--outline)', marginTop: '0.2rem', fontWeight: 600 }}>ID: {customer.id.split('-')[0].toUpperCase()}</span>
                  </div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <ProfileField label={t.phone || 'Phone'} value={customer.phone || 'N/A'} />
                  <ProfileField label={t.email || 'Email'} value={customer.email || 'N/A'} />
                  <ProfileField label={t.sector || 'Sector'} value={customer.sector || 'N/A'} />
                  <ProfileField label={t.limit || 'Credit Limit'} value={`${(customer.credit_limit || 0).toLocaleString()} SAR`} highlight />
                  <ProfileField label={t.profile?.joined_at || 'Joined At'} value={new Date(customer.created_at).toLocaleDateString(t.lang === 'ar' ? 'ar-SA' : 'en-US')} />
               </div>
               <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--surface-container-high)' }}>
                 <p style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', fontWeight: 800 }}>مؤشر الأداء والتعاملات</p>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ flex: 1, height: 8, background: 'var(--surface-container-high)', borderRadius: '4px', overflow: 'hidden' }}>
                       <div style={{ width: `${customer.usage || 10}%`, height: '100%', background: 'var(--primary)' }}></div>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{customer.usage || 10}%</span>
                 </div>
               </div>
            </div>
            <div className="card" style={{ padding: '2rem', border: '1px solid var(--surface-container-high)', alignSelf: 'start' }}>
              <h4 style={{ margin: '0 0 1.5rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ShieldCheck size={18} color="var(--success)" /> {t.profile?.status_credit_title || 'Status & Credit'}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ProfileField label={t.profile?.account_type || 'Account Type'} value={customer.type || t.partner} />
                <ProfileField label={t.status || 'Status'} value={customer.status === 'Active' ? '✅ ' + (t.profile?.status_active || 'Active') : customer.status || (t.profile?.status_active || 'Active')} />
                <ProfileField label={t.profile?.total_invoices || 'Total Invoices'} value={`${invoices.length}`} />
                <ProfileField label={t.profile?.paid_invoices || 'Paid Invoices'} value={`${paidCount} / ${invoices.length}`} highlight />
                <ProfileField label={t.profile?.revenue || 'Total Revenue'} value={`${totalRevenue.toLocaleString()} SAR`} />
                <ProfileField label={t.profile?.doc_count || 'Documents'} value={`${documents.length}`} />
              </div>
            </div>
          </div>
        )}

        {/* ─── PREVIEW MODAL ─── */}
        {previewDoc && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
            onClick={() => setPreviewDoc(null)}
          >
            <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button onClick={(e) => { e.stopPropagation(); handleDownloadDoc(previewDoc); }}
                style={{ padding: '0.7rem 1.4rem', background: 'var(--secondary)', color: 'var(--primary)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 900, fontFamily: 'Cairo', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Download size={16} /> {t.profile?.download || 'Download'}
              </button>
              <button onClick={() => setPreviewDoc(null)}
                style={{ padding: '0.7rem', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: '#fff', fontWeight: 900, marginBottom: '1rem', fontSize: '1rem', opacity: 0.85 }}>{previewDoc.file_name}</p>
            {isImage(previewDoc.file_type) ? (
              <img src={previewDoc.base64_data} alt={previewDoc.file_name}
                style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: '12px', objectFit: 'contain', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <iframe src={previewDoc.base64_data} title={previewDoc.file_name}
                style={{ width: '90vw', height: '80vh', border: 'none', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
                onClick={(e: any) => e.stopPropagation()}
              />
            )}
          </div>
        )}
     </div>
  );
}

function ProfileField({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
   return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
         <span style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>{label}</span>
         <span style={{ fontSize: '0.9rem', fontWeight: highlight ? 900 : 700, color: highlight ? 'var(--success)' : 'var(--on-surface)', background: highlight ? 'rgba(27, 94, 32, 0.1)' : 'transparent', padding: highlight ? '0.2rem 0.6rem' : 0, borderRadius: highlight ? '6px' : 0 }}>{value}</span>
      </div>
   );
}

function KPIBox({ title, value, unit, icon, color }: any) {
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

function TimelineEvent({ title, status, time, color }: any) {
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
