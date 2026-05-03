import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import html2pdf from 'html2pdf.js';
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
    taxNumber: '310344810200003',
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
  }, []);

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

  const totalRevenue = useMemo(() => invoices.reduce((sum, i) => sum + i.total, 0), [invoices]);
  const totalProfit = useMemo(() => invoices.reduce((sum, i) => sum + (i.profit || 0), 0), [invoices]);
  const totalCargo = useMemo(() => invoices.reduce((sum, i) => sum + (i.cargo_value || 0), 0), [invoices]);
  const totalFees = useMemo(() => invoices.reduce((sum, i) => sum + ((i.customs_fees || 0) + (i.port_fees || 0)), 0), [invoices]);

  return (
    <div className="accounting-view-container" dir={t.lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Standardized Sovereign Print Header */}
      <div className="print-only" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid var(--primary)', direction: 'rtl' }}>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ margin: 0, color: 'var(--primary)', fontWeight: 900, fontFamily: 'Tajawal' }}>{settings.companyName}</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>{t.lang === 'ar' ? 'الرقم الضريبي' : 'VAT No'}: {settings.taxNumber}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontWeight: 950, fontFamily: 'Tajawal' }}>{t.invoices.title}</h1>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>{t.lang === 'ar' ? 'التاريخ' : 'Date'}: {new Date().toLocaleDateString(t.lang === 'ar' ? 'ar-SA' : 'en-GB')}</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>Alghwairy Institution</p>
          <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>Invoices & Operations Ledger</p>
          <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>Sovereign Dashboard</p>
        </div>
      </div>

      {/* Header */}
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title">{t.invoices.title}</h2>
          <p className="view-subtitle">{t.invoices.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="payroll-period-selector">
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>calendar_month</span>
            <input type="date" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} />
            <span style={{ opacity: 0.3 }}>-</span>
            <input type="date" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} />
          </div>
          <div className="search-box-executive" style={{ background: 'var(--surface-container-low)', padding: '0.6rem 1.2rem', borderRadius: '14px', border: '1px solid var(--surface-container-high)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', opacity: 0.5 }}>search</span>
            <input 
              type="text" 
              placeholder={t.invoices.search_placeholder || 'Search...'} 
              className="input-clean"
              style={{ width: '180px', background: 'transparent', border: 'none', outline: 'none', fontWeight: 700 }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={() => setShowSummaryModal(true)} className="btn-sovereign-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>table_view</span> {t.invoices.summary_report}
          </button>
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-sovereign-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>add</span> {t.invoices.new_invoice}
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="metrics-grid-stable">
        <SummaryMetric title={t.invoices.stats.total_due} value={totalRevenue.toLocaleString()} unit="SAR" icon="payments" accent="blue" />
        <SummaryMetric title={t.invoices.profit_label} value={totalProfit.toLocaleString()} unit="SAR" icon="trending_up" accent="success" />
        <SummaryMetric title={t.invoices.inventory_total} value={totalCargo.toLocaleString()} unit="SAR" icon="inventory_2" accent="gold" />
        <SummaryMetric title={t.invoices.stats.zatca_certified} value={totalFees.toLocaleString()} unit="SAR" icon="verified_user" accent="red" />
      </div>

      {/* Table Section */}
      <div className="card shadow-elite" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="payroll-table-header">
          <div>
            <h3 className="section-title-premium" style={{ margin: 0 }}>{t.invoices.active_title}</h3>
            <p className="section-subtitle-premium" style={{ margin: 0 }}>{t.invoices.zatca_ready}</p>
          </div>
          <div className="sovereign-status-badge">
            <div className="sovereign-status-dot"></div>
            {t.invoices.zatca_ready}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table">
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2.5rem' }}>{t.invoices.table.number}</th>
                <th>{t.invoices.table.client}</th>
                <th style={{ textAlign: 'center' }}>{t.invoices.profit_label || 'Profit'}</th>
                <th style={{ textAlign: 'center' }}>{t.invoices.table.total}</th>
                <th style={{ textAlign: 'center' }}>{t.invoices.table.status}</th>
                <th style={{ textAlign: 'center', paddingInlineEnd: '2.5rem' }}>{t.customers.table.options}</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '5rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>{t.customers.no_docs || 'No records found'}</td></tr>
              ) : (
                filteredInvoices.map(inv => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }}>
                    <td style={{ paddingInlineStart: '2.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="icon-box" style={{ background: 'var(--surface-container-high)', padding: '0.6rem', borderRadius: '12px', color: 'var(--primary)', display: 'flex' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                        </div>
                        <div>
                          <span className="item-amount" style={{ fontSize: '0.95rem', display: 'block' }}>{inv.operation_number || inv.reference_number}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 700 }}>BOL: {inv.bol_number || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 800, color: 'var(--on-surface)' }}>{inv.customers?.name || 'Client'}</td>
                    <td style={{ textAlign: 'center' }}><span className="item-amount" style={{ color: 'var(--success)' }}>{(inv.profit || 0).toLocaleString()}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="item-amount">{(inv.total || 0).toLocaleString()}</span> <span style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 900 }}>SAR</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge-sovereign ${inv.status === 'paid' ? 'status-active' : 'status-pending'}`}>
                        {inv.status === 'paid' ? t.invoices.status_paid : t.invoices.status_pending}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', paddingInlineEnd: '2.5rem' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                        <button onClick={() => handleEdit(inv)} className="btn-action-small">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                        </button>
                        <button onClick={() => handleDelete(inv.id)} className="btn-delete-small">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredInvoices.length > 0 && (
              <tfoot style={{ background: 'var(--surface-container-low)', borderTop: '2px solid var(--outline-variant)' }}>
                <tr style={{ fontWeight: 1000, color: 'var(--primary)' }}>
                  <td style={{ paddingInlineStart: '2.5rem', paddingBlock: '1.2rem' }}>{t.lang === 'ar' ? 'الإجمالي العام' : 'GRAND TOTAL'}</td>
                  <td></td>
                  <td style={{ textAlign: 'center' }}><span className="item-amount" style={{ color: 'var(--success)' }}>{filteredInvoices.reduce((s, i) => s + (i.profit || 0), 0).toLocaleString()}</span></td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="item-amount">{filteredInvoices.reduce((s, i) => s + i.total, 0).toLocaleString()}</span> <span style={{ fontSize: '0.7rem' }}>SAR</span>
                  </td>
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
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '900px', padding: 0 }}>
            <div className="modal-header-premium" style={{ background: 'var(--surface-container-low)', padding: '2rem 2.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                <div className="icon-container-gold" style={{ width: '45px', height: '45px', background: 'var(--primary)', color: 'var(--secondary)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>{isEditing ? 'edit' : 'add'}</span>
                </div>
                <h3 className="section-title-premium" style={{ margin: 0, fontSize: '1.5rem' }}>
                  {isEditing ? (t.invoices.edit_invoice || 'تعديل الفاتورة') : (t.invoices.add_title || 'إصدار فاتورة جديدة')}
                </h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="btn-icon"><span className="material-symbols-outlined" style={{ fontSize: '28px' }}>close</span></button>
            </div>

            <form onSubmit={handleCreate} className="modal-body-premium" style={{ padding: '2.5rem' }}>
              <div className="bento-grid-form" style={{ marginBottom: '2rem' }}>
                <FormField label={t.invoices.client_label}>
                  <select className="input-premium" value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} required>
                    <option value="">{t.invoices.modal.client_label}</option>
                    {customers.filter(c => c.type === 'customer' || !c.type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormField>
                <FormField label={t.invoices.carrier_label}>
                  <select className="input-premium" value={formData.carrierId} onChange={e => setFormData({...formData, carrierId: e.target.value})}>
                    <option value="">{t.invoices.carrier_label}</option>
                    {customers.filter(c => c.type === 'carrier').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </FormField>
                <FormField label={t.invoices.modal.type || 'Type'}>
                  <select className="input-premium" value={formData.invoiceType} onChange={e => setFormData({...formData, invoiceType: e.target.value})}>
                    <option value="final">{t.invoices.final_invoice}</option>
                    <option value="internal">{t.invoices.internal_invoice}</option>
                  </select>
                </FormField>
                <FormField label={t.invoices.table.date || 'Date'}>
                  <input type="date" className="input-premium" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} required />
                </FormField>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', padding: '1.8rem', background: 'var(--surface-container-low)', borderRadius: '20px', border: '1px solid var(--surface-container-high)', marginBottom: '2rem' }}>
                <FormField label={t.invoices.operation_number}><input type="text" className="input-premium" value={formData.operationNumber} onChange={e => setFormData({...formData, operationNumber: e.target.value})} placeholder="OP-0000" /></FormField>
                <FormField label={t.invoices.statement_number}><input type="text" className="input-premium" value={formData.statementNumber} onChange={e => setFormData({...formData, statementNumber: e.target.value})} placeholder="STAT-00" /></FormField>
                <FormField label={t.invoices.bol_number}><input type="text" className="input-premium" value={formData.bolNumber} onChange={e => setFormData({...formData, bolNumber: e.target.value})} placeholder="BOL-00" /></FormField>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                  <h4 style={{ margin: 0, fontWeight: 1000, fontSize: '1.1rem', color: 'var(--primary)' }}>{t.lang === 'ar' ? 'بنود التكاليف والخدمات' : 'Service & Cost Items'}</h4>
                  <button type="button" onClick={() => setItems([...items, { id: Date.now().toString(), description: '', amount: 0 }])} className="btn-action-small" style={{ gap: '0.4rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> {t.lang === 'ar' ? 'إضافة بند' : 'Add Item'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {items.map((item, index) => (
                    <div key={item.id} className="item-row-premium" style={{ margin: 0, padding: '0.5rem 1rem' }}>
                      <div style={{ flex: 3 }}>
                        <input type="text" className="input-clean" style={{ fontWeight: 700 }} placeholder={t.lang === 'ar' ? 'وصف البند' : 'Description'} value={item.description} onChange={e => {
                          const newItems = [...items]; newItems[index].description = e.target.value; setItems(newItems);
                        }} required />
                      </div>
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <input type="number" className="input-clean" style={{ textAlign: 'center', fontWeight: 1000, fontSize: '1.1rem' }} placeholder="0.00" value={item.amount || ''} onChange={e => {
                          const newItems = [...items]; newItems[index].amount = parseFloat(e.target.value) || 0; setItems(newItems);
                        }} required />
                      </div>
                      {items.length > 1 && (
                        <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="btn-delete-small">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                  <FormField label={t.invoices.customs_fees}><input type="number" className="input-premium" value={formData.customsFees} onChange={e => setFormData({...formData, customsFees: e.target.value})} /></FormField>
                  <FormField label={t.invoices.port_fees}><input type="number" className="input-premium" value={formData.portFees} onChange={e => setFormData({...formData, portFees: e.target.value})} /></FormField>
                  <FormField label={t.invoices.transport_fees_label || 'Transport'}><input type="number" className="input-premium" value={formData.transportFees} onChange={e => setFormData({...formData, transportFees: e.target.value})} /></FormField>
                  <FormField label={t.invoices.other_fees_label || 'Expenses'}><input type="number" className="input-premium" value={formData.transportExpenses} onChange={e => setFormData({...formData, transportExpenses: e.target.value})} /></FormField>
                </div>

                <div className="glass-card" style={{ padding: '1.8rem', borderRadius: '24px', background: 'var(--surface-container-high)' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.7, fontSize: '0.9rem', fontWeight: 700 }}>
                        <span>{t.lang === 'ar' ? 'المجموع' : 'Subtotal'}</span>
                        <span className="item-amount">{items.reduce((s, i) => s + i.amount, 0).toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700 }}>
                        <select value={formData.vatRate} onChange={e => setFormData({...formData, vatRate: parseInt(e.target.value)})} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 900, cursor: 'pointer', outline: 'none', padding: 0 }}>
                          <option value="15">VAT 15%</option>
                          <option value="5">VAT 5%</option>
                          <option value="0">VAT 0%</option>
                        </select>
                        <span className="item-amount">{(items.reduce((s, i) => s + i.amount, 0) * (formData.vatRate/100)).toLocaleString()}</span>
                      </div>
                      <div style={{ height: '2px', background: 'var(--outline-variant)', margin: '5px 0' }}></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                        <span style={{ fontWeight: 1000, fontSize: '1rem' }}>{t.lang === 'ar' ? 'الإجمالي النهائي' : 'Grand Total'}</span>
                        <div style={{ textAlign: 'end' }}>
                          <span className="item-amount" style={{ fontSize: '1.6rem' }}>
                            {(items.reduce((s, i) => s + i.amount, 0) * (1 + formData.vatRate/100) + (parseFloat(formData.customsFees)||0) + (parseFloat(formData.portFees)||0) + (parseFloat(formData.transportFees)||0) + (parseFloat(formData.transportExpenses)||0)).toLocaleString()}
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 900, display: 'block', opacity: 0.6 }}>SAR</span>
                        </div>
                      </div>
                   </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1.2rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-sovereign-outline" style={{ flex: 1, padding: '1.2rem' }}>{t.invoices.modal.cancel}</button>
                <button type="submit" className="btn-sovereign-primary" style={{ flex: 2, padding: '1.2rem', gap: '0.8rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>check_circle</span> 
                  {isEditing ? t.invoices.save_changes : t.invoices.modal.submit}
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
        <div className="modal-overlay" style={{ zIndex: 6000 }}>
          <div className="modal-card" style={{ maxWidth: '1000px', padding: 0 }}>
             <div className="modal-header-premium" style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--surface)', padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="section-title-premium" style={{ margin: 0 }}>{t.invoices.summary_title}</h3>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button onClick={() => window.print()} className="btn-action-small no-print" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>print</span> {t.lang === 'ar' ? 'طباعة' : 'Print'}
                  </button>
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
                    a.setAttribute('hidden', ''); a.setAttribute('href', url); a.setAttribute('download', `Invoices_Summary_${new Date().toISOString().split('T')[0]}.csv`);
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  }} className="btn-action-small" style={{ background: 'var(--success-container)', color: 'var(--success)', border: 'none', padding: '0.8rem 1.2rem' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>download</span> CSV
                  </button>
                  <button onClick={() => setShowSummaryModal(false)} className="btn-icon"><span className="material-symbols-outlined">close</span></button>
                </div>
             </div>
             <div className="modal-body-premium" style={{ padding: '3rem' }}>
                {/* Standardized Sovereign Print Header */}
                <div className="print-only" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid var(--primary)', direction: 'rtl' }}>
                  <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, color: 'var(--primary)', fontWeight: 900, fontFamily: 'Tajawal' }}>{settings.companyName}</h2>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>{t.lang === 'ar' ? 'الرقم الضريبي' : 'VAT No'}: {settings.taxNumber}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h1 style={{ margin: 0, fontWeight: 950, fontFamily: 'Tajawal' }}>{t.invoices.summary_title}</h1>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>{t.lang === 'ar' ? 'التاريخ' : 'Date'}: {new Date().toLocaleDateString(t.lang === 'ar' ? 'ar-SA' : 'en-GB')}</p>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800 }}>Alghwairy Institution</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', opacity: 0.6 }}>Associated Operations Summary</p>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <h1 className="headline-sovereign" style={{ fontSize: '2.4rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>{settings.companyName}</h1>
                  <p className="label-sovereign" style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}>{t.invoices.summary_subtitle}</p>
                  <div style={{ display: 'inline-flex', gap: '1rem', marginTop: '1rem', padding: '0.5rem 1.5rem', background: 'var(--surface-container-low)', borderRadius: '100px', fontSize: '0.85rem', fontWeight: 800, opacity: 0.7 }}>
                    <span>{dateFilter.start ? `From: ${dateFilter.start}` : 'Start of time'}</span>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <span>{dateFilter.end ? `To: ${dateFilter.end}` : 'Today'}</span>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="sovereign-table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'right' }}>{t.invoices.table.number}</th>
                        <th style={{ textAlign: 'right' }}>{t.invoices.table.client}</th>
                        <th style={{ textAlign: 'right' }}>{t.invoices.carrier_label}</th>
                        <th style={{ textAlign: 'center' }}>{t.lang === 'ar' ? 'تاريخ' : 'Date'}</th>
                        <th style={{ textAlign: 'center' }}>{t.invoices.profit_label}</th>
                        <th style={{ textAlign: 'center' }}>{t.invoices.table.total}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(inv => (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: 1000 }}>{inv.operation_number || inv.reference_number}</td>
                          <td style={{ fontWeight: 800 }}>{inv.customers?.name}</td>
                          <td>{inv.carrier?.name || '-'}</td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                          <td style={{ textAlign: 'center' }}><span className="item-amount" style={{ color: 'var(--success)' }}>{inv.profit?.toLocaleString()}</span></td>
                          <td style={{ textAlign: 'center' }}><span className="item-amount">{(inv.total || 0).toLocaleString()}</span></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: 'var(--surface-container-low)', fontWeight: 1000 }}>
                        <td colSpan={4} style={{ padding: '1.8rem', textAlign: 'right', fontSize: '1.1rem' }}>{t.lang === 'ar' ? 'الإجمالي العام' : 'GRAND TOTAL'}</td>
                        <td style={{ textAlign: 'center', color: 'var(--success)', fontSize: '1.2rem' }}>{filteredInvoices.reduce((s, i) => s + (i.profit || 0), 0).toLocaleString()}</td>
                        <td style={{ textAlign: 'center', color: 'var(--primary)', fontSize: '1.3rem' }}>
                          <span className="item-amount">{filteredInvoices.reduce((s, i) => s + i.total, 0).toLocaleString()}</span> 
                          <span style={{ fontSize: '0.8rem', marginInlineStart: '0.4rem' }}>SAR</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 1000, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryMetric({ title, value, unit, icon, accent = 'blue' }: { title: string; value: string; unit: string; icon: string; accent?: 'blue' | 'red' | 'gold' | 'success' }) {
  return (
    <div className={`card-executive accent-${accent}`}>
      <div className="card-executive-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className="card-executive-content">
        <div className="card-executive-title">{title}</div>
        <div className="card-executive-value-group">
          <span className="card-executive-value">{value}</span>
          <span className="card-executive-unit">{unit}</span>
        </div>
      </div>
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
    <div className="modal-overlay printable-area" style={{ zIndex: 5000, overflow: 'auto', padding: '20px', background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }} dir={t.lang === 'ar' ? 'rtl' : 'ltr'}>

      {/* Toolbar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 10, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', padding: '8px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.15)', gap: '8px' }}>
          {['ar', 'en', 'both'].map(l => (
            <button key={l} onClick={() => setPrintLang(l as any)} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', background: printLang === l ? 'var(--primary)' : 'transparent', color: printLang === l ? 'var(--secondary)' : '#fff', fontWeight: 1000, cursor: 'pointer', transition: '0.3s' }}>
               {l === 'ar' ? 'العربية' : l === 'en' ? 'English' : t.invoices.bilingual}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={handleDownloadPDF} className="btn-sovereign-primary" style={{ background: '#fff', color: '#001a33', padding: '1rem 1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span> PDF
          </button>
          
          <a href={`https://wa.me/?text=${encodeURIComponent(`${getLabel('عزيزي العميل، فاتورتكم جاهزة. المبلغ:', 'Dear Customer, your invoice is ready. Amount:')} ${invoice.total} SAR`)}`} 
             target="_blank" rel="noreferrer" className="btn-sovereign-primary" style={{ background: '#25D366', color: '#fff', border: 'none', padding: '1rem 1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>chat</span> {t.invoices.preview.whatsapp}
          </a>

          <a href={`mailto:?subject=${encodeURIComponent(`Invoice ${invoice.reference_number}`)}&body=${encodeURIComponent(`Invoice Details: ${invoice.total} SAR`)}`}
             className="btn-sovereign-primary" style={{ background: '#0D6EFD', color: '#fff', border: 'none', padding: '1rem 1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>mail</span> {t.invoices.preview.email}
          </a>

          {invoice.status !== 'paid' && onMarkPaid && (
            <button onClick={() => onMarkPaid(invoice.id)} className="btn-sovereign-primary" style={{ background: 'var(--success)', color: '#fff', border: 'none', padding: '1rem 1.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>check_circle</span> {t.invoices.table.status_paid}
            </button>
          )}
          <button onClick={onClose} className="btn-sovereign-primary" style={{ background: 'var(--error)', color: '#fff', border: 'none', padding: '1rem 1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>
      </div>

      {/* A4 Page Content */}
      <div ref={pdfRef} className="print-content" style={{
        width: '100%', maxWidth: '210mm', minHeight: '297mm', margin: '0 auto', backgroundColor: '#fff', padding: '15mm',
        color: 'black', direction: printLang === 'en' ? 'ltr' : 'rtl', fontFamily: 'Tajawal',
        boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '10px', background: 'linear-gradient(90deg, #001a33 0%, #d4a76a 50%, #001a33 100%)' }}></div>

        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #001a33', paddingBottom: '25px', marginBottom: '30px', marginTop: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
            <div style={{ width: 130, height: 130, borderRadius: '20px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fcfcfc' }}>
              <img src="./logo.png" alt="Logo" style={{ maxWidth: '85%', maxHeight: '85%', objectFit: 'contain' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 1000, color: '#001a33' }}>{settings.companyName}</h1>
              <p style={{ margin: '4px 0', fontSize: '1.1rem', fontWeight: 900, color: '#d4a76a' }}>{getLabel('تخليص جمركي ولوجستيات', 'Customs & Logistics')}</p>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, fontWeight: 700 }}>
                <p style={{ margin: '3px 0' }}>{settings.address}</p>
                <p style={{ margin: '3px 0' }}>{settings.phone} / {settings.email}</p>
                <p style={{ margin: '3px 0' }}>{getLabel('الرقم الضريبي', 'VAT No')}: {settings.taxNumber}</p>
              </div>
            </div>
          </div>
          <div style={{ textAlign: printLang === 'en' ? 'right' : 'left' }}>
             <div style={{ background: '#001a33', color: '#fff', padding: '15px 25px', borderRadius: '14px', fontSize: '1.3rem', fontWeight: 1000, marginBottom: '15px', boxShadow: '0 5px 15px rgba(0,26,51,0.1)' }}>
                {getLabel(invoice.invoice_type === 'final' ? 'فاتورة ضريبية' : 'فاتورة داخلية', invoice.invoice_type === 'final' ? 'TAX INVOICE' : 'INTERNAL')}
             </div>
             <p style={{ margin: 0, fontSize: '1.6rem', fontWeight: 1000, color: '#001a33' }}>{invoice.operation_number || invoice.id.substring(0,8)}</p>
             <p style={{ margin: '6px 0', opacity: 0.7, fontWeight: 900 }}>{getLabel('التاريخ', 'Date')}: {new Date(invoice.created_at).toLocaleDateString()}</p>
             <p style={{ margin: '6px 0', color: invoice.status === 'paid' ? '#2e7d32' : '#ed6c02', fontWeight: 1000, fontSize: '1.1rem' }}>
                {invoice.status === 'paid' ? getLabel('مـدفوعة', 'PAID') : getLabel('بانتظار السداد', 'PENDING')}
             </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '35px' }}>
          <div style={{ padding: '20px', background: '#fcfcfc', border: '1px solid #eee', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#d4a76a', borderBottom: '2px solid #f0f0f0', paddingBottom: '8px', fontWeight: 1000 }}>{getLabel('بيانات العميل', 'Customer Details')}</h3>
            <p style={{ margin: '6px 0', fontWeight: 1000, fontSize: '1.2rem', color: '#001a33' }}>{invoice.customers?.name}</p>
            <p style={{ margin: '4px 0', fontSize: '0.9rem', fontWeight: 700 }}>{getLabel('هاتف', 'Phone')}: {invoice.customers?.phone || '-'}</p>
            <p style={{ margin: '4px 0', fontSize: '0.9rem', fontWeight: 700 }}>{getLabel('الضريبي', 'VAT')}: {invoice.customers?.tax_number || '-'}</p>
          </div>
          <div style={{ padding: '20px', background: '#fcfcfc', border: '1px solid #eee', borderRadius: '16px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#d4a76a', borderBottom: '2px solid #f0f0f0', paddingBottom: '8px', fontWeight: 1000 }}>{getLabel('تفاصيل الشحنة', 'Shipment Details')}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.9rem', fontWeight: 700 }}>
               <p style={{ margin: 0 }}><strong>{getLabel('البيان', 'STAT')}:</strong> {invoice.statement_number || '-'}</p>
               <p style={{ margin: 0 }}><strong>{getLabel('البوليصة', 'BOL')}:</strong> {invoice.bol_number || '-'}</p>
               <p style={{ margin: 0 }}><strong>{getLabel('الناقل', 'Carrier')}:</strong> {invoice.carrier?.name || '-'}</p>
               <p style={{ margin: 0 }}><strong>{getLabel('القيمة', 'Value')}:</strong> {invoice.cargo_value?.toLocaleString()} SAR</p>
            </div>
          </div>
        </div>

        <table style={{ width: '100%', marginBottom: '40px', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#001a33', color: '#fff' }}>
            <tr>
              <th style={{ padding: '15px 20px', textAlign: printLang === 'en' ? 'left' : 'right', border: '1px solid #001a33', fontSize: '1rem', fontWeight: 1000 }}>{getLabel('الوصف والبيان', 'Description')}</th>
              <th style={{ padding: '15px 20px', textAlign: 'center', width: '180px', border: '1px solid #001a33', fontSize: '1rem', fontWeight: 1000 }}>{getLabel('المبلغ', 'Amount')}</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.items || []).map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1.5px solid #eee' }}>
                <td style={{ padding: '15px 20px', fontWeight: 800, fontSize: '1rem' }}>{it.description}</td>
                <td style={{ padding: '15px 20px', textAlign: 'center', fontWeight: 1000, fontSize: '1.1rem' }}>{it.amount.toLocaleString()}</td>
              </tr>
            ))}
            {invoice.customs_fees ? <tr style={{ background: '#f8f8f8' }}><td style={{ padding: '12px 20px', fontWeight: 700 }}>{getLabel('رسوم جمركية', 'Customs Fees')}</td><td style={{ textAlign: 'center', fontWeight: 1000 }}>{invoice.customs_fees.toLocaleString()}</td></tr> : null}
            {invoice.port_fees ? <tr style={{ background: '#f8f8f8' }}><td style={{ padding: '12px 20px', fontWeight: 700 }}>{getLabel('رسوم الميناء', 'Port Fees')}</td><td style={{ textAlign: 'center', fontWeight: 1000 }}>{invoice.port_fees.toLocaleString()}</td></tr> : null}
            {invoice.transport_fees ? <tr style={{ background: '#f8f8f8' }}><td style={{ padding: '12px 20px', fontWeight: 700 }}>{getLabel('أجور النقل', 'Transport')}</td><td style={{ textAlign: 'center', fontWeight: 1000 }}>{invoice.transport_fees.toLocaleString()}</td></tr> : null}
          </tbody>
        </table>

        <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '35px', borderTop: '3px solid #001a33', paddingTop: '25px' }}>
          <div>
             <div style={{ padding: '18px', background: '#f8f8f8', borderRadius: '12px', border: '1px dashed #d4a76a', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: '#001a33', fontWeight: 1000 }}>{getLabel('بيانات السداد', 'Payment Details')}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700 }}>{settings.bankName}</p>
                <p style={{ margin: 0, fontSize: '0.9rem', fontFamily: 'monospace', fontWeight: 1000 }}>{settings.iban}</p>
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
                <div style={{ textAlign: 'center' }}><p style={{ fontSize: '0.8rem', fontWeight: 900 }}>{getLabel('التدقيق', 'Audit')}</p><div style={{ width: '100px', borderBottom: '2px solid #000', marginTop: '40px' }}></div></div>
                <div style={{ textAlign: 'center', position: 'relative' }}><p style={{ fontSize: '0.8rem', fontWeight: 900 }}>{getLabel('الختم', 'Stamp')}</p><div style={{ width: '80px', height: '80px', border: '3px double #001a33', borderRadius: '50%', marginTop: '8px' }}></div></div>
             </div>
          </div>
          <div style={{ background: '#001a33', color: '#fff', padding: '25px', borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 10px 30px rgba(0,26,51,0.15)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}><span>{getLabel('الإجمالي الفرعي', 'Subtotal')}</span><span style={{ fontWeight: 1000 }}>{invoice.amount.toLocaleString()}</span></div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}><span>{getLabel('الضريبة', 'VAT')}</span><span style={{ fontWeight: 1000 }}>{invoice.vat.toLocaleString()}</span></div>
             <div style={{ height: '2px', background: 'rgba(255,255,255,0.2)' }}></div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem' }}><strong>{getLabel('الإجمالي', 'Grand Total')}</strong><strong>{invoice.total.toLocaleString()}</strong></div>
             <div style={{ marginTop: '20px', alignSelf: 'center', background: 'white', padding: '12px', borderRadius: '15px', boxShadow: '0 8px 25px rgba(0,0,0,0.2)' }}>
                <QRCodeSVG value={generateZatcaQR(invoice)} size={130} />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
