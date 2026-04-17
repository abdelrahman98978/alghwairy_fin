import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package, Printer, Download, ShieldCheck, CheckCircle2, MessageCircle, Mail, Plus, DollarSign, TrendingUp, FileText, X
} from 'lucide-react';
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

  const settings = {
    companyName: 'مؤسسة الغويري للتخليص الجمركي',
    taxNumber: '310294857200003',
    address: 'الرياض - المملكة العربية السعودية',
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

  const handleMarkPaid = useCallback((invoiceId: string) => {
    localDB.update('invoices', invoiceId, { status: 'paid' });
    logActivity('Marked Invoice as Paid', 'invoices', invoiceId);
    showToast('تم تحديث حالة الفاتورة إلى مدفوعة ✓', 'success');
    loadData();
    setShowPreviewModal(false);
  }, [loadData, logActivity, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.amount) || 0;
    const customs = parseFloat(formData.customsFees) || 0;
    const port = parseFloat(formData.portFees) || 0;
    const transport = parseFloat(formData.transportFees) || 0;
    const expenses = parseFloat(formData.transportExpenses) || 0;
    const profit = amount - (customs + port + transport + expenses);
    const vat = 0;
    const total = amount;

    const newInvoice: Partial<Invoice> = {
      customer_id: formData.customerId,
      amount, vat, total,
      status: 'pending',
      reference_number: formData.reference || `INV-${Date.now()}`,
      is_settlement: formData.isSettlement,
      invoice_type: formData.invoiceType as 'internal' | 'final',
      statement_number: formData.statementNumber,
      bol_number: formData.bolNumber,
      operation_number: formData.operationNumber,
      customs_fees: customs, port_fees: port,
      transport_fees: transport, transport_expenses: expenses,
      cargo_value: parseFloat(formData.cargoValue) || 0,
      profit
    };

    const inserted = localDB.insert('invoices', newInvoice);

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
    showToast(t.notifications?.success || 'تم إصدار الفاتورة بنجاح', 'success');
    setShowAddModal(false);
    loadData();
    setFormData({ customerId: '', amount: '', reference: '', isSettlement: false, invoiceType: 'final', statementNumber: '', bolNumber: '', operationNumber: '', customsFees: '0', portFees: '0', transportFees: '0', transportExpenses: '0', cargoValue: '0' });
  };

  // KPI Calculations
  const totalRevenue = useMemo(() => invoices.reduce((sum, i) => sum + i.total, 0), [invoices]);
  const totalProfit = useMemo(() => invoices.reduce((sum, i) => sum + (i.profit || 0), 0), [invoices]);
  const totalCargo = useMemo(() => invoices.reduce((sum, i) => sum + (i.cargo_value || 0), 0), [invoices]);
  const totalFees = useMemo(() => invoices.reduce((sum, i) => sum + ((i.customs_fees || 0) + (i.port_fees || 0)), 0), [invoices]);

  return (
    <div className="slide-in" dir="rtl">
      {/* Header */}
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>نظام الفاتورة اللوجستية</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>تخليص جمركي — شحن — تتبع الأرباح التلقائية</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
            <Download size={16} /> تصدير
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-executive" style={{ border: 'none' }}>
            <Plus size={18} /> إنشاء فاتورة
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <KPICard title="إجمالي الإيرادات" value={totalRevenue} icon={<DollarSign size={22} />} color="var(--primary)" />
        <KPICard title="صافي الأرباح" value={totalProfit} icon={<TrendingUp size={22} />} color="var(--success)" />
        <KPICard title="قيمة المخزون" value={totalCargo} icon={<Package size={22} />} color="var(--secondary)" />
        <KPICard title="الرسوم الحكومية" value={totalFees} icon={<ShieldCheck size={22} />} color="var(--error)" />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
        <div style={{ padding: '1.5rem 2rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'Tajawal', fontWeight: 900, margin: 0, color: 'var(--primary)' }}>سجل الفواتير المؤسسي</h3>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--secondary)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '10px' }}>ZATCA PHASE II</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table">
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2rem' }}>البيان / العملية</th>
                <th>العميل</th>
                <th style={{ textAlign: 'center' }}>الأرباح</th>
                <th style={{ textAlign: 'center' }}>الإجمالي</th>
                <th style={{ textAlign: 'center', paddingInlineEnd: '2rem' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '5rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>لا توجد فواتير مسجلة حالياً</td></tr>
              ) : (
                invoices.map(inv => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }}>
                    <td style={{ paddingInlineStart: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ padding: '0.6rem', background: 'var(--surface-container-high)', borderRadius: '10px', color: 'var(--primary)' }}><FileText size={16} /></div>
                        <div>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', display: 'block' }}>{inv.operation_number || inv.reference_number}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>BOL: {inv.bol_number || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>{inv.customers?.name || 'عميل'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--success)' }}>{(inv.profit || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--primary)' }}>{inv.total.toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>SAR</span></td>
                    <td style={{ textAlign: 'center', paddingInlineEnd: '2rem' }}>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: 900,
                        background: inv.status === 'paid' ? 'rgba(27, 94, 32, 0.1)' : 'rgba(212, 167, 106, 0.15)',
                        color: inv.status === 'paid' ? 'var(--success)' : 'var(--secondary)'
                      }}>
                        {inv.status === 'paid' ? 'مدفوعة' : 'قيد المعالجة'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '720px', padding: 0, position: 'relative', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            {/* Modal Header */}
            <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary)', padding: '0.8rem', borderRadius: '14px', color: 'var(--secondary)' }}><FileText size={22} /></div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>فاتورة شحن جديدة</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreate} style={{ padding: '2.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                <FormField label="العميل">
                  <select className="input-executive" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} style={{ fontWeight: 700 }}>
                    <option value="">اختر العميل</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormField>
                <FormField label="نوع الفاتورة">
                  <select className="input-executive" value={formData.invoiceType} onChange={e => setFormData({...formData, invoiceType: e.target.value})} style={{ fontWeight: 700 }}>
                    <option value="final">فاتورة نهائية</option>
                    <option value="internal">فاتورة داخلية</option>
                  </select>
                </FormField>
                <FormField label="رقم العملية">
                  <input type="text" className="input-executive" value={formData.operationNumber} onChange={e => setFormData({...formData, operationNumber: e.target.value})} style={{ fontWeight: 700 }} />
                </FormField>
                <FormField label="رقم البيان الجمركي">
                  <input type="text" className="input-executive" value={formData.statementNumber} onChange={e => setFormData({...formData, statementNumber: e.target.value})} style={{ fontWeight: 700 }} />
                </FormField>
                <FormField label="رقم البوليصة (BOL)">
                  <input type="text" className="input-executive" value={formData.bolNumber} onChange={e => setFormData({...formData, bolNumber: e.target.value})} style={{ fontWeight: 700 }} />
                </FormField>
                <FormField label="قيمة الشحنة (المخزون)">
                  <input type="number" className="input-executive" value={formData.cargoValue} onChange={e => setFormData({...formData, cargoValue: e.target.value})} style={{ fontWeight: 700 }} />
                </FormField>
              </div>

              {/* Costs Section */}
              <div style={{ padding: '1.5rem', background: 'rgba(212, 167, 106, 0.05)', borderRadius: '16px', border: '1px solid rgba(212, 167, 106, 0.15)', marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '1rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', marginBottom: '1.2rem', margin: '0 0 1.2rem' }}>التكاليف والإيرادات</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                  <FormField label="إجمالي التحصيل">
                    <input type="number" className="input-executive" style={{ fontWeight: 900, background: 'rgba(27, 94, 32, 0.04)' }} value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                  </FormField>
                  <FormField label="رسوم الجمارك">
                    <input type="number" className="input-executive" style={{ fontWeight: 700 }} value={formData.customsFees} onChange={e => setFormData({...formData, customsFees: e.target.value})} />
                  </FormField>
                  <FormField label="رسوم الموانئ">
                    <input type="number" className="input-executive" style={{ fontWeight: 700 }} value={formData.portFees} onChange={e => setFormData({...formData, portFees: e.target.value})} />
                  </FormField>
                  <FormField label="أجور النقل">
                    <input type="number" className="input-executive" style={{ fontWeight: 700 }} value={formData.transportFees} onChange={e => setFormData({...formData, transportFees: e.target.value})} />
                  </FormField>
                  <FormField label="مصروفات إضافية">
                    <input type="number" className="input-executive" style={{ fontWeight: 700 }} value={formData.transportExpenses} onChange={e => setFormData({...formData, transportExpenses: e.target.value})} />
                  </FormField>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>إلغاء</button>
                <button type="submit" className="btn-executive" style={{ flex: 2, border: 'none', padding: '1rem', fontSize: '1.05rem' }}>
                  <CheckCircle2 size={20} /> حفظ الفاتورة والترحيل للمحاسبة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedInvoice && (
        <InvoicePreview invoice={selectedInvoice} settings={settings} onClose={() => setShowPreviewModal(false)} onMarkPaid={handleMarkPaid} />
      )}
    </div>
  );
}

/* ── Helper Components ── */

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--on-surface)' }}>{label}</label>
      {children}
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="card" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderInlineStart: `5px solid ${color}` }}>
      <div>
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 800, marginBottom: '0.4rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)', margin: 0, fontFamily: 'Tajawal', fontWeight: 900 }}>
          {value.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 700 }}>SAR</span>
        </h3>
      </div>
      <div style={{ padding: '1rem', borderRadius: '14px', background: 'var(--surface-container-high)', color }}>{icon}</div>
    </div>
  );
}

function InvoicePreview({ invoice, settings, onClose, onMarkPaid }: { invoice: Invoice; settings: any; onClose: () => void; onMarkPaid?: (id: string) => void }) {
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

  const handleWhatsApp = () => {
    const text = `*${settings.companyName}*\n\n` +
                 `عزيزنا العميل: ${invoice.customers?.name || 'العميل'}\n` +
                 `فاتورة رقم: ${invoice.operation_number || invoice.id}\n` +
                 `الإجمالي المستحق: ${invoice.total.toLocaleString()} ر.س\n\n` +
                 `للاطلاع على تفاصيل الفاتورة أو الدفع، يرجى التواصل معنا.\n` +
                 `نسعد بخدمتكم دائماً.`;
    const phone = invoice.customers?.phone?.replace(/\D/g, '') || '';
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleEmail = () => {
    const subject = `فاتورة رقم ${invoice.operation_number || invoice.id} - ${settings.companyName}`;
    const body = `عزيزنا العميل: ${invoice.customers?.name || 'العميل'}\n\n` +
                 `تجدون أدناه تفاصيل الفاتورة الخاصة بكم:\n` +
                 `رقم الفاتورة: ${invoice.operation_number || invoice.id}\n` +
                 `رقم البيان: ${invoice.statement_number || '-'}\n` +
                 `رقم البوليصة: ${invoice.bol_number || '-'}\n` +
                 `المبلغ المستحق: ${invoice.total.toLocaleString()} ر.س\n\n` +
                 `نرجو التواصل معنا في حال وجود أي استفسارات.\n\n` +
                 `مع التحية،\n${settings.companyName}`;
    const email = invoice.customers?.email || '';
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleExportXML = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_2.2</cbc:CustomizationID>
  <cbc:ID>${invoice.operation_number || invoice.reference_number}</cbc:ID>
  <cbc:IssueDate>${new Date(invoice.created_at).toISOString().split('T')[0]}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${settings.companyName}</cbc:Name></cac:PartyName>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${settings.taxNumber}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${invoice.customers?.name || 'Customer'}</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${(invoice.vat || 0).toFixed(2)}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${invoice.amount.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${invoice.amount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${invoice.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${invoice.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  <cac:InvoiceLine>
    <cbc:ID>1</cbc:ID>
    <cbc:InvoicedQuantity unitCode="EA">1</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${invoice.amount.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>خدمات التخليص الجمركي واللوجستي</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="SAR">${invoice.amount.toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>
</Invoice>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `ZATCA-UBL2-${invoice.operation_number || invoice.id}.xml`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay invoice-print-overlay" style={{ zIndex: 5000, overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }} dir="rtl">
      {/* Toolbar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '1rem', display: 'flex', justifyContent: 'center', gap: '0.8rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button onClick={() => window.print()} className="btn-executive" style={{ background: 'var(--primary)', color: 'var(--secondary)', border: 'none', padding: '0.9rem 1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Printer size={20} /> طباعة الفاتورة
        </button>
        <button onClick={handleWhatsApp} className="btn-executive" style={{ background: '#25D366', color: '#fff', border: 'none', padding: '0.9rem 1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <MessageCircle size={20} /> واتساب
        </button>
        <button onClick={handleEmail} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', padding: '0.9rem 1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Mail size={20} /> إيميل
        </button>
        <button onClick={handleExportXML} className="btn-executive" style={{ background: 'rgba(49, 130, 206, 0.15)', color: '#3182ce', border: '1px solid #3182ce', padding: '0.9rem 1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Download size={20} /> UBL 2.1 XML
        </button>
        {invoice.status !== 'paid' && onMarkPaid && (
          <button onClick={() => onMarkPaid(invoice.id)} className="btn-executive" style={{ background: 'rgba(27, 94, 32, 0.12)', color: 'var(--success)', border: '1px solid var(--success)', padding: '0.9rem 1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={20} /> تحديد كمدفوعة
          </button>
        )}
        {invoice.status === 'paid' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.9rem 1.5rem', background: 'rgba(27, 94, 32, 0.1)', borderRadius: '12px', color: 'var(--success)', fontWeight: 900 }}>
            <CheckCircle2 size={18} /> مدفوعة
          </div>
        )}
        <button onClick={onClose} className="btn-executive" style={{ background: 'var(--error)', color: 'white', border: 'none', padding: '0.9rem 1.8rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <X size={20} /> إغلاق
        </button>
      </div>

      {/* A4 Page */}
      <div className="print-content" style={{
        width: '210mm', minHeight: '297mm', margin: '0 auto', position: 'relative',
        backgroundColor: '#fff', padding: '15mm', color: 'black', direction: 'rtl',
        fontFamily: 'Tajawal', borderRadius: '4px', boxShadow: '0 25px 80px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '5px solid #001a33', paddingBottom: '20px', marginBottom: '25px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '20px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img 
                 src="./logo.png" 
                 alt="Logo" 
                 style={{ width: '100%', height: '100%', objectFit: 'contain', zIndex: 1, backgroundColor: 'white' }} 
                 onError={(e) => {
                   const target = e.target as HTMLImageElement;
                   target.style.display = 'none';
                   if (target.parentElement) {
                     target.parentElement.innerHTML = `<div style="width: 100%; height: 100%; background: #001a33; display: flex; align-items: center; justify-content: center; color: #d4a76a; font-size: 2.5rem; font-weight: 950;">${settings.companyName.charAt(0)}</div>`;
                   }
                 }}
              />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 950, color: '#001a33' }}>{settings.companyName}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', opacity: 0.7, fontWeight: 700 }}>تخليص جمركي ولوجستيات</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', opacity: 0.5, fontWeight: 600 }}>ضريبي: {settings.taxNumber}</p>
            </div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ backgroundColor: '#001a33', color: '#d4a76a', padding: '8px 20px', fontWeight: 950, borderRadius: '8px', fontSize: '0.9rem' }}>
              {invoice.invoice_type === 'final' ? 'فاتورة نهائية' : 'فاتورة داخلية'}
            </div>
            <p style={{ margin: '8px 0 0', fontWeight: 950, fontSize: '1.2rem', color: '#001a33' }}>#{invoice.operation_number || invoice.reference_number}</p>
            <p style={{ margin: '4px 0 0', opacity: 0.7, fontWeight: 700, fontSize: '0.85rem' }}>{new Date(invoice.created_at).toLocaleDateString('ar-SA')}</p>
          </div>
        </div>

        {/* Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '25px', background: '#f8f9fa', padding: '16px', borderRadius: '12px', border: '1px solid #eee' }}>
          <MetaField label="العميل" value={invoice.customers?.name || 'عميل'} />
          <MetaField label="رقم البيان" value={invoice.statement_number || '-'} />
          <MetaField label="رقم البوليصة" value={invoice.bol_number || '-'} />
          <MetaField label="قيمة الشحنة" value={`${(invoice.cargo_value || 0).toLocaleString()} SAR`} />
        </div>

        {/* Items Table */}
        <table style={{ width: '100%', marginBottom: '25px', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: '#001a33', color: '#fff' }}>
            <tr>
              <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 900 }}>الوصف</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 900, width: '200px' }}>المبلغ</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '14px 16px', fontWeight: 800 }}>خدمات التخليص الجمركي واللوجستي</td>
              <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 900 }}>{invoice.amount.toLocaleString()} ر.س</td>
            </tr>
            {invoice.customs_fees ? <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}><td style={{ padding: '10px 16px', fontSize: '0.9rem' }}>رسوم الجمارك</td><td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>{invoice.customs_fees.toLocaleString()} ر.س</td></tr> : null}
            {invoice.port_fees ? <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}><td style={{ padding: '10px 16px', fontSize: '0.9rem' }}>أجور الموانئ</td><td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>{invoice.port_fees.toLocaleString()} ر.س</td></tr> : null}
            {invoice.transport_fees ? <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}><td style={{ padding: '10px 16px', fontSize: '0.9rem' }}>أجور النقل</td><td style={{ padding: '10px 16px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 700 }}>{invoice.transport_fees.toLocaleString()} ر.س</td></tr> : null}
          </tbody>
        </table>

        {/* Footer with QR + Totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '25px', borderTop: '2px solid #eee' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', border: '2px solid #001a33', borderRadius: '12px' }}>
              <QRCodeSVG value={sovereignQRData} size={100} level="H" includeMargin />
            </div>
            <p style={{ fontSize: '8pt', textAlign: 'center', fontWeight: 900, color: '#001a33', margin: 0 }}>التحقق السيادي QR</p>
            <BarcodeSVG value={`${invoice.operation_number || invoice.id}-${invoice.bol_number || 'N/A'}`} />
          </div>
          <div style={{ width: '45%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '8px', color: '#555' }}>
              <span>إجمالي المخزون:</span>
              <span>{(invoice.cargo_value || 0).toLocaleString()} ر.س</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 950, fontSize: '1.3rem', borderBottom: '4px solid #001a33', paddingBottom: '8px', marginBottom: '10px' }}>
              <span>المبلغ المستحق:</span>
              <span>{invoice.total.toLocaleString()} ر.س</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, color: '#047857', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: '10px', borderRadius: '8px', fontSize: '1.1rem' }}>
              <span>صافي الربح:</span>
              <span>{(invoice.profit || 0).toLocaleString()} ر.س</span>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '0.8rem', color: '#999', borderTop: '1px solid #eee', paddingTop: '12px' }}>
          هذه الفاتورة تم إنشاؤها تلقائياً بواسطة نظام الغويري المحاسبي السيادي v3.1
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span style={{ fontSize: '0.7rem', opacity: 0.5, fontWeight: 900, display: 'block', marginBottom: '4px', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontWeight: 950, fontSize: '0.95rem', color: '#001a33' }}>{value}</span>
    </div>
  );
}
