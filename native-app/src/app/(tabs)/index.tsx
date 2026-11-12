import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router, type Href } from 'expo-router';
import {
  Bell,
  ClipboardList,
  FlaskConical,
  Globe,
  History,
  MapPin,
  Megaphone,
  Package,
  Search,
  Stethoscope,
  User,
  X,
} from 'lucide-react-native';

import { Screen, Card, Button, Spinner, Text } from '@/components/ui';
import { CartHeaderButton } from '@/components/CartHeaderButton';
import { useUnreadNotificationsCount } from '@/lib/notifications';
import { useLabStaffClaim, useUserRole, useSession } from '@/lib/useAuth';
import SuppliesOfficeScreen from './supplies-office';
import ImplantsOfficeScreen from './implants-office';
import LabsOfficeScreen from './labs-office';
import { setClinicsStoreUser } from '@/lib/clinicsStore';
import { setFavoritesStoreUser } from '@/lib/favoritesStore';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useProductSearch, useSignedImageUrls } from '@/lib/products';
import { PriceLock } from '@/components/PriceLock';
import { useQuickOrders, setQuickOrdersStoreUser } from '@/lib/quickOrders';
import { useImplantOffers } from '@/lib/implantOffers';
import { useActiveAds, type Ad } from '@/lib/adsStore';
import { AdDetailModal } from '@/components/AdDetailModal';
import { useOrders } from '@/lib/ordersStore';
import { useDentistCases, filterLegacyOrders } from '@/lib/caseTracking';
import { useVendorAccounts, type VendorAccount } from '@/lib/search';
import { BRANDS } from '@/data/brands';

const LOGO_MARK = require('../../../assets/images/logo-mark.png');

// Home palette: one medical blue, navy text, soft blue borders and shadows.
const BLUE = '#1D6FE8';
const NAVY = '#0F2747';
const MUTED = '#5B6B82';
const LINE = '#DCE7F5';
const softShadow = {
  shadowColor: '#1E3A8A',
  shadowOpacity: 0.07,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,
} as const;
/** Ads are designed as 2:1 banners; the frame keeps that ratio on every phone. */
const BANNER_RATIO = 2;

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
    <View className="mb-3 flex-row items-center justify-between">
      <Text className="text-[17px] font-extrabold" style={{ color: NAVY }}>
        {title}
      </Text>
      {seeAll ? (
        <Pressable
          onPress={() => router.push(seeAll)}
          hitSlop={10}
          className="h-8 flex-row items-center rounded-full px-3"
          style={{ backgroundColor: '#E8F1FE' }}
        >
          <Text className="text-xs font-extrabold" style={{ color: BLUE }}>
            {ar ? 'عرض الكل ›' : 'See all ›'}
          </Text>
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

  const [productTerm, setProductTerm] = useState('');
  const { data: foundProducts = [] } = useProductSearch(productTerm);
  const quickItems = useQuickOrders();
  const { offers: implantOffers = [] } = useImplantOffers();

  const [q, setQ] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [idx, setIdx] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const carouselRef = useRef<ScrollView>(null);

  // Scope local stores to the signed-in user (web parity). Clinic-scoped
  // stores (patients/appointments/clinic finance) go through
  // setClinicsStoreUser, which resolves (and migrates, on first run) the
  // active clinic before pointing them at it — see clinicsStore.ts.
  useEffect(() => {
    const uid = user?.uid || '';
    setClinicsStoreUser(uid);
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

  // Auto-rotate banner carousel every 4s, unless the user is swiping it
  // themselves — a manual drag sets `idx` via onMomentumScrollEnd below, and
  // this effect just keeps nudging the ScrollView to match.
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => {
        const next = (i + 1) % banners.length;
        carouselRef.current?.scrollTo({ x: next * carouselWidth, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [banners.length, carouselWidth]);

  const onBannerScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!carouselWidth) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setIdx(Math.max(0, Math.min(banners.length - 1, i)));
  };

  const [viewingAd, setViewingAd] = useState<Ad | null>(null);

  // Typing an existing account (office/lab/implant company) name found
  // nothing before — this only ever searched `products`, never accounts.
  const { data: vendorAccounts = [] } = useVendorAccounts();

  const accountResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return vendorAccounts
      .filter((a) => [a.name, a.location].filter(Boolean).some((v) => v.toLowerCase().includes(term)))
      .slice(0, 5);
  }, [q, vendorAccounts]);

  useEffect(() => {
    setProductTerm(q.trim().length >= 2 ? q : '');
  }, [q]);
  const searchResults = useMemo(() => foundProducts.slice(0, 8), [foundProducts]);

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

  // Invited lab staff have no `user_roles` document — only a custom claim — so
  // route them from the claim before falling through to the account-type logic,
  // otherwise they land on the dentist marketplace with no role at all. All
  // three staff roles a lab owner can invite (designer, ceramist/technician,
  // and the simple assistant-admin role) share the same restricted case
  // screen — see designerStore.ts/listDesignerCases, which matches on
  // `designerId` OR `ceramistId` regardless of the staff member's role.
  if (labStaff?.role === 'DESIGNER' || labStaff?.role === 'TECHNICIAN' || labStaff?.role === 'ADMIN') {
    return <Redirect href={'/designer' as never} />;
  }

  // A secretary only ever works in their own workspace.
  if (role?.accountType === 'secretary') {
    return <Redirect href={'/secretary' as never} />;
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

  // Signed-out visitors get the dentist marketplace minus its account-based
  // parts (notifications, cart, case tracking, quick orders) — see
  // lib/guestAccess.ts.
  const isGuest = !user;
  const isDentist = role?.accountType === 'dentist' || isGuest;
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
          {/* The account photo was never shown here — always the placeholder icon. */}
          <View
            className="h-[42px] w-[42px] items-center justify-center overflow-hidden rounded-full bg-white"
            style={{ borderWidth: 2, borderColor: '#BFD6F6', ...softShadow }}
          >
            {role?.photoURL ? (
              <Image source={{ uri: role.photoURL }} style={{ width: 38, height: 38, borderRadius: 19 }} resizeMode="cover" />
            ) : (
              <User size={18} color={NAVY} />
            )}
          </View>
          <Text className="mt-0.5 text-[9px] font-bold" style={{ color: MUTED }}>
            {ar ? 'حسابي' : 'Account'}
          </Text>
        </Pressable>

        {/* Brand: the app icon's "D" mark next to the wordmark, always laid out left-to-right. */}
        <View className="flex-row items-center gap-2" style={{ direction: 'ltr' }}>
          <View
            className="h-10 w-10 overflow-hidden rounded-xl bg-white"
            style={{ shadowColor: '#1D4ED8', shadowOpacity: 0.22, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }}
          >
            <Image source={LOGO_MARK} style={{ width: 40, height: 40 }} resizeMode="cover" />
          </View>
          <View>
            <Text className="text-[18px] font-extrabold leading-[22px]" style={{ letterSpacing: -0.4 }}>
              <Text style={{ color: BLUE }}>Dent</Text>
              <Text style={{ color: NAVY }}> Hub</Text>
            </Text>
            <Text className="text-[7.5px] font-bold" style={{ letterSpacing: 1.1, color: '#7C8DA6' }}>
              DENTAL MARKETPLACE
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-1.5">
          {isDentist && <CartHeaderButton className="h-[38px] w-[38px] border bg-white" style={{ borderColor: LINE, ...softShadow }} color={NAVY} />}
          {!isGuest && (
            <Pressable
              onPress={() => router.push('/notifications')}
              className="relative h-[38px] w-[38px] items-center justify-center rounded-full border bg-white"
              style={{ borderColor: LINE, ...softShadow }}
            >
              <Bell size={17} color={NAVY} />
              {unreadCount > 0 && (
                <View className="absolute -end-1 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1">
                  <Text className="text-[9px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
          )}
          <Pressable
            onPress={toggle}
            className="h-[38px] flex-row items-center gap-1 rounded-full border bg-white px-2.5"
            style={{ borderColor: LINE, ...softShadow }}
          >
            <Text className="text-xs font-extrabold" style={{ color: NAVY }}>
              {lang === 'ar' ? 'EN' : 'AR'}
            </Text>
            <Globe size={13} color={BLUE} />
          </Pressable>
        </View>
      </View>

      {/* 2 — Search */}
      <View className="relative mt-4">
        <TextInput
          ref={searchInputRef}
          value={q}
          onChangeText={setQ}
          placeholder={ar ? 'ابحث...' : 'Search...'}
          placeholderTextColor="#8A9AB0"
          style={{ writingDirection: ar ? 'rtl' : 'ltr', textAlign: ar ? 'right' : 'left', borderColor: '#CFDDF0', color: NAVY, ...softShadow }}
          className="h-[52px] w-full rounded-2xl border bg-white pl-10 pr-12 text-[14px]"
        />
        <View className="absolute bottom-0 right-4 top-0 justify-center">
          <Search size={19} color={BLUE} />
        </View>
        {q.length > 0 && (
          <Pressable
            onPress={() => {
              // On Android, clearing a controlled TextInput's `value` while
              // the IME still has an active composing span (autocomplete
              // suggestion bar visible) doesn't always take — the native
              // text can survive the state update. `.clear()` resets the
              // native view directly, in addition to the state.
              searchInputRef.current?.clear();
              setQ('');
            }}
            className="absolute bottom-0 left-3 top-0 justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View className="h-5 w-5 items-center justify-center rounded-full bg-slate-200">
              <X size={12} color="#475569" />
            </View>
          </Pressable>
        )}
      </View>

      {/* Search results (replaces content while typing) */}
      {q.trim().length >= 2 ? (
        <View className="mt-2 gap-2 pb-10">
          {accountResults.length === 0 && searchResults.length === 0 ? (
            <Text className="py-10 text-center text-slate-400">
              {ar ? 'لا توجد نتائج' : 'No results found'}
            </Text>
          ) : (
            <>
              {accountResults.map((a: VendorAccount) => (
                <Pressable
                  key={a.id}
                  onPress={() => {
                    setQ('');
                    router.push({ pathname: '/profile/[accountId]', params: { accountId: a.id } });
                  }}
                  className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-3 shadow-sm"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
                    {a.category === 'labs' ? (
                      <Stethoscope size={18} color="#4F46E5" />
                    ) : a.category === 'implants' ? (
                      <FlaskConical size={18} color="#4F46E5" />
                    ) : (
                      <Package size={18} color="#4F46E5" />
                    )}
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                      {a.name}
                    </Text>
                    {!!a.location && (
                      <View className="mt-0.5 flex-row items-center gap-1">
                        <MapPin size={10} color="#94A3B8" />
                        <Text className="text-[11px] text-slate-400" numberOfLines={1}>
                          {a.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
              {searchResults.map((p) => (
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
                  {p.priceLocked ? (
                    <PriceLock officeId={p.companyId} compact />
                  ) : (
                    <Text className="text-sm font-extrabold text-primary">
                      {p.currency === 'IQD' ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`}
                    </Text>
                  )}
                </Pressable>
              ))}
            </>
          )}
        </View>
      ) : isDentist ? (
        <>
          {/* 3 — Hero carousel */}
          <View className="mt-4" onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}>
            {banners.length > 0 ? (
              <>
                <View className="overflow-hidden rounded-3xl" style={softShadow}>
                <ScrollView
                  ref={carouselRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onBannerScrollEnd}
                >
                  {banners.map((b, i) => {
                    const ad = i < adsForBanner.length ? adsForBanner[i] : null;
                    return (
                      <Pressable
                        key={i}
                        disabled={!ad}
                        onPress={() => ad && setViewingAd(ad)}
                        style={{ width: carouselWidth || undefined, aspectRatio: BANNER_RATIO }}
                        className="relative justify-center overflow-hidden rounded-3xl bg-[#2563EB] p-6"
                      >
                        {/* An ad image is a designed banner that carries its own
                            text, so it is shown as-is — overlaying the ad's title
                            (and a dark scrim) on top of it garbled the design.
                            The title is still shown in the ad's detail modal. */}
                        {b.image ? (
                          <>
                            {/* A blurred copy fills the frame; the ad itself is shown whole on top, never cropped. */}
                            <Image
                              source={{ uri: b.image }}
                              resizeMode="cover"
                              blurRadius={18}
                              style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                            />
                            <Image source={{ uri: b.image }} resizeMode="contain" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} />
                          </>
                        ) : (
                          <>
                            <View className="absolute -right-14 -top-16 h-48 w-48 rounded-full bg-white/15" />
                            <View className="absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-white/10" />
                            <View className="flex-row items-center gap-3">
                              <View className="min-w-0 flex-1">
                                <Text className="text-xl font-extrabold leading-tight text-white">
                                  {b.title}
                                </Text>
                                {!!b.price && (
                                  <Text className="mt-2 text-lg font-extrabold text-yellow-300">{b.price}</Text>
                                )}
                              </View>
                            </View>
                          </>
                        )}
                      </Pressable>
                    );
                  })}
                </ScrollView>
                </View>
                {banners.length > 1 && (
                  <View pointerEvents="none" className="mt-2.5 flex-row items-center justify-center gap-1.5">
                    {banners.map((_, i) => (
                      <View
                        key={i}
                        className="rounded-full"
                        style={i === idx ? { height: 6, width: 18, backgroundColor: BLUE } : { height: 6, width: 6, backgroundColor: '#BFD3EE' }}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View className="relative justify-center overflow-hidden rounded-3xl bg-[#2563EB] p-6" style={{ aspectRatio: BANNER_RATIO, ...softShadow }}>
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
            <View className="flex-row items-stretch gap-2.5">
              {CATEGORY_TILES.map((c) => (
                <Pressable
                  key={c.en}
                  // Supplies is a directory of supplier accounts, which guests
                  // can't read — send them to the brand catalog instead.
                  onPress={() => router.push(isGuest && c.to === '/supplies' ? '/brands' : c.to)}
                  style={{ height: 118, borderColor: LINE, ...softShadow }}
                  className="flex-1 items-center rounded-[20px] border bg-white px-1.5 pb-2 pt-3"
                >
                  <View
                    className="h-[60px] w-[60px] items-center justify-center overflow-hidden rounded-full"
                    style={{ borderWidth: 2, borderColor: '#D3E3F8', backgroundColor: '#F3F8FF' }}
                  >
                    <Image source={c.img} className="h-full w-full" resizeMode="cover" />
                  </View>
                  <View className="flex-1 justify-center">
                    <Text numberOfLines={2} className="text-center text-[11.5px] font-extrabold leading-[15px]" style={{ color: NAVY }}>
                      {ar ? c.ar : c.en}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 5 — Brands strip */}
          <View className="mt-6">
            <SectionHead title={ar ? 'البراندات' : 'Brands'} seeAll="/brands" ar={ar} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2.5 pb-2 pt-0.5">
                {BRANDS.slice(0, 8).map((b) => (
                  <Pressable
                    key={b.id}
                    onPress={() => router.push({ pathname: '/brand/[brandId]', params: { brandId: b.id } })}
                    style={{ width: 108 }}
                  >
                    <View className="items-center rounded-[20px] border bg-white p-2.5" style={{ borderColor: LINE, ...softShadow }}>
                      <View className="mb-2 h-16 w-full items-center justify-center overflow-hidden rounded-2xl bg-white p-1.5" style={{ borderWidth: 1, borderColor: '#EEF3FA' }}>
                        <BrandMark image={b.image} name={b.name} />
                      </View>
                      <Text numberOfLines={1} className="text-center text-[11.5px] font-extrabold" style={{ color: NAVY }}>
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
          {!isGuest && (
            <View className="mt-6">
              <Pressable
                onPress={() => router.push('/track-cases')}
                className="flex-row items-center gap-3 rounded-[20px] border bg-white p-3.5"
                style={{ borderColor: LINE, ...softShadow }}
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: '#E8F1FE' }}>
                  <ClipboardList size={21} color={BLUE} strokeWidth={2.2} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-extrabold" style={{ color: NAVY }}>
                    {ar ? 'تتبع حالاتك' : 'Track your cases'}
                  </Text>
                  <Text className="mt-0.5 text-[11.5px]" style={{ color: MUTED }}>
                    {ar ? 'تابع حالة الطلبات من المختبر' : 'Follow your lab order status'}
                  </Text>
                  <Text className="mt-1 text-[11.5px] font-extrabold" style={{ color: BLUE }}>
                    {ar ? 'عرض جميع الحالات ›' : 'View all cases ›'}
                  </Text>
                </View>
                <View className="h-[60px] min-w-[60px] shrink-0 items-center justify-center rounded-2xl px-2.5" style={{ backgroundColor: BLUE }}>
                  <Text className="text-[22px] font-extrabold leading-7 text-white">{caseCount}</Text>
                  <Text className="text-[10px] font-bold text-white/85">{ar ? 'حالات' : 'cases'}</Text>
                </View>
              </Pressable>
            </View>
          )}

          {/* 7 + 8 — Quick shortcuts */}
          <View className="mt-6 flex-row gap-2.5">
            {!isGuest && (
              <Pressable
                onPress={() => router.push('/quick-orders')}
                className="flex-1 rounded-[20px] p-4"
                style={{ backgroundColor: BLUE, ...softShadow }}
              >
                <History size={24} color="#FFFFFF" />
                <Text className="mt-2 text-sm font-extrabold text-white">
                  {ar ? 'الطلبات السريعة' : 'Quick Orders'}
                </Text>
                <View className="mt-2 self-start rounded-full bg-white/20 px-2.5 py-0.5">
                  <Text className="text-[11px] font-bold text-white">{quickItems.length}</Text>
                </View>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push('/offers')}
              className="flex-1 rounded-[20px] p-4"
              style={{ backgroundColor: '#1E4FA8', ...softShadow }}
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
