import { useState, useEffect, useCallback } from 'react';
import { 
  Handshake, 
  DollarSign, 
  ExternalLink, 
  Plus, 
  Search, 
  MoreVertical, 
  Filter, 
  Settings, 
  Copy, 
  CheckCircle2, 
  AlertCircle,
  BarChart3,
  Globe,
  Briefcase,
  X,
  Send,
  Network,
  CreditCard,
  ArrowUpRight
} from 'lucide-react';
import type { Translations } from '../types/translations';
import type { AffiliatePartner } from '../types/database';

interface AffiliateProps {
  showToast: (msg: string, type?: string) => void;
  t: Translations['affiliate'];
}

// Assume supabase is globally available for now as other components use it this way
import { supabase } from '../lib/supabase';

export default function AffiliateView({ showToast, t }: AffiliateProps) {
  const [activeTab, setActiveTab] = useState('partners');
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form State
  const [newPartner, setNewPartner] = useState({
    name: '',
    type: 'Individual',
    commission: '10',
    email: ''
  });

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof supabase !== 'undefined') {
        const { data, error } = await supabase
          .from('affiliate_partners')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (data) {
          setPartners(data as AffiliatePartner[]);
          return;
        }
      }
      
      // Defaults if DB empty or supabase not present
      const defaults: AffiliatePartner[] = [
        { id: '1', name: 'Riyadh Marketing Node', type: 'Agency', status: 'Active', members: 45, commission: '12%', total_payout: 124500, date: '2026-01-10' } as AffiliatePartner,
        { id: '2', name: 'Majed Alotaibi', type: 'Individual', status: 'Active', members: 890, commission: '8%', total_payout: 34200, date: '2026-02-15' } as AffiliatePartner,
        { id: '3', name: 'Gulf Creative Net', type: 'Agency', status: 'Pending', members: 12, commission: '15%', total_payout: 0, date: '2026-03-20' } as AffiliatePartner,
        { id: '4', name: 'Software Solutions KSA', type: 'Corporate', status: 'Active', members: 156, commission: '10%', total_payout: 56800, date: '2025-11-05' } as AffiliatePartner
      ];
      setPartners(defaults);
      
    } catch (err) {
      console.error('Affiliate Fetch Error:', err);
      const defaults: Partial<AffiliatePartner>[] = [
        { id: '1', name: 'Riyadh Marketing Node', type: 'Agency', status: 'Active', members: 45, commission: '12%', total_payout: 124500, date: '2026-01-10' },
        { id: '2', name: 'Majed Alotaibi', type: 'Individual', status: 'Active', members: 890, commission: '8%', total_payout: 34200, date: '2026-02-15' }
      ];
      setPartners(defaults as AffiliatePartner[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleAddPartner = async () => {
    if (!newPartner.name || !newPartner.email) {
      showToast(t.complete_partner_data, 'error');
      return;
    }

    setLoading(true);
    try {
      if (typeof supabase !== 'undefined') {
        const { error } = await supabase.from('affiliate_partners').insert([{
          name: newPartner.name,
          type: newPartner.type,
          email: newPartner.email,
          commission: `${newPartner.commission}%`,
          status: 'Pending',
          total_payout: 0,
          members: 0
        }]);

        if (error) throw error;
      }
      
      showToast(t.partner_enrolled_successfully, 'success');
      setShowAddModal(false);
      fetchPartners();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error enrolling partner';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') return { background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid #22c55e' };
    if (s === 'pending') return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid #f59e0b' };
    if (s === 'inactive') return { background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444' };
    return { background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: '1px solid #6b7280' };
  };

  const getStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') return t.status.active;
    if (s === 'pending') return t.status.pending;
    if (s === 'inactive') return t.status.inactive;
    return status;
  };

  const getTypeLabel = (type: string) => {
    const s = type.toLowerCase();
    if (s === 'individual') return t.types.individual;
    if (s === 'agency') return t.types.agency;
    if (s === 'corporate') return t.types.corporate;
    return type;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'partners':
        return (
          <table className="accounting-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.8rem' }}>
            <thead>
              <tr style={{ textAlign: (t.lang === 'ar' ? 'right' : 'left') as 'right' | 'left', color: 'var(--on-surface-variant)', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>
                <th style={{ padding: '0 1rem' }}>{t.table.identity}</th>
                <th style={{ padding: '0 1rem' }}>{t.table.status}</th>
                <th style={{ padding: '0 1rem' }} className="hide-on-mobile">{t.table.conversions}</th>
                <th style={{ padding: '0 1rem' }} className="hide-on-mobile">{t.table.commission}</th>
                <th style={{ padding: '0 1rem' }}>{t.table.total_payout}</th>
                <th style={{ padding: '0 1rem' }} className="hide-on-mobile">{t.table.node}</th>
                <th style={{ padding: '0 1rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {partners.map((partner) => (
                <tr key={partner.id} className="row-hover" style={{ background: 'var(--surface-container-low)' }}>
                  <td style={{ padding: '1.2rem 1rem', borderRadius: t.lang === 'ar' ? '0 12px 12px 0' : '12px 0 0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{ padding: '0.6rem', background: 'var(--surface-container-high)', borderRadius: '10px', color: 'var(--primary)' }}><Briefcase size={18} /></div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{partner.name}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 700 }}>{getTypeLabel(partner.type)} • {t.since_label} {partner.date || partner.created_at?.split('T')[0]}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.2rem 1rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 950, padding: '0.3rem 0.8rem', borderRadius: '10px', textTransform: 'uppercase', ...getStatusStyle(partner.status) }}>
                      {getStatusLabel(partner.status)}
                    </span>
                  </td>
                  <td className="hide-on-mobile" style={{ padding: '1.2rem 1rem', fontWeight: 800 }}>{partner.members}</td>
                  <td className="hide-on-mobile" style={{ padding: '1.2rem 1rem', fontWeight: 800 }}>{partner.commission}</td>
                  <td style={{ padding: '1.2rem 1rem', fontWeight: 900, color: 'var(--primary)' }}>{Number(partner.total_payout).toLocaleString()}</td>
                  <td className="hide-on-mobile" style={{ padding: '1.2rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 800, opacity: 0.8 }}>
                      <Globe size={14} color="#22c55e" /> NODE-01
                    </div>
                  </td>
                  <td style={{ padding: '1.2rem 1rem', borderRadius: t.lang === 'ar' ? '12px 0 0 12px' : '0 12px 12px 0', textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'payouts':
        return (
          <div style={{ padding: '2rem' }}>
             <div className="card" style={{ padding: '1.5rem', background: 'var(--surface-container-low)', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                   <div style={{ padding: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', color: '#ef4444' }}><CreditCard size={20} /></div>
                   <div>
                      <h4 style={{ margin: 0, fontWeight: 900 }}>{t.payouts.pending_title} 12,450 SAR</h4>
                      <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6, fontWeight: 700 }}>{t.payouts.due_date}: April 12, 2026</p>
                   </div>
                </div>
                <button className="btn-executive" style={{ border: 'none' }}>{t.authorize_sovereign_payout}</button>
             </div>
             <table className="accounting-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.5rem' }}>
                <thead>
                   <tr style={{ fontSize: '0.7rem', fontWeight: 900, opacity: 0.6, textAlign: (t.lang === 'ar' ? 'right' : 'left') as 'right' | 'left' }}>
                      <th style={{ padding: '0.5rem 1rem' }}>{t.payouts.ref}</th>
                      <th style={{ padding: '0.5rem 1rem' }}>{t.payouts.partner}</th>
                      <th style={{ padding: '0.5rem 1rem' }}>{t.payouts.amount}</th>
                      <th style={{ padding: '0.5rem 1rem' }}>{t.payouts.status}</th>
                   </tr>
                </thead>
                <tbody>
                   {[
                      { ref: 'PAY-892', name: 'Riyadh Node', amount: '4,500', status: 'Processing' },
                      { ref: 'PAY-891', name: 'Majed Alotaibi', amount: '1,200', status: 'Completed' }
                   ].map((p, i) => (
                      <tr key={i} style={{ background: 'var(--surface-container-low)' }}>
                         <td style={{ padding: '1rem' }}>{p.ref}</td>
                         <td style={{ padding: '1rem', fontWeight: 800 }}>{p.name}</td>
                         <td style={{ padding: '1rem', fontWeight: 900 }}>{p.amount}</td>
                         <td style={{ padding: '1rem' }}><span style={{ fontSize: '0.6rem', fontWeight: 950, padding: '0.2rem 0.6rem', borderRadius: '4px', background: p.status === 'Completed' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: p.status === 'Completed' ? '#22c55e' : '#f59e0b' }}>{p.status}</span></td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        );
      case 'nodes':
        return (
          <div style={{ padding: '2rem' }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {[
                  { id: 'NODE-01', location: 'Riyadh', load: 85, partners: 12 },
                  { id: 'NODE-02', location: 'Jeddah', load: 42, partners: 8 },
                  { id: 'NODE-SECURE', location: 'Institutional', load: 12, partners: 2 }
                ].map((node, i) => (
                   <div key={i} className="card" style={{ padding: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                         <Network size={22} color="var(--primary)" />
                         <span style={{ fontSize: '0.6rem', fontWeight: 950, color: 'var(--on-surface-variant)' }}>ONLINE</span>
                      </div>
                      <h4 style={{ margin: '0 0 0.4rem', fontWeight: 900 }}>{node.id}</h4>
                      <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', opacity: 0.6, fontWeight: 700 }}>{node.location} • {node.partners} {t.active_partners}</p>
                      <div style={{ height: '4px', background: 'var(--surface-container-high)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.5rem' }}>
                         <div style={{ width: `${node.load}%`, height: '100%', background: 'var(--primary)' }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', fontWeight: 800 }}>
                         <span>{t.sovereign_load}</span>
                         <span>{node.load}%</span>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="slide-in">
      <div className="view-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="view-title" style={{ margin: 0 }}>{t.title}</h1>
          <p className="view-subtitle" style={{ margin: 0 }}>{t.subtitle}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-executive" style={{ border: 'none' }}>
           <Plus size={18} /> {t.enroll_partner}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard icon={<Handshake size={24} />} label={t.active_partners} value="42" growth="+8 this quarter" color="#4361ee" />
        <StatCard icon={<DollarSign size={24} />} label={t.total_sales} value="1.2M+" growth="28% of total rev" color="#22c55e" />
        <StatCard icon={<AlertCircle size={24} />} label={t.pending_payouts} value="15,400" growth="Due in 4 days" color="#ef4444" isAlert />
        <StatCard icon={<BarChart3 size={24} />} label={t.avg_multiplier} value="1.4x" growth="15% efficiency inc." color="#f59e0b" />
      </div>

      <div className="card" style={{ padding: '0', border: '1px solid var(--surface-container-high)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-container-low)' }}>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {Object.keys(t.tabs).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  padding: '0.5rem 0', 
                  fontSize: '0.85rem', 
                  fontWeight: activeTab === tab ? 900 : 700,
                  color: activeTab === tab ? 'var(--primary)' : 'var(--on-surface-variant)',
                  borderBottom: activeTab === tab ? '3px solid var(--secondary)' : '3px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              >
                {t.tabs[tab]}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
             <div className="search-executive" style={{ width: '220px' }}>
                <Search size={14} />
                <input placeholder="..." />
             </div>
             <button className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.5rem 1rem' }}><Filter size={14} /></button>
          </div>
        </div>

        <div style={{ padding: activeTab === 'partners' ? '1.5rem' : '0' }}>
           {renderTabContent()}
        </div>
      </div>

       <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
             <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <ExternalLink size={18} /> {t.link_gen.title}
             </h3>
             <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                   <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.6rem' }}>{t.link_gen.label_destination}</label>
                   <input className="input-executive" defaultValue="https://alghwairy.co/services/sovereign-ledger" />
                </div>
                <div style={{ width: '180px' }} className="hide-on-mobile">
                   <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.6rem' }}>{t.link_gen.label_select}</label>
                   <select className="input-executive">
                      <option>Riyadh Node</option>
                      <option>Majed Alotaibi</option>
                   </select>
                </div>
                <button className="btn-executive" style={{ height: '42px', padding: '0 1.5rem' }}>{t.link_gen.generate}</button>
             </div>
             
             <div style={{ marginTop: '1.5rem', padding: '1.2rem', background: 'var(--surface-container-low)', borderRadius: '12px', border: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <code style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>https://alghwairy.co/sl?ref=NODE01_S26</code>
                <button onClick={() => showToast(t.link_copied, 'success')} style={{ all: 'unset', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 900, fontSize: '0.8rem', background: 'var(--primary)', padding: '0.5rem 1rem', borderRadius: '8px' }}>
                   <Copy size={14} /> {t.link_gen.copy}
                </button>
             </div>
          </div>

          <div className="card" style={{ padding: '2rem' }}>
             <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Settings size={18} /> {t.commission_architecture}
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {[
                  { label: t.types.agency, rate: '15%', active: true },
                  { label: t.types.corporate, rate: '10%', active: true },
                  { label: t.types.individual, rate: '5%', active: false }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.8rem', borderBottom: '1px solid var(--surface-container-high)' }}>
                     <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>{item.label}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 700 }}>{t.rate_label} {item.rate}</div>
                     </div>
                     {item.active ? <CheckCircle2 size={16} color="#22c55e" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--surface-container-high)' }} />}
                  </div>
                ))}
             </div>
             <button className="btn-executive" style={{ width: '100%', marginTop: '1.5rem', background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
                {t.manage_structures}
             </button>
          </div>
       </div>

       {showAddModal && (
         <div className="modal-overlay" style={{ zIndex: 1000 }}>
            <div className="card modal-content slide-in" style={{ width: '500px', padding: '2.5rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                  <h3 style={{ margin: 0, fontFamily: 'Cairo', fontWeight: 900, fontSize: '1.4rem', color: 'var(--primary)' }}>{t.add_modal.title}</h3>
                  <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><X /></button>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                     <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>{t.add_modal.name}</label>
                     <input className="input-executive" type="text" value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} placeholder="..." />
                  </div>
                  <div>
                     <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>{t.add_modal.email}</label>
                     <input className="input-executive" type="email" value={newPartner.email} onChange={e => setNewPartner({...newPartner, email: e.target.value})} placeholder="email@..." />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>{t.add_modal.type}</label>
                       <select className="input-executive" value={newPartner.type} onChange={e => setNewPartner({...newPartner, type: e.target.value})}>
                          <option value="Individual">{t.types.individual}</option>
                          <option value="Agency">{t.types.agency}</option>
                          <option value="Corporate">{t.types.corporate}</option>
                       </select>
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>{t.add_modal.commission}</label>
                       <input className="input-executive" type="number" value={newPartner.commission} onChange={e => setNewPartner({...newPartner, commission: e.target.value})} />
                    </div>
                  </div>
               </div>

               <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
                  <button onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>{t.cancel}</button>
                  <button onClick={handleAddPartner} disabled={loading} className="btn-executive" style={{ flex: 2, border: 'none' }}><Send size={18} /> {t.activate_partner_btn}</button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  growth: string;
  color: string;
  isAlert?: boolean;
}

function StatCard({ icon, label, value, growth, color, isAlert = false }: StatCardProps) {
  return (
    <div className="card" style={{ padding: '1.8rem', border: '1px solid var(--surface-container-high)', display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
       <div style={{ padding: '1rem', background: `${color}15`, borderRadius: '16px', color: color }}>{icon}</div>
       <div>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, opacity: 0.6, color: 'var(--primary)', textTransform: 'uppercase' }}>{label}</p>
          <h3 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 900 }}>{value}</h3>
          <p style={{ margin: 0, fontSize: '0.7rem', color: isAlert ? '#ef4444' : '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
             {isAlert ? <AlertCircle size={14} /> : <ArrowUpRight size={14} />} {growth}
          </p>
       </div>
    </div>
  );
}
