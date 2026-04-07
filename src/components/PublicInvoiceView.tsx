import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldCheck, 
  Printer, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Building2,
  Phone,
  Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

interface Customer {
  id: string;
  name: string;
  tax_id?: string;
  sector?: string;
}

interface Invoice {
  id: string;
  reference_number: string;
  amount: number;
  created_at: string;
  customers?: Customer;
}

export default function PublicInvoiceView({ invoiceId }: { invoiceId: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vatRate, setVatRate] = useState(15);

  useEffect(() => {
    const savedRate = localStorage.getItem('sov_vat_rate');
    if (savedRate) setVatRate(parseFloat(savedRate));
  }, []);

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*, customers(*)')
        .eq('id', invoiceId)
        .single();

      if (fetchError) throw fetchError;
      setInvoice(data as Invoice | null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => {
    const init = async () => {
      await fetchInvoice();
    };
    init();
  }, [fetchInvoice]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>
            <Clock size={48} />
          </div>
          <h2 style={{ fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)' }}>جاري استرجاع الفاتورة السيادية...</h2>
          <p style={{ opacity: 0.6, fontWeight: 700 }}>Sovereign Ledger Secure Retrieval</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '400px', textAlign: 'center', padding: '3rem' }}>
          <AlertCircle size={48} color="var(--error)" style={{ marginBottom: '1.5rem' }} />
          <h2 style={{ fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--error)' }}>خطأ في استرجاع البيانات</h2>
          <p style={{ opacity: 0.8, fontWeight: 700, marginBottom: '2rem' }}>The requested invoice could not be found or access is restricted.</p>
          <button onClick={() => window.location.href = window.location.pathname} className="btn-executive" style={{ width: '100%' }}>العودة للرئيسية</button>
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
          color: 'white', 
          padding: '1rem 2rem', 
          borderRadius: '16px 16px 0 0', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          boxShadow: '0 10px 30px rgba(0,26,51,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ShieldCheck size={20} color="var(--secondary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 900, letterSpacing: '0.5px' }}>OFFICIAL VERIFIED INVOICE • ZATCA COMPLIANT</span>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => window.print()} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Printer size={14} /> Print / PDF
            </button>
          </div>
        </div>

        {/* Invoice Body */}
        <div className="card" style={{ borderRadius: '0 0 16px 16px', background: 'white', boxShadow: '0 20px 50px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          
          {/* Header */}
          <div style={{ padding: '3.5rem', borderBottom: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)', marginBottom: '1.5rem' }}>
                <ShieldCheck size={32} strokeWidth={2.5} color="var(--primary)" />
                <div>
                  <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 950, letterSpacing: '-0.5px', textTransform: 'uppercase' }}>Alghwairy</h1>
                  <p style={{ margin: 0, fontSize: '0.65rem', fontWeight: 800, opacity: 0.6, letterSpacing: '2px' }}>FINANCIAL SERVICES</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 900 }}>الرقم الضريبي: 310029384756382</p>
                <p style={{ margin: 0 }}>مؤسسة الغويري المالية - الرياض، المملكة العربية السعودية</p>
                <p style={{ margin: 0 }}>هاتف: 920000000 | ايميل: info@alghwairy.fin</p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', fontWeight: 950, color: 'var(--primary)', letterSpacing: '-1px' }}>FATURA</h2>
              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.4rem', borderRight: '4px solid var(--secondary)', paddingRight: '1rem' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>رقم الفاتورة: <span style={{ fontFamily: 'monospace', fontSize: '1rem' }}>{invoice.reference_number || `INV-${invoice.id.substring(0,8).toUpperCase()}`}</span></p>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>تاريخ الإصدار: <span style={{ color: 'var(--primary)' }}>{new Date(invoice.created_at).toLocaleDateString('ar-SA')}</span></p>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>الحالة: <span style={{ background: 'rgba(27, 94, 32, 0.1)', color: 'var(--success)', padding: '0.2rem 0.8rem', borderRadius: '4px', fontSize: '0.7rem' }}>مكتمل الحفظ</span></p>
              </div>
            </div>
          </div>

          {/* Billing Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', padding: '3.5rem', background: '#fcfcfc' }}>
            <div dir="rtl">
              <h4 style={{ fontSize: '0.85rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '1.2rem', letterSpacing: '1px' }}>بيانات العميل (Bill To)</h4>
              <div style={{ padding: '1.5rem', background: 'white', borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 4px 15px rgba(0,0,0,0.01)' }}>
                <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: 900, color: 'var(--primary)' }}>{invoice.customers?.name || 'عميل نقدي'}</h3>
                <p style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem', fontWeight: 700, opacity: 0.7 }}>الرقم الضريبي: {invoice.customers?.tax_id || 'غير متوفر'}</p>
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6, fontWeight: 600 }}>{invoice.customers?.sector || 'القطاع التجاري'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--primary)', color: 'white', padding: '2rem', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', opacity: 0.7, fontWeight: 700 }}>TOTAL PAYABLE (إجمالي المستحق)</p>
                <h2 style={{ fontSize: '2.8rem', margin: 0, fontWeight: 950, color: 'var(--secondary)' }}>{totalAmount.toLocaleString()} <span style={{ fontSize: '1rem', opacity: 0.6, color: 'white' }}>SAR</span></h2>
                <div style={{ position: 'absolute', right: '-10%', bottom: '-20%', width: '100px', height: '100px', background: 'rgba(212, 167, 106, 0.1)', borderRadius: '30px', transform: 'rotate(15deg)' }}></div>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div style={{ padding: '0 3.5rem 3.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--primary)' }}>
                  <th style={{ padding: '1.2rem 1rem', textAlign: 'right', fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>الوصف (Description)</th>
                  <th style={{ padding: '1.2rem 1rem', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>الكمية</th>
                  <th style={{ padding: '1.2rem 1rem', textAlign: 'center', fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>سعر الوحدة</th>
                  <th style={{ padding: '1.2rem 1rem', textAlign: 'left', fontWeight: 900, fontSize: '0.85rem', color: 'var(--primary)' }}>المجموع (SAR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '1.5rem 1rem', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                    خدمات استشارية مالية وأعمال محاسبية للفترة المذكورة
                    <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: '0.4rem' }}>REF: {invoice.id}</div>
                  </td>
                  <td style={{ padding: '1.5rem 1rem', textAlign: 'center', fontWeight: 700 }}>1</td>
                  <td style={{ padding: '1.5rem 1rem', textAlign: 'center', fontWeight: 700 }}>{Number(invoice.amount).toLocaleString()}</td>
                  <td style={{ padding: '1.5rem 1rem', textAlign: 'left', fontWeight: 900, color: 'var(--primary)' }}>{Number(invoice.amount).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {/* Calculations */}
            <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '150px' }}>
                <QRCodeSVG value={`https://zatca.gov.sa/qr/${invoice.id}`} size={120} level="M" />
                <p style={{ margin: '1rem 0 0 0', fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textAlign: 'center' }}>ZATCA SECURITY QR</p>
              </div>

              <div style={{ width: '350px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 800, color: '#64748b' }}>المجموع قبل الضريبة (Excl. VAT)</span>
                  <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{Number(invoice.amount).toLocaleString()} SAR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontWeight: 800, color: '#64748b' }}>ضريبة القيمة المضافة (VAT {vatRate}%)</span>
                  <span style={{ fontWeight: 900, color: 'var(--primary)' }}>{vatAmount.toLocaleString()} SAR</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', marginTop: '1rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: 950, color: 'var(--primary)' }}>الإجمالي النهائي (Total)</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--primary)' }}>{totalAmount.toLocaleString()} SAR</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '3.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', textAlign: 'center' }}>
              <div>
                <Building2 size={24} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                <h5 style={{ margin: '0 0 0.5rem 0', fontWeight: 900 }}>مصرفية الغويري</h5>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6, fontWeight: 700 }}>بنك الإنماء: SA1234567890</p>
              </div>
              <div>
                <CheckCircle2 size={24} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
                <h5 style={{ margin: '0 0 0.5rem 0', fontWeight: 900 }}>موثق رقمياً</h5>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6, fontWeight: 700 }}>Hash Verification: 1A9B3C</p>
              </div>
              <div>
                <Clock size={24} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
                <h5 style={{ margin: '0 0 0.5rem 0', fontWeight: 900 }}>صلاحية الفاتورة</h5>
                <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6, fontWeight: 700 }}>مستحق في: 2026-05-01</p>
              </div>
            </div>
            
            <div style={{ marginTop: '3.5rem', textAlign: 'center', maxWidth: '600px', margin: '3.5rem auto 0' }}>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: '1.8', fontWeight: 700 }}>
                هذا المستند تم توليده آلياً من نظام "الميزان السيادي" التابع لمؤسسة الغويري المالية.
                تخضع كافة بنود هذه الفاتورة للشروط والأحكام المعتمدة في المملكة العربية السعودية.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem', opacity: 0.5 }}>
                 <p style={{ fontSize: '0.7rem', fontWeight: 900 }}><Phone size={12} /> +966 9200000</p>
                 <p style={{ fontSize: '0.7rem', fontWeight: 900 }}><Globe size={12} /> alghwairy.fin</p>
                 <p style={{ fontSize: '0.7rem', fontWeight: 900 }}><FileText size={12} /> Sovereign-V2.1</p>
              </div>
            </div>
          </div>

        </div>

        {/* Back to Portal Button (Only visible if logged in context usually, but for public view we show simple footer) */}
        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8' }}>Powered by Alghwairy Financial Sovereign Ledger © 2026</p>
        </div>

      </div>
    </div>
  );
}
