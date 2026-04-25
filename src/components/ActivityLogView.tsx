import React from 'react';

const ActivityLogView: React.FC = () => {
  const logs = [
    { id: 1, user: 'عبدالله الغويري', action: 'إصدار فاتورة سيادية', details: 'INV-2026-001 - مبلغ 45,000 ريال', time: 'منذ 5 دقائق', type: 'financial', status: 'secure' },
    { id: 2, user: 'النظام الآلي', action: 'تحديث مؤشرات التبادل', details: 'تزامن مع أسعار الصرف العالمية', time: 'منذ 15 دقيقة', type: 'system', status: 'verified' },
    { id: 3, user: 'مدير المنظومة', action: 'تعديل صلاحيات الوصول', details: 'تحديث أدوار قسم المحاسبة', time: 'منذ ساعة', type: 'security', status: 'warning' },
    { id: 4, user: 'عبدالله الغويري', action: 'تصدير تقرير ضريبي', details: 'الإقرار الختامي للربع الأول', time: 'منذ ساعتين', type: 'financial', status: 'secure' },
    { id: 5, user: 'النظام الآلي', action: 'نسخ احتياطي مجدول', details: 'قاعدة البيانات السيادية - الإصدار 2.0.4', time: 'منذ 4 ساعات', type: 'system', status: 'verified' }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>payments</span>;
      case 'security': return <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>verified_user</span>;
      case 'system': return <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--on-surface-variant)' }}>settings</span>;
      default: return <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>;
    }
  };

  return (
    <div className="slide-in" style={{ padding: '2rem' }}>
      <div className="dash-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="sovereign-title-elite sharp-gold" style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>history</span>
            سجل النشاطات الموحد (Sovereign Audit)
          </h1>
          <p className="view-subtitle" style={{ marginTop: '0.5rem', fontWeight: 800 }}>المراقبة اللحظية والتدقيق الأمني لكافة العمليات داخل المنظومة.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-sovereign-outline">
            <span className="material-symbols-outlined">download</span> تصدير السجل
          </button>
          <button className="btn-sovereign-primary">
            <span className="material-symbols-outlined">filter_list</span> تصفية متقدمة
          </button>
        </div>
      </div>

      <div className="card shadow-elite" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', gap: '1.5rem', background: 'var(--surface-container-low)' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-muted)', fontSize: '20px' }}>search</span>
            <input 
              type="text" 
              placeholder="البحث في سجل العمليات..." 
              className="input-premium" 
              style={{ paddingRight: '3rem' }}
            />
          </div>
          <select className="input-premium" style={{ width: '220px' }}>
            <option>كافة العمليات</option>
            <option>مالية</option>
            <option>أمنية</option>
            <option>تعديلات النظام</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table-premium" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ paddingInlineStart: '2rem' }}>المستخدم</th>
                <th>العملية</th>
                <th>التفاصيل السيادية</th>
                <th>التوقيت</th>
                <th style={{ paddingInlineEnd: '2rem' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ paddingInlineStart: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: 'var(--shadow-brand)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
                      </div>
                      <span style={{ fontWeight: 1000, fontSize: '0.95rem', color: 'var(--primary)' }}>{log.user}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)', fontWeight: 900, fontSize: '0.9rem' }}>
                      {getTypeIcon(log.type)}
                      {log.action}
                    </div>
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', fontWeight: 700 }}>
                    {log.details}
                  </td>
                  <td style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', fontWeight: 800 }}>
                    {log.time}
                  </td>
                  <td style={{ paddingInlineEnd: '2rem' }}>
                    <span className={`status-badge-premium ${log.status === 'warning' ? 'warning' : 'success'}`} style={{ fontWeight: 1000 }}>
                      {log.status === 'warning' ? 'تنبيه أمني' : 'آمن وموثق'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '1.2rem', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.85rem', color: 'var(--on-surface-variant)', borderTop: '1px solid var(--surface-container-high)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--secondary)' }}>verified</span>
          <span style={{ fontWeight: 800 }}>يتم الاحتفاظ بسجلات التدقيق لمدة 5 سنوات وفقاً لقواعد الامتثال المالي السيادية - مشفر ببروتوكول AES-256.</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogView;
