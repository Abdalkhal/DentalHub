import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { Camera, Cloud, FileImage, Share2, Trash2, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import {
  MAX_PLAN_PHOTOS,
  addFile,
  newFileId,
  planPhotoTag,
  planPhotos,
  removeFile,
  type Patient,
  type PatientFile,
} from '@/lib/patientsStore';
import { patientFilePath } from '@/lib/dentistRecords';
import { uploadFileUri } from '@/lib/nativeUpload';
import { resolveCaseFileUri } from '@/lib/storagePipeline';
import { useSession } from '@/lib/useAuth';
import { toast } from '@/lib/toast';

// Same tag the web app uses, so X-rays uploaded on either side show in both.
export const XRAY_TAG = '[xray] ';

/** Downloaded copies (rules-checked, via the SDK) cached per Storage path. */
const localUris = new Map<string, string>();

function useLocalUri(f: PatientFile | undefined): string | undefined {
  const [uri, setUri] = useState<string | undefined>(() => f?.dataUrl ?? (f?.path ? localUris.get(f.path) : undefined));
  const path = f?.path;
  const dataUrl = f?.dataUrl;
  const name = f ? `${f.id}-${f.name.replace(XRAY_TAG, '')}` : '';
  useEffect(() => {
    if (dataUrl || !path) {
      setUri(dataUrl);
      return;
    }
    const cached = localUris.get(path);
    if (cached) {
      setUri(cached);
      return;
    }
    let cancelled = false;
    setUri(undefined);
    resolveCaseFileUri(path, name.replace(/[^\w.\-]+/g, '_'))
      .then((u) => {
        localUris.set(path, u);
        if (!cancelled) setUri(u);
      })
      .catch((err) => console.warn('X-ray not loaded:', err));
    return () => {
      cancelled = true;
    };
  }, [path, dataUrl, name]);
  return uri;
}

/** Picks images and uploads them to the patient's private Storage folder,
 *  through the native uploader (the JS SDK's byte upload fails inside the app). */
function usePhotoUpload(p: Patient, ar: boolean) {
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);

  const upload = async (tag: string, limit?: number) => {
    if (!user?.uid) {
      toast.error(ar ? 'سجّل الدخول لرفع الصور' : 'Sign in to upload images');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: limit,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.length) return;
    setUploading(true);
    let failed = 0;
    for (const a of res.assets.slice(0, limit)) {
      try {
        const type = a.mimeType ?? 'image/jpeg';
        const name = a.fileName ?? `image-${Date.now()}.${type.split('/')[1] ?? 'jpg'}`;
        const fileId = newFileId();
        const path = patientFilePath(user.uid, p.id, fileId, name);
        await uploadFileUri(path, a.uri, type);
        addFile(p.id, { id: fileId, name: tag + name, path, type });
      } catch (err) {
        failed += 1;
        console.warn('Patient image upload failed:', err);
      }
    }
    setUploading(false);
    if (failed) toast.error(ar ? `تعذر رفع ${failed} صورة — تحقق من الاتصال` : `${failed} image(s) failed to upload`);
  };

  return { upload, uploading };
}

export function useXrayUpload(p: Patient, ar: boolean) {
  const { upload, uploading } = usePhotoUpload(p, ar);
  return { upload: () => upload(XRAY_TAG), uploading };
}

function Thumb({ f, onPress, width = '31.5%' }: { f: PatientFile; onPress: () => void; width?: '31.5%' | '48.5%' }) {
  const uri = useLocalUri(f);
  return (
    <Pressable onPress={onPress} style={{ width }} className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      {uri && f.type.startsWith('image/') ? (
        <Image source={{ uri }} className="h-full w-full" resizeMode="cover" />
      ) : (
        <View className="h-full w-full items-center justify-center">
          {f.type.startsWith('image/') ? <ActivityIndicator color="#94A3B8" /> : <FileImage size={22} color="#94A3B8" />}
        </View>
      )}
    </Pressable>
  );
}

function Viewer({ f, ar, onClose, onDelete }: { f: PatientFile; ar: boolean; onClose: () => void; onDelete: () => void }) {
  const uri = useLocalUri(f);
  const share = async () => {
    if (uri?.startsWith('file:') && (await Sharing.isAvailableAsync())) await Sharing.shareAsync(uri);
  };
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <View className="flex-row items-center justify-between px-4 pb-3 pt-12">
          <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <X size={18} color="#FFFFFF" />
          </Pressable>
          <Text className="text-xs text-white/70" style={{ writingDirection: 'ltr' }}>{f.addedAt.slice(0, 10)}</Text>
          <View className="flex-row gap-2">
            <Pressable onPress={share} className="h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Share2 size={16} color="#FFFFFF" />
            </Pressable>
            <Pressable onPress={onDelete} className="h-9 w-9 items-center justify-center rounded-lg bg-rose-500/80">
              <Trash2 size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
        {/* maximumZoomScale gives pinch-zoom on iOS; Android shows it fitted. */}
        <ScrollView maximumZoomScale={4} minimumZoomScale={1} centerContent contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          {uri ? (
            <Image source={{ uri }} style={{ width: '100%', aspectRatio: 1 }} resizeMode="contain" />
          ) : (
            <ActivityIndicator color="#FFFFFF" />
          )}
        </ScrollView>
        <Text className="pb-8 text-center text-[11px] text-white/50">{ar ? 'قرّب بإصبعين للتكبير' : 'Pinch to zoom'}</Text>
      </View>
    </Modal>
  );
}

export function XrayGallery({ p, ar, uploading }: { p: Patient; ar: boolean; uploading: boolean }) {
  const xrays = p.files.filter((f) => f.name.startsWith(XRAY_TAG));
  const [openId, setOpenId] = useState<string | null>(null);
  const open = xrays.find((f) => f.id === openId);

  const confirmDelete = (f: PatientFile) =>
    Alert.alert(ar ? 'حذف الأشعة' : 'Delete X-ray', ar ? 'حذف صورة الأشعة هذه؟' : 'Delete this X-ray?', [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      {
        text: ar ? 'حذف' : 'Delete',
        style: 'destructive',
        onPress: () => {
          setOpenId(null);
          removeFile(p.id, f.id);
        },
      },
    ]);

  return (
    <View>
      {uploading && (
        <View className="mb-2 flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#2563EB" />
          <Text className="text-[11px] font-bold text-primary">{ar ? 'جارٍ رفع الأشعة…' : 'Uploading…'}</Text>
        </View>
      )}
      {xrays.length === 0 ? (
        <View className="items-center rounded-2xl bg-slate-50 py-8">
          <Cloud size={28} color="#94A3B8" />
          <Text className="mt-2 text-xs font-semibold text-slate-500">
            {ar ? 'لا توجد صور أشعة مرفوعة للمريض بعد' : 'No radiographs uploaded yet'}
          </Text>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {xrays.map((f) => (
            <Thumb key={f.id} f={f} onPress={() => setOpenId(f.id)} />
          ))}
        </View>
      )}
      {open && <Viewer f={open} ar={ar} onClose={() => setOpenId(null)} onDelete={() => confirmDelete(open)} />}
    </View>
  );
}

/** Up to two photos for one treatment-plan department. */
export function PlanPhotos({ p, ar, dept }: { p: Patient; ar: boolean; dept: string }) {
  const photos = planPhotos(p, dept);
  const { upload, uploading } = usePhotoUpload(p, ar);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = photos.find((f) => f.id === openId);
  const free = Math.max(0, MAX_PLAN_PHOTOS - photos.length);

  const confirmDelete = (f: PatientFile) =>
    Alert.alert(ar ? 'حذف الصورة' : 'Delete photo', ar ? 'حذف هذه الصورة؟' : 'Delete this photo?', [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      {
        text: ar ? 'حذف' : 'Delete',
        style: 'destructive',
        onPress: () => {
          setOpenId(null);
          removeFile(p.id, f.id);
        },
      },
    ]);

  return (
    <View className="mt-3 border-t border-slate-100 pt-3">
      <View className="mb-2 flex-row items-center gap-1.5">
        <Camera size={14} color="#2563EB" />
        <Text className="flex-1 text-xs font-bold text-slate-800">{ar ? 'صور الحالة' : 'Case photos'}</Text>
        <Text className="text-[10px] text-slate-400" style={{ writingDirection: 'ltr' }}>
          {photos.length}/{MAX_PLAN_PHOTOS}
        </Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {photos.map((f) => (
          <Thumb key={f.id} f={f} width="48.5%" onPress={() => setOpenId(f.id)} />
        ))}
        {Array.from({ length: free }, (_, i) => (
          <Pressable
            key={i}
            disabled={uploading}
            onPress={() => void upload(planPhotoTag(dept), free)}
            style={{ width: '48.5%' }}
            className="aspect-square items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50"
          >
            {uploading && i === 0 ? <ActivityIndicator color="#2563EB" /> : <Cloud size={22} color="#2563EB" />}
            <Text className="text-[11px] font-bold text-slate-500">
              {uploading && i === 0 ? (ar ? 'جارٍ الرفع…' : 'Uploading…') : ar ? 'رفع صورة' : 'Upload photo'}
            </Text>
          </Pressable>
        ))}
      </View>
      {open && <Viewer f={open} ar={ar} onClose={() => setOpenId(null)} onDelete={() => confirmDelete(open)} />}
    </View>
  );
}
