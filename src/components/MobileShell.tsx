import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, User, Menu, Search, Heart, Tag, ShoppingCart } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useUserRole, getAccountDashboard } from "@/lib/useAuth";
import { useCart } from "@/lib/cartStore";
import { CartDrawer } from "@/components/CartDrawer";
import { LabBottomTabBar } from "@/components/LabBottomTabBar";

export function MobileShell({
  children,
  hideBottomNav,
  wide,
  className,
}: {
  children: ReactNode;
  hideBottomNav?: boolean;
  // Opt a page into a desktop (lg:+) layout: removes the phone-width cap and
  // swaps the fixed bottom tab bar for a top nav at lg:+. Defaults to false
  // so any page that doesn't pass this stays pixel-identical to today.
  // `isLab` below is OR'd in on top of this so existing lab pages (which
  // relied on role-based width detection before `wide` existed) keep their
  // current behavior without needing to be touched.
  wide?: boolean;
  className?: string;
}) {
  const { role } = useUserRole();
  const isLab = role?.accountType === "lab";
  const isWide = wide || isLab;
  const [cartOpen, setCartOpen] = useState(false);
  return (
    <div className="min-h-screen w-full bg-slate-50 overflow-x-hidden flex justify-center">
      <div
        className={cn(
          "relative w-full min-h-screen flex flex-col bg-[#E6F0FF]",
          isWide ? "max-w-md lg:max-w-none" : "max-w-md",
          // Tablet tier (iPad portrait, 768-1023px): lift the phone-width cap
          // one breakpoint earlier so a tablet stops rendering a 448px column
          // in an empty page. Scoped to explicit `wide` only, so lab pages
          // (which come in through `isLab`) keep their current tablet look.
          wide && "md:max-w-none",
          className,
        )}
      >
        <div
          className={cn(
            "flex-1",
            hideBottomNav ? "pb-0" : isWide ? "pb-24 lg:pb-0" : "pb-24",
            // Clears the fixed lg:+ top nav BottomTabBar renders when `wide`
            // is set explicitly (lab pages use LabBottomTabBar instead and
            // never get that top nav, so this is scoped to `wide` only).
            // Applies even with `hideBottomNav`, because such a page still
            // gets the top nav at lg:+ — see the render condition below.
            wide && "lg:pt-16",
          )}
        >
          {children}
        </div>
        {(!hideBottomNav || wide) && isLab && (
          <LabBottomTabBar className="lg:hidden" wide={wide} hideBottomNav={hideBottomNav} />
        )}
        {/* `hideBottomNav` used to suppress both bars. A wide page still needs
            desktop navigation, so it now renders BottomTabBar and lets the
            bottom bar itself stay hidden — the phone keeps exactly today's
            (bar-less) layout while lg:+ gains the top nav. */}
        {(!hideBottomNav || wide) && !isLab && (
          <BottomTabBar
            onCartClick={() => setCartOpen(true)}
            wide={wide}
            hideBottomNav={hideBottomNav}
          />
        )}
        <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
      </div>
    </div>
  );
}

function BottomTabBar({
  onCartClick,
  wide,
  hideBottomNav,
}: {
  onCartClick: () => void;
  wide?: boolean;
  hideBottomNav?: boolean;
}) {
  const { t, lang } = useI18n();
  const { role } = useUserRole();
  const isDentist = role?.accountType === "dentist";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const cart = useCart();
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const homeTo = role?.role ? getAccountDashboard(role.role) : "/";

  // The desktop header's accent follows the account type, so each account
  // reads as its own product instead of every dashboard looking identical.
  // Styling only — it never affects which tabs exist or where they lead.
  const accent =
    role?.accountType === "supply"
      ? {
          text: "text-[#0E6E66]",
          underline: "after:bg-[#0E6E66]",
          logo: "from-[#0E6E66] to-[#14A08F]",
        }
      : {
          text: "text-[oklch(0.45_0.18_256)]",
          underline: "after:bg-[oklch(0.45_0.18_256)]",
          logo: "from-[oklch(0.62_0.19_256)] to-[oklch(0.5_0.2_262)]",
        };

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
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-card/95 backdrop-blur border-t border-border shadow-lg",
          wide && "lg:hidden",
          // Pages that opted out of the bottom bar keep it hidden at every
          // width; they render this component only to get the lg:+ top nav.
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
            className="absolute -top-5 right-4 size-12 rounded-2xl bg-[#0E6E66] text-white shadow-lg flex items-center justify-center hover:bg-[#0B5952] transition active:scale-95"
          >
            <ShoppingCart className="size-5" />
            <span className="absolute -top-1 -right-1 size-5 rounded-full bg-white text-[#0E6E66] text-[10px] font-extrabold flex items-center justify-center ring-2 ring-[#0E6E66]">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          </button>
        )}
      </nav>

      {/* Desktop (lg:+) nav: a bottom icon bar doesn't read as "web" at
          laptop widths, so wide pages get a fixed top strip instead, built
          from the exact same tabs/active-state used above. Hidden entirely
          unless `wide` is set, so non-converted pages are unaffected. */}
      {wide && (
        <nav className="hidden lg:block fixed top-0 inset-x-0 z-50 h-16 bg-white/85 backdrop-blur-xl border-b border-slate-200/80">
          <div className="mx-auto max-w-7xl h-full px-8 flex items-center gap-8">
            {/* Brand mark — a web header needs an anchor on the start edge;
                a row of centered pills alone reads like a mobile bar. */}
            <Link to={homeTo} className="flex items-center gap-2.5 shrink-0 group">
              <span
                className={cn(
                  "size-9 rounded-xl grid place-items-center text-white font-display font-extrabold text-sm shadow-sm transition-transform group-hover:scale-105 bg-gradient-to-br",
                  accent.logo,
                )}
              >
                D
              </span>
              <span className="font-display font-extrabold text-[15px] tracking-tight leading-none">
                <span className="text-slate-900">Dental</span>
                <span className={accent.text}>Hub</span>
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
                        ? cn(accent.text, accent.underline)
                        : "text-slate-500 hover:text-slate-900 after:bg-transparent",
                    )}
                  >
                    <Icon className={cn("size-4", active && "stroke-[2.4]")} />
                    {label}
                  </Link>
                );
              })}
            </div>

            <div className="ms-auto flex items-center gap-2 shrink-0">
              {cartCount > 0 && (
                <button
                  onClick={onCartClick}
                  className="flex items-center gap-2 ps-3 pe-3.5 h-10 rounded-xl bg-[#0E6E66] text-white text-[13px] font-bold hover:bg-[#0B5952] shadow-sm shadow-[#0E6E66]/25 transition"
                >
                  <ShoppingCart className="size-4" />
                  {cartCount > 9 ? "9+" : cartCount}
                </button>
              )}
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
