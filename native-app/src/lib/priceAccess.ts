import { useQuery } from "@tanstack/react-query";
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, db } from "@/integrations/firebase/client";
import { app } from "@/integrations/firebase/config";
import { createNotification } from "./notifications";

// Prices for approved doctors only. An office can show its prices only to the
// doctors it approves; every other doctor sees "request price" instead. The
// server moves such an office's prices off its public products into
// office_prices/{officeId} (functions/hiddenPrices.js); this file puts them
// back for whoever may read them and handles the requests. The same file
// runs in the web app and the native app.

export type PriceEntry = { p: string; v: number };
export type PriceAccessStatus = "pending" | "approved" | "declined";
export type PriceAccess = {
  id: string;
  officeId: string;
  doctorId: string;
  doctorName: string;
  status: PriceAccessStatus;
  createdAt: number;
  updatedAt: number;
};

/** The fields every product carries for this. */
type Priced = { id: string; companyId?: string; priceHidden?: boolean; priceLocked?: boolean };

const accessId = (officeId: string, doctorId: string) => `${officeId}_${doctorId}`;

function hasPath(data: unknown, parts: string[]): boolean {
  let cur = data as Record<string, unknown> | null;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== "object") return false;
    cur = cur[parts[i]] as Record<string, unknown> | null;
  }
  return cur != null && typeof cur === "object" && parts[parts.length - 1] in cur;
}

/** The product with its hidden prices put back (same rule as the server). */
export function applyPrices<T>(product: T, entries: PriceEntry[] | undefined): T {
  if (!entries?.length) return product;
  const out = JSON.parse(JSON.stringify(product)) as T;
  for (const { p, v } of entries) {
    const parts = p.split(".");
    if (!hasPath(out, parts)) continue;
    let cur = out as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]] as Record<string, unknown>;
    cur[parts[parts.length - 1]] = v;
  }
  return out;
}

// What was read per office: productId -> entries, or null when this account
// may not see them. Re-read when a product's price isn't in it (the office
// added or changed a product after the read).
type Read = { at: number; prices: Promise<Record<string, PriceEntry[]> | null> };
let cacheFor = "";
const cache = new Map<string, Read>();
// Only stops the same list from reading twice in a row.
const FRESH_MS = 1_000;

/** Forget what was read, e.g. after an approval, a change of setting or a save. */
export function resetPriceCache() {
  cache.clear();
}

async function officePrices(officeId: string, fresh = false): Promise<Record<string, PriceEntry[]> | null> {
  // Products can load before sign-in has finished on a fresh start: without
  // waiting, the office and its approved doctors would see locks.
  await auth.authStateReady();
  const uid = auth.currentUser?.uid ?? "";
  if (uid !== cacheFor) {
    cache.clear();
    cacheFor = uid;
  }
  if (!uid) return null;
  const hit = cache.get(officeId);
  if (hit && !(fresh && Date.now() - hit.at > FRESH_MS)) return hit.prices;
  const prices = getDoc(doc(db, "office_prices", officeId))
    .then((s) => ((s.exists() ? s.data().products : {}) ?? {}) as Record<string, PriceEntry[]>)
    .catch(() => null);
  cache.set(officeId, { at: Date.now(), prices });
  return prices;
}

/**
 * Real prices on the hidden-price products this account may see; the others
 * come back with `priceLocked: true` and show "request price", never a zero.
 * The office itself always sees its own prices.
 */
export async function revealPrices<P extends Priced>(products: P[]): Promise<P[]> {
  const hidden = products.filter((p) => p.priceHidden && p.companyId);
  if (hidden.length === 0) return products;
  const offices = [...new Set(hidden.map((p) => p.companyId!))];
  const prices = new Map(
    await Promise.all(
      offices.map(async (o) => {
        let got = await officePrices(o);
        // A product the read doesn't know about yet: read again once.
        if (got && hidden.some((p) => p.companyId === o && !got![p.id])) got = await officePrices(o, true);
        return [o, got] as const;
      }),
    ),
  );
  const me = auth.currentUser?.uid;
  return products.map((p) => {
    if (!p.priceHidden || !p.companyId) return p;
    const entries = prices.get(p.companyId)?.[p.id];
    if (entries) return { ...applyPrices(p, entries), priceLocked: false };
    // Not moved yet (the server does it a moment after a save): the product
    // still carries the price the office entered. Only the office uses it.
    if (p.companyId === me) return { ...p, priceLocked: false };
    return { ...p, priceLocked: true };
  });
}

/* ── The doctor's side ─────────────────────────────────── */

export const myPriceAccessKey = (officeId?: string) => ["price-access", "mine", officeId] as const;

/** This doctor's request to an office, or null when they haven't asked. */
export function useMyPriceAccess(officeId: string | undefined) {
  const uid = auth.currentUser?.uid;
  return useQuery({
    queryKey: [...myPriceAccessKey(officeId), uid],
    enabled: !!officeId && !!uid,
    queryFn: async (): Promise<PriceAccess | null> => {
      const s = await getDoc(doc(db, "price_access", accessId(officeId!, uid!)));
      return s.exists() ? ({ id: s.id, ...s.data() } as PriceAccess) : null;
    },
  });
}

/** Asks the office to show this doctor its prices, and tells the office. */
export async function requestPriceAccess(officeId: string, doctorName: string, ar: boolean): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("not-signed-in");
  const now = Date.now();
  await setDoc(doc(db, "price_access", accessId(officeId, uid)), {
    officeId,
    doctorId: uid,
    doctorName,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });
  await createNotification({
    userId: officeId,
    type: "price_request",
    title: ar ? "طلب رؤية الأسعار" : "Price request",
    body: ar ? `${doctorName || "طبيب"} يطلب رؤية أسعارك` : `${doctorName || "A doctor"} asks to see your prices`,
    senderName: doctorName,
  }).catch(() => {});
}

/* ── The office's side ─────────────────────────────────── */

export const officePriceAccessKey = (officeId?: string) => ["price-access", "office", officeId] as const;

/** Everyone who asked or was approved, newest first. */
export function useOfficePriceAccess(officeId: string | undefined) {
  return useQuery({
    queryKey: officePriceAccessKey(officeId),
    enabled: !!officeId,
    queryFn: async (): Promise<PriceAccess[]> => {
      const snap = await getDocs(query(collection(db, "price_access"), where("officeId", "==", officeId)));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as PriceAccess)
        .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
    },
  });
}

async function tellApproved(doctorId: string, officeName: string, ar: boolean) {
  await createNotification({
    userId: doctorId,
    type: "price_approved",
    title: ar ? "أصبحت الأسعار متاحة لك" : "Prices are open to you",
    body: ar ? `يمكنك الآن رؤية أسعار ${officeName || "المكتب"} والطلب` : `You can now see ${officeName || "the office"}'s prices and order`,
    senderName: officeName,
  }).catch(() => {});
}

/** Approves or declines a request. A declined doctor isn't told. */
export async function decidePriceAccess(doctorId: string, approve: boolean, officeName: string, ar: boolean) {
  const officeId = auth.currentUser?.uid;
  if (!officeId) throw new Error("not-signed-in");
  await updateDoc(doc(db, "price_access", accessId(officeId, doctorId)), {
    status: approve ? "approved" : "declined",
    updatedAt: Date.now(),
  });
  if (approve) await tellApproved(doctorId, officeName, ar);
}

/** Approves a doctor the office knows, without waiting for them to ask. */
export async function grantPriceAccess(doctorId: string, doctorName: string, officeName: string, ar: boolean) {
  const officeId = auth.currentUser?.uid;
  if (!officeId) throw new Error("not-signed-in");
  const now = Date.now();
  await setDoc(doc(db, "price_access", accessId(officeId, doctorId)), {
    officeId,
    doctorId,
    doctorName,
    status: "approved",
    createdAt: now,
    updatedAt: now,
  });
  await tellApproved(doctorId, officeName, ar);
}

/** Takes a doctor's access away (they can ask again). */
export async function revokePriceAccess(doctorId: string) {
  const officeId = auth.currentUser?.uid;
  if (!officeId) throw new Error("not-signed-in");
  await deleteDoc(doc(db, "price_access", accessId(officeId, doctorId)));
}

/** Turns "prices for approved doctors only" on or off for this office. */
export async function setPricesHidden(hidden: boolean): Promise<{ products: number }> {
  const call = httpsCallable<{ hidden: boolean }, { hidden: boolean; products: number }>(getFunctions(app), "setPricesHidden");
  const res = await call({ hidden });
  resetPriceCache();
  return res.data;
}
