import * as fbAuth from "firebase/auth";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { app } from "./config";

// `initializeAuth` + `getReactNativePersistence` exist only in Firebase's
// React Native build (dist/rn), which the browser typings don't declare. Metro
// resolves the RN build at runtime; this cast bridges the compile-time gap
// without breaking the rest of the `firebase/auth` exports.
type RnAuthModule = typeof fbAuth & {
  initializeAuth(
    app: unknown,
    deps?: { persistence?: unknown },
  ): ReturnType<typeof getAuth>;
  getReactNativePersistence(storage: unknown): unknown;
};
const rnAuth = fbAuth as unknown as RnAuthModule;

// On native, Firebase needs an explicit persistence layer to keep the user
// signed in across app restarts, so it's routed through `initializeAuth` +
// AsyncStorage. On web (including the Node process that pre-renders each
// route during `expo export -p web`), that RN-only build path doesn't exist
// at all — `getReactNativePersistence` isn't a function there — and isn't
// needed anyway, since the web Firebase SDK already persists to IndexedDB
// on its own, same as the separate web app's `getAuth(app)`.
export const auth = Platform.OS === "web"
  ? getAuth(app)
  : rnAuth.initializeAuth(app, {
      persistence: rnAuth.getReactNativePersistence(AsyncStorage),
    });
export const db = getFirestore(app);
export const storage = getStorage(app);
