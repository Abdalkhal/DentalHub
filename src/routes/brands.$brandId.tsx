import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, Check, MapPin, ShoppingCart } from "lucide-react";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { BrandLogo } from "@/components/BrandLogo";
import { FavoriteButton } from "@/components/FavoriteButton";
import {
  BRAND_CATEGORIES,
  getBrand,
  minPrice,
  type BrandProduct,
} from "@/data/brands";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/brands/$brandId")({
  component: BrandDetail,
  loader: ({ params }) => {
    const brand = getBrand(params.brandId);
    if (!brand) throw notFound();
    return { name: brand.name };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.name;
    if (!name) {
      return {
        meta: [{ title: "براند غير متوفر | DentalHub" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: `${name} — منتجات وأسعار المكاتب | DentalHub` },
        {
          name: "description",
          content: `تصفح منتجات ${name} والمكاتب الموفرة لها وأسعارها وحالة التوفر.`,
        },
        { property: "og:title", content: `${name} | DentalHub` },
        {
          property: "og:description",
          content: `منتجات ${name} مع أسعار المكاتب وحالة التوفر.`,
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <MobileShell>
      <TopBar title="Brand" showBack />
      <p className="p-6 text-sm text-muted-foreground text-center">هذا البراند غير موجود.</p>
    </MobileShell>
  ),
});

type Sort = "price" | "vendor";

function BrandDetail() {
  const { brandId } = Route.useParams();
  const { lang } = useI18n();
  const brand = getBrand(brandId)!;
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("price");

  const products = useMemo(() => {
    const list = brand.products.filter((p) => cat === "all" || p.category === cat);
    return [...list].sort((a, b) =>
      sort === "price"
        ? minPrice(a) - minPrice(b)
        : b.vendors.length - a.vendors.length
    );
  }, [brand, cat, sort]);

  const tabs = [{ slug: "all", ar: "الكل", en: "All" }, ...BRAND_CATEGORIES];

  return (
    <MobileShell>
      <TopBar title={lang === "ar" ? brand.ar : brand.name} showBack />

      <div className="px-4 pt-4 pb-8">
        {/* Banner */}
        <section className="relative rounded-3xl bg-gradient-to-br from-primary to-[oklch(0.45_0.14_255)] text-primary-foreground p-4 shadow-card">
          <FavoriteButton
            className="absolute top-3 end-3 z-10"
            size="sm"
            item={{
              id: brand.id,
              kind: "implant",
              titleAr: brand.ar,
              titleEn: brand.name,
              subAr: brand.countryAr,
              subEn: brand.countryEn,
              to: "/brands/$brandId",
              params: { brandId: brand.id },
            }}
          />
          <div className="flex items-center gap-3">
            <span className="size-20 rounded-2xl bg-card flex items-center justify-center shadow-sm shrink-0">
              <BrandLogo brand={brand} />
            </span>
            <div className="min-w-0">
              <h1 className="font-display font-extrabold text-lg leading-tight">
                {lang === "ar" ? brand.ar : brand.name}
              </h1>
              <p className="text-[12px] opacity-90 flex items-center gap-1 mt-1">
                <MapPin className="size-3.5" />
                {lang === "ar" ? brand.countryAr : brand.countryEn}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-card/95 text-foreground px-2.5 py-1 text-[11px] font-bold">
                <BadgeCheck className="size-3.5 text-primary" />
                {lang === "ar"
                  ? `${brand.distributors} وكيل معتمد`
                  : `${brand.distributors} certified distributors`}
              </span>
            </div>
          </div>
        </section>

        {/* Category tabs */}
        <div className="mt-4 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 w-max">
            {tabs.map((t) => (
              <button
                key={t.slug}
                onClick={() => setCat(t.slug)}
                className={cn(
                  "h-9 px-3.5 rounded-full text-xs font-bold border transition whitespace-nowrap",
                  cat === t.slug
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border"
                )}
              >
                {lang === "ar" ? t.ar : t.en}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {lang === "ar" ? "ترتيب:" : "Sort:"}
          </span>
          {(["price", "vendor"] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "h-8 px-3 rounded-full text-[11px] font-bold border",
                sort === s
                  ? "bg-primary-soft text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border"
              )}
            >
              {s === "price"
                ? lang === "ar" ? "حسب السعر" : "By price"
                : lang === "ar" ? "حسب المكاتب" : "By vendors"}
            </button>
          ))}
        </div>

        {/* Products */}
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {lang === "ar" ? "لا توجد منتجات في هذه الفئة" : "No products in this category"}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} color={brand.color} />
            ))}
          </ul>
        )}

        <Link
          to="/brands"
          className="mt-6 block text-center text-xs font-bold text-primary"
        >
          {lang === "ar" ? "كل البراندات ›" : "All brands ›"}
        </Link>
      </div>
    </MobileShell>
  );
}

function ProductCard({ product, color }: { product: BrandProduct; color: string }) {
  const { lang } = useI18n();
  const [vendorIdx, setVendorIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const cat = BRAND_CATEGORIES.find((c) => c.slug === product.category);
  const vendor = product.vendors[vendorIdx];

  return (
    <li className="rounded-2xl bg-card border border-border p-3 shadow-soft">
      <div className="flex items-start gap-3">
        <span
          className="size-16 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-extrabold text-center px-1 leading-tight"
          style={{ backgroundColor: "oklch(0.97 0.01 240)", color }}
        >
          {product.en.split(" ").slice(0, 2).join(" ")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-extrabold text-[13px] leading-tight">
            {lang === "ar" ? product.ar : product.en}
          </p>
          <p className="text-[11px] text-muted-foreground">{product.en}</p>
          <span className="mt-1 inline-block rounded-full bg-primary-soft text-primary text-[10px] font-bold px-2 py-0.5">
            {lang === "ar" ? cat?.ar : cat?.en}
          </span>
        </div>
      </div>

      {/* Vendors */}
      <p className="mt-3 text-[11px] font-bold text-foreground">
        {lang === "ar" ? "المكاتب الموفرة للمادة" : "Available vendors"}
      </p>
      <ul className="mt-1.5 space-y-1.5">
        {product.vendors.map((v, i) => (
          <li
            key={v.vendorEn}
            className={cn(
              "flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2",
              i === vendorIdx ? "border-primary/40 bg-primary-soft/50" : "border-border bg-background"
            )}
          >
            <button onClick={() => setVendorIdx(i)} className="min-w-0 flex-1 text-start">
              <p className="text-[12px] font-semibold truncate">
                {lang === "ar" ? v.vendorAr : v.vendorEn}
              </p>
              <span
                className={cn(
                  "text-[10px] font-bold",
                  v.inStock ? "text-emerald-600" : "text-amber-600"
                )}
              >
                {v.inStock
                  ? lang === "ar" ? "متوفر" : "In stock"
                  : lang === "ar" ? "ينفذ قريباً" : "Low stock"}
              </span>
            </button>
            <span className="font-display font-extrabold text-primary text-sm shrink-0">
              ${v.price}
            </span>
          </li>
        ))}
      </ul>

      {/* Add to cart */}
      <div className="mt-3 flex items-center gap-2">
        <select
          value={vendorIdx}
          onChange={(e) => {
            setVendorIdx(Number(e.target.value));
            setAdded(false);
          }}
          className="h-10 flex-1 min-w-0 rounded-xl bg-background border border-border px-2 text-[12px] font-semibold"
          aria-label={lang === "ar" ? "اختر المكتب" : "Select vendor"}
        >
          {product.vendors.map((v, i) => (
            <option key={v.vendorEn} value={i}>
              {(lang === "ar" ? v.vendorAr : v.vendorEn) + ` — $${v.price}`}
            </option>
          ))}
        </select>
        <button
          onClick={() => setAdded(true)}
          disabled={!vendor.inStock}
          className={cn(
            "h-10 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition",
            added
              ? "bg-emerald-600 text-white"
              : "bg-primary text-primary-foreground hover:opacity-90",
            !vendor.inStock && "opacity-50"
          )}
        >
          {added ? <Check className="size-4" /> : <ShoppingCart className="size-4" />}
          {added
            ? lang === "ar" ? "تمت الإضافة" : "Added"
            : lang === "ar" ? "إضافة للسلة" : "Add to cart"}
        </button>
      </div>
    </li>
  );
}
