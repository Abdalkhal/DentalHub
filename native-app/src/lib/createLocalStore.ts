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
  const listeners = new Set<() => void>();

  async function load(): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(key);
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
      await AsyncStorage.setItem(key, JSON.stringify(state));
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

  return { getSnapshot, getServerSnapshot, subscribe, useStore, set, reset };
}
