import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

// Per-browser "have I opened this order" tracking, so the Orders tab badge
// counts *unseen* orders instead of the all-time total (same as native —
// native-app/src/lib/orderSeen.ts). Keyed per account.

function storageKey(uid: string): string {
  return `seen_orders_${uid}`;
}

function readSeenIds(uid: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useSeenOrderIds(uid?: string) {
  const query = useQuery({
    queryKey: ["seenOrders", uid],
    enabled: !!uid && typeof window !== "undefined",
    queryFn: () => readSeenIds(uid!),
    staleTime: Infinity,
  });
  return useMemo(() => new Set(query.data ?? []), [query.data]);
}

export function useMarkOrderSeen(uid?: string) {
  const qc = useQueryClient();
  return (orderId: string) => {
    if (!uid) return;
    const current = new Set(readSeenIds(uid));
    if (current.has(orderId)) return;
    current.add(orderId);
    const next = Array.from(current);
    try {
      localStorage.setItem(storageKey(uid), JSON.stringify(next));
    } catch {
      /* non-critical */
    }
    qc.setQueryData(["seenOrders", uid], next);
  };
}
