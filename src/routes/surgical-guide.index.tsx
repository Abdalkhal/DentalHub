import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import {
  useSurgicalGuideCompanies,
  SURGICAL_GUIDE_SYSTEMS,
  SURGICAL_GUIDE_MATERIALS,
  type SurgicalGuideCompany,
} from "@/lib/surgicalGuides";
import { useSignedImageUrls } from "@/lib/products";
import { Plus, MapPin, Phone, X, Package, Loader2, Layers } from "lucide-react";

export const Route = createFileRoute("/surgical-guide/")({
  component: SurgicalGuideDirectory,
});

function softwareLabel(s: string): string {
  return s || "—";
}

function systemLabel(en: string, ar: boolean): string {
  const m = SURGICAL_GUIDE_SYSTEMS.find((x) => x.en === en);
  return ar && m ? m.ar : en;
}

function materialLabel(en: string, ar: boolean): string {
  const m = SURGICAL_GUIDE_MATERIALS.find((x) => x.en === en);
  return ar && m ? m.ar : en;
}

function SurgicalGuideDirectory() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: companies = [], isLoading } = useSurgicalGuideCompanies();
  const [selected, setSelected] = useState<SurgicalGuideCompany | null>(null);

  const logoPaths = useMemo(
    () => companies.map((c) => c.logoUrl).filter((x): x is string => !!x),
    [companies],
  );
  const { data: logoUrlMap = {} } = useSignedImageUrls(logoPaths);

  const selectedGalleryPaths = useMemo(
    () => (selected?.gallery ?? []).map((g) => g.url).filter(Boolean),
    [selected],
  );
  const { data: galleryUrlMap = {} } = useSignedImageUrls(selectedGalleryPaths);

  return (
    <MobileShell>
      <TopBar title={ar ? "الدليل الجراحي" : "Surgical Guide"} showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <Link
          to="/surgical-guide/create"
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-display font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-card"
        >
          <Plus className="size-5" />
          {ar ? "إضافة شركة دليل جراحي" : "Add Surgical Guide Company"}
        </Link>

        <p className="text-xs text-muted-foreground">
          {companies.length} {ar ? "شركة" : "companies"}
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-6 text-primary animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
            <Layers className="size-14 mb-4 opacity-20" />
            <p className="font-display font-bold text-lg text-slate-400">
              {ar ? "لا توجد شركات دليل جراحي بعد" : "No surgical guide companies yet"}
            </p>
            <p className="text-sm mt-1 max-w-xs text-slate-400">
              {ar
                ? "اضغط على 'إضافة شركة دليل جراحي' لتسجيل أول شركة"
                : "Tap 'Add Surgical Guide Company' to register the first one"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {companies.map((c) => {
              const logo = c.logoUrl ? logoUrlMap[c.logoUrl] : undefined;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
                >
                  <div className="h-24 bg-slate-50 flex items-center justify-center p-3">
                    {logo ? (
                      <img src={logo} alt={c.nameAr} className="h-full object-contain" />
                    ) : (
                      <Package className="size-10 text-slate-300" />
                    )}
                  </div>
                  <div className="p-3 space-y-2">
                    <div>
                      <p className="font-display font-bold text-sm text-slate-800 truncate">
                        {ar ? c.nameAr || c.nameEn : c.nameEn || c.nameAr}
                      </p>
                      {c.nameEn && c.nameAr && (
                        <p className="text-[11px] text-slate-400 truncate" dir="ltr">
                          {ar ? c.nameEn : c.nameAr}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500">
                      {c.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" /> {c.city}
                        </span>
                      )}
                      {c.software && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold">
                          {softwareLabel(c.software)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[70]">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          />
          <div className="absolute inset-x-0 bottom-0 top-6 mx-auto w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom bg-white">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b border-slate-100">
              <h3 className="font-display font-extrabold text-base text-slate-900">
                {ar ? "شركة الدليل الجراحي" : "Surgical Guide Company"}
              </h3>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="size-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="size-20 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {selected.logoUrl && logoUrlMap[selected.logoUrl] ? (
                    <img
                      src={logoUrlMap[selected.logoUrl]}
                      alt=""
                      className="size-full object-contain"
                    />
                  ) : (
                    <Package className="size-8 text-slate-300" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold text-lg text-slate-900 truncate">
                    {ar ? selected.nameAr || selected.nameEn : selected.nameEn || selected.nameAr}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate" dir="ltr">
                    {selected.nameEn && selected.nameAr
                      ? ar
                        ? selected.nameEn
                        : selected.nameAr
                      : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {selected.city && (
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="size-3" /> {selected.city}
                      </span>
                    )}
                    {selected.software && (
                      <span className="text-[10px] font-bold bg-sky-50 text-sky-700 rounded-full px-2 py-0.5">
                        {softwareLabel(selected.software)}
                      </span>
                    )}
                  </div>
                  {selected.phone && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1" dir="ltr">
                      <Phone className="size-3" /> {selected.phone}
                    </p>
                  )}
                </div>
              </div>

              {selected.description && (
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-[11px] font-bold text-slate-400 mb-1">
                    {ar ? "نبذة عن الشركة" : "About"}
                  </p>
                  <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {selected.description}
                  </p>
                </div>
              )}

              {selected.systems.length > 0 && (
                <div>
                  <p className="text-sm font-bold text-slate-800 mb-2">
                    {ar ? "الأنظمة الجراحية المدعومة" : "Supported Systems"}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.systems.map((s) => (
                      <span
                        key={s}
                        className="text-[11px] font-bold bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-1"
                      >
                        {systemLabel(s, ar)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selected.printingMaterial && (
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">
                    {ar ? "مادة الطباعة" : "Printing Material"}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">
                    {materialLabel(selected.printingMaterial, ar)}
                  </span>
                </div>
              )}

              {(selected.gallery ?? []).length > 0 && (
                <div>
                  <p className="text-sm font-bold text-slate-800 mb-2">
                    {ar ? "معرض الحالات السريرية" : "Clinical Work Gallery"}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(selected.gallery ?? []).map((g, i) => {
                      const url = g.url ? galleryUrlMap[g.url] : undefined;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="relative aspect-square rounded-xl bg-slate-100 overflow-hidden">
                            {url ? (
                              <img src={url} alt="" className="size-full object-cover" />
                            ) : (
                              <div className="size-full flex items-center justify-center">
                                <Loader2 className="size-5 animate-spin text-slate-300" />
                              </div>
                            )}
                          </div>
                          {g.caption && (
                            <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">
                              {g.caption}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
