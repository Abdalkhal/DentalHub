import { useSyncExternalStore } from "react";
import {
  doc, setDoc, getDoc, onSnapshot, deleteDoc,
  collection, query, orderBy, getDocs, collectionGroup, where,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import {
  writeCaseFinance,
  stripFinancialFields,
  type CaseFinance,
} from "./financeStore";

export type OrderStatus = "new" | "in_progress" | "completed" | "delayed";

export type ProdStageId = "impression" | "design" | "printing" | "ceramic" | "qc" | "dispatch";

export type OrderAttachment = {
  name: string;
  url: string;
  type: string;
};

export type PricingItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: "USD" | "IQD";
};

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
  pricingMode?: "single" | "mixed";
  discount: number;
  price: number;
  rating?: number;
  notes: string;
  clinic: string;
  // Rich detail fields (used by the read-only invoice viewer)
  material?: string;
  workTypeId?: string;
  manufacturingMethod?: string;
  frameworkCreation?: string;
  shade?: string;
  pricingItems?: PricingItem[];
  subtotalIQD?: number;
  discountAmountIQD?: number;
  finalTotalUSD?: number;
  implantCompany?: string;
  implantSystem?: string;
  implantConnection?: string;
  implantPlatform?: string;
  implantScanBody?: string;
  implantLevel?: string;
  implantRetention?: string;
  alignerTreatmentType?: string;
  alignerArch?: string;
  alignerScans?: string;
  alignerCount?: string;
  alignerWearProtocol?: string;
  titaniumFrameworkType?: string;
  designerId?: string;
  designerName?: string;
  ceramistId?: string;
  ceramistName?: string;
  targetLabId?: string;
  dentistId?: string;
  attachments?: OrderAttachment[];
  designs?: OrderAttachment[];
  // Rich RX form fields
  patientAge?: string;
  patientGender?: string;
  patientPhone?: string;
  doctorSignature?: string;
  rxTeeth?: Record<string, string>;
  rxItems?: string[];
  rxData?: Record<string, unknown>;
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
let _labId: string | null = null;
let _unsubFirestore: (() => void) | null = null;
let _unsubFinance: (() => void) | null = null;
let _firestoreCases: Order[] = [];
let _financeByCase: Record<string, CaseFinance> = {};
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

let _initialized = false;

function initOrdersStore() {
  if (typeof window === "undefined" || _initialized) return;
  _initialized = true;

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
}

function caseDocRef(labId: string, caseId: string) {
  return doc(db, "lab_orders", labId, "cases", caseId);
}

const MIGRATED_KEY = "dh_orders_migrated";

async function migrateLocalToFirestore(labId: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATED_KEY)) return;
  const local = loadOrders();
  if (local.length === 0) {
    localStorage.setItem(MIGRATED_KEY, "1");
    return;
  }
  for (const o of local) {
    try {
      const snap = await getDoc(caseDocRef(labId, o.id));
      if (!snap.exists()) {
        await setDoc(caseDocRef(labId, o.id), stripFinancialFields(o));
      }
      await writeCaseFinance(labId, o.id, o);
    } catch (err) {
      console.warn("Failed to migrate order:", o.id, err);
    }
  }
  localStorage.setItem(MIGRATED_KEY, "1");
}

export function connectLabOrders(labId: string) {
  if (_labId === labId) return;
  disconnectLabOrders();

  _labId = labId;
  _firestoreCases = [];
  _financeByCase = {};

  const rebuildFromFirestore = () => {
    orders = _firestoreCases.map((c) => {
      const fin = _financeByCase[c.id];
      if (!fin) return c;
      return {
        ...c,
        price: fin.price ?? 0,
        currency: fin.currency ?? c.currency,
        unitPrice: fin.unitPrice ?? 0,
        discount: fin.discount ?? 0,
        pricingMode: fin.pricingMode ?? c.pricingMode,
        pricingItems: fin.pricingItems ?? c.pricingItems,
        subtotalIQD: fin.subtotalIQD ?? c.subtotalIQD,
        discountAmountIQD: fin.discountAmountIQD ?? c.discountAmountIQD,
        finalTotalUSD: fin.finalTotalUSD ?? c.finalTotalUSD,
      } as Order;
    });
    if (orders.length > 0) {
      _counter = orders.reduce((m, o) => Math.max(m, o.caseId), 0);
      saveCounter(_counter);
    }
    saveOrders(orders);
    listeners.forEach((l) => l());
  };

  migrateLocalToFirestore(labId).then(() => {
    const q = query(collection(db, "lab_orders", labId, "cases"), orderBy("caseId", "desc"));
    _unsubFirestore = onSnapshot(q, (snap) => {
      _firestoreCases = snap.docs.map((d) => d.data() as Order);
      rebuildFromFirestore();
    }, (err) => {
      console.warn("Firestore lab orders listener error:", err);
    });

    const fq = query(collectionGroup(db, "private"), where("labId", "==", labId));
    _unsubFinance = onSnapshot(fq, (snap) => {
      _financeByCase = {};
      snap.docs.forEach((d) => {
        const fin = d.data() as CaseFinance;
        _financeByCase[fin.caseId] = fin;
      });
      rebuildFromFirestore();
    }, (err) => {
      console.warn("Firestore lab finance listener error:", err);
    });
  }).catch((err) => {
    console.warn("Failed to migrate local orders:", err);
  });
}

export function disconnectLabOrders() {
  if (_unsubFirestore) {
    _unsubFirestore();
    _unsubFirestore = null;
  }
  if (_unsubFinance) {
    _unsubFinance();
    _unsubFinance = null;
  }
  _labId = null;
  _firestoreCases = [];
  _financeByCase = {};
}

async function syncToFirestore(order: Order) {
  if (!_labId || !db) return;
  try {
    await setDoc(caseDocRef(_labId, order.id), stripFinancialFields(order));
    await writeCaseFinance(_labId, order.id, order);
  } catch (err) {
    console.warn("Failed to sync order to Firestore:", order.id, err);
  }
}

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
  syncToFirestore(order);
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  orders = orders.map((o) => (o.id === id ? { ...o, status } : o));
  emit();
  const updated = orders.find((o) => o.id === id);
  if (updated) syncToFirestore(updated);
}

export function updateOrder(id: string, updates: Partial<Order>) {
  orders = orders.map((o) => (o.id === id ? { ...o, ...updates } : o));
  emit();
  const updated = orders.find((o) => o.id === id);
  if (updated) syncToFirestore(updated);
}

export function setOrders(newOrders: Order[]) {
  orders = [...newOrders];
  emit();
}

export { initOrdersStore };

export function updateOrderStage(id: string, stage: ProdStageId) {
  orders = orders.map((o) => (o.id === id ? { ...o, currentStage: stage } : o));
  emit();
  const updated = orders.find((o) => o.id === id);
  if (updated) syncToFirestore(updated);
}

export function deleteOrder(id: string) {
  orders = orders.filter((o) => o.id !== id);
  emit();
  if (_labId && db) {
    try { deleteDoc(caseDocRef(_labId, id)); } catch {}
  }
}

export async function getLabOrders(labId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, "lab_orders", labId, "cases"), orderBy("caseId", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Order);
  } catch {
    return [];
  }
}

export async function submitDentistCase(
  labId: string,
  data: {
    patient: string;
    doctor: string;
    workType: string;
    dueDate?: string;
    unitsCount: number;
    notes: string;
    clinic: string;
    dentistId: string;
    dentistName: string;
    shade?: string;
    material?: string;
    attachments?: OrderAttachment[];
    patientAge?: string;
    patientGender?: string;
    patientPhone?: string;
    doctorSignature?: string;
    rxTeeth?: Record<string, string>;
    rxItems?: string[];
    rxData?: Record<string, unknown>;
  },
) {
  const id = `case_${Date.now().toString(36)}`;
  const orderNumber = `ORD-${String(_counter + 1).padStart(3, "0")}`;
  const order: Order = {
    id,
    orderNumber,
    caseId: _counter + 1,
    patient: data.patient,
    doctor: data.doctor,
    workType: data.workType,
    receivedDate: new Date().toISOString().split("T")[0],
    dueDate: data.dueDate ?? "",
    status: "new",
    currentStage: "impression",
    agent: data.dentistName,
    unitsCount: data.unitsCount,
    unitPrice: 0,
    currency: "USD",
    discount: 0,
    price: 0,
    notes: data.notes,
    clinic: data.clinic,
    targetLabId: labId,
    dentistId: data.dentistId,
    shade: data.shade,
    material: data.material,
    attachments: data.attachments,
    patientAge: data.patientAge,
    patientGender: data.patientGender,
    patientPhone: data.patientPhone,
    doctorSignature: data.doctorSignature,
    rxTeeth: data.rxTeeth,
    rxItems: data.rxItems,
    rxData: data.rxData,
  };

  await setDoc(caseDocRef(labId, id), stripFinancialFields(order));
  await writeCaseFinance(labId, id, order);
  return order;
}
