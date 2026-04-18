import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import {
  Package, Download, ShieldCheck, CheckCircle2, MessageCircle, Mail, Plus, DollarSign, TrendingUp, FileText, X, Edit, Trash2, Search, FileSpreadsheet
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import type { Invoice } from '../lib/localDB';
import { QRCodeSVG } from 'qrcode.react';

interface InvoicesViewProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
  logActivity: (action: string, entity: string, entity_id?: string) => void;
  t: any;
}

export default function InvoicesView({ showToast, logActivity, t }: InvoicesViewProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const settings = {
    companyName: 'مؤسسة الغويري للتخليص الجمركي',
    taxNumber: '310294857200003',
    address: 'الرياض - المملكة العربية السعودية',
    phone: '+966 11 234 5678',
    email: 'info@alghwairy-customs.sa',
    bankName: 'مصرف الراجحي - Al Rajhi Bank',
    iban: 'SA 82 8000 0000 1234 5678 9012'
  };

  const [formData, setFormData] = useState({
    customerId: '', carrierId: '', reference: '', isSettlement: false, invoiceType: 'final',
    statementNumber: '', bolNumber: '', operationNumber: '', customsFees: '0', portFees: '0', 
    transportFees: '0', transportExpenses: '0', cargoValue: '0', date: new Date().toISOString().split('T')[0],
    vatRate: 15, paymentMethod: 'Bank Transfer', notes: ''
  });

  const [items, setItems] = useState<{ id: string; description: string; amount: number }[]>([
    { id: '1', description: 'خدمات تخليص جمركي ولوجستي', amount: 0 }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const loadData = useCallback(() => {
    const invs = localDB.getActive('invoices') as Invoice[];
    const custs = localDB.getActive('customers') as any[];
    const joined = invs.map(inv => ({
      ...inv,
      customers: custs.find(c => c.id === inv.customer_id),
      carrier: custs.find(c => c.id === inv.carrier_id)
    }));
    setInvoices(joined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    setCustomers(custs);
  }, [settings]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = 
        inv.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.operation_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.bol_number?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const invDate = new Date(inv.created_at).toISOString().split('T')[0];
      const matchesDate = (!dateFilter.start || invDate >= dateFilter.start) && 
                          (!dateFilter.end || invDate <= dateFilter.end);
      
      return matchesSearch && matchesDate;
    });
  }, [invoices, searchTerm, dateFilter]);

  const handleMarkPaid = useCallback((invoiceId: string) => {
    localDB.update('invoices', invoiceId, { status: 'paid' });
    logActivity('Marked Invoice as Paid', 'invoices', invoiceId);
    showToast('تم تحديث حالة الفاتورة إلى مدفوعة ✓', 'success');
    loadData();
    setShowPreviewModal(false);
  }, [loadData, logActivity, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setFormData({ 
      customerId: '', carrierId: '', reference: '', isSettlement: false, invoiceType: 'final', 
      statementNumber: '', bolNumber: '', operationNumber: '', customsFees: '0', portFees: '0', 
      transportFees: '0', transportExpenses: '0', cargoValue: '0', date: new Date().toISOString().split('T')[0],
      vatRate: 15, paymentMethod: 'Bank Transfer', notes: ''
    });
    setItems([{ id: '1', description: 'خدمات تخليص جمركي ولوجستي', amount: 0 }]);
    setIsEditing(false);
    setEditingId(null);
  };

  const handleEdit = (inv: Invoice) => {
    setFormData({
      customerId: inv.customer_id,
      carrierId: inv.carrier_id || '',
      reference: inv.reference_number,
      isSettlement: inv.is_settlement,
      invoiceType: inv.invoice_type || 'final',
      statementNumber: inv.statement_number || '',
      bolNumber: inv.bol_number || '',
      operationNumber: inv.operation_number || '',
      customsFees: (inv.customs_fees || 0).toString(),
      portFees: (inv.port_fees || 0).toString(),
      transportFees: (inv.transport_fees || 0).toString(),
      transportExpenses: (inv.transport_expenses || 0).toString(),
      cargoValue: (inv.cargo_value || 0).toString(),
      date: (inv.created_at || new Date().toISOString()).split('T')[0],
      vatRate: 15,
      paymentMethod: (inv as any).payment_method || 'Bank Transfer',
      notes: inv.notes || ''
    });
    setItems(inv.items?.map((item: any, idx: number) => ({ id: idx.toString(), description: item.description, amount: item.amount })) || [
      { id: '1', description: 'أتعاب تخليص', amount: inv.amount }
    ]);
    setIsEditing(true);
    setEditingId(inv.id);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t.invoices.confirm_delete || 'Are you sure you want to delete this invoice?')) {
      const entries = localDB.findBy('journal_entries', 'reference_id', id);
      entries.forEach(entry => {
        localDB.addJournalEntry({
          date: new Date().toISOString(),
          description: `REV: ${entry.description}`,
          reference_type: 'reversal',
          reference_id: id,
          debit_account: entry.credit_account,
          credit_account: entry.debit_account,
          amount: entry.amount,
          status: 'posted'
        });
      });

      localDB.delete('invoices', id);
      logActivity('Deleted Invoice & Reversed Ledger', 'invoices', id);
      showToast(t.invoices.delete_success || 'Invoice deleted successfully', 'success');
      loadData();
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const itemTotal = items.reduce((sum, item) => sum + item.amount, 0);
    const customs = parseFloat(formData.customsFees) || 0;
    const port = parseFloat(formData.portFees) || 0;
    const transport = parseFloat(formData.transportFees) || 0;
    const expenses = parseFloat(formData.transportExpenses) || 0;
    
    // Amount is the sum of items (the service fees)
    const amount = itemTotal;
    const vat = amount * (formData.vatRate / 100);
    const total = amount + vat + customs + port + transport + expenses;
    const profit = amount - expenses;

    const invoiceData: Partial<Invoice> = {
      customer_id: formData.customerId,
      carrier_id: formData.carrierId,
      amount, 
      vat, 
      total,
      status: 'pending',
      reference_number: formData.reference || `ALGH-${new Date().getFullYear()}-${(Math.max(0, ...invoices.map(inv => parseInt(inv.reference_number?.split('-')[2] ?? '0') || 0)) + 1).toString().padStart(4, '0')}`,
      operation_number: formData.operationNumber || `OP-${(Math.max(0, ...invoices.map(inv => parseInt(inv.operation_number?.split('-')[1] ?? '0') || 0)) + 1).toString().padStart(4, '0')}`,
      is_settlement: formData.isSettlement,
      invoice_type: formData.invoiceType as 'internal' | 'final',
      statement_number: formData.statementNumber,
      customs_fees: customs, 
      port_fees: port,
      transport_fees: transport, 
      transport_expenses: expenses,
      cargo_value: parseFloat(formData.cargoValue) || 0,
      profit,
      items: items.map(it => ({ description: it.description, amount: it.amount })),
      created_at: new Date(formData.date).toISOString(),
      zatca_certified: true,
      notes: formData.notes
    };

    (invoiceData as any).payment_method = formData.paymentMethod;

    if (isEditing && editingId) {
      const oldEntries = localDB.findBy('journal_entries', 'reference_id', editingId);
      oldEntries.forEach(entry => {
        if (entry.reference_type === 'invoice') {
          localDB.addJournalEntry({
            date: new Date().toISOString(),
            description: `REV: ${entry.description}`,
            reference_type: 'reversal',
            reference_id: editingId,
            debit_account: entry.credit_account,
            credit_account: entry.debit_account,
            amount: entry.amount,
            status: 'posted'
          });
        }
      });

      localDB.update('invoices', editingId, invoiceData);
      
      localDB.addJournalEntry({
        date: new Date().toISOString(),
        description: `Updated Invoice ${invoiceData.reference_number || (invoices.find(i => i.id === editingId)?.reference_number)}`,
        reference_type: 'invoice',
        reference_id: editingId,
        debit_account: 'Accounts Receivable',
        credit_account: 'Sales Revenue',
        amount: total,
        status: 'posted'
      });

      logActivity('Updated Invoice & Adjusted Ledger', 'invoices', editingId);
      showToast(t.invoices.status_label || 'Invoice updated successfully', 'success');
    } else {
      const inserted = localDB.insert('invoices', invoiceData);

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
    }

    setShowAddModal(false);
    resetForm();
    loadData();
  };

  // KPI Calculations
  const totalRevenue = useMemo(() => invoices.reduce((sum, i) => sum + i.total, 0), [invoices]);
  const totalProfit = useMemo(() => invoices.reduce((sum, i) => sum + (i.profit || 0), 0), [invoices]);
  const totalCargo = useMemo(() => invoices.reduce((sum, i) => sum + (i.cargo_value || 0), 0), [invoices]);
  const totalFees = useMemo(() => invoices.reduce((sum, i) => sum + ((i.customs_fees || 0) + (i.port_fees || 0)), 0), [invoices]);

  return (
    <div className="slide-in" dir={t.lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>{t.invoices.title}</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.invoices.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.4rem', background: 'var(--surface-container-low)', padding: '0.4rem', borderRadius: '12px', border: '1px solid var(--surface-container-high)' }}>
            <input 
              type="date" 
              className="input-executive" 
              style={{ width: '130px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: 'none', background: 'transparent' }}
              value={dateFilter.start}
              onChange={e => setDateFilter({...dateFilter, start: e.target.value})}
            />
            <span style={{ alignSelf: 'center', opacity: 0.5 }}>-</span>
            <input 
              type="date" 
              className="input-executive" 
              style={{ width: '130px', padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: 'none', background: 'transparent' }}
              value={dateFilter.end}
              onChange={e => setDateFilter({...dateFilter, end: e.target.value})}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', opacity: 0.5 }} size={16} />
            <input 
              type="text" 
              placeholder={t.invoices.search_placeholder || 'Search...'} 
              className="input-executive" 
              style={{ paddingRight: '2.8rem', width: '200px', background: 'var(--surface-container-low)' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowSummaryModal(true)} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
            <FileSpreadsheet size={16} /> {t.invoices.summary_report}
          </button>
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-executive" style={{ border: 'none' }}>
            <Plus size={18} /> {t.invoices.new_invoice}
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <KPICard title={t.invoices.stats.total_due} value={totalRevenue} icon={<DollarSign size={22} />} color="var(--primary)" t={t} />
        <KPICard title={t.invoices.profit_label} value={totalProfit} icon={<TrendingUp size={22} />} color="var(--success)" t={t} />
        <KPICard title={t.invoices.inventory_total} value={totalCargo} icon={<Package size={22} />} color="var(--secondary)" t={t} />
        <KPICard title={t.invoices.stats.zatca_certified} value={totalFees} icon={<ShieldCheck size={22} />} color="var(--error)" t={t} />
      </div>

      {/* Table Section */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '1.5rem 2rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontFamily: 'Tajawal', fontWeight: 900, margin: 0, color: 'var(--primary)' }}>{t.invoices.active_title}</h3>
          <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--secondary)', color: 'var(--primary)', padding: '0.4rem 1rem', borderRadius: '10px' }}>{t.invoices.zatca_ready}</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table">
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2rem' }}>{t.invoices.table.number}</th>
                <th>{t.invoices.table.client}</th>
                <th style={{ textAlign: 'center' }}>{t.invoices.profit_label || 'Profit'}</th>
                <th style={{ textAlign: 'center' }}>{t.invoices.table.total}</th>
                <th style={{ textAlign: 'center' }}>{t.invoices.table.status}</th>
                <th style={{ textAlign: 'center', paddingInlineEnd: '2rem' }}>{t.customers.table.options}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '5rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>{t.customers.no_docs || 'No records found'}</td></tr>
              ) : (
                filteredInvoices.map(inv => (
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
                    <td style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface-variant)' }}>{inv.customers?.name || 'Client'}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--success)' }}>{(inv.profit || 0).toLocaleString()}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--primary)' }}>{inv.total.toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>SAR</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        fontSize: '0.7rem', padding: '0.4rem 1rem', borderRadius: '20px', fontWeight: 900,
                        background: inv.status === 'paid' ? 'rgba(46, 125, 50, 0.1)' : 'rgba(212, 167, 106, 0.1)',
                        color: inv.status === 'paid' ? '#2e7d32' : '#d4a76a'
                      }}>
                        {inv.status === 'paid' ? t.invoices.status_paid : t.invoices.status_pending}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', paddingInlineEnd: '2rem' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(inv)} className="btn-icon" style={{ padding: '0.4rem', color: 'var(--primary)' }}>
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="btn-icon" style={{ padding: '0.4rem', color: 'var(--error)' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredInvoices.length > 0 && (
              <tfoot style={{ position: 'sticky', bottom: 0, background: 'var(--surface-container-low)', zIndex: 1, borderTop: '2px solid var(--surface-container-high)' }}>
                <tr style={{ fontWeight: 950, color: 'var(--primary)' }}>
                  <td style={{ paddingInlineStart: '2rem' }}>{t.lang === 'ar' ? 'الإجمالي العام' : 'GRAND TOTAL'}</td>
                  <td></td>
                  <td style={{ textAlign: 'center', color: 'var(--success)' }}>{filteredInvoices.reduce((s, i) => s + (i.profit || 0), 0).toLocaleString()}</td>
                  <td style={{ textAlign: 'center' }}>{filteredInvoices.reduce((s, i) => s + i.total, 0).toLocaleString()} <span style={{ fontSize: '0.7rem' }}>SAR</span></td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '850px', padding: 0, border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary)', padding: '0.8rem', borderRadius: '14px', color: 'var(--secondary)' }}>{isEditing ? <Edit size={22} /> : <Plus size={22} />}</div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
                  {isEditing ? (t.invoices.edit_invoice || 'تعديل الفاتورة') : (t.invoices.add_title || 'إصدار فاتورة جديدة')}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: '2.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '1.5rem' }}>
                <FormField label={t.invoices.client_label}>
                  <select className="input-executive" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} style={{ fontWeight: 700 }} required>
                    <option value="">{t.invoices.modal.client_label}</option>
                    {customers.filter(c => c.type === 'customer' || !c.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormField>
                <FormField label={t.invoices.carrier_label}>
                  <select className="input-executive" value={formData.carrierId} onChange={e => setFormData({...formData, carrierId: e.target.value})} style={{ fontWeight: 700 }}>
                    <option value="">{t.invoices.carrier_label}</option>
                    {customers.filter(c => c.type === 'carrier').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormField>
                <FormField label={t.invoices.modal.type || 'Type'}>
                  <select className="input-executive" value={formData.invoiceType} onChange={e => setFormData({...formData, invoiceType: e.target.value})} style={{ fontWeight: 700 }}>
                    <option value="final">{t.invoices.final_invoice}</option>
                    <option value="internal">{t.invoices.internal_invoice}</option>
                  </select>
                </FormField>
                <FormField label={t.invoices.table.date || 'Date'}>
                  <input type="date" className="input-executive" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{ fontWeight: 700 }} required />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem', padding: '1.2rem', background: '#f8f9fa', borderRadius: '12px', border: '1px solid #eee' }}>
                <FormField label={t.invoices.operation_number}><input type="text" className="input-executive" value={formData.operationNumber} onChange={e => setFormData({...formData, operationNumber: e.target.value})} placeholder="OP-0000" /></FormField>
                <FormField label={t.invoices.statement_number}><input type="text" className="input-executive" value={formData.statementNumber} onChange={e => setFormData({...formData, statementNumber: e.target.value})} placeholder="STAT-00" /></FormField>
                <FormField label={t.invoices.bol_number}><input type="text" className="input-executive" value={formData.bolNumber} onChange={e => setFormData({...formData, bolNumber: e.target.value})} placeholder="BOL-00" /></FormField>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', color: 'var(--primary)' }}>{t.lang === 'ar' ? 'بنود التكاليف والخدمات' : 'Service & Cost Items'}</h4>
                  <button type="button" onClick={() => setItems([...items, { id: Date.now().toString(), description: '', amount: 0 }])} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 900, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Plus size={14} /> {t.lang === 'ar' ? 'إضافة بند' : 'Add Item'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {items.map((item, index) => (
                    <div key={item.id} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-start' }}>
                      <div style={{ flex: 3 }}><input type="text" className="input-executive" placeholder={t.lang === 'ar' ? 'وصف البند' : 'Description'} value={item.description} onChange={e => {
                        const newItems = [...items]; newItems[index].description = e.target.value; setItems(newItems);
                      }} required /></div>
                      <div style={{ flex: 1.5 }}><input type="number" className="input-executive" placeholder="0.00" value={item.amount || ''} onChange={e => {
                        const newItems = [...items]; newItems[index].amount = parseFloat(e.target.value) || 0; setItems(newItems);
                      }} required /></div>
                      {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} style={{ padding: '0.8rem', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <FormField label={t.invoices.customs_fees}><input type="number" className="input-executive" value={formData.customsFees} onChange={e => setFormData({...formData, customsFees: e.target.value})} /></FormField>
                  <FormField label={t.invoices.port_fees}><input type="number" className="input-executive" value={formData.portFees} onChange={e => setFormData({...formData, portFees: e.target.value})} /></FormField>
                  <FormField label={t.invoices.transport_fees_label || 'Transport'}><input type="number" className="input-executive" value={formData.transportFees} onChange={e => setFormData({...formData, transportFees: e.target.value})} /></FormField>
                  <FormField label={t.invoices.other_fees_label || 'Expenses'}><input type="number" className="input-executive" value={formData.transportExpenses} onChange={e => setFormData({...formData, transportExpenses: e.target.value})} /></FormField>
                  <div style={{ gridColumn: 'span 2' }}>
                    <FormField label={t.lang === 'ar' ? 'ملاحظات / شروط' : 'Notes / Terms'}>
                      <textarea className="input-executive" rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={{ resize: 'none' }} placeholder={t.lang === 'ar' ? 'اكتب ملاحظات إضافية...' : 'Add notes...'} />
                    </FormField>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: '16px', border: '1px solid var(--surface-container-high)' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>{t.lang === 'ar' ? 'المجموع' : 'Subtotal'}:</span>
                        <span style={{ fontWeight: 900 }}>{items.reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <select value={formData.vatRate} onChange={e => setFormData({...formData, vatRate: parseInt(e.target.value)})} style={{ background: 'none', border: 'none', fontWeight: 900, cursor: 'pointer', outline: 'none' }}>
                          <option value="15">VAT 15%</option>
                          <option value="5">VAT 5%</option>
                          <option value="0">VAT 0%</option>
                        </select>
                        <span style={{ fontWeight: 900 }}>{(items.reduce((s, i) => s + i.amount, 0) * (formData.vatRate/100)).toLocaleString()}</span>
                      </div>
                      <div style={{ height: '1px', background: '#ddd', margin: '8px 0' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                        <span style={{ fontWeight: 950 }}>{t.lang === 'ar' ? 'الإجمالي النهائي' : 'Grand Total'}:</span>
                        <span style={{ fontWeight: 950, fontSize: '1.2rem' }}>{(items.reduce((s, i) => s + i.amount, 0) * (1 + formData.vatRate/100) + (parseFloat(formData.customsFees)||0) + (parseFloat(formData.portFees)||0) + (parseFloat(formData.transportFees)||0) + (parseFloat(formData.transportExpenses)||0)).toLocaleString()}</span>
                      </div>
                   </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.invoices.modal.cancel}</button>
                <button type="submit" className="btn-executive" style={{ flex: 2, border: 'none', padding: '1rem', fontSize: '1.05rem' }}>
                  <CheckCircle2 size={20} /> {isEditing ? t.invoices.save_changes : t.invoices.modal.submit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPreviewModal && selectedInvoice && (
        <InvoicePreview invoice={selectedInvoice} settings={settings} onClose={() => setShowPreviewModal(false)} onMarkPaid={handleMarkPaid} t={t} />
      )}

      {showSummaryModal && (
        <div className="modal-overlay" style={{ zIndex: 6000, background: 'rgba(0,0,0,0.95)', padding: '40px' }}>
          <div className="card" style={{ maxWidth: '1000px', margin: '0 auto', background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid #eee', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                <h3 style={{ margin: 0, fontWeight: 950, color: '#001a33' }}>{t.invoices.summary_title}</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => {
                    const csvRows = [
                      ['Reference', 'Client', 'Carrier', 'BOL', 'Date', 'Amount', 'VAT', 'Customs/Fees', 'Total', 'Profit', 'Status'].join(','),
                      ...filteredInvoices.map(inv => [
                        inv.operation_number || inv.reference_number,
                        inv.customers?.name?.replace(/,/g, ' '),
                        inv.carrier?.name?.replace(/,/g, ' ') || 'N/A',
                        inv.bol_number || 'N/A',
                        new Date(inv.created_at).toLocaleDateString(),
                        inv.amount,
                        inv.vat,
                        (inv.customs_fees || 0) + (inv.port_fees || 0) + (inv.transport_fees || 0),
                        inv.total,
                        inv.profit || 0,
                        inv.status
                      ].join(','))
                    ];
                    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.setAttribute('hidden', '');
                    a.setAttribute('href', url);
                    a.setAttribute('download', `Invoices_Summary_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }} className="btn-executive" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
                    <Download size={16} /> CSV
                  </button>
                  <button onClick={() => setShowSummaryModal(false)} className="btn-executive" style={{ background: '#eee', color: '#333' }}><X size={16} /></button>
                </div>
             </div>
             <div className="print-content" style={{ padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <h1 style={{ color: '#001a33', margin: 0 }}>{settings.companyName}</h1>
                  <p style={{ color: '#d4a76a', fontWeight: 700 }}>{t.invoices.summary_subtitle}</p>
                  <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                    {dateFilter.start && `From: ${dateFilter.start}`} {dateFilter.end && `To: ${dateFilter.end}`}
                  </p>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#001a33', color: '#fff' }}>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>{t.invoices.table.number}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>{t.invoices.table.client}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>{t.invoices.carrier_label}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>{t.lang === 'ar' ? 'تاريخ' : 'Date'}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>{t.invoices.profit_label}</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>{t.invoices.table.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map(inv => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '12px 10px', fontWeight: 800 }}>{inv.operation_number || inv.reference_number}</td>
                        <td style={{ padding: '12px 10px' }}>{inv.customers?.name}</td>
                        <td style={{ padding: '12px 10px' }}>{inv.carrier?.name || '-'}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--success)', fontWeight: 700 }}>{inv.profit?.toLocaleString()}</td>
                        <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 900 }}>{inv.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8f9fa', fontWeight: 950 }}>
                      <td colSpan={4} style={{ padding: '15px 10px', textAlign: 'right' }}>{t.lang === 'ar' ? 'الإجمالي العام' : 'GRAND TOTAL'}</td>
                      <td style={{ padding: '15px 10px', textAlign: 'center', color: 'var(--success)' }}>{filteredInvoices.reduce((s, i) => s + (i.profit || 0), 0).toLocaleString()}</td>
                      <td style={{ padding: '15px 10px', textAlign: 'center', color: 'var(--primary)' }}>{filteredInvoices.reduce((s, i) => s + i.total, 0).toLocaleString()} <span style={{fontSize: '0.8rem', opacity: 0.6}}>{t.lang === 'ar' ? 'ر.س' : 'SAR'}</span></td>
                    </tr>
                  </tfoot>
                </table>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helper Components ── */

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--on-surface)' }}>{label}</label>
      {children}
    </div>
  );
}

function KPICard({ title, value, icon, color, t }: { title: string; value: number; icon: React.ReactNode; color: string; t: any }) {
  return (
    <div className="card" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderInlineStart: `5px solid ${color}` }}>
      <div>
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 800, marginBottom: '0.4rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)', margin: 0, fontFamily: 'Tajawal', fontWeight: 900 }}>
          {value.toLocaleString()} <span style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 700 }}>{t.lang === 'ar' ? 'ر.س' : 'SAR'}</span>
        </h3>
      </div>
      <div style={{ padding: '1rem', borderRadius: '14px', background: 'var(--surface-container-high)', color }}>{icon}</div>
    </div>
  );
}

function InvoicePreview({ invoice, settings, onClose, onMarkPaid, t }: { invoice: Invoice; settings: any; onClose: () => void; onMarkPaid?: (id: string) => void; t: any }) {
  const pdfRef = useRef<HTMLDivElement>(null);
  const [printLang, setPrintLang] = useState<'ar' | 'en' | 'both'>('both');

  const getLabel = (ar: string, en: string) => {
    if (printLang === 'ar') return ar;
    if (printLang === 'en') return en;
    return `${ar} / ${en}`;
  };

  const generateZatcaQR = (inv: Invoice) => {
    try {
      const seller = settings.companyName;
      const vatNo = settings.taxNumber;
      const date = inv.created_at;
      const total = inv.total.toString();
      const vatAmount = inv.vat.toString();
      const toTlv = (tag: number, value: string) => {
        const encoder = new TextEncoder();
        const bValue = encoder.encode(value);
        const bTag = new Uint8Array([tag]);
        const bLen = new Uint8Array([bValue.length]);
        const combined = new Uint8Array(bTag.length + bLen.length + bValue.length);
        combined.set(bTag); combined.set(bLen, bTag.length); combined.set(bValue, bTag.length + bLen.length);
        return combined;
      };
      const t1 = toTlv(1, seller); const t2 = toTlv(2, vatNo); const t3 = toTlv(3, date);
      const t4 = toTlv(4, total); const t5 = toTlv(5, vatAmount);
      const all = new Uint8Array(t1.length + t2.length + t3.length + t4.length + t5.length);
      let offset = 0;
      [t1, t2, t3, t4, t5].forEach(t => { all.set(t, offset); offset += t.length; });
      let binary = '';
      const bytes = new Uint8Array(all);
      for (let i = 0; i < bytes.byteLength; i++) { binary += String.fromCharCode(bytes[i]); }
      return btoa(binary);
    } catch (e) { return inv.reference_number; }
  };

  const handleDownloadPDF = () => {
    const element = pdfRef.current;
    if (!element) return;
    const opt = {
      margin: 0,
      filename: `Invoice-${invoice.operation_number || invoice.id.substring(0,8)}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 2.5, 
        useCORS: true, 
        logging: false, 
        backgroundColor: '#FFFFFF', 
        windowWidth: 1000,
        y: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    (html2pdf() as any).from(element).set(opt).save();
  };

  return (
    <div className="modal-overlay invoice-print-overlay" style={{ zIndex: 5000, overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }} dir={t.lang === 'ar' ? 'rtl' : 'ltr'}>
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          
          /* Hard reset for all elements */
          * { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide everything in the document */
          body > *, 
          #root > *,
          .dashboard-container,
          .sidebar,
          .main-content > *:not(.invoice-print-overlay),
          .kpi-grid,
          .card,
          header, 
          nav {
            display: none !important;
          }

          /* Show ONLY the invoice overlay and ensure it fills the page */
          html, body { 
            background: white !important;
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          body { visibility: hidden !important; }

          .invoice-print-overlay { 
            display: block !important;
            visibility: visible !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            z-index: 999999 !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .invoice-print-overlay .no-print { display: none !important; }
          
          .print-content { 
            visibility: visible !important;
            display: flex !important;
            flex-direction: column !important;
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 auto !important; 
            padding: 15mm !important;
            box-shadow: none !important; 
            border: none !important; 
            background: white !important;
            min-height: 297mm !important;
            height: auto !important;
            overflow: visible !important;
          }

          .print-content * { visibility: visible !important; }
          .print-summary-box { break-inside: avoid; margin-bottom: 20px; }
          .invoice-footer { margin-top: auto !important; padding-top: 20px !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', gap: '5px' }}>
          {['ar', 'en', 'both'].map(l => (
            <button key={l} onClick={() => setPrintLang(l as any)} style={{ padding: '8px 20px', borderRadius: '12px', border: 'none', background: printLang === l ? 'var(--primary)' : 'transparent', color: printLang === l ? 'var(--secondary)' : '#fff', fontWeight: 900, cursor: 'pointer' }}>
               {l === 'ar' ? 'العربية' : l === 'en' ? 'English' : t.invoices.bilingual}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          <button onClick={handleDownloadPDF} className="btn-executive" style={{ background: '#fff', color: '#001a33' }}><FileText size={20} /> PDF</button>
          
          <a href={`https://wa.me/?text=${encodeURIComponent(`${getLabel('عزيزي العميل، فاتورتكم جاهزة. المبلغ:', 'Dear Customer, your invoice is ready. Amount:')} ${invoice.total} SAR`)}`} 
             target="_blank" rel="noreferrer" className="btn-executive" style={{ background: '#25D366', color: '#fff' }}>
            <MessageCircle size={20} /> {t.invoices.preview.whatsapp}
          </a>

          <a href={`mailto:?subject=${encodeURIComponent(`Invoice ${invoice.reference_number}`)}&body=${encodeURIComponent(`Invoice Details: ${invoice.total} SAR`)}`}
             className="btn-executive" style={{ background: '#0D6EFD', color: '#fff' }}>
            <Mail size={20} /> {t.invoices.preview.email}
          </a>

          {invoice.status !== 'paid' && onMarkPaid && <button onClick={() => onMarkPaid(invoice.id)} className="btn-executive" style={{ background: 'var(--success)', color: '#fff' }}><CheckCircle2 size={20} /> {t.invoices.table.status_paid}</button>}
          <button onClick={onClose} className="btn-executive" style={{ background: 'var(--error)', color: '#fff' }}><X size={20} /></button>
        </div>
      </div>

      {/* A4 Page Content */}
      <div ref={pdfRef} className="print-content" style={{
        width: '100%', maxWidth: '210mm', minHeight: '297mm', margin: '0 auto', backgroundColor: '#fff', padding: '15mm',
        color: 'black', direction: printLang === 'en' ? 'ltr' : 'rtl', fontFamily: 'Tajawal',
        boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column'
      }}>
        {/* Decorative Top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', background: 'linear-gradient(90deg, #001a33 0%, #d4a76a 50%, #001a33 100%)' }}></div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #001a33', paddingBottom: '20px', marginBottom: '25px', marginTop: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: 120, height: 120, borderRadius: '15px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="./logo.png" alt="Logo" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 950, color: '#001a33' }}>{settings.companyName}</h1>
              <p style={{ margin: '2px 0', fontSize: '1rem', fontWeight: 800, color: '#d4a76a' }}>{getLabel('تخليص جمركي ولوجستيات', 'Customs & Logistics')}</p>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                <p style={{ margin: '2px 0' }}>{settings.address}</p>
                <p style={{ margin: '2px 0' }}>{settings.phone} / {settings.email}</p>
                <p style={{ margin: '2px 0' }}>{getLabel('الرقم الضريبي', 'VAT No')}: {settings.taxNumber}</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: printLang === 'en' ? 'right' : 'left' }}>
             <div style={{ background: '#001a33', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontSize: '1.2rem', fontWeight: 950, marginBottom: '10px' }}>
                {getLabel(invoice.invoice_type === 'final' ? 'فاتورة ضريبية' : 'فاتورة داخلية', invoice.invoice_type === 'final' ? 'TAX INVOICE' : 'INTERNAL')}
             </div>
             <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950 }}>{invoice.operation_number || invoice.id.substring(0,8)}</p>
             <p style={{ margin: '5px 0', opacity: 0.7, fontWeight: 800 }}>{getLabel('التاريخ', 'Date')}: {new Date(invoice.created_at).toLocaleDateString()}</p>
             <p style={{ margin: '5px 0', color: invoice.status === 'paid' ? '#2e7d32' : '#ed6c02', fontWeight: 950 }}>
                {invoice.status === 'paid' ? getLabel('مـدفوعة', 'PAID') : getLabel('بانتظار السداد', 'PENDING')}
             </p>
          </div>
        </div>

        {/* Customer & Shipment Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
          <div style={{ padding: '15px', background: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#d4a76a', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>{getLabel('بيانات العميل', 'Customer Details')}</h3>
            <p style={{ margin: '4px 0', fontWeight: 900, fontSize: '1.1rem' }}>{invoice.customers?.name}</p>
            <p style={{ margin: '2px 0', fontSize: '0.85rem' }}>{getLabel('هاتف', 'Phone')}: {invoice.customers?.phone || '-'}</p>
            <p style={{ margin: '2px 0', fontSize: '0.85rem' }}>{getLabel('الضريبي', 'VAT')}: {invoice.customers?.tax_number || '-'}</p>
          </div>
          <div style={{ padding: '15px', background: '#fcfcfc', border: '1px solid #f0f0f0', borderRadius: '12px' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#d4a76a', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>{getLabel('تفاصيل الشحنة', 'Shipment Details')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
               <p style={{ margin: 0 }}><strong>{getLabel('البيان', 'STAT')}:</strong> {invoice.statement_number || '-'}</p>
               <p style={{ margin: 0 }}><strong>{getLabel('البوليصة', 'BOL')}:</strong> {invoice.bol_number || '-'}</p>
               <p style={{ margin: 0 }}><strong>{getLabel('الناقل', 'Carrier')}:</strong> {invoice.carrier?.name || '-'}</p>
               <p style={{ margin: 0 }}><strong>{getLabel('القيمة', 'Value')}:</strong> {invoice.cargo_value?.toLocaleString()} SAR</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <table style={{ width: '100%', marginBottom: '30px', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#001a33', color: '#fff' }}>
            <tr>
              <th style={{ padding: '12px 15px', textAlign: printLang === 'en' ? 'left' : 'right', border: '1px solid #001a33' }}>{getLabel('الوصف والبيان', 'Description')}</th>
              <th style={{ padding: '12px 15px', textAlign: 'center', width: '150px', border: '1px solid #001a33' }}>{getLabel('المبلغ', 'Amount')}</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 15px', fontWeight: 700 }}>{it.description}</td>
                <td style={{ padding: '12px 15px', textAlign: 'center', fontWeight: 900 }}>{it.amount.toLocaleString()}</td>
              </tr>
            ))}
            {invoice.customs_fees ? <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 15px' }}>{getLabel('رسوم جمركية', 'Customs Fees')}</td><td style={{ textAlign: 'center', fontWeight: 700 }}>{invoice.customs_fees.toLocaleString()}</td></tr> : null}
            {invoice.port_fees ? <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 15px' }}>{getLabel('رسوم الميناء', 'Port Fees')}</td><td style={{ textAlign: 'center', fontWeight: 700 }}>{invoice.port_fees.toLocaleString()}</td></tr> : null}
            {invoice.transport_fees ? <tr style={{ background: '#f9f9f9' }}><td style={{ padding: '8px 15px' }}>{getLabel('أجور النقل', 'Transport')}</td><td style={{ textAlign: 'center', fontWeight: 700 }}>{invoice.transport_fees.toLocaleString()}</td></tr> : null}
          </tbody>
        </table>

        {/* Summary Sections */}
        <div className="print-summary-box" style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', borderTop: '2px solid #001a33', paddingTop: '20px' }}>
          <div>
             <div style={{ padding: '15px', background: '#fff9f2', borderRadius: '10px', border: '1px dashed #d4a76a', marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 5px', fontSize: '0.85rem', color: '#001a33' }}>{getLabel('بيانات السداد', 'Payment Details')}</h4>
                <p style={{ margin: 0, fontSize: '0.8rem' }}>{settings.bankName}</p>
                <p style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'monospace' }}>{settings.iban}</p>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                <div style={{ textAlign: 'center' }}><p style={{ fontSize: '0.7rem', fontWeight: 800 }}>{getLabel('التدقيق', 'Audit')}</p><div style={{ width: '80px', borderBottom: '1px solid #ccc', marginTop: '30px' }}></div></div>
                <div style={{ textAlign: 'center', position: 'relative' }}><p style={{ fontSize: '0.7rem', fontWeight: 800 }}>{getLabel('الختم', 'Stamp')}</p><div style={{ width: '60px', height: '60px', border: '2px double #eee', borderRadius: '50%', marginTop: '5px' }}></div></div>
             </div>
          </div>
          <div style={{ background: '#001a33', color: '#fff', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{getLabel('الإجمالي الفرعي', 'Subtotal')}</span><span style={{ fontWeight: 900 }}>{invoice.amount.toLocaleString()}</span></div>
             <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{getLabel('الضريبة', 'VAT')}</span><span style={{ fontWeight: 900 }}>{invoice.vat.toLocaleString()}</span></div>
             <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem' }}><strong>{getLabel('الإجمالي', 'Grand Total')}</strong><strong>{invoice.total.toLocaleString()}</strong></div>
             <div style={{ marginTop: '15px', alignSelf: 'center', background: '#fff', padding: '10px', borderRadius: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
                <QRCodeSVG value={generateZatcaQR(invoice)} size={110} />
             </div>
          </div>
        </div>

        {/* Notes (Conditional) */}
        {invoice.notes && (
          <div style={{ marginTop: '20px', padding: '10px', borderTop: '1px solid #eee' }}>
            <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}><strong>{getLabel('ملاحظات:', 'Notes:')}</strong> {invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="invoice-footer" style={{ marginTop: 'auto', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <p style={{ fontSize: '0.7rem', color: '#999', margin: 0 }}>{getLabel('صدرت هذه الفاتورة إلكترونياً وهي خاضعة لأنظمة هيئة الزكاة والضريبة والجمارك', 'This invoice is electronically generated and subject to ZATCA regulations')}</p>
        </div>
      </div>
    </div>
  );
}

