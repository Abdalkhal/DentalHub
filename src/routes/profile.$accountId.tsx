import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useProducts, useSignedImageUrls } from "@/lib/products";
import { useOffers } from "@/lib/offers";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import {
  MapPin,
  Phone,
  Package,
  Megaphone,
  Eye,
  Sparkles,
  Activity,
  Stethoscope,
  Scissors,
  AlignCenter,
  Baby,
  HeartPulse,
  ShoppingCart,
  Layers,
  Wrench,
  Cog,
  Shield,
  Smile,
  Shirt,
  BookOpen,
  Settings,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import imgGeneral from "@/assets/branch-general.png";
import imgOperative from "@/assets/branch-operative.png";
import imgEndodontic from "@/assets/branch-endodontic.png";
import imgProsthodontic from "@/assets/branch-prosthodontic.png";
import imgSurgery from "@/assets/branch-surgery.png";
import imgOrthopedic from "@/assets/branch-orthopedic.png";
import imgPedodontic from "@/assets/branch-pedodontic.png";
import imgPeriodontic from "@/assets/branch-periodontic.png";

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

const branchOptions = [
  { value: "general", ar: "مواد عامة", en: "General" },
  { value: "operative", ar: "معالجة الأسنان", en: "Operative" },
  { value: "endodontic", ar: "علاج الجذور", en: "Endodontics" },
  { value: "prosthodontic", ar: "التركيبات", en: "Prosthodontics" },
  { value: "surgery", ar: "جراحة الفم", en: "Surgery" },
  { value: "orthopedic", ar: "تقويم الأسنان", en: "Orthodontics" },
  { value: "pedodontic", ar: "أسنان الأطفال", en: "Pedodontics" },
  { value: "periodontic", ar: "علاج اللثة", en: "Periodontics" },
  { value: "equipment", ar: "معدات", en: "Equipment" },
  { value: "burs", ar: "مبردات الأسنان", en: "Dental Burs" },
  { value: "sterilization", ar: "مواد التعقيم", en: "Sterilization" },
  { value: "oral-care", ar: "العناية بالفم", en: "Oral Care" },
  { value: "apparel", ar: "ملابس وأزياء", en: "Apparel" },
  { value: "training", ar: "التعلم والتدريب", en: "Training" },
  { value: "maintenance", ar: "مواد الصيانة", en: "Maintenance" },
  { value: "lab-materials", ar: "مواد المختبر", en: "Lab Materials" },
];

export const Route = createFileRoute("/profile/$accountId")({
  component: ProfilePage,
});

const ROLE_LABELS: Record<string, { ar: string; en: string }> = {
  dentist: { ar: "طبيب أسنان", en: "Dentist" },
  supply: { ar: "مكتب مستلزمات", en: "Supplies Office" },
  implant: { ar: "شركة زرعات", en: "Implant Company" },
};

const CATEGORY_COLORS: Record<string, string> = {
  implant: "text-violet-600 bg-violet-50",
  supply: "text-emerald-600 bg-emerald-50",
  dentist: "text-amber-600 bg-amber-50",
};

const ACCOUNT_TYPE_LETTER: Record<string, string> = {
  implant: "ز",
  supply: "م",
  dentist: "ط",
};

function ProfilePage() {
  const { accountId } = Route.useParams();
  const { lang } = useI18n();
  const ar = lang === "ar";

  const { data: account, isLoading } = useQuery({
    queryKey: ["profile-account", accountId],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "user_roles", accountId));
      if (!snap.exists()) return null;
      return snap.data() as UserRoleDoc;
    },
  });

  const { data: offers = [] } = useOffers(accountId);

  const { data: allProducts = [] } = useProducts();
  const products = useMemo(
    () => allProducts.filter((p) => p.companyId === accountId),
    [allProducts, accountId],
  );

  const isSupply = account?.accountType === "supply";

  const [branchFilter, setBranchFilter] = useState<string>("all");

  const activeBranchName = branchFilter !== "all"
    ? branchOptions.find((b) => b.value === branchFilter)
    : null;

  const filteredProducts = useMemo(() => {
    if (!isSupply) return products;
    if (branchFilter === "all") return [];
    return products.filter((p) => p.branch === branchFilter);
  }, [products, branchFilter, isSupply]);

  const filterImagePaths = useMemo(
    () => filteredProducts.flatMap((p) => p.images),
    [filteredProducts],
  );
  const { data: filterUrls = {} } = useSignedImageUrls(filterImagePaths);

  const fmtPrice = (p: typeof allProducts[0]) => {
    const isIQD = p.currency === "IQD";
    return isIQD
      ? `${p.price.toLocaleString()} د.ع`
      : `$${p.price.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <MobileShell>
        <TopBar title={ar ? "جاري التحميل..." : "Loading..."} showBack />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileShell>
    );
  }

  if (!account) {
    return (
      <MobileShell>
        <TopBar title={ar ? "غير موجود" : "Not found"} showBack />
        <div className="p-6 text-center text-sm text-muted-foreground">
          {ar ? "الحساب غير موجود" : "Account not found"}
        </div>
      </MobileShell>
    );
  }

  const displayName = account.name || account.surname || "";
  const displayRole = ROLE_LABELS[account.accountType]?.[lang] ?? account.accountType;
  const categoryColor = CATEGORY_COLORS[account.accountType] ?? "text-slate-600 bg-slate-50";
  const typeLetter =
    ACCOUNT_TYPE_LETTER[account.accountType] ??
    (displayName ? displayName.charAt(0).toUpperCase() : "?");

  const formatPhone = (raw?: string | null): string => {
    if (!raw) return "";
    const d = raw.replace(/\D/g, "");
    if (d.startsWith("964") && d.length >= 10) {
      const local = d.slice(3);
      return `+964 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
    return `+${d}`;
  };

  const getWhatsAppLink = (raw?: string | null): string => {
    if (!raw) return "";
    return `https://wa.me/${raw.replace(/\D/g, "")}`;
  };

  const getMapsUrl = (): string => {
    if (account.mapUrl) return account.mapUrl;
    if (account.latitude != null && account.longitude != null)
      return `https://www.google.com/maps?q=${account.latitude},${account.longitude}`;
    if (account.address)
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(account.address)}`;
    return "";
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "الملف الشخصي" : "Profile"} showBack />
      <div className="px-4 pt-4 space-y-4 pb-6">
        {/* ── Profile Header ─────────────────────── */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/30 border border-blue-100 rounded-3xl p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <span
              className={`size-16 rounded-2xl flex items-center justify-center shrink-0 font-display font-extrabold text-2xl shadow-sm ${categoryColor}`}
            >
              {account.photoURL ? (
                <img src={account.photoURL} alt="" className="size-full object-cover rounded-2xl" />
              ) : (
                typeLetter
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold text-xl text-slate-800">{displayName}</p>
              <span
                className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full mt-1.5 ${categoryColor}`}
              >
                {displayRole}
              </span>
              {account.phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2.5">
                  <Phone className="size-3.5 shrink-0" />
                  {formatPhone(account.phone)}
                </p>
              )}
              {account.address && (
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <MapPin className="size-3.5 shrink-0" />
                  {account.address}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Contact buttons ────────────────────── */}
        {(account.phone || getMapsUrl()) && (
          <div className="flex gap-2.5">
            {account.phone && (
              <a
                href={getWhatsAppLink(account.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-12 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition shadow-sm"
              >
                <Phone className="size-4" />
                {ar ? "واتساب" : "WhatsApp"}
              </a>
            )}
            {getMapsUrl() && (
              <a
                href={getMapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 h-12 rounded-2xl bg-amber-50 text-amber-700 text-sm font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition shadow-sm"
              >
                <MapPin className="size-4" />
                {ar ? "الموقع" : "Location"}
              </a>
            )}
          </div>
        )}

        {/* ── Offers ────────────────────────────── */}
        {offers.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-base flex items-center gap-1.5 mb-3">
              <Megaphone className="size-4 text-primary" />
              {ar ? "العروض والإعلانات" : "Offers & Ads"}
            </h2>
            <div className="flex gap-2.5 overflow-x-auto -mx-4 px-4 pb-1 snap-x snap-mandatory">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="snap-start shrink-0 w-[78%] rounded-2xl p-3.5 text-white shadow-card space-y-2"
                  style={{
                    backgroundImage: "linear-gradient(135deg,#1d4ed8,#0ea5e9)",
                  }}
                >
                  {offer.imageUrl && (
                    <img
                      src={offer.imageUrl}
                      alt=""
                      className="w-full h-32 object-cover rounded-xl"
                      loading="lazy"
                    />
                  )}
                  <p className="text-[10px] opacity-90 leading-relaxed line-clamp-2">
                    {offer.description}
                  </p>
                  <p className="font-display font-extrabold text-base leading-tight line-clamp-2">
                    {offer.title}
                  </p>
                  {offer.price != null && (
                    <div className="inline-flex items-center bg-white text-slate-900 font-bold text-xs px-2 py-0.5 rounded-md">
                      {offer.currency === "IQD"
                        ? `${offer.price.toLocaleString()} IQD`
                        : `$${offer.price}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Supply: Branch Categories + Products ─ */}
        {isSupply && (
          <>
            {activeBranchName ? (
              <>
                {/* Active filter header */}
                <button
                  onClick={() => setBranchFilter("all")}
                  className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition"
                >
                  <Package className="size-4" />
                  {ar ? "كل الفئات" : "All Categories"}
                </button>
                <div className="flex items-center gap-3 bg-primary/5 border border-primary/15 rounded-2xl p-3">
                  <span className="size-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    {(() => {
                      const Badge = BRANCH_BADGE[activeBranchName.value] ?? Package;
                      return <Badge className="size-5" />;
                    })()}
                  </span>
                  <div>
                    <p className="font-display font-bold text-sm">
                      {ar ? activeBranchName.ar : activeBranchName.en}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {filteredProducts.length} {ar ? "منتج" : "products"}
                    </p>
                  </div>
                </div>

                {/* Products grid */}
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {filteredProducts.map((p) => {
                      const imgSrc = p.images.length > 0 ? filterUrls[p.images[0]] : null;
                      return (
                      <ProductCard key={p.id} product={p} imgSrc={imgSrc} ar={ar} />
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <Package className="size-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p>
                      {ar
                        ? `لا توجد منتجات في ${activeBranchName.ar}`
                        : `No products in ${activeBranchName.en}`}
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Branch categories grid */
              <div>
                <h2 className="font-display font-bold text-base flex items-center gap-1.5 mb-3">
                  <Package className="size-4 text-primary" />
                  {ar ? "فروع طب الأسنان" : "Dental Specialties"}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {branchOptions.map((b) => {
                    const Badge = BRANCH_BADGE[b.value] ?? Package;
                    const image = BRANCH_IMAGES[b.value];
                    const count = products.filter((p) => p.branch === b.value).length;
                    return (
                      <button
                        key={b.value}
                        onClick={() => setBranchFilter(b.value)}
                        className="text-start bg-card border border-border rounded-2xl p-3 shadow-soft hover:shadow-card transition active:scale-[0.98] relative overflow-hidden"
                      >
                        <span className="absolute top-2.5 end-2.5 size-7 rounded-full bg-primary-soft text-primary flex items-center justify-center">
                          <Badge className="size-3.5" />
                        </span>
                        <div className="h-20 flex items-center justify-center mb-1">
                          {image ? (
                            <img
                              src={image}
                              alt=""
                              loading="lazy"
                              className="h-20 w-auto object-contain"
                            />
                          ) : (
                            <Badge className="size-8 text-primary" />
                          )}
                        </div>
                        <p className="font-display font-bold text-xs leading-tight">
                          {ar ? b.ar : b.en}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {count} {ar ? "صنف" : "items"}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Non-supply: Simple products ────────── */}
        {!isSupply && products.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-base flex items-center gap-1.5 mb-3">
              <Package className="size-4 text-primary" />
              {ar ? "المنتجات" : "Products"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {products.slice(0, 6).map((p) => (
                <div key={p.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className="h-36 w-full bg-gray-50 flex items-center justify-center p-3">
                    {p.images.length > 0 ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="size-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <Package className="size-10 text-slate-300" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-display font-bold text-sm truncate text-slate-800">{ar ? p.ar : p.en}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{p.brand}</p>
                    <p className="text-blue-600 font-bold mt-2">{fmtPrice(p)}</p>
                  </div>
                </div>
              ))}
            </div>
            {products.length > 6 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                {ar
                  ? `و ${products.length - 6} منتجات أخرى`
                  : `And ${products.length - 6} more products`}
              </p>
            )}
          </div>
        )}

        {/* ── Empty state ───────────────────────── */}
        {offers.length === 0 && products.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Eye className="size-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>{ar ? "لا توجد عروض أو منتجات بعد" : "No offers or products yet"}</p>
          </div>
        )}
      </div>
    </MobileShell>
  );
}

function ProductCard({
  product,
  imgSrc,
  ar,
}: {
  product: { ar: string; en: string; brand: string; price: number; currency: string };
  imgSrc: string | null;
  ar: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="h-28 w-full bg-gray-50 flex items-center justify-center p-2 relative">
        {imgSrc && !imgError ? (
          <img
            src={imgSrc}
            alt=""
            className="size-full object-contain"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <Package className="size-7 text-slate-300" />
        )}
      </div>
      <div className="p-2">
        <p className="font-display font-bold text-[11px] leading-tight line-clamp-2 text-slate-800">
          {ar ? product.ar || product.en : product.en || product.ar}
        </p>
        {product.brand ? (
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{product.brand}</p>
        ) : null}
        <div className="flex items-center justify-between mt-1.5">
          <p className="font-display font-extrabold text-xs text-blue-600">
            {product.currency === "IQD"
              ? `${product.price.toLocaleString()} د.ع`
              : `$${product.price.toFixed(2)}`}
          </p>
          <button className="h-6 px-2 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center gap-0.5 hover:bg-primary/20 transition">
            <ShoppingCart className="size-2.5" />
            {ar ? "طلب" : "Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
