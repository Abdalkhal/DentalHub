import { useSyncExternalStore } from "react";

export type OrderStatus = "in_progress" | "completed" | "delayed";

export type ProdStageId = "impression" | "design" | "printing" | "ceramic" | "qc" | "dispatch";

export type Order = {
  id: string;
  orderNumber: string;
  caseId: number;
  patient: string;
  doctor: string;
  workType: string;
  receivedDate: string;
  dueDate: string;
  status: OrderStatus;
  currentStage?: ProdStageId;
  agent: string;
  unitsCount: number;
  unitPrice: number;
  currency?: "USD" | "IQD";
  discount: number;
  price: number;
  rating?: number;
  notes: string;
  clinic: string;
};

const STORAGE_KEY = "dental_hub_orders";

function loadOrders(): Order[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    const old = localStorage.getItem("dental_orders");
    if (old) {
      const parsed = JSON.parse(old) as Order[];
      saveOrders(parsed);
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function saveOrders(data: Order[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

let orders: Order[] = loadOrders();
const listeners = new Set<() => void>();

function emit() {
  saveOrders(orders);
  listeners.forEach((l) => l());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: orders }));
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue) as Order[];
        orders = parsed;
        listeners.forEach((l) => l());
        window.dispatchEvent(new CustomEvent("ordersUpdated", { detail: orders }));
      } catch {}
    }
  });
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSnapshot(): Order[] {
  return orders;
}

export function getServerSnapshot(): Order[] {
  return [];
}

export function useOrders(): Order[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const listOrders = getSnapshot;

const COUNTER_KEY = "dental_orders_counter";

function loadCounter(): number {
  try {
    const v = localStorage.getItem(COUNTER_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

function saveCounter(n: number) {
  try {
    localStorage.setItem(COUNTER_KEY, String(n));
  } catch {}
}

let _counter = loadCounter();

(function normalizeCaseIds() {
  if (typeof window === "undefined") return;
  if (orders.length === 0) return;
  const needsFix = orders.some((o) => o.caseId >= 1000 || !o.caseId);
  if (!needsFix) {
    const maxId = orders.reduce((m, o) => Math.max(m, o.caseId), 0);
    _counter = maxId;
    saveCounter(maxId);
    return;
  }
  const sorted = [...orders].sort(
    (a, b) => new Date(a.receivedDate || a.dueDate).getTime() - new Date(b.receivedDate || b.dueDate).getTime(),
  );
  sorted.forEach((o, i) => {
    o.caseId = i + 1;
    o.orderNumber = `ORD-${String(i + 1).padStart(3, "0")}`;
  });
  orders = sorted;
  _counter = sorted.length;
  saveCounter(_counter);
  saveOrders(orders);
  try { localStorage.removeItem("dental_case_counter"); } catch {}
})();

export function getNextOrderNumber(): string {
  _counter += 1;
  saveCounter(_counter);
  return `ORD-${String(_counter).padStart(3, "0")}`;
}

export function getNextCaseId(): number {
  return _counter + 1;
}

export function addOrder(order: Order) {
  orders = [order, ...orders];
  emit();
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  orders = orders.map((o) => (o.id === id ? { ...o, status } : o));
  emit();
}

export function updateOrder(id: string, updates: Partial<Order>) {
  orders = orders.map((o) => (o.id === id ? { ...o, ...updates } : o));
  emit();
}

export function setOrders(newOrders: Order[]) {
  orders = [...newOrders];
  emit();
}

export function updateOrderStage(id: string, stage: ProdStageId) {
  orders = orders.map((o) => (o.id === id ? { ...o, currentStage: stage } : o));
  emit();
}

export function deleteOrder(id: string) {
  orders = orders.filter((o) => o.id !== id);
  emit();
}
