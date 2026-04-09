import { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  ShieldCheck, 
  ArrowRight,
  Fingerprint,
  Loader2,
  AlertCircle,
  ShieldAlert,
  Key,
  Database
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import { biometricService } from '../lib/biometricService';

export default function LoginView({ onLogin }: { onLogin: (role: string, name: string) => void }) {
  const [username, setUsername] = useState('عبدالله الغويري');
  const [password, setPassword] = useState('');
  const selectedRole = 'admin';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBiometric, setShowBiometric] = useState(false);
  const [scanStatus, setScanStatus] = useState<'scanning' | 'success' | 'failed'>('scanning');
  
  // Security Features
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);

  // Recovery Key
  const MASTER_RECOVERY_KEY = 'ALGHWAIRY-RECOVERY-2026';

  useEffect(() => {
    if (failedAttempts >= 3) {
      setIsLocked(true);
      setError('تم قفل النظام مؤقتاً لدواعي أمنية بسبب 3 محاولات خاطئة. استخدم مفتاح الاستعادة.');
    }
  }, [failedAttempts]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isLocked) {
      setError('النظام مغلق. يرجى استخدام مفتاح الاستعادة المؤسسي.');
      return;
    }

    if (!username || !password) {
       setError('الرجاء إدخال بيانات الدخول المعتمدة');
       return;
    }

    setLoading(true);
    setTimeout(() => {
       try {
           const users = localDB.getActive('user_roles');
           const userRecord = users.find((u: any) => u.name === username);

           if (userRecord && userRecord.password === password) {
              setFailedAttempts(0);
              onLogin(userRecord.role || selectedRole, username);
           } else if ((username === 'عبدالله الغويري' || username === 'admin') && (password === 'admin' || password === '123456')) {
              setFailedAttempts(0);
              onLogin(selectedRole, username || 'عبدالله الغويري');
           } else {
              setFailedAttempts(prev => prev + 1);
              setError(`بيانات الدخول غير صحيحة. المحاولات المتبقية: ${3 - (failedAttempts + 1)}`);
              setLoading(false);
           }
       } catch (err) {
           setError('فشل في الوصول لقاعدة البيانات المحلية');
           setLoading(false);
       }
    }, 1200);
  };

  const handleRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    if (recoveryInput === MASTER_RECOVERY_KEY) {
      setRecoverySuccess(true);
      setTimeout(() => {
        setIsLocked(false);
        setFailedAttempts(0);
        setShowRecovery(false);
        setRecoverySuccess(false);
        setPassword('admin'); 
        setError('تم فك قفل النظام بنجاح. تم تعيين كلمة المرور الافتراضية.');
      }, 2000);
    } else {
      setError('مفتاح الاستعادة غير صحيح. يرجى مراجعة الإدارة الأمنية.');
    }
  };

  const handleBiometricLogin = async () => {
    setError('');
    try {
      const users = localDB.getActive('user_roles');
      const userRecord = users.find((u: any) => u.name === username);

      if (!userRecord || !userRecord.biometric_key) {
        setError('لم يتم تفعيل البصمة لهذا المستخدم بعد.');
        return;
      }

      const bioData = JSON.parse(userRecord.biometric_key);
      setShowBiometric(true);
      setScanStatus('scanning');
      
      // Use rawId for robust verification
      const isVerified = await biometricService.verify(bioData.rawId || bioData.id);
      
      if (isVerified) {
        setScanStatus('success');
        setTimeout(() => {
          onLogin(userRecord.role || 'admin', username);
          setShowBiometric(false);
        }, 800);
      } else {
        setScanStatus('failed');
        setError('فشل التحقق عبر البصمة.');
        setTimeout(() => setShowBiometric(false), 2000);
      }

    } catch (err: any) {
      setScanStatus('failed');
      setError('خطأ في التواصل مع حساس البصمة.');
      setTimeout(() => setShowBiometric(false), 2000);
    }
  };

  return (
    <div className="login-container slide-in">
      {/* Visual Identity Side - Institution Branding */}
      <div className="login-branding" style={{ 
        flex: 1.4, 
        background: 'linear-gradient(135deg, #001a33 0%, #003366 100%)', // Alghwairy Navy
        padding: '2rem 3.5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center',
        position: 'relative',
        color: 'white'
      }}>
         <div style={{ position: 'absolute', top: -140, right: -140, width: 400, height: 400, background: 'rgba(212, 167, 106, 0.05)', borderRadius: '80px', transform: 'rotate(25deg)' }}></div>
         
         <div style={{ position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
               <div style={{ 
                  width: 55, 
                  height: 55, 
                  borderRadius: '15px', 
                  background: 'white', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  border: '1.5px solid var(--secondary)'
               }}>
                  <img src="./logo.png" alt="Logo" style={{ width: '90%', height: '90%', objectFit: 'contain' }} />
               </div>
               <div>
                  <h3 style={{ fontSize: '1rem', color: 'var(--secondary)', fontWeight: 950, textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>مؤسسة الغويري</h3>
                  <p style={{ fontSize: '0.7rem', color: 'white', opacity: 0.8, fontWeight: 700, margin: 0 }}>للتخليص الجمركي</p>
               </div>
            </div>
            
            <h1 style={{ fontSize: '2.4rem', fontWeight: 950, marginBottom: '1.25rem', color: 'white', lineHeight: 1.1, fontFamily: 'Cairo' }}>
               منظومة <span style={{ color: 'var(--secondary)' }}>الميزان</span> <br/> المؤسسي 2026
            </h1>
            
            <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, maxWidth: '440px', fontWeight: 600, marginBottom: '2.5rem' }}>
               النظام المتكامل لإدارة العمليات المحاسبية واللوجستية والأمن الجمركي.
            </p>

            <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
               <div>
                  <h4 style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--secondary)', margin: 0 }}>ZATCA</h4>
                  <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>Local Compliance</p>
               </div>
               <div style={{ width: 1.5, height: 40, background: 'rgba(212,167,106,0.2)' }}></div>
               <div>
                  <h4 style={{ fontSize: '1.4rem', fontWeight: 950, color: 'white', margin: 0 }}>OFFLINE</h4>
                  <p style={{ fontSize: '0.65rem', color: 'var(--secondary)', fontWeight: 800, textTransform: 'uppercase', marginTop: '0.2rem' }}>Sovereign Data</p>
               </div>
            </div>
         </div>
      </div>

      <div className="login-form-side" style={{ 
        flex: 1, 
        background: 'var(--background)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '1rem'
      }}>
         <div className="login-card" style={{ padding: '1.25rem 2.25rem', maxWidth: '440px', width: '100%' }}>
            <header style={{ marginBottom: '1.25rem' }}>
               <h2 style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.2rem', fontFamily: 'Tajawal' }}>بوابة الولوج المؤسسي</h2>
               <p style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', fontWeight: 600 }}>نظام التخليص الجمركي - الميزان المحاسبي</p>
            </header>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#fce8e6', color: '#b3261e', borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.7rem', fontWeight: 800 }}>
                 <AlertCircle size={14} /> {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
               <div className="login-input-group" style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: '0.4rem', textAlign: 'inherit' }}>اسم المستخدم</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      className="login-input" 
                      style={{ paddingInlineStart: '2.75rem', paddingInlineEnd: '1rem', fontSize: '0.95rem', textAlign: 'inherit' }}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                    <User size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineStart: '1rem', color: 'var(--primary)', opacity: 0.4 }} />
                  </div>
               </div>

               <div className="login-input-group" style={{ marginBottom: '0.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: '0.4rem', textAlign: 'inherit' }}>كلمة المرور السريّة</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="password" 
                      className="login-input" 
                      style={{ paddingInlineStart: '2.75rem', paddingInlineEnd: '1rem', fontSize: '0.95rem', textAlign: 'inherit' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                    <Lock size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineStart: '1rem', color: 'var(--primary)', opacity: 0.4 }} />
                  </div>
               </div>

               <div style={{ textAlign: 'start', marginBottom: '1.25rem' }}>
                  <button type="button" onClick={() => setShowRecovery(true)} style={{ all: 'unset', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Key size={12} /> نسيت كلمة المرور؟ (استعادة مؤسسية)
                  </button>
               </div>

               <button disabled={loading || isLocked} type="submit" className="btn-executive" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', fontSize: '0.9rem', justifyContent: 'center', gap: '0.5rem', filter: isLocked ? 'grayscale(1)' : 'none', opacity: isLocked ? 0.5 : 1 }}>
                  {isLocked ? (
                    <><ShieldAlert size={16} /> النظام مغلق أمنياً</>
                  ) : loading ? (
                    <><Loader2 size={16} className="spin" /> جاري المصادقة...</>
                  ) : (
                    <>دخول آمن للمنصة <ArrowRight size={16} /></>
                  )}
               </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
               <button 
                type="button" 
                onClick={handleBiometricLogin}
                disabled={isLocked}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto', opacity: isLocked ? 0.2 : 0.5 }}
                >
                  <Fingerprint size={14} /> استخدام البصمة المحلية
               </button>
            </div>
         </div>
      </div>

      {showRecovery && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,10,20,0.85)', backdropFilter: 'blur(20px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(212,167,106,0.2)', boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5)' }}>
               <div style={{ width: 64, height: 64, borderRadius: '16px', background: 'var(--surface-container-high)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  {recoverySuccess ? <ShieldCheck size={32} color="var(--success)" /> : <Database size={32} />}
               </div>
               
               <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.5rem', fontFamily: 'Tajawal' }}>
                 {recoverySuccess ? 'تم التحقق من الهوية' : 'بروتوكول استعادة الوصول'}
               </h3>
               <p style={{ opacity: 0.7, fontWeight: 600, fontSize: '0.8rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                 {recoverySuccess ? 'جاري إعادة ضبط القفل وفك تجميد النظام...' : 'أدخل مفتاح الاستعادة المؤسسي.'}
               </p>

               {!recoverySuccess && (
                 <form onSubmit={handleRecovery} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input 
                      type="password" 
                      placeholder="مفتاح الاستعادة..."
                      className="login-input"
                      style={{ textAlign: 'center', letterSpacing: '2px' }}
                      value={recoveryInput}
                      onChange={(e) => setRecoveryInput(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="btn-executive" style={{ width: '100%', justifyContent: 'center', padding: '0.8rem' }}>
                       تحقق وفك القفل
                    </button>
                    <button type="button" onClick={() => setShowRecovery(false)} style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}>
                       إلغاء
                    </button>
                 </form>
               )}

               {recoverySuccess && (
                 <div style={{ padding: '1rem' }}>
                    <Loader2 size={32} className="spin" style={{ color: 'var(--success)' }} />
                 </div>
               )}
            </div>
        </div>
      )}

      {showBiometric && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,26,51,0.6)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ width: '100%', maxWidth: '360px', padding: '2rem', textAlign: 'center' }}>
               <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'var(--surface-container-low)', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Fingerprint size={36} color={scanStatus === 'success' ? 'var(--success)' : 'var(--primary)'} />
               </div>
               <h3 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: '0.5rem', fontFamily: 'Tajawal' }}>
                 {scanStatus === 'scanning' ? 'جاري التحقق المحلي...' : 'تم بنجاح'}
               </h3>
               <p style={{ opacity: 0.7, fontWeight: 600, fontSize: '0.85rem' }}>يتم استخدام البيانات الحيوية المسجلة محلياً</p>
            </div>
        </div>
      )}
    </div>
  );
}
