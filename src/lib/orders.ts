import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, query, where, orderBy, Timestamp, addDoc, serverTimestamp } from "firebase/firestore";
import type { OrderDoc } from "@/integrations/firebase/types";
import { createNotification } from "@/components/NotificationBell";
import { getCart, clearCart } from "@/lib/cartStore";

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

export async function placeCartOrder(dentist: {
  id: string;
  name: string;
  phone?: string;
  address?: string;
}): Promise<number> {
  const items = getCart();
  let created = 0;
  for (const item of items) {
    const total = (item.unitPrice || 0) * (item.quantity || 1);
    const ref = await addDoc(collection(db, "orders"), {
      supplierId: item.officeId,
      dentistId: dentist.id,
      dentistName: dentist.name,
      dentistPhone: dentist.phone || "",
      dentistAddress: dentist.address || "",
      productId: item.productId,
      productName: item.productName,
      productImage: item.productImage || "",
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      total,
      currency: item.currency || "USD",
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await createNotification({
      userId: item.officeId,
      title: dentist.name,
      body: dentist.address
        ? `طلب ${item.productName} × ${item.quantity || 1} — ${dentist.address}`
        : `طلب ${item.productName} × ${item.quantity || 1}`,
      type: "order_new",
      orderId: ref.id,
    });
    created++;
  }
  clearCart();
  return created;
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
