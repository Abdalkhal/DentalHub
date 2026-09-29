import { useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, doc, setDoc, deleteDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, storage } from "@/integrations/firebase/client";
import { app } from "@/integrations/firebase/config";
import { useRealtimeQuery } from "@/lib/realtime";

// The cross-account "إعلاناتي" ad system, shared with the native app
// (native-app/src/lib/adsStore.ts). Any account can submit an ad; it stays
// `pending` until an admin approves it, then shows on the dentist home banner.

export type Ad = {
  id: string;
  accountId: string;
  accountType: string;
  accountName: string;
  accountPhoto?: string;
  contactPhone: string;
  title: string;
  description: string;
  images: string[];
  status: "pending" | "active" | "rejected";
  rejectReason?: string;
  createdAt?: string;
  /** YYYY-MM-DD set by the admin at approval; absent = no end date. */
  expiryDate?: string;
};

export const MAX_AD_IMAGES = 4;

const fromDoc = (id: string, data: Record<string, unknown>): Ad => ({
  id,
  accountId: (data.accountId as string) ?? "",
  accountType: (data.accountType as string) ?? "",
  accountName: (data.accountName as string) ?? "",
  accountPhoto: (data.accountPhoto as string) ?? undefined,
  contactPhone: (data.contactPhone as string) ?? "",
  title: (data.title as string) ?? "",
  description: (data.description as string) ?? "",
  images: Array.isArray(data.images) ? (data.images as string[]) : [],
  status: (data.status as Ad["status"]) ?? "pending",
  rejectReason: (data.rejectReason as string) ?? undefined,
  createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString?.() ?? undefined,
  expiryDate: (data.expiryDate as string) ?? undefined,
});

const adsQuery = () => query(collection(db, "ads"), orderBy("createdAt", "desc"));
const mapAd = (d: { id: string; data: () => Record<string, unknown> }) => fromDoc(d.id, d.data());
export const adsQueryKey = ["ads"] as const;

export function useMyAds(accountId: string) {
  const { data, loading } = useRealtimeQuery<Ad>(accountId ? adsQuery() : null, mapAd);
  return { data: data.filter((a) => a.accountId === accountId), isLoading: loading };
}

/** Approved, not-yet-expired ads, for the dentist home banner. */
export function useActiveAds() {
  const { data, loading } = useRealtimeQuery<Ad>(adsQuery(), mapAd);
  const today = new Date().toISOString().slice(0, 10);
  return {
    data: data.filter((a) => a.status === "active" && (!a.expiryDate || a.expiryDate >= today)),
    isLoading: loading,
  };
}

export async function uploadAdImage(accountId: string, file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `ads/${accountId}/${crypto.randomUUID()}.${ext || "jpg"}`;
  await uploadBytes(ref(storage, path), file, { contentType: file.type || "image/jpeg" });
  return path;
}

export async function removeAdImage(path: string): Promise<void> {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* already gone — fine either way */
  }
}

/** Cloud Vision SafeSearch on a just-uploaded image; the function deletes
 * the object itself when it fails. */
export async function checkAdImageSafety(path: string): Promise<{ safe: boolean; reason?: string }> {
  const call = httpsCallable<{ path: string }, { safe: boolean; reason?: string }>(
    getFunctions(app),
    "checkImageSafety",
  );
  const res = await call({ path });
  return res.data;
}

export function useSubmitAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      accountId: string;
      accountType: string;
      accountName: string;
      accountPhoto?: string;
      contactPhone: string;
      title: string;
      description: string;
      images: string[];
    }) => {
      const id = crypto.randomUUID();
      await setDoc(doc(db, "ads", id), {
        id,
        ...input,
        accountPhoto: input.accountPhoto ?? null,
        status: "pending",
        createdAt: Timestamp.now(),
      });
      return id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adsQueryKey }),
  });
}

export function useDeleteAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ad: Ad) => {
      await Promise.all(ad.images.map(removeAdImage));
      await deleteDoc(doc(db, "ads", ad.id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: adsQueryKey }),
  });
}
