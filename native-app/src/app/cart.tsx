import { useState } from 'react';
import { Pressable, ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Loader2, Share2, ShoppingCart, Trash2 } from 'lucide-react-native';

import { Screen, Text, Input } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { useCart, removeFromCart } from '@/lib/cartStore';
import { placeCartOrder } from '@/lib/orders';
import { useUserRole, useSession } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Faithful port of the web cart drawer (src/components/CartDrawer.tsx),
// rendered as a full screen per this app's established convention for web
// bottom-sheet/drawer content. Placing the order still runs through the
// already-native-ported placeCartOrder (lib/orders.ts) — that already
// writes the order doc per supplier AND a "طلب جديد من …" notification to
// that supplier, so nothing needed changing there; only this screen (the
// only way to actually reach the cart before) needed to match web's design.

const TEAL = '#0E6E66';

function fmtIqd(n: number): string {
  return `${n.toLocaleString()} د.ع`;
}
function fmtUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function CartScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const cart = useCart();
  const { user } = useSession();
  const { role } = useUserRole();

  const [placing, setPlacing] = useState(false);
  const [note, setNote] = useState('');
  const [draftNo] = useState(() => `DNT-${Math.floor(1000 + Math.random() * 9000)}`);

  const officeNames = [...new Set(cart.map((i) => i.officeName).filter(Boolean))];
  const storeName =
    officeNames.length === 1 ? officeNames[0] : ar ? `${officeNames.length} مكاتب` : `${officeNames.length} offices`;

  const today = new Date();
  const dateLabel = today.toLocaleDateString(ar ? 'ar-IQ' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const iqdTotal = cart.filter((i) => i.currency === 'IQD').reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const usdTotal = cart.filter((i) => i.currency !== 'IQD').reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  const handleShare = () => {
    const lines = cart.map(
      (i) => `• ${i.productName} ×${i.quantity} — ${i.currency === 'IQD' ? fmtIqd(i.unitPrice * i.quantity) : fmtUsd(i.unitPrice * i.quantity)}`,
    );
    const text = [
      storeName,
      dateLabel,
      ...lines,
      ar ? `الإجمالي بالدينار: ${fmtIqd(iqdTotal)}` : `IQD total: ${fmtIqd(iqdTotal)}`,
      ar ? `الإجمالي بالدولار: ${fmtUsd(usdTotal)}` : `USD total: ${fmtUsd(usdTotal)}`,
    ].join('\n');
    Share.share({ message: text }).catch(() => {});
  };

  const handleComplete = async () => {
    if (!user || cart.length === 0) return;
    setPlacing(true);
    try {
      await placeCartOrder(
        {
          id: user.uid,
          name: role?.name || (ar ? 'طبيب أسنان' : 'Dentist'),
          phone: role?.phone,
          address: role?.address,
          city: role?.city,
          clinicName: role?.clinicName,
        },
        { note: note.trim() || undefined },
      );
      router.replace('/orders');
    } catch {
      // placeCartOrder already best-effort-guards the notification write;
      // a thrown error here means the order itself failed.
    } finally {
      setPlacing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <Screen>
        <View className="items-center py-24">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: `${TEAL}14` }}>
            <ShoppingCart size={36} color={TEAL} />
          </View>
          <Text className="text-lg font-extrabold text-slate-700">{ar ? 'السلة فارغة' : 'Cart is empty'}</Text>
          <Text className="mt-1 text-sm text-slate-400">
            {ar ? 'أضف منتجات من كتالوج المستلزمات' : 'Add products from the supplies catalog'}
          </Text>
          <Pressable
            onPress={() => router.push('/supplies')}
            className="mt-6 h-11 flex-row items-center gap-2 rounded-xl px-6"
            style={{ backgroundColor: TEAL }}
          >
            <ShoppingCart size={16} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white">{ar ? 'تصفح الكتالوج' : 'Browse catalog'}</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
        {/* Invoice header */}
        <View className="overflow-hidden rounded-3xl p-5 shadow-lg" style={{ backgroundColor: TEAL }}>
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1">
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[11px] font-bold text-white/80">
                  {ar ? 'رقم الفاتورة' : 'Invoice #'} {draftNo}
                </Text>
              </View>
              <Text className="mt-1.5 text-xl font-extrabold text-white" numberOfLines={1}>
                {storeName}
              </Text>
              <Text className="mt-1 text-xs text-white/80">{dateLabel}</Text>
            </View>
            <View className="shrink-0 rounded-full bg-white/20 px-2.5 py-1">
              <Text className="text-[11px] font-bold text-white">{ar ? 'مسودة' : 'Draft'}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        <View className="mt-4 divide-y divide-slate-50 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {cart.map((item) => (
            <View key={item.id} className="flex-row items-center gap-3 px-3.5 py-3">
              <ProductImage uri={item.productImage} className="h-12 w-12 rounded-xl bg-slate-100" iconSize={20} />
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-slate-800" numberOfLines={1}>
                  {item.productName}
                </Text>
                {!!item.category && (
                  <Text className="text-[10px] text-slate-400" numberOfLines={1}>
                    {item.category}
                  </Text>
                )}
                <View className="mt-1 flex-row items-center gap-1.5">
                  <Text className="text-xs text-slate-500">
                    {item.currency === 'IQD' ? fmtIqd(item.unitPrice) : fmtUsd(item.unitPrice)}
                  </Text>
                  <Text className="text-xs text-slate-300">×</Text>
                  <Text className="text-xs font-bold text-slate-700">{item.quantity}</Text>
                </View>
              </View>
              <View className="shrink-0 items-end">
                <Text className="text-sm font-extrabold" style={{ color: TEAL }}>
                  {item.currency === 'IQD' ? fmtIqd(item.unitPrice * item.quantity) : fmtUsd(item.unitPrice * item.quantity)}
                </Text>
                <Pressable onPress={() => removeFromCart(item.id)} className="mt-1 h-8 w-8 items-center justify-center rounded-lg">
                  <Trash2 size={16} color="#94A3B8" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Note */}
        <View className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <Text className="text-sm font-bold text-slate-700">{ar ? 'ملاحظة (اختياري)' : 'Note (optional)'}</Text>
          <Input
            value={note}
            onChangeText={setNote}
            multiline
            placeholder={ar ? 'أضف ملاحظة للطلب…' : 'Add a note to your order…'}
            className="mt-3"
          />
        </View>

        {/* Order summary */}
        <View className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <Text className="text-sm font-bold text-slate-700">{ar ? 'ملخص الطلب' : 'Order summary'}</Text>
          <View className="mt-3 gap-2">
            {usdTotal > 0 && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-slate-800">{ar ? 'الإجمالي ($)' : 'Total ($)'}</Text>
                <Text className="text-base font-extrabold" style={{ color: TEAL }}>
                  {fmtUsd(usdTotal)}
                </Text>
              </View>
            )}
            {iqdTotal > 0 && (
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-bold text-slate-800">{ar ? 'الإجمالي (د.ع)' : 'Total (IQD)'}</Text>
                <Text className="text-base font-extrabold" style={{ color: TEAL }}>
                  {fmtIqd(iqdTotal)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky bottom actions */}
      <View className="flex-row gap-2 border-t border-slate-200 bg-white px-4 pb-4 pt-3">
        <Pressable onPress={handleShare} className="h-12 flex-row items-center gap-2 rounded-xl border border-slate-200 px-4">
          <Share2 size={16} color="#475569" />
        </Pressable>
        <Pressable
          onPress={handleComplete}
          disabled={placing}
          className={cn('h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl', placing && 'opacity-60')}
          style={{ backgroundColor: TEAL }}
        >
          {placing ? <Loader2 size={16} color="#FFFFFF" /> : <ShoppingCart size={16} color="#FFFFFF" />}
          <Text className="text-sm font-bold text-white">
            {placing ? (ar ? 'جارٍ الإرسال...' : 'Placing...') : ar ? 'إتمام الطلب' : 'Complete order'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}
