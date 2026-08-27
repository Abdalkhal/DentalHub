import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import {
  collection, getDocs, getDoc, query, where, Timestamp,
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
      availability: (o.availability as "available" | "not_available" | undefined) ?? undefined,
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

  let dentistPhotoURL = "";
  try {
    const dSnap = await getDoc(doc(db, "user_roles", dentist.id));
    if (dSnap.exists()) {
      dentistPhotoURL = ((dSnap.data() as Record<string, unknown>).photoURL as string) || "";
    }
  } catch {
    // photo is best-effort
  }

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
        senderName: dentist.name,
        senderPhotoURL: dentistPhotoURL,
        isRead: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
    } catch {}

    if (!firstOrderId) firstOrderId = orderId;
    created++;
  }

  // Decrement stock for every ordered product so the new quantity is reflected
  // automatically on both the dentist and the supplier sides. Best-effort:
  // a failure here must never block the order itself.
  const byProduct = new Map<string, number>();
  for (const item of items) {
    const id = item.productId || item.id;
    if (!id) continue;
    byProduct.set(id, (byProduct.get(id) ?? 0) + (item.quantity || 1));
  }
  for (const [productId, qty] of byProduct) {
    try {
      const pRef = doc(db, "products", productId);
      const pSnap = await getDoc(pRef);
      if (!pSnap.exists()) continue;
      const current = Number((pSnap.data() as Record<string, unknown>).stock);
      if (!Number.isFinite(current) || current <= 0) continue;
      const next = Math.max(0, current - qty);
      await updateDoc(pRef, { stock: next, inStock: next > 0 });
    } catch {
      // ignore — the order is already placed
    }
  }

  clearCart();
  return { count: created, orderId: firstOrderId };
}

/**
 * Confirms an order: generates the Invoice document (status "confirmed"),
 * updates the order status to "confirmed", and notifies the dentist about any
 * products that could not be provided. Items marked "not_available" are
 * excluded from the final invoice. Returns the new invoice id.
 */
export async function confirmOrder(order: OrderDoc): Promise<string> {
  const invoiceId = doc(collection(db, "invoices")).id;

  // Always re-read the latest order so per-item availability set just before
  // confirming is honoured (the in-memory order may be stale).
  const snap = await getDoc(doc(db, "orders", order.id));
  const latest = snap.exists() ? fromDoc(order.id, snap.data()) : order;

  const availableItems = (latest.items ?? []).filter(
    (i) => i.availability !== "not_available",
  );
  const unavailableItems = (latest.items ?? []).filter(
    (i) => i.availability === "not_available",
  );

  const totalUSD = availableItems
    .filter((i) => i.currency !== "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const totalIQD = availableItems
    .filter((i) => i.currency === "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const total = totalUSD + totalIQD;

  await setDoc(doc(db, "invoices", invoiceId), {
    id: invoiceId,
    orderNumber: latest.orderNumber || generateOrderNumber(),
    officeId: latest.supplierId,
    doctorId: latest.dentistId,
    doctorName: latest.dentistName,
    clinicName: latest.clinicName || latest.dentistName,
    doctorPhone: latest.dentistPhone || "",
    doctorAddress: latest.dentistAddress || "",
    items: availableItems,
    total,
    totalUSD,
    totalIQD,
    note: latest.note || "",
    discount: latest.discount ?? null,
    status: "confirmed",
    createdAt: serverTimestamp(),
    confirmedAt: serverTimestamp(),
    shippedAt: null,
    deliveredAt: null,
    rejectedAt: null,
  });

  // Notify the dentist about products that could not be provided.
  if (unavailableItems.length > 0 && latest.dentistId) {
    const notifId = `${latest.dentistId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let senderName = "";
    let senderPhotoURL = "";
    try {
      const sSnap = await getDoc(doc(db, "user_roles", latest.supplierId));
      if (sSnap.exists()) {
        const s = sSnap.data() as Record<string, unknown>;
        senderName = (s.name as string) || "";
        senderPhotoURL = (s.photoURL as string) || "";
      }
    } catch {
      // sender info is best-effort
    }
    try {
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        userId: latest.dentistId,
        title: "تعذر توفير منتج في طلبك",
        body:
          unavailableItems.length === 1
            ? `تعذر توفير المنتج "${unavailableItems[0].name}" في طلبك ${latest.orderNumber || ""}`
            : `تعذر توفير المنتجات التالية في طلبك ${latest.orderNumber || ""}: ${unavailableItems
                .map((i) => i.name)
                .join("، ")}`,
        type: "order_status",
        orderId: latest.id,
        senderName,
        senderPhotoURL,
        isRead: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
    } catch {
      // notification is best-effort
    }
  }

  await updateDoc(doc(db, "orders", latest.id), {
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

/** Toggles the availability of a single item inside a pending order. */
export async function updateOrderItemAvailability(
  orderId: string,
  index: number,
  availability: "available" | "not_available",
): Promise<void> {
  const snap = await getDoc(doc(db, "orders", orderId));
  if (!snap.exists()) return;
  const items = (snap.data().items as unknown[]) ?? [];
  const next = items.map((it, i) =>
    i === index ? { ...(it as Record<string, unknown>), availability } : it,
  );
  await updateDoc(doc(db, "orders", orderId), { items: next });
}

export function useOrders(supplierId?: string) {
  return useQuery({
    queryKey: [...ordersQueryKey, "supplier", supplierId],
    enabled: !!supplierId,
    queryFn: async (): Promise<OrderDoc[]> => {
      // Single equality filter only (no orderBy) so this works with the
      // automatic single-field index; we sort client-side.
      const q = query(collection(db, "orders"), where("supplierId", "==", supplierId!));
      const snap = await getDocs(q);
      return snap.docs
        .map((d) => fromDoc(d.id, d.data()))
        .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt));
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
