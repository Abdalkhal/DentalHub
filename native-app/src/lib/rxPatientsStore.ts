// Local patients store (localStorage) for the Dentist dashboard.
import { useSyncExternalStore } from "react";

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
};

export type PatientFile = {
  id: string;
  name: string;
  dataUrl: string;
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
};

export const EMPTY_HISTORY: MedicalHistory = {
  diabetes: false,
  hypertension: false,
  heart: false,
  allergy: false,
  bleeding: false,
};

const KEY = "dh:patients:v1";

let state: Patient[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function load(): Patient[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as Patient[];
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

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
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
  };
  state = [p, ...state];
  persist();
  return p;
}

export function updatePatient(id: string, patch: Partial<Patient>) {
  ensure();
  state = state.map((p) => (p.id === id ? { ...p, ...patch } : p));
  persist();
}

export function removePatient(id: string) {
  ensure();
  state = state.filter((p) => p.id !== id);
  persist();
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

export function addFile(id: string, f: Omit<PatientFile, "id" | "addedAt">) {
  const p = getPatient(id);
  if (!p) return;
  updatePatient(id, {
    files: [{ id: `f_${Date.now().toString(36)}`, addedAt: new Date().toISOString(), ...f }, ...p.files],
  });
}

export function removeFile(id: string, fileId: string) {
  const p = getPatient(id);
  if (!p) return;
  updatePatient(id, { files: p.files.filter((f) => f.id !== fileId) });
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
