import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { TrendingDown, Store, ArrowUpDown } from "lucide-react";

export type VendorPrice = {
  officeId: string;
  officeName: string;
  officeCity?: string;
  price: number;
  currency: "USD" | "IQD";
  inStock: boolean;
  stockCount?: number;
};

export type ComparedProduct = {
  id: string;
  nameAr?: string;
  nameEn?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  vendors: VendorPrice[];
};

type PriceComparisonProps = {
  products: ComparedProduct[];
  emptyMessage?: string;
};

export function PriceComparison({ products, emptyMessage }: PriceComparisonProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [sortBy, setSortBy] = useState<"name" | "price" | "vendors">("price");

  const sorted = useMemo(() => {
    const copy = [...products].map((p) => ({
      ...p,
      minPrice: p.vendors.length
        ? Math.min(...p.vendors.map((v) => v.price))
        : Infinity,
      vendorCount: p.vendors.length,
    }));

    if (sortBy === "price") {
      copy.sort((a, b) => a.minPrice - b.minPrice);
    } else if (sortBy === "vendors") {
      copy.sort((a, b) => b.vendorCount - a.vendorCount);
    } else {
      copy.sort((a, b) => (a.nameAr ?? a.nameEn ?? "").localeCompare(b.nameAr ?? b.nameEn ?? "", "ar"));
    }
    return copy;
  }, [products, sortBy]);

  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400">
        <Store className="size-10 mx-auto mb-3 opacity-30" />
        <p className="font-semibold text-sm">{emptyMessage ?? (ar ? "لا توجد منتجات للمقارنة" : "No products to compare")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500">
          {ar ? "ترتيب حسب:" : "Sort by:"}
        </span>
        {[
          { key: "price" as const, ar: "السعر", en: "Price" },
          { key: "vendors" as const, ar: "عدد البائعين", en: "Vendors" },
          { key: "name" as const, ar: "الاسم", en: "Name" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setSortBy(item.key)}
            className={cn(
              "h-8 px-3 rounded-full text-[11px] font-semibold border transition",
              sortBy === item.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
            )}
          >
            <ArrowUpDown className="size-3 inline me-1" />
            {ar ? item.ar : item.en}
          </button>
        ))}
      </div>

      {sorted.map((product) => {
        const lowestVendor = product.vendors.reduce((best, v) => (!best || v.price < best.price ? v : best), null as VendorPrice | null);
        const highestVendor = product.vendors.reduce((best, v) => (!best || v.price > best.price ? v : best), null as VendorPrice | null);
        const savings = lowestVendor && highestVendor && highestVendor.price > lowestVendor.price
          ? Math.round(((highestVendor.price - lowestVendor.price) / highestVendor.price) * 100)
          : 0;

        return (
          <div key={product.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              {product.imageUrl && (
                <img src={product.imageUrl} alt="" className="size-14 rounded-xl object-cover shrink-0 bg-slate-50" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-slate-800 line-clamp-2">
                  {ar ? product.nameAr ?? product.nameEn : product.nameEn ?? product.nameAr}
                </p>
                {product.brand && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{product.brand}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {product.vendors.length} {ar ? "بائع" : "vendors"}
                  </span>
                  {savings > 0 && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <TrendingDown className="size-3 inline me-0.5" />
                      {ar ? `وفر ${savings}%` : `Save ${savings}%`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              {product.vendors
                .sort((a, b) => a.price - b.price)
                .map((v) => {
                  const isLowest = v === lowestVendor && product.vendors.length > 1;
                  const fmt = v.currency === "IQD"
                    ? `${v.price.toLocaleString()} د.ع`
                    : `$${v.price.toFixed(2)}`;

                  return (
                    <div
                      key={v.officeId}
                      className={cn(
                        "flex items-center justify-between py-1.5 px-3 rounded-xl text-xs transition",
                        isLowest
                          ? "bg-emerald-50 border border-emerald-200"
                          : "bg-slate-50 hover:bg-slate-100",
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Store className="size-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-700 truncate">
                          {v.officeName}
                          {v.officeCity ? ` · ${v.officeCity}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isLowest && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded">
                            {ar ? "الأقل" : "Lowest"}
                          </span>
                        )}
                        <span className={cn("font-bold", isLowest ? "text-emerald-700" : "text-slate-800")}>
                          {fmt}
                        </span>
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          v.inStock ? "bg-emerald-400" : "bg-rose-400",
                        )} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
