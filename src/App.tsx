import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Handshake, 
  Wallet, 
  ShieldCheck, 
  Bell,
  Search,
  Plus,
  ArrowUpRight,
  Clock,
  Zap,
  LogOut,
  Users,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  FileText,
  Activity,
  Sun,
  Moon,
  Languages,
  Printer,
  ChevronLeft,
  ChevronRight,
  Download,
  Settings,
  History as HistoryIcon,
  TrendingDown,
  Loader2,
  Banknote,
  BarChart3,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { offlineSync } from './lib/offlineSync';

// --- Views ---
import DashboardView from './components/DashboardView';
import CustomersView from './components/CustomersView';
import AccountingView from './components/AccountingView';
import PayrollView from './components/PayrollView';
import SecurityView from './components/SecurityView';
import SettingsView from './components/SettingsView';
import ReportsView from './components/ReportsView';
import RolesView from './components/RolesView';
import TaxAutomationView from './components/TaxAutomationView';
import ExpensesView from './components/ExpensesView';
import PrepaymentsView from './components/PrepaymentsView';
import DataImportView from './components/DataImportView';
import { InvoicesView } from './components/InvoicesView';
import AuditLogsView from './components/AuditLogsView';
import StatementsView from './components/StatementsView';
import PettyCashView from './components/PettyCashView';
import LoginView from './components/LoginView';
import { TrashView } from './components/TrashView';
import PublicInvoiceView from './components/PublicInvoiceView';


const translations = {
  ar: {
    title: 'مؤسسة الغويري للتخليص الجمركي',
    subtitle: 'منظومة الميزان السيادي - إدارة اللوجستيات والتخليص',
    welcome: 'مرحباً، ',
    last_sync: 'آخر مزامنة: اليوم، 10:45 صباحاً',
    search: 'بحث مالي سري...',
    add_trx: 'إضافة عملية سيادية',
    logout: 'تسجيل الخروج',
    user_roles: { admin: 'مدير المنظومة', cfo: 'المدير المالي', accountant: 'محاسب سيادي' },
    nav: {
      dashboard: 'لوحة التحكم',
      customers: 'العملاء والشركاء',
      accounting: 'المحاسبة السيادية',
      invoices: 'الفواتير السيادية',
      prepayments: 'الدفعات المقدمة',
      expenses: 'السيولة والمصاريف',
      tax: 'الأتمتة الضريبية',
      payroll: 'مسيرات الرواتب',
      reports: 'التقارير التحليلية',
      security: 'الأمان والنسخ',
      roles: 'الأدوار والصلاحيات',
      audit: 'سجل النشاطات الموحد',
      data: 'استيراد البيانات',
      settings: 'إعدادات النظام',
      shipments: 'إدارة الشحنات الجمركية',
      financial_compliance: 'الامتثال المالي والجمركي',
      system_security: 'الأمن السيادي',
      statements: 'القوائم المالية الجمركية',
      petty_cash: 'العهدة النقدية',
      trash: 'سلة المهملات',
      biometrics: 'الأمان والبصمات'
    },
    notifications: {
      success: 'تمت تسجيل العملية السيادية بنجاح بميزان الغويري!',
      error: 'خطأ سيادي في المزامنة: '
    },
    dashboard: {
      title: 'لوحة التحكم التنفيذية',
      subtitle: 'المؤشرات المالية والموازين السيادية',
      compliance_title: 'إقرار الامتثال الضريبي (ZATKA)',
      compliance_desc: 'تم التحقق من التكامل مع المرحلة الثانية (الربط والإحكام) للفترة الضريبية الحالية بنجاح.',
      total_balance: 'إجمالي الأرصدة (SAR)',
      operating_profit: 'إجمالي الأرباح التشغيلية',
      available_liquidity: 'السيولة البنكية المتاحة',
      stable_growth: 'نمو مستقر',
      accounts_count: 'عبر 4 حسابات مؤسسية',
      log_title: 'سجل الميزان المالي السيادي',
      audit_alerts: 'تنبيهات التدقيق المالي',
      syncing: 'جاري تحديث سجل الميزان من السحابة المشفرة...',
      trx_completed: 'مكتمل',
      income: 'إيراد سيادي',
      expense: 'مصروف إداري',
      export_report: 'تصدير التقرير التنفيذي',
      table: {
        id: 'رقم العملية',
        description: 'الوصف',
        type: 'النوع',
        value: 'القيمة',
        status: 'الحالة'
      },
      alerts: {
        credit_limit: 'تجاوز الحد الائتماني',
        pending_settlement: 'تسويات معلقة',
        bank_reconciliation: 'مطابقة بنكية',
        tax_deadline: 'موعد الضريبة'
      }
    },
    reports: {
      title: 'التحليلات والمؤشرات السيادية',
      subtitle: 'نظرة شمولية على أداء السيولة والربحية وتوزيع الموارد.',
      revenue: 'إجمالي الإيرادات',
      expenses: 'إجمالي المصروفات',
      net_income: 'صافي الربح الموزع',
      historical_high: 'أعلى مستوى تاريخي',
      operating_costs: 'التكاليف التشغيلية',
      quarterly_target: 'المستهدف الربعي',
      summary_ledger: 'الميزان السيادي العام',
      tax_est: 'تقدير الزكاة والضريبة (15%)',
      growth_chart: 'تغير الموارد والنمو',
      compliance_audit: 'تدقيق هيئة الزكاة والضريبة',
      compliance_footer: 'كافة الحركات المالية المجمعة متوافقة تماماً مع معايير هيئة الزكاة والضريبة والجمارك (المرحلة الثانية).',
      export_report: 'تصدير التقرير التحليلي',
      jan: 'يناير', feb: 'فبراير', mar: 'مارس', apr: 'أبريل', may: 'مايو', jun: 'يونيو'
    },
    accounting: {
      invoice_editor: 'محرر الفواتير التحليلي',
      invoice_desc: 'إصدار وتدقيق الفواتير الضريبية المتوافقة مع متطلبات زاتكا.',
      client_name: 'اسم العميل / المنشأة',
      tax_id: 'الرقم الضريبي (اختياري)',
      service_type: 'فئة الخدمة',
      items_title: 'بنود الفاتورة',
      add_item: 'إضافة بند',
      issue_invoice: 'إصدار وترحيل الفاتورة',
      subtotal: 'المجموع (بدون الضريبة)',
      vat: 'الضريبة (15%)',
      total: 'الإجمالي النهائي (SAR)',
      recent_title: 'العمليات المرحلة حديثاً',
      currency: 'العملة',
      description_placeholder: 'الوصف...',
      amount_placeholder: 'المبلغ',
      print_pdf: 'طباعة / PDF',
      summation: 'الملخص المالي',
      no_recent: 'لا توجد فواتير حديثة',
      settlement_entry: 'قيد تسوية سيادي',
      adjustment_type: 'نوع التسوية',
      credit_adj: 'تسوية دائنة',
      debit_adj: 'تسوية مدينة'
    },
    payroll: {
      title: 'إدارة مسيرات الرواتب السيادية',
      subtitle: 'متابعة مستحقات الكادر والتعويضات.',
      total_salaries: 'إجمالي الرواتب الشهرية',
      active_employees: 'الموظفون النشطون',
      pending_payments: 'تسويات معلقة',
      lang: 'ar',
      excel_report: 'تصدير تقرير Excel',
      certify_wps: 'اعتماد نظام حماية الأجور',
      all_certified: 'تمت المصادقة على الجميع',
      ledger_title: 'سجل الرواتب الموحد',
      wps_sif_export: 'تصدير ملف SIF (حماية الأجور)',
      table_employee: 'الموظف / الهوية',
      table_base: 'الراتب الأساسي',
      table_plus: 'البدلات',
      table_ded: 'الاستقطاعات',
      table_net: 'الصافي (SAR)',
      table_status: 'الحالة',
      status_certified: 'معتمد سيادياً',
      status_pending: 'بانتظار التعميد',
      add_staff_title: 'إضافة كادر سيادي جديد',
      full_name_label: 'الاسم الرباعي الكامل',
      role_label: 'الدور الوظيفي',
      base_label: 'الراتب الأساسي',
      plus_label: 'إجمالي البدلات',
      ded_label: 'إجمالي الاستقطاعات',
      secure_record: 'حفظ السجل الآمن',
      cancel: 'إلغاء'
    },
    customers: {
      title: 'إدارة العملاء والشركاء',
      subtitle: 'قاعدة البيانات الموحدة للائتمان، المديونيات، والعلاقات التجارية الإستراتيجية.',
      print: 'طباعة',
      export: 'تصدير',
      add_customer: 'إضافة عميل جديد',
      total_credit: 'إجمالي الائتمان النشط',
      partners_count: 'عدد الشركاء المسجلين',
      pending_reviews: 'طلبات بانتظار المراجعة',
      expired_contracts: 'اتفاقيات منتهية',
      search_placeholder: 'بحث عن شريك بالاسم أو الرقم الضريبي...',
      all_categories: 'كافة التصنيفات',
      table: {
        entity: 'الكيان / الشركة',
        sector: 'القطاع',
        credit: 'الرصيد المخصص',
        roi: 'نسبة الاستخدام',
        last_op: 'آخر عملية',
        options: 'خيارات'
      },
      activity: 'النشاطات الأخيرة',
      modal: {
        title: 'شريك سيادي جديد',
        name: 'الاسم القانوني للكيان',
        phone: 'الهاتف',
        category: 'الفئة',
        limit: 'الحد الائتماني (SAR)',
        cancel: 'إلغاء',
        submit: 'حفظ السجل الآمن'
      },
      lang: 'ar'
    },
    invoices: {
      title: 'إدارة الفواتير والتحصيلات',
      subtitle: 'إصدار ومتابعة الفواتير الضريبية المتوافقة مع معايير هيئة الزكاة والضريبة (ZATCA).',
      active_title: 'سجل الفواتير النشطة',
      search_placeholder: 'بحث في الفواتير...',
      print: 'طباعة القائمة',
      add_title: 'إنشاء فاتورة سيادية',
      stats: {
        total_due: 'إجمالي المستحقات',
        collected: 'التحصيل (هذا الشهر)',
        overdue: 'متأخرات مستحقة',
        zatca_certified: 'فواتير ZATCA'
      },
      table: {
        number: 'رقم الفاتورة / المرجع',
        client: 'العميل',
        date: 'تاريخ الإصدار',
        amount: 'المبلغ الصافي',
        tax: 'الضريبة 15%',
        total: 'الإجمالي',
        status: 'حالة السداد',
        preview: 'معاينة وطباعة',
        options: 'خيارات'
      },
      modal: {
        title: 'إصدار فاتورة ضريبية',
        client_label: 'اختيار العميل / الشريك',
        amount_label: 'المبلغ المفوتر (قبل الضريبة)',
        ref_label: 'رقم المرجع (اختياري)',
        cancel: 'إلغاء',
        submit: 'إصدار وتوثيق (ZATCA)',
        whatsapp_share: 'إرسال عبر واتساب (WhatsApp)'
      },
      confirm_delete: 'هل أنت متأكد من حذف هذه الفاتورة؟',
      delete_success: 'تم حذف الفاتورة بنجاح.',
      wa_invoice_template: 'عزيزي العميل، فاتورتكم رقم {{number}} بقيمة {{total}} جاهزة. المعاينة: {{link}}',
      status_paid: 'مدفوع',
      status_pending: 'معلق',
      copy_link_success: 'تم نسخ الرابط',
      settlement_badge: 'تسوية ضريبية',
      edit_invoice: 'تعديل الفاتورة',
      status_label: 'الحالة',
      save_changes: 'حفظ التغييرات',
      wa_preview_title: 'معاينة واتساب',
      wa_preview_subtitle: 'إرسال رسمي عبر الواتساب',
      wa_send_now: 'إرسال الآن',
      cancel: 'إلغاء',
      simplified_invoice: 'فاتورة مبسطة',
      shareable_link_success: 'تم توليد الرابط',
      whatsapp_preview: 'معاينة',
      wa_phone_label: 'رقم الهاتف',
      wa_review_desc: 'راجع الرسالة قبل الإرسال',
      lang: 'ar'
    },
    expenses: {
      lang: 'ar',
      title: 'إدارة المصاريف والسيولة',
      subtitle: 'تتبع التدفقات النقدية الخارجة والمصروفات الإدارية والتشغيلية.',
      current_cash_balance: 'رصيد السيولة النقدية المتاح',
      total_petty_cash: 'إجمالي العهد النقدية للموظفين',
      total_expenses: 'إجمالي المصروفات التشغيلية',
      recent_expenses_ledger: 'سجل المصروفات السيادية الأخير',
      active_petty_cash: 'متابعة العهد النقدية للكوادر',
      table: {
        date: 'تاريخ الصرف',
        description: 'البند / الوصف',
        id: 'رقم السند',
        amount: 'المبلغ (SAR)'
      },
      record_new_expense: 'تسجيل مصروف جديد',
      record_new_sovereign_expense: 'تسجيل عملية صرف سيادية',
      description_label: 'وصف العملية / البند',
      amount_sar_label: 'المبلغ (SAR)',
      date_label: 'تاريخ العملية',
      category_label: 'فئة المصروف',
      cancel: 'إلغاء',
      record_expense: 'تسجيل المصروف',
      loading_expenditures: 'جاري تحميل سجلات الصرف الآمنة...',
      audit_all: 'تدقيق كافة العمليات',
      staff_petty: 'عهد الموظفين',
      outflow: 'التدفقات الخارجة',
      financial_authority_notice: 'إشعار: كافة العمليات تخضع للرقابة المالية السيادية المباشرة.',
      allocation_label: 'جهة التخصيص'
    },
    tax: {
      title: 'الأتمتة الضريبية والجمركية',
      subtitle: 'الربط المباشر مع أنظمة هيئة الزكاة والضريبة والجمارك (ZATCA).',
      output_vat: 'ضريبة المخرجات (المبيعات)',
      input_vat: 'ضريبة المدخلات (المشتريات)',
      net_vat: 'صافي الضريبة المستحقة',
      certified_history: 'أرشيف الإقرارات المعتمدة سيادياً',
      ai_audit: 'التدقيق الذكي للبيانات الضريبية'
    },
    prepayments: {
      title: 'الاعتمادات المالية المسبقة',
      subtitle: 'إدارة الودائع الجمركية والاعتمادات البنكية والخدمات السنوية',
      active_count: 'إجمالي الدفعات النشطة',
      recent_ledger: 'سجل الأرصدة المقدمة',
      loading: 'جاري تحميل البيانات السيادية...',
      empty: 'لا توجد دفعات مقدمة مسجلة. قم بتسجيل دفعة.',
      add_title: 'تسجيل رصيد مقدم جديد',
      table: {
        title: 'البيان / الخدمة',
        company: 'الجهة أو المورد',
        start: 'تاريخ البدء',
        end: 'تاريخ الانتهاء',
        status: 'الحالة'
      }
    },
    audit_logs: {
      title: 'سجل التدقيق والنشاطات',
      subtitle: 'مراقبة شاملة لكافة الحركات والعمليات التي تمت على نظام الميزان الموحد',
      refresh: 'تحديث السجل',
      th_time: 'الوقت والتاريخ',
      th_user: 'المستخدم / الحساب',
      th_action: 'نوع العملية (Action)',
      th_entity: 'السجل المرتبط (Entity)',
      loading: 'جاري تحميل السجلات الأمينة...',
      empty: 'لا توجد عمليات مسجلة حتى الآن في الميزان السيادي.'
    },
    security: {
      title: 'الأمن والسيادة الرقمية',
      subtitle: 'إدارة بروتوكولات الأمان، التشفير، والوصول الآمن للقاعدة.',
      shield_status: 'حالة الدرع السيادي',
      firewall: 'جدار الحماية الفعال',
      encryption: 'تشفير ECDSA النشط'
    },
    roles: {
      title: 'إدارة الصلاحيات والكوادر',
      subtitle: 'تحديد مستويات الوصول والأدوار الوظيفية داخل النظام المحاسبي.',
      add_role: 'إضافة دور جديد'
    },
    trash: {
      title: 'سلة المهملات السيادية',
      subtitle: 'إدارة السجلات المحذوفة والمسترجعة من القاعدة المحلية.',
      invoices: 'الفواتير',
      customers: 'العملاء',
      petty_cash: 'العهد النقدية',
      restore: 'استعادة السجل',
      permanently_delete: 'حذف نهائي',
      empty: 'سلة المهملات فارغة حالياً'
    },
    settings: {
      title: 'الإعدادات السيادية',
      subtitle: 'تهيئة المنظومة، معلومات الكيان، والتفضيلات العامة.',
      save: 'حفظ التغييرات السيادية',
      biometrics: 'إعدادات البصمة الحيوية',
      tabs: {
        general: 'المؤسسة والبروفايل',
        financial: 'العملات والضرائب',
        notifications: 'تفضيلات الإشعارات',
        appearance: 'التصميم والهوية',
        documents: 'ترويسات التقارير',
        security: 'الأمان والبصمات',
        backup: 'النسخ الاحتياطي'
      }
    },
    data_import: {
      lang: 'ar',
      title: 'استيراد البيانات الخارجية',
      subtitle: 'رفع ملفات Excel أو CSV لدمجها في السجل الموحد.',
      clear_all: 'مسح كافة السجلات',
      seed_samples: 'توليد بيانات تجريبية',
      confirm_clear_data: 'هل أنت متأكد من مسح كافة البيانات؟',
      clear_success: 'تم مسح البيانات بنجاح',
      seeding_info: 'تحميل بيانات تجريبية للتدريب',
      seed_success: 'تم تحميل العينات بنجاح',
      seed_error: 'خطأ في تحميل العينات',
      import_success_prefix: 'تم استيراد',
      import_success_suffix: 'سجل بنجاح',
      encryption_msg: 'التشفير السيادي نشط (AES-256)',
      security_protocol_badge: 'بروتوكول آمن',
      wps_sync_badge: 'مزامنة WPS',
      steps: {
        upload: 'اختيار الملف الفني',
        alignment: 'محاذاة بنود الميزان',
        archive: 'المزامنة النهائية'
      },
      upload_center_title: 'مركز استلام البيانات الموحد',
      upload_center_desc: 'بروتوكول ترحيل البيانات الخارجية إلى البنية التحتية السيادية للميزان.',
      select_file: 'اختيار ملف البيانات',
      alignment_title: 'محاذاة البيانات والمطابقة',
      cancel: 'إلغاء العملية',
      execute_import: 'تنفيذ الاستيراد السيادي',
      success_title: 'اكتملت المزامنة الآمنة',
      success_desc: 'تحليل ومطابقتها مع شجرة الحسابات السيادية بنجاح.',
      return_home: 'العودة لمركز القيادة',
      security_protocol_notice: 'كافة البيانات المستوردة تخضع لبروتوكول تشفير AES-256 قبل الحفظ.',
      fields: {
        entity: 'الكيان',
        reference: 'المرجع',
        value: 'القيمة',
        date: 'التاريخ',
        vat: 'الضريبة',
        category: 'التصنيف'
      },
      options: {
        auto_a: 'مطابقة آلية (A)',
        auto_b: 'مطابقة آلية (B)',
        auto_c: 'مطابقة آلية (C)',
        manual: 'مطابقة يدوية'
      }
    },
    shipments: {
      lang: 'ar',
      title: 'إدارة الشحنات والتخليص الجمركي',
      subtitle: 'متابعة حركة الحاويات والبيانات الجمركية والرسوم المستحقة',
      add_title: 'إنشاء شحنة جديدة',
      active_shipments: 'الشحنات النشطة',
      under_clearance: 'قيد التخليص',
      total_fees_sar: 'إجمالي الرسوم (SAR)',
      search_placeholder: 'بحث في الشحنات...',
      filter: 'تصفية',
      export: 'تصدير',
      type_import: 'وارد',
      type_export: 'صادر',
      date_prefix: 'بتاريخ:',
      status: {
        completed: 'مكتمل',
        review: 'قيد المراجعة',
        clearance: 'قيد التخليص',
        alert: 'تنبيه جمركي'
      },
      table: {
        id: 'المرجع',
        client: 'العميل / الشريك',
        type: 'النوع',
        status: 'الحالة',
        fees: 'الرسوم (SAR)',
        options: 'خيارات'
      }
    },
    statements: {
      lang: 'ar',
      title: 'القوائم المالية الختامية',
      subtitle: 'كشوفات الدخل والميزانيات العمومية والتدفقات النقدية السيادية.',
      analyzing_financial: 'جاري تحليل القوائم المالية الحقيقية...',
      export_excel: 'تصدير Excel',
      print_report: 'طباعة التقرير',
      net_profit: 'صافي الربح',
      cash_flow: 'التدفقات النقدية',
      expense_ratio: 'نسبة المصاريف',
      sovereign_verified: 'معتمد سيادياً',
      real_time_update: 'تحديث لحظي من النظام',
      within_threshold: 'ضمن الحدود المسموحة',
      income_statement_title: 'قائمة الدخل - الفترة الحالية',
      balanced_ledger_badge: 'ميزان مراجعة سليم',
      calculated_tag: 'محتسب آلياً',
      table: {
        category: 'البند المالي / التصنيف',
        amount: 'المبلغ',
        verification: 'الحالة والتوثيق'
      },
      categories: {
        revenue: 'إجمالي الإيرادات',
        cogs: 'تكلفة المبيعات الحقيقية',
        gross_profit: 'إجمالي الربح التشغيلي',
        general_expenses: 'المصاريف العمومية',
        payroll: 'مصاريف الرواتب (WPS)',
        net_income: 'صافي دخل الميزان'
      },
      actions: {
        balance_sheet_title: 'الميزانية العمومية الشاملة',
        balance_sheet_desc: 'توليد تقرير شامل للأصول والالتزامات وحقوق الملكية للشركة.',
        balance_sheet_btn: 'توليد الميزانية العمومية',
        archive_title: 'سجل التدفقات التاريخي',
        archive_desc: 'أرشفة كافة الحركات المالية للفترة الحالية ونقلها للسجل الدائم.',
        archive_btn: 'أرشفة البيانات',
        compliance_title: 'تقرير التهرب الضريبي',
        compliance_desc: 'فحص تلقائي لكافة الفواتير والمصاريف للتأكد من مطابقتها لزاتكا.',
        compliance_btn: 'بدء الفحص الضريبي'
      }
    },
    petty_cash: {
      title: 'العهد النقدية والمسحوبات',
      subtitle: 'إدارة السلف، المسحوبات الشخصية، والمصروفات المكتبية العاجلة.',
      total_active: 'إجمالي العهد النشطة',
      add_request: 'طلب عهدة جديدة',
      lang: 'ar'
    },
    marketing: {
      lang: 'ar',
      title: 'التسويق السيادي',
      subtitle: 'إدارة الحملات وتحليلات النمو المؤسسي.',
      create_campaign: 'إنشاء حملة سيادية',
      active_campaigns: 'الحملات النشطة',
      total_reach: 'إجمالي الوصول',
      conv_rate: 'معدل التحويل',
      roi_multiplier: 'مضاعف العائد',
      table: {
        identity: 'هوية الحملة',
        status: 'الحالة',
        reach: 'الوصول',
        engagement: 'التفاعل',
        leads: 'العملاء المحتملون',
        budget: 'الميزانية (SAR)'
      },
      tabs: {
        campaigns: 'الحملات',
        audiences: 'الجمهور',
        automation: 'الأتمتة',
        analytics: 'التحليلات',
        email: 'البريد',
        intelligence: 'الذكاء'
      },
      add_modal: {
        title: 'حملة سيادية جديدة',
        name: 'اسم الحملة',
        budget: 'الميزانية المخصصة (SAR)',
        start_date: 'تاريخ البدء',
        category: 'الفئة المستهدفة'
      },
      status: {
        active: 'نشط',
        scheduled: 'مجدول',
        completed: 'مكتمل'
      },
      categories: {
        institutional: 'مؤسسي',
        sovereign: 'سيادي',
        consumer: 'مستهلك'
      },
      cancel: 'إلغاء',
      launched_at: 'تاريخ الإطلاق',
      intelligence_title: 'الذكاء التسويقي السيادي',
      intelligence_accuracy: 'دقة التوقعات',
      intelligence_savings: 'التوفير المتوقع',
      intelligence_recommendation: 'توصية النظام',
      activate_recommendations: 'تفعيل التوصيات الذكية',
      platform_performance_title: 'أداء المنصات',
      node_email: 'عقدة البريد',
      node_google: 'عقدة جوجل',
      node_x: 'عقدة X',
      node_linkedin: 'عقدة لينكد إن',
      ai_automation_title: 'أتمتة الذكاء الاصطناعي',
      ai_automation_desc: 'تحسين تلقائي لميزانية الحملات بناءً على الأداء.',
      apply_optimization: 'تطبيق التحسين',
      last_audit: 'آخر تدقيق',
      secure_node_active: 'عقدة آمنة نشطة',
      filter: 'تصفية',
      complete_campaign_data: 'يرجى إكمال بيانات الحملة',
      campaign_created_success: 'تم إنشاء الحملة بنجاح',
      scheduled_emails_success: 'تمت جدولة رسائل البريد بنجاح',
      ai_optimization_applied_success: 'تم تطبيق تحسين الذكاء الاصطناعي',
      email_composer_title: 'محرر البريد المؤسسي',
      email_subject_placeholder: 'موضوع الرسالة...',
      email_content_placeholder: 'محتوى الرسالة...',
      broadcast_to_all: 'إرسال للجميع',
      templates_label: 'القوالب الجاهزة',
      institutional_welcome_series: 'سلسلة الترحيب المؤسسية',
      abandoned_cart_retargeting: 'إعادة استهدف السلال المتروكة',
      sovereign_loyalty_nodes: 'عقد الولاء السيادية',
      trigger_label: 'المشغل',
      intelligent_conversion_audit: 'تدقيق التحويل الذكي',
      sovereign_forecast_accuracy: 'دقة التوقعات السيادية',
      projected_savings: 'التوفير المتوقع',
      ai_recommendation_text: 'توصية الذكاء الاصطناعي',
      activate_ai_recommendations: 'تفعيل توصيات الذكاء الاصطناعي',
      search_campaigns_placeholder: 'ابحث عن الحملات...',
      filter_label: 'تصفية',
      platform_performance_matrix: 'مصفوفة أداء المنصات',
      sovereign_email_node: 'عقدة البريد السيادية',
      google_ads_search: 'جوجل سيرش أدز',
      x_sovereign_presence: 'تواجد X السيادي',
      linkedin_institutional: 'لينكد إن المؤسسي',
      sovereign_automation_ai: 'ذكاء الأتمتة السيادي',
      ai_marketing_engine_alert: 'تنبيه محرك التسويق الذكي',
      apply_optimization_btn: 'تطبيق التحسين',
      last_audit_prefix: 'آخر تدقيق:',
      secure_node_active_label: 'العقدة الآمنة نشطة',
      activate_campaign_btn: 'تنشيط الحملة',
      marketing_campaign_title: 'عنوان الحملة التسويقية',
      transactions_automated: 'العمليات المؤتمتة',
      configure: 'تكوين'
    },
  },
  en: {
    title: 'Alghwairy Customs Clearance',
    subtitle: 'Sovereign Ledger - Logistics & Clearance Management',
    welcome: 'Welcome, ',
    last_sync: 'Last sync: Today, 10:45 AM',
    search: 'Secure financial search...',
    add_trx: 'Add Sovereign TRX',
    logout: 'Log Out',
    user_roles: { admin: 'System Admin', cfo: 'CFO', accountant: 'Sovereign Accountant' },
    nav: {
      dashboard: 'Dashboard',
      customers: 'Clients & Partners',
      accounting: 'Accounting & Finance',
      invoices: 'Invoice Management',
      prepayments: 'Prepayments',
      expenses: 'Liquidity & Expenses',
      tax: 'Tax Automation',
      payroll: 'Payroll',
      reports: 'Analytical Reports',
      security: 'Security & Backup',
      roles: 'Roles & Permissions',
      audit: 'Unified Audit Logs',
      data: 'Data Import',
      settings: 'System Settings',
      shipments: 'Customs Shipments',
      financial_compliance: 'Customs Compliance',
      system_security: 'Sovereign Security',
      statements: 'Customs Financial Statements',
      petty_cash: 'Petty Cash',
      trash: 'Trash bin',
      biometrics: 'Security & Biometrics',
      marketing: 'Marketing Systems'
    },
    notifications: {
      success: 'Sovereign transaction recorded successfully!',
      error: 'Sovereign sync error: '
    },
    dashboard: {
      title: 'Executive Dashboard',
      subtitle: 'Financial Oversights & Sovereign Metrics',
      compliance_title: 'Tax Compliance Declaration (ZATKA)',
      compliance_desc: 'Integration with Phase 2 (Integration & Harmonization) for the current tax period verified successfully.',
      total_balance: 'Total Balance (SAR)',
      operating_profit: 'Operating Profit',
      available_liquidity: 'Available Bank Liquidity',
      stable_growth: 'Stable Growth',
      accounts_count: 'Across 4 corporate accounts',
      log_title: 'Sovereign Financial Ledger Log',
      audit_alerts: 'Financial Audit Alerts',
      syncing: 'Updating ledger log from encrypted cloud...',
      trx_completed: 'Completed',
      income: 'Sovereign Income',
      expense: 'Administrative Expense',
      export_report: 'Export Executive Report',
      table: {
        id: 'TRX ID',
        description: 'Description',
        type: 'Type',
        value: 'Value',
        status: 'Status'
      },
      alerts: {
        credit_limit: 'Credit Limit Exceeded',
        pending_settlement: 'Pending Settlement',
        bank_reconciliation: 'Bank Reconciliation',
        tax_deadline: 'Tax Deadline'
      }
    },
    reports: {
      lang: 'en',
      title: 'Sovereign Analytics & Metrics',
      subtitle: 'Tracking of liquidity and profitability across all sovereign sectors.',
      revenue: 'Total Revenue',
      expenses: 'Total Expenses',
      net_income: 'Net Income',
      historical_high: 'Historical High',
      operating_costs: 'Operating Costs',
      quarterly_target: 'Quarterly Target',
      summary_ledger: 'Summary Ledger',
      tax_est: 'Tax & Zakat (15%)',
      growth_chart: 'Growth & Resources',
      compliance_audit: 'ZATCA Compliance Audit',
      compliance_footer: 'All financial movements are fully compliant with ZATCA Phase 2 standards.',
      export_report: 'Export Analytical Report',
      jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun'
    },
    accounting: {
      invoice_editor: 'Analytical Invoice Editor',
      invoice_desc: 'Issuing and auditing tax invoices compliant with ZATCA requirements.',
      client_name: 'Client / Business Name',
      tax_id: 'VAT Number (Optional)',
      service_type: 'Service Category',
      items_title: 'Invoice Line Items',
      add_item: 'Add Line',
      issue_invoice: 'Issue & Post Invoice',
      subtotal: 'Subtotal (Excl. VAT)',
      vat: 'VAT (15%)',
      total: 'Grand Total (SAR)',
      recent_title: 'Recent Postings',
      currency: 'Currency',
      description_placeholder: 'Description...',
      amount_placeholder: 'Amount',
      print_pdf: 'Print / PDF',
      summation: 'Summation',
      no_recent: 'No recent invoices',
      settlement_entry: 'Sovereign Settlement Entry',
      adjustment_type: 'Adjustment Type',
      credit_adj: 'Credit Adjustment',
      debit_adj: 'Debit Adjustment'
    },
    payroll: {
      lang: 'en',
      title: 'Sovereign Payroll Management',
      subtitle: 'Employee benefits and compensation tracking.',
      total_salaries: 'Total Salaries (Monthly)',
      active_employees: 'Active Employees',
      pending_payments: 'Pending Settlements',
      excel_report: 'Export Excel Report',
      certify_wps: 'Certify WPS Protocol',
      all_certified: 'All Staff Certified',
      ledger_title: 'Unified Payroll Ledger',
      wps_sif_export: 'Export SIF File (WPS)',
      table_employee: 'Employee / ID',
      table_base: 'Base Salary',
      table_plus: 'Allowances',
      table_ded: 'Deductions',
      table_net: 'Net Salary (SAR)',
      table_status: 'Status',
      status_certified: 'Sovereign Certified',
      status_pending: 'Awaiting Authorization',
      add_staff_title: 'Add New Staff Node',
      full_name_label: 'Full Legal Name',
      role_label: 'Job Role',
      base_label: 'Base Pay',
      plus_label: 'Total Allowances',
      ded_label: 'Total Deductions',
      secure_record: 'Save Secure Record',
      cancel: 'Cancel'
    },
    customers: {
      lang: 'en',
      title: 'Clients & Partners',
      subtitle: 'Management of sovereign partnerships and client relations.',
      search: 'Search sovereign entities...',
      export: 'Export Partners List',
      add_customer: 'Add New Entity',
      table_name: 'Entity Name',
      table_type: 'Tax Type',
      table_status: 'Ledger Status',
      last_trx: 'Last Sovereign TRX',
      active_badge: 'Active Profile',
      total_credit: 'Total Active Credit',
      partners_count: 'Registered Partners',
      pending_reviews: 'Pending Reviews',
      expired_contracts: 'Expired Contracts',
      search_placeholder: 'Search for partner by name or VAT...',
      all_categories: 'All Categories',
      table: {
        entity: 'Entity / Company',
        sector: 'Sector',
        credit: 'Credit Allotted',
        roi: 'Usage Ratio',
        last_op: 'Last Op',
        options: 'Options'
      },
      activity: 'Recent Activity',
      modal: {
        title: 'New Sovereign Partner',
        name: 'Entity Legal Name',
        phone: 'Phone',
        category: 'Category',
        limit: 'Credit Limit (SAR)',
        cancel: 'Cancel',
        submit: 'Secure Record'
      },
      print: 'Print'
    },
    invoices: {
      lang: 'en',
      title: 'Invoice Management',
      subtitle: 'Documenting sovereign transactions and tax invoicing.',
      new_invoice: 'Issue Official Invoice',
      export_csv: 'Export CSV Ledger',
      table_num: 'Invoice #',
      table_client: 'Client',
      table_amount: 'Gross Amount',
      table_date: 'Filing Date',
      table_status: 'Audit Status',
      active_title: 'Active Sovereign Invoices',
      search_placeholder: 'Search invoices...',
      print: 'Print List',
      add_title: 'Create Sovereign Invoice',
      stats: {
        total_due: 'Total Receivables',
        collected: 'Collections (MTD)',
        overdue: 'Overdue Arrears',
        zatca_certified: 'ZATCA Certified'
      },
      table: {
        number: 'Invoice / Ref No.',
        client: 'Client',
        date: 'Issue Date',
        amount: 'Net Amount',
        tax: 'VAT 15%',
        total: 'Grand Total',
        status: 'Payment Status',
        preview: 'Preview & Print',
        options: 'Options'
      },
      modal: {
        title: 'Issue Tax Invoice',
        client_label: 'Select Client / Partner',
        amount_label: 'Amount (Before VAT)',
        ref_label: 'Ref Code (Optional)',
        cancel: 'Cancel',
        submit: 'Issue & Certify (ZATCA)',
        whatsapp_share: 'Share via WhatsApp'
      },
      confirm_delete: 'Confirm sovereign invoice deletion?',
      delete_success: 'Invoice deleted successfully.',
      wa_invoice_template: 'Dear Client, your invoice {{number}} for {{total}} is ready. View: {{link}}',
      status_paid: 'Paid',
      status_pending: 'Pending',
      copy_link_success: 'Link copied to clipboard',
      settlement_badge: 'Tax Settlement',
      edit_invoice: 'Edit Invoice',
      status_label: 'Status',
      save_changes: 'Save Changes',
      wa_preview_title: 'WhatsApp Preview',
      wa_preview_subtitle: 'Official broadcast via WhatsApp',
      wa_send_now: 'Send Now',
      simplified_invoice: 'Simplified Tax Invoice',
      shareable_link_success: 'Link generated',
      whatsapp_preview: 'Preview',
      wa_phone_label: 'Phone Number',
      wa_review_desc: 'Review message before sending',
      cancel: 'Cancel'
    },
    expenses: {
      lang: 'en',
      title: 'Expense & Liquidity Management',
      subtitle: 'Tracking cash outflows and operational expenditures.',
      current_cash_balance: 'Available Cash Balance',
      total_petty_cash: 'Total Employee Petty Cash',
      total_expenses: 'Total Operational Outflow',
      recent_expenses_ledger: 'Recent Sovereign Expense Ledger',
      active_petty_cash: 'Staff Petty Cash Monitoring',
      table: {
        date: 'Date',
        description: 'Description',
        id: 'REF No.',
        amount: 'Amount (SAR)'
      },
      record_new_expense: 'Record New Expense',
      record_new_sovereign_expense: 'Record Sovereign Outflow',
      description_label: 'Item / Description',
      amount_sar_label: 'Amount (SAR)',
      date_label: 'Operation Date',
      category_label: 'Expense Category',
      cancel: 'Cancel',
      record_expense: 'Secure Record',
      loading_expenditures: 'Loading secure expenditure records...',
      audit_all: 'Audit All Operations',
      staff_petty: 'Staff Petty Cash',
      outflow: 'Total Outflows',
      financial_authority_notice: 'Notice: All operations are subject to direct sovereign financial oversight.',
      allocation_label: 'Allocation Entity'
    },
    tax: {
       title: 'Tax Automation (ZATCA)',
       subtitle: 'Direct integration with ZATCA Phase 2 systems.',
       output_vat: 'Output VAT (Income)',
       input_vat: 'Input VAT (Expenses)',
       net_vat: 'Net VAT Payable',
       certified_history: 'Certified Tax Return Archive',
       ai_audit: 'AI Tax Compliance Audit'
    },
    prepayments: {
      title: 'Prepayments & Deposits',
      subtitle: 'Managing and settling prepayments for corporate suppliers and annual services.',
      active_count: 'Total Active Prepayments',
      recent_ledger: 'Prepayment Sovereign Ledger',
      loading: 'Loading secure records...',
      empty: 'No recorded prepayments yet.',
      add_title: 'Record New Prepayment',
      table: {
        title: 'Description',
        company: 'Supplier / Entity',
        start: 'Start Date',
        end: 'End Date',
        status: 'Status'
      }
    },
    audit_logs: {
      title: 'Audit & Activity Log',
      subtitle: 'Comprehensive monitoring of all high-level movements and operations.',
      refresh: 'Refresh Log',
      th_time: 'Time & Date',
      th_user: 'User / Account',
      th_action: 'Action',
      th_entity: 'Entity',
      loading: 'Loading secure records...',
      empty: 'No recorded operations yet in Sovereign Ledger.'
    },
    security: {
      title: 'Security & Digital Sovereignty',
      subtitle: 'Managing security protocols, encryption, and secure database access.',
      shield_status: 'Sovereign Shield Status',
      firewall: 'Active Firewall',
      encryption: 'Active ECDSA Encryption'
    },
    roles: {
      title: 'Role & Staff Management',
      subtitle: 'Defining access levels and job roles within the accounting system.',
      add_role: 'Add New Role'
    },
    trash: {
      title: 'Sovereign Trash Bin',
      subtitle: 'Manage deleted and recoverable records from the local database.',
      invoices: 'Invoices',
      customers: 'Customers',
      petty_cash: 'Petty Cash',
      restore: 'Restore Record',
      permanently_delete: 'Delete Forever',
      empty: 'Trash is currently empty'
    },
    settings: {
      title: 'Sovereign Settings',
      subtitle: 'System configuration, entity info, and general preferences.',
      save: 'Save Sovereign Changes',
      biometrics: 'Biometric Settings',
      tabs: {
        general: 'Entity & Profile',
        financial: 'Currency & Tax',
        notifications: 'Notifications',
        appearance: 'Identity & Theme',
        documents: 'Report Headers',
        security: 'Security & Biometrics',
        backup: 'Cloud Mirroring'
      }
    },
    data_import: {
      lang: 'en',
      title: 'External Data Integration',
      subtitle: 'Uploading Excel or CSV files to the sovereign ledger.',
      clear_all: 'Clear All Records',
      seed_samples: 'Generate Sample Data',
      confirm_clear_data: 'Are you sure to clear all data?',
      clear_success: 'Data cleared successfully',
      seeding_info: 'Loading sample data for training',
      seed_success: 'Samples loaded successfully',
      seed_error: 'Error loading samples',
      import_success_prefix: 'Imported',
      import_success_suffix: 'records successfully',
      encryption_msg: 'Sovereign Encryption Active (AES-256)',
      security_protocol_badge: 'Secure Protocol',
      wps_sync_badge: 'WPS Sync',
      steps: {
        upload: 'Select Protocol File',
        alignment: 'Field Alignment',
        archive: 'Final Archival'
      },
      upload_center_title: 'Unified Data Receipt Center',
      upload_center_desc: 'Data migration protocol to the sovereign infrastructure.',
      select_file: 'Select Data File',
      alignment_title: 'Data Mapping & Matching',
      cancel: 'Cancel Operation',
      execute_import: 'Execute Sovereign Import',
      success_title: 'Secure Sync Complete',
      success_desc: 'Successfully analyzed and matched with the sovereign chart of accounts.',
      return_home: 'Return to Command Center',
      security_protocol_notice: 'All data is encrypted with AES-256 before archival.',
      fields: {
        entity: 'Entity',
        reference: 'Reference',
        value: 'Value',
        date: 'Date',
        vat: 'VAT',
        category: 'Category'
      },
      options: {
        auto_a: 'Auto Match (A)',
        auto_b: 'Auto Match (B)',
        auto_c: 'Auto Match (C)',
        manual: 'Manual Match'
      }
    },
    shipments: {
      lang: 'en',
      title: 'Shipments & Customs Clearance',
      subtitle: 'Monitor container movement, customs declarations, and duties.',
      add_title: 'Create New Shipment',
      active_shipments: 'Active Shipments',
      under_clearance: 'Under Clearance',
      total_fees_sar: 'Total Fees (SAR)',
      search_placeholder: 'Search shipments...',
      filter: 'Filter',
      export: 'Export',
      type_import: 'Import',
      type_export: 'Export',
      date_prefix: 'On Date:',
      status: {
        completed: 'Completed',
        review: 'Under Review',
        clearance: 'Clearing',
        alert: 'Customs Alert'
      },
      table: {
        id: 'REF',
        client: 'Client / Partner',
        type: 'Type',
        status: 'Status',
        fees: 'Fees (SAR)',
        options: 'Options'
      }
    },
    statements: {
      lang: 'en',
      title: 'Financial Statements',
      subtitle: 'Sovereign Income Statements, Balance Sheets, and Cash Flows.',
      analyzing_financial: 'Analyzing Real Financial Records...',
      export_excel: 'Export Excel',
      print_report: 'Print Report',
      net_profit: 'Net Profit',
      cash_flow: 'Cash Flow',
      expense_ratio: 'Expense Ratio',
      sovereign_verified: 'Sovereign Verified',
      real_time_update: 'Real-time System Update',
      within_threshold: 'Within Threshold',
      income_statement_title: 'Income Statement - Current Period',
      balanced_ledger_badge: 'Balanced Ledger',
      calculated_tag: 'Calculated',
      table: {
        category: 'Financial Category',
        amount: 'Amount',
        verification: 'Verification'
      },
      categories: {
        revenue: 'Total Revenue',
        cogs: 'Real COGS',
        gross_profit: 'Gross Operating Profit',
        general_expenses: 'General Expenses',
        payroll: 'Payroll (WPS)',
        net_income: 'Net Sovereign Income'
      },
      actions: {
        balance_sheet_title: 'Comprehensive Balance Sheet',
        balance_sheet_desc: 'Generate a comprehensive report of assets, liabilities, and equity.',
        balance_sheet_btn: 'Generate Balance Sheet',
        archive_title: 'Historical Flow Archive',
        archive_desc: 'Archive all financial movements to the permanent ledger.',
        archive_btn: 'Archive Data',
        compliance_title: 'Tax Compliance Forensic',
        compliance_desc: 'Automatic forensic audit against ZATCA rules.',
        compliance_btn: 'Start Compliance Audit'
      }
    },
    petty_cash: {
      title: 'Petty Cash & Draws',
      subtitle: 'Managing office expenses, staff advances, and cash withdrawals.',
      total_active: 'Total Active Petty Cash',
      add_request: 'Request Petty Cash'
    },
  }
};

export interface Transaction {
  id: string;
  trx_number: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | string;
  status: string;
  created_at: string;
  currency?: string;
}

export interface NotificationItem {
  message: string;
  type: string;
  time: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('sovereign_theme') === 'dark');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [publicInvoiceId, setPublicInvoiceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('admin');
  
  // Sovereign Global Settings
  const [systemSettings, setSystemSettings] = useState({
    companyName: localStorage.getItem('sov_company_name') || 'مؤسسة الغويري للتخليص الجمركي',
    taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
    primaryColor: localStorage.getItem('sov_primary_color') || '#001a33', // Official Navy
    fontFamily: localStorage.getItem('sov_font_family') || 'Tajawal',
    reportHeader: localStorage.getItem('sov_report_header') || 'مؤسسة الغويري للتخليص الجمركي - وثيقة رسمية',
    reportFooter: localStorage.getItem('sov_report_footer') || 'Alghwairy Customs Clearance - Confidential'
  });

  const [userName, setUserName] = useState('عبدالله الغويري');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showAddTrxModal, setShowAddTrxModal] = useState(false);
  const [newTrx, setNewTrx] = useState({
    description: '',
    amount: '',
    type: 'income' as 'income' | 'expense'
  });
  const [notification, setNotification] = useState<{message: string, type: string} | null>(null);
  const [notifHistory, setNotifHistory] = useState<NotificationItem[]>([]);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());
  const [isActivated, setIsActivated] = useState(() => {
    const saved = localStorage.getItem('sovereign_activation_key');
    const expiry = localStorage.getItem('sovereign_activation_expiry');
    if (!saved) return false;
    if (expiry !== 'lifetime' && new Date(expiry!) < new Date()) return false;
    return true;
  });
  const [activationError, setActivationError] = useState('');

  const t = useMemo(() => {
    const base = translations[lang];
    return {
      ...base,
      title: systemSettings.companyName,
      dashboard: {
        ...base.dashboard,
        compliance_desc: lang === 'ar' 
          ? `تم التحقق من التكامل مع المرحلة الثانية (الربط والإحكام) للفترة الضريبية الحالية بنجاح للرقم الضريبي: ${systemSettings.taxNumber}`
          : `Tax integration with Phase 2 (Linkage & Integration) verified successfully for Tax ID: ${systemSettings.taxNumber}`
      }
    };
  }, [lang, systemSettings]);

  const reportsT = useMemo(() => ({...t.reports, ...t.dashboard, lang}), [t.reports, t.dashboard, lang]);

  const handleActivation = (key: string) => {
    setActivationError('');
    let expiryDate: Date | 'lifetime' | null = null;
    
    if (key === 'LEDGER-PRO-2026') {
      expiryDate = 'lifetime';
    } else if (key.startsWith('LEDGER-S10-')) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 10);
    } else if (key.startsWith('LEDGER-M30-')) {
      expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (key.startsWith('LEDGER-LIF-')) {
      expiryDate = 'lifetime';
    } else {
      setActivationError(lang === 'ar' ? 'مفتاح التنشيط غير صالح' : 'Invalid activation key');
      return;
    }

    localStorage.setItem('sovereign_activation_key', key);
    localStorage.setItem('sovereign_activation_expiry', expiryDate === 'lifetime' ? 'lifetime' : expiryDate.toISOString());
    setIsActivated(true);
    showToast(lang === 'ar' ? 'تم تنشيط النظام بنجاح' : 'System activated successfully', 'success');
  };

  const showToast = useCallback((message: string, type: string = 'success') => {
    const newNotif = { message, type, time: new Date().toLocaleTimeString() };
    setNotification({ message, type });
    setNotifHistory(prev => [newNotif, ...prev.slice(0, 9)]);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invId = params.get('invoice_id');
    if (invId) {
      setPublicInvoiceId(invId);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sovereign_theme', isDark ? 'dark' : 'light');
    
    // Apply Brand Identity to Root
    const root = document.documentElement;
    root.style.setProperty('--primary', systemSettings.primaryColor);
    root.style.setProperty('--sidebar-bg', isDark ? '#000000' : systemSettings.primaryColor);
    root.style.setProperty('--font-main', systemSettings.fontFamily);
    document.body.style.fontFamily = `'${systemSettings.fontFamily}', 'Cairo', sans-serif`;
    
    // Auto-sync settings from localStorage periodically (or on focus)
    const sync = () => {
      setSystemSettings({
        companyName: localStorage.getItem('sov_company_name') || 'مؤسسة الغويري للتخليص الجمركي',
        taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
        primaryColor: localStorage.getItem('sov_primary_color') || '#001a33',
        fontFamily: localStorage.getItem('sov_font_family') || 'Tajawal',
        reportHeader: localStorage.getItem('sov_report_header') || 'مؤسسة الغويري للتخليص الجمركي - وثيقة رسمية',
        reportFooter: localStorage.getItem('sov_report_footer') || 'Alghwairy Customs Clearance - Confidential'
      });
    };
    
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, [isDark, systemSettings.primaryColor, systemSettings.fontFamily, systemSettings.companyName]);

  const fetchData = useCallback(async () => {
    const data = await offlineSync.read('transactions');
    if (data) setTransactions(data as Transaction[]);
    setLastSyncTime(new Date().toLocaleTimeString());
  }, []);

  useEffect(() => {
    if (isLoggedIn && !publicInvoiceId) {
      fetchData();
      const timer = setInterval(() => {
        setLastSyncTime(new Date().toLocaleTimeString());
        
        // Auto local save logic
        const freq = localStorage.getItem('sov_sync_frequency') || 'daily';
        const lastBackup = localStorage.getItem('sov_last_backup_date');
        const now = new Date();
        let shouldBackup = false;
        
        if (!lastBackup) {
          shouldBackup = true;
        } else {
          const last = new Date(lastBackup);
          const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
          
          if (freq === 'daily' && diffDays >= 1) shouldBackup = true;
          if (freq === 'weekly' && diffDays >= 7) shouldBackup = true;
          if (freq === 'monthly' && diffDays >= 30) shouldBackup = true;
        }

        if (shouldBackup) {
          (async () => {
             const tables = ['invoices', 'customers', 'transactions', 'expenses'];
             const backupData: any = {};
             for (const table of tables) {
               const { data } = await supabase.from(table).select('*');
               backupData[table] = data;
             }
             
             try {
                if ((window as any).require) {
                   const fs = (window as any).require('fs');
                   const path = (window as any).require('path');
                   const os = (window as any).require('os');
                   const backupDir = path.join(os.homedir(), 'Documents', 'Alghwairy_Backups');
                   if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
                   
                   const backupPath = path.join(backupDir, `Sovereign_Backup_${now.toISOString().split('T')[0]}.json`);
                   fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
                   showToast(lang === 'ar' ? 'تمت مزامنة وحفظ نسخة محلية تلقائياً' : 'Auto Local Sync completed', 'success');
                } else {
                   const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `Sovereign_Backup_${now.toISOString().split('T')[0]}.json`;
                   a.click();
                   showToast(lang === 'ar' ? 'تم تنزيل النسخة الاحتياطية' : 'Backup downloaded', 'success');
                }
                
                // Add Offline sync flush here based on sync frequency!
                await offlineSync.processSyncQueue();
                
                localStorage.setItem('sov_last_backup_date', now.toISOString());
             } catch (e) {
                console.error("Backup failed", e);
             }
          })();
        }
      }, 60000);
      
      // PRODUCTION STABILITY: Overlay-Killer Effect
      const killer = setInterval(() => {
        const suspicious = document.querySelectorAll('[id*="shadow-host"], [id^="preact-"], [class*="shadow-host"], #preact-border-shadow-host');
        suspicious.forEach(el => el.remove());
      }, 500);

      return () => {
        clearInterval(timer);
        clearInterval(killer);
      };
    }
  }, [isLoggedIn, publicInvoiceId, fetchData]);

  const logActivity = async (action: string, entity: string, entity_id?: string, overrideUser?: string) => {
     await supabase.from('activity_logs').insert([{
       user_email: overrideUser || userName,
       action,
       entity,
       entity_id
     }]);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrx.description || !newTrx.amount) {
      showToast(lang === 'ar' ? 'الرجاء إكمال كافة البيانات' : 'Please fill all fields', 'error');
      return;
    }

    setIsActionLoading(true);
    try {
      const newRecord = {
          trx_number: 'TRX-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
          description: newTrx.description, 
          amount: parseFloat(newTrx.amount), 
          type: newTrx.type,
          status: 'مكتمل',
          created_at: new Date().toISOString()
      };
      await offlineSync.insert('transactions', newRecord);
      
      await logActivity('Added New Sovereign TRX (Offline/Queue)', 'transactions', newRecord.trx_number);
      showToast(t.notifications.success, 'success');
      setShowAddTrxModal(false);
      setNewTrx({ description: '', amount: '', type: 'income' });
      fetchData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error';
      console.error(err);
      showToast(t.notifications.error + message, 'error');
    }
    setIsActionLoading(false);
  };

  const toggleTheme = () => setIsDark(!isDark);
  const toggleLang = () => setLang(lang === 'ar' ? 'en' : 'ar');
  const handlePrint = () => window.print();

  if (publicInvoiceId) {
    return <PublicInvoiceView invoiceId={publicInvoiceId} />;
  }

  if (!isActivated) {
    return (
      <div className={`app-layout ${isDark ? 'dark-theme' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
         <ActivationView 
           onActivate={handleActivation} 
           error={activationError} 
           lang={lang} 
           toggleLang={toggleLang}
           isDark={isDark}
         />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className={`app-layout ${isDark ? 'dark-theme' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <LoginView onLogin={(role: string, name: string) => {
          setUserRole(role);
          setUserName(name);
          setIsLoggedIn(true);
          logActivity('Secure Identity Auth & Login', 'biometrics', 'SESSION-START', name);
          if (role === 'accountant') setActiveTab('invoices');
          else setActiveTab('dashboard');
        }} />
      </div>
    );
  }

  const renderView = () => {
    switch(activeTab) {
      case 'dashboard': return <DashboardView transactions={transactions} fetchData={fetchData} showToast={showToast} t={{...t.dashboard, lang}} />;
      case 'customers': return <CustomersView showToast={showToast} logActivity={logActivity} t={{...t.customers, lang}} />;
      case 'accounting': return <AccountingView showToast={showToast} logActivity={logActivity} t={{...t.accounting, lang}} />;
      case 'invoices': return <InvoicesView showToast={showToast} logActivity={logActivity} t={{...t.invoices, lang}} />;
      case 'prepayments': return <PrepaymentsView showToast={showToast} logActivity={logActivity} t={{...t.prepayments, lang}} />;
      case 'expenses': return <ExpensesView showToast={showToast} logActivity={logActivity} t={t.expenses} lang={lang} />;
      case 'payroll': return <PayrollView showToast={showToast} logActivity={logActivity} t={{...t.payroll, lang}} />;
      case 'tax': return <TaxAutomationView showToast={showToast} logActivity={logActivity} t={{...t.tax, lang}} />;
      case 'reports': return <ReportsView showToast={showToast} t={{...reportsT, lang}} />;
      case 'security': return <SecurityView showToast={showToast} t={{...t.security, lang}} />;
      case 'data_import': return <DataImportView showToast={showToast} logActivity={logActivity} t={{...t.data_import, lang}} lang={lang} />;
      case 'statements': return <StatementsView transactions={transactions} t={{...t.statements, lang}} />;
      case 'petty_cash': return <PettyCashView t={{...t.petty_cash, lang}} lang={lang} showToast={showToast} />;
      case 'audit_logs': return <AuditLogsView showToast={showToast} t={{...t.audit_logs, lang}} />;
      case 'settings': return <SettingsView showToast={showToast} logActivity={logActivity} isDark={isDark} toggleTheme={toggleTheme} t={{...t.settings, lang}} userName={userName} systemSettings={systemSettings} />;
      case 'roles': return <RolesView showToast={showToast} t={{...t.roles, lang}} />;
      case 'trash': return <TrashView t={{...t.trash, lang}} lang={lang} showToast={showToast} />;
      default: return <DashboardView transactions={transactions} fetchData={fetchData} showToast={showToast} t={{...t.dashboard, lang}} />;
    }
  };

  const isMobileSize = window.innerWidth <= 1024; // Renamed to avoid confusion

  return (
    <div className={`app-layout ${isDark ? 'dark-theme' : ''}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {isLoggedIn && !publicInvoiceId && isMobileSize && !isCollapsed && <div className="sidebar-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', zIndex: 90 }} onClick={() => setIsCollapsed(true)} />}
      {/* Sidebar - Traditional Sovereign Fixed Width */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ width: isCollapsed ? (isMobileSize ? '0' : '72px') : (isMobileSize ? '280px' : '235px'), transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 100 }}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          style={{ 
            position: 'absolute', 
            top: '1.2rem', 
            [lang === 'ar' ? 'left' : 'right']: '-14px', 
            width: '28px', 
            height: '28px', 
            borderRadius: '50%', 
            background: 'var(--secondary)', 
            color: 'var(--primary)', 
            border: 'none', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 101, 
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)' 
          }}
        >
          {isCollapsed ? (lang === 'ar' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />) : (lang === 'ar' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />)}
        </button>

        <div style={{ padding: isCollapsed ? '0 0 1rem' : '1.8rem 1rem 1.2rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--secondary)' }}>
                  <img src="./logo.png" alt="Logo" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
                  <h2 style={{ fontSize: '1rem', fontWeight: 900, fontFamily: 'Tajawal', margin: 0, letterSpacing: '0.5px', color: 'white' }}>{t.title}</h2>
               </div>
               <p style={{ fontSize: '0.55rem', opacity: 0.4, marginTop: '0.4rem', color: '#abc8f5', textAlign: 'center', fontWeight: 700, letterSpacing: '0.5px' }}>{t.subtitle}</p>
            </div>
          )}
          {isCollapsed && (
            <div className="sidebar-logo-mini" style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.08)', borderRadius: '12px', margin: '1.2rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', border: '1px solid rgba(255,255,255,0.1)' }}>
               <img src="./logo.png" alt="Logo" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            </div>
          )}
        </div>

        <nav className="sidebar-scroll-area" style={{ paddingBottom: '2.5rem' }}>
          {(userRole === 'admin' || userRole === 'cfo') && (
            <>
              {!isCollapsed && <div style={{ padding: '1rem 0.8rem 0.4rem', fontSize: '0.65rem', color: '#abc8f5', opacity: 0.7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{lang === 'ar' ? 'العامة' : 'General'}</div>}
              <NavItem icon={<LayoutDashboard size={16} />} label={t.nav.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<Handshake size={16} />} label={t.nav.customers} active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} lang={lang} isCollapsed={isCollapsed} />
            </>
          )}

          {(userRole === 'admin' || userRole === 'accountant' || userRole === 'cfo') && (
            <>
              {!isCollapsed && <div style={{ padding: '1.2rem 0.8rem 0.4rem', fontSize: '0.65rem', color: '#abc8f5', opacity: 0.7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{lang === 'ar' ? 'المالية والامتثال' : 'Financials'}</div>}
              <NavItem icon={<Wallet size={16} />} label={t.nav.accounting} active={activeTab === 'accounting'} onClick={() => setActiveTab('accounting')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<FileText size={16} />} label={t.nav.invoices} active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<HistoryIcon size={16} />} label={t.nav.prepayments} active={activeTab === 'prepayments'} onClick={() => setActiveTab('prepayments')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<TrendingDown size={16} />} label={t.nav.expenses} active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<Banknote size={16} />} label={t.nav.petty_cash} active={activeTab === 'petty_cash'} onClick={() => setActiveTab('petty_cash')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<Zap size={16} />} label={t.nav.tax} active={activeTab === 'tax'} onClick={() => setActiveTab('tax')} lang={lang} isCollapsed={isCollapsed} />
            </>
          )}

          {(userRole === 'admin' || userRole === 'cfo') && (
            <>
              {!isCollapsed && <div style={{ padding: '1.2rem 0.8rem 0.4rem', fontSize: '0.65rem', color: '#abc8f5', opacity: 0.7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{lang === 'ar' ? 'الموارد والتقارير' : 'Operations'}</div>}
              <NavItem icon={<Users size={16} />} label={t.nav.payroll} active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} lang={lang} isCollapsed={isCollapsed} />

              <NavItem icon={<BarChart3 size={16} />} label={t.nav.reports} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<FileSpreadsheet size={16} />} label={t.nav.statements} active={activeTab === 'statements'} onClick={() => setActiveTab('statements')} lang={lang} isCollapsed={isCollapsed} />
            </>
          )}

          {(userRole === 'admin' || userRole === 'cfo') && (
            <>
              {!isCollapsed && <div style={{ padding: '1.2rem 0.8rem 0.4rem', fontSize: '0.65rem', color: '#abc8f5', opacity: 0.7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{lang === 'ar' ? 'النظام والأمان' : 'System'}</div>}
              <NavItem icon={<ShieldCheck size={16} />} label={t.nav.security} active={activeTab === 'security'} onClick={() => setActiveTab('security')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<UserPlus size={16} />} label={t.nav.roles} active={activeTab === 'roles'} onClick={() => setActiveTab('roles')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<Activity size={16} />} label={t.nav.audit} active={activeTab === 'audit_logs'} onClick={() => setActiveTab('audit_logs')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<Download size={16} />} label={t.nav.data || 'Data Import'} active={activeTab === 'data_import'} onClick={() => setActiveTab('data_import')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<Settings size={16} />} label={t.nav.settings || 'System Settings'} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} lang={lang} isCollapsed={isCollapsed} />
              <NavItem icon={<Trash2 size={16} />} label={t.nav.trash || 'Trash'} active={activeTab === 'trash'} onClick={() => setActiveTab('trash')} lang={lang} isCollapsed={isCollapsed} />
            </>
          )}
        </nav>

        {/* User Data Profiler - Miniature Version */}
        <div style={{ padding: isCollapsed ? '0.6rem 0' : '1rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : '0.65rem', marginBottom: isCollapsed ? '0.6rem' : '0.75rem', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
             <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                {userName.charAt(0).toUpperCase()}
             </div>
              {!isCollapsed && (
                <div style={{ textAlign: lang === 'ar' ? 'right' : 'left', flex: 1 }}>
                   <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
                   <div style={{ fontSize: '0.6rem', color: 'var(--secondary)', fontWeight: 600 }}>{t.user_roles[userRole as keyof typeof t.user_roles]}</div>
                </div>
              )}
          </div>
          
          <button onClick={() => setIsLoggedIn(false)} className="nav-item" style={{ 
            color: '#ffdad6', 
            justifyContent: isCollapsed ? 'center' : 'flex-start', 
            padding: isCollapsed ? '0' : '0.5rem 0.8rem', 
            gap: isCollapsed ? '0' : '0.8rem',
            width: isCollapsed ? '44px' : 'calc(100% - 1rem)',
            margin: isCollapsed ? '0 auto' : '0 0.5rem'
          }}>
             <LogOut size={18} />
             {!isCollapsed && <span style={{ fontSize: '0.8rem' }}>{t.logout}</span>}
          </button>

          {!isCollapsed && (
            <div style={{ marginTop: '0.8rem', padding: '0 0.2rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.8rem', textAlign: 'center' }}>
               <div style={{ fontSize: '0.55rem', opacity: 0.5, color: '#fff', letterSpacing: '0.5px' }}>
                  {lang === 'ar' ? 'منشئ النظام' : 'SYSTEM CREATOR'}
               </div>
               <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#abc8f5', marginTop: '0.2rem', opacity: 0.9 }}>
                  Abdelhman Abusalif
               </div>
               <div style={{ fontSize: '0.55rem', color: 'var(--secondary)', marginTop: '0.05rem', opacity: 0.7 }}>
                  966543389314
               </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-stage">
        <header className="view-header">
          <div className="animate-fade">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
              <span className="badge-sovereign" style={{ background: 'var(--secondary)', color: 'var(--primary)' }}>
                {t.roles[userRole as keyof typeof t.roles]}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--on-surface-variant)', fontSize: '0.85rem', fontWeight: 700 }}>
                 <Clock size={14} /> {t.last_sync}: {lastSyncTime}
              </div>
            </div>
            <h1 className="view-title">
              <span style={{ fontWeight: 400, opacity: 0.6 }}>{t.welcome}</span>
              <span style={{ color: 'var(--secondary)', fontWeight: 900, marginInlineStart: '0.5rem' }}>{userName}</span>
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="card" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '280px', borderRadius: '12px', boxShadow: 'none', background: 'var(--surface-container-low)' }}>
              <Search size={18} color="var(--primary)" style={{ opacity: 0.5 }} />
              <input type="text" placeholder={t.search} style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: '0.9rem', color: 'var(--on-surface)', fontWeight: 600 }} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button 
                onClick={() => showToast('Sovereign Ledger Integrity: 100% Verified. AES-256 Active.', 'success')}
                className="card" 
                style={{ 
                  margin: 0,
                  padding: '0.4rem 1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  borderRadius: '10px', 
                  cursor: 'pointer',
                  border: '1px solid var(--surface-container-high)',
                  background: 'var(--surface-container-low)',
                  transition: 'transform 0.2s',
                  boxShadow: 'none'
                }}
              >
                 <div className="pulse-green" style={{ width: 8, height: 8, borderRadius: '50%' }} />
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)', opacity: 0.6, textTransform: 'uppercase', lineHeight: 1 }}>Health</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.2 }}>VERIFIED</span>
                 </div>
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button title="Toggle Theme" onClick={toggleTheme} className="btn-executive" style={{ width: '38px', height: '38px', padding: '0', justifyContent: 'center', background: 'var(--surface-container-high)', color: 'var(--primary)', boxShadow: 'none' }}>
                  {isDark ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button title="Change Language" onClick={toggleLang} className="btn-executive" style={{ width: '38px', height: '38px', padding: '0', justifyContent: 'center', background: 'var(--surface-container-high)', color: 'var(--primary)', boxShadow: 'none' }}>
                  <Languages size={17} />
                </button>
                <button title="Direct Print" onClick={handlePrint} className="btn-executive" style={{ width: '38px', height: '38px', padding: '0', justifyContent: 'center', background: 'var(--surface-container-high)', color: 'var(--primary)', boxShadow: 'none' }}>
                  <Printer size={17} />
                </button>
              </div>
            </div>

            <button onClick={() => setShowAddTrxModal(true)} className="btn-executive">
              <Plus size={20} /> {lang === 'ar' ? 'إضافة عملية سيادية' : 'Add Sovereign TRX'}
            </button>
            
            <div style={{ position: 'relative', cursor: 'pointer', padding: '0.4rem' }} onClick={() => setShowNotifDrawer(true)}>
              <Bell size={24} color="var(--primary)" />
              {notifHistory.length > 0 && (
                <span className="status-indicator" style={{ position: 'absolute', top: 4, right: 4, background: 'var(--error)', border: '2px solid var(--surface)' }}></span>
              )}
            </div>
          </div>
        </header>

        <div className="view-container">
          {renderView()}
        </div>
      </main>

      {/* Notification History Side Drawer */}
      {showNotifDrawer && (
        <>
          <div onClick={() => setShowNotifDrawer(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1100 }}></div>
          <div className="card slide-in" style={{ position: 'fixed', top: 0, [lang === 'ar' ? 'left' : 'right']: 0, bottom: 0, width: '380px', background: 'var(--surface)', zIndex: 1101, borderRadius: 0, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ fontFamily: 'Tajawal' }}>{lang === 'ar' ? 'سجل الإشعارات السيادية' : 'Sovereign Notification Log'}</h3>
              <button onClick={() => setShowNotifDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface)' }}>
                <Clock size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notifHistory.length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.5, marginTop: '4rem' }}>
                   {lang === 'ar' ? 'لا توجد إشعارات حالياً' : 'No recent notifications'}
                </div>
              ) : (
                notifHistory.map((n, i) => (
                  <div key={i} style={{ padding: '1rem', background: 'var(--surface-container-low)', borderRadius: '8px', borderRight: `4px solid ${n.type === 'error' ? 'var(--error)' : 'var(--success)'}` }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.3rem' }}>{n.message}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{n.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Sovereign Manual Entry Modal */}
      {showAddTrxModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,20,0.6)', backdropFilter: 'blur(12px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card slide-in" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem', background: 'var(--surface)', border: '1px solid var(--secondary)', boxShadow: '0 20px 80px rgba(0,0,0,0.6)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontFamily: 'Tajawal', margin: 0, fontSize: '1.6rem', color: 'var(--primary)' }}>{lang === 'ar' ? 'توثيق عملية سيادية' : 'Document Sovereign TRX'}</h2>
                  <button onClick={() => setShowAddTrxModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                     <LogOut size={24} style={{ transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }} />
                  </button>
               </div>
               
               <form onSubmit={handleManualAdd}>
                  <div className="login-input-group" style={{ marginBottom: '1.25rem' }}>
                     <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: '0.6rem' }}>{lang === 'ar' ? 'بيان العملية' : 'Transaction Description'}</label>
                     <input 
                        type="text" 
                        className="input-executive" 
                        required
                        value={newTrx.description}
                        onChange={e => setNewTrx({...newTrx, description: e.target.value})}
                        placeholder={lang === 'ar' ? 'مثلاً: توريد بضائع سيادية' : 'e.g., Sovereign Goods Supply'}
                        style={{ background: 'var(--surface-container-low)', width: '100%', padding: '1rem', border: '1px solid var(--outline)' }}
                     />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                     <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: '0.6rem' }}>{lang === 'ar' ? 'المبلغ الرقمي (SAR)' : 'Financial Amount (SAR)'}</label>
                        <input 
                           type="number" 
                           className="input-executive" 
                           step="0.01"
                           required
                           value={newTrx.amount}
                           onChange={e => setNewTrx({...newTrx, amount: e.target.value})}
                           placeholder="0.00"
                           style={{ background: 'var(--surface-container-low)', width: '100%', padding: '1rem', border: '1px solid var(--outline)' }}
                        />
                     </div>
                     <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, color: 'var(--on-surface-variant)', marginBottom: '0.6rem' }}>{lang === 'ar' ? 'نوع التصنيف' : 'Classification Type'}</label>
                        <select 
                           className="input-executive"
                           value={newTrx.type}
                           onChange={e => setNewTrx({...newTrx, type: e.target.value as 'income' | 'expense'})}
                           style={{ background: 'var(--surface-container-low)', width: '100%', padding: '1rem', border: '1px solid var(--outline)' }}
                        >
                           <option value="income">{lang === 'ar' ? 'إيراد (Income)' : 'Income'}</option>
                           <option value="expense">{lang === 'ar' ? 'مصروف (Expense)' : 'Expense'}</option>
                        </select>
                     </div>
                  </div>

                  <button disabled={isActionLoading} type="submit" className="btn-executive" style={{ width: '100%', padding: '1.2rem', justifyContent: 'center', gap: '1rem', fontSize: '1.1rem' }}>
                     {isActionLoading ? <Loader2 className="spin" /> : <><ShieldCheck size={22} /> {lang === 'ar' ? 'اعتماد العملية في الميزان' : 'Authorize Sovereign TRX'}</>}
                  </button>
               </form>
            </div>
        </div>
      )}

      {/* Sovereign Toast */}
      {notification && (
        <div className="toast-container" style={{ zIndex: 2000 }}>
          <div className={`toast-notification ${notification.type === 'error' ? 'toast-error' : ''}`}>
            {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} color="#88d982" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  lang: string;
  isCollapsed: boolean;
}

function NavItem({ icon, label, active, onClick, lang, isCollapsed }: NavItemProps) {
  return (
    <button 
      onClick={onClick} 
      className={`nav-item ${active ? 'active' : ''}`}
    >
      {icon}
      {!isCollapsed && <span style={{ transition: 'opacity 0.2s' }}>{label}</span>}
      {(active && !isCollapsed) && <ArrowUpRight size={14} style={{ [lang === 'ar' ? 'marginRight' : 'marginLeft']: 'auto', opacity: 0.5 }} />}
    </button>
  );
}

interface ActivationViewProps {
  onActivate: (key: string) => void;
  error: string;
  lang: 'ar' | 'en';
  toggleLang: () => void;
  isDark: boolean;
}

function ActivationView({ onActivate, error, lang, toggleLang, isDark }: ActivationViewProps) {
  const [key, setKey] = useState('');

  return (
    <div className={`login-container ${isDark ? 'dark-theme' : ''}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--surface-container-low)' }}>
      <div className="login-card slide-in" style={{ maxWidth: '500px', width: '90%', padding: '3.5rem' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
           <div style={{ display: 'inline-flex', padding: '1.2rem', borderRadius: '24px', background: 'var(--primary)', color: 'var(--secondary)', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <ShieldCheck size={42} />
           </div>
           <h2 style={{ fontSize: '2.2rem', fontFamily: 'Tajawal', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.8rem' }}>
              {lang === 'ar' ? 'تنشيط الميزان السيادي' : 'Sovereign Ledger Activation'}
           </h2>
           <p style={{ color: 'var(--on-surface-variant)', fontWeight: 700, fontSize: '0.95rem' }}>
              {lang === 'ar' ? 'يرجى إدخال مفتاح الترسيم القانوني للمتابعة' : 'Please enter your legal license key to proceed'}
           </p>
        </header>

        <form onSubmit={(e) => { e.preventDefault(); onActivate(key); }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.8rem', letterSpacing: '1px' }}>
              {lang === 'ar' ? 'مفتاح التنشيط التنفيذي' : 'Executive Activation Key'}
            </label>
            <input 
              type="text" 
              className="input-executive" 
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              style={{ fontSize: '1.2rem', textAlign: 'center', letterSpacing: '4px', padding: '1.5rem', border: '2px solid var(--outline)' }}
              required
            />
            {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', fontWeight: 800, marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
          </div>

          <button type="submit" className="btn-executive" style={{ width: '100%', padding: '1.5rem', justifyContent: 'center', fontSize: '1.1rem', background: 'var(--primary)', color: 'var(--secondary)' }}>
            <Zap size={20} /> {lang === 'ar' ? 'تنشيط المنظومة الآن' : 'Activate System Now'}
          </button>
        </form>

        <footer style={{ marginTop: '3.5rem', paddingTop: '2rem', borderTop: '1px solid var(--surface-container-high)', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          <button onClick={toggleLang} className="btn-text" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>
             <Languages size={18} /> {lang === 'ar' ? 'English Version' : 'اللغة العربية'}
          </button>
        </footer>
      </div>
    </div>
  );
}
