import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { Stethoscope, ShoppingBag, FlaskConical, Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: Pricing,
  head: () => ({
    meta: [
      { title: "خطط الاشتراك — DentalHub" },
      {
        name: "description",
        content:
          "خطط اشتراك DentalHub: مجاني للأطباء، 20$ شهرياً أو 120$ سنوياً لمكاتب المستلزمات والمختبرات، مع 3 أشهر تجربة مجانية.",
      },
    ],
  }),
});

type Cycle = "monthly" | "yearly";

function Pricing() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [cycle, setCycle] = useState<Cycle>("yearly");

  const t = {
    title: ar ? "خطط الاشتراك" : "Subscription Plans",
    subtitle: ar
      ? "اختر الخطة المناسبة لحسابك — أول 3 أشهر تجربة مجانية"
      : "Pick the plan that fits your account — first 3 months free trial",
    trial: ar ? "٣ أشهر تجربة مجانية" : "3 months free trial",
    monthly: ar ? "شهري" : "Monthly",
    yearly: ar ? "سنوي" : "Yearly",
    save: ar ? "وفّر 60$" : "Save $60",
    per_month: ar ? "/شهر" : "/mo",
    per_year: ar ? "/سنة" : "/yr",
    free: ar ? "مجاني" : "Free",
    current: ar ? "الأنسب لك" : "Recommended",
    subscribe: ar ? "اشترك الآن" : "Subscribe now",
    start_free: ar ? "ابدأ مجاناً" : "Get started free",
    contact: ar ? "تواصل معنا" : "Contact us",
    note: ar
      ? "الدفع سيتم تفعيله قريباً. تواصل معنا لتفعيل حساب مكتب أو مختبر."
      : "Payments coming soon. Contact us to activate an office or lab account.",
  };

  const monthlyPrice = "$20";
  const yearlyPrice = "$120";
  const isYearly = cycle === "yearly";

  const plans = [
    {
      key: "doctor",
      icon: Stethoscope,
      name: ar ? "الأطباء" : "Doctors",
      tagline: ar ? "لكل طبيب أسنان" : "For every dentist",
      price: t.free,
      priceSub: ar ? "دائماً" : "Always",
      cta: t.start_free,
      href: "/auth",
      tone: "bg-[oklch(0.93_0.06_175)] ring-[oklch(0.8_0.09_175)] text-[oklch(0.45_0.15_175)]",
      badge: null as string | null,
      features: [
        ar ? "تصفح مكاتب المستلزمات والمختبرات" : "Browse supply offices & labs",
        ar ? "إرسال وتتبع حالات المختبر" : "Send & track lab cases",
        ar ? "دليل الزرعات حسب البلد" : "Implants directory by country",
        ar ? "بدون رسوم أبداً" : "No fees ever",
      ],
      highlighted: false,
    },
    {
      key: "office",
      icon: ShoppingBag,
      name: ar ? "مكتب مستلزمات" : "Supply Office",
      tagline: ar ? "لعرض منتجاتك وبيعها" : "List and sell your products",
      price: isYearly ? yearlyPrice : monthlyPrice,
      priceSub: isYearly ? t.per_year : t.per_month,
      cta: t.subscribe,
      href: "/auth",
      tone: "bg-[oklch(0.93_0.06_250)] ring-[oklch(0.82_0.1_250)] text-[oklch(0.45_0.18_256)]",
      badge: t.current,
      features: [
        ar ? "صفحة مكتب مخصصة مع الفروع" : "Custom office page with branches",
        ar ? "إدارة المنتجات والأسعار" : "Manage products & pricing",
        ar ? "استقبال الطلبات من الأطباء" : "Receive orders from doctors",
        ar ? "ظهور في نتائج البحث" : "Appear in search results",
        t.trial,
      ],
      highlighted: true,
    },
    {
      key: "lab",
      icon: FlaskConical,
      name: ar ? "مختبر أسنان" : "Dental Lab",
      tagline: ar ? "لإدارة الحالات والأسعار" : "Manage cases & price list",
      price: isYearly ? yearlyPrice : monthlyPrice,
      priceSub: isYearly ? t.per_year : t.per_month,
      cta: t.subscribe,
      href: "/auth",
      tone: "bg-[oklch(0.93_0.06_30)] ring-[oklch(0.85_0.1_30)] text-[oklch(0.5_0.18_30)]",
      badge: null,
      features: [
        ar ? "صفحة مختبر مع قائمة الأسعار" : "Lab page with price list",
        ar ? "استقبال حالات جديدة" : "Receive new cases",
        ar ? "تحديث حالة كل طلب" : "Update case status live",
        ar ? "أنواع الأعمال ومدد التسليم" : "Work types & delivery days",
        t.trial,
      ],
      highlighted: false,
    },
  ];

  return (
    <MobileShell>
      <TopBar title={t.title} showBack />
      <div className="px-4 pt-4 pb-8 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[oklch(0.93_0.06_175)] ring-1 ring-[oklch(0.8_0.09_175)] text-[oklch(0.35_0.15_175)] text-xs font-bold">
            <Sparkles className="size-3.5" />
            {t.trial}
          </div>
          <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center">
          <div className="inline-flex bg-muted rounded-2xl p-1 ring-1 ring-border">
            <button
              onClick={() => setCycle("monthly")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                cycle === "monthly" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.monthly}
            </button>
            <button
              onClick={() => setCycle("yearly")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all inline-flex items-center gap-1.5 ${
                cycle === "yearly" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.yearly}
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[oklch(0.93_0.06_175)] text-[oklch(0.35_0.15_175)]">
                {t.save}
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="space-y-4">
          {plans.map((p) => (
            <div
              key={p.key}
              className={`relative bg-card border rounded-3xl p-5 shadow-soft ${
                p.highlighted ? "border-primary ring-2 ring-primary/20" : "border-border"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-2.5 start-5 text-[10px] font-bold px-2 py-1 rounded-full bg-primary text-primary-foreground shadow-sm">
                  {p.badge}
                </span>
              )}

              <div className="flex items-start gap-3">
                <span
                  className={`size-12 rounded-2xl ring-1 shadow-sm flex items-center justify-center shrink-0 ${p.tone}`}
                >
                  <p.icon className="size-6 drop-shadow-sm" strokeWidth={2.2} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight">{p.price}</span>
                {p.price !== t.free && (
                  <span className="text-sm text-muted-foreground font-medium">{p.priceSub}</span>
                )}
                {p.price === t.free && (
                  <span className="text-sm text-muted-foreground font-medium">· {p.priceSub}</span>
                )}
              </div>

              <ul className="mt-4 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 size-5 rounded-full bg-[oklch(0.93_0.06_175)] ring-1 ring-[oklch(0.8_0.09_175)] flex items-center justify-center shrink-0">
                      <Check className="size-3 text-[oklch(0.45_0.15_175)]" strokeWidth={3} />
                    </span>
                    <span className="text-foreground/90">{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={p.href}
                className={`mt-5 w-full flex items-center justify-center rounded-2xl py-3 text-sm font-bold transition-colors ${
                  p.highlighted
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-muted text-foreground hover:bg-accent"
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground px-4">{t.note}</p>
      </div>
    </MobileShell>
  );
}
