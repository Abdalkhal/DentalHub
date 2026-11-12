import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useCart } from '@/lib/cartStore';
import { useSession } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

// Persistent cart entry point for shopping screens (product detail, an
// office's profile, the supplies/brands directories) — mirrors web's
// always-visible header CartBadge (src/components/CartDrawer.tsx). Without
// this, adding a product only flashes an inline "Added" confirmation with no
// way to actually get to the cart short of digging into the "المزيد" menu.
/** `className`/`style`/`color` let a screen match its other header buttons (the home header). */
export function CartHeaderButton({
  className,
  style,
  color = '#334155',
}: { className?: string; style?: StyleProp<ViewStyle>; color?: string } = {}) {
  const count = useCart().length;
  const { user } = useSession();
  // The cart is account based — guests are prompted to sign in when they try
  // to add something instead (see lib/guestAccess.ts).
  if (!user) return null;
  return (
    <Pressable
      onPress={() => router.push('/cart')}
      className={cn('relative h-9 w-9 items-center justify-center rounded-full bg-slate-100', className)}
      style={style}
    >
      <ShoppingCart size={17} color={color} />
      {count > 0 && (
        <View className="absolute -end-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1">
          <Text className="text-[10px] font-bold text-white">{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}
