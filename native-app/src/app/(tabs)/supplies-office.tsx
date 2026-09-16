import { useMemo, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import {
  Bell,
  Bone,
  ChevronLeft,
  ChevronRight,
  CircleUser,
  ClipboardList,
  Layers,
  MapPin,
  Megaphone,
  Package,
  Pencil,
  Phone,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { OfficeOffers } from '@/components/OfficeOffers';
import { OfficeOrders } from '@/components/OfficeOrders';
import { AddSupplyProductModal, type SupplyProductDraft } from '@/components/AddSupplyProductModal';
import { BoneGraftModal } from '@/components/BoneGraftModal';
import { ImplantFormModal } from '@/components/ImplantFormModal';
import { SpecializedImplantForm } from '@/components/SpecializedImplantForm';
import { BRANCH_BADGE, BRANCH_IMAGES, BRANCH_OPTIONS } from '@/data/branches';
import {
  useProducts,
  useSignedImageUrls,
  useUpsertProduct,
  useDeleteProduct,
  type Product,
} from '@/lib/products';
import { useUserRole } from '@/lib/useAuth';
import { useUnreadNotificationsCount } from '@/lib/notifications';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type TabKey = 'products' | 'implants' | 'offers' | 'orders';

const TABS: { key: TabKey; ar: string; en: string; icon: LucideIcon }[] = [
  { key: 'products', ar: 'المنتجات', en: 'Products', icon: Package },
  { key: 'implants', ar: 'الزرعات', en: 'Implants', icon: Bone },
  { key: 'offers', ar: 'العروض', en: 'Offers', icon: Megaphone },
  { key: 'orders', ar: 'الطلبات', en: 'Orders', icon: ClipboardList },
];

const STORE_LABEL: Record<string, { ar: string; en: string }> = {
  supply: { ar: 'متجر مستلزمات', en: 'Supply Store' },
  implant: { ar: 'شركة زرعات', en: 'Implant Co.' },
  lab: { ar: 'مختبر', en: 'Lab' },
  dentist: { ar: 'طبيب أسنان', en: 'Dentist' },
};

function mapsUrl(role: { latitude?: number; longitude?: number; mapUrl?: string; address?: string }): string {
  if (role.mapUrl) return role.mapUrl;
  if (role.latitude != null && role.longitude != null) {
    return `https://www.google.com/maps?q=${role.latitude},${role.longitude}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(role.address || 'Mosul, Iraq')}`;
}

export default function SuppliesOfficeScreen() {
  const { lang, toggle } = useI18n();
  const ar = lang === 'ar';
  const { user, role } = useUserRole();
  const unreadCount = useUnreadNotificationsCount(user?.uid);
  const { data: products = [], isLoading } = useProducts();
  const upsert = useUpsertProduct();
  const remove = useDeleteProduct();

  const [tab, setTab] = useState<TabKey>('products');
  const [branchFilter, setBranchFilter] = useState('all');
  const [modal, setModal] = useState<{ open: boolean; editing?: Product | null }>({ open: false });
  const [graftModal, setGraftModal] = useState<{ open: boolean; editing?: Product | null }>({ open: false });
  const [implantModal, setImplantModal] = useState<{ open: boolean; editing?: Product | null }>({ open: false });
  const [specializedModal, setSpecializedModal] = useState<{ open: boolean; editing?: Product | null }>({ open: false });

  const mine = useMemo(() => products.filter((p) => p.companyId === user?.uid), [products, user?.uid]);
  const grafts = useMemo(
    () => mine.filter((p) => p.category === 'implant' || p.branch === 'bone_graft' || p.category === 'surgical_kit' || p.category === 'specialized_implant'),
    [mine],
  );
  const { data: graftUrlMap = {} } = useSignedImageUrls(useMemo(() => grafts.flatMap((p) => p.images), [grafts]));
  const activeBranch = branchFilter !== 'all' ? BRANCH_OPTIONS.find((b) => b.value === branchFilter) : null;
  const filteredProducts = useMemo(
    () => (branchFilter === 'all' ? [] : mine.filter((p) => p.branch === branchFilter)),
    [mine, branchFilter],
  );
  const { data: urlMap = {} } = useSignedImageUrls(useMemo(() => filteredProducts.flatMap((p) => p.images), [filteredProducts]));

  const storeLabel = role?.accountType ? STORE_LABEL[role.accountType] : undefined;

  const save = async (d: SupplyProductDraft) => {
    await upsert.mutateAsync({
      id: d.id,
      branch: d.branch,
      subCategory: d.subCategory,
      ar: d.name,
      en: d.name,
      brand: d.brand,
      price: d.price,
      purchasePrice: d.purchasePrice,
      currency: d.currency,
      stock: d.stock,
      inStock: d.stock > 0,
      images: d.images,
      companyId: user?.uid,
      country: d.country,
      countryOrigin: d.countryOrigin,
      barcode: d.barcode,
      expiryDate: d.expiryDate,
      description: d.description || undefined,
      specs: d.specs,
      technicalSpecifications: d.technicalSpecifications,
      sku: d.sku,
    });
    setModal({ open: false });
  };

  if (isLoading) return <Spinner />;

  return (
    <Screen>
      {/* Profile header */}
      <Pressable
        onPress={() => router.push('/account')}
        className="overflow-hidden rounded-3xl p-4"
        style={{
          backgroundColor: '#0F172A',
          shadowColor: '#0F172A',
          shadowOpacity: 0.25,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 5,
        }}
      >
        <View style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(59,130,246,0.18)' }} />
        <View style={{ position: 'absolute', bottom: -50, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.05)' }} />
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1 flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-white/20 bg-white/10">
              {role?.photoURL ? (
                <Image source={{ uri: role.photoURL }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <CircleUser size={30} color="rgba(255,255,255,0.8)" />
              )}
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-bold text-white">
                {role?.name || (ar ? 'المستخدم' : 'User')}
              </Text>
              <Text className="mt-0.5 text-[11px] text-white/70">{ar ? storeLabel?.ar : storeLabel?.en}</Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <Phone size={11} color="rgba(255,255,255,0.7)" />
                <Text className="text-[11px] text-white/70">
                  {role?.phone || (ar ? 'لم يتم إضافة رقم هاتف' : 'No phone number added')}
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
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
            <Pressable onPress={toggle} className="h-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3">
              <Text className="text-xs font-bold text-white/90">{ar ? 'EN' : 'AR'}</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => Linking.openURL(mapsUrl(role ?? {}))}
          className="mt-3 flex-row items-center gap-1.5 border-t border-white/15 pt-3"
        >
          <MapPin size={12} color="rgba(255,255,255,0.7)" />
          <Text numberOfLines={1} className="flex-1 text-[11px] text-white/70">
            {role?.address || (ar ? 'لم يتم تحديد العنوان بعد' : 'No address set yet')}
          </Text>
        </Pressable>
      </Pressable>

      {/* Tabs */}
      <View className="mt-3 flex-row gap-1 rounded-2xl bg-slate-100 p-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              // No shadow class at all (not even "always on") — a transparent
              // Pressable with elevation still paints a faint halo behind the
              // *inactive* tabs on Android, which read as an unwanted
              // "selected" tint. A solid fill communicates the active tab
              // without needing any shadow.
              className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl"
              style={active ? { backgroundColor: '#0F172A' } : undefined}
            >
              <t.icon size={15} color={active ? '#FFFFFF' : '#64748B'} />
              <Text className={cn('text-xs font-bold', active ? 'text-white' : 'text-slate-500')}>{ar ? t.ar : t.en}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Tab content */}
      <View className="mt-4">
        {tab === 'products' && (
          <View className="gap-4">
            <Pressable
              onPress={() => setModal({ open: true })}
              className="flex-row items-center gap-3 overflow-hidden rounded-3xl p-4"
              style={{
                backgroundColor: '#0EA5E9',
                shadowColor: '#0EA5E9',
                shadowOpacity: 0.35,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              }}
            >
              <View style={{ position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.12)' }} />
              <View style={{ position: 'absolute', bottom: -36, left: -16, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <Plus size={22} color="#FFFFFF" strokeWidth={2.4} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-extrabold text-white">{ar ? 'إضافة منتج جديد' : 'Add new product'}</Text>
                <Text className="mt-0.5 text-[11px] text-white/80">
                  {ar ? 'وسّع كتالوج متجرك بصنف جديد' : 'Grow your catalog with a new item'}
                </Text>
              </View>
              {ar ? <ChevronLeft size={18} color="rgba(255,255,255,0.85)" /> : <ChevronRight size={18} color="rgba(255,255,255,0.85)" />}
            </Pressable>

            {activeBranch ? (
              <View className="gap-3">
                <Pressable onPress={() => setBranchFilter('all')} className="flex-row items-center gap-1.5">
                  <Package size={14} color="#2563EB" />
                  <Text className="text-sm font-bold text-primary">{ar ? 'كل الفئات' : 'All Categories'}</Text>
                </Pressable>
                <Text className="text-xs font-semibold text-slate-500">
                  {ar ? activeBranch.ar : activeBranch.en} · {filteredProducts.length} {ar ? 'منتج' : 'items'}
                </Text>
                {filteredProducts.length === 0 ? (
                  <View className="items-center py-10">
                    <Package size={32} color="#CBD5E1" />
                    <Text className="mt-2 text-sm text-slate-400">{ar ? 'لا توجد منتجات في هذه الفئة' : 'No products in this category'}</Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap justify-between gap-y-3">
                    {filteredProducts.map((p) => {
                      const img = p.images[0] ? urlMap[p.images[0]] : undefined;
                      const price = p.currency === 'IQD' ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`;
                      return (
                        <View
                          key={p.id}
                          className="w-[48%] overflow-hidden rounded-2xl border border-slate-200 bg-white"
                          style={{ shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
                        >
                          <ProductImage uri={img} className="h-24 w-full bg-slate-100" iconSize={26} />
                          <View className="p-2.5">
                            <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>
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
                              <Pressable onPress={() => remove.mutate(p.id)} className="w-8 items-center justify-center rounded-lg bg-rose-50">
                                <Trash2 size={13} color="#F43F5E" />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              <View>
                <Text className="mb-3 text-sm font-extrabold text-slate-800">{ar ? 'فروع طب الأسنان' : 'Dental Specialties'}</Text>
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {BRANCH_OPTIONS.map((b) => {
                    const Badge = BRANCH_BADGE[b.value] ?? Package;
                    const image = BRANCH_IMAGES[b.value];
                    const count = mine.filter((p) => p.branch === b.value).length;
                    return (
                      <Pressable
                        key={b.value}
                        onPress={() => setBranchFilter(b.value)}
                        className="w-[48.5%] overflow-hidden rounded-2xl border border-slate-200 bg-white p-3"
                        style={{ shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
                      >
                        <View className="absolute right-2.5 top-2.5 z-10 h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                          <Badge size={14} color="#2563EB" />
                        </View>
                        <View className="mb-1 h-20 items-center justify-center">
                          {image ? (
                            <Image source={image} className="h-20 w-full" resizeMode="contain" />
                          ) : (
                            <Badge size={32} color="#2563EB" />
                          )}
                        </View>
                        <Text className="text-xs font-bold leading-tight text-slate-800">{ar ? b.ar : b.en}</Text>
                        <Text className="mt-0.5 text-[10px] text-slate-400">
                          {count} {ar ? 'صنف' : 'items'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {tab === 'implants' && (
          <View className="gap-4">
            <View>
              <Text className="text-sm font-extrabold text-slate-800">{ar ? 'الزرعات والبون كرافت' : 'Implants & Bone Graft'}</Text>
              <Text className="mt-0.5 text-xs text-slate-400">
                {grafts.length} {ar ? 'منتج' : 'products'}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setImplantModal({ open: true })}
                className="h-14 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl"
                style={{ backgroundColor: '#0284C7', shadowColor: '#0284C7', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
                <Text className="text-[13px] font-extrabold text-white">{ar ? 'زرعة جديدة' : 'New Implant'}</Text>
              </Pressable>
              <Pressable
                onPress={() => setGraftModal({ open: true })}
                className="h-14 flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl"
                style={{ backgroundColor: '#059669', shadowColor: '#059669', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.6} />
                <Text className="text-[13px] font-extrabold text-white">{ar ? 'بون كرافت' : 'Bone Graft'}</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => setSpecializedModal({ open: true })}
              className="h-14 flex-row items-center justify-center gap-2 rounded-2xl"
              style={{ backgroundColor: '#6366F1', shadowColor: '#6366F1', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }}
            >
              <Sparkles size={16} color="#FFFFFF" strokeWidth={2.4} />
              <Text className="text-[13px] font-extrabold text-white">{ar ? 'إضافة زرعة متخصصة' : 'Add Specialized Implant'}</Text>
            </Pressable>

            {grafts.length === 0 ? (
              <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white py-14">
                <Bone size={36} color="#CBD5E1" />
                <Text className="mt-3 text-sm font-bold text-slate-500">{ar ? 'لا توجد زرعات أو بون كرافت بعد' : 'No implants or bone grafts yet'}</Text>
                <Text className="mt-1 px-8 text-center text-xs text-slate-400">
                  {ar ? "اضغط على زر 'بون كرافت' لإضافة أول منتج" : "Tap 'Bone Graft' to add the first product"}
                </Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between gap-y-3">
                {grafts.map((p) => {
                  const img = p.images[0] ? graftUrlMap[p.images[0]] : undefined;
                  const price = p.currency === 'IQD' ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`;
                  const isOut = (p.stock ?? 0) === 0;
                  return (
                    <View
                      key={p.id}
                      className="w-[48%] overflow-hidden rounded-2xl border border-slate-200 bg-white"
                      style={{ shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 }}
                    >
                      <View>
                        <ProductImage uri={img} className="h-28 w-full bg-slate-100" iconSize={28} />
                        {isOut && (
                          <View className="absolute right-2 top-2 rounded-full bg-rose-100 px-2 py-0.5">
                            <Text className="text-[9px] font-bold text-rose-600">{ar ? 'نفد' : 'Out'}</Text>
                          </View>
                        )}
                      </View>
                      <View className="p-2.5">
                        <Text className="text-xs font-bold text-slate-800" numberOfLines={2}>
                          {p.ar || p.en}
                        </Text>
                        <Text className="mt-1 text-sm font-extrabold text-primary">{price}</Text>
                        <View className="mt-1 flex-row items-center gap-1">
                          <Layers size={10} color="#94A3B8" />
                          <Text className={cn('text-[10px] font-semibold', isOut ? 'text-rose-500' : 'text-emerald-600')}>
                            {ar ? 'المخزون:' : 'Stock:'} {p.stock ?? 0}
                          </Text>
                        </View>
                        <View className="mt-2 flex-row gap-1.5">
                          <Pressable
                            onPress={() =>
                              p.branch === 'implant'
                                ? setImplantModal({ open: true, editing: p })
                                : p.branch === 'specialized_implant'
                                  ? setSpecializedModal({ open: true, editing: p })
                                  : setGraftModal({ open: true, editing: p })
                            }
                            className="flex-1 flex-row items-center justify-center gap-1 rounded-lg bg-slate-100 py-1.5"
                          >
                            <Pencil size={11} color="#475569" />
                            <Text className="text-[11px] font-bold text-slate-600">{ar ? 'تعديل' : 'Edit'}</Text>
                          </Pressable>
                          <Pressable onPress={() => remove.mutate(p.id)} className="w-8 items-center justify-center rounded-lg bg-rose-50">
                            <Trash2 size={13} color="#F43F5E" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {tab === 'offers' && !!user && <OfficeOffers supplierId={user.uid} />}
        {tab === 'orders' && !!user && <OfficeOrders supplierId={user.uid} />}
      </View>

      {modal.open && (
        <AddSupplyProductModal
          open={modal.open}
          ar={ar}
          defaultBranch={branchFilter !== 'all' ? branchFilter : undefined}
          initial={
            modal.editing
              ? {
                  id: modal.editing.id,
                  name: modal.editing.ar || modal.editing.en,
                  brand: modal.editing.brand,
                  price: modal.editing.price,
                  purchasePrice: modal.editing.purchasePrice,
                  currency: modal.editing.currency,
                  stock: modal.editing.stock,
                  description: modal.editing.description ?? '',
                  images: modal.editing.images,
                  branch: modal.editing.branch,
                  subCategory: modal.editing.subCategory,
                  country: modal.editing.country,
                  barcode: modal.editing.barcode,
                  expiryDate: modal.editing.expiryDate,
                  specs: modal.editing.specs,
                  technicalSpecifications: modal.editing.technicalSpecifications,
                  sku: modal.editing.sku,
                }
              : null
          }
          onClose={() => setModal({ open: false })}
          onSave={save}
        />
      )}

      {graftModal.open && (
        <BoneGraftModal open={graftModal.open} ar={ar} product={graftModal.editing} onClose={() => setGraftModal({ open: false })} />
      )}
      {implantModal.open && (
        <ImplantFormModal open={implantModal.open} ar={ar} product={implantModal.editing} onClose={() => setImplantModal({ open: false })} />
      )}
      {specializedModal.open && (
        <SpecializedImplantForm open={specializedModal.open} ar={ar} product={specializedModal.editing} onClose={() => setSpecializedModal({ open: false })} />
      )}
    </Screen>
  );
}
