import { createFileRoute, notFound, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { COUNTRIES } from "@/data/implants";
import { useProductsByCountry, useSignedImageUrls, type Product } from "@/lib/products";
import { useImplantCompanyNames } from "@/lib/implantOffers";
import { addToCart } from "@/lib/cartStore";
import { addToPurchaseHistory } from "@/lib/quickOrders";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Check, Cpu, EyeOff, Loader2, Minus, Phone, Plus, ShoppingCart } from "lucide-react";

type CompanyInfo = { name: string; phone?: string; photoURL?: string };

function useImplantCompanies(): Record<string, CompanyInfo> {
  const { data = {} } = useQuery({
    queryKey: ["implant-companies-full"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "public_profiles"));
      const map: Record<string, CompanyInfo> = {};
      for (const d of snap.docs) {
        const u = d.data() as UserRoleDoc;
        if (u.accountType === "implant" && u.userId) {
          map[u.userId] = { name: u.name || u.surname || u.title || "", phone: u.phone, photoURL: u.photoURL };
        }
      }
      return map;
    },
    staleTime: 60_000,
  });
  return data;
}

type ImplantFilter = "all" | "comprehensive" | "basal" | "non_immediate";
type ImplantCategory = Exclude<ImplantFilter, "all">;

function implantCategoryOf(
  spec: { implantType?: string; subType?: string } | undefined,
): ImplantCategory | null {
  if (!spec) return null;
  if (spec.implantType === "non-immediate") return "non_immediate";
  if (spec.implantType === "immediate") return spec.subType === "basal" ? "basal" : "comprehensive";
  return null;
}

const CATEGORY_LABEL: Record<ImplantCategory, { ar: string; en: string }> = {
  comprehensive: { ar: "فورية (شاملة)", en: "Immediate (Comprehensive)" },
  basal: { ar: "فورية (قاعدية)", en: "Immediate (Basal)" },
  non_immediate: { ar: "غير فورية", en: "Non-Immediate" },
};

const CATEGORY_TONE: Record<ImplantCategory, string> = {
  comprehensive: "bg-[oklch(0.93_0.06_30)] ring-[oklch(0.85_0.1_30)] text-[oklch(0.5_0.18_30)]",
  basal: "bg-[oklch(0.93_0.06_140)] ring-[oklch(0.85_0.1_140)] text-[oklch(0.5_0.18_140)]",
  non_immediate:
    "bg-[oklch(0.93_0.06_250)] ring-[oklch(0.82_0.1_250)] text-[oklch(0.45_0.18_256)]",
};

function money(n: number, currency: string): string {
  return currency === "IQD" ? `${n.toLocaleString()} د.ع` : `$${n.toFixed(2)}`;
}

function QtyStepper({
  qty,
  onChange,
  max,
}: {
  qty: number;
  onChange: (q: number) => void;
  max?: number;
}) {
  const atMax = max != null && qty >= max;
  return (
    <div className="flex h-8 shrink-0 items-center rounded-lg border border-border bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, qty - 1))}
        disabled={qty <= 0}
        className="size-8 flex items-center justify-center text-slate-600 disabled:opacity-30"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-6 text-center text-xs font-bold text-slate-800">{qty}</span>
      <button
        type="button"
        onClick={() => onChange(max != null ? Math.min(max, qty + 1) : qty + 1)}
        disabled={atMax}
        className="size-8 flex items-center justify-center text-slate-600 disabled:opacity-30"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}

// Each diameter × length option the company added, with its own stock — a
// single implant can be ordered as several distinct lines at once (e.g. 4 of
// Ø3.1×10mm and 2 of Ø4×10mm), so quantity is picked per variant instead of
// once for the whole product. Accessories get the same treatment: each has
// its own price, separate from the implant's.
function ImplantCard({
  product: p,
  imageUrlMap,
  officeName,
  company,
  ar,
  onVisitProfile,
}: {
  product: Product;
  imageUrlMap: Record<string, string>;
  officeName: string;
  company?: CompanyInfo;
  ar: boolean;
  onVisitProfile: (companyId: string) => void;
}) {
  const spec = p.implantSpec;
  const diams = spec?.diameters ?? [];
  const lens = spec?.lengths ?? [];
  const imgUrl = p.images.length > 0 && imageUrlMap[p.images[0]] ? imageUrlMap[p.images[0]] : null;
  const category = implantCategoryOf(spec);
  const name = ar ? p.ar || p.en : p.en || p.ar;
  const accessories = p.accessories ?? [];

  const variants: { diameter: number; length: number; count: number }[] =
    spec?.variants?.map((v) => ({ diameter: v.diameter, length: v.length, count: v.stock })) ??
    spec?.dimensionStocks?.map((v) => ({ diameter: v.diameter, length: v.length, count: v.quantity })) ??
    [];
  const vKey = (v: { diameter: number; length: number }) => `${v.diameter}x${v.length}`;

  const [baseQty, setBaseQty] = useState(1);
  const [variantQty, setVariantQty] = useState<Record<string, number>>({});
  const [accQty, setAccQty] = useState<Record<number, number>>({});
  const [added, setAdded] = useState(false);

  const variantTotal = Object.values(variantQty).reduce((s, q) => s + q, 0);
  const accTotal = Object.values(accQty).reduce((s, q) => s + q, 0);
  const grandTotal = (variants.length > 0 ? variantTotal : baseQty) + accTotal;
  const canAdd = variants.length > 0 ? variantTotal + accTotal > 0 : (p.inStock ?? true) || accTotal > 0;

  const handleAdd = () => {
    const officeId = p.companyId || "";
    if (variants.length > 0) {
      for (const v of variants) {
        const q = variantQty[vKey(v)] || 0;
        if (q <= 0) continue;
        addToCart({
          productId: p.id,
          productName: `${name} · Ø${v.diameter}×${v.length}mm`,
          productImage: imgUrl ?? undefined,
          officeId,
          officeName,
          brand: p.brand,
          category: "implant",
          specs: {
            [ar ? "القطر" : "Diameter"]: `${v.diameter}mm`,
            [ar ? "الطول" : "Length"]: `${v.length}mm`,
          },
          unitPrice: p.price,
          currency: p.currency || "USD",
          quantity: q,
          variantLabel: vKey(v),
        });
        addToPurchaseHistory({
          productId: p.id,
          productName: `${name} · Ø${v.diameter}×${v.length}mm`,
          vendor: officeName,
          brand: p.brand,
          unitPrice: p.price,
          image: imgUrl ?? undefined,
          qty: q,
        });
      }
    } else if (baseQty > 0) {
      addToCart({
        productId: p.id,
        productName: name,
        productImage: imgUrl ?? undefined,
        officeId,
        officeName,
        brand: p.brand,
        category: "implant",
        unitPrice: p.price,
        currency: p.currency || "USD",
        quantity: baseQty,
      });
      addToPurchaseHistory({
        productId: p.id,
        productName: name,
        vendor: officeName,
        brand: p.brand,
        unitPrice: p.price,
        image: imgUrl ?? undefined,
        qty: baseQty,
      });
    }

    accessories.forEach((acc, i) => {
      const q = accQty[i] || 0;
      if (q <= 0) return;
      const accImage = acc.imageUrl ? imageUrlMap[acc.imageUrl] : undefined;
      // A synthetic id (never a real product doc) keeps the accessory line
      // out of the implant's own stock-decrement on confirmation — the
      // implant's `stock` counts implant units only, never accessories.
      addToCart({
        productId: `${p.id}__acc${i}`,
        productName: `${name} — ${acc.name}`,
        productImage: accImage,
        officeId,
        officeName,
        brand: p.brand,
        category: "implant",
        specs: acc.specs ? { [ar ? "المواصفات" : "Specs"]: acc.specs } : undefined,
        unitPrice: acc.price,
        currency: acc.currency,
        quantity: q,
        variantLabel: `acc:${i}`,
      });
      addToPurchaseHistory({
        productId: `${p.id}__acc${i}`,
        productName: `${name} — ${acc.name}`,
        vendor: officeName,
        brand: p.brand,
        unitPrice: acc.price,
        image: accImage,
        qty: q,
      });
    });

    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setVariantQty({});
      setAccQty({});
      setBaseQty(1);
    }, 1500);
  };

  return (
    <li className="bg-card border border-border rounded-2xl p-4 shadow-soft">
      {company && (
        <div className="mb-3 pb-3 border-b border-border flex items-center gap-3">
          <span className="size-9 rounded-full bg-indigo-50 text-indigo-600 ring-2 ring-indigo-100 flex items-center justify-center font-bold shrink-0 overflow-hidden">
            {company.photoURL ? (
              <img src={company.photoURL} alt="" className="size-full object-cover" />
            ) : (
              (company.name || "؟").charAt(0)
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-800 truncate">{company.name}</p>
            {company.phone && (
              <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5" dir="ltr">
                <Phone className="size-2.5 text-slate-400 shrink-0" />
                <span className="truncate">{company.phone}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => p.companyId && onVisitProfile(p.companyId)}
            className="shrink-0 h-8 px-2.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition"
          >
            {ar ? "زيارة الملف" : "Visit Profile"}
          </button>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="size-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
          {imgUrl ? (
            <img src={imgUrl} alt="" className="size-full object-cover" />
          ) : (
            <Cpu className="size-6 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm">{name}</p>
          {p.brand && <p className="text-[11px] text-muted-foreground mt-0.5">{p.brand}</p>}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {spec?.connectionType && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 ring-1 ring-border">
                {spec.connectionType}
              </span>
            )}
            {category && (
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full ring-1 shadow-sm text-[11px] font-semibold",
                  CATEGORY_TONE[category],
                )}
              >
                {ar ? CATEGORY_LABEL[category].ar : CATEGORY_LABEL[category].en}
              </span>
            )}
          </div>
        </div>
      </div>

      {variants.length > 0 ? (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="overflow-hidden rounded-xl border border-border">
            <div className="flex items-center bg-slate-50 px-3 py-2">
              <span className="flex-1 text-[11px] font-bold text-muted-foreground">
                {ar ? "القطر" : "Diameter"}
              </span>
              <span className="flex-1 text-[11px] font-bold text-muted-foreground">
                {ar ? "الطول" : "Length"}
              </span>
              <span className="w-10 text-end text-[11px] font-bold text-muted-foreground">
                {ar ? "المخزون" : "Stock"}
              </span>
              <span className="w-[92px] text-end text-[11px] font-bold text-muted-foreground">
                {ar ? "الكمية" : "Qty"}
              </span>
            </div>
            {variants.map((v, i) => {
              const key = vKey(v);
              return (
                <div
                  key={i}
                  className={cn("flex items-center gap-2 px-3 py-2", i % 2 === 0 ? "bg-white" : "bg-slate-50/60")}
                >
                  <span className="flex-1 text-xs text-foreground">{v.diameter} mm</span>
                  <span className="flex-1 text-xs text-foreground">{v.length} mm</span>
                  <span className={cn("w-10 text-end text-xs font-bold", v.count > 0 ? "text-emerald-600" : "text-rose-500")}>
                    {v.count}
                  </span>
                  <div className="w-[92px] flex justify-end">
                    <QtyStepper qty={variantQty[key] || 0} max={v.count} onChange={(q) => setVariantQty((prev) => ({ ...prev, [key]: q }))} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        (diams.length > 0 || lens.length > 0) && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 text-xs">
              {diams.length > 0 && (
                <div>
                  <span className="font-bold text-muted-foreground">{ar ? "القطر:" : "Diameter:"}</span>
                  <span className="text-foreground ml-1.5">{diams.join(", ")} mm</span>
                </div>
              )}
              {lens.length > 0 && (
                <div>
                  <span className="font-bold text-muted-foreground">{ar ? "الطول:" : "Length:"}</span>
                  <span className="text-foreground ml-1.5">{lens.join(", ")} mm</span>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {spec?.materialGrade && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          <span className="text-[10px] font-semibold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-200">
            {spec.materialGrade}
          </span>
          {spec.surfaceTreatment && (
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
              {spec.surfaceTreatment}
            </span>
          )}
        </div>
      )}

      {accessories.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">
            {ar ? "الإكسسوارات" : "Accessories"} ({accessories.length})
          </p>
          <div className="space-y-1.5">
            {accessories.map((acc, i) => {
              const accStock = acc.stock ?? 0;
              return (
                <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5">
                  <div className="size-8 rounded-md bg-white border border-border overflow-hidden shrink-0 flex items-center justify-center">
                    {acc.imageUrl && imageUrlMap[acc.imageUrl] ? (
                      <img src={imageUrlMap[acc.imageUrl]} alt="" className="size-full object-cover" />
                    ) : (
                      <Cpu className="size-3 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">{acc.name}</p>
                    <p className="text-[9px] text-slate-400 flex items-center gap-1.5">
                      <span className="font-bold text-blue-600">{acc.type}</span>
                      {acc.specs && <span>· {acc.specs}</span>}
                    </p>
                    <p className="flex items-center gap-2 mt-0.5">
                      {acc.price > 0 && (
                        <span className="text-[11px] font-display font-bold text-primary">
                          {money(acc.price, acc.currency)}
                        </span>
                      )}
                      <span className={cn("text-[10px] font-bold", accStock > 0 ? "text-emerald-600" : "text-rose-500")}>
                        {ar ? "متوفر: " : "In stock: "}{accStock}
                      </span>
                    </p>
                  </div>
                  <QtyStepper qty={accQty[i] || 0} max={accStock} onChange={(q) => setAccQty((prev) => ({ ...prev, [i]: q }))} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border space-y-1.5">
        {variants.length === 0 && (
          <div className="flex items-center justify-between rounded-lg bg-surface border border-border h-9">
            <button
              type="button"
              onClick={() => setBaseQty((q) => Math.max(1, q - 1))}
              disabled={baseQty <= 1}
              className="size-9 flex items-center justify-center text-slate-600 disabled:opacity-30"
            >
              <Minus className="size-4" />
            </button>
            <span className="text-sm font-bold text-primary min-w-6 text-center">{baseQty}</span>
            <button
              type="button"
              onClick={() => setBaseQty((q) => Math.min(p.stock || q, q + 1))}
              disabled={baseQty >= (p.stock || 0)}
              className="size-9 flex items-center justify-center text-slate-600 disabled:opacity-30"
            >
              <Plus className="size-4" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className={cn(
            "w-full h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 transition",
            !canAdd && "opacity-40",
          )}
        >
          {added ? <Check className="size-3.5" /> : <ShoppingCart className="size-3.5" />}
          {added
            ? ar
              ? "تمت الإضافة"
              : "Added"
            : `${ar ? "أضف للسلة" : "Add to cart"}${grandTotal > 1 ? ` (${grandTotal})` : ""}`}
        </button>
      </div>
    </li>
  );
}

export const Route = createFileRoute("/implants/$country")({
  component: CountryPage,
  loader: ({ params }) => {
    const country = COUNTRIES.find((c) => c.slug === params.country);
    if (!country) throw notFound();
    return { country };
  },
});

function CountryPage() {
  const { country } = Route.useLoaderData();
  const { t, lang } = useI18n();
  const ar = lang === "ar";
  const [filter, setFilter] = useState<ImplantFilter>("all");
  const isVisitor = useRouterState({
    select: (s) =>
      s.location.state != null &&
      (s.location.state as unknown as Record<string, unknown>)?.isVisitor === true,
  });

  const { data: products = [], isLoading } = useProductsByCountry(country.slug);
  const companyNames = useImplantCompanyNames();
  const companies = useImplantCompanies();
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((p) => implantCategoryOf(p.implantSpec) === filter);
  }, [products, filter]);

  const allPaths = useMemo(() => {
    const productPaths = products.flatMap((p) => p.images);
    const accPaths = products.flatMap((p) =>
      (p.accessories || []).filter((a) => a.imageUrl).map((a) => a.imageUrl),
    );
    return [...productPaths, ...accPaths];
  }, [products]);
  const { data: imageUrlMap = {} } = useSignedImageUrls(allPaths);

  const filters: { key: ImplantFilter; ar: string; en: string }[] = [
    { key: "all", ar: "الكل", en: "All" },
    { key: "comprehensive", ar: "فورية (شاملة)", en: "Immediate (Comprehensive)" },
    { key: "basal", ar: "فورية (قاعدية)", en: "Immediate (Basal)" },
    { key: "non_immediate", ar: "غير فورية", en: "Non-Immediate" },
  ];

  return (
    <MobileShell wide>
      <TopBar title={`${t("implants")} ${lang === "ar" ? country.ar : country.en}`} showBack wide />
      {isVisitor && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl px-4 py-2.5 md:mx-6 md:mt-5 lg:mx-auto lg:max-w-5xl">
          <EyeOff className="size-4 shrink-0" />
          {ar
            ? "وضع القراءة فقط — لا يمكنك تعديل أو إضافة محتوى"
            : "Read-only mode — you cannot edit or add content"}
        </div>
      )}
      <div className="px-4 pt-4 md:px-6 md:pt-8 md:pb-12 lg:px-8 lg:max-w-5xl lg:mx-auto">
        <div className="flex items-center gap-3 mb-4 md:gap-5 md:mb-7">
          <div className="text-5xl md:text-7xl">{country.flag}</div>
          <div>
            <p className="text-xs text-muted-foreground md:text-sm">{t("brands")}</p>
            <p className="font-display font-extrabold text-xl md:text-4xl">{filtered.length}</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide md:mx-0 md:px-0 md:flex-wrap md:overflow-visible md:gap-2.5">
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "h-9 px-4 rounded-full text-xs font-bold whitespace-nowrap transition ring-1 shadow-sm",
                  active
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-card text-foreground ring-border hover:bg-accent",
                )}
              >
                {ar ? f.ar : f.en}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center text-muted-foreground md:py-28 md:rounded-2xl md:border md:border-dashed md:border-border md:bg-card md:mt-7">
            <Cpu className="size-14 mb-4 opacity-20" />
            <p className="font-display font-bold text-lg text-slate-400">
              {ar ? "لا توجد زرعات بعد" : "No implants yet"}
            </p>
            <p className="text-sm mt-1 max-w-xs text-slate-400">
              {ar
                ? "ستظهر هنا الزرعات المضافة من قبل الشركات"
                : "Implants added by companies will appear here"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3 md:mt-7 md:space-y-0 md:grid md:grid-cols-2 md:gap-5 xl:grid-cols-3 md:items-start">
            {filtered.map((p) => (
              <ImplantCard
                key={p.id}
                product={p}
                imageUrlMap={imageUrlMap}
                officeName={companyNames[p.companyId || ""] || p.brand || (ar ? "شركة زرعات" : "Implant Company")}
                company={p.companyId ? companies[p.companyId] : undefined}
                ar={ar}
                onVisitProfile={(companyId) =>
                  navigate({ to: "/profile/$accountId", params: { accountId: companyId } })
                }
              />
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
