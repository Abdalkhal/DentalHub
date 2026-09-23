import {
  ShoppingBag,
  FlaskConical,
  CreditCard,
  FileText,
  Package,
  Users,
  Wallet,
  Megaphone,
  type LucideIcon,
} from "lucide-react-native";
import type { AccountType } from "@/integrations/firebase/types";

export type HelpTopic = {
  slug: string;
  icon: LucideIcon;
  tone: string;
  // Which accounts see this topic — 'all' for the ones that apply to
  // every account type (payments, profile). Everything else is written
  // from that specific account's own side of the workflow, not a dentist's.
  roles: AccountType[] | "all";
  title: { ar: string; en: string };
  intro: { ar: string; en: string };
  faqs: { q: { ar: string; en: string }; a: { ar: string; en: string } }[];
};

export const helpTopics: HelpTopic[] = [
  // ── Dentist ──────────────────────────────────────────────
  {
    slug: "orders",
    icon: ShoppingBag,
    tone: "bg-blue-100 text-blue-600",
    roles: ["dentist"],
    title: { ar: "الطلبات والشحن", en: "Orders & shipping" },
    intro: {
      ar: "كل ما يخص إنشاء الطلبات، تعديلها، إلغائها، ومتابعة الشحن داخل الموصل.",
      en: "Everything about creating, editing, cancelling orders and tracking shipments in Mosul.",
    },
    faqs: [
      {
        q: { ar: "كيف أضع طلب مستلزمات؟", en: "How do I place a supplies order?" },
        a: {
          ar: "افتح قسم المستلزمات الطبية، اختر المكتب ثم المنتج، واضغط أضف للطلب. راجع السلة وأكّد.",
          en: "Open Medical Supplies, pick an office and product, then tap Add to order. Review your cart and confirm.",
        },
      },
      {
        q: { ar: "هل يمكنني إلغاء طلب؟", en: "Can I cancel an order?" },
        a: {
          ar: "نعم قبل تجهيز الطلب من قِبل المكتب. افتح طلباتي واضغط إلغاء.",
          en: "Yes, before the office processes it. Open Orders and tap Cancel.",
        },
      },
      {
        q: { ar: "ما مدة التوصيل داخل الموصل؟", en: "How long does delivery take in Mosul?" },
        a: {
          ar: "غالباً خلال نفس اليوم للطلبات قبل الساعة 2 ظهراً، وإلا اليوم التالي.",
          en: "Usually same-day for orders before 2pm, otherwise next day.",
        },
      },
    ],
  },
  {
    slug: "lab-cases",
    icon: FlaskConical,
    tone: "bg-amber-100 text-amber-600",
    roles: ["dentist"],
    title: { ar: "حالات المختبر", en: "Lab cases" },
    intro: {
      ar: "كيفية إرسال الحالات للمختبر، متابعة المراحل، وتسلّم العمل النهائي.",
      en: "How to send cases to the lab, follow stages, and receive the final work.",
    },
    faqs: [
      {
        q: { ar: "كيف أتابع حالتي في المختبر؟", en: "How do I track a lab case?" },
        a: {
          ar: "من قسم المختبرات اضغط 'تتبع الحالات' لمشاهدة مراحل: استلام، تنفيذ، انتهاء، في الطريق، تسليم.",
          en: "From Labs tap 'Track cases' to see stages: received, in progress, completed, on the way, delivered.",
        },
      },
      {
        q: { ar: "كيف أرسل حالة جديدة؟", en: "How do I send a new case?" },
        a: {
          ar: "اختر المختبر ثم اضغط 'إرسال حالة جديدة' واملأ نوع العمل والتفاصيل والمواعيد.",
          en: "Pick the lab and tap 'Send new case', fill in work type, details and dates.",
        },
      },
    ],
  },

  // ── Supply office ────────────────────────────────────────
  {
    slug: "supply-orders",
    icon: ShoppingBag,
    tone: "bg-blue-100 text-blue-600",
    roles: ["supply"],
    title: { ar: "الطلبات الواردة", en: "Incoming orders" },
    intro: {
      ar: "كيفية استلام الطلبات من الأطباء، تأكيدها، وتحديث حالة الشحن.",
      en: "How to receive orders from dentists, confirm them, and update shipping status.",
    },
    faqs: [
      {
        q: { ar: "أين تظهر طلبات الأطباء الجديدة؟", en: "Where do new dentist orders show up?" },
        a: {
          ar: "من تبويب الطلبات أسفل الشاشة — الطلب الجديد يظهر بحالة 'قيد الانتظار' حتى تؤكّده.",
          en: "In the Orders tab at the bottom — a new order shows as 'Pending' until you confirm it.",
        },
      },
      {
        q: { ar: "كيف أؤكّد طلباً وأحدّث حالته؟", en: "How do I confirm an order and update its status?" },
        a: {
          ar: "افتح الطلب من القائمة واضغط تأكيد، ثم غيّر الحالة (تم التجهيز، تم الشحن...) عند كل مرحلة.",
          en: "Open the order from the list and tap Confirm, then change its status (Prepared, Shipped...) at each stage.",
        },
      },
      {
        q: { ar: "ماذا لو نفد أحد المنتجات المطلوبة؟", en: "What if an ordered product is out of stock?" },
        a: {
          ar: "حدّث مخزونه إلى صفر من صفحة المنتج ليتوقف ظهوره متاحاً، وتواصل مع الطبيب لتعديل طلبه.",
          en: "Set its stock to zero from the product page so it stops showing as available, and contact the dentist to adjust their order.",
        },
      },
    ],
  },
  {
    slug: "supply-products",
    icon: Package,
    tone: "bg-emerald-100 text-emerald-600",
    roles: ["supply"],
    title: { ar: "إدارة المنتجات", en: "Product management" },
    intro: {
      ar: "إضافة منتج جديد، تعديل السعر والمخزون، وإدارة الصور.",
      en: "Adding a new product, editing price and stock, and managing images.",
    },
    faqs: [
      {
        q: { ar: "كيف أضيف منتجاً جديداً؟", en: "How do I add a new product?" },
        a: {
          ar: "من لوحة المستلزمات اضغط 'إضافة منتج' واملأ الاسم، الفئة، السعر، والمخزون، ثم أرفق صورة.",
          en: "From the Supplies dashboard tap 'Add product' and fill in name, category, price and stock, then attach an image.",
        },
      },
      {
        q: { ar: "كيف أعدّل السعر أو المخزون لاحقاً؟", en: "How do I edit price or stock later?" },
        a: {
          ar: "افتح المنتج من قائمة منتجاتك واضغط تعديل، عدّل الحقل المطلوب ثم احفظ.",
          en: "Open the product from your products list, tap Edit, change the field you need, then save.",
        },
      },
    ],
  },

  // ── Implant company ──────────────────────────────────────
  {
    slug: "implant-orders",
    icon: ShoppingBag,
    tone: "bg-blue-100 text-blue-600",
    roles: ["implant"],
    title: { ar: "الطلبات الواردة", en: "Incoming orders" },
    intro: {
      ar: "كيفية استلام طلبات الزرعات من الأطباء، تأكيدها، وتحديث حالة الشحن.",
      en: "How to receive implant orders from dentists, confirm them, and update shipping status.",
    },
    faqs: [
      {
        q: { ar: "أين تظهر طلبات الزرعات الجديدة؟", en: "Where do new implant orders show up?" },
        a: {
          ar: "من تبويب الطلبات أسفل الشاشة — الطلب الجديد يظهر بحالة 'قيد الانتظار' حتى تؤكّده.",
          en: "In the Orders tab at the bottom — a new order shows as 'Pending' until you confirm it.",
        },
      },
      {
        q: { ar: "كيف أؤكّد طلباً وأحدّث حالته؟", en: "How do I confirm an order and update its status?" },
        a: {
          ar: "افتح الطلب من القائمة واضغط تأكيد، ثم غيّر الحالة عند كل مرحلة حتى التسليم.",
          en: "Open the order from the list and tap Confirm, then change its status at each stage through to delivery.",
        },
      },
    ],
  },
  {
    slug: "implant-products",
    icon: Package,
    tone: "bg-emerald-100 text-emerald-600",
    roles: ["implant"],
    title: { ar: "إدارة الزرعات والإكسسوارات", en: "Implant & accessory management" },
    intro: {
      ar: "إضافة زرعة جديدة، ربط إكسسوار أو كت جراحي بها، وتعديل السعر والمخزون.",
      en: "Adding a new implant, linking an accessory or surgical kit to it, and editing price and stock.",
    },
    faqs: [
      {
        q: { ar: "كيف أضيف زرعة جديدة؟", en: "How do I add a new implant?" },
        a: {
          ar: "من لوحة الزرعات اضغط 'إضافة زرعة جديدة'، اختر تبويب 'زرعة'، واملأ الاسم والشركة المصنعة والأقطار والأطوال والسعر.",
          en: "From the Implants dashboard tap 'Add new implant', choose the 'Implant' tab, and fill in name, manufacturer, diameters, lengths and price.",
        },
      },
      {
        q: { ar: "كيف أضيف إكسسواراً أو كت جراحياً؟", en: "How do I add an accessory or surgical kit?" },
        a: {
          ar: "في نفس نافذة الإضافة اختر تبويب 'إكسسوار' أو 'كت جراحي' — لكل منها سعر وصورة خاصة به، منفصلة عن الزرعة الأساسية.",
          en: "In the same add screen, choose the 'Accessory' or 'Surgical Kit' tab — each has its own price and image, separate from the main implant.",
        },
      },
    ],
  },

  // ── Lab ───────────────────────────────────────────────────
  {
    slug: "lab-incoming-cases",
    icon: FlaskConical,
    tone: "bg-amber-100 text-amber-600",
    roles: ["lab"],
    title: { ar: "الحالات الواردة", en: "Incoming cases" },
    intro: {
      ar: "كيفية استلام حالة من طبيب، تحديث مراحل التنفيذ، وتسليم العمل النهائي.",
      en: "How to receive a case from a dentist, update its production stages, and deliver the finished work.",
    },
    faqs: [
      {
        q: { ar: "أين تظهر الحالة الجديدة المرسلة من الطبيب؟", en: "Where does a new case sent by a dentist show up?" },
        a: {
          ar: "من تبويب الطلبات أسفل الشاشة — تظهر بحالة 'استلام' حتى تبدأ العمل عليها.",
          en: "In the Orders tab at the bottom — it shows as 'Received' until you start working on it.",
        },
      },
      {
        q: { ar: "كيف أحدّث مرحلة الحالة؟", en: "How do I update a case's stage?" },
        a: {
          ar: "افتح الحالة من 'حالات العمل' وغيّر المرحلة (تنفيذ، انتهاء، في الطريق، تسليم) مع تقدّم العمل.",
          en: "Open the case from 'Production' and change its stage (In progress, Completed, On the way, Delivered) as work advances.",
        },
      },
    ],
  },
  {
    slug: "lab-staff",
    icon: Users,
    tone: "bg-violet-100 text-violet-600",
    roles: ["lab"],
    title: { ar: "إدارة الكادر", en: "Staff management" },
    intro: {
      ar: "دعوة أعضاء الكادر، تحديد صلاحياتهم، وإدارتهم.",
      en: "Inviting staff members, setting their permissions, and managing them.",
    },
    faqs: [
      {
        q: { ar: "كيف أدعو عضواً جديداً للكادر؟", en: "How do I invite a new staff member?" },
        a: {
          ar: "من قسم 'الكادر' اضغط 'دعوة عضو'، أدخل بريده الإلكتروني وكلمة مرور مؤقتة.",
          en: "From the Staff section tap 'Invite member', enter their email and a temporary password.",
        },
      },
    ],
  },
  {
    slug: "lab-finance",
    icon: Wallet,
    tone: "bg-emerald-100 text-emerald-600",
    roles: ["lab"],
    title: { ar: "المالية", en: "Finance" },
    intro: {
      ar: "تسجيل دفعات العيادات، ومتابعة كشف الحساب.",
      en: "Logging clinic payments and tracking statements.",
    },
    faqs: [
      {
        q: { ar: "كيف أسجّل دفعة من عيادة؟", en: "How do I log a clinic payment?" },
        a: {
          ar: "من قسم 'المالية' اضغط 'دفعة جديدة'، اختر العيادة وأدخل المبلغ والتاريخ.",
          en: "From the Finance section tap 'New payment', choose the clinic and enter the amount and date.",
        },
      },
    ],
  },

  // ── Offers/ads (dentist-facing sellers) ─────────────────
  {
    slug: "offers",
    icon: Megaphone,
    tone: "bg-emerald-100 text-emerald-600",
    roles: ["supply", "implant"],
    title: { ar: "العروض والإعلانات", en: "Offers & ads" },
    intro: {
      ar: "نشر عرض خاص أو إعلان يصل لجميع الأطباء.",
      en: "Publishing a special offer or an ad that reaches every dentist.",
    },
    faqs: [
      {
        q: { ar: "كيف أنشر عرضاً؟", en: "How do I publish an offer?" },
        a: {
          ar: "من حسابي > العروض اضغط 'إعلان جديد'، أضف صورة ووصفاً ورقم تواصل.",
          en: "From Account > Offers tap 'New ad', add an image, description and contact number.",
        },
      },
    ],
  },

  // ── Universal ─────────────────────────────────────────────
  {
    slug: "payments",
    icon: CreditCard,
    tone: "bg-emerald-100 text-emerald-600",
    roles: "all",
    title: { ar: "الدفع والفواتير", en: "Payment & invoices" },
    intro: {
      ar: "طرق الدفع المتاحة، الفواتير، ورد المبالغ.",
      en: "Available payment methods, invoices, and refunds.",
    },
    faqs: [
      {
        q: { ar: "ما طرق الدفع المتاحة؟", en: "What payment methods are available?" },
        a: {
          ar: "الدفع عند الاستلام، أو التحويل البنكي، أو المحفظة الإلكترونية.",
          en: "Cash on delivery, bank transfer, or e-wallet.",
        },
      },
      {
        q: { ar: "كيف أحصل على فاتورة؟", en: "How do I get an invoice?" },
        a: {
          ar: "تجد الفاتورة داخل تفاصيل الطلب بعد التأكيد، ويمكن تنزيلها PDF.",
          en: "You'll find the invoice inside the order details after confirmation, downloadable as PDF.",
        },
      },
    ],
  },
  {
    slug: "account",
    icon: FileText,
    tone: "bg-violet-100 text-violet-600",
    roles: "all",
    title: { ar: "الحساب والملف الشخصي", en: "Account & profile" },
    intro: {
      ar: "تعديل البيانات الشخصية، الإشعارات، اللغة، وحذف الحساب.",
      en: "Edit personal info, notifications, language, and delete account.",
    },
    faqs: [
      {
        q: { ar: "كيف أبدّل اللغة؟", en: "How do I switch language?" },
        a: {
          ar: "من شريط الأعلى اضغط زر AR/EN، أو من حسابي > اللغة.",
          en: "Use the AR/EN button in the top bar, or Account > Language.",
        },
      },
      {
        q: { ar: "كيف أحدّث بياناتي؟", en: "How do I update my info?" },
        a: {
          ar: "حسابي > الإعدادات > البيانات الشخصية ثم احفظ.",
          en: "Account > Settings > Personal info, then save.",
        },
      },
      {
        q: { ar: "كيف أحذف حسابي؟", en: "How do I delete my account?" },
        a: {
          ar: "من الإعدادات في الأسفل اضغط حذف الحساب وأكّد.",
          en: "From Settings, at the bottom tap Delete account and confirm.",
        },
      },
    ],
  },
];

export function helpTopicsFor(accountType: AccountType | undefined): HelpTopic[] {
  return helpTopics.filter((t) => t.roles === "all" || (accountType && t.roles.includes(accountType)));
}
