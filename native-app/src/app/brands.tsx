import { useMemo, useState } from 'react';
import { Image, Pressable, SectionList, View } from 'react-native';
import { router } from 'expo-router';
import { Search } from 'lucide-react-native';

import { Screen, Text, Input } from '@/components/ui';
import { BRANDS, type Brand } from '@/data/brands';
import { useI18n } from '@/lib/i18n';

// `String.prototype.localeCompare` with a locale arg is unreliable on
// Hermes/React Native (no full ICU collation data bundled) — it silently
// falls back to something close to raw code-point order, which is why
// "B" sorted before "A" and Arabic names came out in no real dictionary
// order. This compares Arabic text against the actual Arabic alphabet
// sequence and Latin text case-insensitively by code point (which *is*
// correct without ICU), with Arabic-scripted labels grouped before Latin
// ones — natural for an Arabic-first brand list where most entries only
// have an English name.
const ARABIC_ORDER = 'اأإآبتثجحخدذرزسشصضطظعغفقكلمنهوىي';
function arabicRank(ch: string): number {
  const norm = ch === 'ة' ? 'ه' : ch;
  return ARABIC_ORDER.indexOf(norm);
}
function isArabic(ch: string): boolean {
  return ch >= '؀' && ch <= 'ۿ';
}
function compareLabels(a: string, b: string): number {
  const A = a.trim();
  const B = b.trim();
  const len = Math.max(A.length, B.length);
  for (let i = 0; i < len; i++) {
    const ca = A[i];
    const cb = B[i];
    if (ca === undefined) return -1;
    if (cb === undefined) return 1;
    if (ca === cb) continue;
    const aAr = isArabic(ca);
    const bAr = isArabic(cb);
    if (aAr && bAr) {
      const ra = arabicRank(ca);
      const rb = arabicRank(cb);
      if (ra !== rb) return ra - rb;
      return ca < cb ? -1 : 1;
    }
    if (aAr !== bAr) return aAr ? -1 : 1;
    const la = ca.toLowerCase();
    const lb = cb.toLowerCase();
    if (la !== lb) return la < lb ? -1 : 1;
    return ca < cb ? -1 : 1;
  }
  return 0;
}

function BrandTile({ name, ar, image, color }: { name: string; ar: string; image?: string; color?: string }) {
  const [failed, setFailed] = useState(false);
  const hasImage = !!image && !failed;
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View className="w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <View className="mb-2 h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
        {hasImage ? (
          <Image source={{ uri: image }} className="h-full w-full" resizeMode="contain" onError={() => setFailed(true)} />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: (color || '#64748B') + '1A' }}>
            <Text className="text-sm font-extrabold tracking-tight" style={{ color: color || '#334155' }}>
              {initials}
            </Text>
          </View>
        )}
      </View>
      <Text numberOfLines={2} className="text-center text-[11px] font-bold leading-tight text-slate-700">
        {ar}
      </Text>
    </View>
  );
}

export default function BrandsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = !term
      ? BRANDS
      : BRANDS.filter((b) => b.name.toLowerCase().includes(term) || (b.ar && b.ar.toLowerCase().includes(term)));
    return [...list].sort((a, b) => compareLabels(ar ? a.ar : a.name, ar ? b.ar : b.name));
  }, [q, ar]);

  // Grouped by first letter so a new letter always starts its own row —
  // the header makes it obvious where each letter begins while scrolling
  // or after a search, instead of the next letter's brands quietly
  // continuing on the same row as the previous letter's leftovers.
  //
  // Rows (not individual brands) are the SectionList's items: RN's Image
  // mounts and starts fetching the moment it's rendered, with no
  // visibility check, so a plain ScrollView.map over ~400 brands fires
  // ~400 concurrent image loads on mount. Chunking into rows of 3 and
  // handing them to SectionList gives real virtualization — only rows
  // near the viewport ever mount, so only their images load.
  const sections = useMemo(() => {
    const groups: { letter: string; items: Brand[] }[] = [];
    for (const b of filtered) {
      const label = (ar ? b.ar : b.name).trim();
      const letter = (label.charAt(0) || '#').toUpperCase();
      const last = groups[groups.length - 1];
      if (last && last.letter === letter) last.items.push(b);
      else groups.push({ letter, items: [b] });
    }
    return groups.map((g) => {
      const rows: Brand[][] = [];
      for (let i = 0; i < g.items.length; i += 3) rows.push(g.items.slice(i, i + 3));
      return { title: g.letter, data: rows };
    });
  }, [filtered, ar]);

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'البراندات' : 'Brands'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {filtered.length} {ar ? 'علامة تجارية' : 'brands'}
      </Text>

      <Input
        value={q}
        onChangeText={setQ}
        placeholder={ar ? 'ابحث عن علامة تجارية…' : 'Search a brand…'}
        leftIcon={<Search size={16} color="#94A3B8" />}
        className="mt-3"
      />

      <SectionList
        className="mt-4 flex-1"
        showsVerticalScrollIndicator={false}
        sections={sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(row, index) => (row.length ? row.map((b) => b.id).join('-') : `row-${index}`)}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews
        contentContainerStyle={{ paddingBottom: 24 }}
        renderSectionHeader={({ section }) => (
          <Text className="mb-2 mt-3 text-[11px] font-extrabold text-slate-400">{section.title}</Text>
        )}
        renderItem={({ item: row }) => (
          // Pad a short last row with invisible tiles so `justify-between`
          // doesn't stretch a 1- or 2-item row into an ugly wide gap.
          <View className="mb-3 flex-row flex-wrap justify-between gap-y-3">
            {row.map((b) => (
              <Pressable
                key={b.id}
                onPress={() => router.push({ pathname: '/brand/[brandId]', params: { brandId: b.id } })}
                className="w-[31%]"
              >
                <BrandTile name={b.name} ar={ar ? b.ar : b.name} image={b.image} color={b.color} />
              </Pressable>
            ))}
            {Array.from({ length: (3 - (row.length % 3)) % 3 }).map((_, i) => (
              <View key={`filler-${i}`} className="w-[31%]" />
            ))}
          </View>
        )}
      />
    </Screen>
  );
}
