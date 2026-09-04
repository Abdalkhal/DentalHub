import { createContext, useContext, useState, type ReactNode } from "react";
import { DevSettings, I18nManager } from "react-native";

export type Lang = "ar" | "en";

// Module-level snapshot so low-level components (e.g. ui/Text) can pick the
// correct font family without subscribing to the context on every render.
export let currentLang: Lang = "ar";
export function getLang(): Lang {
  return currentLang;
}

const LANG_KEY = "dh_lang";

function applyDirection(l: Lang) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(l === "ar");
}

type Dict = Record<string, { ar: string; en: string }>;

export const dict = {
  app_name: { ar: "DentalHub", en: "DentalHub" },
  search_placeholder: { ar: "ابحث عن مواد، مكاتب…", en: "Search materials, offices…" },
  // Sections
  supplies: { ar: "المستلزمات الطبية", en: "Medical Supplies" },
  supplies_sub: { ar: "تصفح مواد العيادة", en: "Browse clinic materials" },
  labs: { ar: "المختبرات", en: "Labs" },
  labs_sub: { ar: "إرسال ومتابعة الحالات", en: "Send & track cases" },
  implants: { ar: "الزراعة", en: "Implants" },
  implants_sub: { ar: "دليل الوكلاء والمناديب", en: "Brands & dealers" },
  account: { ar: "حسابي", en: "Account" },
  account_sub: { ar: "الإعدادات والملف", en: "Settings & profile" },
  // Tabs
  tab_home: { ar: "الرئيسية", en: "Home" },
  tab_orders: { ar: "طلباتي", en: "My Orders" },
  tab_account: { ar: "حسابي", en: "Account" },
  tab_more: { ar: "المزيد", en: "More" },
  tab_favorites: { ar: "المفضلة", en: "Favorites" },
  tab_offers: { ar: "العروض", en: "Offers" },
  // Banner
  banner_title: { ar: "عروض زرعات", en: "Implant Deals" },
  banner_brand: { ar: "Alfa Gate", en: "Alfa Gate" },
  banner_price: { ar: "$399", en: "$399" },
  banner_cta: { ar: "تجهيز فوري — الموصل", en: "In stock — Mosul" },
  // Offices
  offices_title: { ar: "مكاتب المستلزمات في الموصل", en: "Supply offices in Mosul" },
  office_visit: { ar: "زيارة المكتب", en: "Visit office" },
  // Branches
  branches_title: { ar: "فروع طب الأسنان", en: "Dental specialties" },
  general: { ar: "مواد عامة", en: "General materials" },
  endo: { ar: "علاج الجذور", en: "Endodontics" },
  prostho: { ar: "التركيبات", en: "Prosthodontics" },
  surgery: { ar: "جراحة الفم", en: "Surgery" },
  ortho: { ar: "تقويم الأسنان", en: "Orthodontics" },
  pedo: { ar: "أسنان الأطفال", en: "Pedodontics" },
  perio: { ar: "علاج اللثة", en: "Periodontics" },
  // Cases
  cases: { ar: "حالاتي في المختبر", en: "My lab cases" },
  case_received: { ar: "تم استلام الحالة", en: "Case received" },
  case_inprogress: { ar: "قيد التنفيذ", en: "In progress" },
  case_done: { ar: "تم الانتهاء", en: "Completed" },
  case_ontheway: { ar: "في الطريق إلى الطبيب", en: "On the way" },
  case_delivered: { ar: "تم التسليم", en: "Delivered" },
  send_case: { ar: "إرسال حالة جديدة", en: "Send new case" },
  track_cases: { ar: "تتبع الحالات", en: "Track cases" },
  // Labs page
  price_list: { ar: "قائمة الأسعار", en: "Price list" },
  work_types: { ar: "نوعية العمل", en: "Work types" },
  delivery_days: { ar: "أيام", en: "days" },
  // Implants
  countries: { ar: "حسب البلد", en: "By country" },
  surgical_guides: { ar: "شركات الدليل الجراحي", en: "Surgical Guide Companies" },
  surgical_guides_sub: { ar: "قوالب رقمية لتركيب الزرعة بدقة", en: "Digital templates for precise implant placement" },
  guide_systems: { ar: "الأنظمة المتوافقة", en: "Compatible systems" },
  search_guides_placeholder: { ar: "ابحث باسم الشركة أو نوع الدليل…", en: "Search by company or guide type…" },
  no_results: { ar: "لا توجد نتائج", en: "No results" },
  korean: { ar: "كورية", en: "Korean" },
  swiss: { ar: "سويسرية", en: "Swiss" },
  italian: { ar: "إيطالية", en: "Italian" },
  german: { ar: "ألمانية", en: "German" },
  brazilian: { ar: "برازيلية", en: "Brazilian" },
  type_immediate: { ar: "فورية", en: "Immediate" },
  type_delayed: { ar: "غير فورية", en: "Delayed" },
  type_basal: { ar: "قاعدية (Basal)", en: "Basal" },
  // Misc
  back: { ar: "رجوع", en: "Back" },
  add_to_order: { ar: "أضف للطلب", en: "Add to order" },
  view_all: { ar: "عرض الكل", en: "View all" },
  in_stock: { ar: "متوفر", en: "In stock" },
  out_of_stock: { ar: "نفد", en: "Out of stock" },
  see_brands: { ar: "عرض الماركات", en: "See brands" },
  brands: { ar: "الماركات", en: "Brands" },
  sizes: { ar: "الأحجام", en: "Sizes" },
  variants: { ar: "الأنواع المتوفرة", en: "Available variants" },
  filter_all: { ar: "الكل", en: "All" },
  filter_immediate: { ar: "فورية", en: "Immediate" },
  filter_delayed: { ar: "غير فورية", en: "Delayed" },
  starting_from: { ar: "يبدأ من", en: "From" },
  empty_orders: { ar: "لا توجد طلبات بعد", en: "No orders yet" },
  account_name: { ar: "المستخدم", en: "User" },
  account_clinic: { ar: "العيادة", en: "Clinic" },
  logout: { ar: "تسجيل الخروج", en: "Log out" },
  settings: { ar: "الإعدادات", en: "Settings" },
  language: { ar: "اللغة", en: "Language" },
  help: { ar: "المساعدة", en: "Help" },
  about: { ar: "عن التطبيق", en: "About" },
  // Production / Kanban
  production: { ar: "حالات العمل", en: "Production" },
  production_desc: { ar: "متابعة سير العمل في المختبر", en: "Track lab workflow" },
  // Patients
  patients: { ar: "المرضى", en: "Patients" },
  patients_desc: { ar: "قاعدة بيانات المرضى وسجل الحالات", en: "Patient database & case history" },
  // Doctors
  doctors: { ar: "الأطباء", en: "Doctors" },
  doctors_desc: { ar: "دليل الأطباء والعيادات", en: "Doctors & clinics directory" },
  // Reports
  reports: { ar: "التقارير", en: "Reports" },
  reports_desc: { ar: "تحليلات الأداء والمخططات البيانية", en: "Performance analytics & charts" },
  // Finance
  finance: { ar: "المالية", en: "Finance" },
  finance_desc: { ar: "الفواتير والإيرادات والمصروفات", en: "Invoicing, revenue & expenses" },
  // Messages
  messages: { ar: "الرسائل", en: "Messages" },
  messages_desc: { ar: "محادثات مع الأطباء والموردين", en: "Chat with doctors & suppliers" },
  // Stat labels
  late: { ar: "متأخرة", en: "Late" },
  completed: { ar: "مكتملة", en: "Completed" },
  in_production: { ar: "قيد التنفيذ", en: "In Production" },
  total_orders: { ar: "إجمالي الطلبات", en: "Total Orders" },
  avg_turnaround: { ar: "متوسط مدة الإنجاز", en: "Avg. Turnaround" },
  quality_score: { ar: "الجودة والدقة", en: "Quality Score" },
  revenue_chart: { ar: "الإيرادات", en: "Revenue" },
  // Quick access
  new_order: { ar: "+ طلب جديد", en: "+ New Order" },
  view_orders: { ar: "عرض الطلبات", en: "View Orders" },
  accounts: { ar: "الحسابات", en: "Accounts" },
  // Dashboard
  greeting_morning: { ar: "صباح الخير", en: "Good Morning" },
  greeting_evening: { ar: "مساء الخير", en: "Good Evening" },
  thursday: { ar: "الخميس", en: "Thursday" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  order_number: { ar: "رقم الطلب", en: "Order #" },
  patient: { ar: "المريض", en: "Patient" },
  doctor: { ar: "الطبيب", en: "Doctor" },
  work_type: { ar: "نوع العمل", en: "Work Type" },
  received_date: { ar: "تاريخ الاستلام", en: "Received Date" },
  status: { ar: "الحالة", en: "Status" },
  view: { ar: "عرض", en: "View" },
  edit: { ar: "تعديل", en: "Edit" },
  crown: { ar: "تاج", en: "Crown" },
  veneer: { ar: "قشرة", en: "Veneer" },
  implant_work: { ar: "زرعة", en: "Implant" },
  clear_aligner: { ar: "مصفف شفاف", en: "Clear Aligner" },
  filter_late: { ar: "متأخرة", en: "Late" },
  filter_completed: { ar: "مكتملة", en: "Completed" },
  filter_in_production: { ar: "قيد التنفيذ", en: "In Production" },
  dashboard_title: { ar: "لوحة التحكم", en: "Dashboard" },
  search_orders_placeholder: { ar: "ابحث عن طلب…", en: "Search orders…" },
  clinic_name: { ar: "اسم العيادة", en: "Clinic Name" },
  impression_received: { ar: "استلام الطبعة", en: "Impression Received" },
  design_step: { ar: "التصميم الرقمي", en: "Design" },
  printing_milling: { ar: "الخرط/الطباعة", en: "Printing/Milling" },
  ceramic_step: { ar: "السيراميك", en: "Ceramic" },
  qc_step: { ar: "فحص الجودة", en: "QC" },
  dispatch_step: { ar: "التوصيل", en: "Dispatch" },
  flag_delay: { ar: "تأخير داخلي", en: "Flag Delay" },
  clear_flag: { ar: "إلغاء التأخير", en: "Clear Delay" },
  lab_notes: { ar: "ملاحظات المختبر", en: "Lab Notes" },
  add_note_placeholder: { ar: "أضف ملاحظة…", en: "Add a note…" },
  production_pipeline: { ar: "خط سير الإنتاج", en: "Production Pipeline" },
  live_updating: { ar: "مباشر — يتم التحديث تلقائياً", en: "Live — auto-updating" },
  no_cases: { ar: "لا توجد حالات", en: "No cases" },
  cases_count: { ar: "حالات", en: "cases" },
  total_invoiced: { ar: "المبالغ المفوترة", en: "Total Invoiced" },
  collected_paid: { ar: "المستحصلة", en: "Collected/Paid" },
  outstanding_balance: { ar: "المتبقي بذمة العيادات", en: "Outstanding Balance" },
  clinic_billing: { ar: "فواتير العيادات", en: "Clinic Billing" },
  operational_expenses: { ar: "مصروفات تشغيلية", en: "Operational Expenses" },
  service_pricing: { ar: "أسعار الخدمات", en: "Service Pricing" },
  pricing_management: { ar: "إدارة أسعار الخدمات", en: "Service Pricing Management" },
  zirconia: { ar: "زيركون", en: "Zirconia" },
  emax: { ar: "إيماكس", en: "E-max" },
  implant_pricing: { ar: "زرعات", en: "Implants" },
  pfm: { ar: "PFM", en: "PFM" },
  all_ceramic: { ar: "سيراميك بالكامل", en: "All Ceramic" },
  price: { ar: "السعر", en: "Price" },
  currency_units: { ar: "د.ع", en: "IQD" },
  patient_name: { ar: "اسم المريض", en: "Patient Name" },
  clinic_doctor: { ar: "العيادة/الطبيب", en: "Clinic/Doctor" },
  shade_color: { ar: "اللون", en: "Shade/Color" },
  delivery_date: { ar: "تاريخ التسليم", en: "Delivery Date" },
  select_clinic_doctor: { ar: "اختر العيادة أو الطبيب", en: "Select clinic or doctor" },
  select_work_type: { ar: "اختر نوع العمل", en: "Select work type" },
  create_order: { ar: "إضافة الطلب", en: "Create Order" },
  new_order_title: { ar: "إضافة طلب جديد", en: "New Order" },
  field_required: { ar: "هذا الحقل مطلوب", en: "This field is required" },
  delivery_date_placeholder: { ar: "اختر تاريخ التسليم", en: "Select delivery date" },
  paid: { ar: "مدفوع", en: "Paid" },
  pending: { ar: "معلق", en: "Pending" },
  overdue: { ar: "متأخر", en: "Overdue" },
  no_invoices: { ar: "لا توجد فواتير بعد", en: "No invoices yet" },
  no_expenses: { ar: "لا توجد مصروفات مسجلة", en: "No expenses recorded" },
} satisfies Dict;

export type DictKey = keyof typeof dict;

type Ctx = {
  lang: Lang;
  t: (k: DictKey) => string;
  setLang: (l: Lang) => void;
  toggle: () => void;
  dir: "rtl" | "ltr";
};

const LangCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    let saved: Lang = "ar";
    try {
      const v = localStorage.getItem(LANG_KEY);
      if (v === "en" || v === "ar") saved = v;
    } catch {}
    currentLang = saved;
    applyDirection(saved);
    return saved;
  });
  const dir = lang === "ar" ? "rtl" : "ltr";

  const setLang = (l: Lang) => {
    currentLang = l;
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
    setLangState(l);
    // Layout direction only truly applies after a reload; the provider's
    // effect below runs too late to flip an already-mounted tree.
    const needsFlip = I18nManager.isRTL !== (l === "ar");
    if (needsFlip) {
      applyDirection(l);
      setTimeout(() => {
        try {
          DevSettings.reload();
        } catch {}
      }, 0);
    }
  };

  const toggle = () => setLang(lang === "ar" ? "en" : "ar");

  const value: Ctx = {
    lang,
    dir,
    setLang,
    toggle,
    t: (k) => dict[k][lang],
  };
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useI18n must be inside LanguageProvider");
  return ctx;
}
