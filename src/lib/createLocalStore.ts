import { useSyncExternalStore } from "react";

type Updater<T> = (prev: T) => T;

export interface LocalStoreApi<T> {
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  subscribe: (cb: () => void) => () => void;
  useStore: () => T;
  set: (val: T | Updater<T>) => void;
  reset: () => void;
  /** Scope the store to a signed-in user (own `key:uid` slot). "" = unscoped. */
  setUser: (uid: string) => void;
}

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

  function load(): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      let raw = localStorage.getItem(storageKey());
      // Data saved before per-user scoping lives under the bare key. The
      // first account to sign in on this browser claims it once, so an
      // existing user doesn't lose it — and it can't then leak to others.
      if (!raw && userId) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          localStorage.setItem(storageKey(), legacy);
          localStorage.removeItem(key);
          raw = legacy;
        }
      }
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

  function persist() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey(), JSON.stringify(state));
    } catch {}
  }

  function emit() {
    persist();
    listeners.forEach((l) => l());
  }

  function getSnapshot(): T {
    if (!initialized && typeof window !== "undefined") {
      state = load();
      initialized = true;
    }
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
    if (!initialized && typeof window !== "undefined") {
      state = load();
      initialized = true;
    }
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
    state = typeof window === "undefined" ? defaultValue : load();
    initialized = typeof window !== "undefined";
    listeners.forEach((l) => l());
  }

  return { getSnapshot, getServerSnapshot, subscribe, useStore, set, reset, setUser };
}
