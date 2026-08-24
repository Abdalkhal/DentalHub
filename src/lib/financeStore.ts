import { useEffect, useState } from "react";
import {
  doc,
  setDoc,
  getDocs,
  collection,
  collectionGroup,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

export type FinancePricingItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: "USD" | "IQD";
};

/**
 * Financial metrics for a lab case, stored exclusively in the private
 * subcollection `lab_orders/{labId}/cases/{caseId}/private/finance`.
 *
 * These fields are stripped from the main case document so that DESIGNER and
 * TECHNICIAN roles (who may read their assigned case documents) never see
 * pricing or revenue data.
 */
export type CaseFinance = {
  labId: string;
  caseId: string;
  price: number;
  currency?: "USD" | "IQD";
  unitPrice?: number;
  discount?: number;
  pricingMode?: "single" | "mixed";
  pricingItems?: FinancePricingItem[];
  subtotalIQD?: number;
  discountAmountIQD?: number;
  finalTotalUSD?: number;
  updatedAt: string;
};

/** Field names that must never live on the public case document. */
export const FINANCIAL_FIELDS = [
  "price",
  "currency",
  "unitPrice",
  "discount",
  "pricingMode",
  "pricingItems",
  "subtotalIQD",
  "discountAmountIQD",
  "finalTotalUSD",
] as const;

export const FINANCE_DOC_ID = "finance";

export function financeDocRef(labId: string, caseId: string) {
  return doc(db, "lab_orders", labId, "cases", caseId, "private", FINANCE_DOC_ID);
}

export function financeDocPath(labId: string, caseId: string): string {
  return `lab_orders/${labId}/cases/${caseId}/private/finance`;
}

type FinanceSource = {
  price?: number;
  currency?: "USD" | "IQD";
  unitPrice?: number;
  discount?: number;
  pricingMode?: "single" | "mixed";
  pricingItems?: FinancePricingItem[];
  subtotalIQD?: number;
  discountAmountIQD?: number;
  finalTotalUSD?: number;
};

/** Builds a CaseFinance document from an order-like source. Returns null when there is no financial data. */
export function extractFinance(
  source: FinanceSource,
  labId: string,
  caseId: string,
): CaseFinance | null {
  const price = Number(source.price ?? 0);
  if (
    price === 0 &&
    !source.currency &&
    !source.unitPrice &&
    !source.discount &&
    !source.pricingMode &&
    !source.subtotalIQD &&
    !source.discountAmountIQD &&
    !source.finalTotalUSD
  ) {
    return null;
  }
  return {
    labId,
    caseId,
    price,
    currency: source.currency,
    unitPrice: source.unitPrice,
    discount: source.discount,
    pricingMode: source.pricingMode,
    pricingItems: source.pricingItems,
    subtotalIQD: source.subtotalIQD,
    discountAmountIQD: source.discountAmountIQD,
    finalTotalUSD: source.finalTotalUSD,
    updatedAt: new Date().toISOString(),
  };
}

/** Returns a shallow copy of the source with all financial fields removed. */
export function stripFinancialFields<T extends Record<string, unknown>>(source: T): T {
  const next: Record<string, unknown> = { ...source };
  for (const field of FINANCIAL_FIELDS) delete next[field];
  return next as T;
}

/** Writes a finance doc (idempotent) and returns the CaseFinance or null. */
export async function writeCaseFinance(
  labId: string,
  caseId: string,
  source: FinanceSource,
): Promise<CaseFinance | null> {
  const finance = extractFinance(source, labId, caseId);
  if (!finance) return null;
  await setDoc(financeDocRef(labId, caseId), finance, { merge: true });
  return finance;
}

/**
 * Live listener for all finance docs belonging to a lab.
 * Requires a collectionGroup index on `finance.labId` (see firestore.indexes.json).
 */
export function useLabFinance(labId: string) {
  const [finance, setFinance] = useState<CaseFinance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!labId) {
      setFinance([]);
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    const q = query(collectionGroup(db, "private"), where("labId", "==", labId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setFinance(snap.docs.map((d) => d.data() as CaseFinance));
        setLoading(false);
      },
      () => {
        setFinance([]);
        setLoading(false);
      },
    );
    return unsub;
  }, [labId]);

  return { finance, loading };
}

/**
 * PHASE 1 — backfill migration.
 * Copies financial fields from every existing case document into the private
 * finance subcollection (and, in `removeFromCase`, strips them from the case
 * doc). Returns the number of cases migrated.
 */
export async function backfillLabFinance(labId: string, removeFromCase = false): Promise<number> {
  const casesCol = collection(db, "lab_orders", labId, "cases");
  const snap = await getDocs(casesCol);
  let migrated = 0;
  for (const d of snap.docs) {
    const order = d.data() as Record<string, unknown>;
    const finance = extractFinance(order as FinanceSource, labId, d.id);
    if (!finance) continue;
    await setDoc(financeDocRef(labId, d.id), finance, { merge: true });
    if (removeFromCase) {
      await setDoc(d.ref, stripFinancialFields(order), { merge: true });
    }
    migrated += 1;
  }
  return migrated;
}

export function sumFinanceRevenue(finance: CaseFinance[]): number {
  return finance.reduce((sum, f) => sum + (Number(f.price) || 0), 0);
}
