import { initializeApp, type FirebaseApp } from "firebase/app";

// Expo inlines `EXPO_PUBLIC_*` variables from `.env` at build time.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  const missing = [
    ...(!firebaseConfig.apiKey ? ["EXPO_PUBLIC_FIREBASE_API_KEY"] : []),
    ...(!firebaseConfig.projectId ? ["EXPO_PUBLIC_FIREBASE_PROJECT_ID"] : []),
  ];
  throw new Error(
    `Missing Firebase environment variable(s): ${missing.join(", ")}. Check your .env file.`,
  );
}

export const app: FirebaseApp = initializeApp(firebaseConfig);
