import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, MessageCircle, Package, Phone, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useSignedImageUrls } from '@/lib/products';
import { SURGICAL_GUIDE_MATERIALS, SURGICAL_GUIDE_SYSTEMS, type SurgicalGuideCompany } from '@/lib/surgicalGuides';

// Same content as the web's surgical-guide directory sheet: tapping a company
// card in the app used to do nothing, so its systems, material and clinical
// gallery were only visible on the web.

function systemLabel(en: string, ar: boolean): string {
  const m = SURGICAL_GUIDE_SYSTEMS.find((x) => x.en === en);
  return ar && m ? m.ar : en;
}
function materialLabel(en: string, ar: boolean): string {
  const m = SURGICAL_GUIDE_MATERIALS.find((x) => x.en === en);
  return ar && m ? m.ar : en;
}

export function SurgicalGuideDetailsModal({
  company: c,
  logoUri,
  ar,
  onClose,
}: {
  company: SurgicalGuideCompany;
  logoUri?: string;
  ar: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [viewing, setViewing] = useState<string | null>(null);
  const galleryPaths = useMemo(() => (c.gallery ?? []).map((g) => g.url).filter(Boolean), [c.gallery]);
  const { data: galleryUrls = {} } = useSignedImageUrls(galleryPaths);

  const name = ar ? c.nameAr || c.nameEn : c.nameEn || c.nameAr;
  const altName = c.nameEn && c.nameAr ? (ar ? c.nameEn : c.nameAr) : '';

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="overflow-hidden rounded-t-3xl bg-white" style={{ maxHeight: '94%', paddingBottom: insets.bottom }}>
          <View className="flex-row items-center justify-between border-b border-slate-100 px-4 pb-3 pt-4">
            <Text className="text-base font-extrabold text-slate-900">
              {ar ? 'شركة الدليل الجراحي' : 'Surgical Guide Company'}
            </Text>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <X size={16} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="gap-4 p-4">
            <View className="flex-row items-center gap-4">
              <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                ) : (
                  <Package size={30} color="#CBD5E1" />
                )}
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={2} className="text-lg font-bold text-slate-900">
                  {name}
                </Text>
                {!!altName && (
                  <Text numberOfLines={1} className="text-[11px] text-slate-400">
                    {altName}
                  </Text>
                )}
                <View className="mt-1 flex-row flex-wrap items-center gap-2">
                  {!!c.city && (
                    <View className="flex-row items-center gap-1">
                      <MapPin size={12} color="#64748B" />
                      <Text className="text-[11px] text-slate-500">{c.city}</Text>
                    </View>
                  )}
                  {!!c.software && (
                    <View className="rounded-full bg-sky-50 px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-sky-700">{c.software}</Text>
                    </View>
                  )}
                </View>
                {!!c.phone && (
                  <View className="mt-1 flex-row items-center gap-1">
                    <Phone size={12} color="#64748B" />
                    <Text className="text-[11px] text-slate-500">{c.phone}</Text>
                  </View>
                )}
              </View>
            </View>

            {!!c.phone && (
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => Linking.openURL(`tel:${c.phone}`)}
                  className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-50"
                >
                  <Phone size={16} color="#047857" />
                  <Text className="text-xs font-bold text-emerald-700">{ar ? 'اتصال' : 'Call'}</Text>
                </Pressable>
                <Pressable
                  onPress={() => Linking.openURL(`https://wa.me/${c.phone.replace(/\D/g, '')}`)}
                  className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#25D366]"
                >
                  <MessageCircle size={16} color="#FFFFFF" />
                  <Text className="text-xs font-bold text-white">WhatsApp</Text>
                </Pressable>
              </View>
            )}

            {!!c.description && (
              <View className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <Text className="mb-1 text-[11px] font-bold text-slate-400">{ar ? 'نبذة عن الشركة' : 'About'}</Text>
                <Text className="text-[13px] leading-relaxed text-slate-700">{c.description}</Text>
              </View>
            )}

            {(c.systems?.length ?? 0) > 0 && (
              <View>
                <Text className="mb-2 text-sm font-bold text-slate-800">
                  {ar ? 'الأنظمة الجراحية المدعومة' : 'Supported Systems'}
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {c.systems.map((s) => (
                    <View key={s} className="rounded-full bg-emerald-50 px-2.5 py-1">
                      <Text className="text-[11px] font-bold text-emerald-700">{systemLabel(s, ar)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!!c.printingMaterial && (
              <View className="flex-row items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-3">
                <Text className="text-[11px] font-bold text-slate-400">{ar ? 'مادة الطباعة' : 'Printing Material'}</Text>
                <Text className="text-sm font-semibold text-slate-800">{materialLabel(c.printingMaterial, ar)}</Text>
              </View>
            )}

            {(c.gallery?.length ?? 0) > 0 && (
              <View>
                <Text className="mb-2 text-sm font-bold text-slate-800">
                  {ar ? 'معرض الحالات السريرية' : 'Clinical Work Gallery'}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {c.gallery.map((g, i) => {
                    const url = g.url ? galleryUrls[g.url] : undefined;
                    return (
                      <View key={i} style={{ width: '31.5%' }} className="gap-1">
                        <Pressable
                          disabled={!url}
                          onPress={() => url && setViewing(url)}
                          className="aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-100"
                        >
                          {url ? (
                            <Image source={{ uri: url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                          ) : (
                            <ActivityIndicator color="#CBD5E1" />
                          )}
                        </Pressable>
                        {!!g.caption && (
                          <Text numberOfLines={2} className="text-[10px] leading-tight text-slate-500">
                            {g.caption}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Full-screen photo */}
      {viewing && (
        <Pressable onPress={() => setViewing(null)} className="absolute inset-0 items-center justify-center bg-black/90">
          <Image source={{ uri: viewing }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />
          <View className="absolute right-4 h-10 w-10 items-center justify-center rounded-full bg-white/15" style={{ top: insets.top + 12 }}>
            <X size={20} color="#FFFFFF" />
          </View>
        </Pressable>
      )}
    </Modal>
  );
}
