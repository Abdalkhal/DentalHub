// The cart as a floating button: it appears once something is in the cart and
// goes away when the cart is empty again — after the order is placed, or when
// the doctor removes everything. It replaces the cart icon that sat in the
// headers, and only shows for doctors, on the screens where they shop.
import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingCart } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useCart } from '@/lib/cartStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';

/** Shopping screens, by path prefix ("/" is the home tab only). */
const SHOP_PATHS = [
  '/favorites',
  '/offers',
  '/explore',
  '/brands',
  '/brand/',
  '/supplies',
  '/implants',
  '/implant-country/',
  '/product-detail/',
  '/profile/',
  '/specialized-implants',
  '/bone-grafts',
  '/quick-orders',
  '/catalog',
];
/** Screens with the bottom tab bar, so the button sits above it. */
const TAB_PATHS = ['/', '/favorites', '/offers', '/explore', '/orders', '/account', '/more'];
/** The tab bar's own height, above the safe-area inset. */
const TAB_BAR = 49;

export function FloatingCart() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { lang } = useI18n();
  const { role } = useUserRole();
  const cart = useCart();
  const count = cart.reduce((n, i) => n + (i.quantity || 1), 0);

  const onShopScreen = pathname === '/' || SHOP_PATHS.some((p) => pathname === p || pathname.startsWith(p));
  const shown = count > 0 && role?.accountType === 'dentist' && onShopScreen;

  // Pops in when it appears, and gives a small bump each time an item is added.
  const scale = useRef(new Animated.Value(0)).current;
  const last = useRef(0);
  useEffect(() => {
    if (!shown) {
      scale.setValue(0);
      last.current = 0;
      return;
    }
    if (last.current === 0) {
      Animated.spring(scale, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    } else if (count > last.current) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      ]).start();
    }
    last.current = count;
  }, [shown, count, scale]);

  if (!shown) return null;
  const bottom = insets.bottom + (TAB_PATHS.includes(pathname) ? TAB_BAR + 14 : 20);

  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', end: 16, bottom, transform: [{ scale }] }}>
      <Pressable
        onPress={() => router.push('/cart')}
        accessibilityRole="button"
        accessibilityLabel={lang === 'ar' ? `السلة، ${count} منتج` : `Cart, ${count} items`}
        className="h-[58px] w-[58px] items-center justify-center rounded-full"
        style={{
          backgroundColor: '#1D6FE8',
          borderWidth: 3,
          borderColor: '#FFFFFF',
          shadowColor: '#1D4ED8',
          shadowOpacity: 0.4,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        }}
      >
        <ShoppingCart size={24} color="#FFFFFF" strokeWidth={2.3} />
        <View
          className="absolute -top-1 -end-1 h-6 min-w-6 items-center justify-center rounded-full px-1"
          style={{ backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: '#1D6FE8' }}
        >
          <Text className="text-[11px] font-extrabold" style={{ color: '#1D6FE8' }}>
            {count > 99 ? '99+' : count}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
