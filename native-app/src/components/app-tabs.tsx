import { Pressable } from 'react-native';
import { HasHeaderContext } from '@/components/ui/headerContext';
import { Tabs, router } from 'expo-router';
import { ArrowLeft, ArrowRight, Home, Heart, Menu, MessageCircle, Search, ShoppingBag, Tag, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useUserRole } from '@/lib/useAuth';
import { useDentistOrders } from '@/lib/orders';
import { useOrders } from '@/lib/orders';
import { useSeenOrderIds } from '@/lib/orderSeen';
import { useI18n } from '@/lib/i18n';
import { useDmUnreadTotal } from '@/lib/directMessages';

const ALL_NAMES = ['index', 'explore', 'favorites', 'orders', 'offers', 'inbox', 'account', 'more'] as const;

/**
 * Screens that live inside the tab navigator but are never rendered as a tab.
 * Registering them here (with `href: null`) is what keeps the bottom tab bar
 * visible on the vendor dashboards, which previously sat in the root Stack and
 * therefore lost navigation entirely.
 */
const HIDDEN_NAMES = ['supplies-office', 'implants-office', 'labs-office', 'admin'] as const;

const ICONS: Record<(typeof ALL_NAMES)[number], LucideIcon> = {
  index: Home,
  explore: Search,
  favorites: Heart,
  orders: ShoppingBag,
  offers: Tag,
  inbox: MessageCircle,
  account: User,
  more: Menu,
};

const LABELS: Record<(typeof ALL_NAMES)[number], { ar: string; en: string }> = {
  index: { ar: 'الرئيسية', en: 'Home' },
  explore: { ar: 'استكشاف', en: 'Explore' },
  favorites: { ar: 'المفضلة', en: 'Favorites' },
  orders: { ar: 'الطلبات', en: 'Orders' },
  offers: { ar: 'العروض', en: 'Offers' },
  inbox: { ar: 'الرسائل', en: 'Messages' },
  account: { ar: 'حسابي', en: 'Account' },
  more: { ar: 'المزيد', en: 'More' },
};

// Messages took the place of Offers (dentists; Offers is in "المزيد") and of
// Account (vendors; the profile photo on their dashboard opens Account).
const DENTIST_TABS: readonly (typeof ALL_NAMES)[number][] = ['index', 'favorites', 'orders', 'inbox', 'more'];
const VENDOR_TABS: readonly (typeof ALL_NAMES)[number][] = ['index', 'explore', 'orders', 'inbox', 'more'];
// Signed-out visitors browse the catalog (see lib/guestAccess.ts). Account
// shows them a sign-in prompt; orders/favorites/explore need an account.
const GUEST_TABS: readonly (typeof ALL_NAMES)[number][] = ['index', 'offers', 'account', 'more'];

// Unlike stack screens, tabs never get an automatic back button — but these
// two are usually reached via a push (e.g. from the account menu) rather
// than a tab tap, so they need one added manually to get back where the
// user came from.
const BACK_BUTTON_TABS = new Set<(typeof ALL_NAMES)[number]>(['favorites', 'offers']);

function HeaderBack() {
  const { lang } = useI18n();
  const Arrow = lang === 'ar' ? ArrowRight : ArrowLeft;
  return (
    <Pressable
      onPress={() => {
        // `router.back()` inside a tab navigator has no real push history to
        // pop when this tab was reached by tapping it in the bottom bar (its
        // normal, primary way in for dentists) — it was landing on the home
        // tab instead of wherever the user actually came from. Only pop when
        // there's genuine history (e.g. pushed here from the account menu);
        // otherwise land on Account, a real screen rather than home.
        if (router.canGoBack()) router.back();
        else router.push('/account');
      }}
      className="ms-3 h-8 w-8 items-center justify-center"
    >
      <Arrow size={22} color="#0F172A" />
    </Pressable>
  );
}

export default function AppTabs() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, role, loading } = useUserRole();

  // All hooks must be called before any early return.
  const { data: dentistOrders = [] } = useDentistOrders(user?.uid);
  const { data: supplierOrders = [] } = useOrders(user?.uid);
  const seenIds = useSeenOrderIds(user?.uid);
  const unreadMessages = useDmUnreadTotal(user?.uid);

  const isDentist = role?.accountType === 'dentist';
  const isGuest = !loading && !user;
  const visible = isGuest ? GUEST_TABS : isDentist ? DENTIST_TABS : VENDOR_TABS;
  // Badge shows *unseen* orders, not the total — opening an order (see
  // orders.tsx) marks it seen, so the count drops as the user reviews orders
  // instead of staying pinned at the all-time total.
  const orders = isDentist ? dentistOrders : supplierOrders;
  const ordersCount = orders.filter((o) => !seenIds.has(o.id)).length;

  return (
    <Tabs
      // Android detaches inactive tab screens from the view hierarchy by
      // default (to save memory) by asking react-native-screens to
      // remove/reattach their native Fragments. Under Fabric that
      // detach-then-reattach handoff is buggy (a screen can get told to
      // attach to a new parent before the old one finished detaching it),
      // which throws "addViewAt: ... The specified child already has a
      // parent" — reproduced here on every tab switch away from a vendor
      // dashboard (a hidden tab reached via redirect) to Explore. Keeping
      // screens attached (just hidden) sidesteps that native race entirely.
      // See https://github.com/react-navigation/react-navigation/issues/11384
      detachInactiveScreens={false}
      // Tells each tab whether it sits under a header (see headerContext).
      screenLayout={({ children, options }) => (
        <HasHeaderContext.Provider value={options.headerShown !== false}>{children}</HasHeaderContext.Provider>
      )}
      screenOptions={{
        // Same icons and order; the active tab is a stronger blue with a bold
        // label, the others a quieter grey, so the current tab reads at a glance.
        tabBarActiveTintColor: '#1D6FE8',
        tabBarInactiveTintColor: '#7A8AA0',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#DCE7F5',
          shadowColor: '#1E3A8A',
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: -3 },
          elevation: 8,
        },
      }}
    >
      {ALL_NAMES.map((name) => {
        const shown = visible.includes(name);
        const Icon = ICONS[name];
        const label = LABELS[name];
        return (
          <Tabs.Screen
            key={name}
            name={name}
            options={
              shown
                ? {
                    title: ar ? label.ar : label.en,
                    headerShown: name !== 'index',
                    headerLeft: BACK_BUTTON_TABS.has(name) ? () => <HeaderBack /> : undefined,
                    tabBarIcon: ({ color, size }) => <Icon color={color} size={size} strokeWidth={2.2} />,
                    tabBarBadge:
                      name === 'orders' && ordersCount > 0
                        ? ordersCount
                        : name === 'inbox' && unreadMessages > 0
                          ? unreadMessages > 99
                            ? '99+'
                            : unreadMessages
                          : undefined,
                    tabBarBadgeStyle: { backgroundColor: '#EF4444', color: '#FFFFFF', fontSize: 10 },
                  }
                : // Hidden from the bar but still reachable (e.g. Account from the
                  // home avatar): keep its translated title — it showed the raw
                  // route name ("account").
                  { href: null, title: ar ? label.ar : label.en, headerShown: name !== 'index' }
            }
            // The messages screen is a full-screen stack screen (no tab bar
            // under an open chat); the tab only opens it.
            listeners={
              name === 'inbox'
                ? {
                    tabPress: (e) => {
                      e.preventDefault();
                      router.push('/messages');
                    },
                  }
                : undefined
            }
          />
        );
      })}

      {HIDDEN_NAMES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null, headerShown: false }} />
      ))}
    </Tabs>
  );
}
