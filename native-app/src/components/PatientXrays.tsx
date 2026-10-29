import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import { Cloud, FileImage, Share2, Trash2, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { addFile, newFileId, removeFile, type Patient, type PatientFile } from '@/lib/patientsStore';
import { patientFilePath, uploadPatientFile } from '@/lib/dentistRecords';
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

/** Picks images and uploads them to the patient's private Storage folder.
 *  The "رفع أشعة" button used to do nothing ("coming soon"). */
export function useXrayUpload(p: Patient, ar: boolean) {
  const { user } = useSession();
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!user?.uid) {
      toast.error(ar ? 'سجّل الدخول لرفع الأشعة' : 'Sign in to upload X-rays');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (res.canceled || !res.assets?.length) return;
    setUploading(true);
    let failed = 0;
    for (const a of res.assets) {
      try {
        const type = a.mimeType ?? 'image/jpeg';
        const name = a.fileName ?? `xray-${Date.now()}.${type.split('/')[1] ?? 'jpg'}`;
        // Native read — fetch(uri).blob() is unreliable on Android.
        const bytes = new Uint8Array(await new File(a.uri).arrayBuffer());
        const fileId = newFileId();
        const path = patientFilePath(user.uid, p.id, fileId, name);
        await uploadPatientFile(path, bytes, type);
        addFile(p.id, { id: fileId, name: XRAY_TAG + name, path, type });
      } catch (err) {
        failed += 1;
        console.warn('X-ray upload failed:', err);
      }
    }
    setUploading(false);
    if (failed) toast.error(ar ? `تعذر رفع ${failed} صورة — تحقق من الاتصال` : `${failed} image(s) failed to upload`);
  };

  return { upload, uploading };
}

function Thumb({ f, onPress }: { f: PatientFile; onPress: () => void }) {
  const uri = useLocalUri(f);
  return (
    <Pressable onPress={onPress} style={{ width: '31.5%' }} className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
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
