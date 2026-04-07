import React from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  User, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  CreditCard,
  Settings
} from 'lucide-react';

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
      case 'financial': return <CreditCard size={16} className="text-blue-500" />;
      case 'security': return <ShieldCheck size={16} className="text-yellow-600" />;
      case 'system': return <Settings size={16} className="text-purple-500" />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <div className="slide-in">
      <div className="dash-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <History size={32} color="var(--secondary)" />
            سجل النشاطات الموحد (Sovereign Audit)
          </h1>
          <p style={{ marginTop: '0.5rem' }}>المراقبة اللحظية والتدقيق الأمني لكافة العمليات داخل المنظومة.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn-executive" style={{ background: 'var(--surface)', border: '1px solid var(--surface-container-high)', color: 'var(--on-surface)' }}>
            <Download size={18} /> تصدير السجل
          </button>
          <button className="btn-executive">
            <Filter size={18} /> تصفية متقدمة
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-container)', display: 'flex', gap: '1.5rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--secondary-muted)' }} />
            <input 
              type="text" 
              placeholder="البحث في سجل العمليات..." 
              className="input-executive" 
              style={{ paddingRight: '2.8rem' }}
            />
          </div>
          <select className="input-executive" style={{ width: '180px' }}>
            <option>كافة العمليات</option>
            <option>مالية</option>
            <option>أمنية</option>
            <option>تعديلات النظام</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table" style={{ borderSpacing: '0' }}>
            <thead>
              <tr style={{ background: 'var(--surface-container-low)' }}>
                <th style={{ borderBottom: '1px solid var(--surface-container)' }}>المستخدم</th>
                <th style={{ borderBottom: '1px solid var(--surface-container)' }}>العملية</th>
                <th style={{ borderBottom: '1px solid var(--surface-container)' }}>التفاصيل السيادية</th>
                <th style={{ borderBottom: '1px solid var(--surface-container)' }}>التوقيت</th>
                <th style={{ borderBottom: '1px solid var(--surface-container)' }}>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td style={{ borderBottom: '1px solid var(--surface-container)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface-container-high)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={16} color="var(--primary)" />
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{log.user}</span>
                    </div>
                  </td>
                  <td style={{ borderBottom: '1px solid var(--surface-container)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                      {getTypeIcon(log.type)}
                      {log.action}
                    </div>
                  </td>
                  <td style={{ borderBottom: '1px solid var(--surface-container)', color: 'var(--secondary-muted)', fontSize: '0.8rem' }}>
                    {log.details}
                  </td>
                  <td style={{ borderBottom: '1px solid var(--surface-container)', color: 'var(--secondary-muted)', fontSize: '0.8rem' }}>
                    {log.time}
                  </td>
                  <td style={{ borderBottom: '1px solid var(--surface-container)' }}>
                    <span className={`badge ${log.status === 'warning' ? 'badge-warning' : 'badge-success'}`}>
                      {log.status === 'warning' ? 'تنبيه' : 'آمن وموثق'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '1.2rem', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', gap: '0.8rem', fontSize: '0.8rem', color: 'var(--secondary-muted)' }}>
          <AlertCircle size={16} />
          <span>يتم الاحتفاظ بسجلات التدقيق لمدة 5 سنوات وفقاً لقواعد الامتثال المالي السيادية.</span>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogView;
