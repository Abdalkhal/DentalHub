import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, Layers, Users, Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LabBottomTabBar({
  className,
  wide,
  hideBottomNav,
}: {
  className?: string;
  // Mirrors BottomTabBar: a wide page swaps this bottom bar for a fixed top
  // strip at lg:+, so lab pages aren't left with no navigation at all.
  wide?: boolean;
  hideBottomNav?: boolean;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tabs = [
    {
      to: "/labs/dashboard",
      icon: LayoutDashboard,
      label: ar ? "الرئيسية" : "Home",
      match: (p: string) => p === "/labs/dashboard",
    },
    {
      to: "/orders",
      icon: ClipboardList,
      label: ar ? "الطلبات" : "Orders",
      match: (p: string) => p.startsWith("/orders"),
    },
    {
      to: "/production",
      icon: Layers,
      label: ar ? "الحالات" : "Cases",
      match: (p: string) => p.startsWith("/production"),
    },
    {
      to: "/labs/staff",
      icon: Users,
      label: ar ? "الكادر" : "Staff",
      match: (p: string) => p.startsWith("/labs/staff"),
    },
    {
      to: "/more",
      icon: Menu,
      label: ar ? "المزيد" : "More",
      match: (p: string) => p.startsWith("/more"),
    },
  ];

  return (
    <>
    <nav
      className={cn(
        "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white/95 backdrop-blur border-t border-slate-200 shadow-lg",
        className,
        hideBottomNav && "hidden",
      )}
    >
      <ul className="grid grid-cols-5 px-2 py-2">
        {tabs.map(({ to, icon: Icon, label, match }) => {
          const active = match(pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 rounded-xl text-[11px] font-medium transition-colors",
                  active ? "text-[#0052FF]" : "text-slate-400",
                )}
              >
                <span
                  className={cn(
                    "size-10 rounded-2xl flex items-center justify-center transition-all ring-1",
                    active
                      ? "bg-[#0052FF]/10 ring-[#0052FF]/25 shadow-sm text-[#0052FF]"
                      : "bg-transparent ring-transparent",
                  )}
                >
                  <Icon className={cn("size-5 drop-shadow-sm", active && "stroke-[2.4]")} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>

    {/* Desktop (lg:+) header, built from the same tabs and active-state as
        above. The lab dashboard has its own sidebar and doesn't use this
        shell, so this only covers the lab's other pages. */}
    {wide && (
      <nav className="hidden lg:block fixed top-0 inset-x-0 z-50 h-16 bg-white/85 backdrop-blur-xl border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl h-full px-8 flex items-center gap-8">
          <Link to="/labs/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            <span className="size-9 rounded-xl grid place-items-center text-white font-display font-extrabold text-sm shadow-sm transition-transform group-hover:scale-105 bg-gradient-to-br from-[#0052FF] to-[#3B82F6]">
              D
            </span>
            <span className="font-display font-extrabold text-[15px] tracking-tight leading-none">
              <span className="text-slate-900">Dental</span>
              <span className="text-[#0052FF]">Hub</span>
            </span>
          </Link>

          <div className="flex items-center h-full">
            {tabs.map(({ to, icon: Icon, label, match }) => {
              const active = match(pathname);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative h-full flex items-center gap-2 px-4 text-[13px] font-semibold transition-colors",
                    "after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t-full after:transition-colors",
                    active
                      ? "text-[#0052FF] after:bg-[#0052FF]"
                      : "text-slate-500 hover:text-slate-900 after:bg-transparent",
                  )}
                >
                  <Icon className={cn("size-4", active && "stroke-[2.4]")} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    )}
    </>
  );
}
