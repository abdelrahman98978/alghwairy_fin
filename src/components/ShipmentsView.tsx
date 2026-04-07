import { useState } from 'react';
import { 
  Package, 
  Truck, 
  Plus, 
  Search, 
  Download,
  Filter,
  ArrowRightLeft,
  FileSearch,
  ShieldCheck
} from 'lucide-react';
import type { Translations } from '../types/translations';

interface Props {
  showToast: (msg: string, type?: string) => void;
  t: Translations['shipments'];
  lang: string;
}

export default function ShipmentsView({ showToast, t, lang }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const mockShipments = [
    { id: 'TRK-9834', client: lang === 'ar' ? 'شركة سابك' : 'SABIC Inc.', type: t.type_import, status: t.status.completed, fees: 12450, date: '2026-03-25' },
    { id: 'TRK-9835', client: lang === 'ar' ? 'أرامكو السعودية' : 'Saudi Aramco', type: t.type_export, status: t.status.review, fees: 8900, date: '2026-03-26' },
    { id: 'TRK-9836', client: lang === 'ar' ? 'مجموعة بن لادن' : 'Bin Laden Group', type: t.type_import, status: t.status.clearance, fees: 15200, date: '2026-03-27' },
    { id: 'TRK-9837', client: lang === 'ar' ? 'شركة المراعي' : 'Almarai Co.', type: t.type_export, status: t.status.completed, fees: 6700, date: '2026-03-28' },
    { id: 'TRK-9838', client: lang === 'ar' ? 'بنده للتجزئة' : 'Panda Retail', type: t.type_import, status: t.status.alert, fees: 21000, date: '2026-03-29' },
  ];

  const statusColors: Record<string, string> = {
    [t.status.completed]: 'var(--success)',
    [t.status.review]: 'var(--secondary)',
    [t.status.clearance]: '#3182ce',
    [t.status.alert]: 'var(--error)'
  };

  return (
    <div className="view-content slide-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'Tajawal', color: 'var(--primary)' }}>
            {t.title}
          </h2>
          <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', fontWeight: 600 }}>
            {t.subtitle}
          </p>
        </div>
        <button 
          onClick={() => showToast(lang === 'ar' ? 'جاري فتح محرر الشحنات السيادي...' : 'Opening Sovereign shipment editor...', 'success')}
          className="btn-executive"
        >
          <Plus size={18} /> {t.add_title}
        </button>
      </header>

      {/* Metric Cards - Compact High Density */}
      <div className="metric-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '3px solid var(--secondary)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(212, 167, 106, 0.1)', color: 'var(--secondary)' }}>
            <Package size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', opacity: 0.8 }}>{t.active_shipments}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'Tajawal' }}>128</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '3px solid #3182ce' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(49, 130, 206, 0.1)', color: '#3182ce' }}>
            <Truck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', opacity: 0.8 }}>{t.under_clearance}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'Tajawal' }}>14</div>
          </div>
        </div>
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '3px solid var(--success)' }}>
          <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(39, 103, 73, 0.1)', color: 'var(--success)' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', opacity: 0.8 }}>{t.total_fees_sar}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'Tajawal' }}>4.8M</div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <Search size={16} style={{ position: 'absolute', [lang === 'ar' ? 'right' : 'left']: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} />
              <input 
                type="text" 
                placeholder={t.search_placeholder} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 2.5rem', borderRadius: '8px', border: '1px solid var(--outline-variant)', background: 'var(--surface-container-low)', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
              />
            </div>
            <button className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '0.6rem 1rem' }}>
              <Filter size={16} /> {t.filter}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
             <button className="btn-executive" style={{ background: 'var(--secondary)', color: 'var(--primary)', padding: '0.6rem 1rem' }}>
                <Download size={16} /> {t.export}
             </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="sovereign-table">
            <thead>
              <tr>
                <th>{t.table.id}</th>
                <th>{t.table.client}</th>
                <th style={{ textAlign: 'center' }}>{t.table.type}</th>
                <th style={{ textAlign: 'center' }}>{t.table.status}</th>
                <th style={{ textAlign: 'right' }}>{t.table.fees} (SAR)</th>
                <th style={{ textAlign: 'center' }}>{t.table.options}</th>
              </tr>
            </thead>
            <tbody>
              {mockShipments.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85rem' }}>#{item.id}</td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.client}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{lang === 'ar' ? 'بتاريخ:' : 'Date:'} {item.date}</div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', borderRadius: '6px', background: item.type === t.type_import ? 'rgba(0,43,85,0.05)' : 'rgba(212,167,106,0.05)', color: item.type === t.type_import ? 'var(--primary)' : 'var(--secondary)', fontSize: '0.75rem', fontWeight: 800 }}>
                      <ArrowRightLeft size={12} /> {item.type}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.3rem 0.7rem', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 800, 
                      background: `${statusColors[item.status]}15`, 
                      color: statusColors[item.status] 
                    }}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', direction: 'ltr', fontWeight: 900, color: 'var(--primary)' }}>
                    {item.fees.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => showToast(lang === 'ar' ? 'جاري استعراض ملف الشحنة...' : 'Opening shipment record...', 'success')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', opacity: 0.6 }}
                    >
                      <FileSearch size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
