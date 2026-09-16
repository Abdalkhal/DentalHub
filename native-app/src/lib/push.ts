import { Platform } from 'react-native';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/integrations/firebase/client';
import { hasNativeModule } from '@/lib/nativeModules';

// expo-notifications only exists in builds that include it. Never require the
// JS wrapper unless the native module is present (missing modules crash in dev
// regardless of try/catch).

type NotificationsApi = {
  setNotificationChannelAsync: (id: string, opts: unknown) => Promise<unknown>;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (o: unknown) => Promise<{ data: string }>;
  AndroidImportance: Record<string, number>;
};

function notifications(): NotificationsApi {
  return require('expo-notifications') as NotificationsApi;
}

// expo-notifications' remote push isn't available at all inside Expo Go
// (Expo dropped that support in SDK 53) — only a real dev/production build
// has the native module. The UI uses this to avoid offering an "Enable"
// button that can only ever fail there.
export function isPushSupported(): boolean {
  return hasNativeModule('ExpoPushTokenManager');
}

export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (!hasNativeModule('ExpoPushTokenManager')) return;
  try {
    const N = notifications();
    await N.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: N.AndroidImportance.MAX,
    });
  } catch {
    /* non-critical */
  }
}

export type RegisterPushResult = { token: string | null; reason?: string };

/**
 * Asks for permission, obtains the Expo push token and stores it on the user
 * role doc (`pushTokens`). The caller previously only got a token-or-null
 * back, which meant every failure (no permission, no FCM credentials
 * uploaded to EAS, network error) surfaced as the same generic message —
 * making it impossible to tell "this device declined" from "this project
 * isn't configured for push yet" apart. `reason` carries the real cause.
 */
export async function registerPush(userId: string): Promise<RegisterPushResult> {
  if (!hasNativeModule('ExpoPushTokenManager')) return { token: null, reason: 'unsupported-runtime' };
  try {
    const N = notifications();
    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: N.AndroidImportance.MAX,
      });
    }
    const { status } = await N.getPermissionsAsync();
    let final = status;
    if (final !== 'granted') {
      const req = await N.requestPermissionsAsync();
      final = req.status;
    }
    if (final !== 'granted') return { token: null, reason: 'permission-denied' };
    const token = (
      await N.getExpoPushTokenAsync({ projectId: 'e631dca8-3a36-4416-82d8-9389cd4ad63b' })
    ).data;
    await updateDoc(doc(db, 'user_roles', userId), { pushTokens: arrayUnion(token) }).catch(() => {});
    return { token };
  } catch (e) {
    return { token: null, reason: e instanceof Error ? e.message : String(e) };
  }
}
