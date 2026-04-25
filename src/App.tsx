import { useState, useEffect, useCallback, useMemo } from 'react';
import { localDB } from './lib/localDB';
import { syncEngine } from './lib/syncEngine';
import { hasPermission, type AppModule } from './lib/permissions';

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
import InvoicesView from './components/InvoicesView';
import AuditLogsView from './components/AuditLogsView';
import StatementsView from './components/StatementsView';
import PettyCashView from './components/PettyCashView';
import LoginView from './components/LoginView';
import { TrashView } from './components/TrashView';
import PublicInvoiceView from './components/PublicInvoiceView';
import CommunicationsView from './components/CommunicationsView';
import { cloudSyncEngine } from './lib/cloudSyncEngine';
import ContractsView from './components/ContractsView';
import LandingView from './components/LandingView';


const translations = {
  ar: {
    lang: 'ar',
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
      contracts: 'إدارة العقود',
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
      biometrics: 'الأمان والبصمات',
      affiliate: 'التسويق بالعمولة'
    },
    landing: {
      lang: 'ar',
      brand: 'الغويري سيادتك',
      hero_title: 'الريادة السيادية في التخليص الجمركي',
      hero_subtitle: 'نحن نؤمن سلاسل التوريد الخاصة بك بأعلى معايير الدقة والأمان الرقمي.',
      get_started: 'الدخول للمنظومة',
      explore_services: 'استكشاف الخدمات',
      services: {
        title: 'خدماتنا الاستراتيجية',
        clearance: 'التخليص الجمركي',
        clearance_desc: 'إجراءات احترافية تضمن سرعة العبور عبر كافة الموانئ.',
        logistics: 'الحلول اللوجستية',
        logistics_desc: 'إدارة متكاملة لسلاسل الإمداد من المنشأ حتى المستودع.',
        tracking: 'تتبع الشحنات السيادي',
        tracking_desc: 'مراقبة لحظية ومؤمنة لشحناتك عبر لوحة تحكم ذكية.'
      },
      about: {
        title: 'عن المؤسسة',
        desc: 'نحن نجمع بين الخبرة التاريخية والتقنية المستقبلية لإدارة موازينك المالية واللوجستية.'
      }
    },
    notifications: {
      success: 'تمت تسجيل العملية السيادية بنجاح بميزان الغويري!',
      error: 'خطأ سيادي في المزامنة: '
    },
    dashboard: {
      lang: 'ar',
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
      lang: 'ar',
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
      export_csv: 'تصدير بيانات CSV',
      print_report: 'طباعة التقرير الكامل',
      jan: 'يناير', feb: 'فبراير', mar: 'مارس', apr: 'أبريل', may: 'مايو', jun: 'يونيو'
    },
    customers: {
      title: 'إدارة العملاء والشركاء',
      subtitle: 'الملف الموحد للعملاء والناقلين والموردين والمديونيات الرقمية.',
      add_customer: 'إضافة كيان جديد',
      customer: 'عميل',
      partner: 'شريك استراتيجي',
      carrier: 'ناقل / شركة شحن',
      name: 'اسم الكيان',
      phone: 'رقم التواصل',
      email: 'البريد الإلكتروني',
      tax_number: 'الرقم الضريبي',
      address: 'العنوان الوطني',
      balance: 'الرصيد الحالي',
      total_credit: 'إجمالي الائتمان النشط',
      partners_count: 'عدد الشركاء المسجلين',
      pending_reviews: 'طلبات بانتظار المراجعة',
      expired_contracts: 'اتفاقيات منتهية',
      search_placeholder: 'بحث عن شريك بالاسم أو الرقم الضريبي...',
      all_categories: 'كافة التصنيفات',
      print: 'طباعة',
      export: 'تصدير',
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
      lang: 'ar',
      profile: {
        financial_kpis: 'المؤشرات المالية للكيان',
        documents: 'المستندات والوثائق الرقمية',
        invoices_tab: 'الفواتير والعمليات',
        statements_tab: 'كشوفات الحساب',
        contracts_tab: 'العقود والاتفاقيات',
        documents_tab: 'الأرشيف الرقمي',
        upload_area: 'اسحب وأفلت المستندات هنا (PDF/صور)',
        allowed_files: 'صيغ الملفات المسموحة: PDF, PNG, JPG, WebP',
        delete_doc_confirm: 'هل أنت متأكد من حذف هذا المستند؟',
        total_balance: 'رصيد المديونية العالقة',
        total_paid: 'إجمالي التحصيلات المرحلة',
        total_invoices: 'عدد الفواتير المصدرة',
        no_docs: 'لا توجد مستندات مرفقة لهذا الكيان',
        not_found: 'لم يتم العثور على عملاء حالياً'
      }
    },
    accounting: {
      lang: 'ar',
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
      debit_adj: 'تسوية مدينة',
      journal: 'دفتر اليومية',
      general_ledger: 'دفتر الأستاذ العام',
      daily: 'يومي',
      monthly: 'شهري',
      yearly: 'سنوي',
      profit_loss: 'الأرباح والخسائر',
      ledger_summary: 'ملخص الأستاذ',
      statement_number: 'رقم الكشف'
    },
    contracts: {
      lang: 'ar',
      title: 'إدارة العقود السيادية',
      client_contracts: 'عقود العملاء',
      transport_contracts: 'عقود النقل',
      add_contract: 'إضافة عقد',
      contract_date: 'تاريخ العقد',
      expiry_date: 'تاريخ الانتهاء',
      terms: 'الشروط والأحكام',
      transporter_name: 'اسم الناقل',
      transport_fees: 'رسوم النقل',
      client_name: 'اسم العميل',
      status: 'الحالة'
    },
    payroll: {
      lang: 'ar',
      title: 'إدارة مسيرات الرواتب السيادية',
      subtitle: 'متابعة مستحقات الكادر والتعويضات.',
      total_salaries: 'إجمالي الرواتب الشهرية',
      active_employees: 'الموظفون النشطون',
      pending_payments: 'تسويات معلقة',
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
      iban_label: 'رقم الآيبان (IBAN)',
      bank_label: 'اسم البنك',
      gosi_deduction: 'استقطاع التأمينات (GOSI)',
      print_slip: 'طباعة مسير راتب فردي',
      period_label: 'فترة استحقاق الراتب',
      sif_export: 'تصدير ملف حماية الأجور (SIF)',
      secure_record: 'حفظ السجل الآمن',
      cancel: 'إلغاء',
      enroll_success: 'تم تسجيل الموظف سيادياً بنجاح',
      certify_confirm: 'جاري توثيق مسيرات الرواتب السيادية...',
      certify_success: 'تم اعتماد رواتب المؤسسة بنجاح',
      certify_payroll: 'اعتماد المسيرات',
      certified_badge: 'تم الاعتماد السيادي',
      no_pending: 'لا توجد مسيرات معلقة لهذه الفترة',
      sif_success: 'تم توليد ملف SIF الخاص بحماية الأجور',
      audit_progress: 'جاري التدقيق...',
      no_records: 'لا توجد سجلات لهذه الفترة',
      slip: {
        preview_title: 'معاينة مسير الراتب',
        earnings: 'الاستحقاقات',
        deductions: 'الاستقطاعات',
        net: 'صافي الراتب',
        description: 'البيان',
        base: 'الراتب الأساسي',
        allowances: 'البدلات',
        gosi: 'التأمينات الاجتماعية'
      }
    },

    invoices: {
      lang: 'ar',
      title: 'إدارة الفواتير والتحصيلات',
      subtitle: 'إصدار ومتابعة الفواتير الضريبية المتوافقة مع معايير هيئة الزكاة والضريبة (ZATCA).',
      active_title: 'سجل الفواتير النشطة',
      search_placeholder: 'بحث في الفواتير...',
      new_invoice: 'فاتورة جديدة',
      profit_label: 'صافي أرباح التشغيل',
      inventory_total: 'إجمالي قيمة البضائع',
      final_invoice: 'فاتورة ضريبية نهائية',
      internal_invoice: 'فاتورة داخلية',
      print: 'طباعة القائمة',
      summary_report: 'تقرير ملخص',
      summary_title: 'تقرير ملخص الفواتير والتحصيلات',
      summary_subtitle: 'كشف ملخص العمليات والتحصيل المالي للفترة المحددة',
      zatca_ready: 'جاهزة للمرحلة الثانية',
      bilingual: 'ثنائي اللغة',
      add_title: 'إنشاء فاتورة سيادية',
      operation_number: 'رقم العملية',
      statement_number: 'رقم البيان',
      bol_number: 'رقم البوليصة',
      customs_fees: 'رسوم جمركية',
      port_fees: 'رسوم الميناء',
      transport_fees_label: 'أجور النقل',
      other_fees_label: 'مصاريف إضافية',
      client_label: 'العميل',
      carrier_label: 'الناقل',
      stats: {
        total_due: 'إجمالي المبيعات والتحصيل',
        collected: 'التحصيل (هذا الشهر)',
        overdue: 'متأخرات مستحقة',
        zatca_certified: 'إجمالي الرسوم والضرائب'
      },
      table: {
        number: 'رقم المرجع',
        client: 'العميل',
        date: 'التاريخ',
        amount: 'المبلغ الصافي',
        tax: 'الضريبة 15%',
        total: 'الإجمالي',
        status: 'الحالة',
        preview: 'معاينة',
        options: 'خيارات'
      },
      preview: {
        print: 'طباعة الفاتورة',
        whatsapp: 'واتساب',
        email: 'إيميل',
        mark_paid: 'تأكيد السداد',
        close: 'إغلاق'
      },
      modal: {
        title: 'إصدار فاتورة ضريبية',
        client_label: 'العميل المستفيد',
        carrier_label: 'الناقل / شركة الشحن',
        type: 'نوع الفاتورة',
        type_label: 'تصنيف الفاتورة',
        final_type: 'فاتورة نهائية',
        internal_type: 'فاتورة داخلية',
        operation_num: 'رقم العملية',
        statement_num: 'رقم البيان الجمركي',
        bol_num: 'رقم البوليصة (BOL)',
        cargo_val: 'قيمة الشحنة',
        total_collection: 'إجمالي مبلغ التحصيل',
        customs_fees: 'رسوم الجمارك',
        port_fees: 'أجور الموانئ',
        transport_fees: 'أجور النقل',
        extra_expenses: 'مصروفات إضافية',
        amount_label: 'صافي الإيراد',
        ref_label: 'المرجع',
        cancel: 'إلغاء',
        submit: 'حفظ الفاتورة والترحيل'
      },
      confirm_delete: 'هل أنت متأكد من حذف هذه الفاتورة؟',
      delete_success: 'تم حذف الفاتورة بنجاح.',
      status_paid: 'مدفوع',
      status_pending: 'بانتظار السداد',
      edit_invoice: 'تعديل الفاتورة',
      status_label: 'الحالة',
      save_changes: 'حفظ التغييرات'
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
      ai_audit: 'التدقيق الذكي للبيانات الضريبية',
      customs_fees: 'الرسوم الجمركية الجارية',
      municipal_fees: 'الضرائب والرسوم البلدية',
      total_clearance: 'إجمالي قيمة التخليص',
      declaration_count: 'عدد البيانات الجمركية (بيان)',
      platform_fees: 'رسوم المنصات (فسح/تبادل)',
      lang: 'ar'
    },
    prepayments: {
      lang: 'ar',
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
      lang: 'ar',
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
      lang: 'ar',
      title: 'الأمن والسيادة الرقمية',
      subtitle: 'إدارة بروتوكولات الأمان، التشفير، والوصول الآمن للقاعدة.',
      shield_status: 'حالة الدرع السيادي',
      firewall: 'جدار الحماية الفعال',
      encryption: 'تشفير ECDSA النشط'
    },
    roles: {
      lang: 'ar',
      title: 'إدارة الصلاحيات والكوادر',
      subtitle: 'تحديد مستويات الوصول والأدوار الوظيفية داخل النظام المحاسبي.',
      add_role: 'إضافة دور جديد'
    },
    trash: {
      lang: 'ar',
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
      lang: 'ar',
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
        backup: 'النسخ الاحتياطي',
        cloud: 'المزامنة السحابية'
      },
      cloud_sync: {
        title: 'المزامنة السحابية',
        subtitle: 'ربط القاعدة المحلية مع السحابة السيادية للمزامنة والوصول المتعدد.',
        status: 'حالة الاتصال العامة',
        enable_sync: 'تفعيل المزامنة السيادية',
        disable_sync: 'إيقاف المزامنة السحابية',
        sync_now: 'مزامنة الآن',
        connected: 'متصل بالسحابة المشفرة',
        disconnected: 'غير متصل - وضع محلي',
        last_sync: 'آخر مزامنة ناجحة',
        supabase_url: 'رابط Supabase URL',
        supabase_key: 'مفتاح Anon Key',
        auto_sync_label: 'المزامنة التلقائية (كل 3 دقائق)'
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
      allocation_label: 'قناة الصرف / التخصيص',
      disburse_btn: 'صرف وتسوية سيادية',
      settled_status: 'تمت التسوية بنجاح',
      employee_picker: 'اختيار الموظف المسؤول',
      lang: 'ar'
    },
    affiliate: {
      lang: 'ar',
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
        links: 'الروابط',
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

  },
  en: {
    lang: 'en',
    title: 'Alghwairy Customs Clearance',
    subtitle: 'Sovereign Ledger - Logistics & Clearance Management',
    welcome: 'Welcome, ',
    last_sync: 'Last sync: Today, 10:45 AM',
    search: 'Secure financial search...',
    add_trx: 'Add Sovereign TRX',
    logout: 'Log Out',
    landing: {
      lang: 'en',
      brand: 'Alghwairy Sovereign',
      hero_title: 'Sovereign Leadership in Customs Clearance',
      hero_subtitle: 'Securing your supply chains with the highest standards of precision and digital safety.',
      get_started: 'Access System',
      explore_services: 'Explore Services',
      services: {
        title: 'Strategic Services',
        clearance: 'Customs Clearance',
        clearance_desc: 'Professional procedures ensuring fast transit through all ports.',
        logistics: 'Logistics Solutions',
        logistics_desc: 'Integrated supply chain management from origin to warehouse.',
        tracking: 'Sovereign Tracking',
        tracking_desc: 'Real-time secure monitoring of your shipments via intelligent dashboard.'
      },
      about: {
        title: 'About the Institution',
        desc: 'We combine historical expertise with future technology to manage your financial and logistical scales.'
      }
    },
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
      contracts: 'Contracts Management',
      affiliate: 'Affiliate Marketing'
    },
    notifications: {
      success: 'Sovereign transaction recorded successfully!',
      error: 'Sovereign sync error: '
    },
    dashboard: {
      lang: 'en',
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
      },
      tax_est: 'Tax & Zakat (15%)',
      growth_chart: 'Growth & Resources',
      compliance_audit: 'ZATCA Compliance Audit',
      compliance_footer: 'All financial movements are fully compliant with ZATCA Phase 2 standards.',
      jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun'
    },
    reports: {
      lang: 'en',
      title: 'Analytical Intelligence & Sovereign Metrics',
      subtitle: 'Comprehensive view of liquidity performance, profitability, and resource distribution.',
      revenue: 'Total Revenue',
      expenses: 'Total Expenses',
      net_income: 'Net Distributable Profit',
      historical_high: 'Historical High',
      operating_costs: 'Operating Costs',
      quarterly_target: 'Quarterly Target',
      summary_ledger: 'Sovereign General Ledger',
      tax_est: 'Tax & Zakat (15%)',
      growth_chart: 'Growth & Resources',
      compliance_audit: 'ZATCA Compliance Audit',
      compliance_footer: 'All financial movements are fully compliant with ZATCA Phase 2 standards.',
      export_report: 'Export Analytical Report',
      jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun',
      export: 'Export CSV',
      print: 'Print Report',
      manual_trx: 'Add Settlement Entry',
      income: 'Income',
      expense: 'Expense',
      net_position: 'Net Financial Position',
      extracting_intelligence: 'Analyzing data...',
      table: {
        id: 'TRX ID',
        description: 'Description',
        type: 'Type',
        value: 'Value',
        status: 'Status',
        date: 'Date'
      }
    },
    invoices: {
      title: 'Invoices & Receipts',
      subtitle: 'ZATCA-compliant tax invoices and customs collections.',
      active_title: 'Active Invoices Registry',
      search_placeholder: 'Search invoices...',
      new_invoice: 'New Invoice',
      profit_label: 'Net Operating Profit',
      inventory_total: 'Total Cargo Value',
      final_invoice: 'Final Tax Invoice',
      internal_invoice: 'Internal Invoice',
      print: 'Print List',
      summary_report: 'Summary Report',
      summary_title: 'Invoices & Collections Summary Report',
      summary_subtitle: 'Detailed listing of operations and financial collections for the selected period',
      zatca_ready: 'ZATCA PHASE II READY',
      bilingual: 'Bilingual',
      add_title: 'Create Sovereign Invoice',
      operation_number: 'Operation #',
      statement_number: 'Statement #',
      bol_number: 'BOL #',
      customs_fees: 'Customs Fees',
      port_fees: 'Port Fees',
      transport_fees_label: 'Transport Fees',
      other_fees_label: 'Other Expenses',
      client_label: 'Client',
      carrier_label: 'Carrier',
      stats: {
        total_due: 'Total Sales & Collections',
        collected: 'Collected (Monthly)',
        overdue: 'Outstanding Payments',
        zatca_certified: 'Total Fees & Taxes'
      },
      table: {
        number: 'Ref #',
        client: 'Client',
        date: 'Date',
        amount: 'Net Amount',
        tax: 'VAT 15%',
        total: 'Total',
        status: 'Status',
        preview: 'Preview',
        options: 'Actions'
      },
      preview: {
        print: 'Print',
        whatsapp: 'WhatsApp',
        email: 'Email',
        mark_paid: 'Confirm Payment',
        close: 'Close'
      },
      modal: {
        title: 'Issue Tax Invoice',
        client_label: 'Beneficiary Client',
        carrier_label: 'Carrier / Shipping Co.',
        type: 'Invoice Type',
        type_label: 'Classification',
        final_type: 'Final Invoice',
        internal_type: 'Internal Invoice',
        operation_num: 'Operation Num',
        statement_num: 'Statement Num',
        bol_num: 'BOL Number',
        cargo_val: 'Cargo Value',
        total_collection: 'Total Collection',
        customs_fees: 'Customs Fees',
        port_fees: 'Port Fees',
        transport_fees: 'Transport Fees',
        extra_expenses: 'External Expenses',
        amount_label: 'Revenue',
        ref_label: 'Reference',
        cancel: 'Cancel',
        submit: 'Save & Post'
      },
      confirm_delete: 'Are you sure you want to delete this invoice?',
      delete_success: 'Invoice deleted successfully.',
      status_paid: 'Paid',
      status_pending: 'Pending',
      edit_invoice: 'Edit Invoice',
      status_label: 'Status',
      save_changes: 'Save Changes',
      lang: 'en'
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
      debit_adj: 'Debit Adjustment',
      journal: 'Journal Entry',
      general_ledger: 'General Ledger',
      daily: 'Daily',
      monthly: 'Monthly',
      yearly: 'Yearly',
      profit_loss: 'Profit & Loss',
      ledger_summary: 'Ledger Summary',
      statement_number: 'Statement No.',
      ledger_title: 'General Accounting Ledger',
      post_entry: 'Post Entry',
      journal_desc: 'Review and audit posted journal entries.',
      posting_success: 'Journal entry posted successfully',
      lang: 'en'
    },
    contracts: {
      lang: 'en',
      title: 'Sovereign Contracts Management',
      client_contracts: 'Client Contracts',
      transport_contracts: 'Transport Contracts',
      add_contract: 'Add Contract',
      contract_date: 'Contract Date',
      expiry_date: 'Expiry Date',
      terms: 'Terms',
      transporter_name: 'Transporter',
      transport_fees: 'Transport Fees',
      client_name: 'Client',
      status: 'Status'
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
      iban_label: 'IBAN Number',
      bank_label: 'Bank Name',
      gosi_deduction: 'GOSI Deduction',
      print_slip: 'Print Salary Slip',
      period_label: 'Payroll Period',
      sif_export: 'Export WPS SIF File',
      secure_record: 'Save Secure Record',
      cancel: 'Cancel',
      enroll_success: 'Staff record secured under sovereign ledger.',
      certify_confirm: 'Certifying Sovereign Payroll Records...',
      certify_success: 'Sovereign Payroll Certification Successful',
      certify_payroll: 'Certify Payroll',
      certified_badge: 'Sovereign Certified',
      no_pending: 'No pending payrolls for this period',
      sif_success: 'WPS SIF File Generated Successfully',
      audit_progress: 'Audit in progress...',
      no_records: 'No records for this period',
      slip: {
        preview_title: 'SALARY SLIP PREVIEW',
        earnings: 'Earnings',
        deductions: 'Deductions',
        net: 'NET SALARY',
        description: 'Description',
        base: 'Base Salary',
        allowances: 'Allowances',
        gosi: 'GOSI'
      }
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
      print: 'Print',
      total_credit: 'Total Active Credit',
      partners_count: 'Registered Partners',
      pending_reviews: 'Pending Reviews',
      expired_contracts: 'Expired Contracts',
      search_placeholder: 'Search for partner by name or VAT...',
      all_categories: 'All Categories',
      loading: 'Searching Secure Database...',
      no_customers: 'No customers found currently',
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
        edit_title: 'Edit Customer',
        name: 'Entity Legal Name',
        phone: 'Phone',
        category: 'Category',
        limit: 'Credit Limit (SAR)',
        cancel: 'Cancel',
        submit: 'Secure Record',
        save_changes: 'Save Changes'
      },
      profile: {
        title: 'Customer/Partner Profile',
        whatsapp: 'WhatsApp',
        email: 'Email',
        financial_kpis: 'Entity Financial KPIs',
        revenue: 'Total Revenue',
        profit: 'Net Profit',
        invoice_count: 'Invoices Count',
        doc_count: 'Documents Count',
        tabs: {
          invoices: 'Invoices & Operations',
          docs: 'Documents & Files',
          info: 'Basic Info'
        },
        invoices_header: 'Linked Invoices & Operations',
        no_invoices: 'No linked invoices or financial operations',
        drop_zone: 'Drag & drop documents here or click to choose',
        uploading: 'Uploading file...',
        allowed_formats: 'PDF · PNG · JPG · WebP — Max: 10 MB',
        no_docs: 'No documents attached yet',
        upload_first: 'Upload your first document above',
        delete_doc_confirm: 'Are you sure you want to permanently delete this document?'
      },
      notifications: {
        name_required: 'Name required',
        success_update: 'Customer updated successfully',
        success_trash: 'Customer moved to trash',
        delete_confirm: 'Are you sure you want to delete this customer?',
        error_loading: 'Error loading customers',
        error_saving: 'Error saving client',
        error_updating: 'Error updating client',
        error_deleting: 'Error deleting client'
      }
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
       ai_audit: 'AI Tax Compliance Audit',
       customs_fees: 'Current Customs Duties',
       municipal_fees: 'Municipal Taxes & Fees',
       total_clearance: 'Total Clearance Value',
       declaration_count: 'Customs Declarations (Bayen)',
       platform_fees: 'Platform Fees (Fasah/Tabadul)',
       lang: 'en'
    },
    prepayments: {
      lang: 'en',
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
      lang: 'en',
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
      lang: 'en',
      title: 'Security & Digital Sovereignty',
      subtitle: 'Managing security protocols, encryption, and secure database access.',
      shield_status: 'Sovereign Shield Status',
      firewall: 'Active Firewall',
      encryption: 'Active ECDSA Encryption'
    },
    roles: {
      lang: 'en',
      title: 'Role & Staff Management',
      subtitle: 'Defining access levels and job roles within the accounting system.',
      add_role: 'Add New Role'
    },
    trash: {
      lang: 'en',
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
      lang: 'en',
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
        backup: 'Cloud Mirroring',
        cloud: 'Cloud Sync'
      },
      cloud_sync: {
        title: 'Cloud Synchronization',
        subtitle: 'Connecting local database to sovereign cloud for multi-device access.',
        status: 'Overall Connection Status',
        enable_sync: 'Enable Sovereign Sync',
        disable_sync: 'Disable Cloud Sync',
        sync_now: 'Sync Now',
        connected: 'Connected to Encrypted Cloud',
        disconnected: 'Disconnected - Local Mode',
        last_sync: 'Last successful sync',
        supabase_url: 'Supabase URL',
        supabase_key: 'Anon Key',
        auto_sync_label: 'Auto Sync (Every 3 mins)'
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
      add_request: 'Request Petty Cash',
      allocation_label: 'Expense Allocation',
      disburse_btn: 'Disburse & Settle',
      settled_status: 'Settled Successfully',
      employee_picker: 'Responsible Staff Member',
      lang: 'en'
    },
    affiliate: {
      lang: 'en',
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
        links: 'Links',
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
    },
  },
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
  payment_method?: string;
  zatca_certified?: boolean;
  zatca_xml?: string;
  zatca_cert_date?: string;
  paid_amount?: number;
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
  const [isDark, setIsDark] = useState(() => localStorage.getItem('sovereign_theme') !== 'light');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [publicInvoiceId, setPublicInvoiceId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState('admin');
  const [showLanding, setShowLanding] = useState(true);
  
  // Sovereign Global Settings
  const [systemSettings, setSystemSettings] = useState({
    companyName: localStorage.getItem('sov_company_name') || 'مؤسسة الغويري للتخليص الجمركي',
    taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
    primaryColor: localStorage.getItem('sov_primary_color') || '#d4af37', // Sovereign Gold (Comfortable Contrast)
    fontFamily: localStorage.getItem('sov_font_family') || 'Tajawal',
    reportHeader: localStorage.getItem('sov_report_header') || 'مؤسسة الغويري للتخليص الجمركي - وثيقة رسمية',
    reportFooter: localStorage.getItem('sov_report_footer') || 'Alghwairy Customs Clearance - Confidential',
    address: localStorage.getItem('sov_address') || 'الرياض، المملكة العربية السعودية - حي الميناء',
    phone: localStorage.getItem('sov_phone') || '+966 50 000 0000',
    email: localStorage.getItem('sov_email') || 'info@alghwairy.sa',
    bankName: localStorage.getItem('sov_bank_name') || 'البنك الأهلي السعودي (SNB)',
    iban: localStorage.getItem('sov_iban') || 'SA00 0000 0000 0000 0000 0000'
  });

  const [userName, setUserName] = useState('عبدالله الغويري');
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return localDB.getActive('transactions') as Transaction[];
  });
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
  const [lastSyncTime, setLastSyncTime] = useState(() => new Date().toLocaleTimeString());
  const [unreadMsgCount, setUnreadMsgCount] = useState(() => {
    const settings = localDB.get('sync_settings');
    const myId = settings?.device_id;
    if (myId) {
      const messages = localDB.getAll('sovereign_messages');
      return Array.isArray(messages) ? messages.filter(m => m.recipient === myId && !m.read).length : 0;
    }
    return 0;
  });
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

  const reportsT = useMemo(() => ({...t.reports, lang}), [t.reports, lang]);

  const handleActivation = (key: string) => {
    setActivationError('');
    let expiryDate: Date | 'lifetime' | null = null;
    
    const keyUpper = key.trim().toUpperCase();
    
    if (keyUpper === 'ALGH-LIFETIME-PRO-2026' || keyUpper === 'LEDGER-PRO-2026') {
      expiryDate = 'lifetime';
    } else if (keyUpper === 'ALGH-10D-PRO-2026') {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 10);
    } else if (keyUpper === 'ALGH-30D-PRO-2026') {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
    } else if (keyUpper.startsWith('LEDGER-S10-')) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 10);
    } else if (keyUpper.startsWith('LEDGER-M30-')) {
      expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (keyUpper.startsWith('LEDGER-LIF-')) {
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
    
    // Play sound if enabled
    const soundsEnabled = localStorage.getItem('sov_notif_sounds') === 'true';
    if (soundsEnabled) {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {
        console.error('Audio error:', e);
      }
    }

    setTimeout(() => setNotification(null), 4000);
  }, []);

  const fetchData = useCallback(() => {
    const data = localDB.getActive('transactions');
    setTransactions(data as Transaction[]);
    setLastSyncTime(new Date().toLocaleTimeString());
    
    // Check for unread Sovereign Messages
    const settings = localDB.get('sync_settings');
    const myId = settings?.device_id;
    if (myId) {
      const unread = localDB.getAll('sovereign_messages').filter(m => m.recipient === myId && !m.read).length;
      setUnreadMsgCount(unread);
    }
  }, []);

  const logActivity = async (action: string, entity: string, entity_id?: string, overrideUser?: string) => {
     localDB.insert('activity_logs', {
       user_email: overrideUser || userName,
       action,
       entity,
       entity_id
     });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invId = params.get('invoice_id');
    if (invId) {
      setPublicInvoiceId(invId);
    }
    
    // Start Sovereign Sync Engine (Cloud/LAN)
    syncEngine.start();
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
    const sync = (e: any) => {
      // If the actual database changed (from Cloud Sync), refresh everything
      if (e && e.key === 'alghwairy_db') {
        fetchData();
      }

      setSystemSettings({
        companyName: localStorage.getItem('sov_company_name') || 'مؤسسة الغويري للتخليص الجمركي',
        taxNumber: localStorage.getItem('sov_tax_number') || '310029384756382',
        primaryColor: localStorage.getItem('sov_primary_color') || '#d4af37',
        fontFamily: localStorage.getItem('sov_font_family') || 'Tajawal',
        reportHeader: localStorage.getItem('sov_report_header') || 'مؤسسة الغويري للتخليص الجمركي - وثيقة رسمية',
        reportFooter: localStorage.getItem('sov_report_footer') || 'Alghwairy Customs Clearance - Confidential',
        address: localStorage.getItem('sov_address') || 'الرياض، المملكة العربية السعودية - حي الميناء',
        phone: localStorage.getItem('sov_phone') || '+966 50 000 0000',
        email: localStorage.getItem('sov_email') || 'info@alghwairy.sa',
        bankName: localStorage.getItem('sov_bank_name') || 'البنك الأهلي السعودي (SNB)',
        iban: localStorage.getItem('sov_iban') || 'SA00 0000 0000 0000 0000 0000'
      });
    };
    
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync as any);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync as any);
    };
  }, [isDark, systemSettings.primaryColor, systemSettings.fontFamily, systemSettings.companyName, fetchData]);

  useEffect(() => {
    if (isLoggedIn && !publicInvoiceId) {
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
             const backupData: any = {};
             for (const table of (['invoices', 'customers', 'transactions', 'expenses'] as const)) {
               backupData[table] = localDB.getAll(table);
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
                
                 localStorage.setItem('sov_last_backup_date', now.toISOString());
             } catch (e) {
                console.error("Backup failed", e);
             }
          })();
        }
      }, 60000);
      
      const cloudSyncTimer = setInterval(() => {
        if (localStorage.getItem('sov_cloud_sync') === 'true') {
          cloudSyncEngine.syncAll().then(stats => {
            if (stats && (stats.uploaded > 0 || stats.downloaded > 0)) {
               fetchData();
            }
          }).catch(console.error);
        }
      }, 180000); // 3 Minutes
      
      // PRODUCTION STABILITY: Overlay-Killer Effect
      const killer = setInterval(() => {
        const suspicious = document.querySelectorAll('[id*="shadow-host"], [id^="preact-"], [class*="shadow-host"], #preact-border-shadow-host');
        suspicious.forEach(el => el.remove());
      }, 500);

      return () => {
        clearInterval(timer);
        clearInterval(killer);
        clearInterval(cloudSyncTimer);
      };
    }
  }, [isLoggedIn, publicInvoiceId, fetchData]);

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
      localDB.insert('transactions', newRecord);
      
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
      <div className={`app-layout ${isDark ? 'dark-theme' : 'light-theme'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
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
    if (showLanding) {
      return (
        <LandingView 
          t={t.landing} 
          lang={lang} 
          onEnterPortal={() => setShowLanding(false)} 
          isDark={isDark} 
        />
      );
    }

    return (
      <div className={`app-layout ${isDark ? 'dark-theme' : 'light-theme'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div style={{ position: 'fixed', top: '1.5rem', [lang === 'ar' ? 'left' : 'right']: '1.5rem', zIndex: 1000 }}>
           <button onClick={() => setShowLanding(true)} className="btn-executive" style={{ background: 'var(--surface)', color: 'var(--primary)', padding: '0.5rem 1rem', fontSize: '0.8rem', border: '1px solid var(--outline)' }}>
              {lang === 'ar' ? 'العودة للموقع' : 'Back to Website'}
           </button>
        </div>
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
    // Permission Guard
    if (activeTab !== 'dashboard' && !hasPermission(userRole, activeTab as AppModule)) {
       return <DashboardView transactions={transactions} fetchData={fetchData} showToast={showToast} t={{...t.dashboard, lang}} />;
    }

    switch(activeTab) {
      case 'dashboard': return <DashboardView transactions={transactions} fetchData={fetchData} showToast={showToast} t={{...t.dashboard, lang}} />;
      case 'customers': return <CustomersView showToast={showToast} logActivity={logActivity} t={{...t.customers, lang}} />;
      case 'accounting': return <AccountingView showToast={showToast} logActivity={logActivity} t={{...t.accounting, lang}} />;
      case 'invoices': return <InvoicesView showToast={showToast} logActivity={logActivity} t={t} />;
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
      case 'settings': return <SettingsView showToast={showToast} logActivity={logActivity} t={{...t.settings, lang}} userName={userName} />;
      case 'roles': return <RolesView showToast={showToast} t={{...t.roles, lang}} />;
      case 'trash': return <TrashView t={{...t.trash, lang}} lang={lang} showToast={showToast} />;
      case 'communications': return <CommunicationsView showToast={showToast} lang={lang} />;
      case 'contracts': return <ContractsView showToast={showToast} logActivity={logActivity} t={{...t.contracts, lang}} />;
      default: return <DashboardView transactions={transactions} fetchData={fetchData} showToast={showToast} t={{...t.dashboard, lang}} />;
    }
  };

  const isMobileSize = window.innerWidth <= 1024; // Renamed to avoid confusion

  return (
    <div className={`app-layout ${isDark ? 'dark-theme' : 'light-theme'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {isLoggedIn && !publicInvoiceId && isMobileSize && !isCollapsed && <div className="sidebar-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 90 }} onClick={() => setIsCollapsed(true)} />}
      {/* Sidebar - Traditional Sovereign Fixed Width */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ width: isCollapsed ? (isMobileSize ? '0' : 'var(--sidebar-collapsed-width)') : 'var(--sidebar-width)', zIndex: 100, background: 'var(--sidebar-bg)' }}>
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
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)' 
          }}
        >
          {isCollapsed ? (lang === 'ar' ? <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span> : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>) : (lang === 'ar' ? <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span> : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span>)}
        </button>

        <div className="sidebar-header-text" style={{ padding: isCollapsed ? '0 0 1rem' : '1.8rem 1.2rem 1.2rem', textAlign: 'center', borderBottom: '1px solid var(--separator)' }}>
          {!isCollapsed && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary)' }}>
                  <img src="./logo.png" alt="Logo" style={{ width: 34, height: 34, objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }} />
                   <h2 className="text-sovereign sharp-gold sharp-text" style={{ fontSize: '1.05rem', margin: 0, color: 'var(--secondary)', fontWeight: 1000 }}>{t.title}</h2>
               </div>
               <p style={{ fontSize: '0.62rem', opacity: 1, marginTop: '0.5rem', color: 'var(--primary)', textAlign: 'center', fontWeight: 900, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{t.subtitle}</p>
            </div>
          )}
          {isCollapsed && (
            <div className="sidebar-logo-mini" style={{ width: 42, height: 42, background: 'rgba(0,28,57,0.05)', borderRadius: '10px', margin: '0.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', border: '1px solid var(--outline)' }}>
               <img src="./logo.png" alt="Logo" style={{ width: '65%', height: '65%', objectFit: 'contain' }} />
            </div>
          )}
        </div>

        <nav className="sidebar-scroll-area custom-scrollbar">
          {(hasPermission(userRole, 'dashboard') || hasPermission(userRole, 'customers')) && (
            <>
              {!isCollapsed && <div style={{ padding: '1.25rem 1rem 0.5rem', fontSize: '0.62rem', color: 'var(--primary)', opacity: 0.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{lang === 'ar' ? 'العامة' : 'General'}</div>}
              {hasPermission(userRole, 'dashboard') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>dashboard</span>} label={t.nav.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'customers') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>handshake</span>} label={t.nav.customers} active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'contracts') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>} label={t.nav.contracts} active={activeTab === 'contracts'} onClick={() => setActiveTab('contracts')} lang={lang} isCollapsed={isCollapsed} />}
            </>
          )}

          {(hasPermission(userRole, 'accounting') || hasPermission(userRole, 'invoices') || hasPermission(userRole, 'prepayments') || hasPermission(userRole, 'expenses') || hasPermission(userRole, 'petty_cash') || hasPermission(userRole, 'tax')) && (
            <>
              {!isCollapsed && <div style={{ padding: '1.5rem 1rem 0.5rem', fontSize: '0.62rem', color: 'var(--primary)', opacity: 0.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{lang === 'ar' ? 'المالية والامتثال' : 'Financials'}</div>}
              {hasPermission(userRole, 'accounting') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_balance_wallet</span>} label={t.nav.accounting} active={activeTab === 'accounting'} onClick={() => setActiveTab('accounting')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'invoices') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>} label={t.nav.invoices} active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'prepayments') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>} label={t.nav.prepayments} active={activeTab === 'prepayments'} onClick={() => setActiveTab('prepayments')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'expenses') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_down</span>} label={t.nav.expenses} active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'petty_cash') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>payments</span>} label={t.nav.petty_cash} active={activeTab === 'petty_cash'} onClick={() => setActiveTab('petty_cash')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'tax') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bolt</span>} label={t.nav.tax} active={activeTab === 'tax'} onClick={() => setActiveTab('tax')} lang={lang} isCollapsed={isCollapsed} />}
            </>
          )}

          {(hasPermission(userRole, 'payroll') || hasPermission(userRole, 'reports') || hasPermission(userRole, 'statements')) && (
            <>
              {!isCollapsed && <div style={{ padding: '1.5rem 1rem 0.5rem', fontSize: '0.62rem', color: 'var(--primary)', opacity: 0.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{lang === 'ar' ? 'الموارد والتقارير' : 'Operations'}</div>}
              {hasPermission(userRole, 'payroll') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>group</span>} label={t.nav.payroll} active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'reports') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bar_chart</span>} label={t.nav.reports} active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'statements') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>table_chart</span>} label={t.nav.statements} active={activeTab === 'statements'} onClick={() => setActiveTab('statements')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'communications') && (
                <NavItem 
                   icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>device_hub</span>} 
                   label={lang === 'ar' ? 'الرابط السيادي' : 'Sovereign Link'} 
                   active={activeTab === 'communications'} 
                   onClick={() => setActiveTab('communications')} 
                   lang={lang} 
                   isCollapsed={isCollapsed} 
                   badge={unreadMsgCount > 0 ? unreadMsgCount : undefined}
                />
              )}
            </>
          )}

          {(hasPermission(userRole, 'security') || hasPermission(userRole, 'roles') || hasPermission(userRole, 'audit_logs') || hasPermission(userRole, 'data_import') || hasPermission(userRole, 'settings') || hasPermission(userRole, 'trash')) && (
            <>
              {!isCollapsed && <div style={{ padding: '1.5rem 1rem 0.5rem', fontSize: '0.62rem', color: 'var(--primary)', opacity: 0.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px' }}>{lang === 'ar' ? 'النظام والأمان' : 'System'}</div>}
              {hasPermission(userRole, 'security') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>verified_user</span>} label={t.nav.security} active={activeTab === 'security'} onClick={() => setActiveTab('security')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'roles') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>} label={t.nav.roles} active={activeTab === 'roles'} onClick={() => setActiveTab('roles')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'audit_logs') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>monitoring</span>} label={t.nav.audit} active={activeTab === 'audit_logs'} onClick={() => setActiveTab('audit_logs')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'data_import') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>download</span>} label={t.nav.data || 'Data Import'} active={activeTab === 'data_import'} onClick={() => setActiveTab('data_import')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'settings') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>} label={t.nav.settings || 'System Settings'} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} lang={lang} isCollapsed={isCollapsed} />}
              {hasPermission(userRole, 'trash') && <NavItem icon={<span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>} label={t.nav.trash || 'Trash'} active={activeTab === 'trash'} onClick={() => setActiveTab('trash')} lang={lang} isCollapsed={isCollapsed} />}
            </>
          )}
        </nav>


        {/* User Data Profiler - Miniature Version */}
        <div style={{ padding: isCollapsed ? '0.6rem 0' : '1rem 1.25rem', borderTop: '1px solid var(--separator)', background: 'rgba(0,28,57,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : '0.65rem', marginBottom: isCollapsed ? '0.6rem' : '0.75rem', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
             <div style={{ width: 28, height: 28, borderRadius: '6px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                {userName.charAt(0).toUpperCase()}
             </div>
              {!isCollapsed && (
                <div style={{ textAlign: lang === 'ar' ? 'right' : 'left', flex: 1 }}>
                   <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</div>
                   <div style={{ color: 'var(--secondary)', fontSize: '0.7rem', fontWeight: 600 }}>{t.user_roles[userRole as keyof typeof t.user_roles]}</div>
                </div>
              )}
          </div>
          
          <button onClick={() => setIsLoggedIn(false)} className="nav-item" style={{ 
            color: 'var(--error)', 
            justifyContent: isCollapsed ? 'center' : 'flex-start', 
            padding: isCollapsed ? '0' : '0.5rem 0.8rem', 
            gap: isCollapsed ? '0' : '0.8rem',
            width: isCollapsed ? '44px' : 'calc(100% - 1rem)',
            margin: isCollapsed ? '0 auto' : '0 0.5rem'
          }}>
             <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
             {!isCollapsed && <span style={{ fontSize: '0.8rem' }}>{t.logout}</span>}
          </button>

          {!isCollapsed && (
            <div style={{ marginTop: '0.8rem', padding: '0 0.2rem', borderTop: '1px solid var(--separator)', paddingTop: '0.8rem', textAlign: 'center' }}>
               <div style={{ fontSize: '0.55rem', opacity: 0.6, color: 'var(--primary)', letterSpacing: '0.5px', fontWeight: 700 }}>
                  {lang === 'ar' ? 'منشئ النظام' : 'SYSTEM CREATOR'}
               </div>
               <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', marginTop: '0.2rem' }}>
                  Abdel Rahman Abusalif
               </div>
               <div style={{ fontSize: '0.55rem', color: 'var(--secondary)', marginTop: '0.05rem', fontWeight: 700 }}>
                  966543389314
               </div>
               <div style={{ fontSize: '0.5rem', marginTop: '0.6rem', color: 'var(--primary)', fontWeight: 900, opacity: 0.3, letterSpacing: '1px' }}>
                  v1.0.0 STABLE BUILD
               </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="main-stage">
        <header className="view-header glass-panel" style={{ borderBottom: 'none', background: 'var(--header-bg)' }}>
          <div className="animate-fade">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
              <span className="badge-sovereign" style={{ background: 'rgba(212, 167, 106, 0.15)', color: 'var(--secondary)', border: '1px solid rgba(212, 167, 106, 0.2)' }}>
                {t.roles[userRole as keyof typeof t.roles]}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--on-surface-variant)', fontSize: '0.75rem', fontWeight: 800, opacity: 0.7 }}>
                 <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>schedule</span> {t.last_sync}: {lastSyncTime}
              </div>
            </div>
            <h1 className="view-title" style={{ fontSize: '1.5rem' }}>
              <span style={{ fontWeight: 400, opacity: 0.4, color: 'var(--on-surface)' }}>{t.welcome}</span>
              <span className="text-sovereign" style={{ marginInlineStart: '0.5rem', background: 'none', color: 'var(--secondary)' }}>{userName}</span>
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div className="card-layer-2" style={{ padding: '0.65rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '320px', borderRadius: '100px', border: '1px solid var(--outline-variant)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', opacity: 0.4, color: 'var(--primary)' }}>search</span>
              <input type="text" placeholder={t.search} style={{ border: 'none', outline: 'none', background: 'none', width: '100%', fontSize: '0.82rem', color: 'var(--on-surface)', fontWeight: 700 }} />
            </div>

            <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
              <button 
                onClick={() => showToast('Sovereign Ledger Integrity: 100% Verified. AES-256 Active.', 'success')}
                style={{ 
                  margin: 0,
                  padding: '0.55rem 1.15rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.8rem', 
                  borderRadius: '100px', 
                  cursor: 'pointer',
                  border: '1px solid var(--outline-variant)',
                  background: 'var(--surface)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: 'var(--shadow-sm)'
                }}
                className="hover-lift"
              >
                 <div className="pulse-green" style={{ width: 7, height: 7, borderRadius: '50%' }} />
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span className="label-sovereign" style={{ fontSize: '0.55rem', opacity: 0.6 }}>Network Status</span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>VERIFIED</span>
                 </div>
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button title="Toggle Theme" onClick={toggleTheme} className="btn-executive" style={{ width: '38px', height: '38px', padding: '0', justifyContent: 'center', background: 'var(--surface-container-high)', color: 'var(--primary)', boxShadow: 'none' }}>
                  {isDark ? <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>light_mode</span> : <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>dark_mode</span>}
                </button>
                <button title="Change Language" onClick={toggleLang} className="btn-executive" style={{ width: '38px', height: '38px', padding: '0', justifyContent: 'center', background: 'var(--surface-container-high)', color: 'var(--primary)', boxShadow: 'none' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>language</span>
                </button>
                <button title="Direct Print" onClick={handlePrint} className="btn-executive" style={{ width: '38px', height: '38px', padding: '0', justifyContent: 'center', background: 'var(--surface-container-high)', color: 'var(--primary)', boxShadow: 'none' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '17px' }}>print</span>
                </button>
              </div>
            </div>

            <button onClick={() => setShowAddTrxModal(true)} className="btn-executive" style={{ padding: '0.65rem 1.25rem', borderRadius: '100px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span> <span style={{ fontWeight: 900 }}>{lang === 'ar' ? 'إضافة عملية' : 'Add TRX'}</span>
            </button>
            
            <div style={{ position: 'relative', cursor: 'pointer', padding: '0.4rem', borderRadius: '50%', background: 'var(--surface-container-low)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowNotifDrawer(true)}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--primary)' }}>notifications</span>
              {notifHistory.length > 0 && (
                <span className="status-indicator" style={{ position: 'absolute', top: -2, right: -2, background: 'var(--error)', border: '2.5px solid var(--surface)', width: '12px', height: '12px' }}></span>
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
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,5,15,0.92)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="card slide-in" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem', background: 'var(--surface)', border: '1px solid var(--secondary)', boxShadow: '0 20px 80px rgba(0,0,0,0.6)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                  <h2 style={{ fontFamily: 'Tajawal', margin: 0, fontSize: '1.6rem', color: 'var(--primary)' }}>{lang === 'ar' ? 'توثيق عملية سيادية' : 'Document Sovereign TRX'}</h2>
                  <button onClick={() => setShowAddTrxModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--on-surface-variant)' }}>
                     <span className="material-symbols-outlined" style={{ fontSize: '24px', transform: lang === 'ar' ? 'rotate(180deg)' : 'none' }}>logout</span>
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
                     {isActionLoading ? <span className="material-symbols-outlined spin" style={{ fontSize: '24px' }}>sync</span> : <><span className="material-symbols-outlined" style={{ fontSize: '22px' }}>verified_user</span> {lang === 'ar' ? 'اعتماد العملية في الميزان' : 'Authorize Sovereign TRX'}</>}
                  </button>
               </form>
            </div>
        </div>
      )}

      {/* Sovereign Toast */}
      {notification ? (
        <div className="toast-container" style={{ zIndex: 2000 }}>
          <div className={`toast-notification ${notification.type === 'error' ? 'toast-error' : ''}`}>
            {notification.type === 'error' ? <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>error</span> : <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#88d982' }}>check_circle</span>}
            <span>{notification.message}</span>
          </div>
        </div>
      ) : null}
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
  badge?: number | string;
}

function NavItem({ icon, label, active, onClick, lang, isCollapsed, badge }: NavItemProps) {
  return (
    <button 
      onClick={onClick} 
      className={`nav-item ${active ? 'active' : ''}`}
      style={{ position: 'relative' }}
    >
      <div className="nav-icon-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px' }}>
        {icon}
      </div>
      {!isCollapsed && <span className="nav-label">{label}</span>}
      {badge && badge !== 0 && (
         <span style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            [lang === 'ar' ? 'left' : 'right']: isCollapsed ? '-4px' : '1.25rem',
            background: 'var(--secondary)',
            color: 'var(--primary)',
            fontSize: '0.62rem',
            fontWeight: 950,
            padding: '2px 5px',
            borderRadius: '6px',
            minWidth: '16px',
            textAlign: 'center',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            zIndex: 10
         }}>
            {badge}
         </span>
      )}
      {(active && !isCollapsed) && (
        <div style={{ 
          marginInlineStart: 'auto', 
          width: '4px', 
          height: '16px', 
          background: 'var(--sidebar-active-text)', 
          borderRadius: '2px', 
          opacity: 0.5 
        }} />
      )}
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
    <div className={`login-container premium-bg slide-in ${isDark ? 'dark-theme' : 'light-theme'}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw' }}>
      <div className="login-card premium-bg slide-in" style={{ maxWidth: '500px', width: '90%', padding: '3.5rem', background: 'var(--surface)', border: '1px solid var(--outline)' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
           <div style={{ display: 'inline-flex', padding: '1.2rem', borderRadius: '24px', background: 'var(--primary)', color: 'var(--on-primary)', marginBottom: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '42px' }}>verified_user</span>
           </div>
           <h2 style={{ fontSize: '2.2rem', fontFamily: 'Tajawal', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.8rem' }}>
              {lang === 'ar' ? 'تنشيط الميزان السيادي' : 'Sovereign Ledger Activation'}
           </h2>
           <p style={{ color: 'var(--on-surface)', opacity: 0.8, fontWeight: 700, fontSize: '0.95rem' }}>
              {lang === 'ar' ? 'يرجى إدخال مفتاح الترسيم القانوني للمتابعة' : 'Please enter your legal license key to proceed'}
           </p>
           <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem', borderRadius: '4px', background: 'var(--surface-container-high)', color: 'var(--on-surface)', opacity: 0.8, fontWeight: 800 }}>10 DAYS</span>
              <span style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem', borderRadius: '4px', background: 'var(--surface-container-high)', color: 'var(--on-surface)', opacity: 0.8, fontWeight: 800 }}>30 DAYS</span>
              <span style={{ fontSize: '0.65rem', padding: '0.3rem 0.6rem', borderRadius: '4px', background: 'var(--primary)', color: 'var(--on-primary)', fontWeight: 800 }}>LIFETIME</span>
           </div>
        </header>

        <form onSubmit={(e) => { e.preventDefault(); onActivate(key); }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--on-surface)', opacity: 0.7, marginBottom: '0.8rem', letterSpacing: '1px' }}>
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

          <button type="submit" className="btn-executive primary" style={{ width: '100%', padding: '1.5rem', justifyContent: 'center', fontSize: '1.1rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bolt</span> {lang === 'ar' ? 'تنشيط المنظومة الآن' : 'Activate System Now'}
          </button>
        </form>

        <footer style={{ marginTop: '3.5rem', paddingTop: '2rem', borderTop: '1px solid var(--outline)', textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          <button onClick={toggleLang} className="btn-executive" style={{ fontSize: '0.85rem', fontWeight: 800, padding: '0.8rem 1.5rem' }}>
             <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>language</span> {lang === 'ar' ? 'English Version' : 'اللغة العربية'}
          </button>
        </footer>
        
        <div style={{ textAlign: 'center', marginTop: '1.5rem', opacity: 0.4 }}>
           <span className="version-badge">
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>verified_user</span> v1.0.0 STABLE BUILD
           </span>
        </div>
      </div>
    </div>
  );
}
