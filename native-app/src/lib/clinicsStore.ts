import { useSyncExternalStore } from "react";
import { setClinicStoreUser } from "./clinicStore";
import { onSnapshot, setDoc } from "firebase/firestore";
import { setPatientStoreUser, setPatientSyncReady } from "./patientsStore";
import { clinicsDoc } from "./dentistRecords";
import { setAppointmentsStoreUser } from "./appointmentsStore";

// A dentist can run more than one clinic under the same account. Every
// clinic-scoped store (this one's own list aside — clinicStore.ts's
// finance/orders/materials/doctors, patientsStore.ts, appointmentsStore.ts)
// is keyed by `{uid}:{clinicId}`, not just `{uid}`, so one clinic's data
// physically lives in a different storage entry than another's — switching
// the active clinic can't accidentally blend the two, because the code
// reading clinic A never even holds the key clinic B's data is stored under.
//
// Ported from the web app's identical `src/lib/clinicsStore.ts`.

export type Clinic = {
  id: string;
  name: string;
  address: string;
  workDays: string;
};

type ClinicsState = {
  clinics: Clinic[];
  activeClinicId: string;
};

const KEY_PREFIX = "dh_clinics_v1:";

// Pre-multi-clinic key prefixes (one flat blob per account, no clinic
// dimension). Migrated once per account into that account's first clinic
// the first time this ships, so an existing dentist's patients/appointments/
// finance/inventory don't silently vanish.
const LEGACY_PREFIXES = ["dh_clinic_v3:", "dh:patients:v1:", "dh_appointments_v1:"];

function defaultClinicName(): Clinic["name"] {
  return "العيادة الرئيسية";
}

let currentUserId = "";
let state: ClinicsState = { clinics: [], activeClinicId: "" };
const listeners = new Set<() => void>();

function getKey(uid: string) {
  return KEY_PREFIX + (uid || "guest");
}

function loadRaw(uid: string): ClinicsState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClinicsState;
    return parsed.clinics?.length ? parsed : null;
  } catch {
    return null;
  }
}

function save() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(currentUserId), JSON.stringify(state));
  } catch {}
}

function emit() {
  save();
  listeners.forEach((l) => l());
}

/** Moves one legacy un-scoped key's contents to its clinic-scoped key. Never
 *  deletes the legacy key (a harmless leftover is safer than risking data
 *  loss if anything here throws), and never overwrites a clinic-scoped key
 *  that already has data. */
function migrateLegacyKey(prefix: string, uid: string, clinicId: string) {
  if (typeof window === "undefined") return;
  try {
    const legacyKey = prefix + (uid || "guest");
    const raw = localStorage.getItem(legacyKey);
    if (raw == null) return;
    const newKey = `${prefix}${uid || "guest"}:${clinicId}`;
    if (localStorage.getItem(newKey) != null) return;
    localStorage.setItem(newKey, raw);
  } catch {}
}

/** The single place that re-points every clinic-scoped store at `clinicId` —
 *  called on account load and on every clinic switch, so none of them can
 *  ever be re-keyed independently and drift out of sync with each other. */
function pointStoresAt(uid: string, clinicId: string) {
  setClinicStoreUser(uid, clinicId);
  setPatientStoreUser(uid, clinicId);
  setAppointmentsStoreUser(uid, clinicId);
}

/* ── Cloud sync of the clinic list ─────────────────────────────
 * Clinic ids used to be random per device, so the "same" clinic had a
 * different id on the phone and on the web and their records could never
 * meet. The list now lives at dentist_records/{uid} too. On a device's first
 * sync, a local clinic with the same name as an account clinic (typically
 * both "العيادة الرئيسية") is merged into it: its local data is copied to
 * the account clinic's id. Patient sync waits until that has happened. */

let unsubscribeClinics: (() => void) | null = null;
const PATIENTS_PREFIX = "dh:patients:v1:";
const firstSyncKey = (uid: string) => `dh_clinics_synced:${uid}`;

function pushClinics() {
  if (!currentUserId) return;
  setDoc(clinicsDoc(currentUserId), { clinics: state.clinics }, { merge: true }).catch((err) =>
    console.warn("Clinic list not synced yet:", err),
  );
}

/** Copies one clinic's local data to another clinic id. Never deletes the
 *  source; never overwrites existing target data except patients, which are
 *  merged by id (the newer copy of each wins). */
function copyLocalClinicData(uid: string, fromId: string, toId: string) {
  for (const prefix of LEGACY_PREFIXES) {
    try {
      const from = `${prefix}${uid}:${fromId}`;
      const to = `${prefix}${uid}:${toId}`;
      const raw = localStorage.getItem(from);
      if (raw == null) continue;
      const existing = localStorage.getItem(to);
      if (existing == null) {
        localStorage.setItem(to, raw);
      } else if (prefix === PATIENTS_PREFIX) {
        type P = { id: string; updatedAt?: number };
        const merged = new Map<string, P>((JSON.parse(existing) as P[]).map((p) => [p.id, p]));
        for (const p of JSON.parse(raw) as P[]) {
          const cur = merged.get(p.id);
          if (!cur || (p.updatedAt ?? 0) > (cur.updatedAt ?? 0)) merged.set(p.id, p);
        }
        localStorage.setItem(to, JSON.stringify([...merged.values()]));
      }
    } catch {
      /* leave the source untouched; nothing is lost */
    }
  }
}

function watchClinics(uid: string) {
  unsubscribeClinics?.();
  unsubscribeClinics = null;
  if (!uid || typeof window === "undefined") return;
  try {
    unsubscribeClinics = onSnapshot(
      clinicsDoc(uid),
      (snap) => {
        if (uid !== currentUserId) return;
        // Don't decide anything from an empty offline cache — wait for the server.
        if (!snap.exists() && snap.metadata.fromCache) return;
        const remote = ((snap.data()?.clinics as Clinic[] | undefined) ?? []).filter((c) => c?.id);
        const firstSync = localStorage.getItem(firstSyncKey(uid)) == null;
        const merged = [...remote];
        const remap = new Map<string, string>();
        for (const c of state.clinics) {
          if (merged.some((r) => r.id === c.id)) continue;
          const sameName = firstSync ? remote.find((r) => r.name.trim() === c.name.trim()) : undefined;
          if (sameName) remap.set(c.id, sameName.id);
          else merged.push(c);
        }
        for (const [from, to] of remap) copyLocalClinicData(uid, from, to);
        try {
          localStorage.setItem(firstSyncKey(uid), "1");
        } catch {
          /* retried next launch */
        }

        const wanted = remap.get(state.activeClinicId) ?? state.activeClinicId;
        const activeClinicId = merged.some((c) => c.id === wanted) ? wanted : (merged[0]?.id ?? wanted);
        const activeChanged = activeClinicId !== state.activeClinicId;
        state = { clinics: merged, activeClinicId };
        emit();
        if (merged.some((c) => !remote.some((r) => r.id === c.id))) pushClinics();
        if (activeChanged) pointStoresAt(uid, activeClinicId);
        setPatientSyncReady(true);
      },
      (err) => console.warn("Clinic list sync error:", err),
    );
  } catch (err) {
    console.warn("Clinic list sync not started:", err);
  }
}

/** Runs once per account (on login / account switch, and defensively on
 *  every clinic screen's mount): loads this account's clinic list, or — the
 *  first time this ships for an existing dentist — creates a first clinic
 *  and migrates any pre-existing un-scoped data into it. Cheap no-op if the
 *  account and active clinic haven't changed since the last call. */
export function setClinicsStoreUser(uid: string) {
  const switched = uid !== currentUserId || !unsubscribeClinics;
  if (!switched && state.clinics.length > 0) return;
  if (switched) setPatientSyncReady(false);
  currentUserId = uid;
  const existing = loadRaw(uid);

  if (existing) {
    state = existing.clinics.some((c) => c.id === existing.activeClinicId)
      ? existing
      : { ...existing, activeClinicId: existing.clinics[0].id };
  } else {
    const clinicId = crypto.randomUUID();
    for (const prefix of LEGACY_PREFIXES) migrateLegacyKey(prefix, uid, clinicId);
    state = {
      clinics: [{ id: clinicId, name: defaultClinicName(), address: "", workDays: "" }],
      activeClinicId: clinicId,
    };
    save();
  }

  pointStoresAt(uid, state.activeClinicId);
  listeners.forEach((l) => l());
  // After the local list is loaded — the merge reads it.
  if (switched) watchClinics(uid);
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function getSnapshot(): ClinicsState {
  return state;
}
function getServerSnapshot(): ClinicsState {
  return { clinics: [], activeClinicId: "" };
}

export function useClinics(): ClinicsState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addClinic(input: Omit<Clinic, "id">): Clinic {
  const clinic: Clinic = { ...input, id: crypto.randomUUID() };
  state = { clinics: [...state.clinics, clinic], activeClinicId: clinic.id };
  emit();
  pushClinics();
  pointStoresAt(currentUserId, clinic.id);
  return clinic;
}

export function updateClinic(id: string, patch: Partial<Omit<Clinic, "id">>) {
  state = { ...state, clinics: state.clinics.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
  emit();
  pushClinics();
}

export function setActiveClinic(id: string) {
  if (id === state.activeClinicId || !state.clinics.some((c) => c.id === id)) return;
  state = { ...state, activeClinicId: id };
  emit();
  pointStoresAt(currentUserId, id);
}
