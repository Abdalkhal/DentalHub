import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Local, per-device "have I opened this order" tracking so the bottom-tab
// badge can show *unseen* orders instead of the total count — opening an
// order (tap-to-expand) should make the badge go down, same as a read/unread
// inbox. There's no such field on the order doc itself (see lib/orders.ts),
// so this lives in localStorage, keyed per account so switching accounts on
// the same device doesn't leak seen-state between them.

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
    queryKey: ['seenOrders', uid],
    enabled: !!uid,
    queryFn: () => readSeenIds(uid!),
    staleTime: Infinity,
  });
  const set = useMemo(() => new Set(query.data ?? []), [query.data]);
  return set;
}

export function useMarkOrderSeen(uid?: string) {
  const qc = useQueryClient();
  return (orderId: string) => {
    if (!uid) return;
    const current = new Set(readSeenIds(uid));
    if (current.has(orderId)) return;
    current.add(orderId);
    const next = Array.from(current);
    localStorage.setItem(storageKey(uid), JSON.stringify(next));
    qc.setQueryData(['seenOrders', uid], next);
  };
}
