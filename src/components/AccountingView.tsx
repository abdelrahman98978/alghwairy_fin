import { useState, useEffect, useCallback, useMemo } from 'react';
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
  PieChart,
  Pie
} from 'recharts';
import { localDB } from '../lib/localDB';
import type { FixedAsset, Invoice, JournalEntry, LedgerAccount, Product, Contract } from '../lib/localDB';
import { generateZatcaQR, generateZatcaXML } from '../lib/zatca';
import { fmtDate } from '../lib/dateUtils';
import type { Translations } from '../types/translations';
import type { JSX } from 'react';

interface Props {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: Translations['accounting'] & { lang: string, nav_title?: string };
}

type TabType = 'invoice' | 'journal' | 'ledger' | 'reports' | 'contracts' | 'assets' | 'inventory';

interface SummaryRowProps {
  label: string;
  value: string | number;
  isBold?: boolean;
  currency?: string;
}

interface RecentTrxProps {
  id: string;
  client: string;
  amount: number | string;
  onShare: () => void;
  onCertify?: () => void;
  isCertified: boolean;
}

// Unused types removed to resolve warnings


interface QuickActionCardProps {
  title: string;
  desc: string;
  onClick: () => void;
  icon: string; // Changed to string for Material Symbol name
}

interface ReportsViewProps {
  isAr: boolean;
  invoices: Invoice[];
  journalEntries: JournalEntry[];
  ledgerAccounts: LedgerAccount[];
  downloadCSV: (data: any[], filename: string) => void;
  activeReportTab: 'profit' | 'trial' | 'balance_sheet' | 'vat';
  setActiveReportTab: (tab: 'profit' | 'trial' | 'balance_sheet' | 'vat') => void;
  setActiveTab: (tab: TabType) => void;
}

interface ContractsSubViewProps {
  isAr: boolean;
  contracts: Contract[];
  setShowContractModal: (show: boolean) => void;
  onSign: (contractId: string) => void;
  onDownload: (contract: Contract) => void;
  onDelete: (id: string) => void;
  downloadCSV: (data: any[], filename: string) => void;
}

interface InventoryManagementProps {
  products: Product[];
  isAr: boolean;
  setShowProductModal: (show: boolean) => void;
  onRestock: (id: string) => void;
}

interface AssetsViewProps {
  assets: FixedAsset[];
  isAr: boolean;
  setShowAssetModal: (show: boolean) => void;
  onRunDepreciation: () => void;
}

interface ManualJournalModalProps {
  newEntry: { date: string; description: string; debit_account: string; credit_account: string; amount: string; reference: string };
  setNewEntry: (entry: { date: string; description: string; debit_account: string; credit_account: string; amount: string; reference: string }) => void;
  ledgerAccounts: LedgerAccount[];
  onClose: () => void;
  onSave: () => void;
  isAr: boolean;
}

interface LedgerDetailModalProps {
  account: LedgerAccount;
  journalEntries: JournalEntry[];
  onClose: () => void;
  isAr: boolean;
}

interface ContractModalProps {
  contractType: 'client' | 'transporter';
  newContract: { entity_name: string; value: string; expiry_date: string; terms: string };
  setNewContract: (c: { entity_name: string; value: string; expiry_date: string; terms: string }) => void;
  onClose: () => void;
  onSave: () => void;
  isAr: boolean;
}

interface AssetModalProps {
  newAsset: Partial<FixedAsset>;
  setNewAsset: (a: Partial<FixedAsset>) => void;
  onClose: () => void;
  onSave: () => void;
  isAr: boolean;
}

interface ProductModalProps {
  newProduct: Partial<Product>;
  setNewProduct: (p: Partial<Product>) => void;
  onClose: () => void;
  onSave: () => void;
  isAr: boolean;
}



interface InvoicePreviewModalProps {
  clientName: string;
  taxId: string;
  items: { desc: string; amount: number }[];
  subtotal: number;
  vat: number;
  total: number;
  isSettlement: boolean;
  declarationNumber: string;
  bolNumber: string;
  operationNumber: string;
  customsFees: string | number;
  portFees: string | number;
  transportExpenses: string | number;
  inventoryValue: string | number;
  vatRate: number;
  onDismiss: () => void;
  onPrint: () => void;
  onWhatsApp: () => void;
  t: any;
  settings: any;
}

export default function AccountingView({ showToast, logActivity, t }: Props): JSX.Element {
  const isAr = t.lang === 'ar';
  const [activeTab, setActiveTab] = useState<TabType>('invoice');
  const [loading, setLoading] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>(() => {
    const transactions = localDB.getActive('invoices');
    if (Array.isArray(transactions)) {
      return [...transactions].sort((a, b) => 
        new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
      ).slice(0, 5) as Invoice[];
    }
    return [];
  });
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
  const [items, setItems] = useState<{id: number | string, desc: string, amount: number}[]>([]);
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  
  // Journal & Ledger State
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(() => {
    const journal = localDB.getAll('journal_entries');
    if (Array.isArray(journal)) {
      return [...journal].sort((a, b) => 
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      );
    }
    return [];
  });
  const [ledgerAccounts, setLedgerAccounts] = useState<LedgerAccount[]>(() => {
    const ledger = localDB.getAll('ledger_accounts');
    return Array.isArray(ledger) ? ledger as LedgerAccount[] : [];
  });
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const invs = localDB.getAll('invoices');
    return Array.isArray(invs) ? invs as Invoice[] : [];
  });
  const [activeReportTab, setActiveReportTab] = useState<'profit' | 'trial' | 'balance_sheet' | 'vat'>('profit');
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
  const [contracts, setContracts] = useState<any[]>(() => {
    const contrs = localDB.getAll('contracts');
    return Array.isArray(contrs) ? contrs : [];
  });
  const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(() => {
    const assets = localDB.getAll('fixed_assets');
    return Array.isArray(assets) ? assets : [];
  });
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [newAsset, setNewAsset] = useState<Partial<FixedAsset>>({
    name_ar: '',
    name_en: '',
    purchase_date: new Date().toISOString().split('T')[0],
    purchase_value: 0,
    depreciation_rate: 10,
    category: 'Equipment',
    useful_life: 5
  });
  
  // Inventory State
  const [products, setProducts] = useState<Product[]>(() => {
    const prods = localDB.getAll('products');
    return Array.isArray(prods) ? prods : [];
  });
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    sku: '',
    name_ar: '',
    name_en: '',
    category: '',
    unit: 'pcs',
    purchase_price: 0,
    selling_price: 0,
    quantity_on_hand: 0,
    min_stock_level: 5,
    tax_rate: 15
  });

  // Contracts State
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractType, _setContractType] = useState<'client' | 'transporter'>('client');
  const [newContract, setNewContract] = useState({
    entity_name: '',
    value: '',
    expiry_date: new Date().toISOString().split('T')[0],
    terms: ''
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
      
      const prods = localDB.getAll('products');
      setProducts(Array.isArray(prods) ? prods : []);
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  }, []);

  const certifyInvoice = (invoice: Invoice) => {
    try {
      const xml = generateZatcaXML(invoice);
      localDB.update('invoices', invoice.id, {
        zatca_certified: true,
        zatca_xml: xml,
        zatca_cert_date: new Date().toISOString()
      });
      showToast(isAr ? 'تم تصديق الفاتورة مع زاتكا بنجاح' : 'Invoice certified with ZATCA successfully', 'success');
      logActivity('ZATCA Phase 2 Compliance Certification', 'invoice', invoice.id);
      fetchData();
    } catch (err) {
      showToast(isAr ? 'خطأ في تصديق الفاتورة' : 'Error in certification process', 'error');
    }
  };

  const handleRestock = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const restockQty = 100; // Default restock amount for demonstration
    const totalCost = restockQty * product.purchase_price;

    try {
      // 1. Update Inventory
      localDB.addInventoryMovement({
        product_id: productId,
        type: 'in',
        quantity: restockQty,
        unit_price: product.purchase_price,
        date: new Date().toISOString(),
        reference_type: 'manual',
        reference_id: 'RST-' + Date.now(),
        notes: isAr ? `إعادة طلب تلقائية لـ ${product.name_ar}` : `Auto restock for ${product.name_en}`
      });

      // 2. Accounting Entry (Debit Inventory Asset, Credit Cash/Bank)
      localDB.addJournalEntry({
        date: new Date().toISOString(),
        description: isAr ? `شراء مخزون: ${product.name_ar} (الكمية: ${restockQty})` : `Inventory Purchase: ${product.name_en} (Qty: ${restockQty})`,
        debit_account: 'المخازن',
        credit_account: 'البنك',
        amount: totalCost,
        reference_type: 'inventory',
        reference_id: 'RST-' + Date.now(),
        status: 'posted',
        is_automated: true
      });

      showToast(isAr ? `تمت إعادة الطلب بنجاح (+${restockQty})` : `Restock completed successfully (+${restockQty})`, 'success');
      logActivity('Inventory Restocked', 'product', product.sku);
      fetchData();
    } catch (err) {
      showToast(isAr ? 'خطأ في عملية إعادة الطلب' : 'Error during restock process', 'error');
    }
  };

  const saveProduct = () => {
    try {
      if (!newProduct.name_ar || !newProduct.sku) {
        showToast(isAr ? 'الرجاء إدخال الاسم والرمز' : 'Please enter name and SKU', 'error');
        return;
      }
      localDB.insert('products', newProduct);
      showToast(isAr ? 'تم حفظ المنتج بنجاح' : 'Product saved successfully', 'success');
      logActivity('Inventory Product Created', 'product', newProduct.sku);
      setNewProduct({
        sku: '', name_ar: '', name_en: '', category: '', unit: 'pcs',
        purchase_price: 0, selling_price: 0, quantity_on_hand: 0, min_stock_level: 5, tax_rate: 15
      });
      setShowProductModal(false);
      fetchData();
    } catch (err) {
      showToast(isAr ? 'خطأ في حفظ المنتج' : 'Error saving product', 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  
  const calculateVAT = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    return (subtotal * vatRate) / 100;
  };

  const addItem = () => {
    if (!newItemDesc || !newItemAmount) return;
    setItems([...items, { id: Date.now() + Math.random(), desc: newItemDesc, amount: parseFloat(newItemAmount) }]);
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
    const vat = calculateVAT();
    // In Sovereign Ledger, 'Tax Invoice' and 'Internal' must include VAT. Settlement might be tax-neutral.
    if (invoiceMode === 'settlement') return subtotal + logistics;
    return subtotal + vat + logistics;
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

  const handleSignContract = (contractId: string) => {
    setContracts(prev => prev.map(c => 
      c.id === contractId ? { ...c, signed: true, signature_date: new Date().toISOString() } : c
    ));
    showToast(isAr ? 'تم توقيع العقد بنجاح' : 'Contract signed successfully', 'success');
    logActivity(isAr ? `توقيع عقد: ${contractId}` : `Sign contract: ${contractId}`, 'contracts', contractId);
  };

  const handleDeleteContract = (id: string) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف العقد؟' : 'Are you sure you want to delete this contract?')) return;
    localDB.delete('contracts', id);
    showToast(isAr ? 'تم حذف العقد' : 'Contract deleted', 'success');
    logActivity('Contract deleted', 'contracts', id);
    fetchData();
  };

  const handleDownloadContract = (contract: Contract) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast(isAr ? 'الرجاء السماح بالنوافذ المنبثقة للطباعة' : 'Please allow popups to print', 'error');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="\${isAr ? 'rtl' : 'ltr'}" lang="\${isAr ? 'ar' : 'en'}">
      <head>
        <title>عقد لوجستي سيادي #\${contract.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
          body { 
            font-family: 'Tajawal', sans-serif; 
            padding: 40px; 
            color: #111; 
            line-height: 1.8;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #001a33;
            padding-bottom: 20px;
            margin-bottom: 40px;
          }
          .header h1 { margin: 0; color: #001a33; font-weight: 900; }
          .header p { margin: 5px 0 0; color: #555; font-weight: 600; }
          .section { margin-bottom: 30px; }
          .section-title {
            background: #f1f5f9;
            padding: 10px 15px;
            font-weight: 800;
            color: #001a33;
            border-right: 4px solid #001a33;
            border-radius: 4px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 15px;
          }
          .field { margin-bottom: 15px; }
          .label { font-size: 0.9em; color: #666; font-weight: 700; display: block; }
          .value { font-size: 1.1em; font-weight: 800; color: #111; }
          .terms {
            background: #fafafa;
            padding: 20px;
            border: 1px solid #eee;
            border-radius: 8px;
            white-space: pre-wrap;
            margin-top: 10px;
            font-weight: 600;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 80px;
            text-align: center;
          }
          .sig-box {
            border-top: 2px dashed #999;
            padding-top: 15px;
          }
          .e-sign {
            color: #10b981;
            font-weight: 900;
            border: 2px solid #10b981;
            padding: 10px;
            border-radius: 8px;
            display: inline-block;
            margin-top: -40px;
            background: white;
            font-size: 0.9rem;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${window.location.origin}/logo.png" alt="Logo" style="height: 80px; object-fit: contain; margin-bottom: 15px;" onerror="this.style.display='none'" />
          <h1>مؤسسة الغويري للتخليص الجمركي</h1>
          <p>Alghwairy Customs Clearance Institution</p>
          <h2 style="margin-top: 30px; color: #111;">${contract.type === 'client' ? 'عقد تقديم خدمات تخليص جمركي ولوجستية' : 'عقد اتفاقية نقل ومساندة لوجستية'}</h2>
        </div>

        <div class="section">
          <div class="section-title">البيانات الأساسية للمتعاقد</div>
          <div class="grid">
            <div class="field">
              <span class="label">رقم العقد المرجعي</span>
              <span class="value">#${contract.id}</span>
            </div>
            <div class="field">
              <span class="label">تاريخ تحرير العقد</span>
              <span class="value">${contract.contract_date}</span>
            </div>
            <div class="field">
              <span class="label">تاريخ انتهاء الصلاحية</span>
              <span class="value">${contract.expiry_date || 'غير محدد'}</span>
            </div>
            <div class="field">
              <span class="label">حالة العقد</span>
              <span class="value">${contract.status === 'active' ? 'نشط وساري المفعول' : 'منتهي / ملغى'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">بيانات الطرف الثاني (العميل/الناقل)</div>
          <div class="field" style="margin-top: 15px;">
            <span class="label">اسم الجهة المتعاقدة</span>
            <span class="value" style="font-size: 1.3rem;">${contract.entity_name}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">التفاصيل المالية المتفق عليها</div>
          <div class="grid">
            <div class="field">
              <span class="label">القيمة الإجمالية للعقد</span>
              <span class="value">${Number(contract.value).toLocaleString()} SAR</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">البنود والشروط السيادية</div>
          <div class="terms">${contract.terms || 'تخضع هذه الاتفاقية للشروط والأحكام القياسية المعتمدة لدى مؤسسة الغويري للتخليص الجمركي، وحسب المواصفات المحددة من السلطات المختصة والأنظمة الأمنية واللوجستية.'}</div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <strong style="font-size: 1.1em;">الطرف الأول (مؤسسة الغويري)</strong>
            <br/><br/>
            ${contract.signed ? `
              <div class="e-sign">
                ✓ معتمد وموقع إلكترونياً
                <br/><small>${contract.signature_date}</small>
              </div>
            ` : `
              <div style="height: 60px; color: #999;">(التوقيع / الختم اليدوي)</div>
            `}
          </div>
          <div class="sig-box">
            <strong style="font-size: 1.1em;">الطرف الثاني (${contract.entity_name})</strong>
            <br/><br/>
            <div style="height: 60px; color: #999;">(التوقيع / الختم اليدوي)</div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
    
    showToast(isAr ? 'جاري تجهيز العقد للطباعة/PDF بصيغة احترافية' : 'Preparing professional PDF contract format', 'success');
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
      <div className="dashboard-sovereign fade-in" style={{ marginBottom: '2.5rem' }}>
        <div className="metrics-grid-stable">
          <SummaryMetric label={isAr ? 'الإيرادات السيادية' : 'Sovereign Revenue'} value={totalRevenue.toLocaleString()} icon="payments" variant="accent-blue" showCurrency />
          <SummaryMetric label={isAr ? 'تكاليف التشغيل' : 'Operating Costs'} value={totalCosts.toLocaleString()} icon="trending_down" variant="accent-red" showCurrency />
          <SummaryMetric label={isAr ? 'الأرباح التشغيلية' : 'Operating Profit'} value={netProfit.toLocaleString()} icon="monitoring" variant="accent-gold" showCurrency />
          <SummaryMetric label={isAr ? 'العقود النشطة' : 'Active Contracts'} value={activeContractCount.toString()} icon="description" variant="accent-success" />
        </div>

        <div className="quick-actions-stable">
           <QuickActionCard 
             title={isAr ? 'تقرير الربحية المحاسبي' : 'Accounting Profit Report'} 
             desc={isAr ? 'تحليل الأداء المالي والامتثال' : 'Analyze performance & compliance'} 
             onClick={() => setActiveTab('reports')} 
             icon="bar_chart" 
           />
           <QuickActionCard 
             title={isAr ? 'إهلاك الأصول الثابتة' : 'Fixed Asset Depreciation'} 
             desc={isAr ? 'تحديث مجمع الإهلاك السيادي' : 'Update sovereign depreciation'} 
             onClick={() => setActiveTab('assets')} 
             icon="trending_down" 
           />
           <QuickActionCard 
             title={isAr ? 'تحليل ضريبة VAT' : 'VAT Tax Analysis'} 
             desc={isAr ? 'مراجعة الإقرارات والامتثال' : 'Review returns & compliance'} 
             onClick={() => { setActiveTab('reports'); setActiveReportTab('vat'); }} 
             icon="verified_user" 
           />
        </div>

      </div>
    );
  };

  const renderInvoiceEditor = () => (
    <div className="invoice-editor-layout-premium">

      <div className="card shadow-elite" style={{ padding: '2.5rem', border: '1px solid var(--surface-container-high)', borderRadius: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '2.5rem', borderBottom: '2px solid var(--secondary)', paddingBottom: '1.5rem' }}>
          <div style={{ background: 'var(--primary)', padding: '1.2rem', borderRadius: '18px', color: 'var(--secondary)', boxShadow: 'var(--shadow-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>receipt_long</span>
          </div>
          <div>
            <h3 className="text-sovereign sharp-text" style={{ fontSize: '1.8rem', fontFamily: 'Tajawal', margin: 0, fontWeight: 950 }}>{t.items_title}</h3>
            <p className="sharp-text" style={{ margin: 0, fontSize: '0.95rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>{isAr ? 'منظومة إعداد الفواتير والقيود السيادية' : 'Sovereign Invoice & Entry System'}</p>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div className="bento-grid-form">
          <section className="bento-card">
            <h4 className="sovereign-header-gold sharp-text" style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              <span className="material-symbols-outlined icon-gold-glow" style={{ fontSize: '22px' }}>verified_user</span> {isAr ? 'الهوية والتعاقد' : 'Identity & Contract'}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group-premium">
                  <label className="label-premium"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span> {t.client_name}</label>
                  <div className="input-wrapper-premium">
                    <span className="material-symbols-outlined input-icon">search</span>
                    <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="input-premium-styled" placeholder={isAr ? 'اسم الشركة أو الفرد' : 'Entity Name'} />
                  </div>
              </div>
              <div className="form-group-premium">
                  <label className="label-premium"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>activity_zone</span> {t.tax_id}</label>
                  <div className="input-wrapper-premium">
                    <span className="material-symbols-outlined input-icon">activity_zone</span>
                    <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)} className="input-premium-styled" placeholder="310XXXXXXXXXXXX" />
                  </div>
              </div>
            </div>
          </section>

          <section className="bento-card">
            <h4 className="sovereign-header-gold sharp-text" style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
              <span className="material-symbols-outlined icon-gold-glow" style={{ fontSize: '22px' }}>package_2</span> {isAr ? 'البيانات الجمركية' : 'Customs Data'}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
              <div className="form-group-premium">
                  <label className="label-premium">{isAr ? 'البيان الجمركي' : 'Customs Dec'}</label>
                  <input type="text" value={declarationNumber} onChange={e => setDeclarationNumber(e.target.value)} className="input-premium" placeholder="XXXX-XXXX" />
              </div>
              <div className="form-group-premium">
                  <label className="label-premium">{isAr ? 'بوليصة الشحن' : 'BOL'}</label>
                  <input type="text" value={bolNumber} onChange={e => setBolNumber(e.target.value)} className="input-premium" placeholder="BOL-XXXX" />
              </div>
              <div className="form-group-premium">
                  <label className="label-premium">{isAr ? 'رقم العملية' : 'Op Number'}</label>
                  <input type="text" value={operationNumber} onChange={e => setOperationNumber(e.target.value)} className="input-premium" placeholder="OP-2026-XXX" />
              </div>
              <div className="form-group-premium">
                  <label className="label-premium">{isAr ? 'العملة' : 'Currency'}</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="input-premium">
                    <option value="SAR">🇸🇦 SAR</option>
                    <option value="USD">🇺🇸 USD</option>
                  </select>
              </div>
            </div>
          </section>
        </div>
        </div>

        <div className="items-container-premium glass-card" style={{ marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--accent-color)' }}>trending_up</span>
            <h4 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--primary)', fontWeight: 900 }}>{isAr ? 'بنود الفاتورة والخدمات' : 'Invoice Items & Services'}</h4>
          </div>
          
          <div className="item-add-row-premium">
              <input type="text" value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} placeholder={isAr ? 'وصف الخدمة أو البند...' : 'Service description...'} className="input-premium-styled flex-3" />
              <input type="number" value={newItemAmount} onChange={e => setNewItemAmount(e.target.value)} placeholder="0.00" className="input-premium-styled flex-1 text-center" />
              <button onClick={addItem} className="btn-sovereign-add"><span className="material-symbols-outlined">add</span></button>
          </div>

          <div className="items-list-premium">
              {items.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--on-surface-variant)', opacity: 1 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '1rem', color: 'var(--outline-variant)' }}>receipt_long</span>
                  <p>{isAr ? 'لا توجد بنود مضافة بعد' : 'No items added yet'}</p>
                </div>
              ) : items.map((item, index) => (
                  <div key={item.id} className="item-row-premium-v2">
                    <div className="item-info">
                      <span className="item-index">{(index + 1).toString().padStart(2, '0')}</span>
                      <span className="item-desc">{item.desc}</span>
                    </div>
                    <div className="item-actions-premium">
                       <span className="item-amount">{item.amount.toLocaleString()} <small>{currency}</small></span>
                       <button onClick={() => removeItem(index)} className="btn-delete-premium">
                         <span className="material-symbols-outlined">delete</span>
                       </button>
                    </div>
                  </div>
              ))}
          </div>
        </div>


        <div className="fees-grid-premium" style={{ marginBottom: '2rem' }}>
            <div className="fee-input-premium">
                <label className="text-sovereign">{isAr ? 'الرسوم الجمركية' : 'Customs Fees'}</label>
                <input type="number" value={customsFees} onChange={e => setCustomsFees(e.target.value)} placeholder="0.00" />
            </div>
            <div className="fee-input-premium">
                <label className="text-sovereign">{isAr ? 'أرضيات وموانئ' : 'Port & Storage'}</label>
                <input type="number" value={portFees} onChange={e => setPortFees(e.target.value)} placeholder="0.00" />
            </div>
            <div className="fee-input-premium">
                <label className="text-sovereign">{isAr ? 'أجور النقل' : 'Transport Charges'}</label>
                <input type="number" value={transportExpenses} onChange={e => setTransportExpenses(e.target.value)} placeholder="0.00" />
            </div>
        </div>

        <div className="invoice-actions-premium">
          <button disabled={loading} onClick={handleIssueInvoice} className="btn-sovereign-primary flex-2">
             {loading ? '...' : <><span className="material-symbols-outlined">verified_user</span> {isAr ? 'اعتماد وإرسال الفاتورة' : 'Approve & Issue Invoice'}</>}
          </button>
          <button onClick={() => { if (items.length > 0) setShowPreview(true); else showToast(isAr ? 'أضف بنوداً للمعاينة' : 'Add items to preview', 'error'); }} className="btn-sovereign-outline flex-1">
            <span className="material-symbols-outlined">print</span> {t.print_pdf}
          </button>
        </div>
      </div>

      <div className="sidebar-premium" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="card-executive accent-gold" style={{ minHeight: 'auto' }}>
          <div className="summary-content">
             <h3 className="summary-title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-color)', marginBottom: '2rem', fontSize: '1.4rem' }}>
               <span className="material-symbols-outlined">verified_user</span> {t.summation}
             </h3>
             <div className="summary-rows" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
               <SummaryRow label={t.subtotal} value={calculateSubtotal().toLocaleString()} currency={currency} />
               <SummaryRow label={isAr ? 'الرسوم التشغيلية' : 'Operational Fees'} value={calculateLogistics().toLocaleString()} currency={currency} />
               {invoiceMode !== 'invoice' && <SummaryRow label={t.vat} value={calculateVAT().toLocaleString()} currency={currency} />}
               <div className="summary-total-row" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid rgba(212,167,106,0.3)' }}>
                 <SummaryRow label={t.total} value={calculateTotal().toLocaleString()} currency={currency} isBold />
               </div>
             </div>
          </div>
        </div>

        <div className="card-executive accent-blue" style={{ minHeight: 'auto' }}>
          <h3 className="recent-title" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--accent-color)', marginBottom: '1.5rem' }}>
            <span className="material-symbols-outlined">history</span> {t.recent_title}
          </h3>
          <div className="recent-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
             {recentInvoices.map((inv) => (
                <RecentTrx 
                  key={`inv-${inv.id}-${inv.reference_number}`} 
                  id={inv.reference_number || ''} 
                  client={inv.customer_id || ''} 
                  amount={(inv.total || 0).toLocaleString()} 
                  isCertified={!!inv.zatca_certified}
                  onCertify={() => certifyInvoice(inv)}
                  onShare={() => showToast('Share feature active', 'info')}
                />
             ))}
             {recentInvoices.length === 0 && <p className="empty-state-text" style={{ padding: '2rem 1rem', textAlign: 'center' }}>{t.no_recent}</p>}
          </div>
        </div>
      </div>
    </div>
  );

  const renderJournal = () => (
    <div className="slide-in">
      <div className="card shadow-elite overflow-hidden">
        <div className="table-header-premium">
          <div className="header-info-premium">
            <div className="icon-container-gold"><span className="material-symbols-outlined" style={{ fontSize: '24px' }}>menu_book</span></div>
            <div>
              <h3 className="section-title-premium sharp-text">{t.journal}</h3>
              <p className="section-subtitle-premium">{isAr ? 'السجل التاريخي لجميع القيود المالية' : 'Chronological log of all financial entries'}</p>
            </div>
          </div>
          <div className="header-actions-premium">
            <button onClick={() => setShowJournalModal(true)} className="btn-sovereign-primary">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span> {isAr ? 'قيد يدوي' : 'Manual Entry'}
            </button>
            <div className="date-range-container">
               <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span>
               <input type="date" className="input-clean" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
               <input type="date" className="input-clean" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
            <div className="search-box-executive">
               <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>search</span>
               <input 
                 type="text" 
                 placeholder={isAr ? 'بحث في القيود...' : 'Search entries...'} 
                 value={journalSearch}
                 onChange={e => setJournalSearch(e.target.value)}
                 className="input-clean"
               />
            </div>
            <button onClick={() => downloadCSV(journalEntries, 'Journal_Sovereign')} className="btn-export-excel"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Export</button>
          </div>
        </div>

        <div className="table-container">
          <table className="sovereign-table-premium">
            <thead>
              <tr>
                <th className="padding-start-2-5">{isAr ? 'التاريخ' : 'Date'}</th>
                <th>{isAr ? 'وصف العملية' : 'Description'}</th>
                <th>{isAr ? 'الحساب المدين' : 'Debit'}</th>
                <th>{isAr ? 'الحساب الدائن' : 'Credit'}</th>
                <th className="text-center padding-end-2-5">{isAr ? 'المبلغ الصافي' : 'Net Amount'}</th>
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
                  <td className="padding-start-2-5 font-bold">{fmtDate(entry.date, t.lang)}</td>
                  <td className="font-semibold">{entry.description}</td>
                  <td className="text-success font-bold">{entry.debit_account}</td>
                  <td className="text-error font-bold">{entry.credit_account}</td>
                  <td className="text-center padding-end-2-5 font-black direction-ltr item-amount">
                    {entry.amount.toLocaleString()}.00 <span className="currency-small">SAR</span>
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
      <div className="card shadow-elite">
        <div className="table-header-premium">
          <div className="header-info-premium">
            <div className="icon-container-gold"><span className="material-symbols-outlined" style={{ fontSize: '24px' }}>database</span></div>
            <div>
              <h3 className="section-title-premium sharp-text">{t.general_ledger}</h3>
              <p className="section-subtitle-premium">{isAr ? 'ملخص أرصدة الحسابات والأستاذ العام' : 'Summary of account balances & general ledger'}</p>
            </div>
          </div>
          <div className="header-actions-premium">
            <div className="search-box-executive">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>search</span>
              <input 
                type="text" 
                placeholder={isAr ? 'بحث في الحسابات...' : 'Search accounts...'} 
                value={ledgerSearch}
                onChange={e => setLedgerSearch(e.target.value)}
                className="input-clean"
              />
            </div>
            <button onClick={() => downloadCSV(ledgerAccounts, 'Ledger_Sovereign')} className="btn-export-excel"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Export</button>
          </div>
        </div>

        <div className="table-container">
          <table className="sovereign-table-premium">
            <thead>
              <tr>
                <th className="padding-start-2-5">{isAr ? 'كود الحساب' : 'Code'}</th>
                <th>{isAr ? 'اسم الحساب' : 'Account Name'}</th>
                <th>{isAr ? 'التصنيف' : 'Category'}</th>
                <th className="text-center padding-end-2-5">{isAr ? 'الرصيد الحالي' : 'Current Balance'}</th>
              </tr>
            </thead>
            <tbody>
              {ledgerAccounts
                .filter(acc => 
                  acc.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                  acc.name_ar.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
                  acc.code?.includes(ledgerSearch)
                )
                .map((acc) => (
                <tr key={acc.id} onClick={() => setSelectedLedgerAccount(acc)} className="clickable-row">
                  <td className="padding-start-2-5 font-bold">{acc.code}</td>
                  <td className="font-black">{isAr ? acc.name_ar : acc.name}</td>
                  <td><span className={`status-badge-premium ${acc.type === 'asset' ? 'success' : acc.type === 'liability' ? 'warning' : 'info'}`}>{acc.type}</span></td>
                  <td className="text-center padding-end-2-5 font-black item-amount">
                    {acc.balance.toLocaleString()}.00 <span className="currency-small">SAR</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="accounting-view-container">
      <header className="sovereign-dual-header">
        <div className="sovereign-top-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2 className="sovereign-title-elite sharp-gold">
                <span className="material-symbols-outlined icon-gold-glow" style={{ marginInlineEnd: '0.75rem', fontSize: '24px' }}>verified_user</span>
                {t.nav_title || (isAr ? 'نظام المحاسبة الموحد السيادي' : 'Sovereign Fiscal System')}
              </h2>
              <div className="sovereign-status-badge">
                <span className="sovereign-status-dot"></span>
                {isAr ? 'النظام نشط' : 'System Active'}
              </div>
            </div>
            <p className="view-subtitle" style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 700, margin: 0 }}>{t.invoice_desc}</p>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <button className="btn-compact-gold" onClick={() => {
                try {
                  const data = JSON.stringify({ invoices, journalEntries, ledgerAccounts, contracts, products }, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `alghwairy_fiscal_backup_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                  showToast(isAr ? 'تم تصدير النسخة الاحتياطية بنجاح' : 'Backup exported successfully', 'success');
                } catch (e) {
                  showToast(isAr ? 'فشل تصدير النسخة الاحتياطية' : 'Failed to export backup', 'error');
                }
             }}>
                <span className="material-symbols-outlined">cloud_download</span> {isAr ? 'النسخ الاحتياطي' : 'Cloud Backup'}
             </button>
             <button className="btn-compact-outline" onClick={() => setActiveTab('invoice')}>
                <span className="material-symbols-outlined">add</span> {isAr ? 'فاتورة جديدة' : 'New Invoice'}
             </button>
          </div>
        </div>

        <div className="sovereign-nav-container">
           {[
             { id: 'invoice', label: t.invoice_editor, icon: 'receipt' },
             { id: 'journal', label: t.journal, icon: 'menu_book' },
             { id: 'ledger', label: t.ledger_summary, icon: 'database' },
             { id: 'inventory', label: isAr ? 'المخزون' : 'Stock', icon: 'package' },
             { id: 'assets', label: isAr ? 'الأصول' : 'Assets', icon: 'calculate' },
             { id: 'reports', label: isAr ? 'التقارير' : 'Reports', icon: 'assessment' },
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`sovereign-tab ${activeTab === tab.id ? 'active' : ''}`}
             >
               <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{tab.icon}</span>
               <span>{tab.label}</span>
             </button>
           ))}
        </div>
      </header>

      {activeTab === 'invoice' && renderInvoiceEditor()}
      {activeTab === 'journal' && renderJournal()}
      {activeTab === 'ledger' && renderLedger()}
      {activeTab === 'reports' && <ReportsView isAr={isAr} invoices={invoices} journalEntries={journalEntries} ledgerAccounts={ledgerAccounts} downloadCSV={downloadCSV} activeReportTab={activeReportTab} setActiveReportTab={setActiveReportTab} setActiveTab={setActiveTab} />}
      {activeTab === 'contracts' && (
        <ContractsSubView 
          contracts={contracts} 
          isAr={isAr} 
          setShowContractModal={setShowContractModal} 
          onSign={handleSignContract}
          onDownload={handleDownloadContract}
          onDelete={handleDeleteContract}
          downloadCSV={downloadCSV}
        />
      )}
      {activeTab === 'assets' && <AssetsView assets={fixedAssets} isAr={isAr} setShowAssetModal={setShowAssetModal} onRunDepreciation={handleRunDepreciation} />}
      {activeTab === 'inventory' && (
        <InventoryManagement 
          products={products} 
          isAr={isAr} 
          setShowProductModal={setShowProductModal} 
          onRestock={handleRestock}
        />
      )}
      {activeTab === 'invoice' && !loading && invoices.length === 0 && renderDashboard()}

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

      {showProductModal && (
        <ProductModal 
          newProduct={newProduct} 
          setNewProduct={setNewProduct} 
          onClose={() => setShowProductModal(false)} 
          onSave={saveProduct} 
          isAr={isAr} 
        />
      )}
    </div>
  );
}

// --- Specialized Sub-Views ---

function ReportsView({ isAr, invoices, journalEntries, ledgerAccounts, downloadCSV, activeReportTab, setActiveReportTab, setActiveTab }: ReportsViewProps) {
  const metrics = useMemo(() => {
    const rev = invoices.reduce((s: number, i: Invoice) => s + (i.amount || 0), 0);
    const cost = invoices.reduce((s: number, i: Invoice) => s + (i.transport_expenses || 0), 0);
    const prof = invoices.reduce((s: number, i: Invoice) => s + (i.profit || 0), 0);
    
    const genExps = journalEntries.filter((e: JournalEntry) => 
      !e.is_automated && (e.debit_account.includes('مصروف') || e.debit_account.includes('Expense'))
    ).reduce((s: number, e: JournalEntry) => s + e.amount, 0);

    return { rev, cost, prof, genExps, net: prof - genExps, margin: rev > 0 ? (((prof - genExps) / rev) * 100).toFixed(1) : 0 };
  }, [invoices, journalEntries]);

  return (
    <div className="fade-in">
       <div className="card shadow-elite padding-2">
          <div className="report-header-premium">
            <h3 className="sovereign-header-gold sharp-text" style={{ border: 'none', padding: 0, marginBottom: 0 }}><span className="material-symbols-outlined" style={{ fontSize: '24px' }}>bar_chart</span> {isAr ? 'التحليل المالي السيادي' : 'Sovereign Financial Analysis'}</h3>
            <div className="report-tabs-premium">
               <button onClick={() => setActiveReportTab('profit')} className={`tab-btn-small ${activeReportTab === 'profit' ? 'active' : ''}`}>{isAr ? 'قائمة الدخل' : 'Income Statement'}</button>
               <button onClick={() => setActiveReportTab('trial')} className={`tab-btn-small ${activeReportTab === 'trial' ? 'active' : ''}`}>{isAr ? 'ميزان المراجعة' : 'Trial Balance'}</button>
               <button onClick={() => setActiveReportTab('balance_sheet')} className={`tab-btn-small ${activeReportTab === 'balance_sheet' ? 'active' : ''}`}>{isAr ? 'الميزانية العمومية' : 'Balance Sheet'}</button>
               <button onClick={() => setActiveReportTab('vat')} className={`tab-btn-small ${activeReportTab === 'vat' ? 'active' : ''}`}>{isAr ? 'تحليل الضريبة' : 'VAT Analysis'}</button>
            </div>
            <button onClick={() => downloadCSV(journalEntries, 'Fiscal_Report')} className="btn-sovereign-outline"><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> Export CSV</button>
          </div>

          {activeReportTab === 'profit' && (
            <div className="slide-in">
              <div className="metrics-grid-stable">
                 <SummaryMetric label={isAr ? 'الهامش الربحي الصافي' : 'Net Profit Margin'} value={`${metrics.margin}%`} icon="monitoring" variant="accent-gold" />
                 <SummaryMetric label={isAr ? 'إجمالي الإيرادات' : 'Total Revenue'} value={metrics.rev.toLocaleString()} icon="payments" variant="accent-blue" />
                 <SummaryMetric label={isAr ? 'صافي الدخل' : 'Net Income'} value={metrics.net.toLocaleString()} icon="trending_up" variant="accent-success" />
              </div>

              <section className="chart-section-premium">
                <h4 className="chart-title-premium sharp-text" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>ecg</span>
                  {isAr ? 'منحنى الإيرادات (آخر 10 عمليات)' : 'Revenue Trend (Latest 10)'}
                </h4>
                <div className="chart-wrapper-sovereign" style={{ minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={invoices.slice(-10).map((i: Invoice) => ({ date: i.created_at, amount: i.amount }))}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="date" hide />
                      <YAxis tick={{fill: 'var(--on-surface)', fontWeight: 800, fontSize: 12}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: 'var(--shadow-premium)', background: 'var(--surface)' }} />
                      <Line type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={4} dot={{ r: 6, fill: 'var(--primary)', strokeWidth: 2, stroke: 'var(--surface)' }} activeDot={{ r: 8, strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <div className="quick-actions-stable" style={{ marginTop: '2.5rem' }}>
                 <QuickActionCard 
                   title={isAr ? 'تقرير الربحية' : 'Profit Report'} 
                   desc={isAr ? 'مراجعة الأداء المالي للفترة' : 'Review financial performance'} 
                   onClick={() => setActiveTab('reports')} 
                   icon="analytics" 
                 />
                 <QuickActionCard 
                   title={isAr ? 'إهلاك الأصول' : 'Asset Depreciation'} 
                   desc={isAr ? 'تحديث مجمع الإهلاك الشهري' : 'Update monthly depreciation'} 
                   onClick={() => setActiveTab('assets')} 
                   icon="trending_down" 
                 />
                 <QuickActionCard 
                   title={isAr ? 'تحليل الضريبة' : 'VAT Analysis'} 
                   desc={isAr ? 'مراجعة ضريبة القيمة المضافة' : 'Review VAT status'} 
                   onClick={() => { setActiveTab('reports'); setActiveReportTab('vat'); }} 
                   icon="verified_user" 
                 />
              </div>

              <div className="chart-wrapper-sovereign" style={{ marginTop: '1.5rem' }}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { name: isAr ? 'الإيرادات' : 'Revenue', value: metrics.rev },
                    { name: isAr ? 'التكاليف' : 'Costs', value: metrics.cost + metrics.genExps },
                    { name: isAr ? 'الأرباح' : 'Profit', value: metrics.net }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{fill: 'var(--on-surface)', fontWeight: 800, fontSize: 12}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fill: 'var(--on-surface)', fontWeight: 800, fontSize: 12}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'var(--surface-container-high)'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)'}} />
                    <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                      {[0, 1, 2].map((_, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--primary)' : index === 1 ? 'var(--error)' : 'var(--success)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="statement-container-premium">
                 <h4 className="statement-title-premium">{isAr ? 'قائمة الدخل - الفترة الحالية' : 'Income Statement - Current Period'}</h4>
                 <div className="statement-rows-premium">
                    <StatementRow label={isAr ? 'إجمالي إيرادات المبيعات' : 'Total Sales Revenue'} value={metrics.rev} />
                    <StatementRow label={isAr ? 'تكاليف النقل المباشرة' : 'Direct Transport Costs'} value={-metrics.cost} />
                     <div className="statement-divider">
                        <StatementRow label={isAr ? 'إجمالي الربح التشغيلي' : 'Gross Operating Profit'} value={metrics.prof} isTotal />
                     </div>
                     <StatementRow label={isAr ? 'المصاريف العمومية والإدارية' : 'General & Admin Expenses'} value={-metrics.genExps} />
                     <div className="statement-total-divider">
                        <StatementRow label={isAr ? 'صافي دخل الميزان' : 'Net Sovereign Income'} value={metrics.net} isHighlight />
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeReportTab === 'trial' && <TrialBalanceView ledgerAccounts={ledgerAccounts} isAr={isAr} />}
          {activeReportTab === 'balance_sheet' && <BalanceSheetView ledgerAccounts={ledgerAccounts} isAr={isAr} />}
          {activeReportTab === 'vat' && <VATAnalysisView invoices={invoices} isAr={isAr} />}
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
            <div className="vat-grid-premium">
                <div className="vat-info-premium">
                    <div className="card glass-premium vat-card-primary">
                        <h4 className="vat-card-title sharp-text" style={{ color: 'var(--primary)', fontWeight: 1000 }}>{isAr ? 'إجمالي الضريبة المستحقة للهيئة' : 'Total VAT Payable to ZATCA'}</h4>
                        <h1 className="vat-card-value item-amount">{vatCollected.toLocaleString()} <small>SAR</small></h1>
                        <p className="vat-card-desc">{isAr ? 'بناءً على الفواتير الضريبية الصادرة' : 'Based on issued tax invoices'}</p>
                    </div>
                    <div className="card vat-card-secondary glass-premium">
                        <div className="vat-row-premium">
                            <span className="vat-label-premium">{isAr ? 'إجمالي الوعاء الضريبي' : 'Total Taxable Base'}</span>
                            <span className="vat-value-premium item-amount">{taxableAmount.toLocaleString()} SAR</span>
                        </div>
                        <div className="vat-row-premium">
                            <span className="vat-label-premium">{isAr ? 'معدل الضريبة المطبق' : 'Applied VAT Rate'}</span>
                            <span className="vat-value-premium">15%</span>
                        </div>
                    </div>
                </div>
                <div className="card vat-chart-premium chart-wrapper-sovereign" style={{ padding: '1rem' }}>
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
            
            <div className="card shadow-elite padding-2">
                <h4 className="sovereign-header-gold sharp-text" style={{ marginBottom: '1.5rem' }}>{isAr ? 'سجل الفواتير الضريبية' : 'Tax Invoice Ledger'}</h4>
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
                                <td className="font-bold">{i.reference_number}</td>
                                <td className="font-semibold">{i.customer_id}</td>
                                <td className="font-bold item-amount">{i.amount.toLocaleString()}</td>
                                <td className="font-black text-primary item-amount">{i.vat.toLocaleString()}</td>
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
            <tr className="table-header-row-premium">
              <th className="padding-start-2">{isAr ? 'الحساب' : 'Account'}</th>
              <th>{isAr ? 'النوع' : 'Type'}</th>
              <th className="text-center">{isAr ? 'مدين' : 'Debit'}</th>
              <th className="text-center padding-end-2">{isAr ? 'دائن' : 'Credit'}</th>
            </tr>
          </thead>
          <tbody>
            {ledgerAccounts.map((acc: any) => {
              const isDr = acc.type === 'asset' || acc.type === 'expense';
              return (
                <tr key={acc.id}>
                  <td className="padding-start-2 font-bold">{isAr ? acc.name_ar : acc.name}</td>
                  <td className="type-cell-premium">{acc.type.toUpperCase()}</td>
                  <td className={`text-center font-bold ${isDr ? 'text-primary' : 'transparent'}`}>{isDr ? acc.balance.toLocaleString() : '-'}</td>
                  <td className={`text-center padding-end-2 font-bold ${!isDr ? 'text-primary' : 'transparent'}`}>{!isDr ? acc.balance.toLocaleString() : '-'}</td>
                </tr>
              );
            })}
            <tr className="table-footer-row-premium">
               <td colSpan={2} className="padding-start-2 font-black text-primary">{isAr ? 'الإجمالي العام' : 'GRAND TOTAL'}</td>
               <td className="text-center font-black text-primary font-size-1-2">{totals.debit.toLocaleString()}</td>
               <td className="text-center padding-end-2 font-black text-primary font-size-1-2">{totals.credit.toLocaleString()}</td>
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
    <div className="slide-in balance-sheet-grid">
       <div>
          <h4 className="sovereign-header-gold sharp-text" style={{ borderColor: 'var(--success)', marginBottom: '1rem' }}>{isAr ? 'الأصول' : 'ASSETS'}</h4>
          {assets.map((a: any) => (
            <div key={a.id} className="bs-row-premium">
               <span className="font-semibold">{isAr ? a.name_ar : a.name}</span>
               <span className="font-black">{a.balance.toLocaleString()}</span>
            </div>
          ))}
          <div className="bs-total-row text-success">
             <span>{isAr ? 'إجمالي الأصول' : 'TOTAL ASSETS'}</span>
             <span>{totalAssets.toLocaleString()} SAR</span>
          </div>
       </div>
       <div>
          <h4 className="sovereign-header-gold sharp-text" style={{ borderColor: 'var(--error)', marginBottom: '1rem' }}>{isAr ? 'الالتزامات وحقوق الملكية' : 'LIABILITIES & EQUITY'}</h4>
          <p className="muted-text-solid" style={{ fontSize: '0.8rem', fontWeight: 1000, marginBottom: '0.5rem' }}>{isAr ? 'الالتزامات' : 'LIABILITIES'}</p>
          {liabilities.map((a: any) => (
            <div key={a.id} className="bs-row-premium">
               <span className="font-semibold">{isAr ? a.name_ar : a.name}</span>
               <span className="font-black">{a.balance.toLocaleString()}</span>
            </div>
          ))}
          <p className="muted-text-solid" style={{ fontSize: '0.8rem', fontWeight: 1000, marginBottom: '0.5rem', marginTop: '1.5rem' }}>{isAr ? 'حقوق الملكية' : 'EQUITY'}</p>
          {equity.map((a: any) => (
            <div key={a.id} className="bs-row-premium">
               <span className="font-semibold">{isAr ? a.name_ar : a.name}</span>
               <span className="font-black">{a.balance.toLocaleString()}</span>
            </div>
          ))}
          <div className="bs-total-row text-error">
             <span>{isAr ? 'الإجمالي' : 'TOTAL L&E'}</span>
             <span>{(totalLiabilities + totalEquity).toLocaleString()} SAR</span>
          </div>
       </div>
    </div>
  );
}

function ManualJournalModal({ newEntry, setNewEntry, ledgerAccounts, onClose, onSave, isAr }: ManualJournalModalProps) {
  return (
    <div className="modal-overlay-premium fade-in">
      <div className="modal-card shadow-elite slide-up">
        <div className="modal-header-premium">
          <h3 className="sovereign-header-gold sharp-text" style={{ border: 'none', padding: 0, marginBottom: 0 }}>{isAr ? 'إضافة قيد محاسبي يدوي' : 'Add Manual Journal Entry'}</h3>
          <button onClick={onClose} className="btn-icon-clean"><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="form-grid-premium-2">
           <div className="form-group-premium span-2">
              <label className="label-premium">{isAr ? 'وصف القيد' : 'Description'}</label>
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

function LedgerDetailModal({ account, journalEntries, onClose, isAr }: LedgerDetailModalProps) {
  const balance = account.balance;
  return (
    <div className="modal-overlay-premium fade-in">
      <div className="modal-card shadow-elite slide-up" style={{ maxWidth: '900px', width: '95%' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--surface-container-high)', paddingBottom: '1rem' }}>
            <div>
              <h3 className="sovereign-header-gold sharp-text" style={{ border: 'none', padding: 0, marginBottom: '0.2rem' }}>{isAr ? `كشف حساب: ${account.name_ar}` : `Ledger: ${account.name}`}</h3>
              <p className="muted-text-solid" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 900 }}>{isAr ? 'سجل الحركات التفصيلي لهذا الحساب' : 'Detailed transaction log for this account'}</p>
            </div>
            <div style={{ textAlign: 'left' }}>
               <span className="muted-text-solid" style={{ fontSize: '0.8rem', fontWeight: 900 }}>{isAr ? 'الرصيد الحالي' : 'Current Balance'}</span>
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
                  {journalEntries.map((e: JournalEntry) => {
                    const isDebit = e.debit_account === account.name_ar || e.debit_account === account.name;
                    return (
                      <tr key={e.id}>
                         <td style={{ paddingInlineStart: '1.5rem', fontWeight: 700 }}>{fmtDate(e.date, isAr ? 'ar' : 'en')}</td>
                         <td style={{ fontWeight: 600 }}>{e.description}</td>
                         <td style={{ textAlign: 'center', fontWeight: 1000, color: isDebit ? 'var(--success)' : 'transparent' }}>{isDebit ? e.amount.toLocaleString() : '-'}</td>
                         <td style={{ textAlign: 'center', fontWeight: 1000, color: !isDebit ? 'var(--error)' : 'transparent' }}>{!isDebit ? e.amount.toLocaleString() : '-'}</td>
                      </tr>
                    );
                  })}
                  {journalEntries.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', opacity: 1 }}>{isAr ? 'لا يوجد حركات مسجلة' : 'No transactions recorded'}</td></tr>}
               </tbody>
            </table>
         </div>

         <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button 
              onClick={() => {
                const csvData = journalEntries.map(e => {
                  const isDebit = e.debit_account === account.name_ar || e.debit_account === account.name;
                  return {
                    'Date/التاريخ': e.date,
                    'Description/البيان': e.description,
                    'Debit/مدين': isDebit ? e.amount : 0,
                    'Credit/دائن': !isDebit ? e.amount : 0,
                    'Reference/المرجع': e.reference
                  };
                });
                const headers = Object.keys(csvData[0] || {}).join(',');
                const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
                const csvContent = `\ufeff${headers}\n${rows}`;
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.setAttribute('href', url);
                link.setAttribute('download', `Statement_${account.name_ar || account.name}_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }} 
              className="btn-sovereign-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>
              {isAr ? 'تنزيل CSV' : 'Download CSV'}
            </button>
            <button 
              onClick={() => window.print()} 
              className="btn-sovereign-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900 }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
              {isAr ? 'طباعة' : 'Print'}
            </button>
            <button onClick={onClose} className="btn-sovereign-outline" style={{ padding: '0.8rem 2.5rem', fontWeight: 900 }}>{isAr ? 'إغلاق' : 'Close'}</button>
         </div>
      </div>
    </div>
  );
}

function ContractsSubView({ contracts, isAr, setShowContractModal, onSign, onDownload, onDelete, downloadCSV }: ContractsSubViewProps) {
  return (
    <div className="fade-in">
      <div className="metrics-grid-stable" style={{ marginBottom: '2.5rem' }}>
          <SummaryMetric 
            label={isAr ? 'إجمالي قيمة العقود' : 'Total Contract Value'} 
            value={contracts.reduce((sum, c) => sum + (c.value || 0), 0).toLocaleString()} 
            icon="account_balance_wallet" 
            variant="accent-gold" 
            showCurrency 
          />
          <SummaryMetric 
            label={isAr ? 'العقود النشطة' : 'Active Contracts'} 
            value={contracts.length.toString()} 
            icon="description" 
            variant="accent-blue" 
          />
          <SummaryMetric 
            label={isAr ? 'اتفاقيات موقعة' : 'Signed Agreements'} 
            value={contracts.filter(c => c.signed).length.toString()} 
            icon="verified_user" 
            variant="accent-success" 
          />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h3 style={{ fontWeight: 1000, color: 'var(--primary)', margin: 0 }} className="sharp-text">{isAr ? 'إدارة العقود اللوجستية' : 'Logistics Contract Management'}</h3>
            <p style={{ margin: 0, opacity: 1, fontWeight: 800, color: 'var(--primary)' }}>{isAr ? 'تتبع الاتفاقيات المالية مع العملاء والناقلين' : 'Track financial agreements with clients and carriers'}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => downloadCSV(contracts, 'Contracts_Full_Ledger')} className="btn-sovereign-outline" style={{ padding: '0.6rem 1rem', fontSize: '0.95rem' }}>
              <span className="material-symbols-outlined">download</span> {isAr ? 'كشف كامل' : 'Full Report'}
            </button>
            <button onClick={() => setShowContractModal(true)} className="btn-sovereign-primary">
              <span className="material-symbols-outlined">add</span> {isAr ? 'عقد جديد' : 'New Contract'}
            </button>
          </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {contracts.map((c: Contract) => (
              <div key={c.id} className="card-contract-elite">
                  <div className="contract-status-bar">
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span className={`contract-badge ${c.type}`}>{c.type === 'client' ? (isAr ? 'عميل سيادي' : 'CLIENT') : (isAr ? 'ناقل معتمد' : 'TRANSPORT')}</span>
                        {c.signed && <span className="contract-badge signed" style={{ background: 'rgba(52, 211, 153, 0.1)', color: '#059669' }}>{isAr ? 'تم التوقيع' : 'SIGNED'}</span>}
                      </div>
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
                  
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-container-low)' }}>
                    <button 
                      onClick={() => onDownload(c)}
                      className="btn-action-small" 
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span> {isAr ? 'تحميل كملف' : 'Download'}
                    </button>
                    {!c.signed && (
                      <button 
                        onClick={() => onSign(c.id)}
                        className="btn-sovereign-outline" 
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem 0' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>signature</span> {isAr ? 'توقيع العقد' : 'Sign Now'}
                      </button>
                    )}
                     <button 
                        onClick={() => {
                          if(confirm(isAr ? 'هل أنت متأكد من حذف هذا العقد؟' : 'Are you sure you want to delete this contract?')) {
                            onDelete(c.id);
                          }
                        }}
                        className="btn-action-small" 
                        style={{ color: 'var(--error)', width: 'auto', padding: '0.5rem', flex: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                     </button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
}

// --- Helper Components ---

function SummaryRow({ label, value, isBold, currency }: SummaryRowProps) {
  return (
    <div className="summary-row-executive">
      <span className="summary-label">{label}</span>
      <span className={`summary-value ${isBold ? 'bold' : ''}`}>
        {value} <small className="currency">{currency || 'SAR'}</small>
      </span>
    </div>
  );
}

function RecentTrx({ id, client, amount, onShare, onCertify, isCertified }: RecentTrxProps) {
  return (
    <div className={`recent-trx-card ${isCertified ? 'certified' : ''}`}>
       <div className="trx-info" onClick={onShare}>
          <div className="trx-header">
             <p className="trx-id">{id}</p>
             {isCertified && <span className="material-symbols-outlined verified-icon">verified</span>}
          </div>
          <p className="trx-client">{client}</p>
       </div>
       <div className="trx-financials">
          <div className="amount-box">
             <span className="amount">{amount} <small>SAR</small></span>
             {isCertified && <p className="certified-tag">ZATCA COMPLIANT</p>}
          </div>
          <div className="action-group">
             {!isCertified && (
               <button onClick={onCertify} className="btn-action-mini" title="Certify with ZATCA">
                 <span className="material-symbols-outlined">verified_user</span>
               </button>
             )}
             <button onClick={onShare} className="btn-action-mini">
               <span className="material-symbols-outlined">share</span>
             </button>
          </div>
       </div>
    </div>
  );
}

function SummaryMetric({ label, value, icon, variant, showCurrency }: { label: string, value: string, icon: string, variant?: string, showCurrency?: boolean }) {
  return (
    <div className={`card-executive ${variant || ''}`} style={{ minHeight: '140px' }}>
       <div className="card-executive-icon">
         <span className="material-symbols-outlined">{icon}</span>
       </div>
       <p className="card-executive-title">{label}</p>
       <div className="card-executive-value-group">
          <span className="card-executive-value" style={{ fontSize: '2rem' }}>{value}</span>
          {showCurrency && <span className="card-executive-unit">SAR</span>}
       </div>
    </div>
  );
}

function StatementRow({ label, value, isTotal, isHighlight }: any) {
  return (
    <div className={`statement-row-executive ${isTotal ? 'total' : ''} ${isHighlight ? 'highlight' : ''}`}>
        <span className="label">{label}</span>
        <span className={`value ${value < 0 ? 'negative' : ''}`}>
          {value.toLocaleString()} <small className="currency">SAR</small>
        </span>
    </div>
  );
}

function QuickActionCard({ title, desc, onClick, icon }: QuickActionCardProps) {
  return (
    <button className="card-executive interactive accent-gold" onClick={onClick} style={{ minHeight: '140px' }}>
      <div className="card-executive-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div style={{ textAlign: 'start' }}>
        <h4 className="card-executive-title" style={{ textAlign: 'start', fontSize: '1.2rem', color: 'var(--primary)' }}>{title}</h4>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>{desc}</p>
      </div>
      <span className="material-symbols-outlined" style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', color: 'var(--accent-color)' }}>arrow_forward</span>
    </button>
  );
}

function ContractModal({ contractType, newContract, setNewContract, onClose, onSave, isAr }: ContractModalProps) {
    return (
        <div className="modal-overlay-premium fade-in">
            <div className="modal-card shadow-elite slide-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 1000 }}>{isAr ? `توثيق عقد ${contractType === 'client' ? 'عميل' : 'ناقل'}` : `Certify ${contractType} Contract`}</h3>
                    <button onClick={onClose} className="btn-close-elite"><span className="material-symbols-outlined" style={{ transform: 'rotate(45deg)', fontSize: '24px' }}>add</span></button>
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
}: InvoicePreviewModalProps) {
    const isAr = t.lang === 'ar';
    const invoiceId = useMemo(() => Math.random().toString(36).substr(2, 6).toUpperCase(), []);
    const now = useMemo(() => new Date(), []);
    
    return (
        <div className="modal-overlay-premium" style={{ overflowY: 'auto', display: 'block', padding: '2rem 0' }}>
            <div className="no-print" style={{ position: 'sticky', top: '2rem', zIndex: 100, display: 'flex', justifyContent: 'center', gap: '1rem', width: 'fit-content', margin: '0 auto 2rem', background: 'var(--primary)', padding: '0.8rem 2rem', borderRadius: '50px', boxShadow: 'var(--shadow-lg)' }}>
                <button onClick={onPrint} className="btn-print-premium"><span className="material-symbols-outlined">print</span> {isAr ? 'طباعة PDF' : 'Print PDF'}</button>
                <button onClick={onWhatsApp} className="btn-print-premium" style={{ background: 'var(--success)' }}><span className="material-symbols-outlined">verified</span> WhatsApp</button>
                <button onClick={onDismiss} className="btn-print-premium" style={{ background: 'var(--error)' }}><span className="material-symbols-outlined">close</span> {isAr ? 'إغلاق' : 'Close'}</button>
            </div>
            
            <div className="print-canvas" style={{ background: 'white', width: '210mm', minHeight: '297mm', margin: '0 auto', padding: '2cm', color: 'black', direction: 'rtl', fontFamily: 'Tajawal', boxShadow: '0 0 50px rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid var(--primary)', paddingBottom: '1.5rem', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <div style={{ width: 80, height: 80, background: 'var(--primary)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)', fontSize: '2rem', fontWeight: 1000 }}>{settings.companyName.charAt(0)}</div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 1000, color: 'var(--primary)' }}>{settings.companyName}</h2>
                            <p className="muted-text-solid" style={{ margin: '0.2rem 0', fontSize: '0.9rem', fontWeight: 950 }}>Sovereign Customs Clearance & Logistics</p>
                            <p className="muted-text-solid" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 800 }}>TAX ID: {settings.taxNumber}</p>
                        </div>
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary)', fontWeight: 1000 }}>{isSettlement ? (isAr ? 'قيد تسوية' : 'Settlement') : (isAr ? 'فاتورة ضريبية' : 'Tax Invoice')}</h1>
                        <p style={{ margin: '0.4rem 0', fontWeight: 900, fontSize: '1.2rem' }}>#{operationNumber || invoiceId}</p>
                    </div>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: 'var(--surface-variant)', padding: '1.5rem', borderRadius: '16px', marginBottom: '3rem', border: '1px solid var(--outline-variant)' }}>
                    <MetadataBox label={isAr ? 'رقم البيان' : 'DEC NO'} value={declarationNumber} />
                    <MetadataBox label={isAr ? 'رقم البوليصة' : 'BOL NO'} value={bolNumber} />
                    <MetadataBox label={isAr ? 'رقم العملية' : 'OP NO'} value={operationNumber} />
                    <MetadataBox label={isAr ? 'قيمة الشحنة' : 'CARGO'} value={`${parseFloat(String(inventoryValue)).toLocaleString()} SAR`} />
                 </div>

                 <div style={{ marginBottom: '3rem' }}>
                    <p className="muted-text-solid" style={{ margin: 0, fontSize: '0.85rem', fontWeight: 1000 }}>{isAr ? 'العميل المستهدف:' : 'Billed To:'}</p>
                    <h3 style={{ margin: '0.5rem 0', fontSize: '1.8rem', fontWeight: 1000, color: 'var(--primary)' }}>{clientName}</h3>
                    {taxId && <p style={{ fontWeight: 900, color: 'var(--on-surface)' }}>رقم العميل الضريبي: {taxId}</p>}
                 </div>

                 <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '3rem' }}>
                    <thead>
                        <tr style={{ background: 'var(--primary)', color: 'var(--on-primary)' }}>
                            <th style={{ padding: '1.2rem', textAlign: 'right', fontWeight: 900 }}>تفاصيل المعاملة</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', fontWeight: 900, width: '150px' }}>المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((it: any) => (
                            <tr key={it.id} style={{ borderBottom: '1px solid var(--outline-variant)' }}>
                                <td style={{ padding: '1.5rem 1rem', fontWeight: 800 }}>{it.desc}</td>
                                <td style={{ padding: '1.5rem 1rem', textAlign: 'left', fontWeight: 1000 }}>{it.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                        {parseFloat(String(customsFees)) > 0 && <tr><td className="muted-text-solid" style={{ padding: '1rem', fontWeight: 800 }}>أمانات الجمارك</td><td style={{ padding: '1rem', textAlign: 'left', fontWeight: 900 }}>{parseFloat(String(customsFees)).toLocaleString()}</td></tr>}
                        {parseFloat(String(portFees)) > 0 && <tr><td className="muted-text-solid" style={{ padding: '1rem', fontWeight: 800 }}>رسوم الموانئ</td><td style={{ padding: '1rem', textAlign: 'left', fontWeight: 900 }}>{parseFloat(String(portFees)).toLocaleString()}</td></tr>}
                        {parseFloat(String(transportExpenses)) > 0 && <tr><td className="muted-text-solid" style={{ padding: '1rem', fontWeight: 800 }}>أجور النقل</td><td style={{ padding: '1rem', textAlign: 'left', fontWeight: 900 }}>{parseFloat(String(transportExpenses)).toLocaleString()}</td></tr>}
                    </tbody>
                 </table>

                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '2rem', borderTop: '2px solid var(--primary)' }}>
                    <div style={{ width: '150px' }}>
                        <QRCodeSVG 
                          value={generateZatcaQR(
                            settings.companyName,
                            settings.taxNumber,
                            now.toISOString(),
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 0', fontWeight: 1000, fontSize: '2.5rem', color: 'var(--primary)', borderTop: '4px solid var(--primary)', marginTop: '1rem' }}>
                            <span>الإجمالي</span>
                            <span>{total.toLocaleString()}</span>
                        </div>
                    </div>
                 </div>

                 <div style={{ marginTop: '5rem', textAlign: 'center', borderTop: '1px solid var(--surface-container-high)', paddingTop: '2rem' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: 1000, color: 'var(--primary)', margin: 0 }}>شكراً لتعاملكم مع مؤسسة الغويري للتخليص الجمركي</p>
                    <p className="muted-text-solid" style={{ fontSize: '0.8rem', fontWeight: 950, marginTop: '0.5rem' }}>نظام المحاسبة الموحد السيادي | {now.toLocaleDateString('ar-SA')}</p>
                 </div>
            </div>
            <style>{`
                .btn-print-premium { display: flex; align-items: center; gap: 0.6rem; padding: 0.8rem 1.5rem; border-radius: 30px; border: none; font-weight: 1000; color: var(--on-primary); cursor: pointer; transition: 0.3s; }
                .btn-print-premium:hover { transform: translateY(-3px); }
                @media print { .no-print { display: none !important; } .print-canvas { box-shadow: none !important; margin: 0 !important; width: 100% !important; padding: 0 !important; } }
            `}</style>
        </div>
    );
}

function MetadataBox({ label, value }: any) {
  return (
    <div>
       <span className="muted-text-solid" style={{ fontSize: '0.7rem' }}>{label}</span>
       <span style={{ display: 'block', fontSize: '1rem', fontWeight: 1000, color: 'var(--primary)', marginTop: '0.2rem' }}>{value || '-'}</span>
    </div>
  );
}

function SumRow({ label, value }: any) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', fontWeight: 900, fontSize: '1.1rem' }}>
        <span className="muted-text-solid" style={{ fontSize: '0.9rem' }}>{label}</span>
        <span>{value} SAR</span>
    </div>
  );
}function AssetsView({ assets, isAr, setShowAssetModal, onRunDepreciation }: AssetsViewProps) {
  return (
    <div className="fade-in">
      <div className="metrics-grid-stable" style={{ marginBottom: '2.5rem' }}>
          <SummaryMetric 
            label={isAr ? 'إجمالي قيمة الأصول' : 'Total Asset Value'} 
            value={assets.reduce((sum, a) => sum + (a.purchase_value || 0), 0).toLocaleString()} 
            icon="account_balance" 
            variant="accent-gold" 
            showCurrency 
          />
          <SummaryMetric 
            label={isAr ? 'عدد الأصول المسجلة' : 'Registered Assets'} 
            value={assets.length.toString()} 
            icon="inventory" 
            variant="accent-blue" 
          />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h3 className="sovereign-header-gold sharp-text" style={{ margin: 0 }}>{isAr ? 'إدارة الأصول الثابتة' : 'Fixed Assets Management'}</h3>
            <p className="muted-text-solid" style={{ margin: 0 }}>{isAr ? 'تتبع الممتلكات والمعدات واحتساب الإهلاك' : 'Track property, equipment and calculate depreciation'}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={onRunDepreciation} className="btn-sovereign-outline">
              <span className="material-symbols-outlined">sync</span> {isAr ? 'تشغيل الإهلاك الشهري' : 'Run Monthly Depr'}
            </button>
            <button onClick={() => setShowAssetModal(true)} className="btn-sovereign-primary">
              <span className="material-symbols-outlined">add</span> {isAr ? 'إضافة أصل' : 'Add Asset'}
            </button>
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

function AssetModal({ newAsset, setNewAsset, onClose, onSave, isAr }: AssetModalProps) {
    return (
        <div className="modal-overlay-premium fade-in">
            <div className="modal-card shadow-elite slide-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 1000 }}>{isAr ? 'تسجيل أصل ثابت جديد' : 'Register New Fixed Asset'}</h3>
                    <button onClick={onClose} className="btn-close-elite"><span className="material-symbols-outlined">close</span></button>
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

function InventoryManagement({ products, isAr, setShowProductModal, onRestock }: InventoryManagementProps) {
  return (
    <div className="fade-in">
      <div className="metrics-grid-stable" style={{ marginBottom: '2.5rem' }}>
          <SummaryMetric 
            label={isAr ? 'قيمة المخزون الإجمالية' : 'Total Inventory Value'} 
            value={products.reduce((sum, p) => sum + ((p.quantity_on_hand || 0) * (p.purchase_price || 0)), 0).toLocaleString()} 
            icon="inventory_2" 
            variant="accent-gold" 
            showCurrency 
          />
          <SummaryMetric 
            label={isAr ? 'عدد الأصناف' : 'Item Count'} 
            value={products.length.toString()} 
            icon="list_alt" 
            variant="accent-blue" 
          />
          <SummaryMetric 
            label={isAr ? 'تنبيهات نقص المخزون' : 'Low Stock Alerts'} 
            value={products.filter(p => (p.quantity_on_hand || 0) <= (p.min_stock_level || 0)).length.toString()} 
            icon="warning" 
            variant="accent-red" 
          />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <h3 className="sovereign-header-gold sharp-text" style={{ margin: 0 }}>{isAr ? 'إدارة المستودعات والمخزون' : 'Inventory & Warehouse Management'}</h3>
            <p className="muted-text-solid" style={{ margin: 0 }}>{isAr ? 'تتبع الكميات وطلبات إعادة التموين' : 'Track quantities and replenishment requests'}</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setShowProductModal(true)} className="btn-sovereign-primary">
              <span className="material-symbols-outlined">add</span> {isAr ? 'إضافة صنف' : 'Add Item'}
            </button>
          </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {products.map((p: any) => {
            const lowStock = p.quantity_on_hand <= p.min_stock_level;
            return (
              <div key={p.id} className="card-contract-elite" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: lowStock ? 'rgba(var(--error-rgb), 0.1)' : 'rgba(var(--secondary-rgb), 0.1)', borderRadius: '15px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '24px', color: lowStock ? 'var(--error)' : 'var(--primary)' }}>inventory_2</span>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, color: 'var(--primary)', fontWeight: 1000, fontSize: '1.1rem' }}>{isAr ? p.name_ar : p.name_en}</h4>
                      <p className="muted-text-solid" style={{ margin: '0.2rem 0 0', fontSize: '0.8rem' }}>SKU: {p.sku} | {p.category}</p>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <p className="muted-text-solid" style={{ margin: 0, fontSize: '0.75rem' }}>{isAr ? 'الكمية' : 'Stock'}</p>
                      <span style={{ fontSize: '1.5rem', fontWeight: 1000, color: lowStock ? 'var(--error)' : 'var(--success)' }}>
                        {p.quantity_on_hand} <small className="muted-text-solid" style={{ fontSize: '0.8rem' }}>{p.unit}</small>
                      </span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p className="muted-text-solid" style={{ margin: 0, fontSize: '0.75rem' }}>{isAr ? 'سعر البيع' : 'Sale Price'}</p>
                      <span style={{ fontSize: '1.2rem', fontWeight: 1000, color: 'var(--primary)' }}>{p.selling_price} <small className="muted-text-solid">SAR</small></span>
                    </div>
                    <div>
                      {lowStock && (
                        <button onClick={() => onRestock(p.id)} className="btn-action-small" style={{ color: 'var(--error)', borderColor: 'var(--error)', background: 'rgba(var(--error-rgb), 0.05)', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span> <span style={{ fontWeight: 900 }}>{isAr ? 'إعادة طلب' : 'Restock'}</span>
                        </button>
                      )}
                    </div>
                  </div>
              </div>
            );
          })}
          {products.length === 0 && (
            <div className="card glass-premium" style={{ textAlign: 'center', padding: '5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '64px', opacity: 0.2, marginBottom: '1.5rem' }}>inventory_2</span>
              <p className="empty-state-text" style={{ fontSize: '1.2rem' }}>{isAr ? 'المخزن فارغ حالياً' : 'Warehouse is empty'}</p>
              <button onClick={() => setShowProductModal(true)} className="btn-sovereign-outline" style={{ marginTop: '1rem' }}>{isAr ? 'إضافة أول منتج' : 'Add First Product'}</button>
            </div>
          )}
      </div>
    </div>
  );
}

function ProductModal({ newProduct, setNewProduct, onClose, onSave, isAr }: ProductModalProps) {
    return (
        <div className="modal-overlay-premium fade-in">
            <div className="modal-card shadow-elite slide-up" style={{ maxWidth: '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
                    <h3 style={{ margin: 0, fontWeight: 1000 }}>{isAr ? 'إضافة صنف جديد' : 'Add New Product'}</h3>
                    <button onClick={onClose} className="btn-close-elite"><span className="material-symbols-outlined">close</span></button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                        <div className="form-group-premium">
                            <label>SKU (رمز الصنف)</label>
                            <input type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="input-premium" />
                        </div>
                        <div className="form-group-premium">
                            <label>{isAr ? 'الاسم (عربي)' : 'Name (AR)'}</label>
                            <input type="text" value={newProduct.name_ar} onChange={e => setNewProduct({...newProduct, name_ar: e.target.value})} className="input-premium" />
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div className="form-group-premium">
                          <label>{isAr ? 'التصنيف' : 'Category'}</label>
                          <input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="input-premium" />
                      </div>
                      <div className="form-group-premium">
                          <label>{isAr ? 'الوحدة' : 'Unit'}</label>
                          <select value={newProduct.unit} onChange={e => setNewProduct({...newProduct, unit: e.target.value})} className="input-premium">
                            <option value="pcs">Pcs</option>
                            <option value="kg">KG</option>
                            <option value="ton">Ton</option>
                            <option value="pallet">Pallet</option>
                          </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div className="form-group-premium">
                            <label>{isAr ? 'سعر الشراء' : 'Purchase Price'}</label>
                            <input type="number" value={newProduct.purchase_price} onChange={e => setNewProduct({...newProduct, purchase_price: parseFloat(e.target.value)})} className="input-premium" />
                        </div>
                        <div className="form-group-premium">
                            <label>{isAr ? 'سعر البيع' : 'Selling Price'}</label>
                            <input type="number" value={newProduct.selling_price} onChange={e => setNewProduct({...newProduct, selling_price: parseFloat(e.target.value)})} className="input-premium" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(var(--secondary-rgb), 0.05)', padding: '1.2rem', borderRadius: '14px' }}>
                        <div className="form-group-premium">
                            <label>{isAr ? 'الكمية الافتتاحية' : 'Opening Stock'}</label>
                            <input type="number" value={newProduct.quantity_on_hand || 0} onChange={e => setNewProduct({...newProduct, quantity_on_hand: parseFloat(e.target.value)})} className="input-premium" />
                        </div>
                        <div className="form-group-premium">
                            <label>{isAr ? 'حد إعادة الطلب' : 'Min Stock Level'}</label>
                            <input type="number" value={newProduct.min_stock_level} onChange={e => setNewProduct({...newProduct, min_stock_level: parseFloat(e.target.value)})} className="input-premium" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                        <button onClick={onSave} className="btn-sovereign-primary" style={{ flex: 2 }}>{isAr ? 'حفظ الصنف' : 'Save Item'}</button>
                        <button onClick={onClose} className="btn-sovereign-outline" style={{ flex: 1 }}>{isAr ? 'إلغاء' : 'Cancel'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}


