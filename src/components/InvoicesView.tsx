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

const generateZatcaQR = (seller: string, vatNo: string, date: string, total: string, vat: string) => {
  const encodeTLV = (tag: number, val: string) => {
    const tagBuf = new Uint8Array([tag]);
    const valBuf = new TextEncoder().encode(val);
    const lenBuf = new Uint8Array([valBuf.length]);
    const res = new Uint8Array(tagBuf.length + lenBuf.length + valBuf.length);
    res.set(tagBuf);
    res.set(lenBuf, tagBuf.length);
    res.set(valBuf, tagBuf.length + lenBuf.length);
    return res;
  };

  const parts = [
    encodeTLV(1, seller),
    encodeTLV(2, vatNo),
    encodeTLV(3, date),
    encodeTLV(4, total),
    encodeTLV(5, vat)
  ];

  const totalLen = parts.reduce((acc, p) => acc + p.length, 0);
  const combined = new Uint8Array(totalLen);
  let offset = 0;
  parts.forEach(p => {
    combined.set(p, offset);
    offset += p.length;
  });

  return btoa(Array.from(combined).map(b => String.fromCharCode(b)).join(''));
};

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
    <div className="p-6" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800">نظام المحاسبة والشحن</h1>
          <p className="text-slate-500 font-bold mt-1">تخليص جمركي - لوجستيات - أرباح تلقائية</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black">إنشاء فاتورة</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <MetricCard title="الإيرادات" value={invoices.reduce((sum, i) => sum + i.total, 0)} color="blue" />
        <MetricCard title="الأرباح" value={invoices.reduce((sum, i) => sum + (i.profit || 0), 0)} color="green" />
        <MetricCard title="المخزون" value={invoices.reduce((sum, i) => sum + (i.cargo_value || 0), 0)} color="orange" />
        <MetricCard title="الرسوم" value={invoices.reduce((sum, i) => sum + ((i.customs_fees || 0) + (i.port_fees || 0)), 0)} color="slate" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-slate-50 border-b"><th className="px-6 py-4">البيان/العملية</th><th className="px-6 py-4">العميل</th><th className="px-6 py-4">الأرباح</th><th className="px-6 py-4">الإجمالي</th><th className="px-6 py-4">الحالة</th></tr>
          </thead>
          <tbody>
            {filteredInvoices.map(inv => (
              <tr key={inv.id} className="border-b hover:bg-slate-50 cursor-pointer" onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }}>
                <td className="px-6 py-4 font-black">{inv.operation_number || inv.reference_number}</td>
                <td className="px-6 py-4 font-bold">{inv.customers?.name || 'عميل'}</td>
                <td className="px-6 py-4 text-green-600 font-black">{inv.profit?.toLocaleString()}</td>
                <td className="px-6 py-4 text-blue-600 font-black">{inv.total.toLocaleString()}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-black ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{inv.status === 'paid' ? 'مدفوعة' : 'انتظار'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <h2 className="text-2xl font-black mb-6">فاتورة شحن جديدة</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
               <select className="col-span-1 p-3 border rounded-xl font-bold" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})}>
                 <option value="">اختر العميل</option>
                 {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <select className="col-span-1 p-3 border rounded-xl font-bold" value={formData.invoiceType} onChange={e => setFormData({...formData, invoiceType: e.target.value})}>
                 <option value="final">فاتورة نهائية</option>
                 <option value="internal">فاتورة داخلية</option>
               </select>
               <input type="text" placeholder="رقم العملية" className="p-3 border rounded-xl" value={formData.operationNumber} onChange={e => setFormData({...formData, operationNumber: e.target.value})} />
               <input type="text" placeholder="رقم البيان" className="p-3 border rounded-xl" value={formData.statementNumber} onChange={e => setFormData({...formData, statementNumber: e.target.value})} />
               <input type="text" placeholder="رقم البوليصة (BOL)" className="p-3 border rounded-xl" value={formData.bolNumber} onChange={e => setFormData({...formData, bolNumber: e.target.value})} />
               <input type="number" placeholder="قيمة الشحنة (المخزون)" className="p-3 border rounded-xl" value={formData.cargoValue} onChange={e => setFormData({...formData, cargoValue: e.target.value})} />
               
               <div className="col-span-2 border-t pt-4 mt-2"><h4 className="font-black text-sm mb-2 text-slate-500">التكاليف والإيرادات</h4></div>
               <div className="flex flex-col"><label className="text-[10px] font-bold mr-2">إجمالي التحصيل (الإيراد)</label><input type="number" placeholder="قيمة الخدمة" className="p-3 border rounded-xl bg-blue-50 font-black" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} /></div>
               <div className="flex flex-col"><label className="text-[10px] font-bold mr-2">رسوم الجمارك</label><input type="number" placeholder="رسوم الجمارك" className="p-3 border rounded-xl bg-red-50" value={formData.customsFees} onChange={e => setFormData({...formData, customsFees: e.target.value})} /></div>
               <div className="flex flex-col"><label className="text-[10px] font-bold mr-2">رسوم الموانئ</label><input type="number" placeholder="رسوم الموانئ" className="p-3 border rounded-xl bg-red-50" value={formData.portFees} onChange={e => setFormData({...formData, portFees: e.target.value})} /></div>
               <div className="flex flex-col"><label className="text-[10px] font-bold mr-2">أجور النقل</label><input type="number" placeholder="أجور النقل" className="p-3 border rounded-xl bg-red-50" value={formData.transportFees} onChange={e => setFormData({...formData, transportFees: e.target.value})} /></div>
               <div className="flex flex-col"><label className="text-[10px] font-bold mr-2">مصروفات إضافية (نقل)</label><input type="number" placeholder="مصروفات إضافية" className="p-3 border rounded-xl bg-red-50" value={formData.transportExpenses} onChange={e => setFormData({...formData, transportExpenses: e.target.value})} /></div>
               <button type="submit" className="col-span-2 bg-slate-900 text-white p-4 rounded-2xl font-black mt-4">حفظ الفاتورة والترحيل للمحاسبة</button>
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
  const c = { 
    blue: 'bg-blue-50 text-blue-700', 
    green: 'bg-green-50 text-green-700', 
    orange: 'bg-orange-50 text-orange-700', 
    slate: 'bg-slate-50 text-slate-700' 
  };
  return (
    <div className={`p-6 rounded-2xl border ${c[color]}`}>
      <p className="text-xs font-black opacity-70">{title}</p>
      <h3 className="text-xl font-black">{value.toLocaleString()} <span className="text-[10px]">SAR</span></h3>
    </div>
  );
}

interface InvoicePreviewProps {
  invoice: Invoice;
  settings: any;
  onClose: () => void;
}

function InvoicePreview({ invoice, settings, onClose }: InvoicePreviewProps) {
  const qrData = generateZatcaQR(
    settings.companyName, 
    settings.taxNumber, 
    new Date(invoice.created_at).toISOString(), 
    invoice.total.toString(), 
    invoice.vat.toString()
  );
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur flex justify-center p-4 z-[100] overflow-auto">
      <div className="bg-white p-10 w-[210mm] shadow-2xl relative text-right" dir="rtl">
        <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-slate-100 rounded-full no-print">X</button>
        <div className="flex justify-between border-b-4 border-slate-900 pb-6 mb-6">
           <div><h1 className="text-2xl font-black">{settings.companyName}</h1><p className="text-sm font-bold opacity-60">تخليص جمركي ولوجستيات</p></div>
           <div className="text-left"><div className="bg-slate-900 text-white px-4 py-2 font-black">{invoice.invoice_type === 'final' ? 'فاتورة نهائية' : 'فاتورة داخلية'}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-8 mb-8">
           <div className="bg-slate-50 p-4 rounded-xl"><h4 className="font-black mb-2 border-b border-slate-200 pb-1">العميل</h4><p className="font-bold text-lg">{invoice.customers?.name}</p><p className="text-xs mt-2">تاريخ الإصدار: {new Date(invoice.created_at).toLocaleDateString()}</p></div>
           <div className="bg-blue-50 p-4 rounded-xl"><h4 className="font-black mb-2 border-b border-blue-200 pb-1">بيانات الخدمة</h4>
             <p className="text-sm font-bold">رقم العملية: {invoice.operation_number}</p>
             <p className="text-sm font-bold">رقم البيان: {invoice.statement_number}</p>
             <p className="text-sm font-bold">رقم البوليصة: {invoice.bol_number || 'N/A'}</p>
           </div>
        </div>
        <table className="w-full mb-8">
           <thead className="bg-slate-900 text-white"><tr><th className="p-3">الوصف</th><th className="p-3">المبلغ</th></tr></thead>
           <tbody>
             <tr className="border-b"><td className="p-4 font-bold">خدمات التخليص الجمركي واللوجستي</td><td className="p-4 text-center font-bold">{invoice.amount.toLocaleString()} ر.س</td></tr>
             {invoice.customs_fees ? <tr className="border-b bg-slate-50"><td className="p-2 pr-4 text-sm">رسوم الجمارك</td><td className="p-2 text-center text-sm">{invoice.customs_fees.toLocaleString()} ر.س</td></tr> : null}
             {invoice.port_fees ? <tr className="border-b bg-slate-50"><td className="p-2 pr-4 text-sm">أجور الموانئ</td><td className="p-2 text-center text-sm">{invoice.port_fees.toLocaleString()} ر.س</td></tr> : null}
             {invoice.transport_fees ? <tr className="border-b bg-slate-50"><td className="p-2 pr-4 text-sm">أجور النقل</td><td className="p-2 text-center text-sm">{invoice.transport_fees.toLocaleString()} ر.س</td></tr> : null}
           </tbody>
        </table>
        <div className="flex justify-between items-start mt-auto pt-8 border-t">
           <div className="flex flex-col items-center">
             <QRCodeSVG value={qrData} size={100} />
             <p className="text-[8px] text-center mt-1">ZATCA QR</p>
             <div className="mt-4"><BarcodeSVG value={invoice.operation_number || invoice.id} /></div>
           </div>
           <div className="w-1/2 space-y-2">
              <div className="flex justify-between font-bold border-b pb-1 text-slate-500"><span>إجمالي المخزون (Cargo Value):</span><span>{invoice.cargo_value?.toLocaleString()} ر.س</span></div>
              <div className="flex justify-between font-black text-xl border-b-2 border-slate-900 pb-1 mt-4"><span>المبلغ المستحق:</span><span>{invoice.total.toLocaleString()} ر.س</span></div>
              <div className="flex justify-between font-black text-green-700 bg-green-50 p-2 rounded-lg text-lg"><span>صافي الربح التلقائي:</span><span>{invoice.profit?.toLocaleString()} ر.س</span></div>
           </div>
        </div>
        <div className="mt-12 text-center text-[10px] text-slate-400 border-t pt-2 no-print">هذه الفاتورة تم إنشاؤها تلقائياً بواسطة نظام الغويري المحاسبي</div>
      </div>
    </div>
  );
}
