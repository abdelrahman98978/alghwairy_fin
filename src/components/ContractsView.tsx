import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Plus, Search, Truck, User, 
  DollarSign, Clock, X, FileCheck, Download, Briefcase, ShieldCheck,
  Trash2, PenTool, Printer
} from 'lucide-react';
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
          <h1>مؤسسة الغويري للتخليص الجمركي</h1>
          <p>Alghwairy Customs Clearance Institution</p>
          <h2 style="margin-top: 30px; color: #111;">${contract.type === 'client' ? 'عقد تقديم خدمات تخليص جمركي ولوجستية' : 'عقد اتفاقية نقل ومساندة لوجستية'}</h2>
        </div>

        <div class="section">
          <div class="section-title">البيانات الأساسية للمتطأقد</div>
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
          <div class="section-title">يانات الطرف الثاني (العميل/الناقل)</div>
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
            ${contract.type === 'transporter' ? `
            <div class="field">
              <span class="label">عائد التشغيل المتفق عليه</span>
              <span class="value">${Number(contract.transport_expenses || 0).toLocaleString()} SAR</span>
            </div>` : ''}
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

        <div style="text-align: center; margin-top: 70px; font-size: 0.8em; color: #888; border-top: 1px solid #eee; padding-top: 15px;">
          هذه الوثيقة مستخرجة من المنظومة السيادية للغويري للعمليات المالية واللوجستية - ${new Date().toLocaleString('ar-SA')}
        </div>
        
        <script>
          window.onload = function() { 
            setTimeout(() => {
              window.print(); 
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
              <Plus size={18} /> إضافة عقد جديد
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
          <User size={18} /> عقود العملاء
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
          <Truck size={18} /> عقود الناقلين
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <KPICard title="إجمالي قيمة العقود" value={totalValue.toLocaleString()} icon={<DollarSign size={22} />} color="var(--primary)" />
        <KPICard title="العقود النشطة" value={activeCount.toString()} icon={<FileCheck size={22} />} color="var(--success)" />
        <KPICard title="عقود قاربت على الانتهاء" value={expiringCount.toString()} icon={<Clock size={22} />} color="var(--secondary)" />
      </div>

      {/* Search & List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
        <div style={{ padding: '1.5rem 2rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
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
              <Download size={16} /> كشف كامل (CSV)
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
                          {contract.type === 'client' ? <User size={16} /> : <Briefcase size={16} />}
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
                          <CheckCircle2 size={14} /> {contract.signature_date}
                        </span>
                      ) : (
                        <span style={{ opacity: 0.4, fontWeight: 700, fontSize: '0.8rem' }}>غير موقع</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-sovereign" style={{ 
                        background: contract.status === 'active' ? 'rgba(27, 94, 32, 0.1)' : 'rgba(186, 26, 26, 0.1)',
                        color: contract.status === 'active' ? 'var(--success)' : 'var(--error)'
                      }}>
                        {contract.status === 'active' ? 'نشط' : 'ملغى'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', paddingInlineEnd: '2rem' }}>
                       <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleDownload(contract); }} className="btn-action-small" title="تحميل PDF / طباعة">
                             <Printer size={16} />
                          </button>
                          {!contract.signed && (
                            <button onClick={(e) => { e.stopPropagation(); handleSign(contract.id); }} className="btn-action-small" title="توقيع" style={{ color: 'var(--secondary)' }}>
                               <PenTool size={16} />
                            </button>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(contract.id); }} className="btn-action-small" title="حذف" style={{ color: 'var(--error)' }}>
                             <Trash2 size={14} />
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
                <div style={{ background: 'var(--primary)', padding: '0.8rem', borderRadius: '14px', color: 'var(--secondary)' }}><FileCheck size={22} /></div>
                <h3 style={{ fontSize: '1.4rem', fontFamily: 'Tajawal', fontWeight: 900, color: 'var(--primary)', margin: 0 }}>
                  {selectedContract ? 'تعديل عقد سيادي' : 'عقد سيادي جديد'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
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
                       <Printer size={18} /> طباعة
                    </button>
                  )}
                 <button type="submit" className="btn-executive" style={{ flex: 2, border: 'none' }}>
                    <ShieldCheck size={20} /> اعتماد وحفظ العقد
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

function CheckCircle2({ size }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size || 24} height={size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="m9 12 2 2 4-4"></path></svg>
  );
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
