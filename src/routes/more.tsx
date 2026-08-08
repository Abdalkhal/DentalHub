import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useUserRole } from "@/lib/useAuth";
import {
  ShoppingBag, FlaskConical, Bone, ListChecks, Globe, Settings2,
  Crown, ClipboardList, Users, BarChart3, CreditCard, MessageSquare,
  Layers, Package, Stethoscope, Heart, Tag,
} from "lucide-react";

export const Route = createFileRoute("/more")({ component: More });

function More() {
  const { t, lang, toggle } = useI18n();
  const { role } = useUserRole();

  const isDentist = role?.accountType === "dentist";
  const isLab = role?.accountType === "lab";
  const isSupply = role?.accountType === "supply";
  const isImplant = role?.accountType === "implant";

  const tone = (c: string) => `bg-[oklch(0.93_0.06_${c})] ring-[oklch(0.82_0.1_${c})] text-[oklch(0.45_0.18_${c})]`;

  const links = isDentist ? [
    { to: "/track-cases", icon: ClipboardList, label: ar("تتبع حالاتك", "Track cases"), tone: tone("200") },
    { to: "/patients", icon: Users, label: ar("المرضى", "Patients"), tone: tone("300") },
    { to: "/orders", icon: ShoppingBag, label: ar("طلباتي", "My Orders"), tone: tone("220") },
    { to: "/favorites", icon: Heart, label: t("tab_favorites"), tone: tone("340") },
    { to: "/offers", icon: Tag, label: t("tab_offers"), tone: tone("80") },
    { to: "/supplies", icon: Package, label: t("supplies"), tone: tone("165") },
    { to: "/labs", icon: FlaskConical, label: t("labs"), tone: tone("175") },
    { to: "/implants", icon: Bone, label: t("implants"), tone: tone("30") },
    { to: "/account/settings", icon: Settings2, label: ar("الإعدادات", "Settings"), tone: tone("250") },
  ] : isLab ? [
    { to: "/labs/dashboard", icon: BarChart3, label: ar("لوحة التحكم", "Dashboard"), tone: tone("250") },
    { to: "/orders", icon: ClipboardList, label: t("tab_orders"), tone: tone("200") },
    { to: "/production", icon: Layers, label: ar("حالات العمل", "Production"), tone: tone("175") },
    { to: "/patients", icon: Users, label: ar("المرضى", "Patients"), tone: tone("300") },
    { to: "/doctors", icon: Users, label: ar("الأطباء", "Doctors"), tone: tone("220") },
    { to: "/reports", icon: BarChart3, label: ar("التقارير", "Reports"), tone: tone("80") },
    { to: "/finance", icon: CreditCard, label: ar("المالية", "Finance"), tone: tone("140") },
    { to: "/supplies", icon: Package, label: t("supplies"), tone: tone("165") },
    { to: "/lab/my-services", icon: Stethoscope, label: ar("خدمات المختبر", "Lab services"), tone: tone("250") },
    { to: "/account/settings", icon: Settings2, label: ar("الإعدادات", "Settings"), tone: tone("300") },
  ] : isSupply || isImplant ? [
    { to: "/supplies", icon: Package, label: t("supplies"), tone: tone("165") },
    { to: "/orders", icon: ClipboardList, label: t("tab_orders"), tone: tone("200") },
    { to: "/account/settings", icon: Settings2, label: ar("الإعدادات", "Settings"), tone: tone("250") },
  ] : [
    { to: "/supplies", icon: Package, label: t("supplies"), tone: tone("165") },
    { to: "/labs", icon: FlaskConical, label: t("labs"), tone: tone("175") },
    { to: "/implants", icon: Bone, label: t("implants"), tone: tone("30") },
    { to: "/account/settings", icon: Settings2, label: ar("الإعدادات", "Settings"), tone: tone("250") },
  ];

  function ar(a: string, e: string) { return lang === "ar" ? a : e; }

  return (
    <MobileShell>
      <TopBar title={t("tab_more")} />
      <div className="px-4 pt-4 space-y-4">
        <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent transition-colors">
                <span className={`size-10 rounded-2xl ring-1 shadow-sm flex items-center justify-center ${l.tone}`}>
                  <l.icon className="size-5 drop-shadow-sm" strokeWidth={2.2} />
                </span>
                <span className="flex-1 text-sm font-semibold">{l.label}</span>
                <span className="text-muted-foreground">›</span>
              </Link>
            </li>
          ))}
        </ul>
        <button onClick={toggle} className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3.5 shadow-soft hover:bg-accent transition-colors">
          <span className="size-10 rounded-2xl ring-1 shadow-sm flex items-center justify-center bg-[oklch(0.93_0.06_175)] ring-[oklch(0.8_0.09_175)] text-[oklch(0.45_0.15_175)]">
            <Globe className="size-5 drop-shadow-sm" strokeWidth={2.2} />
          </span>
          <span className="flex-1 text-sm font-semibold text-start">{t("language")} · {lang === "ar" ? "العربية" : "English"}</span>
          <span className="text-xs font-bold text-primary">{lang === "ar" ? "EN" : "AR"}</span>
        </button>
      </div>
    </MobileShell>
  );
}
