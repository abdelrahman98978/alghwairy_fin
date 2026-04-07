import { useState, useEffect, useCallback } from 'react';
import { 
  CreditCard,
  Building,
  Plus,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Translations } from '../types/translations';

interface Prepayment {
  id: string;
  title: string;
  company: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface PrepaymentsProps {
  showToast: (msg: string, type?: string) => void;
  logActivity: (action: string, entity: string, entity_id?: string) => Promise<void>;
  t: Translations['prepayments'];
}

export default function PrepaymentsView({ showToast, logActivity, t }: PrepaymentsProps) {
  const [prepayments, setPrepayments] = useState<Prepayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'نشط'
  });

  const fetchPrepayments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('prepayments').select('*').order('created_at', { ascending: false });
    if (error) {
      showToast('Error: ' + error.message, 'error');
    } else {
      setPrepayments((data as Prepayment[]) || []);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    const init = async () => {
      await fetchPrepayments();
    };
    init();
  }, [fetchPrepayments]);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.company) {
      showToast('Validation Error', 'error');
      return;
    }

    const { error } = await supabase.from('prepayments').insert([formData]);
    if (error) {
      showToast('Error saving record', 'error');
    } else {
      await logActivity('Recorded Prepayment Transaction: ' + formData.title, 'prepayments');
      showToast('Sovereign prepayment recorded.', 'success');
      setShowAddModal(false);
      setFormData({ 
        title: '', 
        company: '', 
        start_date: new Date().toISOString().split('T')[0], 
        end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], 
        status: 'نشط' 
      });
      fetchPrepayments();
    }
  };

  return (
    <div className="slide-in">
      <header className="view-header" style={{ marginBottom: '3rem' }}>
        <div>
           <h2 className="view-title" style={{ margin: 0 }}>{t.title}</h2>
           <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <button 
           onClick={() => setShowAddModal(true)}
           className="btn-executive" 
           style={{ border: 'none' }}
        >
           <Plus size={18} /> {t.add_title}
        </button>
      </header>

      {/* Stats Summary */}
      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem', marginBottom: '3rem' }}>
         <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '2rem' }}>
            <div style={{ padding: '1rem', background: 'var(--surface-container-high)', borderRadius: '16px', color: 'var(--primary)' }}><CreditCard size={24} /></div>
            <div>
               <p style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontWeight: 800, marginBottom: '0.4rem' }}>{t.active_count}</p>
               <h3 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 900, color: 'var(--primary)' }}>{prepayments.filter(p => p.status === 'نشط').length}</h3>
            </div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
         <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--surface-container-high)' }}>
            <div style={{ padding: '1.5rem 2.5rem', background: 'var(--surface-container-low)', borderBottom: '1px solid var(--surface-container-high)' }}>
               <h3 style={{ fontSize: '1.2rem', fontFamily: 'Tajawal', margin: 0, fontWeight: 900 }}>{t.recent_ledger}</h3>
            </div>
            
            {loading ? (
              <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>{t.loading}</div>
            ) : prepayments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--on-surface-variant)', fontWeight: 800 }}>{t.empty}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="sovereign-table">
                    <thead>
                       <tr>
                          <th style={{ paddingInlineStart: '2.5rem' }}>{t.table.title}</th>
                          <th>{t.table.company}</th>
                          <th style={{ textAlign: 'center' }}>{t.table.start}</th>
                          <th style={{ textAlign: 'center' }}>{t.table.end}</th>
                          <th style={{ textAlign: 'center', paddingInlineEnd: '2.5rem' }}>{t.table.status}</th>
                       </tr>
                    </thead>
                    <tbody>
                       {prepayments.map((prep) => (
                          <tr key={prep.id}>
                             <td style={{ paddingInlineStart: '2.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                   <div style={{ padding: '0.6rem', background: 'var(--surface-container-high)', borderRadius: '10px', color: 'var(--primary)' }}><Building size={16} /></div>
                                   <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{prep.title}</span>
                                </div>
                             </td>
                             <td style={{ fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>{prep.company}</td>
                             <td style={{ fontSize: '0.85rem', textAlign: 'center', fontWeight: 800 }}>{prep.start_date || 'N/A'}</td>
                             <td style={{ fontSize: '0.85rem', textAlign: 'center', fontWeight: 800 }}>{prep.end_date || 'N/A'}</td>
                             <td style={{ textAlign: 'center', paddingInlineEnd: '2.5rem' }}>
                                <span style={{ 
                                   fontSize: '0.7rem', 
                                   padding: '0.4rem 1rem', 
                                   borderRadius: '20px', 
                                   fontWeight: 900,
                                   background: prep.status === 'نشط' ? 'rgba(27, 94, 32, 0.1)' : 'rgba(186, 26, 26, 0.1)',
                                   color: prep.status === 'نشط' ? 'var(--success)' : 'var(--error)'
                                }}>
                                   {prep.status === 'نشط' ? (t.lang === 'en' ? 'Active' : 'نشط') : (t.lang === 'en' ? 'Expired' : 'منتهي')}
                                </span>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
            )}
         </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,36,70,0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <div className="card slide-in" style={{ width: '100%', maxWidth: '480px', padding: '3rem', position: 'relative', border: 'none' }}>
            <button 
              onClick={() => setShowAddModal(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}
            >
              <X size={24} />
            </button>
            <h3 style={{ fontSize: '1.6rem', fontFamily: 'Tajawal', marginBottom: '2.5rem', fontWeight: 900, color: 'var(--primary)', textAlign: 'center' }}>{t.add_title}</h3>
            
            <form onSubmit={handleManualAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.table.title}</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.table.company}</label>
                <input required type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="input-executive" style={{ fontWeight: 600 }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.table.start}</label>
                  <input required type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="input-executive" style={{ fontWeight: 700 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.table.end}</label>
                  <input required type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="input-executive" style={{ fontWeight: 700 }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--on-surface)' }}>{t.table.status}</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="input-executive" style={{ fontWeight: 800 }}>
                  <option value="نشط">{t.lang === 'en' ? 'Active / Valid' : 'نشط / ساري المفعول'}</option>
                  <option value="منتهي">{t.lang === 'en' ? 'Expired / Ended' : 'منتهي / مكتمل'}</option>
                </select>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--on-surface)', border: 'none', fontWeight: 800 }}>{t.lang === 'en' ? 'Cancel' : 'إلغاء'}</button>
                <button type="submit" className="btn-executive" style={{ flex: 2, border: 'none' }}>{t.lang === 'en' ? 'Record Prepayment' : 'حفظ الدفعة'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
