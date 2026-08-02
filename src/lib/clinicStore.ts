import { useSyncExternalStore } from "react";

/* ── Types ──────────────────────────────────── */

export type TxKind = "income" | "expense";

export type Transaction = {
  id: string;
  label: string;
  kind: TxKind;
  amount: number;
  source: string;
  date: string;
};

export type ClinicOrderStatus = "pending" | "in_progress" | "delivered";

export type ClinicOrder = {
  id: string;
  title: string;
  vendor: string;
  kind: "lab" | "supply";
  amount: number;
  status: ClinicOrderStatus;
  date: string;
  ref: string;
};

export type Material = {
  id: string;
  name: string;
  category: string;
  qty: number;
  minQty: number;
  unit: string;
  price: number;
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  shift: string;
  cases: number;
};

export type ClinicState = {
  transactions: Transaction[];
  orders: ClinicOrder[];
  materials: Material[];
  doctors: Doctor[];
};

/* ── Store ──────────────────────────────────── */

const KEY = "dh_clinic_v3";

function def(): ClinicState {
  return { transactions: [], orders: [], materials: [], doctors: [] };
}

function load(): ClinicState {
  if (typeof window === "undefined") return def();
  try { const r = localStorage.getItem(KEY); return r ? { ...def(), ...JSON.parse(r) } : def(); } catch { return def(); }
}

function save(s: ClinicState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

let state = load();
const listeners = new Set<() => void>();
function emit() { save(state); listeners.forEach((l) => l()); }

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) { try { state = { ...def(), ...JSON.parse(e.newValue) }; listeners.forEach((l) => l()); } catch {} }
  });
}

function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
function getSnapshot(): ClinicState { return state; }
function getServerSnapshot(): ClinicState { return def(); }

export function useClinic(): ClinicState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ── Totals ────────────────────────────────── */

export function clinicTotals(d: ClinicState) {
  const income = d.transactions.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expense = d.transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const dueOrders = d.orders.filter((o) => o.status !== "delivered").reduce((s, o) => s + o.amount, 0);
  return { income, expense, net: income - expense, dueOrders };
}

/* ── Mutations ─────────────────────────────── */

export function addTransaction(t: Omit<Transaction, "id" | "date">) {
  state.transactions = [{ ...t, id: crypto.randomUUID(), date: new Date().toISOString().split("T")[0] }, ...state.transactions];
  emit();
}

export function removeTransaction(id: string) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  emit();
}

export function addOrder(o: Omit<ClinicOrder, "id" | "date" | "ref">) {
  const id = crypto.randomUUID();
  state.orders = [{ ...o, id, date: new Date().toISOString().split("T")[0], ref: `#${id.slice(0, 8).toUpperCase()}` }, ...state.orders];
  emit();
}

export function removeOrder(id: string) {
  state.orders = state.orders.filter((o) => o.id !== id);
  emit();
}

export function setOrderStatus(id: string, status: ClinicOrderStatus) {
  state.orders = state.orders.map((o) => (o.id === id ? { ...o, status } : o));
  emit();
}

export function addMaterial(m: Omit<Material, "id">) {
  state.materials = [{ ...m, id: crypto.randomUUID() }, ...state.materials];
  emit();
}

export function removeMaterial(id: string) {
  state.materials = state.materials.filter((m) => m.id !== id);
  emit();
}

export function updateMaterialQty(id: string, qty: number) {
  state.materials = state.materials.map((m) => (m.id === id ? { ...m, qty: Math.max(0, qty) } : m));
  emit();
}

export function addDoctor(d: Omit<Doctor, "id">) {
  state.doctors = [{ ...d, id: crypto.randomUUID() }, ...state.doctors];
  emit();
}

export function removeDoctor(id: string) {
  state.doctors = state.doctors.filter((d) => d.id !== id);
  emit();
}
