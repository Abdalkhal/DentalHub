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

/**
 * Asks for permission, obtains the Expo push token and stores it on the user
 * role doc (`pushTokens`). Returns the token or null when unavailable.
 */
export async function registerPush(userId: string): Promise<string | null> {
  if (!hasNativeModule('ExpoPushTokenManager')) return null;
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
    if (final !== 'granted') return null;
    const token = (
      await N.getExpoPushTokenAsync({ projectId: 'e631dca8-3a36-4416-82d8-9389cd4ad63b' })
    ).data;
    await updateDoc(doc(db, 'user_roles', userId), { pushTokens: arrayUnion(token) }).catch(() => {});
    return token;
  } catch {
    return null;
  }
}
