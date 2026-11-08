import { Platform } from 'react-native';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signOut } from 'firebase/auth';
import { app } from '@/integrations/firebase/config';
import { auth, db } from '@/integrations/firebase/client';
import { hasNativeModule } from '@/lib/nativeModules';

// expo-notifications only exists in builds that include it. Never require the
// JS wrapper unless the native module is present (missing modules crash in dev
// regardless of try/catch).

type Subscription = { remove: () => void };
type Response = { notification: { request: { content: { data?: Record<string, unknown> } } } };

type NotificationsApi = {
  setNotificationChannelAsync: (id: string, opts: unknown) => Promise<unknown>;
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (o: unknown) => Promise<{ data: string }>;
  getDevicePushTokenAsync: () => Promise<{ type: string; data: string }>;
  setNotificationHandler: (h: unknown) => void;
  addNotificationResponseReceivedListener: (fn: (r: Response) => void) => Subscription;
  getLastNotificationResponseAsync: () => Promise<Response | null>;
  AndroidImportance: Record<string, number>;
};

const PROJECT_ID = 'e631dca8-3a36-4416-82d8-9389cd4ad63b';

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

async function ensureChannel(N: NotificationsApi): Promise<void> {
  if (Platform.OS !== 'android') return;
  await N.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: N.AndroidImportance.MAX,
    sound: 'default',
  });
}

export async function setupAndroidChannel(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    await ensureChannel(notifications());
  } catch {
    /* non-critical */
  }
}

/** This device's tokens, once known, so signing out can remove them. */
let deviceTokens: { expoToken?: string; fcmToken?: string } = {};

export type RegisterPushResult = { token: string | null; reason?: string };

/**
 * Asks for permission and gives this device to the signed-in account (and to
 * no other). Android is reached through Firebase with the device's own token;
 * iPhones through Expo. `reason` carries the real cause of a failure.
 */
export async function registerPush(userId: string): Promise<RegisterPushResult> {
  if (!isPushSupported()) return { token: null, reason: 'unsupported-runtime' };
  try {
    const N = notifications();
    await ensureChannel(N);
    const { status } = await N.getPermissionsAsync();
    let final = status;
    if (final !== 'granted') final = (await N.requestPermissionsAsync()).status;
    if (final !== 'granted') return { token: null, reason: 'permission-denied' };

    const [expo, device] = await Promise.all([
      N.getExpoPushTokenAsync({ projectId: PROJECT_ID }).catch(() => null),
      Platform.OS === 'android' ? N.getDevicePushTokenAsync().catch(() => null) : Promise.resolve(null),
    ]);
    deviceTokens = {
      expoToken: expo?.data,
      fcmToken: device && device.type === 'android' ? device.data : undefined,
    };
    if (!deviceTokens.expoToken && !deviceTokens.fcmToken) return { token: null, reason: 'no-token' };

    try {
      await httpsCallable(getFunctions(app), 'registerPushDevice')(deviceTokens);
    } catch {
      // The server may not have this function yet: keep the old behaviour.
      if (deviceTokens.expoToken) {
        await updateDoc(doc(db, 'user_roles', userId), { pushTokens: arrayUnion(deviceTokens.expoToken) }).catch(() => {});
      }
    }
    return { token: deviceTokens.fcmToken ?? deviceTokens.expoToken ?? null };
  } catch (e) {
    return { token: null, reason: e instanceof Error ? e.message : String(e) };
  }
}

/** Stops this device getting the signed-in account's notifications. */
export async function unregisterPush(): Promise<void> {
  if (!auth.currentUser || (!deviceTokens.expoToken && !deviceTokens.fcmToken)) return;
  try {
    await httpsCallable(getFunctions(app), 'unregisterPushDevice')(deviceTokens);
  } catch {
    /* best effort: signing out must never wait on this */
  }
  deviceTokens = {};
}

/** Sign out, and stop this phone receiving the account's notifications. */
export async function signOutDevice(): Promise<void> {
  await Promise.race([unregisterPush(), new Promise((r) => setTimeout(r, 4000))]);
  await signOut(auth);
}

/**
 * Shows notifications that arrive while the app is open, and opens the right
 * screen when one is tapped, including the tap that launched the app.
 * @return a function that stops listening.
 */
export function listenForNotificationTaps(onOpen: (data: Record<string, unknown>) => void): () => void {
  if (!isPushSupported()) return () => {};
  try {
    const N = notifications();
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    const handled = new Set<string>();
    const open = (r: Response | null) => {
      const data = r?.notification?.request?.content?.data ?? {};
      const key = String(data.notificationId ?? '');
      if (!r || (key && handled.has(key))) return;
      if (key) handled.add(key);
      onOpen(data);
    };
    N.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = N.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  } catch {
    return () => {};
  }
}
