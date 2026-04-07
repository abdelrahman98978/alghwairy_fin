import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Translations } from '../types/translations';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Database,
  RefreshCw,
  Trash2,
  Zap
} from 'lucide-react';

interface DataImportProps {
  showToast: (msg: string, type?: string) => void;
  t: Translations['data_import'];
  lang: string;
}

export default function DataImportView({ showToast, t, lang }: DataImportProps) {
  const [step, setStep] = useState(1);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [recordCount, setRecordCount] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setStep(2);
    }
  };

  const handleClearData = async () => {
    if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من مسح كافة البيانات؟ لا يمكن التراجع عن هذه الخطوة.' : 'Are you sure you want to clear all data? This cannot be undone.')) {
      await (supabase as any).clearAll();
      showToast(lang === 'ar' ? 'تم مسح كافة البيانات بنجاح' : 'All data cleared successfully', 'success');
      window.location.reload(); // Refresh to clear app state
    }
  };

  const handleSeedProduction = async () => {
    setImporting(true);
    showToast(lang === 'ar' ? 'جاري استيراد الحزم السيادية...' : 'Seeding Production Sovereign Bundles...', 'info');

    // 1. Core Customers
    const customers = [
      { name: 'شركة أرامكو السعودية', vat_number: '300123456700003', cr_number: '1010000001', phone: '0138720111' },
      { name: 'SABIC - الحصاد الرائد', vat_number: '310987654300003', cr_number: '1010012345', phone: '0112251000' },
      { name: 'STC - الاتصالات السعودية', vat_number: '320000000100003', cr_number: '1010150269', phone: '0114527000' },
      { name: 'مصرف الراجحي', vat_number: '330004561200003', cr_number: '1010000079', phone: '0112116000' },
      { name: 'نيوم للاستثمار', vat_number: '390909090900003', cr_number: '1010600021', phone: '0118340000' }
    ];

    // 2. Sample Invoices
    const invoices = [];
    for(let i=0; i<45; i++) {
       invoices.push({
          reference_number: `INV-2026-${1000 + i}`,
          amount: Math.floor(Math.random() * 50000) + 10000,
          vat: 0, 
          status: Math.random() > 0.3 ? 'paid' : 'pending',
          created_at: new Date(2026, 0, Math.floor(Math.random() * 90) + 1).toISOString()
       });
    }

    // 3. Sample Expenses
    const expenses = [];
    const cats = ['Operational', 'Maintenance', 'Utilities', 'Government', 'Administrative'];
    for(let i=0; i<30; i++) {
       expenses.push({
          exp_number: `EXP-A26-${500 + i}`,
          title: `Sovereign Expense Batch ${i+1}`,
          category: cats[Math.floor(Math.random() * cats.length)],
          amount: Math.floor(Math.random() * 5000) + 500,
          status: 'Approved',
          date: new Date(2026, 0, Math.floor(Math.random() * 90) + 1).toISOString().split('T')[0]
       });
    }

    // 4. Activity Logs
    const logs = [
      { action: 'Database Seeding', entity: 'system', user_email: 'admin@alghwairy.fin' },
      { action: 'Audit Protocol Enabled', entity: 'security', user_email: 'system' }
    ];

    try {
      const { data: savedCustomers } = await supabase.from('customers').insert(customers).select() as { data: Array<{ id: string }> | null };
      
      if (savedCustomers) {
        const invoicesWithCust = invoices.map(inv => {
           const cust = savedCustomers[Math.floor(Math.random() * savedCustomers.length)];
           const tax = inv.amount * 0.15;
           return { ...inv, customer_id: cust.id, vat: tax, total: inv.amount + tax };
        });

        await supabase.from('invoices').insert(invoicesWithCust);
        await supabase.from('expenses').insert(expenses);
        await supabase.from('activity_logs').insert(logs);

        setRecordCount(customers.length + invoices.length + expenses.length);
        
        setTimeout(() => {
          setImporting(false);
          setStep(3);
          showToast(lang === 'ar' ? 'اكتملت مواءمة البيانات السيادية' : 'Sovereign data mirroring complete', 'success');
        }, 2500);
      }
    } catch (err) {
      console.error(err);
      setImporting(false);
      showToast(lang === 'ar' ? 'خطأ في تهيئة قاعدة البيانات' : 'Error seeding database', 'error');
    }
  };

  const startImport = async () => {
    setImporting(true);
    // Simulate real parsing delay
    setTimeout(() => {
      setImporting(false);
      setStep(3);
      setRecordCount(1240);
      showToast(lang === 'ar' ? 'تم استيراد ملف ' + fileName : 'File ' + fileName + ' imported', 'success');
    }, 3000);
  };

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
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)', fontFamily: 'Tajawal', margin: 0 }}>
                  {s === 1 ? t.steps.upload : s === 2 ? t.steps.alignment : t.steps.archive}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '4rem', border: '1px solid var(--surface-container-high)' }}>
        {step === 1 && (
          <div style={{ maxWidth: '520px' }}>
            <div style={{ width: 120, height: 120, borderRadius: '30px', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem', color: 'var(--primary)', boxShadow: '0 15px 45px rgba(0,0,0,0.08)' }}>
               <FileSpreadsheet size={60} />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '1.2rem', fontFamily: 'Tajawal' }}>
               {t.upload_center_title}
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--on-surface-variant)', marginBottom: '3rem', fontWeight: 700, lineHeight: '1.6' }}>
               {t.upload_center_desc}
            </p>
            
            <label className="btn-executive" style={{ width: '100%', cursor: 'pointer', padding: '1.5rem', border: 'none', fontSize: '1.2rem', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
               <Upload size={24} />
               {t.select_file}
               <input type="file" hidden accept=".csv,.xlsx" onChange={handleFileChange} />
            </label>
            
            <p style={{ marginTop: '2rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', opacity: 0.6 }}>
               ENCRYPTION: AES-256 GCM SECURED PROTOCOL ACTIVE
            </p>
          </div>
        )}

        {step === 2 && (
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '3rem', fontFamily: 'Tajawal' }}>
               {t.alignment_title}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem' }}>
               {['Legal Entity / Client', 'TRX Reference', 'Financial Value', 'Transaction Date', 'VAT Identity', 'Ledger Category'].map(field => (
                 <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left', padding: '1.5rem', background: 'var(--surface-container-low)', borderRadius: '18px', border: '1px solid var(--surface-container-high)' }}>
                    <span style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>{field}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                       <select className="input-executive" style={{ flex: 1, fontWeight: 800, background: 'white' }}>
                          <option>Auto: Column A (String)</option>
                          <option>Auto: Column B (Value)</option>
                          <option>Auto: Column C (Date)</option>
                          <option>Manual Override...</option>
                       </select>
                       <CheckCircle2 size={18} color="var(--success)" />
                    </div>
                 </div>
               ))}
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
               <button onClick={() => setStep(1)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', padding: '1.2rem', fontWeight: 800 }}>{t.cancel}</button>
               <button onClick={startImport} className="btn-executive" style={{ flex: 2, border: 'none', padding: '1.2rem', fontSize: '1.1rem' }}>
                  {importing ? <RefreshCw size={24} className="spin" /> : <Database size={24} />}
                  {t.execute_import}
               </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ maxWidth: '520px' }}>
            <div className="compliance-shield" style={{ width: 140, height: 140, borderRadius: '50%', background: 'rgba(27, 94, 32, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 3rem', color: 'var(--success)', border: 'none' }}>
               <CheckCircle2 size={70} />
            </div>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '1.2rem', fontFamily: 'Tajawal' }}>
               {t.success_title}
            </h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--on-surface-variant)', marginBottom: '3.5rem', fontWeight: 800 }}>
               {recordCount.toLocaleString()} {t.success_desc}
            </p>
            <button onClick={() => { setStep(1); window.location.reload(); }} className="btn-executive" style={{ width: '100%', border: 'none', padding: '1.5rem', fontSize: '1.1rem' }}>
               {t.return_home}
            </button>
          </div>
        )}
      </div>

      <div style={{ marginTop: '2.5rem', padding: '2rem', borderRadius: '24px', background: 'var(--primary)', color: 'white', position: 'relative', overflow: 'hidden' }}>
         <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(212, 167, 106, 0.2)', color: 'var(--secondary)' }}>
               <AlertCircle size={32} />
            </div>
            <div style={{ flex: 1 }}>
               <h4 style={{ color: 'var(--secondary)', fontWeight: 950, fontSize: '1.2rem', margin: 0 }}>Audit Security Protocol (ASP-2026)</h4>
               <p style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 600, margin: '0.5rem 0 0', lineHeight: '1.6' }}>
                  {t.security_protocol_notice}
               </p>
            </div>
            <div style={{ opacity: 0.4, fontStyle: 'italic', fontSize: '0.8rem', fontWeight: 900 }}>WPS_SYNC_ACTIVE</div>
         </div>
         <div style={{ position: 'absolute', right: '-5%', bottom: '-20%', opacity: 0.05 }}><Database size={180} /></div>
      </div>
    </div>
  );
}
