import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, ChevronLeft, Layers, Loader2, Package, Search, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { BRANCHES } from "@/data/offices";
import { subcategoriesOf } from "@/data/subcategories";
import { ALL_COUNTRIES } from "@/data/countries";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { productsQueryKey, useProductsByCompany, type Currency } from "@/lib/products";
import {
  catalogBrands,
  draftError,
  fillMissingImages,
  filterCatalog,
  listingId,
  newDraft,
  publishListings,
  useCatalog,
  type CatalogFilter,
  type CatalogItem,
  type ListingDraft,
} from "@/lib/catalog";

export const Route = createFileRoute("/catalog-add")({
  component: () => (
    <RoleGuard allowedRoles={["supply", "implant"]}>
      <CatalogAdd />
    </RoleGuard>
  ),
});

const TEAL = "#0E6E66";
const PAGE = 40;
const field =
  "w-full h-10 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#0E6E66]/20 focus:border-[#0E6E66]";

function CatalogAdd() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const uid = user?.uid;
  const { data: items = [], isLoading, isError, refetch } = useCatalog();
  const { data: mine = [] } = useProductsByCompany(uid);
  // Listings made before catalog images existed get theirs now.
  const imagesFilled = useRef(false);
  useEffect(() => {
    if (imagesFilled.current || items.length === 0 || mine.length === 0) return;
    imagesFilled.current = true;
    void fillMissingImages(mine, items).then((n) => {
      if (n > 0) void queryClient.invalidateQueries({ queryKey: productsQueryKey });
    });
  }, [items, mine, queryClient]);
  const listed = useMemo(() => new Set(mine.map((p) => p.catalogId).filter(Boolean)), [mine]);

  const [mode, setMode] = useState<"brands" | "sections">("brands");
  const [filter, setFilter] = useState<CatalogFilter | null>(null);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [selected, setSelected] = useState<Map<string, CatalogItem>>(new Map());
  const [drafts, setDrafts] = useState<ListingDraft[] | null>(null);
  const [currency, setCurrency] = useState<Currency>("IQD");
  const [publishing, setPublishing] = useState(false);

  const brands = useMemo(() => catalogBrands(items), [items]);
  const noBrandCount = useMemo(() => items.filter((i) => !i.brand).length, [items]);
  const searching = q.trim().length >= 2;
  const results = useMemo(() => {
    if (searching) return filterCatalog(items, { ...(filter ?? {}), q });
    return filter ? filterCatalog(items, filter) : [];
  }, [items, filter, q, searching]);
  const showingProducts = searching || !!filter;

  const branchName = (slug: string) => {
    const b = BRANCHES.find((x) => x.slug === slug);
    return b ? (ar ? b.ar : b.en) : slug;
  };
  const subName = (slug: string, en: string) => {
    const s = subcategoriesOf(slug).find((x) => x.en === en);
    return s ? (ar ? s.ar : s.en) : en;
  };
  const open = (f: CatalogFilter) => {
    setFilter(f);
    setShown(PAGE);
  };
  const toggle = (it: CatalogItem) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(it.id)) next.delete(it.id);
      else next.set(it.id, it);
      return next;
    });

  const startDrafts = () => setDrafts([...selected.values()].map((it) => newDraft(it, currency)));
  const updateDraft = (id: string, patch: Partial<ListingDraft>) =>
    setDrafts((list) => (list ?? []).map((d) => (d.item.id === id ? { ...d, ...patch } : d)));

  const publish = async () => {
    if (!uid || !drafts) return;
    const problem = drafts.map((d) => draftError(d, ar)).find(Boolean);
    if (problem) {
      toast.error(problem);
      return;
    }
    setPublishing(true);
    try {
      await publishListings(uid, drafts);
      await queryClient.invalidateQueries({ queryKey: productsQueryKey });
      toast.success(ar ? `تم عرض ${drafts.length} منتج` : `${drafts.length} products listed`);
      navigate({ to: "/supplies" });
    } catch (e) {
      toast.error(
        ar ? `تعذر النشر: ${(e as Error)?.message ?? ""}` : `Couldn't publish: ${(e as Error)?.message ?? ""}`,
      );
    } finally {
      setPublishing(false);
    }
  };

  if (drafts) {
    return (
      <MobileShell wide>
        <TopBar title={ar ? "تفاصيل العرض" : "Listing details"} showBack wide maxW="3xl" />
        <div className="px-4 py-4 space-y-3 pb-44 lg:pb-28 md:px-6 lg:max-w-3xl lg:mx-auto">
          <button type="button" onClick={() => setDrafts(null)} className="flex items-center gap-1 text-sm font-bold text-[#0E6E66]">
            <ArrowRight className="size-4 ltr:rotate-180" />
            {ar ? "العودة إلى الاختيار" : "Back to selection"}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{ar ? "العملة لكل المنتجات:" : "Currency for all:"}</span>
            {(["IQD", "USD"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCurrency(c);
                  setDrafts((list) => (list ?? []).map((d) => ({ ...d, currency: c })));
                }}
                className={`h-8 px-3 rounded-lg border font-bold ${currency === c ? "bg-[#0E6E66] border-[#0E6E66] text-white" : "bg-white border-slate-200 text-slate-600"}`}
              >
                {c === "IQD" ? (ar ? "دينار" : "IQD") : ar ? "دولار" : "USD"}
              </button>
            ))}
          </div>
          {drafts.map((d) => (
            <DraftCard key={d.item.id} d={d} ar={ar} onChange={(p) => updateDraft(d.item.id, p)} onRemove={() => {
              toggle(d.item);
              setDrafts((list) => {
                const next = (list ?? []).filter((x) => x.item.id !== d.item.id);
                return next.length ? next : null;
              });
            }} />
          ))}
        </div>
        <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 p-3">
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={publish}
              disabled={publishing}
              className="w-full h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ backgroundColor: TEAL }}
            >
              {publishing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {ar ? `عرض ${drafts.length} منتج` : `List ${drafts.length} products`}
            </button>
          </div>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell wide>
      <TopBar title={ar ? "إضافة من الدليل" : "Add from catalog"} showBack wide maxW="3xl" />
      <div className="px-4 py-4 space-y-3 pb-44 lg:pb-28 md:px-6 lg:max-w-3xl lg:mx-auto">
        <div className="relative">
          <Search className="size-4 absolute start-3 top-3 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setShown(PAGE);
            }}
            placeholder={ar ? "ابحث باسم المنتج أو البراند" : "Search by product or brand"}
            className={`${field} ps-9 bg-white`}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-slate-400" />
          </div>
        ) : isError ? (
          <button type="button" onClick={() => refetch()} className="w-full py-12 text-sm font-bold text-rose-500">
            {ar ? "تعذر تحميل الدليل. اضغط لإعادة المحاولة" : "Couldn't load the catalog. Tap to retry"}
          </button>
        ) : showingProducts ? (
          <>
            {filter && (
              <button type="button" onClick={() => setFilter(null)} className="flex items-center gap-1 text-sm font-bold text-[#0E6E66]">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {filter.brand !== undefined
                  ? filter.brand || (ar ? "منتجات بدون براند" : "No brand")
                  : `${branchName(filter.branch ?? "")}${filter.sub ? ` · ${subName(filter.branch ?? "", filter.sub)}` : ""}`}
              </button>
            )}
            <p className="text-xs text-slate-400">{results.length} {ar ? "منتج" : "products"}</p>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-soft divide-y divide-slate-50 overflow-hidden">
              {results.slice(0, shown).map((it) => {
                const isListed = listed.has(it.id) || mine.some((p) => p.id === listingId(uid ?? "", it.id));
                const checked = selected.has(it.id);
                return (
                  <button
                    key={it.id}
                    type="button"
                    disabled={isListed}
                    onClick={() => toggle(it)}
                    className="w-full px-3.5 py-3 flex items-center gap-3 text-start disabled:opacity-60"
                  >
                    <span className={`size-5 shrink-0 rounded-md border flex items-center justify-center ${checked ? "bg-[#0E6E66] border-[#0E6E66]" : "border-slate-300"}`}>
                      {checked && <Check className="size-3.5 text-white" />}
                    </span>
                    {it.image ? (
                      <img src={it.image} alt="" loading="lazy" className="size-11 shrink-0 rounded-lg bg-slate-100 object-cover" />
                    ) : (
                      <span className="size-11 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Package className="size-5 text-slate-300" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-800 truncate" dir="ltr">{it.en}</span>
                      <span className="block text-[11px] text-slate-400 truncate">
                        {[it.brand || (ar ? "بدون براند" : "No brand"), subName(it.branch, it.sub)].join(" · ")}
                      </span>
                    </span>
                    {isListed && (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                        {ar ? "معروض" : "Listed"}
                      </span>
                    )}
                  </button>
                );
              })}
              {results.length === 0 && (
                <div className="py-10 text-center">
                  <Package className="size-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-500">{ar ? "لا توجد نتائج" : "No results"}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {ar ? "يمكنك إضافته يدوياً من لوحة المورد." : "You can add it by hand from your dashboard."}
                  </p>
                </div>
              )}
            </div>
            {results.length > shown && (
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className="w-full h-11 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-600">
                {ar ? "عرض المزيد" : "Show more"}
              </button>
            )}
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
              {(
                [
                  { key: "brands", label: ar ? "البراندات" : "Brands", icon: Tag },
                  { key: "sections", label: ar ? "الأقسام" : "Sections", icon: Layers },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMode(t.key)}
                  className={`h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 ${mode === t.key ? "bg-white shadow-sm text-[#0E6E66]" : "text-slate-500"}`}
                >
                  <t.icon className="size-4" />
                  {t.label}
                </button>
              ))}
            </div>
            {mode === "brands" ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-soft divide-y divide-slate-50 overflow-hidden">
                <Row label={ar ? "منتجات بدون براند" : "Products with no brand"} count={noBrandCount} onClick={() => open({ brand: "" })} />
                {brands.map((b) => (
                  <Row key={b.name} label={b.name} count={b.count} onClick={() => open({ brand: b.name })} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {BRANCHES.map((b) => {
                  const inBranch = items.filter((i) => i.branch === b.slug);
                  if (inBranch.length === 0) return null;
                  return (
                    <details key={b.slug} className="bg-white rounded-2xl border border-slate-100 shadow-soft overflow-hidden">
                      <summary className="px-4 py-3 flex items-center justify-between cursor-pointer">
                        <span className="text-sm font-bold text-slate-800">{ar ? b.ar : b.en}</span>
                        <span className="text-xs text-slate-400">{inBranch.length}</span>
                      </summary>
                      <div className="divide-y divide-slate-50 border-t border-slate-50">
                        {subcategoriesOf(b.slug).map((s) => {
                          const count = inBranch.filter((i) => i.sub === s.en).length;
                          if (count === 0) return null;
                          return <Row key={s.en} label={ar ? s.ar : s.en} count={count} onClick={() => open({ branch: b.slug, sub: s.en })} />;
                        })}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {selected.size > 0 && (
        <div className="fixed bottom-16 lg:bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 p-3">
          <div className="max-w-3xl mx-auto">
            <button
              type="button"
              onClick={startDrafts}
              className="w-full h-12 rounded-2xl text-white font-bold text-sm"
              style={{ backgroundColor: TEAL }}
            >
              {ar ? `متابعة (${selected.size} منتج)` : `Continue (${selected.size} products)`}
            </button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function Row({ label, count, onClick }: { label: string; count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full px-4 py-3 flex items-center gap-2 text-start hover:bg-slate-50">
      <span className="flex-1 min-w-0 truncate text-sm font-semibold text-slate-700">{label}</span>
      <span className="text-xs text-slate-400">{count}</span>
      <ChevronLeft className="size-4 text-slate-300 ltr:rotate-180" />
    </button>
  );
}

function DraftCard({
  d,
  ar,
  onChange,
  onRemove,
}: {
  d: ListingDraft;
  ar: boolean;
  onChange: (patch: Partial<ListingDraft>) => void;
  onRemove: () => void;
}) {
  const [more, setMore] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-3.5 space-y-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800" dir="ltr">{d.item.en}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{d.brand || (ar ? "بدون براند" : "No brand")}</p>
        </div>
        <button type="button" aria-label={ar ? "إزالة" : "Remove"} onClick={onRemove} className="size-8 shrink-0 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] font-bold text-slate-600">{ar ? `السعر (${d.currency === "IQD" ? "دينار" : "دولار"})` : `Price (${d.currency})`}</span>
          <input type="number" min="0" dir="ltr" value={d.price} onChange={(e) => onChange({ price: e.target.value })} className={`${field} mt-1`} />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold text-slate-600">{ar ? "الكمية (اختياري)" : "Stock (optional)"}</span>
          <input type="number" min="0" dir="ltr" value={d.stock} onChange={(e) => onChange({ stock: e.target.value })} className={`${field} mt-1`} />
        </label>
      </div>
      <button type="button" onClick={() => setMore((m) => !m)} className="text-xs font-bold text-[#0E6E66]">
        {more ? (ar ? "إخفاء التفاصيل" : "Hide details") : ar ? "بلد المنشأ والصلاحية والقسم" : "Origin, expiry and section"}
      </button>
      {more && (
        <div className="grid grid-cols-2 gap-2">
          {!d.item.brand && (
            <label className="block col-span-2">
              <span className="text-[11px] font-bold text-slate-600">{ar ? "البراند أو الشركة (اختياري)" : "Brand or maker (optional)"}</span>
              <input value={d.brand} onChange={(e) => onChange({ brand: e.target.value })} className={`${field} mt-1`} />
            </label>
          )}
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">{ar ? "بلد المنشأ" : "Origin"}</span>
            <select value={d.countryAr} onChange={(e) => onChange({ countryAr: e.target.value })} className={`${field} mt-1`}>
              <option value="">{ar ? "غير محدد" : "Not set"}</option>
              {ALL_COUNTRIES.map((c) => (
                <option key={c.code} value={c.ar}>{ar ? c.ar : c.en}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">{ar ? "تاريخ الصلاحية" : "Expiry"}</span>
            <input type="month" dir="ltr" value={d.expiryDate} onChange={(e) => onChange({ expiryDate: e.target.value })} className={`${field} mt-1`} />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">{ar ? "سعر الشراء (خاص بك)" : "Your cost"}</span>
            <input type="number" min="0" dir="ltr" value={d.purchasePrice} onChange={(e) => onChange({ purchasePrice: e.target.value })} className={`${field} mt-1`} />
          </label>
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">{ar ? "القسم" : "Section"}</span>
            <select
              value={d.branch}
              onChange={(e) => onChange({ branch: e.target.value, sub: subcategoriesOf(e.target.value)[0]?.en ?? "" })}
              className={`${field} mt-1`}
            >
              {BRANCHES.map((b) => (
                <option key={b.slug} value={b.slug}>{ar ? b.ar : b.en}</option>
              ))}
            </select>
          </label>
          <label className="block col-span-2">
            <span className="text-[11px] font-bold text-slate-600">{ar ? "القسم الفرعي" : "Sub-section"}</span>
            <select value={d.sub} onChange={(e) => onChange({ sub: e.target.value })} className={`${field} mt-1`}>
              {subcategoriesOf(d.branch).map((s) => (
                <option key={s.en} value={s.en}>{ar ? s.ar : s.en}</option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}
