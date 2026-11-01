// Appointments store. Identical in the web app and the native app
// (src/lib/appointmentsStore.ts). Local storage is the instant, offline cache
// the UI reads; for a signed-in dentist every change is also synced to
// Firestore (dentist_records/{uid}/appointments/{id}), so the calendar is the
// same on the phone, the web and the iPad — and the public booking page
// (see booking.ts) can tell which times are already taken.
import { useSyncExternalStore } from "react";
import { onSnapshot, query, setDoc, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { appointmentDoc, appointmentsCol, toFirestore } from "./dentistRecords";

export type AppointmentStatus = "confirmed" | "waiting" | "cancelled" | "completed";

export type Appointment = {
  id: string;
  patientName: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  appointmentType: string;
  clinicRoom: string;
  doctor: string;
  treatment: string;
  notes: string;
  reminder: boolean;
  status?: AppointmentStatus;
  createdAt: string;
  // Set when the appointment came from the public booking link.
  source?: "booking";
  bookingRequestId?: string;
  patientId?: string;
  // Last local change (ms) — the newer side wins when syncing.
  updatedAt?: number;
};

const KEY_PREFIX = "dh_appointments_v1:";
let currentUserId = "";
let currentClinicId = "";
let state: Appointment[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function keyFor(uid: string, clinicId: string) {
  return KEY_PREFIX + (uid || "guest") + ":" + (clinicId || "default");
}

function getKey() {
  return keyFor(currentUserId, currentClinicId);
}

function load(key = getKey()): Appointment[] {
  if (typeof window === "undefined") return [];
  try {
    const r = localStorage.getItem(key);
    return r ? (JSON.parse(r) as Appointment[]) : [];
  } catch {
    return [];
  }
}

function ensure() {
  if (!loaded && typeof window !== "undefined") {
    state = load();
    loaded = true;
  }
}

function saveLocal() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(), JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

// Keyed by clinic, not just account — see patientsStore.ts's setPatientStoreUser
// for why. Called by clinicsStore.ts's `pointStoresAt` whenever the active
// clinic changes, not just on sign-in.
export function setAppointmentsStoreUser(uid: string, clinicId: string) {
  if (uid === currentUserId && clinicId === currentClinicId && loaded) return;
  flushPushes();
  currentUserId = uid;
  currentClinicId = clinicId;
  loaded = false;
  state = [];
  startSync();
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (e) => {
    if (e.key === getKey() && e.newValue) {
      try {
        state = JSON.parse(e.newValue) as Appointment[];
        loaded = true;
        listeners.forEach((l) => l());
      } catch {}
    }
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): Appointment[] {
  ensure();
  return state;
}

const EMPTY: Appointment[] = [];

export function useAppointments(): Appointment[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

export function getAppointments(): Appointment[] {
  ensure();
  return state;
}

/** The clinic the store currently points at (for the booking inbox). */
export function getAppointmentsClinicId(): string {
  return currentClinicId;
}

function normalizeDate(d: string): string {
  return (d || "").slice(0, 10);
}

export function addAppointment(input: Omit<Appointment, "id" | "createdAt">): Appointment {
  ensure();
  const appt: Appointment = {
    ...input,
    date: normalizeDate(input.date),
    id: `a_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: Date.now(),
  };
  state = [appt, ...state];
  saveLocal();
  schedulePush(appt.id);
  return appt;
}

export function updateAppointment(id: string, patch: Partial<Omit<Appointment, "id">>) {
  ensure();
  state = state.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a));
  saveLocal();
  schedulePush(id);
}

export function removeAppointment(id: string) {
  ensure();
  state = state.filter((a) => a.id !== id);
  saveLocal();
  pushDelete(id);
}

/* ── Cloud sync ─────────────────────────────────────────────────
 * Same scheme as patientsStore.ts: per appointment the newer `updatedAt`
 * wins, a delete leaves a tombstone remotely and in a local "deleted" list,
 * and nothing is uploaded until clinicsStore has reconciled the clinic ids. */

type RemoteAppointment = Appointment & { clinicId?: string; deleted?: boolean };

const PUSH_DELAY_MS = 800;
const RETRY_DELAYS_MS = [15_000, 60_000, 5 * 60_000, 15 * 60_000];
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
const retryCounts = new Map<string, number>();
let unsubscribeRemote: (() => void) | null = null;
let syncReady = false;

const syncEnabled = () => !!currentUserId && syncReady && typeof window !== "undefined";
const pushKey = (uid: string, clinicId: string, id: string) => `${uid}|${clinicId}|${id}`;
const deletedKey = (uid: string, clinicId: string) => `${keyFor(uid, clinicId)}:deleted`;

export function setAppointmentSyncReady(ready: boolean) {
  const was = syncReady;
  syncReady = ready;
  if (ready && !was) startSync();
  if (!ready) {
    unsubscribeRemote?.();
    unsubscribeRemote = null;
  }
}

/** Re-reads the cloud copy and re-sends what is missing there (foreground). */
export function resyncAppointments() {
  if (!syncEnabled()) return;
  retryCounts.clear();
  startSync();
}

function readDeleted(uid: string, clinicId: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(deletedKey(uid, clinicId)) || "{}") as Record<
      string,
      number
    >;
  } catch {
    return {};
  }
}

function markDeleted(uid: string, clinicId: string, id: string, at: number) {
  try {
    localStorage.setItem(
      deletedKey(uid, clinicId),
      JSON.stringify({ ...readDeleted(uid, clinicId), [id]: at }),
    );
  } catch {}
}

function readAppointment(uid: string, clinicId: string, id: string): Appointment | undefined {
  if (uid === currentUserId && clinicId === currentClinicId) {
    ensure();
    return state.find((a) => a.id === id);
  }
  return load(keyFor(uid, clinicId)).find((a) => a.id === id);
}

function schedulePush(id: string) {
  if (!syncEnabled() || !currentClinicId) return;
  const uid = currentUserId;
  const clinicId = currentClinicId;
  const key = pushKey(uid, clinicId, id);
  const prev = pushTimers.get(key);
  if (prev) clearTimeout(prev);
  pushTimers.set(
    key,
    setTimeout(() => {
      pushTimers.delete(key);
      void pushAppointment(uid, clinicId, id);
    }, PUSH_DELAY_MS),
  );
}

function flushPushes() {
  for (const [key, timer] of pushTimers) {
    clearTimeout(timer);
    const [uid, clinicId, id] = key.split("|");
    void pushAppointment(uid, clinicId, id);
  }
  pushTimers.clear();
}

async function pushAppointment(uid: string, clinicId: string, id: string) {
  const a = readAppointment(uid, clinicId, id);
  if (!a) return;
  try {
    await setDoc(appointmentDoc(uid, id), toFirestore({ ...a, clinicId, deleted: false }));
    retryCounts.delete(pushKey(uid, clinicId, id));
  } catch (err) {
    console.warn("Appointment not synced yet:", id, err);
    const key = pushKey(uid, clinicId, id);
    const n = retryCounts.get(key) ?? 0;
    if (n >= RETRY_DELAYS_MS.length) return; // the next launch / foreground tries again
    retryCounts.set(key, n + 1);
    setTimeout(() => {
      if (uid === currentUserId && syncReady) void pushAppointment(uid, clinicId, id);
    }, RETRY_DELAYS_MS[n]);
  }
}

function pushDelete(id: string) {
  if (!currentUserId || !currentClinicId || typeof window === "undefined") return;
  const uid = currentUserId;
  const clinicId = currentClinicId;
  const at = Date.now();
  const key = pushKey(uid, clinicId, id);
  const timer = pushTimers.get(key);
  if (timer) clearTimeout(timer);
  pushTimers.delete(key);
  markDeleted(uid, clinicId, id, at);
  if (!syncEnabled()) return;
  setDoc(appointmentDoc(uid, id), { id, clinicId, deleted: true, updatedAt: at }).catch((err) =>
    console.warn("Appointment delete not synced yet:", id, err),
  );
}

function mergeRemote(docs: QueryDocumentSnapshot[], complete: boolean) {
  ensure();
  const deletedHere = readDeleted(currentUserId, currentClinicId);
  const byId = new Map(state.map((a) => [a.id, a] as const));
  const seen = new Set<string>();
  const toPush: string[] = [];
  const tombstones: string[] = [];
  let changed = false;

  for (const d of docs) {
    const { clinicId: _clinic, deleted, ...remote } = d.data() as RemoteAppointment;
    const id = d.id;
    seen.add(id);
    const local = byId.get(id);
    const rTime = remote.updatedAt ?? 0;
    const lTime = local?.updatedAt ?? 0;
    if (deleted) {
      if (local && lTime <= rTime) {
        byId.delete(id);
        changed = true;
      } else if (local) toPush.push(id);
      continue;
    }
    if (!local) {
      if ((deletedHere[id] ?? 0) >= rTime) tombstones.push(id);
      else {
        byId.set(id, { ...(remote as Appointment), id });
        changed = true;
      }
    } else if (rTime > lTime) {
      byId.set(id, { ...(remote as Appointment), id });
      changed = true;
    } else if (lTime > rTime) toPush.push(id);
  }
  if (complete) for (const id of byId.keys()) if (!seen.has(id)) toPush.push(id);

  if (changed) {
    state = [...byId.values()].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    saveLocal();
  }
  for (const id of toPush) schedulePush(id);
  for (const id of tombstones) pushDelete(id);
}

function startSync() {
  unsubscribeRemote?.();
  unsubscribeRemote = null;
  if (!syncEnabled() || !currentClinicId) return;
  const uid = currentUserId;
  const clinicId = currentClinicId;
  try {
    unsubscribeRemote = onSnapshot(
      query(appointmentsCol(uid), where("clinicId", "==", clinicId)),
      { includeMetadataChanges: true },
      (snap) => {
        if (uid !== currentUserId || clinicId !== currentClinicId) return;
        if (snap.metadata.hasPendingWrites) return;
        mergeRemote(snap.docs, !snap.metadata.fromCache);
      },
      (err) => console.warn("Appointments sync listener error:", err),
    );
  } catch (err) {
    console.warn("Appointments sync not started:", err);
  }
}

if (
  typeof document !== "undefined" &&
  typeof window !== "undefined" &&
  typeof document.addEventListener === "function"
) {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resyncAppointments();
  });
  window.addEventListener("online", () => resyncAppointments());
}
