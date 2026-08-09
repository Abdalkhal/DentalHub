import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useUserRole, useIsAdmin } from "@/lib/useAuth";
import {
  ShoppingBag,
  FlaskConical,
  Bone,
  ListChecks,
  Globe,
  Crown,
  ClipboardList,
  Users,
  BarChart3,
  CreditCard,
  MessageSquare,
  Layers,
  Heart,
  Stethoscope,
  Store,
  Cog,
  LifeBuoy,
  FileText,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/more")({
  component: More,
});

type MoreLink = {
  to: string;
  icon: typeof Globe;
  label: string;
  tone: string;
  roles: ("dentist" | "supply" | "lab" | "implant" | "admin")[];
};

function More() {
  const { t, lang, toggle } = useI18n();
  const { role } = useUserRole();
  const { isAdmin } = useIsAdmin();
  const accountType = role?.accountType ?? "dentist";
  const ar = lang === "ar";

  const allLinks: MoreLink[] = [
    // ── Dentist-only ──
    {
      to: "/clinic",
      icon: Stethoscope,
      label: ar ? "عيادتي" : "My Clinic",
      tone: "bg-rose-50 ring-rose-200 text-rose-600",
      roles: ["dentist"],
    },
    {
      to: "/favorites",
      icon: Heart,
      label: ar ? "المفضلة" : "Favorites",
      tone: "bg-pink-50 ring-pink-200 text-pink-600",
      roles: ["dentist"],
    },
    {
      to: "/track-cases",
      icon: ListChecks,
      label: ar ? "تتبع الحالات" : "Track cases",
      tone: "bg-amber-50 ring-amber-200 text-amber-600",
      roles: ["dentist"],
    },
    {
      to: "/patients",
      icon: Users,
      label: ar ? "المرضى" : "Patients",
      tone: "bg-indigo-50 ring-indigo-200 text-indigo-600",
      roles: ["dentist", "lab"],
    },
    {
      to: "/brands",
      icon: Crown,
      label: ar ? "البراندات" : "Brands",
      tone: "bg-yellow-50 ring-yellow-200 text-yellow-600",
      roles: ["dentist"],
    },

    // ── Supply & Implant ──
    {
      to: "/supplies",
      icon: ShoppingBag,
      label: t("supplies"),
      tone: "bg-sky-50 ring-sky-200 text-sky-600",
      roles: ["dentist", "supply", "lab", "admin"],
    },
    {
      to: "/labs",
      icon: FlaskConical,
      label: t("labs"),
      tone: "bg-violet-50 ring-violet-200 text-violet-600",
      roles: ["dentist", "lab", "admin"],
    },
    {
      to: "/implants",
      icon: Bone,
      label: t("implants"),
      tone: "bg-amber-50 ring-amber-200 text-amber-600",
      roles: ["dentist", "implant", "admin"],
    },
    {
      to: "/offers",
      icon: Store,
      label: ar ? "العروض" : "Offers",
      tone: "bg-emerald-50 ring-emerald-200 text-emerald-600",
      roles: ["dentist", "supply", "implant"],
    },

    // ── Lab-only ──
    {
      to: "/labs/dashboard",
      icon: BarChart3,
      label: ar ? "لوحة المختبر" : "Lab Dashboard",
      tone: "bg-violet-50 ring-violet-200 text-violet-600",
      roles: ["lab"],
    },
    {
      to: "/production",
      icon: Layers,
      label: ar ? "حالات العمل" : "Production",
      tone: "bg-emerald-50 ring-emerald-200 text-emerald-600",
      roles: ["lab"],
    },
    {
      to: "/lab/my-services",
      icon: Cog,
      label: ar ? "خدمات المختبر" : "Lab Services",
      tone: "bg-slate-100 ring-slate-300 text-slate-600",
      roles: ["lab"],
    },
    {
      to: "/labs/cases",
      icon: ListChecks,
      label: ar ? "متابعة الحالات" : "Cases",
      tone: "bg-teal-50 ring-teal-200 text-teal-600",
      roles: ["lab"],
    },
    {
      to: "/doctors",
      icon: Users,
      label: ar ? "الأطباء" : "Doctors",
      tone: "bg-cyan-50 ring-cyan-200 text-cyan-600",
      roles: ["lab"],
    },
    {
      to: "/finance",
      icon: CreditCard,
      label: ar ? "المالية" : "Finance",
      tone: "bg-green-50 ring-green-200 text-green-600",
      roles: ["lab"],
    },

    // ── Shared ──
    {
      to: "/orders",
      icon: ClipboardList,
      label: ar ? "طلباتي" : "My Orders",
      tone: "bg-teal-50 ring-teal-200 text-teal-600",
      roles: ["dentist", "supply", "lab", "implant"],
    },
    {
      to: "/reports",
      icon: BarChart3,
      label: ar ? "التقارير" : "Reports",
      tone: "bg-lime-50 ring-lime-200 text-lime-700",
      roles: ["dentist", "lab"],
    },
    {
      to: "/messages",
      icon: MessageSquare,
      label: ar ? "الرسائل" : "Messages",
      tone: "bg-blue-50 ring-blue-200 text-blue-600",
      roles: ["dentist", "supply", "lab", "implant"],
    },
    {
      to: "/explore",
      icon: Globe,
      label: ar ? "استكشاف" : "Explore",
      tone: "bg-sky-50 ring-sky-200 text-sky-600",
      roles: ["dentist", "supply", "lab", "implant"],
    },
    {
      to: "/pricing",
      icon: Crown,
      label: ar ? "خطط الاشتراك" : "Subscription plans",
      tone: "bg-purple-50 ring-purple-200 text-purple-600",
      roles: ["dentist", "supply", "lab", "implant"],
    },

    // ── Admin-only ──
    {
      to: "/admin",
      icon: ShieldAlert,
      label: ar ? "لوحة الإدارة" : "Admin panel",
      tone: "bg-rose-50 ring-rose-200 text-rose-600",
      roles: ["admin"],
    },

    // ── Account ──
    {
      to: "/account/settings",
      icon: Cog,
      label: ar ? "الإعدادات" : "Settings",
      tone: "bg-slate-100 ring-slate-300 text-slate-600",
      roles: ["dentist", "supply", "lab", "implant"],
    },
    {
      to: "/account/help",
      icon: LifeBuoy,
      label: ar ? "المساعدة" : "Help",
      tone: "bg-orange-50 ring-orange-200 text-orange-600",
      roles: ["dentist", "supply", "lab", "implant"],
    },
    {
      to: "/account/about",
      icon: FileText,
      label: ar ? "عن التطبيق" : "About",
      tone: "bg-gray-50 ring-gray-200 text-gray-600",
      roles: ["dentist", "supply", "lab", "implant"],
    },
  ];

  const isRole = (r: (typeof allLinks)[0]["roles"][0]) => {
    if (r === "admin") return isAdmin;
    return accountType === r || isAdmin;
  };

  const links = allLinks.filter((l) => l.roles.some((r) => isRole(r)));

  return (
    <MobileShell>
      <TopBar title={t("tab_more")} />
      <div className="px-4 pt-4 pb-4 space-y-4">
        {/* Role badge */}
        <div className="flex items-center gap-2 px-1">
          <span className="text-xs font-bold text-slate-500">
            {ar ? "الحساب:" : "Account:"}
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">
            {isAdmin
              ? ar ? "مدير النظام" : "Admin"
              : accountType === "dentist" ? (ar ? "طبيب أسنان" : "Dentist")
              : accountType === "supply" ? (ar ? "مكتب مستلزمات" : "Supply Office")
              : accountType === "lab" ? (ar ? "مختبر" : "Lab")
              : accountType === "implant" ? (ar ? "شركة زرعات" : "Implant Company")
              : accountType}
          </span>
        </div>

        <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
          {links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-accent transition-colors"
              >
                <span className="size-10 rounded-2xl ring-1 shadow-sm flex items-center justify-center shrink-0" style={{ backgroundColor: "oklch(0.98 0.01 240)" }}>
                  <l.icon className="size-5 drop-shadow-sm" strokeWidth={2} />
                </span>
                <span className="flex-1 text-sm font-semibold text-slate-700">{l.label}</span>
                <ChevronRight className="size-4 text-slate-300" />
              </Link>
            </li>
          ))}
        </ul>

        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3.5 shadow-soft hover:bg-accent transition-colors"
        >
          <span className="size-10 rounded-2xl ring-1 shadow-sm flex items-center justify-center bg-emerald-50 ring-emerald-200 text-emerald-600">
            <Globe className="size-5 drop-shadow-sm" strokeWidth={2} />
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
