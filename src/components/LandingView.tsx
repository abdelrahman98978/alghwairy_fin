import { Shield, Globe, Box, BarChart3, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LandingViewProps {
  t: any;
  lang: 'ar' | 'en';
  onEnterPortal: () => void;
  isDark: boolean;
}

export default function LandingView({ t, lang, onEnterPortal, isDark }: LandingViewProps) {
  const isAr = lang === 'ar';

  return (
    <div className={`landing-wrapper ${isDark ? 'dark-theme' : ''}`} style={{ 
      minHeight: '100vh', 
      background: 'var(--background)',
      color: 'var(--on-surface)',
      fontFamily: "'Tajawal', sans-serif"
    }}>
      {/* Premium Glass Header */}
      <header style={{ 
        position: 'fixed', 
        top: 0, 
        width: '100%', 
        padding: '1.25rem 5%', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        zIndex: 1000,
        background: 'var(--header-bg)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--outline-variant)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', borderRadius: '12px', background: 'var(--primary)', color: 'var(--secondary)' }}>
            <Shield size={24} />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.5px' }}>
            {t.brand}
          </span>
        </div>

        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <button onClick={onEnterPortal} className="btn-executive" style={{ padding: '0.65rem 1.5rem', borderRadius: '100px', fontSize: '0.9rem' }}>
            {t.get_started} <ArrowRight size={16} style={{ transform: isAr ? 'rotate(180deg)' : 'none', marginInlineStart: '0.5rem' }} />
          </button>
        </nav>
      </header>

      {/* Hero Section - Sovereign Presence */}
      <section style={{ 
        padding: '10rem 5% 5rem', 
        textAlign: 'center', 
        maxWidth: '1200px', 
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }} className="animate-fade">
        <div className="badge-sovereign" style={{ marginBottom: '1.5rem', background: 'rgba(212, 167, 106, 0.1)', color: 'var(--secondary)' }}>
          {isAr ? 'التميز الجمركي الرقمي' : 'Digital Customs Excellence'}
        </div>
        <h1 style={{ 
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', 
          fontWeight: 950, 
          lineHeight: 1.1, 
          color: 'var(--primary)', 
          marginBottom: '1.5rem',
          maxWidth: '900px'
        }}>
          {t.hero_title}
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: 'var(--on-surface-variant)', 
          maxWidth: '700px', 
          marginBottom: '3rem',
          fontWeight: 500,
          opacity: 0.8
        }}>
          {t.hero_subtitle}
        </p>
        
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={onEnterPortal} className="btn-executive" style={{ padding: '1.2rem 2.5rem', fontSize: '1.1rem', borderRadius: '100px', boxShadow: 'var(--shadow-gold)' }}>
             {t.get_started}
          </button>
          <button className="btn-executive" style={{ background: 'var(--surface-container-high)', color: 'var(--primary)', padding: '1.2rem 2.5rem', fontSize: '1.1rem', borderRadius: '100px', boxShadow: 'none' }}>
             {t.explore_services}
          </button>
        </div>

        {/* Dashboard Preview - Miniaturized */}
        <div className="card-layer-1 hover-lift" style={{ 
          marginTop: '6rem', 
          width: '100%', 
          maxWidth: '1000px', 
          aspectRatio: '16/9', 
          borderRadius: '24px', 
          padding: '2rem', 
          background: 'var(--surface)',
          border: '1px solid var(--outline)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
             <div style={{ width: '240px', background: 'var(--primary-container)', borderRadius: '16px' }}></div>
             <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ height: '60px', background: 'var(--surface-container)', borderRadius: '12px' }}></div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                   <div style={{ flex: 1, height: '120px', background: 'rgba(212, 167, 106, 0.05)', borderRadius: '16px', border: '1px solid rgba(212, 167, 106, 0.1)' }}></div>
                   <div style={{ flex: 1, height: '120px', background: 'rgba(21.2, 167, 106, 0.05)', borderRadius: '16px', border: '1px solid rgba(212, 167, 106, 0.1)' }}></div>
                </div>
                <div style={{ flex: 1, background: 'var(--surface-container-low)', borderRadius: '16px' }}></div>
             </div>
          </div>
          {/* Sovereign Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(rgba(255,255,255,0), var(--surface))', pointerEvents: 'none' }}></div>
        </div>
      </section>

      {/* Strategic Services Section */}
      <section style={{ padding: '8rem 5%', background: 'var(--surface-container-low)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '4rem', textAlign: 'center' }}>
            {t.services.title}
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
             {[
               { icon: <Shield size={32} />, title: t.services.clearance, desc: t.services.clearance_desc },
               { icon: <Box size={32} />, title: t.services.logistics, desc: t.services.logistics_desc },
               { icon: <BarChart3 size={32} />, title: t.services.tracking, desc: t.services.tracking_desc }
             ].map((s, i) => (
               <div key={i} className="card-layer-2 hover-lift" style={{ padding: '3rem', borderRadius: '24px', background: 'var(--surface)', border: '1px solid var(--outline-variant)' }}>
                  <div style={{ color: 'var(--secondary)', marginBottom: '1.5rem' }}>{s.icon}</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>{s.title}</h3>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.95rem' }}>{s.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </section>

      {/* About Section - Heritage & Future */}
      <section style={{ padding: '8rem 5%', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '5rem', alignItems: 'center', flexWrap: 'wrap' }}>
           <div style={{ flex: 1, minWidth: '400px' }}>
              <div className="badge-sovereign" style={{ marginBottom: '1.25rem', background: 'var(--primary-container)', color: 'var(--primary)' }}>
                 {isAr ? 'من نحن' : 'Who We Are'}
              </div>
              <h2 style={{ fontSize: '3rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '2rem', lineHeight: 1.1 }}>
                 {t.about.title}
              </h2>
              <p style={{ fontSize: '1.15rem', color: 'var(--on-surface-variant)', marginBottom: '2rem', fontWeight: 500 }}>
                 {t.about.desc}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                 {[
                   { label: isAr ? 'خبرة معتمدة' : 'Certified Expertise', icon: <CheckCircle2 size={18} /> },
                   { label: isAr ? 'أمان سيادي' : 'Sovereign Security', icon: <CheckCircle2 size={18} /> },
                   { label: isAr ? 'دعم تقني 24/7' : '24/7 Tech Support', icon: <CheckCircle2 size={18} /> },
                   { label: isAr ? 'تغطية عالمية' : 'Global Coverage', icon: <CheckCircle2 size={18} /> }
                 ].map((item, idx) => (
                   <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
                      <span style={{ color: 'var(--success)' }}>{item.icon}</span>
                      {item.label}
                   </div>
                 ))}
              </div>
           </div>
           <div style={{ flex: 1, minWidth: '400px', height: '500px', background: 'var(--surface-container-high)', borderRadius: '32px', position: 'relative', overflow: 'hidden' }}>
              {/* Institutional Visual */}
              <div style={{ position: 'absolute', inset: '2rem', border: '2px solid var(--secondary)', borderRadius: '24px', opacity: 0.3 }}></div>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                 <Globe size={120} color="var(--primary)" style={{ opacity: 0.1 }} />
              </div>
           </div>
        </div>
      </section>

      {/* Premium Footer */}
      <footer style={{ padding: '4rem 5%', borderTop: '1px solid var(--outline-variant)', textAlign: 'center' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
             <Shield size={32} color="var(--primary)" />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', opacity: 0.6, letterSpacing: '1px', fontWeight: 800 }}>
            © 2026 ALGHWAIRY SOVEREIGN INSTITUTION. ALL RIGHTS SECURED.
          </p>
        </div>
      </footer>

      {/* Global CSS for Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade {
          animation: fade-in 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .landing-wrapper {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
