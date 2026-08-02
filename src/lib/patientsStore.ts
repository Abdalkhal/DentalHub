import { useSyncExternalStore } from "react";

export type PatientStatus = "new" | "in_treatment" | "completed";

export type MedicalHistory = {
  diabetes: boolean;
  hypertension: boolean;
  heart: boolean;
  allergy: boolean;
  bleeding: boolean;
};

export const EMPTY_HISTORY: MedicalHistory = {
  diabetes: false,
  hypertension: false,
  heart: false,
  allergy: false,
  bleeding: false,
};

export type Patient = {
  id: string;
  fileNo: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  status: PatientStatus;
  history: MedicalHistory;
  complaint: string;
  lastVisit: string;
  notes: string;
};

export type Visit = {
  id: string;
  patientId: string;
  date: string;
  diagnosis: string;
  treatment: string;
  cost: number;
  currency: "USD" | "IQD";
};

export type ToothStatus = {
  tooth: number;
  status: string;
  condition: string;
};

export type PlanStep = {
  id: string;
  patientId: string;
  step: string;
  planned: string;
  completed: string;
  notes: string;
};

export type Payment = {
  id: string;
  patientId: string;
  amount: number;
  currency: "USD" | "IQD";
  date: string;
  method: string;
};

const STORAGE_KEY = "dental_hub_patients_v2";

function load(): Patient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function save(data: Patient[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

let patients = load();
const listeners = new Set<() => void>();

function emit() { save(patients); listeners.forEach((l) => l()); }

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try { patients = JSON.parse(e.newValue); listeners.forEach((l) => l()); } catch {}
    }
  });
}

function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
function getSnapshot(): Patient[] { return patients; }
function getServerSnapshot(): Patient[] { return []; }

export function usePatients(): Patient[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function addPatient(form: {
  name: string;
  age: number | "";
  gender: "male" | "female";
  phone: string;
  complaint: string;
  status: PatientStatus;
  history: MedicalHistory;
}): Patient {
  const nextNo = patients.length + 1;
  const p: Patient = {
    id: crypto.randomUUID(),
    fileNo: String(nextNo).padStart(4, "0"),
    name: form.name.trim(),
    phone: form.phone.trim(),
    age: typeof form.age === "number" ? form.age : 0,
    gender: form.gender,
    status: form.status,
    history: { ...form.history },
    complaint: form.complaint.trim(),
    lastVisit: new Date().toISOString().split("T")[0],
    notes: form.complaint.trim(),
  };
  patients = [p, ...patients];
  emit();
  return p;
}

export function updatePatient(id: string, updates: Partial<Patient>) {
  patients = patients.map((p) => (p.id === id ? { ...p, ...updates, notes: updates.complaint !== undefined ? updates.complaint?.trim() || "" : p.notes } : p));
  emit();
}

export function deletePatient(id: string) { patients = patients.filter((p) => p.id !== id); emit(); }

export function addPayment(p: Payment) {
  const key = "dental_patient_payments";
  try {
    const raw = localStorage.getItem(key);
    const payments: Payment[] = raw ? JSON.parse(raw) : [];
    payments.push(p);
    localStorage.setItem(key, JSON.stringify(payments));
  } catch {}
}

export function addVisit(v: Visit) {
  const key = "dental_patient_visits";
  try {
    const raw = localStorage.getItem(key);
    const visits: Visit[] = raw ? JSON.parse(raw) : [];
    visits.push(v);
    localStorage.setItem(key, JSON.stringify(visits));
  } catch {}
}
