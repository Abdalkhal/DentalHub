import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { BoneGraftModal } from "@/components/BoneGraftModal";
import { BoneGraftDetailsModal } from "@/components/BoneGraftDetailsModal";
import { ImplantFormModal } from "@/components/ImplantFormModal";
import { SpecializedImplantForm } from "@/components/SpecializedImplantForm";
import { NotificationBell } from "@/components/NotificationBell";
import { COUNTRIES } from "@/data/implants";
import {
  useProducts,
  useDeleteProduct,
  uploadProductImage,
  useSignedImageUrls,
  COUNTRY_CODE_TO_SLUG,
  type Product,
  type ProductAccessory,
} from "@/lib/products";
import { useOffers, useUpsertOffer, useDeleteOffer, type Offer } from "@/lib/offers";
import { useOrders, confirmOrder, markOrderUnavailable } from "@/lib/orders";
import type { OrderDoc } from "@/integrations/firebase/types";
import { useUserRole } from "@/lib/useAuth";
import { auth } from "@/integrations/firebase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ALL_COUNTRIES, countryFlagUrl } from "@/data/countries";
import {
  Search,
  UserCircle2,
  Phone,
  MapPin,
  Package,
  Megaphone,
  ClipboardList,
  Plus,
  X,
  Upload,
  Trash2,
  Loader2,
  DollarSign,
  Pencil,
  Calendar,
  ArrowLeft,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Check,
  Ruler,
} from "lucide-react";
import specializedImplantImg from "@/assets/spetialized_implant.jpg";

export const Route = createFileRoute("/implants/")({
  component: ImplantsIndex,
});

function ImplantsIndex() {
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  if (roleLoading) {
    return (
      <MobileShell>
        <TopBar title="" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileShell>
    );
  }

  if (role?.accountType === "implant") {
    return (
      <RoleGuard allowedRoles={["implant"]}>
        <ImplantCompanyDashboard />
      </RoleGuard>
    );
  }

  if (role && role.accountType !== "dentist") {
    navigate({ to: "/login" });
    return null;
  }

  return <BrowseImplants />;
}

function getMapsUrl(role: {
  latitude?: number | null;
  longitude?: number | null;
  mapUrl?: string | null;
  address?: string | null;
}): string {
  if (role.mapUrl) return role.mapUrl;
  if (role.latitude != null && role.longitude != null) {
    return `https://www.google.com/maps?q=${role.latitude},${role.longitude}`;
  }
  const addr = role.address || "Mosul, Iraq";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}

function ImplantCompanyDashboard() {
  const { lang, toggle } = useI18n();
  const ar = lang === "ar";
  const { role } = useUserRole();
  const companyId = auth.currentUser?.uid ?? role?.userId ?? "";
  const [activeTab, setActiveTab] = useState<"products" | "offers" | "orders">("products");

  const mapsUrl = getMapsUrl(role ?? {});

  return (
    <MobileShell>
      <div className="min-h-full">
        <div className="px-4 pt-4 pb-2">
          <div
          className="rounded-3xl shadow-lg text-white"
          style={{ background: "linear-gradient(135deg, #0F172A, #1E40AF)" }}
          >
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Link
                  to="/account"
                  className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-80 transition"
                >
                  <div className="size-12 rounded-full bg-white/10 ring-2 ring-white/25 flex items-center justify-center overflow-hidden shrink-0">
                    {role?.photoURL ? (
                      <img src={role.photoURL} alt="" className="size-full object-cover" />
                    ) : (
                      <UserCircle2 className="size-7 text-white/80" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-white truncate">
                      {role?.name || (ar ? "المستخدم" : "User")}
                    </p>
                    <p className="text-[11px] text-white/70 truncate">
                      {ar ? "شركة زرعات" : "Implant Company"}
                    </p>
                    <p className="text-[11px] text-white/70 flex items-center gap-1 mt-0.5 truncate">
                      <Phone className="size-3 shrink-0" />
                      {role?.phone || (ar ? "لم يتم إضافة رقم هاتف" : "No phone number added")}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-2 shrink-0">
                  <NotificationBell userId={companyId} dark />
                  <button
                    type="button"
                    onClick={toggle}
                    className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white/90 hover:bg-white/20 text-xs font-bold transition"
                  >
                    {lang === "ar" ? "EN" : "AR"}
                  </button>
                </div>
              </div>

              {role &&
              (role.latitude != null || role.longitude != null || role.mapUrl || role.address) ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[11px] text-white/70 flex items-center gap-1 ps-[60px] pt-3 border-t border-white/15 hover:text-white transition-colors cursor-pointer z-50 pointer-events-auto"
                >
                  <MapPin className="size-3 shrink-0" />
                  {role?.address || (ar ? "عرض الموقع على الخريطة" : "View on map")}
                </a>
              ) : (
                <p className="text-[11px] text-white/70 flex items-center gap-1 ps-[60px] pt-3 border-t border-white/15">
                  <MapPin className="size-3 shrink-0" />
                  {ar ? "لم يتم تحديد العنوان بعد" : "No address set yet"}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4">
          <div className="flex bg-slate-100 rounded-2xl p-1 mt-2">
            {[
              { key: "products" as const, ar: "المنتجات", en: "Products", icon: Package },
              { key: "offers" as const, ar: "العروض", en: "Offers", icon: Megaphone },
              { key: "orders" as const, ar: "الطلبات", en: "Orders", icon: ClipboardList },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex-1 h-11 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all",
                  activeTab === tab.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <tab.icon className="size-4" />
                {ar ? tab.ar : tab.en}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pt-4 pb-6">
          {activeTab === "products" && <ImplantProductsPanel />}
          {activeTab === "offers" && <OffersPanel companyId={companyId} />}
          {activeTab === "orders" && <ImplantOrdersPanel companyId={companyId} />}
        </div>
      </div>
    </MobileShell>
  );
}

const LEGACY_TYPE_MAP: Record<string, string> = {
  Abutment: "abutment",
  "Healing Screw": "healing-cover",
  "Scan Body": "digital",
  "Digital Analog": "digital",
};

const ACCESSORY_CATEGORIES: {
  id: string;
  ar: string;
  en: string;
  subTypes: { ar: string; en: string }[];
}[] = [
  {
    id: "abutment",
    ar: "الأبوتمنت",
    en: "Abutment",
    subTypes: [
      { ar: "أبوتمنت مستقيم", en: "Straight Abutment" },
      { ar: "أبوتمنت زاوي 15°", en: "Angled Abutment 15°" },
      { ar: "أبوتمنت زاوي 17°", en: "Angled Abutment 17°" },
      { ar: "أبوتمنت زاوي 25°", en: "Angled Abutment 25°" },
      { ar: "أبوتمنت زاوي 30°", en: "Angled Abutment 30°" },
      { ar: "مالتي يونيت مستقيم", en: "Multi-Unit Straight" },
      { ar: "مالتي يونيت زاوي 17°", en: "Multi-Unit Angled 17°" },
      { ar: "مالتي يونيت زاوي 30°", en: "Multi-Unit Angled 30°" },
      { ar: "بول أبوتمنت / لوكايتر", en: "Ball Abutment & Locator Attachment" },
      { ar: "قاعدة تيتانيوم للرقمي (Ti-Base)", en: "Ti-Base Abutment for CAD/CAM" },
      { ar: "أبوتمنت مؤقت (PEEK / تيتانيوم)", en: "PEEK & Titanium Temporary Abutments" },
      { ar: "دعامة قابلة للصب (UCLA)", en: "UCLA Castable Abutment" },
      { ar: "أبوتمنت زركونيا", en: "Zirconia Abutment" },
      { ar: "أبوتمنت التئام تشريحي", en: "Anatomic Healing Abutment" },
    ],
  },
  {
    id: "healing-cover",
    ar: "براغي الالتئام والتغطية",
    en: "Healing & Cover Screws",
    subTypes: [
      { ar: "برغي التئام GH 1mm - GH 7mm", en: "Healing Abutment GH 1mm to GH 7mm" },
      { ar: "برغي التئام عريض Ø 4.5mm", en: "Wide Healing Abutment Ø 4.5mm" },
      { ar: "برغي التئام عريض Ø 6.0mm", en: "Wide Healing Abutment Ø 6.0mm" },
      { ar: "برغي تغطية جراحي قياسي", en: "Surgical Cover Screw Standard" },
      { ar: "برغي تغطية جراحي ممتد +0.5mm", en: "Surgical Cover Screw Extended +0.5mm" },
    ],
  },
  {
    id: "digital",
    ar: "أدوات المسح الرقمي والطبعات",
    en: "Digital & Impression Tools",
    subTypes: [
      { ar: "سكان بدي فموي", en: "Intraoral Scan Body" },
      { ar: "سكان بدي مخباري", en: "Desktop Lab Scan Body" },
      { ar: "سكان بدي مالتي يونيت", en: "Multi-Unit Scan Body" },
      { ar: "أنالوج رقمي للطباعة ثلاثية الأبعاد", en: "Digital Model Analog for 3D Print" },
      { ar: "كوبنغ طبعة مفتوحة", en: "Open Tray Impression Coping" },
      { ar: "كوبنغ طبعة مغلقة", en: "Closed Tray Impression Coping" },
      { ar: "أنالوج مخبري تقليدي", en: "Traditional Plaster Lab Analog" },
      { ar: "أنالوج مخبري مالتي يونيت", en: "Multi-Unit Lab Analog" },
      { ar: "مسمار مسح رقمي", en: "Scan Post" },
    ],
  },
  {
    id: "screws",
    ar: "البراغي والأجزاء الميكانيكية",
    en: "Screws & Mechanical Components",
    subTypes: [
      { ar: "برغي الأبوتمنت السريري النهائي", en: "Final Clinical Abutment Screw" },
      { ar: "برغي تجربة مخبري", en: "Laboratory Try-in Screw" },
      { ar: "برغي تعويضي مالتي يونيت", en: "Multi-Unit Prosthetic Screw" },
      { ar: "كوبنغ حرق بلاستيكي", en: "Burn-out Plastic Coping" },
      { ar: "ناقل زراعة", en: "Implant Carrier / Transfer Coping" },
    ],
  },
  {
    id: "surgical-tools",
    ar: "الأدوات الجراحية والمخبرية",
    en: "Surgical & Lab Tools",
    subTypes: [
      { ar: "مفك براغي قصير", en: "Torque Wrench Driver Short" },
      { ar: "مفك براغي طويل", en: "Torque Wrench Driver Long" },
      { ar: "موسّع مثقب", en: "Drill Extender" },
      { ar: "أداة استخراج المونتر", en: "Mounter Extractor Tool" },
      { ar: "أداة استرجاع البراغي", en: "Screw Retrieval Tool" },
    ],
  },
];

function ImplantProductsPanel() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: allProducts = [], isLoading } = useProducts();
  const remove = useDeleteProduct();

  const companyId = auth.currentUser?.uid ?? "";

  const implantProducts = allProducts.filter(
    (p) =>
      (p.category === "implant" ||
        p.category === "surgical_kit" ||
        p.category === "specialized_implant" ||
        p.branch === "bone_graft") &&
      p.companyId === companyId,
  );

  const [showBoneGraft, setShowBoneGraft] = useState(false);
  const [showImplantForm, setShowImplantForm] = useState(false);
  const [showSpecialized, setShowSpecialized] = useState(false);
  const [editingImplant, setEditingImplant] = useState<Product | null>(null);
  const [editingSpecialized, setEditingSpecialized] = useState<Product | null>(null);
  const [editingGraft, setEditingGraft] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showGraftDetails, setShowGraftDetails] = useState<Product | null>(null);

  const countryByCode = useMemo(
    () => Object.fromEntries(ALL_COUNTRIES.map((c) => [c.code, c])),
    [],
  );

  const openAdd = () => {
    setEditingImplant(null);
    setShowImplantForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingImplant(p);
    setShowImplantForm(true);
  };


  const handleDelete = async (p: Product) => {
    if (!confirm(ar ? "حذف هذه الزرعة؟" : "Delete this implant?")) return;
    await remove.mutateAsync(p.id);
  };

  const fmtPrice = (p: Product) => {
    const isIQD = p.currency === "IQD";
    const val = isIQD ? Number(p.price).toLocaleString() : p.price.toFixed(2);
    const sym = isIQD ? "د.ع" : "$";
    return isIQD ? `${val} ${sym}` : `${sym}${val}`;
  };

  const allImagePaths = useMemo(() => {
    return implantProducts.flatMap((p) => p.images);
  }, [implantProducts]);
  const { data: imageUrlMap = {} } = useSignedImageUrls(allImagePaths);


  const groupedProducts = useMemo(
    () => implantProducts.filter((p) => !p.productType || p.productType === "main_implant"),
    [implantProducts],
  );

  if (selectedProduct) {
    return (
      <ImplantDetailView
        product={selectedProduct}
        onBack={() => setSelectedProduct(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
          <button
            onClick={openAdd}
            className="h-14 rounded-2xl bg-primary text-primary-foreground font-display font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-card"
          >
            <Plus className="size-5" />
            {ar ? "إضافة زرعة جديدة" : "Add New Implant"}
          </button>
          <button
            onClick={() => setShowBoneGraft(true)}
            className="h-14 rounded-2xl bg-emerald-600 text-white font-display font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-card"
          >
            <Plus className="size-5" />
            {ar ? "إضافة بون كرافت" : "Add Bone Graft"}
          </button>
        </div>
        <button
          onClick={() => setShowSpecialized(true)}
          className="w-full h-13 min-h-12 rounded-2xl bg-indigo-600 text-white font-display font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-card"
        >
          <Plus className="size-5 shrink-0" />
          {ar ? "إضافة زرعة متخصصة" : "Add Specialized Implant"}
        </button>

      {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : implantProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
            <Package className="size-14 mb-4 opacity-20" />
            <p className="font-display font-bold text-lg text-slate-400">
              {ar ? "لا توجد زرعات بعد" : "No implants yet"}
            </p>
            <p className="text-sm mt-1 max-w-xs text-slate-400">
              {ar
                ? "اضغط على زر 'إضافة زرعة جديدة' لإضافة أول زرعة لك"
                : "Tap 'Add New Implant' to add your first implant"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {groupedProducts.map((product) => (
              <div key={product.id}>
                <div
                  onClick={() =>
                    product.branch === "bone_graft"
                      ? setShowGraftDetails(product)
                      : setSelectedProduct(product)
                  }
                  className="bg-card border border-border rounded-2xl p-3.5 shadow-soft hover:shadow-card transition relative overflow-hidden group cursor-pointer"
                >
                  {product.images.length > 0 && imageUrlMap[product.images[0]] ? (
                    <div className="w-full aspect-[4/3] rounded-xl bg-slate-100 overflow-hidden mb-2.5">
                      <img
                        src={imageUrlMap[product.images[0]]}
                        alt=""
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-[4/3] rounded-xl bg-slate-100 flex items-center justify-center mb-2.5">
                      <Package className="size-8 text-slate-300" />
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {(() => {
                      const countryCode = product.country || product.implantSpec?.country;
                      const c = countryCode ? countryByCode[countryCode] : null;
                      return c ? (
                        <span className="text-xs font-semibold bg-gradient-to-r from-slate-100 to-slate-200/60 text-slate-700 border border-slate-200/60 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm">
                          <img
                            src={countryFlagUrl(c.code)}
                            alt=""
                            className="size-4 rounded-sm object-cover ring-1 ring-black/5"
                          />
                          {ar ? c.ar : c.en}
                        </span>
                      ) : null;
                    })()}
                    {product.implantSpec?.implantType && (
                      <span
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                          product.implantSpec.implantType === "immediate"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700",
                        )}
                      >
                        {product.implantSpec.implantType === "immediate"
                          ? ar
                            ? "فورية"
                            : "Immediate"
                          : ar
                            ? "غير فورية"
                            : "Non-Immediate"}
                      </span>
                    )}
                    {(product.accessories?.length ?? 0) > 0 &&
                      product.branch !== "bone_graft" &&
                      product.branch !== "specialized_implant" && (
                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md">
                          {product.accessories!.length} {ar ? "قطعة تكميلية" : "accessory"}
                        </span>
                      )}
                  </div>

                  <p className="font-display font-bold text-sm leading-snug line-clamp-2">
                    {product.ar || product.en}
                  </p>

                  {product.brand && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {product.brand}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-1.5">
                    <p className="font-display font-extrabold text-lg text-primary">
                      {fmtPrice(product)}
                    </p>
                    {product.stock > 0 && (
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        {ar ? "متوفر" : "In Stock"}: {product.stock}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-1 mt-2.5 pt-2.5 border-t border-border">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (product.branch === "specialized_implant") {
                          setEditingSpecialized(product);
                        } else if (product.branch === "bone_graft") {
                          setEditingGraft(product);
                        } else {
                          openEdit(product);
                        }
                      }}
                      className="flex-1 h-8 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-sky-100 hover:text-sky-600 flex items-center justify-center gap-1 transition"
                    >
                      <Pencil className="size-3" />
                      {ar ? "تعديل" : "Edit"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product);
                      }}
                      className="w-8 h-8 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      {showBoneGraft && <BoneGraftModal onClose={() => setShowBoneGraft(false)} />}
      {showImplantForm && <ImplantFormModal onClose={() => setShowImplantForm(false)} />}
      {showSpecialized && <SpecializedImplantForm onClose={() => setShowSpecialized(false)} />}
      {editingImplant && (
        <ImplantFormModal product={editingImplant} onClose={() => setEditingImplant(null)} />
      )}
      {editingGraft && (
        <BoneGraftModal product={editingGraft} onClose={() => setEditingGraft(null)} />
      )}
      {editingSpecialized && (
        <SpecializedImplantForm product={editingSpecialized} onClose={() => setEditingSpecialized(null)} />
      )}
      {showGraftDetails && (
        <BoneGraftDetailsModal
          product={showGraftDetails}
          onClose={() => setShowGraftDetails(null)}
        />
      )}
    </div>
  );
}

function ImplantDetailView({
  product,
  onBack,
}: {
  product: Product;
  onBack: () => void;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const countryByCode = useMemo(
    () => Object.fromEntries(ALL_COUNTRIES.map((c) => [c.code, c])),
    [],
  );

  const [activeImage, setActiveImage] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);

  const productPaths = useMemo(() => product.images ?? [], [product.images]);
  const { data: imageUrlMap = {} } = useSignedImageUrls(productPaths);
  const urls = useMemo(
    () => (product.images ?? []).map((p) => imageUrlMap[p]).filter(Boolean),
    [product.images, imageUrlMap],
  );

  const accessoryPaths = useMemo(
    () => (product.accessories ?? []).filter((a) => a.imageUrl).map((a) => a.imageUrl),
    [product.accessories],
  );
  const { data: accImageUrlMap = {} } = useSignedImageUrls(accessoryPaths);

  const prevImage = () =>
    setActiveImage((i) => (i - 1 + Math.max(urls.length, 1)) % Math.max(urls.length, 1));
  const nextImage = () =>
    setActiveImage((i) => (i + 1) % Math.max(urls.length, 1));

  const countryCode = product.country || product.implantSpec?.country;
  const country = countryCode ? countryByCode[countryCode] : null;
  const spec = product.implantSpec;

  const fmtPrice = (p: Product) => {
    const isIQD = p.currency === "IQD";
    const val = isIQD ? Number(p.price).toLocaleString() : p.price.toFixed(2);
    const sym = isIQD ? "د.ع" : "$";
    return isIQD ? `${val} ${sym}` : `${sym}${val}`;
  };

  // Sizes: pull diameters & lengths from the variants matrix (only sizes that
  // actually have stock entries); fall back to legacy dimensionStocks/lists.
  const stockMatrix = useMemo(() => {
    const v = spec?.variants ?? [];
    if (v.length > 0) {
      return v.map((x) => ({
        diameter: Number(x.diameter),
        length: Number(x.length),
        quantity: Number(x.stock),
      }));
    }
    const ds = spec?.dimensionStocks ?? [];
    if (ds.length > 0) {
      return ds.map((x) => ({
        diameter: Number(x.diameter),
        length: Number(x.length),
        quantity: Number(x.quantity),
      }));
    }
    return [];
  }, [spec?.variants, spec?.dimensionStocks]);

  const diameters = useMemo(() => {
    if (stockMatrix.length > 0) {
      return [...new Set(stockMatrix.map((s) => s.diameter))];
    }
    return spec?.diameters ?? [];
  }, [stockMatrix, spec?.diameters]);
  const lengths = useMemo(() => {
    if (stockMatrix.length > 0) {
      return [...new Set(stockMatrix.map((s) => s.length))];
    }
    return spec?.lengths ?? [];
  }, [stockMatrix, spec?.lengths]);
  const [selectedDiameter, setSelectedDiameter] = useState<number | null>(null);
  const [selectedLength, setSelectedLength] = useState<number | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const selectedStock = useMemo(() => {
    if (selectedDiameter == null || selectedLength == null) return null;
    const match = stockMatrix.find(
      (s) => s.diameter === Number(selectedDiameter) && s.length === Number(selectedLength),
    );
    return match ? match.quantity : 0;
  }, [selectedDiameter, selectedLength, stockMatrix]);

  // Group accessories by their category so multiple items of the same type
  // (e.g. several Abutments) are listed under a single category header.
  const accessories = product.accessories ?? [];
  const categoryIdOf = (type: string): string =>
    LEGACY_TYPE_MAP[type] ??
    ACCESSORY_CATEGORIES.find((c) => c.en === type)?.id ??
    type;
  const groupedAccessories = useMemo(() => {
    const map: Record<string, ProductAccessory[]> = {};
    for (const acc of accessories) {
      const id = categoryIdOf(acc.type);
      if (!map[id]) map[id] = [];
      map[id].push(acc);
    }
    return map;
  }, [accessories]);
  const orderedCategoryIds = useMemo(() => {
    const ids = ACCESSORY_CATEGORIES.map((c) => c.id).filter((id) => groupedAccessories[id]?.length);
    for (const id of Object.keys(groupedAccessories)) {
      if (!ids.includes(id)) ids.push(id);
    }
    return ids;
  }, [groupedAccessories]);
  const categoryLabelOf = (id: string) => {
    const c = ACCESSORY_CATEGORIES.find((cc) => cc.id === id);
    if (c) return ar ? c.ar : c.en;
    return id;
  };

  const fmtAccessoryPrice = (acc: ProductAccessory) =>
    acc.currency === "IQD"
      ? `${Number(acc.price).toLocaleString()} د.ع`
      : `$${Number(acc.price).toFixed(2)}`;

  const toggleCategory = (id: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderAccessoryCard = (acc: ProductAccessory, i: number, extraClass?: string) => (
    <div
      key={`${acc.name}-${i}`}
      className={cn("bg-card border border-border rounded-2xl p-3 shadow-soft", extraClass)}
    >
      <div className="aspect-square rounded-xl bg-slate-100 overflow-hidden mb-2.5 flex items-center justify-center">
        {acc.imageUrl && accImageUrlMap[acc.imageUrl] ? (
          <img src={accImageUrlMap[acc.imageUrl]} alt={acc.name} className="size-full object-cover" />
        ) : (
          <Package className="size-8 text-slate-300" />
        )}
      </div>
      <p className="text-sm font-bold truncate">{acc.name}</p>
      {acc.specs && (
        <span className="inline-block mt-1.5 text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md truncate max-w-full">
          {acc.specs}
        </span>
      )}
      {acc.price > 0 && (
        <p className="mt-1.5 text-sm font-display font-bold text-primary">{fmtAccessoryPrice(acc)}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="size-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition shrink-0"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-display font-bold text-base truncate">{product.ar || product.en}</h2>
          <p className="text-xs text-muted-foreground truncate">{product.brand}</p>
        </div>
      </div>

      {/* Image carousel */}
      <div className="relative">
        {urls.length > 0 ? (
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 shadow-soft">
            <img
              src={urls[activeImage]}
              alt={product.ar || product.en}
              className="size-full object-cover cursor-zoom-in"
              onClick={() => setZoomOpen(true)}
            />
            {urls.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center text-slate-700 shadow hover:bg-white transition"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 -translate-y-1/2 size-9 rounded-full bg-white/85 backdrop-blur flex items-center justify-center text-slate-700 shadow hover:bg-white transition"
                  aria-label="Next image"
                >
                  <ChevronRight className="size-5" />
                </button>
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                  {urls.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={cn(
                        "size-2 rounded-full transition",
                        i === activeImage ? "bg-white" : "bg-white/50",
                      )}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="aspect-square rounded-3xl bg-slate-100 flex items-center justify-center">
            <Package className="size-16 text-slate-300" />
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-card border border-border rounded-3xl p-5 shadow-card">
        <h1 className="font-display font-extrabold text-xl leading-tight">
          {product.ar || product.en}
        </h1>
        {product.brand && (
          <p className="text-sm text-muted-foreground mt-1">{product.brand}</p>
        )}
        <p className="font-display font-extrabold text-2xl text-primary mt-3">
          {fmtPrice(product)}
        </p>

        {product.description && (
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            {product.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-[#F5FAFE] border border-[#D3E8F7] rounded-2xl px-4 py-3">
            <p className="text-[11px] font-semibold text-[#7A94A8]">
              {ar ? "الشركة المصنعة" : "Manufacturer"}
            </p>
            <p className="font-display font-bold text-sm text-[#17324A] mt-1 truncate">
              {product.brand || (ar ? "غير محدد" : "N/A")}
            </p>
          </div>
          <div className="bg-[#F5FAFE] border border-[#D3E8F7] rounded-2xl px-4 py-3">
            <p className="text-[11px] font-semibold text-[#7A94A8]">
              {ar ? "بلد المنشأ" : "Country of Origin"}
            </p>
            <p className="font-display font-bold text-sm text-[#17324A] mt-1 flex items-center gap-1.5 truncate">
              {country ? (
                <>
                  <img
                    src={countryFlagUrl(country.code)}
                    alt=""
                    className="size-4 rounded-sm object-cover ring-1 ring-black/5"
                  />
                  {ar ? country.ar : country.en}
                </>
              ) : (
                ar ? "غير محدد" : "N/A"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sizes: select diameter & length to view availability */}
      {diameters.length > 0 || lengths.length > 0 ? (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-4">
          <div className="flex items-center gap-2">
            <Ruler className="size-4 text-primary" />
            <h3 className="font-display font-bold text-base">
              {ar ? "الأقطار والأطوال" : "Diameters & Lengths"}
            </h3>
          </div>

          {diameters.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-2 block">
                {ar ? "القطر (mm):" : "Diameter (mm):"}
              </label>
              <div className="flex flex-wrap gap-2">
                {diameters.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDiameter(selectedDiameter === d ? null : d)}
                    className={cn(
                      "h-11 px-4 rounded-xl text-sm font-bold border transition flex items-center gap-1.5",
                      selectedDiameter === d
                        ? "bg-[#2E93E0] text-white border-[#2E93E0] shadow-sm"
                        : "bg-[#F5FAFE] border-[#D3E8F7] text-[#17324A] hover:border-[#2E93E0]",
                    )}
                  >
                    {selectedDiameter === d && <Check className="size-4" />}
                    <span dir="ltr">{d}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {lengths.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-2 block">
                {ar ? "الطول (mm):" : "Length (mm):"}
              </label>
              <div className="flex flex-wrap gap-2">
                {lengths.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setSelectedLength(selectedLength === l ? null : l)}
                    className={cn(
                      "h-11 px-4 rounded-xl text-sm font-bold border transition flex items-center gap-1.5",
                      selectedLength === l
                        ? "bg-[#2E93E0] text-white border-[#2E93E0] shadow-sm"
                        : "bg-[#F5FAFE] border-[#D3E8F7] text-[#17324A] hover:border-[#2E93E0]",
                    )}
                  >
                    {selectedLength === l && <Check className="size-4" />}
                    <span dir="ltr">{l}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className={cn(
              "rounded-2xl px-4 py-3.5 flex items-center gap-3",
              selectedStock == null
                ? "bg-[#F5FAFE] border border-[#D3E8F7]"
                : selectedStock > 0
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-rose-50 border border-rose-200",
            )}
          >
            <Package
              className={cn(
                "size-5 shrink-0",
                selectedStock == null
                  ? "text-[#7A94A8]"
                  : selectedStock > 0
                    ? "text-emerald-600"
                    : "text-rose-500",
              )}
            />
            {selectedStock == null ? (
              <p className="text-sm text-[#7A94A8]">
                {ar
                  ? "اختر القطر والطول لعرض الكمية المتوفرة"
                  : "Select a diameter and length to view available quantity"}
              </p>
            ) : (
              <p className="text-sm font-semibold text-[#17324A]">
                {ar ? "الكمية المتوفرة:" : "Available quantity:"}{" "}
                <span
                  dir="ltr"
                  className={cn(
                    "font-display font-extrabold text-lg",
                    selectedStock > 0 ? "text-emerald-700" : "text-rose-600",
                  )}
                >
                  {selectedStock}
                </span>
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Accessories grouped by category (regular implants only) */}
      {product.branch !== "bone_graft" && product.branch !== "specialized_implant" && (
        <div className="space-y-5">
        <h3 className="font-display font-bold text-base">
          {ar ? "الإكسسوارات الملحقة" : "Attached Accessories"}
        </h3>
        {accessories.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl py-10 text-center text-sm text-muted-foreground">
            {ar ? "لا توجد إكسسوارات ملحقة" : "No attached accessories"}
          </div>
        ) : (
          orderedCategoryIds.map((catId) => {
            const items = groupedAccessories[catId];
            const expanded = expandedCats.has(catId);
            return (
              <div key={catId} className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-4 w-1 rounded-full bg-[#2E93E0] shrink-0" />
                    <h4 className="font-display font-bold text-sm text-[#17324A] truncate">
                      {categoryLabelOf(catId)}
                    </h4>
                    <span className="text-[11px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md shrink-0">
                      {items.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCategory(catId)}
                    className="text-[11px] font-bold text-[#2E93E0] hover:text-[#1C6FB5] transition shrink-0"
                  >
                    {expanded ? (ar ? "عرض أقل" : "Show less") : (ar ? "عرض الكل" : "View all")}
                  </button>
                </div>
                {expanded ? (
                  <div className="grid grid-cols-2 gap-3">
                    {items.map((acc, i) => renderAccessoryCard(acc, i))}
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-hide">
                    {items.map((acc, i) => renderAccessoryCard(acc, i, "w-40 shrink-0"))}
                  </div>
                )}
              </div>
            );
          })
        )}
        </div>
      )}



      {/* Zoom preview */}
      {zoomOpen && urls.length > 0 && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomOpen(false)}
        >
          <img src={urls[activeImage]} alt="" className="max-h-full max-w-full object-contain" />
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            className="absolute top-4 end-4 size-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition"
          >
            <X className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function OffersPanel({ companyId }: { companyId: string }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: offers = [], isLoading } = useOffers(companyId);
  const upsertOffer = useUpsertOffer();
  const deleteOffer = useDeleteOffer();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<string>("USD");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setExpiryDate("");
    setPrice("");
    setCurrency("USD");
    setImageFile(null);
    setImagePreview("");
    setFormError("");
    setShowForm(true);
  };

  const handleFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    setFormError("");
    if (!title.trim()) {
      setFormError(ar ? "الرجاء إدخال عنوان العرض" : "Please enter an offer title");
      return;
    }

    setBusy(true);
    try {
      const offerId = editing?.id ?? crypto.randomUUID();
      let imageUrl = editing?.imageUrl ?? "";

      if (imageFile) {
        try {
          imageUrl = await uploadProductImage(offerId, imageFile);
        } catch (uploadErr: any) {
          alert(
            ar
              ? `فشل رفع الصورة: ${uploadErr.message || uploadErr}`
              : `Image upload failed: ${uploadErr.message || uploadErr}`,
          );
          setBusy(false);
          return;
        }
      }

      await upsertOffer.mutateAsync({
        id: offerId,
        supplierId: companyId,
        title: title.trim(),
        description: description.trim(),
        imageUrl,
        expiryDate,
        price: price ? Number(price) : undefined,
        currency,
      });

      setShowForm(false);
    } catch (e: any) {
      alert(ar ? `فشل حفظ العرض: ${e.message || e}` : `Failed to save offer: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (offer: Offer) => {
    if (!confirm(ar ? "حذف هذا العرض؟" : "Delete this offer?")) return;
    await deleteOffer.mutateAsync(offer.id);
  };

  const allPaths = offers.filter((o) => o.imageUrl).map((o) => o.imageUrl);
  const { data: urlMap = {} } = useSignedImageUrls(allPaths);

  return (
    <>
      {!showForm && (
        <button
          onClick={openAdd}
          className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-display font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-card"
        >
          <Plus className="size-5" />
          <Megaphone className="size-5" />
          {ar ? "إضافة عرض / إعلان" : "Add Offer / Ad"}
        </button>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-3xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg">
              {editing ? (ar ? "تعديل عرض" : "Edit offer") : ar ? "عرض جديد" : "New offer"}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="size-9 rounded-xl bg-muted hover:bg-slate-200 flex items-center justify-center transition"
            >
              <X className="size-4" />
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "العنوان" : "Title"}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={ar ? "مثال: خصم 20% على الزرعات" : "e.g. 20% off implants"}
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "الوصف" : "Description"}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ar ? "تفاصيل العرض..." : "Offer details..."}
              rows={3}
              className="w-full rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "تاريخ الانتهاء" : "Expiry date"}
            </label>
            <div className="relative">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
              />
              <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "السعر والعملة" : "Price and Currency"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                dir="ltr"
                className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
              />
              <div className="flex rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={cn(
                    "px-4 py-2.5 text-sm font-bold transition",
                    currency === "USD"
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("IQD")}
                  className={cn(
                    "px-4 py-2.5 text-sm font-bold transition",
                    currency === "IQD"
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-500 hover:text-slate-700",
                  )}
                >
                  {ar ? "د.ع" : "IQD"}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "صورة العرض" : "Offer image"}
            </label>
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden">
                <img src={imagePreview} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview("");
                  }}
                  className="absolute top-2 end-2 size-7 rounded-full bg-black/60 text-white flex items-center justify-center"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : editing?.imageUrl ? (
              <div className="relative w-full h-40 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden">
                {urlMap[editing.imageUrl] ? (
                  <img src={urlMap[editing.imageUrl]} alt="" className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center">
                    <Package className="size-8 text-slate-300" />
                  </div>
                )}
              </div>
            ) : (
              <label className="w-full h-32 rounded-xl border-2 border-dashed border-[#D3E8F7] bg-[#F5FAFE] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                <Upload className="size-6 text-slate-400 group-hover:text-primary transition" />
                <p className="text-xs text-slate-400 group-hover:text-primary transition font-medium">
                  {ar ? "اضغط لرفع صورة" : "Tap to upload image"}
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files)}
                />
              </label>
            )}
          </div>

          {formError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 text-center font-semibold">
              {formError}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className={cn(
              "w-full h-14 rounded-2xl font-display font-bold flex items-center justify-center gap-2 transition shadow-card",
              busy
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:opacity-90",
            )}
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : null}
            {busy
              ? ar
                ? "جارٍ الحفظ..."
                : "Saving..."
              : editing
                ? ar
                  ? "حفظ التعديلات"
                  : "Save changes"
                : ar
                  ? "إضافة العرض"
                  : "Add offer"}
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : offers.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
          <Megaphone className="size-14 mb-4 opacity-20" />
          <p className="font-display font-bold text-lg text-slate-400">
            {ar ? "لا توجد عروض بعد" : "No offers yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <div
              key={offer.id}
              className="bg-card border border-border rounded-2xl p-3.5 shadow-soft"
            >
              <div className="flex gap-3">
                <div className="size-16 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                  {offer.imageUrl && urlMap[offer.imageUrl] ? (
                    <img src={urlMap[offer.imageUrl]} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <Megaphone className="size-6 text-slate-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm">{offer.title}</p>
                  {offer.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {offer.description}
                    </p>
                  )}
                  {offer.price != null && (
                    <p className="text-sm font-display font-bold text-primary mt-1 flex items-center gap-0.5">
                      <DollarSign className="size-3.5" />
                      {offer.price.toLocaleString(ar ? "ar" : "en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  )}
                  {offer.expiryDate && (
                    <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                      <Calendar className="size-3" />
                      {ar ? "ينتهي:" : "Expires:"} {offer.expiryDate}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 mt-2.5 pt-2.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => handleDelete(offer)}
                  className="flex-1 h-8 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center gap-1 transition"
                >
                  <Trash2 className="size-3" />
                  {ar ? "حذف" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ImplantOrdersPanel({ companyId }: { companyId: string }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useOrders(companyId);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed" | "rejected">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const statusOptions: { id: "all" | "pending" | "confirmed" | "rejected"; ar: string; en: string }[] = [
    { id: "all", ar: "الكل", en: "All" },
    { id: "pending", ar: "قيد الانتظار", en: "Pending" },
    { id: "confirmed", ar: "تم التأكيد", en: "Confirmed" },
    { id: "rejected", ar: "غير متوفر", en: "Unavailable" },
  ];

  const filtered = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);

  const handleConfirm = async (o: OrderDoc) => {
    setBusyId(o.id);
    try {
      await confirmOrder(o);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(ar ? "تم تأكيد الطلب وتحويله إلى فاتورة" : "Order confirmed and converted to invoice");
    } catch (e: any) {
      toast.error(ar ? `فشل التأكيد: ${e?.message || e}` : `Confirm failed: ${e?.message || e}`);
    } finally {
      setBusyId(null);
    }
  };

  const handleUnavailable = async (o: OrderDoc) => {
    setBusyId(o.id);
    try {
      await markOrderUnavailable(o.id);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(ar ? "تم تحديد الطلب كغير متوفر" : "Order marked as unavailable");
    } catch (e: any) {
      toast.error(ar ? `فشل التحديث: ${e?.message || e}` : `Update failed: ${e?.message || e}`);
    } finally {
      setBusyId(null);
    }
  };

  const fmtTotal = (o: OrderDoc) => {
    const usd = o.totalUSD ?? 0;
    const iqd = o.totalIQD ?? 0;
    if (iqd > 0 && usd > 0) return ar ? `${iqd.toLocaleString()} د.ع + $${usd.toFixed(2)}` : `${iqd.toLocaleString()} IQD + $${usd.toFixed(2)}`;
    if (iqd > 0) return `${iqd.toLocaleString()} د.ع`;
    return `$${(o.total || 0).toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
        <ClipboardList className="size-14 mb-4 opacity-20" />
        <p className="font-display font-bold text-lg text-slate-400">
          {ar ? "لا توجد طلبات بعد" : "No orders yet"}
        </p>
        <p className="text-sm mt-1 max-w-xs text-slate-400">
          {ar ? "ستظهر الطلبات هنا عند استلامها" : "Orders will appear here when received"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {statusOptions.map((s) => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            className={cn(
              "shrink-0 h-8 px-3.5 rounded-full text-xs font-bold border transition whitespace-nowrap",
              statusFilter === s.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:bg-accent",
            )}
          >
            {ar ? s.ar : s.en}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {ar ? "لا توجد طلبات مطابقة" : "No matching orders"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const itemCount = (o.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
            const firstItem = o.items?.[0]?.name || (ar ? "منتج" : "Product");
            const isPending = o.status === "pending";
            return (
              <div key={o.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="size-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <Package className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-bold text-muted-foreground">
                        {o.orderNumber || `#${o.id.slice(0, 8).toUpperCase()}`}
                      </p>
                      <p className="font-display font-bold text-sm truncate">
                        {o.dentistName || (ar ? "طبيب" : "Doctor")}
                        {o.clinicName ? ` · ${o.clinicName}` : ""}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                      o.status === "confirmed" ? "bg-emerald-100 text-emerald-700" :
                      o.status === "rejected" ? "bg-rose-100 text-rose-700" :
                      "bg-amber-100 text-amber-700",
                    )}
                  >
                    {o.status === "pending" ? (ar ? "قيد الانتظار" : "Pending") :
                     o.status === "confirmed" ? (ar ? "تم التأكيد" : "Confirmed") :
                     ar ? "غير متوفر" : "Unavailable"}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mb-2 truncate">
                  {firstItem}{itemCount > 1 ? ` +${itemCount - 1}` : ""}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-500 border-t border-dashed border-border pt-2.5">
                  <span>{itemCount} {ar ? "منتج" : "products"}</span>
                  <span className="font-display font-extrabold text-sm">{fmtTotal(o)}</span>
                </div>

                {isPending && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => handleConfirm(o)}
                      disabled={busyId === o.id}
                      className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition disabled:opacity-60"
                    >
                      {busyId === o.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {ar ? "تأكيد الطلب" : "Confirm"}
                    </button>
                    <button
                      onClick={() => handleUnavailable(o)}
                      disabled={busyId === o.id}
                      className="flex-1 h-10 rounded-xl bg-card border border-border text-muted-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-rose-50 hover:text-rose-600 transition disabled:opacity-60"
                    >
                      <X className="size-4" />
                      {ar ? "الطلب غير متوفر" : "Unavailable"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BrowseImplants() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [searchQ, setSearchQ] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [lenRange, setLenRange] = useState([5, 18]);
  const [diaRange, setDiaRange] = useState([3, 7]);
  const { role } = useUserRole();
  const { data: products = [] } = useProducts();

  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      if (p.category !== "implant") continue;
      const c = p.country || p.implantSpec?.country;
      if (!c) continue;
      const slug = COUNTRY_CODE_TO_SLUG[c] ?? c.toLowerCase();
      counts[slug] = (counts[slug] || 0) + 1;
    }
    return counts;
  }, [products]);

  const countryCodeMap: Record<string, string> = { korean: "kr", swiss: "ch", italian: "it", german: "de", brazilian: "br" };

  const categories = [
    { to: "/bone-grafts" as const, img: "/photo/bonecraft.jpg", title: ar ? "البون كرافت" : "Bone Graft" },
    { to: "/surgical-guide" as const, img: "/photo/surgecalguid.jpg", title: ar ? "الدليل الجراحي" : "Surgical Guide" },
    { to: "/specialized-implants" as const, img: specializedImplantImg, title: ar ? "الزرعات المتخصصة" : "Specialized Implants" },
  ];

  return (
    <MobileShell>
      <TopBar title={ar ? "الزراعة" : "Implants"} showBack />
      <div className="px-4 pt-4 pb-6 space-y-5">
        {/* Search + Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
            <input type="search" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder={ar ? "ابحث حسب الشركة أو الطول أو القطر..." : "Search by company, length, diameter..."} className="w-full h-11 rounded-2xl bg-white border border-slate-200 ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <button onClick={() => setShowFilter(!showFilter)} className={cn("size-11 rounded-2xl border flex items-center justify-center transition", showFilter ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200")}><SlidersHorizontal className="size-5" /></button>
        </div>

        {showFilter && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-slate-500">{ar ? "الطول (مم)" : "Length (mm)"}</span><span className="text-xs font-bold text-primary">{lenRange[0]} - {lenRange[1]}</span></div>
              <input type="range" min={5} max={18} value={lenRange[0]} onChange={(e) => setLenRange([+e.target.value, lenRange[1]])} className="w-full accent-primary" />
              <input type="range" min={5} max={18} value={lenRange[1]} onChange={(e) => setLenRange([lenRange[0], +e.target.value])} className="w-full accent-primary" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1"><span className="text-xs font-bold text-slate-500">{ar ? "القطر (مم)" : "Diameter (mm)"}</span><span className="text-xs font-bold text-primary">{diaRange[0]} - {diaRange[1]}</span></div>
              <input type="range" min={3} max={7} step={0.5} value={diaRange[0]} onChange={(e) => setDiaRange([+e.target.value, diaRange[1]])} className="w-full accent-primary" />
              <input type="range" min={3} max={7} step={0.5} value={diaRange[1]} onChange={(e) => setDiaRange([diaRange[0], +e.target.value])} className="w-full accent-primary" />
            </div>
          </div>
        )}

        {/* Promo Banner */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500 to-blue-700 p-4 shadow-lg">
          <div className="absolute -top-8 -end-8 size-32 rounded-full bg-white/10" />
          <p className="font-extrabold text-white text-lg relative z-10">{ar ? "دقة أعلى.. نتائج أفضل" : "Higher precision.. Better results"}</p>
          <p className="text-white/70 text-xs mt-1 relative z-10">{ar ? "أحدث أنظمة الزراعة السنية" : "Latest dental implant systems"}</p>
        </div>

        {/* Category Cards */}
        <div>
          <h3 className="font-bold text-sm mb-3">{ar ? "اختر الفئة" : "Select category"}</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {categories.map((c) => (
              <Link
                key={c.title}
                to={c.to}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
              >
                <div className="h-24 bg-slate-50 flex items-center justify-center p-2">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="size-full object-cover rounded-lg"
                    loading="lazy"
                  />
                </div>
                <p className="p-2 text-[11px] font-bold text-center">{c.title}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Country Grid */}
        <div>
          <h3 className="font-bold text-sm mb-3">{ar ? "زرعات حسب الدول" : "Implants by country"}</h3>
          <div className="grid grid-cols-2 gap-3">
            {COUNTRIES.map((c) => {
              const count = countryCounts[c.slug] || 0;
              const flagUrl = `https://flagcdn.com/w80/${countryCodeMap[c.slug] || c.slug}.png`;
              return (
                <Link key={c.slug} to="/implants/$country" params={{ country: c.slug }} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition group">
                  <div className="relative w-20 h-20 rounded-full bg-sky-50 mx-auto mb-3 flex items-center justify-center">
                    <img src="/photo/implant.jpg" alt="" className="w-14 h-14 object-contain" loading="lazy" />
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full overflow-hidden shadow-sm border-2 border-white bg-white">
                      <img src={flagUrl} alt={c.en} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = c.flag; }} />
                      <span style={{ display: "none" }}>{c.flag}</span>
                    </span>
                  </div>
                  <p className="font-bold text-sm text-center">زرعات {ar ? c.ar : c.en}</p>
                  <p className="text-[11px] text-slate-500 text-center mt-0.5">{count} {ar ? "منتج" : "products"}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
