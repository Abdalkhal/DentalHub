import { useSyncExternalStore } from "react";
import { setClinicStoreUser } from "./clinicStore";
import { setPatientStoreUser } from "./patientsStore";
import { setAppointmentsStoreUser } from "./appointmentsStore";

// A dentist can run more than one clinic under the same account. Every
// clinic-scoped store (this one's own list aside — clinicStore.ts's
// finance/orders/materials/doctors, patientsStore.ts, appointmentsStore.ts)
// is keyed by `{uid}:{clinicId}`, not just `{uid}`, so one clinic's data
// physically lives in a different storage entry than another's — switching
// the active clinic can't accidentally blend the two, because the code
// reading clinic A never even holds the key clinic B's data is stored under.

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

/** Runs once per account (on login / account switch): loads this account's
 *  clinic list, or — the first time this ships for an existing dentist —
 *  creates a first clinic and migrates any pre-existing un-scoped data into it. */
export function setClinicsStoreUser(uid: string) {
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
  pointStoresAt(currentUserId, clinic.id);
  return clinic;
}

export function updateClinic(id: string, patch: Partial<Omit<Clinic, "id">>) {
  state = { ...state, clinics: state.clinics.map((c) => (c.id === id ? { ...c, ...patch } : c)) };
  emit();
}

export function setActiveClinic(id: string) {
  if (id === state.activeClinicId || !state.clinics.some((c) => c.id === id)) return;
  state = { ...state, activeClinicId: id };
  emit();
  pointStoresAt(currentUserId, id);
}
