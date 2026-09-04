import { useMemo } from "react";

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

const KEY = "dh:purchase_history";

function loadHistory(): { productId: string; productName: string; vendor: string; brand: string; unitPrice: number; image?: string; qty: number; date: string; count: number }[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function addToPurchaseHistory(item: {
  productId: string; productName: string; vendor: string; brand?: string;
  unitPrice: number; image?: string; qty: number;
}) {
  const history = loadHistory();
  const existing = history.find((h) => h.productId === item.productId);
  if (existing) {
    existing.count += 1;
    existing.qty += item.qty || 1;
    existing.date = new Date().toISOString();
  } else {
    history.push({
      productId: item.productId,
      productName: item.productName,
      vendor: item.vendor,
      brand: item.brand || "",
      unitPrice: item.unitPrice,
      image: item.image,
      qty: item.qty || 1,
      date: new Date().toISOString(),
      count: 1,
    });
  }
  localStorage.setItem(KEY, JSON.stringify(history));
  window.dispatchEvent(new Event("storage"));
}

export function useQuickOrders(): QuickOrderItem[] {
  return useMemo(() => {
    const history = loadHistory();
    if (history.length === 0) return [];

    return history
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
  }, []);
}
