import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

export type PromoCode = {
  id: string;
  code: string;
  officeId?: string;
  type: "percent" | "fixed";
  value: number;
  currency: "USD" | "IQD";
  active: boolean;
  expiresAt?: string | null;
  minSubtotal?: number;
};

export type DiscountResult = {
  code: string;
  type: "percent" | "fixed";
  value: number;
  currency: "USD" | "IQD";
  discountUSD: number;
  discountIQD: number;
};

/** Look up a promo code (case-insensitive) from Firestore. */
export async function findPromoCode(code: string): Promise<PromoCode | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const q = query(collection(db, "promo_codes"), where("code", "==", normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<PromoCode, "id">) };
}

export function isPromoValid(p: PromoCode): boolean {
  if (!p.active) return false;
  if (p.expiresAt && new Date(p.expiresAt).getTime() < Date.now()) return false;
  return true;
}

/**
 * Compute the discount for a cart. The code is scoped to a single office
 * (if `officeId` is set) and applies only to that office's subtotal.
 */
export function computeDiscount(
  p: PromoCode,
  officeIds: string[],
  iqdSubtotal: number,
  usdSubtotal: number,
): { discountUSD: number; discountIQD: number } {
  if (p.officeId && !officeIds.includes(p.officeId)) return { discountUSD: 0, discountIQD: 0 };

  const base = p.currency === "USD" ? usdSubtotal : iqdSubtotal;
  if (p.minSubtotal && base < p.minSubtotal) return { discountUSD: 0, discountIQD: 0 };

  let amount = p.type === "percent" ? (base * p.value) / 100 : p.value;
  if (p.type === "percent") amount = Math.min(amount, base);
  amount = Math.max(0, amount);

  return p.currency === "USD"
    ? { discountUSD: amount, discountIQD: 0 }
    : { discountUSD: 0, discountIQD: amount };
}
