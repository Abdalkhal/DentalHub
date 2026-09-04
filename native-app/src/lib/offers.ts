import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { useRealtimeQuery } from "@/lib/realtime";

export type Offer = {
  id: string;
  supplierId: string;
  title: string;
  description: string;
  imageUrl: string;
  expiryDate: string;
  price?: number;
  currency?: string;
  discountPct?: number;
  status?: "active" | "pending" | "expired" | "rejected";
  rejectReason?: string;
  createdAt?: string;
};

const fromDoc = (id: string, data: Record<string, unknown>): Offer => ({
  id,
  supplierId: (data.supplierId as string) ?? "",
  title: (data.title as string) ?? "",
  description: (data.description as string) ?? "",
  imageUrl: (data.imageUrl as string) ?? "",
  expiryDate: (data.expiryDate as string) ?? "",
  price: typeof data.price === "number" ? data.price : undefined,
  currency: (data.currency as string) ?? "USD",
  discountPct: typeof data.discountPct === "number" ? data.discountPct : undefined,
  status: (data.status as Offer["status"]) ?? undefined,
  rejectReason: (data.rejectReason as string) ?? undefined,
  createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? undefined,
});

export const offersQueryKey = ["offers"] as const;

export function useOffers(supplierId: string) {
  const q = supplierId
    ? query(collection(db, "offers"), orderBy("createdAt", "desc"))
    : null;
  const { data, loading } = useRealtimeQuery<Offer>(q, (d) => fromDoc(d.id, d.data()));
  return { data: data.filter((o) => o.supplierId === supplierId), isLoading: loading };
}

export function useAllOffers() {
  const q = query(collection(db, "offers"), orderBy("createdAt", "desc"));
  const { data, loading } = useRealtimeQuery<Offer>(q, (d) => fromDoc(d.id, d.data()));
  return { data, isLoading: loading };
}

export function useUpsertOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (offer: Offer) => {
      const ref = doc(db, "offers", offer.id);
      await setDoc(
        ref,
        {
          id: offer.id,
          supplierId: offer.supplierId,
          title: offer.title,
          description: offer.description,
          imageUrl: offer.imageUrl,
          expiryDate: offer.expiryDate,
          price: offer.price ?? null,
          currency: offer.currency ?? "USD",
          discountPct: offer.discountPct ?? null,
          status: offer.status ?? "active",
          rejectReason: offer.rejectReason ?? null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        },
        { merge: true },
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: offersQueryKey }),
  });
}

export function useDeleteOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await deleteDoc(doc(db, "offers", id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: offersQueryKey }),
  });
}
