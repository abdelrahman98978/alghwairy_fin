import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { localDB } from '../lib/localDB';
import type { Contract } from '../lib/localDB';

interface ContractsViewProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  logActivity: (action: string, entity: string, entity_id?: string) => void;
  t: any;
}

export default function ContractsView({ showToast, logActivity, t }: ContractsViewProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'client' | 'transporter'>('client');
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Omit<Contract, 'id'>>({
    type: 'client',
    entity_id: '',
    entity_name: '',
    contract_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    value: 0,
    terms: '',
    status: 'active',
    transport_expenses: 0
  });

  const loadData = useCallback(() => {
    const data = (localDB.getActive('contracts') || []) as Contract[];
    const custs = (localDB.getActive('customers') || []) as any[];
    setContracts(data);
    setCustomers(custs);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entity = customers.find(c => c.id === formData.entity_id);
    const finalData = { ...formData, entity_name: entity?.name || 'طرف مجهول' };
    
    try {
      if (selectedContract) {
        localDB.update('contracts', selectedContract.id, finalData);
        logActivity('تعديل عقد لوجستي', 'contracts', selectedContract.id);
        showToast(t.lang === 'ar' ? 'تم تحديث العقد السيادي بنجاح' : 'Sovereign contract updated successfully', 'success');
      } else {
        const inserted = localDB.insert('contracts', { ...finalData, signed: false, status: 'active' });
        logActivity('إنشاء عقد سيادي جديد', 'contracts', inserted.id);
        showToast(t.lang === 'ar' ? 'تم إنشاء العقد اللوجستي بنجاح' : 'Logistic contract created successfully', 'success');
      }
      
      setShowModal(false);
      loadData();
      resetForm();
    } catch (error) {
      showToast('Error saving contract', 'error');
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t.lang === 'ar' ? 'هل أنت متأكد من حذف هذا العقد؟' : 'Are you sure you want to delete this contract?')) {
      try {
        localDB.delete('contracts', id);
        logActivity('حذف عقد سيادي', 'contracts', id);
        showToast(t.lang === 'ar' ? 'تم حذف العقد بنجاح' : 'Contract deleted successfully', 'success');
        loadData();
      } catch (err) {
        showToast('Error deleting contract', 'error');
      }
    }
  };

  const handleSign = (id: string) => {
    try {
      localDB.update('contracts', id, { 
        signed: true, 
        signature_date: new Date().toISOString().split('T')[0] 
      });
      logActivity('توقيع عقد سيادي', 'contracts', id);
      showToast(t.lang === 'ar' ? 'تم توقيع العقد بنجاح' : 'Contract signed successfully', 'success');
      loadData();
    } catch (err) {
      showToast('Error signing contract', 'error');
    }
  };

  const handleDownload = (contract: Contract) => {
    const isAr = true; // Forcing Arabic primarily for official contracts
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast(isAr ? 'الرجاء السماح بالنوافذ المنبثقة للطباعة' : 'Please allow popups to print', 'error');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}" lang="${isAr ? 'ar' : 'en'}">
      <head>
        <title>عقد لوجستي سيادي #${contract.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap');
          :root {
            --primary: #004d40;
            --secondary: #ffc107;
            --on-surface: #1a1c1e;
            --on-surface-variant: #43474e;
            --surface-container-low: #f0f4f8;
            --surface-container-lowest: #ffffff;
            --outline: #73777f;
          }
          body { 
            font-family: 'Tajawal', sans-serif; 
            padding: 50px; 
            color: var(--on-surface); 
            line-height: 1.6;
            max-width: 900px;
            margin: 0 auto;
          }
          .sovereign-print-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 3rem;
            padding-bottom: 1.5rem;
            border-bottom: 3px solid var(--primary);
            direction: rtl;
          }
          .header-right { text-align: right; }
          .header-center { text-align: center; }
          .header-left { text-align: left; }
          
          .header-right h2 { margin: 0; color: var(--primary); font-weight: 900; font-size: 1.4rem; }
          .header-right p { margin: 0; font-size: 0.9rem; fontWeight: 700; }
          
          .header-center h1 { margin: 0; font-weight: 950; font-size: 1.6rem; color: var(--on-surface); }
          .header-center p { margin: 0; font-size: 0.9rem; fontWeight: 700; }
          
          .header-left p { margin: 0; font-size: 0.9rem; font-weight: 800; }
          .header-left .sub { margin: 0; font-size: 0.75rem; opacity: 0.7; }

          .section { margin-bottom: 35px; }
          .section-title {
            background: var(--surface-container-low);
            padding: 12px 20px;
            font-weight: 900;
            color: var(--primary);
            border-right: 5px solid var(--primary);
            border-radius: 6px;
            font-size: 1.1rem;
            margin-bottom: 20px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
            margin-top: 15px;
          }
          .field { margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 8px; }
          .label { font-size: 0.85em; color: var(--on-surface-variant); font-weight: 700; display: block; margin-bottom: 4px; }
          .value { font-size: 1.05em; font-weight: 800; color: var(--on-surface); }
          
          .terms-container {
            background: #fdfdfd;
            padding: 25px;
            border: 1px solid #ddd;
            border-radius: 12px;
            white-space: pre-wrap;
            margin-top: 15px;
            font-weight: 600;
            font-size: 0.95rem;
            color: #333;
            box-shadow: inset 0 0 10px rgba(0,0,0,0.02);
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 60px;
            margin-top: 100px;
            text-align: center;
          }
          .sig-box {
            border-top: 2px dashed var(--outline);
            padding-top: 20px;
          }
          .e-sign-badge {
            color: #2e7d32;
            font-weight: 900;
            border: 2px solid #2e7d32;
            padding: 12px;
            border-radius: 10px;
            display: inline-block;
            margin-bottom: 20px;
            background: #f1f8e9;
            font-size: 0.85rem;
            line-height: 1.4;
          }
          .footer-note {
            text-align: center;
            margin-top: 80px;
            font-size: 0.75rem;
            color: var(--on-surface-variant);
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          @media print {
            body { padding: 0; margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="sovereign-print-header">
          <div class="header-right">
            <h2>مؤسسة الغويري للتخليص الجمركي</h2>
            <p>الرقم الضريبي: 310344810200003</p>
          </div>
          <div class="header-center">
            <h1>${contract.type === 'client' ? 'عقد تقديم خدمات لوجستية' : 'اتفاقية توريد خدمات نقل'}</h1>
            <p>نسخة رسمية معتمدة</p>
          </div>
          <div class="header-left">
            <p>Alghwairy Institution</p>
            <p class="sub">Sovereign Logistics Hub</p>
          </div>
        </div>

        <div class="section">
          <div class="section-title">أولاً: بيانات التعاقد المرجعية</div>
          <div class="grid">
            <div class="field">
              <span class="label">رقم العقد الموحد</span>
              <span class="value">CTR-${contract.id?.slice(0, 8).toUpperCase()}</span>
            </div>
            <div class="field">
              <span class="label">تاريخ إبرام العقد</span>
              <span class="value">${contract.contract_date}</span>
            </div>
            <div class="field">
              <span class="label">تاريخ انتهاء الصلاحية</span>
              <span class="value">${contract.expiry_date || 'ساري المفعول حتى إشعار آخر'}</span>
            </div>
            <div class="field">
              <span class="label">تصنيف العقد</span>
              <span class="value">${contract.type === 'client' ? 'عقد عميل (إيرادات)' : 'عقد مزود خدمة (تكاليف)'}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">ثانياً: بيانات الطرف الثاني</div>
          <div class="field" style="margin-top: 15px; border: none;">
            <span class="label">الاسم الرسمي للجهة المتعاقدة</span>
            <span class="value" style="font-size: 1.4rem; color: var(--primary);">${contract.entity_name}</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">ثالثاً: المقابل المالي والرسوم</div>
          <div class="grid">
            <div class="field">
              <span class="label">القيمة الإجمالية للعقد (سنوي/دوري)</span>
              <span class="value" style="font-size: 1.2rem;">${Number(contract.value).toLocaleString()} SAR</span>
            </div>
            ${contract.type === 'transporter' ? `
            <div class="field">
              <span class="label">عائد التشغيل المباشر</span>
              <span class="value" style="color: #c62828;">${Number(contract.transport_expenses || 0).toLocaleString()} SAR</span>
            </div>` : ''}
          </div>
        </div>

        <div class="section">
          <div class="section-title">رابعاً: بنود الاتفاقية والشروط السيادية</div>
          <div class="terms-container">${contract.terms || 'تخضع هذه الاتفاقية للأنظمة والقوانين السارية في المملكة العربية السعودية، وتعتبر شروط مؤسسة الغويري الملحقة جزءاً لا يتجزأ من هذا العقد.'}</div>
        </div>

        <div class="signatures">
          <div class="sig-box">
            <strong style="display: block; margin-bottom: 20px;">الطرف الأول (مؤسسة الغويري)</strong>
            ${contract.signed ? `
              <div class="e-sign-badge">
                موقع إلكترونياً وصادر عن<br/>
                نظام الغويري السيادي المعتمد<br/>
                بتاريخ: ${contract.signature_date}
              </div>
            ` : `
              <div style="height: 80px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #aaa; border-radius: 8px;">(ختم المؤسسة والتوقيع)</div>
            `}
          </div>
          <div class="sig-box">
            <strong style="display: block; margin-bottom: 20px;">الطرف الثاني (${contract.entity_name})</strong>
            <div style="height: 80px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #aaa; border-radius: 8px;">(توقيع الطرف الثاني)</div>
          </div>
        </div>

        <div class="footer-note">
          هذه الوثيقة رسمية ومعتمدة ومستخرجة آلياً من نظام مؤسسة الغويري للتخليص الجمركي (الإصدار السيادي).
          <br/>تاريخ الاستخراج: ${new Date().toLocaleString('ar-SA')} | مرجع رقم: ${contract.id}
        </div>
        
        <script>
          window.onload = function() { 
            setTimeout(() => {
              window.print(); 
              // window.close(); // Uncomment if you want window to close after printing
            }, 500); 
          }
        </script>
      </body>
      </html>
    `;


    printWindow.document.write(htmlContent);
    printWindow.document.close();
    showToast(t.lang === 'ar' ? 'جاري تجهيز العقد للطباعة/PDF الحفظ' : 'Preparing contract for Print/PDF', 'success');
  };

  const handleExportFullReport = () => {
    const header = ['ID', 'Type', 'Entity', 'Date', 'Expiry', 'Value', 'Expenses', 'Status', 'Signed'];
    const rows = contracts.map(c => [
      c.id, c.type, c.entity_name, c.contract_date, c.expiry_date, c.value, c.transport_expenses || 0, c.status, c.signed ? 'Yes' : 'No'
    ]);
    
    const csvContent = [header, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `full_contracts_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const resetForm = () => {
    setFormData({
      type: activeTab,
      entity_id: '',
      entity_name: '',
      contract_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      value: 0,
      terms: '',
      status: 'active',
      transport_expenses: 0
    });
    setSelectedContract(null);
  };

  const filtered = useMemo(() => contracts.filter(c => 
    c.type === activeTab && 
    (c.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     c.terms.toLowerCase().includes(searchTerm.toLowerCase()))
  ), [contracts, activeTab, searchTerm]);

  // Global KPIs
  const totalValue = useMemo(() => filtered.reduce((sum, c) => sum + (Number(c.value) || 0), 0), [filtered]);
  const activeCount = useMemo(() => filtered.filter(c => c.status === 'active').length, [filtered]);
  const expiringCount = useMemo(() => filtered.filter(c => {
    if (!c.expiry_date) return false;
    const diff = new Date(c.expiry_date).getTime() - new Date().getTime();
    return diff > 0 && diff < (30 * 24 * 60 * 60 * 1000); // 30 days
  }).length, [filtered]);

  return (
    <div className="slide-in" dir="rtl">
      {/* Header */}
      <header className="view-header" style={{ marginBottom: '2.5rem' }}>
        <div>
          <h2 className="view-title" style={{ margin: 0 }}>إدارة العقود السيادية</h2>
          <p className="view-subtitle" style={{ margin: 0 }}>عقود الشحن والخدمات اللوجستية المعتمدة</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
           <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-executive">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> إضافة عقد جديد
           </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', background: 'var(--surface-container-low)', padding: '0.5rem', borderRadius: '16px', alignSelf: 'flex-start', width: 'fit-content' }}>
        <button 
          onClick={() => setActiveTab('client')}
          style={{
            padding: '0.7rem 1.5rem', borderRadius: '12px', border: 'none',
            background: activeTab === 'client' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'client' ? 'var(--secondary)' : 'var(--on-surface-variant)',
            fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem',
            transition: 'all 0.3s'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span> عقود العملاء
        </button>
        <button 
          onClick={() => setActiveTab('transporter')}
          style={{
            padding: '0.7rem 1.5rem', borderRadius: '12px', border: 'none',
            background: activeTab === 'transporter' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'transporter' ? 'var(--secondary)' : 'var(--on-surface-variant)',
            fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem',
            transition: 'all 0.3s'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>local_shipping</span> عقود الناقلين
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <KPICard title="إجمالي قيمة العقود" value={totalValue.toLocaleString()} icon={<span className="material-symbols-outlined" style={{ fontSize: '22px' }}>payments</span>} color="var(--primary)" />
        <KPICard title="العقود النشطة" value={activeCount.toString()} icon={<span className="material-symbols-outlined" style={{ fontSize: '22px' }}>task_alt</span>} color="var(--success)" />
        <KPICard title="عقود قاربت على الانتهاء" value={expiringCount.toString()} icon={<span className="material-symbols-outlined" style={{ fontSize: '22px' }}>schedule</span>} color="var(--secondary)" />
      </div>

      {/* Search & List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
        <div style={{ padding: '1.5rem 2rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: '18px' }}>search</span>
            <input 
              type="text" 
              placeholder="البحث في العقود..." 
              className="input-executive" 
              style={{ width: '100%', paddingRight: '3rem' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={handleExportFullReport} className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', padding: '0.5rem 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span> كشف كامل (CSV)
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table">
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2rem' }}>الطرف المتعاقد</th>
                <th>تاريخ العقد</th>
                <th style={{ textAlign: 'center' }}>القيمة</th>
                {activeTab === 'transporter' && <th style={{ textAlign: 'center' }}>مصاريف التشغيل</th>}
                <th style={{ textAlign: 'center' }}>تاريخ الانتهاء</th>
                <th style={{ textAlign: 'center' }}>التوقيع</th>
                <th style={{ textAlign: 'center' }}>الحالة</th>
                <th style={{ textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '5rem', fontWeight: 800, opacity: 0.5 }}>لا توجد عقود مسجلة لهذا النوع</td></tr>
              ) : (
                filtered.map(contract => (
                  <tr key={contract.id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedContract(contract); setFormData(contract); setShowModal(true); }}>
                    <td style={{ paddingInlineStart: '2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ padding: '0.6rem', background: 'var(--surface-container-high)', borderRadius: '10px', color: 'var(--primary)' }}>
                          {contract.type === 'client' ? <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span> : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>work</span>}
                        </div>
                        <div>
                          <span style={{ fontWeight: 900, fontSize: '0.95rem', display: 'block' }}>{contract.entity_name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>ID: {contract.id?.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '0.9rem' }}>{contract.contract_date}</td>
                    <td style={{ textAlign: 'center', fontWeight: 900 }}>{(Number(contract.value) || 0).toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>ر.س</span></td>
                    {activeTab === 'transporter' && <td style={{ textAlign: 'center', fontWeight: 900, color: 'var(--error)' }}>{(Number(contract.transport_expenses) || 0).toLocaleString()} <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>ر.س</span></td>}
                    <td style={{ textAlign: 'center', fontWeight: 800, color: isNearExpiry(contract.expiry_date) ? 'var(--error)' : 'inherit' }}>{contract.expiry_date || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {contract.signed ? (
                        <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontWeight: 800, fontSize: '0.8rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span> {contract.signature_date}
                        </span>
                      ) : (
                        <span style={{ opacity: 0.4, fontWeight: 700, fontSize: '0.8rem' }}>غير موقع</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-sovereign" style={{ 
                        background: contract.status === 'active' ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--error-rgb), 0.1)',
                        color: contract.status === 'active' ? 'var(--success)' : 'var(--error)'
                      }}>
                        {contract.status === 'active' ? 'نشط' : 'ملغى'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', paddingInlineEnd: '2rem' }}>
                       <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleDownload(contract); }} className="btn-action-small" title="تحميل PDF / طباعة">
                             <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
                          </button>
                          {!contract.signed && (
                            <button onClick={(e) => { e.stopPropagation(); handleSign(contract.id); }} className="btn-action-small" title="توقيع" style={{ color: 'var(--secondary)' }}>
                               <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(contract.id); }} className="btn-action-small" title="حذف" style={{ color: 'var(--error)' }}>
                             <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contract Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '720px', padding: 0, position: 'relative', border: 'none' }}>
            <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary)', padding: '0.8rem', borderRadius: '14px', color: 'var(--secondary)' }}><span className="material-symbols-outlined" style={{ fontSize: '22px' }}>task_alt</span></div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
                  {selectedContract ? 'تعديل عقد سيادي' : 'عقد سيادي جديد'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span></button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '2.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                 <FormField label="نوع العقد">
                    <select className="input-executive" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} style={{ fontWeight: 800 }}>
                       <option value="client">عقد عميل الاستيراد</option>
                       <option value="transporter">عقد مزود خدمة نقل</option>
                    </select>
                 </FormField>
                 <FormField label="الطرف الثاني">
                    <select className="input-executive" value={formData.entity_id} onChange={e => setFormData({...formData, entity_id: e.target.value})} required style={{ fontWeight: 700 }}>
                       <option value="">اختر من القائمة...</option>
                       {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </FormField>
                 <FormField label="تاريخ البدء">
                    <input type="date" className="input-executive" value={formData.contract_date} onChange={e => setFormData({...formData, contract_date: e.target.value})} />
                 </FormField>
                 <FormField label="تاريخ الانتهاء">
                    <input type="date" className="input-executive" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                 </FormField>
                 <FormField label="القيمة المتفق عليها">
                    <input type="number" className="input-executive" style={{ fontWeight: 900, color: 'var(--primary)' }} value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
                 </FormField>
                 {formData.type === 'transporter' && (
                    <FormField label="سعر التشغيل المتفق عليه">
                       <input type="number" className="input-executive" style={{ fontWeight: 900, color: 'var(--error)' }} value={formData.transport_expenses} onChange={e => setFormData({...formData, transport_expenses: Number(e.target.value)})} />
                    </FormField>
                 )}
                 <div style={{ gridColumn: 'span 2' }}>
                    <FormField label="البنود والشروط السيادية">
                       <textarea className="input-executive" rows={4} value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} style={{ resize: 'none' }} placeholder="..." />
                    </FormField>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                 <button type="button" onClick={() => setShowModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none' }}>إلغاء</button>
                 {selectedContract && (
                    <button type="button" onClick={() => handleDownload(selectedContract)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
                       <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span> طباعة
                    </button>
                  )}
                 <button type="submit" className="btn-executive" style={{ flex: 2, border: 'none' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>verified_user</span> اعتماد وحفظ العقد
                 </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function isNearExpiry(dateStr?: string) {
  if (!dateStr) return false;
  const diff = new Date(dateStr).getTime() - new Date().getTime();
  return diff > 0 && diff < (30 * 24 * 60 * 60 * 1000);
}



function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{label}</label>
      {children}
    </div>
  );
}

function KPICard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="card" style={{ padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderInlineStart: `5px solid ${color}` }}>
      <div>
        <p style={{ fontSize: '0.85rem', color: 'var(--on-surface-variant)', fontWeight: 800, marginBottom: '0.4rem' }}>{title}</p>
        <h3 style={{ fontSize: '1.6rem', color: 'var(--primary)', margin: 0, fontFamily: 'Tajawal', fontWeight: 900 }}>
          {value} {title.includes('قيمة') ? <small style={{ fontSize: '0.8rem', opacity: 0.5 }}>SAR</small> : ''}
        </h3>
      </div>
      <div style={{ padding: '1rem', borderRadius: '14px', background: 'var(--surface-container-high)', color }}>{icon}</div>
    </div>
  );
}
