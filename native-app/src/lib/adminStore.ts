import { useSyncExternalStore } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import {
  BRANCHES as DEFAULT_BRANCHES,
  OFFICES as DEFAULT_OFFICES,
  type Branch,
  type Office,
} from "@/data/offices";
import { LABS as DEFAULT_LABS, type Lab } from "@/data/labs";

const KEY = "dh_admin_store_v2";
const FIRESTORE_DOC = "admin_config/singleton";

export type AdminState = {
  branches: Branch[];
  offices: Office[];
  labs: Lab[];
};

const DEFAULT_STATE: AdminState = {
  branches: DEFAULT_BRANCHES,
  offices: DEFAULT_OFFICES,
  labs: DEFAULT_LABS,
};

let state: AdminState = DEFAULT_STATE;
let _initialized = false;
let _unsubFirestore: (() => void) | null = null;
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function loadLocal(): AdminState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminState>;
    return {
      branches: parsed.branches ?? DEFAULT_STATE.branches,
      offices: parsed.offices ?? DEFAULT_STATE.offices,
      labs: parsed.labs ?? DEFAULT_STATE.labs,
    };
  } catch {
    return null;
  }
}

async function syncToFirestore(s: AdminState) {
  try {
    await setDoc(doc(db, FIRESTORE_DOC), s);
  } catch (err) {
    console.warn("Failed to sync admin config to Firestore:", err);
  }
}

let _syncTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSyncToFirestore(s: AdminState) {
  if (_syncTimeout) clearTimeout(_syncTimeout);
  _syncTimeout = setTimeout(() => syncToFirestore(s), 2000);
}

export function connectAdminStore() {
  if (_initialized) return;
  _initialized = true;

  const local = loadLocal();
  if (local) {
    state = local;
  }

  _unsubFirestore = onSnapshot(doc(db, FIRESTORE_DOC), (snap) => {
    if (snap.exists()) {
      const data = snap.data() as AdminState;
      state = {
        branches: data.branches ?? DEFAULT_STATE.branches,
        offices: data.offices ?? DEFAULT_STATE.offices,
        labs: data.labs ?? DEFAULT_STATE.labs,
      };
    }
    emit();
  }, (err) => {
    console.warn("Admin config Firestore listener error:", err);
  });

  const localStored = loadLocal();
  if (localStored && !state.branches.length && !state.offices.length && !state.labs.length) {
    state = localStored;
    debouncedSyncToFirestore(state);
  }
}

export function disconnectAdminStore() {
  if (_unsubFirestore) {
    _unsubFirestore();
    _unsubFirestore = null;
  }
  _initialized = false;
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function getSnapshot(): AdminState {
  return state;
}
export function getServerSnapshot(): AdminState {
  return DEFAULT_STATE;
}

export function useAdminStore(): AdminState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function resetAdminStore() {
  state = { ...DEFAULT_STATE };
  emit();
  syncToFirestore(state);
}

function setKey<K extends keyof AdminState>(key: K, value: AdminState[K]) {
  state = { ...state, [key]: value };
  emit();
  debouncedSyncToFirestore(state);
}

export const branchesApi = {
  add(b: Branch) {
    if (state.branches.some((x) => x.slug === b.slug)) return false;
    setKey("branches", [...state.branches, b]);
    return true;
  },
  update(slug: string, patch: Partial<Branch>) {
    setKey(
      "branches",
      state.branches.map((b) => (b.slug === slug ? { ...b, ...patch } : b)),
    );
  },
  remove(slug: string) {
    setKey(
      "branches",
      state.branches.filter((b) => b.slug !== slug),
    );
  },
};

export const officesApi = {
  add(o: Office) {
    if (state.offices.some((x) => x.id === o.id)) return false;
    setKey("offices", [...state.offices, o]);
    return true;
  },
  update(id: string, patch: Partial<Office>) {
    setKey(
      "offices",
      state.offices.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );
  },
  remove(id: string) {
    setKey(
      "offices",
      state.offices.filter((o) => o.id !== id),
    );
  },
};

export const labsApi = {
  add(l: Lab) {
    if (state.labs.some((x) => x.id === l.id)) return false;
    setKey("labs", [...state.labs, l]);
    return true;
  },
  update(id: string, patch: Partial<Lab>) {
    setKey(
      "labs",
      state.labs.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  },
  remove(id: string) {
    setKey(
      "labs",
      state.labs.filter((l) => l.id !== id),
    );
  },
};
