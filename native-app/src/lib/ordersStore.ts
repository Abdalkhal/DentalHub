import { useSyncExternalStore } from "react";
import {
  doc, setDoc, getDoc, onSnapshot, deleteDoc, updateDoc,
  collection, query, orderBy, getDocs, collectionGroup, where,
} from "firebase/firestore";
import { deleteObject, ref as storageRef } from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";
import {
  writeCaseFinance,
  stripFinancialFields,
  type CaseFinance,
} from "./financeStore";
import { sanitizeForFirestore } from "./firestoreUtils";
import { WORK_TYPES } from "./dentalConfig";
import type { CombinedLabOrder } from "@/components/CombinedLabOrderModal";

export type OrderStatus = "new" | "in_progress" | "completed" | "delayed";

export type ProdStageId = "impression" | "design" | "printing" | "ceramic" | "qc" | "dispatch";

export type OrderAttachment = {
  name: string;
  /**
   * Storage path. Resolved on demand through `resolveCaseFileUri`, which goes
   * via `getBlob` so Storage Rules are evaluated against the caller.
   */
  path: string;
  type: string;
  /**
   * @deprecated Permanent `getDownloadURL` token from before paths were used.
   * These bypass Storage Rules entirely and cannot be revoked. Read-only
   * fallback for pre-existing cases; never set this on new attachments.
   */
  url?: string;
};

export type PricingItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: "USD" | "IQD";
  price?: number;
  totalPrice?: number;
  total?: number;
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
  totalAmount?: number;
  totalPrice?: number;
  total?: number;
  items?: Array<{ price?: number }>;
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
  source?: "internal" | "incoming_doctor_case";
  // Rich RX form fields
  patientAge?: string;
  patientGender?: string;
  patientPhone?: string;
  doctorSignature?: string;
  fileUrl?: string;
  fileName?: string;
  filePath?: string;
  fileStatus?: "uploaded" | "deleted" | null;
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

/** Strips financial fields and removes any `undefined` before writing to Firestore. */
function serializeOrder(order: Order): Order {
  return sanitizeForFirestore(stripFinancialFields(order));
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
        await setDoc(caseDocRef(labId, o.id), serializeOrder(o));
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
    await setDoc(caseDocRef(_labId, order.id), serializeOrder(order));
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

/** Formats a raw order into a clean `ORD-###` display ID. */
export function formatOrderId(order: Pick<Order, "orderNumber" | "caseId" | "id">): string {
  if (order.orderNumber && /^ORD-/.test(order.orderNumber)) return order.orderNumber;
  if (order.caseId) return `ORD-${String(order.caseId).padStart(3, "0")}`;
  return order.orderNumber || order.id;
}

export function getNextCaseId(): number {
  return _counter + 1;
}

const MATERIAL_LABELS: Record<string, string> = {
  "material.zirconia": "زركونيا",
  "material.emax": "إيماكس",
  "material.pfm": "سيراميك على معدن",
  "material.full_cast_metal": "معدن كامل",
  "material.pmma": "تركيبات مؤقتة",
  "material.feldspathic": "سيراميك تجميلي",
  "material.clear_aligner": "تقويم شفاف",
  "material.titanium_bar": "تيتانيوم بار",
};

/**
 * Builds a full internal `Order` (with a fresh id / order number / case id) from the
 * "New Order" modal payload. Used by both the lab dashboard and the incoming-order
 * confirmation workflow.
 *
 * When `existing` is provided, the existing case's identity (id / order number /
 * case id / received date) is preserved instead of generating new values, so the
 * order is updated in place rather than duplicated.
 */
export function buildInternalOrder(
  o: CombinedLabOrder,
  status: OrderStatus,
  existing?: Pick<Order, "id" | "orderNumber" | "caseId" | "receivedDate">,
): Order {
  const units = o.unitsCount || 0;
  const USD_RATE = 1480;
  const workTypeLabel = WORK_TYPES.find((w) => w.id === o.workType)?.ar ?? o.workType ?? "";
  const pricingItems =
    o.pricingMode === "mixed" && o.pricingItems?.length
      ? o.pricingItems.map((it) => ({
          id: it.id,
          name: it.name,
          quantity: Number(it.quantity) || 0,
          unitPrice: Number(it.unitPrice) || 0,
          currency: it.currency,
        }))
      : [
          {
            id: crypto.randomUUID(),
            name: workTypeLabel,
            quantity: units,
            unitPrice: o.currency === "USD" ? (o.unitPriceIQD || 0) / USD_RATE : o.unitPriceIQD || 0,
            currency: o.currency,
          },
        ];
  const price =
    o.pricingMode === "single" && o.currency === "USD"
      ? o.finalTotalUSD
      : Math.max(0, o.finalTotalIQD);
  // IQD total kept on the case document (not stripped) so the referring
  // dentist can read the invoice amount.
  const totalAmount = Math.round(Math.max(0, o.finalTotalIQD));

  return {
    id: existing?.id ?? crypto.randomUUID(),
    orderNumber: existing?.orderNumber ?? getNextOrderNumber(),
    caseId: existing?.caseId ?? getNextCaseId(),
    receivedDate: existing?.receivedDate ?? new Date().toISOString(),
    dueDate: o.deliveryDate ?? "",
    patient: o.patientName ?? "",
    doctor: o.doctorName ?? "",
    workType: MATERIAL_LABELS[o.material] ?? o.material ?? "",
    material: o.material ?? "",
    workTypeId: o.workType ?? "",
    manufacturingMethod: o.manufacturingMethod ?? "",
    frameworkCreation: o.frameworkCreation ?? "",
    shade: o.shade ?? "",
    pricingMode: o.pricingMode,
    currency: o.currency,
    pricingItems,
    unitsCount: units,
    unitPrice: o.unitPriceIQD || 0,
    discount: o.discountAmountIQD || 0,
    price,
    totalAmount,
    subtotalIQD: o.subtotalIQD,
    discountAmountIQD: o.discountAmountIQD,
    finalTotalUSD: o.finalTotalUSD,
    notes: o.notes ?? "",
    clinic: o.clinicName ?? "",
    implantCompany: o.implantCompany,
    implantSystem: o.implantSystem,
    implantConnection: o.implantConnection,
    implantPlatform: o.implantPlatform,
    implantScanBody: o.implantScanBody,
    implantLevel: o.implantLevel,
    implantRetention: o.implantRetention,
    alignerTreatmentType: o.alignerTreatmentType,
    alignerArch: o.alignerArch,
    alignerScans: o.alignerScans,
    alignerCount: o.alignerCount,
    alignerWearProtocol: o.alignerWearProtocol,
    titaniumFrameworkType: o.titaniumFrameworkType,
    designerId: o.designerId,
    designerName: o.designerName,
    ceramistId: o.ceramistId,
    ceramistName: o.ceramistName,
    status,
    agent: "",
  };
}

export function addOrder(order: Order) {
  orders = [{ ...order, source: order.source ?? "internal" }, ...orders];
  emit();
  syncToFirestore(order);
}

function isCompletedStatusValue(status: string): boolean {
  const v = String(status ?? "").trim().toLowerCase();
  return v === "completed" || v === "مكتملة" || v === "مكتمل";
}

/** Permanently erases the heavy STL/ZIP file once a case is completed. */
async function cleanupOrderFile(
  labId: string,
  orderId: string,
  filePath: string | null | undefined,
): Promise<void> {
  if (filePath) {
    try {
      await deleteObject(storageRef(storage, filePath));
    } catch (err) {
      console.warn("Failed to delete order file:", filePath, err);
    }
  }
  try {
    await updateDoc(caseDocRef(labId, orderId), {
      fileUrl: null,
      filePath: null,
      fileStatus: "deleted",
    });
  } catch (err) {
    console.warn("Failed to update order file status:", orderId, err);
  }
}

/** Attaches the uploaded scanner file metadata to the order document. */
export async function attachOrderFile(
  labId: string,
  orderId: string,
  file: { url: string; name: string; path: string },
): Promise<void> {
  await updateDoc(caseDocRef(labId, orderId), {
    fileUrl: file.url,
    fileName: file.name,
    filePath: file.path,
    fileStatus: "uploaded",
  });
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  const target = orders.find((o) => o.id === id);
  orders = orders.map((o) => (o.id === id ? { ...o, status } : o));
  emit();
  // Partial update: only the status field is written, so dentist ownership
  // fields (dentistId, doctor, clinic, orderNumber, totalAmount, …) are never
  // overwritten or stripped on the Firestore document.
  if (_labId && db) {
    updateDoc(caseDocRef(_labId, id), { status }).catch((err) => {
      console.warn("Failed to update order status:", id, err);
    });
    if (isCompletedStatusValue(status)) {
      void cleanupOrderFile(_labId, id, target?.filePath ?? null);
    }
  }
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
    notes: data.notes ?? "",
    clinic: data.clinic ?? "",
    targetLabId: labId,
    dentistId: data.dentistId,
    source: "incoming_doctor_case",
    shade: data.shade ?? "",
    material: data.material ?? "",
    attachments: data.attachments ?? [],
    patientAge: data.patientAge ?? "",
    patientGender: data.patientGender ?? "",
    patientPhone: data.patientPhone ?? "",
    doctorSignature: data.doctorSignature ?? "",
    rxTeeth: data.rxTeeth ?? {},
    rxItems: data.rxItems ?? [],
    rxData: data.rxData ?? {},
  };

  await setDoc(caseDocRef(labId, id), serializeOrder(order));
  await writeCaseFinance(labId, id, order);
  return order;
}
