import { createLocalStore } from "./createLocalStore";

export type QuickOrderItem = {
  productId: string;
  name: string;
  vendor: string;
  brand: string;
  orderCount: number;
  totalQty: number;
  unitPrice: number;
  image?: string;
  lastOrdered: string;
};

type HistoryEntry = {
  productId: string;
  productName: string;
  vendor: string;
  brand: string;
  unitPrice: number;
  image?: string;
  qty: number;
  date: string;
  count: number;
};

const purchaseHistory = createLocalStore<HistoryEntry[]>("dh:purchase_history", [], {
  migrate: (data) => (Array.isArray(data) ? (data as HistoryEntry[]) : []),
});

/** Scopes purchase history to the signed-in user — call alongside
 * setFavoritesStoreUser/setPatientStoreUser/etc. whenever the signed-in user
 * changes. Without it every account on the device shared one
 * "dh:purchase_history" key, so "الطلبات السريعة" kept showing whichever
 * account last ordered something, regardless of who was signed in. */
export function setQuickOrdersStoreUser(uid: string): void {
  purchaseHistory.setUser(uid);
}

export function addToPurchaseHistory(item: {
  productId: string; productName: string; vendor: string; brand?: string;
  unitPrice: number; image?: string; qty: number;
}) {
  const history = purchaseHistory.getSnapshot();
  const existing = history.find((h) => h.productId === item.productId);
  if (existing) {
    purchaseHistory.set(
      history.map((h) =>
        h.productId === item.productId
          ? { ...h, count: h.count + 1, qty: h.qty + (item.qty || 1), date: new Date().toISOString() }
          : h,
      ),
    );
  } else {
    purchaseHistory.set([
      ...history,
      {
        productId: item.productId,
        productName: item.productName,
        vendor: item.vendor,
        brand: item.brand || "",
        unitPrice: item.unitPrice,
        image: item.image,
        qty: item.qty || 1,
        date: new Date().toISOString(),
        count: 1,
      },
    ]);
  }
}

export function useQuickOrders(): QuickOrderItem[] {
  const history = purchaseHistory.useStore();
  if (history.length === 0) return [];
  return [...history]
    .sort((a, b) => b.count - a.count || new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map((h) => ({
      productId: h.productId,
      name: h.productName,
      vendor: h.vendor,
      brand: h.brand,
      orderCount: h.count,
      totalQty: h.qty,
      unitPrice: h.unitPrice,
      image: h.image,
      lastOrdered: h.date,
    }));
}
