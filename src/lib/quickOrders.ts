import { useMemo } from "react";
import { toast } from "sonner";
import { createLocalStore } from "./createLocalStore";
import { addToCart } from "./cartStore";
import { useProducts, useSignedImageUrls, type Product } from "./products";

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

/** Scopes purchase history to the signed-in account. */
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

/** Live products for the current quick-order items, their image URLs, and a
 * one-tap reorder (add 1 to cart + bump history) — same as native. */
export function useQuickOrderActions(items: QuickOrderItem[], ar: boolean) {
  const { data: products = [] } = useProducts();
  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])) as Record<string, Product>,
    [products],
  );
  const imagePaths = useMemo(
    () => items.map((it) => productsById[it.productId]?.images?.[0]).filter(Boolean) as string[],
    [items, productsById],
  );
  const { data: urlMap = {} } = useSignedImageUrls(imagePaths);

  const reorder = (item: QuickOrderItem) => {
    const p = productsById[item.productId];
    if (!p) {
      toast.error(ar ? "المنتج غير متوفر حالياً" : "Product is currently unavailable");
      return;
    }
    const imageUrl = p.images[0] ? urlMap[p.images[0]] : undefined;
    const productName = ar ? p.ar || p.en : p.en || p.ar;
    addToCart({
      productId: p.id,
      productName,
      productImage: imageUrl,
      officeId: p.companyId || "",
      officeName: item.vendor || p.brand || (ar ? "المكتب" : "Office"),
      brand: p.brand,
      category: p.branch,
      unitPrice: p.price,
      currency: p.currency,
      quantity: 1,
    });
    addToPurchaseHistory({
      productId: p.id,
      productName,
      vendor: item.vendor || p.brand,
      brand: p.brand,
      unitPrice: p.price,
      image: imageUrl,
      qty: 1,
    });
    toast.success(ar ? "تمت إضافة المنتج إلى السلة" : "Added to cart");
  };

  return { productsById, urlMap, reorder };
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
