import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, Menu, Heart, Tag } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { listOrders } from "@/lib/ordersStore";

export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-app-gradient flex justify-center">
      <div className="relative w-full max-w-[440px] min-h-screen bg-background shadow-soft flex flex-col">
        <div className="flex-1 pb-24">{children}</div>
        <BottomTabBar />
      </div>
    </div>
  );
}

function BottomTabBar() {
  const { t, lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [ordersCount, setOrdersCount] = useState(0);
  useEffect(() => {
    const upd = () => setOrdersCount(listOrders().filter((o) => o.status !== "completed").length);
    upd();
    window.addEventListener("dh:orders", upd);
    window.addEventListener("storage", upd);
    return () => {
      window.removeEventListener("dh:orders", upd);
      window.removeEventListener("storage", upd);
    };
  }, []);

  const tabs: Array<{ to: string; icon: typeof Home; label: string; match: (p: string) => boolean; badge?: number }> = [
    { to: "/more", icon: Menu, label: t("tab_more"), match: (p) => p.startsWith("/more") },
    { to: "/offers", icon: Tag, label: lang === "ar" ? "العروض" : "Offers", match: (p) => p.startsWith("/offers") },
    { to: "/orders", icon: ShoppingBag, label: t("tab_orders"), match: (p) => p.startsWith("/orders"), badge: ordersCount },
    { to: "/favorites", icon: Heart, label: lang === "ar" ? "المفضلة" : "Favorites", match: (p) => p.startsWith("/favorites") },
    { to: "/", icon: Home, label: t("tab_home"), match: (p) => p === "/" },
  ];

  return (
    <nav className="absolute bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border">
      <ul className="grid grid-cols-5 px-1 py-2">
        {tabs.map(({ to, icon: Icon, label, match, badge }) => {
          const active = match(pathname);
          return (
            <li key={to}>
              <Link
                to={to as never}
                className={cn(
                  "flex flex-col items-center gap-1 py-1 rounded-xl text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "relative size-9 flex items-center justify-center rounded-full transition-colors",
                    active && "bg-primary/10"
                  )}
                >
                  <Icon className={cn("size-[22px]", active && "stroke-[2.4]")} />
                  {badge ? (
                    <span className="absolute -top-0.5 -end-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

