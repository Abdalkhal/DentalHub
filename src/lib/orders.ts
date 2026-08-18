import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import {
  collection, getDocs, query, where, orderBy, Timestamp,
  doc, setDoc, serverTimestamp,
} from "firebase/firestore";
import type { OrderDoc, InvoiceItem } from "@/integrations/firebase/types";
import { getCart, clearCart, type CartItem } from "@/lib/cartStore";

const fromDoc = (id: string, data: Record<string, unknown>): OrderDoc => ({
  id,
  supplierId: (data.supplierId as string) ?? "",
  dentistId: (data.dentistId as string) ?? "",
  dentistName: (data.dentistName as string) ?? "",
  dentistPhone: (data.dentistPhone as string) ?? undefined,
  dentistAddress: (data.dentistAddress as string) ?? undefined,
  productId: (data.productId as string) ?? "",
  productName: (data.productName as string) ?? "",
  productImage: (data.productImage as string) ?? undefined,
  quantity: (data.quantity as number) ?? 0,
  unitPrice: (data.unitPrice as number) ?? 0,
  total: (data.total as number) ?? 0,
  currency: (data.currency as string) ?? "IQD",
  status: (data.status as OrderDoc["status"]) ?? "pending",
  createdAt: (data.createdAt as Timestamp) ?? Timestamp.now(),
  updatedAt: (data.updatedAt as Timestamp) ?? Timestamp.now(),
});

export const ordersQueryKey = ["orders"] as const;

function generateOrderNumber(): string {
  return `DNT-${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Checkout: groups cart items per office and, for each office, writes an
 * Invoice document + a Notification document in a single atomic batch.
 * Returns the number of invoices created plus the first invoice id.
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
): Promise<{ count: number; invoiceId?: string }> {
  const items = getCart();

  const byOffice = new Map<string, CartItem[]>();
  for (const item of items) {
    const list = byOffice.get(item.officeId) ?? [];
    list.push(item);
    byOffice.set(item.officeId, list);
  }

  let created = 0;
  let firstInvoiceId: string | undefined;
  for (const [officeId, officeItems] of byOffice) {
    const invoiceId = doc(collection(db, "invoices")).id;
    const orderNumber = generateOrderNumber();
    const invoiceItems: InvoiceItem[] = officeItems.map((i) => ({
      productId: i.productId,
      name: i.productName,
      quantity: i.quantity || 1,
      price: i.unitPrice || 0,
      currency: i.currency === "IQD" ? "IQD" : "USD",
    }));
    const total = officeItems.reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 1), 0);
    const totalUSD = officeItems
      .filter((i) => i.currency !== "IQD")
      .reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 1), 0);
    const totalIQD = officeItems
      .filter((i) => i.currency === "IQD")
      .reduce((s, i) => s + (i.unitPrice || 0) * (i.quantity || 1), 0);

    // 1) Persist the order as an Invoice (status pending). This must succeed
    //    and must never be deleted — it is the dentist's order record.
    await setDoc(doc(db, "invoices", invoiceId), {
      id: invoiceId,
      orderNumber,
      officeId,
      doctorId: dentist.id,
      doctorName: dentist.name,
      clinicName: dentist.clinicName || dentist.name,
      doctorPhone: dentist.phone || "",
      doctorAddress: dentist.address || "",
      doctorCity: dentist.city || "",
      items: invoiceItems,
      total,
      totalUSD,
      totalIQD,
      note: opts?.note || "",
      discount: opts?.discount ?? null,
      status: "pending",
      createdAt: serverTimestamp(),
      confirmedAt: null,
      shippedAt: null,
      deliveredAt: null,
      rejectedAt: null,
    });

    // 2) Notify the office (best-effort, non-blocking) with deep-link data.
    try {
      const itemLabel = invoiceItems.length === 1 ? "منتج" : "منتجات";
      await setDoc(doc(db, "notifications", `${officeId}_${Date.now()}_${created}`), {
        id: `${officeId}_${Date.now()}_${created}`,
        userId: officeId,
        title: `طلب جديد من ${dentist.name}`,
        body: dentist.address
          ? `رقم الفاتورة ${orderNumber} · ${invoiceItems.length} ${itemLabel} — ${dentist.address}`
          : `رقم الفاتورة ${orderNumber} · ${invoiceItems.length} ${itemLabel}`,
        type: "order_new",
        orderId: invoiceId,
        invoiceId,
        isRead: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
    } catch {}

    if (!firstInvoiceId) firstInvoiceId = invoiceId;
    created++;
  }

  clearCart();
  return { count: created, invoiceId: firstInvoiceId };
}

export function useOrders(supplierId?: string) {
  return useQuery({
    queryKey: [...ordersQueryKey, supplierId],
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
