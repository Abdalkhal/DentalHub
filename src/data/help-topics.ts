import { ShoppingBag, FlaskConical, CreditCard, FileText, type LucideIcon } from "lucide-react";

export type HelpTopic = {
  slug: string;
  icon: LucideIcon;
  tone: string;
  title: { ar: string; en: string };
  intro: { ar: string; en: string };
  faqs: { q: { ar: string; en: string }; a: { ar: string; en: string } }[];
};

export const helpTopics: HelpTopic[] = [
  {
    slug: "orders",
    icon: ShoppingBag,
    tone: "bg-blue-100 text-blue-600",
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
  {
    slug: "payments",
    icon: CreditCard,
    tone: "bg-emerald-100 text-emerald-600",
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
