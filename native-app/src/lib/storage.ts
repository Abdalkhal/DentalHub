import AsyncStorage from "@react-native-async-storage/async-storage";

// Synchronous `localStorage`-compatible facade backed by AsyncStorage. Hydrate
// once at app startup (see `hydrateStorage`) so that verbatim-ported stores
// that read `localStorage` synchronously work correctly.

const memory = new Map<string, string>();
let hydrationPromise: Promise<void> | null = null;

export function hydrateStorage(): Promise<void> {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const entries = await AsyncStorage.multiGet(keys);
      for (const [k, v] of entries) {
        if (v != null) memory.set(k, v);
      }
    } catch {
      /* best effort */
    }
  })();
  return hydrationPromise;
}

export const storage = {
  get length(): number {
    return memory.size;
  },
  getItem(key: string): string | null {
    return memory.has(key) ? (memory.get(key) ?? null) : null;
  },
  setItem(key: string, value: string): void {
    memory.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => {});
  },
  removeItem(key: string): void {
    memory.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
  clear(): void {
    memory.clear();
    AsyncStorage.clear().catch(() => {});
  },
};

// Polyfill so verbatim-ported code that references `localStorage`/`sessionStorage`
// keeps working without edits.
(globalThis as Record<string, unknown>).localStorage = storage;
(globalThis as Record<string, unknown>).sessionStorage = storage;
