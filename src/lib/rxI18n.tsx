import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

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
  tab_orders: { ar: "طلباتي", en: "Orders" },
  tab_account: { ar: "حسابي", en: "Account" },
  tab_more: { ar: "المزيد", en: "More" },
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
  account_name: { ar: "د. أحمد العاني", en: "Dr. Ahmed Al-Ani" },
  account_clinic: { ar: "عيادة الموصل لطب الأسنان", en: "Mosul Dental Clinic" },
  logout: { ar: "تسجيل الخروج", en: "Log out" },
  settings: { ar: "الإعدادات", en: "Settings" },
  language: { ar: "اللغة", en: "Language" },
  help: { ar: "المساعدة", en: "Help" },
  about: { ar: "عن التطبيق", en: "About" },
} satisfies Dict;

export type DictKey = keyof typeof dict;

type Ctx = { lang: Lang; t: (k: DictKey) => string; setLang: (l: Lang) => void; toggle: () => void; dir: "rtl" | "ltr" };

const LangCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
    }
  }, [lang, dir]);

  const value: Ctx = {
    lang,
    dir,
    setLang,
    toggle: () => setLang((p) => (p === "ar" ? "en" : "ar")),
    t: (k) => dict[k][lang],
  };
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangCtx);
  if (!ctx) throw new Error("useI18n must be inside LanguageProvider");
  return ctx;
}
