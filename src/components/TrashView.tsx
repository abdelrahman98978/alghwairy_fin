import { useState, useEffect, useCallback } from 'react';
import { 
  Trash2, RotateCcw, Search, 
  FileText, Users, Receipt, 
  Trash, Database, AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  const fetchDeletedItems = useCallback(async () => {
    let query = supabase.from(activeTab).select('*').not('deleted_at', 'is', null);
    
    // For invoices, we need customer name
    if (activeTab === 'invoices') {
      query = supabase.from('invoices').select('*, customers(name)').not('deleted_at', 'is', null);
    }

    const { data, error } = await query.order('deleted_at', { ascending: false });
    
    if (error) {
      showToast(error.message, 'error');
    } else {
      setItems(Array.isArray(data) ? (data as TrashItem[]) : []);
    }
    setLoading(false);
  }, [activeTab, showToast]);

  useEffect(() => {
    const init = async () => {
      await fetchDeletedItems();
    };
    init();
  }, [fetchDeletedItems]);

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from(activeTab)
      .update({ deleted_at: null })
      .eq('id', id);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تمت استعادة السجل بنجاح' : 'Record restored successfully', 'success');
      fetchDeletedItems();
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!window.confirm(lang === 'ar' ? 'تحذير: سيتم حذف السجل نهائياً من قاعدة البيانات. هل أنت متأكد؟' : 'Warning: This will permanently delete the record. Continue?')) return;
    
    const { error } = await supabase.from(activeTab).delete().eq('id', id);

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast(lang === 'ar' ? 'تم الحذف النهائي' : 'Permanently deleted', 'success');
      fetchDeletedItems();
    }
  };

  return (
    <div className="fade-in" style={{ padding: '2rem' }}>
       <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
             <h2 style={{ fontSize: '2.2rem', margin: 0, fontWeight: 900, color: 'var(--primary)', letterSpacing: '-1px' }}>
                {t.title}
             </h2>
             <p style={{ margin: '0.4rem 0 0 0', opacity: 0.7, fontWeight: 700, fontSize: '0.95rem' }}>
                {t.subtitle}
             </p>
          </div>
          <div style={{ padding: '1rem', borderRadius: '16px', background: 'rgba(211, 47, 47, 0.1)', color: 'var(--error)' }}>
             <Trash size={32} strokeWidth={2.5} />
          </div>
       </div>

       <div className="card" style={{ padding: '0.5rem', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', background: 'var(--surface-container-low)' }}>
          <button 
            onClick={() => setActiveTab('invoices')}
            className="btn-executive" 
            style={{ 
              flex: 1, 
              background: activeTab === 'invoices' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'invoices' ? 'white' : 'var(--on-surface)',
              border: 'none',
              padding: '0.8rem'
            }}
          >
             <FileText size={18} style={{ marginInlineEnd: '0.5rem' }} />
              {t.invoices}
          </button>
          <button 
            onClick={() => setActiveTab('customers')}
            className="btn-executive" 
            style={{ 
              flex: 1, 
              background: activeTab === 'customers' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'customers' ? 'white' : 'var(--on-surface)',
              border: 'none',
              padding: '0.8rem'
            }}
          >
             <Users size={18} style={{ marginInlineEnd: '0.5rem' }} />
              {t.customers}
          </button>
          <button 
            onClick={() => setActiveTab('petty_cash')}
            className="btn-executive" 
            style={{ 
              flex: 1, 
              background: activeTab === 'petty_cash' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'petty_cash' ? 'white' : 'var(--on-surface)',
              border: 'none',
              padding: '0.8rem'
            }}
          >
             <Receipt size={18} style={{ marginInlineEnd: '0.5rem' }} />
              {t.petty_cash}
          </button>
       </div>

       <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
             <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', [lang === 'ar' ? 'right' : 'left']: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                <input 
                  type="text" 
                  placeholder={lang === 'ar' ? 'البحث في المحذوفات...' : 'Search trash...'}
                  className="input-executive" 
                  style={{ [lang === 'ar' ? 'paddingRight' : 'paddingLeft']: '3rem' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
             <div style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--error)' }}>
                <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginInlineEnd: '0.3rem' }} />
                DELETED OBJECTS CACHE
             </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
             <table className="sovereign-table">
                <thead>
                   <tr>
                      <th style={{ paddingInlineStart: '2rem' }}>{lang === 'ar' ? 'رقم السجل / الاسم' : 'ID / Name'}</th>
                      <th>{lang === 'ar' ? 'تاريخ الحذف' : 'Deletion Date'}</th>
                      <th style={{ textAlign: 'right' }}>{lang === 'ar' ? 'القيمة' : 'Value'}</th>
                      <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'خيارات الاسترجاع' : 'Restoration Options'}</th>
                   </tr>
                </thead>
                <tbody>
                   {loading ? (
                     <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', fontWeight: 700 }}>Syncing...</td></tr>
                   ) : items.length === 0 ? (
                     <tr><td colSpan={4} style={{ textAlign: 'center', padding: '3rem', fontWeight: 700, opacity: 0.5 }}>{lang === 'ar' ? 'سلة المهملات فارغة' : 'Trash is empty'}</td></tr>
                   ) : items.filter(i => 
                       (i.name || i.reference_number || i.title || '').toLowerCase().includes(searchTerm.toLowerCase())
                     ).map((item) => (
                     <tr key={item.id}>
                        <td style={{ paddingInlineStart: '2rem' }}>
                           <div style={{ fontWeight: 900 }}>{item.name || item.reference_number || item.title}</div>
                           <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>UUID: {item.id}</div>
                        </td>
                        <td style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                           {new Date(item.deleted_at).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 900, color: 'var(--primary)' }}>
                           {(item.total || item.amount || 0).toLocaleString()} SAR
                        </td>
                        <td style={{ textAlign: 'center' }}>
                           <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleRestore(item.id)}
                                className="btn-executive" 
                                style={{ padding: '0.5rem 1rem', background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none', fontSize: '0.75rem', gap: '0.4rem' }}
                              >
                                 <RotateCcw size={14} />
                                 {lang === 'ar' ? 'استعادة' : 'Restore'}
                              </button>
                              <button 
                                onClick={() => handlePermanentDelete(item.id)}
                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', opacity: 0.6 }}
                              >
                                 <Trash2 size={18} />
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
             <Database size={16} color="var(--error)" />
             <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)' }}>
                {lang === 'ar' ? 'يتم تنظيف سلة المهملات تلقائياً كل 30 يوم' : 'Trash is automatically cleared every 30 days'}
             </span>
          </div>
       </div>
    </div>
  );
}
