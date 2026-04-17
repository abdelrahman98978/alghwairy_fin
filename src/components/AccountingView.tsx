import { useState, useEffect, useCallback, useMemo } from 'react';
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
  BarChart as LucideBarChart,
  ShieldCheck,
  DollarSign,
  Briefcase,
  Search,
  Save
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie
} from 'recharts';
import { localDB, FixedAsset } from '../lib/localDB';
import { generateZatcaQR } from '../lib/zatca';
import type { Translations } from '../types/translations';
import type { JournalEntry, LedgerAccount, Invoice } from '../lib/localDB';

interface Props {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: Translations['accounting'] & { lang: string, nav_title?: string };
}

type TabType = 'invoice' | 'journal' | 'ledger' | 'reports' | 'contracts' | 'assets';

export default function AccountingView({ showToast, logActivity, t }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('invoice');
  const [loading, setLoading] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  
  // Invoice Form State
  const [clientName, setClientName] = useState('');
  const [taxId, setTaxId] = useState('');
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
  const [activeReportTab, setActiveReportTab] = useState<'profit' | 'trial' | 'balance_sheet'>('profit');
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [selectedLedgerAccount, setSelectedLedgerAccount] = useState<LedgerAccount | null>(null);
  const [newJournalEntry, setNewJournalEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    debit_account: '',
    credit_account: '',
    amount: '',
    reference: ''
  });
  const [journalSearch, setJournalSearch] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [contracts, setContracts] = useState<any[]>([]);
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([]);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newAsset, setNewAsset] = useState<Partial<FixedAsset>>({
    name_ar: '',
    name_en: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_value: 0,
    depreciation_rate: 10,
    category: 'Equipment',
    useful_life: 5
  });

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

      const contrs = localDB.getAll('contracts');
      setContracts(Array.isArray(contrs) ? contrs : []);

      const assets = localDB.getAll('fixed_assets');
      setFixedAssets(Array.isArray(assets) ? assets : []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isAr = t.lang === 'ar';
  
  const calculateVAT = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    return (subtotal * vatRate) / 100;
  };

  const addItem = () => {
    if (!newItemDesc || !newItemAmount) return;
    setItems([...items, { desc: newItemDesc, amount: parseFloat(newItemAmount) }]);
    setNewItemDesc('');
    setNewItemAmount('');
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => items.reduce((sum: number, item: {desc: string, amount: number}) => sum + item.amount, 0);
  const calculateLogistics = () => (parseFloat(customsFees)||0) + (parseFloat(portFees)||0) + (parseFloat(transportExpenses)||0);
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const logistics = calculateLogistics();
    if (invoiceMode === 'invoice') return subtotal + logistics; // Per request: no tax on final client invoice
    return subtotal + calculateVAT() + logistics;
  };

  const handleIssueInvoice = async () => {
    if (!clientName || items.length === 0) {
      showToast(isAr ? 'خطأ: يرجى إدخال اسم العميل والبنود' : 'Validation Error: Client name and items required', 'error');
      return;
    }

    setLoading(true);
    const subtotal = calculateSubtotal();
    const vat = calculateVAT();
    const customs = parseFloat(customsFees) || 0;
    const port = parseFloat(portFees) || 0;
    const transport = parseFloat(transportExpenses) || 0;
    const totalAmount = subtotal + vat + customs + port + transport;
    
    // Profit = Service Revenue (Subtotal) - Direct Operational Cost (Transport Expenses)
    const profitValue = subtotal - transport; 

    const newTrx: Partial<Invoice> = {
      reference_number: (invoiceMode === 'settlement' ? 'SET-' : invoiceMode === 'internal' ? 'INT-' : 'INV-') + Math.random().toString(36).substr(2, 6).toUpperCase(),
      customer_id: clientName,
      invoice_type: invoiceMode === 'internal' ? 'internal' : 'final',
      is_settlement: invoiceMode === 'settlement',
      amount: subtotal,
      vat: invoiceMode === 'invoice' ? 0 : vat, 
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
      items: items.map(i => ({ description: i.desc, amount: i.amount })),
      status: 'مكتمل',
      created_at: new Date().toISOString()
    };

    try {
      const record = localDB.insert('invoices', newTrx);
      
      // Multi-Leg Ledger Posting
      if (invoiceMode === 'invoice' || invoiceMode === 'internal' || invoiceMode === 'settlement') {
        // 1. Revenue Entry
        localDB.addJournalEntry({
          date: new Date().toISOString(),
          description: `${invoiceMode === 'internal' ? 'Internal' : invoiceMode === 'settlement' ? 'Settlement' : 'Invoice'} ${newTrx.reference_number} - Service Revenue`,
          reference_type: 'invoice',
          reference_id: record.id,
          debit_account: invoiceMode === 'internal' ? 'Inter-company' : 'العملاء', 
          credit_account: 'إيرادات المبيعات',
          status: 'posted',
          amount: subtotal,
          is_automated: true
        });

        // 2. Transport Expense Entry
        if (transport > 0) {
          localDB.addJournalEntry({
            date: new Date().toISOString(),
            description: `Transport Cost for ${newTrx.reference_number}`,
            reference_type: 'invoice',
            reference_id: record.id,
            debit_account: 'مصاريف النقل',
            credit_account: 'الصندوق',
            status: 'posted',
            amount: transport,
            is_automated: true
          });
        }
      }

      await logActivity((invoiceMode === 'settlement' ? 'Posted Settlement: ' : 'Issued Invoice to ') + clientName, 'invoices', record.id);
      showToast(isAr ? 'تمت العملية وتحديث السجلات المالية' : 'Operation completed and ledgers updated', 'success');
      
      setClientName('');
      setItems([]);
      setCustomsFees('');
      setPortFees('');
      setTransportExpenses('');
      setDeclarationNumber('');
      setBolNumber('');
      setOperationNumber('');
      setInventoryValue('');
      setLoading(false);
      fetchData();
    } catch (err: any) {
      showToast('Error: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const handleAddContract = () => {
    if (!newContract.entity_name || !newContract.value) return;
    localDB.insert('contracts', {
        ...newContract,
        type: contractType,
        status: 'active',
        contract_date: new Date().toISOString().split('T')[0],
        value: parseFloat(newContract.value)
    });
    setShowContractModal(false);
    fetchData();
    setNewContract({ entity_name: '', value: '', expiry_date: '', terms: '' });
  };

  const handleAddAsset = () => {
    if (!newAsset.name_ar || !newAsset.purchase_value) return;
    localDB.insert('fixed_assets', {
      ...newAsset,
      status: 'active',
      created_at: new Date().toISOString()
    });
    setShowAssetModal(false);
    fetchData();
    setNewAsset({
      name_ar: '',
      name_en: '',
      purchase_date: new Date().toISOString().split('T')[0],
      purchase_value: 0,
      depreciation_rate: 10,
      category: 'Equipment',
      useful_life: 5
    });
  };

  const handleManualJournalEntry = () => {
    if (!newJournalEntry.description || !newJournalEntry.debit_account || !newJournalEntry.credit_account || !newJournalEntry.amount) {
      showToast(isAr ? 'يرجى إكمال كافة الحقول' : 'Please complete all fields', 'error');
      return;
    }

    localDB.addJournalEntry({
      date: newJournalEntry.date,
      description: newJournalEntry.description,
      debit_account: newJournalEntry.debit_account,
      credit_account: newJournalEntry.credit_account,
      amount: parseFloat(newJournalEntry.amount),
      reference_type: 'manual',
      reference_id: newJournalEntry.reference || 'MAN-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      status: 'posted',
      is_automated: false
    });

    setShowJournalModal(false);
    showToast(isAr ? 'تم تسجيل القيد بنجاح' : 'Journal entry posted successfully', 'success');
    fetchData();
    setNewJournalEntry({
      date: new Date().toISOString().split('T')[0],
      description: '',
      debit_account: '',
      credit_account: '',
      amount: '',
      reference: ''
    });
  };

  const handleRunDepreciation = () => {
    if (fixedAssets.length === 0) return;
    
    let totalDepr = 0;
    fixedAssets.forEach(asset => {
      if (asset.status === 'active') {
        const amount = (asset.purchase_value * (asset.depreciation_rate / 100)) / 12; // Monthly
        totalDepr += amount;
      }
    });

    if (totalDepr > 0) {
      localDB.addJournalEntry({
        date: new Date().toISOString(),
        description: isAr ? 'إهلاك الأصول الثابتة للفترة الحالية (تلقائي)' : 'Fixed Assets Depreciation - Current Period (Auto)',
        debit_account: 'مصروف الإهلاك',
        credit_account: 'مجمع الإهلاك',
        amount: totalDepr,
        reference_type: 'depreciation',
        reference_id: 'DEP-' + Date.now(),
        status: 'posted',
        is_automated: true
      });
      showToast(isAr ? 'تم احتساب الإهلاك وتحديث السجلات' : 'Depreciation processed and logs updated', 'success');
      fetchData();
    }
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderDashboard = () => {
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalCosts = invoices.reduce((sum, inv) => sum + (inv.transport_expenses || 0), 0);
    const netProfit = invoices.reduce((sum, inv) => sum + (inv.profit || 0), 0);
    const activeContractCount = contracts.filter(c => c.status === 'active').length;

    return (
      <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <ReportMetric label={isAr ? 'إجمالي الإيرادات السيادية' : 'Total Sovereign Revenue'} value={totalRevenue.toLocaleString()} icon={<DollarSign size={22} />} isSuccess />
        <ReportMetric label={isAr ? 'تكاليف التشغيل المباشرة' : 'Direct Operational Costs'} value={totalCosts.toLocaleString()} icon={<TrendingDown size={22} />} />
        <ReportMetric label={isAr ? 'صافي الأرباح التشغيلية' : 'Net Operating Profit'} value={netProfit.toLocaleString()} icon={<TrendingUp size={22} />} isSuccess />
        <ReportMetric label={isAr ? 'العقود النشطة' : 'Active Contracts'} value={activeContractCount.toString()} icon={<Briefcase size={22} />} />
        
        </div>

        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
           <QuickActionCard 
             title={isAr ? 'تقرير الربحية' : 'Profit Report'} 
             desc={isAr ? 'مراجعة الأداء المالي للفترة' : 'Review financial performance'} 
             onClick={() => setActiveTab('reports')} 
             icon={<LucideBarChart size={24} />} 
           />
           <QuickActionCard 
             title={isAr ? 'إهلاك الأصول' : 'Asset Depreciation'} 
             desc={isAr ? 'تحديث مجمع الإهلاك الشهري' : 'Update monthly depreciation'} 
             onClick={() => setActiveTab('assets')} 
             icon={<TrendingDown size={24} />} 
           />
           <QuickActionCard 
             title={isAr ? 'تحليل الضريبة' : 'VAT Analysis'} 
             desc={isAr ? 'مراجعة ضريبة القيمة المضافة' : 'Review VAT status'} 
             onClick={() => { setActiveTab('reports'); setActiveReportTab('vat' as any); }} 
             icon={<ShieldCheck size={24} />} 
           />
        </div>
      </div>
    );
  };

  const renderInvoiceEditor = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
      <div className="card shadow-elite" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)', borderRadius: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2.5rem', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '1.5rem' }}>
          <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '16px', color: 'var(--secondary)' }}><Receipt size={24} /></div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{t.items_title}</h3>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6, fontWeight: 700 }}>{isAr ? 'سجل البيانات المالية واللوجستية بدقة' : 'Record financial & logistics data precisely'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'var(--surface-container-low)', padding: '0.5rem', borderRadius: '14px' }}>
          {(['invoice', 'settlement', 'internal'] as const).map(mode => (
            <button 
              key={mode}
              onClick={() => setInvoiceMode(mode)}
              className="btn-executive"
              style={{ 
                flex: 1,
                background: invoiceMode === mode ? 'var(--primary)' : 'transparent', 
                color: invoiceMode === mode ? 'white' : 'var(--on-surface-variant)',
                border: 'none',
                fontWeight: 800,
                padding: '0.8rem'
              }}
            >
              {mode === 'invoice' ? (isAr ? 'فاتورة ضريبية' : 'Tax Invoice') : 
               mode === 'settlement' ? (isAr ? 'قيد تسوية' : 'Settlement') : 
               (isAr ? 'تعامل داخلي' : 'Internal Trx')}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="form-group-premium">
              <label>{t.client_name}</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="input-premium" />
          </div>
          <div className="form-group-premium">
              <label>{t.tax_id}</label>
              <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} className="input-premium" />
          </div>
          <div className="form-group-premium">
              <label>{t.lang === 'ar' ? 'رقم البيان' : 'Declaration No'}</label>
              <input type="text" value={declarationNumber} onChange={e => setDeclarationNumber(e.target.value)} className="input-premium" />
          </div>
          <div className="form-group-premium">
              <label>{t.lang === 'ar' ? 'رقم البوليصة' : 'BOL No'}</label>
              <input type="text" value={bolNumber} onChange={e => setBolNumber(e.target.value)} className="input-premium" />
          </div>
          <div className="form-group-premium">
              <label>{t.lang === 'ar' ? 'رقم العملية' : 'Op Number'}</label>
              <input type="text" value={operationNumber} onChange={e => setOperationNumber(e.target.value)} className="input-premium" />
          </div>
          <div className="form-group-premium">
              <label>{t.lang === 'ar' ? 'العملة' : 'Currency'}</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-premium">
                <option value="SAR">SAR</option>
                <option value="USD">USD</option>
              </select>
          </div>
        </div>

        <div style={{ marginTop: '2.5rem', padding: '1.5rem', background: 'rgba(212, 167, 106, 0.05)', borderRadius: '20px', border: '1px solid rgba(212, 167, 106, 0.1)' }}>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <input type="text" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder={t.description_placeholder} className="input-premium" style={{ flex: 3 }} />
              <input type="number" value={newItemAmount} onChange={e => setNewItemAmount(e.target.value)} placeholder={t.amount_placeholder} className="input-premium" style={{ flex: 1, textAlign: 'center' }} />
              <button onClick={addItem} className="btn-premium-icon"><Plus size={20} /></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {items.map((item, index) => (
                  <div key={index} className="item-row-premium">
                    <span className="item-desc">{item.desc}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                       <span className="item-amount">{item.amount.toLocaleString()} <small>{currency}</small></span>
                       <button onClick={() => removeItem(index)} className="btn-delete-small"><Trash2 size={16} /></button>
                    </div>
                  </div>
              ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem' }}>
            <div className="fee-input-premium">
                <label>{isAr ? 'جمارك' : 'Customs'}</label>
                <input type="number" value={customsFees} onChange={e => setCustomsFees(e.target.value)} placeholder="0" />
            </div>
            <div className="fee-input-premium">
                <label>{isAr ? 'موانئ' : 'Port'}</label>
                <input type="number" value={portFees} onChange={e => setPortFees(e.target.value)} placeholder="0" />
            </div>
            <div className="fee-input-premium">
                <label>{isAr ? 'نقل' : 'Transport'}</label>
                <input type="number" value={transportExpenses} onChange={e => setTransportExpenses(e.target.value)} placeholder="0" />
            </div>
        </div>

        <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
          <button disabled={loading} onClick={handleIssueInvoice} className="btn-sovereign-primary" style={{ flex: 2 }}>
             {loading ? '...' : <><CheckCircle2 size={20} /> {isAr ? 'اعتماد وإرسال الفاتورة' : 'Approve & Issue Invoice'}</>}
          </button>
          <button onClick={() => { if (items.length > 0) setShowPreview(true); else showToast(isAr ? 'أضف بنوداً للمعاينة' : 'Add items to preview', 'error'); }} className="btn-sovereign-outline" style={{ flex: 1 }}>
            <Printer size={20} /> {t.print_pdf}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="card glass-premium" style={{ background: 'var(--primary)', color: 'white', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2, padding: '2rem' }}>
             <h3 style={{ color: 'var(--secondary)', marginBottom: '2.5rem', fontFamily: 'Tajawal', fontWeight: 900, fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
               <ShieldCheck size={20} /> {t.summation}
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               <SummaryRow label={t.subtotal} value={calculateSubtotal().toLocaleString()} currency={currency} />
               <SummaryRow label={isAr ? 'الرسوم التشغيلية' : 'Operational Fees'} value={calculateLogistics().toLocaleString()} currency={currency} />
               {invoiceMode !== 'invoice' && <SummaryRow label={t.vat} value={calculateVAT().toLocaleString()} currency={currency} />}
               <div style={{ borderTop: '2px solid rgba(212, 167, 106, 0.2)', paddingTop: '1.5rem', marginTop: '1rem' }}>
                 <SummaryRow label={t.total} value={calculateTotal().toLocaleString()} currency={currency} isBold />
               </div>
             </div>
          </div>
          <div className="glass-ornament"></div>
        </div>

        <div className="card shadow-elite" style={{ padding: '2rem', borderRadius: '24px' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.6rem' }}><Activity size={18} /> {t.recent_title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
             {recentInvoices.map((inv) => (
                <RecentTrx 
                  key={inv.id} 
                  id={inv.reference_number || ''} 
                  client={inv.customer_id || ''} 
                  amount={(inv.total || 0).toLocaleString()} 
                  onShare={() => showToast('Share feature active', 'info')}
                />
             ))}
             {recentInvoices.length === 0 && <p className="empty-state-text">{t.no_recent}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderJournal = () => (
    <div className="slide-in">
      <div className="card shadow-elite" style={{ padding: 0, overflow: 'hidden', borderRadius: '28px' }}>
        <div className="table-header-premium">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="icon-container-gold"><BookOpen size={24} /></div>
            <div>
              <h3 className="section-title-premium">{t.journal}</h3>
              <p className="section-subtitle-premium">{isAr ? 'السجل التاريخي لجميع القيود المالية' : 'Chronological log of all financial entries'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }} className="no-print">
            <button onClick={() => setShowJournalModal(true)} className="btn-sovereign-primary" style={{ padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}>
              <Plus size={16} /> {isAr ? 'قيد يدوي' : 'Manual Entry'}
            </button>
            <div className="date-range-container">
               <Calendar size={16} />
               <input type="date" className="input-clean" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
               <input type="date" className="input-clean" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
            <div className="search-box-executive">
               <Search size={16} />
               <input 
                 type="text" 
                 placeholder={isAr ? 'بحث في القيود...' : 'Search entries...'} 
                 value={journalSearch}
                 onChange={e => setJournalSearch(e.target.value)}
                 className="input-clean"
               />
            </div>
            <button onClick={() => downloadCSV(journalEntries, 'Journal_Sovereign')} className="btn-export-excel"><Download size={16} /> Export</button>
          </div>
        </div>

        <style>{`
          .search-box-executive { display: flex; align-items: center; gap: 0.8rem; background: var(--surface); padding: 0.4rem 1.2rem; borderRadius: 12px; border: 1px solid var(--surface-container-high); }
        `}</style>

        <div className="table-container">
          <table className="sovereign-table-premium">
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2.5rem' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                <th>{isAr ? 'وصف العملية' : 'Description'}</th>
                <th>{isAr ? 'الحساب المدين' : 'Debit'}</th>
                <th>{isAr ? 'الحساب الدائن' : 'Credit'}</th>
                <th style={{ textAlign: 'center', paddingInlineEnd: '2.5rem' }}>{isAr ? 'المبلغ الصافي' : 'Net Amount'}</th>
              </tr>
            </thead>
            <tbody>
              {journalEntries
                .filter(e => 
                  e.description.toLowerCase().includes(journalSearch.toLowerCase()) ||
                  e.debit_account.toLowerCase().includes(journalSearch.toLowerCase()) ||
                  e.credit_account.toLowerCase().includes(journalSearch.toLowerCase())
                )
                .map((entry) => (
                <tr key={entry.id}>
                  <td style={{ paddingInlineStart: '2.5rem', fontWeight: 700 }}>{new Date(entry.date).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600 }}>{entry.description}</td>
                  <td style={{ color: 'var(--success)', fontWeight: 800 }}>{entry.debit_account}</td>
                  <td style={{ color: 'var(--error)', fontWeight: 800 }}>{entry.credit_account}</td>
                  <td style={{ textAlign: 'center', paddingInlineEnd: '2.5rem', fontWeight: 900, direction: 'ltr' }}>
                    {entry.amount.toLocaleString()}.00 <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>SAR</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLedger = () => (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h3 style={{ fontWeight: 900, fontFamily: 'Tajawal', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <PieChart size={24} /> {t.general_ledger}
        </h3>
        <div className="search-box-executive" style={{ width: '300px' }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder={isAr ? 'ابحث عن حساب...' : 'Search account...'} 
            value={ledgerSearch}
            onChange={e => setLedgerSearch(e.target.value)}
            className="input-clean"
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {ledgerAccounts
          .filter(a => 
            (a.name_ar.toLowerCase().includes(ledgerSearch.toLowerCase()) || 
             a.name_en?.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
             a.code.includes(ledgerSearch)) &&
            (a.name_ar.toLowerCase().includes(searchTerm.toLowerCase()) || 
             a.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             a.code.includes(searchTerm))
          )
          .map((account) => (
          <div key={account.code} className="card-ledger-premium" onClick={() => setSelectedLedgerAccount(account)} style={{ cursor: 'pointer' }}>
            <div className="ledger-header">
               <span className="ledger-code">{account.code}</span>
               <div className="ledger-icon" style={{ color: account.type === 'asset' ? 'var(--success)' : 'var(--error)' }}>
                 {account.type === 'asset' ? <TrendingUp size={20} /> : <TrendingDown size={20} /> }
               </div>
            </div>
            <h4 className="ledger-name">{isAr ? account.name_ar : account.name_en}</h4>
            <div className="ledger-footer">
              <span className="ledger-label">{isAr ? 'الرصيد الختامي' : 'Final Balance'}</span>
              <span className="ledger-balance">{account.balance.toLocaleString()} <small>SAR</small></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="accounting-view-container slide-in">
      <style>{`
        .accounting-view-container { animation: slideIn 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .shadow-elite { box-shadow: 0 10px 40px rgba(0,0,0,0.03); border: 1px solid var(--surface-container-high); }
        .form-group-premium { display: flex; flexDirection: column; gap: 0.6rem; }
        .form-group-premium label { fontSize: 0.85rem; fontWeight: 800; color: var(--on-surface-variant); }
        .input-premium { padding: 0.8rem 1.2rem; borderRadius: 12px; border: 1px solid var(--surface-container-high); background: var(--surface); fontSize: 1rem; fontWeight: 800; transition: 0.3s; }
        .input-premium:focus { border-color: var(--primary); outline: none; box-shadow: 0 0 0 3px rgba(0,26,51,0.05); }
        .item-row-premium { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.5rem; background: var(--surface); borderRadius: 12px; border: 1px solid var(--surface-container-high); }
        .item-desc { fontSize: 1rem; fontWeight: 750; color: var(--on-surface); }
        .item-amount { fontWeight: 900; color: var(--primary); fontSize: 1.1rem; }
        .btn-premium-icon { width: 50px; height: 50px; borderRadius: 14px; background: var(--primary); color: var(--secondary); border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.3s; }
        .btn-premium-icon:hover { transform: translateY(-2px); filter: brightness(1.2); }
        .btn-delete-small { background: rgba(186, 26, 26, 0.1); border: none; color: var(--error); padding: 0.6rem; borderRadius: 8px; cursor: pointer; }
        .fee-input-premium { display: flex; flex-direction: column; gap: 0.4rem; background: var(--surface-container-low); padding: 0.8rem; borderRadius: 12px; }
        .fee-input-premium label { font-size: 0.75rem; font-weight: 900; opacity: 0.7; }
        .fee-input-premium input { border: none; background: transparent; font-weight: 1000; font-size: 1.1rem; text-align: center; color: var(--primary); width: 100%; }
        .btn-sovereign-primary { display: flex; align-items: center; justify-content: center; gap: 0.8rem; background: var(--primary); color: var(--secondary); border: none; padding: 1.2rem; borderRadius: 16px; font-weight: 900; font-size: 1.1rem; cursor: pointer; transition: 0.3s; }
        .btn-sovereign-outline { background: var(--surface-container-high); color: var(--primary); border: none; padding: 1.2rem; borderRadius: 16px; font-weight: 800; cursor: pointer; transition: 0.3s; }
        .glass-premium { position: relative; border: none; border-radius: 28px; background: linear-gradient(135deg, var(--primary) 0%, #002b4d 100%); }
        .glass-ornament { position: absolute; bottom: -20px; right: -20px; width: 100px; height: 100px; background: rgba(212, 167, 106, 0.1); border-radius: 50%; blur: 20px; }
        .table-header-premium { padding: 2rem 2.5rem; background: var(--surface-container-low); border-bottom: 1px solid var(--surface-container-high); display: flex; justify-content: space-between; align-items: center; }
        .icon-container-gold { background: var(--primary); color: var(--secondary); padding: 0.8rem; borderRadius: 14px; }
        .section-title-premium { margin: 0; fontSize: 1.35rem; fontWeight: 1000; fontFamily: 'Tajawal'; color: var(--primary); }
        .section-subtitle-premium { margin: 0; fontSize: 0.85rem; opacity: 0.6; fontWeight: 700; }
        .date-range-container { display: flex; align-items: center; gap: 0.8rem; background: var(--surface); padding: 0.4rem 1rem; borderRadius: 12px; border: 1px solid var(--surface-container-high); }
        .input-clean { border: none; background: transparent; font-weight: 800; font-size: 0.85rem; padding: 0.4rem; cursor: pointer; }
        .btn-export-excel { background: var(--surface-container-high); color: var(--primary); border: none; padding: 0.7rem 1.4rem; borderRadius: 10px; font-weight: 900; display: flex; align-items: center; gap: 0.5rem; cursor: pointer; }
        .search-bar-premium { display: flex; align-items: center; gap: 0.8rem; background: var(--surface); padding: 0.6rem 1.4rem; border-radius: 50px; border: 1px solid var(--surface-container-high); width: 350px; transition: 0.3s; }
        .search-bar-premium:focus-within { border-color: var(--primary); box-shadow: 0 0 20px rgba(0,0,0,0.05); }
        .search-bar-premium input { border: none; background: transparent; font-weight: 800; font-size: 0.9rem; width: 100%; color: var(--on-surface); outline: none; }
        .header-actions { display: flex; align-items: center; gap: 1.5rem; }
        .sovereign-table-premium { width: 100%; border-collapse: collapse; }
        .sovereign-table-premium th { text-align: right; padding: 1.2rem 1rem; color: var(--primary); font-weight: 900; font-size: 0.9rem; border-bottom: 2px solid var(--surface-container-high); background: var(--surface-container-lowest); }
        .sovereign-table-premium td { padding: 1.4rem 1rem; border-bottom: 1px solid var(--surface-container-low); font-size: 0.95rem; }
        .card-ledger-premium { background: var(--surface); padding: 2rem; border-radius: 24px; border: 1px solid var(--surface-container-high); transition: 0.3s; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
        .card-ledger-premium:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0,0,0,0.05); }
        .ledger-header { display: flex; justify-content: space-between; margin-bottom: 1.5rem; }
        .ledger-code { background: var(--surface-container-high); color: var(--primary); font-size: 0.75rem; font-weight: 950; padding: 0.3rem 0.8rem; border-radius: 6px; }
        .ledger-name { font-size: 1.2rem; font-weight: 1000; color: var(--primary); margin: 0; }
        .ledger-footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--surface-container-low); }
        .ledger-label { font-size: 0.8rem; font-weight: 800; opacity: 0.5; }
        .ledger-balance { font-size: 1.6rem; font-weight: 1000; color: var(--primary); }
        .empty-state-text { font-size: 0.9rem; opacity: 0.5; text-align: center; padding: 2rem; font-weight: 800; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <header className="view-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0, fontWeight: 1000, color: 'var(--primary)' }}>{t.nav_title || (isAr ? 'النظام المالي السيادي' : 'Sovereign Fiscal System')}</h2>
          <p className="view-subtitle" style={{ margin: 0, opacity: 0.6, fontWeight: 700 }}>{t.invoice_desc}</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
           <div className="search-bar-premium glass-premium" style={{ background: 'var(--surface)' }}>
              <Search size={18} style={{ color: 'var(--primary)' }} />
              <input 
                type="text" 
                placeholder={isAr ? 'بحث مالي...' : 'Fiscal search...'} 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
           </div>
           
           <div style={{ display: 'flex', gap: '0.8rem', background: 'var(--surface-container-low)', padding: '0.5rem', borderRadius: '18px' }}>
              <TabButton active={activeTab === 'invoice'} onClick={() => setActiveTab('invoice')} label={t.invoice_editor} icon={<Plus size={18} />} />
              <TabButton active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} label={t.journal} icon={<BookOpen size={18} />} />
              <TabButton active={activeTab === 'ledger'} onClick={() => setActiveTab('ledger')} label={t.ledger_summary} icon={<LucideBarChart size={18} />} />
              <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} label={isAr ? 'التقارير' : 'Reports'} icon={<Activity size={18} />} />
              <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} label={isAr ? 'الأصول' : 'Assets'} icon={<TrendingUp size={18} />} />
           </div>
           
           <button onClick={() => localDB.exportData('sovereign_backup')} className="btn-sovereign-outline" style={{ padding: '0.6rem 1.4rem', fontSize: '0.9rem' }}>
              <Download size={18} /> {isAr ? 'نسخة احتياطية' : 'Backup'}
           </button>
        </div>
      </header>

      {renderDashboard()}

      {activeTab === 'invoice' && renderInvoiceEditor()}
      {activeTab === 'journal' && renderJournal()}
      {activeTab === 'ledger' && renderLedger()}
      {activeTab === 'reports' && <ReportsView isAr={isAr} invoices={invoices} journalEntries={journalEntries} ledgerAccounts={ledgerAccounts} downloadCSV={downloadCSV} activeReportTab={activeReportTab} setActiveReportTab={setActiveReportTab} />}
      {activeTab === 'contracts' && <ContractsSubView contracts={contracts} isAr={isAr} setShowContractModal={setShowContractModal} />}
      {activeTab === 'assets' && <AssetsView assets={fixedAssets} isAr={isAr} setShowAssetModal={setShowAssetModal} onRunDepreciation={handleRunDepreciation} />}

      {showJournalModal && (
        <ManualJournalModal 
          newEntry={newJournalEntry} 
          setNewEntry={setNewJournalEntry} 
          ledgerAccounts={ledgerAccounts}
          onClose={() => setShowJournalModal(false)} 
          onSave={handleManualJournalEntry} 
          isAr={isAr} 
        />
      )}

      {selectedLedgerAccount && (
        <LedgerDetailModal 
          account={selectedLedgerAccount} 
          journalEntries={journalEntries.filter(e => e.debit_account === selectedLedgerAccount.name_ar || e.credit_account === selectedLedgerAccount.name_ar || e.debit_account === selectedLedgerAccount.name || e.credit_account === selectedLedgerAccount.name)}
          onClose={() => setSelectedLedgerAccount(null)}
          isAr={isAr}
        />
      )}

      {showPreview && (
        <InvoicePreviewModal 
          clientName={clientName} 
          taxId={taxId} 
          items={items} 
          subtotal={calculateSubtotal()}
          vat={calculateVAT()}
          vatRate={vatRate}
          total={calculateTotal()}
          isSettlement={invoiceMode === 'settlement'}
          declarationNumber={declarationNumber}
          bolNumber={bolNumber}
          operationNumber={operationNumber}
          customsFees={customsFees}
          portFees={portFees}
          transportExpenses={transportExpenses}
          inventoryValue={inventoryValue}
          onDismiss={() => setShowPreview(false)}
          onPrint={() => window.print()}
          onWhatsApp={() => showToast('Encrypted WhatsApp share initiated', 'success')}
          settings={settings}
          t={t}
        />
      )}

      {showContractModal && (
        <ContractModal 
          contractType={contractType} 
          newContract={newContract} 
          setNewContract={setNewContract} 
          onClose={() => setShowContractModal(false)} 
          onSave={handleAddContract} 
          isAr={isAr} 
        />
      )}

      {showAssetModal && (
        <AssetModal 
          newAsset={newAsset} 
          setNewAsset={setNewAsset} 
          onClose={() => setShowAssetModal(false)} 
          onSave={handleAddAsset} 
          isAr={isAr} 
        />
      )}
    </div>
  );
}

// --- Specialized Sub-Views ---

function ReportsView({ isAr, invoices, journalEntries, ledgerAccounts, downloadCSV, activeReportTab, setActiveReportTab }: any) {
  const metrics = useMemo(() => {
    const rev = invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
    const cost = invoices.reduce((s: number, i: any) => s + (i.transport_expenses || 0), 0);
    const prof = invoices.reduce((s: number, i: any) => s + (i.profit || 0), 0);
    
    // Calculate total general expenses (manual entries to Expense accounts)
    const genExps = journalEntries.filter((e: any) => 
      !e.is_automated && (e.debit_account.includes('مصروف') || e.debit_account.includes('Expense'))
    ).reduce((s: number, e: any) => s + e.amount, 0);

    return { rev, cost, prof, genExps, net: prof - genExps, margin: rev > 0 ? (((prof - genExps) / rev) * 100).toFixed(1) : 0 };
  }, [invoices, journalEntries]);

  return (
    <div className="fade-in">
       <div className="card shadow-elite" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontWeight: 1000, margin: 0, color: 'var(--primary)' }}><LucideBarChart size={24} /> {isAr ? 'التحليل المالي السيادي' : 'Sovereign Financial Analysis'}</h3>
            <div style={{ display: 'flex', gap: '0.8rem', background: 'var(--surface-container-low)', padding: '0.4rem', borderRadius: '14px' }}>
               <button onClick={() => setActiveReportTab('profit')} className={`tab-btn-small ${activeReportTab === 'profit' ? 'active' : ''}`}>{isAr ? 'قائمة الدخل' : 'Income Statement'}</button>
               <button onClick={() => setActiveReportTab('trial')} className={`tab-btn-small ${activeReportTab === 'trial' ? 'active' : ''}`}>{isAr ? 'ميزان المراجعة' : 'Trial Balance'}</button>
               <button onClick={() => setActiveReportTab('balance_sheet')} className={`tab-btn-small ${activeReportTab === 'balance_sheet' ? 'active' : ''}`}>{isAr ? 'الميزانية العمومية' : 'Balance Sheet'}</button>
               <button onClick={() => setActiveReportTab('vat' as any)} className={`tab-btn-small ${activeReportTab === ('vat' as any) ? 'active' : ''}`}>{isAr ? 'تحليل الضريبة' : 'VAT Analysis'}</button>
            </div>
            <button onClick={() => downloadCSV(journalEntries, 'Fiscal_Report')} className="btn-sovereign-outline" style={{ padding: '0.6rem 1rem' }}><Download size={16} /> Export CSV</button>
          </div>

          <style>{`
            .tab-btn-small { padding: 0.5rem 1rem; border: none; background: transparent; border-radius: 10px; font-weight: 800; cursor: pointer; color: var(--on-surface-variant); transition: 0.3s; font-size: 0.85rem; }
            .tab-btn-small.active { background: var(--primary); color: white; }
          `}</style>

          {activeReportTab === 'profit' && (
            <div className="slide-in">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                 <SummaryMetric label={isAr ? 'الهامش الربحي الصافي' : 'Net Profit Margin'} value={`${metrics.margin}%`} icon={<Activity size={18} />} primary />
                 <SummaryMetric label={isAr ? 'إجمالي الإيرادات' : 'Total Revenue'} value={metrics.rev.toLocaleString()} icon={<DollarSign size={18} />} />
                 <SummaryMetric label={isAr ? 'صافي الدخل' : 'Net Income'} value={metrics.net.toLocaleString()} icon={<TrendingUp size={18} />} />
              </div>

              <section style={{ height: '400px', background: 'var(--surface-container-lowest)', padding: '2rem', borderRadius: '32px', marginBottom: '3rem', border: '1px solid var(--surface-container-high)', boxShadow: 'var(--shadow-premium)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', fontWeight: 1000, color: 'var(--primary)' }}>
                  <Activity size={20} />
                  {isAr ? 'منحنى الإيرادات (آخر 10 عمليات)' : 'Revenue Trend (Latest 10)'}
                </h4>
                <ResponsiveContainer width="100%" height="300">
                  <LineChart data={invoices.slice(-10).map(i => ({ date: i.date, amount: i.amount }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="date" hide />
                    <YAxis tick={{fill: 'var(--on-surface)', fontWeight: 800, fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-premium)', background: 'var(--surface)' }} />
                    <Line type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={4} dot={{ r: 6, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </section>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                 <QuickActionCard 
                   title={isAr ? 'تقرير الربحية' : 'Profit Report'} 
                   desc={isAr ? 'مراجعة الأداء المالي للفترة' : 'Review financial performance'} 
                   onClick={() => setActiveTab('reports')} 
                   icon={<BarChart size={24} />} 
                 />
                 <QuickActionCard 
                   title={isAr ? 'إهلاك الأصول' : 'Asset Depreciation'} 
                   desc={isAr ? 'تحديث مجمع الإهلاك الشهري' : 'Update monthly depreciation'} 
                   onClick={() => setActiveTab('assets')} 
                   icon={<TrendingDown size={24} />} 
                 />
                 <QuickActionCard 
                   title={isAr ? 'تحليل الضريبة' : 'VAT Analysis'} 
                   desc={isAr ? 'مراجعة ضريبة القيمة المضافة' : 'Review VAT status'} 
                   onClick={() => { setActiveTab('reports'); setActiveReportTab('vat' as any); }} 
                   icon={<ShieldCheck size={24} />} 
                 />
              </div>

              <div style={{ height: '300px', marginBottom: '3rem', background: 'var(--surface)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--surface-container-high)' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: isAr ? 'الإيرادات' : 'Revenue', value: metrics.rev },
                    { name: isAr ? 'التكاليف' : 'Costs', value: metrics.cost + metrics.genExps },
                    { name: isAr ? 'الأرباح' : 'Profit', value: metrics.net }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{fill: 'var(--on-surface)', fontWeight: 800, fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill: 'var(--on-surface)', fontWeight: 800, fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'var(--surface-container-high)'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {[0, 1, 2].map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : index === 1 ? 'var(--error)' : 'var(--success)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: 'var(--surface-container-lowest)', borderRadius: '24px', padding: '2rem', border: '1px solid var(--surface-container-high)' }}>
                 <h4 style={{ fontWeight: 1000, color: 'var(--primary)', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-container-low)', paddingBottom: '1rem' }}>{isAr ? 'قائمة الدخل - الفترة الحالية' : 'Income Statement - Current Period'}</h4>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <StatementRow label={isAr ? 'إجمالي إيرادات المبيعات' : 'Total Sales Revenue'} value={metrics.rev} />
                    <StatementRow label={isAr ? 'تكاليف النقل المباشرة' : 'Direct Transport Costs'} value={-metrics.cost} />
                     <div style={{ borderTop: '1px solid var(--surface-container-low)', paddingTop: '0.5rem' }}>
                        <StatementRow label={isAr ? 'إجمالي الربح التشغيلي' : 'Gross Operating Profit'} value={metrics.prof} isTotal />
                     </div>
                     <StatementRow label={isAr ? 'المصاريف العمومية والإدارية' : 'General & Admin Expenses'} value={-metrics.genExps} />
                     <div style={{ borderTop: '2px solid var(--primary)', paddingTop: '1rem', marginTop: '1rem' }}>
                        <StatementRow label={isAr ? 'صافي دخل الميزان' : 'Net Sovereign Income'} value={metrics.net} isHighlight />
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeReportTab === 'trial' && <TrialBalanceView ledgerAccounts={ledgerAccounts} isAr={isAr} />}
          {activeReportTab === 'balance_sheet' && <BalanceSheetView ledgerAccounts={ledgerAccounts} isAr={isAr} />}
          {activeReportTab === ('vat' as any) && <VATAnalysisView invoices={invoices} isAr={isAr} />}
       </div>
    </div>
  );
}

function VATAnalysisView({ invoices, isAr }: any) {
    const vatCollected = invoices.reduce((s: number, i: any) => s + (i.vat || 0), 0);
    const taxableAmount = invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
    
    const pieData = [
      { name: isAr ? 'ضريبة محصلة' : 'Collected VAT', value: vatCollected },
      { name: isAr ? 'وعاء ضريبي' : 'Taxable Base', value: taxableAmount },
    ];

    return (
        <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 300px', gap: '2rem', marginBottom: '3rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="card glass-premium" style={{ background: 'var(--primary)', color: 'white', padding: '2rem' }}>
                        <h4 style={{ margin: 0, opacity: 0.7, fontWeight: 800 }}>{isAr ? 'إجمالي الضريبة المستحقة للهيئة' : 'Total VAT Payable to ZATCA'}</h4>
                        <h1 style={{ fontSize: '3rem', fontWeight: 1000, margin: '1rem 0', color: 'var(--secondary)' }}>{vatCollected.toLocaleString()} <small style={{ fontSize: '1.2rem' }}>SAR</small></h1>
                        <p style={{ margin: 0, fontWeight: 700, opacity: 0.6 }}>{isAr ? 'بناءً على الفواتير الضريبية الصادرة' : 'Based on issued tax invoices'}</p>
                    </div>
                    <div className="card" style={{ border: '2px dashed var(--surface-container-high)', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontWeight: 800, opacity: 0.6 }}>{isAr ? 'إجمالي الوعاء الضريبي' : 'Total Taxable Base'}</span>
                            <span style={{ fontWeight: 1000, color: 'var(--primary)' }}>{taxableAmount.toLocaleString()} SAR</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 800, opacity: 0.6 }}>{isAr ? 'معدل الضريبة المطبق' : 'Applied VAT Rate'}</span>
                            <span style={{ fontWeight: 1000, color: 'var(--primary)' }}>15%</span>
                        </div>
                    </div>
                </div>
                <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                <Cell fill="var(--primary)" />
                                <Cell fill="var(--surface-container-high)" />
                            </Pie>
                            <Tooltip contentStyle={{ borderRadius: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="card shadow-elite" style={{ padding: '2rem' }}>
                <h4 style={{ fontWeight: 1000, color: 'var(--primary)', marginBottom: '1.5rem' }}>{isAr ? 'سجل الفواتير الضريبية' : 'Tax Invoice Ledger'}</h4>
                <table className="sovereign-table-premium">
                    <thead>
                        <tr>
                            <th>{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                            <th>{isAr ? 'العميل' : 'Customer'}</th>
                            <th>{isAr ? 'المبلغ الخاضع' : 'Taxable Amt'}</th>
                            <th>{isAr ? 'قيمة الضريبة' : 'VAT Amt'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.filter((i: any) => (i.vat || 0) > 0).map((i: any) => (
                            <tr key={i.id}>
                                <td style={{ fontWeight: 800 }}>{i.reference_number}</td>
                                <td style={{ fontWeight: 700 }}>{i.customer_id}</td>
                                <td style={{ fontWeight: 900 }}>{i.amount.toLocaleString()}</td>
                                <td style={{ fontWeight: 1000, color: 'var(--primary)' }}>{i.vat.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function TrialBalanceView({ ledgerAccounts, isAr }: any) {
  const totals = ledgerAccounts.reduce((acc: any, curr: any) => {
    const isDr = curr.type === 'asset' || curr.type === 'expense';
    if (isDr) acc.debit += curr.balance;
    else acc.credit += curr.balance;
    return acc;
  }, { debit: 0, credit: 0 });

  return (
    <div className="slide-in">
       <table className="sovereign-table-premium">
          <thead>
            <tr style={{ background: 'var(--surface-container-low)' }}>
              <th style={{ paddingInlineStart: '2rem' }}>{isAr ? 'الحساب' : 'Account'}</th>
              <th>{isAr ? 'النوع' : 'Type'}</th>
              <th style={{ textAlign: 'center' }}>{isAr ? 'مدين' : 'Debit'}</th>
              <th style={{ textAlign: 'center', paddingInlineEnd: '2rem' }}>{isAr ? 'دائن' : 'Credit'}</th>
            </tr>
          </thead>
          <tbody>
            {ledgerAccounts.map((acc: any) => {
              const isDr = acc.type === 'asset' || acc.type === 'expense';
              return (
                <tr key={acc.id}>
                  <td style={{ paddingInlineStart: '2rem', fontWeight: 800 }}>{isAr ? acc.name_ar : acc.name}</td>
                  <td style={{ opacity: 0.6, fontSize: '0.85rem' }}>{acc.type.toUpperCase()}</td>
                  <td style={{ textAlign: 'center', fontWeight: 900, color: isDr ? 'var(--primary)' : 'transparent' }}>{isDr ? acc.balance.toLocaleString() : '-'}</td>
                  <td style={{ textAlign: 'center', paddingInlineEnd: '2rem', fontWeight: 900, color: !isDr ? 'var(--primary)' : 'transparent' }}>{!isDr ? acc.balance.toLocaleString() : '-'}</td>
                </tr>
              );
            })}
            <tr style={{ background: 'var(--surface-container-low)', borderTop: '2px solid var(--primary)' }}>
               <td colSpan={2} style={{ paddingInlineStart: '2rem', fontWeight: 1000, color: 'var(--primary)' }}>{isAr ? 'الإجمالي العام' : 'GRAND TOTAL'}</td>
               <td style={{ textAlign: 'center', fontWeight: 1000, color: 'var(--primary)', fontSize: '1.2rem' }}>{totals.debit.toLocaleString()}</td>
               <td style={{ textAlign: 'center', paddingInlineEnd: '2rem', fontWeight: 1000, color: 'var(--primary)', fontSize: '1.2rem' }}>{totals.credit.toLocaleString()}</td>
            </tr>
          </tbody>
       </table>
    </div>
  );
}

function BalanceSheetView({ ledgerAccounts, isAr }: any) {
  const assets = ledgerAccounts.filter((a: any) => a.type === 'asset');
  const liabilities = ledgerAccounts.filter((a: any) => a.type === 'liability');
  const equity = ledgerAccounts.filter((a: any) => a.type === 'equity');
  
  const totalAssets = assets.reduce((s: number, a: any) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s: number, a: any) => s + a.balance, 0);
  const totalEquity = equity.reduce((s: number, a: any) => s + a.balance, 0);

  return (
    <div className="slide-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
       <div>
          <h4 style={{ borderBottom: '2px solid var(--success)', paddingBottom: '0.8rem', marginBottom: '1.2rem', fontWeight: 1000 }}>{isAr ? 'الأصول' : 'ASSETS'}</h4>
          {assets.map((a: any) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-container-low)' }}>
               <span style={{ fontWeight: 700 }}>{isAr ? a.name_ar : a.name}</span>
               <span style={{ fontWeight: 900 }}>{a.balance.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontWeight: 1000, fontSize: '1.2rem', color: 'var(--success)' }}>
             <span>{isAr ? 'إجمالي الأصول' : 'TOTAL ASSETS'}</span>
             <span>{totalAssets.toLocaleString()} SAR</span>
          </div>
       </div>
       <div>
          <h4 style={{ borderBottom: '2px solid var(--error)', paddingBottom: '0.8rem', marginBottom: '1.2rem', fontWeight: 1000 }}>{isAr ? 'الالتزامات وحقوق الملكية' : 'LIABILITIES & EQUITY'}</h4>
          <p style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.5, margin: '1rem 0 0.5rem' }}>{isAr ? 'الالتزامات' : 'LIABILITIES'}</p>
          {liabilities.map((a: any) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-container-low)' }}>
               <span style={{ fontWeight: 700 }}>{isAr ? a.name_ar : a.name}</span>
               <span style={{ fontWeight: 900 }}>{a.balance.toLocaleString()}</span>
            </div>
          ))}
          <p style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.5, margin: '1.5rem 0 0.5rem' }}>{isAr ? 'حقوق الملكية' : 'EQUITY'}</p>
          {equity.map((a: any) => (
            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--surface-container-low)' }}>
               <span style={{ fontWeight: 700 }}>{isAr ? a.name_ar : a.name}</span>
               <span style={{ fontWeight: 900 }}>{a.balance.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', fontWeight: 1000, fontSize: '1.2rem', color: 'var(--error)' }}>
             <span>{isAr ? 'الإجمالي' : 'TOTAL L&E'}</span>
             <span>{(totalLiabilities + totalEquity).toLocaleString()} SAR</span>
          </div>
       </div>
    </div>
  );
}

function ManualJournalModal({ newEntry, setNewEntry, ledgerAccounts, onClose, onSave, isAr }: any) {
  return (
    <div className="modal-overlay-premium fade-in">
      <div className="modal-card shadow-elite slide-up" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <h3 style={{ margin: 0, fontWeight: 1000 }}>{isAr ? 'إضافة قيد محاسبي يدوي' : 'Add Manual Journal Entry'}</h3>
          <button onClick={onClose} className="btn-close-elite"><X size={24} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
           <div className="form-group-premium" style={{ gridColumn: 'span 2' }}>
              <label>{isAr ? 'وصف القيد' : 'Description'}</label>
              <input type="text" value={newEntry.description} onChange={e => setNewEntry({...newEntry, description: e.target.value})} className="input-premium" placeholder={isAr ? 'مثال: سداد إيجار المكتب' : 'e.g. Office Rent Payment'} />
           </div>
           <div className="form-group-premium">
              <label>{isAr ? 'الحساب المدين' : 'Debit Account'}</label>
              <select value={newEntry.debit_account} onChange={e => setNewEntry({...newEntry, debit_account: e.target.value})} className="input-premium">
                 <option value="">{isAr ? '--- اختر ---' : '--- Select ---'}</option>
                 {ledgerAccounts.map((a: any) => <option key={a.id} value={isAr ? a.name_ar : a.name}>{isAr ? a.name_ar : a.name}</option>)}
              </select>
           </div>
           <div className="form-group-premium">
              <label>{isAr ? 'الحساب الدائن' : 'Credit Account'}</label>
              <select value={newEntry.credit_account} onChange={e => setNewEntry({...newEntry, credit_account: e.target.value})} className="input-premium">
                 <option value="">{isAr ? '--- اختر ---' : '--- Select ---'}</option>
                 {ledgerAccounts.map((a: any) => <option key={a.id} value={isAr ? a.name_ar : a.name}>{isAr ? a.name_ar : a.name}</option>)}
              </select>
           </div>
           <div className="form-group-premium">
              <label>{isAr ? 'المبلغ' : 'Amount'}</label>
              <input type="number" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} className="input-premium" />
           </div>
           <div className="form-group-premium">
              <label>{isAr ? 'التاريخ' : 'Date'}</label>
              <input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="input-premium" />
           </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
          <button onClick={onSave} className="btn-sovereign-primary" style={{ flex: 2 }}>{isAr ? 'ترحيل القيد' : 'Post Entry'}</button>
          <button onClick={onClose} className="btn-sovereign-outline" style={{ flex: 1 }}>{isAr ? 'إلغاء' : 'Cancel'}</button>
        </div>
      </div>
    </div>
  );
}

function LedgerDetailModal({ account, journalEntries, onClose, isAr }: any) {
  const balance = account.balance;
  return (
    <div className="modal-overlay-premium fade-in">
      <div className="modal-card shadow-elite slide-up" style={{ maxWidth: '900px', width: '95%' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontWeight: 1000, color: 'var(--primary)' }}>{isAr ? `كشف حساب: ${account.name_ar}` : `Ledger: ${account.name}`}</h3>
              <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem', fontWeight: 800 }}>{isAr ? 'سجل الحركات التفصيلي لهذا الحساب' : 'Detailed transaction log for this account'}</p>
            </div>
            <div style={{ textAlign: 'left' }}>
               <span style={{ fontSize: '0.8rem', fontWeight: 900, opacity: 0.5 }}>{isAr ? 'الرصيد الحالي' : 'Current Balance'}</span>
               <h4 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 1000, color: 'var(--primary)' }}>{balance.toLocaleString()} <small style={{ fontSize: '1rem' }}>SAR</small></h4>
            </div>
         </div>

         <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="sovereign-table-premium">
               <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ background: 'var(--surface-container-low)' }}>
                     <th style={{ paddingInlineStart: '1.5rem' }}>{isAr ? 'التاريخ' : 'Date'}</th>
                     <th>{isAr ? 'البيان' : 'Description'}</th>
                     <th style={{ textAlign: 'center' }}>{isAr ? 'مدين (+)' : 'Debit (+)'}</th>
                     <th style={{ textAlign: 'center' }}>{isAr ? 'دائن (-)' : 'Credit (-)'}</th>
                  </tr>
               </thead>
               <tbody>
                  {journalEntries.map((e: any) => {
                    const isDebit = e.debit_account === account.name_ar || e.debit_account === account.name;
                    return (
                      <tr key={e.id}>
                         <td style={{ paddingInlineStart: '1.5rem', fontWeight: 700 }}>{new Date(e.date).toLocaleDateString()}</td>
                         <td style={{ fontWeight: 600 }}>{e.description}</td>
                         <td style={{ textAlign: 'center', fontWeight: 1000, color: isDebit ? 'var(--success)' : 'transparent' }}>{isDebit ? e.amount.toLocaleString() : '-'}</td>
                         <td style={{ textAlign: 'center', fontWeight: 1000, color: !isDebit ? 'var(--error)' : 'transparent' }}>{!isDebit ? e.amount.toLocaleString() : '-'}</td>
                      </tr>
                    );
                  })}
                  {journalEntries.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', opacity: 0.4 }}>{isAr ? 'لا يوجد حركات مسجلة' : 'No transactions recorded'}</td></tr>}
               </tbody>
            </table>
         </div>

         <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} className="btn-sovereign-outline" style={{ padding: '0.8rem 2.5rem' }}>{isAr ? 'إغلاق' : 'Close'}</button>
         </div>
      </div>
    </div>
  );
}

function ContractsSubView({ contracts, isAr, setShowContractModal }: any) {
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 1000, color: 'var(--primary)', margin: 0 }}>{isAr ? 'إدارة العقود اللوجستية' : 'Logistics Contract Management'}</h3>
            <p style={{ margin: 0, opacity: 0.6, fontWeight: 700 }}>{isAr ? 'تتبع الاتفاقيات المالية مع العملاء والناقلين' : 'Track financial agreements with clients and carriers'}</p>
          </div>
          <button onClick={() => setShowContractModal(true)} className="btn-sovereign-primary"><Plus size={18} /> {isAr ? 'عقد جديد' : 'New Contract'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {contracts.map((c: any) => (
              <div key={c.id} className="card-contract-elite">
                  <div className="contract-status-bar">
                      <span className={`contract-badge ${c.type}`}>{c.type === 'client' ? (isAr ? 'عميل سيادي' : 'CLIENT') : (isAr ? 'ناقل معتمد' : 'TRANSPORT')}</span>
                      <span className="contract-ref">#{c.id}</span>
                  </div>
                  <h4 className="contract-name">{c.entity_name}</h4>
                  <div className="contract-metrics">
                      <div>
                          <label>{isAr ? 'القيمة الإجمالية' : 'Total Value'}</label>
                          <span className="value">{c.value.toLocaleString()} <small>SAR</small></span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                          <label>{isAr ? 'تاريخ الانتهاء' : 'Expiry'}</label>
                          <span className="expiry">{c.expiry_date || '-'}</span>
                      </div>
                  </div>
                  <style>{`
                    .card-contract-elite { background: var(--surface); padding: 1.8rem; border-radius: 28px; border: 1px solid var(--surface-container-high); box-shadow: 0 5px 25px rgba(0,0,0,0.02); }
                    .contract-status-bar { display: flex; justify-content: space-between; margin-bottom: 1.2rem; }
                    .contract-badge { font-size: 0.7rem; font-weight: 950; padding: 0.2rem 1rem; border-radius: 20px; }
                    .contract-badge.client { background: rgba(0,26,51,0.1); color: var(--primary); }
                    .contract-badge.transporter { background: rgba(212,167,106,0.1); color: #d4a76a; }
                    .contract-ref { font-size: 0.75rem; font-weight: 800; opacity: 0.4; }
                    .contract-name { font-size: 1.25rem; font-weight: 1000; color: var(--primary); margin: 0 0 1.5rem; border-bottom: 1px solid var(--surface-container-low); padding-bottom: 1rem; }
                    .contract-metrics { display: flex; justify-content: space-between; align-items: flex-end; }
                    .contract-metrics label { font-size: 0.75rem; font-weight: 900; opacity: 0.5; display: block; margin-bottom: 0.4rem; }
                    .contract-metrics .value { font-size: 1.5rem; font-weight: 1000; color: var(--primary); }
                    .contract-metrics .expiry { font-size: 1.1rem; font-weight: 900; color: var(--error); }
                  `}</style>
              </div>
          ))}
      </div>
    </div>
  );
}

// --- Helper Components ---

function SummaryRow({ label, value, isBold, currency }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.95rem', opacity: 0.9, fontWeight: 750 }}>{label}</span>
      <span style={{ fontWeight: isBold ? 950 : 800, fontSize: isBold ? '1.8rem' : '1.1rem', color: isBold ? 'var(--secondary)' : 'white' }}>{value} <small style={{ opacity: 0.6 }}>{currency || 'SAR'}</small></span>
    </div>
  );
}

function RecentTrx({ id, client, amount, onShare }: any) {
  return (
    <div className="recent-trx-row" onClick={onShare}>
       <div style={{ flex: 1 }}>
          <p style={{ fontSize: '0.9rem', fontWeight: 900, margin: 0, color: 'var(--primary)' }}>{id}</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: '0.2rem 0', fontWeight: 700 }}>{client}</p>
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontWeight: 1000, fontSize: '1rem', color: 'var(--primary)' }}>{amount} <small>SAR</small></span>
          <ArrowUpRight size={14} style={{ color: 'var(--success)' }} />
       </div>
       <style>{`
          .recent-trx-row { display: flex; justify-content: space-between; align-items: center; padding: 1.2rem; border-bottom: 1px solid var(--surface-container-low); cursor: pointer; transition: 0.2s; border-radius: 12px; }
          .recent-trx-row:hover { background: var(--surface-container-low); transform: scale(1.02); }
       `}</style>
    </div>
  );
}

function TabButton({ active, onClick, label, icon }: any) {
  return (
    <button className={`tab-btn-premium ${active ? 'active' : ''}`} onClick={onClick}>
      {icon} <span>{label}</span>
      <style>{`
        .tab-btn-premium { display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1.4rem; border-radius: 14px; border: none; background: transparent; color: var(--on-surface-variant); font-weight: 1000; font-size: 0.95rem; cursor: pointer; transition: 0.3s; font-family: 'Tajawal'; position: relative; }
        .tab-btn-premium.active { background: var(--primary); color: var(--secondary); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .tab-btn-premium:not(.active):hover { background: var(--surface-container-high); }
      `}</style>
    </button>
  );
}

function ReportMetric({ label, value, icon, isSuccess }: any) {
  return (
    <div className="report-metric-card">
      <div className={`icon-box ${isSuccess ? 'success' : ''}`}>{icon}</div>
      <div>
        <p className="label">{label}</p>
        <h4 className="value">{value} <small>SAR</small></h4>
      </div>
      <style>{`
        .report-metric-card { background: var(--surface); padding: 1.8rem; border-radius: 24px; border: 1px solid var(--surface-container-high); display: flex; align-items: center; gap: 1.2rem; box-shadow: 0 4px 20px rgba(0,0,0,0.02); }
        .icon-box { background: var(--surface-container-high); color: var(--primary); padding: 0.8rem; border-radius: 14px; }
        .icon-box.success { background: rgba(76, 175, 80, 0.1); color: var(--success); }
        .report-metric-card .label { margin: 0; font-size: 0.8rem; opacity: 0.6; font-weight: 800; }
        .report-metric-card .value { margin: 0; font-size: 1.4rem; font-weight: 1000; color: var(--primary); letter-spacing: -0.5px; }
        .report-metric-card .value small { font-size: 0.6em; opacity: 0.5; font-weight: 800; }
      `}</style>
    </div>
  );
}

function SummaryMetric({ label, value, icon, primary }: any) {
  return (
    <div className={`summ-met ${primary ? 'prim' : ''}`}>
       <div className="icon">{icon}</div>
       <div>
          <label>{label}</label>
          <span>{value}</span>
       </div>
       <style>{`
          .summ-met { padding: 1.2rem; border-radius: 18px; border: 1px solid var(--surface-container-high); display: flex; align-items: center; gap: 1rem; }
          .summ-met.prim { background: var(--primary); border: none; color: var(--secondary); }
          .summ-met .icon { opacity: 0.8; }
          .summ-met label { font-size: 0.75rem; font-weight: 900; display: block; opacity: 0.7; }
          .summ-met span { font-size: 1.15rem; font-weight: 1000; }
       `}</style>
    </div>
  );
}
function StatementRow({ label, value, isTotal, isHighlight }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0' }}>
       <span style={{ fontSize: isHighlight ? '1.4rem' : '1rem', fontWeight: isTotal || isHighlight ? 1000 : 700, opacity: isHighlight ? 1 : 0.8 }}>{label}</span>
       <span style={{ fontSize: isHighlight ? '1.8rem' : '1.1rem', fontWeight: 1000, color: value < 0 ? 'var(--error)' : isHighlight ? 'var(--primary)' : 'var(--on-surface)' }}>
         {value.toLocaleString()} <small style={{ fontSize: '0.7em', opacity: 0.5 }}>SAR</small>
       </span>
    </div>
  );
}

function QuickActionCard({ title, desc, onClick, icon }: any) {
  return (
    <button className="quick-action-card glass-premium" onClick={onClick}>
      <div className="icon-box">{icon}</div>
      <div style={{ textAlign: 'start' }}>
        <h4 style={{ margin: 0, fontWeight: 1000 }}>{title}</h4>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', opacity: 0.7, fontWeight: 700 }}>{desc}</p>
      </div>
      <Plus className="plus-icon" size={18} />
      <style>{`
        .quick-action-card {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1.5rem;
          background: var(--surface);
          border: 1px solid var(--surface-container-high);
          border-radius: 24px;
          cursor: pointer;
          transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          color: var(--on-surface);
          position: relative;
          overflow: hidden;
        }
        .quick-action-card:hover {
          transform: translateY(-8px);
          border-color: var(--primary);
          background: var(--surface-container-low);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .quick-action-card .icon-box {
          width: 50px;
          height: 50px;
          background: var(--primary-container);
          color: var(--primary);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .quick-action-card .plus-icon {
          position: absolute;
          right: 1.5rem;
          opacity: 0.2;
          transition: 0.3s;
        }
        .quick-action-card:hover .plus-icon {
          opacity: 1;
          color: var(--primary);
          right: 1.25rem;
        }
      `}</style>
    </button>
  );
}

function ContractModal({ contractType, newContract, setNewContract, onClose, onSave, isAr }: any) {
    return (
        <div className="modal-overlay-premium fade-in">
            <div className="modal-card shadow-elite slide-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 1000 }}>{isAr ? `توثيق عقد ${contractType === 'client' ? 'عميل' : 'ناقل'}` : `Certify ${contractType} Contract`}</h3>
                    <button onClick={onClose} className="btn-close-elite"><Plus size={24} style={{ transform: 'rotate(45deg)' }} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className="form-group-premium">
                        <label>{isAr ? 'اسم المنشأة' : 'Entity Name'}</label>
                        <input type="text" value={newContract.entity_name} onChange={e => setNewContract({...newContract, entity_name: e.target.value})} className="input-premium" />
                    </div>
                    <div className="form-group-premium">
                        <label>{isAr ? 'القيمة المالية' : 'Financial Value'}</label>
                        <input type="number" value={newContract.value} onChange={e => setNewContract({...newContract, value: e.target.value})} className="input-premium" />
                    </div>
                    <div className="form-group-premium">
                        <label>{isAr ? 'تاريخ الانتهاء' : 'Expiration Date'}</label>
                        <input type="date" value={newContract.expiry_date} onChange={e => setNewContract({...newContract, expiry_date: e.target.value})} className="input-premium" />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button onClick={onSave} className="btn-sovereign-primary" style={{ flex: 2 }}>{isAr ? 'اعتماد التوثيق' : 'Confirm Certification'}</button>
                        <button onClick={onClose} className="btn-sovereign-outline" style={{ flex: 1 }}>{isAr ? 'إلغاء' : 'Cancel'}</button>
                    </div>
                </div>
            </div>
            <style>{`
                .modal-overlay-premium { position: fixed; inset: 0; background: rgba(0,26,51,0.85); backdrop-filter: blur(10px); z-index: 9000; display: flex; align-items: center; justify-content: center; }
                .modal-card { background: var(--surface); width: 90%; max-width: 500px; padding: 2.5rem; border-radius: 32px; border: 1px solid var(--surface-container-high); }
                .btn-close-elite { background: transparent; border: none; color: var(--on-surface); cursor: pointer; }
                .slide-up { animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
                @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
}

// --- Invoice Preview Logic ---

function InvoicePreviewModal({ 
  clientName, taxId, items, subtotal, vat, total, isSettlement, 
  declarationNumber, bolNumber, operationNumber, customsFees, portFees, 
  transportExpenses, inventoryValue, vatRate, onDismiss, onPrint, onWhatsApp, t, settings 
}: any) {
    const isAr = t.lang === 'ar';
    const invoiceId = useMemo(() => Math.random().toString(36).substr(2, 6).toUpperCase(), []);
    
    return (
        <div className="modal-overlay-premium" style={{ overflowY: 'auto', display: 'block', padding: '2rem 0' }}>
            <div className="no-print" style={{ position: 'sticky', top: '2rem', zIndex: 100, display: 'flex', justifyContent: 'center', gap: '1rem', width: 'fit-content', margin: '0 auto 2rem', background: 'var(--primary)', padding: '0.8rem 2rem', borderRadius: '50px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                <button onClick={onPrint} className="btn-print-premium"><Printer size={18} /> {isAr ? 'طباعة PDF' : 'Print PDF'}</button>
                <button onClick={onWhatsApp} className="btn-print-premium" style={{ background: '#25D366' }}><ShieldCheck size={18} /> WhatsApp</button>
                <button onClick={onDismiss} className="btn-print-premium" style={{ background: '#ba1a1a' }}><X size={18} /> {isAr ? 'إغلاق' : 'Close'}</button>
            </div>
            
            <div className="print-canvas" style={{ background: 'white', width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '2cm', color: 'black', direction: 'rtl', fontFamily: 'Tajawal', boxShadow: '0 0 50px rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #001a33', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: 80, height: 80, background: '#001a33', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d4a76a', fontSize: '2rem', fontWeight: 1000 }}>{settings.companyName.charAt(0)}</div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 1000, color: '#001a33' }}>{settings.companyName}</h2>
                            <p style={{ margin: '0.2rem 0', fontSize: '0.9rem', opacity: 0.7, fontWeight: 800 }}>Sovereign Customs Clearance & Logistics</p>
                            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.5, fontWeight: 700 }}>TAX ID: {settings.taxNumber}</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', color: '#001a33', fontWeight: 1000 }}>{isSettlement ? (isAr ? 'قيد تسوية' : 'Settlement') : (isAr ? 'فاتورة ضريبية' : 'Tax Invoice')}</h1>
                        <p style={{ margin: '0.4rem 0', fontWeight: 900, fontSize: '1.2rem' }}>#{operationNumber || invoiceId}</p>
                    </div>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: '#f8f9fa', padding: '1.5rem', borderRadius: '16px', marginBottom: '3rem', border: '1px solid #eee' }}>
                    <MetadataBox label={isAr ? 'رقم البيان' : 'DEC NO'} value={declarationNumber} />
                    <MetadataBox label={isAr ? 'رقم البوليصة' : 'BOL NO'} value={bolNumber} />
                    <MetadataBox label={isAr ? 'رقم العملية' : 'OP NO'} value={operationNumber} />
                    <MetadataBox label={isAr ? 'قيمة الشحنة' : 'CARGO'} value={`${parseFloat(inventoryValue).toLocaleString()} SAR`} />
                 </div>

                 <div style={{ marginBottom: '3rem' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900, opacity: 0.5 }}>{isAr ? 'العميل المستهدف:' : 'Billed To:'}</p>
                    <h3 style={{ margin: '0.5rem 0', fontSize: '1.8rem', fontWeight: 1000, color: '#001a33' }}>{clientName}</h3>
                    {taxId && <p style={{ fontWeight: 800, opacity: 0.7 }}>رقم العميل الضريبي: {taxId}</p>}
                 </div>

                 <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem' }}>
                    <thead>
                        <tr style={{ background: '#001a33', color: 'white' }}>
                            <th style={{ padding: '1.2rem', textAlign: 'right', fontWeight: 900 }}>تفاصيل المعاملة</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontWeight: 900, width: '150px' }}>المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '1.5rem 1rem', fontWeight: 800 }}>{it.desc}</td>
                                <td style={{ padding: '1.5rem 1rem', textAlign: 'left', fontWeight: 1000 }}>{it.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                        {parseFloat(customsFees) > 0 && <tr><td style={{ padding: '1rem', fontWeight: 700, opacity: 0.6 }}>أمانات الجمارك</td><td style={{ padding: '1rem', textAlign: 'left', fontWeight: 900 }}>{parseFloat(customsFees).toLocaleString()}</td></tr>}
                        {parseFloat(portFees) > 0 && <tr><td style={{ padding: '1rem', fontWeight: 700, opacity: 0.6 }}>رسوم الموانئ</td><td style={{ padding: '1rem', textAlign: 'left', fontWeight: 900 }}>{parseFloat(portFees).toLocaleString()}</td></tr>}
                        {parseFloat(transportExpenses) > 0 && <tr><td style={{ padding: '1rem', fontWeight: 700, opacity: 0.6 }}>أجور النقل</td><td style={{ padding: '1rem', textAlign: 'left', fontWeight: 900 }}>{parseFloat(transportExpenses).toLocaleString()}</td></tr>}
                    </tbody>
                 </table>

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '2rem', borderTop: '2px solid #001a33' }}>
                    <div style={{ width: '150px' }}>
                        <QRCodeSVG 
                          value={generateZatcaQR(
                            settings.companyName,
                            settings.taxNumber,
                            new Date().toISOString(),
                            total.toString(),
                            vat.toString()
                          )} 
                          size={120} 
                          level="H" 
                        />
                        <p style={{ margin: '10px 0 0', fontSize: '7pt', textAlign: 'center', fontWeight: 1000 }}>ZATCA PHASE 2 COMPLIANT</p>
                    </div>
                    <div style={{ width: '350px' }}>
                        <SumRow label="المجموع الفرعي" value={subtotal.toLocaleString()} />
                        {!isSettlement && <SumRow label={`الضريبة (${vatRate}%)`} value={vat.toLocaleString()} />}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', fontWeight: 1000, fontSize: '2.5rem', color: '#001a33', borderTop: '4px solid #001a33', marginTop: '1rem' }}>
                            <span>الإجمالي</span>
                            <span>{total.toLocaleString()}</span>
                        </div>
                    </div>
                 </div>

                 <div style={{ marginTop: '5rem', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 1000, color: '#001a33', margin: 0 }}>شكراً لتعاملكم مع مؤسسة الغويري للتخليص الجمركي</p>
                    <p style={{ fontSize: '0.8rem', opacity: 0.5, fontWeight: 800, marginTop: '0.5rem' }}>نظام المحاسبة الموحد السيادي | {new Date().toLocaleDateString('ar-SA')}</p>
                 </div>
            </div>
            <style>{`
                .btn-print-premium { display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1.5rem; border-radius: 30px; border: none; font-weight: 1000; color: white; cursor: pointer; transition: 0.3s; }
                .btn-print-premium:hover { transform: translateY(-3px); }
                @media print { .no-print { display: none !important; } .print-canvas { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; } }
            `}</style>
        </div>
    );
}

function MetadataBox({ label, value }: any) {
  return (
    <div>
       <span style={{ fontSize: '0.7rem', fontWeight: 1000, opacity: 0.4 }}>{label}</span>
       <span style={{ display: 'block', fontSize: '1rem', fontWeight: 1000, color: '#001a33', marginTop: '0.2rem' }}>{value || '-'}</span>
    </div>
  );
}

function SumRow({ label, value }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', fontWeight: 900, fontSize: '1.1rem' }}>
        <span style={{ opacity: 0.5 }}>{label}</span>
        <span>{value} SAR</span>
    </div>
  );
}function AssetsView({ assets, isAr, setShowAssetModal, onRunDepreciation }: any) {
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 1000, color: 'var(--primary)', margin: 0 }}>{isAr ? 'إدارة الأصول الثابتة' : 'Fixed Assets Management'}</h3>
            <p style={{ margin: 0, opacity: 0.6, fontWeight: 700 }}>{isAr ? 'تتبع الممتلكات والمعدات واحتساب الإهلاك' : 'Track property, equipment and calculate depreciation'}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={onRunDepreciation} className="btn-sovereign-outline"><Activity size={18} /> {isAr ? 'تشغيل الإهلاك الشهري' : 'Run Monthly Depr'}</button>
            <button onClick={() => setShowAssetModal(true)} className="btn-sovereign-primary"><Plus size={18} /> {isAr ? 'إضافة أصل' : 'Add Asset'}</button>
          </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {assets.map((a: any) => (
              <div key={a.id} className="card-contract-elite">
                  <div className="contract-status-bar">
                      <span className="contract-badge client">{a.category}</span>
                      <span className="contract-ref">#{a.id}</span>
                  </div>
                  <h4 className="contract-name">{isAr ? a.name_ar : a.name_en}</h4>
                  <div className="contract-metrics">
                      <div>
                          <label>{isAr ? 'قيمة الشراء' : 'Purchase Value'}</label>
                          <span className="value">{a.purchase_value.toLocaleString()} <small>SAR</small></span>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                          <label>{isAr ? 'معدل الإهلاك' : 'Depr. Rate'}</label>
                          <span className="expiry" style={{ color: 'var(--success)' }}>{a.depreciation_rate}%</span>
                      </div>
                  </div>
              </div>
          ))}
          {assets.length === 0 && <p className="empty-state-text">{isAr ? 'لا يوجد أصول مسجلة حالياً' : 'No assets registered yet'}</p>}
      </div>
    </div>
  );
}

function AssetModal({ newAsset, setNewAsset, onClose, onSave, isAr }: any) {
    return (
        <div className="modal-overlay-premium fade-in">
            <div className="modal-card shadow-elite slide-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 1000 }}>{isAr ? 'تسجيل أصل ثابت جديد' : 'Register New Fixed Asset'}</h3>
                    <button onClick={onClose} className="btn-close-elite"><X size={24} /></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div className="form-group-premium">
                        <label>{isAr ? 'اسم الأصل (عربي)' : 'Asset Name (AR)'}</label>
                        <input type="text" value={newAsset.name_ar} onChange={e => setNewAsset({...newAsset, name_ar: e.target.value})} className="input-premium" />
                    </div>
                    <div className="form-group-premium">
                        <label>{isAr ? 'قيمة الشراء' : 'Purchase Value'}</label>
                        <input type="number" value={newAsset.purchase_value} onChange={e => setNewAsset({...newAsset, purchase_value: parseFloat(e.target.value)})} className="input-premium" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group-premium">
                            <label>{isAr ? 'معدل الإهلاك (%)' : 'Depr. Rate (%)'}</label>
                            <input type="number" value={newAsset.depreciation_rate} onChange={e => setNewAsset({...newAsset, depreciation_rate: parseFloat(e.target.value)})} className="input-premium" />
                        </div>
                        <div className="form-group-premium">
                            <label>{isAr ? 'تاريخ الشراء' : 'Purchase Date'}</label>
                            <input type="date" value={newAsset.purchase_date} onChange={e => setNewAsset({...newAsset, purchase_date: e.target.value})} className="input-premium" />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button onClick={onSave} className="btn-sovereign-primary" style={{ flex: 2 }}>{isAr ? 'حفظ الحيازة' : 'Save Asset'}</button>
                        <button onClick={onClose} className="btn-sovereign-outline" style={{ flex: 1 }}>{isAr ? 'إلغاء' : 'Cancel'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

