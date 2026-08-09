import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { createNotification } from "@/components/NotificationBell";
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
        const casesQuery = query(
          collectionGroup(db, "cases"),
          where("dentistId", "==", dentistId),
          orderBy("caseId", "desc"),
        );

        const unsub = onSnapshot(casesQuery, (snap) => {
          const results = snap.docs.map((d) => {
            const labId = d.ref.parent.parent?.id ?? "unknown";
            return { labId, order: d.data() as Order };
          });
          setCases(results);
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
