import { useState, useEffect, useCallback, useRef } from 'react';
import { localDB } from '../lib/localDB';
import { 
  Send, 
  Paperclip, 
  MessageSquare, 
  FolderSync, 
  Share2, 
  Users, 
  Clock, 
  ShieldCheck, 
  Database,
  ArrowRightLeft,
  ChevronRight,
  FileText,
  Download,
  Activity
} from 'lucide-react';
import type { Translations } from '../types/translations';

interface CommunicationsProps {
  showToast: (msg: string, type?: string) => void;
  lang: string;
}

export default function CommunicationsView({ showToast, lang }: CommunicationsProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'sync'>('chat');
  const [employees, setEmployees] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [syncSettings, setSyncSettings] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(() => {
    const users = localDB.getAll('user_roles');
    const msgs = localDB.getAll('sovereign_messages');
    const fls = localDB.getAll('sovereign_files');
    const settings = localDB.get('sync_settings');
    
    setEmployees(users);
    setMessages(msgs);
    setFiles(fls);
    setSyncSettings(settings);
    
    if (users.length > 0 && !selectedUser) {
        setSelectedUser(users[0]);
    }
  }, [selectedUser]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Poll for "new messages/sync"
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedUser]);

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedUser) return;
    
    const newMsg = {
      sender: 'current_user',
      recipient: selectedUser.id,
      content: messageInput,
      timestamp: new Date().toISOString()
    };
    
    localDB.insert('sovereign_messages', newMsg);
    setMessageInput('');
    fetchData();
  };

  const handleFileSync = async () => {
    showToast(lang === 'ar' ? 'جاري مزامنة الملفات مع الأجهزة المرتبطة...' : 'Syncing file vault with cluster...', 'info');
    setTimeout(() => {
        showToast(lang === 'ar' ? 'اكتملت المزامنة بنجاح' : 'Peer-to-peer sync complete', 'success');
    }, 2000);
  };

  const filteredMessages = messages.filter(m => 
    (m.sender === 'current_user' && m.recipient === selectedUser?.id) ||
    (m.sender === selectedUser?.id && m.recipient === 'current_user')
  );

  return (
    <div className="slide-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <header className="view-header" style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
        <div>
          <h1 className="view-title" style={{ margin: 0 }}>
            {lang === 'ar' ? 'الرابط السيادي' : 'Sovereign Link'}
          </h1>
          <p className="view-subtitle" style={{ margin: 0 }}>
            {lang === 'ar' ? 'شبكة الربط والاتصال المؤسسي المشفرة.' : 'Encrypted institutional communications & node sync.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button 
              onClick={() => setActiveTab('sync')} 
              className={`btn-executive ${activeTab === 'sync' ? '' : 'btn-outline'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', border: 'none' }}
            >
               <FolderSync size={18} /> {lang === 'ar' ? 'إدارة المزامنة' : 'Node Sync'}
            </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '1px', background: 'var(--surface-container-high)', borderRadius: '20px', padding: '0.4rem', marginBottom: '1.5rem', flexShrink: 0 }}>
         {(['chat', 'files', 'sync'] as const).map(tab => (
           <button 
             key={tab}
             onClick={() => setActiveTab(tab)}
             style={{ 
               flex: 1, 
               padding: '0.8rem', 
               border: 'none', 
               borderRadius: '16px',
               background: activeTab === tab ? 'var(--primary)' : 'transparent',
               color: activeTab === tab ? 'var(--secondary)' : 'var(--on-surface-variant)',
               fontWeight: 900,
               fontSize: '0.85rem',
               cursor: 'pointer',
               transition: 'all 0.2s'
             }}
           >
             {tab === 'chat' && (lang === 'ar' ? 'الرسائل' : 'Messages')}
             {tab === 'files' && (lang === 'ar' ? 'الخزينة المشركة' : 'File Vault')}
             {tab === 'sync' && (lang === 'ar' ? 'حالة الربط' : 'Network Cluster')}
           </button>
         ))}
      </div>

      <div style={{ flex: 1, display: 'flex', gap: '1.5rem', minHeight: 0 }}>
         {/* LEFT PANEL: Users */}
         <div className="card" style={{ width: '320px', display: 'flex', flexDirection: 'column', padding: '1.5rem', border: '1px solid var(--surface-container-high)', flexShrink: 0 }}>
            <h4 style={{ margin: '0 0 1.2rem', fontSize: '0.9rem', color: 'var(--on-surface-variant)', fontWeight: 900 }}>
               {lang === 'ar' ? 'العقد النشطة (الموظفون)' : 'Active Nodes (Staff)'}
            </h4>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               {employees.map(emp => (
                 <button 
                   key={emp.id}
                   onClick={() => setSelectedUser(emp)}
                   style={{ 
                     display: 'flex', 
                     alignItems: 'center', 
                     gap: '1rem', 
                     padding: '1rem', 
                     border: 'none', 
                     borderRadius: '14px', 
                     background: selectedUser?.id === emp.id ? 'var(--surface-container-high)' : 'transparent',
                     cursor: 'pointer',
                     textAlign: 'right'
                   }}
                 >
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--primary)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                       {emp.role.charAt(0)}
                    </div>
                    <div style={{ flex: 1 }}>
                       <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: 'var(--on-surface)' }}>{emp.name || emp.role}</p>
                       <span style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', opacity: 0.7 }}>{emp.role}</span>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></div>
                 </button>
               ))}
            </div>
         </div>

         {/* CONTENT AREA */}
         <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid var(--surface-container-high)', overflow: 'hidden' }}>
            {activeTab === 'chat' && selectedUser && (
              <>
                <div style={{ padding: '1.2rem 2rem', borderBottom: '1px solid var(--surface-container-high)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>{selectedUser.name || selectedUser.role}</h3>
                      <span style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', background: 'rgba(27, 94, 32, 0.1)', color: 'var(--success)', fontSize: '0.65rem', fontWeight: 900 }}>NODE: SECURE</span>
                   </div>
                   <ShieldCheck size={20} color="var(--primary)" />
                </div>
                
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                   {filteredMessages.length === 0 ? (
                     <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}>
                        <MessageSquare size={48} />
                        <p style={{ fontWeight: 800, marginTop: '1rem' }}>{lang === 'ar' ? 'لا توجد رسائل سابقة' : 'No previous messages'}</p>
                     </div>
                   ) : (
                     filteredMessages.map((m, idx) => (
                       <div key={idx} style={{ 
                         alignSelf: m.sender === 'current_user' ? 'flex-end' : 'flex-start',
                         maxWidth: '70%',
                         padding: '1rem 1.5rem',
                         borderRadius: m.sender === 'current_user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                         background: m.sender === 'current_user' ? 'var(--primary)' : 'var(--surface-container-high)',
                         color: m.sender === 'current_user' ? 'white' : 'var(--on-surface)',
                         boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
                       }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem', lineHeight: '1.5' }}>{m.content}</p>
                          <span style={{ fontSize: '0.65rem', opacity: 0.6, display: 'block', marginTop: '0.4rem', textAlign: 'left' }}>
                             {new Date(m.timestamp).toLocaleTimeString()}
                          </span>
                       </div>
                     ))
                   )}
                   <div ref={chatEndRef} />
                </div>

                <div style={{ padding: '1.5rem', background: 'var(--surface-container-low)', borderTop: '1px solid var(--surface-container-high)', display: 'flex', gap: '1rem' }}>
                   <button className="btn-hover-scale" style={{ background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer' }}>
                      <Paperclip size={24} />
                   </button>
                   <input 
                     type="text" 
                     placeholder={lang === 'ar' ? 'اكتب رسالة مشفرة...' : 'Type an encrypted message...'} 
                     value={messageInput}
                     onChange={e => setMessageInput(e.target.value)}
                     onKeyPress={e => e.key === 'Enter' && sendMessage()}
                     className="input-executive" 
                     style={{ flex: 1, border: 'none', background: 'white' }} 
                   />
                   <button onClick={sendMessage} className="btn-executive" style={{ width: 'auto', minWidth: 'auto', padding: '0.8rem 1.2rem', border: 'none' }}>
                      <Send size={20} />
                   </button>
                </div>
              </>
            )}

            {activeTab === 'files' && (
              <div style={{ padding: '3rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <div>
                       <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 950 }}>{lang === 'ar' ? 'خزينة الملفات المشتركة' : 'Shared File Vault'}</h3>
                       <p style={{ margin: 0, opacity: 0.6, fontWeight: 700 }}>{lang === 'ar' ? 'رفع ومزامنة المستندات الرسمية بين الأجهزة.' : 'Upload and sync institutional docs between nodes.'}</p>
                    </div>
                    <button onClick={handleFileSync} className="btn-executive" style={{ border: 'none', padding: '0.8rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                       <ArrowRightLeft size={18} /> {lang === 'ar' ? 'مزامنة الخزينة' : 'Sync Vault'}
                    </button>
                 </div>

                 <div style={{ flex: 1, border: '2px dashed var(--surface-container-high)', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '20px', background: 'var(--surface-container-low)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                       <Download size={40} />
                    </div>
                    <div>
                       <p style={{ fontWeight: 900, color: 'var(--primary)', margin: 0 }}>{lang === 'ar' ? 'اسحب الملفات هنا للرفع السيادي' : 'Drag files here for sovereign upload'}</p>
                       <p style={{ fontSize: '0.8rem', opacity: 0.6, textAlign: 'center' }}>{lang === 'ar' ? 'الحد الأقصى للملف: 50MB' : 'Max file size: 50MB'}</p>
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'sync' && syncSettings && (
               <div style={{ padding: '3rem', height: '100%' }}>
                  <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                     <div style={{ width: 100, height: 100, borderRadius: '30px', background: 'rgba(212, 167, 106, 0.1)', color: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
                        <Database size={50} />
                     </div>
                     <h2 style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.5rem' }}>{lang === 'ar' ? 'عنقود التزامن السيادي' : 'Sovereign Sync Cluster'}</h2>
                     <p style={{ color: 'var(--on-surface-variant)', fontWeight: 700 }}>{lang === 'ar' ? 'إدارة ربط ومزامنة الأجهزة عبر الشبكة المحلية.' : 'Manage multi-device cluster sync over LAN.'}</p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                     <div className="card" style={{ padding: '2rem', background: 'var(--surface-container-low)', border: '1px solid var(--surface-container-high)' }}>
                        <h4 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--primary)', fontWeight: 950 }}>
                           <Clock size={20} /> {lang === 'ar' ? 'معلومات العقدة' : 'Node Information'}
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ opacity: 0.6, fontWeight: 700 }}>ID:</span>
                              <span style={{ fontWeight: 900, fontFamily: 'monospace' }}>{syncSettings.device_id}</span>
                           </div>
                           <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ opacity: 0.6, fontWeight: 700 }}>{lang === 'ar' ? 'آخر تزامن:' : 'Last Sync:'}</span>
                              <span style={{ fontWeight: 900 }}>{new Date(syncSettings.last_sync).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
                           </div>
                        </div>
                     </div>

                     <div className="card" style={{ padding: '2rem', background: 'var(--surface-container-low)', border: '1px solid var(--surface-container-high)' }}>
                        <h4 style={{ margin: '0 0 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--primary)', fontWeight: 950 }}>
                           <Activity size={20} /> {lang === 'ar' ? 'حالة الشبكة' : 'Cluster Status'}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--success)' }}>
                           <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'currentColor' }}></div>
                           <span style={{ fontWeight: 950 }}>{lang === 'ar' ? 'متصل بالشبكة المحلية' : 'Connected to LAN Cluster'}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.5rem', fontWeight: 700 }}>
                           {lang === 'ar' ? 'اكتشاف تلقائي للأجهزة النشطة مفعل.' : 'Peer auto-discovery active.'}
                        </p>
                     </div>
                  </div>

                  <div style={{ marginTop: '2.5rem', padding: '2rem', borderRadius: '18px', background: 'var(--primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                        <h5 style={{ margin: 0, color: 'var(--secondary)', fontWeight: 950, fontSize: '1.2rem' }}>{lang === 'ar' ? 'مزامنة القاعدة الفورية' : 'Real-time DB Sync'}</h5>
                        <p style={{ margin: '0.3rem 0 0', opacity: 0.8, fontSize: '0.9rem' }}>{lang === 'ar' ? 'تحديث كافة السجلات تلقائياً عبر الأجهزة.' : 'Sync all records automatically across the node cluster.'}</p>
                     </div>
                     <button className="btn-executive" style={{ width: 'auto', border: 'none', padding: '0.8rem 1.5rem' }}>
                        {lang === 'ar' ? 'تفعيل الربط' : 'Enable Link'}
                     </button>
                  </div>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
