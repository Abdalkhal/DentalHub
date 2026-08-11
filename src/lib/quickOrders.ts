import { useMemo } from "react";
import { getSnapshot } from "@/lib/ordersStore";

export type QuickOrderItem = {
  name: string;
  vendor: string;
  vendorType: string;
  orderCount: number;
  totalQty: number;
  avgPrice: number;
  lastOrdered: string;
  image?: string;
};

export function useQuickOrders(): QuickOrderItem[] {
  return useMemo(() => {
    const orders = getSnapshot();
    if (orders.length === 0) return [];

    const byProduct = new Map<string, {
      name: string;
      vendor: string;
      vendorType: string;
      count: number;
      qty: number;
      totalPrice: number;
      lastDate: string;
    }>();

    for (const o of orders) {
      const key = o.workType || o.doctor || "";
      if (!key) continue;
      const existing = byProduct.get(key);
      if (existing) {
        existing.count += 1;
        existing.qty += o.unitsCount || 1;
        existing.totalPrice += o.price || 0;
        const od = o.dueDate || o.receivedDate;
        if (od && od > existing.lastDate) existing.lastDate = od;
      } else {
        byProduct.set(key, {
          name: key,
          vendor: o.doctor || "",
          vendorType: o.workType?.includes("implant") ? "lab" : "supply",
          count: 1,
          qty: o.unitsCount || 1,
          totalPrice: o.price || 0,
          lastDate: o.dueDate || o.receivedDate || "",
        });
      }
    }

    return [...byProduct.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([, data]) => ({
        name: data.name,
        vendor: data.vendor,
        vendorType: data.vendorType,
        orderCount: data.count,
        totalQty: data.qty,
        avgPrice: data.count > 0 ? Math.round(data.totalPrice / data.count) : 0,
        lastOrdered: data.lastDate,
      }));
  }, []);
}
