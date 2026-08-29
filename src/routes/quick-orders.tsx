import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useQuickOrders, addToPurchaseHistory } from "@/lib/quickOrders";
import { useProducts, useSignedImageUrls } from "@/lib/products";
import { addToCart } from "@/lib/cartStore";
import { toast } from "sonner";
import { Package, ShoppingBag, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/quick-orders")({
  component: QuickOrdersPage,
});

function fmtPrice(n: number) {
  return n > 0 ? `$${n.toFixed(2)}` : "—";
}

function QuickOrdersPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const items = useQuickOrders();
  const { data: products = [] } = useProducts();

  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  const imagePaths = useMemo(
    () => items.map((it) => productsById[it.productId]?.images?.[0]).filter(Boolean) as string[],
    [items, productsById],
  );
  const { data: urlMap = {} } = useSignedImageUrls(imagePaths);

  const handleReorder = (item: (typeof items)[number]) => {
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

  const goToProduct = (item: (typeof items)[number]) => {
    const p = productsById[item.productId];
    if (!p?.companyId) return;
    (
      navigate as unknown as (opts: {
        to: string;
        params: Record<string, string>;
        state: Record<string, unknown>;
      }) => void
    )({
      to: "/profile/$accountId",
      params: { accountId: p.companyId },
      state: { openProductId: p.id },
    });
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "الطلبات السريعة" : "Quick Orders"} showBack />
      <div className="px-3 pt-4 pb-24">
        {items.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="size-9 text-slate-300" />
            </div>
            <p className="font-bold text-lg text-slate-500">
              {ar ? "لا توجد طلبات بعد" : "No orders yet"}
            </p>
            <p className="text-sm mt-1">
              {ar ? "لم تقم بإجراء أي طلبات شراء بعد" : "You haven't placed any orders yet"}
            </p>
            <div className="flex gap-2 mt-4 justify-center">
              <Link
                to="/supplies"
                className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5"
              >
                <Package className="size-4" />
                {ar ? "المستلزمات الطبية" : "Medical Supplies"}
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-sm text-slate-500">
                {ar ? "الأكثر طلباً" : "Most Ordered"}
              </h2>
              <span className="text-xs text-slate-400">
                {items.length} {ar ? "منتج" : "products"}
              </span>
            </div>
            {items.map((item) => {
              const p = productsById[item.productId];
              const img = p?.images?.[0] ? urlMap[p.images[0]] : undefined;
              return (
                <div
                  key={item.productId}
                  className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex items-start gap-3"
                >
                  <button type="button" onClick={() => goToProduct(item)} className="shrink-0">
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        className="size-14 rounded-xl object-cover bg-slate-100"
                      />
                    ) : (
                      <span className="size-14 rounded-xl bg-slate-50 flex items-center justify-center">
                        <Package className="size-6 text-slate-300" />
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => goToProduct(item)}
                    className="flex-1 min-w-0 text-start"
                  >
                    <p className="font-bold text-sm truncate text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.vendor}</p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                      <span>
                        {ar ? "طلب" : "ordered"} {item.orderCount}×
                      </span>
                      <span>·</span>
                      <span>
                        {ar ? "الكمية" : "qty"}: {item.totalQty}
                      </span>
                      <span>·</span>
                      <span className="font-bold text-primary">{fmtPrice(item.unitPrice)}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReorder(item)}
                    className="h-8 px-3 rounded-lg bg-primary/10 text-primary text-[10px] font-bold shrink-0 hover:bg-primary/20 transition flex items-center gap-1"
                  >
                    <RotateCcw className="size-3" />
                    {ar ? "إعادة طلب" : "Reorder"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
