import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { app } from "@/integrations/firebase/config";
import {
  collection, getDocs, query, where, Timestamp,
  doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "@/lib/toast";
import type { OrderDoc, OrderStatus } from "@/integrations/firebase/types";
import { getCart, clearCart } from "@/lib/cartStore";

const functions = getFunctions(app);

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

/**
 * Checkout: sends the cart to the `placeVerifiedOrder` Cloud Function, which
 * re-reads every product's price/currency/supplier server-side (never
 * trusting the client's cart for the billed amount), groups items per
 * supplier, and writes the Order doc(s) + supplier notification. Stock is
 * decremented on confirmation, not here — see `confirmOrder`. Returns the
 * number of orders created plus the first order id.
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
  const call = httpsCallable<
    {
      items: { productId: string; quantity: number }[];
      dentist: typeof dentist;
      note?: string;
      discount?: OrderDoc["discount"];
    },
    { count: number; orderId?: string; skippedCount?: number }
  >(functions, "placeVerifiedOrder");

  const res = await call({
    items: items.map((i) => ({ productId: i.productId, quantity: i.quantity || 1 })),
    dentist,
    note: opts?.note,
    discount: opts?.discount,
  });

  clearCart();
  // A cart item whose product was deleted (or lost its supplier) between
  // add-to-cart and checkout is dropped server-side rather than silently
  // billed at a stale/forged price — tell the dentist instead of letting
  // the order look complete when it isn't.
  if (res.data.skippedCount) {
    toast.error(
      res.data.skippedCount === 1
        ? 'تعذر طلب أحد المنتجات لأنه لم يعد متوفراً — تم استبعاده من الطلب'
        : `تعذر طلب ${res.data.skippedCount} منتجات لأنها لم تعد متوفرة — تم استبعادها من الطلب`,
    );
  }
  return res.data;
}

/**
 * Confirms an order via the `confirmVerifiedOrder` Cloud Function, which
 * recomputes the invoice total from the order's own (already
 * server-verified) item prices, creates the Invoice doc, decrements stock
 * for the items that made it in, notifies the dentist about any unavailable
 * items, and marks the order "confirmed". Returns the new invoice id.
 */
export async function confirmOrder(order: OrderDoc): Promise<string> {
  const call = httpsCallable<{ orderId: string }, { invoiceId: string }>(functions, "confirmVerifiedOrder");
  const res = await call({ orderId: order.id });
  return res.data.invoiceId;
}

/** Marks an order as unavailable/rejected — no invoice is generated. */
export async function markOrderUnavailable(orderId: string): Promise<void> {
  await updateDoc(doc(db, "orders", orderId), {
    status: "rejected",
    updatedAt: serverTimestamp(),
  });
}

/**
 * Toggles the availability of a single item inside a pending order via the
 * `setOrderItemAvailability` Cloud Function — a direct client `updateDoc` on
 * `items` can't be scoped to just this one sub-field, which would also let
 * price/quantity be rewritten in the same write.
 */
export async function updateOrderItemAvailability(
  orderId: string,
  index: number,
  availability: "available" | "not_available",
): Promise<void> {
  const call = httpsCallable<
    { orderId: string; index: number; availability: "available" | "not_available" },
    { ok: boolean }
  >(functions, "setOrderItemAvailability");
  await call({ orderId, index, availability });
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
