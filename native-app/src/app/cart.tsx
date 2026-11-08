import { useMemo, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { KeyboardAwareScrollView } from '@/components/ui/KeyboardAwareScrollView';
import { router } from 'expo-router';
import { Check, Loader2, Share2, ShoppingCart, TicketPercent, Trash2 } from 'lucide-react-native';

import { Screen, Text, Input } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { useCart, removeFromCart } from '@/lib/cartStore';
import { placeCartOrder } from '@/lib/orders';
import { useUserRole, useSession } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { codeMessage, discountLabel, moneyRows, useCartPreview } from '@/lib/promo';
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
  const [promoInput, setPromoInput] = useState('');
  const [codes, setCodes] = useState<string[]>([]);
  const previewItems = useMemo(
    () => cart.map((i) => ({ productId: i.productId, quantity: i.quantity || 1 })),
    [cart],
  );
  const preview = useCartPreview(previewItems, codes, !!user);
  const [draftNo] = useState(() => `DNT-${Math.floor(1000 + Math.random() * 9000)}`);

  const officeNames = [...new Set(cart.map((i) => i.officeName).filter(Boolean))];
  const storeName =
    officeNames.length === 1 ? officeNames[0] : ar ? `${officeNames.length} مكاتب` : `${officeNames.length} offices`;

  const today = new Date();
  const dateLabel = today.toLocaleDateString(ar ? 'ar-IQ' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Until the server has answered, a row shows the price it was added at. The
  // order can't be placed on those: the button waits for the real total.
  const localIQD = cart.filter((i) => i.currency === 'IQD').reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const localUSD = cart.filter((i) => i.currency !== 'IQD').reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const priced = preview.data;
  const totals = priced?.totals ?? {
    rawUSD: localUSD,
    rawIQD: localIQD,
    tierSavedUSD: 0,
    tierSavedIQD: 0,
    discountUSD: 0,
    discountIQD: 0,
    netUSD: localUSD,
    netIQD: localIQD,
  };
  const iqdTotal = totals.netIQD;
  const usdTotal = totals.netUSD;
  const lineByIndex = new Map((priced?.offices ?? []).flatMap((o) => o.lines.map((l) => [l.index, l] as const)));
  const discounted = (priced?.offices ?? []).filter((o) => o.discountUSD > 0 || o.discountIQD > 0);
  const summaryRows = moneyRows(
    totals,
    discounted.length === 1 ? discountLabel(discounted[0], ar) : ar ? 'الخصومات' : 'Discounts',
    ar,
    { alwaysNet: true },
  );
  const canOrder = !!priced && !preview.isFetching && !preview.isError;

  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (!codes.includes(code)) setCodes([...codes, code]);
    setPromoInput('');
  };

  const handleShare = () => {
    const lines = cart.map(
      (i, index) => {
        const unit = lineByIndex.get(index)?.price ?? i.unitPrice;
        return `• ${i.productName} ×${i.quantity} — ${i.currency === 'IQD' ? fmtIqd(unit * i.quantity) : fmtUsd(unit * i.quantity)}`;
      },
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
        { note: note.trim() || undefined, codes, expected: { usd: usdTotal, iqd: iqdTotal } },
      );
      router.replace('/orders');
    } catch (e) {
      // placeCartOrder already best-effort-guards the notification write;
      // a thrown error here means the order itself failed.
      if (String((e as { message?: string })?.message).includes('price-changed')) {
        toast.error(
          ar
            ? 'تغيّر السعر أو الخصم منذ فتحت السلة. راجع الإجمالي الجديد ثم أكمل الطلب.'
            : 'A price or discount changed. Check the new total, then complete the order.',
        );
        preview.refetch();
      }
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
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
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
          {cart.map((item, index) => {
            const line = lineByIndex.get(index);
            const unit = line?.price ?? item.unitPrice;
            const tiered = !!line && line.price < line.listPrice;
            return (
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
                  {tiered && (
                    <Text className="text-xs text-slate-400 line-through">
                      {item.currency === 'IQD' ? fmtIqd(line.listPrice) : fmtUsd(line.listPrice)}
                    </Text>
                  )}
                  <Text className={tiered ? 'text-xs font-bold text-emerald-600' : 'text-xs text-slate-500'}>
                    {item.currency === 'IQD' ? fmtIqd(unit) : fmtUsd(unit)}
                  </Text>
                  <Text className="text-xs text-slate-300">×</Text>
                  <Text className="text-xs font-bold text-slate-700">{item.quantity}</Text>
                </View>
              </View>
              <View className="shrink-0 items-end">
                <Text className="text-sm font-extrabold" style={{ color: TEAL }}>
                  {item.currency === 'IQD' ? fmtIqd(unit * item.quantity) : fmtUsd(unit * item.quantity)}
                </Text>
                <Pressable onPress={() => removeFromCart(item.id)} className="mt-1 h-8 w-8 items-center justify-center rounded-lg">
                  <Trash2 size={16} color="#94A3B8" />
                </Pressable>
              </View>
            </View>
            );
          })}
        </View>

        {/* Discount code */}
        <View className="mt-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <View className="flex-row items-center gap-1.5">
            <TicketPercent size={16} color={TEAL} />
            <Text className="text-sm font-bold text-slate-700">{ar ? 'رمز الخصم' : 'Discount code'}</Text>
          </View>
          {codes.map((code) => {
            const result = priced?.codes.find((r) => r.code === code);
            const good = result?.status === 'applied';
            return (
              <View key={code} className="mt-3 rounded-xl px-3 py-2.5" style={{ backgroundColor: good ? `${TEAL}14` : '#F8FAFC' }}>
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-sm font-bold" style={{ color: good ? TEAL : '#475569', writingDirection: 'ltr' }}>
                    {code}
                  </Text>
                  <Pressable onPress={() => setCodes(codes.filter((c) => c !== code))}>
                    <Text className="text-[11px] font-bold text-slate-400">{ar ? 'إزالة' : 'Remove'}</Text>
                  </Pressable>
                </View>
                {!!result && (
                  <Text className={cn('mt-1 text-[11px]', good ? 'text-emerald-700' : result.status === 'beaten' ? 'text-slate-500' : 'text-rose-500')}>
                    {codeMessage(result, ar)}
                  </Text>
                )}
              </View>
            );
          })}
          <View className="mt-3 flex-row gap-2">
            <Input
              className="flex-1"
              value={promoInput}
              onChangeText={setPromoInput}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={ar ? 'أدخل الرمز' : 'Enter code'}
            />
            <Pressable
              onPress={handleApplyPromo}
              disabled={preview.isFetching}
              className={cn('h-11 flex-row items-center gap-1 rounded-xl px-4', preview.isFetching && 'opacity-60')}
              style={{ backgroundColor: TEAL }}
            >
              <Check size={14} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white">{ar ? 'تطبيق' : 'Apply'}</Text>
            </Pressable>
          </View>
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
            {summaryRows.map((r) => (
              <View key={r.key} className="flex-row items-center justify-between">
                <Text className={cn('text-sm', r.tone === 'total' ? 'font-bold text-slate-800' : r.tone === 'saving' ? 'text-emerald-600' : 'text-slate-500')}>
                  {r.label}
                </Text>
                <Text
                  className={cn(r.tone === 'total' ? 'text-base font-extrabold' : 'text-sm font-semibold', r.tone === 'saving' && 'text-emerald-600')}
                  style={r.tone === 'total' ? { color: TEAL, writingDirection: 'ltr' } : { writingDirection: 'ltr' }}
                >
                  {r.value}
                </Text>
              </View>
            ))}
            {!!priced?.skipped.length && (
              <Text className="text-[11px] text-amber-600">
                {ar ? 'بعض منتجات السلة لم تعد متوفرة ولن تدخل في الطلب.' : "Some cart items are no longer available and won't be ordered."}
              </Text>
            )}
            {preview.isError && (
              <Pressable onPress={() => preview.refetch()}>
                <Text className="text-[11px] font-bold text-rose-500">
                  {ar ? 'تعذر حساب السعر. اضغط لإعادة المحاولة' : "Couldn't work out the price. Tap to retry"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Sticky bottom actions */}
      <View className="flex-row gap-2 border-t border-slate-200 bg-white px-4 pb-4 pt-3">
        <Pressable onPress={handleShare} className="h-12 flex-row items-center gap-2 rounded-xl border border-slate-200 px-4">
          <Share2 size={16} color="#475569" />
        </Pressable>
        <Pressable
          onPress={handleComplete}
          disabled={placing || (!!user && !canOrder)}
          className={cn('h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl', (placing || (!!user && !canOrder)) && 'opacity-60')}
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
