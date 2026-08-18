import { useState } from "react";
import { Plus, Minus, ShoppingCart, Check } from "lucide-react";
import { addToCart } from "@/lib/cartStore";
import { addToPurchaseHistory } from "@/lib/quickOrders";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  productName: string;
  productImage?: string;
  officeId: string;
  officeName: string;
  brand?: string;
  category?: string;
  specs?: Record<string, string>;
  unitPrice: number;
  currency: "USD" | "IQD";
  inStock: boolean;
  lang: "ar" | "en";
};

export function ProductAddToCart({
  productId,
  productName,
  productImage,
  officeId,
  officeName,
  brand,
  category,
  specs,
  unitPrice,
  currency,
  inStock,
  lang,
}: Props) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const decrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQty((q) => Math.max(1, q - 1));
  };

  const increment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQty((q) => q + 1);
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      productId,
      productName,
      productImage,
      officeId,
      officeName,
      brand,
      category,
      specs,
      unitPrice,
      currency,
      quantity: qty,
    });
    addToPurchaseHistory({
      productId,
      productName,
      vendor: officeName,
      brand,
      unitPrice,
      image: productImage,
      qty,
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setQty(1);
    }, 1500);
  };

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center justify-between rounded-lg bg-surface border border-border h-9">
        <button
          onClick={decrement}
          disabled={qty <= 1}
          className="size-9 flex items-center justify-center text-slate-600 hover:text-[#0E6E66] transition disabled:opacity-30"
          aria-label="Decrease quantity"
        >
          <Minus className="size-4" />
        </button>
        <span className="text-sm font-bold text-[#0E6E66] min-w-6 text-center">{qty}</span>
        <button
          onClick={increment}
          className="size-9 flex items-center justify-center text-slate-600 hover:text-[#0E6E66] transition"
          aria-label="Increase quantity"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <button
        onClick={handleAdd}
        disabled={!inStock}
        className={cn(
          "w-full h-9 rounded-lg bg-[#0E6E66] text-white hover:bg-[#0B5952] text-xs font-bold flex items-center justify-center gap-1.5 transition",
          !inStock && "opacity-40",
        )}
        aria-label="Add to cart"
      >
        {added ? <Check className="size-3.5" /> : <ShoppingCart className="size-3.5" />}
        {added
          ? lang === "ar"
            ? "تمت الإضافة"
            : "Added"
          : lang === "ar"
            ? `أضف للسلة${qty > 1 ? ` (${qty})` : ""}`
            : `Add to cart${qty > 1 ? ` (${qty})` : ""}`}
      </button>
    </div>
  );
}
