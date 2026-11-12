import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bone,
  ChevronLeft,
  ChevronRight,
  Crown,
  FlaskConical,
  Globe,
  Heart,
  Home,
  LayoutGrid,
  ListChecks,
  MessageCircle,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  Tag,
  User,
  Users,
  Package,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSession, useUserRole } from "@/lib/useAuth";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";

type Item = {
  to: string;
  icon: LucideIcon;
  ar: string;
  en: string;
  exact?: boolean;
  badge?: number;
};

// Laptop-width (lg:+) chrome for the dentist account: a fixed side rail with
// every destination one click away, plus a slim top bar (search, cart,
// language, notifications). Phones and tablets never render this.
export function DesktopChrome({
  cartCount,
  unseenOrders,
  unreadMessages,
  onCartClick,
}: {
  cartCount: number;
  unseenOrders: number;
  unreadMessages: number;
  onCartClick: () => void;
}) {
  const { lang, dir, toggle } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { role } = useUserRole();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;

  const groups: { ar: string; en: string; items: Item[] }[] = [
    {
      ar: "",
      en: "",
      items: [{ to: "/", icon: Home, ar: "الرئيسية", en: "Home", exact: true }],
    },
    {
      ar: "المتجر",
      en: "Marketplace",
      items: [
        { to: "/implants", icon: Bone, ar: "زراعة الأسنان", en: "Implants" },
        { to: "/supplies", icon: Package, ar: "المستلزمات", en: "Supplies" },
        { to: "/labs", icon: FlaskConical, ar: "المختبرات", en: "Laboratories" },
        { to: "/brands", icon: Crown, ar: "البراندات", en: "Brands" },
        { to: "/offers", icon: Tag, ar: "العروض", en: "Offers" },
      ],
    },
    {
      ar: "العيادة",
      en: "Clinic",
      items: [
        { to: "/clinic", icon: Stethoscope, ar: "عيادتي", en: "My Clinic" },
        { to: "/patients", icon: Users, ar: "المرضى", en: "Patients" },
        { to: "/track-cases", icon: ListChecks, ar: "تتبع الحالات", en: "Track Cases" },
      ],
    },
    {
      ar: "نشاطي",
      en: "Activity",
      items: [
        { to: "/orders", icon: ShoppingBag, ar: "الطلبات", en: "Orders", badge: unseenOrders },
        { to: "/messages", icon: MessageCircle, ar: "الرسائل", en: "Messages", badge: unreadMessages },
        { to: "/favorites", icon: Heart, ar: "المفضلة", en: "Favorites" },
      ],
    },
  ];
  // Settings/help/privacy live under "More" and the account card below.
  groups.push({ ar: "", en: "", items: [{ to: "/more", icon: LayoutGrid, ar: "المزيد", en: "More" }] });

  const isActive = (it: Item) => (it.exact ? pathname === it.to : pathname.startsWith(it.to));
  const name = [role?.name, role?.surname].filter(Boolean).join(" ").trim();

  const renderItem = (it: Item) => {
    const active = isActive(it);
    return (
      <Link
        key={it.to}
        to={it.to}
        className={cn(
          "group relative flex items-center gap-3 h-[34px] px-3 rounded-[10px] text-[13px] font-semibold transition-all",
          active
            ? "bg-gradient-to-l from-[#2563EB] to-[#3B82F6] text-white shadow-lg shadow-blue-600/30"
            : "text-slate-400 hover:text-white hover:bg-white/[0.06]",
        )}
      >
        <it.icon className={cn("size-[17px] shrink-0", active ? "stroke-[2.3]" : "stroke-[1.9]")} />
        <span className="flex-1 truncate">{ar ? it.ar : it.en}</span>
        {!!it.badge && it.badge > 0 && (
          <span
            className={cn(
              "h-5 min-w-5 px-1.5 rounded-full text-[10px] font-extrabold flex items-center justify-center",
              active ? "bg-white text-[#2563EB]" : "bg-rose-500 text-white",
            )}
          >
            {it.badge > 9 ? "9+" : it.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* ── Side rail ── */}
      <aside className="hidden lg:flex fixed inset-y-0 start-0 z-50 w-60 flex-col bg-[#0B1220] text-white overflow-hidden">
        {/* soft glows so the rail isn't a flat slab */}
        <div className="pointer-events-none absolute -top-24 -start-24 size-64 rounded-full bg-[#2563EB]/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -end-20 size-56 rounded-full bg-[#14B8A6]/10 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-3 h-14 px-5 shrink-0">
          <span className="size-8 rounded-[10px] grid place-items-center bg-gradient-to-br from-[#3B82F6] to-[#22D3EE] text-white text-sm font-display font-extrabold shadow-lg shadow-blue-500/40">
            D
          </span>
          <span className="font-display font-extrabold text-base tracking-tight" dir="ltr">
            Dent{" "}<span className="text-[#60A5FA]">Hub</span>
          </span>
        </Link>

        <nav className="relative flex-1 min-h-0 overflow-y-auto px-3 pb-2 space-y-2 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.18)_transparent]">
          {groups.map((g, i) => (
            <div key={i}>
              {g.ar && (
                <p className="px-3 h-[22px] flex items-center text-[10.5px] font-bold tracking-wide text-slate-500">
                  {ar ? g.ar : g.en}
                </p>
              )}
              {g.items.map(renderItem)}
            </div>
          ))}
        </nav>

        <div className="relative shrink-0 p-3 border-t border-white/[0.07]">
          <Link
            to="/account"
            className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] ring-1 ring-white/[0.08] transition"
          >
            <span className="size-9 rounded-[10px] overflow-hidden bg-gradient-to-br from-[#3B82F6] to-[#22D3EE] flex items-center justify-center shrink-0">
              {role?.photoURL ? (
                <img src={role.photoURL} alt="" className="size-full object-cover" />
              ) : (
                <User className="size-5 text-white" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12.5px] leading-tight font-bold text-white truncate">
                {name || (ar ? "حسابي" : "My account")}
              </span>
              <span className="block text-[10.5px] leading-tight mt-0.5 text-slate-400 truncate">{ar ? "طبيب أسنان" : "Dentist"}</span>
            </span>
            <Chevron className="size-4 text-slate-500 shrink-0" />
          </Link>
        </div>
      </aside>

      {/* ── Top bar ── */}
      <header className="hidden lg:flex fixed top-0 end-0 start-60 z-40 h-16 items-center gap-4 px-8 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
        <GlobalSearch />
        <div className="ms-auto flex items-center gap-2 shrink-0">
          <button
            onClick={toggle}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition"
          >
            <Globe className="size-4 text-slate-400" />
            {ar ? "EN" : "AR"}
          </button>
          <NotificationBell userId={user?.uid || ""} />
          <button
            onClick={onCartClick}
            className={cn(
              "h-10 ps-3 pe-3.5 rounded-xl flex items-center gap-2 text-[13px] font-bold transition",
              cartCount > 0
                ? "bg-[#0B1220] text-white hover:bg-[#1E293B] shadow-md shadow-slate-900/15"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            <ShoppingCart className="size-4" />
            {ar ? "السلة" : "Cart"}
            {cartCount > 0 && (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#3B82F6] text-white text-[10px] font-extrabold flex items-center justify-center">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </header>
    </>
  );
}
