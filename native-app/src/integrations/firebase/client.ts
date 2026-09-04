import * as fbAuth from "firebase/auth";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// React Native needs an explicit persistence layer for auth (keeps the user
// signed in across app restarts). AsyncStorage mirrors the web app's behavior.
export const auth = rnAuth.initializeAuth(app, {
  persistence: rnAuth.getReactNativePersistence(AsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);
