import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useProducts, useSignedImageUrls, type Product } from "@/lib/products";
import { ProductDetailsModal } from "@/components/ProductDetailsModal";
import { SPECIALIZED_CATEGORIES, SPECIALIZED_FIELDS } from "@/data/specializedImplants";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { Package, Loader2, UserCircle2 } from "lucide-react";

export const Route = createFileRoute("/specialized-implants/$category")({
  component: SpecializedCategoryPage,
});

function fmtPrice(p: Product): string {
  const isIQD = p.currency === "IQD";
  return isIQD ? `${p.price.toLocaleString()} د.ع` : `$${p.price.toFixed(2)}`;
}

function SpecializedCategoryPage() {
  const { category } = Route.useParams();
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: allProducts = [], isLoading } = useProducts();
  const [selected, setSelected] = useState<Product | null>(null);

  const categoryMeta = SPECIALIZED_CATEGORIES.find((c) => c.id === category);

  const items = useMemo(
    () =>
      allProducts.filter(
        (p) => p.category === "specialized_implant" && p.specializedImplant?.category === category,
      ),
    [allProducts, category],
  );

  const allImagePaths = useMemo(() => items.flatMap((p) => p.images), [items]);
  const { data: imageUrlMap = {} } = useSignedImageUrls(allImagePaths);

  const supplierIds = useMemo(
    () => Array.from(new Set(items.map((p) => p.companyId).filter(Boolean))) as string[],
    [items],
  );

  const { data: supplierMap = {} } = useQuery({
    queryKey: ["specialized-supplier-docs", supplierIds],
    enabled: supplierIds.length > 0,
    queryFn: async (): Promise<Record<string, UserRoleDoc>> => {
      const entries = await Promise.all(
        supplierIds.map(async (id) => {
          const snap = await getDoc(doc(db, "user_roles", id));
          return [id, snap.exists() ? (snap.data() as UserRoleDoc) : null] as const;
        }),
      );
      return Object.fromEntries(entries.filter(([, d]) => d !== null)) as Record<
        string,
        UserRoleDoc
      >;
    },
  });

  const specChips = (p: Product): { label: string; value: string }[] => {
    const out: { label: string; value: string }[] = [];
    const fields = p.specializedImplant?.fields ?? {};
    const fieldDefs = SPECIALIZED_FIELDS[p.specializedImplant?.category ?? ""] ?? [];
    Object.entries(fields).forEach(([id, v]) => {
      const def = fieldDefs.find((f) => f.id === id);
      const label = def ? (ar ? def.ar : def.en) : id;
      if (Array.isArray(v)) {
        if (v.length > 0) out.push({ label, value: v.join(" · ") });
      } else if (typeof v === "string" && v) {
        const opt = def?.options?.find((o) => o.value === v);
        out.push({ label, value: opt ? (ar ? (opt.ar ?? opt.value) : opt.value) : v });
      }
    });
    return out;
  };

  return (
    <MobileShell>
      <TopBar
        title={
          categoryMeta
            ? ar
              ? categoryMeta.ar
              : categoryMeta.en
            : ar
              ? "الزرعات المتخصصة"
              : "Specialized Implants"
        }
        showBack
      />
      <div className="px-4 pt-4 pb-6">
        <p className="text-xs text-muted-foreground mb-3">
          {items.length} {ar ? "زرعة متخصصة" : "specialized implants"}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 text-primary animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
            <Package className="size-14 mb-4 opacity-20" />
            <p className="font-display font-bold text-lg text-slate-400">
              {ar
                ? "لا توجد زرعات متخصصة في هذه الفئة بعد"
                : "No specialized implants in this category yet"}
            </p>
            <p className="text-sm mt-1 max-w-xs text-slate-400">
              {ar
                ? "ستظهر هنا الزرعات المتخصصة المضافة من الموردين"
                : "Specialized implants added by suppliers will appear here"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.map((p) => {
              const chips = specChips(p);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer flex flex-col"
                >
                  <div className="h-32 bg-slate-100 overflow-hidden">
                    {p.images.length > 0 && imageUrlMap[p.images[0]] ? (
                      <img
                        src={imageUrlMap[p.images[0]]}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <Package className="size-8 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <p className="font-display font-bold text-sm leading-snug text-slate-800 line-clamp-2">
                      {ar ? p.ar || p.en : p.en || p.ar}
                    </p>
                    {p.companyId && supplierMap[p.companyId] && (
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 min-w-0">
                        <UserCircle2 className="size-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          {ar ? "بواسطة" : "By"}:{" "}
                          <span className="font-semibold text-slate-600">
                            {supplierMap[p.companyId].name}
                          </span>
                        </span>
                      </p>
                    )}
                    {p.brand && (
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{p.brand}</p>
                    )}
                    <p className="mt-1 font-display font-extrabold text-sm text-primary">
                      {fmtPrice(p)}
                    </p>
                    {chips.length > 0 && (
                      <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">
                        {chips.map((c) => `${c.label}: ${c.value}`).join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && <ProductDetailsModal product={selected} onClose={() => setSelected(null)} />}
    </MobileShell>
  );
}
