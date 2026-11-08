import { collection, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useRealtimeQuery } from "@/lib/realtime";
import { adActionCall, extendSubscriptionAction, setAccountStatusAction } from "@/lib/adminBusiness";
import type { Offer } from "@/lib/offers";
import type { UserRoleDoc } from "@/integrations/firebase/types";

export type AdminAccount = UserRoleDoc & { docId: string };

export type AdminLog = {
  id: string;
  type: string;
  message: string;
  adminName: string;
  targetName?: string;
  reason?: string;
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
      targetName: (x.targetName as string) || undefined,
      reason: (x.reason as string) || undefined,
      createdAt: (x.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? "",
    } as AdminLog;
  });
  return { data: data.slice(0, limit), loading };
}

export async function approveAd(offerId: string, expiryDate: string, _adminName: string) {
  await adActionCall({ id: offerId, action: "approve", expiryDate });
}

export async function rejectAd(offerId: string, reason: string, _adminName: string) {
  await adActionCall({ id: offerId, action: "reject", reason: reason || "بدون سبب" });
}

export async function deactivateAd(offerId: string, _adminName: string) {
  await adActionCall({ id: offerId, action: "stop" });
}

export async function setAccountStatus(
  userId: string,
  status: "active" | "suspended" | "expired",
  _adminName: string,
  reason = "قرار الإدارة",
) {
  await setAccountStatusAction(userId, status, reason);
}

export async function extendSubscription(userId: string, months: number, _adminName: string) {
  await extendSubscriptionAction(userId, months);
}
