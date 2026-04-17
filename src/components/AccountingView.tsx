import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Printer,
  Receipt,
  X,
  CheckCircle2,
  ArrowUpRight,
  BookOpen,
  PieChart,
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart as LucideBarChart
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { localDB } from '../lib/localDB';
import type { Translations } from '../types/translations';
import type { JournalEntry, LedgerAccount, Invoice } from '../lib/localDB';

// Re-using Invoice type from localDB

interface Props {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: Translations['accounting'] & { lang: string, nav_title?: string };
}

type TabType = 'invoice' | 'journal' | 'ledger' | 'reports' | 'contracts';

export default function AccountingView({ showToast, logActivity, t }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('invoice');
  const [loading, setLoading] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [clientName, setClientName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [declarationNumber, setDeclarationNumber] = useState('');
  const [bolNumber, setBolNumber] = useState('');
  const [customsFees, setCustomsFees] = useState('');
  const [portFees, setPortFees] = useState('');
  const [transportExpenses, setTransportExpenses] = useState('');
  const [inventoryValue, setInventoryValue] = useState('');
  const [operationNumber, setOperationNumber] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [invoiceMode, setInvoiceMode] = useState<'invoice' | 'settlement' | 'internal'>('invoice');
  const [items, setItems] = useState<{desc: string, amount: number}[]>([]);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  
  // Journal & Ledger State
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [activeReportTab, setActiveReportTab] = useState<'journal' | 'profit'>('journal');
  const [contracts] = useState<{ id: string, party: string, type: 'Client' | 'Transport', date: string, status: string }[]>([
    { id: 'C-001', party: 'شركة الحلول اللوجستية', type: 'Client', date: '2024-05-15', status: 'Active' },
    { id: 'T-001', party: 'مؤسسة النقل السريع', type: 'Transport', date: '2024-05-10', status: 'Signed' }
  ]);
  const [scheduledReports] = useState<{ id: string, name: string, type: string, frequency: string, nextRun: string }[]>([
    { id: '1', name: 'تقرير الأرباح الشهري', type: 'Profit', frequency: 'Monthly', nextRun: '2024-06-01' },
    { id: '2', name: 'ميزان المراجعة الأسبوعي', type: 'Ledger', frequency: 'Weekly', nextRun: '2024-05-24' }
  ]);

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

  const fetchData = useCallback(() => {
    try {
      const transactions = localDB.getActive('invoices');
      if (Array.isArray(transactions)) {
        const sortedTrx = [...transactions].sort((a, b) => 
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        setRecentInvoices(sortedTrx.slice(0, 5) as Invoice[]);
      }

      const journal = localDB.getAll('journal_entries');
      if (Array.isArray(journal)) {
        setJournalEntries([...journal].sort((a, b) => 
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
        ));
      }

      const ledger = localDB.getAll('ledger_accounts');
      if (Array.isArray(ledger)) {
        setLedgerAccounts(ledger as LedgerAccount[]);
      }

      const invs = localDB.getAll('invoices');
      if (Array.isArray(invs)) {
        setInvoices(invs as Invoice[]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addItem = () => {
    if (!newItemDesc || !newItemAmount) return;
    setItems([...items, { desc: newItemDesc, amount: parseFloat(newItemAmount) }]);
    setNewItemDesc('');
    setNewItemAmount('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_: {desc: string, amount: number}, i: number) => i !== index));
  };

  const calculateSubtotal = () => items.reduce((sum: number, item: {desc: string, amount: number}) => sum + item.amount, 0);
  const calculateVAT = () => invoiceMode === 'settlement' ? 0 : (calculateSubtotal() * (vatRate / 100));
  const calculateTotal = () => calculateSubtotal() + calculateVAT();

  const handleIssueInvoice = async () => {
    if (!clientName || items.length === 0) {
      showToast(t.lang === 'ar' ? 'خطأ: يرجى إدخال اسم العميل والبنود' : 'Validation Error: Client name and items required', 'error');
      return;
    }

    setLoading(true);
    const subtotal = calculateSubtotal();
    const vat = calculateVAT();
    const customs = parseFloat(customsFees) || 0;
    const port = parseFloat(portFees) || 0;
    const transport = parseFloat(transportExpenses) || 0;
    const totalAmount = subtotal + vat + customs + port + transport;
    
    const profitValue = subtotal - transport; // Assuming subtotal is revenue and transport is actual cost
    
    const newTrx: Partial<Invoice> = {
      reference_number: (invoiceMode === 'settlement' ? 'SET-' : 'INV-') + Math.random().toString(36).substr(2, 6).toUpperCase(),
      customer_id: clientName,
      invoice_type: invoiceMode === 'internal' ? 'internal' : 'final',
      is_settlement: invoiceMode === 'settlement',
      amount: subtotal,
      vat: vat,
      total: totalAmount,
      customs_fees: customs,
      port_fees: port,
      transport_fees: transport,
      transport_expenses: transport,
      statement_number: declarationNumber,
      bol_number: bolNumber,
      operation_number: operationNumber,
      cargo_value: parseFloat(inventoryValue) || 0,
      profit: profitValue,
      status: 'مكتمل'
    };

    try {
      const record = localDB.insert('invoices', newTrx);
      
      // Automatic Journal Entry Creation
      if (invoiceMode === 'invoice' || invoiceMode === 'internal') {
        const entry: Omit<JournalEntry, 'id'> = {
          date: new Date().toISOString(),
          description: `${invoiceMode === 'internal' ? 'Internal' : 'Invoice'} ${newTrx.reference_number} - ${clientName}`,
          reference_type: 'invoice',
          reference_id: record.id,
          debit_account: invoiceMode === 'internal' ? 'Inter-company' : 'Receivables', 
          credit_account: 'Revenue',
          status: 'posted',
          amount: subtotal,
          is_automated: true
        };
        localDB.addJournalEntry(entry);
      }

      const logAction = invoiceMode === 'settlement' ? 'Posted Settlement Entry: ' : 'Issued Tax Invoice to ';
      await logActivity(logAction + clientName, 'invoices', record.id);
      showToast(invoiceMode === 'settlement' ? (t.lang === 'ar' ? 'تم تسجيل القيد والبيانات اللوجستية بنجاح' : 'Settlement and logistics data secured.') : (t.lang === 'ar' ? 'تم إصدار الفاتورة وتحديث الربحية' : 'Invoice issued and profitability updated.'), 'success');
      
      setClientName('');
      setTaxId('');
      setServiceType('');
      setDeclarationNumber('');
      setBolNumber('');
      setCustomsFees('');
      setPortFees('');
      setTransportExpenses('');
      setInventoryValue('');
      setOperationNumber('');
      setItems([]);
      fetchData();
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

  // Report Calculations
  const filteredJournal = useMemo(() => {
    return journalEntries.filter((entry: JournalEntry) => {
      const entryDate = new Date(entry.date);
      if (dateRange.start && entryDate < new Date(dateRange.start)) return false;
      if (dateRange.end && entryDate > new Date(dateRange.end)) return false;
      return true;
    });
  }, [journalEntries, dateRange]);

  const reportData = useMemo(() => {
    const groups: Record<string, { debits: number, credits: number, count: number }> = {};
    
    filteredJournal.forEach((entry: JournalEntry) => {
      let key = '';
      const d = new Date(entry.date);
      if (reportType === 'daily') key = d.toLocaleDateString('en-GB');
      else if (reportType === 'monthly') key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      else key = `${d.getFullYear()}`;

      if (!groups[key]) groups[key] = { debits: 0, credits: 0, count: 0 };
      groups[key].debits += entry.amount;
      groups[key].credits += entry.amount;
      groups[key].count += 1;
    });

    return Object.entries(groups).map(([label, data]) => ({ label, ...data }));
  }, [filteredJournal, reportType]);

  const profitReportData = useMemo(() => {
    const groups: Record<string, { revenue: number, costs: number, profit: number, count: number }> = {};
    
    invoices.forEach((inv: Invoice) => {
      let key = '';
      const d = new Date(inv.created_at);
      if (reportType === 'daily') key = d.toLocaleDateString('en-GB');
      else if (reportType === 'monthly') key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      else key = `${d.getFullYear()}`;

      if (!groups[key]) groups[key] = { revenue: 0, costs: 0, profit: 0, count: 0 };
      
      const customs = inv.customs_fees || 0;
      const port = inv.port_fees || 0;
      const transport = inv.transport_fees || 0;
      const extra = inv.transport_expenses || 0;
      
      groups[key].revenue += inv.amount || 0;
      groups[key].profit += inv.profit || 0;
      groups[key].costs += (customs + port + transport + extra);
      groups[key].count += 1;
    });

    return Object.entries(groups).map(([label, data]) => ({ label, ...data }));
  }, [invoices, reportType]);

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${rows}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderInvoiceEditor = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
      {/* Invoice Form Area */}
      <div className="card" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)', boxShadow: '0 15px 50px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '1.5rem' }}>
          <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '16px', color: 'var(--secondary)' }}><Receipt size={24} /></div>
          <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{t.items_title}</h3>
        </div>

        <div className="flex gap-4 mb-4">
          {(['invoice', 'settlement', 'internal'] as const).map(mode => (
            <button 
              key={mode}
              onClick={() => setInvoiceMode(mode)}
              className={`px-6 py-2 rounded-xl font-bold transition ${invoiceMode === mode ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              {mode === 'invoice' ? (t.lang === 'ar' ? 'فاتورة نهائية' : 'Final Invoice') : 
               mode === 'settlement' ? (t.lang === 'ar' ? 'تسوية داخلية' : 'Internal Settlement') : 
               (t.lang === 'ar' ? 'فاتورة تعاملات' : 'Firm Dealing')}
            </button>
          ))}
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
              <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'ar' ? 'رقم البيان' : 'Declaration No'}</label>
              <input type="text" value={declarationNumber} onChange={e => setDeclarationNumber(e.target.value)} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'ar' ? 'رقم البوليصة' : 'BOL No'}</label>
              <input type="text" value={bolNumber} onChange={e => setBolNumber(e.target.value)} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
             <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.currency}</label>
             <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-executive" style={{ fontSize: '1rem', fontWeight: 800, textAlign: 'center' }}>
               <option value="SAR">SAR</option>
               <option value="USD">USD</option>
               <option value="EUR">EUR</option>
             </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.lang === 'ar' ? 'رقم العملية' : 'Operation No'}</label>
              <input type="text" value={operationNumber} onChange={e => setOperationNumber(e.target.value)} className="input-executive" style={{ fontSize: '1rem', fontWeight: 600 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'ar' ? 'إجمالي المخزون/الحمولة' : 'Inventory/Cargo'}</label>
            <input type="number" value={inventoryValue} onChange={e => setInventoryValue(e.target.value)} className="input-executive" style={{ textAlign: 'center' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem', padding: '1.5rem', background: 'rgba(212, 167, 106, 0.05)', borderRadius: '16px', border: '1px solid rgba(212, 167, 106, 0.1)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'ar' ? 'رسوم الجمارك' : 'Customs Fees'}</label>
            <input type="number" value={customsFees} onChange={e => setCustomsFees(e.target.value)} className="input-executive" style={{ textAlign: 'center' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'ar' ? 'مواني' : 'Port Fees'}</label>
            <input type="number" value={portFees} onChange={e => setPortFees(e.target.value)} className="input-executive" style={{ textAlign: 'center' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t.lang === 'ar' ? 'مصاريف نقل' : 'Transport'}</label>
            <input type="number" value={transportExpenses} onChange={e => setTransportExpenses(e.target.value)} className="input-executive" style={{ textAlign: 'center' }} />
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
              {items.map((item: {desc: string, amount: number}, index: number) => (
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
            style={{ flex: 2, padding: '1.4rem', fontSize: '1.2rem', fontWeight: 900, border: 'none', background: 'var(--primary)', color: 'var(--secondary)' }}
          >
             <CheckCircle2 size={24} /> {loading ? '...' : (invoiceMode === 'invoice' ? (t.lang === 'ar' ? 'إصدار فاتورة ضريبية' : 'Issue Tax Invoice') : (t.lang === 'ar' ? 'ترحيل قيد تسوية' : 'Post Settlement Entry'))}
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
               <SummaryRow label={t.lang === 'ar' ? 'الرسوم اللوجستية' : 'Logistics Fees'} value={((parseFloat(customsFees)||0) + (parseFloat(portFees)||0) + (parseFloat(transportExpenses)||0)).toLocaleString()} currency={currency} />
               <SummaryRow label={t.vat} value={calculateVAT().toLocaleString()} currency={currency} />
               <div style={{ borderTop: '2px solid rgba(212, 167, 106, 0.2)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                 <SummaryRow label={t.total} value={calculateTotal().toLocaleString()} currency={currency} isBold />
               </div>
             </div>
          </div>
          <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '120px', height: '120px', background: 'rgba(212, 167, 106, 0.05)', borderRadius: '30px' }}></div>
        </div>

        <div className="card" style={{ border: '1px solid var(--surface-container-high)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontFamily: 'Tajawal', fontWeight: 800 }}>{t.recent_title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
             {recentInvoices.map((inv: Invoice) => (
                <RecentTrx 
                  key={inv.id} 
                  id={inv.reference_number || ''} 
                  client={inv.customer_id || ''} 
                  amount={(inv.total || 0).toLocaleString()} 
                  onShare={() => {
                      const subject = encodeURIComponent(`فاتورة من مؤسسة الغويري - ${inv.customer_id}`);
                      const body = encodeURIComponent(`تفاصيل المعاملة رقم ${inv.reference_number}\nالقيمة: ${(inv.total || 0).toLocaleString()} SAR`);
                      openExternal(`mailto:?subject=${subject}&body=${body}`);
                  }}
                />
             ))}
             {recentInvoices.length === 0 && <p style={{ fontSize: '0.9rem', opacity: 0.6, textAlign: 'center', padding: '2rem' }}>{t.no_recent}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderJournal = () => (
    <div className="card slide-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontWeight: 900, fontFamily: 'Tajawal', color: 'var(--primary)' }}>{t.journal}</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Calendar size={18} />
            <input type="date" className="input-executive" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
            <span style={{ fontWeight: 900 }}>-</span>
            <input type="date" className="input-executive" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
          </div>
          <button className="btn-executive" style={{ background: 'var(--primary)', color: 'var(--secondary)', border: 'none' }}><Download size={16} /> Excel</button>
        </div>
      </div>

      <div className="table-container">
        <table className="modern-table">
          <thead>
            <tr>
              <th>{t.lang === 'ar' ? 'التاريخ' : 'Date'}</th>
              <th>{t.lang === 'ar' ? 'البيان' : 'Description'}</th>
              <th>{t.lang === 'ar' ? 'حـ/ مدين' : 'Debit Account'}</th>
              <th>{t.lang === 'ar' ? 'حـ/ دائن' : 'Credit Account'}</th>
              <th>{t.lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
            </tr>
          </thead>
          <tbody>
            {filteredJournal.map((entry: JournalEntry) => (
              <tr key={entry.id}>
                <td style={{ fontWeight: 700 }}>{new Date(entry.date).toLocaleDateString()}</td>
                <td style={{ fontWeight: 600 }}>{entry.description}</td>
                <td style={{ color: 'var(--success)', fontWeight: 800 }}>{entry.debit_account}</td>
                <td style={{ color: 'var(--error)', fontWeight: 800 }}>{entry.credit_account}</td>
                <td style={{ fontWeight: 900 }}>{entry.amount.toLocaleString()} <span style={{ opacity: 0.5 }}>SAR</span></td>
              </tr>
            ))}
            {filteredJournal.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>{t.no_recent}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLedger = () => (
    <div className="card slide-in" style={{ padding: '2rem' }}>
      <h3 style={{ fontWeight: 900, fontFamily: 'Tajawal', color: 'var(--primary)', marginBottom: '2rem' }}>{t.general_ledger}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {ledgerAccounts.map((account: LedgerAccount) => (
          <div key={account.code} className="card" style={{ border: '1px solid var(--surface-container-high)', borderRadius: '20px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, background: 'var(--surface-container-high)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: 'var(--primary)' }}>{account.code}</span>
                <h4 style={{ margin: '0.5rem 0 0', fontWeight: 900, fontSize: '1.1rem' }}>{t.lang === 'ar' ? account.name_ar : account.name_en}</h4>
              </div>
              <div style={{ background: account.type === 'asset' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', color: account.type === 'asset' ? 'var(--success)' : 'var(--error)', padding: '0.4rem', borderRadius: '12px' }}>
                {account.type === 'asset' ? <TrendingUp size={20} /> : <TrendingDown size={20} /> }
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1.5rem' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 700 }}>{t.lang === 'ar' ? 'الرصيد الحالي' : 'Final Balance'}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)' }}>
                {account.balance.toLocaleString()} <span style={{ fontSize: '0.6em', opacity: 0.5 }}>SAR</span>
              </div>
            </div>
            
            <div style={{ width: '100%', height: '4px', background: 'var(--surface-container-high)', borderRadius: '2px', marginTop: '1rem', overflow: 'hidden' }}>
              <div style={{ width: '65%', height: '100%', background: 'var(--primary)', opacity: 0.3 }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card slide-in" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 900, fontFamily: 'Tajawal', color: 'var(--primary)', margin: 0 }}>{t.lang === 'ar' ? 'التقارير التحليلية والمجدولة' : 'Analytical & Scheduled Reports'}</h3>
            <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem', fontWeight: 700 }}>{t.lang === 'ar' ? 'حسابات تفصيلية وجدول آلي للمخرجات' : 'Detailed accounts & automated output scheduling'}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--surface-container-low)', padding: '0.4rem', borderRadius: '12px' }}>
               {(['daily', 'monthly', 'yearly'] as const).map(mode => (
                 <button 
                   key={mode}
                   onClick={() => setReportType(mode)} 
                   style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: reportType === mode ? 'var(--primary)' : 'transparent', color: reportType === mode ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 900, cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                 >
                   {t[mode]}
                 </button>
               ))}
            </div>
            <button 
              onClick={() => downloadCSV(activeReportTab === 'journal' ? reportData : profitReportData, `report_${reportType}_${activeReportTab}`)}
              className="btn-executive" 
              style={{ background: 'var(--primary)', color: 'var(--secondary)', border: 'none', padding: '0.8rem 1.5rem' }}
            >
              <Download size={18} /> {t.lang === 'ar' ? 'تصدير CSV' : 'Export CSV'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', borderBottom: '2px solid var(--surface-container-high)', marginBottom: '2rem' }}>
          <button 
            onClick={() => setActiveReportTab('journal')}
            style={{ padding: '1rem', background: 'none', border: 'none', borderBottom: activeReportTab === 'journal' ? '4px solid var(--primary)' : 'none', fontWeight: 900, color: activeReportTab === 'journal' ? 'var(--primary)' : 'var(--on-surface-variant)', cursor: 'pointer' }}
          >
            {t.lang === 'ar' ? 'حركة اليومية العامة' : 'General Journal Flow'}
          </button>
          <button 
            onClick={() => setActiveReportTab('profit')}
            style={{ padding: '1rem', background: 'none', border: 'none', borderBottom: activeReportTab === 'profit' ? '4px solid var(--primary)' : 'none', fontWeight: 900, color: activeReportTab === 'profit' ? 'var(--primary)' : 'var(--on-surface-variant)', cursor: 'pointer' }}
          >
            {t.lang === 'ar' ? 'تقرير الربحية التلقائي' : 'Automated Profitability'}
          </button>
        </div>

        {activeReportTab === 'journal' ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              <ReportMetric label={t.lang === 'ar' ? 'إجمالي الحركة' : 'Total Volume'} value={reportData.reduce((s: number, c: any) => s + (c.debits || 0), 0).toLocaleString()} icon={<LucideBarChart size={18} />} />
              <ReportMetric label={t.lang === 'ar' ? 'عدد القيود' : 'Entries Count'} value={reportData.reduce((s: number, c: any) => s + (c.count || 0), 0).toString()} icon={<BookOpen size={18} />} />
              <ReportMetric label={t.lang === 'ar' ? 'متوسط العملية' : 'Avg Transaction'} value={(reportData.length && reportData.reduce((s: number, c: any) => s + (c.count), 0) > 0 ? (reportData.reduce((s: number, c: any) => s + (c.debits), 0) / reportData.reduce((s: number, c: any) => s + (c.count), 0)) : 0).toLocaleString()} icon={<Activity size={18} />} />
            </div>

            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>{t.lang === 'ar' ? 'الفترة' : 'Period'}</th>
                    <th>{t.lang === 'ar' ? 'إجمالي المدين' : 'Total Debit'}</th>
                    <th>{t.lang === 'ar' ? 'إجمالي الدائن' : 'Total Credit'}</th>
                    <th>{t.lang === 'ar' ? 'عدد العمليات' : 'Trx Count'}</th>
                    <th>{t.lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item: any) => (
                    <tr key={item.label}>
                      <td style={{ fontWeight: 800 }}>{item.label}</td>
                      <td style={{ fontWeight: 900, color: 'var(--success)' }}>{item.debits.toLocaleString()}</td>
                      <td style={{ fontWeight: 900, color: 'var(--error)' }}>{item.credits.toLocaleString()}</td>
                      <td style={{ fontWeight: 800 }}>{item.count}</td>
                      <td><span className="badge badge-success" style={{ fontWeight: 900 }}>{t.lang === 'ar' ? 'مؤكد' : 'Confirmed'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              <ReportMetric label={t.lang === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'} value={profitReportData.reduce((s: number, c: any) => s + c.revenue, 0).toLocaleString()} icon={<TrendingUp size={18} />} isSuccess />
              <ReportMetric label={t.lang === 'ar' ? 'إجمالي التكاليف' : 'Total Costs'} value={profitReportData.reduce((s: number, c: any) => s + c.costs, 0).toLocaleString()} icon={<TrendingDown size={18} />} />
              <ReportMetric label={t.lang === 'ar' ? 'صافي الأرباح' : 'Net Profit'} value={profitReportData.reduce((s: number, c: any) => s + c.profit, 0).toLocaleString()} icon={<LucideBarChart size={18} />} isSuccess />
            </div>

            <div className="table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>{t.lang === 'ar' ? 'الفترة' : 'Period'}</th>
                    <th>{t.lang === 'ar' ? 'الإيراد' : 'Revenue'}</th>
                    <th>{t.lang === 'ar' ? 'التكاليف' : 'Costs'}</th>
                    <th>{t.lang === 'ar' ? 'الربح' : 'Profit'}</th>
                    <th>{t.lang === 'ar' ? 'الهامش' : 'Margin'}</th>
                  </tr>
                </thead>
                <tbody>
                  {profitReportData.map((item: any) => (
                    <tr key={item.label}>
                      <td style={{ fontWeight: 800 }}>{item.label}</td>
                      <td style={{ fontWeight: 900 }}>{item.revenue.toLocaleString()}</td>
                      <td style={{ fontWeight: 800, color: 'var(--error)' }}>{item.costs.toLocaleString()}</td>
                      <td style={{ fontWeight: 950, color: 'var(--success)' }}>{item.profit.toLocaleString()}</td>
                      <td style={{ fontWeight: 800 }}>
                        {item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="card slide-in" style={{ padding: '2rem', border: '1px dashed var(--primary)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--primary)', color: 'var(--secondary)', padding: '0.8rem', borderRadius: '12px' }}><Calendar size={20} /></div>
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontFamily: 'Tajawal' }}>{t.lang === 'ar' ? 'جدولة التقارير الآلية' : 'Automated Report Scheduling'}</h3>
              <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{t.lang === 'ar' ? 'سيقوم النظام بإرسال هذه التقارير تلقائياً للبريد المحدد' : 'System will auto-send these reports to your email'}</p>
            </div>
         </div>

         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {scheduledReports.map((report: any) => (
              <div key={report.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: '16px', border: '1px solid var(--surface-container-high)' }}>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 900, color: 'var(--primary)' }}>{report.name}</h4>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', fontWeight: 700, opacity: 0.7 }}>
                     <span>{report.frequency}</span>
                     <span>Next Run: {report.nextRun}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <div className="badge badge-success" style={{ fontSize: '0.7rem' }}>Active</div>
                   <button style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--primary)' }} title="Edit"><Plus size={16} /></button>
                </div>
              </div>
            ))}
            <button className="btn-executive" style={{ border: '2px dashed var(--primary)', background: 'none', color: 'var(--primary)', fontWeight: 900, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.8rem', minHeight: '80px' }}>
              <Plus size={24} /> {t.lang === 'ar' ? 'إضافة تقرير مجدول جديد' : 'Add New Scheduled Report'}
            </button>
         </div>
      </div>
    </div>
  );

  const renderContracts = () => (
    <div className="slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 900, fontFamily: 'Tajawal', color: 'var(--primary)', margin: 0 }}>{t.lang === 'ar' ? 'إدارة العقود والاتفاقيات' : 'Contracts & Agreements'}</h3>
            <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem', fontWeight: 700 }}>{t.lang === 'ar' ? 'عقود المخلص، العملاء، وشركات النقل' : 'Customs broker, clients, and transport contracts'}</p>
          </div>
          <button className="btn-executive" style={{ background: 'var(--primary)', color: 'var(--secondary)', border: 'none' }}>
            <Plus size={18} /> {t.lang === 'ar' ? 'إنشاء عقد جديد' : 'New Contract'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
           {contracts.map((contract: any) => (
             <div key={contract.id} className="card" style={{ border: '1px solid var(--surface-container-high)', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                   <div style={{ background: contract.type === 'Client' ? 'var(--primary)' : 'var(--tertiary)', color: 'white', padding: '0.4rem 1rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 900 }}>
                      {contract.type === 'Client' ? (t.lang === 'ar' ? 'عقد عميل' : 'Client Contract') : (t.lang === 'ar' ? 'عقد نقل' : 'Transport Contract')}
                   </div>
                   <div className={`badge badge-${contract.status === 'Active' ? 'success' : 'info'}`} style={{ fontWeight: 900 }}>{contract.status}</div>
                </div>
                
                <h4 style={{ margin: '0 0 0.5rem', fontWeight: 900, fontSize: '1.2rem' }}>{contract.party}</h4>
                <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem', fontWeight: 700 }}>{t.lang === 'ar' ? 'رقم العقد' : 'Contract ID'}: {contract.id}</p>
                
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-container-high)', paddingTop: '1rem' }}>
                   <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.7 }}>{contract.date}</span>
                   <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-executive" style={{ padding: '0.5rem', background: 'var(--surface-container-high)', border: 'none', color: 'var(--primary)' }}><Printer size={16} /></button>
                      <button className="btn-executive" style={{ padding: '0.5rem', background: 'var(--primary)', border: 'none', color: 'var(--secondary)' }}><ArrowUpRight size={16} /></button>
                   </div>
                </div>
             </div>
           ))}
        </div>
      </div>

      <div className="card" style={{ padding: '2.5rem', background: 'var(--surface-container-lowest)' }}>
         <h3 style={{ fontWeight: 900, fontFamily: 'Tajawal', marginBottom: '1.5rem' }}>{t.lang === 'ar' ? 'مسودة سريعة لعقد نقل' : 'Quick Transport Draft'}</h3>
         <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.lang === 'ar' ? 'اسم الناقل' : 'Transporter Name'}</label>
               <input type="text" className="input-executive" placeholder="..." />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.lang === 'ar' ? 'قيمة النقل' : 'Transport Rate'}</label>
               <input type="number" className="input-executive" placeholder="0.00" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <label style={{ fontSize: '0.9rem', fontWeight: 800 }}>{t.lang === 'ar' ? 'تاريخ الاستلام' : 'Load Date'}</label>
               <input type="date" className="input-executive" />
            </div>
         </div>
         <button className="btn-executive" style={{ background: 'var(--primary)', color: 'var(--secondary)', border: 'none', padding: '1.2rem 2rem', fontWeight: 900 }}>
            {t.lang === 'ar' ? 'توليد مسودة العقد' : 'Generate Contract Draft'}
         </button>
      </div>
    </div>
  );

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>{t.nav_title || (t.lang === 'ar' ? 'المحاسبة السيادية' : 'Sovereign Accounting')}</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.invoice_desc}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', background: 'var(--surface-container-low)', padding: '0.4rem', borderRadius: '16px' }}>
           <TabButton active={activeTab === 'invoice'} onClick={() => setActiveTab('invoice')} label={t.invoice_editor} icon={<Plus size={16} />} />
           <TabButton active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} label={t.journal} icon={<BookOpen size={16} />} />
           <TabButton active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} label={t.ledger_summary} icon={<PieChart size={16} />} />
           <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label={t.lang === 'ar' ? 'التقارير' : 'Reports'} icon={<Calendar size={16} />} />
           <TabButton active={activeTab === 'contracts'} onClick={() => setActiveTab('contracts')} label={t.lang === 'ar' ? 'العقود' : 'Contracts'} icon={<Activity size={16} />} />
        </div>
      </header>

      {activeTab === 'invoice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
           <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <button onClick={() => setInvoiceMode('invoice')} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: invoiceMode === 'invoice' ? 'var(--primary)' : 'transparent', color: invoiceMode === 'invoice' ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 900, cursor: 'pointer' }}>{t.lang === 'en' ? 'Invoice' : 'فاتورة ضريبية'}</button>
              <button onClick={() => setInvoiceMode('settlement')} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', background: invoiceMode === 'settlement' ? 'var(--primary)' : 'transparent', color: invoiceMode === 'settlement' ? 'var(--secondary)' : 'var(--on-surface-variant)', fontWeight: 900, cursor: 'pointer' }}>{t.lang === 'en' ? 'Settlement' : 'قيد تسوية'}</button>
           </div>
           {renderInvoiceEditor()}
        </div>
      )}
      {activeTab === 'journal' && renderJournal()}
      {activeTab === 'ledger' && renderLedger()}
      {activeTab === 'reports' && renderReports()}
      {activeTab === 'contracts' && renderContracts()}

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
          isSettlement={invoiceMode === 'settlement'}
          declarationNumber={declarationNumber}
          bolNumber={bolNumber}
          operationNumber={operationNumber}
          customsFees={customsFees}
          portFees={portFees}
          transportExpenses={transportExpenses}
          inventoryValue={inventoryValue}
          onDismiss={() => setShowPreview(false)}
          onPrint={handlePrintPDF}
          onWhatsApp={() => showToast('Feature coming soon', 'info')}
          onEmail={() => showToast('Feature coming soon', 'info')}
          settings={settings}
          t={t}
          profit={items.reduce((sum: number, i: {amount: number}) => sum + i.amount, 0) - (parseFloat(transportExpenses) || 0)}
        />
      )}
    </div>
  );
}

// --- Helper Components ---

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
      <span style={{ fontWeight: isBold ? 950 : 800, fontSize: isBold ? '1.8rem' : '1.2rem', color: isBold ? 'var(--secondary)' : 'white' }}>{value} <span style={{ fontSize: '0.7em', opacity: 0.6 }}>{currency || 'SAR'}</span></span>
    </div>
  );
}

function RecentTrx({ id, client, amount, onShare }: { id: string, client: string, amount: string, onShare: () => void }) {
  return (
    <div 
      style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--surface-container-low)', transition: 'all 0.2s', cursor: 'pointer' }} 
      onClick={onShare}
    >
       <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <p style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0 }}>{id}</p>
             <ArrowUpRight size={14} color="var(--success)" />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: '0.2rem 0', fontWeight: 600 }}>{client}</p>
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <p style={{ fontWeight: 950, fontSize: '1rem', color: 'var(--primary)', margin: 0 }}>{amount} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>SAR</span></p>
       </div>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: { active: boolean, onClick: () => void, label: string, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        padding: '0.6rem 1.2rem',
        borderRadius: '12px',
        border: 'none',
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'var(--secondary)' : 'var(--on-surface-variant)',
        fontWeight: 900,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: 'Tajawal'
      }}
    >
      {icon}
      <span>{label}</span>
      {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--secondary)' }} />}
    </button>
  );
}

function ReportMetric({ label, value, icon, isSuccess }: { label: string, value: string, icon: React.ReactNode, isSuccess?: boolean }) {
  return (
    <div className="card" style={{ padding: '1.5rem', background: 'var(--surface-container-low)', border: '1px solid var(--surface-container-high)', borderRadius: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: isSuccess ? 'rgba(76, 175, 80, 0.1)' : 'var(--surface-container-high)', color: isSuccess ? 'var(--success)' : 'var(--primary)', padding: '0.6rem', borderRadius: '12px' }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6, fontWeight: 700 }}>{label}</p>
          <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950, color: 'var(--on-surface)' }}>{value}</h4>
        </div>
      </div>
    </div>
  );
}

interface InvoicePreviewProps {
  clientName: string;
  taxId: string;
  items: { desc: string; amount: number }[];
  subtotal: number;
  vat: number;
  total: number;
  currency: string;
  isSettlement: boolean;
  declarationNumber: string;
  bolNumber: string;
  operationNumber: string;
  customsFees: string;
  portFees: string;
  transportExpenses: string;
  inventoryValue: string;
  vatRate: number;
  onDismiss: () => void;
  onPrint: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  t: any;
  settings: any;
  profit: number;
}

function InvoicePreviewModal({ 
  clientName, taxId, items, subtotal, vat, total, currency, isSettlement, 
  declarationNumber, bolNumber, operationNumber, customsFees, portFees, 
  transportExpenses, inventoryValue, vatRate, onDismiss, onPrint, onWhatsApp, onEmail, t, settings, profit 
}: InvoicePreviewProps) {
    const isAr = t.lang === 'ar';
    const invoiceId = useMemo(() => Math.random().toString(36).substr(2, 6).toUpperCase(), []);
    
    // User requested to hide tax from final customer invoice
    const hideTaxCompletely = true; // Based on "احذف من الفواتير الزكاة والضريب"

    const qrValue = useMemo(() => {
        // Tag-Length-Value Encoding for ZATCA QR
        const encode = (tag: number, val: string) => {
            const buf = new TextEncoder().encode(val);
            return String.fromCharCode(tag, buf.length) + val;
        };
        const raw = encode(1, settings.companyName) + encode(2, settings.taxNumber) + encode(3, new Date().toISOString()) + encode(4, total.toString()) + encode(5, (hideTaxCompletely ? '0' : vat.toString()));
        return btoa(raw);
    }, [settings, total, vat, hideTaxCompletely]);

    return (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 5000, overflowY: 'auto' }}>
            <div className="no-print" style={{ position: 'sticky', top: 0, padding: '1rem', background: '#001a33', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button onClick={onWhatsApp} className="btn btn-primary" style={{ flex: 1, background: '#25D366', border: 'none', color: 'white' }}>
                    <Activity size={18} style={{ marginRight: '8px' }} />
                    {isAr ? 'واتساب' : 'WhatsApp'}
                </button>
                <button onClick={onEmail} className="btn btn-primary" style={{ flex: 1, background: '#EA4335', border: 'none', color: 'white' }}>
                    <X size={18} style={{ marginRight: '8px' }} />
                    {isAr ? 'إيميل' : 'Email'}
                </button>
                <button onClick={onPrint} className="btn btn-primary" style={{ flex: 1 }}>
                    <Printer size={18} style={{ marginRight: '8px' }} />
                    {isAr ? 'طباعة' : 'Print'}
                </button>
                <button onClick={onDismiss} className="btn-executive" style={{ background: '#ba1a1a', color: 'white' }}><X size={18} /> {isAr ? 'إغلاق' : 'Close'}</button>
            </div>
            
            <div className="print-content" style={{ background: 'white', width: '210mm', minHeight: '297mm', margin: '2rem auto', padding: '2cm', color: 'black', direction: 'rtl' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #001a33', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 60, height: 60, background: '#001a33', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4a76a', fontSize: '1.5rem', fontWeight: 900 }}>{settings.companyName.charAt(0)}</div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{settings.companyName}</h2>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>الرقم الضريبي: {settings.taxNumber}</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#001a33' }}>{isSettlement ? (isAr ? 'فاتورة داخلية' : 'Internal Invoice') : (isAr ? 'فاتورة نهائية' : 'Final Invoice')}</h1>
                        <p style={{ margin: 0, fontWeight: 900 }}>#{invoiceId}</p>
                    </div>
                 </div>

                 <div style={{ margin: '2rem 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div>
                        <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>{isAr ? 'بيانات العميل' : 'Client Info'}</h4>
                        <p style={{ margin: '0.5rem 0', fontWeight: 800 }}>{clientName}</p>
                        <p style={{ margin: 0, fontSize: '0.9rem' }}>{isAr ? 'الرقم الضريبي' : 'Tax ID'}: {taxId || '-'}</p>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h4 style={{ borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>{isAr ? 'بيانات الشحنة' : 'Logistics'}</h4>
                        <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>{isAr ? 'رقم العملية' : 'Operation'}: <b>{operationNumber || '-'}</b></p>
                        <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>{isAr ? 'رقم البيان' : 'Declaration'}: <b>{declarationNumber || '-'}</b></p>
                        <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>{isAr ? 'رقم البوليصة' : 'BOL'}: <b>{bolNumber || '-'}</b></p>
                        <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}>{isAr ? 'قيمة المخزون' : 'Inventory'}: <b>{parseFloat(inventoryValue).toLocaleString()} {currency}</b></p>
                        <p style={{ margin: '0.5rem 0', fontWeight: 800 }}>{new Date().toLocaleDateString('ar-SA')}</p>
                    </div>
                 </div>

                 <table style={{ width: '100%', borderCollapse: 'collapse', margin: '2rem 0' }}>
                    <thead>
                        <tr style={{ background: '#f5f5f5' }}>
                            <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #001a33' }}>{isAr ? 'الوصف' : 'Description'}</th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #001a33' }}>{isAr ? 'المبلغ' : 'Amount'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '1rem' }}>{it.desc}</td>
                                <td style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>{it.amount.toLocaleString()} {currency}</td>
                            </tr>
                        ))}
                        {(parseFloat(customsFees) > 0) && (
                            <tr style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '1rem' }}>{isAr ? 'رسوم الجمارك' : 'Customs Fees'}</td>
                                <td style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>{parseFloat(customsFees).toLocaleString()} {currency}</td>
                            </tr>
                        )}
                        {(parseFloat(portFees) > 0) && (
                            <tr style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '1rem' }}>{isAr ? 'رسوم الموانئ' : 'Port Fees'}</td>
                                <td style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>{parseFloat(portFees).toLocaleString()} {currency}</td>
                            </tr>
                        )}
                        {(parseFloat(transportExpenses) > 0) && (
                            <tr style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '1rem' }}>{isAr ? 'مصاريف نقل' : 'Transport'}</td>
                                <td style={{ padding: '1rem', textAlign: 'left', fontWeight: 700 }}>{parseFloat(transportExpenses).toLocaleString()} {currency}</td>
                            </tr>
                        )}
                    </tbody>
                 </table>

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '2rem' }}>
                    <div style={{ padding: '1rem', border: '1px solid #eee', borderRadius: '8px', textAlign: 'center' }}>
                        <QRCodeSVG value={qrValue} size={100} />
                        <p style={{ margin: '0.5rem 0 0', fontSize: '0.6rem', opacity: 0.5 }}>ZATCA Compliant</p>
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ borderTop: '2px solid black', width: '100px', margin: 'auto' }}></div>
                            <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: 900 }}>{invoiceId}</p>
                        </div>
                    </div>
                    <div style={{ width: '250px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                            <span>{isAr ? 'الإجمالي الفرعي' : 'Subtotal'}</span>
                            <span>{subtotal.toLocaleString()} {currency}</span>
                        </div>
                        {!hideTaxCompletely && !isSettlement && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                                <span>{isAr ? 'الضريبة' : 'VAT'} ({vatRate}%)</span>
                                <span>{vat.toLocaleString()} {currency}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 0', fontWeight: 900, color: '#001a33', fontSize: '1.2rem' }}>
                            <span>{isAr ? 'المجموع الكلي' : 'Total Amount'}</span>
                            <span style={{ color: '#d4a76a' }}>{(subtotal + (parseFloat(customsFees)||0) + (parseFloat(portFees)||0) + (parseFloat(transportExpenses)||0)).toLocaleString()} {currency}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: '#f0f4f8', borderRadius: '8px', marginTop: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{isAr ? 'صافي الربح التقديري' : 'Estimated Profit'}</span>
                            <span style={{ fontWeight: 900, color: 'var(--success)' }}>{profit.toLocaleString()} {currency}</span>
                        </div>
                    </div>
                 </div>

                 <div style={{ marginTop: '4rem', padding: '1rem', borderTop: '1px solid #eee', fontSize: '0.8rem', opacity: 0.6 }}>
                    <p style={{ margin: 0 }}>تعتبر هذه الفاتورة رسمية وصادرة آلياً من نظام المحاسبة السيادي.</p>
                 </div>
            </div>
        </div>
    );
}


