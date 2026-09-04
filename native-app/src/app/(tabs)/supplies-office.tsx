import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen, Card, Button, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { OfficeOffers } from '@/components/OfficeOffers';
import { OfficeOrders } from '@/components/OfficeOrders';
import { AddProductModal, type ProductDraft } from '@/components/AddProductModal';
import {
  useProducts,
  useSignedImageUrls,
  useUpsertProduct,
  useDeleteProduct,
  type Product,
} from '@/lib/products';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function SuppliesOfficeScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, role } = useUserRole();
  const { data: products = [], isLoading } = useProducts();
  const upsert = useUpsertProduct();
  const remove = useDeleteProduct();

  const [modal, setModal] = useState<{ open: boolean; editing?: Product | null }>({
    open: false,
  });

  const mine = useMemo(
    () => products.filter((p) => p.companyId === user?.uid),
    [products, user?.uid],
  );
  const allPaths = useMemo(() => mine.flatMap((p) => p.images), [mine]);
  const { data: urlMap = {} } = useSignedImageUrls(allPaths);

  const save = async (d: ProductDraft) => {
    await upsert.mutateAsync({
      id: d.id,
      branch: 'general',
      ar: d.name,
      en: d.name,
      brand: d.brand,
      price: d.price,
      currency: d.currency,
      stock: d.stock,
      inStock: d.stock > 0,
      images: d.images,
      companyId: user?.uid,
      description: d.description || undefined,
    });
    setModal({ open: false });
  };

  if (isLoading) return <Spinner />;

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-extrabold text-slate-800">
            {ar ? 'لوحة المورد' : 'Supplier Dashboard'}
          </Text>
          <Text className="mt-0.5 text-sm text-slate-500">{role?.name ?? ''}</Text>
        </View>
        <Button size="sm" title={ar ? '+ منتج' : '+ Add'} onPress={() => setModal({ open: true })} />
      </View>

      <Text className="mt-5 text-sm font-bold text-slate-600">
        {ar ? 'منتجاتك' : 'Your products'} ({mine.length})
      </Text>

      {mine.length === 0 ? (
        <Text className="mt-6 text-center text-slate-500">
          {ar ? 'لا توجد منتجات بعد' : 'No products yet'}
        </Text>
      ) : (
        <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
          {mine.map((p) => {
            const img = p.images[0] ? urlMap[p.images[0]] : undefined;
            const price = p.currency === 'IQD' ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`;
            return (
              <Card key={p.id} className="w-[48%] overflow-hidden p-0">
                <ProductImage uri={img} className="h-24 w-full bg-slate-100" iconSize={26} />
                <View className="p-2.5">
                  <Text className="text-xs font-bold" numberOfLines={1}>
                    {p.ar || p.en}
                  </Text>
                  <Text className="mt-0.5 text-[11px] font-extrabold text-primary">{price}</Text>
                  <Text className={cn('text-[10px]', p.stock > 0 ? 'text-emerald-600' : 'text-rose-500')}>
                    {p.stock > 0 ? (ar ? `متوفر: ${p.stock}` : `In stock: ${p.stock}`) : ar ? 'نفد' : 'Out'}
                  </Text>
                  <View className="mt-2 flex-row gap-1.5">
                    <Pressable
                      onPress={() => setModal({ open: true, editing: p })}
                      className="flex-1 items-center rounded-lg bg-slate-100 py-1.5"
                    >
                      <Text className="text-[11px] font-bold text-slate-600">{ar ? 'تعديل' : 'Edit'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => remove.mutate(p.id)}
                      className="w-8 items-center justify-center rounded-lg bg-rose-50"
                    >
                      <Text className="text-[11px] font-bold text-rose-500">✕</Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })}
        </View>
      )}

      {!!user && <OfficeOrders supplierId={user.uid} />}
      {!!user && <OfficeOffers supplierId={user.uid} />}

      {modal.open && (
        <AddProductModal
          open={modal.open}
          ar={ar}
          initial={
            modal.editing
              ? {
                  id: modal.editing.id,
                  name: modal.editing.ar || modal.editing.en,
                  brand: modal.editing.brand,
                  price: modal.editing.price,
                  currency: modal.editing.currency,
                  stock: modal.editing.stock,
                  description: modal.editing.description ?? '',
                  images: modal.editing.images,
                }
              : null
          }
          onClose={() => setModal({ open: false })}
          onSave={save}
        />
      )}
    </Screen>
  );
}
