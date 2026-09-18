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
import { CartHeaderButton } from '@/components/CartHeaderButton';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

/**
 * Screens presented with a native header, and the dictionary key for the title.
 *
 * Titles were previously hardcoded Arabic string literals, so switching the app
 * to English left every header in Arabic. Driving them from the dictionary
 * means the header re-renders with the language, like the rest of the UI.
 */
const TITLED_SCREENS: { name: string; title: DictKey; cart?: boolean }[] = [
  { name: 'supplies', title: 'screen_supplies', cart: true },
  { name: 'supplies-directory', title: 'screen_supplies_directory', cart: true },
  { name: 'product-detail/[productId]', title: 'screen_product', cart: true },
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
  { name: 'implant-country/[country]', title: 'screen_implant_country', cart: true },
  { name: 'brands', title: 'screen_brands', cart: true },
  { name: 'brand/[brandId]', title: 'screen_brand', cart: true },
  { name: 'profile/[accountId]', title: 'screen_profile', cart: true },
  { name: 'specialized-implants/index', title: 'screen_specialized_implants' },
  { name: 'specialized-implants/[category]', title: 'screen_specialized_implants' },
  { name: 'bone-grafts', title: 'screen_bone_grafts' },
  { name: 'track-cases', title: 'screen_track_cases' },
  { name: 'surgical-guide', title: 'screen_surgical_guide' },
  { name: 'messages', title: 'screen_messages' },
  { name: 'doctor-invoices/index', title: 'screen_doctor_invoices' },
  { name: 'invoices', title: 'screen_invoices' },
  { name: 'doctor-invoices/[invoiceId]', title: 'screen_doctor_invoices' },
  { name: 'help', title: 'screen_help' },
  { name: 'clinic-reports', title: 'screen_reports' },
  { name: 'doctors', title: 'screen_doctors' },
  { name: 'clinic-doctors', title: 'screen_clinic_doctors' },
  { name: 'clinic-materials', title: 'screen_clinic_materials' },
  { name: 'designer/index', title: 'screen_designer_cases' },
  { name: 'designer/[caseId]', title: 'screen_case_details' },
  { name: 'new-lab-order', title: 'screen_new_lab_order' },
  { name: 'lab-finance', title: 'screen_lab_finance' },
  { name: 'lab-reports', title: 'screen_lab_reports' },
  { name: 'lab-services', title: 'screen_lab_services' },
  { name: 'my-ads', title: 'screen_my_ads' },
  { name: 'privacy', title: 'screen_privacy' },
  { name: 'lab-doctors', title: 'screen_doctors' },
  { name: 'lab-patients', title: 'screen_patients' },
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
      {TITLED_SCREENS.map(({ name, title, cart }) => (
        <Stack.Screen
          key={name}
          name={name}
          options={{
            headerShown: true,
            title: t(title),
            headerRight: cart ? () => <CartHeaderButton /> : undefined,
          }}
        />
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

  // No <SafeAreaProvider> here: expo-router's ExpoRoot already wraps the
  // whole app in one (see node_modules/expo-router/build/ExpoRoot.js), so
  // adding a second one here would just be a redundant nested provider.
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
