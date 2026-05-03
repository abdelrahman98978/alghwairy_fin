import { useState, useEffect, useCallback } from 'react';
import { localDB } from '../lib/localDB';
import type { AffiliatePartner, AffiliatePayout } from '../lib/localDB';


interface AffiliateProps {
  showToast: (msg: string, type?: string) => void;
  lang: string;
}

export default function AffiliateView({ showToast, lang }: AffiliateProps) {
  const [activeTab, setActiveTab] = useState<'partners' | 'payouts' | 'links' | 'settings'>('partners');
  const [partners, setPartners] = useState<AffiliatePartner[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [stats, setStats] = useState({
    activePartners: 0,
    totalSales: 0,
    pendingPayouts: 0,
    avgMultiplier: 1.25
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: '',
    email: '',
    type: 'individual',
    commission: 10
  });

  const [linkGen, setLinkGen] = useState({
    destination: '',
    partnerId: '',
    generatedLink: ''
  });

  // Simplified translations for the component
  const t = {
    ar: {
      title: 'التسويق بالعمولة',
      subtitle: 'إدارة الشركاء والعمولات والنمو المؤسسي.',
      enroll_partner: 'تسجيل شريك جديد',
      active_partners: 'الشركاء النشطون',
      total_sales: 'إجمالي المبيعات',
      pending_payouts: 'دفعات معلقة',
      avg_multiplier: 'متوسط المضاعف',
      efficiency_multiplier: 'مضاعف الكفاءة',
      since_label: 'منذ:',
      sovereign_load: 'الحمل السيادي',
      manage_structures: 'إدارة الهياكل',
      rate_label: 'المعدل',
      link_copied: 'تم نسخ الرابط',
      complete_partner_data: 'يرجى إكمال بيانات الشريك',
      partner_enrolled_successfully: 'تم تسجيل الشريك بنجاح',
      authorize_sovereign_payout: 'اعتماد صرف سيادي',
      commission_architecture: 'هيكلية العمولات',
      tabs: {
        partners: 'الشركاء',
        payouts: 'المدفوعات',
        links: 'الروابط السيادية',
        settings: 'الإعدادات'
      },
      table: {
        identity: 'هوية الشريك',
        status: 'الحالة',
        conversions: 'التحويلات',
        commission: 'العمولة',
        total_payout: 'إجمالي الصرف',
        node: 'العقدة'
      },
      status: {
        active: 'نشط',
        pending: 'معلق',
        inactive: 'غير نشط'
      },
      types: {
        individual: 'فردي',
        agency: 'وكالة',
        corporate: 'مؤسسي'
      },
      link_gen: {
        title: 'مولد الروابط السيادي',
        destination: 'الوجهة',
        partner: 'الشريك',
        generate: 'توليد الرابط',
        copy: 'نسخ',
        label_destination: 'رابط الوجهة',
        label_select: 'اختر الشريك'
      },
      payouts: {
        pending_title: 'المدفوعات المستحقة',
        due_date: 'تاريخ الاستحقاق',
        authorize: 'اعتماد',
        ref: 'المرجع',
        partner: 'الشريك',
        amount: 'المبلغ',
        status: 'الحالة'
      },
      add_modal: {
        title: 'تسجيل شريك سيادي',
        name: 'اسم الشريك',
        email: 'البريد الإلكتروني',
        type: 'نوع الشريك',
        commission: 'نسبة العمولة'
      },
      cancel: 'إلغاء',
      activate_partner_btn: 'تفعيل الشريك'
    },
    en: {
      title: 'Affiliate Ledger',
      subtitle: 'Manage partners, commissions, and institutional growth.',
      enroll_partner: 'Enroll New Partner',
      active_partners: 'Active Partners',
      total_sales: 'Total Sales',
      pending_payouts: 'Pending Payouts',
      avg_multiplier: 'Avg Multiplier',
      efficiency_multiplier: 'Efficiency Multiplier',
      since_label: 'Since:',
      sovereign_load: 'Sovereign Load',
      manage_structures: 'Manage Structures',
      rate_label: 'Rate',
      link_copied: 'Link Copied',
      complete_partner_data: 'Please complete partner data',
      partner_enrolled_successfully: 'Partner enrolled successfully',
      authorize_sovereign_payout: 'Authorize Sovereign Payout',
      commission_architecture: 'Commission Architecture',
      tabs: {
        partners: 'Partners',
        payouts: 'Payouts',
        links: 'Sovereign Links',
        settings: 'Settings'
      },
      table: {
        identity: 'Partner Identity',
        status: 'Status',
        conversions: 'Conversions',
        commission: 'Commission',
        total_payout: 'Total Payout',
        node: 'Node'
      },
      status: {
        active: 'Active',
        pending: 'Pending',
        inactive: 'Inactive'
      },
      types: {
        individual: 'Individual',
        agency: 'Agency',
        corporate: 'Corporate'
      },
      link_gen: {
        title: 'Sovereign Link Generator',
        destination: 'Destination',
        partner: 'Partner',
        generate: 'Generate Link',
        copy: 'Copy',
        label_destination: 'Destination URL',
        label_select: 'Select Partner'
      },
      payouts: {
        pending_title: 'Pending Payouts',
        due_date: 'Due Date',
        authorize: 'Authorize',
        ref: 'Ref',
        partner: 'Partner',
        amount: 'Amount',
        status: 'Status'
      },
      add_modal: {
        title: 'Enroll Sovereign Partner',
        name: 'Partner Name',
        email: 'Email Address',
        type: 'Partner Type',
        commission: 'Commission Rate'
      },
      cancel: 'Cancel',
      activate_partner_btn: 'Activate Partner'
    }
  }[lang as 'ar' | 'en'];

  const fetchData = useCallback(() => {
    const p = localDB.getAll('affiliate_partners') as AffiliatePartner[];
    const pay = localDB.getAll('affiliate_payouts') as AffiliatePayout[];
    setPartners(p || []);
    setPayouts(pay || []);
    
    // Stats calculation with proper types
    setStats({
      activePartners: (p || []).filter(x => x.status === 'active').length,
      totalSales: (p || []).reduce((acc: number, curr: AffiliatePartner) => acc + (curr.total_sales || 0), 0),
      pendingPayouts: (pay || []).filter(x => x.status === 'pending').reduce((acc: number, curr: AffiliatePayout) => acc + curr.amount, 0),
      avgMultiplier: 1.25
    });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddPartner = () => {
    if (!newPartner.name || !newPartner.email) {
      showToast(t.complete_partner_data, 'error');
      return;
    }
    
    localDB.insert('affiliate_partners', {
      ...newPartner,
      status: 'active',
      conversions: 0,
      total_sales: 0,
      total_payout: 0,
      created_at: new Date().toISOString()
    });
    
    showToast(t.partner_enrolled_successfully, 'success');
    setShowAddModal(false);
    setNewPartner({ name: '', email: '', type: 'individual', commission: 10 });
    fetchData();
  };

  const handleGenerateLink = () => {
    if (!linkGen.destination || !linkGen.partnerId) {
      showToast(lang === 'ar' ? 'يرجى إدخال الوجهة واختيار الشريك' : 'Please enter destination and select partner', 'error');
      return;
    }
    
    const partner = partners.find(p => p.id === linkGen.partnerId);
    const link = `${linkGen.destination}?ref=${partner?.id || 'sovereign'}`;
    setLinkGen(prev => ({ ...prev, generatedLink: link }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(t.link_copied, 'success');
  };

  return (
    <div className="view-container slide-in">
      <header className="view-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="view-title">{t.title}</h1>
          <p className="view-subtitle">{t.subtitle}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-executive">
          <span className="material-symbols-outlined">person_add</span>
          {t.enroll_partner}
        </button>
      </header>

      {/* Stats Ribbon */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="card stats-card">
          <span className="stats-label">{t.active_partners}</span>
          <div className="stats-value">{stats.activePartners}</div>
          <div className="stats-indicator positive">
            <span className="material-symbols-outlined">trending_up</span>
            {t.sovereign_load} 94%
          </div>
        </div>
        <div className="card stats-card">
          <span className="stats-label">{t.total_sales}</span>
          <div className="stats-value">{stats.totalSales.toLocaleString()} <small style={{ fontSize: '0.5em' }}>SAR</small></div>
          <div className="stats-indicator positive">
            <span className="material-symbols-outlined">verified</span>
            {t.efficiency_multiplier} {stats.avgMultiplier}x
          </div>
        </div>
        <div className="card stats-card">
          <span className="stats-label">{t.pending_payouts}</span>
          <div className="stats-value" style={{ color: 'var(--secondary)' }}>{stats.pendingPayouts.toLocaleString()} <small style={{ fontSize: '0.5em' }}>SAR</small></div>
          <div className="stats-indicator">
            <span className="material-symbols-outlined">schedule</span>
            {t.since_label} Today
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container" style={{ marginBottom: '2rem' }}>
        {Object.entries(t.tabs).map(([key, label]) => (
          <button 
            key={key}
            className={`tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key as any)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="content-area">
        {activeTab === 'partners' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="executive-table">
              <thead>
                <tr>
                  <th>{t.table.identity}</th>
                  <th>{t.table.status}</th>
                  <th>{t.table.conversions}</th>
                  <th>{t.table.commission}</th>
                  <th>{t.table.total_payout}</th>
                  <th>{t.table.node}</th>
                </tr>
              </thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>group_off</span>
                      {lang === 'ar' ? 'لا يوجد شركاء مسجلون حالياً' : 'No partners registered currently'}
                    </td>
                  </tr>
                ) : (
                  partners.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                          <div className="avatar-mini" style={{ background: 'var(--primary)', color: 'var(--secondary)' }}>
                            {p.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800 }}>{p.name}</div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${p.status}`}>
                          {t.status[p.status as keyof typeof t.status]}
                        </span>
                      </td>
                      <td><span style={{ fontWeight: 800 }}>{p.conversions}</span></td>
                      <td>{p.commission}%</td>
                      <td>{p.total_payout.toLocaleString()} SAR</td>
                      <td>
                        <code style={{ fontSize: '0.7rem', background: 'var(--surface-container-high)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                          AFF-{p.id.slice(0, 8)}
                        </code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'payouts' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
            <div className="card" style={{ padding: 0 }}>
               <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-container-high)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>{t.payouts.pending_title}</h3>
               </div>
               <table className="executive-table">
                  <thead>
                    <tr>
                      <th>{t.payouts.ref}</th>
                      <th>{t.payouts.partner}</th>
                      <th>{t.payouts.amount}</th>
                      <th>{t.payouts.due_date}</th>
                      <th>{t.payouts.authorize}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.filter(p => p.status === 'pending').length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>
                          {lang === 'ar' ? 'لا توجد مدفوعات معلقة' : 'No pending payouts'}
                        </td>
                      </tr>
                    ) : (
                      payouts.filter(p => p.status === 'pending').map(pay => (
                        <tr key={pay.id}>
                          <td>#{pay.id.slice(0, 6)}</td>
                          <td>{partners.find(p => p.id === pay.partner_id)?.name || 'N/A'}</td>
                          <td style={{ fontWeight: 900, color: 'var(--secondary)' }}>{pay.amount.toLocaleString()} SAR</td>
                          <td>{pay.date ? new Date(pay.date).toLocaleDateString() : 'N/A'}</td>
                          <td>
                            <button className="btn-compact" onClick={() => showToast('Payout Authorized', 'success')}>
                              {t.payouts.authorize}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
               </table>
            </div>
            
            <div className="card" style={{ padding: '1.5rem', background: 'var(--primary)', color: 'white' }}>
               <h4 style={{ color: 'var(--secondary)', margin: '0 0 1rem', fontSize: '1.2rem', fontWeight: 950 }}>{t.commission_architecture}</h4>
               <p style={{ fontSize: '0.85rem', opacity: 0.8, lineHeight: 1.6 }}>
                  {lang === 'ar' 
                    ? 'يتم احتساب العمولات بناءً على صافي الربح من عمليات التخليص الجمركي المحولة عبر الروابط السيادية.' 
                    : 'Commissions are calculated based on net profit from customs clearance operations referred via sovereign links.'}
               </p>
               <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    <span style={{ opacity: 0.7 }}>{t.types.individual}</span>
                    <span style={{ fontWeight: 800 }}>10%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    <span style={{ opacity: 0.7 }}>{t.types.agency}</span>
                    <span style={{ fontWeight: 800 }}>15%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    <span style={{ opacity: 0.7 }}>{t.types.corporate}</span>
                    <span style={{ fontWeight: 800 }}>20%</span>
                  </div>
               </div>
               <button className="btn-executive" style={{ marginTop: '2rem', width: '100%', background: 'var(--secondary)', color: 'var(--primary)', border: 'none' }}>
                  {t.manage_structures}
               </button>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="card" style={{ maxWidth: '800px', margin: '0 auto', padding: '2.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <div style={{ width: 80, height: 80, borderRadius: '24px', background: 'rgba(212, 167, 106, 0.1)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>link</span>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.5rem' }}>{t.link_gen.title}</h2>
              <p style={{ color: 'var(--on-surface-variant)', fontWeight: 700 }}>{lang === 'ar' ? 'قم بتوليد روابط تتبع ذكية لشركاء التسويق السيادي.' : 'Generate intelligent tracking links for sovereign marketing partners.'}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="label-executive">{t.link_gen.label_destination}</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}>public</span>
                  <input 
                    type="text" 
                    className="input-executive" 
                    placeholder="https://alghwairy.com/quote" 
                    style={{ paddingLeft: '3rem' }}
                    value={linkGen.destination}
                    onChange={e => setLinkGen(prev => ({ ...prev, destination: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label-executive">{t.link_gen.label_select}</label>
                <select 
                  className="input-executive"
                  value={linkGen.partnerId}
                  onChange={e => setLinkGen(prev => ({ ...prev, partnerId: e.target.value }))}
                >
                  <option value="">{t.link_gen.label_select}</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.commission}%)</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleGenerateLink}
                className="btn-executive" 
                style={{ height: '3.5rem', marginTop: '1rem' }}
              >
                {t.link_gen.generate}
              </button>

              {linkGen.generatedLink && (
                <div className="card" style={{ background: 'var(--surface-container-high)', border: '1px dashed var(--secondary)', marginTop: '2rem', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <code style={{ fontSize: '1rem', color: 'var(--primary)', fontWeight: 800, wordBreak: 'break-all' }}>
                      {linkGen.generatedLink}
                    </code>
                    <button 
                      onClick={() => copyToClipboard(linkGen.generatedLink)}
                      className="btn-compact" 
                      style={{ background: 'var(--primary)', color: 'var(--secondary)', border: 'none', marginLeft: '1rem' }}
                    >
                      {t.link_gen.copy}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card" style={{ padding: '2rem' }}>
             <h3 style={{ margin: '0 0 1.5rem', fontWeight: 950 }}>{t.commission_architecture}</h3>
             <div style={{ opacity: 0.5, textAlign: 'center', padding: '4rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>settings_suggest</span>
                <p>{lang === 'ar' ? 'إعدادات العمولة المتقدمة قيد التطوير' : 'Advanced commission settings under development'}</p>
             </div>
          </div>
        )}
      </div>

      {/* Add Partner Modal */}
      {showAddModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div className="card slide-up" style={{ width: '500px', padding: '2.5rem' }}>
            <h2 style={{ margin: '0 0 2rem', fontSize: '1.5rem', fontWeight: 950 }}>{t.add_modal.title}</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="label-executive">{t.add_modal.name}</label>
                <input 
                  type="text" 
                  className="input-executive" 
                  value={newPartner.name}
                  onChange={e => setNewPartner(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="label-executive">{t.add_modal.email}</label>
                <input 
                  type="email" 
                  className="input-executive" 
                  value={newPartner.email}
                  onChange={e => setNewPartner(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label-executive">{t.add_modal.type}</label>
                  <select 
                    className="input-executive"
                    value={newPartner.type}
                    onChange={e => setNewPartner(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="individual">{t.types.individual}</option>
                    <option value="agency">{t.types.agency}</option>
                    <option value="corporate">{t.types.corporate}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="label-executive">{t.add_modal.commission} %</label>
                  <input 
                    type="number" 
                    className="input-executive" 
                    value={newPartner.commission}
                    onChange={e => setNewPartner(prev => ({ ...prev, commission: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
              <button onClick={() => setShowAddModal(false)} className="btn-executive btn-outline" style={{ flex: 1 }}>{t.cancel}</button>
              <button onClick={handleAddPartner} className="btn-executive" style={{ flex: 1 }}>{t.enroll_partner}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
