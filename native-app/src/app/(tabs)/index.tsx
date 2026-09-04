import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Redirect, router, type Href } from 'expo-router';
import {
  Bell,
  ClipboardList,
  FlaskConical,
  Globe,
  History,
  Megaphone,
  Package,
  Search,
  User,
} from 'lucide-react-native';

import { Screen, Card, Button, Spinner, Text } from '@/components/ui';
import { getAccountDashboard, useLabStaffClaim, useUserRole, useSession } from '@/lib/useAuth';
import { setPatientStoreUser } from '@/lib/patientsStore';
import { setClinicStoreUser } from '@/lib/clinicStore';
import { setAppointmentsStoreUser } from '@/lib/appointmentsStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useProducts } from '@/lib/products';
import { useQuickOrders } from '@/lib/quickOrders';
import { useImplantOffers } from '@/lib/implantOffers';
import { useDentistOrders } from '@/lib/orders';
import { BRANDS } from '@/data/brands';

type Role = 'supply' | 'lab' | 'implant';
type Banner = { title: string; subtitle: string; price?: string; image?: string };

const ROLE_META: Record<Role, { ar: string; en: string }> = {
  supply: { ar: 'عروض المستلزمات', en: 'Supplies Offers' },
  lab: { ar: 'عروض المختبر', en: 'Lab Offers' },
  implant: { ar: 'عروض الزرعات', en: 'Implant Offers' },
};

function loadBanners(): Banner[] {
  const out: Banner[] = [];
  (['supply', 'lab', 'implant'] as Role[]).forEach((role) => {
    try {
      const raw = localStorage.getItem(`dh_store_${role}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { promos?: Banner[] };
      (parsed.promos ?? []).forEach((p) => {
        out.push({ title: p.title, subtitle: p.subtitle, price: p.price, image: p.image });
      });
    } catch {
      /* ignore malformed */
    }
  });
  return out;
}

function BrandMark({ image, name }: { image?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  if (image && !failed) {
    return (
      <Image
        source={{ uri: image }}
        className="h-full w-full"
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View className="h-full w-full items-center justify-center bg-slate-100">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-200">
        <Text className="text-sm font-extrabold tracking-tight text-slate-600">{initials}</Text>
      </View>
    </View>
  );
}

type CategoryTile = { to: Href; ar: string; en: string; img: number; border: string };

const CATEGORY_TILES: CategoryTile[] = [
  { to: '/implants', ar: 'زراعة الأسنان', en: 'Implants', img: require('../../../assets/home/dental-implant.png'), border: 'border-orange-200' },
  { to: '/supplies', ar: 'مستلزمات طبية', en: 'Supplies', img: require('../../../assets/home/dental-supplies-icon.png'), border: 'border-teal-200' },
  { to: '/labs', ar: 'المختبرات', en: 'Labs', img: require('../../../assets/home/dental-bridge.png'), border: 'border-blue-200' },
  { to: '/clinic', ar: 'عيادتي', en: 'My Clinic', img: require('../../../assets/home/clinic-hero.jpg'), border: 'border-purple-200' },
];

function fmtOrderDate(ts: unknown): string {
  const d = (ts as { toDate?: () => Date })?.toDate?.();
  return d ? d.toLocaleDateString() : '—';
}

export default function HomeScreen() {
  const { lang, toggle } = useI18n();
  const ar = lang === 'ar';
  const { user, role, loading } = useUserRole();
  const { claim: labStaff, loading: claimLoading } = useLabStaffClaim();
  useSession();

  const { data: products = [] } = useProducts();
  const quickItems = useQuickOrders();
  const { offers: implantOffers = [] } = useImplantOffers();

  const [q, setQ] = useState('');
  const [banners, setBanners] = useState<Banner[]>([]);
  const [idx, setIdx] = useState(0);

  // Scope local stores to the signed-in user (web parity).
  useEffect(() => {
    const uid = user?.uid || '';
    setPatientStoreUser(uid);
    setClinicStoreUser(uid);
    setAppointmentsStoreUser(uid);
  }, [user?.uid]);

  useEffect(() => {
    setBanners(loadBanners());
  }, []);

  // Auto-rotate banner carousel every 4s.
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  const banner = banners[idx] ?? banners[0];

  const searchResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return products
      .filter((p) => [p.en, p.ar, p.brand].filter(Boolean).some((v) => v!.toLowerCase().includes(term)))
      .slice(0, 8);
  }, [q, products]);

  const { data: dentistOrders = [] } = useDentistOrders(user?.uid);
  const recentOrders = useMemo(() => {
    const sorted = [...dentistOrders].sort((a, b) => {
      const ta = (a.createdAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
      const tb = (b.createdAt as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
      return tb - ta;
    });
    return sorted.slice(0, 3);
  }, [dentistOrders]);

  if (loading || claimLoading) return <Spinner />;
  if (!user) return <Redirect href="/login" />;

  // Invited lab staff have no `user_roles` document — only a custom claim — so
  // route them from the claim before falling through to the account-type logic,
  // otherwise they land on the dentist marketplace with no role at all.
  if (labStaff?.role === 'DESIGNER') return <Redirect href="/designer" />;

  // Match the web app: the Home tab takes each role to its own dashboard rather
  // than to the dentist marketplace. `getAccountDashboard` returns '/' for
  // dentists (and unknown roles), which is this screen — so guarding on that
  // both preserves the dentist home and rules out a redirect loop.
  const home = role?.role ? getAccountDashboard(role.role) : '/';
  if (home !== '/') return <Redirect href={home} />;

  const isDentist = role?.accountType === 'dentist';
  const isSupply = role?.accountType === 'supply';
  const isImplant = role?.accountType === 'implant';
  const isLab = role?.accountType === 'lab';

  const openProduct = (id: string) =>
    router.push({ pathname: '/product-detail/[productId]', params: { productId: id } });

  const SectionHead = ({ title, seeAll }: { title: string; seeAll?: Href }) => (
    <View className="mb-2.5 flex-row items-center justify-between">
      <Text className="text-base font-extrabold text-slate-800">{title}</Text>
      {seeAll ? (
        <Pressable onPress={() => router.push(seeAll)}>
          <Text className="text-xs font-bold text-primary">{ar ? 'عرض الكل ›' : 'See all ›'}</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Screen>
      {/* 1 — Header */}
      <View className="flex-row items-center justify-between">
        <Pressable onPress={() => router.push('/account')} className="items-center">
          <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
            <User size={18} color="#334155" />
          </View>
          <Text className="mt-0.5 text-[9px] font-bold text-slate-600">{ar ? 'حسابي' : 'Account'}</Text>
        </Pressable>

        <Text className="text-xl font-extrabold tracking-tight">
          <Text className="text-primary">Dental</Text>
          <Text className="text-slate-900">Hub</Text>
        </Text>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push('/notifications')}
            className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
          >
            <Bell size={17} color="#334155" />
          </Pressable>
          <Pressable
            onPress={toggle}
            className="h-9 flex-row items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 shadow-sm"
          >
            <Text className="text-xs font-bold text-slate-700">{lang === 'ar' ? 'EN' : 'AR'}</Text>
            <Globe size={13} color="#94A3B8" />
          </Pressable>
        </View>
      </View>

      {/* 2 — Search */}
      <View className="relative mt-3">
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={ar ? 'ابحث عن زراعة، مادة، مختبر...' : 'Search implants, materials, labs...'}
          placeholderTextColor="#94A3B8"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-4 pr-11 text-sm text-slate-700 shadow-sm"
        />
        <View className="absolute bottom-0 right-4 top-0 justify-center">
          <Search size={18} color="#94A3B8" />
        </View>
      </View>

      {/* Search results (replaces content while typing) */}
      {q.trim().length >= 2 ? (
        <View className="mt-2 gap-2 pb-10">
          {searchResults.length === 0 ? (
            <Text className="py-10 text-center text-slate-400">
              {ar ? 'لا توجد نتائج' : 'No results found'}
            </Text>
          ) : (
            searchResults.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => {
                  setQ('');
                  openProduct(p.id);
                }}
                className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3 shadow-sm"
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Package size={18} color="#64748B" />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                    {ar ? p.ar || p.en : p.en || p.ar}
                  </Text>
                  <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                    {p.brand || (ar ? 'المورد' : 'Supplier')}
                  </Text>
                </View>
                <Text className="text-sm font-extrabold text-primary">
                  {p.currency === 'IQD' ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : isDentist ? (
        <>
          {/* 3 — Hero carousel */}
          <View className="mt-4 overflow-hidden rounded-3xl">
            {banner ? (
              <View className="relative overflow-hidden rounded-3xl bg-[#2563EB] p-5">
                <View className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/15" />
                <View className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-white/10" />
                <View className="flex-row items-center gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-lg font-extrabold leading-tight text-white">
                      {banner.title}
                    </Text>
                    {!!banner.subtitle && (
                      <Text className="mt-1 text-xs leading-snug text-white/85">{banner.subtitle}</Text>
                    )}
                    {!!banner.price && (
                      <Text className="mt-1 text-base font-extrabold text-yellow-300">{banner.price}</Text>
                    )}
                  </View>
                </View>
                {banners.length > 1 && (
                  <View className="absolute bottom-2 left-0 right-0 flex-row items-center justify-center gap-1.5">
                    {banners.map((_, i) => (
                      <View key={i} className={cn('rounded-full', i === idx ? 'h-2 w-4 bg-white' : 'h-1.5 w-1.5 bg-white/50')} />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View className="relative overflow-hidden rounded-3xl bg-[#2563EB] p-5">
                <View className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-white/15" />
                <View className="absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-white/10" />
                <Megaphone
                  size={128}
                  color="rgba(255,255,255,0.15)"
                  strokeWidth={1.2}
                  style={{ position: 'absolute', left: -10, bottom: -18 }}
                />
                <Text className="text-lg font-extrabold leading-tight text-white">
                  {ar ? 'هل تريد زيادة مبيعاتك؟' : 'Want to increase your sales?'}
                </Text>
                <Text className="mt-1.5 text-xs leading-snug text-white/90">
                  {ar ? 'أعلن معنا ليصل منتجك لجميع أطباء الأسنان' : 'Advertise with us to reach all dentists'}
                </Text>
                <View className="mt-3 self-start rounded-full bg-white/20 px-4 py-2">
                  <Text className="text-xs font-bold text-white">
                    {ar ? 'تواصل للإعلان' : 'Contact to advertise'}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 4 — Category tiles */}
          <View className="mt-6">
            <SectionHead title={ar ? 'تصفح حسب الفئة' : 'Browse by category'} />
            <View className="flex-row items-start justify-between">
              {CATEGORY_TILES.map((c) => (
                <Pressable key={c.en} onPress={() => router.push(c.to)} className="w-[23%] items-center">
                  <View className={cn('h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 bg-slate-50', c.border)}>
                    <Image source={c.img} className="h-full w-full" resizeMode="cover" />
                  </View>
                  <Text className="mt-1.5 text-center text-[10px] font-bold leading-tight text-slate-700">
                    {ar ? c.ar : c.en}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 5 — Brands strip */}
          <View className="mt-6">
            <SectionHead title={ar ? 'البراندات' : 'Brands'} seeAll="/brands" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2.5 pb-1">
                {BRANDS.slice(0, 8).map((b) => (
                  <Pressable key={b.id} onPress={() => router.push('/brands')} className="w-24">
                    <View className="items-center rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <View className="mb-1.5 h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                        <BrandMark image={b.image} name={b.name} />
                      </View>
                      <Text numberOfLines={1} className="text-center text-[11px] font-bold text-slate-700">
                        {ar ? b.ar : b.name}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* 6 — Recent orders */}
          <View className="mt-6">
            <SectionHead title={ar ? 'أحدث الطلبات' : 'Recent orders'} seeAll="/orders" />
            {recentOrders.length === 0 ? (
              <View className="rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
                <Text className="text-center text-xs text-slate-400">
                  {ar ? 'لا توجد طلبات بعد' : 'No orders yet'}
                </Text>
              </View>
            ) : (
              <View className="gap-2.5">
                {recentOrders.map((o) => {
                  const st = (o.status as string) ?? 'pending';
                  const tone =
                    st === 'delivered' || st === 'confirmed'
                      ? 'bg-emerald-50 text-emerald-700'
                      : st === 'rejected'
                        ? 'bg-rose-50 text-rose-600'
                        : 'bg-amber-50 text-amber-700';
                  const label =
                    st === 'delivered' ? (ar ? 'تم التسليم' : 'Delivered')
                    : st === 'confirmed' ? (ar ? 'مؤكد' : 'Confirmed')
                    : st === 'rejected' ? (ar ? 'مرفوض' : 'Cancelled')
                    : ar ? 'قيد الانتظار' : 'Pending';
                  return (
                    <Pressable
                      key={o.id}
                      onPress={() => router.push('/orders')}
                      className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm"
                    >
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                        <ClipboardList size={18} color="#7C3AED" />
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                          {o.orderNumber || o.id.slice(0, 8)}
                        </Text>
                        <Text className="text-[11px] text-slate-400">{fmtOrderDate(o.createdAt)}</Text>
                      </View>
                      <View className={cn('shrink-0 rounded-full px-2.5 py-1', tone)}>
                        <Text className="text-[10px] font-bold">{label}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* 7 + 8 — Quick shortcuts */}
          <View className="mt-6 flex-row gap-2.5">
            <Pressable
              onPress={() => router.push('/quick-orders')}
              className="flex-1 rounded-2xl bg-[#2563EB] p-4 shadow-lg"
            >
              <History size={24} color="#FFFFFF" />
              <Text className="mt-2 text-sm font-extrabold text-white">
                {ar ? 'الطلبات السريعة' : 'Quick Orders'}
              </Text>
              <View className="mt-2 self-start rounded-full bg-white/20 px-2.5 py-0.5">
                <Text className="text-[11px] font-bold text-white">{quickItems.length}</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => router.push('/offers')}
              className="flex-1 rounded-2xl bg-indigo-500 p-4 shadow-lg"
            >
              <Megaphone size={24} color="#FFFFFF" />
              <Text className="mt-2 text-sm font-extrabold text-white">
                {ar ? 'العروض والإعلانات' : 'Offers & Ads'}
              </Text>
              <View className="mt-2 self-start rounded-full bg-white/20 px-2.5 py-0.5">
                <Text className="text-[11px] font-bold text-white">{implantOffers.length}</Text>
              </View>
            </Pressable>
          </View>
        </>
      ) : (
        /* Non-dentist home */
        <>
          <View className="mt-6 gap-3">
            {isSupply && (
              <Card className="items-center py-8">
                <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                  <Package size={26} color="#059669" />
                </View>
                <Text className="text-base font-extrabold text-slate-900">
                  {ar ? 'لوحة المورد' : 'Supplier Dashboard'}
                </Text>
                <Button
                  title={ar ? 'فتح اللوحة' : 'Open dashboard'}
                  onPress={() => router.push('/supplies-office')}
                  className="mt-4 w-full"
                />
              </Card>
            )}
            {isImplant && (
              <Card className="items-center py-8">
                <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                  <FlaskConical size={26} color="#D97706" />
                </View>
                <Text className="text-base font-extrabold text-slate-900">
                  {ar ? 'لوحة شركة الزرعات' : 'Implant Dashboard'}
                </Text>
                <Button
                  title={ar ? 'فتح اللوحة' : 'Open dashboard'}
                  onPress={() => router.push('/implants-office')}
                  className="mt-4 w-full"
                />
              </Card>
            )}
            {isLab && (
              <Card className="items-center py-8">
                <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                  <FlaskConical size={26} color="#7C3AED" />
                </View>
                <Text className="text-base font-extrabold text-slate-900">
                  {ar ? 'لوحة المختبر' : 'Lab Dashboard'}
                </Text>
                <Button
                  title={ar ? 'فتح اللوحة' : 'Open dashboard'}
                  onPress={() => router.push('/labs-office')}
                  className="mt-4 w-full"
                />
              </Card>
            )}
            <Pressable onPress={() => router.push('/orders')}>
              <Card className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                  <ClipboardList size={20} color="#475569" />
                </View>
                <Text className="flex-1 text-sm font-bold text-slate-800">
                  {ar ? 'طلباتي' : 'My Orders'}
                </Text>
                <Text className="text-lg text-slate-300">›</Text>
              </Card>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}
