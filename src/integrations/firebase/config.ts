import { initializeApp, type FirebaseApp } from "firebase/app";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
};

function createFirebaseApp(): FirebaseApp {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    const missing = [
      ...(!firebaseConfig.apiKey ? ["FIREBASE_API_KEY"] : []),
      ...(!firebaseConfig.projectId ? ["FIREBASE_PROJECT_ID"] : []),
    ];
    throw new Error(
      `Missing Firebase environment variable(s): ${missing.join(", ")}. Check your .env file.`,
    );
  }
  return initializeApp(firebaseConfig);
}

let _app: FirebaseApp | undefined;

export const app = new Proxy({} as FirebaseApp, {
  get(_, prop, receiver) {
    if (!_app) _app = createFirebaseApp();
    return Reflect.get(_app, prop, receiver);
  },
});
