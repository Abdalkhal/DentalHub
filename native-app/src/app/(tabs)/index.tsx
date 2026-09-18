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
import { CartHeaderButton } from '@/components/CartHeaderButton';
import { useUnreadNotificationsCount } from '@/lib/notifications';
import { useLabStaffClaim, useUserRole, useSession } from '@/lib/useAuth';
import SuppliesOfficeScreen from './supplies-office';
import ImplantsOfficeScreen from './implants-office';
import LabsOfficeScreen from './labs-office';
import { setPatientStoreUser } from '@/lib/patientsStore';
import { setClinicStoreUser } from '@/lib/clinicStore';
import { setAppointmentsStoreUser } from '@/lib/appointmentsStore';
import { setFavoritesStoreUser } from '@/lib/favoritesStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useProducts, useSignedImageUrls } from '@/lib/products';
import { useQuickOrders, setQuickOrdersStoreUser } from '@/lib/quickOrders';
import { useImplantOffers } from '@/lib/implantOffers';
import { useActiveAds, type Ad } from '@/lib/adsStore';
import { AdDetailModal } from '@/components/AdDetailModal';
import { useOrders } from '@/lib/ordersStore';
import { useDentistCases, filterLegacyOrders } from '@/lib/caseTracking';
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

// Hoisted out of HomeScreen: defining a component inline inside another
// component's body gives it a brand-new function identity on every render,
// so React treats it as a different component type and unmounts+remounts
// its whole subtree each time HomeScreen re-renders (e.g. every time the
// live case-count listener pushes an update) — including the "See all"
// Pressable underneath it. A touch that lands mid-remount never completes,
// so the button can end up looking permanently dead despite being wired
// correctly. Taking `ar`/`title`/`seeAll` as props keeps this stable.
function SectionHead({ title, seeAll, ar }: { title: string; seeAll?: Href; ar: boolean }) {
  return (
    <View className="mb-2.5 flex-row items-center justify-between">
      <Text className="text-base font-extrabold text-slate-800">{title}</Text>
      {seeAll ? (
        <Pressable onPress={() => router.push(seeAll)} hitSlop={10} className="py-1">
          <Text className="text-xs font-bold text-primary">{ar ? 'عرض الكل ›' : 'See all ›'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type CategoryTile = { to: Href; ar: string; en: string; img: number; border: string };

const CATEGORY_TILES: CategoryTile[] = [
  { to: '/implants', ar: 'زراعة الأسنان', en: 'Implants', img: require('../../../assets/home/dental-implant.jpg'), border: 'border-orange-200' },
  { to: '/supplies', ar: 'مستلزمات طبية', en: 'Supplies', img: require('../../../assets/home/dental-supplies-icon.jpg'), border: 'border-teal-200' },
  { to: '/labs', ar: 'المختبرات', en: 'Labs', img: require('../../../assets/home/dental-bridge.jpg'), border: 'border-blue-200' },
  { to: '/clinic', ar: 'عيادتي', en: 'My Clinic', img: require('../../../assets/home/clinic-hero.jpg'), border: 'border-purple-200' },
];

export default function HomeScreen() {
  const { lang, toggle } = useI18n();
  const ar = lang === 'ar';
  const { user, role, loading } = useUserRole();
  const unreadCount = useUnreadNotificationsCount(user?.uid);
  const { claim: labStaff, loading: claimLoading } = useLabStaffClaim();
  useSession();

  const { data: products = [] } = useProducts();
  const quickItems = useQuickOrders();
  const { offers: implantOffers = [] } = useImplantOffers();

  const [q, setQ] = useState('');
  const [idx, setIdx] = useState(0);

  // Scope local stores to the signed-in user (web parity).
  useEffect(() => {
    const uid = user?.uid || '';
    setPatientStoreUser(uid);
    setClinicStoreUser(uid);
    setAppointmentsStoreUser(uid);
    setFavoritesStoreUser(uid);
    setQuickOrdersStoreUser(uid);
  }, [user?.uid]);

  const { data: activeAds = [] } = useActiveAds();
  const adImagePaths = useMemo(
    () => activeAds.map((a) => a.images[0]).filter((p): p is string => !!p),
    [activeAds],
  );
  const { data: adImageUrls } = useSignedImageUrls(adImagePaths);

  // Derived, not stateful: computing this in an effect + setState looped
  // forever, because `useSignedImageUrls`'s `data` is `undefined` until the
  // query resolves — defaulting it to a fresh `{}` on every render made the
  // effect's dependency "change" every render too.
  // `adsForBanner` mirrors `banners`' first N slots 1:1, so tapping the
  // banner can open the full Ad (contact number, all images) behind
  // whichever slot is currently showing — the legacy local-promo slots
  // after it have no Ad behind them (and never had a detail view either).
  const adsForBanner = useMemo(() => {
    const urls = adImageUrls ?? {};
    return activeAds.filter((a) => a.images[0] && urls[a.images[0]]);
  }, [activeAds, adImageUrls]);

  const banners: Banner[] = useMemo(() => {
    const urls = adImageUrls ?? {};
    const fromAds: Banner[] = adsForBanner.map((a) => ({
      title: a.title,
      subtitle: a.description,
      image: urls[a.images[0]],
    }));
    return [...fromAds, ...loadBanners()];
  }, [adsForBanner, adImageUrls]);

  // Auto-rotate banner carousel every 4s.
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  const banner = banners[idx] ?? banners[0];
  const bannerAd = idx < adsForBanner.length ? adsForBanner[idx] : null;
  const [viewingAd, setViewingAd] = useState<Ad | null>(null);

  const searchResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return products
      .filter((p) => [p.en, p.ar, p.brand].filter(Boolean).some((v) => v!.toLowerCase().includes(term)))
      .slice(0, 8);
  }, [q, products]);

  // Case tracking, ported from the web home ("Track Cases" banner + count):
  // a case reaches the dentist either because they sent it themselves
  // (dentistId set at send time) or because the lab linked it by matching
  // name+clinic in "طلب جديد" (see new-lab-order.tsx) — `filterLegacyOrders`
  // covers the older, unlinked local-store cases the same way web does.
  const dentistNameForCases = role?.accountType === 'dentist' ? [role.name, role.surname].filter(Boolean).join(' ').trim() : '';
  const localOrdersAll = useOrders();
  const { cases: dentistCases } = useDentistCases(user?.uid ?? '');
  const caseCount = useMemo(() => {
    const remote = dentistCases.map((c) => c.order);
    const remoteIds = new Set(remote.map((o) => o.id));
    const legacy = filterLegacyOrders(localOrdersAll, remoteIds, dentistNameForCases);
    const all = Array.from(new Map([...remote, ...legacy].map((o) => [o.id, o])).values());
    return all.filter((o) => o.status !== 'completed').length;
  }, [dentistCases, localOrdersAll, dentistNameForCases]);

  if (loading || claimLoading) return <Spinner />;
  if (!user) return <Redirect href="/login" />;

  // Invited lab staff have no `user_roles` document — only a custom claim — so
  // route them from the claim before falling through to the account-type logic,
  // otherwise they land on the dentist marketplace with no role at all. Both
  // staff slots a lab can assign a case to (designer, ceramist/technician)
  // share the same restricted case screen — see designerStore.ts, which
  // matches on `designerId` OR `ceramistId`.
  if (labStaff?.role === 'DESIGNER' || labStaff?.role === 'TECHNICIAN') {
    return <Redirect href={'/designer' as never} />;
  }

  // Match the web app: the Home tab takes each role to its own dashboard
  // rather than to the dentist marketplace. This renders that dashboard's
  // component directly instead of navigating to it (previously a
  // `<Redirect>` to the hidden `implants-office`/`supplies-office`/etc. tab).
  // That redirect made the Home tab's *content* be a different tab's screen
  // while Home stayed the technically-active route — switching away to
  // another tab (e.g. Explore) from there reliably crashed Android/Fabric
  // with "addViewAt: ... already has a parent", because react-native-screens
  // was asked to detach a tab that both the Home and the target tab's
  // Fragments thought they owned. Rendering the component inline keeps Home
  // the one and only active tab, so no such handoff ever happens.
  //
  // Admin is deliberately NOT handled here — signing in with the admin
  // account through the normal login screen now just lands on the regular
  // marketplace home below (its accountType is 'dentist'). The admin panel
  // is only reachable via the dedicated /admin-login deep link, which
  // checks the signed-in ID token's custom claim itself — see admin-login.tsx.
  if (role?.role === 'supply') return <SuppliesOfficeScreen />;
  if (role?.role === 'implant') return <ImplantsOfficeScreen />;
  if (role?.role === 'lab') return <LabsOfficeScreen />;

  const isDentist = role?.accountType === 'dentist';
  const isSupply = role?.accountType === 'supply';
  const isImplant = role?.accountType === 'implant';
  const isLab = role?.accountType === 'lab';

  const openProduct = (id: string) =>
    router.push({ pathname: '/product-detail/[productId]', params: { productId: id } });

  return (
    <>
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
          {isDentist && <CartHeaderButton />}
          <Pressable
            onPress={() => router.push('/notifications')}
            className="relative h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm"
          >
            <Bell size={17} color="#334155" />
            {unreadCount > 0 && (
              <View className="absolute -end-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1">
                <Text className="text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
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
              <Pressable
                disabled={!bannerAd}
                onPress={() => bannerAd && setViewingAd(bannerAd)}
                className="relative min-h-[170px] justify-center overflow-hidden rounded-3xl bg-[#2563EB] p-6"
              >
                {!!banner.image && (
                  <>
                    <Image source={{ uri: banner.image }} resizeMode="cover" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
                    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15,23,42,0.45)' }} />
                  </>
                )}
                <View className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/15" />
                <View className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-white/10" />
                <View className="flex-row items-center gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-xl font-extrabold leading-tight text-white">
                      {banner.title}
                    </Text>
                    {!!banner.subtitle && (
                      <Text numberOfLines={2} className="mt-1.5 text-sm leading-snug text-white/85">{banner.subtitle}</Text>
                    )}
                    {!!banner.price && (
                      <Text className="mt-2 text-lg font-extrabold text-yellow-300">{banner.price}</Text>
                    )}
                  </View>
                </View>
                {banners.length > 1 && (
                  <View className="absolute bottom-3 left-0 right-0 flex-row items-center justify-center gap-1.5">
                    {banners.map((_, i) => (
                      <View key={i} className={cn('rounded-full', i === idx ? 'h-2 w-4 bg-white' : 'h-1.5 w-1.5 bg-white/50')} />
                    ))}
                  </View>
                )}
              </Pressable>
            ) : (
              <View className="relative min-h-[170px] justify-center overflow-hidden rounded-3xl bg-[#2563EB] p-6">
                <View className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/15" />
                <View className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-white/10" />
                <Megaphone
                  size={144}
                  color="rgba(255,255,255,0.15)"
                  strokeWidth={1.2}
                  style={{ position: 'absolute', left: -10, bottom: -20 }}
                />
                <Text className="text-xl font-extrabold leading-tight text-white">
                  {ar ? 'هل تريد زيادة مبيعاتك؟' : 'Want to increase your sales?'}
                </Text>
                <Text className="mt-1.5 text-sm leading-snug text-white/90">
                  {ar ? 'أعلن معنا ليصل منتجك لجميع أطباء الأسنان' : 'Advertise with us to reach all dentists'}
                </Text>
                <Pressable
                  onPress={() => router.push('/my-ads')}
                  className="mt-3.5 self-start rounded-full bg-white/20 px-5 py-2.5"
                >
                  <Text className="text-sm font-bold text-white">
                    {ar ? 'تواصل للإعلان' : 'Contact to advertise'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* 4 — Category tiles (framed cards, matching web's src/routes/index.tsx) */}
          <View className="mt-6">
            <SectionHead title={ar ? 'تصفح حسب الفئة' : 'Browse by category'} ar={ar} />
            <View className="flex-row items-stretch gap-2">
              {CATEGORY_TILES.map((c) => (
                <Pressable
                  key={c.en}
                  onPress={() => router.push(c.to)}
                  style={{ minHeight: 92 }}
                  className="flex-1 items-center justify-between rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm"
                >
                  <View className={cn('h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 bg-slate-50', c.border)}>
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
            <SectionHead title={ar ? 'البراندات' : 'Brands'} seeAll="/brands" ar={ar} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2.5 pb-1">
                {BRANDS.slice(0, 8).map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => router.push({ pathname: '/brand/[brandId]', params: { brandId: b.id } })}
                    className="w-24"
                  >
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

          {/* 6 — Track cases (moved here from the Recent-orders slot to match
              web's home; "Recent orders" itself now lives only under
              طلباتي/My Orders, not on Home). */}
          <View className="mt-6">
            <Pressable
              onPress={() => router.push('/track-cases')}
              className="flex-row items-center gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-3.5"
            >
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-sky-100" style={{ borderWidth: 1, borderColor: '#BAE6FD' }}>
                <ClipboardList size={20} color="#0284C7" strokeWidth={2.2} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-extrabold text-slate-800">{ar ? 'تتبع حالاتك' : 'Track your cases'}</Text>
                <Text className="text-[11px] text-slate-500">
                  {ar ? 'تابع حالة الطلبات من المختبر' : 'Follow your lab order status'}
                </Text>
                <Text className="mt-0.5 text-[11px] font-bold text-primary">
                  {ar ? 'عرض جميع الحالات ›' : 'View all cases ›'}
                </Text>
              </View>
              <View className="shrink-0 items-center rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <Text className="text-xl font-extrabold text-slate-800">{caseCount}</Text>
                <Text className="text-[10px] text-slate-500">{ar ? 'حالات' : 'cases'}</Text>
              </View>
            </Pressable>
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
    {!!viewingAd && <AdDetailModal ad={viewingAd} ar={ar} onClose={() => setViewingAd(null)} />}
    </>
  );
}
