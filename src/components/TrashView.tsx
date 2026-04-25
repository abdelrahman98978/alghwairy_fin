import { useState, useEffect, useCallback } from 'react';

import { localDB } from '../lib/localDB';

import type { Translations } from '../types/translations';

interface Props {
  showToast: (msg: string, type?: string) => void;
  lang: string;
  t: Translations['trash'];
}

interface TrashItem {
  id: string;
  name?: string;
  reference_number?: string;
  title?: string;
  deleted_at: string;
  total?: number;
  amount?: number;
}

export function TrashView({ showToast, lang, t }: Props) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'customers' | 'petty_cash'>('invoices');
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDeletedItems = useCallback(() => {
    setLoading(true);
    try {
        const allItems = localDB.getAll(activeTab);
        const deletedItems = allItems.filter((item: any) => item.deleted_at).sort((a: any, b: any) => new Date(b.deleted_at).getTime() - new Date(a.deleted_at).getTime());
        setItems(deletedItems as TrashItem[]);
    } catch (err: any) {
        showToast(err.message, 'error');
    }
    setLoading(false);
  }, [activeTab, showToast]);

  useEffect(() => {
    fetchDeletedItems();
  }, [fetchDeletedItems]);

  const handleRestore = async (id: string) => {
    try {
        localDB.update(activeTab, id, { deleted_at: null });
        showToast(lang === 'ar' ? 'تمت استعادة السجل بنجاح' : 'Record restored successfully', 'success');
        fetchDeletedItems();
    } catch (err: any) {
        showToast(err.message, 'error');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm(lang === 'ar' ? 'تحذير: سيتم حذف السجل نهائياً من قاعدة البيانات المحلية. هل أنت متأكد؟' : 'Warning: This will permanently delete the record from local database. Continue?')) return;
    
    try {
        localDB.delete(activeTab, id);
        showToast(lang === 'ar' ? 'تم الحذف النهائي' : 'Permanently deleted', 'success');
        fetchDeletedItems();
    } catch (err: any) {
        showToast(err.message, 'error');
    }
  };

  return (
    <div className="slide-in" style={{ padding: '2rem' }}>
       <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
             <h1 className="sovereign-title-elite sharp-gold" style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>delete_sweep</span>
                {t.title}
             </h1>
             <p className="view-subtitle" style={{ marginTop: '0.5rem', fontWeight: 800 }}>{t.subtitle}</p>
          </div>
          <div style={{ padding: '1rem', borderRadius: '18px', background: 'rgba(var(--error-rgb), 0.1)', color: 'var(--error)', boxShadow: 'var(--shadow-sm)' }}>
             <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>delete</span>
          </div>
       </div>

       <div className="card shadow-elite" style={{ padding: '0.5rem', marginBottom: '2rem', display: 'flex', gap: '0.5rem', background: 'var(--surface-container-low)', borderRadius: '20px' }}>
          <button 
            onClick={() => setActiveTab('invoices')}
            className={`btn-executive ${activeTab === 'invoices' ? 'active' : ''}`}
            style={{ 
              flex: 1, 
              background: activeTab === 'invoices' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'invoices' ? 'white' : 'var(--on-surface-variant)',
              border: 'none',
              padding: '0.8rem',
              fontWeight: 800,
              borderRadius: '14px'
            }}
          >
             <span className="material-symbols-outlined" style={{ fontSize: '18px', marginInlineEnd: '0.5rem', verticalAlign: 'middle' }}>description</span>
              {t.invoices}
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className={`btn-executive ${activeTab === 'customers' ? 'active' : ''}`}
            style={{ 
              flex: 1, 
              background: activeTab === 'customers' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'customers' ? 'white' : 'var(--on-surface-variant)',
              border: 'none',
              padding: '0.8rem',
              fontWeight: 800,
              borderRadius: '14px'
            }}
          >
             <span className="material-symbols-outlined" style={{ fontSize: '18px', marginInlineEnd: '0.5rem', verticalAlign: 'middle' }}>group</span>
              {t.customers}
          </button>
          <button 
            onClick={() => setActiveTab('petty_cash')}
            className={`btn-executive ${activeTab === 'petty_cash' ? 'active' : ''}`}
            style={{ 
              flex: 1, 
              background: activeTab === 'petty_cash' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'petty_cash' ? 'white' : 'var(--on-surface-variant)',
              border: 'none',
              padding: '0.8rem',
              fontWeight: 800,
              borderRadius: '14px'
            }}
          >
             <span className="material-symbols-outlined" style={{ fontSize: '18px', marginInlineEnd: '0.5rem', verticalAlign: 'middle' }}>receipt</span>
              {t.petty_cash}
          </button>
       </div>

       <div className="card shadow-elite" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--surface-container-low)' }}>
             <div style={{ position: 'relative', flex: 1 }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', [lang === 'ar' ? 'right' : 'left']: '1.2rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-muted)', fontSize: '20px' }}>search</span>
                <input 
                  type="text" 
                  placeholder={lang === 'ar' ? 'البحث في المحذوفات السيادية...' : 'Search sovereign trash...'}
                  className="input-premium" 
                  style={{ [lang === 'ar' ? 'paddingRight' : 'paddingLeft']: '3.5rem' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <div style={{ fontSize: '0.85rem', fontWeight: 1000, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>database</span>
                OFFLINE CACHE
             </div>
          </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table-premium" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2rem' }}>{lang === 'ar' ? 'رقم السجل / الاسم' : 'ID / Name'}</th>
                <th>{lang === 'ar' ? 'تاريخ الحذف' : 'Deletion Date'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'ar' ? 'القيمة' : 'Value'}</th>
                <th style={{ textAlign: 'center', paddingInlineEnd: '2rem' }}>{lang === 'ar' ? 'خيارات الاسترجاع' : 'Restoration Options'}</th>
              </tr>
            </thead>
            <tbody>
                   {loading ? (
                     <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', fontWeight: 700 }}>Checking Cache...</td></tr>
                   ) : items.length === 0 ? (
                     <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', fontWeight: 700, opacity: 0.5 }}>{lang === 'ar' ? 'سلة المهملات فارغة' : 'Trash is empty'}</td></tr>
                   ) : items.filter(i => 
                       (i.name || i.reference_number || i.title || '').toLowerCase().includes(searchTerm.toLowerCase())
                     ).map((item) => (
                      <tr key={item.id}>
                         <td style={{ paddingInlineStart: '2rem' }}>
                            <div style={{ fontWeight: 1000, fontSize: '0.95rem', color: 'var(--primary)' }}>{item.name || item.reference_number || item.title}</div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--on-surface-variant)', opacity: 0.7 }}>UUID: {item.id}</div>
                         </td>
                         <td style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--on-surface-variant)' }}>
                            {new Date(item.deleted_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                         </td>
                         <td style={{ textAlign: 'right', fontWeight: 1000, color: 'var(--primary)', fontSize: '1rem' }}>
                            {(item.total || item.amount || 0).toLocaleString()} <small style={{ fontSize: '0.7rem' }}>SAR</small>
                         </td>
                         <td style={{ paddingInlineEnd: '2rem' }}>
                            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', alignItems: 'center' }}>
                               <button 
                                 onClick={() => handleRestore(item.id)}
                                 className="btn-sovereign-outline" 
                                 style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', gap: '0.4rem', borderRadius: '10px' }}
                               >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>settings_backup_restore</span>
                                  {lang === 'ar' ? 'استعادة' : 'Restore'}
                               </button>
                               <button 
                                 onClick={() => handlePermanentDelete(item.id)}
                                 style={{ background: 'transparent', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.3s' }}
                                 className="btn-icon-hover"
                               >
                                  <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>delete_forever</span>
                               </button>
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>

       <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--surface-container-high)', border: '1px dashed var(--error)' }}>
             <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--error)' }}>database</span>
             <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>
                {lang === 'ar' ? 'يتم تنظيف سلة المهملات تلقائياً كل 30 يوم من ملف قاعدة البيانات المحلي' : 'Trash is automatically cleared every 30 days from the local database file'}
             </span>
          </div>
       </div>
    </div>
  );
}
