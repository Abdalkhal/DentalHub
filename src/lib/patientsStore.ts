// Patients store for the Dentist dashboard. Local storage is the instant,
// offline-capable cache the UI reads; for a signed-in dentist every change is
// also synced to Firestore (see the "Cloud sync" section at the end and
// dentistRecords.ts), so the same records appear on the phone and the web.
import { useSyncExternalStore } from "react";
import { getDoc, getDocs, onSnapshot, query, setDoc, where, type QueryDocumentSnapshot } from "firebase/firestore";
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
  // Fixed when recorded: a dinar payment stays in dinars. Older payments have
  // none until settlePatientFinance stamps them (see paymentCurrency).
  currency?: "USD" | "IQD";
  receiptNo?: string;
  // The treating team member this payment counts towards (their dues).
  doctorUid?: string;
  byName?: string;
};

/** A change to a total fee that was already set. Nothing in the apps removes one. */
export type FeeChange = {
  id: string;
  at: string;
  currency: "USD" | "IQD";
  from: number;
  to: number;
};

/** A payment that was removed. Nothing in the apps removes this record. */
export type DeletedPayment = {
  id: string;
  at: string;
  amount: number;
  currency: "USD" | "IQD";
  date: string;
  receiptNo?: string;
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
  // The fee in the currency being viewed (feeCurrency). `fees` is the record;
  // this mirrors it for anything reading a single number.
  totalFees: number;
  payments: Payment[];
  // The currency the finance tab shows and records in. It never relabels
  // amounts: each currency has its own fee and its own payments.
  feeCurrency?: "USD" | "IQD";
  fees?: Partial<Record<"USD" | "IQD", number>>;
  feeHistory?: FeeChange[];
  // Last receipt number used for this patient; never reused after a delete.
  receiptSeq?: number;
  deletedPayments?: DeletedPayment[];
  // Team members treating this patient (functions/clinicTeam.js).
  doctorUids?: string[];
  // Ids of visits, plan steps, payments, files and log entries that were
  // removed, so a merge with another copy doesn't bring them back.
  removedItems?: string[];
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

const withRemoved = (p: Patient, itemId: string) => [...(p.removedItems ?? []), itemId];

/**
 * Two copies of one record: the newer one's fields, and every list item either
 * copy holds unless it was removed. Saving whole records used to let one
 * device's save erase what another (or a team member) had just added.
 */
export function mergeRecords(newer: Patient, older: Patient): Patient {
  const removed = new Set([...(newer.removedItems ?? []), ...(older.removedItems ?? [])]);
  const list = <T extends { id: string }>(a: T[] | undefined, b: T[] | undefined): T[] => {
    const mine = a ?? [];
    const ids = new Set(mine.map((x) => x.id));
    return [...(b ?? []).filter((x) => !ids.has(x.id)), ...mine].filter((x) => !removed.has(x.id));
  };
  const merged: Patient = {
    ...newer,
    visits: list(newer.visits, older.visits),
    files: list(newer.files, older.files),
    payments: list(newer.payments, older.payments),
  };
  const plan = list(newer.plan, older.plan);
  const log = list(newer.log, older.log);
  const feeHistory = list(newer.feeHistory, older.feeHistory);
  const deletedPayments = list(newer.deletedPayments, older.deletedPayments);
  if (newer.plan || older.plan) merged.plan = plan;
  if (newer.log || older.log) merged.log = log;
  if (newer.feeHistory || older.feeHistory) merged.feeHistory = feeHistory;
  if (newer.deletedPayments || older.deletedPayments) merged.deletedPayments = deletedPayments;
  if (removed.size) merged.removedItems = [...removed];
  const seq = Math.max(newer.receiptSeq ?? 0, older.receiptSeq ?? 0);
  if (seq) merged.receiptSeq = seq;
  return merged;
}

/**
 * New file numbers for patients sharing one (devices working offline each gave
 * out the next number). The earliest registered keeps it; every device works
 * this out the same way, so they agree without talking to each other.
 */
export function duplicateFileNumbers(list: Patient[]): Map<string, string> {
  const num = (s: string) => Number(String(s || "").replace(/\D/g, ""));
  const ordered = list
    .filter((p) => p.fileNo)
    .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id));
  const seen = new Set<number>();
  const changes = new Map<string, string>();
  let max = Math.max(100, ...ordered.map((p) => num(p.fileNo)));
  for (const p of ordered) {
    if (!seen.has(num(p.fileNo))) {
      seen.add(num(p.fileNo));
      continue;
    }
    max += 1;
    seen.add(max);
    changes.set(p.id, `PAT-${max}`);
  }
  return changes;
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
  updatePatient(id, { visits: p.visits.filter((v) => v.id !== visitId), removedItems: withRemoved(p, visitId) });
}

/** Chooses which team members treat this patient. */
export function setPatientDoctors(id: string, doctorUids: string[]) {
  updatePatient(id, { doctorUids });
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
  updatePatient(id, { files: p.files.filter((f) => f.id !== fileId), removedItems: withRemoved(p, fileId) });
  if (file?.path) void deletePatientFile(file.path);
}

/** Photos attached to one treatment-plan department live in `files`, marked
 *  by a name prefix (like X-rays' "[xray] "), so they sync with the record. */
export const MAX_PLAN_PHOTOS = 2;
export const planPhotoTag = (dept: string) => `[plan:${dept}] `;
/** Oldest first, so a photo keeps its place when another one is added. */
export const planPhotos = (p: Patient, dept: string) =>
  p.files.filter((f) => f.name.startsWith(planPhotoTag(dept))).reverse();
/** Not an X-ray or a department photo — those show in their own departments. */
export const isGeneralFile = (f: PatientFile) => !/^\[(xray|plan:[^\]]+)\] /.test(f.name);

/** Today on this device (toISOString would give yesterday until 3am in Iraq). */
export function localDay(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Before currencies were separated the record had one fee and one label. */
export function patientFees(p: Patient): Record<FeeCurrency, number> {
  if (p.fees) return { USD: Number(p.fees.USD) || 0, IQD: Number(p.fees.IQD) || 0 };
  const fees: Record<FeeCurrency, number> = { USD: 0, IQD: 0 };
  fees[p.feeCurrency ?? "USD"] = Number(p.totalFees) || 0;
  return fees;
}

export function paymentCurrency(p: Patient, x: Payment): FeeCurrency {
  return x.currency ?? p.feeCurrency ?? "USD";
}

export function balanceIn(p: Patient, c: FeeCurrency) {
  const fees = patientFees(p)[c];
  const paid = p.payments
    .filter((x) => paymentCurrency(p, x) === c)
    .reduce((s, x) => s + (Number(x.amount) || 0), 0);
  return { fees, paid, remaining: fees - paid };
}

/** The currencies this patient has any amount in. */
export function usedCurrencies(p: Patient): FeeCurrency[] {
  return (["IQD", "USD"] as const).filter((c) => {
    const b = balanceIn(p, c);
    return b.fees > 0 || b.paid > 0;
  });
}

export function patientFeeHistory(p: Patient): FeeChange[] {
  return [...(p.feeHistory ?? [])].sort((a, b) => b.at.localeCompare(a.at));
}

function formatReceiptNo(p: Patient, seq: number): string {
  // Per patient, so two devices (or an offline one) can't issue the same number.
  const file = p.fileNo.replace(/\D/g, "") || p.id.slice(-4);
  return `REC-${file}-${String(seq).padStart(2, "0")}`;
}

/**
 * Fixes on the record what older data only implied through feeCurrency: the
 * fee, each payment's and plan step's currency, and receipt numbers (oldest
 * payment first). Must run before feeCurrency changes, or those would change
 * currency with it.
 */
function settled(p: Patient): Patient {
  let seq = p.receiptSeq ?? 0;
  const payments = [...p.payments]
    .reverse()
    .map((x) => ({
      ...x,
      currency: paymentCurrency(p, x),
      receiptNo: x.receiptNo ?? formatReceiptNo(p, ++seq),
    }))
    .reverse();
  const plan = p.plan?.map((s) => (s.cost && !s.currency ? { ...s, currency: planCurrency(p, s) } : s));
  return { ...p, fees: patientFees(p), payments, receiptSeq: seq, ...(plan ? { plan } : {}) };
}

export function settlePatientFinance(id: string) {
  const p = getPatient(id);
  if (!p) return;
  const done =
    !!p.fees &&
    p.payments.every((x) => x.currency && x.receiptNo) &&
    !(p.plan ?? []).some((s) => s.cost && !s.currency);
  if (done) return;
  const { fees, payments, receiptSeq, plan } = settled(p);
  updatePatient(id, { fees, payments, receiptSeq, ...(plan ? { plan } : {}) });
}

/** Chooses the currency shown and recorded in. Amounts stay as they are. */
export function setFeeCurrency(id: string, c: FeeCurrency) {
  const p = getPatient(id);
  if (!p) return;
  const s = settled(p);
  updatePatient(id, {
    fees: s.fees,
    payments: s.payments,
    receiptSeq: s.receiptSeq,
    ...(s.plan ? { plan: s.plan } : {}),
    feeCurrency: c,
    totalFees: patientFees(s)[c],
  });
}

/** Sets the total fee in one currency; changing a set fee leaves a record. */
export function setPatientFee(id: string, c: FeeCurrency, amount: number) {
  const p = getPatient(id);
  if (!p) return;
  const s = settled(p);
  const fees = patientFees(s);
  const from = fees[c];
  if (from === amount) return;
  fees[c] = amount;
  const change: FeeChange = { id: newFileId(), at: localDay(), currency: c, from, to: amount };
  updatePatient(id, {
    fees,
    payments: s.payments,
    receiptSeq: s.receiptSeq,
    ...(s.plan ? { plan: s.plan } : {}),
    totalFees: fees[s.feeCurrency ?? "USD"],
    ...(from > 0 ? { feeHistory: [...(p.feeHistory ?? []), change] } : {}),
  });
}

export function addPayment(
  id: string,
  pay: { amount: number; note?: string; date?: string; currency?: FeeCurrency },
): Payment | undefined {
  const p = getPatient(id);
  if (!p) return undefined;
  const s = settled(p);
  const seq = (s.receiptSeq ?? 0) + 1;
  const payment: Payment = {
    id: `pay_${Date.now().toString(36)}`,
    amount: pay.amount,
    date: pay.date ?? localDay(),
    currency: pay.currency ?? s.feeCurrency ?? "USD",
    receiptNo: formatReceiptNo(s, seq),
    ...(pay.note ? { note: pay.note } : {}),
    ...(s.doctorUids?.[0] ? { doctorUid: s.doctorUids[0] } : {}),
  };
  updatePatient(id, {
    fees: s.fees,
    payments: [payment, ...s.payments],
    receiptSeq: seq,
    ...(s.plan ? { plan: s.plan } : {}),
  });
  return payment;
}

export function removePayment(id: string, payId: string) {
  const p = getPatient(id);
  if (!p) return;
  const s = settled(p);
  const gone = s.payments.find((x) => x.id === payId);
  if (!gone) return;
  const record: DeletedPayment = {
    id: gone.id,
    at: localDay(),
    amount: gone.amount,
    currency: paymentCurrency(s, gone),
    date: gone.date,
    ...(gone.receiptNo ? { receiptNo: gone.receiptNo } : {}),
  };
  updatePatient(id, {
    removedItems: withRemoved(s, payId),
    fees: s.fees,
    payments: s.payments.filter((x) => x.id !== payId),
    receiptSeq: s.receiptSeq,
    ...(s.plan ? { plan: s.plan } : {}),
    deletedPayments: [...(p.deletedPayments ?? []), record],
  });
}

export function patientDeletedPayments(p: Patient): DeletedPayment[] {
  return [...(p.deletedPayments ?? [])].sort((a, b) => b.at.localeCompare(a.at));
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
  updatePatient(id, { plan: getPlan(p).filter((s) => s.id !== stepId), removedItems: withRemoved(p, stepId) });
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
  updatePatient(id, { log: getLog(p).filter((e) => e.id !== entryId), removedItems: withRemoved(p, entryId) });
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
  for (const uid of recoveryFailed) recoveredFor.delete(uid);
  recoveryFailed.clear();
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
  let ready = await uploadInlineFiles(uid, clinicId, p);
  // Something may have been added in the cloud since this copy last saw it (a
  // team member's visit, another device). Offline this read fails; the
  // listener merges when the connection returns.
  try {
    const snap = await getDoc(patientDoc(uid, id));
    const remote = snap.exists() ? (snap.data() as RemotePatient) : null;
    if (remote && !remote.deleted) {
      const merged = mergeRecords(ready, { ...(remote as Patient), id });
      if (itemCount(merged) !== itemCount(ready)) {
        ready = merged;
        if (uid === currentUserId && clinicId === currentClinicId) {
          state = state.map((x) => (x.id === id ? { ...merged, updatedAt: x.updatedAt } : x));
          saveLocal();
        }
      }
    }
  } catch {
    /* send what is here */
  }
  // Never send an inline file body, even if its upload failed above.
  const files = ready.files.filter((f) => f.path).map(({ dataUrl: _inline, ...f }) => f);
  // Records from before sync had no updatedAt; one is always sent so a copy
  // is never "0" (see mergeRemote).
  const updatedAt = ready.updatedAt || Date.parse(ready.createdAt) || Date.now();
  await setDoc(patientDoc(uid, id), toFirestore({ ...ready, updatedAt, files, clinicId, deleted: false }));
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
      await setDoc(patientDoc(uid, id), { id, clinicId, deleted: true, updatedAt: at }, { merge: true });
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
  // merge: the record's data stays in the cloud, so a delete can be undone.
  setDoc(patientDoc(uid, p.id), { id: p.id, clinicId, deleted: true, updatedAt: at }, { merge: true }).catch((err) =>
    console.warn("Patient delete not synced yet:", p.id, err),
  );
  for (const f of p.files) if (f.path) void deletePatientFile(f.path);
}

const itemCount = (p: Patient) =>
  (p.visits?.length ?? 0) + (p.files?.length ?? 0) + (p.payments?.length ?? 0) + (p.plan?.length ?? 0) + (p.log?.length ?? 0);

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
      // The apps have no "delete patient" action, so a cloud "deleted" marker
      // is never trusted over a copy that exists here: the copy is sent back
      // up and the patient is restored. (A sync bug, fixed below, used to
      // write such markers for records that had no updatedAt — see
      // recoverDeletedPatients.)
      if (local) toPush.push(id);
      continue;
    }
    if (!local) {
      // Deleted on this device after that remote copy was written. Only with a
      // real local delete marker: a missing marker used to read as 0, and a
      // record without updatedAt (also 0) passed "0 >= 0" — every device that
      // didn't hold the patient yet deleted it for everyone.
      const deletedAt = deletedHere[id];
      if (deletedAt !== undefined && deletedAt >= rTime) tombstonesToResend.push({ ...(remote as Patient), id });
      else {
        byId.set(id, { ...(remote as Patient), id });
        changed = true;
      }
    } else if (rTime > lTime) {
      const merged = mergeRecords({ ...(remote as Patient), id }, local);
      // This copy held something the newer one lacked: send it back up, marked
      // as newer so other devices take it too.
      const extra = itemCount(merged) !== itemCount(remote as Patient);
      byId.set(id, extra ? { ...merged, updatedAt: Date.now() } : merged);
      changed = true;
      if (extra) toPush.push(id);
    } else if (lTime > rTime) {
      const merged = mergeRecords(local, { ...(remote as Patient), id });
      if (itemCount(merged) !== itemCount(local)) {
        byId.set(id, merged);
        changed = true;
      }
      toPush.push(id);
    }
  }
  // First sync from this device: upload what only exists locally. Only on a
  // server-complete snapshot — a partial cached one would look "missing".
  if (complete) for (const id of byId.keys()) if (!seen.has(id)) toPush.push(id);

  // Only on the complete list: a partial one can't tell what is a duplicate.
  if (complete) {
    for (const [id, fileNo] of duplicateFileNumbers([...byId.values()])) {
      const p = byId.get(id);
      if (!p) continue;
      byId.set(id, { ...p, fileNo, updatedAt: Date.now() });
      changed = true;
      toPush.push(id);
    }
  }

  if (changed) {
    state = [...byId.values()].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    saveLocal();
  }
  for (const id of toPush) schedulePush(id);
  for (const p of tombstonesToResend) pushDelete(p);
}

/* ── Recovery of wrongly deleted patients ──────────────────────
 * Until Nov 2026 a sync bug replaced some patients with a "deleted" marker
 * (see mergeRemote). This finds every such marker of the account and, from
 * any copy on this device (any clinic key, the pre-clinic legacy key) or
 * from the marker itself when it kept the data, writes the patient back. Runs
 * once per account each time the app starts, before the listener can act on
 * a marker. Nothing is ever removed here. */

const recoveredFor = new Set<string>();
const recoveryFailed = new Set<string>();

function localCopies(uid: string): Map<string, Patient> {
  const best = new Map<string, Patient>();
  if (typeof localStorage === "undefined" || typeof localStorage.key !== "function") return best;
  const prefix = KEY_PREFIX + uid;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !(k === prefix || k.startsWith(prefix + ":")) || k.endsWith(":deleted")) continue;
    try {
      const list = JSON.parse(localStorage.getItem(k) || "[]") as Patient[];
      if (!Array.isArray(list)) continue;
      for (const p of list) {
        if (!p?.id || !p.name) continue;
        const cur = best.get(p.id);
        if (!cur || (p.updatedAt ?? 0) > (cur.updatedAt ?? 0)) best.set(p.id, p);
      }
    } catch {
      /* unreadable entry — skip */
    }
  }
  return best;
}

export async function recoverDeletedPatients(uid: string): Promise<number> {
  if (!uid || typeof window === "undefined") return 0;
  const snap = await getDocs(query(patientsCol(uid), where("deleted", "==", true)));
  if (snap.empty) return 0;
  const copies = localCopies(uid);
  let restored = 0;
  for (const d of snap.docs) {
    const marker = d.data() as RemotePatient;
    const { clinicId: _c, deleted: _d, ...fromMarker } = marker;
    const copy = copies.get(d.id) ?? (marker.name ? (fromMarker as Patient) : undefined);
    if (!copy) continue;
    const files = (copy.files ?? []).filter((f) => f.path).map(({ dataUrl: _inline, ...f }) => f);
    await setDoc(
      patientDoc(uid, d.id),
      toFirestore({ ...copy, id: d.id, files, clinicId: marker.clinicId, deleted: false, updatedAt: Date.now() }),
    );
    restored++;
  }
  // The device-side delete lists only ever came from that bug.
  if (restored && typeof localStorage !== "undefined" && typeof localStorage.key === "function") {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY_PREFIX + uid) && k.endsWith(":deleted")) doomed.push(k);
    }
    doomed.forEach((k) => localStorage.removeItem(k));
  }
  if (restored) console.warn(`Restored ${restored} patient(s) wrongly marked deleted`);
  return restored;
}

function startSync() {
  unsubscribeRemote?.();
  unsubscribeRemote = null;
  if (!syncEnabled() || !currentClinicId) return;
  const uid = currentUserId;
  if (!recoveredFor.has(uid)) {
    recoveredFor.add(uid);
    // Restore first, then listen — the listener then receives them as normal.
    void recoverDeletedPatients(uid)
      .catch((err) => {
        // Retried when the app/page comes back (resyncPatients), not in a loop.
        recoveryFailed.add(uid);
        console.warn("Patient recovery not run yet:", err);
      })
      .finally(() => {
        if (uid === currentUserId) startSync();
      });
    return;
  }
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
