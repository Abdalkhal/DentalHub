import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ShoppingCart } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useCart } from '@/lib/cartStore';

// Persistent cart entry point for shopping screens (product detail, an
// office's profile, the supplies/brands directories) — mirrors web's
// always-visible header CartBadge (src/components/CartDrawer.tsx). Without
// this, adding a product only flashes an inline "Added" confirmation with no
// way to actually get to the cart short of digging into the "المزيد" menu.
export function CartHeaderButton() {
  const count = useCart().length;
  return (
    <Pressable
      onPress={() => router.push('/cart')}
      className="relative h-9 w-9 items-center justify-center rounded-full bg-slate-100"
    >
      <ShoppingCart size={17} color="#334155" />
      {count > 0 && (
        <View className="absolute -end-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1">
          <Text className="text-[10px] font-bold text-white">{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}
