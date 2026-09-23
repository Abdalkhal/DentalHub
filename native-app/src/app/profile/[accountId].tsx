import { useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import { Heart, MapPin, Megaphone, MessageCircle, MessageSquare, Package, Phone, Send } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { ProductImage } from '@/components/ProductImage';
import { SendCaseModal } from '@/components/SendCaseModal';
import { ImplantDetailView } from '@/components/ImplantDetailView';
import { BRANCH_BADGE, BRANCH_IMAGES, BRANCH_OPTIONS } from '@/data/branches';
import { db } from '@/integrations/firebase/client';
import { useProducts, useSignedImageUrls, type Product } from '@/lib/products';
import { useOffers } from '@/lib/offers';
import { useIsFavorited, toggleFavorite } from '@/lib/favoritesStore';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  dentist: { ar: 'طبيب أسنان', en: 'Dentist' },
  supply: { ar: 'مكتب مستلزمات', en: 'Supplies Office' },
  implant: { ar: 'شركة زرعات', en: 'Implant Company' },
  lab: { ar: 'مختبر', en: 'Laboratory' },
};

const ROLE_TONE: Record<string, string> = {
  supply: 'bg-emerald-100 text-emerald-700',
  implant: 'bg-amber-100 text-amber-700',
  lab: 'bg-sky-100 text-sky-700',
  dentist: 'bg-violet-100 text-violet-700',
};

function mapsUrl(a: Record<string, unknown>): string {
  if (typeof a.mapUrl === 'string' && a.mapUrl) return a.mapUrl;
  if (typeof a.latitude === 'number' && typeof a.longitude === 'number') {
    return `https://www.google.com/maps/search/?api=1&query=${a.latitude},${a.longitude}`;
  }
  const addr = typeof a.address === 'string' && a.address ? a.address : 'Mosul, Iraq';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

function money(price: number, cur: string): string {
  return cur === 'IQD' ? `${price.toLocaleString()} د.ع` : `$${price.toFixed(2)}`;
}

export default function ProfileScreen() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, role } = useUserRole();
  const [showSendCase, setShowSendCase] = useState(false);
  const [viewingImplant, setViewingImplant] = useState<Product | null>(null);
  const favorited = useIsFavorited(accountId ?? '');

  const { data: account, isLoading } = useQuery({
    queryKey: ['profile-account', accountId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'public_profiles', accountId ?? ''));
      if (!snap.exists()) return null;
      return snap.data() as Record<string, unknown>;
    },
    retry: false,
    staleTime: 60_000,
  });

  const { data: allProducts = [] } = useProducts();
  const products = useMemo(
    () => allProducts.filter((p) => p.companyId === accountId),
    [allProducts, accountId],
  );
  const { data: offers = [] } = useOffers(accountId ?? '');

  const isSupply = account?.accountType === 'supply';
  const [branchFilter, setBranchFilter] = useState('all');
  const activeBranch = branchFilter !== 'all' ? BRANCH_OPTIONS.find((b) => b.value === branchFilter) : null;

  const filteredProducts = useMemo(() => {
    if (!isSupply) return products;
    if (branchFilter === 'all') return [];
    return products.filter((p) => p.branch === branchFilter);
  }, [products, branchFilter, isSupply]);

  const { data: urlMap = {} } = useSignedImageUrls(
    useMemo(() => filteredProducts.map((p) => p.images?.[0]).filter(Boolean) as string[], [filteredProducts]),
  );

  if (isLoading) return <Spinner />;

  if (!account) {
    return (
      <Screen>
        <Text className="mt-16 text-center text-slate-400">
          {ar ? 'الحساب غير موجود' : 'Account not found'}
        </Text>
      </Screen>
    );
  }

  const type = String(account.accountType ?? '');
  const name = String(account.name || account.surname || '');
  const city = String(account.city || account.address || '');
  const phone = typeof account.phone === 'string' ? account.phone : '';
  const address = typeof account.address === 'string' ? account.address : city;
  const instagram = typeof account.instagram === 'string' ? account.instagram : '';
  const photo = typeof account.photoURL === 'string' ? account.photoURL : '';
  const tone = ROLE_TONE[type] ?? 'bg-slate-100 text-slate-600';
  const roleLabel = (ROLE_LABELS[type]?.[ar ? 'ar' : 'en'] ?? type);

  // Implant companies' products carry accessories, diameter/length variants
  // and other implant-only fields that the generic product-detail screen
  // never renders (it has no concept of accessories at all) — the same
  // ImplantDetailView used on the implant company's own dashboard is reused
  // here so browsing to an implant from a profile page shows the exact same
  // detail, accessories included, instead of the stripped-down generic view.
  const openProduct = (p: Product) => {
    if (type === 'implant') {
      setViewingImplant(p);
      return;
    }
    router.push({ pathname: '/product-detail/[productId]', params: { productId: p.id } });
  };

  const toggleFav = () =>
    toggleFavorite(
      {
        id: accountId ?? '',
        title: name,
        vendor: roleLabel,
        price: 0,
        currency: 'USD',
        imageUrl: photo || undefined,
        addedAt: new Date().toISOString(),
        kind: 'office',
      },
      lang,
    );

  return (
    <Screen>
      {/* Header */}
      <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
        {photo ? (
          <Image source={{ uri: photo }} className="h-16 w-16 rounded-2xl bg-slate-100" />
        ) : (
          <View className={cn('h-16 w-16 items-center justify-center rounded-2xl', tone)}>
            <Text className="text-2xl font-extrabold">{name.charAt(0) || '؟'}</Text>
          </View>
        )}
        <View className="min-w-0 flex-1">
          <Text className="text-lg font-extrabold text-slate-900" numberOfLines={1}>
            {name}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-primary">{roleLabel}</Text>
          {!!city && (
            <View className="mt-1 flex-row items-center gap-1.5">
              <MapPin size={13} color="#64748B" />
              <Text className="text-xs text-slate-500" numberOfLines={1}>
                {city}
              </Text>
            </View>
          )}
        </View>
        {role?.accountType === 'dentist' && (
          <Pressable onPress={toggleFav} className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50">
            <Heart size={18} color="#EF4444" fill={favorited ? '#EF4444' : 'none'} />
          </Pressable>
        )}
      </View>

      {/* Contact actions */}
      {(phone || city) && (
        <View className="mt-3 flex-row gap-2">
          {!!phone && (
            <Pressable
              onPress={() => Linking.openURL(`tel:${phone}`)}
              className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-500"
            >
              <Phone size={16} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white">{ar ? 'اتصال' : 'Call'}</Text>
            </Pressable>
          )}
          {!!phone && (
            <Pressable
              onPress={() => Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`)}
              className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#25D366]"
            >
              <MessageCircle size={16} color="#FFFFFF" />
              <Text className="text-xs font-bold text-white">WhatsApp</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => Linking.openURL(mapsUrl(account))}
            className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-sky-100"
          >
            <MapPin size={16} color="#0369A1" />
            <Text className="text-xs font-bold text-sky-700">{ar ? 'الخريطة' : 'Map'}</Text>
          </Pressable>
        </View>
      )}

      {!!user && user.uid !== accountId && (
        <Pressable
          onPress={() =>
            router.push({
              pathname: '/messages',
              params: { with: accountId ?? '', withName: name, withPhoto: photo },
            })
          }
          className="mt-2.5 h-11 flex-row items-center justify-center gap-2 rounded-xl bg-[#2563EB]"
        >
          <MessageSquare size={16} color="#FFFFFF" />
          <Text className="text-sm font-bold text-white">{ar ? 'مراسلة' : 'Message'}</Text>
        </Pressable>
      )}

      {type === 'lab' && role?.accountType === 'dentist' && (
        <Pressable
          onPress={() => setShowSendCase(true)}
          className="mt-2.5 h-11 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-500"
        >
          <Send size={16} color="#FFFFFF" />
          <Text className="text-sm font-bold text-white">{ar ? 'إرسال حالة للمختبر' : 'Send case to lab'}</Text>
        </Pressable>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <View className="mt-5">
          <View className="mb-2 flex-row items-center gap-1.5">
            <Megaphone size={15} color="#2563EB" />
            <Text className="text-sm font-extrabold text-slate-800">
              {ar ? 'العروض والإعلانات' : 'Offers & Ads'}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerClassName="gap-2.5">
            {offers.map((o) => (
              <View
                key={o.id}
                className="w-[78%] gap-2 rounded-2xl p-3.5"
                style={{ backgroundColor: '#1D4ED8' }}
              >
                {!!o.imageUrl && (
                  <Image source={{ uri: o.imageUrl }} className="h-32 w-full rounded-xl bg-white/10" resizeMode="cover" />
                )}
                {!!o.description && (
                  <Text numberOfLines={2} className="text-[10px] leading-relaxed text-white/90">
                    {o.description}
                  </Text>
                )}
                <Text numberOfLines={2} className="text-base font-extrabold leading-tight text-white">
                  {o.title}
                </Text>
                {o.price != null && (
                  <View className="self-start rounded-md bg-white px-2 py-0.5">
                    <Text className="text-xs font-bold text-slate-900">
                      {money(o.price, o.currency || 'USD')}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Supply: branch categories, then that branch's products */}
      {isSupply && (
        <View className="mt-5 pb-4">
          {activeBranch ? (
            <>
              <Pressable onPress={() => setBranchFilter('all')} className="mb-3 flex-row items-center gap-1.5">
                <Package size={15} color="#2563EB" />
                <Text className="text-sm font-bold text-primary">{ar ? 'كل الفئات' : 'All Categories'}</Text>
              </Pressable>
              <View className="mb-3 flex-row items-center gap-3 rounded-2xl bg-primary/5 p-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                  {(() => {
                    const Badge = BRANCH_BADGE[activeBranch.value] ?? Package;
                    return <Badge size={18} color="#2563EB" />;
                  })()}
                </View>
                <View>
                  <Text className="text-sm font-extrabold text-slate-800">{ar ? activeBranch.ar : activeBranch.en}</Text>
                  <Text className="text-[11px] text-slate-500">
                    {filteredProducts.length} {ar ? 'منتج' : 'products'}
                  </Text>
                </View>
              </View>

              {filteredProducts.length > 0 ? (
                <View className="flex-row flex-wrap justify-between gap-y-3">
                  {filteredProducts.map((p) => (
                    <Pressable key={p.id} onPress={() => openProduct(p)} className="w-[48.5%]">
                      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm">
                        <ProductImage
                          uri={p.images?.[0] ? urlMap[p.images[0]] : undefined}
                          className="h-24 w-full bg-slate-100"
                          iconSize={22}
                        />
                        <View className="p-2.5">
                          <Text className="text-xs font-bold text-slate-800" numberOfLines={2}>
                            {ar ? p.ar || p.en : p.en || p.ar}
                          </Text>
                          <Text className="mt-1 text-xs font-extrabold text-primary">
                            {money(p.price, p.currency)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View className="items-center py-10">
                  <Package size={32} color="#CBD5E1" />
                  <Text className="mt-2 text-sm text-slate-400">
                    {ar ? `لا توجد منتجات في ${activeBranch.ar}` : `No products in ${activeBranch.en}`}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="mb-3 text-sm font-extrabold text-slate-800">
                {ar ? 'فروع طب الأسنان' : 'Dental Specialties'}
              </Text>
              <View className="flex-row flex-wrap justify-between gap-y-2.5">
                {BRANCH_OPTIONS.map((b) => {
                  const Badge = BRANCH_BADGE[b.value] ?? Package;
                  const image = BRANCH_IMAGES[b.value];
                  const count = products.filter((p) => p.branch === b.value).length;
                  return (
                    <Pressable
                      key={b.value}
                      onPress={() => setBranchFilter(b.value)}
                      className="w-[48.5%] overflow-hidden rounded-2xl border border-slate-200 bg-card p-3 shadow-sm"
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
            </>
          )}
        </View>
      )}

      {/* Non-supply: simple products grid */}
      {!isSupply && products.length > 0 && (
        <View className="mt-5 pb-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-slate-800">
              {ar ? 'المنتجات' : 'Products'}
            </Text>
            <Text className="text-xs text-slate-400">
              {products.length} {ar ? 'منتج' : 'items'}
            </Text>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {products.map((p) => (
              <Pressable key={p.id} onPress={() => openProduct(p)} className="w-[48.5%]">
                <View className="overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm">
                  <ProductImage
                    uri={p.images?.[0] ? urlMap[p.images[0]] : undefined}
                    className="h-24 w-full bg-slate-100"
                    iconSize={22}
                  />
                  <View className="p-2.5">
                    <Text className="text-xs font-bold text-slate-800" numberOfLines={2}>
                      {ar ? p.ar || p.en : p.en || p.ar}
                    </Text>
                    <Text className="mt-1 text-xs font-extrabold text-primary">
                      {money(p.price, p.currency)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {products.length === 0 && offers.length === 0 && (
        <View className="mt-12 items-center">
          <Package size={40} color="#CBD5E1" />
          <Text className="mt-3 text-center text-sm text-slate-400">
            {ar ? 'لا توجد منتجات بعد' : 'No products yet'}
          </Text>
        </View>
      )}

      {type === 'lab' && (
        <SendCaseModal
          labId={accountId ?? ''}
          labName={name}
          labPhone={phone}
          labAddress={address}
          labInstagram={instagram}
          open={showSendCase}
          onClose={() => setShowSendCase(false)}
        />
      )}

      {viewingImplant && (
        <ImplantDetailView product={viewingImplant} ar={ar} onClose={() => setViewingImplant(null)} />
      )}
    </Screen>
  );
}
