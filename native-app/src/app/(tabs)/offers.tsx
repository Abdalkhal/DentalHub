import { useMemo, useState } from 'react';
import { Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Button, Input, Screen, Text } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { useAllOffers } from '@/lib/offers';
import { randomUUID } from '@/lib/randomId';

type Classified = {
  id: string;
  category: string;
  title: string;
  location: string;
  publisher: string;
  phone: string;
  price: number;
  currency: 'USD' | 'IQD';
  images: string[];
  description?: string;
};

const CLASSIFIED_CATS = [
  { id: 'all', ar: 'الكل', en: 'All' },
  { id: 'clinic', ar: 'عيادات وإيجار', en: 'Clinics & Rent' },
  { id: 'courses', ar: 'دورات وورش عمل', en: 'Courses & Workshops' },
  { id: 'used', ar: 'أجهزة مستعملة', en: 'Used Equipment' },
  { id: 'jobs', ar: 'فرص عمل', en: 'Job Openings' },
];

function loadClassifieds(): Classified[] {
  try {
    return JSON.parse(localStorage.getItem('dh_classifieds') || '[]');
  } catch {
    return [];
  }
}
function saveClassifieds(d: Classified[]) {
  localStorage.setItem('dh_classifieds', JSON.stringify(d));
}

function fmtPrice(n: number, c: string) {
  return c === 'IQD' ? `${n.toLocaleString()} د.ع` : `$${n.toFixed(2)}`;
}

export default function OffersScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [tab, setTab] = useState<'products' | 'classifieds'>('products');
  const [cat, setCat] = useState('all');
  const [classifieds, setClassifieds] = useState<Classified[]>(loadClassifieds);
  const [showForm, setShowForm] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Classified | null>(null);
  const { data: allOffers = [], isLoading } = useAllOffers();
  const realOffers = useMemo(
    () => allOffers.filter((o) => !o.status || o.status === 'active'),
    [allOffers],
  );

  const filtered = useMemo(
    () => (cat === 'all' ? classifieds : classifieds.filter((c) => c.category === cat)),
    [classifieds, cat],
  );

  return (
    <Screen>
      <View className="mb-4 flex-row gap-1.5">
        <Pressable
          onPress={() => setTab('products')}
          className={cn(
            'h-10 flex-1 items-center justify-center rounded-xl border-2',
            tab === 'products' ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
          )}
        >
          <Text
            className={cn(
              'text-xs font-bold',
              tab === 'products' ? 'text-primary-foreground' : 'text-slate-600',
            )}
          >
            {ar ? 'عروض المنتجات والخصومات' : 'Product Offers & Discounts'}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('classifieds')}
          className={cn(
            'h-10 flex-1 items-center justify-center rounded-xl border-2',
            tab === 'classifieds' ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
          )}
        >
          <Text
            className={cn(
              'text-xs font-bold',
              tab === 'classifieds' ? 'text-primary-foreground' : 'text-slate-600',
            )}
          >
            {ar ? 'الإعلانات والفرص المهنية' : 'Classifieds & Opportunities'}
          </Text>
        </Pressable>
      </View>

      {tab === 'products' ? (
        isLoading ? (
          <Text className="py-12 text-center text-primary">
            {ar ? 'جاري التحميل...' : 'Loading...'}
          </Text>
        ) : realOffers.length === 0 ? (
          <View className="items-center py-16">
            <Text className="mb-3 text-5xl opacity-30">📣</Text>
            <Text className="font-semibold text-slate-500">
              {ar ? 'لا توجد عروض أو خصومات متاحة حالياً' : 'No offers available yet'}
            </Text>
            <Text className="mt-1 text-[11px] text-slate-400">
              {ar ? 'ستظهر هنا عروض المكاتب والمختبرات' : 'Offers from suppliers will appear here'}
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {realOffers.map((o) => (
              <View key={o.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <Text className="text-sm font-bold text-slate-800">{o.title}</Text>
                {o.description ? (
                  <Text numberOfLines={2} className="mt-1 text-[11px] text-slate-500">
                    {o.description}
                  </Text>
                ) : null}
                {o.price != null ? (
                  <Text className="mt-1.5 text-sm font-extrabold text-primary">
                    {fmtPrice(o.price, o.currency || 'USD')}
                  </Text>
                ) : null}
                {o.expiryDate ? (
                  <Text className="mt-1 text-[10px] text-slate-400">
                    {ar ? 'ينتهي' : 'Expires'}: {o.expiryDate}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-1.5 pb-2">
              {CLASSIFIED_CATS.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setCat(c.id)}
                  className={cn(
                    'h-8 items-center justify-center rounded-full border px-3',
                    cat === c.id ? 'border-primary bg-primary' : 'border-slate-200 bg-white',
                  )}
                >
                  <Text
                    className={cn(
                      'text-[11px] font-bold',
                      cat === c.id ? 'text-primary-foreground' : 'text-slate-600',
                    )}
                  >
                    {ar ? c.ar : c.en}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Button
            title={ar ? 'إضافة إعلان / فرصة' : 'Add Ad / Opportunity'}
            onPress={() => setShowForm(true)}
            className="mb-3"
          />

          {filtered.length === 0 ? (
            <View className="items-center py-12">
              <Text className="mb-3 text-4xl opacity-30">💼</Text>
              <Text className="font-semibold text-slate-500">
                {ar ? 'لا توجد إعلانات' : 'No classifieds yet'}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {filtered.map((ad) => (
                <Pressable
                  key={ad.id}
                  onPress={() => setSelectedAd(ad)}
                  className="flex-row items-stretch gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                >
                  <View className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {ad.images[0] ? (
                      <Image source={{ uri: ad.images[0] }} className="h-full w-full" />
                    ) : (
                      <View className="h-full w-full items-center justify-center">
                        <Text className="text-2xl text-slate-300">📣</Text>
                      </View>
                    )}
                    {ad.images.length > 1 && (
                      <View className="absolute left-1.5 top-1.5 rounded-md bg-black/60 px-1.5 py-0.5">
                        <Text className="text-[10px] font-bold text-white">1/{ad.images.length}</Text>
                      </View>
                    )}
                  </View>
                  <View className="min-w-0 flex-1 flex-col">
                    <Text numberOfLines={2} className="text-sm font-bold text-slate-800">
                      {ad.title}
                    </Text>
                    <View className="mt-1 flex-row flex-wrap items-center gap-3">
                      <Text className="text-[11px] text-slate-500">📍 {ad.location}</Text>
                      <Text className="text-[11px] text-slate-500">👤 {ad.publisher}</Text>
                    </View>
                    <View className="flex-1 justify-end pt-1.5">
                      <Text className="text-sm font-extrabold text-primary">
                        {fmtPrice(ad.price, ad.currency)}
                      </Text>
                    </View>
                  </View>
                  <Text className="self-center text-lg text-slate-300">›</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      {showForm && (
        <ClassifiedModal
          ar={ar}
          onClose={() => setShowForm(false)}
          onAdd={(ad) => {
            setClassifieds((prev) => {
              const updated = [ad, ...prev];
              saveClassifieds(updated);
              return updated;
            });
            setShowForm(false);
            toast.success(ar ? 'تم نشر الإعلان' : 'Ad published');
          }}
        />
      )}

      {selectedAd && <AdDetailsModal ar={ar} ad={selectedAd} onClose={() => setSelectedAd(null)} />}
    </Screen>
  );
}

function AdDetailsModal({
  ar,
  ad,
  onClose,
}: {
  ar: boolean;
  ad: Classified;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const images = ad.images.length > 0 ? ad.images : [];
  const current = images[idx] ?? null;

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[92%] flex-col overflow-hidden rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-3">
            <Text numberOfLines={1} className="flex-1 text-base font-bold text-slate-800">
              {ar ? 'تفاصيل الإعلان' : 'Ad Details'}: {ad.title}
            </Text>
            <Pressable
              onPress={onClose}
              className="ml-2 h-9 w-9 items-center justify-center rounded-xl bg-slate-100"
            >
              <Text className="text-slate-500">✕</Text>
            </Pressable>
          </View>

          <ScrollView>
            <View className="bg-slate-900">
              <View className="relative aspect-square items-center justify-center bg-slate-900">
                {current ? (
                  <Image source={{ uri: current }} className="h-full w-full" resizeMode="contain" />
                ) : (
                  <View className="items-center">
                    <Text className="mb-2 text-4xl opacity-40">📣</Text>
                    <Text className="text-xs text-slate-500">{ar ? 'لا توجد صور' : 'No images'}</Text>
                  </View>
                )}
                {images.length > 1 && (
                  <>
                    <Pressable
                      onPress={prev}
                      className="absolute left-2 top-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/50"
                    >
                      <Text className="text-lg text-white">‹</Text>
                    </Pressable>
                    <Pressable
                      onPress={next}
                      className="absolute right-2 top-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/50"
                    >
                      <Text className="text-lg text-white">›</Text>
                    </Pressable>
                    <View className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5">
                      <Text className="text-[11px] font-bold text-white">
                        {idx + 1}/{images.length}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {images.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-3">
                  <View className="flex-row gap-2">
                    {images.map((img, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setIdx(i)}
                        className={cn(
                          'h-14 w-14 overflow-hidden rounded-lg border-2',
                          i === idx ? 'border-sky-400' : 'border-transparent opacity-60',
                        )}
                      >
                        <Image source={{ uri: img }} className="h-full w-full" />
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            <View className="flex-col gap-4 p-5">
              <View>
                <Text className="text-lg font-bold leading-snug text-slate-900">{ad.title}</Text>
                <View className="mt-2 flex-row flex-wrap items-center gap-3">
                  <Text className="text-xs text-slate-500">📍 {ad.location || '-'}</Text>
                  <Text className="text-xs text-slate-500">👤 {ad.publisher}</Text>
                </View>
              </View>

              <View className="self-start rounded-full bg-emerald-50 px-3 py-1">
                <Text className="text-sm font-extrabold text-emerald-700">
                  {fmtPrice(ad.price, ad.currency)}
                </Text>
              </View>

              {ad.description ? (
                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {ar ? 'وصف تفصيلي' : 'Detailed Description'}
                  </Text>
                  <Text className="text-sm leading-relaxed text-slate-600">{ad.description}</Text>
                </View>
              ) : null}

              <View>
                <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {ar ? 'الفئة' : 'Category'}
                </Text>
                <View className="self-start rounded-full bg-sky-50 px-2.5 py-1">
                  <Text className="text-[11px] font-bold text-sky-700">
                    {CLASSIFIED_CATS.find((c) => c.id === ad.category)?.ar ?? ad.category}
                  </Text>
                </View>
              </View>

              <View className="mt-auto flex-row gap-2 border-t border-slate-100 pt-3">
                <Pressable
                  onPress={() => toast.success(ar ? 'تم إرسال طلب الاستفسار' : 'Inquiry request sent')}
                  className="h-11 flex-1 items-center justify-center rounded-xl bg-primary"
                >
                  <Text className="text-[11px] font-bold text-primary-foreground">
                    {ar ? 'إرسال طلب استفسار' : 'Send Inquiry'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => ad.phone && Linking.openURL(`tel:${ad.phone}`)}
                  className="h-11 flex-1 items-center justify-center rounded-xl bg-sky-100"
                >
                  <Text className="text-[11px] font-bold text-sky-700">
                    {ar ? 'اتصال' : 'Call'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    ad.phone && Linking.openURL(`https://wa.me/${ad.phone.replace(/\D/g, '')}`)
                  }
                  className="h-11 flex-1 items-center justify-center rounded-xl bg-emerald-500"
                >
                  <Text className="text-[11px] font-bold text-white">
                    {ar ? 'واتساب' : 'WhatsApp'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ClassifiedModal({
  ar,
  onClose,
  onAdd,
}: {
  ar: boolean;
  onClose: () => void;
  onAdd: (ad: Classified) => void;
}) {
  const [f, setF] = useState({
    title: '',
    location: '',
    publisher: '',
    phone: '',
    price: '',
    currency: 'USD' as 'USD' | 'IQD',
    category: 'clinic',
    images: [] as string[],
    description: '',
  });
  const [error, setError] = useState('');

  const pickImages = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        base64: true,
        quality: 0.6,
        selectionLimit: 4 - f.images.length,
      });
      if (res.canceled || !res.assets?.length) return;
      const newImages = res.assets
        .filter((a) => a.base64)
        .map((a) => `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}`);
      setF((d) => ({ ...d, images: [...d.images, ...newImages].slice(0, 4) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const submit = () => {
    if (!f.title.trim() || !f.publisher.trim()) {
      setError(ar ? 'املأ الحقول المطلوبة' : 'Fill required fields');
      return;
    }
    onAdd({
      id: randomUUID(),
      title: f.title.trim(),
      location: f.location.trim(),
      publisher: f.publisher.trim(),
      phone: f.phone.trim(),
      price: Number(f.price) || 0,
      currency: f.currency,
      category: f.category,
      images: f.images,
      description: f.description.trim(),
    });
  };

  return (
    <Modal visible transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <ScrollView
          className="max-h-[88%] rounded-t-3xl bg-white p-5 pb-8"
          contentContainerClassName="gap-3"
        >
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold">{ar ? 'إضافة إعلان / فرصة' : 'Add Ad / Opportunity'}</Text>
            <Pressable
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-xl bg-slate-100"
            >
              <Text className="text-slate-500">✕</Text>
            </Pressable>
          </View>

          <View className="flex-row flex-wrap gap-1.5">
            {CLASSIFIED_CATS.filter((c) => c.id !== 'all').map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setF({ ...f, category: c.id })}
                className={cn(
                  'h-8 items-center justify-center rounded-full border px-3',
                  f.category === c.id ? 'border-primary bg-primary' : 'border-slate-200 bg-slate-50',
                )}
              >
                <Text
                  className={cn(
                    'text-[11px] font-bold',
                    f.category === c.id ? 'text-primary-foreground' : 'text-slate-600',
                  )}
                >
                  {ar ? c.ar : c.en}
                </Text>
              </Pressable>
            ))}
          </View>

          <Input
            value={f.title}
            onChangeText={(t) => setF({ ...f, title: t })}
            placeholder={ar ? 'العنوان' : 'Title'}
          />
          <Input
            value={f.location}
            onChangeText={(t) => setF({ ...f, location: t })}
            placeholder={ar ? 'الموقع' : 'Location'}
          />
          <View className="flex-row gap-3">
            <Input
              value={f.publisher}
              onChangeText={(t) => setF({ ...f, publisher: t })}
              placeholder={ar ? 'اسم الناشر' : 'Publisher'}
              className="flex-1"
            />
            <Input
              value={f.phone}
              onChangeText={(t) => setF({ ...f, phone: t })}
              placeholder={ar ? 'رقم الهاتف' : 'Phone'}
              keyboardType="phone-pad"
              className="flex-1"
            />
          </View>

          <View>
            <Text className="mb-1 text-xs font-bold text-slate-500">
              {ar ? 'السعر' : 'Price'}
            </Text>
            <View className="flex-row gap-2">
              <Input
                value={f.price}
                onChangeText={(t) => setF({ ...f, price: t })}
                placeholder="0"
                keyboardType="numeric"
                className="flex-1"
              />
              <View className="flex-row gap-1.5">
                <Button
                  size="sm"
                  variant={f.currency === 'USD' ? 'primary' : 'outline'}
                  title="$"
                  onPress={() => setF({ ...f, currency: 'USD' })}
                />
                <Button
                  size="sm"
                  variant={f.currency === 'IQD' ? 'primary' : 'outline'}
                  title={ar ? 'د.ع' : 'IQD'}
                  onPress={() => setF({ ...f, currency: 'IQD' })}
                />
              </View>
            </View>
          </View>

          <Input
            value={f.description}
            onChangeText={(t) => setF({ ...f, description: t })}
            placeholder={ar ? 'تفاصيل إضافية، مواصفات، مساحة، معدات...' : 'Extra details, specs, area, equipment...'}
            multiline
          />

          <View>
            <Text className="mb-1 text-xs font-bold text-slate-500">
              {ar ? 'الصور' : 'Images'} ({f.images.length}/4)
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {f.images.map((uri, i) => (
                <View key={i} className="relative h-16 w-16 overflow-hidden rounded-xl border bg-slate-50">
                  <Image source={{ uri }} className="h-full w-full" />
                  <Pressable
                    onPress={() => setF({ ...f, images: f.images.filter((_, j) => j !== i) })}
                    className="absolute right-0.5 top-0.5 h-5 w-5 items-center justify-center rounded-full bg-black/50"
                  >
                    <Text className="text-[10px] text-white">✕</Text>
                  </Pressable>
                </View>
              ))}
              {f.images.length < 4 && (
                <Pressable
                  onPress={pickImages}
                  className="h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50"
                >
                  <Text className="text-slate-400">⬆️</Text>
                </Pressable>
              )}
            </View>
          </View>

          {!!error && (
            <Text className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
              {error}
            </Text>
          )}

          <Button title={ar ? 'نشر الإعلان' : 'Publish Ad'} onPress={submit} />
        </ScrollView>
      </View>
    </Modal>
  );
}
