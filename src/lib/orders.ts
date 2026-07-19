import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import type { OrderDoc } from "@/integrations/firebase/types";

const fromDoc = (id: string, data: Record<string, unknown>): OrderDoc => ({
  id,
  supplierId: (data.supplierId as string) ?? "",
  dentistId: (data.dentistId as string) ?? "",
  dentistName: (data.dentistName as string) ?? "",
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
