import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, TextInput, View } from 'react-native';
import { Download, FileArchive } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useClinics } from '@/lib/clinicsStore';
import {
  exportErrorMessage,
  exportStage,
  formatExportSize,
  hoursUntil,
  startDataExport,
  useDataExport,
} from '@/lib/dataExport';
import { useSession } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

/** "تصدير بياناتي": lets a dentist take every patient file with them. */
export function DataExportCard({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const { clinics } = useClinics();
  const data = useDataExport(user?.uid);
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const now = Date.now();
  const view = exportStage(data, now);
  const canRequest = view.stage === 'idle' || view.stage === 'failed';

  const start = async () => {
    if (!password) {
      setError(ar ? 'أدخل كلمة المرور للتأكيد' : 'Enter your password to confirm');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await startDataExport(password, clinicId);
      setPassword('');
    } catch (err) {
      setError(exportErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  const choices: { id: string | null; name: string }[] = [
    { id: null, name: ar ? 'كل العيادات' : 'All clinics' },
    ...clinics.map((c) => ({ id: c.id, name: c.name })),
  ];

  return (
    <View className="mt-4 gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <FileArchive size={19} color="#2563EB" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-800">{ar ? 'تصدير بياناتي' : 'Export my data'}</Text>
          <Text className="mt-0.5 text-[11px] leading-5 text-slate-500">
            {ar
              ? 'ملف ZIP فيه قائمة المرضى بصيغة Excel، وملف PDF لكل مريض، وكل صور الأشعة والحالات.'
              : 'A ZIP with an Excel list of patients, a PDF for each patient, and all X-rays and case photos.'}
          </Text>
        </View>
      </View>

      {view.stage === 'working' && (
        <View className="flex-row items-center gap-2 rounded-xl bg-blue-50 p-3">
          <ActivityIndicator size="small" color="#1E40AF" />
          <Text className="flex-1 text-xs font-semibold text-blue-800">
            {ar ? 'يجري تجهيز ملفك. يمكنك إغلاق التطبيق وسيصلك إشعار عندما يجهز.' : 'Preparing your file. You can close the app; you will be notified.'}
          </Text>
        </View>
      )}

      {view.stage === 'ready' && (
        <View className="gap-2 rounded-xl bg-emerald-50 p-3">
          <Text className="text-xs font-semibold text-emerald-900">
            {ar
              ? `ملفك جاهز: ${data?.patients ?? 0} مريض، ${data?.files ?? 0} صورة وملف (${formatExportSize(data?.sizeBytes)}).`
              : `Ready: ${data?.patients ?? 0} patients, ${data?.files ?? 0} images and files (${formatExportSize(data?.sizeBytes)}).`}
          </Text>
          {!!data?.missing && (
            <Text className="text-[11px] text-amber-800">
              {ar
                ? `تعذر العثور على ${data.missing} ملف. أسماؤها في «اقرأني.txt» داخل الملف.`
                : `${data.missing} file(s) could not be found. They are listed in the file's readme.`}
            </Text>
          )}
          <Pressable
            onPress={() => void Linking.openURL(view.url)}
            className="h-11 flex-row items-center justify-center gap-2 rounded-xl bg-emerald-600"
          >
            <Download size={16} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">{ar ? 'تحميل الملف' : 'Download file'}</Text>
          </Pressable>
          <Text className="text-[10px] text-emerald-800">
            {ar
              ? `يُحذف الرابط بعد ${hoursUntil(view.expiresAt, now)} ساعة. لا تشاركه مع أحد.`
              : `The link is removed in ${hoursUntil(view.expiresAt, now)} hour(s). Do not share it.`}
          </Text>
        </View>
      )}

      {view.stage === 'failed' && (
        <View className="rounded-xl bg-rose-50 p-3">
          <Text className="text-xs font-semibold text-rose-700">
            {ar ? 'تعذر تجهيز آخر ملف. حاول مرة أخرى.' : 'The last export failed. Please try again.'}
          </Text>
        </View>
      )}

      {view.stage === 'cooldown' && (
        <View className="rounded-xl bg-slate-100 p-3">
          <Text className="text-xs font-semibold text-slate-500">
            {ar
              ? `يمكنك طلب تصدير جديد بعد ${hoursUntil(view.nextAt, now)} ساعة.`
              : `You can request a new export in ${hoursUntil(view.nextAt, now)} hour(s).`}
          </Text>
        </View>
      )}

      {canRequest && (
        <>
          {clinics.length > 1 && (
            <View className="flex-row flex-wrap gap-1.5">
              {choices.map((c) => (
                <Pressable
                  key={c.id ?? 'all'}
                  onPress={() => setClinicId(c.id)}
                  className={cn('h-8 justify-center rounded-full border px-3', clinicId === c.id ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
                >
                  <Text className={cn('text-[11px] font-bold', clinicId === c.id ? 'text-primary-foreground' : 'text-slate-500')}>{c.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <TextInput
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              setError('');
            }}
            placeholder={ar ? 'كلمة المرور للتأكيد' : 'Password to confirm'}
            placeholderTextColor="#94A3B8"
            textAlignVertical="center"
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800"
          />
          {!!error && <Text className="text-xs font-medium text-rose-600">{error}</Text>}
          <Pressable
            onPress={() => void start()}
            disabled={busy}
            className="h-12 flex-row items-center justify-center gap-2 rounded-xl bg-primary"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <FileArchive size={16} color="#FFFFFF" />}
            <Text className="text-sm font-bold text-primary-foreground">{ar ? 'تجهيز ملف بياناتي' : 'Prepare my file'}</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
