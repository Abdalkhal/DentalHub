import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, storage } from "@/integrations/firebase/client";
import { app } from "@/integrations/firebase/config";
import { useRealtimeQuery } from "@/lib/realtime";
import { randomUUID } from "@/lib/randomId";

// A general cross-account ad system ("إعلاناتي"), independent of `offers`
// (which is dentist-facing only). Any account type can submit one; it stays
// `pending` (invisible to everyone but its owner) until an admin approves it
// from the admin panel, then shows on the dentist home banner.

export type Ad = {
  id: string;
  accountId: string;
  accountType: string;
  accountName: string;
  // Denormalized from the profile at submission time (same reasoning as
  // `accountName`) so the detail view never needs a second read just to
  // show who's behind the ad.
  accountPhoto?: string;
  contactPhone: string;
  title: string;
  description: string;
  images: string[];
  status: "pending" | "active" | "rejected";
  rejectReason?: string;
  createdAt?: string;
  // Set by the admin at approval time (YYYY-MM-DD). Absent means "no end
  // date" — `useActiveAds` only drops an ad once this date has passed.
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
export const adsQueryKey = ["ads"] as const;

/** The signed-in account's own submitted ads, any status. */
export function useMyAds(accountId: string) {
  const { data, loading } = useRealtimeQuery<Ad>(accountId ? adsQuery() : null, (d) =>
    fromDoc(d.id, d.data()),
  );
  return { data: data.filter((a) => a.accountId === accountId), isLoading: loading };
}

/** Approved, not-yet-expired ads, for the dentist home banner. */
export function useActiveAds() {
  const { data, loading } = useRealtimeQuery<Ad>(adsQuery(), (d) => fromDoc(d.id, d.data()));
  const today = new Date().toISOString().slice(0, 10);
  return {
    data: data.filter((a) => a.status === "active" && (!a.expiryDate || a.expiryDate >= today)),
    isLoading: loading,
  };
}

/** Every ad regardless of status, for the admin review panel. */
export function useAllAds() {
  const { data, loading } = useRealtimeQuery<Ad>(adsQuery(), (d) => fromDoc(d.id, d.data()));
  return { data, isLoading: loading };
}

/** Uploads one image under the account's own ad-images prefix and returns its Storage path. */
export async function uploadAdImage(
  accountId: string,
  file: { uri: string; name?: string; type?: string },
): Promise<string> {
  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `ads/${accountId}/${randomUUID()}.${ext || "jpg"}`;
  const storageRef = ref(storage, path);
  const blob = await (await fetch(file.uri)).blob();
  await uploadBytes(storageRef, blob, { contentType: file.type || "image/jpeg" });
  return path;
}

export async function removeAdImage(path: string): Promise<void> {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* already gone / never finished uploading — fine either way */
  }
}

/**
 * Runs Cloud Vision SafeSearch on a just-uploaded ad image. The Cloud
 * Function deletes the object itself when it fails, so the caller only
 * needs to drop the path from its own draft state on `safe: false`.
 */
export async function checkAdImageSafety(path: string): Promise<{ safe: boolean; reason?: string }> {
  const functions = getFunctions(app);
  const call = httpsCallable<{ path: string }, { safe: boolean; reason?: string }>(
    functions,
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
      const id = randomUUID();
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
