import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { COUNTRIES } from "@/data/implants";
import { useProductsByCountry, useSignedImageUrls, type Product } from "@/lib/products";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Cpu, Loader2 } from "lucide-react";

type ImplantFilter = "all" | "immediate" | "non-immediate";

const TYPE_LABEL: Record<ImplantFilter, string> = {
  all: "filter_all",
  immediate: "filter_immediate",
  "non-immediate": "filter_delayed",
};

const TYPE_TONE: Record<ImplantFilter, string> = {
  all: "",
  immediate: "bg-[oklch(0.93_0.06_30)] ring-[oklch(0.85_0.1_30)] text-[oklch(0.5_0.18_30)]",
  "non-immediate":
    "bg-[oklch(0.93_0.06_250)] ring-[oklch(0.82_0.1_250)] text-[oklch(0.45_0.18_256)]",
};

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

  const { data: products = [], isLoading } = useProductsByCountry(country.slug);

  const filtered = useMemo(() => {
    if (filter === "all") return products;
    return products.filter((p) => p.implantSpec?.implantType === filter);
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
    { key: "immediate", ar: "فورية", en: "Immediate" },
    { key: "non-immediate", ar: "غير فورية", en: "Non-immediate" },
  ];

  return (
    <MobileShell>
      <TopBar title={`${t("implants")} ${lang === "ar" ? country.ar : country.en}`} showBack />
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-5xl">{country.flag}</div>
          <div>
            <p className="text-xs text-muted-foreground">{t("brands")}</p>
            <p className="font-display font-extrabold text-xl">{filtered.length}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
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
          <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
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
          <ul className="space-y-3">
            {filtered.map((p) => {
              const spec = p.implantSpec;
              const diams = spec?.diameters ?? [];
              const lens = spec?.lengths ?? [];
              const imgUrl =
                p.images.length > 0 && imageUrlMap[p.images[0]] ? imageUrlMap[p.images[0]] : null;
              const typeLabel = spec?.implantType as ImplantFilter | undefined;

              return (
                <li key={p.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="size-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {imgUrl ? (
                        <img src={imgUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <Cpu className="size-6 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold text-sm">
                        {ar ? p.ar || p.en : p.en || p.ar}
                      </p>
                      {p.brand && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{p.brand}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {spec?.connectionType && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 ring-1 ring-border">
                            {spec.connectionType}
                          </span>
                        )}
                        {typeLabel && TYPE_TONE[typeLabel] && (
                          <span
                            className={cn(
                              "px-2.5 py-1 rounded-full ring-1 shadow-sm text-[11px] font-semibold",
                              TYPE_TONE[typeLabel],
                            )}
                          >
                            {ar
                              ? typeLabel === "immediate"
                                ? "فورية"
                                : "غير فورية"
                              : typeLabel === "immediate"
                                ? "Immediate"
                                : "Non-immediate"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {(diams.length > 0 || lens.length > 0) && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 rounded-xl p-3 text-xs">
                        {diams.length > 0 && (
                          <div>
                            <span className="font-bold text-muted-foreground">
                              {ar ? "القطر:" : "Diameter:"}
                            </span>
                            <span className="text-foreground ml-1.5">{diams.join(", ")} mm</span>
                          </div>
                        )}
                        {lens.length > 0 && (
                          <div>
                            <span className="font-bold text-muted-foreground">
                              {ar ? "الطول:" : "Length:"}
                            </span>
                            <span className="text-foreground ml-1.5">{lens.join(", ")} mm</span>
                          </div>
                        )}
                      </div>
                    </div>
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

                  {(p.accessories || []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                        {ar ? "الإكسسوارات" : "Accessories"} ({p.accessories!.length})
                      </p>
                      <div className="space-y-1.5">
                        {p.accessories!.map((acc, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5"
                          >
                            <div className="size-8 rounded-md bg-white border border-border overflow-hidden shrink-0 flex items-center justify-center">
                              {acc.imageUrl && imageUrlMap[acc.imageUrl] ? (
                                <img
                                  src={imageUrlMap[acc.imageUrl]}
                                  alt=""
                                  className="size-full object-cover"
                                />
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
                            </div>
                            {acc.price > 0 && (
                              <span className="text-[11px] font-display font-bold text-primary shrink-0">
                                ${acc.price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
