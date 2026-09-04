import { Tabs, Redirect } from 'expo-router';
import { Home, Heart, Menu, Search, ShoppingBag, Tag, User } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useUserRole } from '@/lib/useAuth';
import { useDentistOrders } from '@/lib/orders';
import { useOrders } from '@/lib/orders';
import { useI18n } from '@/lib/i18n';

const ALL_NAMES = ['index', 'explore', 'favorites', 'orders', 'offers', 'account', 'more'] as const;

const ICONS: Record<(typeof ALL_NAMES)[number], LucideIcon> = {
  index: Home,
  explore: Search,
  favorites: Heart,
  orders: ShoppingBag,
  offers: Tag,
  account: User,
  more: Menu,
};

const LABELS: Record<(typeof ALL_NAMES)[number], { ar: string; en: string }> = {
  index: { ar: 'الرئيسية', en: 'Home' },
  explore: { ar: 'استكشاف', en: 'Explore' },
  favorites: { ar: 'المفضلة', en: 'Favorites' },
  orders: { ar: 'طلباتي', en: 'Orders' },
  offers: { ar: 'العروض', en: 'Offers' },
  account: { ar: 'حسابي', en: 'Account' },
  more: { ar: 'المزيد', en: 'More' },
};

const DENTIST_TABS: readonly (typeof ALL_NAMES)[number][] = ['index', 'favorites', 'orders', 'offers', 'more'];
const VENDOR_TABS: readonly (typeof ALL_NAMES)[number][] = ['index', 'explore', 'orders', 'account', 'more'];

export default function AppTabs() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, role, loading } = useUserRole();

  // All hooks must be called before any early return.
  const { data: dentistOrders = [] } = useDentistOrders(user?.uid);
  const { data: supplierOrders = [] } = useOrders(user?.uid);

  if (loading) return null;
  if (!user) return <Redirect href="/login" />;

  const isDentist = role?.accountType === 'dentist';
  const visible = isDentist ? DENTIST_TABS : VENDOR_TABS;
  const ordersCount = isDentist ? dentistOrders.length : supplierOrders.length;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: { borderTopColor: '#E2E8F0' },
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
                    tabBarIcon: ({ color, size }) => <Icon color={color} size={size} strokeWidth={2.2} />,
                    tabBarBadge: name === 'orders' && ordersCount > 0 ? ordersCount : undefined,
                    tabBarBadgeStyle: { backgroundColor: '#EF4444', color: '#FFFFFF', fontSize: 10 },
                  }
                : { href: null }
            }
          />
        );
      })}
    </Tabs>
  );
}
