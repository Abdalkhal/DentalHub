import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { useQuickOrders, addToPurchaseHistory } from '@/lib/quickOrders';
import { useProducts, useSignedImageUrls } from '@/lib/products';
import { addToCart } from '@/lib/cartStore';
import { toast } from '@/lib/toast';
import { useI18n } from '@/lib/i18n';

function fmtPrice(n: number) {
  return n > 0 ? `$${n.toFixed(2)}` : '—';
}

export default function QuickOrdersScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const items = useQuickOrders();
  const { data: products = [] } = useProducts();

  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  const imagePaths = useMemo(
    () => items.map((it) => productsById[it.productId]?.images?.[0]).filter(Boolean) as string[],
    [items, productsById],
  );
  const { data: urlMap = {} } = useSignedImageUrls(imagePaths);

  const handleReorder = (item: (typeof items)[number]) => {
    const p = productsById[item.productId];
    if (!p) {
      toast.error(ar ? 'المنتج غير متوفر حالياً' : 'Product is currently unavailable');
      return;
    }
    const imageUrl = p.images[0] ? urlMap[p.images[0]] : undefined;
    const productName = ar ? p.ar || p.en : p.en || p.ar;
    addToCart({
      productId: p.id,
      productName,
      productImage: imageUrl,
      officeId: p.companyId || '',
      officeName: item.vendor || p.brand || (ar ? 'المكتب' : 'Office'),
      brand: p.brand,
      category: p.branch,
      unitPrice: p.price,
      currency: p.currency,
      quantity: 1,
    });
    addToPurchaseHistory({
      productId: p.id,
      productName,
      vendor: item.vendor || p.brand,
      brand: p.brand,
      unitPrice: p.price,
      image: imageUrl,
      qty: 1,
    });
    toast.success(ar ? 'تمت إضافة المنتج إلى السلة' : 'Added to cart');
  };

  const goToProduct = (item: (typeof items)[number]) => {
    const p = productsById[item.productId];
    if (!p) return;
    router.push({
      pathname: '/product-detail/[productId]',
      params: { productId: p.id },
    });
  };

  return (
    <Screen>
      {items.length === 0 ? (
        <View className="items-center py-20">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-slate-100">
            <ShoppingBag size={36} color="#CBD5E1" strokeWidth={1.5} />
          </View>
          <Text className="text-lg font-bold text-slate-500">
            {ar ? 'لا توجد طلبات بعد' : 'No orders yet'}
          </Text>
          <Text className="mt-1 text-sm text-slate-400">
            {ar ? 'لم تقم بإجراء أي طلبات شراء بعد' : "You haven't placed any orders yet"}
          </Text>
          <Pressable
            onPress={() => router.push('/supplies')}
            className="mt-4 h-10 items-center justify-center rounded-xl bg-primary px-4"
          >
            <Text className="text-xs font-bold text-primary-foreground">
              {ar ? 'المستلزمات الطبية' : 'Medical Supplies'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-sm font-bold text-slate-500">
              {ar ? 'الأكثر طلباً' : 'Most Ordered'}
            </Text>
            <Text className="text-xs text-slate-400">
              {items.length} {ar ? 'منتج' : 'products'}
            </Text>
          </View>
          <View className="mt-2 gap-3">
            {items.map((item) => {
              const p = productsById[item.productId];
              const img = p?.images?.[0] ? urlMap[p.images[0]] : undefined;
              return (
                <View
                  key={item.productId}
                  className="flex-row items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
                >
                  <Pressable onPress={() => goToProduct(item)}>
                    <ProductImage uri={img} className="h-14 w-14 rounded-xl bg-slate-100" iconSize={22} />
                  </Pressable>

                  <Pressable onPress={() => goToProduct(item)} className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="text-sm font-bold text-slate-800">
                      {item.name}
                    </Text>
                    <Text numberOfLines={1} className="mt-0.5 text-[11px] text-slate-500">
                      {item.vendor}
                    </Text>
                    <View className="mt-2 flex-row items-center gap-2">
                      <Text className="text-[11px] text-slate-500">
                        {ar ? 'طلب' : 'ordered'} {item.orderCount}×
                      </Text>
                      <Text className="text-[11px] text-slate-300">·</Text>
                      <Text className="text-[11px] text-slate-500">
                        {ar ? 'الكمية' : 'qty'}: {item.totalQty}
                      </Text>
                      <Text className="text-[11px] text-slate-300">·</Text>
                      <Text className="text-[11px] font-bold text-primary">
                        {fmtPrice(item.unitPrice)}
                      </Text>
                    </View>
                  </Pressable>

                  <View className="shrink-0 items-end gap-1.5">
                    <Pressable
                      onPress={() => handleReorder(item)}
                      className="h-8 items-center justify-center rounded-lg bg-primary/10 px-3"
                    >
                      <Text className="text-[10px] font-bold text-primary">
                        {ar ? 'إعادة طلب' : 'Reorder'}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        handleReorder(item);
                        router.push('/cart');
                      }}
                      className="h-8 items-center justify-center rounded-lg bg-[#2563EB] px-3"
                    >
                      <Text className="text-[10px] font-bold text-white">
                        {ar ? 'شراء الآن' : 'Buy now'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
    </Screen>
  );
}
