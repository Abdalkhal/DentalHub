import { useEffect, useState } from "react";
import { collectionGroup, query, where, orderBy, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { Order } from "./ordersStore";

export type DesignerCase = { labId: string; order: Order };

/**
 * PHASE 4 — assigned-case list.
 * Reads only the cases where `case.designerId == currentUser.id`. Financial
 * fields are already stripped from the case document (private/finance), so no
 * pricing data ever reaches this hook.
 */
export function useDesignerCases(designerId: string) {
  const [cases, setCases] = useState<DesignerCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!designerId) {
      setCases([]);
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    const q = query(
      collectionGroup(db, "cases"),
      where("designerId", "==", designerId),
      orderBy("caseId", "desc"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCases(
          snap.docs.map((d) => ({
            labId: d.ref.parent.parent?.id ?? "",
            order: d.data() as Order,
          })),
        );
        setLoading(false);
      },
      () => {
        setCases([]);
        setLoading(false);
      },
    );
    return unsub;
  }, [designerId]);

  return { cases, loading };
}

/** PHASE 4 — reads a single assigned case document (no financial data). */
export function useDesignerCase(labId: string, caseId: string) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!labId || !caseId) {
      setOrder(null);
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "lab_orders", labId, "cases", caseId),
      (snap) => {
        setOrder(snap.exists() ? (snap.data() as Order) : null);
        setLoading(false);
      },
      () => {
        setOrder(null);
        setLoading(false);
      },
    );
    return unsub;
  }, [labId, caseId]);

  return { order, loading };
}
