import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { createNotification } from "@/lib/notifications";
import type { Order } from "@/lib/ordersStore";

export function useDentistCases(dentistId: string) {
  const [cases, setCases] = useState<{ labId: string; order: Order }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dentistId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubs: (() => void)[] = [];

    import("@/integrations/firebase/client").then(async ({ db }) => {
      const { query, onSnapshot, collectionGroup, where } = await import("firebase/firestore");

      try {
        // Filter strictly by the doctor's unique id. No orderBy here so the
        // collectionGroup query only needs the auto-created single-field index
        // on `dentistId`, avoiding a missing composite-index failure that
        // previously returned 0 cases.
        const casesQuery = query(
          collectionGroup(db, "cases"),
          where("dentistId", "==", dentistId),
        );

        const unsub = onSnapshot(casesQuery, (snap) => {
          const results = snap.docs.map((d) => {
            const labId = d.ref.parent.parent?.id ?? "unknown";
            const order = d.data() as Order;
            if (!order.id) order.id = d.id;
            return { labId, order };
          });
          // Deduplicate by unique order.id (a collectionGroup snapshot can
          // surface the same case more than once).
          const deduped = Array.from(
            new Map(results.map((c) => [c.order.id, c])).values(),
          );
          deduped.sort((a, b) => (Number(b.order.caseId) || 0) - (Number(a.order.caseId) || 0));
          setCases(deduped);
          setLoading(false);
        }, (err) => {
          console.warn("Dentist cases listener error:", err);
          setLoading(false);
        });

        unsubs.push(unsub);
      } catch {
        setLoading(false);
      }
    });

    return () => unsubs.forEach((u) => u());
  }, [dentistId]);

  return { cases, loading };
}

/**
 * Legacy fallback for cases that predate `dentistId` (or were created without
 * it). Matches by the doctor's name, case-insensitively and trimmed, excluding
 * any ids already resolved from Firestore.
 */
export function filterLegacyOrders(
  orders: Order[],
  excludeIds: Set<string>,
  doctorName: string,
): Order[] {
  const target = doctorName.trim().toLowerCase();
  if (!target) return [];
  return orders.filter((o) => {
    if (!o.id || excludeIds.has(o.id)) return false;
    if (o.dentistId) return false;
    return (o.doctor ?? "").trim().toLowerCase() === target;
  });
}

function normalizeStatus(status: unknown): string {
  return String(status ?? "").trim().toLowerCase();
}

/** Matches "completed" in both English and Arabic representations. */
export function isCompletedStatus(status: unknown): boolean {
  const s = normalizeStatus(status);
  return s === "completed" || s === "مكتملة" || s === "مكتمل";
}

/** Matches "in_progress" in both English and Arabic representations. */
export function isInProgressStatus(status: unknown): boolean {
  const s = normalizeStatus(status);
  return s === "in_progress" || s === "قيد التنفيذ";
}

/** Matches "new" in both English and Arabic representations. */
export function isNewStatus(status: unknown): boolean {
  const s = normalizeStatus(status);
  return s === "new" || s === "جديد";
}

export function useLabCases(labId: string) {
  const [cases, setCases] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!labId) {
      setLoading(false);
      return () => {};
    }

    const q = query(
      collection(db, "lab_orders", labId, "cases"),
      orderBy("caseId", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setCases(snap.docs.map((d) => d.data() as Order));
      setLoading(false);
    }, (err) => {
      console.warn("Lab cases listener error:", err);
      setLoading(false);
    });

    return unsub;
  }, [labId]);

  return { cases, loading };
}

export async function notifyDentistOnStatusChange(
  dentistId: string,
  order: Order,
  previousStatus: string,
  newStatus: string,
) {
  try {
    const { doc: fsDoc, getDoc } = await import("firebase/firestore");
    const profileSnap = await getDoc(fsDoc(db, "user_roles", order.doctor));

    let body = "";
    void profileSnap;
    if (newStatus === "completed") {
      body = `Case #${order.orderNumber} for patient ${order.patient} has been completed.`;
    } else if (newStatus === "in_progress") {
      body = `Case #${order.orderNumber} for patient ${order.patient} is now in production.`;
    } else {
      body = `Case #${order.orderNumber} status changed from ${previousStatus} to ${newStatus}.`;
    }

    await createNotification({
      userId: dentistId,
      title: "Case Updated",
      body,
      type: "order_status",
      orderId: order.id,
    });
  } catch {}
}

const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  in_progress: { ar: "قيد التنفيذ", en: "In Progress", color: "bg-sky-500" },
  completed: { ar: "مكتمل", en: "Completed", color: "bg-emerald-500" },
  delayed: { ar: "متأخر", en: "Delayed", color: "bg-rose-500" },
};

const STAGE_LABELS: Record<string, { ar: string; en: string }> = {
  impression: { ar: "استلام الطبعة", en: "Impression" },
  design: { ar: "التصميم", en: "Design" },
  printing: { ar: "الطباعة", en: "Printing" },
  ceramic: { ar: "السيراميك", en: "Ceramic" },
  qc: { ar: "فحص الجودة", en: "QC" },
  dispatch: { ar: "التوصيل", en: "Dispatch" },
};

const STAGE_ORDER = ["impression", "design", "printing", "ceramic", "qc", "dispatch"];

export function getCaseProgress(currentStage?: string) {
  if (!currentStage) return 0;
  const idx = STAGE_ORDER.indexOf(currentStage);
  return idx >= 0 ? Math.round(((idx + 1) / STAGE_ORDER.length) * 100) : 0;
}

export function getStatusLabel(status: string, lang: "ar" | "en" = "ar") {
  const entry = STATUS_LABELS[status];
  if (!entry) return status;
  return lang === "ar" ? entry.ar : entry.en;
}

export function getStatusColor(status: string) {
  return STATUS_LABELS[status]?.color ?? "bg-slate-500";
}

export function getStageLabel(stage: string, lang: "ar" | "en" = "ar") {
  const entry = STAGE_LABELS[stage];
  if (!entry) return stage;
  return lang === "ar" ? entry.ar : entry.en;
}
