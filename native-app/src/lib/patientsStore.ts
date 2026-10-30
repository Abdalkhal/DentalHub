// Patients store for the Dentist dashboard. Local storage is the instant,
// offline-capable cache the UI reads; for a signed-in dentist every change is
// also synced to Firestore (see the "Cloud sync" section at the end and
// dentistRecords.ts), so the same records appear on the phone and the web.
import { useSyncExternalStore } from "react";
import { onSnapshot, query, setDoc, where, type QueryDocumentSnapshot } from "firebase/firestore";
import {
  deletePatientFile,
  patientDoc,
  patientFilePath,
  patientsCol,
  toFirestore,
  uploadDataUrl,
} from "./dentistRecords";

export type Gender = "male" | "female";
export type PatientStatus = "in_treatment" | "completed" | "new";

export type MedicalHistory = {
  diabetes: boolean;
  hypertension: boolean;
  heart: boolean;
  allergy: boolean;
  bleeding: boolean;
};

export type ToothStatus =
  | "healthy"
  | "caries"
  | "filled"
  | "crown"
  | "missing"
  | "implant"
  | "rct"
  | "bridge"
  | "unerupted";

export type PlanStatus = "done" | "active" | "planned";

export type PlanStep = {
  id: string;
  title: string;
  status: PlanStatus;
  dept?: string;
  tooth?: string;
  cost?: number;
  // Chosen per step; older steps have none — see planCurrency().
  currency?: "USD" | "IQD";
  note?: string;
};

export type HistoryEntry = {
  id: string;
  date: string;
  text: string;
};

export type Visit = {
  id: string;
  date: string;
  procedure: string;
  note?: string;
  upcoming?: boolean;
  time?: string;
  status?: "confirmed" | "waiting" | "cancelled" | "completed";
  appointmentType?: string;
  room?: string;
  doctor?: string;
  reminder?: boolean;
};

export type PatientFile = {
  id: string;
  name: string;
  // Storage path (synced). Files added before cloud sync, or by a guest,
  // carry an inline `dataUrl` instead until they are uploaded.
  path?: string;
  dataUrl?: string;
  type: string;
  addedAt: string;
};

export type Payment = {
  id: string;
  date: string;
  amount: number;
  note?: string;
};

export type Patient = {
  id: string;
  fileNo: string;
  name: string;
  age: number | "";
  gender: Gender;
  phone: string;
  history: MedicalHistory;
  complaint: string;
  status: PatientStatus;
  lastVisit: string;
  createdAt: string;
  teeth: Record<number, ToothStatus>;
  visits: Visit[];
  files: PatientFile[];
  totalFees: number;
  payments: Payment[];
  feeCurrency?: "USD" | "IQD";
  dob?: string;
  avatar?: string;
  branch?: string;
  doctorName?: string;
  doctorNote?: string;
  doctorNoteDate?: string;
  allergies?: string;
  meds?: string;
  notes?: string;
  plan?: PlanStep[];
  log?: HistoryEntry[];
  // Last local change (ms) — the newer side wins when syncing.
  updatedAt?: number;
};

export const EMPTY_HISTORY: MedicalHistory = {
  diabetes: false,
  hypertension: false,
  heart: false,
  allergy: false,
  bleeding: false,
};

const KEY_PREFIX = "dh:patients:v1:";

let currentUserId = "";
let currentClinicId = "";
let state: Patient[] = [];
let loaded = false;
const listeners = new Set<() => void>();

// Keyed by clinic, not just account — a dentist working across several
// clinics (see clinicsStore.ts) must never see one clinic's patients bleed
// into another's. Called by clinicsStore.ts's `pointStoresAt` every time
// the active clinic changes, not just on sign-in.
export function setPatientStoreUser(uid: string, clinicId: string) {
  // The web app re-runs this on every page mount; resetting (and restarting
  // the cloud listener) when nothing changed only threw the cache away.
  if (uid === currentUserId && clinicId === currentClinicId && loaded) return;
  flushPushes();
  currentUserId = uid;
  currentClinicId = clinicId;
  loaded = false;
  state = [];
  startSync();
  listeners.forEach((l) => l());
}

function keyFor(uid: string, clinicId: string) {
  return KEY_PREFIX + (uid || "guest") + ":" + (clinicId || "default");
}

function getKey() {
  return keyFor(currentUserId, currentClinicId);
}

function load(key = getKey()): Patient[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]") as Patient[];
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

/** Writes the local cache and re-renders. Never throws: a full browser
 *  storage (quota) used to crash the page and lose the edit. */
function saveLocal() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getKey(), JSON.stringify(state));
  } catch (err) {
    console.warn("Patients cache not saved locally (storage full?):", err);
  }
  listeners.forEach((l) => l());
}

/** Local save + queue the changed patient(s) for the cloud. */
function persist(changedIds: string[] = []) {
  saveLocal();
  for (const id of changedIds) schedulePush(id);
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getPatients(): Patient[] {
  ensure();
  return state;
}

export function usePatients(): Patient[] {
  return useSyncExternalStore(subscribe, getPatients, () => [] as Patient[]);
}

export function getPatient(id: string): Patient | undefined {
  return getPatients().find((p) => p.id === id);
}

function nextFileNo(): string {
  const nums = getPatients()
    .map((p) => Number(p.fileNo.replace(/\D/g, "")))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 100;
  return `PAT-${max + 1}`;
}

export type PatientInput = Pick<Patient, "name" | "age" | "gender" | "phone" | "history" | "complaint" | "status">;

export function addPatient(input: PatientInput): Patient {
  ensure();
  const now = new Date().toISOString();
  const p: Patient = {
    id: `p_${Date.now().toString(36)}`,
    fileNo: nextFileNo(),
    createdAt: now,
    lastVisit: now.slice(0, 10),
    teeth: {},
    visits: [],
    files: [],
    totalFees: 0,
    payments: [],
    ...input,
    updatedAt: Date.now(),
  };
  state = [p, ...state];
  persist([p.id]);
  return p;
}

export function findOrCreatePatient(name: string, phone: string): Patient {
  const cleanName = name.trim();
  const cleanPhone = phone.replace(/\D/g, "");
  const existing = getPatients().find((p) => {
    const pPhone = (p.phone || "").replace(/\D/g, "");
    if (cleanPhone && pPhone && pPhone === cleanPhone) return true;
    if (cleanName && p.name.trim().toLowerCase() === cleanName.toLowerCase()) return true;
    return false;
  });
  if (existing) return existing;
  return addPatient({
    name: cleanName,
    age: "",
    gender: "male",
    phone: cleanPhone,
    history: EMPTY_HISTORY,
    complaint: "",
    status: "new",
  });
}

export function updatePatient(id: string, patch: Partial<Patient>) {
  ensure();
  state = state.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p));
  persist([id]);
}

export function removePatient(id: string) {
  ensure();
  const gone = state.find((p) => p.id === id);
  state = state.filter((p) => p.id !== id);
  persist();
  if (gone) pushDelete(gone);
}

export function setTooth(id: string, tooth: number, status: ToothStatus) {
  const p = getPatient(id);
  if (!p) return;
  const teeth = { ...p.teeth };
  if (status === "healthy") delete teeth[tooth];
  else teeth[tooth] = status;
  updatePatient(id, { teeth });
}

export function addVisit(id: string, v: Omit<Visit, "id">) {
  const p = getPatient(id);
  if (!p) return;
  const visit: Visit = { id: `v_${Date.now().toString(36)}`, ...v };
  updatePatient(id, {
    visits: [visit, ...p.visits],
    lastVisit: v.upcoming ? p.lastVisit : v.date,
  });
}

export function removeVisit(id: string, visitId: string) {
  const p = getPatient(id);
  if (!p) return;
  updatePatient(id, { visits: p.visits.filter((v) => v.id !== visitId) });
}

/** `f.id` may be pre-chosen so it matches the file's Storage path. */
export function addFile(id: string, f: Omit<PatientFile, "id" | "addedAt"> & { id?: string }) {
  const p = getPatient(id);
  if (!p) return;
  updatePatient(id, {
    files: [{ ...f, id: f.id ?? newFileId(), addedAt: new Date().toISOString() }, ...p.files],
  });
}

export function newFileId(): string {
  return `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function removeFile(id: string, fileId: string) {
  const p = getPatient(id);
  if (!p) return;
  const file = p.files.find((f) => f.id === fileId);
  updatePatient(id, { files: p.files.filter((f) => f.id !== fileId) });
  if (file?.path) void deletePatientFile(file.path);
}

export function addPayment(id: string, pay: Omit<Payment, "id">) {
  const p = getPatient(id);
  if (!p) return;
  updatePatient(id, { payments: [{ id: `pay_${Date.now().toString(36)}`, ...pay }, ...p.payments] });
}

export function removePayment(id: string, payId: string) {
  const p = getPatient(id);
  if (!p) return;
  updatePatient(id, { payments: p.payments.filter((x) => x.id !== payId) });
}

export function paidTotal(p: Patient) {
  return p.payments.reduce((s, x) => s + (Number(x.amount) || 0), 0);
}

// ---- Treatment plan ----
export function getPlan(p: Patient): PlanStep[] {
  return p.plan ?? [];
}

export function addPlanStep(id: string, title: string, extra?: Partial<Omit<PlanStep, "id" | "title" | "status">>) {
  const p = getPatient(id);
  if (!p || !title.trim()) return;
  const step: PlanStep = { id: `pl_${Date.now().toString(36)}`, title: title.trim(), status: "planned", ...extra };
  updatePatient(id, { plan: [...getPlan(p), step] });
}

export function updatePlanStep(id: string, stepId: string, patch: Partial<PlanStep>) {
  const p = getPatient(id);
  if (!p) return;
  updatePatient(id, { plan: getPlan(p).map((s) => (s.id === stepId ? { ...s, ...patch } : s)) });
}

export function cyclePlanStep(id: string, stepId: string) {
  const p = getPatient(id);
  if (!p) return;
  const next: Record<PlanStatus, PlanStatus> = { planned: "active", active: "done", done: "planned" };
  updatePatient(id, { plan: getPlan(p).map((s) => (s.id === stepId ? { ...s, status: next[s.status] } : s)) });
}

export function removePlanStep(id: string, stepId: string) {
  const p = getPatient(id);
  if (!p) return;
  updatePatient(id, { plan: getPlan(p).filter((s) => s.id !== stepId) });
}

// ---- Medical history log ----
export function getLog(p: Patient): HistoryEntry[] {
  return p.log ?? [];
}

export function addLogEntry(id: string, entry: Omit<HistoryEntry, "id">) {
  const p = getPatient(id);
  if (!p || !entry.text.trim()) return;
  updatePatient(id, { log: [{ id: `lg_${Date.now().toString(36)}`, ...entry }, ...getLog(p)] });
}

export function removeLogEntry(id: string, entryId: string) {
  const p = getPatient(id);
  if (!p) return;
  updatePatient(id, { log: getLog(p).filter((e) => e.id !== entryId) });
}

/* ── Money (treatment plan costs) ───────────────────────────── */

export type FeeCurrency = "USD" | "IQD";

/**
 * Currency of a plan step. Steps saved before a currency could be chosen
 * have none — they used to render as "$" regardless of what the doctor
 * meant, so they fall back to the patient's fee currency, then IQD.
 */
export function planCurrency(p: Patient, s?: PlanStep): FeeCurrency {
  return s?.currency ?? p.feeCurrency ?? "IQD";
}

/** "25,000 د.ع" / "$1,250.5" — always Western digits with thousands commas. */
export function formatMoney(n: number, cur: FeeCurrency): string {
  const v = (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: cur === "IQD" ? 0 : 2 });
  return cur === "IQD" ? `${v} د.ع` : `$${v}`;
}

/** Per-currency sums, rendered as e.g. "$120 + 50,000 د.ع" (empty when zero). */
export function formatMoneyTotals(steps: PlanStep[], p: Patient): string {
  const sums: Record<FeeCurrency, number> = { USD: 0, IQD: 0 };
  for (const s of steps) sums[planCurrency(p, s)] += Number(s.cost) || 0;
  return (["USD", "IQD"] as const)
    .filter((c) => sums[c] > 0)
    .map((c) => formatMoney(sums[c], c))
    .join(" + ");
}

/**
 * Live-formats a typed amount with thousands commas. Accepts Arabic-Indic
 * digits (an Arabic keyboard may send them); IQD is whole dinars, USD keeps
 * up to two decimals.
 */
export function formatAmountInput(raw: string, cur: FeeCurrency): string {
  const latin = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/[٫]/g, ".");
  const cleaned = latin.replace(/[^\d.]/g, "");
  const [intPart, ...rest] = cleaned.split(".");
  const int = intPart.replace(/^0+(?=\d)/, "");
  const grouped = int ? Number(int).toLocaleString("en-US") : rest.length && cur === "USD" ? "0" : "";
  if (cur === "IQD" || rest.length === 0) return grouped;
  return `${grouped}.${rest.join("").slice(0, 2)}`;
}

/** Inverse of formatAmountInput; undefined for an empty field. */
export function parseAmountInput(text: string): number | undefined {
  const n = Number(text.replace(/,/g, ""));
  return text.trim() === "" || !Number.isFinite(n) ? undefined : n;
}

/* ── Tooth numbers (FDI) ───────────────────────────────────── */

/** FDI code: permanent 11–18…41–48, primary 51–55…81–85. */
export function isValidFdiTooth(code: string): boolean {
  const m = /^([1-8])([1-8])$/.exec(code);
  if (!m) return false;
  const q = Number(m[1]);
  const t = Number(m[2]);
  return q <= 4 ? t <= 8 : t <= 5;
}

/**
 * Normalises a typed tooth field ("11, 12" / "١١ ١٢") to "11, 12". Returns
 * `ok: false` when any entry isn't a valid FDI code; an empty field is ok.
 */
export function parseToothList(raw: string): { value: string; ok: boolean } {
  const latin = raw.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const parts = latin.split(/[\s,،]+/).filter(Boolean);
  return { value: parts.join(", "), ok: parts.every(isValidFdiTooth) };
}

/** Sum of the whole treatment plan, per currency. */
export function planTotals(p: Patient): Record<FeeCurrency, number> {
  const sums: Record<FeeCurrency, number> = { USD: 0, IQD: 0 };
  for (const s of getPlan(p)) sums[planCurrency(p, s)] += Number(s.cost) || 0;
  return sums;
}

/* ── Cloud sync ─────────────────────────────────────────────────
 * Local storage stays the instant, offline cache; Firestore is the shared
 * copy. Per patient, the newer `updatedAt` wins. A deleted patient leaves a
 * tombstone (`deleted: true`) remotely and an entry in a local "deleted"
 * list, so neither side resurrects it from a stale copy. */

type RemotePatient = Patient & { clinicId?: string; deleted?: boolean };

const PUSH_DELAY_MS = 800; // typing in a note must not be one write per key
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
let unsubscribeRemote: (() => void) | null = null;
// Off until clinicsStore has reconciled this account's clinic list with the
// cloud: on a device's first sync its local clinic may be merged into the
// account's existing one, and patients must not be uploaded under the old id.
let syncReady = false;

const syncEnabled = (uid = currentUserId) => !!uid && syncReady && typeof window !== "undefined";

export function setPatientSyncReady(ready: boolean) {
  const was = syncReady;
  syncReady = ready;
  if (ready && !was) startSync();
  if (!ready) {
    unsubscribeRemote?.();
    unsubscribeRemote = null;
    for (const id of [...failing.keys()]) setFailing(id); // signed out / switched account
  }
}
const pushKey = (uid: string, clinicId: string, id: string) => `${uid}|${clinicId}|${id}`;
const deletedKey = (uid: string, clinicId: string) => `${keyFor(uid, clinicId)}:deleted`;

function readDeleted(uid: string, clinicId: string): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(deletedKey(uid, clinicId)) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function markDeleted(uid: string, clinicId: string, id: string, at: number) {
  try {
    localStorage.setItem(deletedKey(uid, clinicId), JSON.stringify({ ...readDeleted(uid, clinicId), [id]: at }));
  } catch {
    /* best effort */
  }
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
      void pushPatient(uid, clinicId, id);
    }, PUSH_DELAY_MS),
  );
}

/** Sends every queued change now — before the account or clinic switches. */
function flushPushes() {
  for (const [key, timer] of pushTimers) {
    clearTimeout(timer);
    const [uid, clinicId, id] = key.split("|");
    void pushPatient(uid, clinicId, id);
  }
  pushTimers.clear();
}

function readPatient(uid: string, clinicId: string, id: string): Patient | undefined {
  if (uid === currentUserId && clinicId === currentClinicId) {
    ensure();
    return state.find((p) => p.id === id);
  }
  return load(keyFor(uid, clinicId)).find((p) => p.id === id);
}

/** Records Storage paths for files that were uploaded, without touching any
 *  other field (the doctor may have kept editing while the upload ran). */
function applyUploadedPaths(uid: string, clinicId: string, patientId: string, paths: Map<string, string>) {
  const patch = (p: Patient): Patient =>
    p.id !== patientId
      ? p
      : {
          ...p,
          files: p.files.map((f) => {
            const path = paths.get(f.id);
            if (!path) return f;
            const { dataUrl: _inline, ...rest } = f;
            return { ...rest, path };
          }),
        };
  if (uid === currentUserId && clinicId === currentClinicId) {
    state = state.map(patch);
    saveLocal();
    return;
  }
  try {
    localStorage.setItem(keyFor(uid, clinicId), JSON.stringify(load(keyFor(uid, clinicId)).map(patch)));
  } catch {
    /* the next sync retries */
  }
}

/** Legacy files were stored inline as `data:` URLs — too big for Firestore
 *  (1 MB per document) and the reason the browser storage filled up. They
 *  are moved to Storage before the record is synced. */
async function uploadInlineFiles(uid: string, clinicId: string, p: Patient): Promise<Patient> {
  const inline = p.files.filter((f) => f.dataUrl && !f.path);
  if (inline.length === 0) return p;
  const paths = new Map<string, string>();
  for (const f of inline) {
    const path = patientFilePath(uid, p.id, f.id, f.name);
    await uploadDataUrl(path, f.dataUrl!);
    paths.set(f.id, path);
  }
  applyUploadedPaths(uid, clinicId, p.id, paths);
  return readPatient(uid, clinicId, p.id) ?? p;
}

// A failed push used to wait for the next remote change or app restart — in
// practice it was never retried, and the record stayed on one device only.
const RETRY_DELAYS_MS = [15_000, 60_000, 5 * 60_000, 15 * 60_000];
const retryCounts = new Map<string, number>();
let lastSyncError = "";

// What hasn't reached the cloud (patient id → last error), so the patients
// screen can say so — sync itself is automatic and otherwise invisible.
const LISTENER = "(listener)";
const failing = new Map<string, string>();
const statusListeners = new Set<() => void>();
export type PatientSyncStatus = { failed: number; error: string };
let syncStatus: PatientSyncStatus = { failed: 0, error: "" };

function setFailing(id: string, error?: string) {
  if (error === undefined) {
    if (!failing.delete(id)) return;
  } else {
    failing.set(id, error);
  }
  const errors = [...failing.values()];
  syncStatus = {
    failed: [...failing.keys()].filter((k) => k !== LISTENER).length,
    error: errors[errors.length - 1] ?? "",
  };
  statusListeners.forEach((l) => l());
}

export function usePatientSyncStatus(): PatientSyncStatus {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => syncStatus,
    () => syncStatus,
  );
}

/** Re-reads the cloud copy and re-sends whatever is missing there. Runs when
 *  the app/page comes back to the foreground, so returning to it is enough. */
export function resyncPatients() {
  if (!syncEnabled()) return;
  retryCounts.clear();
  startSync();
}

function errorText(err: unknown): string {
  const e = err as { code?: string; message?: string };
  return [e?.code, e?.message].filter(Boolean).join(": ") || String(err);
}

function scheduleRetry(uid: string, clinicId: string, id: string) {
  const key = pushKey(uid, clinicId, id);
  const n = retryCounts.get(key) ?? 0;
  if (n >= RETRY_DELAYS_MS.length) return; // "Sync now" or the next launch tries again
  retryCounts.set(key, n + 1);
  setTimeout(() => {
    if (uid === currentUserId && syncReady) void pushPatient(uid, clinicId, id);
  }, RETRY_DELAYS_MS[n]);
}

/** Uploads one patient; throws the Firestore/Storage error on failure. */
async function sendPatient(uid: string, clinicId: string, id: string) {
  const p = readPatient(uid, clinicId, id);
  if (!p) return;
  const ready = await uploadInlineFiles(uid, clinicId, p);
  // Never send an inline file body, even if its upload failed above.
  const files = ready.files.filter((f) => f.path).map(({ dataUrl: _inline, ...f }) => f);
  await setDoc(patientDoc(uid, id), toFirestore({ ...ready, files, clinicId, deleted: false }));
  retryCounts.delete(pushKey(uid, clinicId, id));
  setFailing(id);
}

async function pushPatient(uid: string, clinicId: string, id: string) {
  try {
    await sendPatient(uid, clinicId, id);
  } catch (err) {
    lastSyncError = errorText(err);
    setFailing(id, lastSyncError);
    console.warn("Patient not synced yet:", id, err);
    scheduleRetry(uid, clinicId, id);
  }
}

export type SyncResult = { sent: number; failed: number; error?: string };

/**
 * "Sync now": sends every patient of the active clinic (and this device's
 * deletions) to the cloud and reports what happened, so a failure is visible
 * instead of silently leaving records on one device.
 */
export async function syncPatientsNow(): Promise<SyncResult> {
  if (!currentUserId) return { sent: 0, failed: 0, error: "not-signed-in" };
  if (!syncReady || !currentClinicId) return { sent: 0, failed: 0, error: lastSyncError || "clinic-list-not-loaded" };
  ensure();
  const uid = currentUserId;
  const clinicId = currentClinicId;
  let sent = 0;
  let failed = 0;
  let error: string | undefined;
  for (const p of state) {
    try {
      await sendPatient(uid, clinicId, p.id);
      sent++;
    } catch (err) {
      failed++;
      error = errorText(err);
      lastSyncError = error;
      setFailing(p.id, error);
    }
  }
  for (const [id, at] of Object.entries(readDeleted(uid, clinicId))) {
    try {
      await setDoc(patientDoc(uid, id), { id, clinicId, deleted: true, updatedAt: at });
    } catch (err) {
      failed++;
      error = errorText(err);
    }
  }
  startSync(); // re-read the cloud copy, so records from other devices appear too
  return { sent, failed, error };
}

function pushDelete(p: Patient) {
  if (!currentUserId || !currentClinicId || typeof window === "undefined") return;
  const uid = currentUserId;
  const clinicId = currentClinicId;
  const at = Date.now();
  const key = pushKey(uid, clinicId, p.id);
  const timer = pushTimers.get(key);
  if (timer) clearTimeout(timer);
  pushTimers.delete(key);
  // Recorded even while sync is off, so the next sync sends the tombstone.
  markDeleted(uid, clinicId, p.id, at);
  if (!syncEnabled()) return;
  setDoc(patientDoc(uid, p.id), { id: p.id, clinicId, deleted: true, updatedAt: at }).catch((err) =>
    console.warn("Patient delete not synced yet:", p.id, err),
  );
  for (const f of p.files) if (f.path) void deletePatientFile(f.path);
}

function mergeRemote(docs: QueryDocumentSnapshot[], complete: boolean) {
  ensure();
  const uid = currentUserId;
  const clinicId = currentClinicId;
  const deletedHere = readDeleted(uid, clinicId);
  const byId = new Map(state.map((p) => [p.id, p] as const));
  const seen = new Set<string>();
  const toPush: string[] = [];
  const tombstonesToResend: Patient[] = [];
  let changed = false;

  for (const d of docs) {
    const { clinicId: _clinic, deleted, ...remote } = d.data() as RemotePatient;
    const id = d.id;
    seen.add(id);
    const local = byId.get(id);
    const rTime = remote.updatedAt ?? 0;
    const lTime = local?.updatedAt ?? 0;
    if (deleted) {
      if (local && lTime <= rTime) {
        byId.delete(id);
        changed = true;
      } else if (local) toPush.push(id); // edited here after it was deleted elsewhere
      continue;
    }
    if (!local) {
      // Deleted on this device after that remote copy was written.
      if ((deletedHere[id] ?? 0) >= rTime) tombstonesToResend.push({ ...(remote as Patient), id });
      else {
        byId.set(id, { ...(remote as Patient), id });
        changed = true;
      }
    } else if (rTime > lTime) {
      byId.set(id, { ...(remote as Patient), id });
      changed = true;
    } else if (lTime > rTime) toPush.push(id);
  }
  // First sync from this device: upload what only exists locally. Only on a
  // server-complete snapshot — a partial cached one would look "missing".
  if (complete) for (const id of byId.keys()) if (!seen.has(id)) toPush.push(id);

  if (changed) {
    state = [...byId.values()].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    saveLocal();
  }
  for (const id of toPush) schedulePush(id);
  for (const p of tombstonesToResend) pushDelete(p);
}

function startSync() {
  unsubscribeRemote?.();
  unsubscribeRemote = null;
  if (!syncEnabled() || !currentClinicId) return;
  const uid = currentUserId;
  const clinicId = currentClinicId;
  try {
    unsubscribeRemote = onSnapshot(
      query(patientsCol(uid), where("clinicId", "==", clinicId)),
      // With metadata changes, the server-confirmed snapshot is delivered even
      // when it brings no new documents. Without them, a first snapshot served
      // from cache was the only one, it never counted as "complete", and
      // records that exist only on this device were never uploaded.
      { includeMetadataChanges: true },
      (snap) => {
        if (uid !== currentUserId || clinicId !== currentClinicId) return;
        if (snap.metadata.hasPendingWrites) return; // our own write echoing back
        setFailing(LISTENER);
        mergeRemote(snap.docs, !snap.metadata.fromCache);
      },
      (err) => {
        lastSyncError = errorText(err);
        setFailing(LISTENER, lastSyncError);
        console.warn("Patients sync listener error:", err);
      },
    );
  } catch (err) {
    console.warn("Patients sync not started:", err);
  }
}

// Web: coming back to the tab, or back online, re-syncs on its own. (The
// native app does the same from its root layout with AppState.)
if (typeof document !== "undefined" && typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resyncPatients();
  });
  window.addEventListener("online", () => resyncPatients());
}
