import { createFileRoute, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useAdminStore } from "@/lib/adminStore";
import { useI18n } from "@/lib/i18n";
import { useProducts, useSignedImageUrls } from "@/lib/products";
import { ProductImageCarousel } from "@/components/ProductImageCarousel";
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
  ArrowRight,
  ArrowLeft,
  Wrench,
  Cog,
  Shield,
  Smile,
  Shirt,
  BookOpen,
  Settings,
  FlaskConical,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsFavorited, toggleFavorite } from "@/lib/favoritesStore";
import { ProductAddToCart } from "@/components/ProductAddToCart";

const BRANCH_BACK_ICON: Record<string, typeof ArrowRight> = {
  rtl: ArrowRight,
  ltr: ArrowLeft,
};

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
      className="absolute top-3 right-3 z-10 size-8 rounded-xl flex items-center justify-center transition bg-white/80 backdrop-blur border border-slate-200 hover:bg-slate-50 shadow-sm"
      aria-label={liked ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart className={cn("size-4", liked ? "fill-red-500 text-red-500" : "text-gray-400")} />
    </button>
  );
}
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
  equipment: "/photo/equipment.png",
  burs: "/photo/burs.png",
  sterilization: "/photo/sterilization.png",
  "oral-care": "/photo/oral-care.png",
  apparel: "/photo/appearel.png",
  training: "/photo/training.png",
  maintenance: "/photo/maintenance.png",
  "lab-materials": "/photo/lab-materials.png",
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
  equipment: Wrench,
  burs: Cog,
  sterilization: Shield,
  "oral-care": Smile,
  apparel: Shirt,
  training: BookOpen,
  maintenance: Settings,
  "lab-materials": FlaskConical,
};

export const Route = createFileRoute("/supplies/$officeId/")({
  component: OfficePage,
});

function OfficePage() {
  const { officeId } = Route.useParams();
  const { offices: OFFICES, branches: BRANCHES } = useAdminStore();
  const { data: PRODUCTS = [] } = useProducts();
  const office = OFFICES.find((o) => o.id === officeId);
  const { t, lang, dir } = useI18n();
  const navigate = useNavigate();
  const BackIcon = BRANCH_BACK_ICON[dir] ?? ArrowRight;
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

  const activeBranch = branchFilter !== "all"
    ? BRANCHES.find((b) => b.slug === branchFilter)
    : null;

  const filteredProducts = useMemo(() => {
    let list = PRODUCTS;
    if (branchFilter !== "all") list = list.filter((p) => p.branch === branchFilter);
    if (needle) {
      list = list.filter(
        (p) =>
          p.ar.toLowerCase().includes(needle) ||
          p.en.toLowerCase().includes(needle) ||
          p.brand.toLowerCase().includes(needle),
      );
    }
    return list;
  }, [needle, branchFilter, PRODUCTS]);

  const matchPaths = useMemo(() => filteredProducts.flatMap((p) => p.images), [filteredProducts]);
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
        <p className="text-xs text-muted-foreground mb-4">
          {lang === "ar" ? office.area?.ar ?? "" : office.area?.en ?? ""}
        </p>

        {/* ── Active branch filter indicator ──────── */}
        {activeBranch && (
          <div className="mb-4">
            <button
              onClick={() => setBranchFilter("all")}
              className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition mb-3"
            >
              <BackIcon className="size-4" />
              {lang === "ar" ? "كل الفروع" : "All Branches"}
            </button>
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-2xl p-3">
              <span className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                {(() => {
                  const Badge = BRANCH_BADGE[activeBranch.slug] ?? Package;
                  return <Badge className="size-5" />;
                })()}
              </span>
              <div>
                <p className="font-display font-bold text-sm">
                  {lang === "ar" ? activeBranch.ar : activeBranch.en}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {filteredProducts.length} {lang === "ar" ? "منتج" : "products"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Branch Categories Grid ──────────────── */}
        {!activeBranch && !needle && (
          <>
            <h2 className="font-display font-bold text-base mb-3">
              {lang === "ar" ? "فروع طب الأسنان" : "Dental Specialties"}
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {BRANCHES.map((b) => {
                const Badge = BRANCH_BADGE[b.slug] ?? Package;
                const image = BRANCH_IMAGES[b.slug];
                const count = PRODUCTS.filter((p) => p.branch === b.slug).length;
                return (
                  <li key={b.slug}>
                    <button
                      onClick={() => setBranchFilter(b.slug)}
                      className="w-full block bg-card border border-border rounded-2xl p-3 h-full shadow-soft hover:shadow-card transition relative overflow-hidden text-start active:scale-[0.98]"
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
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* ── Promos ──────────────────────────────── */}
        {promos.length > 0 && !needle && !activeBranch && (
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

        {/* ── Product Results ──────────────────────── */}
        {(activeBranch || needle) && (
          <div className="mb-5">
            <h2 className="font-display font-bold text-sm mb-3">
              {lang === "ar" ? "المنتجات" : "Products"}{" "}
              <span className="text-[11px] text-muted-foreground font-normal">
                ({filteredProducts.length})
              </span>
            </h2>
            {filteredProducts.length === 0 ? (
              <div className="py-10 flex flex-col items-center text-center text-muted-foreground">
                <SearchX className="size-8 mb-2" />
                <p className="text-sm">
                  {lang === "ar" ? "لا توجد منتجات مطابقة" : "No matching products"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredProducts.map((p) => {
                  const urls = p.images.map((path) => matchUrls[path]).filter(Boolean);
                  return (
                    <div
                      key={p.id}
                      onClick={() => navigate({ to: "/products/$productId", params: { productId: p.id } })}
                      className="bg-card border border-border rounded-2xl p-3 shadow-soft flex flex-col relative cursor-pointer"
                    >
                      <FavoriteHeart
                        productId={p.id}
                        title={lang === "ar" ? p.ar : p.en}
                        vendor={p.brand || office?.ar || office?.en || ""}
                        price={p.price}
                        currency={p.currency ?? "USD"}
                        imageUrl={p.images[0] ? matchUrls[p.images[0]] : undefined}
                        lang={lang}
                      />
                      {urls.length > 0 ? (
                        <ProductImageCarousel
                          urls={urls}
                          alt={lang === "ar" ? p.ar : p.en}
                          className="w-full h-36 rounded-xl bg-surface mb-2.5"
                          imageClassName="h-36"
                          showArrows={false}
                        />
                      ) : (
                        <div className="w-full h-36 rounded-xl bg-surface flex items-center justify-center overflow-hidden mb-2.5">
                          <span className="text-2xl">📦</span>
                        </div>
                      )}
                      <p className="font-display font-bold text-sm leading-snug line-clamp-2">{lang === "ar" ? p.ar : p.en}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">{p.brand}</p>
                      <p className="mt-1.5 font-display font-extrabold text-primary">${p.price}</p>
                      <ProductAddToCart
                        productId={p.id}
                        productName={lang === "ar" ? p.ar : p.en}
                        productImage={urls[0]}
                        officeId={p.companyId || officeId}
                        officeName={lang === "ar" ? office?.ar ?? "" : office?.en ?? ""}
                        brand={p.brand}
                        unitPrice={p.price}
                        currency={p.currency ?? "USD"}
                        inStock={p.inStock ?? true}
                        lang={lang}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
