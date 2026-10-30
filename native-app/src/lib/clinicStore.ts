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
  // Movements saved before a currency could be chosen have none — they were
  // all entered as dinars (see txCurrency).
  currency?: Currency;
};

export type Currency = "IQD" | "USD";

export function txCurrency(t: Pick<Transaction, "currency">): Currency {
  return t.currency ?? "IQD";
}

/** "25,000 د.ع" / "$1,250.5" — always Western digits with thousands commas. */
export function fmtMoney(n: number, cur: Currency): string {
  const v = (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: cur === "IQD" ? 0 : 2 });
  return cur === "IQD" ? `${v} د.ع` : `$${v}`;
}

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
  expiryDate: string;
  batchNumber: string;
  supplierName: string;
  storageLocation: string;
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  phone: string;
  shift: string;
  cases: number;
  licenseNumber: string;
  agreementType: "percentage" | "fixed";
  agreementPercent: number;
  workingDays: string[];
  permissions: string;
};

export type ClinicState = {
  transactions: Transaction[];
  orders: ClinicOrder[];
  materials: Material[];
  doctors: Doctor[];
};

/* ── Store ──────────────────────────────────── */

const KEY_PREFIX = "dh_clinic_v3:";
let currentUserId = "";
let currentClinicId = "";

// Keyed by clinic, not just account — a dentist working across several
// clinics (see clinicsStore.ts) must never see one clinic's finance/orders/
// materials/doctors bleed into another's. Called by clinicsStore.ts's
// `pointStoresAt` every time the active clinic changes, not just on sign-in.
export function setClinicStoreUser(uid: string, clinicId: string) {
  // Every clinic screen calls this on mount. Re-running it for the same,
  // already-loaded user+clinic used to reset `state` to `def()`
  // unconditionally — wiping whatever was just added in this session (e.g. a
  // doctor) the moment you navigated back to a clinic screen, and persisting
  // that empty state right over the saved data via emit()/save(). Only
  // reset+reload when the active user or clinic actually changes.
  if (uid === currentUserId && clinicId === currentClinicId) return;
  currentUserId = uid;
  currentClinicId = clinicId;
  state = load();
  emit();
}

function getKey() { return KEY_PREFIX + (currentUserId || "guest") + ":" + (currentClinicId || "default"); }

function def(): ClinicState {
  return { transactions: [], orders: [], materials: [], doctors: [] };
}

function load(): ClinicState {
  if (typeof window === "undefined") return def();
  try { const r = localStorage.getItem(getKey()); return r ? { ...def(), ...JSON.parse(r) } : def(); } catch { return def(); }
}

function save(s: ClinicState) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(getKey(), JSON.stringify(s)); } catch {}
}

let state = load();
const listeners = new Set<() => void>();
function emit() { save(state); listeners.forEach((l) => l()); }

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === getKey() && e.newValue) { try { state = { ...def(), ...JSON.parse(e.newValue) }; listeners.forEach((l) => l()); } catch {} }
  });
}

function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
function getSnapshot(): ClinicState { return state; }
function getServerSnapshot(): ClinicState { return def(); }

export function useClinic(): ClinicState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ── Totals ────────────────────────────────── */

/** Totals in one currency — dinars and dollars are never added together.
 *  Supplier orders have no currency and are entered in dinars. */
export function clinicTotals(d: ClinicState, currency: Currency = "IQD") {
  const txs = d.transactions.filter((t) => txCurrency(t) === currency);
  const income = txs.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  const dueOrders =
    currency === "IQD" ? d.orders.filter((o) => o.status !== "delivered").reduce((s, o) => s + o.amount, 0) : 0;
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

/* ── Reports ─────────────────────────────────────────────────── */

export type ReportPeriod = "today" | "week" | "month" | "year";

/** First day (YYYY-MM-DD) of the period that contains `now`. */
export function periodStart(period: string, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") d.setDate(d.getDate() - d.getDay()); // week starts Sunday
  else if (period === "month") d.setDate(1);
  else if (period === "year") d.setMonth(0, 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type ReportPatient = { feeCurrency?: Currency; payments: { amount: number; date: string }[] };

/**
 * Report totals for a period, in one currency. Revenue = the clinic's manual
 * "income" movements in that currency + what patients paid in it (a
 * patient's payments are in their fee currency; none set = dollars, the
 * fees tab default). Dinars and dollars used to be mixed: dollar payments
 * were left out entirely and every movement was assumed to be dinars.
 */
export function reportTotals(d: ClinicState, patients: ReportPatient[], period: string, currency: Currency = "IQD") {
  const from = periodStart(period);
  const inPeriod = (date: string) => (date || "").slice(0, 10) >= from;
  const txs = d.transactions.filter((t) => txCurrency(t) === currency && inPeriod(t.date));
  const manualIncome = txs.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
  const expense = txs.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
  let patientIncome = 0;
  for (const p of patients) {
    if ((p.feeCurrency ?? "USD") !== currency) continue;
    patientIncome += p.payments.filter((x) => inPeriod(x.date)).reduce((s, x) => s + (Number(x.amount) || 0), 0);
  }
  const income = manualIncome + patientIncome;
  return { income, expense, net: income - expense, patientIncome };
}
