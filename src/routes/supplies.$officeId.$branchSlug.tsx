import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useAdminStore } from "@/lib/adminStore";
import { useProducts, useSignedImageUrls } from "@/lib/products";
import { Plus, SearchX, ArrowUpDown, ImageOff, Check, Heart } from "lucide-react";
import { addToCart } from "@/lib/cartStore";
import { addToPurchaseHistory } from "@/lib/quickOrders";
import { cn } from "@/lib/utils";
import { useIsFavorited, toggleFavorite } from "@/lib/favoritesStore";

function FavoriteHeart({
  productId, title, vendor, price, currency, imageUrl, lang,
}: {
  productId: string; title: string; vendor: string; price: number;
  currency: "USD" | "IQD"; imageUrl?: string; lang: "ar" | "en";
}) {
  const liked = useIsFavorited(productId);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite({
          id: productId, title, vendor, price, currency, imageUrl,
          addedAt: new Date().toISOString(),
        }, lang);
      }}
      className="absolute top-2.5 right-2.5 z-10 size-8 rounded-xl flex items-center justify-center transition bg-white/80 backdrop-blur border border-slate-200 hover:bg-slate-50 shadow-sm"
      aria-label={liked ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={cn("size-4", liked ? "fill-rose-500 text-rose-500" : "text-slate-400")} />
    </button>
  );
}

export const Route = createFileRoute("/supplies/$officeId/$branchSlug")({
  component: BranchPage,
});

type Filter = "all" | "in_stock";
type Sort = "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc" | "newest";

function BranchPage() {
  const { officeId, branchSlug } = Route.useParams();
  const { offices: OFFICES, branches: BRANCHES } = useAdminStore();
  const { data: PRODUCTS = [], isLoading } = useProducts();
  const office = OFFICES.find((o) => o.id === officeId);
  const branch = BRANCHES.find((b) => b.slug === branchSlug);
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("default");

  const items = useMemo(() => {
    if (!branch) return [];
    const needle = q.trim().toLowerCase();
    let list = PRODUCTS.filter((p) => p.branch === branch.slug).filter((p) => {
      if (!needle) return true;
      return (
        p.ar.toLowerCase().includes(needle) ||
        p.en.toLowerCase().includes(needle) ||
        p.brand.toLowerCase().includes(needle)
      );
    });
    if (filter === "in_stock") list = list.filter((p) => p.inStock);
    if (sort === "price_asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") list = [...list].sort((a, b) => b.price - a.price);
    if (sort === "name_asc")
      list = [...list].sort((a, b) =>
        lang === "ar" ? a.ar.localeCompare(b.ar) : a.en.localeCompare(b.en),
      );
    if (sort === "name_desc")
      list = [...list].sort((a, b) =>
        lang === "ar" ? b.ar.localeCompare(a.ar) : b.en.localeCompare(a.en),
      );
    if (sort === "newest")
      list = [...list].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      );
    return list;
  }, [q, filter, sort, branch, lang, PRODUCTS]);

  const allPaths = useMemo(() => items.flatMap((p) => p.images), [items]);
  const { data: urlMap = {} } = useSignedImageUrls(allPaths);

  if (!office || !branch) {
    return (
      <MobileShell>
        <TopBar title={lang === "ar" ? "غير موجود" : "Not found"} showBack />
        <div className="p-6 text-center text-sm text-muted-foreground">
          {lang === "ar" ? "العنصر غير موجود" : "Not found"}
        </div>
      </MobileShell>
    );
  }

  const chips: { key: Filter; ar: string; en: string }[] = [
    { key: "all", ar: "الكل", en: "All" },
    { key: "in_stock", ar: "المتوفر فقط", en: "In stock" },
  ];

  const sorts: { key: Sort; ar: string; en: string }[] = [
    { key: "default", ar: "الافتراضي", en: "Default" },
    { key: "price_asc", ar: "السعر: الأقل أولاً", en: "Price: low → high" },
    { key: "price_desc", ar: "السعر: الأعلى أولاً", en: "Price: high → low" },
    { key: "name_asc", ar: "الاسم: أ-ي", en: "Name: A-Z" },
    { key: "name_desc", ar: "الاسم: ي-أ", en: "Name: Z-A" },
    { key: "newest", ar: "الأحدث", en: "Newest" },
  ];

  return (
    <MobileShell>
      <TopBar
        title={lang === "ar" ? branch.ar : branch.en}
        showBack
        showSearch
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder={lang === "ar" ? "ابحث بالاسم أو الماركة…" : "Search name or brand…"}
      />
      <div className="px-4 pt-4">
        <p className="text-xs text-muted-foreground mb-3">
          {lang === "ar" ? office.ar : office.en} ·{" "}
          {lang === "ar" ? office.city.ar : office.city.en} /{" "}
          {lang === "ar" ? office.area.ar : office.area.en} · {items.length}{" "}
          {lang === "ar" ? "منتج" : "products"}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-2">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition ${
                filter === c.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              {lang === "ar" ? c.ar : c.en}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-2">
          <span className="shrink-0 text-[11px] text-muted-foreground flex items-center gap-1">
            <ArrowUpDown className="size-3" />
            {lang === "ar" ? "ترتيب:" : "Sort:"}
          </span>
          {sorts.map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={`shrink-0 h-7 px-2.5 rounded-full text-[11px] font-semibold border transition ${
                sort === s.key
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              {lang === "ar" ? s.ar : s.en}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <SearchX className="size-8 mb-2" />
            <p className="text-sm">
              {isLoading
                ? lang === "ar"
                  ? "جارٍ التحميل…"
                  : "Loading…"
                : lang === "ar"
                  ? "لا توجد منتجات مطابقة"
                  : "No matching products"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {items.map((p) => {
              const urls = p.images.map((path) => urlMap[path]).filter(Boolean);
              const first = urls[0];
              return (
                <div key={p.id} className="bg-card border border-border rounded-xl p-3 shadow-soft flex flex-col relative">
                  <FavoriteHeart
                    productId={p.id}
                    title={lang === "ar" ? p.ar : p.en}
                    vendor={p.brand || office?.ar || office?.en || ""}
                    price={p.price}
                    currency={p.currency ?? "USD"}
                    imageUrl={p.images?.[0] ? urlMap[p.images[0]] : undefined}
                    lang={lang}
                  />
                  <div className="w-full h-36 rounded-lg bg-surface flex items-center justify-center overflow-hidden mb-2.5">
                    {first ? (
                      <img src={first} alt={lang === "ar" ? p.ar : p.en} loading="lazy" className="size-full object-contain" />
                    ) : (
                      <ImageOff className="size-8 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-display font-bold text-sm leading-snug line-clamp-2">{lang === "ar" ? p.ar : p.en}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{p.brand}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-display font-extrabold text-primary text-sm">${p.price}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${p.inStock ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{p.inStock ? t("in_stock") : t("out_of_stock")}</span>
                  </div>
                  <AddToCartButton
                    productId={p.id} productName={lang === "ar" ? p.ar : p.en}
                    productImage={p.images?.[0] ? urlMap[p.images[0]] : undefined}
                    officeId={officeId} officeName={lang === "ar" ? office?.ar ?? "" : office?.en ?? ""}
                    brand={p.brand} category={p.branch} unitPrice={p.price}
                    currency={p.currency ?? "USD"} inStock={p.inStock ?? false} lang={lang}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function AddToCartButton({
  productId, productName, productImage, officeId,
  officeName, brand, category, unitPrice, currency, inStock, lang,
}: {
  productId: string; productName: string; productImage?: string;
  officeId: string; officeName: string; brand?: string; category?: string;
  unitPrice: number; currency: "USD" | "IQD"; inStock: boolean;
  lang: "ar" | "en";
}) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart({
      productId, productName, productImage, officeId,
      officeName, brand, category, unitPrice, currency, quantity: 1,
    });
    addToPurchaseHistory({
      productId, productName, vendor: officeName, brand,
      unitPrice, image: productImage, qty: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <button
      disabled={!inStock}
      onClick={handleAdd}
      className={cn(
        "w-full mt-2 h-9 rounded-lg flex items-center justify-center gap-1.5 transition-all text-xs font-bold",
        added
          ? "bg-emerald-500 text-white"
          : "bg-primary/10 text-primary hover:bg-primary/20",
        !inStock && "opacity-40",
      )}
      aria-label="Add to cart"
    >
      {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
      {added ? (lang === "ar" ? "تمت الإضافة" : "Added") : (lang === "ar" ? "أضف للسلة" : "Add to cart")}
    </button>
  );
}
