import { useState, useEffect, useCallback } from 'react';
import { 
  Receipt,
  Plus,
  Trash2,
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  Mail,
  MessageCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { localDB } from '../lib/localDB';
import type { Translations } from '../types/translations';

interface Invoice {
  id: string;
  trx_number: string;
  description: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Props {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: Translations['accounting'] & { lang: string };
}

export default function AccountingView({ showToast, logActivity, t }: Props) {
  const [loading, setLoading] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [clientName, setClientName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [mode, setMode] = useState<'invoice' | 'settlement'>('invoice');
  const [items, setItems] = useState<{desc: string, amount: number}[]>([]);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  
  const [settings] = useState({
    companyName: localStorage.getItem('sov_company_name') || 'مؤسسة الغويري للتخليص الجمركي',
    taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
    address: localStorage.getItem('sov_address') || 'King Fahd Rd, Riyadh, SA',
    logo: localStorage.getItem('sov_logo') || './logo.png'
  });

  const [vatRate] = useState(() => {
    const savedRate = localStorage.getItem('sov_vat_rate');
    return savedRate ? parseFloat(savedRate) : 15;
  });

  const fetchRecentInvoices = useCallback(() => {
    const data = localDB.getActive('transactions')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
    setRecentInvoices(data as Invoice[]);
  }, []);

  useEffect(() => {
    fetchRecentInvoices();
  }, [fetchRecentInvoices]);

  const addItem = () => {
    if (!newItemDesc || !newItemAmount) return;
    setItems([...items, { desc: newItemDesc, amount: parseFloat(newItemAmount) }]);
    setNewItemDesc('');
    setNewItemAmount('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.amount, 0);
  const calculateVAT = () => mode === 'settlement' ? 0 : (calculateSubtotal() * (vatRate / 100));
  const calculateTotal = () => calculateSubtotal() + calculateVAT();

  const handleIssueInvoice = async () => {
    if (!clientName || items.length === 0) {
      showToast(t.lang === 'ar' ? 'خطأ: يرجى إدخال اسم العميل والبنود' : 'Validation Error: Client name and items required', 'error');
      return;
    }

    setLoading(true);
    const totalAmount = calculateTotal();
    
    const newTrx = {
      trx_number: (mode === 'settlement' ? 'SET-' : 'INV-') + Math.random().toString(36).substr(2, 6).toUpperCase(),
      description: clientName,
      type: mode === 'settlement' ? 'settlement' : 'income',
      amount: totalAmount,
      status: 'مكتمل'
    };

    try {
      const record = localDB.insert('transactions', newTrx);
      const logAction = mode === 'settlement' ? 'Posted Settlement Entry: ' : 'Issued Tax Invoice to ';
      await logActivity(logAction + clientName, 'transactions', record.id);
      showToast(mode === 'settlement' ? (t.lang === 'ar' ? 'تم تسجيل قيد التسوية بنجاح' : 'Settlement entry secured and posted.') : (t.lang === 'ar' ? 'تم إصدار الفاتورة الضريبية بنجاح' : 'Tax Invoice issued successfully.'), 'success');
      setClientName('');
      setTaxId('');
      setServiceType('');
      setItems([]);
      fetchRecentInvoices();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    }
    setLoading(false);
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

  const handleWhatsApp = () => {
    const text = `عزيزي العميل،\nنرفق لكم تفاصيل الفاتورة الضريبية:\nالعميل: ${clientName}\nالمبلغ: ${calculateTotal().toLocaleString()} ${currency}\nمؤسسة الغويري للتخليص الجمركي`;
    openExternal(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`فاتورة من مؤسسة الغويري - ${clientName}`);
    const body = encodeURIComponent(`عزيزي العميل،\nنرفق لكم تفاصيل الفاتورة الضريبية بقيمة ${calculateTotal().toLocaleString()} ${currency}.\nشكراً لتعاملكم معنا.\nمؤسسة الغويري للتخليص الجمركي`);
    openExternal(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>{mode === 'settlement' ? t.settlement_entry : t.invoice_editor}</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.invoice_desc}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface-container-low)', padding: '0.4rem', borderRadius: '12px' }}>
           <button onClick={() => setMode('invoice')} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: mode === 'invoice' ? 'var(--primary)' : 'transparent', color: mode === 'invoice' ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 900, cursor: 'pointer' }}>{t.lang === 'en' ? 'Invoice' : 'فاتورة'}</button>
           <button onClick={() => setMode('settlement')} style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none', background: mode === 'settlement' ? 'var(--primary)' : 'transparent', color: mode === 'settlement' ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 900, cursor: 'pointer' }}>{t.lang === 'en' ? 'Settlement' : 'قيد تسوية'}</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
        {/* Invoice Form Area */}
        <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)', boxShadow: '0 15px 50px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '1.5rem' }}>
            <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '16px', color: 'var(--secondary)' }}><Receipt size={24} /></div>
            <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{t.items_title}</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.client_name}</label>
                <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.tax_id}</label>
                <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.service_type}</label>
                <input type="text" value={serviceType} onChange={e => setServiceType(e.target.value)} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
               <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.currency}</label>
               <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-executive" style={{ fontSize: '1rem', fontWeight: 800, textAlign: 'center' }}>
                 <option value="SAR">SAR</option>
                 <option value="USD">USD</option>
                 <option value="EUR">EUR</option>
               </select>
            </div>
          </div>

          {/* Line Items Editor */}
          <div style={{ marginTop: '2.5rem', background: 'var(--surface-container-low)', padding: '1.5rem', borderRadius: '16px' }}>
             <h4 style={{ fontSize: '1.1rem', fontFamily: 'Tajawal', marginBottom: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{t.items_title}</h4>
             <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <input type="text" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder={t.description_placeholder} className="input-executive" style={{ flex: 3, fontWeight: 700 }} />
                <input type="number" value={newItemAmount} onChange={e => setNewItemAmount(e.target.value)} placeholder={t.amount_placeholder} className="input-executive" style={{ flex: 1, fontWeight: 900, textAlign: 'center' }} />
                <button onClick={addItem} className="btn-executive" style={{ width: '55px', padding: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', border: 'none' }}><Plus size={24} /></button>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {items.map((item, index) => (
                   <div key={index} className="slide-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--surface-container-high)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--on-surface)' }}>{item.desc}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                         <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.1rem' }}>{item.amount.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>{currency}</span></span>
                         <button onClick={() => removeItem(index)} style={{ background: 'rgba(211, 47, 47, 0.1)', border: 'none', color: 'var(--error)', cursor: 'pointer', padding: '0.4rem', borderRadius: '8px' }}><Trash2 size={18} /></button>
                      </div>
                   </div>
                ))}
             </div>
          </div>

          <div style={{ marginTop: '3rem', display: 'flex', gap: '1.5rem' }}>
            <button 
              disabled={loading}
              onClick={handleIssueInvoice}
              className="btn-executive"
              style={{ flex: 2, padding: '1.4rem', fontSize: '1.2rem', fontWeight: 900, border: 'none' }}
            >
               <CheckCircle2 size={24} /> {loading ? '...' : (mode === 'invoice' ? (t.lang === 'ar' ? 'إصدار فاتورة ضريبية' : 'Issue Tax Invoice') : (t.lang === 'ar' ? 'ترحيل قيد تسوية' : 'Post Settlement Entry'))}
            </button>
            <button 
              onClick={() => {
                if (items.length > 0) setShowPreview(true);
                else showToast(t.lang === 'ar' ? 'يجب إضافة بنود للمعاينة' : 'Add items first to preview', 'error');
              }}
              className="btn-executive"
              style={{ flex: 1, padding: '1.4rem', fontSize: '1.1rem', background: 'var(--surface-container-high)', color: 'var(--primary)', fontWeight: 800, border: 'none' }}
            >
              <Printer size={20} /> {t.print_pdf}
            </button>
          </div>
        </div>

        {/* Sidebar Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="card" style={{ background: 'var(--primary)', border: 'none', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'relative', zIndex: 2 }}>
               <h3 style={{ color: 'var(--secondary)', marginBottom: '2rem', fontFamily: 'Tajawal', fontWeight: 900, fontSize: '1.4rem' }}>{t.summation}</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                 <SummaryRow label={t.subtotal} value={calculateSubtotal().toLocaleString()} currency={currency} />
                 <SummaryRow label={t.vat} value={calculateVAT().toLocaleString()} currency={currency} />
                 <div style={{ borderTop: '2px solid rgba(212, 167, 106, 0.2)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                   <SummaryRow label={t.total} value={calculateTotal().toLocaleString()} currency={currency} isBold />
                 </div>
               </div>
            </div>
            {/* Background design */}
            <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '120px', height: '120px', background: 'rgba(212, 167, 106, 0.05)', borderRadius: '30px' }}></div>
          </div>

          <div className="card" style={{ border: '1px solid var(--surface-container-high)' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontFamily: 'Tajawal', fontWeight: 800 }}>{t.recent_title}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {recentInvoices.map((inv) => (
                  <RecentTrx 
                    key={inv.id} 
                    id={inv.trx_number} 
                    client={inv.description} 
                    amount={inv.amount.toLocaleString()} 
                    onShare={() => {
                        const subject = encodeURIComponent(`فاتورة من مؤسسة الغويري - ${inv.description}`);
                        const body = encodeURIComponent(`تفاصيل المعاملة رقم ${inv.trx_number}\nالقيمة: ${inv.amount.toLocaleString()} SAR`);
                        openExternal(`mailto:?subject=${subject}&body=${body}`);
                    }}
                  />
               ))}
               {recentInvoices.length === 0 && <p style={{ fontSize: '0.9rem', opacity: 0.6, textAlign: 'center', padding: '2rem' }}>{t.no_recent}</p>}
            </div>
          </div>
          
          <div className="card" style={{ background: 'var(--surface-container-low)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <div style={{ width: 40, height: 40, background: 'var(--primary)', color: 'var(--secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} />
             </div>
             <div>
                <p style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: 'var(--primary)' }}>{t.lang === 'en' ? 'Customs Compliance' : 'الامتثال الجمركي'}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7, fontWeight: 700 }}>{t.lang === 'en' ? 'ZATCA Stage 2 Integrated' : 'المرحلة الثانية من الفوترة الإلكترونية'}</p>
             </div>
          </div>
        </div>
      </div>

      {showPreview && (
        <InvoicePreviewModal 
          clientName={clientName} 
          taxId={taxId} 
          items={items} 
          subtotal={calculateSubtotal()}
          vat={calculateVAT()}
          vatRate={vatRate}
          total={calculateTotal()}
          currency={currency}
          isSettlement={mode === 'settlement'}
          onDismiss={() => setShowPreview(false)}
          onPrint={handlePrintPDF}
          onWhatsApp={handleWhatsApp}
          onEmail={handleEmail}
          settings={settings}
          t={t}
        />
      )}
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  isBold?: boolean;
  currency?: string;
}

function SummaryRow({ label, value, isBold, currency }: SummaryRowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.95rem', opacity: 0.9, fontWeight: 700 }}>{label}</span>
      <span style={{ fontWeight: isBold ? 900 : 800, fontSize: isBold ? '1.8rem' : '1.2rem', color: isBold ? 'var(--secondary)' : 'white' }}>{value} <span style={{ fontSize: '0.7em', opacity: 0.6 }}>{currency || 'SAR'}</span></span>
    </div>
  );
}

interface RecentTrxProps {
  id: string;
  client: string;
  amount: string;
  onShare: () => void;
}

function RecentTrx({ id, client, amount, onShare }: RecentTrxProps) {
  return (
    <div 
      style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--surface-container-low)', transition: 'all 0.2s', cursor: 'pointer' }} 
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = 'var(--surface-container-low)'} 
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => e.currentTarget.style.background = 'none'}
    >
       <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <p style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>{id}</p>
             <ArrowUpRight size={14} color="var(--success)" />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0.2rem 0', fontWeight: 600 }}>{client}</p>
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <p style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>{amount} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>SAR</span></p>
          <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="btn-executive" style={{ padding: '0.4rem', background: 'var(--surface-container-high)', border: 'none', color: 'var(--primary)' }}>
             <Mail size={14} />
          </button>
       </div>
    </div>
  );
}

interface Item {
  desc: string;
  amount: number;
}

interface InvoicePreviewModalProps {
  clientName: string;
  taxId: string;
  items: Item[];
  subtotal: number;
  vat: number;
  vatRate: number;
  total: number;
  currency: string;
  isSettlement: boolean;
  onDismiss: () => void;
  onPrint: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  settings: any;
  t: any;
}

function InvoicePreviewModal({ clientName, taxId, items, subtotal, vat, total, currency, isSettlement, onDismiss, onPrint, onWhatsApp, onEmail, settings, t }: InvoicePreviewModalProps) {
  const invoiceId = useState(() => Math.random().toString(36).substr(2, 6).toUpperCase())[0];
  const isAr = t.lang === 'ar';

  const generateZatcaQR = (seller: string, taxNo: string, date: string, total: string, vat: string) => {
    const encoder = new TextEncoder();
    
    const encodeTLV = (tag: number, value: string) => {
      const valueBuffer = encoder.encode(value);
      const tagBuffer = new Uint8Array([tag, valueBuffer.length]);
      const combined = new Uint8Array(tagBuffer.length + valueBuffer.length);
      combined.set(tagBuffer);
      combined.set(valueBuffer, tagBuffer.length);
      return combined;
    };

    const parts = [
      encodeTLV(1, seller),
      encodeTLV(2, taxNo),
      encodeTLV(3, date),
      encodeTLV(4, total),
      encodeTLV(5, vat),
    ];
    
    const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const p of parts) {
      combined.set(p, offset);
      offset += p.length;
    }
    
    // Convert Uint8Array to binary string for btoa
    let binary = '';
    const bytes = new Uint8Array(combined);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const qrValue = generateZatcaQR(settings.companyName, settings.taxNumber, new Date().toISOString(), total.toString(), vat.toString());

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
        <button onClick={onDismiss} style={{ padding: '0.65rem 1rem', background: '#ba1a1a', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <X size={18} /> {isAr ? 'إغلاق' : 'Close'}
        </button>
      </div>

       <div className="print-content" dir="rtl" style={{ background: '#fff', width: '210mm', minHeight: '297mm', padding: '14mm 16mm', margin: '1.5rem auto 4rem', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', color: '#111', boxSizing: 'border-box' as const, fontFamily: "'Tajawal','Cairo',sans-serif" }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '5px solid #001a33', paddingBottom: '10mm', marginBottom: '8mm' }}>
             <div style={{ display: 'flex', gap: '4mm', alignItems: 'center' }}>
                {settings.logo 
                  ? <img src={settings.logo} alt="logo" style={{ width: '22mm', height: '22mm', objectFit: 'contain' }} />
                  : <div style={{ width: '20mm', height: '20mm', background: '#001a33', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4a76a', fontWeight: 900, fontSize: '1.5rem' }}>{settings.companyName.charAt(0)}</div>
                }
                <div>
                   <h1 style={{ fontSize: '16pt', fontWeight: 900, margin: 0, color: '#001a33' }}>{settings.companyName}</h1>
                   <p style={{ margin: 0, opacity: 0.8, fontSize: '8pt', fontWeight: 700 }}>للتخليص الجمركي والخدمات اللوجستية</p>
                   <p style={{ margin: 0, opacity: 0.6, fontSize: '7pt' }}>الرقم الضريبي: {settings.taxNumber}</p>
                </div>
             </div>
             <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <h2 style={{ fontSize: '20pt', color: '#001a33', margin: 0, fontWeight: 900 }}>{isSettlement ? 'SETTLEMENT' : 'TAX INVOICE'}</h2>
                <div style={{ marginTop: '2mm' }}>
                   <p style={{ margin: 0, fontWeight: 900, fontSize: '11pt', color: '#d4a76a' }}>#{isSettlement ? 'SET' : 'INV'}-{invoiceId}</p>
                   <p style={{ margin: 0, fontSize: '9pt', fontWeight: 700 }}>DATE: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20mm', marginBottom: '15mm' }}>
             <div>
                <h3 style={{ fontSize: '10pt', borderBottom: '2px solid #001a33', paddingBottom: '2mm', marginBottom: '3mm', fontWeight: 900, color: '#001a33' }}>بيانات العميل / CLIENT</h3>
                <p style={{ margin: '2mm 0', fontWeight: 900, fontSize: '12pt' }}>{clientName || 'عميل نقدي'}</p>
                {taxId && <p style={{ margin: 0, fontSize: '9pt', fontWeight: 700 }}>الرقم الضريبي: {taxId}</p>}
                <p style={{ margin: '2mm 0', fontSize: '8pt', opacity: 0.7 }}>عملية جمركية موثقة</p>
             </div>
             <div style={{ textAlign: 'left', direction: 'ltr' }}>
                <h3 style={{ fontSize: '10pt', borderBottom: '2px solid #001a33', paddingBottom: '2mm', marginBottom: '3mm', fontWeight: 900, color: '#001a33' }}>ISSUER</h3>
                <p style={{ margin: '2mm 0', fontWeight: 900, fontSize: '11pt' }}>Alghwairy Customs</p>
                <p style={{ margin: 0, fontSize: '8pt', fontWeight: 600 }}>Riyadh, KSA</p>
                <p style={{ margin: 0, fontSize: '8pt', fontWeight: 600 }}>VAT: {settings.taxNumber}</p>
             </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15mm' }}>
             <thead>
                <tr style={{ background: '#f8f9fa' }}>
                   <th style={{ textAlign: 'right', padding: '12pt', fontWeight: 900, fontSize: '9pt', borderBottom: '2px solid #001a33' }}>الوصف / Description</th>
                   <th style={{ textAlign: 'left', padding: '12pt', fontWeight: 900, fontSize: '9pt', borderBottom: '2px solid #001a33' }}>المبلغ / Amount</th>
                </tr>
             </thead>
             <tbody>
                {items.map((item: Item, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f3f5' }}>
                     <td style={{ padding: '12pt', fontWeight: 700, fontSize: '10pt' }}>{item.desc}</td>
                     <td style={{ padding: '12pt', textAlign: 'left', fontWeight: 900, fontSize: '11pt' }}>{item.amount.toLocaleString()} {currency}</td>
                  </tr>
                ))}
             </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fcfdfe', padding: '10mm', borderRadius: '12px', border: '1px solid #f1f3f5' }}>
             <div>
                <div style={{ background: 'white', padding: '2mm', borderRadius: '8px', border: '1px solid #eee', display: 'inline-block' }}>
                   <QRCodeSVG value={qrValue} size={110} />
                </div>
                <div style={{ marginTop: '4mm' }}>
                   <p style={{ fontSize: '7pt', fontWeight: 900, color: '#1b5e20', display: 'flex', alignItems: 'center', gap: '2mm' }}>
                      <CheckCircle2 size={12} /> متوافق مع هيئة الزكاة والضريبة والجمارك (ZATCA)
                   </p>
                   <p style={{ fontSize: '6.5pt', marginTop: '2mm', opacity: 0.6, width: '180px', lineHeight: '1.4' }}>فاتورة إلكترونية معتمدة للمرحلة الثانية من الربط والإحكام.</p>
                </div>
             </div>
             <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6pt 0', borderBottom: '1px solid #eee' }}>
                   <span style={{ fontWeight: 700, opacity: 0.7 }}>الإجمالي الفرعي / Subtotal</span>
                   <span style={{ fontWeight: 800 }}>{subtotal.toLocaleString()} {currency}</span>
                </div>
                {!isSettlement && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6pt 0', borderBottom: '1px solid #eee' }}>
                     <span style={{ fontWeight: 700, opacity: 0.7 }}>الضريبة 15% / VAT</span>
                     <span style={{ fontWeight: 800 }}>{vat.toLocaleString()} {currency}</span>
                   </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15pt 0', borderTop: '4px solid #001a33', marginTop: '10pt' }}>
                   <span style={{ fontWeight: 950, fontSize: '14pt', color: '#001a33' }}>الإجمالي / Grand Total</span>
                   <span style={{ fontWeight: 950, fontSize: '16pt', color: '#001a33' }}>{total.toLocaleString()} {currency}</span>
                </div>
             </div>
          </div>

          <div style={{ marginTop: '20mm', paddingTop: '10mm', borderTop: '2px solid #f1f3f5', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10mm', textAlign: 'center' }}>
             <div>
                <p style={{ fontSize: '7pt', opacity: 0.5, marginBottom: '15mm' }}>توقيع المؤسسة / Issuer Signature</p>
                <div style={{ borderBottom: '1px solid #000', width: '60%', margin: '0 auto' }}></div>
                <p style={{ fontSize: '8pt', fontWeight: 900, marginTop: '2mm' }}>ختم المؤسسة الرسمي</p>
             </div>
             <div>
                <p style={{ fontSize: '7pt', opacity: 0.5, marginBottom: '15mm' }}>استلام العميل / Client Recipient</p>
                <div style={{ borderBottom: '1px solid #000', width: '60%', margin: '0 auto' }}></div>
                <p style={{ fontSize: '8pt', fontWeight: 900, marginTop: '2mm' }}>توقيع العميل</p>
             </div>
          </div>
       </div>
    </div>
  );
}
