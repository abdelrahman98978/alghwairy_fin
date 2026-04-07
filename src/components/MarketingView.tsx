import React, { useState } from 'react';
import { 
  Megaphone, 
  Users, 
  MousePointer2, 
  Zap, 
  Plus, 
  Search, 
  Filter, 
  Target, 
  Activity, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownRight,
  Send,
  Mail,
  Share2,
  Globe,
  MoreVertical,
  X,
  Layout
} from 'lucide-react';
import type { Translations } from '../types/translations';

interface MarketingViewProps {
  t: Translations['marketing'] & { lang: string };
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function MarketingView({ t, showToast }: MarketingViewProps) {
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([
    { id: '1', name: 'Sovereign Institutional Q2', status: 'Active', reach: '124.5k', engagement: '12.4%', leads: 842, budget: 25000, date: '2024-03-15' },
    { id: '2', name: 'Alghwairy Growth Node', status: 'Scheduled', reach: '0', engagement: '0%', leads: 0, budget: 15000, date: '2024-04-01' },
    { id: '3', name: 'Consumer Loyalty V1', status: 'Completed', reach: '85.2k', engagement: '8.1%', leads: 412, budget: 45000, date: '2024-02-10' }
  ]);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    budget: '',
    start_date: '',
    category: 'Institutional'
  });

  const handleAddCampaign = async () => {
    setLoading(true);
    // Mimic API delay
    await new Promise(r => setTimeout(r, 1000));
    const camp = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCampaign.name,
      status: 'Scheduled',
      reach: '0',
      engagement: '0%',
      leads: 0,
      budget: Number(newCampaign.budget),
      date: newCampaign.start_date
    };
    setCampaigns([camp, ...campaigns]);
    setShowAddModal(false);
    setNewCampaign({ name: '', budget: '', start_date: '', category: 'Institutional' });
    setLoading(false);
  };

  const handleSendEmail = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1500));
    setLoading(false);
    showToast(t.lang === 'ar' ? 'تم إرسال البريد بنجاح' : 'Email broadcasted successfully', 'success');
  };

  const handleApplyOptimization = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    showToast(t.lang === 'ar' ? 'تم تطبيق تحسينات الذكاء الاصطناعي' : 'AI Optimizations applied successfully', 'success');
  };

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') return { background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid #22c55e' };
    if (s === 'scheduled') return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid #3b82f6' };
    if (s === 'completed') return { background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: '1px solid #6b7280' };
    return { background: 'rgba(107, 114, 128, 0.1)', color: '#6b7280', border: '1px solid #6b7280' };
  };

  const getStatusLabel = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'active') return t.status.active;
    if (s === 'scheduled') return t.status.scheduled;
    if (s === 'completed') return t.status.completed;
    return status;
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'campaigns':
        return (
          <table className="accounting-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.8rem' }}>
            <thead>
              <tr style={{ textAlign: (t.lang === 'ar' ? 'right' : 'left') as 'right' | 'left', color: 'var(--on-surface-variant)', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase' }}>
                <th style={{ padding: '0 1rem' }}>{t.table.identity}</th>
                <th style={{ padding: '0 1rem' }}>{t.table.status}</th>
                <th style={{ padding: '0 1rem' }} className="hide-on-mobile">{t.table.reach}</th>
                <th style={{ padding: '0 1rem' }} className="hide-on-mobile">{t.table.engagement}</th>
                <th style={{ padding: '0 1rem' }} className="hide-on-mobile">{t.table.leads}</th>
                <th style={{ padding: '0 1rem' }} className="hide-on-mobile">{t.table.budget}</th>
                <th style={{ padding: '0 1rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((camp) => (
                <tr key={camp.id} className="row-hover" style={{ background: 'var(--surface-container-low)' }}>
                  <td style={{ padding: '1.2rem 1rem', borderRadius: t.lang === 'ar' ? '0 12px 12px 0' : '12px 0 0 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{ padding: '0.6rem', background: 'var(--surface-container-high)', borderRadius: '10px', color: 'var(--primary)' }}><Target size={18} /></div>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{camp.name}</div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.6, fontWeight: 700 }}>{t.launched_at}: {camp.date}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '1.2rem 1rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 950, padding: '0.3rem 0.8rem', borderRadius: '10px', textTransform: 'uppercase', ...getStatusStyle(camp.status) }}>
                      {getStatusLabel(camp.status)}
                    </span>
                  </td>
                  <td className="hide-on-mobile" style={{ padding: '1.2rem 1rem', fontWeight: 800 }}>{camp.reach || '0'}</td>
                  <td className="hide-on-mobile" style={{ padding: '1.2rem 1rem', fontWeight: 800 }}>{camp.engagement || '0%'}</td>
                  <td className="hide-on-mobile" style={{ padding: '1.2rem 1rem', fontWeight: 800 }}>{camp.leads || '0'}</td>
                  <td className="hide-on-mobile" style={{ padding: '1.2rem 1rem', fontWeight: 900, color: 'var(--primary)' }}>{Number(camp.budget).toLocaleString()}</td>
                  <td style={{ padding: '1.2rem 1rem', borderRadius: t.lang === 'ar' ? '12px 0 0 12px' : '0 12px 12px 0', textAlign: 'center' }}>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'email':
        return (
          <div style={{ padding: '2rem' }}>
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2.5rem', border: '1px dashed var(--surface-container-high)' }}>
               <h3 style={{ margin: '0 0 1.5rem', fontWeight: 900, fontSize: '1.2rem', textAlign: 'center' }}>{t.email_composer_title}</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                  <input className="input-executive" placeholder={t.email_subject_placeholder} />
                  <textarea className="input-executive" style={{ minHeight: '150px', resize: 'vertical', fontFamily: 'inherit' }} placeholder={t.email_content_placeholder}></textarea>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                     <button onClick={handleSendEmail} disabled={loading} className="btn-executive" style={{ flex: 2, border: 'none' }}>
                        <Send size={18} /> {t.broadcast_to_all}
                     </button>
                     <button className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>
                        <Layout size={18} /> {t.templates_label}
                     </button>
                  </div>
               </div>
            </div>
          </div>
        );
      case 'automation':
        return (
          <div style={{ padding: '2rem' }}>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {[
                  { title: t.institutional_welcome_series, status: 'Active', trigger: 'New Business Signup', count: 124 },
                  { title: t.abandoned_cart_retargeting, status: 'Active', trigger: 'Order not completed > 2h', count: 45 },
                  { title: t.sovereign_loyalty_nodes, status: 'Paused', trigger: 'Spent > 50k SAR', count: 5 }
                ].map((item, i) => (
                  <div key={i} className="card" style={{ padding: '1.8rem', border: '1px solid var(--surface-container-high)', transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem', alignItems: 'center' }}>
                        <div style={{ padding: '0.6rem', background: 'rgba(67, 97, 238, 0.1)', borderRadius: '10px', color: '#4361ee' }}><Zap size={20} /></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 950, padding: '0.3rem 0.8rem', borderRadius: '10px', background: item.status === 'Active' ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)', color: item.status === 'Active' ? '#22c55e' : '#6b7280', textTransform: 'uppercase' }}>{item.status}</span>
                     </div>
                     <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 900 }}>{item.title}</h4>
                     <p style={{ margin: '0 0 1.2rem', fontSize: '0.75rem', opacity: 0.6, fontWeight: 700 }}>{t.trigger_label}: {item.trigger}</p>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-container-high)', paddingTop: '1rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>{item.count} {t.transactions_automated}</span>
                        <button style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 950, cursor: 'pointer', fontSize: '0.75rem' }}>{t.configure}</button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        );
      case 'intelligence':
        return (
          <div style={{ padding: '2rem' }}>
             <div className="card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, var(--primary) 0%, #1a1a1a 100%)', color: 'white', border: 'none', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                   <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '1.3rem', fontWeight: 900 }}><Activity size={24} color="var(--secondary)" /> {t.intelligent_conversion_audit}</h3>
                   <div style={{ display: 'flex', gap: '4rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
                      <div>
                         <div style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{t.sovereign_forecast_accuracy}</div>
                         <div style={{ fontSize: '3rem', fontWeight: 950, color: 'var(--secondary)' }}>94.2%</div>
                      </div>
                      <div>
                         <div style={{ fontSize: '0.85rem', opacity: 0.6, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>{t.projected_savings}</div>
                         <div style={{ fontSize: '3rem', fontWeight: 950 }}>12,500 <small style={{ fontSize: '1rem', opacity: 0.7 }}>SAR/mo</small></div>
                      </div>
                   </div>
                   <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
                      <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: 600, lineHeight: '1.6' }}>
                         <Sparkles size={16} color="var(--secondary)" style={{ display: 'inline', marginRight: '0.5rem' }} />
                         {t.ai_recommendation_text}
                      </p>
                      <button onClick={handleApplyOptimization} disabled={loading} className="btn-executive" style={{ width: '100%', marginTop: '1.5rem', background: 'var(--secondary)', color: 'var(--primary)', border: 'none', fontWeight: 950 }}>
                         {t.activate_ai_recommendations}
                      </button>
                   </div>
                </div>
                <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px', background: 'var(--secondary)', borderRadius: '50%', opacity: 0.03, filter: 'blur(80px)' }}></div>
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
           <Plus size={18} /> {t.create_campaign}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard icon={<Megaphone size={24} />} label={t.active_campaigns} value="12" growth="+2 this month" color="#4361ee" />
        <StatCard icon={<Users size={24} />} label={t.total_reach} value="258.4k" growth="+12.4% vs LY" color="#ef4444" />
        <StatCard icon={<MousePointer2 size={24} />} label={t.conv_rate} value="4.8%" growth="+0.5% opt." color="#22c55e" />
        <StatCard icon={<Zap size={24} />} label={t.roi_multiplier} value="3.4x" growth="-0.2x seasonal" color="#f59e0b" isDown />
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
                <input placeholder={t.search_campaigns_placeholder} />
             </div>
             <button className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.5rem 1rem' }}>
                <Filter size={14} /> {t.filter_label}
             </button>
          </div>
        </div>

        <div style={{ padding: activeTab === 'campaigns' ? '1.5rem' : '0' }}>
           {renderTabContent()}
        </div>
      </div>

       <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
             <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 900, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Share2 size={18} /> {t.platform_performance_matrix}
             </h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                {[
                  { name: t.sovereign_email_node, performance: 85, color: '#4361ee', icon: <Mail size={16} /> },
                  { name: t.google_ads_search, performance: 62, color: '#f59e0b', icon: <Globe size={16} /> },
                  { name: t.x_sovereign_presence, performance: 48, color: '#000000', icon: <Share2 size={16} /> },
                  { name: t.linkedin_institutional, performance: 74, color: '#0077b5', icon: <Users size={16} /> }
                ].map((item, i) => (
                  <div key={i}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', fontWeight: 800 }}>{item.icon} {item.name}</div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 900 }}>{item.performance}%</span>
                     </div>
                     <div style={{ height: '8px', background: 'var(--surface-container-high)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${item.performance}%`, height: '100%', background: item.color, borderRadius: '4px' }}></div>
                     </div>
                  </div>
                ))}
             </div>
          </div>

          <div className="card" style={{ padding: '1.5rem', background: 'var(--primary)', color: 'white' }}>
             <h3 style={{ margin: '0 0 1.2rem', fontSize: '1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Zap size={18} color="var(--secondary)" /> {t.sovereign_automation_ai}
             </h3>
             <p style={{ fontSize: '0.85rem', opacity: 0.8, fontWeight: 600, lineHeight: '1.6', marginBottom: '1.5rem' }}>
                {t.ai_marketing_engine_alert}
             </p>
             <button onClick={handleApplyOptimization} disabled={loading} className="btn-executive" style={{ width: '100%', background: 'var(--secondary)', color: 'var(--primary)', border: 'none', justifyContent: 'center' }}>
                {t.apply_optimization_btn}
             </button>
             <div style={{ marginTop: '1.5rem', paddingTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, opacity: 0.6 }}>{t.last_audit_prefix} 2h</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 950, color: 'var(--secondary)' }}>{t.secure_node_active_label}</span>
             </div>
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
                     <input className="input-executive" type="text" value={newCampaign.name} onChange={e => setNewCampaign({...newCampaign, name: e.target.value})} placeholder="..." />
                  </div>
                  <div>
                     <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>{t.add_modal.budget}</label>
                     <input className="input-executive" type="number" value={newCampaign.budget} onChange={e => setNewCampaign({...newCampaign, budget: e.target.value})} placeholder="0" />
                  </div>
                  <div>
                     <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>{t.add_modal.start_date}</label>
                     <input className="input-executive" type="date" value={newCampaign.start_date} onChange={e => setNewCampaign({...newCampaign, start_date: e.target.value})} />
                  </div>
                  <div>
                     <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.6rem' }}>{t.add_modal.category}</label>
                     <select className="input-executive" value={newCampaign.category} onChange={e => setNewCampaign({...newCampaign, category: e.target.value})}>
                        <option value="Institutional">{t.categories.institutional}</option>
                        <option value="Sovereign">{t.categories.sovereign}</option>
                        <option value="Consumer">{t.categories.consumer}</option>
                     </select>
                  </div>
               </div>

               <div style={{ marginTop: '3rem', display: 'flex', gap: '1rem' }}>
                  <button onClick={() => setShowAddModal(false)} className="btn-executive" style={{ flex: 1, background: 'var(--surface-container-high)', color: 'var(--primary)', border: 'none' }}>{t.cancel || 'Cancel'}</button>
                  <button onClick={handleAddCampaign} disabled={loading} className="btn-executive" style={{ flex: 2, border: 'none' }}><Send size={18} /> {t.activate_campaign_btn}</button>
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
  value: string;
  growth: string;
  color: string;
  isDown?: boolean;
}

function StatCard({ icon, label, value, growth, color, isDown = false }: StatCardProps) {
  return (
    <div className="card" style={{ padding: '1.8rem', border: '1px solid var(--surface-container-high)', display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
       <div style={{ padding: '1rem', background: `${color}15`, borderRadius: '16px', color: color }}>{icon}</div>
       <div>
          <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 800, opacity: 0.6, color: 'var(--primary)', textTransform: 'uppercase' }}>{label}</p>
          <h3 style={{ margin: '0.2rem 0', fontSize: '1.8rem', fontWeight: 900 }}>{value}</h3>
          <p style={{ margin: 0, fontSize: '0.7rem', color: isDown ? '#ef4444' : '#22c55e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
             {isDown ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
             {growth}
          </p>
       </div>
    </div>
  );
}
