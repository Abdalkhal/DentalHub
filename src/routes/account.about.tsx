import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { Shield, FileText, Star, Share2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account/about")({
  component: AboutPage,
});

type Section = { title: { ar: string; en: string }; body: { ar: string; en: string } };

const TERMS_SECTIONS: Section[] = [
  {
    title: { ar: "المقدمة", en: "Introduction" },
    body: {
      ar: "مرحباً بك في DentalHub، المنصة التي تربط أطباء الأسنان بمكاتب المستلزمات والمختبرات ووكلاء الزراعة في العراق. باستخدامك التطبيق فإنك توافق على هذه الشروط.",
      en: "Welcome to DentalHub, the platform connecting dentists with supply offices, labs, and implant dealers in Iraq. By using the app you agree to these terms.",
    },
  },
  {
    title: { ar: "الحسابات وأنواع المستخدمين", en: "Accounts & user types" },
    body: {
      ar: "يوفر التطبيق حسابات لأطباء الأسنان ومكاتب المستلزمات والمختبرات وشركات الزرعة. أنت مسؤول عن صحة البيانات التي تقدمها عند التسجيل وعن تحديثها.",
      en: "The app provides accounts for dentists, supply offices, labs, and implant companies. You are responsible for the accuracy of the information you provide at registration and keeping it up to date.",
    },
  },
  {
    title: { ar: "الطلبات والمعاملات", en: "Orders & transactions" },
    body: {
      ar: "يتيح التطبيق إنشاء الطلبات والتواصل بين الأطباء والموردين. الأسعار والتوفر يحددهما المورد، ولا تتحمل DentalHub مسؤولية الخلافات المتعلقة بالدفع أو التسليم بين الأطراف.",
      en: "The app enables orders and communication between dentists and suppliers. Pricing and availability are set by the supplier, and DentalHub is not responsible for disputes regarding payment or delivery between parties.",
    },
  },
  {
    title: { ar: "أمان الحساب", en: "Account security" },
    body: {
      ar: "أنت مسؤول عن الحفاظ على سرية بيانات الدخول الخاصة بك. أبلغنا فوراً عن أي استخدام غير مصرح به لحسابك. نوصي باستخدام كلمة مرور قوية وعدم مشاركتها مع أي طرف.",
      en: "You are responsible for keeping your login credentials confidential. Report any unauthorized use of your account immediately. We recommend a strong password and never sharing it.",
    },
  },
  {
    title: { ar: "حدود المسؤولية", en: "Limitation of liability" },
    body: {
      ar: "تُقدَّم الخدمة «كما هي» دون ضمانات صريحة أو ضمنية. لا تتحمل DentalHub أي مسؤولية عن أي أضرار مباشرة أو غير مباشرة ناتجة عن استخدام التطبيق.",
      en: "The service is provided \"as is\" without warranties of any kind. DentalHub is not liable for any direct or indirect damages arising from use of the app.",
    },
  },
  {
    title: { ar: "الإنهاء", en: "Termination" },
    body: {
      ar: "يحق لنا تعليق أو إنهاء حسابك في حال انتهاك هذه الشروط أو إساءة استخدام المنصة.",
      en: "We may suspend or terminate your account if you violate these terms or misuse the platform.",
    },
  },
  {
    title: { ar: "التواصل", en: "Contact" },
    body: {
      ar: "لأي استفسار حول هذه الشروط، تواصل معنا عبر صفحة «تواصل معنا» داخل التطبيق.",
      en: "For any questions about these terms, reach us via the \"Contact us\" page inside the app.",
    },
  },
];

const PRIVACY_SECTIONS: Section[] = [
  {
    title: { ar: "البيانات التي نجمعها", en: "Data we collect" },
    body: {
      ar: "نجمع البيانات التي تقدمها عند التسجيل (الاسم، الهاتف، البريد الإلكتروني، المدينة) والبيانات المتعلقة بالطلبات والمنتجات والعروض التي تنشئها.",
      en: "We collect the data you provide at registration (name, phone, email, city) and data related to orders, products, and offers you create.",
    },
  },
  {
    title: { ar: "كيفية استخدام البيانات", en: "How we use data" },
    body: {
      ar: "نستخدم بياناتك لتشغيل الخدمة، وربط الأطباء بالموردين، وتحسين تجربة الاستخدام، والتواصل معك بشأن حسابك وطلباتك.",
      en: "We use your data to operate the service, connect dentists with suppliers, improve the experience, and communicate with you about your account and orders.",
    },
  },
  {
    title: { ar: "مشاركة البيانات", en: "Data sharing" },
    body: {
      ar: "لا نبيع بياناتك لأطراف ثالثة. تتم مشاركة الحد الأدنى من المعلومات الضرورية فقط بين الأطباء والموردين لتنفيذ الطلبات.",
      en: "We do not sell your data to third parties. Only the minimum information necessary is shared between dentists and suppliers to fulfill orders.",
    },
  },
  {
    title: { ar: "أمان الحساب والبيانات", en: "Account & data security" },
    body: {
      ar: "نطبّق إجراءات أمنية لحماية بياناتك بما في ذلك المصادقة عبر Firebase. راجع إعدادات كلمة المرور دورياً ولا تشارك بيانات الدخول.",
      en: "We apply security measures to protect your data including Firebase authentication. Review your password settings regularly and never share credentials.",
    },
  },
  {
    title: { ar: "حقوق المستخدم", en: "User rights" },
    body: {
      ar: "يحق لك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها، ويمكنك حذف حسابك من إعدادات التطبيق في أي وقت.",
      en: "You may request to access, correct, or delete your data, and you can delete your account from app settings at any time.",
    },
  },
  {
    title: { ar: "التواصل", en: "Contact" },
    body: {
      ar: "لأي استفسار حول سياسة الخصوصية، تواصل معنا عبر صفحة «تواصل معنا» داخل التطبيق.",
      en: "For any privacy questions, reach us via the \"Contact us\" page inside the app.",
    },
  },
];

function AboutPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [modal, setModal] = useState<"terms" | "privacy" | "rate" | null>(null);

  const handleShare = async () => {
    const url = "https://dentalhub.app";
    const text = ar
      ? "DentalHub — منصة تربط أطباء الأسنان بمكاتب المستلزمات والمختبرات ووكلاء الزراعة في العراق. جرّبها الآن!"
      : "DentalHub — the platform connecting dentists with supply offices, labs and implant dealers in Iraq. Try it now!";
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "DentalHub", text, url });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        toast.success(ar ? "تم نسخ رابط التطبيق" : "App link copied");
      } catch {
        toast.error(ar ? "تعذر نسخ الرابط" : "Could not copy link");
      }
    }
  };

  const links = [
    { key: "terms" as const, icon: FileText, label: ar ? "شروط الاستخدام" : "Terms of use" },
    { key: "privacy" as const, icon: Shield, label: ar ? "سياسة الخصوصية" : "Privacy policy" },
    { key: "rate" as const, icon: Star, label: ar ? "قيّم التطبيق" : "Rate the app" },
    { key: "share" as const, icon: Share2, label: ar ? "شارك التطبيق" : "Share app" },
  ];

  const onPress = (key: (typeof links)[number]["key"]) => {
    if (key === "share") {
      void handleShare();
      return;
    }
    setModal(key);
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "عن التطبيق" : "About"} showBack />
      <div className="px-4 pt-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-soft text-center">
          <div className="mx-auto size-16 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-2xl flex items-center justify-center">
            DH
          </div>
          <p className="mt-3 font-display font-extrabold text-lg">
            <span className="text-foreground">Dental</span>
            <span className="text-primary">Hub</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {ar ? "الإصدار 1.0.0" : "Version 1.0.0"}
          </p>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            {ar
              ? "منصة تربط أطباء الأسنان بمكاتب المستلزمات والمختبرات ووكلاء الزراعة في العراق."
              : "A platform connecting dentists with supply offices, labs, and implant dealers in Iraq."}
          </p>
        </div>

        <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
          {links.map((l) => (
            <li key={l.key}>
              <button
                onClick={() => onPress(l.key)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-start hover:bg-accent transition"
              >
                <span className="size-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                  <l.icon className="size-[18px]" />
                </span>
                <span className="flex-1 text-sm font-semibold">{l.label}</span>
                <span className="text-muted-foreground">›</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="text-center text-[11px] text-muted-foreground pt-2">
          © 2026 DentalHub · {ar ? "صُنع في الموصل" : "Made in Mosul"}
        </p>
      </div>

      {modal === "terms" && (
        <LegalSheet
          title={ar ? "شروط الاستخدام" : "Terms of use"}
          sections={TERMS_SECTIONS}
          ar={ar}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "privacy" && (
        <LegalSheet
          title={ar ? "سياسة الخصوصية" : "Privacy policy"}
          sections={PRIVACY_SECTIONS}
          ar={ar}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "rate" && <RatingModal ar={ar} onClose={() => setModal(null)} />}
    </MobileShell>
  );
}

function LegalSheet({
  title,
  sections,
  ar,
  onClose,
}: {
  title: string;
  sections: Section[];
  ar: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] max-h-[90vh] flex flex-col rounded-t-3xl bg-background"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border shrink-0">
          <h2 className="font-display font-extrabold text-base">{title}</h2>
          <button type="button" onClick={onClose} className="size-8 rounded-full bg-card border border-border flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {sections.map((s, i) => (
            <div key={i}>
              <p className="font-display font-bold text-sm mb-1">{ar ? s.title.ar : s.title.en}</p>
              <p className="text-[13px] text-muted-foreground leading-relaxed">{ar ? s.body.ar : s.body.en}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RatingModal({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (rating === 0) {
      toast.error(ar ? "الرجاء اختيار عدد النجوم" : "Please select a star rating");
      return;
    }
    try {
      localStorage.setItem(
        "dh_app_rating",
        JSON.stringify({ rating, feedback: feedback.trim(), at: new Date().toISOString() }),
      );
    } catch {}
    setSubmitted(true);
    toast.success(ar ? "شكراً لتقييمك!" : "Thanks for your feedback!");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl bg-background p-6 shadow-2xl"
      >
        {submitted ? (
          <div className="text-center py-4 space-y-3">
            <div className="mx-auto size-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Check className="size-7" />
            </div>
            <p className="font-display font-extrabold text-base">
              {ar ? "شكراً لك!" : "Thank you!"}
            </p>
            <p className="text-sm text-muted-foreground">
              {ar ? "تم استلام تقييمك بنجاح." : "Your feedback has been received."}
            </p>
            <button
              onClick={onClose}
              className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-sm"
            >
              {ar ? "إغلاق" : "Close"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-extrabold text-base">{ar ? "قيّم التطبيق" : "Rate the app"}</h2>
              <button type="button" onClick={onClose} className="size-8 rounded-full bg-card border border-border flex items-center justify-center">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex justify-center gap-1.5 py-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1"
                  aria-label={`${n} ${ar ? "نجوم" : "stars"}`}
                >
                  <Star
                    className={cn(
                      "size-9 transition-colors",
                      (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-slate-300",
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-1 mb-3">
              {rating > 0
                ? ar
                  ? `تقييمك: ${rating} من 5`
                  : `Your rating: ${rating} of 5`
                : ar
                  ? "اضغط على النجوم للتقييم"
                  : "Tap the stars to rate"}
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 300))}
              rows={3}
              placeholder={ar ? "أضف ملاحظتك (اختياري)…" : "Add your feedback (optional)…"}
              className="w-full rounded-xl bg-card border border-border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary resize-none"
            />
            <button
              onClick={submit}
              className="mt-3 w-full h-11 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-sm"
            >
              {ar ? "إرسال التقييم" : "Submit rating"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
