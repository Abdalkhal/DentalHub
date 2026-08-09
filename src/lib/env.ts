const REQUIRED_CLIENT_VARS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const REQUIRED_ADMIN_VARS = [
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
] as const;

export function validateEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_CLIENT_VARS) {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. Check your .env file.`,
    );
  }
}

export function validateAdminEnv(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_ADMIN_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase admin environment variable(s): ${missing.join(", ")}. Get these from Firebase Console > Project Settings > Service Accounts.`,
    );
  }
}
