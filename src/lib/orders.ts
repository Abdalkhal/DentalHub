import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import {
  collection, getDocs, query, where, orderBy, Timestamp,
  doc, setDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import type { OrderDoc, OrderStatus, InvoiceItem } from "@/integrations/firebase/types";
import { getCart, clearCart, type CartItem } from "@/lib/cartStore";

function createdAtMs(v: unknown): number {
  if (!v) return 0;
  const o = v as { toMillis?: () => number };
  if (typeof o.toMillis === "function") return o.toMillis();
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

const fromDoc = (id: string, data: Record<string, unknown>): OrderDoc => ({
  id,
  supplierId: (data.supplierId as string) ?? "",
  dentistId: (data.dentistId as string) ?? "",
  dentistName: (data.dentistName as string) ?? "",
  dentistPhone: (data.dentistPhone as string) ?? undefined,
  dentistAddress: (data.dentistAddress as string) ?? undefined,
  clinicName: (data.clinicName as string) ?? undefined,
  orderNumber: (data.orderNumber as string) ?? undefined,
  items: ((data.items as unknown[]) ?? []).map((it) => {
    const o = it as Record<string, unknown>;
    return {
      productId: (o.productId as string) ?? "",
      name: (o.name as string) ?? "",
      quantity: Number(o.quantity) || 1,
      price: Number(o.price) || 0,
      currency: o.currency === "IQD" ? "IQD" : "USD",
    };
  }),
  total: Number(data.total) || 0,
  totalUSD: (data.totalUSD as number) ?? undefined,
  totalIQD: (data.totalIQD as number) ?? undefined,
  status: (data.status as OrderStatus) ?? "pending",
  note: (data.note as string) ?? undefined,
  discount: (data.discount as OrderDoc["discount"]) ?? null,
  invoiceId: (data.invoiceId as string) ?? undefined,
  createdAt: (data.createdAt as Timestamp) ?? Timestamp.now(),
  updatedAt: (data.updatedAt as Timestamp) ?? Timestamp.now(),
});

export const ordersQueryKey = ["orders"] as const;

function generateOrderNumber(): string {
  return `DNT-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Checkout: groups cart items per supplier and, for each supplier, writes a
 * single Order document (status "pending") + a Notification in one place.
 * NO invoice is created here — invoices are created only upon confirmation.
 * Returns the number of orders created plus the first order id.
 */
export async function placeCartOrder(
  dentist: {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    city?: string;
    clinicName?: string;
  },
  opts?: {
    note?: string;
    discount?: { code?: string; discountUSD?: number; discountIQD?: number };
  },
): Promise<{ count: number; orderId?: string }> {
  const items = getCart();

  const bySupplier = new Map<string, CartItem[]>();
  for (const item of items) {
    const list = bySupplier.get(item.officeId) ?? [];
    list.push(item);
    bySupplier.set(item.officeId, list);
  }

  let created = 0;
  let firstOrderId: string | undefined;
  for (const [supplierId, supplierItems] of bySupplier) {
    const orderId = doc(collection(db, "orders")).id;
    const orderNumber = generateOrderNumber();
    const orderItems: InvoiceItem[] = supplierItems.map((i) => ({
      productId: i.productId,
      name: i.productName,
      quantity: i.quantity || 1,
      price: i.unitPrice || 0,
      currency: i.currency === "IQD" ? "IQD" : "USD",
    }));
    const total = supplierItems.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 1), 0);
    const totalUSD = supplierItems
      .filter((i) => i.currency !== "IQD")
      .reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 1), 0);
    const totalIQD = supplierItems
      .filter((i) => i.currency === "IQD")
      .reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 1), 0);

    // 1) Persist the order (status pending). This is the supplier's "My Orders" record.
    await setDoc(doc(db, "orders", orderId), {
      id: orderId,
      supplierId,
      dentistId: dentist.id,
      dentistName: dentist.name,
      dentistPhone: dentist.phone || "",
      dentistAddress: dentist.address || "",
      clinicName: dentist.clinicName || dentist.name,
      orderNumber,
      items: orderItems,
      total,
      totalUSD,
      totalIQD,
      note: opts?.note || "",
      discount: opts?.discount ?? null,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 2) Notify the supplier (best-effort, non-blocking) with deep-link data.
    try {
      const itemLabel = orderItems.length === 1 ? "منتج" : "منتجات";
      await setDoc(doc(db, "notifications", `${supplierId}_${Date.now()}_${created}`), {
        id: `${supplierId}_${Date.now()}_${created}`,
        userId: supplierId,
        title: `طلب جديد من ${dentist.name}`,
        body: dentist.address
          ? `رقم الطلب ${orderNumber} · ${orderItems.length} ${itemLabel} — ${dentist.address}`
          : `رقم الطلب ${orderNumber} · ${orderItems.length} ${itemLabel}`,
        type: "order_new",
        orderId,
        isRead: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
    } catch {}

    if (!firstOrderId) firstOrderId = orderId;
    created++;
  }

  clearCart();
  return { count: created, orderId: firstOrderId };
}

/**
 * Confirms an order: generates the Invoice document (status "confirmed") and
 * updates the order status to "confirmed". Returns the new invoice id.
 */
export async function confirmOrder(order: OrderDoc): Promise<string> {
  const invoiceId = doc(collection(db, "invoices")).id;

  await setDoc(doc(db, "invoices", invoiceId), {
    id: invoiceId,
    orderNumber: order.orderNumber || generateOrderNumber(),
    officeId: order.supplierId,
    doctorId: order.dentistId,
    doctorName: order.dentistName,
    clinicName: order.clinicName || order.dentistName,
    doctorPhone: order.dentistPhone || "",
    doctorAddress: order.dentistAddress || "",
    items: order.items,
    total: order.total,
    totalUSD: order.totalUSD ?? 0,
    totalIQD: order.totalIQD ?? 0,
    note: order.note || "",
    discount: order.discount ?? null,
    status: "confirmed",
    createdAt: serverTimestamp(),
    confirmedAt: serverTimestamp(),
    shippedAt: null,
    deliveredAt: null,
    rejectedAt: null,
  });

  await updateDoc(doc(db, "orders", order.id), {
    status: "confirmed",
    invoiceId,
    updatedAt: serverTimestamp(),
  });

  return invoiceId;
}

/** Marks an order as unavailable/rejected — no invoice is generated. */
export async function markOrderUnavailable(orderId: string): Promise<void> {
  await updateDoc(doc(db, "orders", orderId), {
    status: "rejected",
    updatedAt: serverTimestamp(),
  });
}

export function useOrders(supplierId?: string) {
  return useQuery({
    queryKey: [...ordersQueryKey, "supplier", supplierId],
    enabled: !!supplierId,
    queryFn: async (): Promise<OrderDoc[]> => {
      const q = query(
        collection(db, "orders"),
        where("supplierId", "==", supplierId!),
        orderBy("createdAt", "desc"),
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => fromDoc(d.id, d.data()));
    },
    staleTime: 30_000,
  });
}

export function useDentistOrders(dentistId?: string) {
  return useQuery({
    queryKey: [...ordersQueryKey, "dentist", dentistId],
    enabled: !!dentistId,
    queryFn: async (): Promise<OrderDoc[]> => {
      const q = query(collection(db, "orders"), where("dentistId", "==", dentistId!));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => fromDoc(d.id, d.data()))
        .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
    },
    staleTime: 30_000,
  });
}
