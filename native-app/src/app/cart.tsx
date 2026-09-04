import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react-native';

import { Screen, Text, Button } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { useCart, removeFromCart, updateCartQuantity, clearCart } from '@/lib/cartStore';
import { placeCartOrder } from '@/lib/orders';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';

function money(n: number, cur: string): string {
  return cur === 'IQD' ? `${n.toLocaleString()} د.ع` : `$${n.toFixed(2)}`;
}

type CartLine = {
  id: string;
  productName: string;
  productImage?: string;
  brand?: string;
  unitPrice: number;
  currency: 'USD' | 'IQD';
  quantity: number;
};

export default function CartScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const cart = useCart();
  const { user, role } = useUserRole();
  const [placing, setPlacing] = useState(false);

  const lines: CartLine[] = cart;
  const iqdSub = lines.filter((l) => l.currency === 'IQD').reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const usdSub = lines.filter((l) => l.currency !== 'IQD').reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  const checkout = async () => {
    if (!user || lines.length === 0) return;
    setPlacing(true);
    try {
      await placeCartOrder({
        id: user.uid,
        name: role?.name ?? (ar ? 'طبيب' : 'Dentist'),
        phone: role?.phone,
        address: role?.address,
        city: role?.city,
        clinicName: role?.clinicName,
      });
      clearCart();
      toast.success(ar ? 'تم إرسال طلبك' : 'Order placed');
      router.replace('/orders');
    } catch {
      toast.error(ar ? 'فشل إرسال الطلب' : 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  if (lines.length === 0) {
    return (
      <Screen>
        <View className="items-center py-24">
          <ShoppingCart size={56} color="#CBD5E1" strokeWidth={1.5} />
          <Text className="mt-4 text-base font-extrabold text-slate-700">{ar ? 'سلتك فارغة' : 'Your cart is empty'}</Text>
          <Button
            title={ar ? 'تصفح المستلزمات' : 'Browse supplies'}
            onPress={() => router.push('/supplies')}
            className="mt-5"
          />
        </View>
      </Screen>
    );
  }

  const renderItem = ({ item }: { item: CartLine }) => {
    const total = item.unitPrice * item.quantity;
    return (
      <View className="mb-3 flex-row gap-3 rounded-2xl border border-slate-200 bg-card p-3 shadow-sm">
        <ProductImage uri={item.productImage} className="h-14 w-14 rounded-xl bg-slate-100" iconSize={22} />
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
            {item.productName}
          </Text>
          <Text className="text-[11px] text-slate-400" numberOfLines={1}>
            {item.brand || (ar ? 'المورد' : 'Supplier')} · {money(item.unitPrice, item.currency)}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <Pressable
              onPress={() => {
                if (item.quantity <= 1) removeFromCart(item.id);
                else updateCartQuantity(item.id, item.quantity - 1);
              }}
              className="h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50"
            >
              <Minus size={14} color="#334155" />
            </Pressable>
            <Text className="min-w-6 text-center text-sm font-bold">{item.quantity}</Text>
            <Pressable
              onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
              className="h-7 w-7 items-center justify-center rounded-lg bg-[#2563EB]"
            >
              <Plus size={14} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={() => removeFromCart(item.id)} className="ml-auto h-7 w-7 items-center justify-center rounded-lg bg-rose-50">
              <Trash2 size={14} color="#E11D48" />
            </Pressable>
          </View>
        </View>
        <Text className="text-sm font-extrabold text-primary">{money(total, item.currency)}</Text>
      </View>
    );
  };

  return (
    <Screen scroll={false}>
      <View className="flex-row items-center justify-between pb-2">
        <Text className="text-xl font-extrabold text-slate-800">{ar ? 'السلة' : 'Cart'}</Text>
        <Text className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
          {lines.length}
        </Text>
      </View>

      <FlatList
        data={lines}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 8 }}
      />

      {/* Summary */}
      <View className="rounded-2xl border border-slate-200 bg-card px-4 py-3 shadow-sm">
        {usdSub > 0 && (
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-sm text-slate-500">{ar ? 'الإجمالي (دولار)' : 'USD total'}</Text>
            <Text className="text-sm font-extrabold text-slate-800">{money(usdSub, 'USD')}</Text>
          </View>
        )}
        {iqdSub > 0 && (
          <View className="flex-row items-center justify-between py-1">
            <Text className="text-sm text-slate-500">{ar ? 'الإجمالي (دينار)' : 'IQD total'}</Text>
            <Text className="text-sm font-extrabold text-slate-800">{money(iqdSub, 'IQD')}</Text>
          </View>
        )}
        <Button
          title={placing ? (ar ? 'جارٍ الإرسال…' : 'Placing…') : ar ? 'تأكيد الطلب' : 'Place Order'}
          onPress={checkout}
          loading={placing}
          className="mt-3"
        />
      </View>
    </Screen>
  );
}
