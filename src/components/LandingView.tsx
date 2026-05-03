import React, { useState, useEffect } from 'react';

interface LandingViewProps {
  t: any;
  lang: 'ar' | 'en';
  onEnterPortal: () => void;
  isDark: boolean;
}

const LandingView: React.FC<LandingViewProps> = ({ t, lang, onEnterPortal, isDark }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isRtl = lang === 'ar';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const screenshots = [
    { src: '/img1.png', title: 'لوحة التحكم الرئيسية', description: 'نظرة شاملة على العمليات المالية والجمركية' },
    { src: '/img2.png', title: 'الميزان السيادي', description: 'دقة متناهية في تتبع الأرصدة والقيود' },
    { src: '/img3.png', title: 'إدارة الفواتير', description: 'نظام أتمتة متطور لإصدار وتدقيق الفواتير' },
    { src: '/img4.png', title: 'التقارير التحليلية', description: 'بيانات فورية لدعم اتخاذ القرار السيادي' },
    { src: '/img5.png', title: 'الأمن والخصوصية', description: 'تشفير متطور لحماية البيانات الحساسة' },
    { src: '/img6.jpg', title: 'واجهة المستخدم', description: 'تجربة مستخدم فاخرة وسهلة الاستخدام' },
  ];

  const features = [
    { icon: <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>lock</span>, title: 'أمن سيادي', desc: 'تشفير AES-256 لحماية كافة المعاملات والبيانات الحساسة.' },
    { icon: <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>bolt</span>, title: 'سرعة التنفيذ', desc: 'أتمتة كاملة للدورة المستندية لضمان أسرع تخليص جمركي.' },
    { icon: <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>bar_chart</span>, title: 'ذكاء مالي', desc: 'تقارير تحليلية وميزانيات عمومية فورية بدقة متناهية.' },
    { icon: <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>public</span>, title: 'تغطية شاملة', desc: 'دعم كافة المنافذ الحدودية والأنظمة الجمركية العالمية.' },
  ];

  const stats = [
    { label: 'عملية يومية', value: '500+', desc: 'بأعلى معايير الدقة الجمركية' },
    { label: 'بيانات مؤمنة', value: '100%', desc: 'تشفير سيادي محلي وسحابي' },
    { label: 'وفر مالي', value: '30%', desc: 'من خلال أتمتة الإجراءات الضريبية' },
    { label: 'دعم فني', value: '24/7', desc: 'نخبة من خبراء المحاسبة السيادية' },
  ];

  const partners = [
    { name: 'ZATCA', logo: 'هيئة الزكاة والضريبة والجمارك' },
    { name: 'SAMA', logo: 'البنك المركزي السعودي' },
    { name: 'CUSTOMS', logo: 'الجمارك السعودية' },
  ];

  return (
    <div className={`landing-root ${isRtl ? 'rtl' : 'ltr'}`} style={{ 
      backgroundColor: '#000D1A', 
      color: '#fff',
      minHeight: '100vh',
      fontFamily: 'Tajawal, sans-serif',
      direction: isRtl ? 'rtl' : 'ltr'
    }}>
      <style>{`
        .landing-root {
          --gold: #d4af37;
          --gold-muted: rgba(212, 175, 55, 0.15);
          --navy-dark: #000D1A;
          --navy-light: #001C39;
          scroll-behavior: smooth;
        }

        .glass-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 1.25rem 2rem;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .glass-nav.scrolled {
          background: rgba(0, 13, 26, 0.85);
          backdrop-filter: blur(20px);
          padding: 0.85rem 2rem;
          border-bottom: 1px solid rgba(212, 175, 55, 0.2);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .hero-section {
          position: relative;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 1.5rem;
          overflow: hidden;
          background: radial-gradient(circle at center, var(--navy-light) 0%, var(--navy-dark) 100%);
        }

        .hero-bg-overlay {
          position: absolute;
          inset: 0;
          background: url('https://www.transparenttextures.com/patterns/cubes.png');
          opacity: 0.05;
          pointer-events: none;
        }

        .hero-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero-content {
          position: relative;
          z-index: 10;
          max-width: 900px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.25rem;
          background: var(--gold-muted);
          border: 1px solid var(--gold);
          border-radius: 100px;
          color: var(--gold);
          font-size: 0.85rem;
          font-weight: 700;
          margin-bottom: 2rem;
          animation: fadeInDown 0.8s ease-out;
        }

        .hero-title {
          font-size: clamp(2.5rem, 8vw, 4.5rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          background: linear-gradient(135deg, #fff 30%, var(--gold) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: fadeInUp 1s ease-out;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 3rem;
          max-width: 700px;
          margin-inline: auto;
          animation: fadeInUp 1.2s ease-out;
        }

        .cta-group {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          animation: fadeInUp 1.4s ease-out;
        }

        .btn-gold {
          background: var(--gold);
          color: var(--navy-dark);
          padding: 1rem 2.5rem;
          border-radius: 12px;
          font-weight: 800;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.3s;
          border: none;
          cursor: pointer;
        }

        .btn-gold:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(212, 175, 55, 0.4);
          filter: brightness(1.1);
        }

        .btn-outline {
          background: transparent;
          color: #fff;
          padding: 1rem 2.5rem;
          border-radius: 12px;
          font-weight: 800;
          font-size: 1.1rem;
          border: 2px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.3s;
        }

        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: #fff;
          transform: translateY(-5px);
        }

        .showcase-section {
          padding: 8rem 2rem;
          background: #000D1A;
        }

        .section-header {
          text-align: center;
          margin-bottom: 5rem;
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 900;
          color: var(--gold);
          margin-bottom: 1rem;
        }

        .section-desc {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.6);
          max-width: 600px;
          margin: 0 auto;
        }

        .bento-grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          grid-auto-rows: minmax(200px, auto);
          gap: 1.5rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        .bento-item {
          background: var(--navy-light);
          border-radius: 32px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .bento-item:nth-child(1) { grid-column: span 8; grid-row: span 2; }
        .bento-item:nth-child(2) { grid-column: span 4; grid-row: span 1; }
        .bento-item:nth-child(3) { grid-column: span 4; grid-row: span 2; }
        .bento-item:nth-child(4) { grid-column: span 4; grid-row: span 1; }
        .bento-item:nth-child(5) { grid-column: span 4; grid-row: span 1; }
        .bento-item:nth-child(6) { grid-column: span 12; grid-row: span 2; }
          position: relative;
          overflow: hidden;
          cursor: pointer;
        }

        .bento-item:hover {
          transform: translateY(-10px) scale(1.02);
          border-color: var(--gold);
          box-shadow: 0 20px 40px rgba(0,0,0,0.6), 0 0 20px rgba(212, 175, 55, 0.2);
          z-index: 10;
        }

        .bento-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: all 0.8s ease;
          opacity: 0.85;
        }

        .bento-item:hover .bento-img {
          transform: scale(1.1);
          opacity: 1;
        }

        .bento-content {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 2.5rem;
          background: linear-gradient(to top, rgba(0,13,26,0.95) 0%, transparent 100%);
          transform: translateY(20px);
          opacity: 0;
          transition: all 0.5s;
        }

        .bento-item:hover .bento-content {
          transform: translateY(0);
          opacity: 1;
        }

        .bento-title {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--gold);
          margin-bottom: 0.5rem;
        }

        .bento-desc {
          font-size: 1rem;
          color: rgba(255,255,255,0.8);
        }

        .stats-section {
          padding: 6rem 2rem;
          background: var(--navy-light);
          border-top: 1px solid rgba(212, 175, 55, 0.1);
          border-bottom: 1px solid rgba(212, 175, 55, 0.1);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 3rem;
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }

        .stat-value {
          font-size: 3rem;
          font-weight: 950;
          color: var(--gold);
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 1.25rem;
          font-weight: 800;
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .stat-desc {
          font-size: 0.9rem;
          color: rgba(255,255,255,0.5);
        }

        .trust-section {
          padding: 8rem 2rem;
          background: #000D1A;
        }

        .partners-flex {
          display: flex;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
          margin-top: 2rem;
        }

        .partner-badge {
          background: rgba(255,255,255,0.03);
          padding: 1rem 2rem;
          border-radius: 100px;
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: rgba(255,255,255,0.6);
          font-weight: 700;
          transition: all 0.3s;
        }

        .partner-badge:hover {
          background: var(--gold-muted);
          color: var(--gold);
          border-color: var(--gold);
        }

        .features-section {
          padding: 8rem 2rem;
          background: linear-gradient(to bottom, #000D1A, #001C39);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .feature-card {
          text-align: center;
          padding: 3rem 2rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s;
        }

        .feature-card:hover {
          background: rgba(212, 175, 55, 0.05);
          border-color: var(--gold);
          transform: translateY(-5px);
        }

        .feature-icon {
          width: 60px;
          height: 60px;
          background: var(--gold-muted);
          color: var(--gold);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          margin: 0 auto 2rem;
          font-size: 1.5rem;
        }

        .footer {
          padding: 4rem 2rem 2rem;
          background: #00050A;
          border-top: 1px solid rgba(212, 175, 55, 0.1);
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4rem;
          margin-bottom: 4rem;
        }

        .footer-logo {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--gold);
          margin-bottom: 1.5rem;
        }

        .footer-links h4 {
          margin-bottom: 1.5rem;
          font-weight: 800;
          color: #fff;
        }

        .footer-links ul {
          list-style: none;
        }

        .footer-links li {
          margin-bottom: 0.75rem;
        }

        .footer-links a {
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          transition: color 0.3s;
        }

        .footer-links a:hover {
          color: var(--gold);
        }

        .footer-bottom {
          text-align: center;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.85rem;
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 1024px) {
          .features-grid, .bento-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .footer-content {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .features-grid, .bento-grid, .footer-content {
            grid-template-columns: 1fr;
          }
          .hero-title { font-size: 3rem; }
          .cta-group { flex-direction: column; }
        }
      `}</style>

      {/* Navigation */}
      <nav className={`glass-nav ${isScrolled ? 'scrolled' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '45px', 
            height: '45px', 
            background: 'var(--gold)', 
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
          }}>
            <span className="material-symbols-outlined" style={{ color: '#000D1A', fontSize: '24px' }}>shield</span>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>
            الغويري <span style={{ color: 'var(--gold)' }}>السيادية</span>
          </span>
        </div>

        <div className="hide-on-mobile" style={{ display: 'flex', gap: '2.5rem' }}>
          <a href="#hero" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700 }}>الرئيسية</a>
          <a href="#showcase" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 700 }}>النظام</a>
          <a href="#features" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 700 }}>المميزات</a>
          <a href="#contact" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 700 }}>اتصل بنا</a>
        </div>

        <button onClick={onEnterPortal} className="btn-gold" style={{ padding: '0.6rem 1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          دخول المنظومة
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{isRtl ? 'chevron_right' : 'arrow_forward'}</span>
        </button>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="hero-section">
        <div className="hero-bg-overlay" />
        <div className="hero-glow" />
        <div className="hero-content">
          <div className="hero-badge">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>shield</span>
            التميز الجمركي الرقمي - إصدار 2026
          </div>
          <h1 className="hero-title">
            الريادة السيادية في <br />
            التخليص الجمركي
          </h1>
          <p className="hero-subtitle">
            الميزان السيادي هو الحل المالي والقانوني المتكامل لإدارة المؤسسات الجمركية الكبرى، يجمع بين دقة المحاسبة وقوة التكنولوجيا لضمان سلاسة سلاسل التوريد الخاصة بك.
          </p>
          <div className="cta-group">
            <button onClick={onEnterPortal} className="btn-gold">
              الدخول للمنصة السيادية
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button className="btn-outline" onClick={() => document.getElementById('showcase')?.scrollIntoView()}>
              استكشاف المنظومة
            </button>
          </div>
        </div>
      </section>

      {/* Product Showcase */}
      <section id="showcase" className="showcase-section">
        <div className="section-header">
          <h2 className="section-title">واجهة متميزة للأعمال الكبرى</h2>
          <p className="section-desc">صممنا الميزان السيادي ليكون انعكاساً لهيبة أعمالكم، مع واجهات تجمع بين الجمال والوظيفة.</p>
        </div>

        <div className="bento-grid">
            {screenshots.map((s, idx) => (
              <div key={idx} className="bento-item">
                <img src={s.src} alt={s.title} className="bento-img" />
                <div className="bento-content">
                  <h3 className="bento-title">{s.title}</h3>
                  <p className="bento-desc">{s.description}</p>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* Institutional Stats */}
      <section className="stats-section">
        <div className="stats-grid">
          {stats.map((s, idx) => (
            <div key={idx} className="stat-card">
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Compliance */}
      <section className="trust-section">
         <div className="section-header">
            <h2 className="section-title">شراكة وامتثال</h2>
            <p className="section-desc">نعمل وفق أعلى المعايير التنظيمية والمهنية في المملكة</p>
         </div>
         <div className="partners-flex">
             {partners.map((p, idx) => (
              <div key={idx} className="partner-badge">
                 <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified_user</span>
                 <span>{p.logo}</span>
              </div>
            ))}
         </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-title">لماذا تختار المنظومة السيادية؟</h2>
          <p className="section-desc">نحن لا نقدم مجرد برنامج، بل نقدم شريكاً تقنياً يفهم تحديات السوق الجمركي.</p>
        </div>

        <div className="features-grid">
          {features.map((f, idx) => (
            <div key={idx} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 style={{ marginBottom: '1rem', fontWeight: 800 }}>{f.title}</h3>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.6)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats / Proof Section */}
      <section style={{ padding: '6rem 2rem', background: 'var(--navy-dark)', textAlign: 'center' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3rem' }}>
          <div>
            <h2 style={{ fontSize: '3.5rem', color: 'var(--gold)', fontWeight: 900 }}>+5000</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>فاتورة مدققة شهرياً</p>
          </div>
          <div>
            <h2 style={{ fontSize: '3.5rem', color: 'var(--gold)', fontWeight: 900 }}>99.9%</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>دقة في المطابقة المالية</p>
          </div>
          <div>
            <h2 style={{ fontSize: '3.5rem', color: 'var(--gold)', fontWeight: 900 }}>+12</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>منفذ جمركي مدعوم</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <div className="footer-logo">الغويري <span style={{ color: '#fff' }}>السيادية</span></div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              المؤسسة الرائدة في خدمات التخليص الجمركي والاستشارات اللوجستية في المنطقة.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {/* Social icons could go here */}
            </div>
          </div>

          <div className="footer-links">
            <h4>روابط سريعة</h4>
            <ul>
              <li><a href="#">من نحن</a></li>
              <li><a href="#">خدماتنا</a></li>
              <li><a href="#">المنافذ الجمركية</a></li>
              <li><a href="#">الأسئلة الشائعة</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>الخدمات السيادية</h4>
            <ul>
              <li><a href="#">التخليص الجمركي</a></li>
              <li><a href="#">الاستشارات الضريبية</a></li>
              <li><a href="#">إدارة العقود</a></li>
              <li><a href="#">التدقيق المالي</a></li>
            </ul>
          </div>

          <div className="footer-links">
            <h4>تواصل معنا</h4>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--gold)', fontSize: '18px' }}>call</span>
                +962 7XXXXXXXX
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--gold)', fontSize: '18px' }}>mail</span>
                info@alghwairy.jo
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--gold)', fontSize: '18px' }}>location_on</span>
                عمان، الأردن - المنطقة الحرة
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} مؤسسة الغويري للتخليص الجمركي. جميع الحقوق محفوظة لـ "الميزان السيادي".</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingView;
