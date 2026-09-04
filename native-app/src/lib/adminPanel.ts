import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useRealtimeQuery } from "@/lib/realtime";
import type { Offer } from "@/lib/offers";
import type { UserRoleDoc } from "@/integrations/firebase/types";

export type AdminAccount = UserRoleDoc & { docId: string };

export type AdminLog = {
  id: string;
  type: string;
  message: string;
  adminName: string;
  createdAt: string;
};

function offerFromDoc(d: { id: string; data(): Record<string, unknown> }): Offer {
  const x = d.data();
  return {
    id: d.id,
    supplierId: (x.supplierId as string) ?? "",
    title: (x.title as string) ?? "",
    description: (x.description as string) ?? "",
    imageUrl: (x.imageUrl as string) ?? "",
    expiryDate: (x.expiryDate as string) ?? "",
    price: typeof x.price === "number" ? x.price : undefined,
    currency: (x.currency as string) ?? "USD",
    discountPct: typeof x.discountPct === "number" ? x.discountPct : undefined,
    status: (x.status as Offer["status"]) ?? undefined,
    rejectReason: (x.rejectReason as string) ?? undefined,
    createdAt: (x.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? undefined,
  };
}

export function useAdminOffers() {
  const q = query(collection(db, "offers"), orderBy("createdAt", "desc"));
  return useRealtimeQuery<Offer>(q, offerFromDoc);
}

export function useAdminAccounts() {
  const q = query(collection(db, "user_roles"), orderBy("createdAt", "desc"));
  return useRealtimeQuery<AdminAccount>(q, (d) => ({
    ...(d.data() as UserRoleDoc),
    docId: d.id,
  }));
}

export function useAdminLogs(limit = 50) {
  const q = query(collection(db, "admin_logs"), orderBy("createdAt", "desc"));
  const { data, loading } = useRealtimeQuery<AdminLog>(q, (d) => {
    const x = d.data();
    return {
      id: d.id,
      type: (x.type as string) ?? "",
      message: (x.message as string) ?? "",
      adminName: (x.adminName as string) ?? "",
      createdAt: (x.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? "",
    } as AdminLog;
  });
  return { data: data.slice(0, limit), loading };
}

async function logAction(type: string, message: string, adminName: string) {
  try {
    await setDoc(doc(db, "admin_logs", `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`), {
      type,
      message,
      adminName,
      createdAt: Timestamp.now(),
    });
  } catch {
    /* log is best-effort */
  }
}

export async function approveAd(offerId: string, expiryDate: string, adminName: string) {
  await setDoc(
    doc(db, "offers", offerId),
    { status: "active", expiryDate, rejectReason: null },
    { merge: true },
  );
  await logAction("approve_ad", `تمت الموافقة على إعلان حتى ${expiryDate.slice(0, 10)}`, adminName);
}

export async function rejectAd(offerId: string, reason: string, adminName: string) {
  await setDoc(
    doc(db, "offers", offerId),
    { status: "rejected", rejectReason: reason },
    { merge: true },
  );
  await logAction("reject_ad", `تم رفض الإعلان - ${reason}`, adminName);
}

export async function deactivateAd(offerId: string, adminName: string) {
  await setDoc(doc(db, "offers", offerId), { status: "expired" }, { merge: true });
  await logAction("deactivate_ad", "تم إيقاف إعلان نشط", adminName);
}

export async function setAccountStatus(
  userId: string,
  status: "active" | "suspended" | "expired",
  adminName: string,
) {
  await updateDoc(doc(db, "user_roles", userId), { accountStatus: status });
  await logAction("account_status", `تم تغيير حالة الحساب إلى ${status}`, adminName);
}

export async function extendSubscription(userId: string, months: number, adminName: string) {
  const ref = doc(db, "user_roles", userId);
  const snap = await getDoc(ref);
  const current = snap.exists()
    ? ((snap.data() as UserRoleDoc).subscriptionExpiry as string | undefined)
    : undefined;
  const base = current ? Math.max(Date.now(), new Date(current).getTime()) : Date.now();
  const expiry = new Date(base + months * 30 * 24 * 3600 * 1000).toISOString();
  await updateDoc(ref, { subscriptionExpiry: expiry, accountStatus: "active" });
  await logAction(
    "extend_subscription",
    `تم تمديد الاشتراك +${months} شهر حتى ${expiry.slice(0, 10)}`,
    adminName,
  );
}
