import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useUserRole, useIsAdmin, useLabStaffClaim } from "@/lib/useAuth";
import { useMaterialsBadge } from "@/lib/materialsStore";
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
  Megaphone,
  Layers,
  Heart,
  Stethoscope,
  Store,
  Cog,
  LifeBuoy,
  FileText,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  Bell,
  ShoppingCart,
  PenTool,
  Tag,
  TicketPercent,
  Lock,
  Library,
  BadgeCheck,
  Package,
  ChevronLeft,
  User,
} from "lucide-react";
import { groupMenu, MENU_GROUPS } from "@/lib/menuGroups";
import { openCart } from "@/lib/cartStore";

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
  const materialsBadge = useMaterialsBadge();
  const { role } = useUserRole();
  const { isAdmin } = useIsAdmin();
  const { claim: labStaff } = useLabStaffClaim();
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
      to: "/lab-doctors",
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
      to: "/my-ads",
      icon: Megaphone,
      label: ar ? "إعلاناتي" : "My Ads",
      tone: "bg-blue-50 ring-blue-200 text-blue-600",
      roles: ["dentist", "supply", "implant"],
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

  // Dentists get exactly the native app's menu (same items, same order).
  const dentistLinks: MoreLink[] = [
    { to: "/clinic", icon: Stethoscope, label: ar ? "عيادتي" : "My Clinic", tone: "", roles: ["dentist"] },
    { to: "/patients", icon: Users, label: ar ? "المرضى" : "Patients", tone: "", roles: ["dentist"] },
    { to: "/track-cases", icon: ListChecks, label: ar ? "تتبع الحالات" : "Track Cases", tone: "", roles: ["dentist"] },
    { to: "/favorites", icon: Heart, label: ar ? "المفضلة" : "Favorites", tone: "", roles: ["dentist"] },
    { to: "/offers", icon: Tag, label: ar ? "العروض" : "Offers", tone: "", roles: ["dentist"] },
    { to: "/brands", icon: BadgeCheck, label: ar ? "البراندات" : "Brands", tone: "", roles: ["dentist"] },
    { to: "/supplies", icon: Package, label: ar ? "المستلزمات" : "Supplies", tone: "", roles: ["dentist"] },
    { to: "/my-ads", icon: Megaphone, label: ar ? "إعلاناتي" : "My Ads", tone: "", roles: ["dentist"] },
    { to: "/messages", icon: MessageSquare, label: ar ? "الرسائل" : "Messages", tone: "", roles: ["dentist"] },
    { to: "/notifications", icon: Bell, label: ar ? "الإشعارات" : "Notifications", tone: "", roles: ["dentist"] },
    { to: "/account/settings", icon: Cog, label: ar ? "الإعدادات" : "Settings", tone: "", roles: ["dentist"] },
    { to: "/account/help", icon: LifeBuoy, label: ar ? "المساعدة" : "Help", tone: "", roles: ["dentist"] },
    { to: "/privacy", icon: ShieldCheck, label: ar ? "سياسة الخصوصية" : "Privacy Policy", tone: "", roles: ["dentist"] },
  ];
  const supplyLinks: MoreLink[] = [
    { to: "/supplies", icon: Store, label: ar ? "لوحة المورد" : "Supplier Dashboard", tone: "", roles: ["supply"] },
    { to: "/doctor-invoices", icon: FileText, label: ar ? "فواتير الأطباء" : "Doctor Invoices", tone: "", roles: ["supply"] },
    { to: "/catalog-add", icon: Library, label: ar ? "إضافة من الدليل" : "Add from catalog", tone: "", roles: ["supply"] },
    { to: "/office-discounts", icon: TicketPercent, label: ar ? "الخصومات" : "Discounts", tone: "", roles: ["supply"] },
    { to: "/price-access", icon: Lock, label: ar ? "إظهار الأسعار" : "Who sees prices", tone: "", roles: ["supply"] },
    { to: "/my-ads", icon: Megaphone, label: ar ? "إعلاناتي" : "My Ads", tone: "", roles: ["supply"] },
    { to: "/my-offers", icon: Tag, label: ar ? "عروضي" : "My Offers", tone: "", roles: ["supply"] },
    { to: "/messages", icon: MessageSquare, label: ar ? "الرسائل" : "Messages", tone: "", roles: ["supply"] },
    { to: "/notifications", icon: Bell, label: ar ? "الإشعارات" : "Notifications", tone: "", roles: ["supply"] },
    { to: "/account/settings", icon: Cog, label: ar ? "الإعدادات" : "Settings", tone: "", roles: ["supply"] },
    { to: "/account/help", icon: LifeBuoy, label: ar ? "المساعدة" : "Help", tone: "", roles: ["supply"] },
    { to: "/privacy", icon: ShieldCheck, label: ar ? "سياسة الخصوصية" : "Privacy Policy", tone: "", roles: ["supply"] },
  ];
  const implantLinks: MoreLink[] = [
    { to: "/implants", icon: FlaskConical, label: ar ? "لوحة الزرعات" : "Implant Dashboard", tone: "", roles: ["implant"] },
    { to: "/office-discounts", icon: TicketPercent, label: ar ? "الخصومات" : "Discounts", tone: "", roles: ["implant"] },
    { to: "/price-access", icon: Lock, label: ar ? "إظهار الأسعار" : "Who sees prices", tone: "", roles: ["implant"] },
    { to: "/my-ads", icon: Megaphone, label: ar ? "إعلاناتي" : "My Ads", tone: "", roles: ["implant"] },
    { to: "/my-offers", icon: Tag, label: ar ? "عروضي" : "My Offers", tone: "", roles: ["implant"] },
    { to: "/messages", icon: MessageSquare, label: ar ? "الرسائل" : "Messages", tone: "", roles: ["implant"] },
    { to: "/notifications", icon: Bell, label: ar ? "الإشعارات" : "Notifications", tone: "", roles: ["implant"] },
    { to: "/account/settings", icon: Cog, label: ar ? "الإعدادات" : "Settings", tone: "", roles: ["implant"] },
    { to: "/account/help", icon: LifeBuoy, label: ar ? "المساعدة" : "Help", tone: "", roles: ["implant"] },
    { to: "/privacy", icon: ShieldCheck, label: ar ? "سياسة الخصوصية" : "Privacy Policy", tone: "", roles: ["implant"] },
  ];
  const labLinks: MoreLink[] = [
    { to: "/labs/dashboard", icon: FlaskConical, label: ar ? "لوحة المختبر" : "Lab Dashboard", tone: "", roles: ["lab"] },
    { to: "/designer", icon: PenTool, label: ar ? "حالات التصميم" : "Design Cases", tone: "", roles: ["lab"] },
    { to: "/lab-doctors", icon: Stethoscope, label: ar ? "الأطباء" : "Doctors", tone: "", roles: ["lab"] },
    { to: "/doctor-invoices", icon: FileText, label: ar ? "فواتير الأطباء" : "Doctor Invoices", tone: "", roles: ["lab"] },
    { to: "/my-ads", icon: Megaphone, label: ar ? "إعلاناتي" : "My Ads", tone: "", roles: ["lab"] },
    { to: "/messages", icon: MessageSquare, label: ar ? "الرسائل" : "Messages", tone: "", roles: ["lab"] },
    { to: "/notifications", icon: Bell, label: ar ? "الإشعارات" : "Notifications", tone: "", roles: ["lab"] },
    { to: "/account/settings", icon: Cog, label: ar ? "الإعدادات" : "Settings", tone: "", roles: ["lab"] },
    { to: "/account/help", icon: LifeBuoy, label: ar ? "المساعدة" : "Help", tone: "", roles: ["lab"] },
    { to: "/privacy", icon: ShieldCheck, label: ar ? "سياسة الخصوصية" : "Privacy Policy", tone: "", roles: ["lab"] },
  ];
  const adminLink = allLinks.find((l) => l.to === "/admin")!;
  const isDentist = accountType === "dentist";
  // Invited lab staff have a claim but no user_roles doc (so accountType
  // falls back to "dentist") — they get native's short staff menu instead.
  const designerLinks: MoreLink[] = [
    { to: "/designer", icon: PenTool, label: ar ? "حالاتي كمصمم" : "My Design Cases", tone: "", roles: ["lab"] },
    { to: "/notifications", icon: Bell, label: ar ? "الإشعارات" : "Notifications", tone: "", roles: ["lab"] },
    { to: "/account/help", icon: LifeBuoy, label: ar ? "المساعدة" : "Help", tone: "", roles: ["lab"] },
    { to: "/privacy", icon: ShieldCheck, label: ar ? "سياسة الخصوصية" : "Privacy Policy", tone: "", roles: ["lab"] },
  ];
  const nativeLinks = labStaff
    ? designerLinks
    : isDentist
    ? dentistLinks
    : accountType === "supply"
      ? supplyLinks
      : accountType === "implant"
        ? implantLinks
        : accountType === "lab"
          ? labLinks
          : null;

  const links = nativeLinks
    ? isAdmin
      ? [adminLink, ...nativeLinks]
      : nativeLinks
    : allLinks.filter((l) => l.roles.some((r) => isRole(r)));

  // The cart opens the drawer instead of a page; it sits in the shopping group.
  const withCart: MoreLink[] =
    isDentist && !labStaff
      ? [...links, { to: "/cart", icon: ShoppingCart, label: ar ? "السلة" : "Cart", tone: "", roles: ["dentist"] }]
      : links;
  const groupType = labStaff ? "lab" : accountType;
  const groups = groupMenu(withCart, groupType);
  const name = [role?.name, role?.surname].filter(Boolean).join(" ").trim();
  const roleLabel = isAdmin
    ? ar ? "مدير النظام" : "Admin"
    : accountType === "dentist" ? (ar ? "طبيب أسنان" : "Dentist")
    : accountType === "supply" ? (ar ? "مكتب مستلزمات" : "Supply Office")
    : accountType === "lab" ? (ar ? "مختبر" : "Lab")
    : accountType === "implant" ? (ar ? "شركة زرعات" : "Implant Company")
    : accountType;
  const Chevron = ar ? ChevronLeft : ChevronRight;
  const rowCls = "w-full flex items-center gap-3 px-3.5 py-3 text-start transition-colors hover:bg-[#F5F9FF]";

  return (
    <MobileShell wide>
      <TopBar title={t("tab_more")} wide />
      <div className="px-4 pt-4 pb-6 space-y-5 md:px-6 md:pt-8 lg:px-0 lg:max-w-5xl lg:mx-auto lg:pt-10">
        {/* Who is signed in: photo in the blue circle (as on Home), name and account type. */}
        <Link
          to="/account"
          className="flex items-center gap-3 rounded-[20px] border border-[#DCE7F5] bg-white p-3.5 shadow-[0_4px_14px_-8px_rgba(30,58,138,0.25)] transition hover:border-[#1D6FE8]/40 md:max-w-md"
        >
          <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#1D6FE8] text-white shadow-[0_4px_10px_-4px_rgba(29,78,216,0.6)]">
            {role?.photoURL ? <img src={role.photoURL} alt="" className="size-full object-cover" /> : <User className="size-6" strokeWidth={2.3} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[16px] font-extrabold text-[#0F2747]">{name || (ar ? "حسابي" : "My account")}</span>
            <span className="mt-1 inline-block rounded-full bg-[#E8F1FE] px-2.5 py-0.5 text-[11px] font-bold text-[#1D6FE8]">{roleLabel}</span>
          </span>
          <Chevron className="size-5 shrink-0 text-slate-500" />
        </Link>

        {/* The menu in groups, each with a heading and one icon colour. */}
        <div className="space-y-5 md:grid md:grid-cols-2 md:gap-5 md:space-y-0 lg:grid-cols-3">
          {groups.map((g) => {
            const meta = MENU_GROUPS[g.key];
            return (
              <section key={g.key}>
                <h3 className="mb-2 px-1 text-[12px] font-extrabold text-[#5B6B82]">{ar ? meta.ar : meta.en}</h3>
                <ul className="overflow-hidden rounded-[20px] border border-[#DCE7F5] bg-white shadow-[0_4px_14px_-8px_rgba(30,58,138,0.2)] divide-y divide-[#EEF3FA]">
                  {g.items.map((l) => {
                    const inner = (
                      <>
                        <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: meta.bg, color: meta.fg }}>
                          <l.icon className="size-[22px]" strokeWidth={2.3} />
                          {l.to === "/clinic" && materialsBadge > 0 && <span className="absolute -end-0.5 -top-0.5 size-3 rounded-full bg-rose-600 ring-2 ring-white" />}
                        </span>
                        <span className="flex-1 text-[14.5px] font-bold text-[#0F2747]">{l.label}</span>
                        <Chevron className="size-[18px] shrink-0 text-slate-400" />
                      </>
                    );
                    return (
                      <li key={l.to}>
                        {l.to === "/cart" ? (
                          <button type="button" onClick={openCart} className={rowCls}>
                            {inner}
                          </button>
                        ) : (
                          <Link to={l.to} className={rowCls}>
                            {inner}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>

        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 rounded-[20px] border border-[#DCE7F5] bg-white px-3.5 py-3 transition-colors hover:bg-[#F5F9FF] md:max-w-sm"
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#E8F1FE] text-[#1D6FE8]">
            <Globe className="size-[22px]" strokeWidth={2.3} />
          </span>
          <span className="flex-1 text-[14.5px] font-bold text-start text-[#0F2747]">
            {t("language")} · {lang === "ar" ? "العربية" : "English"}
          </span>
          <span className="rounded-full bg-[#E8F1FE] px-2.5 py-1 text-xs font-extrabold text-[#1D6FE8]">{lang === "ar" ? "EN" : "AR"}</span>
        </button>
      </div>
    </MobileShell>
  );
}
