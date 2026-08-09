import { useSyncExternalStore } from "react";

type Updater<T> = (prev: T) => T;

export interface LocalStoreApi<T> {
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  subscribe: (cb: () => void) => () => void;
  useStore: () => T;
  set: (val: T | Updater<T>) => void;
  reset: () => void;
}

export function createLocalStore<T>(
  key: string,
  defaultValue: T,
  options?: { migrate?: (data: unknown) => T },
): LocalStoreApi<T> {
  let state: T = defaultValue;
  let initialized = false;
  const listeners = new Set<() => void>();

  function load(): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return defaultValue;
      const parsed = JSON.parse(raw);
      if (options?.migrate) return options.migrate(parsed);
      return { ...defaultValue, ...parsed } as T;
    } catch {
      return defaultValue;
    }
  }

  function persist() {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
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

  return { getSnapshot, getServerSnapshot, subscribe, useStore, set, reset };
}
