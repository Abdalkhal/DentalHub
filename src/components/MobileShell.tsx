import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, User, Menu, Search, Heart, Tag, ShoppingCart } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUserRole, getAccountDashboard } from "@/lib/useAuth";
import { useCart } from "@/lib/cartStore";
import { CartDrawer } from "@/components/CartDrawer";

export function MobileShell({
  children,
  hideBottomNav,
  className,
}: {
  children: ReactNode;
  hideBottomNav?: boolean;
  className?: string;
}) {
  const { role } = useUserRole();
  const isLab = role?.accountType === "lab";
  const [cartOpen, setCartOpen] = useState(false);
  return (
    <div className="min-h-screen w-full bg-slate-50 overflow-x-hidden flex justify-center">
      <div className={cn("relative w-full min-h-screen flex flex-col bg-[#F0F7FF]", isLab ? "max-w-none" : "max-w-md", className)}>
        <div className={cn("flex-1", hideBottomNav ? "pb-0" : "pb-24")}>{children}</div>
        {!hideBottomNav && <BottomTabBar onCartClick={() => setCartOpen(true)} />}
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </div>
    </div>
  );
}

function BottomTabBar({ onCartClick }: { onCartClick: () => void }) {
  const { t, lang } = useI18n();
  const { role } = useUserRole();
  const isDentist = role?.accountType === "dentist";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cart = useCart();
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const homeTo = role?.role ? getAccountDashboard(role.role) : "/";

  const tabs = isDentist
    ? [
        { to: "/", icon: Home, label: t("tab_home"), match: (p: string) => p === "/" },
        { to: "/favorites", icon: Heart, label: t("tab_favorites"), match: (p: string) => p.startsWith("/favorites") },
        { to: "/orders", icon: ShoppingBag, label: t("tab_orders"), match: (p: string) => p.startsWith("/orders") },
        { to: "/offers", icon: Tag, label: t("tab_offers"), match: (p: string) => p.startsWith("/offers") },
        { to: "/more", icon: Menu, label: t("tab_more"), match: (p: string) => p.startsWith("/more") },
      ]
    : ([
        { to: homeTo, icon: Home, label: t("tab_home"), match: (p: string) => p === homeTo },
        { to: "/explore", icon: Search, label: lang === "ar" ? "بحث" : "Search", match: (p: string) => p.startsWith("/explore") },
        { to: "/orders", icon: ShoppingBag, label: t("tab_orders"), match: (p: string) => p.startsWith("/orders") },
        { to: "/account", icon: User, label: t("tab_account"), match: (p: string) => p.startsWith("/account") },
        { to: "/more", icon: Menu, label: t("tab_more"), match: (p: string) => p.startsWith("/more") },
      ]);

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-card/95 backdrop-blur border-t border-border shadow-lg">
      <ul className="grid grid-cols-5 px-2 py-2">
        {tabs.map(({ to, icon: Icon, label, match }) => {
          const active = match(pathname);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center gap-1 py-1.5 rounded-xl text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-10 rounded-2xl flex items-center justify-center transition-all ring-1",
                    active
                      ? "bg-[oklch(0.93_0.06_250)] ring-[oklch(0.82_0.1_250)] shadow-sm text-[oklch(0.45_0.18_256)]"
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

      {cartCount > 0 && (
        <button
          onClick={onCartClick}
          className="absolute -top-5 right-4 size-12 rounded-2xl bg-rose-500 text-white shadow-lg flex items-center justify-center hover:bg-rose-600 transition active:scale-95"
        >
          <ShoppingCart className="size-5" />
          <span className="absolute -top-1 -right-1 size-5 rounded-full bg-white text-rose-600 text-[10px] font-extrabold flex items-center justify-center ring-2 ring-rose-500">
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        </button>
      )}
    </nav>
  );
}
