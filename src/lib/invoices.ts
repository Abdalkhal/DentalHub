import { useEffect, useState } from "react";
import { db } from "@/integrations/firebase/client";
import {
  collection, query, where, onSnapshot,
  doc, updateDoc, serverTimestamp, getDoc,
} from "firebase/firestore";
import type { InvoiceDoc } from "@/integrations/firebase/types";

function createdAtMs(v: unknown): number {
  if (!v) return 0;
  const o = v as { toMillis?: () => number };
  if (typeof o.toMillis === "function") return o.toMillis();
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

const mapItem = (o: Record<string, unknown>): InvoiceDoc["items"][number] => ({
  productId: (o.productId as string) ?? "",
  name: (o.name as string) ?? "",
  quantity: Number(o.quantity) || 1,
  price: Number(o.price) || 0,
  currency: o.currency === "IQD" ? "IQD" : "USD",
  availability: (o.availability as "available" | "not_available" | undefined) ?? undefined,
});

const fromDoc = (id: string, data: Record<string, unknown>): InvoiceDoc => ({
  id,
  orderNumber: (data.orderNumber as string) ?? "",
  officeId: (data.officeId as string) ?? "",
  doctorId: (data.doctorId as string) ?? "",
  doctorName: (data.doctorName as string) ?? "",
  clinicName: (data.clinicName as string) ?? "",
  doctorPhone: (data.doctorPhone as string) ?? "",
  doctorAddress: (data.doctorAddress as string) ?? undefined,
  doctorCity: (data.doctorCity as string) ?? undefined,
  items: ((data.items as unknown[]) ?? []).map((it) => mapItem(it as Record<string, unknown>)),
  total: (data.total as number) ?? 0,
  status: (data.status as InvoiceDoc["status"]) ?? "pending",
  createdAt: data.createdAt as InvoiceDoc["createdAt"],
  confirmedAt: (data.confirmedAt as InvoiceDoc["confirmedAt"]) ?? null,
  shippedAt: (data.shippedAt as InvoiceDoc["shippedAt"]) ?? null,
  deliveredAt: (data.deliveredAt as InvoiceDoc["deliveredAt"]) ?? null,
  rejectedAt: (data.rejectedAt as InvoiceDoc["rejectedAt"]) ?? null,
  note: (data.note as string) ?? undefined,
});

/** Real-time stream of an office's invoices (sorted newest first). */
export function useOfficeInvoices(officeId: string | undefined) {
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!officeId) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "invoices"),
      where("officeId", "==", officeId),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setInvoices(
          snap.docs
            .map((d) => fromDoc(d.id, d.data()))
            .sort((a, b) => createdAtMs(b.createdAt) - createdAtMs(a.createdAt)),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [officeId]);

  return { invoices, loading };
}

/** Real-time single invoice. */
export function useInvoice(id: string | undefined) {
  const [invoice, setInvoice] = useState<InvoiceDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setInvoice(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "invoices", id),
      (snap) => {
        if (!snap.exists()) {
          setInvoice(null);
          setLoading(false);
          return;
        }
        setInvoice(fromDoc(snap.id, snap.data()));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [id]);

  return { invoice, loading };
}

export async function updateInvoiceStatus(id: string, status: InvoiceDoc["status"]) {
  const patch: Record<string, unknown> = { status };
  if (status === "confirmed") patch.confirmedAt = serverTimestamp();
  if (status === "shipped") patch.shippedAt = serverTimestamp();
  if (status === "delivered") patch.deliveredAt = serverTimestamp();
  if (status === "rejected") patch.rejectedAt = serverTimestamp();
  await updateDoc(doc(db, "invoices", id), patch);
}

export async function updateInvoiceItemAvailability(
  id: string,
  index: number,
  availability: "available" | "not_available",
) {
  const snap = await getDoc(doc(db, "invoices", id));
  if (!snap.exists()) return;
  const items = (snap.data().items as unknown[]) ?? [];
  const next = items.map((it, i) =>
    i === index ? { ...(it as Record<string, unknown>), availability } : it,
  );
  await updateDoc(doc(db, "invoices", id), { items: next });
}

export function invoiceItemCount(inv: InvoiceDoc): number {
  return inv.items.reduce((s, i) => s + (i.quantity || 1), 0);
}
