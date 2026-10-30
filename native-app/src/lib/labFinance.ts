// Lab accounts: what each doctor was billed and paid, kept per currency.
// Identical in the web app and the native app (src/lib/labFinance.ts).
//
// Two things used to go wrong here:
//  - dinars and dollars were summed together and all shown as "د.ع";
//  - doctors were matched by the hand-typed name on the case and on the
//    payment, so a spelling difference split one doctor in two and two
//    doctors with the same name were merged. Cases sent by a doctor carry
//    their account id (`dentistId`); that is now the key, and the name is
//    only the fallback for cases the lab typed in for a doctor without one.
import { resolveOrderTotal } from "./orderLines";
import type { Order } from "./ordersStore";
import { normalizeName } from "./utils";

export type LabCurrency = "IQD" | "USD";

export type LabPayment = {
  id: string;
  // Doctor name as shown when it was logged (older entries: typed by hand).
  clinic: string;
  doctorId?: string;
  amount: number;
  currency: LabCurrency;
  date: string;
};

export type DoctorAccount = {
  key: string;
  name: string;
  doctorId?: string;
  billed: number;
  collected: number;
  remaining: number;
  orders: Order[];
  payments: LabPayment[];
};

export const orderCurrency = (o: Pick<Order, "currency">): LabCurrency => (o.currency === "USD" ? "USD" : "IQD");
export const paymentCurrency = (p: Pick<LabPayment, "currency">): LabCurrency => (p.currency === "USD" ? "USD" : "IQD");

export function fmtLabMoney(n: number, cur: LabCurrency): string {
  const v = (Number(n) || 0).toLocaleString("en-US", { maximumFractionDigits: cur === "IQD" ? 0 : 2 });
  return cur === "IQD" ? `${v} د.ع` : `$${v}`;
}

function amount(val: unknown): number {
  const n = Number(String(val ?? 0).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** One key per doctor: their account id when any of their cases has it. */
export function doctorKeyResolver(orders: Pick<Order, "dentistId" | "doctor">[]) {
  const idByName = new Map<string, string>();
  for (const o of orders) {
    const name = normalizeName(o.doctor || "");
    if (o.dentistId && name && !idByName.has(name)) idByName.set(name, o.dentistId);
  }
  return (id: string | undefined, name: string): string => {
    if (id) return `id:${id}`;
    const n = normalizeName(name || "");
    if (!n) return "";
    const known = idByName.get(n);
    return known ? `id:${known}` : `name:${n}`;
  };
}

/** Per-doctor accounts in one currency (doctors with nothing in it are left out). */
export function doctorAccounts(orders: Order[], payments: LabPayment[], currency: LabCurrency): DoctorAccount[] {
  const keyOf = doctorKeyResolver(orders);
  const map = new Map<string, DoctorAccount>();
  const bucket = (key: string, name: string, doctorId?: string) => {
    let a = map.get(key);
    if (!a) {
      a = { key, name: name.trim(), doctorId, billed: 0, collected: 0, remaining: 0, orders: [], payments: [] };
      map.set(key, a);
    }
    if (!a.doctorId && doctorId) a.doctorId = doctorId;
    return a;
  };
  for (const o of orders) {
    if (orderCurrency(o) !== currency) continue;
    const key = keyOf(o.dentistId, o.doctor);
    if (!key) continue;
    const a = bucket(key, o.doctor || "", o.dentistId);
    a.orders.push(o);
    // Billed as soon as a case is placed and priced, whatever its production
    // status — a lab bills for work taken on.
    a.billed += resolveOrderTotal(o);
  }
  for (const p of payments) {
    if (paymentCurrency(p) !== currency) continue;
    const key = keyOf(p.doctorId, p.clinic);
    if (!key) continue;
    const a = bucket(key, p.clinic || "", p.doctorId);
    a.payments.push(p);
    a.collected += amount(p.amount);
  }
  const out = [...map.values()];
  for (const a of out) a.remaining = a.billed - a.collected;
  return out.sort((x, y) => y.remaining - x.remaining);
}

export function labTotals(orders: Order[], payments: LabPayment[], currency: LabCurrency) {
  const invoiced = orders.filter((o) => orderCurrency(o) === currency).reduce((s, o) => s + resolveOrderTotal(o), 0);
  const collected = payments.filter((p) => paymentCurrency(p) === currency).reduce((s, p) => s + amount(p.amount), 0);
  return { invoiced, collected, remaining: invoiced - collected };
}

/** Revenue per month for the lab reports, in one currency. */
export function ordersInCurrency(orders: Order[], currency: LabCurrency): Order[] {
  return orders.filter((o) => orderCurrency(o) === currency);
}

export type OrderGroup = { key: string; name: string; orders: Order[] };

/**
 * The lab's cases grouped by doctor (their account) or by patient (per
 * doctor — two patients with the same name at different doctors are
 * different people). Used to group by the typed name, which split one doctor
 * over spelling variants and merged namesakes.
 */
export function groupOrders(orders: Order[], by: "doctor" | "patient"): OrderGroup[] {
  const keyOf = doctorKeyResolver(orders);
  const map = new Map<string, OrderGroup>();
  for (const o of orders) {
    const doctorKey = keyOf(o.dentistId, o.doctor);
    const name = ((by === "doctor" ? o.doctor : o.patient) || "").trim();
    if (!name) continue;
    const key = by === "doctor" ? doctorKey : `${doctorKey}|${normalizeName(name)}`;
    if (!key) continue;
    const g = map.get(key);
    if (g) g.orders.push(o);
    else map.set(key, { key, name, orders: [o] });
  }
  return [...map.values()].sort((a, b) => b.orders.length - a.orders.length);
}
