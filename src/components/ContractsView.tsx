// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';

import { 
  Plus, Search, FileText, Trash2, CheckCircle, AlertCircle, Truck, User, 
  Calendar, DollarSign, ArrowUpRight, ShieldCheck, Download, Printer, X, 
  ChevronRight, Briefcase
} from 'lucide-react';
import { localDB } from '../lib/localDB';
import type { Contract } from '../lib/localDB';

interface ContractsViewProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  logActivity: (action: string, details: string, type: 'info' | 'success' | 'warning' | 'error') => void;
  t: any;
}

export const ContractsView: React.FC<ContractsViewProps> = ({ showToast, logActivity, t }) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'client' | 'transporter'>('client');
  const [showModal, setShowModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Omit<Contract, 'id'>>({
    type: 'client',
    entity_id: '',
    entity_name: '',
    contract_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    value: 0,
    terms: '',
    status: 'active',
    transport_expenses: 0
  });

  const loadData = useCallback(() => {
    const data = (localDB.getActive('contracts') || []) as Contract[];
    const custs = (localDB.getActive('customers') || []) as any[];
    setContracts(data);
    setCustomers(custs);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entity = customers.find(c => c.id === formData.entity_id);
    const finalData = { ...formData, entity_name: entity?.name || 'طرف مجهول' };
    
    try {
      if (selectedContract) {
        localDB.update('contracts', selectedContract.id, finalData);
        logActivity('تعديل عقد', `تم تعديل عقد ${finalData.entity_name}`, 'info');
        showToast('تم تحديث العقد بنجاح', 'success');
      } else {
        localDB.insert('contracts', finalData);
        logActivity('إنشاء عقد', `تم إنشاء عقد جديد لـ ${finalData.entity_name}`, 'success');
        showToast('تم إنشاء العقد بنجاح', 'success');
      }
      
      setShowModal(false);
      loadData();
      resetForm();
    } catch (error) {
      showToast('خطأ في حفظ العقد', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      type: activeTab,
      entity_id: '',
      entity_name: '',
      contract_date: new Date().toISOString().split('T')[0],
      expiry_date: '',
      value: 0,
      terms: '',
      status: 'active',
      transport_expenses: 0
    });
    setSelectedContract(null);
  };

  const filtered = contracts.filter(c => 
    c.type === activeTab && 
    (c.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) || c.terms.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 overflow-hidden" dir="rtl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800">نظام التعاقدات السيادي</h1>
          <p className="text-slate-500 font-bold mt-1">إدارة عقود العملاء وشركات النقل اللوجستي</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition"
        >
          إضافة عقد جديد
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <TabButton active={activeTab === 'client'} onClick={() => setActiveTab('client')} icon={<User size={18} />} label="عقود العملاء" />
        <TabButton active={activeTab === 'transporter'} onClick={() => setActiveTab('transporter')} icon={<Truck size={18} />} label="عقود الناقلين" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <ContractStat title="العقود النشطة" value={filtered.filter(c => c.status === 'active').length} color="blue" />
        <ContractStat title="قيمة الالتزامات" value={filtered.reduce((sum, c) => sum + (Number(c.value) || 0), 0)} color="green" />
        {activeTab === 'transporter' && <ContractStat title="مصاريف النقل" value={filtered.reduce((sum, c) => sum + (Number(c.transport_expenses) || 0), 0)} color="red" />}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 border-b">
                <th className="px-6 py-4 font-black text-slate-600">الطرف المتعاقد</th>
                <th className="px-6 py-4 font-black text-slate-600">تاريخ البدء</th>
                <th className="px-6 py-4 font-black text-slate-600">القيمة الإجمالية</th>
                {activeTab === 'transporter' && <th className="px-6 py-4 font-black text-slate-600">مصاريف النقل</th>}
                <th className="px-6 py-4 font-black text-slate-600">الحالة</th>
                <th className="px-6 py-4 font-black text-slate-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(contract => (
                <tr key={contract.id} className="border-b hover:bg-slate-50 transition cursor-pointer" onClick={() => { setSelectedContract(contract); setFormData(contract); setShowModal(true); }}>
                  <td className="px-6 py-4">
                    <div className="font-black text-slate-800">{contract.entity_name}</div>
                    <div className="text-xs text-slate-400 font-bold">{contract.id}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600">{contract.contract_date}</td>
                  <td className="px-6 py-4 font-black text-blue-600">{(Number(contract.value) || 0).toLocaleString()} ر.س</td>
                  {activeTab === 'transporter' && <td className="px-6 py-4 font-black text-red-600">{(Number(contract.transport_expenses) || 0).toLocaleString()} ر.س</td>}
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${contract.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {contract.status === 'active' ? 'نشط' : 'ملغى'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-blue-100 hover:text-blue-600 transition"><FileText size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
             <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800">{selectedContract ? 'تعديل بيانات العقد' : 'إنشاء عقد جديد'}</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X size={24} /></button>
             </div>
             <form onSubmit={handleSubmit} className="p-8 grid grid-cols-2 gap-6 max-h-[80vh] overflow-y-auto">
                <div className="col-span-1">
                  <label className="block text-sm font-black text-slate-700 mb-2">نوع التعاقد</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="client">عقد عميل (تخليص)</option>
                    <option value="transporter">عقد ناقل (لوجستي)</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-black text-slate-700 mb-2">اسم الطرف</label>
                  <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.entity_id} onChange={e => setFormData({...formData, entity_id: e.target.value})} required>
                    <option value="">اختر الطرف...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-black text-slate-700 mb-2">تاريخ العقد</label>
                  <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.contract_date} onChange={e => setFormData({...formData, contract_date: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-black text-slate-700 mb-2">تاريخ الانتهاء</label>
                  <input type="date" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.expiry_date} onChange={e => setFormData({...formData, expiry_date: e.target.value})} />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-black text-slate-700 mb-2">القيمة الكلية</label>
                  <input type="number" className="w-full p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl font-black text-blue-700" value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
                </div>
                {formData.type === 'transporter' && (
                  <div className="col-span-1">
                    <label className="block text-sm font-black text-slate-700 mb-2">مصاريف التشغيل/النقل</label>
                    <input type="number" className="w-full p-4 bg-red-50 border-2 border-red-100 rounded-2xl font-black text-red-700" value={formData.transport_expenses} onChange={e => setFormData({...formData, transport_expenses: Number(e.target.value)})} />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-black text-slate-700 mb-2">الشروط والأحكام</label>
                  <textarea rows={3} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold" value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} placeholder="اكتب شروط العقد هنا..." />
                </div>
                <button type="submit" className="col-span-2 bg-slate-900 text-white py-4 rounded-2xl font-black hover:bg-black transition shadow-xl mt-4">حفظ بيانات العقد السيادي</button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-6 py-3 rounded-xl font-black shadow-sm transition ${active ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border'}`}>
       {icon}
       <span>{label}</span>
    </button>
  );
}

interface ContractStatProps {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'red';
}

function ContractStat({ title, value, color }: ContractStatProps) {
  const c = { 
    blue: 'text-blue-600 bg-blue-50 border-blue-100', 
    green: 'text-green-600 bg-green-50 border-green-100', 
    red: 'text-red-600 bg-red-50 border-red-100' 
  };
  return (
    <div className={`p-6 rounded-3xl border-2 ${c[color]}`}>
       <p className="text-xs font-black opacity-70 mb-1">{title}</p>
       <h3 className="text-2xl font-black">{value.toLocaleString()}</h3>
    </div>
  );
}
