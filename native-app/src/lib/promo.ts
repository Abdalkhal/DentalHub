import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/integrations/firebase/client";
import { app } from "@/integrations/firebase/config";

// Discounts. Every amount here comes from the server (functions/discounts.js);
// this file only asks for them and words them. The same file runs in the web
// app and the native app.

export type CartPreviewLine = {
  index: number;
  productId: string;
  quantity: number;
  listPrice: number;
  price: number;
  currency: "USD" | "IQD";
  discountAmount: number;
};

export type MoneyTotals = {
  rawUSD: number;
  rawIQD: number;
  tierSavedUSD: number;
  tierSavedIQD: number;
  discountUSD: number;
  discountIQD: number;
  netUSD: number;
  netIQD: number;
};

export type CartPreviewOffice = MoneyTotals & {
  officeId: string;
  lines: CartPreviewLine[];
  code: string | null;
  doctorPct: number;
};

export type CartCodeResult = {
  code: string;
  status: string;
  officeId?: string;
  needed?: number;
  currency?: "USD" | "IQD";
};

export type CartPreview = {
  offices: CartPreviewOffice[];
  codes: CartCodeResult[];
  skipped: string[];
  totals: MoneyTotals;
};

export type PromoCode = {
  id: string;
  code: string;
  officeId: string;
  type: "percent" | "fixed";
  value: number;
  currency: "USD" | "IQD";
  active: boolean;
  scope: "office" | "products" | "branch";
  productIds: string[];
  branches: string[];
  doctorIds: string[];
  startDate: string;
  endDate: string;
  minSubtotal: number;
  minQuantity: number;
  maxUses: number;
  maxUsesPerDoctor: number;
  usedCount: number;
  savedUSD: number;
  savedIQD: number;
};

export type DoctorDiscount = {
  id: string;
  officeId: string;
  doctorId: string;
  doctorName: string;
  pct: number;
};

const fns = () => getFunctions(app);

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;
const fmtIqd = (n: number) => `${n.toLocaleString()} د.ع`;
export const fmtDiscountMoney = (n: number, currency: "USD" | "IQD") =>
  currency === "IQD" ? fmtIqd(n) : fmtUsd(n);

/* ── The cart ─────────────────────────────────────── */

export function useCartPreview(
  items: { productId: string; quantity: number }[],
  codes: string[],
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["cart-preview", items, codes],
    enabled: enabled && items.length > 0,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    queryFn: async () => {
      const call = httpsCallable<{ items: typeof items; codes: string[] }, CartPreview>(
        fns(),
        "previewCart",
      );
      return (await call({ items, codes })).data;
    },
  });
}

/** Why a code did or didn't apply, in the doctor's words. */
export function codeMessage(r: CartCodeResult, ar: boolean): string {
  const needed = r.needed ?? 0;
  switch (r.status) {
    case "applied":
      return ar ? "تم تطبيق الكود" : "Code applied";
    case "beaten":
      return ar
        ? "خصمك الخاص أفضل من هذا الكود، فلم يُستخدم الكود"
        : "Your own discount is better, so the code wasn't used";
    case "expired":
      return ar ? "انتهت صلاحية الكود" : "This code has expired";
    case "not-started":
      return ar ? "لم يبدأ هذا الكود بعد" : "This code hasn't started yet";
    case "exhausted":
      return ar ? "نفدت استخدامات هذا الكود" : "This code has run out";
    case "doctor-limit":
      return ar ? "استخدمت هذا الكود من قبل" : "You've already used this code";
    case "min-subtotal":
      return ar
        ? `يتطلب الكود مشتريات بقيمة ${fmtDiscountMoney(needed, r.currency ?? "USD")} على الأقل`
        : `Needs at least ${fmtDiscountMoney(needed, r.currency ?? "USD")} of products`;
    case "min-quantity":
      return ar ? `يتطلب الكود ${needed} قطع على الأقل` : `Needs at least ${needed} items`;
    case "no-eligible":
      return ar ? "الكود لا يشمل منتجات سلتك" : "The code doesn't cover anything in your cart";
    case "one-per-office":
      return ar ? "يمكن استخدام كود واحد لكل مكتب" : "One code per office";
    default:
      return ar ? "الكود غير صالح لهذه السلة" : "This code isn't valid for this cart";
  }
}

/* ── Orders and invoices ──────────────────────────── */

type PricedItem = {
  price?: number;
  listPrice?: number;
  quantity?: number;
  currency?: string;
  availability?: string;
};

type PricedDoc = {
  items?: PricedItem[];
  totalUSD?: number;
  totalIQD?: number;
  discount?: { code?: string; doctorPct?: number } | null;
};

/**
 * What an order or invoice comes to with only its available items. The stored
 * totals are the truth for the net; an old order's stored total can include an
 * item since marked unavailable, so it never counts above the items.
 */
export function orderMoney(doc: PricedDoc): MoneyTotals {
  const items = (doc.items ?? []).filter((i) => i.availability !== "not_available");
  const sum = (currency: "USD" | "IQD", price: (i: PricedItem) => number) =>
    items
      .filter((i) => (currency === "IQD" ? i.currency === "IQD" : i.currency !== "IQD"))
      .reduce((s, i) => s + price(i) * (i.quantity ?? 1), 0);
  const rawUSD = sum("USD", (i) => i.listPrice ?? i.price ?? 0);
  const rawIQD = sum("IQD", (i) => i.listPrice ?? i.price ?? 0);
  const grossUSD = sum("USD", (i) => i.price ?? 0);
  const grossIQD = sum("IQD", (i) => i.price ?? 0);
  const netUSD = Math.min(grossUSD, doc.totalUSD ?? grossUSD);
  const netIQD = Math.min(grossIQD, doc.totalIQD ?? grossIQD);
  return {
    rawUSD,
    rawIQD,
    tierSavedUSD: rawUSD - grossUSD,
    tierSavedIQD: rawIQD - grossIQD,
    discountUSD: grossUSD - netUSD,
    discountIQD: grossIQD - netIQD,
    netUSD,
    netIQD,
  };
}

export type MoneyRow = { key: string; label: string; value: string; tone: "plain" | "saving" | "total" };

/** The label of the discount line, from what actually applied. */
export function discountLabel(
  d: { code?: string | null; doctorPct?: number } | null | undefined,
  ar: boolean,
): string {
  if (d?.code && !d.doctorPct) return ar ? `كود ${d.code}` : `Code ${d.code}`;
  if (d?.doctorPct && !d.code) return ar ? `خصم خاص ${d.doctorPct}%` : `Own discount ${d.doctorPct}%`;
  return ar ? "الخصم" : "Discount";
}

/** The summary lines of a price, so every screen shows them the same way. */
export function moneyRows(
  m: MoneyTotals,
  label: string,
  ar: boolean,
  opts?: { alwaysNet?: boolean },
): MoneyRow[] {
  const rows: MoneyRow[] = [];
  const showUSD = m.rawUSD > 0 || m.rawIQD === 0;
  const showIQD = m.rawIQD > 0 || m.rawUSD === 0;
  if (showIQD) {
    rows.push({ key: "raw-iqd", label: ar ? "الإجمالي بالدينار" : "Total (IQD)", value: fmtIqd(m.rawIQD), tone: "plain" });
  }
  if (showUSD) {
    rows.push({ key: "raw-usd", label: ar ? "الإجمالي بالدولار" : "Total (USD)", value: fmtUsd(m.rawUSD), tone: "plain" });
  }
  const tier = ar ? "خصم الكمية" : "Quantity discount";
  if (m.tierSavedIQD > 0) rows.push({ key: "tier-iqd", label: tier, value: `-${fmtIqd(m.tierSavedIQD)}`, tone: "saving" });
  if (m.tierSavedUSD > 0) rows.push({ key: "tier-usd", label: tier, value: `-${fmtUsd(m.tierSavedUSD)}`, tone: "saving" });
  if (m.discountIQD > 0) rows.push({ key: "disc-iqd", label, value: `-${fmtIqd(m.discountIQD)}`, tone: "saving" });
  if (m.discountUSD > 0) rows.push({ key: "disc-usd", label, value: `-${fmtUsd(m.discountUSD)}`, tone: "saving" });
  if (opts?.alwaysNet || rows.some((r) => r.tone === "saving")) {
    if (showIQD) rows.push({ key: "net-iqd", label: ar ? "الصافي بالدينار" : "Net (IQD)", value: fmtIqd(m.netIQD), tone: "total" });
    if (showUSD) rows.push({ key: "net-usd", label: ar ? "الصافي بالدولار" : "Net (USD)", value: fmtUsd(m.netUSD), tone: "total" });
  }
  return rows;
}

/** A printable/shareable document's rows for one order or invoice. */
export function docMoneyRows(doc: PricedDoc, ar: boolean): MoneyRow[] {
  return moneyRows(orderMoney(doc), discountLabel(doc.discount, ar), ar);
}

/* ── A doctor's own discount, as that doctor sees it ─ */

export function useMyOfficeDiscount(officeId: string | undefined, doctorId: string | undefined) {
  return useQuery({
    queryKey: ["my-office-discount", officeId, doctorId],
    enabled: !!officeId && !!doctorId,
    staleTime: 60_000,
    queryFn: async (): Promise<number> => {
      const snap = await getDocs(
        query(
          collection(db, "office_doctor_discounts"),
          where("doctorId", "==", doctorId!),
          where("officeId", "==", officeId!),
        ),
      );
      return snap.empty ? 0 : Number(snap.docs[0].data().pct) || 0;
    },
  });
}

/* ── The office's side ────────────────────────────── */

export const promoCodesKey = (officeId?: string) => ["promo-codes", officeId] as const;
export const doctorDiscountsKey = (officeId?: string) => ["doctor-discounts", officeId] as const;

export function useOfficePromoCodes(officeId: string | undefined) {
  return useQuery({
    queryKey: promoCodesKey(officeId),
    enabled: !!officeId,
    queryFn: async (): Promise<PromoCode[]> => {
      const snap = await getDocs(query(collection(db, "promo_codes"), where("officeId", "==", officeId!)));
      return snap.docs
        .map((d) => ({ ...(d.data() as PromoCode), id: d.id }))
        .sort((a, b) => a.code.localeCompare(b.code));
    },
  });
}

export function useOfficeDoctorDiscounts(officeId: string | undefined) {
  return useQuery({
    queryKey: doctorDiscountsKey(officeId),
    enabled: !!officeId,
    queryFn: async (): Promise<DoctorDiscount[]> => {
      const snap = await getDocs(
        query(collection(db, "office_doctor_discounts"), where("officeId", "==", officeId!)),
      );
      return snap.docs.map((d) => ({ ...(d.data() as DoctorDiscount), id: d.id }));
    },
  });
}

export type PromoForm = {
  code: string;
  type: "percent" | "fixed";
  value: string;
  currency: "USD" | "IQD";
  active: boolean;
  scope: "office" | "products" | "branch";
  productIds: string[];
  branches: string[];
  doctorIds: string[];
  startDate: string;
  endDate: string;
  minSubtotal: string;
  minQuantity: string;
  maxUses: string;
  maxUsesPerDoctor: string;
};

export const emptyPromoForm = (): PromoForm => ({
  code: "",
  type: "percent",
  value: "",
  currency: "USD",
  active: true,
  scope: "office",
  productIds: [],
  branches: [],
  doctorIds: [],
  startDate: "",
  endDate: "",
  minSubtotal: "",
  minQuantity: "",
  maxUses: "",
  maxUsesPerDoctor: "",
});

const numText = (n: number | undefined) => (n ? String(n) : "");

export const promoToForm = (p: PromoCode): PromoForm => ({
  code: p.code,
  type: p.type,
  value: String(p.value),
  currency: p.currency,
  active: p.active,
  scope: p.scope,
  productIds: p.productIds ?? [],
  branches: p.branches ?? [],
  doctorIds: p.doctorIds ?? [],
  startDate: p.startDate ?? "",
  endDate: p.endDate ?? "",
  minSubtotal: numText(p.minSubtotal),
  minQuantity: numText(p.minQuantity),
  maxUses: numText(p.maxUses),
  maxUsesPerDoctor: numText(p.maxUsesPerDoctor),
});

export function generatePromoCode(): string {
  // No 0/O or 1/I: these get read out over the phone.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 7; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

const validDate = (v: string) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v);

/** What's wrong with the form, or null. The server checks all of it again. */
export function promoFormError(f: PromoForm, ar: boolean): string | null {
  const value = Number(f.value);
  if (!/^[A-Z0-9_-]{3,24}$/.test(f.code.trim().toUpperCase())) {
    return ar
      ? "الكود من 3 إلى 24 حرفاً إنجليزياً أو رقماً، دون مسافات"
      : "A code is 3 to 24 English letters or numbers, no spaces";
  }
  if (!(value > 0) || (f.type === "percent" && value > 100)) {
    return ar ? "أدخل قيمة خصم صحيحة" : "Enter a valid discount";
  }
  if (f.scope === "products" && f.productIds.length === 0) {
    return ar ? "اختر منتجاً واحداً على الأقل" : "Choose at least one product";
  }
  if (f.scope === "branch" && f.branches.length === 0) {
    return ar ? "اختر قسماً واحداً على الأقل" : "Choose at least one section";
  }
  if (!validDate(f.startDate) || !validDate(f.endDate)) {
    return ar ? "اكتب التاريخ بالشكل 2026-12-31" : "Write dates like 2026-12-31";
  }
  if (f.startDate && f.endDate && f.endDate < f.startDate) {
    return ar ? "تاريخ النهاية قبل تاريخ البداية" : "The end date is before the start date";
  }
  return null;
}

/** Saves a code. `belowCost` names products this would sell below their cost. */
export async function savePromoCode(f: PromoForm, editing: boolean): Promise<{ belowCost: string[] }> {
  const call = httpsCallable<Record<string, unknown>, { belowCost: string[] }>(fns(), "savePromoCode");
  const res = await call({
    ...f,
    code: f.code.trim().toUpperCase(),
    value: Number(f.value),
    minSubtotal: Number(f.minSubtotal) || 0,
    minQuantity: Number(f.minQuantity) || 0,
    maxUses: Number(f.maxUses) || 0,
    maxUsesPerDoctor: Number(f.maxUsesPerDoctor) || 0,
    editing,
  });
  return res.data;
}

export async function deletePromoCode(id: string): Promise<void> {
  await httpsCallable<{ id: string }, unknown>(fns(), "deletePromoCode")({ id });
}

/** A percentage of 0 removes the doctor's discount. */
export async function setDoctorDiscount(doctorId: string, pct: number): Promise<{ belowCost: string[] }> {
  const call = httpsCallable<{ doctorId: string; pct: number }, { belowCost: string[] }>(fns(), "setDoctorDiscount");
  return (await call({ doctorId, pct })).data;
}

export function discountErrorMessage(e: unknown, ar: boolean): string {
  const message = (e as { message?: string })?.message ?? "";
  if (message.includes("code-taken")) return ar ? "لديك كود بهذا الاسم" : "You already have this code";
  if (message.includes("not-allowed")) return ar ? "هذا الإجراء غير متاح لحسابك" : "Not available for your account";
  if (message.includes("no-doctor")) return ar ? "لم نجد حساب هذا الطبيب" : "Doctor account not found";
  return ar ? "تعذر الحفظ، حاول مرة أخرى" : "Couldn't save, please try again";
}

/** One line saying what a code gives and on what terms. */
export function promoSummary(p: PromoCode, ar: boolean): string {
  const parts = [
    p.type === "percent" ? `${p.value}%` : fmtDiscountMoney(p.value, p.currency),
  ];
  if (p.scope === "products") {
    parts.push(ar ? `${p.productIds.length} منتجات` : `${p.productIds.length} products`);
  } else if (p.scope === "branch") {
    parts.push(p.branches.join("، "));
  }
  if (p.doctorIds?.length) parts.push(ar ? `${p.doctorIds.length} أطباء` : `${p.doctorIds.length} doctors`);
  if (p.minSubtotal) {
    parts.push(`${ar ? "حد أدنى" : "min"} ${fmtDiscountMoney(p.minSubtotal, p.currency)}`);
  }
  if (p.minQuantity) parts.push(`${ar ? "حد أدنى" : "min"} ${p.minQuantity} ${ar ? "قطعة" : "items"}`);
  if (p.endDate) parts.push(`${ar ? "حتى" : "until"} ${p.endDate}`);
  return parts.join(" · ");
}

/** Whether a code works today, from the office's view. */
export function promoState(p: PromoCode, ar: boolean): { label: string; live: boolean } {
  const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (!p.active) return { label: ar ? "معطّل" : "Off", live: false };
  if (p.endDate && today > p.endDate) return { label: ar ? "منتهي" : "Expired", live: false };
  if (p.startDate && today < p.startDate) return { label: ar ? "لم يبدأ" : "Scheduled", live: false };
  if (p.maxUses && p.usedCount >= p.maxUses) return { label: ar ? "نفد" : "Used up", live: false };
  return { label: ar ? "فعّال" : "Live", live: true };
}

export function promoReport(p: PromoCode, ar: boolean): string {
  const uses = p.maxUses ? `${p.usedCount || 0}/${p.maxUses}` : String(p.usedCount || 0);
  const saved = [
    p.savedUSD ? fmtUsd(p.savedUSD) : "",
    p.savedIQD ? fmtIqd(p.savedIQD) : "",
  ].filter(Boolean);
  const head = ar ? `استُخدم ${uses} مرة` : `Used ${uses} times`;
  return saved.length
    ? `${head} · ${ar ? "مجموع الخصم" : "total given"} ${saved.join(" + ")}`
    : head;
}

export function promoShareText(p: PromoCode, officeName: string, ar: boolean): string {
  const value = p.type === "percent" ? `${p.value}%` : fmtDiscountMoney(p.value, p.currency);
  return ar
    ? `كود خصم ${value} من ${officeName}: ${p.code}\nاكتبه في السلة في Dent Hub.`
    : `${value} off at ${officeName}: ${p.code}\nEnter it in your Dent Hub cart.`;
}

/** The doctors an office has sold to, for choosing who a discount is for. */
export function officeDoctors(
  orders: { dentistId: string; dentistName: string }[],
  discounts: DoctorDiscount[] = [],
): { id: string; name: string }[] {
  const map = new Map<string, string>();
  for (const o of orders) if (o.dentistId) map.set(o.dentistId, o.dentistName || "");
  for (const d of discounts) if (!map.has(d.doctorId)) map.set(d.doctorId, d.doctorName);
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
