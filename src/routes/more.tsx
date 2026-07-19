import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import {
  ShoppingBag,
  FlaskConical,
  Bone,
  ListChecks,
  Globe,
  Settings2,
  Crown,
  ClipboardList,
  Users,
  BarChart3,
  CreditCard,
  MessageSquare,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/more")({
  component: More,
});

function More() {
  const { t, lang, toggle } = useI18n();
  const links = [
    {
      to: "/orders",
      icon: ClipboardList,
      label: lang === "ar" ? "طلباتي" : "My Orders",
      tone: "bg-[oklch(0.93_0.06_200)] ring-[oklch(0.82_0.1_200)] text-[oklch(0.45_0.18_200)]",
    },
    {
      to: "/production",
      icon: Layers,
      label: lang === "ar" ? "حالات العمل" : "Production",
      tone: "bg-[oklch(0.93_0.06_175)] ring-[oklch(0.8_0.09_175)] text-[oklch(0.45_0.15_175)]",
    },
    {
      to: "/patients",
      icon: Users,
      label: lang === "ar" ? "المرضى" : "Patients",
      tone: "bg-[oklch(0.93_0.06_300)] ring-[oklch(0.82_0.1_300)] text-[oklch(0.45_0.18_300)]",
    },
    {
      to: "/doctors",
      icon: Users,
      label: lang === "ar" ? "الأطباء" : "Doctors",
      tone: "bg-[oklch(0.93_0.06_220)] ring-[oklch(0.82_0.1_220)] text-[oklch(0.45_0.18_220)]",
    },
    {
      to: "/reports",
      icon: BarChart3,
      label: lang === "ar" ? "التقارير" : "Reports",
      tone: "bg-[oklch(0.93_0.06_80)] ring-[oklch(0.85_0.11_80)] text-[oklch(0.45_0.15_70)]",
    },
    {
      to: "/finance",
      icon: CreditCard,
      label: lang === "ar" ? "المالية" : "Finance",
      tone: "bg-[oklch(0.93_0.06_140)] ring-[oklch(0.82_0.1_140)] text-[oklch(0.45_0.18_140)]",
    },
    {
      to: "/messages",
      icon: MessageSquare,
      label: lang === "ar" ? "الرسائل" : "Messages",
      tone: "bg-[oklch(0.93_0.06_250)] ring-[oklch(0.82_0.1_250)] text-[oklch(0.45_0.18_256)]",
    },
    {
      to: "/supplies",
      icon: ShoppingBag,
      label: t("supplies"),
      tone: "bg-[oklch(0.93_0.06_250)] ring-[oklch(0.82_0.1_250)] text-[oklch(0.45_0.18_256)]",
    },
    {
      to: "/labs",
      icon: FlaskConical,
      label: t("labs"),
      tone: "bg-[oklch(0.93_0.06_175)] ring-[oklch(0.8_0.09_175)] text-[oklch(0.45_0.15_175)]",
    },
    {
      to: "/labs/cases",
      icon: ListChecks,
      label: t("track_cases"),
      tone: "bg-[oklch(0.93_0.06_175)] ring-[oklch(0.8_0.09_175)] text-[oklch(0.45_0.15_175)]",
    },
    {
      to: "/implants",
      icon: Bone,
      label: t("implants"),
      tone: "bg-[oklch(0.93_0.06_30)] ring-[oklch(0.85_0.1_30)] text-[oklch(0.5_0.18_30)]",
    },
    {
      to: "/pricing",
      icon: Crown,
      label: lang === "ar" ? "خطط الاشتراك" : "Subscription plans",
      tone: "bg-[oklch(0.93_0.06_80)] ring-[oklch(0.85_0.11_80)] text-[oklch(0.45_0.15_70)]",
    },
    {
      to: "/admin",
      icon: Settings2,
      label: lang === "ar" ? "لوحة الإدارة" : "Admin panel",
      tone: "bg-[oklch(0.93_0.06_300)] ring-[oklch(0.82_0.1_300)] text-[oklch(0.45_0.18_300)]",
    },
  ] as const;
  return (
    <MobileShell>
      <TopBar title={t("tab_more")} />
      <div className="px-4 pt-4 space-y-4">
        <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent transition-colors"
              >
                <span
                  className={`size-10 rounded-2xl ring-1 shadow-sm flex items-center justify-center ${l.tone}`}
                >
                  <l.icon className="size-5 drop-shadow-sm" strokeWidth={2.2} />
                </span>
                <span className="flex-1 text-sm font-semibold">{l.label}</span>
                <span className="text-muted-foreground">›</span>
              </Link>
            </li>
          ))}
        </ul>

        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3.5 shadow-soft hover:bg-accent transition-colors"
        >
          <span className="size-10 rounded-2xl ring-1 shadow-sm flex items-center justify-center bg-[oklch(0.93_0.06_175)] ring-[oklch(0.8_0.09_175)] text-[oklch(0.45_0.15_175)]">
            <Globe className="size-5 drop-shadow-sm" strokeWidth={2.2} />
          </span>
          <span className="flex-1 text-sm font-semibold text-start">
            {t("language")} · {lang === "ar" ? "العربية" : "English"}
          </span>
          <span className="text-xs font-bold text-primary">{lang === "ar" ? "EN" : "AR"}</span>
        </button>
      </div>
    </MobileShell>
  );
}
