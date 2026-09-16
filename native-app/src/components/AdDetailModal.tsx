import { useRef, useState } from 'react';
import { Image, Linking, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Megaphone, Phone, Send, User, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useSignedImageUrls } from '@/lib/products';
import type { Ad } from '@/lib/adsStore';
import { cn } from '@/lib/utils';

// Same shape as the "classifieds" ad-detail modal in (tabs)/offers.tsx —
// image carousel + thumbnails, then title/publisher/description, then a
// Call + WhatsApp row using the ad's own contact number, matching how a
// modern marketplace app opens an ad.

export function AdDetailModal({ ad, ar, onClose }: { ad: Ad; ar: boolean; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { data: urlMap = {} } = useSignedImageUrls(ad.images);
  const images = ad.images.map((p) => urlMap[p]).filter((u): u is string => !!u);
  const digits = ad.contactPhone.replace(/\D/g, '');

  const goTo = (i: number) => {
    setIdx(i);
    scrollRef.current?.scrollTo({ x: i * carouselWidth, animated: true });
  };
  const prev = () => goTo((idx - 1 + images.length) % images.length);
  const next = () => goTo((idx + 1) % images.length);

  // Swiping updates `idx` too, so the thumbnail row and arrows stay in sync
  // with wherever the user actually dragged to.
  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!carouselWidth) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / carouselWidth);
    setIdx(Math.max(0, Math.min(images.length - 1, i)));
  };

  const openProfile = () => {
    onClose();
    router.push({ pathname: '/profile/[accountId]', params: { accountId: ad.accountId } });
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <View className="max-h-[92%] flex-col overflow-hidden rounded-t-3xl bg-white">
          <View className="flex-row items-center justify-between border-b border-slate-100 px-5 py-3">
            <Text numberOfLines={1} className="flex-1 text-base font-bold text-slate-800">
              {ar ? 'تفاصيل الإعلان' : 'Ad Details'}
            </Text>
            <Pressable onPress={onClose} className="ms-2 h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <X size={16} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView>
            <View className="bg-slate-900">
              <View
                className="relative aspect-square bg-slate-900"
                onLayout={(e) => setCarouselWidth(e.nativeEvent.layout.width)}
              >
                {images.length > 0 ? (
                  <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={onScrollEnd}
                  >
                    {images.map((img) => (
                      <View key={img} style={{ width: carouselWidth, height: carouselWidth }} className="items-center justify-center">
                        <Image source={{ uri: img }} className="h-full w-full" resizeMode="contain" />
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <View
                    className="items-center justify-center"
                    style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}
                  >
                    <Megaphone size={40} color="#64748B" />
                    <Text className="mt-2 text-xs text-slate-500">{ar ? 'لا توجد صور' : 'No images'}</Text>
                  </View>
                )}
                {images.length > 1 && (
                  <>
                    <Pressable onPress={prev} className="absolute left-2 top-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/50">
                      <Text className="text-lg text-white">‹</Text>
                    </Pressable>
                    <Pressable onPress={next} className="absolute right-2 top-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/50">
                      <Text className="text-lg text-white">›</Text>
                    </Pressable>
                    <View className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5">
                      <Text className="text-[11px] font-bold text-white">{idx + 1}/{images.length}</Text>
                    </View>
                  </>
                )}
              </View>

              {images.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-3">
                  <View className="flex-row gap-2">
                    {images.map((img, i) => (
                      <Pressable
                        key={img}
                        onPress={() => goTo(i)}
                        className={cn('h-14 w-14 overflow-hidden rounded-lg border-2', i === idx ? 'border-sky-400' : 'border-transparent opacity-60')}
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
                <Pressable onPress={openProfile} className="mt-3 flex-row items-center gap-2.5 self-start">
                  {ad.accountPhoto ? (
                    <Image source={{ uri: ad.accountPhoto }} className="h-12 w-12 rounded-full bg-slate-100" />
                  ) : (
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <User size={22} color="#94A3B8" />
                    </View>
                  )}
                  <View>
                    <Text className="text-sm font-bold text-slate-800">{ad.accountName}</Text>
                    <Text className="text-[11px] font-semibold text-primary">
                      {ar ? 'عرض الحساب ›' : 'View account ›'}
                    </Text>
                  </View>
                </Pressable>
              </View>

              {!!ad.description && (
                <View>
                  <Text className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {ar ? 'وصف تفصيلي' : 'Detailed Description'}
                  </Text>
                  <Text className="text-sm leading-relaxed text-slate-600">{ad.description}</Text>
                </View>
              )}

              <View className="mt-2 flex-row gap-2 border-t border-slate-100 pt-3">
                {digits ? (
                  <>
                    <Pressable
                      onPress={() => Linking.openURL(`tel:${digits}`)}
                      className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-sky-100"
                    >
                      <Phone size={14} color="#0369A1" />
                      <Text className="text-[11px] font-bold text-sky-700">{ar ? 'اتصال' : 'Call'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => Linking.openURL(`https://wa.me/${digits}`)}
                      className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-500"
                    >
                      <Send size={14} color="#FFFFFF" />
                      <Text className="text-[11px] font-bold text-white">{ar ? 'واتساب' : 'WhatsApp'}</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text className="text-xs text-slate-400">{ar ? 'لا يوجد رقم تواصل لهذا الإعلان' : 'No contact number on this ad'}</Text>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
