import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useAdminStore } from "@/lib/adminStore";
import { useI18n } from "@/lib/i18n";
import { useProducts, useSignedImageUrls } from "@/lib/products";
import { resolveProductImage } from "@/lib/productImage";
import {
  SearchX,
  Megaphone,
  Package,
  Sparkles,
  Activity,
  Stethoscope,
  Scissors,
  AlignCenter,
  Baby,
  HeartPulse,
  EyeOff,
} from "lucide-react";
import imgGeneral from "@/assets/branch-general.png";
import imgOperative from "@/assets/branch-operative.png";
import imgEndodontic from "@/assets/branch-endodontic.png";
import imgProsthodontic from "@/assets/branch-prosthodontic.png";
import imgSurgery from "@/assets/branch-surgery.png";
import imgOrthopedic from "@/assets/branch-orthopedic.png";
import imgPedodontic from "@/assets/branch-pedodontic.png";
import imgPeriodontic from "@/assets/branch-periodontic.png";

type Promo = { id: string; title: string; subtitle: string; price: string };

function loadOfficePromos(officeId: string): Promo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`dh_promos_office_${officeId}`);
    if (raw) return JSON.parse(raw);
    const supply = localStorage.getItem("dh_store_supply");
    if (supply) return (JSON.parse(supply).promos ?? []) as Promo[];
  } catch {}
  return [];
}

const BRANCH_IMAGES: Record<string, string> = {
  general: imgGeneral,
  operative: imgOperative,
  endodontic: imgEndodontic,
  prosthodontic: imgProsthodontic,
  surgery: imgSurgery,
  orthopedic: imgOrthopedic,
  pedodontic: imgPedodontic,
  periodontic: imgPeriodontic,
};

const BRANCH_BADGE: Record<string, typeof Package> = {
  general: Package,
  operative: Sparkles,
  endodontic: Activity,
  prosthodontic: Stethoscope,
  surgery: Scissors,
  orthopedic: AlignCenter,
  pedodontic: Baby,
  periodontic: HeartPulse,
};

export const Route = createFileRoute("/supplies/$officeId/")({
  component: OfficePage,
});

function OfficePage() {
  const { officeId } = Route.useParams();
  const { offices: OFFICES, branches: BRANCHES } = useAdminStore();
  const { data: PRODUCTS = [] } = useProducts();
  const office = OFFICES.find((o) => o.id === officeId);
  const { t, lang } = useI18n();
  const isVisitor = useRouterState({
    select: (s) =>
      s.location.state != null &&
      (s.location.state as unknown as Record<string, unknown>)?.isVisitor === true,
  });
  const [q, setQ] = useState("");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [promos, setPromos] = useState<Promo[]>([]);

  useEffect(() => {
    if (!office) return;
    setPromos(loadOfficePromos(office.id));
    const onStorage = () => setPromos(loadOfficePromos(office.id));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [office]);

  const needle = q.trim().toLowerCase();
  const branches = useMemo(
    () =>
      BRANCHES.filter(
        (b) =>
          !needle || b.ar.toLowerCase().includes(needle) || b.en.toLowerCase().includes(needle),
      ),
    [needle],
  );

  const productMatches = useMemo(() => {
    const hasFilter = needle.length > 0 || branchFilter !== "all";
    if (!hasFilter) return [];
    return PRODUCTS.filter((p) => {
      if (branchFilter !== "all" && p.branch !== branchFilter) return false;
      if (!needle) return true;
      return (
        p.ar.toLowerCase().includes(needle) ||
        p.en.toLowerCase().includes(needle) ||
        p.brand.toLowerCase().includes(needle)
      );
    });
  }, [needle, branchFilter, PRODUCTS]);

  const matchPaths = useMemo(() => productMatches.flatMap((p) => p.images), [productMatches]);
  const { data: matchUrls = {} } = useSignedImageUrls(matchPaths);

  if (!office) {
    return (
      <MobileShell>
        <TopBar title={lang === "ar" ? "غير موجود" : "Not found"} showBack />
        <div className="p-6 text-center text-sm text-muted-foreground">
          {lang === "ar" ? "المكتب غير موجود" : "Office not found"}
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar
        title={lang === "ar" ? office.ar : office.en}
        showBack
        showSearch
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder={lang === "ar" ? "ابحث عن مادة أو فرع…" : "Search material or branch…"}
      />
      {isVisitor && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl px-4 py-2.5">
          <EyeOff className="size-4 shrink-0" />
          {lang === "ar"
            ? "وضع القراءة فقط — لا يمكنك تعديل أو إضافة محتوى"
            : "Read-only mode — you cannot edit or add content"}
        </div>
      )}
      <div className="px-4 pt-4">
        <p className="text-xs text-muted-foreground mb-3">
          {lang === "ar" ? office.area.ar : office.area.en}
        </p>

        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 mb-3">
          {[{ slug: "all", ar: "كل الفروع", en: "All branches" }, ...BRANCHES].map((b) => {
            const active = branchFilter === b.slug;
            return (
              <button
                key={b.slug}
                onClick={() => setBranchFilter(b.slug)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:bg-accent"
                }`}
              >
                {lang === "ar" ? b.ar : b.en}
              </button>
            );
          })}
        </div>

        {(needle || branchFilter !== "all") && (
          <div className="mb-5">
            <h2 className="font-display font-bold text-sm mb-2">
              {lang === "ar" ? "نتائج المنتجات" : "Product matches"}{" "}
              <span className="text-[11px] text-muted-foreground font-normal">
                ({productMatches.length})
              </span>
            </h2>
            {productMatches.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-center text-muted-foreground">
                <SearchX className="size-8 mb-2" />
                <p className="text-sm">
                  {lang === "ar" ? "لا توجد منتجات مطابقة" : "No matching products"}
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {productMatches.map((p) => {
                  const pImg = matchUrls[p.images[0]] ?? resolveProductImage(undefined);
                  return (
                    <li key={p.id}>
                      <Link
                        to="/supplies/$officeId/$branchSlug"
                        params={{ officeId: office.id, branchSlug: p.branch }}
                        className="flex items-center gap-3 bg-card border border-border rounded-xl p-2.5 shadow-soft"
                      >
                        <div className="size-9 rounded-lg bg-surface flex items-center justify-center text-lg shrink-0 overflow-hidden">
                          {pImg ? (
                            <img
                              src={pImg}
                              alt=""
                              className="size-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            "📦"
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-display font-bold text-xs truncate">
                            {lang === "ar" ? p.ar : p.en}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {p.brand} · ${p.price}
                          </p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {promos.length > 0 && !needle && branchFilter === "all" && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold text-base flex items-center gap-1.5">
                <Megaphone className="size-4 text-primary" />
                {lang === "ar" ? "عروض المكتب" : "Office promotions"}
              </h2>
              <span className="text-[10px] text-muted-foreground">{promos.length}</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory">
              {promos.map((p) => (
                <div
                  key={p.id}
                  className="snap-start shrink-0 w-[78%] rounded-2xl p-3.5 text-white shadow-card"
                  style={{ backgroundImage: "linear-gradient(135deg,#1d4ed8,#0ea5e9)" }}
                >
                  <p className="text-[10px] opacity-90">{p.subtitle}</p>
                  <p className="font-display font-extrabold text-base leading-tight line-clamp-2">
                    {p.title}
                  </p>
                  {p.price && (
                    <div className="mt-2 inline-flex items-center bg-white text-slate-900 font-bold text-xs px-2 py-0.5 rounded-md">
                      {p.price}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {branchFilter === "all" && !needle && (
          <>
            <h2 className="font-display font-bold text-base mb-3">{t("branches_title")}</h2>
            {branches.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-center text-muted-foreground">
                <SearchX className="size-8 mb-2" />
                <p className="text-sm">
                  {lang === "ar" ? "لا يوجد فرع مطابق" : "No matching branch"}
                </p>
              </div>
            ) : (
              <ul className="grid grid-cols-2 gap-3">
                {branches.map((b) => {
                  const Badge = BRANCH_BADGE[b.slug] ?? Package;
                  const image = BRANCH_IMAGES[b.slug];
                  const count = PRODUCTS.filter((p) => p.branch === b.slug).length;
                  return (
                    <li key={b.slug}>
                      <Link
                        to="/supplies/$officeId/$branchSlug"
                        params={{ officeId: office.id, branchSlug: b.slug }}
                        className="block bg-card border border-border rounded-2xl p-3 h-full shadow-soft hover:shadow-card transition relative overflow-hidden"
                      >
                        <span className="absolute top-2.5 end-2.5 size-8 rounded-full bg-primary-soft text-primary flex items-center justify-center">
                          <Badge className="size-4" />
                        </span>
                        <div className="h-24 flex items-center justify-center -mt-1 mb-1">
                          {image ? (
                            <img
                              src={image}
                              alt=""
                              loading="lazy"
                              width={1024}
                              height={1024}
                              className="h-24 w-auto object-contain"
                            />
                          ) : (
                            <Badge className="size-10 text-primary" />
                          )}
                        </div>
                        <p className="font-display font-bold text-sm leading-tight">
                          {lang === "ar" ? b.ar : b.en}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {count} {lang === "ar" ? "صنف" : "items"}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </MobileShell>
  );
}
