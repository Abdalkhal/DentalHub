import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useAdminStore } from "@/lib/adminStore";
import { useProducts, useSignedImageUrls, type Product } from "@/lib/products";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductDetailsModal } from "@/components/ProductDetailsModal";
import { Plus, SearchX, Store, ArrowUpDown, ImageOff } from "lucide-react";

export const Route = createFileRoute("/supplies/branch/$branchSlug")({
  component: BranchAllPage,
});

type Filter = "all" | "in_stock";
type Sort = "default" | "price_asc" | "price_desc" | "name_asc" | "name_desc" | "newest";

function BranchAllPage() {
  const { branchSlug } = Route.useParams();
  const { branches: BRANCHES, offices: OFFICES } = useAdminStore();
  const { data: PRODUCTS = [], isLoading } = useProducts();
  const branch = BRANCHES.find((b) => b.slug === branchSlug);
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("default");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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

  const { data: supplierNames = {} } = useQuery({
    queryKey: [
      "supplies-branch-suppliers",
      items.map((i) => i.companyId ?? "").join("|"),
    ],
    enabled: items.length > 0,
    queryFn: async (): Promise<Record<string, { name: string; city: string }>> => {
      const ids = [...new Set(items.map((i) => i.companyId).filter(Boolean))] as string[];
      const map: Record<string, { name: string; city: string }> = {};
      for (const id of ids) {
        const snap = await getDoc(doc(db, "user_roles", id));
        if (snap.exists()) {
          const d = snap.data() as UserRoleDoc;
          map[id] = { name: d.name || "", city: d.city || "" };
        }
      }
      return map;
    },
  });

  if (!branch) {
    return (
      <MobileShell>
        <TopBar title={lang === "ar" ? "غير موجود" : "Not found"} showBack />
        <div className="p-6 text-center text-sm text-muted-foreground">
          {lang === "ar" ? "هذا الفرع غير موجود" : "Branch not found"}
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
          {lang === "ar" ? "كل المنتجات في هذا الفرع" : "All products in this branch"} ·{" "}
          {items.length}
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

        {OFFICES.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
              {lang === "ar" ? "تصفح حسب المكتب" : "Browse by office"}
            </p>
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
              {OFFICES.map((o) => (
                <Link
                  key={o.id}
                  to="/supplies/$officeId/$branchSlug"
                  params={{ officeId: o.id, branchSlug: branch.slug }}
                  className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold bg-card border border-border hover:bg-accent"
                >
                  <Store className="size-3.5 text-primary" />
                  {lang === "ar" ? o.ar : o.en}
                </Link>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <SearchX className="size-8 mb-2" />
            <p className="text-sm">
              {isLoading
                ? lang === "ar"
                  ? "جارٍ التحميل…"
                  : "Loading…"
                : lang === "ar"
                  ? "لا توجد منتجات في هذا الفرع بعد"
                  : "No products in this branch yet"}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((p) => {
              const urls = p.images.map((path) => urlMap[path]).filter(Boolean);
              const first = urls[0];
              return (
                <li
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className="bg-card border border-border rounded-2xl p-3 shadow-soft cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-14 rounded-xl bg-surface flex items-center justify-center shrink-0 overflow-hidden">
                      {first ? (
                        <img
                          src={first}
                          alt={lang === "ar" ? p.ar : p.en}
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      ) : (
                        <ImageOff className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm truncate">
                        {lang === "ar" ? p.ar : p.en}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{p.brand}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-display font-extrabold text-primary text-sm">
                          ${p.price}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${p.inStock ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
                        >
                          {p.inStock ? t("in_stock") : t("out_of_stock")}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(p);
                      }}
                      className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center"
                      aria-label={t("add_to_order")}
                    >
                      <Plus className="size-4" />
                    </button>
                  </div>
                  {urls.length > 1 && (
                    <div className="mt-2.5" onClick={(e) => e.stopPropagation()}>
                      <ProductGallery urls={urls} alt={lang === "ar" ? p.ar : p.en} size="sm" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {selectedProduct && (
        <ProductDetailsModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          isDoctorView
          cart={{
            officeId: selectedProduct.companyId || "general",
            officeName:
              supplierNames[selectedProduct.companyId || ""]?.name ||
              (lang === "ar" ? "مكتب" : "Office"),
            officeCity: supplierNames[selectedProduct.companyId || ""]?.city || "",
            inStock: selectedProduct.inStock ?? true,
          }}
        />
      )}
    </MobileShell>
  );
}
