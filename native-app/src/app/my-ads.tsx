import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Megaphone, Send, Trash2, X } from 'lucide-react-native';

import { Screen, Button, Input, Text } from '@/components/ui';
import { useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import {
  useMyAds,
  useSubmitAd,
  useDeleteAd,
  uploadAdImage,
  removeAdImage,
  checkAdImageSafety,
  MAX_AD_IMAGES,
  type Ad,
} from '@/lib/adsStore';
import { useSignedImageUrls } from '@/lib/products';

// The support/admin WhatsApp Business number, per the app owner. Every
// newly-submitted ad routes here — the actual approval always happens from
// the admin panel, this is only how the two of them get in touch to sort out
// duration/payment (see plan discussion; nothing about either is automated).
const ADS_WHATSAPP_NUMBER = '9647503581161';

const STATUS_TONE: Record<Ad['status'], string> = {
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

function statusLabel(status: Ad['status'], ar: boolean): string {
  switch (status) {
    case 'active':
      return ar ? 'نشط' : 'Active';
    case 'rejected':
      return ar ? 'مرفوض' : 'Rejected';
    default:
      return ar ? 'قيد المراجعة' : 'Pending review';
  }
}

function whatsappLink(accountName: string, title: string): string {
  const text = encodeURIComponent(
    `مرحباً، أرسلت للتو إعلاناً جديداً على DentalHub.\nالحساب: ${accountName}\nعنوان الإعلان: ${title}`,
  );
  return `https://wa.me/${ADS_WHATSAPP_NUMBER}?text=${text}`;
}

function AdCard({ ad, ar, onDelete }: { ad: Ad; ar: boolean; onDelete: () => void }) {
  const { data: urlMap = {} } = useSignedImageUrls(ad.images);
  const thumb = ad.images[0] ? urlMap[ad.images[0]] : undefined;
  return (
    <View className="mt-3 flex-row items-start gap-3 rounded-2xl border border-slate-200 bg-card p-3.5 shadow-sm">
      {thumb ? (
        <Image source={{ uri: thumb }} className="h-16 w-16 rounded-xl bg-slate-100" />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
          <Megaphone size={20} color="#CBD5E1" />
        </View>
      )}
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-sm font-bold text-slate-800">{ad.title}</Text>
        <Text numberOfLines={2} className="mt-0.5 text-xs text-slate-500">{ad.description}</Text>
        <View className="mt-2 flex-row items-center gap-2">
          <View className={cn('rounded-full px-2.5 py-1', STATUS_TONE[ad.status])}>
            <Text className="text-[10px] font-bold">{statusLabel(ad.status, ar)}</Text>
          </View>
          {ad.status === 'rejected' && !!ad.rejectReason && (
            <Text numberOfLines={1} className="flex-1 text-[10px] text-rose-500">{ad.rejectReason}</Text>
          )}
        </View>
      </View>
      <Pressable onPress={onDelete} className="h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
        <Trash2 size={14} color="#F43F5E" />
      </Pressable>
    </View>
  );
}

export default function MyAdsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, role } = useUserRole();
  const accountId = user?.uid ?? '';
  const accountName = [role?.name, role?.surname].filter(Boolean).join(' ').trim() || (user?.email ?? '');
  const accountType = role?.accountType ?? 'dentist';

  const { data: myAds = [] } = useMyAds(accountId);
  const submitAd = useSubmitAd();
  const deleteAd = useDeleteAd();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const { data: draftUrlMap = {} } = useSignedImageUrls(images);
  const [uploading, setUploading] = useState(false);

  // Pre-fill from the profile once it loads, but stays editable — this is
  // the number shown to anyone viewing the ad, so it must never be silently
  // blank just because the profile itself never had one saved.
  useEffect(() => {
    if (role?.phone) setContactPhone((prev) => prev || role.phone || '');
  }, [role?.phone]);

  // Driven by the account's actual pending ads (not local state that resets
  // the moment you leave this screen) — the WhatsApp CTA should stay put for
  // as long as there's really something awaiting review.
  const pendingAds = myAds.filter((a) => a.status === 'pending');

  const pickImage = async () => {
    if (images.length >= MAX_AD_IMAGES) {
      toast.error(ar ? `الحد الأقصى ${MAX_AD_IMAGES} صور` : `Max ${MAX_AD_IMAGES} images`);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    setUploading(true);
    let path: string | null = null;
    try {
      path = await uploadAdImage(accountId, {
        uri: asset.uri,
        name: asset.fileName ?? undefined,
        type: asset.mimeType ?? undefined,
      });
      const safety = await checkAdImageSafety(path);
      if (!safety.safe) {
        toast.error(ar ? 'الصورة غير مناسبة ولا يمكن استخدامها' : 'This image is not allowed');
        path = null;
        return;
      }
      setImages((prev) => [...prev, path as string]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (ar ? 'فشل رفع الصورة' : 'Upload failed'));
      if (path) await removeAdImage(path).catch(() => {});
    } finally {
      setUploading(false);
    }
  };

  const removeDraftImage = async (path: string) => {
    setImages((prev) => prev.filter((p) => p !== path));
    await removeAdImage(path);
  };

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error(ar ? 'أدخل عنوان ووصف الإعلان' : 'Enter a title and description');
      return;
    }
    if (!contactPhone.trim()) {
      toast.error(ar ? 'أدخل رقم تواصل يظهر مع الإعلان' : 'Enter a contact number to show on the ad');
      return;
    }
    if (images.length === 0) {
      toast.error(ar ? 'أضف صورة واحدة على الأقل' : 'Add at least one image');
      return;
    }
    try {
      await submitAd.mutateAsync({
        accountId,
        accountType,
        accountName,
        accountPhoto: role?.photoURL || undefined,
        contactPhone: contactPhone.trim(),
        title: title.trim(),
        description: description.trim(),
        images,
      });
      setTitle('');
      setDescription('');
      setImages([]);
      toast.success(ar ? 'تم إرسال إعلانك للمراجعة' : 'Your ad was sent for review');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : (ar ? 'فشل الإرسال' : 'Failed to submit'));
    }
  };

  return (
    <Screen>
      <View className="flex-row items-center gap-3 rounded-3xl p-4" style={{ backgroundColor: '#0052FF' }}>
        <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
          <Megaphone size={22} color="#FFFFFF" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-extrabold text-white">{ar ? 'إعلاناتي' : 'My Ads'}</Text>
          <Text className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {ar ? 'أطلق إعلانك وصل للآلاف من الأطباء والعيادات' : 'Launch your ad and reach thousands of dentists and clinics'}
          </Text>
        </View>
      </View>

      {pendingAds.length > 0 && (
        <View className="mt-3 gap-2 rounded-2xl border border-sky-200 bg-sky-50 p-3.5">
          <Text className="text-xs font-bold text-sky-800">
            {ar
              ? `لديك ${pendingAds.length} إعلان قيد المراجعة، تواصل معنا على واتساب لتسريعها`
              : `You have ${pendingAds.length} ad(s) pending review — reach out on WhatsApp to speed it up`}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(whatsappLink(accountName, pendingAds[0].title))}
            className="h-10 flex-row items-center justify-center gap-2 self-start rounded-full bg-emerald-600 px-4"
          >
            <Send size={14} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">{ar ? 'تواصل على واتساب' : 'Contact on WhatsApp'}</Text>
          </Pressable>
        </View>
      )}

      <View className="mt-5 gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
        <Text className="text-sm font-extrabold text-slate-800">{ar ? 'إعلان جديد' : 'New ad'}</Text>
        <Input value={title} onChangeText={setTitle} placeholder={ar ? 'عنوان الإعلان' : 'Ad title'} />
        <Input
          value={description}
          onChangeText={setDescription}
          placeholder={ar ? 'وصف الإعلان' : 'Ad description'}
          multiline
          numberOfLines={3}
        />
        <Input
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder={ar ? 'رقم التواصل الظاهر مع الإعلان' : 'Contact number shown on the ad'}
          keyboardType="phone-pad"
          style={{ writingDirection: 'ltr', textAlign: 'left' }}
        />

        <View className="flex-row flex-wrap gap-2">
          {images.map((path) => (
            <Pressable key={path} onPress={() => removeDraftImage(path)} className="relative">
              {draftUrlMap[path] ? (
                <Image source={{ uri: draftUrlMap[path] }} className="h-16 w-16 rounded-xl bg-slate-100" />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-xl bg-slate-100" />
              )}
              <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-rose-500">
                <X size={11} color="#FFFFFF" />
              </View>
            </Pressable>
          ))}
          {images.length < MAX_AD_IMAGES && (
            <Button size="sm" variant="outline" title={ar ? '+ صورة' : '+ Image'} loading={uploading} onPress={pickImage} />
          )}
        </View>
        <Text className="text-[10px] text-slate-400">
          {ar ? `حتى ${MAX_AD_IMAGES} صور` : `Up to ${MAX_AD_IMAGES} images`}
        </Text>

        <Button title={ar ? 'إرسال للمراجعة' : 'Send for review'} loading={submitAd.isPending} onPress={submit} />
      </View>

      {myAds.length > 0 && (
        <View className="mt-5">
          <Text className="text-sm font-bold text-slate-600">{ar ? 'إعلاناتك' : 'Your ads'} ({myAds.length})</Text>
          <ScrollView>
            {myAds.map((ad) => (
              <AdCard key={ad.id} ad={ad} ar={ar} onDelete={() => deleteAd.mutate(ad)} />
            ))}
          </ScrollView>
        </View>
      )}
    </Screen>
  );
}
