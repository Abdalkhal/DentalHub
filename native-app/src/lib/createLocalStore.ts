import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Updater<T> = (prev: T) => T;

export interface LocalStoreApi<T> {
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  subscribe: (cb: () => void) => () => void;
  useStore: () => T;
  set: (val: T | Updater<T>) => void;
  reset: () => void;
  /** Scope this store to a signed-in user, matching the pattern used by
   * setClinicStoreUser/setPatientStoreUser/setAppointmentsStoreUser: each
   * user gets their own AsyncStorage key instead of everyone on the device
   * sharing one. Call with "" (or skip entirely) to stay on the plain,
   * unscoped `key` — existing stores that never call this are unaffected. */
  setUser: (uid: string) => void;
}

/**
 * Drop-in replacement for the web `createLocalStore` (localStorage) using
 * AsyncStorage. Keeps the exact same synchronous API surface (`useStore`,
 * `set`, `reset`, `getSnapshot`, `subscribe`) so every existing `*Store.ts`
 * file ports verbatim.
 *
 * State is hydrated from AsyncStorage once, kept in memory synchronously for
 * `useSyncExternalStore`, and persisted asynchronously on every write.
 */
export function createLocalStore<T>(
  key: string,
  defaultValue: T,
  options?: { migrate?: (data: unknown) => T },
): LocalStoreApi<T> {
  let state: T = defaultValue;
  let initialized = false;
  let userId: string | null = null;
  const listeners = new Set<() => void>();

  function storageKey(): string {
    return userId ? `${key}:${userId}` : key;
  }

  async function load(): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(storageKey());
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw);
      if (options?.migrate) return options.migrate(parsed);
      if (Array.isArray(defaultValue)) {
        return (Array.isArray(parsed) ? parsed : defaultValue) as T;
      }
      return { ...defaultValue, ...parsed } as T;
    } catch {
      return defaultValue;
    }
  }

  async function persist() {
    try {
      await AsyncStorage.setItem(storageKey(), JSON.stringify(state));
    } catch {
      /* best effort */
    }
  }

  function emit() {
    persist();
    listeners.forEach((l) => l());
  }

  function hydrate() {
    if (initialized) return;
    initialized = true;
    load().then((s) => {
      state = s;
      listeners.forEach((l) => l());
    });
  }

  function getSnapshot(): T {
    hydrate();
    return state;
  }

  function getServerSnapshot(): T {
    return defaultValue;
  }

  function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  function useStore() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  }

  function set(val: T | Updater<T>) {
    hydrate();
    state = typeof val === "function" ? (val as Updater<T>)(state) : val;
    emit();
  }

  function reset() {
    state = defaultValue;
    initialized = true;
    emit();
  }

  function setUser(uid: string) {
    const next = uid || null;
    if (next === userId) return;
    userId = next;
    // Switch to the new user's own slice: drop whatever the previous user's
    // data was out of memory immediately (so a mounted useStore() never
    // shows it, even for the instant before the new key's data loads) and
    // re-hydrate from their AsyncStorage key.
    state = defaultValue;
    initialized = false;
    listeners.forEach((l) => l());
    hydrate();
  }

  return { getSnapshot, getServerSnapshot, subscribe, useStore, set, reset, setUser };
}
