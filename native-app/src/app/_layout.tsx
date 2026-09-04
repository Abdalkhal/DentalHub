import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold, Cairo_900Black } from '@expo-google-fonts/cairo';
import { Urbanist_400Regular, Urbanist_500Medium, Urbanist_600SemiBold, Urbanist_700Bold, Urbanist_800ExtraBold, Urbanist_900Black } from '@expo-google-fonts/urbanist';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import '@/global.css';
import '@/lib/polyfills';
import { hydrateStorage } from '@/lib/storage';
import { LanguageProvider } from '@/lib/i18n';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastHost } from '@/components/ToastHost';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
    Cairo_900Black,
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
    Urbanist_700Bold,
    Urbanist_800ExtraBold,
    Urbanist_900Black,
  });

  // Hydrate AsyncStorage-backed local stores before first render so that
  // synchronous `localStorage.getItem` reads return persisted data.
  useEffect(() => {
    hydrateStorage().finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready && (fontsLoaded || fontError)) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, fontsLoaded, fontError]);

  if (!ready || (!fontsLoaded && !fontError)) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ThemeProvider value={DefaultTheme}>
          <AnimatedSplashOverlay />
          <ToastHost />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="login" />
            <Stack.Screen
              name="supplies"
              options={{ headerShown: true, title: 'المستلزمات الطبية' }}
            />
            <Stack.Screen
              name="product-detail/[productId]"
              options={{ headerShown: true, title: 'المنتج' }}
            />
            <Stack.Screen name="cart" options={{ headerShown: true, title: 'السلة' }} />
            <Stack.Screen
              name="supplies-office"
              options={{ headerShown: true, title: 'لوحة المورد' }}
            />
            <Stack.Screen
              name="implants-office"
              options={{ headerShown: true, title: 'شركة الزرعات' }}
            />
            <Stack.Screen
              name="labs-office"
              options={{ headerShown: true, title: 'لوحة المختبر' }}
            />
            <Stack.Screen name="admin" options={{ headerShown: true, title: 'لوحة الإدارة' }} />
            <Stack.Screen name="patients" options={{ headerShown: true, title: 'المرضى' }} />
            <Stack.Screen
              name="patient/[patientId]"
              options={{ headerShown: true, title: 'المريض' }}
            />
            <Stack.Screen name="clinic" options={{ headerShown: true, title: 'عيادتي' }} />
            <Stack.Screen
              name="clinic-appointments"
              options={{ headerShown: true, title: 'المواعيد' }}
            />
            <Stack.Screen name="clinic-finance" options={{ headerShown: true, title: 'المالية' }} />
            <Stack.Screen name="rx/[patientId]" options={{ headerShown: true, title: 'الوصفة' }} />
            <Stack.Screen name="notifications" options={{ headerShown: true, title: 'الإشعارات' }} />
            <Stack.Screen name="labs" options={{ headerShown: true, title: 'المختبرات' }} />
            <Stack.Screen name="implants" options={{ headerShown: true, title: 'الزرعات' }} />
            <Stack.Screen name="brands" options={{ headerShown: true, title: 'البراندات' }} />
            <Stack.Screen name="profile/[accountId]" options={{ headerShown: true, title: 'الملف' }} />
            <Stack.Screen name="specialized-implants/index" options={{ headerShown: true, title: 'الزرعات المتخصصة' }} />
            <Stack.Screen name="specialized-implants/[category]" options={{ headerShown: true, title: 'الزرعات المتخصصة' }} />
            <Stack.Screen name="bone-grafts" options={{ headerShown: true, title: 'البون كرافت' }} />
            <Stack.Screen name="track-cases" options={{ headerShown: true, title: 'تتبع الحالات' }} />
            <Stack.Screen name="surgical-guide" options={{ headerShown: true, title: 'الدليل الجراحي' }} />
            <Stack.Screen name="messages" options={{ headerShown: true, title: 'الرسائل' }} />
            <Stack.Screen name="doctor-invoices" options={{ headerShown: true, title: 'فواتير الأطباء' }} />
            <Stack.Screen name="help" options={{ headerShown: true, title: 'المساعدة' }} />
            <Stack.Screen name="scan" options={{ headerShown: false }} />
            <Stack.Screen name="clinic-reports" options={{ headerShown: true, title: 'التقارير' }} />
            <Stack.Screen name="doctors" options={{ headerShown: true, title: 'الأطباء' }} />
          </Stack>
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
