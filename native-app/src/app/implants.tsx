import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';

import { Screen, Text, Input } from '@/components/ui';
import { COUNTRIES } from '@/data/implants';
import { ALL_COUNTRIES, countryFlagUrl } from '@/data/countries';
import { useProducts, COUNTRY_CODE_TO_SLUG, COUNTRY_SLUG_TO_CODE } from '@/lib/products';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const CATEGORIES: { to: Href; img: number; ar: string; en: string }[] = [
  { to: '/bone-grafts', img: require('../../assets/implants/bone-graft.jpg'), ar: 'البون كرافت', en: 'Bone Graft' },
  { to: '/surgical-guide', img: require('../../assets/implants/surgical-guide.jpg'), ar: 'الدليل الجراحي', en: 'Surgical Guide' },
  { to: '/specialized-implants', img: require('../../assets/implants/specialized.jpg'), ar: 'الزرعات المتخصصة', en: 'Specialized Implants' },
];

function FlagBadge({ code, flag }: { code: string; flag: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <View className="absolute left-0 top-1/2 h-8 w-8 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-sm">
      {failed || !code ? (
        <Text className="text-base">{flag || '🏳️'}</Text>
      ) : (
        <Image
          source={{ uri: countryFlagUrl(code) }}
          className="h-full w-full"
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const LEN_BOUNDS: [number, number] = [5, 18];
const DIA_BOUNDS: [number, number] = [3, 7];

function clamp(n: number, [min, max]: [number, number]): number {
  return Math.min(max, Math.max(min, n));
}

export default function ImplantsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [searchQ, setSearchQ] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  // Applied range — this is what actually filters the list below. The panel
  // edits a separate draft so nothing changes while you're still adjusting
  // it; only "تأكيد الفلترة" commits the draft here, and closing the panel
  // without confirming just discards the draft and leaves this untouched.
  const [lenMin, setLenMin] = useState(String(LEN_BOUNDS[0]));
  const [lenMax, setLenMax] = useState(String(LEN_BOUNDS[1]));
  const [diaMin, setDiaMin] = useState(String(DIA_BOUNDS[0]));
  const [diaMax, setDiaMax] = useState(String(DIA_BOUNDS[1]));

  const [draftLenMin, setDraftLenMin] = useState(lenMin);
  const [draftLenMax, setDraftLenMax] = useState(lenMax);
  const [draftDiaMin, setDraftDiaMin] = useState(diaMin);
  const [draftDiaMax, setDraftDiaMax] = useState(diaMax);

  const openFilter = () => {
    setDraftLenMin(lenMin);
    setDraftLenMax(lenMax);
    setDraftDiaMin(diaMin);
    setDraftDiaMax(diaMax);
    setShowFilter(true);
  };

  const applyFilter = () => {
    setLenMin(draftLenMin);
    setLenMax(draftLenMax);
    setDiaMin(draftDiaMin);
    setDiaMax(draftDiaMax);
    setShowFilter(false);
  };

  const clearFilter = () => {
    setLenMin(String(LEN_BOUNDS[0]));
    setLenMax(String(LEN_BOUNDS[1]));
    setDiaMin(String(DIA_BOUNDS[0]));
    setDiaMax(String(DIA_BOUNDS[1]));
    setShowFilter(false);
  };

  const { data: products = [] } = useProducts();

  // The range/search filter used to just sit there — adjusting it changed
  // nothing, on web either (its inputs have no matching filter predicate
  // anywhere in that file). Now it actually narrows which implants count
  // toward each country card below, and the same range/search is carried
  // over to a country's own implant list (implant-country/[country].tsx)
  // so what you set here keeps applying once you open a country.
  const activeLenRange = useMemo<[number, number]>(() => {
    const lo = clamp(Number(lenMin) || LEN_BOUNDS[0], LEN_BOUNDS);
    const hi = clamp(Number(lenMax) || LEN_BOUNDS[1], LEN_BOUNDS);
    return lo <= hi ? [lo, hi] : [hi, lo];
  }, [lenMin, lenMax]);
  const activeDiaRange = useMemo<[number, number]>(() => {
    const lo = clamp(Number(diaMin) || DIA_BOUNDS[0], DIA_BOUNDS);
    const hi = clamp(Number(diaMax) || DIA_BOUNDS[1], DIA_BOUNDS);
    return lo <= hi ? [lo, hi] : [hi, lo];
  }, [diaMin, diaMax]);
  const filterIsActive =
    activeLenRange[0] !== LEN_BOUNDS[0] ||
    activeLenRange[1] !== LEN_BOUNDS[1] ||
    activeDiaRange[0] !== DIA_BOUNDS[0] ||
    activeDiaRange[1] !== DIA_BOUNDS[1] ||
    !!searchQ.trim();

  const matchesFilter = (p: (typeof products)[number]): boolean => {
    const spec = p.implantSpec;
    const q = searchQ.trim().toLowerCase();
    if (q) {
      const hay = [p.brand, ...(spec?.diameters ?? []).map(String), ...(spec?.lengths ?? []).map(String)]
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (!filterIsActive) return true;
    const diams = spec?.diameters ?? [];
    const lens = spec?.lengths ?? [];
    if (diams.length > 0 && !diams.some((d) => d >= activeDiaRange[0] && d <= activeDiaRange[1])) return false;
    if (lens.length > 0 && !lens.some((l) => l >= activeLenRange[0] && l <= activeLenRange[1])) return false;
    return true;
  };

  // Merges the fixed 5-country starter list with any *other* country an
  // implant company's product actually specifies — that company's country
  // gets its own card automatically (looked up in the full ALL_COUNTRIES
  // table for its name/flag) instead of being invisible because it wasn't
  // one of the 5 hardcoded slugs. Counted by ISO country code, since that's
  // what `product.country`/`implantSpec.country` actually store.
  const countryCards = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (p.category !== 'implant' || p.branch === 'bone_graft') continue;
      if (!matchesFilter(p)) continue;
      const code = (p.country || p.implantSpec?.country || '').toUpperCase();
      if (!code) continue;
      counts[code] = (counts[code] || 0) + 1;
    }

    const base = COUNTRIES.map((c) => {
      const code = COUNTRY_SLUG_TO_CODE[c.slug] ?? c.slug.toUpperCase();
      return { slug: c.slug, ar: c.ar, en: c.en, flag: c.flag, code, count: counts[code] || 0 };
    });

    const knownCodes = new Set(base.map((c) => c.code));
    const extra = Object.keys(counts)
      .filter((code) => !knownCodes.has(code))
      .map((code) => {
        const entry = ALL_COUNTRIES.find((c) => c.code === code);
        return {
          slug: COUNTRY_CODE_TO_SLUG[code] ?? code.toLowerCase(),
          ar: entry?.ar ?? code,
          en: entry?.en ?? code,
          flag: '',
          code,
          count: counts[code],
        };
      })
      .sort((a, b) => b.count - a.count);

    return [...base, ...extra];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, searchQ, activeLenRange, activeDiaRange]);

  const openCountry = (slug: string) =>
    router.push({
      pathname: '/implant-country/[country]',
      params: {
        country: slug,
        ...(filterIsActive
          ? {
              lenMin: String(activeLenRange[0]),
              lenMax: String(activeLenRange[1]),
              diaMin: String(activeDiaRange[0]),
              diaMax: String(activeDiaRange[1]),
              q: searchQ.trim(),
            }
          : {}),
      },
    });

  return (
    <Screen>
      {/* Search + Filter toggle */}
      <View className="flex-row gap-2">
        <Input
          value={searchQ}
          onChangeText={setSearchQ}
          placeholder={ar ? 'ابحث حسب الشركة أو الطول أو القطر...' : 'Search by company, length, diameter...'}
          leftIcon={<Search size={16} color="#94A3B8" />}
          className="flex-1"
        />
        <Pressable
          onPress={() => (showFilter ? setShowFilter(false) : openFilter())}
          className={cn('h-12 w-12 items-center justify-center rounded-2xl border', filterIsActive ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
        >
          <SlidersHorizontal size={18} color={filterIsActive ? '#FFFFFF' : '#64748B'} />
        </Pressable>
      </View>

      {/* Simplified size filter: a plain min/max pair per dimension instead
          of four separate +/- steppers, which read as far more controls
          than "set a range" actually needs. Edits a draft — the list below
          only updates once "تأكيد الفلترة" is pressed, so there's a clear
          signal filtering happened; closing without confirming discards the
          draft and leaves the list exactly as it was. */}
      {showFilter && (
        <View className="mt-3 gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <View>
            <Text className="mb-1.5 text-xs font-bold text-slate-500">
              {ar ? `الطول (مم) ${LEN_BOUNDS[0]}–${LEN_BOUNDS[1]}` : `Length (mm) ${LEN_BOUNDS[0]}–${LEN_BOUNDS[1]}`}
            </Text>
            <View className="flex-row items-center gap-2">
              <Input value={draftLenMin} onChangeText={setDraftLenMin} keyboardType="numeric" placeholder={ar ? 'من' : 'Min'} className="flex-1" style={{ writingDirection: 'ltr' }} />
              <Text className="text-slate-400">–</Text>
              <Input value={draftLenMax} onChangeText={setDraftLenMax} keyboardType="numeric" placeholder={ar ? 'إلى' : 'Max'} className="flex-1" style={{ writingDirection: 'ltr' }} />
            </View>
          </View>
          <View>
            <Text className="mb-1.5 text-xs font-bold text-slate-500">
              {ar ? `القطر (مم) ${DIA_BOUNDS[0]}–${DIA_BOUNDS[1]}` : `Diameter (mm) ${DIA_BOUNDS[0]}–${DIA_BOUNDS[1]}`}
            </Text>
            <View className="flex-row items-center gap-2">
              <Input value={draftDiaMin} onChangeText={setDraftDiaMin} keyboardType="numeric" placeholder={ar ? 'من' : 'Min'} className="flex-1" style={{ writingDirection: 'ltr' }} />
              <Text className="text-slate-400">–</Text>
              <Input value={draftDiaMax} onChangeText={setDraftDiaMax} keyboardType="numeric" placeholder={ar ? 'إلى' : 'Max'} className="flex-1" style={{ writingDirection: 'ltr' }} />
            </View>
          </View>
          <View className="flex-row gap-2 pt-1">
            <Pressable onPress={clearFilter} className="h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
              <Text className="text-xs font-bold text-slate-600">{ar ? 'إلغاء الفلترة' : 'Clear filter'}</Text>
            </Pressable>
            <Pressable onPress={applyFilter} className="h-11 flex-1 items-center justify-center rounded-xl bg-primary">
              <Text className="text-xs font-extrabold text-primary-foreground">{ar ? 'تأكيد الفلترة' : 'Apply filter'}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Promo banner */}
      <View className="mt-4 overflow-hidden rounded-2xl p-4" style={{ backgroundColor: '#1D4ED8' }}>
        <View style={{ position: 'absolute', top: -32, right: -32, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <Text className="text-lg font-extrabold text-white">{ar ? 'دقة أعلى.. نتائج أفضل' : 'Higher precision.. Better results'}</Text>
        <Text className="mt-1 text-xs text-white/70">{ar ? 'أحدث أنظمة الزراعة السنية' : 'Latest dental implant systems'}</Text>
      </View>

      {/* Category cards */}
      <View className="mt-5">
        <Text className="mb-3 text-sm font-bold text-slate-800">{ar ? 'اختر الفئة' : 'Select category'}</Text>
        <View className="flex-row gap-2.5">
          {CATEGORIES.map((c) => (
            <Pressable
              key={c.en}
              onPress={() => router.push(c.to)}
              className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <View className="h-24 items-center justify-center bg-slate-50 p-2">
                <Image source={c.img} className="h-full w-full rounded-lg" resizeMode="cover" />
              </View>
              <Text className="p-2 text-center text-[11px] font-bold text-slate-800">{ar ? c.ar : c.en}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Country grid */}
      <View className="mt-5">
        <Text className="mb-3 text-sm font-bold text-slate-800">{ar ? 'زرعات حسب الدول' : 'Implants by country'}</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {countryCards.map((c) => (
            <Pressable
              key={c.slug}
              onPress={() => openCountry(c.slug)}
              className="w-[48.5%] items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <View className="relative mb-3 h-20 w-20 items-center justify-center rounded-full bg-sky-50">
                <Image source={require('../../assets/implants/implant.jpg')} className="h-14 w-14" resizeMode="contain" />
                <FlagBadge code={c.code} flag={c.flag} />
              </View>
              <Text className="text-center text-sm font-bold text-slate-800">
                {ar ? `زرعات ${c.ar}` : `${c.en} Implants`}
              </Text>
              <Text className="mt-0.5 text-center text-[11px] text-slate-500">
                {c.count} {ar ? 'منتج' : 'products'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </Screen>
  );
}
