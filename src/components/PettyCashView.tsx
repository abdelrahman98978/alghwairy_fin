import { Banknote, Plus, Download, Search, X, User, Receipt, Trash2, Edit3 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { localDB } from '../lib/localDB';
import type { Translations } from '../types/translations';

interface PettyCashRecord {
  id: string;
  reference_number: string;
  title: string;
  amount: number;
  requester: string;
  status: string;
  created_at: string;
  deleted_at?: string;
}

interface PettyCashProps {
  t: Translations['petty_cash'];
  lang: 'ar' | 'en';
  showToast: (msg: string, type?: string) => void;
}

export default function PettyCashView({ t, lang, showToast }: PettyCashProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<PettyCashRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    requester: '',
    status: 'pending'
  });

  const [editData, setEditData] = useState({
    id: '',
    title: '',
    amount: '',
    requester: '',
    status: 'pending'
  });

  const fetchRecords = useCallback(() => {
    setLoading(true);
    try {
        const data = localDB.getActive('petty_cash').sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecords((data as PettyCashRecord[]) || []);
    } catch (err: any) {
        showToast(lang === 'ar' ? 'فشل تحميل العهد' : 'Failed to load petty cash', 'error');
    }
    setLoading(false);
  }, [lang, showToast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ref = `PC-${new Date().getFullYear()}-${Math.floor(Math.random() * 900) + 100}`;
    
    try {
        localDB.insert('petty_cash', {
          reference_number: ref,
          title: formData.title,
          amount: parseFloat(formData.amount),
          requester: formData.requester,
          status: 'pending'
        });
        showToast(lang === 'ar' ? 'تم تسجيل طلب العهدة بنجاح' : 'Petty cash requested successfully', 'success');
        setShowAddModal(false);
        setFormData({ title: '', amount: '', requester: '', status: 'pending' });
        fetchRecords();
    } catch (err: any) {
        showToast(err.message, 'error');
    }
  };

  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        localDB.update('petty_cash', editData.id, {
          title: editData.title,
          amount: parseFloat(editData.amount),
          requester: editData.requester,
          status: editData.status
        });
        showToast(lang === 'ar' ? 'تم تحديث العهدة بنجاح' : 'Record updated successfully', 'success');
        setShowEditModal(false);
        fetchRecords();
    } catch (err: any) {
        showToast(err.message, 'error');
    }
  };

  const openEditModal = (record: PettyCashRecord) => {
    setEditData({
      id: record.id,
      title: record.title,
      amount: record.amount.toString(),
      requester: record.requester,
      status: record.status
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه العهدة؟' : 'Are you sure you want to delete this petty cash record?')) return;
    try {
        localDB.softDelete('petty_cash', id);
        showToast(lang === 'ar' ? 'تم نقل العهدة لسلة المهملات' : 'Record moved to trash', 'success');
        fetchRecords();
    } catch (err: any) {
        showToast(err.message, 'error');
    }
  };

  const currentYear = new Date().getFullYear();
  const filteredRecords = records.filter(r => 
    (r.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     r.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     r.requester?.toLowerCase().includes(searchTerm.toLowerCase())) &&
     (new Date(r.created_at).getFullYear() === currentYear)
  );

  const totalAmount = filteredRecords.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const pendingCount = filteredRecords.filter(r => r.status === 'pending').length;

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="view-title" style={{ margin: 0 }}>{t.title}</h1>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}>
               <Download size={18} /> {lang === 'ar' ? 'تصدير السجل' : 'Export Log'}
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn-executive">
               <Plus size={18} /> {t.add_request}
            </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
         <div className="card" style={{ borderInlineStart: '5px solid var(--secondary)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>{lang === 'ar' ? 'إجمالي عهد المؤسسة 2026' : 'Total Institution Advances 2026'}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
               <Banknote size={24} color="var(--secondary)" />
               {totalAmount.toLocaleString()} <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>SAR</span>
            </div>
         </div>
         <div className="card" style={{ borderInlineStart: '5px solid var(--error)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>{lang === 'ar' ? 'طلبات بانتظار الاعتماد' : 'Pending Approvals'}</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, marginTop: '0.5rem', color: 'var(--primary)' }}>{pendingCount.toString().padStart(2, '0')}</div>
         </div>
         <div className="card" style={{ borderInlineStart: '5px solid var(--success)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', textTransform: 'uppercase' }}>{lang === 'ar' ? 'البند الأعلى صرفاً' : 'Highest Expense Category'}</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '0.5rem', color: 'var(--primary)' }}>
               {lang === 'ar' ? 'تشغيل عام' : 'General Ops'}
            </div>
         </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={18} style={{ position: 'absolute', [lang === 'ar' ? 'right' : 'left']: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input 
                type="text" 
                placeholder={lang === 'ar' ? 'البحث عن عهدة برقم المرجع أو الاسم...' : 'Search by reference or name...'} 
                className="input-executive" 
                style={{ [lang === 'ar' ? 'paddingRight' : 'paddingLeft']: '3rem', fontWeight: 600 }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--primary)', opacity: 0.7 }}>
             LOCAL LEDGER RECORD: {currentYear}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>{lang === 'ar' ? 'جاري تحميل سجلات العهد...' : 'Loading cash records...'}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="sovereign-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ paddingInlineStart: '2rem' }}>{lang === 'ar' ? 'المرجع' : 'Reference'}</th>
                  <th>{lang === 'ar' ? 'البند / الوصف' : 'Description'}</th>
                  <th style={{ textAlign: 'right' }}>{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'المستحق' : 'Requester'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'تاريخ الطلب' : 'Request Date'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'خيارات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td style={{ fontWeight: 900, paddingInlineStart: '2rem', color: 'var(--primary)' }}>{record.reference_number}</td>
                    <td style={{ fontWeight: 700 }}>{record.title}</td>
                    <td style={{ fontWeight: 950, textAlign: 'right', fontSize: '1.05rem', color: 'var(--primary)' }}>{Number(record.amount).toLocaleString()} SAR</td>
                    <td style={{ textAlign: 'center' }}>
                       <div style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <User size={14} opacity={0.6} /> {record.requester}
                       </div>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>
                       {new Date(record.created_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ 
                        padding: '0.4rem 1rem', fontSize: '0.7rem', fontWeight: 900, borderRadius: '20px',
                        background: record.status === 'approved' ? 'rgba(27, 94, 32, 0.1)' : 'rgba(212, 167, 106, 0.1)',
                        color: record.status === 'approved' ? 'var(--success)' : 'var(--secondary)'
                      }}>
                        {record.status === 'approved' ? (lang === 'ar' ? 'معتمد' : 'Approved') : (lang === 'ar' ? 'بانتظار المراجعة' : 'In Review')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                       <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button onClick={() => openEditModal(record)} className="btn-executive" style={{ padding: '0.45rem', border: 'none', background: 'var(--surface-container-high)', color: 'var(--primary)' }}>
                             <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(record.id)} className="btn-executive" style={{ padding: '0.45rem', border: 'none', background: 'var(--surface-container-high)', color: 'var(--error)' }}>
                             <Trash2 size={16} />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))}
                {filteredRecords.length === 0 && (
                   <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>{lang === 'ar' ? 'لم يتم العثور على سجلات' : 'No records found'}</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', padding: '3rem', position: 'relative', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{lang === 'ar' ? 'طلب عهدة نقدية جديدة' : 'New Petty Cash Request'}</h3>
             
             <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Receipt size={16} /> {lang === 'ar' ? 'البند / الغرض من العهدة' : 'Purpose / Item'}
                   </label>
                   <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input-executive" placeholder={lang === 'ar' ? 'مثال: قرطاسية مكتبية' : 'e.g. Office Supplies'} style={{ fontWeight: 600 }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <Banknote size={16} /> {lang === 'ar' ? 'المبلغ المطلوب' : 'Amount'}
                      </label>
                      <input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="input-executive" placeholder="0.00" style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)' }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <User size={16} /> {lang === 'ar' ? 'مقدم الطلب' : 'Applicant'}
                      </label>
                      <input required type="text" value={formData.requester} onChange={e => setFormData({...formData, requester: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
                   </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                   <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem', border: 'none' }}>{lang === 'ar' ? 'إرسال للمراجعة' : 'Submit for Review'}</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 3000 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '500px', padding: '3rem', position: 'relative', border: 'none', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
             <button onClick={() => setShowEditModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X size={24} /></button>
             <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, textAlign: 'center', color: 'var(--primary)' }}>{lang === 'ar' ? 'تعديل بيانات العهدة' : 'Edit Petty Cash Record'}</h3>
             
             <form onSubmit={handleUpdateRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Receipt size={16} /> {lang === 'ar' ? 'البند / الغرض من العهدة' : 'Purpose / Item'}
                   </label>
                   <input required type="text" value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <Banknote size={16} /> {lang === 'ar' ? 'المبلغ' : 'Amount'}
                      </label>
                      <input required type="number" step="0.01" value={editData.amount} onChange={e => setEditData({...editData, amount: e.target.value})} className="input-executive" style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)' }} />
                   </div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <User size={16} /> {lang === 'ar' ? 'مقدم الطلب' : 'Applicant'}
                      </label>
                      <input required type="text" value={editData.requester} onChange={e => setEditData({...editData, requester: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
                   </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                   <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{lang === 'ar' ? 'الحالة' : 'Status'}</label>
                   <select value={editData.status} onChange={e => setEditData({...editData, status: e.target.value})} className="input-executive" style={{ fontWeight: 600 }}>
                      <option value="pending">{lang === 'ar' ? 'بانتظار المراجعة' : 'In Review'}</option>
                      <option value="approved">{lang === 'ar' ? 'معتمد' : 'Approved'}</option>
                   </select>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                   <button type="button" onClick={() => setShowEditModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                   <button type="submit" className="btn-executive" style={{ flex: 2, padding: '1rem', fontSize: '1.1rem', border: 'none' }}>{lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
