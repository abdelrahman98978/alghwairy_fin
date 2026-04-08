import { useState, useRef } from 'react';
import { localDB } from '../lib/localDB';
import type { Translations } from '../types/translations';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Database,
  RefreshCw,
  Trash2,
  Zap,
  Download,
  Settings2
} from 'lucide-react';

interface DataImportProps {
  showToast: (msg: string, type?: string) => void;
  t: Translations['data_import'];
  lang: string;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
}

export default function DataImportView({ showToast, t, lang, logActivity }: DataImportProps) {
  const [step, setStep] = useState(1);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [recordCount, setRecordCount] = useState(0);
  const [importType, setImportType] = useState<'invoices' | 'customers'>('invoices');
  
  // Parsing states
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows = lines.slice(1).map(line => {
      // Simple CSV split (not handling escaped commas in quotes for brevity/security)
      return line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    });
    
    return { headers, rows };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const { headers, rows } = parseCSV(text);
        if (headers.length === 0) {
          showToast(lang === 'ar' ? 'الملف فارغ أو غير صالح' : 'File is empty or invalid', 'error');
          return;
        }
        setCsvHeaders(headers);
        setCsvRows(rows);
        
        // Default mapping: try to find exact matches
        const initialMapping: Record<string, number> = {};
        const targetFields = importType === 'invoices' 
          ? ['reference_number', 'amount', 'customer_name', 'created_at']
          : ['name', 'vat_number', 'cr_number', 'phone'];
        
        targetFields.forEach(field => {
          const idx = headers.findIndex(h => h.toLowerCase() === field.toLowerCase() || h.includes(field));
          if (idx !== -1) initialMapping[field] = idx;
        });
        
        setMapping(initialMapping);
        setStep(2);
      };
      reader.readAsText(file);
    }
  };

  const downloadTemplate = () => {
    let content = "";
    let name = "";
    if (importType === 'invoices') {
      content = "reference_number,amount,customer_name,created_at\nINV-001,5400.00,Alghwairy Institution,2026-04-01";
      name = "invoices_template.csv";
    } else {
      content = "name,vat_number,cr_number,phone\nAlghwairy Customs,310029384756382,1010000001,0543389314";
      name = "customers_template.csv";
    }
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", name);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(lang === 'ar' ? 'تم تحميل النموذج بنجاح' : 'Template downloaded successfully', 'success');
  };

  const startImport = async () => {
    setImporting(true);
    let successCount = 0;
    
    // Virtual delay for "processing" feel
    await new Promise(r => setTimeout(r, 1500));

    try {
      csvRows.forEach(row => {
        const obj: any = {};
        Object.keys(mapping).forEach(field => {
          obj[field] = row[mapping[field]];
        });

        if (importType === 'invoices') {
          // Special handling for numeric amount
          obj.amount = parseFloat(obj.amount || '0');
          obj.vat = obj.amount * 0.15;
          obj.total = obj.amount + obj.vat;
          obj.status = 'pending';
          localDB.insert('invoices', obj);
        } else {
          localDB.insert('customers', obj);
        }
        successCount++;
      });

      setRecordCount(successCount);
      await logActivity(`Imported ${successCount} ${importType} via CSV`, 'system');
      setImporting(false);
      setStep(3);
    } catch (err: any) {
      setImporting(false);
      showToast('Import Error: ' + err.message, 'error');
    }
  };

  const handleClearData = async () => {
    if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من مسح كافة البيانات من السجل المحلي؟ لا يمكن التراجع عن هذه الخطوة.' : 'Are you sure you want to clear all data from the local ledger? This cannot be undone.')) {
      localDB.clearAll();
      await logActivity('Wiped Local Database', 'system');
      showToast(lang === 'ar' ? 'تم مسح كافة البيانات المحلية بنجاح' : 'All local data cleared successfully', 'success');
      window.location.reload(); 
    }
  };

  const handleSeedProduction = async () => {
    setImporting(true);
    showToast(lang === 'ar' ? 'جاري تهيئة البيانات المؤسسية...' : 'Seeding Institutional Data...', 'info');

    // 1. Core Customers
    const customers = [
      { name: 'شركة أرامكو السعودية', vat_number: '300123456700003', cr_number: '1010000001', phone: '0138720111' },
      { name: 'SABIC - سابك', vat_number: '310987654300003', cr_number: '1010012345', phone: '0112251000' },
      { name: 'STC - الاتصالات السعودية', vat_number: '320000000100003', cr_number: '1010150269', phone: '0114527000' },
      { name: 'مصرف الراجحي', vat_number: '330004561200003', cr_number: '1010000079', phone: '0112116000' },
      { name: 'نيوم للاستثمار', vat_number: '390909090900003', cr_number: '1010600021', phone: '0118340000' }
    ];

    const invoices = [];
    for(let i=0; i<25; i++) {
       invoices.push({
          reference_number: `INV-2026-${1000 + i}`,
          amount: Math.floor(Math.random() * 50000) + 10000,
          status: Math.random() > 0.3 ? 'paid' : 'pending',
          created_at: new Date(2026, 0, Math.floor(Math.random() * 90) + 1).toISOString()
       });
    }

    try {
      localDB.clearAll();
      const savedCustomers: any[] = [];
      customers.forEach(c => { savedCustomers.push(localDB.insert('customers', c)); });
      invoices.forEach(inv => {
         const cust = savedCustomers[Math.floor(Math.random() * savedCustomers.length)];
         const tax = inv.amount * 0.15;
         localDB.insert('invoices', { ...inv, customer_id: cust.id, vat: tax, total: inv.amount + tax });
      });

      setRecordCount(customers.length + invoices.length);
      setTimeout(async () => {
        setImporting(false);
        setStep(3);
        await logActivity('Executed Local System Seed', 'database');
        showToast(lang === 'ar' ? 'اكتملت تهيئة البيانات المحلية بنجاح' : 'Local data seeding complete', 'success');
      }, 2000);
    } catch {
      setImporting(false);
      showToast('Error seeding local database', 'error');
    }
  };

  const targetFields = importType === 'invoices' 
    ? [
        { key: 'reference_number', label: lang === 'ar' ? 'رقم المرجع (رقم الفاتورة)' : 'Reference Number' },
        { key: 'amount', label: lang === 'ar' ? 'المبلغ (قبل الضريبة)' : 'Amount (Excl. VAT)' },
        { key: 'customer_name', label: lang === 'ar' ? 'اسم العميل' : 'Customer Name' },
        { key: 'created_at', label: lang === 'ar' ? 'التاريخ' : 'Date (YYYY-MM-DD)' }
      ]
    : [
        { key: 'name', label: lang === 'ar' ? 'اسم المؤسسة' : 'Company Name' },
        { key: 'vat_number', label: lang === 'ar' ? 'الرقم الضريبي' : 'VAT Number' },
        { key: 'cr_number', label: lang === 'ar' ? 'رقم السجل التجاري' : 'CR Number' },
        { key: 'phone', label: lang === 'ar' ? 'رقم التواصل' : 'Phone' }
      ];

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h1 className="view-title" style={{ margin: 0 }}>{t.title}</h1>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              onClick={handleClearData}
              className="btn-executive" 
              style={{ background: 'rgba(186, 26, 26, 0.1)', color: 'var(--error)', border: '1px solid var(--error)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
            >
               <Trash2 size={18} /> {t.clear_all}
            </button>
            <button 
              onClick={handleSeedProduction}
              className="btn-executive" 
              style={{ background: 'var(--secondary)', color: 'var(--primary)', border: 'none', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
            >
               <Zap size={18} /> {t.seed_samples}
            </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[1, 2, 3].map((s) => (
          <div key={s} className="card" style={{ 
            padding: '1.5rem 2rem',
            opacity: step >= s ? 1 : 0.4, 
            border: step === s ? '2px solid var(--secondary)' : '1px solid var(--surface-container-high)',
            background: step === s ? 'var(--surface-container-low)' : 'var(--surface)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: step > s ? 'var(--success)' : (step === s ? 'var(--secondary)' : 'var(--primary)'), color: step === s ? 'var(--primary)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem' }}>
                {step > s ? <CheckCircle2 size={18} /> : s}
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', fontFamily: 'Tajawal', margin: 0 }}>
                {s === 1 ? t.steps.upload : s === 2 ? t.steps.alignment : t.steps.archive}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem', border: '1px solid var(--surface-container-high)' }}>
        {step === 1 && (
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
               <button onClick={() => setImportType('invoices')} className={`btn-executive ${importType === 'invoices' ? '' : 'btn-outline'}`} style={{ flex: 1, padding: '1rem' }}>الفواتير - Invoices</button>
               <button onClick={() => setImportType('customers')} className={`btn-executive ${importType === 'customers' ? '' : 'btn-outline'}`} style={{ flex: 1, padding: '1rem' }}>العملاء - Customers</button>
            </div>

            <div style={{ width: 100, height: 100, borderRadius: '25px', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', color: 'var(--primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
               <FileSpreadsheet size={50} />
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '1rem', fontFamily: 'Tajawal' }}>{t.upload_center_title}</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--on-surface-variant)', marginBottom: '2.5rem', fontWeight: 700 }}>{t.upload_center_desc}</p>
            
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <button onClick={downloadTemplate} className="btn-executive btn-outline" style={{ flex: 1, padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                   <Download size={20} /> {lang === 'ar' ? 'تحميل النموذج' : 'Template'}
                </button>
                <label className="btn-executive" style={{ flex: 2, cursor: 'pointer', padding: '1.2rem', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                   <Upload size={20} /> {t.select_file}
                   <input type="file" hidden accept=".csv" onChange={handleFileChange} ref={fileInputRef} />
                </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ width: '100%', maxWidth: '850px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem', justifyContent: 'center' }}>
               <Settings2 size={24} color="var(--primary)" />
               <h2 style={{ fontSize: '1.6rem', fontWeight: 950, color: 'var(--primary)', margin: 0, fontFamily: 'Tajawal' }}>{t.alignment_title}</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem', marginBottom: '3rem' }}>
               {targetFields.map(field => (
                 <div key={field.key} className="card" style={{ padding: '1.2rem', background: 'var(--surface-container-low)', textAlign: 'right', border: '1px solid var(--surface-container-high)', boxShadow: 'none' }}>
                    <p style={{ fontWeight: 900, fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginBottom: '0.8rem' }}>{field.label}</p>
                    <select 
                      value={mapping[field.key] ?? ""}
                      onChange={(e) => setMapping({...mapping, [field.key]: parseInt(e.target.value)})}
                      className="input-executive" 
                      style={{ width: '100%', fontWeight: 700, background: 'white', color: mapping[field.key] !== undefined ? 'var(--success)' : 'var(--on-surface)' }}
                    >
                       <option value="">{lang === 'ar' ? '--- اختر العمود ---' : '--- Select Column ---'}</option>
                       {csvHeaders.map((head, idx) => (
                         <option key={idx} value={idx}>{head}</option>
                       ))}
                    </select>
                 </div>
               ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
               <button onClick={() => setStep(1)} className="btn-executive btn-outline" style={{ flex: 1, padding: '1.2rem' }}>{t.cancel}</button>
               <button 
                 onClick={startImport} 
                 disabled={Object.keys(mapping).length < targetFields.length || importing}
                 className="btn-executive" 
                 style={{ flex: 2, padding: '1.2rem' }}
               >
                  {importing ? <RefreshCw size={22} className="spin" /> : <Database size={22} />}
                  {t.execute_import} ( {csvRows.length} )
               </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ maxWidth: '520px' }}>
            <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'rgba(27, 94, 32, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem', color: 'var(--success)' }}>
               <CheckCircle2 size={60} />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '1rem', fontFamily: 'Tajawal' }}>{t.success_title}</h2>
            <p style={{ fontSize: '1.1rem', color: 'var(--on-surface-variant)', marginBottom: '3rem', fontWeight: 800 }}>{recordCount.toLocaleString()} {t.success_desc}</p>
            <button onClick={() => { setStep(1); window.location.reload(); }} className="btn-executive" style={{ width: '100%', padding: '1.2rem' }}>{t.return_home}</button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2.5rem', padding: '2rem', borderRadius: '24px', background: 'var(--primary)', color: 'white' }}>
         <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ padding: '0.8rem', borderRadius: '14px', background: 'rgba(212, 167, 106, 0.2)', color: 'var(--secondary)' }}><AlertCircle size={28} /></div>
            <div>
               <h4 style={{ color: 'var(--secondary)', fontWeight: 950, fontSize: '1.1rem', margin: 0 }}>بروتوكول أمن البيانات المحلي</h4>
               <p style={{ fontSize: '0.85rem', opacity: 0.9, fontWeight: 600, margin: '0.4rem 0 0' }}>{t.security_protocol_notice}</p>
            </div>
         </div>
      </div>
    </div>
  );
}
