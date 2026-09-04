import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ScanBarcode } from 'lucide-react-native';

import { Screen, Text, Button } from '@/components/ui';
import { useProducts } from '@/lib/products';
import { hasNativeModule } from '@/lib/nativeModules';
import { useI18n } from '@/lib/i18n';
import { toast } from '@/lib/toast';

// expo-camera is a native module only present in builds that include it; load
// lazily so older builds show a friendly message instead of crashing.
type CameraApi = typeof import('expo-camera');

function loadCamera(): CameraApi | null {
  if (!hasNativeModule('ExpoCamera')) return null;
  try {
    return require('expo-camera') as CameraApi;
  } catch {
    return null;
  }
}

export default function ScanScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [cam, setCam] = useState<CameraApi | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCam(loadCamera());
    setLoaded(true);
  }, []);

  if (!loaded) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center">
          <ScanBarcode size={44} color="#94A3B8" />
          <Text className="mt-4 text-center text-sm text-slate-500">{ar ? 'جارٍ التشغيل…' : 'Starting…'}</Text>
        </View>
      </Screen>
    );
  }

  if (!cam) {
    return (
      <Screen>
        <View className="mt-20 items-center px-6">
          <ScanBarcode size={48} color="#CBD5E1" />
          <Text className="mt-4 text-center text-sm font-bold text-slate-700">
            {ar ? 'الماسح متوفر في أحدث نسخة من التطبيق' : 'Scanning needs the latest app build'}
          </Text>
          <Text className="mt-1 text-center text-xs text-slate-500">
            {ar ? 'ثبّت النسخة الجديدة ثم أعد المحاولة' : 'Install the new build and try again'}
          </Text>
          <Button title={ar ? 'رجوع' : 'Back'} onPress={() => router.back()} className="mt-5" />
        </View>
      </Screen>
    );
  }

  return <CameraBody cam={cam} />;
}

function CameraBody({ cam }: { cam: CameraApi }) {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const CameraView = cam.CameraView;
  const useCameraPermissions = cam.useCameraPermissions;
  const [permission, requestPermission] = useCameraPermissions();
  const { data: products = [] } = useProducts();
  const [done, setDone] = useState(false);

  if (!permission) {
    return (
      <Screen scroll={false}>
        <View className="flex-1 items-center justify-center bg-slate-950" />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <View className="mt-20 items-center">
          <ScanBarcode size={48} color="#94A3B8" />
          <Text className="mt-4 text-center text-sm font-bold text-slate-700">
            {ar ? 'نحتاج إذن الكاميرا لمسح الباركود' : 'Camera permission is needed to scan barcodes'}
          </Text>
          <Button title={ar ? 'منح الإذن' : 'Grant permission'} onPress={requestPermission} className="mt-4" />
        </View>
      </Screen>
    );
  }

  const onScan = (data: string) => {
    const code = (data || '').trim().toLowerCase();
    if (!code || done) return;
    const hit =
      products.find((p) => p.id === data || p.id === code) ||
      products.find((p) =>
        [p.id, p.en, p.ar, p.brand].filter(Boolean).some((v) => v!.toLowerCase().includes(code)),
      );
    if (hit) {
      setDone(true);
      router.push({ pathname: '/product-detail/[productId]', params: { productId: hit.id } } as never);
    } else {
      toast.error(ar ? 'لم يتم العثور على منتج بهذا الرمز' : 'No product found for this code');
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={({ data }) => onScan(data)}
      >
        <View className="flex-1 items-center justify-center">
          <View className="h-56 w-56 rounded-2xl border-2 border-white/80" />
          <Text className="mt-6 text-xs font-semibold text-white/80">
            {ar ? 'وجّه الكاميرا نحو الباركود' : 'Point the camera at the barcode'}
          </Text>
        </View>
        <View className="bg-slate-950/60 px-4 pb-6 pt-2">
          <Button variant="outline" title={ar ? 'إلغاء' : 'Close'} onPress={() => router.back()} />
        </View>
      </CameraView>
    </View>
  );
}
