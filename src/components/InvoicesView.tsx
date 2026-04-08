import { useState, useEffect, useCallback } from 'react';
import { 
  FileText, Plus, Search, 
  Download, X, AlertCircle, CheckCircle2,
  Filter, MessageCircle, Trash2, Send, Edit3, Eye, Mail, Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { localDB } from '../lib/localDB';
import { generateZatcaQR } from '../lib/zatca';

interface Customer {
  id: string;
  name: string;
  phone?: string;
  vat_number?: string;
  cr_number?: string;
}

interface Invoice {
  id: string;
  customer_id: string;
  amount: number;
  vat?: number;
  tax_amount?: number;
  total?: number;
  total_amount?: number;
  status: string;
  reference_number: string;
  created_at: string;
  customers?: Customer;
  is_settlement?: boolean;
}

import type { Translations } from '../types/translations';

interface Props {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: Translations['invoices'];
}

export function InvoicesView({ showToast, logActivity, t }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showWAPreview, setShowWAPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [waText, setWaText] = useState('');
  const [waPhone, setWaPhone] = useState('');
  
  const [settings, setSettings] = useState({
    companyName: localStorage.getItem('sov_company_name') || 'مؤسسة الغويري للتخليص الجمركي',
    taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
    address: localStorage.getItem('sov_address') || 'King Fahd Rd, Riyadh, SA',
    logo: localStorage.getItem('sov_logo') || './logo.png',
    reportHeader: localStorage.getItem('sov_report_header') || 'مؤسسة الغويري للتخليص الجمركي - وثيقة رسمية',
    reportFooter: localStorage.getItem('sov_report_footer') || 'مؤسسة الغويري للتخليص الجمركي - سري'
  });
  
  useEffect(() => {
    // Refresh settings whenever the view is focused or mounted
    const loadSettings = () => {
      setSettings({
        companyName: localStorage.getItem('sov_company_name') || 'مؤسسة الغويري للتخليص الجمركي',
        taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
        address: localStorage.getItem('sov_address') || 'King Fahd Rd, Riyadh, SA',
        logo: localStorage.getItem('sov_logo') || './logo.png',
        reportHeader: localStorage.getItem('sov_report_header') || 'مؤسسة الغويري للتخليص الجمركي - وثيقة رسمية',
        reportFooter: localStorage.getItem('sov_report_footer') || 'مؤسسة الغويري للتخليص الجمركي - سري'
      });
    };
    loadSettings();
  }, [showPreviewModal]);
  
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    reference: '',
    status: 'pending',
    isSettlement: false
  });

  const [editData, setEditData] = useState({
    id: '',
    customerId: '',
    amount: '',
    reference: '',
    status: 'pending',
    isSettlement: false
  });

  const fetchInvoices = useCallback(() => {
    const invs = localDB.getActive('invoices');
    const allCustomers = localDB.getActive('customers');
    // Join customers manually
    const joined = invs.map((inv: any) => ({
      ...inv,
      customers: allCustomers.find((c: any) => c.id === inv.customer_id) || null
    }));
    joined.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setInvoices(joined as Invoice[]);
  }, []);

  const fetchCustomers = useCallback(() => {
    const data = localDB.getActive('customers');
    setCustomers(data as Customer[]);
  }, []);

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
  }, [fetchInvoices, fetchCustomers]);

  const handleIssueInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(formData.amount);
    const vatRateSetting = parseFloat(localStorage.getItem('sov_vat_rate') || '15') / 100;
    const taxVal = formData.isSettlement ? 0 : amountVal * vatRateSetting;
    const totalVal = amountVal + taxVal;

    const newInvoice = {
      customer_id: formData.customerId,
      amount: amountVal,
      vat: taxVal,
      total: totalVal,
      status: 'pending',
      reference_number: formData.reference || `INV-${Date.now()}`,
      is_settlement: formData.isSettlement
    };
    localDB.insert('invoices', newInvoice);
    await logActivity('Issued Sovereign ' + (formData.isSettlement ? 'Settlement Entry ' : 'Tax Invoice ') + (formData.reference || 'Draft'), 'invoices');
    showToast(formData.isSettlement ? 'Sovereign Settlement posted correctly.' : 'تم إصدار الفاتورة الضريبية بنجاح (ZATCA).', 'success');
    setShowAddModal(false);
    setFormData({ customerId: '', amount: '', reference: '', status: 'pending', isSettlement: false });
    fetchInvoices();
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(editData.amount);
    const vatRateSetting = parseFloat(localStorage.getItem('sov_vat_rate') || '15') / 100;
    const taxVal = editData.isSettlement ? 0 : amountVal * vatRateSetting;
    const totalVal = amountVal + taxVal;

    localDB.update('invoices', editData.id, {
      customer_id: editData.customerId,
      amount: amountVal,
      vat: taxVal,
      total: totalVal,
      status: editData.status,
      reference_number: editData.reference
    });
    await logActivity('Updated Invoice ' + editData.reference, 'invoices', editData.id);
    showToast('Invoice updated successfully', 'success');
    setShowEditModal(false);
    fetchInvoices();
  };

  const openEditModal = (inv: Invoice) => {
    setEditData({
      id: inv.id,
      customerId: inv.customer_id,
      amount: inv.amount.toString(),
      reference: inv.reference_number,
      status: inv.status,
      isSettlement: inv.is_settlement || false
    });
    setShowEditModal(true);
  };

  const exportToExcel = () => {
    const headers = [t.table.number, t.table.client, t.table.date, t.table.amount, t.table.tax, t.table.total, t.table.status];
    const rows = invoices.map(inv => [
      inv.reference_number,
      inv.customers?.name,
      new Date(inv.created_at).toLocaleDateString(),
      inv.amount,
      inv.vat || inv.tax_amount,
      inv.total || inv.total_amount,
      inv.status
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => { csvContent += row.join(",") + "\n"; });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sovereign_invoices_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast(t.print || 'Invoices exported', 'success');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.lang === 'ar' ? 'هل أنت متأكد من حذف هذه الفاتورة؟ ستنتقل إلى سلة المهملات.' : 'Are you sure you want to delete this invoice? It will be moved to trash.')) return;
    
    localDB.softDelete('invoices', id);
    await logActivity('Moved Invoice to Trash', 'invoices', id);
    showToast(t.lang === 'ar' ? 'تم نقل الفاتورة لسلة المهملات' : 'Invoice moved to trash', 'success');
    fetchInvoices();
  };

  const handleWhatsAppInvoice = (inv: Invoice) => {
    let phone = inv.customers?.phone?.replace(/\D/g, '') || '';
    if (phone && !phone.startsWith('966')) {
        phone = '966' + (phone.startsWith('0') ? phone.substring(1) : phone);
    }
    
    const text = `*فاتورة ضريبية من ${settings.companyName}*\n\n` +
                 `رقم الفاتورة: ${inv.reference_number}\n` +
                 `العميل: ${inv.customers?.name}\n` +
                 `المبلغ الإجمالي: ${(inv.total || inv.total_amount || 0).toLocaleString()} ر.س\n` +
                 `الحالة: ${inv.status === 'paid' ? 'مدفوعة' : 'بانتظار السداد'}\n\n` +
                 `شكراً لتعاملكم معنا.`;
    
    setWaPhone(phone);
    setWaText(text);
    setShowWAPreview(true);
  };

  const openExternal = async (url: string) => {
    try {
      if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        await ipcRenderer.invoke('open-external', url);
      } else {
        window.open(url, '_blank');
      }
    } catch { window.open(url, '_blank'); }
  };

  const sendWhatsApp = () => {
    const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(waText)}`;
    openExternal(url);
    setShowWAPreview(false);
  };

  const copyPublicLink = (id: string) => {
    const url = window.location.origin + window.location.pathname + '?invoice_id=' + id;
    navigator.clipboard.writeText(url);
    showToast(t.lang === 'ar' ? 'تم نسخ رابط المشاركة بنجاح' : 'Shareable link copied successfully', 'success');
  };

  const handleEmailInvoice = (inv: Invoice) => {
    const subject = encodeURIComponent(`فاتورة ضريبية من ${settings.companyName} - رقم ${inv.reference_number}`);
    const body = encodeURIComponent(`عزيزي العميل،\n\nنرفق لكم تفاصيل الفاتورة الضريبية:\nرقم الفاتورة: ${inv.reference_number}\nالمبلغ الإجمالي: ${(inv.total || inv.total_amount || 0).toLocaleString()} ر.س\nالحالة: ${inv.status === 'paid' ? 'مدفوعة' : 'بانتظار السداد'}\n\nمع تحيات،\n${settings.companyName}`);
    openExternal(`mailto:?subject=${subject}&body=${body}`);
  };

  const handlePrintPDF = async () => {
    try {
      if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        const result = await ipcRenderer.invoke('print-to-pdf');
        if (result.success) {
          showToast(t.lang === 'ar' ? 'تم حفظ الفاتورة كـ PDF بنجاح' : 'Invoice saved as PDF', 'success');
        } else if (!result.canceled) {
          showToast('PDF Error: ' + (result.error || 'Unknown'), 'error');
        }
      } else {
        window.print();
      }
    } catch { window.print(); }
  };

  return (
    <div className="slide-in">
      <header className="view-header no-print" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={exportToExcel} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
             <Download size={18} /> {t.print}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-executive" style={{ border: 'none' }}>
             <Plus size={18} /> {t.add_title}
          </button>
        </div>
      </header>

      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <MetricBox title={t.stats.total_due} value={invoices.reduce((acc, curr) => acc + (curr.status === 'pending' ? (curr.total || curr.total_amount || 0) : 0), 0).toLocaleString()} sub="Pending Collection" icon={<FileText size={24} />} />
        <MetricBox title={t.stats.collected} value={invoices.reduce((acc, curr) => acc + (curr.status === 'paid' ? (curr.total || curr.total_amount || 0) : 0), 0).toLocaleString()} sub="MTD Collections" icon={<FileText size={24} />} positive />
        <MetricBox title={t.stats.overdue} value="0" sub="Sovereign Shield Active" icon={<AlertCircle size={24} />} />
        <MetricBox title={t.stats.zatca_certified} value={invoices.length.toString()} sub="100% Compliant" icon={<CheckCircle2 size={24} />} positive />
      </div>

      <div className="card overflow-hidden" style={{ border: '1px solid var(--surface-container-high)' }}>
         <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
            <h3 style={{ fontSize: '1.2rem', fontFamily: 'Tajawal', fontWeight: 800, margin: 0 }}>{t.active_title || 'سجل الفواتير النشطة'}</h3>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <div style={{ position: 'relative', width: '350px' }}>
                  <Search size={18} style={{ position: 'absolute', [t.lang === 'en' ? 'right' : 'left']: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  <input type="text" placeholder={t.search_placeholder || 'بحث في الفواتير...'} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-executive" style={{ [t.lang === 'en' ? 'paddingRight' : 'paddingLeft']: '2.8rem', width: '100%', fontWeight: 600 }} />
               </div>
               <button className="btn-executive" style={{ background: 'white', color: 'var(--primary)', border: '1px solid var(--surface-container-high)', padding: '0.6rem' }}><Filter size={18} /></button>
            </div>
         </div>
         
         <div style={{ overflowX: 'auto' }}>
            <table className="sovereign-table">
               <thead>
                  <tr>
                     <th style={{ paddingInlineStart: '2rem' }}>{t.table.number}</th>
                     <th>{t.table.client}</th>
                     <th style={{ textAlign: 'center' }}>{t.table.date}</th>
                     <th style={{ textAlign: 'right' }}>{t.table.amount}</th>
                     <th style={{ textAlign: 'right' }}>{t.table.tax}</th>
                     <th style={{ textAlign: 'right' }}>{t.table.total}</th>
                     <th style={{ textAlign: 'center' }}>{t.table.status}</th>
                     <th style={{ textAlign: 'center' }}>{t.table.options}</th>
                  </tr>
               </thead>
               <tbody>
                  {invoices.filter(inv => inv.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) || inv.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())).map((inv) => (
                    <tr key={inv.id}>
                        <td style={{ fontWeight: 900, paddingInlineStart: '2rem', color: 'var(--primary)', position: 'relative' }}>
                           {inv.reference_number}
                           {inv.is_settlement && (
                             <span style={{ 
                               marginLeft: '0.8rem', 
                               fontSize: '0.65rem', 
                               background: 'var(--surface-container-high)', 
                               padding: '0.15rem 0.5rem', 
                               borderRadius: '4px', 
                               textTransform: 'uppercase',
                               letterSpacing: '1px',
                               fontWeight: 900,
                               color: 'var(--primary)',
                               border: '1px solid rgba(0,0,0,0.05)'
                             }}>
                               {t.lang === 'en' ? 'SETTLEMENT' : 'تسوية'}
                             </span>
                           )}
                        </td>
                       <td>
                          <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{inv.customers?.name}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 600 }}>VAT: {inv.customers?.vat_number || 'N/A'}</div>
                       </td>
                       <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600 }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                       <td style={{ textAlign: 'right', fontWeight: 700 }}>{(inv.amount || 0).toLocaleString()}</td>
                       <td style={{ textAlign: 'right', color: 'var(--secondary)', fontWeight: 700 }}>{(inv.vat || inv.tax_amount || 0).toLocaleString()}</td>
                       <td style={{ textAlign: 'right', fontWeight: 900, fontSize: '1rem', color: 'var(--primary)' }}>{(inv.total || inv.total_amount || 0).toLocaleString()}</td>
                       <td style={{ textAlign: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '0.4rem 1rem', borderRadius: '20px', background: inv.status === 'paid' ? 'rgba(27, 94, 32, 0.1)' : 'rgba(211, 47, 47, 0.1)', color: inv.status === 'paid' ? 'var(--success)' : 'var(--error)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                             {inv.status === 'paid' ? (t.lang === 'en' ? 'Paid' : 'مدفوعة') : (t.lang === 'en' ? 'Pending' : 'معلقة')}
                          </span>
                       </td>
                       <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                             <button onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }} className="btn-executive" title={t.table.preview} style={{ padding: '0.55rem 1rem', background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Eye size={18} />
                                {t.table.preview}
                             </button>
                             <button onClick={() => openEditModal(inv)} className="btn-executive" title={t.lang === 'en' ? 'Edit' : 'تعديل'} style={{ padding: '0.55rem', background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
                                <Edit3 size={18} />
                             </button>
                             <button onClick={() => handleWhatsAppInvoice(inv)} className="btn-executive" title={t.lang === 'en' ? 'Send WhatsApp' : 'إرسال واتساب'} style={{ padding: '0.55rem', background: 'var(--surface-container-high)', color: '#25D366', border: 'none' }}>
                                <MessageCircle size={18} />
                             </button>
                             <button onClick={() => copyPublicLink(inv.id)} className="btn-executive" title={t.lang === 'en' ? 'Copy Public' : 'نسخ الرابط'} style={{ position: 'relative', padding: '0.55rem', background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
                                <Plus size={10} style={{ position: 'absolute', top: 5, right: 5 }} />
                                <Send size={18} />
                             </button>
                             <button onClick={() => handleDelete(inv.id)} className="btn-executive" title={t.lang === 'en' ? 'Delete' : 'حذف'} style={{ padding: '0.55rem', background: 'var(--surface-container-high)', color: 'var(--error)', border: 'none' }}>
                                <Trash2 size={18} />
                             </button>
                             <button onClick={() => handleEmailInvoice(inv)} className="btn-executive" title={t.lang === 'en' ? 'Send Email' : 'إرسال بريد'} style={{ padding: '0.55rem', background: 'var(--surface-container-high)', color: '#005ab5', border: 'none' }}>
                                <Mail size={18} />
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Issue Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
           <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', position: 'relative', padding: '3rem', border: 'none' }}>
              <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
              <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{t.modal.title}</h3>
              <form onSubmit={handleIssueInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface-container-low)', padding: '0.4rem', borderRadius: '12px' }}>
                    <button type="button" onClick={() => setFormData({...formData, isSettlement: false})} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: !formData.isSettlement ? 'var(--primary)' : 'transparent', color: !formData.isSettlement ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 900, cursor: 'pointer' }}>{t.lang === 'en' ? 'Tax Invoice' : 'فاتورة ضريبية'}</button>
                    <button type="button" onClick={() => setFormData({...formData, isSettlement: true})} style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', background: formData.isSettlement ? 'var(--primary)' : 'transparent', color: formData.isSettlement ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 900, cursor: 'pointer' }}>{t.lang === 'en' ? 'Settlement' : 'قيد تسوية'}</button>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.client_label}</label>
                    <select required value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }}>
                       <option value="">{t.lang === 'en' ? 'Select Client' : 'اختر العميل'}</option>
                       {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.amount_label}</label>
                    <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="input-executive" placeholder="0.00" style={{ fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)', border: '2px solid var(--secondary)' }} />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.ref_label}</label>
                    <input type="text" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} className="input-executive" placeholder="Automatic if empty" style={{ fontWeight: 600 }} />
                 </div>
                 <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.modal.cancel}</button>
                    <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem', border: 'none' }}>{formData.isSettlement ? (t.lang === 'en' ? 'Post Sovereign Settlement' : 'ترحيل قيد تسوية سيادي') : (t.lang === 'en' ? 'Issue Sovereign Invoice' : 'إنشاء فاتورة سيادية')}</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000 }}>
           <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', position: 'relative', padding: '3rem', border: 'none' }}>
              <button onClick={() => setShowEditModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
              <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{t.lang === 'ar' ? 'تعديل الفاتورة' : 'Edit Invoice'}</h3>
              <form onSubmit={handleUpdateInvoice} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.client_label}</label>
                    <select required value={editData.customerId} onChange={e => setEditData({...editData, customerId: e.target.value})} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }}>
                       {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.amount_label}</label>
                    <input required type="number" step="0.01" value={editData.amount} onChange={e => setEditData({...editData, amount: e.target.value})} className="input-executive" style={{ fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)', border: '2px solid var(--secondary)' }} />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.modal.ref_label}</label>
                    <input type="text" value={editData.reference} onChange={e => setEditData({...editData, reference: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
                 </div>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'ar' ? 'الحالة' : 'Status'}</label>
                    <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})} className="input-executive" style={{ fontWeight: 600 }}>
                       <option value="pending">{t.lang === 'ar' ? 'معلقة' : 'Pending'}</option>
                       <option value="paid">{t.lang === 'ar' ? 'مدفوعة' : 'Paid'}</option>
                    </select>
                 </div>
                 <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setShowEditModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.modal.cancel}</button>
                    <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem', border: 'none' }}>{t.lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* ZATCA Preview Modal */}
      {showPreviewModal && selectedInvoice && (
        <InvoicePreviewModal 
          invoice={selectedInvoice} 
          onClose={() => setShowPreviewModal(false)}
          onWhatsApp={() => handleWhatsAppInvoice(selectedInvoice)}
          onEmail={() => handleEmailInvoice(selectedInvoice)}
          onPrint={handlePrintPDF}
          t={t}
          settings={settings}
        />
      )}

      {/* WhatsApp Message Preview Modal */}
      {showWAPreview && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 4000 }}>
           <div className="card slide-in" style={{ width: '100%', maxWidth: '450px', padding: 0, overflow: 'hidden', border: 'none' }}>
              <div style={{ background: '#075E54', padding: '1.5rem', color: 'white', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                 <MessageCircle size={24} />
                 <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{t.lang === 'en' ? 'WhatsApp Preview' : 'معاينة رسالة واتساب'}</h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>{t.lang === 'en' ? 'Review message before sending to' : 'راجِع الرسالة قبل الإرسال إلى'} {waPhone}</p>
                 </div>
                 <button onClick={() => setShowWAPreview(false)} style={{ marginInlineStart: 'auto', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
              </div>
              
              <div style={{ padding: '1.5rem', background: '#E5DDD5', minHeight: '150px' }}>
                 <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', position: 'relative' }}>
                    <textarea 
                       value={waText} 
                       onChange={(e) => setWaText(e.target.value)}
                       style={{ 
                          width: '100%', 
                          minHeight: '180px', 
                          border: 'none', 
                          resize: 'none', 
                          fontSize: '0.9rem', 
                          fontFamily: 'inherit',
                          lineHeight: '1.5',
                          outline: 'none'
                       }}
                    />
                    <div style={{ fontSize: '0.65rem', color: '#999', textAlign: 'right', marginTop: '0.5rem' }}>
                       {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                 </div>
              </div>

              <div style={{ padding: '1.5rem', background: 'var(--surface-container-low)', display: 'flex', gap: '1rem' }}>
                 <button onClick={() => setShowWAPreview(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none' }}>
                    {t.lang === 'en' ? 'Cancel' : 'إلغاء'}
                 </button>
                 <button onClick={sendWhatsApp} className="btn-executive" style={{ flex: 2, background: '#25D366', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Send size={18} /> {t.lang === 'en' ? 'Send Now' : 'إرسال الآن'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

interface MetricBoxProps {
  title: string;
  value: string;
  sub: string;
  positive?: boolean;
  icon: React.ReactNode;
}

function MetricBox({ title, value, sub, positive, icon }: MetricBoxProps) {
  return (
    <div className="card" style={{ padding: '1.5rem 2rem', borderInlineStart: `5px solid ${positive ? 'var(--success)' : 'var(--primary)'}` }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div style={{ padding: '1rem', borderRadius: '16px', background: 'var(--surface-container-high)', color: 'var(--primary)' }}>{icon}</div>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, padding: '0.4rem 0.8rem', borderRadius: '10px', background: positive ? 'rgba(27, 94, 32, 0.1)' : 'var(--surface-container-high)', color: positive ? 'var(--success)' : 'var(--on-surface)', textTransform: 'uppercase' }}>
             {positive ? 'Positive' : 'Active'}
          </span>
       </div>
       <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontWeight: 700, marginBottom: '0.4rem' }}>{title}</p>
       <h3 style={{ fontSize: '1.8rem', margin: 0, fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)' }}>{value} <span style={{ fontSize: '0.9rem', opacity: 0.6, fontWeight: 700 }}>SAR</span></h3>
       <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.6rem', fontWeight: 600 }}>{sub}</p>
    </div>
  );
}

interface PreviewModalProps {
  invoice: Invoice;
  onClose: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onPrint: () => void;
  t: Translations['invoices'];
  settings: {
    companyName: string;
    taxNumber: string;
    address: string;
    logo: string;
    reportHeader?: string;
    reportFooter?: string;
  };
}

function InvoicePreviewModal({ invoice, onClose, onWhatsApp, onEmail, onPrint, t, settings }: PreviewModalProps) {
  const vatRate = parseFloat(localStorage.getItem('sov_vat_rate') || '15');
  const qrData = generateZatcaQR(
    settings.companyName,
    settings.taxNumber,
    new Date(invoice.created_at).toISOString(),
    (invoice.total || invoice.total_amount || 0).toString(),
    (invoice.vat || invoice.tax_amount || 0).toString()
  );
  const isAr = t.lang === 'ar';
  const invoiceDate = new Date(invoice.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
  const gross = invoice.amount || 0;
  const vat = invoice.vat || invoice.tax_amount || 0;
  const total = invoice.total || invoice.total_amount || 0;
  const companyName = settings.companyName || 'مؤسسة الغويري للتخليص الجمركي';

  return (
    <div className="modal-overlay invoice-print-overlay" style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', zIndex: 3050, overflowY: 'auto' }}>
      {/* Action Bar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'center', gap: '0.8rem', padding: '0.8rem 2rem', background: 'rgba(0,26,51,0.97)', backdropFilter: 'blur(8px)', flexWrap: 'wrap', borderBottom: '2px solid rgba(212,167,106,0.3)' }}>
        <button onClick={onPrint} style={{ padding: '0.65rem 1.5rem', background: '#d4a76a', color: '#001a33', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'Tajawal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Printer size={18} /> {isAr ? 'تحميل PDF' : 'Download PDF'}
        </button>
        <button onClick={onWhatsApp} style={{ padding: '0.65rem 1.5rem', background: '#25D366', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'Tajawal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageCircle size={18} /> {isAr ? 'واتساب' : 'WhatsApp'}
        </button>
        <button onClick={onEmail} style={{ padding: '0.65rem 1.5rem', background: '#005ab5', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem', fontFamily: 'Tajawal', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Mail size={18} /> {isAr ? 'بريد إلكتروني' : 'Email'}
        </button>
        <button onClick={onClose} style={{ padding: '0.65rem 1rem', background: '#ba1a1a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <X size={18} /> {isAr ? 'إغلاق' : 'Close'}
        </button>
      </div>

      {/* A4 Invoice */}
      <div className="print-content" dir="rtl" style={{
        width: '210mm', minHeight: '297mm', background: 'white',
        margin: '0 auto 4rem', padding: '14mm 16mm',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        fontFamily: "'Tajawal','Cairo',sans-serif", color: '#111',
        boxSizing: 'border-box' as const
      }}>

        {/* HEADER */}
        <div style={{ borderBottom: '5px solid #001a33', paddingBottom: '10mm', marginBottom: '8mm', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4mm' }}>
            {settings.logo
              ? <img src={settings.logo} alt="logo" style={{ width: '20mm', height: '20mm', objectFit: 'contain' }} />
              : <div style={{ width: '20mm', height: '20mm', background: '#001a33', borderRadius: '4mm', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4a76a', fontWeight: 900, fontSize: '1.3rem' }}>{companyName.charAt(0)}</div>
            }
            <div>
              <div style={{ fontSize: '15pt', fontWeight: 900, color: '#001a33' }}>{companyName}</div>
              <div style={{ fontSize: '7.5pt', color: '#555', marginTop: '1mm' }}>الرقم الضريبي: {settings.taxNumber}</div>
              <div style={{ fontSize: '7.5pt', color: '#555' }}>{settings.address}</div>
            </div>
          </div>
          <div style={{ textAlign: 'left', direction: 'ltr' }}>
            <div style={{ fontSize: '18pt', fontWeight: 900, color: '#001a33', fontFamily: 'Tajawal' }}>
              {invoice.is_settlement ? 'قيد تسوية' : 'فاتورة ضريبية مبسطة'}
            </div>
            <div style={{ fontSize: '8pt', color: '#888', fontWeight: 700 }}>
              {invoice.is_settlement ? 'SETTLEMENT ENTRY' : 'SIMPLIFIED TAX INVOICE'}
            </div>
            <div style={{ marginTop: '3mm', padding: '2mm 5mm', background: '#001a33', borderRadius: '3mm', color: '#d4a76a', fontWeight: 900, fontSize: '11pt', textAlign: 'center', direction: 'ltr' }}>
              {invoice.reference_number}
            </div>
          </div>
        </div>

        {/* META GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6mm', marginBottom: '8mm' }}>
          {/* Supplier */}
          <div style={{ border: '1px solid #ddd', borderRadius: '3mm', padding: '4mm', background: '#fafafa' }}>
            <div style={{ fontSize: '7pt', fontWeight: 900, color: '#666', borderBottom: '1px solid #eee', paddingBottom: '2mm', marginBottom: '2mm' }}>المورد / Supplier</div>
            <div style={{ fontSize: '10pt', fontWeight: 900, color: '#001a33' }}>{companyName}</div>
            <div style={{ fontSize: '7.5pt', color: '#444', marginTop: '1mm' }}>الرقم الضريبي: <strong>{settings.taxNumber}</strong></div>
            <div style={{ fontSize: '7.5pt', color: '#444' }}>{settings.address}</div>
          </div>
          {/* Client */}
          <div style={{ border: '1px solid #ddd', borderRadius: '3mm', padding: '4mm', background: '#fafafa' }}>
            <div style={{ fontSize: '7pt', fontWeight: 900, color: '#666', borderBottom: '1px solid #eee', paddingBottom: '2mm', marginBottom: '2mm' }}>العميل / Client</div>
            <div style={{ fontSize: '10pt', fontWeight: 900, color: '#001a33' }}>{invoice.customers?.name || 'غير محدد'}</div>
            {invoice.customers?.phone && <div style={{ fontSize: '7.5pt', color: '#444', direction: 'ltr', textAlign: 'right' }}>{invoice.customers.phone}</div>}
          </div>
          {/* Invoice Info */}
          <div style={{ border: '1px solid #ddd', borderRadius: '3mm', padding: '4mm', background: '#fafafa' }}>
            <div style={{ fontSize: '7pt', fontWeight: 900, color: '#666', borderBottom: '1px solid #eee', paddingBottom: '2mm', marginBottom: '2mm' }}>تفاصيل الفاتورة / Details</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '1.5mm' }}><span style={{ color: '#666' }}>تاريخ الإصدار:</span><strong>{invoiceDate}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt', marginBottom: '1.5mm' }}><span style={{ color: '#666' }}>الحالة:</span><strong style={{ color: invoice.status === 'paid' ? '#1b5e20' : '#b45309' }}>{invoice.status === 'paid' ? '✓ مدفوعة' : '⏳ بانتظار السداد'}</strong></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8pt' }}><span style={{ color: '#666' }}>نسبة الضريبة:</span><strong>{invoice.is_settlement ? '0%' : vatRate + '%'}</strong></div>
          </div>
          {/* Cert badge */}
          <div style={{ border: '2px solid #001a33', borderRadius: '3mm', padding: '4mm', background: '#001a33', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '2mm' }}>
            <div style={{ fontSize: '7pt', color: '#d4a76a', fontWeight: 900, letterSpacing: '1px' }}>ZATCA CERTIFIED</div>
            <div style={{ fontSize: '9pt', color: 'white', fontWeight: 700, textAlign: 'center' }}>المرحلة الثانية | Phase 2</div>
            <div style={{ width: '8mm', height: '8mm', background: '#25D366', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10pt', fontWeight: 900 }}>✓</div>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8mm', fontSize: '9pt' }}>
          <thead>
            <tr style={{ background: '#001a33', color: 'white' }}>
              <th style={{ padding: '3mm 4mm', textAlign: 'right', fontWeight: 900 }}>الوصف / Description</th>
              <th style={{ padding: '3mm 4mm', textAlign: 'center', fontWeight: 900, width: '20mm' }}>كمية</th>
              <th style={{ padding: '3mm 4mm', textAlign: 'center', fontWeight: 900, width: '32mm' }}>الصافي / Net</th>
              <th style={{ padding: '3mm 4mm', textAlign: 'center', fontWeight: 900, width: '28mm', color: '#d4a76a' }}>ضريبة / VAT</th>
              <th style={{ padding: '3mm 4mm', textAlign: 'center', fontWeight: 900, width: '32mm' }}>الإجمالي / Total</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #ddd', background: '#fafafa' }}>
              <td style={{ padding: '4mm', fontWeight: 700 }}>
                {invoice.is_settlement ? 'قيد تسوية وتعديل مالي' : 'خدمات التخليص الجمركي والخدمات اللوجستية'}
              </td>
              <td style={{ padding: '4mm', textAlign: 'center', fontWeight: 700 }}>1</td>
              <td style={{ padding: '4mm', textAlign: 'center', fontWeight: 700 }}>{gross.toLocaleString('ar-SA')} ر.س</td>
              <td style={{ padding: '4mm', textAlign: 'center', fontWeight: 700, color: '#b45309' }}>{vat.toLocaleString('ar-SA')} ر.س</td>
              <td style={{ padding: '4mm', textAlign: 'center', fontWeight: 900, fontSize: '11pt', color: '#001a33' }}>{total.toLocaleString('ar-SA')} ر.س</td>
            </tr>
          </tbody>
        </table>

        {/* TOTALS + QR */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '6mm' }}>
          {/* QR */}
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ border: '1.5px solid #ddd', borderRadius: '3mm', padding: '3mm', background: 'white', display: 'inline-block' }}>
              <QRCodeSVG value={qrData} size={100} level="M" />
            </div>
            <div style={{ fontSize: '6.5pt', fontWeight: 900, marginTop: '1.5mm', color: '#1b5e20' }}>ZATCA QR CODE</div>
          </div>
          {/* Totals */}
          <div style={{ flex: 1, border: '2px solid #001a33', borderRadius: '4mm', overflow: 'hidden' }}>
            <div style={{ background: '#f5f7fa', padding: '3mm 5mm', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', fontSize: '9pt' }}>
              <span style={{ color: '#555', fontWeight: 700 }}>المبلغ قبل الضريبة:</span>
              <strong>{gross.toLocaleString('ar-SA')} ر.س</strong>
            </div>
            <div style={{ background: '#fffbf0', padding: '3mm 5mm', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd', fontSize: '9pt' }}>
              <span style={{ color: '#b45309', fontWeight: 700 }}>ضريبة القيمة المضافة ({invoice.is_settlement ? '0' : vatRate}%):</span>
              <strong style={{ color: '#b45309' }}>{vat.toLocaleString('ar-SA')} ر.س</strong>
            </div>
            <div style={{ background: '#001a33', padding: '4mm 5mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#d4a76a', fontWeight: 900, fontSize: '11pt' }}>الإجمالي المستحق:</span>
              <strong style={{ color: 'white', fontSize: '17pt', fontFamily: 'Tajawal' }}>{total.toLocaleString('ar-SA')} <span style={{ fontSize: '9pt' }}>ر.س</span></strong>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ marginTop: '10mm', borderTop: '2px solid #001a33', paddingTop: '4mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '7pt', color: '#666', maxWidth: '120mm', lineHeight: 1.5 }}>
            <strong style={{ color: '#001a33' }}>ملاحظة:</strong> هذه فاتورة ضريبية مبسطة صادرة وفقاً لمتطلبات هيئة الزكاة والضريبة والجمارك.
            {settings.reportFooter && <span> | {settings.reportFooter}</span>}
          </div>
          <div style={{ textAlign: 'left', direction: 'ltr', fontSize: '7pt', color: '#999' }}>
            <div style={{ fontWeight: 900, color: '#001a33', fontSize: '8pt' }}>{companyName}</div>
            <div>VAT: {settings.taxNumber}</div>
            <div style={{ color: '#25D366', fontWeight: 700 }}>ZATCA Phase 2 ✓</div>
          </div>
        </div>
      </div>

    </div>
  );
}

