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
import { LanguageProvider, useI18n, type DictKey } from '@/lib/i18n';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ToastHost } from '@/components/ToastHost';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * Screens presented with a native header, and the dictionary key for the title.
 *
 * Titles were previously hardcoded Arabic string literals, so switching the app
 * to English left every header in Arabic. Driving them from the dictionary
 * means the header re-renders with the language, like the rest of the UI.
 */
const TITLED_SCREENS: { name: string; title: DictKey }[] = [
  { name: 'supplies', title: 'screen_supplies' },
  { name: 'product-detail/[productId]', title: 'screen_product' },
  { name: 'cart', title: 'screen_cart' },
  { name: 'patients', title: 'screen_patients' },
  { name: 'patient/[patientId]', title: 'screen_patient' },
  { name: 'clinic', title: 'screen_clinic' },
  { name: 'clinic-appointments', title: 'screen_appointments' },
  { name: 'clinic-finance', title: 'screen_finance' },
  { name: 'rx/[patientId]', title: 'screen_rx' },
  { name: 'notifications', title: 'screen_notifications' },
  { name: 'labs', title: 'screen_labs' },
  { name: 'implants', title: 'screen_implants' },
  { name: 'brands', title: 'screen_brands' },
  { name: 'profile/[accountId]', title: 'screen_profile' },
  { name: 'specialized-implants/index', title: 'screen_specialized_implants' },
  { name: 'specialized-implants/[category]', title: 'screen_specialized_implants' },
  { name: 'bone-grafts', title: 'screen_bone_grafts' },
  { name: 'track-cases', title: 'screen_track_cases' },
  { name: 'surgical-guide', title: 'screen_surgical_guide' },
  { name: 'messages', title: 'screen_messages' },
  { name: 'doctor-invoices', title: 'screen_doctor_invoices' },
  { name: 'help', title: 'screen_help' },
  { name: 'clinic-reports', title: 'screen_reports' },
  { name: 'doctors', title: 'screen_doctors' },
  { name: 'designer/index', title: 'screen_designer_cases' },
  { name: 'designer/[caseId]', title: 'screen_case_details' },
];

/**
 * Split out from RootLayout so it sits *inside* LanguageProvider and can read
 * the current language — RootLayout renders the provider and therefore cannot.
 */
function RootStack() {
  const { t } = useI18n();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="scan" options={{ headerShown: false }} />
      {/* supplies-office / implants-office / labs-office / admin live inside the
          (tabs) group so vendor roles keep the bottom tab bar on their own
          dashboard. Their URLs are unchanged — route groups do not appear in
          the path. */}
      {TITLED_SCREENS.map(({ name, title }) => (
        <Stack.Screen key={name} name={name} options={{ headerShown: true, title: t(title) }} />
      ))}
    </Stack>
  );
}

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
          <RootStack />
        </ThemeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
