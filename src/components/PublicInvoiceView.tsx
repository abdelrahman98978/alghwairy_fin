import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Printer, 
  Clock, 
  AlertCircle,
  FileText,
  Phone,
  Globe
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import { QRCodeSVG } from 'qrcode.react';

interface Customer {
  id: string;
  name: string;
  tax_id?: string;
  sector?: string;
  vat_number?: string;
}

interface Invoice {
  id: string;
  reference_number: string;
  amount: number;
  created_at: string;
  customer_id?: string;
  customers?: Customer;
}

export default function PublicInvoiceView({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vatRate, setVatRate] = useState(15);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    const savedRate = localStorage.getItem('sov_vat_rate');
    const savedLogo = localStorage.getItem('sov_logo');
    if (savedRate) setVatRate(parseFloat(savedRate));
    if (savedLogo) setLogo(savedLogo);
  }, []);

  const fetchInvoice = useCallback(() => {
    setLoading(true);
    try {
      const inv = localDB.findById('invoices', invoiceId);
      if (!inv) throw new Error('Invoice not found in local record');
      
      const customer = inv.customer_id ? localDB.findById('customers', inv.customer_id) : null;
      setInvoice({ ...inv, customers: customer });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>
            <Clock size={48} />
          </div>
          <h2 style={{ fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)' }}>جاري استرجاع السجل المؤسسي...</h2>
          <p style={{ opacity: 0.6, fontWeight: 700 }}>Alghwairy Local Ledger Secure Retrieval</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} color="var(--error)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--error)' }}>خطأ في استرجاع السجل</h2>
          <p style={{ opacity: 0.8, fontWeight: 700, marginBottom: '2rem' }}>لم يتم العثور على الفاتورة المطلوبة في قاعدة البيانات المحلية.</p>
          <button onClick={() => window.location.href = '/'} className="btn-executive" style={{ width: '100%' }}>العودة للرئيسية</button>
        </div>
      </div>
    );
  }

  const vatAmount = (invoice.amount || 0) * (vatRate / 100);
  const totalAmount = (invoice.amount || 0) + vatAmount;

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '2rem 1rem', fontFamily: 'Inter, Tajawal, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Verification Status */}
        <div style={{ 
          background: 'var(--primary)', 
          color: 'var(--secondary)', 
          padding: '1rem 2rem', 
          borderRadius: '16px 16px 0 0', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0,26,51,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ShieldCheck size={20} color="var(--secondary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 900, letterSpacing: '0.5px', color: 'white' }}>وثيقة رسمية موثقة • متوافقة مع متطلبات هيئة الزكاة والضريبة والجمارك</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={14} /> طباعة / تصدير PDF
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="card" style={{ borderRadius: '0 0 16px 16px', background: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ padding: '3.5rem', borderBottom: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>
                {logo ? (
                    <img src={logo} alt="Logo" style={{ height: 60, objectFit: 'contain' }} />
                ) : (
                    <ShieldCheck size={40} strokeWidth={2.5} color="var(--primary)" />
                )}
                <div>
                  <h1 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 950, letterSpacing: '-0.5px' }}>مؤسسة الغويري للتخليص الجمركي</h1>
                  <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, opacity: 0.6 }}>Alghwairy Customs Clearance</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 900 }}>الرقم الضريبي: {localStorage.getItem('sov_tax_number') || '310029384756382'}</p>
                <p style={{ margin: 0 }}>المقر الرئيسي: {localStorage.getItem('sov_address') || 'الرياض، المملكة العربية السعودية'}</p>
                <p style={{ margin: 0 }}>تواصل: {localStorage.getItem('sov_email') || 'info@alghwairy.com.sa'}</p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', fontWeight: 950, color: 'var(--primary)', letterSpacing: '-1px' }}>فاتورة ضريبية</h2>
              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.4rem', borderRight: '4px solid var(--secondary)', paddingRight: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>الرقم المرجعي: <span style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{invoice.reference_number}</span></p>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>تاريخ التحرير: <span style={{ color: 'var(--primary)' }}>{new Date(invoice.created_at).toLocaleDateString('ar-SA')}</span></p>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>حالة السجل: <span style={{ background: 'rgba(27, 94, 32, 0.1)', color: 'var(--success)', padding: '0.2rem 0.8rem', borderRadius: '4px', fontSize: '0.7rem' }}>موثق محلياً</span></p>
              </div>
            </div>
          </div>

          {/* Billing Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '4rem', padding: '3.5rem', background: '#fcfcfc' }}>
            <div dir="rtl">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1.2rem', letterSpacing: '1px' }}>بيانات العميل المستفيد</h4>
              <div style={{ padding: '1.5rem', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: 900, color: 'var(--primary)' }}>{invoice.customers?.name || 'عميل نقدي'}</h3>
                {invoice.customers?.vat_number && <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem', fontWeight: 700, opacity: 0.7 }}>الرقم الضريبي: {invoice.customers.vat_number}</p>}
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6, fontWeight: 600 }}>{invoice.customers?.sector || 'الخدمات اللوجستية'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--primary)', color: 'white', padding: '2rem', borderRadius: '24px', position: 'relative', overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,26,51,0.2)' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.8, fontWeight: 700 }}>إجمالي القيمة المستحقة (TOTAL)</p>
                <h2 style={{ fontSize: '2.8rem', margin: 0, fontWeight: 950, color: 'var(--secondary)' }}>{totalAmount.toLocaleString()} <span style={{ fontSize: '1rem', color: 'white' }}>ر.س</span></h2>
                <div style={{ position: 'absolute', right: '-10%', bottom: '-20%', width: '100px', height: '100px', background: 'rgba(212, 167, 106, 0.1)', borderRadius: '30px', transform: 'rotate(15deg)' }}></div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div style={{ padding: '0 3.5rem 3.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--primary)' }}>
                  <th style={{ padding: '1.2rem 1rem', textAlign: 'right', fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>بيان الخدمة</th>
                  <th style={{ padding: '1.2rem 1rem', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>الكمية</th>
                  <th style={{ padding: '1.2rem 1rem', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>السعر</th>
                  <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>المجموع الفرعي</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1.5rem 1rem', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                    خدمات التخليص الجمركي وإدارة سلاسل الإمداد
                    <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.4rem' }}>معرف السجل: {invoice.id}</div>
                  </td>
                  <td style={{ padding: '1.5rem 1rem', textAlign: 'center', fontWeight: 700 }}>1</td>
                  <td style={{ padding: '1.5rem 1rem', textAlign: 'center', fontWeight: 700 }}>{Number(invoice.amount).toLocaleString()}</td>
                  <td style={{ padding: '1.5rem 1rem', textAlign: 'left', fontWeight: 900, color: 'var(--primary)' }}>{Number(invoice.amount).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Calculations */}
            <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '150px', textAlign: 'center' }}>
                <QRCodeSVG value={`https://alghwairy.fin/verify/${invoice.id}`} size={120} level="M" />
                <p style={{ margin: '1rem 0 0 0', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>توثيق هيئة الزكاة</p>
              </div>

              <div style={{ width: '380px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 800, color: '#64748b' }}>إجمالي المبلغ (غير شامل الضريبة)</span>
                  <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{Number(invoice.amount).toLocaleString()} ر.س</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 800, color: '#64748b' }}>ضريبة القيمة المضافة ({vatRate}%)</span>
                  <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{vatAmount.toLocaleString()} ر.س</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', marginTop: '1rem' }}>
                  <span style={{ fontSize: '1.3rem', fontWeight: 950, color: 'var(--primary)' }}>الإجمالي النهائي</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--primary)' }}>{totalAmount.toLocaleString()} ر.س</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '3.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: '1.8', fontWeight: 700 }}>
                هذا المستند يعتبر مستنداً رسمياً صادراً عن مؤسسة الغويري للتخليص الجمركي.
                جميع البيانات محفوظة في السجل المركزي للمؤسسة وموثقة محلياً لضمان السيادة الرقمية والامتثال الضريبي الكامل.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2.5rem', opacity: 0.6 }}>
                 <p style={{ fontSize: '0.75rem', fontWeight: 900 }}><Phone size={12} /> {localStorage.getItem('sov_phone') || '920000000'}</p>
                 <p style={{ fontSize: '0.75rem', fontWeight: 900 }}><Globe size={12} /> alghwairy.com.sa</p>
                 <p style={{ fontSize: '0.75rem', fontWeight: 900 }}><FileText size={12} /> Institutional Ledger v4.1</p>
              </div>
            </div>
          </div>

        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8' }}>© 2026 مؤسسة الغويري للتخليص الجمركي - كافة الحقوق محفوظة</p>
        </div>

      </div>
    </div>
  );
}
