import { useCallback, useEffect, useState } from "react";
import { onSnapshot, doc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/integrations/firebase/config";
import { db } from "@/integrations/firebase/client";
import type { Order } from "./ordersStore";

export type DesignerCase = { labId: string; order: Order };

/**
 * PHASE 4 — assigned-case list.
 * Reads via the `listDesignerCases` Cloud Function (Admin SDK) rather than a
 * client-side `collectionGroup("cases")` query — see labMembersStore.ts's
 * `useLabMembers` for the full explanation: Firestore requires a separate
 * `{path=**}` collection-group security rule to authorize that query shape,
 * and getting it wrong fails outright ("Missing or insufficient
 * permissions") rather than just returning nothing, which is exactly what
 * made a genuinely-assigned case invisible here with no visible error.
 * Financial fields are already stripped from the case document
 * (private/finance), so no pricing data ever reaches this hook.
 */
export function useDesignerCases(designerId: string) {
  const [cases, setCases] = useState<DesignerCase[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!designerId) {
      setCases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const functions = getFunctions(app);
      const call = httpsCallable<Record<string, never>, { cases: (Order & { labId: string })[] }>(
        functions,
        "listDesignerCases",
      );
      const res = await call({});
      setCases(res.data.cases.map((c) => ({ labId: c.labId, order: c })));
    } catch (err) {
      console.warn("Failed to fetch designer cases:", err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [designerId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { cases, loading, refetch };
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
