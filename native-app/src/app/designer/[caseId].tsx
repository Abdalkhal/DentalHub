import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { doc, setDoc } from 'firebase/firestore';
import { FileBox, Hash, Stethoscope, Upload, User } from 'lucide-react-native';

import { Button, Card, Screen, Spinner, Text } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { useDesignerCase, useDesignerCases } from '@/lib/designerStore';
import { uploadCaseFile } from '@/lib/storagePipeline';
import type { OrderAttachment } from '@/lib/ordersStore';
import { useSession } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';

/**
 * Native counterpart of the web app's `DesignerCaseDetail`. Shows the Rx and the
 * doctor's scans, and lets the designer upload the finished design.
 *
 * Deliberately shows no pricing: finance lives in the `private/finance`
 * subcollection which designer accounts cannot read.
 */
export default function DesignerCaseScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user, loading: authLoading } = useSession();

  // The case list carries the owning labId, which the case document itself is
  // addressed by — resolve it before subscribing to the case.
  const { cases } = useDesignerCases(user?.uid || '');
  const labId = cases.find((c) => c.order.id === caseId)?.labId ?? '';
  const { order, loading } = useDesignerCase(labId, caseId ?? '');

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (authLoading) return <Spinner />;
  if (!user) return <Redirect href="/login" />;
  if (loading) return <Spinner />;

  if (!order) {
    return (
      <Screen>
        <View className="items-center py-16">
          <Text className="text-center text-sm font-semibold text-slate-400">
            {ar ? 'الحالة غير موجودة أو غير مسندة إليك' : 'Case not found or not assigned to you'}
          </Text>
            <Pressable onPress={() => router.push('/designer' as never)} className="mt-3">
            <Text className="text-xs font-bold text-primary">
              {ar ? 'العودة لقائمة الحالات' : 'Back to my cases'}
            </Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  const handleUpload = async () => {
    setError(null);
    const picked = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      // STL/PLY/OBJ have no reliable MIME type across platforms, so accept any
      // file and let the storage rules enforce size limits.
      type: '*/*',
    });
    if (picked.canceled || picked.assets.length === 0) return;

    setUploading(true);
    try {
      const uploaded: OrderAttachment[] = [];
      for (const asset of picked.assets) {
        const blob = await fetch(asset.uri).then((r) => r.blob());
        const res = await uploadCaseFile({
          labId,
          caseId: order.id,
          file: blob,
          fileName: asset.name,
          dentistId: order.dentistId ?? '',
          designerId: user.uid,
          kind: 'design',
        });
        uploaded.push({ name: asset.name, url: res.url, type: 'stl' });
      }
      await setDoc(
        doc(db, 'lab_orders', labId, 'cases', order.id),
        { designs: [...(order.designs ?? []), ...uploaded] },
        { merge: true },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(msg || (ar ? 'فشل رفع الملف' : 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const files = [...(order.attachments ?? []), ...(order.designs ?? [])];

  return (
    <Screen>
      <Card className="gap-2.5">
        <View className="flex-row items-center gap-2">
          <User size={16} color="#94A3B8" />
          <Text className="text-sm font-bold text-slate-800">
            {order.patient || (ar ? 'غير محدد' : 'Unspecified')}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Stethoscope size={16} color="#94A3B8" />
          <Text className="text-xs text-slate-500">{order.doctor}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Hash size={16} color="#94A3B8" />
          <Text className="text-xs text-slate-500">{order.id}</Text>
        </View>
      </Card>

      <Card className="mt-3">
        <Text className="mb-2 text-xs font-bold uppercase text-slate-500">
          {ar ? 'الوصفة (Rx)' : 'Rx'}
        </Text>
        <Text className="text-sm text-slate-700">
          {order.workType || (ar ? 'غير محدد' : 'Unspecified')}
        </Text>
        {order.rxItems && order.rxItems.length > 0 ? (
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {order.rxItems.map((it, i) => (
              <View key={i} className="rounded-full bg-slate-100 px-2 py-1">
                <Text className="text-[11px] font-semibold text-slate-600">{it}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>

      <Card className="mt-3">
        <Text className="mb-2 text-xs font-bold uppercase text-slate-500">
          {ar ? 'ملفات التصميم (.stl)' : 'Design files (.stl)'}
        </Text>

        {files.length === 0 ? (
          <Text className="text-xs text-slate-400">{ar ? 'لا توجد ملفات بعد' : 'No files yet'}</Text>
        ) : (
          <View className="gap-2">
            {files.map((f, i) => (
              <Pressable
                key={i}
                onPress={() => Linking.openURL(f.url)}
                className="flex-row items-center gap-2"
              >
                <FileBox size={16} color="#0EA5E9" />
                <Text className="flex-1 text-xs text-sky-600 underline" numberOfLines={1}>
                  {f.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {error ? (
          <View className="mt-2 rounded-lg border border-rose-200 bg-rose-50 p-2">
            <Text className="text-xs text-rose-700">{error}</Text>
          </View>
        ) : null}

        <Button
          onPress={handleUpload}
          loading={uploading}
          disabled={uploading}
          className="mt-3 w-full"
        >
          <View className="flex-row items-center gap-2">
            <Upload size={16} color="#FFFFFF" />
            <Text className="text-sm font-bold text-white">
              {uploading
                ? ar
                  ? 'جارٍ الرفع...'
                  : 'Uploading...'
                : ar
                  ? 'رفع ملف التصميم النهائي'
                  : 'Upload finished design'}
            </Text>
          </View>
        </Button>
      </Card>
    </Screen>
  );
}
