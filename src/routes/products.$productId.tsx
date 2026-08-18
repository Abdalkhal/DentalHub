import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
import { ProductAddToCart } from "@/components/ProductAddToCart";
import { useProducts, useSignedImageUrls, type Product } from "@/lib/products";
import { useI18n } from "@/lib/i18n";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { MapPin, Package, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/products/$productId")({
  component: ProductDetailsPage,
});

function humanizeSpecKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function specsFromProduct(p: Product): Record<string, string> | undefined {
  const s = p.implantSpec;
  if (!s) return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(s)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "catalogUrl" || key === "certifications") continue;
    if (Array.isArray(value)) {
      if (value.length) out[humanizeSpecKey(key)] = value.join("، ");
    } else {
      out[humanizeSpecKey(key)] = String(value);
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function ProductDetailsPage() {
  const { productId } = Route.useParams();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: products = [], isLoading } = useProducts();
  const product = products.find((p) => p.id === productId);

  const allPaths = useMemo(() => product?.images ?? [], [product]);
  const { data: urlMap = {} } = useSignedImageUrls(allPaths);
  const urls = useMemo(
    () => (product?.images ?? []).map((p) => urlMap[p]).filter(Boolean),
    [product, urlMap],
  );

  const { data: supplier } = useQuery({
    queryKey: ["product-supplier", product?.companyId],
    enabled: !!product?.companyId,
    queryFn: async (): Promise<UserRoleDoc | null> => {
      const snap = await getDoc(doc(db, "user_roles", product!.companyId!));
      if (!snap.exists()) return null;
      return snap.data() as UserRoleDoc;
    },
  });

  if (isLoading) {
    return (
      <MobileShell>
        <TopBar title={ar ? "المنتج" : "Product"} showBack />
        <div className="flex justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </MobileShell>
    );
  }

  if (!product) {
    return (
      <MobileShell>
        <TopBar title={ar ? "المنتج" : "Product"} showBack />
        <div className="py-20 text-center text-muted-foreground">
          <Package className="size-12 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-semibold">{ar ? "المنتج غير موجود" : "Product not found"}</p>
        </div>
      </MobileShell>
    );
  }

  const name = ar ? product.ar || product.en : product.en || product.ar;
  const priceLabel =
    product.currency === "IQD"
      ? `${product.price.toLocaleString()} د.ع`
      : `$${product.price.toFixed(2)}`;

  return (
    <MobileShell>
      <TopBar title={name} showBack />
      <div className="pb-8">
        {/* Carousel */}
        {urls.length > 0 ? (
          <ProductImageCarousel
            urls={urls}
            alt={name}
            className="w-full aspect-square bg-slate-100"
            imageClassName="aspect-square"
          />
        ) : (
          <div className="w-full aspect-square bg-slate-100 flex items-center justify-center">
            <Package className="size-16 text-slate-300" />
          </div>
        )}

        <div className="px-4 pt-4 space-y-4">
          {/* Name + brand */}
          <div>
            <h1 className="font-display font-extrabold text-lg leading-tight">{name}</h1>
            {product.brand && (
              <p className="text-sm text-muted-foreground mt-1">{product.brand}</p>
            )}
          </div>

          {/* Price + stock */}
          <div className="flex items-center justify-between">
            <p className="font-display font-extrabold text-2xl text-primary">{priceLabel}</p>
            <span
              className={cn(
                "text-[11px] px-2.5 py-1 rounded-full font-bold",
                product.inStock ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600",
              )}
            >
              {product.inStock ? (ar ? "متوفر" : "In stock") : ar ? "غير متوفر" : "Out of stock"}
            </span>
          </div>

          {/* Supplier */}
          {supplier && (
            <div className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3">
              <span className="size-11 rounded-full bg-primary-soft text-primary flex items-center justify-center font-bold">
                {(supplier.name || "؟").charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{supplier.name}</p>
                {supplier.city && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3" /> {supplier.city}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h2 className="text-sm font-bold mb-1.5">{ar ? "الوصف" : "Description"}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Add to cart */}
          <ProductAddToCart
            productId={product.id}
            productName={name}
            productImage={urls[0]}
            officeId={product.companyId || ""}
            officeName={supplier?.name || (ar ? "مكتب" : "Office")}
            brand={product.brand}
            category={product.branch}
            specs={specsFromProduct(product)}
            unitPrice={product.price}
            currency={product.currency}
            inStock={product.inStock}
            lang={ar ? "ar" : "en"}
          />
        </div>
      </div>
    </MobileShell>
  );
}
