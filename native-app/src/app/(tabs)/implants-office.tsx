import { useMemo, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BadgeCheck,
  Bell,
  Bone,
  ClipboardList,
  Megaphone,
  Package,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  UserCircle2,
} from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { ImplantFormModal } from '@/components/ImplantFormModal';
import { BoneGraftModal } from '@/components/BoneGraftModal';
import { SpecializedImplantForm } from '@/components/SpecializedImplantForm';
import { ImplantDetailView } from '@/components/ImplantDetailView';
import { BoneGraftDetailsModal } from '@/components/BoneGraftDetailsModal';
import { OfficeOffers } from '@/components/OfficeOffers';
import { useProducts, useSignedImageUrls, useDeleteProduct, type Product } from '@/lib/products';
import { useOrders } from '@/lib/orders';
import { useOffers } from '@/lib/offers';
import { useUnreadNotificationsCount } from '@/lib/notifications';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { ALL_COUNTRIES, countryFlagUrl } from '@/data/countries';

export default function ImplantsOfficeScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, role } = useUserRole();
  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadNotificationsCount(user?.uid);
  const { data: products = [], isLoading } = useProducts();
  const remove = useDeleteProduct();

  const mine = useMemo(
    () =>
      products.filter(
        (p) =>
          p.companyId === user?.uid &&
          (p.category === 'implant' ||
            p.category === 'surgical_kit' ||
            p.category === 'specialized_implant' ||
            p.branch === 'bone_graft'),
      ),
    [products, user?.uid],
  );
  const { data: orders = [] } = useOrders(user?.uid);
  const { data: offers = [] } = useOffers(user?.uid ?? '');

  const [implantModal, setImplantModal] = useState<{ open: boolean; editing?: Product | null }>({ open: false });
  const [graftModal, setGraftModal] = useState<{ open: boolean; editing?: Product | null }>({ open: false });
  const [specializedModal, setSpecializedModal] = useState<{ open: boolean; editing?: Product | null }>({ open: false });
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);

  const allPaths = useMemo(() => mine.flatMap((p) => p.images), [mine]);
  const { data: urlMap = {} } = useSignedImageUrls(allPaths);

  const countryByCode = useMemo(() => Object.fromEntries(ALL_COUNTRIES.map((c) => [c.code, c])), []);

  const openWhatsApp = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits) Linking.openURL(`https://wa.me/${digits}`);
  };

  const openEdit = (p: Product) => {
    if (p.branch === 'specialized_implant') setSpecializedModal({ open: true, editing: p });
    else if (p.branch === 'bone_graft') setGraftModal({ open: true, editing: p });
    else setImplantModal({ open: true, editing: p });
  };

  if (isLoading) return <Spinner />;

  return (
    <Screen>
      <View
        className="overflow-hidden rounded-3xl p-4"
        style={{ backgroundColor: '#0F172A', marginTop: insets.top }}
      >
        {/* Decorative background shapes only — same soft-circle technique
            already used for the dentist home hero banner ((tabs)/index.tsx),
            kept here instead of a gradient library so no new native module
            (and therefore no rebuild of the dev client) is required. */}
        <View
          pointerEvents="none"
          className="absolute -end-8 -top-12 h-40 w-40 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
        />
        <View
          pointerEvents="none"
          className="absolute -start-10 -bottom-14 h-36 w-36 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
        />
        <View pointerEvents="none" className="absolute -end-2 -bottom-3.5">
          <Bone size={104} color="rgba(255,255,255,0.06)" strokeWidth={1.2} />
        </View>

        <View className="flex-row items-start justify-between">
          <View className="min-w-0 flex-1 pe-3">
            <Text className="text-[11px] font-bold" style={{ color: '#60A5FA' }}>
              {ar ? 'مرحباً' : 'Welcome'}
            </Text>
            <Text className="mt-0.5 truncate text-xl font-extrabold text-white">
              {role?.name || (ar ? 'المستخدم' : 'User')}
            </Text>
            <View className="mt-1.5 flex-row items-center gap-1.5">
              <View className="h-1 w-5 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
              <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {ar ? 'شركة زرعات' : 'Implant Company'}
              </Text>
            </View>
            {!!role?.phone && (
              <Pressable
                onPress={() => openWhatsApp(role.phone!)}
                className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                <Phone size={11} color="rgba(255,255,255,0.75)" />
                <Text className="text-[11px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  {role.phone}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="items-end gap-2.5">
            <Pressable
              onPress={() => router.push('/notifications')}
              className="relative h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10"
            >
              <Bell size={16} color="#FFFFFF" />
              {unreadCount > 0 && (
                <View className="absolute -end-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1">
                  <Text className="text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>

            <Pressable onPress={() => router.push('/account')} className="relative">
              <View
                className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' }}
              >
                {role?.photoURL ? (
                  <Image source={{ uri: role.photoURL }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <UserCircle2 size={28} color="rgba(255,255,255,0.8)" />
                )}
              </View>
              <View
                className="absolute -end-0.5 -bottom-0.5 h-5 w-5 items-center justify-center rounded-full border-2"
                style={{ backgroundColor: '#3B82F6', borderColor: '#0F172A' }}
              >
                <BadgeCheck size={11} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>
        </View>
      </View>

      <View className="mt-3 flex-row gap-2">
        <View className="flex-1 gap-2 rounded-2xl border border-slate-200 bg-card p-3">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-sky-100">
            <Package size={15} color="#0284C7" />
          </View>
          <Text className="text-lg font-extrabold text-slate-800">{mine.length}</Text>
          <Text className="text-[11px] text-slate-500">{ar ? 'المنتجات' : 'Products'}</Text>
        </View>
        <View className="flex-1 gap-2 rounded-2xl border border-slate-200 bg-card p-3">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
            <ClipboardList size={15} color="#7C3AED" />
          </View>
          <Text className="text-lg font-extrabold text-slate-800">{orders.length}</Text>
          <Text className="text-[11px] text-slate-500">{ar ? 'الطلبات' : 'Orders'}</Text>
        </View>
        <View className="flex-1 gap-2 rounded-2xl border border-slate-200 bg-card p-3">
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-emerald-100">
            <Megaphone size={15} color="#059669" />
          </View>
          <Text className="text-lg font-extrabold text-slate-800">{offers.length}</Text>
          <Text className="text-[11px] text-slate-500">{ar ? 'العروض' : 'Offers'}</Text>
        </View>
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <Text className="text-sm font-bold text-slate-600">
          {ar ? 'منتجاتك' : 'Your products'} ({mine.length})
        </Text>
        <Pressable
          onPress={() => setShowAddMenu((v) => !v)}
          className="h-9 w-9 items-center justify-center rounded-xl bg-primary"
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
        </Pressable>
      </View>

      {showAddMenu && (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            onPress={() => {
              setImplantModal({ open: true });
              setShowAddMenu(false);
            }}
            className="h-16 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-card"
          >
            <Package size={16} color="#2563EB" />
            <Text className="text-[10px] font-bold text-slate-600">{ar ? 'زرعة جديدة' : 'New implant'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setGraftModal({ open: true });
              setShowAddMenu(false);
            }}
            className="h-16 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-card"
          >
            <Bone size={16} color="#059669" />
            <Text className="text-[10px] font-bold text-slate-600">{ar ? 'بون كرافت' : 'Bone graft'}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setSpecializedModal({ open: true });
              setShowAddMenu(false);
            }}
            className="h-16 flex-1 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-card"
          >
            <Sparkles size={16} color="#6366F1" />
            <Text className="text-[10px] font-bold text-slate-600">{ar ? 'زرعة متخصصة' : 'Specialized'}</Text>
          </Pressable>
        </View>
      )}

      {mine.length === 0 ? (
        <Text className="mt-6 text-center text-slate-500">{ar ? 'لا توجد منتجات بعد' : 'No products yet'}</Text>
      ) : (
        <View className="mt-3 flex-row flex-wrap justify-between gap-y-3">
          {mine.map((p) => {
            const img = p.images[0] ? urlMap[p.images[0]] : undefined;
            const price = p.currency === 'IQD' ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`;
            const countryCode = p.country || p.implantSpec?.country;
            const country = countryCode ? countryByCode[countryCode] : null;
            return (
              <Pressable
                key={p.id}
                onPress={() => setDetailProduct(p)}
                className="w-[48%] overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm"
              >
                <ProductImage uri={img} className="h-24 w-full bg-slate-100" iconSize={26} />
                <View className="p-2.5">
                  {country && (
                    <View className="mb-1.5 flex-row items-center gap-1 self-start rounded-lg bg-slate-100 px-1.5 py-0.5">
                      <Image
                        source={{ uri: countryFlagUrl(country.code) }}
                        style={{ width: 12, height: 12, borderRadius: 2 }}
                      />
                      <Text className="text-[10px] font-semibold text-slate-600">
                        {ar ? country.ar : country.en}
                      </Text>
                    </View>
                  )}
                  <Text className="text-xs font-bold" numberOfLines={1}>
                    {p.ar || p.en}
                  </Text>
                  <Text className="mt-0.5 text-[11px] font-extrabold text-primary">{price}</Text>
                  <Text className="text-[10px] text-slate-400">
                    {p.stock > 0 ? (ar ? `متوفر: ${p.stock}` : `In stock: ${p.stock}`) : ar ? 'نفد' : 'Out'}
                  </Text>
                  <View className="mt-2 flex-row gap-1.5">
                    <Pressable
                      onPress={() => openEdit(p)}
                      className="flex-1 items-center rounded-lg bg-slate-100 py-1.5"
                    >
                      <Pencil size={13} color="#475569" />
                    </Pressable>
                    <Pressable
                      onPress={() => remove.mutate(p.id)}
                      className="flex-1 items-center rounded-lg bg-rose-50 py-1.5"
                    >
                      <Trash2 size={13} color="#F43F5E" />
                    </Pressable>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {!!user && (
        <View className="mt-7 rounded-3xl border border-violet-100 bg-violet-50/40 p-3.5">
          <OfficeOffers supplierId={user.uid} />
        </View>
      )}

      {implantModal.open && (
        <ImplantFormModal
          open={implantModal.open}
          ar={ar}
          product={implantModal.editing}
          onClose={() => setImplantModal({ open: false })}
        />
      )}
      {graftModal.open && (
        <BoneGraftModal
          open={graftModal.open}
          ar={ar}
          product={graftModal.editing}
          onClose={() => setGraftModal({ open: false })}
        />
      )}
      {specializedModal.open && (
        <SpecializedImplantForm
          open={specializedModal.open}
          ar={ar}
          product={specializedModal.editing}
          onClose={() => setSpecializedModal({ open: false })}
        />
      )}

      {detailProduct && detailProduct.branch === 'bone_graft' && (
        <BoneGraftDetailsModal product={detailProduct} ar={ar} onClose={() => setDetailProduct(null)} />
      )}
      {detailProduct && detailProduct.branch !== 'bone_graft' && (
        <ImplantDetailView product={detailProduct} ar={ar} onClose={() => setDetailProduct(null)} />
      )}
    </Screen>
  );
}
