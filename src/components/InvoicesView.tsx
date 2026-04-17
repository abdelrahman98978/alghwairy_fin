import React, { useState, useEffect, useCallback } from 'react';
// No icons used in this view
import { localDB } from '../lib/localDB';
import type { Invoice } from '../lib/localDB';
import { QRCodeSVG } from 'qrcode.react';

interface InvoicesViewProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
  logActivity: (action: string, entity: string, entity_id?: string) => void;
  t: any;
}

const BarcodeSVG = ({ value }: { value: string }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
    <svg width="150" height="40"><rect width="150" height="40" fill="white" />
      {value.split('').map((char, i) => (
        <rect key={i} x={10 + i * 4} y={5} width={char.charCodeAt(0) % 3 + 1} height={30} fill="black" />
      ))}
    </svg>
    <span style={{ fontSize: '7pt', fontFamily: 'monospace', marginTop: '1mm' }}>{value}</span>
  </div>
);

export default function InvoicesView({ showToast, logActivity, t }: InvoicesViewProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [searchTerm] = useState('');
  const [filterType] = useState('all');

  const settings = {
    companyName: 'مؤسسة الغويري للتخليص الجمركي',
    taxNumber: '310294857200003',
    address: 'الرياض - المملكة العربية السعودية',
    logo: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
  };

  const [formData, setFormData] = useState({
    customerId: '', amount: '', reference: '', isSettlement: false, invoiceType: 'final',
    statementNumber: '', bolNumber: '', operationNumber: '', customsFees: '0', portFees: '0', transportFees: '0', transportExpenses: '0', cargoValue: '0'
  });

  const loadData = useCallback(() => {
    const invs = localDB.getActive('invoices') as Invoice[];
    const custs = localDB.getActive('customers') as any[];
    const joined = invs.map(inv => ({ 
      ...inv, 
      customers: custs.find(c => c.id === inv.customer_id) 
    }));
    setInvoices(joined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setCustomers(custs);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount) || 0;
    const customs = parseFloat(formData.customsFees) || 0;
    const port = parseFloat(formData.portFees) || 0;
    const transport = parseFloat(formData.transportFees) || 0;
    const expenses = parseFloat(formData.transportExpenses) || 0;
    
    // Profit = Revenue - (Customs + Ports + Transport + General Transport Expenses)
    const profit = amount - (customs + port + transport + expenses);
    
    // User requested to remove Zakat and Tax from these invoices
    const vat = 0; 
    const total = amount;

    const newInvoice: Partial<Invoice> = {
      customer_id: formData.customerId, 
      amount, 
      vat,
      total,
      status: 'pending', 
      reference_number: formData.reference || `INV-${Date.now()}`,
      is_settlement: formData.isSettlement, 
      invoice_type: formData.invoiceType as 'internal' | 'final',
      statement_number: formData.statementNumber, 
      bol_number: formData.bolNumber,
      operation_number: formData.operationNumber, 
      customs_fees: customs, 
      port_fees: port,
      transport_fees: transport, 
      transport_expenses: expenses,
      cargo_value: parseFloat(formData.cargoValue) || 0, 
      profit
    };

    const inserted = localDB.insert('invoices', newInvoice);

    // Automatic Accounting System: Journal Entry
    // Debit: Accounts Receivable (العملاء)
    // Credit: Sales Revenue (إيرادات المبيعات)
    localDB.addJournalEntry({
      date: new Date().toISOString(),
      description: `Invoice ${inserted.reference_number} - ${formData.invoiceType === 'final' ? 'عميل نهائي' : 'داخلي'}`,
      reference_type: 'invoice',
      reference_id: inserted.id,
      debit_account: 'Accounts Receivable',
      credit_account: 'Sales Revenue',
      amount: total,
      status: 'posted'
    });

    logActivity('Created Invoice & Posted to Ledger', 'invoices', inserted.id);
    showToast(t.notifications?.success || 'Success', 'success');
    setShowAddModal(false);
    loadData();
    setFormData({ customerId: '', amount: '', reference: '', isSettlement: false, invoiceType: 'final', statementNumber: '', bolNumber: '', operationNumber: '', customsFees: '0', portFees: '0', transportFees: '0', transportExpenses: '0', cargoValue: '0' });
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.reference_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (inv.customers?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (inv.operation_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    return filterType === 'all' ? matchesSearch : matchesSearch && inv.status === filterType;
  });

  return (
    <div className="view-container slide-in" dir="rtl">
      <div className="view-header">
        <div>
          <h1 className="page-title">نظام المحاسبة والشحن</h1>
          <p className="page-subtitle">تخليص جمركي - لوجستيات - أرباح تلقائية</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-executive">إنشاء فاتورة</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <MetricCard title="الإيرادات" value={invoices.reduce((sum, i) => sum + i.total, 0)} color="blue" />
        <MetricCard title="الأرباح" value={invoices.reduce((sum, i) => sum + (i.profit || 0), 0)} color="green" />
        <MetricCard title="المخزون" value={invoices.reduce((sum, i) => sum + (i.cargo_value || 0), 0)} color="orange" />
        <MetricCard title="الرسوم" value={invoices.reduce((sum, i) => sum + ((i.customs_fees || 0) + (i.port_fees || 0)), 0)} color="slate" />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="sovereign-table">
          <thead>
            <tr>
              <th>البيان/العملية</th>
              <th>العميل</th>
              <th>الأرباح</th>
              <th>الإجمالي</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(inv => (
              <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }}>
                <td style={{ fontWeight: '900' }}>{inv.operation_number || inv.reference_number}</td>
                <td style={{ fontWeight: '700' }}>{inv.customers?.name || 'عميل'}</td>
                <td style={{ color: 'var(--color-success)', fontWeight: '900' }}>{inv.profit?.toLocaleString()}</td>
                <td style={{ color: 'var(--color-primary)', fontWeight: '900' }}>{inv.total.toLocaleString()}</td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: 'var(--radius-full)', 
                    fontSize: '12px', 
                    fontWeight: '900',
                    backgroundColor: inv.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                    color: inv.status === 'paid' ? 'var(--color-success)' : 'var(--color-warning)'
                  }}>
                    {inv.status === 'paid' ? 'مدفوعة' : 'انتظار'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2 className="modal-title">فاتورة شحن جديدة</h2>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
               <select className="input-executive" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                 <option value="">اختر العميل</option>
                 {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <select className="input-executive" value={formData.invoiceType} onChange={e => setFormData({...formData, invoiceType: e.target.value})}>
                 <option value="final">فاتورة نهائية</option>
                 <option value="internal">فاتورة داخلية</option>
               </select>
               <input type="text" placeholder="رقم العملية" className="input-executive" value={formData.operationNumber} onChange={e => setFormData({...formData, operationNumber: e.target.value})} />
               <input type="text" placeholder="رقم البيان" className="input-executive" value={formData.statementNumber} onChange={e => setFormData({...formData, statementNumber: e.target.value})} />
               <input type="text" placeholder="رقم البوليصة (BOL)" className="input-executive" value={formData.bolNumber} onChange={e => setFormData({...formData, bolNumber: e.target.value})} />
               <input type="number" placeholder="قيمة الشحنة (المخزون)" className="input-executive" value={formData.cargoValue} onChange={e => setFormData({...formData, cargoValue: e.target.value})} />
               
               <div style={{ gridColumn: 'span 2', marginTop: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-sm)', borderBottom: '1px solid var(--border-color)' }}>
                 <h4 style={{ fontWeight: '900', color: 'var(--color-text-secondary)' }}>التكاليف والإيرادات</h4>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <label style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>إجمالي التحصيل (الإيراد)</label>
                 <input type="number" placeholder="قيمة الخدمة" className="input-executive" style={{ backgroundColor: '#eff6ff', fontWeight: '900' }} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <label style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>رسوم الجمارك</label>
                 <input type="number" placeholder="رسوم الجمارك" className="input-executive" style={{ backgroundColor: '#fef2f2' }} value={formData.customsFees} onChange={e => setFormData({...formData, customsFees: e.target.value})} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <label style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>رسوم الموانئ</label>
                 <input type="number" placeholder="رسوم الموانئ" className="input-executive" style={{ backgroundColor: '#fef2f2' }} value={formData.portFees} onChange={e => setFormData({...formData, portFees: e.target.value})} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <label style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>أجور النقل</label>
                 <input type="number" placeholder="أجور النقل" className="input-executive" style={{ backgroundColor: '#fef2f2' }} value={formData.transportFees} onChange={e => setFormData({...formData, transportFees: e.target.value})} />
               </div>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                 <label style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>مصروفات إضافية (نقل)</label>
                 <input type="number" placeholder="مصروفات إضافية" className="input-executive" style={{ backgroundColor: '#fef2f2' }} value={formData.transportExpenses} onChange={e => setFormData({...formData, transportExpenses: e.target.value})} />
               </div>

               <div style={{ gridColumn: 'span 2', display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                 <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ backgroundColor: 'transparent', color: 'var(--color-text)', border: '1px solid var(--border-color)' }}>إلغاء</button>
                 <button type="submit" className="btn-executive" style={{ backgroundColor: 'var(--color-primary)' }}>حفظ الفاتورة والترحيل للمحاسبة</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {showPreviewModal && selectedInvoice && (
        <InvoicePreview invoice={selectedInvoice} settings={settings} onClose={() => setShowPreviewModal(false)} />
      )}
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: number; color: 'blue' | 'green' | 'orange' | 'slate' }) {
  const colorMap = { 
    blue: { bg: 'rgba(59, 130, 246, 0.1)', text: '#1d4ed8', border: 'rgba(59, 130, 246, 0.2)' },
    green: { bg: 'rgba(16, 185, 129, 0.1)', text: '#047857', border: 'rgba(16, 185, 129, 0.2)' },
    orange: { bg: 'rgba(245, 158, 11, 0.1)', text: '#b45309', border: 'rgba(245, 158, 11, 0.2)' },
    slate: { bg: 'var(--bg-secondary)', text: 'var(--color-text)', border: 'var(--border-color)' }
  };
  const c = colorMap[color];
  return (
    <div className="card" style={{ backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <p style={{ fontSize: '12px', fontWeight: '900', opacity: 0.8, margin: 0 }}>{title}</p>
      <h3 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>{value.toLocaleString()} <span style={{ fontSize: '10px' }}>SAR</span></h3>
    </div>
  );
}

interface InvoicePreviewProps {
  invoice: Invoice;
  settings: any;
  onClose: () => void;
}

function InvoicePreview({ invoice, settings, onClose }: InvoicePreviewProps) {
  const sovereignQRData = JSON.stringify({ 
    op: invoice.operation_number || invoice.id, 
    client: invoice.customers?.name || 'Customer', 
    dec: invoice.statement_number,
    bol: invoice.bol_number,
    customs: invoice.customs_fees,
    port: invoice.port_fees,
    inventory: invoice.cargo_value,
    total: invoice.total.toLocaleString()
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 100, overflow: 'auto', padding: '20px' }} dir="rtl">
      <div className="card" style={{ 
        width: '210mm', 
        minHeight: '297mm', 
        margin: '0 auto', 
        position: 'relative', 
        backgroundColor: '#fff', 
        padding: '10mm',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
      }}>
        <button onClick={onClose} className="btn-executive" style={{ position: 'absolute', top: '20px', left: '20px', padding: '8px 16px', backgroundColor: 'var(--bg-secondary)', color: 'var(--color-text)', border: '1px solid var(--border-color)' }}>
            إغلاق
        </button>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid var(--color-primary)', paddingBottom: '24px', marginBottom: '24px' }}>
           <div>
               <h1 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>{settings.companyName}</h1>
               <p style={{ fontSize: '14px', fontWeight: 'bold', opacity: 0.6, margin: 0 }}>تخليص جمركي ولوجستيات</p>
           </div>
           <div style={{ textAlign: 'left' }}>
               <div style={{ backgroundColor: 'var(--color-primary)', color: '#fff', padding: '8px 16px', fontWeight: '900', borderRadius: '4px' }}>
                   {invoice.invoice_type === 'final' ? 'فاتورة نهائية' : 'فاتورة داخلية'}
               </div>
           </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '32px' }}>
           <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '16px', borderRadius: 'var(--radius-md)' }}>
               <h4 style={{ fontWeight: '900', marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>العميل</h4>
               <p style={{ fontWeight: 'bold', fontSize: '18px', margin: '0 0 8px 0' }}>{invoice.customers?.name}</p>
               <p style={{ fontSize: '12px', margin: 0 }}>تاريخ الإصدار: {new Date(invoice.created_at).toLocaleDateString()}</p>
           </div>
           <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
             <h4 style={{ fontWeight: '900', marginBottom: '8px', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '4px', color: '#1d4ed8' }}>بيانات الخدمة</h4>
             <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0' }}>رقم العملية: {invoice.operation_number}</p>
             <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 4px 0' }}>رقم البيان: {invoice.statement_number}</p>
             <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>رقم البوليصة: {invoice.bol_number || 'N/A'}</p>
           </div>
        </div>
        <table style={{ width: '100%', marginBottom: '32px', borderCollapse: 'collapse' }}>
           <thead style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
               <tr>
                   <th style={{ padding: '12px', textAlign: 'right' }}>الوصف</th>
                   <th style={{ padding: '12px', textAlign: 'center' }}>المبلغ</th>
               </tr>
           </thead>
           <tbody>
             <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                 <td style={{ padding: '16px', fontWeight: 'bold' }}>خدمات التخليص الجمركي واللوجستي</td>
                 <td style={{ padding: '16px', textAlign: 'center', fontWeight: 'bold' }}>{invoice.amount.toLocaleString()} ر.س</td>
             </tr>
             {invoice.customs_fees ? <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}><td style={{ padding: '8px 16px', fontSize: '14px' }}>رسوم الجمارك</td><td style={{ padding: '8px 16px', textAlign: 'center', fontSize: '14px' }}>{invoice.customs_fees.toLocaleString()} ر.س</td></tr> : null}
             {invoice.port_fees ? <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}><td style={{ padding: '8px 16px', fontSize: '14px' }}>أجور الموانئ</td><td style={{ padding: '8px 16px', textAlign: 'center', fontSize: '14px' }}>{invoice.port_fees.toLocaleString()} ر.س</td></tr> : null}
             {invoice.transport_fees ? <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}><td style={{ padding: '8px 16px', fontSize: '14px' }}>أجور النقل</td><td style={{ padding: '8px 16px', textAlign: 'center', fontSize: '14px' }}>{invoice.transport_fees.toLocaleString()} ر.س</td></tr> : null}
           </tbody>
        </table>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid var(--border-color)' }}>
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
             <div style={{ padding: '10px', border: '2px solid var(--color-primary)', borderRadius: '12px' }}>
                <QRCodeSVG value={sovereignQRData} size={110} level="H" includeMargin />
             </div>
             <p style={{ fontSize: '10px', textAlign: 'center', marginTop: '8px', fontWeight: '900', color: 'var(--color-primary)' }}>التحقق السيادي QR</p>
             <div style={{ marginTop: '16px' }}>
                <p style={{ fontSize: '8px', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px', opacity: 0.6 }}>تتبع الباركود النشط</p>
                <BarcodeSVG value={`${invoice.operation_number || invoice.id}-${invoice.bol_number || 'N/A'}`} />
             </div>
           </div>
           <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--color-text-secondary)' }}>
                  <span>إجمالي المخزون (Cargo Value):</span>
                  <span>{invoice.cargo_value?.toLocaleString()} ر.س</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', fontSize: '20px', borderBottom: '2px solid var(--color-primary)', paddingBottom: '4px', marginTop: '16px' }}>
                  <span>المبلغ المستحق:</span>
                  <span>{invoice.total.toLocaleString()} ر.س</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '900', color: '#047857', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '8px', borderRadius: '8px', fontSize: '18px' }}>
                  <span>صافي الربح التلقائي:</span>
                  <span>{invoice.profit?.toLocaleString()} ر.س</span>
              </div>
           </div>
        </div>
        <div style={{ marginTop: '48px', textAlign: 'center', fontSize: '10px', color: 'var(--color-text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>هذه الفاتورة تم إنشاؤها تلقائياً بواسطة نظام الغويري المحاسبي</div>
      </div>
    </div>
  );
}

