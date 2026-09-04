import { useMemo, useState } from 'react';
import { Image, Linking, Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { Layers, MapPin, MessageCircle, Phone } from 'lucide-react-native';

import { Screen, Text, Spinner } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import {
  useSurgicalGuideCompanies,
  SURGICAL_GUIDE_SYSTEMS,
  SURGICAL_GUIDE_MATERIALS,
  type SurgicalGuideCompany,
} from '@/lib/surgicalGuides';
import { useSignedImageUrls } from '@/lib/products';
import { useI18n } from '@/lib/i18n';

function systemLabel(en: string, ar: boolean): string {
  const m = SURGICAL_GUIDE_SYSTEMS.find((x) => x.en === en);
  return ar && m ? m.ar : en;
}
function materialLabel(en: string, ar: boolean): string {
  const m = SURGICAL_GUIDE_MATERIALS.find((x) => x.en === en);
  return ar && m ? m.ar : en;
}

function Logo({ uri, name }: { uri?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (uri && !failed) {
    return (
      <View className="h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
        <Image source={{ uri }} className="h-full w-full" resizeMode="contain" onError={() => setFailed(true)} />
      </View>
    );
  }
  return (
    <View className="h-14 w-14 items-center justify-center rounded-2xl bg-sky-100">
      <Text className="text-lg font-extrabold text-sky-700">{name.charAt(0) || '؟'}</Text>
    </View>
  );
}

export default function SurgicalGuideScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { data: companies = [], isLoading } = useSurgicalGuideCompanies();

  const logoPaths = useMemo(
    () => companies.map((c) => c.logoUrl).filter((x): x is string => !!x),
    [companies],
  );
  const { data: urlMap = {} } = useSignedImageUrls(logoPaths);

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'الدليل الجراحي' : 'Surgical Guides'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {ar ? 'شركات القوالب الرقمية للزراعة' : 'Digital guide companies for implant placement'}
      </Text>

      {isLoading ? (
        <Spinner size="small" />
      ) : companies.length === 0 ? (
        <View className="items-center py-16">
          <Layers size={48} color="#CBD5E1" strokeWidth={1.4} />
          <Text className="mt-3 text-sm text-slate-400">
            {ar ? 'لا توجد شركات بعد' : 'No companies yet'}
          </Text>
        </View>
      ) : (
        <View className="mt-4 gap-3 pb-6">
          {companies.map((c) => (
            <View key={c.id} className="rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm">
              <View className="flex-row items-center gap-3">
                <Logo uri={c.logoUrl ? urlMap[c.logoUrl] : undefined} name={ar ? c.nameAr : c.nameEn} />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-extrabold text-slate-900">
                    {ar ? c.nameAr : c.nameEn}
                  </Text>
                  {!!c.description && (
                    <Text numberOfLines={2} className="mt-0.5 text-[11px] text-slate-500">
                      {c.description}
                    </Text>
                  )}
                </View>
              </View>

              {c.city ? (
                <View className="mt-2 flex-row items-center gap-1.5">
                  <MapPin size={12} color="#64748B" />
                  <Text className="text-xs text-slate-500">{c.city}</Text>
                </View>
              ) : null}

              {(c.systems?.length ?? 0) > 0 && (
                <View className="mt-2 flex-row flex-wrap gap-1">
                  {c.systems.slice(0, 4).map((s) => (
                    <View key={s} className="rounded-md bg-slate-100 px-1.5 py-0.5">
                      <Text className="text-[9px] text-slate-500">{systemLabel(s, ar)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {!!c.printingMaterial && (
                <Text className="mt-1.5 text-[10px] text-slate-500">
                  {ar ? 'المادة' : 'Material'}: {materialLabel(c.printingMaterial, ar)}
                </Text>
              )}

              {!!c.phone && (
                <View className="mt-3 flex-row gap-2 self-start">
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${c.phone}`)}
                    className="h-10 w-10 items-center justify-center rounded-xl bg-emerald-50"
                  >
                    <Phone size={17} color="#059669" />
                  </Pressable>
                  <Pressable
                    onPress={() => Linking.openURL(`https://wa.me/${c.phone.replace(/\D/g, '')}`)}
                    className="h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]"
                  >
                    <MessageCircle size={17} color="#FFFFFF" />
                  </Pressable>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </Screen>
  );
}
