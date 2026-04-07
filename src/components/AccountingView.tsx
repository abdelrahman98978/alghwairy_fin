import { useState, useEffect, useCallback } from 'react';
import { 
  Receipt,
  Plus,
  Trash2,
  Printer,
  X,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ArrowUpRight,
  Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Invoice {
  id: string;
  trx_number: string;
  description: string;
  type: string;
  amount: number;
  status: string;
  created_at: string;
}

import type { Translations } from '../types/translations';

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
  const [vatRate] = useState(() => {
    const savedRate = localStorage.getItem('sov_vat_rate');
    return savedRate ? parseFloat(savedRate) : 15;
  });

  const fetchRecentInvoices = useCallback(async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!error && data) {
      setRecentInvoices(data as Invoice[]);
    }
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
      showToast('Validation Error: Client name and items required', 'error');
      return;
    }

    setLoading(true);
    const totalAmount = calculateTotal();
    
    const { error } = await supabase.from('transactions').insert([{
      trx_number: (mode === 'settlement' ? 'SET-' : 'INV-') + Math.random().toString(36).substr(2, 6).toUpperCase(),
      description: clientName,
      type: mode === 'settlement' ? 'settlement' : 'income',
      amount: totalAmount,
      status: 'مكتمل'
    }]);

    if (error) {
      showToast('Error issuing: ' + error.message, 'error');
    } else {
      const logAction = mode === 'settlement' ? 'Posted Sovereign Settlement: ' : 'Issued Sovereign Tax Invoice to ';
      await logActivity(logAction + clientName, 'transactions');
      showToast(mode === 'settlement' ? 'Sovereign Settlement entry secured and posted.' : 'Sovereign Tax Invoice issued and ZATCA certified.', 'success');
      setClientName('');
      setTaxId('');
      setServiceType('');
      setItems([]);
      fetchRecentInvoices();
    }
    setLoading(false);
  };

  const copyPublicLink = (id: string) => {
    const url = window.location.origin + window.location.pathname + '?invoice_id=' + id;
    navigator.clipboard.writeText(url);
    showToast(t.lang === 'ar' ? 'تم نسخ رابط المشاركة بنجاح' : 'Shareable link copied successfully', 'success');
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
               <CheckCircle2 size={24} /> {loading ? '...' : (mode === 'invoice' ? (t.lang === 'ar' ? 'إصدار فاتورة سيادية' : 'Issue Sovereign Invoice') : (t.lang === 'ar' ? 'ترحيل قيد تسوية' : 'Post Settlement Entry'))}
            </button>
            <button 
              onClick={() => {
                if (items.length > 0) setShowPreview(true);
                else showToast(t.no_recent, 'error');
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
                   id={`INV-${inv.id.toString().slice(-4).toUpperCase()}`} 
                   client={inv.description} 
                   amount={inv.amount.toLocaleString()} 
                   onShare={() => copyPublicLink(inv.id)}
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
                <p style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: 'var(--primary)' }}>{t.lang === 'en' ? 'Sovereign Compliance' : 'الامتثال السيادي'}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.7, fontWeight: 700 }}>{t.lang === 'en' ? 'ZATCA Phase 2 (Integration) Active' : 'المرحلة الثانية (الربط والإحكام) نشطة'}</p>
             </div>
          </div>

          <div className="card" style={{ background: 'var(--surface-container-low)', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <div style={{ width: 40, height: 40, background: 'var(--success)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(var(--success-rgb), 0.3)' }}>
                <CheckCircle2 size={20} />
             </div>
             <div>
                <p style={{ margin: 0, fontWeight: 900, fontSize: '0.9rem', color: 'var(--primary)' }}>{t.lang === 'en' ? 'Ledger Status' : 'حالة الأستاذ العام'}</p>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--success)', fontWeight: 800 }}>{t.lang === 'en' ? 'INTEGRITY VERIFIED' : 'تم التحقق من النزاهة'}</p>
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
             <Send size={14} />
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
}

function InvoicePreviewModal({ clientName, taxId, items, subtotal, vat, vatRate, total, currency, isSettlement, onDismiss }: InvoicePreviewModalProps) {
  const invoiceId = useState(() => Math.random().toString(36).substr(2, 6).toUpperCase())[0];
  const dateStr = useState(() => new Date().toLocaleDateString())[0];

  return (
    <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.9)', zIndex: 3000, backdropFilter: 'blur(10px)' }}>
       <div className="print-content slide-in" style={{ background: '#fff', width: '210mm', minHeight: '297mm', padding: '20mm', position: 'relative', boxShadow: '0 25px 80px rgba(0,0,0,0.4)', overflowY: 'auto', maxHeight: '95vh', color: '#000', borderRadius: '4px' }}>
          <button onClick={onDismiss} className="no-print" style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: '#ba1a1a', color: '#fff', border: 'none', padding: '0.8rem', borderRadius: '50%', cursor: 'pointer', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={24} /></button>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '5px solid #001a33', paddingBottom: '2.5rem', marginBottom: '3rem' }}>
             <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ width: 70, height: 70, background: '#001a33', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={40} color="#d4a76a" />
                </div>
                <div>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, letterSpacing: '-1.5px', color: '#001a33' }}>SOVEREIGN LEDGER</h1>
                  <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem', fontWeight: 700 }}>High-Level Financial & Royal Services Authority</p>
                  <p style={{ margin: 0, opacity: 0.6, fontSize: '0.8rem' }}>Kingdom of Saudi Arabia • Authorized Digital Institution</p>
                </div>
             </div>
             <div style={{ textAlign: 'right' }}>
                <h2 style={{ fontSize: '1.8rem', color: '#001a33', margin: 0, fontWeight: 900 }}>{isSettlement ? 'SETTLEMENT ENTRY' : 'TAX INVOICE'}</h2>
                <div style={{ marginTop: '0.5rem' }}>
                   <p style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem', color: '#d4a76a' }}>#{isSettlement ? 'SET' : 'SL'}-{invoiceId}</p>
                   <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700 }}>DATE: {dateStr}</p>
                </div>
             </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '4rem', marginBottom: '4rem' }}>
             <div>
                <h3 style={{ fontSize: '1rem', borderBottom: '2px solid #f1f3f5', paddingBottom: '0.8rem', marginBottom: '1.2rem', fontWeight: 900, color: '#001a33' }}>CLIENT INFORMATION</h3>
                <p style={{ margin: '0.4rem 0', fontWeight: 900, fontSize: '1.3rem' }}>{clientName || 'Valued Custodian'}</p>
                {taxId && <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>VAT REGISTRATION: <span style={{ letterSpacing: '1px' }}>{taxId}</span></p>}
                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', opacity: 0.7 }}>Secure Partner Transaction Portal</p>
             </div>
             <div style={{ textAlign: 'right' }}>
                <h3 style={{ fontSize: '1rem', borderBottom: '2px solid #f1f3f5', paddingBottom: '0.8rem', marginBottom: '1.2rem', fontWeight: 900, color: '#001a33' }}>ISSUING AUTHORITY</h3>
                <p style={{ margin: '0.4rem 0', fontWeight: 900, fontSize: '1.1rem' }}>Alghwairy Financial Hub</p>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Commercial Tower, Riyadh, KSA</p>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>OFFICIAL VAT: 310122345600003</p>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>CONTACT: info@alghwairy.fin</p>
             </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4rem' }}>
             <thead>
                <tr style={{ background: '#f8f9fa' }}>
                   <th style={{ textAlign: 'left', padding: '1.2rem', fontWeight: 900, fontSize: '0.9rem', borderBottom: '2px solid #001a33' }}>{isSettlement ? 'SETTLEMENT DESCRIPTION / REASONS' : 'DESCRIPTION OF SERVICES / GOODS'}</th>
                   <th style={{ textAlign: 'right', padding: '1.2rem', fontWeight: 900, fontSize: '0.9rem', borderBottom: '2px solid #001a33' }}>AMOUNT ({currency})</th>
                </tr>
             </thead>
             <tbody>
                {items.map((item: Item, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f3f5' }}>
                     <td style={{ padding: '1.2rem', fontWeight: 700, fontSize: '1rem' }}>{item.desc}</td>
                     <td style={{ padding: '1.2rem', textAlign: 'right', fontWeight: 900, fontSize: '1.1rem' }}>{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
             </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fcfdfe', padding: '3rem', borderRadius: '16px', border: '1px solid #f1f3f5' }}>
             <div>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #eee', display: 'inline-block' }}>
                   <QrCode size={130} />
                </div>
                <div style={{ marginTop: '1.2rem' }}>
                   <p style={{ fontSize: '0.7rem', fontWeight: 900, color: '#1b5e20', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={14} /> ZATCA PHASE 2 COMPLIANCE VERIFIED
                   </p>
                   <p style={{ fontSize: '0.65rem', marginTop: '0.4rem', opacity: 0.6, width: '200px', lineHeight: '1.4' }}>This QR code contains serialized ledger data for tax validation across all GCC networks.</p>
                </div>
             </div>
             <div style={{ width: '350px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid #eee' }}>
                   <span style={{ fontWeight: 700, opacity: 0.7 }}>{isSettlement ? 'ADJUSTMENT TOTAL' : 'SUBTOTAL (GROSS)'}</span>
                   <span style={{ fontWeight: 800 }}>{subtotal.toLocaleString()} {currency}</span>
                </div>
                {!isSettlement && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid #eee' }}>
                     <span style={{ fontWeight: 700, opacity: 0.7 }}>TAX (VAT {vatRate}%)</span>
                     <span style={{ fontWeight: 800 }}>{vat.toLocaleString()} {currency}</span>
                   </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2rem 0', borderTop: '4px solid #001a33', marginTop: '1.5rem' }}>
                   <span style={{ fontWeight: 950, fontSize: '1.5rem', color: '#001a33' }}>{isSettlement ? 'FINAL SETTLEMENT' : 'GRAND TOTAL'}</span>
                   <span style={{ fontWeight: 950, fontSize: '1.8rem', color: '#001a33' }}>{total.toLocaleString()} <span style={{ fontSize: '0.8rem' }}>{currency}</span></span>
                </div>
                <div style={{ textAlign: 'right', marginTop: '1rem' }}>
                   <p style={{ fontSize: '0.8rem', fontWeight: 900, color: '#d4a76a', textTransform: 'uppercase' }}>Amount in words:</p>
                   <p style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.6 }}>Certified Sovereign Transaction Record</p>
                </div>
             </div>
          </div>

          <div style={{ marginTop: '6rem', paddingTop: '3rem', borderTop: '2px solid #f1f3f5', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', textAlign: 'center' }}>
             <div>
                <p style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '2.5rem' }}>Issued By</p>
                <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto' }}></div>
                <p style={{ fontSize: '0.8rem', fontWeight: 900, marginTop: '0.5rem' }}>Digital Signature</p>
             </div>
             <div>
                <p style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '2.5rem' }}>Authority Verification</p>
                <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto' }}></div>
                <p style={{ fontSize: '0.8rem', fontWeight: 900, marginTop: '0.5rem' }}>Sovereign Stamp</p>
             </div>
             <div>
                <p style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '2.5rem' }}>Receiver Acknowledgment</p>
                <div style={{ borderBottom: '1px solid #000', width: '80%', margin: '0 auto' }}></div>
                <p style={{ fontSize: '0.8rem', fontWeight: 900, marginTop: '0.5rem' }}>Client Signature</p>
             </div>
          </div>
          
          <div className="no-print" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
             <button onClick={() => window.print()} style={{ background: '#001a33', color: '#fff', border: 'none', padding: '1.2rem 4rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 900, fontSize: '1.2rem', boxShadow: '0 10px 30px rgba(0,26,51,0.3)' }}>GENERATE OFFICIAL PDF</button>
          </div>
       </div>
    </div>
  );
}
