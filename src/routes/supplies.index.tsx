import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, updateDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { TagInput } from "@/components/TagInput";
import { NotificationBell } from "@/components/NotificationBell";
import { BrandAutocomplete } from "@/components/BrandAutocomplete";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CITIES } from "@/data/offices";
import { subcategoriesOf } from "@/data/subcategories";
import { useAdminStore } from "@/lib/adminStore";
import {
  useProducts,
  useUpsertProduct,
  useDeleteProduct,
  uploadProductImage,
  removeProductImage,
  useSignedImageUrls,
  MAX_PRODUCT_IMAGES,
  type Product,
} from "@/lib/products";
import { useOffers, useUpsertOffer, useDeleteOffer, type Offer } from "@/lib/offers";
import { useUserRole } from "@/lib/useAuth";
import { auth } from "@/integrations/firebase/client";
import { useI18n } from "@/lib/i18n";
import {
  MapPin,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  SearchX,
  Package,
  Sparkles,
  Activity,
  Stethoscope,
  Scissors,
  AlignCenter,
  Baby,
  HeartPulse,
  Plus,
  X,
  Upload,
  Trash2,
  Loader2,
  DollarSign,
  Layers,
  Pencil,
  Megaphone,
  ClipboardList,
  Calendar,
  ImageOff,
  UserCircle2,
  LogOut,
  Phone,
  FileText,
  Download,
  Link2,
  Cpu,
  BookOpen,
  Shield,
  Wrench,
  Cog,
  Smile,
  Shirt,
  Settings,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Currency } from "@/lib/products";
import Cropper, { type Area } from "react-easy-crop";
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

function formatPriceInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const [intPart, ...rest] = cleaned.split(".");
  let int = intPart.replace(/^0+(?=\d)/, "");
  if (!int) int = "0";
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const dec = rest.join("").slice(0, 2);
  return dec.length ? `${withCommas}.${dec}` : withCommas;
}

function parsePriceInput(raw: string): number {
  return Number(raw.replace(/,/g, "")) || 0;
}

export const Route = createFileRoute("/supplies/")({
  component: SuppliesIndex,
});

function SuppliesIndex() {
  const { role, loading: roleLoading } = useUserRole();

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

  if (role?.accountType === "supply") {
    return (
      <RoleGuard allowedRoles={["supply"]}>
        <SupplyDashboard />
      </RoleGuard>
    );
  }
  if (role?.accountType === "implant") {
    return (
      <RoleGuard allowedRoles={["implant"]}>
        <ImplantDashboard />
      </RoleGuard>
    );
  }
  return <BrowseSupplies />;
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

function SupplyDashboard() {
  const { lang, toggle } = useI18n();
  const ar = lang === "ar";
  const { role } = useUserRole();
  const supplierId = role?.userId ?? "";
  const [activeTab, setActiveTab] = useState<"products" | "offers" | "orders">("products");

  const mapsUrl = getMapsUrl(role ?? {});

  const storeLabel = role?.accountType
    ? {
        supply: { ar: "متجر مستلزمات", en: "Supply Store" },
        implant: { ar: "شركة زرعات", en: "Implant Co." },
        lab: { ar: "مختبر", en: "Lab" },
        dentist: { ar: "طبيب أسنان", en: "Dentist" },
      }[role.accountType]
    : { ar: "", en: "" };

  return (
    <MobileShell hideBottomNav>
      {/* Profile Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <Link
            to="/account"
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
          >
            <div className="size-12 rounded-full bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center overflow-hidden">
              {role?.photoURL ? (
                <img src={role.photoURL} alt="" className="size-full object-cover" />
              ) : (
                <UserCircle2 className="size-7 text-primary" />
              )}
            </div>
            <div>
              <p className="font-display font-bold text-sm text-foreground">
                {role?.name || (ar ? "المستخدم" : "User")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {ar ? storeLabel?.ar : storeLabel?.en}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="size-3 shrink-0" />
                {role?.phone || (ar ? "لم يتم إضافة رقم هاتف" : "No phone number added")}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <NotificationBell userId={supplierId} />
            <button
              type="button"
              onClick={toggle}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-sky-100 hover:text-sky-600 text-xs font-bold transition"
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
            className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 hover:text-primary transition-colors cursor-pointer z-50 pointer-events-auto"
          >
            <MapPin className="size-3 shrink-0" />
            {role?.address || (ar ? "عرض الموقع على الخريطة" : "View on map")}
          </a>
        ) : (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="size-3 shrink-0" />
            {ar ? "لم يتم تحديد العنوان بعد" : "No address set yet"}
          </p>
        )}
      </div>

      {/* Tab navigation */}
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
        </div>{" "}
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4 pb-6">
        {activeTab === "products" && <ProductsPanel />}
        {activeTab === "offers" && <OffersPanel supplierId={supplierId} />}
        {activeTab === "orders" && <OrdersPanel />}
      </div>
    </MobileShell>
  );
}

function ProductsPanel() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: allProducts = [], isLoading } = useProducts();
  const upsert = useUpsertProduct();
  const remove = useDeleteProduct();

  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [subFilter, setSubFilter] = useState<string>("");

  const myProducts = useMemo(() => {
    if (branchFilter === "all") return allProducts;
    let list = allProducts.filter((p) => p.branch === branchFilter);
    if (subFilter) list = list.filter((p) => p.subCategory === subFilter);
    return list;
  }, [allProducts, branchFilter, subFilter]);

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

  const activeBranchName = branchFilter !== "all"
    ? branchOptions.find((b) => b.value === branchFilter)
    : null;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [nameEn, setNameEn] = useState("");
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [stock, setStock] = useState("");
  const [branch, setBranch] = useState("general");
  const [subCategory, setSubCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const catRef = useRef<HTMLDivElement>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropFile, setCropFile] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (catRef.current && !catRef.current.contains(e.target as Node)) {
        setCatDropdownOpen(false);
      }
    };
    if (catDropdownOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [catDropdownOpen]);

  const openAdd = () => {
    setEditing(null);
    setNameEn("");
    setBrand("");
    setPrice("");
    setCurrency("USD");
    setStock("");
    setBranch(branchFilter !== "all" ? branchFilter : "general");
    setSubCategory("");
    setImageFiles([]);
    setImagePreviews([]);
    setCatDropdownOpen(false);
    setFormError("");
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setNameEn(p.en || p.ar);
    setBrand(p.brand);
    setPrice(formatPriceInput(String(p.price ?? "")));
    setCurrency(p.currency || "USD");
    setStock(String(p.stock ?? 0));
    setBranch(p.branch);
    setSubCategory(p.subCategory ?? "");
    setImageFiles([]);
    setImagePreviews([]);
    setFormError("");
    setShowForm(true);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).slice(0, MAX_PRODUCT_IMAGES - imageFiles.length - (editing?.images.length ?? 0));
    if (incoming.length === 0) return;
    const file = incoming[0];
    const reader = new FileReader();
    reader.onload = () => {
      setCropFile(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!cropFile || !croppedAreaPixels) return;
    try {
      const img = new Image();
      img.src = cropFile;
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;
      ctx.drawImage(
        img,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
      );
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.9));
      if (!blob) return;
      const croppedFile = new File([blob], "cropped.jpg", { type: "image/jpeg" });
      const preview = URL.createObjectURL(croppedFile);
      setImageFiles((prev) => [...prev, croppedFile]);
      setImagePreviews((prev) => [...prev, preview]);
      setCropModalOpen(false);
      setCropFile(null);
    } catch {}
  };

  const removePreview = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeExistingImage = async (path: string) => {
    if (!editing) return;
    await removeProductImage(path);
    const updated = editing.images.filter((img) => img !== path);
    setEditing({ ...editing, images: updated });
  };

  const submit = async () => {
    setFormError("");

    if (!nameEn.trim()) {
      setFormError(ar ? "الرجاء إدخال اسم المنتج" : "Please enter a product name");
      return;
    }
    if (!price.trim() || parsePriceInput(price) <= 0) {
      setFormError(ar ? "الرجاء إدخال سعر صحيح" : "Please enter a valid price");
      return;
    }

    setBusy(true);
    try {
      const productId = editing?.id ?? crypto.randomUUID();

      const uploadedPaths: string[] = [];
      for (const file of imageFiles) {
        try {
          const path = await uploadProductImage(productId, file);
          uploadedPaths.push(path);
        } catch (uploadErr: any) {
          alert(
            ar
              ? `فشل رفع الصورة: ${uploadErr.message || uploadErr}. تحقق من صلاحيات Firebase Storage.`
              : `Image upload failed: ${uploadErr.message || uploadErr}. Check Firebase Storage permissions.`,
          );
          setBusy(false);
          return;
        }
      }

      const allImages = [...(editing?.images ?? []), ...uploadedPaths];

      await upsert.mutateAsync({
        id: productId,
        branch,
        subCategory: subCategory || undefined,
        ar: nameEn.trim(),
        en: nameEn.trim(),
        brand: brand.trim(),
        price: parsePriceInput(price),
        currency,
        stock: Number(stock) || 0,
        inStock: Number(stock) > 0,
        images: allImages,
        companyId: editing?.companyId || auth.currentUser?.uid || "",
      });

      setShowForm(false);
    } catch (e: any) {
      const msg = e?.message || String(e);
      alert(ar ? `فشل حفظ المنتج: ${msg}` : `Failed to save product: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(ar ? "حذف هذا المنتج؟" : "Delete this product?")) return;
    await remove.mutateAsync(p.id);
  };

  const fmtPrice = (p: Product) => {
    const isIQD = p.currency === "IQD";
    const val = isIQD ? Number(p.price).toLocaleString() : p.price.toFixed(2);
    const sym = isIQD ? "د.ع" : "$";
    return isIQD ? `${val} ${sym}` : `${sym}${val}`;
  };

  const allImagePaths = myProducts.flatMap((p) => p.images);
  const { data: imageUrlMap = {} } = useSignedImageUrls(allImagePaths);

  const editingImagePaths = editing?.images ?? [];
  const { data: editUrlMap = {} } = useSignedImageUrls(editingImagePaths);

  return (
    <div className="space-y-4">
      {/* Add button */}
      {!showForm && (
        <button
          onClick={openAdd}
          className="w-full h-14 rounded-2xl text-white font-display font-bold flex items-center justify-center gap-2 hover:opacity-95 transition shadow-lg"
          style={{ background: "linear-gradient(to right, #2AA6D1, #4FC3E8)" }}
        >
          <Plus className="size-5" />
          {ar ? "إضافة منتج جديد" : "Add new product"}
        </button>
      )}

      {/* Product form card */}
      {showForm && (
        <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-[#1C6FB5] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#1C6FB5]" />
              {editing ? (ar ? "تعديل منتج" : "Edit product") : ar ? "منتج جديد" : "New product"}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="size-9 rounded-xl bg-[#E7F4FE] hover:bg-[#DCEEFB] text-[#1C6FB5] flex items-center justify-center transition"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Category */}
          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "الفئة" : "Category"}
            </label>
            <div ref={catRef} className="relative">
              <button
                type="button"
                onClick={() => setCatDropdownOpen(!catDropdownOpen)}
                className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition flex items-center justify-between"
              >
                <span className={branch ? "" : "text-muted-foreground/60"}>
                  {branch
                    ? (ar
                        ? branchOptions.find((b) => b.value === branch)?.ar
                        : branchOptions.find((b) => b.value === branch)?.en)
                    : ar
                      ? "اختر الفئة"
                      : "Select category"}
                </span>
                <ChevronDown
                  className={`size-4 text-slate-400 transition-transform ${catDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {catDropdownOpen && (
                <div className="absolute start-0 end-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-y-auto py-2 z-50">
                  {branchOptions.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => {
                        setBranch(b.value);
                        setSubCategory("");
                        setCatDropdownOpen(false);
                      }}
                      className={`w-full px-4 py-2.5 text-sm transition-colors flex items-center justify-between hover:bg-blue-50 hover:text-blue-600 ${
                        branch === b.value
                          ? "bg-blue-100 text-blue-700 font-medium"
                          : "text-gray-700"
                      }`}
                    >
                      {ar ? b.ar : b.en}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sub-category */}
          {subcategoriesOf(branch).length > 0 && (
            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                {ar ? "التصنيف الفرعي (اختياري)" : "Sub-category (Optional)"}
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition appearance-none"
              >
                <option value="">{ar ? "-- اختر التصنيف الفرعي --" : "-- Select sub-category --"}</option>
                {subcategoriesOf(branch).map((s) => (
                  <option key={s.en} value={s.en}>
                    {ar ? s.ar : s.en}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "اسم المنتج" : "Product name"}
            </label>
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder={ar ? "مثال: كومبوزيت ضوئي" : "e.g. Light-cured composite"}
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "الماركة" : "Brand"}
            </label>
            <BrandAutocomplete
              value={brand}
              onChange={setBrand}
              placeholder={ar ? "مثال: 3M" : "e.g. 3M"}
            />
          </div>

          {/* Price + Currency row */}
          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "السعر" : "Price"}
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(formatPriceInput(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  dir="ltr"
                  className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                />
              </div>
              <div className="flex rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={cn(
                    "px-3.5 text-sm font-semibold transition",
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
                    "px-3.5 text-sm font-semibold transition",
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

          {/* Stock */}
          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "الكمية المتوفرة" : "Available quantity"}
            </label>
            <div className="relative">
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="0"
                dir="ltr"
                className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] ps-12 pe-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <Layers className="absolute start-4 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>
          </div>

          {/* Product images */}
          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "صور المنتج" : "Product images"}
            </label>

            {/* Existing images (editing) */}
            {editing && editing.images.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {editing.images.map((path, idx) => (
                  <div
                    key={path}
                    className="relative size-16 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden group"
                  >
                    {editUrlMap[path] ? (
                      <img src={editUrlMap[path]} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <Package className="size-5 text-slate-300" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingImage(path)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                    >
                      <Trash2 className="size-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New image upload zone */}
            {imageFiles.length + (editing?.images.length ?? 0) < MAX_PRODUCT_IMAGES && (
              <label className="w-full h-32 rounded-xl border-2 border-dashed border-[#D3E8F7] bg-[#F5FAFE] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                <Upload className="size-6 text-slate-400 group-hover:text-primary transition" />
                <p className="text-xs text-slate-400 group-hover:text-primary transition font-medium">
                  {ar ? "اضغط لرفع صورة المنتج" : "Tap to upload product image"}
                </p>
                <p className="text-[10px] text-slate-300">
                  {imageFiles.length}/{MAX_PRODUCT_IMAGES} · JPG, PNG
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            )}

            {/* Image previews */}
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {imagePreviews.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative size-16 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden shadow-sm"
                  >
                    <img src={url} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePreview(idx)}
                      className="absolute top-0.5 end-0.5 size-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error message */}
          {formError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 text-center font-semibold">
              {formError}
            </p>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className={cn(
              "w-full h-14 rounded-2xl font-display font-bold flex items-center justify-center gap-2 transition shadow-card",
              busy
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "text-white hover:opacity-95",
            )}
            style={busy ? undefined : { background: "linear-gradient(to right, #2AA6D1, #4FC3E8)" }}
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
                  ? "إضافة المنتج"
                  : "Add product"}
          </button>
        </div>
      )}

      {/* ── Branch Categories Grid (Owner View) ── */}
      {!showForm && (
        <>
          {activeBranchName && (
            <div>
              <button
                onClick={() => {
                  setBranchFilter("all");
                  setSubFilter("");
                }}
                className="flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition mb-3"
              >
                <ChevronRight className="size-4" />
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
                    {myProducts.length} {ar ? "منتج" : "products"}
                  </p>
                </div>
              </div>

              {subcategoriesOf(activeBranchName.value).length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 mt-3 scrollbar-hide">
                  <button
                    onClick={() => setSubFilter("")}
                    className={cn(
                      "shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border transition whitespace-nowrap",
                      subFilter === ""
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-foreground border-border hover:bg-accent",
                    )}
                  >
                    {ar ? "الكل" : "All"}
                  </button>
                  {subcategoriesOf(activeBranchName.value).map((s) => (
                    <button
                      key={s.en}
                      onClick={() => setSubFilter(s.en)}
                      className={cn(
                        "shrink-0 h-9 px-3.5 rounded-full text-xs font-bold border transition whitespace-nowrap",
                        subFilter === s.en
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:bg-accent",
                      )}
                    >
                      {ar ? s.ar : s.en}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!activeBranchName && (
            <>
              <h2 className="font-display font-bold text-sm text-muted-foreground">
                {ar ? "فروع طب الأسنان" : "Dental Specialties"}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {branchOptions.map((b) => {
                  const Badge = BRANCH_BADGE[b.value] ?? Package;
                  const image = BRANCH_IMAGES[b.value];
                  const count = allProducts.filter((p) => p.branch === b.value).length;
                  return (
                    <button
                      key={b.value}
                      onClick={() => {
                        setBranchFilter(b.value);
                        setSubFilter("");
                      }}
                      className="group text-start bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
                    >
                      <div className="relative h-24 bg-gradient-to-b from-slate-50 to-white flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
                        {image ? (
                          <img src={image} alt="" loading="lazy" className="h-20 w-auto object-contain relative z-10 group-hover:scale-110 transition-transform duration-300" />
                        ) : (
                          <span className="size-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center relative z-10 group-hover:scale-110 transition-transform duration-300">
                            <Badge className="size-7" />
                          </span>
                        )}
                      </div>
                      <div className="p-2.5 border-t border-slate-100">
                        <p className="font-display font-bold text-xs leading-tight text-slate-800">
                          {ar ? b.ar : b.en}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">
                            {count} {ar ? "صنف" : "items"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Product list — only when a branch is selected */}
      {activeBranchName && (
        isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : myProducts.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
          <Package className="size-14 mb-4 opacity-20" />
          <p className="font-display font-bold text-lg text-slate-400">
            {ar
              ? `لا توجد منتجات في ${activeBranchName!.ar}`
              : `No products in ${activeBranchName!.en}`}
          </p>
          <p className="text-sm mt-1 max-w-xs text-slate-400">
            {ar
              ? "اضغط على زر 'إضافة منتج جديد' لإضافة منتج في هذا الفرع"
              : "Tap 'Add new product' to add a product in this category"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {myProducts.map((p) => {
            const isOut = (p.stock ?? 0) === 0;
            return (
              <div
                key={p.id}
                className="bg-card border border-border rounded-2xl p-3 shadow-soft hover:shadow-card transition relative overflow-hidden group"
              >
                {/* Out badge */}
                {isOut && (
                  <span className="absolute top-2 end-2 text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full z-10">
                    {ar ? "نفد" : "Out"}
                  </span>
                )}

                {/* Image or icon */}
                {p.images.length > 0 && imageUrlMap[p.images[0]] ? (
                  <div className="w-full h-36 rounded-xl bg-slate-100 overflow-hidden mb-2.5">
                    <img src={imageUrlMap[p.images[0]]} alt="" className="size-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full h-36 rounded-xl bg-slate-100 flex items-center justify-center mb-2.5">
                    <Package className="size-10 text-slate-300" />
                  </div>
                )}

                {/* Product name */}
                <p className="font-display font-bold text-sm leading-snug line-clamp-2">
                  {ar ? p.ar || p.en : p.en || p.ar}
                </p>

                {/* Brand */}
                {p.brand && (
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{p.brand}</p>
                )}

                {/* Sub-category */}
                {p.subCategory && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold bg-sky-50 text-sky-700 rounded-full px-2 py-0.5">
                    {ar
                      ? subcategoriesOf(p.branch).find((s) => s.en === p.subCategory)?.ar ?? p.subCategory
                      : p.subCategory}
                  </span>
                )}

                {/* Price */}
                <p className="mt-1.5 font-display font-extrabold text-base text-primary">
                  {fmtPrice(p)}
                </p>

                {/* Stock */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Layers className="size-3 text-slate-400" />
                  <span className={cn("text-[11px] font-semibold", isOut ? "text-rose-500" : "text-emerald-600")}>
                    {ar ? "المخزون:" : "Stock:"} {p.stock ?? 0}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 mt-2.5 pt-2.5 border-t border-border">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 h-8 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-sky-100 hover:text-sky-600 flex items-center justify-center gap-1 transition"
                  >
                    <Pencil className="size-3" />
                    {ar ? "تعديل" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="w-8 h-8 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Crop modal */}
      {cropModalOpen && cropFile && (
        <div className="fixed inset-0 z-50 bg-black/70 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-white">
            <button
              type="button"
              onClick={() => { setCropModalOpen(false); setCropFile(null); }}
              className="text-sm font-bold text-slate-600"
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
            <span className="font-display font-bold text-sm">
              {ar ? "اقتصاص الصورة" : "Crop Image"}
            </span>
            <button
              type="button"
              onClick={handleCropComplete}
              className="text-sm font-bold text-primary"
            >
              {ar ? "تأكيد" : "Done"}
            </button>
          </div>
          <div className="flex-1 relative">
            <Cropper
              image={cropFile}
              crop={crop}
              zoom={zoom}
              aspect={4 / 3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, area) => setCroppedAreaPixels(area)}
            />
          </div>
          <div className="bg-white px-4 py-3">
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
      )}
      </div>
  );
}

function OffersPanel({ supplierId }: { supplierId: string }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: offers = [], isLoading } = useOffers(supplierId);
  const upsertOffer = useUpsertOffer();
  const deleteOffer = useDeleteOffer();
  const { user } = useUserRole();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const openAdd = () => {
    setEditing(null);
    setTitle("");
    setDescription("");
    setExpiryDate("");
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
          const path = await uploadProductImage(offerId, imageFile);
          imageUrl = path;
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
        supplierId,
        title: title.trim(),
        description: description.trim(),
        imageUrl,
        expiryDate,
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
          className="w-full h-14 rounded-2xl text-white font-display font-bold flex items-center justify-center gap-2 hover:opacity-95 transition shadow-lg"
          style={{ background: "linear-gradient(to right, #2AA6D1, #4FC3E8)" }}
        >
          <Plus className="size-5" />
          <Megaphone className="size-5" />
          {ar ? "إضافة عرض / إعلان" : "Add Offer / Ad"}
        </button>
      )}

      {showForm && (
        <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-[#1C6FB5] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#1C6FB5]" />
              {editing ? (ar ? "تعديل عرض" : "Edit offer") : ar ? "عرض جديد" : "New offer"}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="size-9 rounded-xl bg-[#E7F4FE] hover:bg-[#DCEEFB] text-[#1C6FB5] flex items-center justify-center transition"
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
              placeholder={ar ? "مثال: خصم 20% على الكومبوزيت" : "e.g. 20% off composites"}
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
                    <ImageOff className="size-8 text-slate-300" />
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
                  ref={fileRef}
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
                : "text-white hover:opacity-95",
            )}
            style={busy ? undefined : { background: "linear-gradient(to right, #2AA6D1, #4FC3E8)" }}
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

function OrdersPanel() {
  const { lang } = useI18n();
  const ar = lang === "ar";
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

function ImplantDashboard() {
  const { lang, toggle } = useI18n();
  const ar = lang === "ar";
  const { role } = useUserRole();
  const companyId = auth.currentUser?.uid ?? role?.userId ?? "";
  const [activeTab, setActiveTab] = useState<"products" | "offers" | "orders">("products");

  const mapsUrl = getMapsUrl(role ?? {});

  return (
    <MobileShell hideBottomNav>
      {/* Header — mirrors SupplyDashboard layout */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <Link
            to="/account"
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
          >
            <div className="size-12 rounded-full bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center overflow-hidden">
              {role?.photoURL ? (
                <img src={role.photoURL} alt="" className="size-full object-cover" />
              ) : (
                <UserCircle2 className="size-7 text-primary" />
              )}
            </div>
            <div>
              <p className="font-display font-bold text-sm text-foreground">
                {role?.name || (ar ? "المستخدم" : "User")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {ar ? "شركة زرعات" : "Implant Company"}
              </p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Phone className="size-3 shrink-0" />
                {role?.phone || (ar ? "لم يتم إضافة رقم هاتف" : "No phone number added")}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-sky-100 hover:text-sky-600 text-xs font-bold transition"
            >
              {lang === "ar" ? "EN" : "AR"}
            </button>
            <button
              type="button"
              onClick={() => auth.signOut()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-xs font-semibold transition"
            >
              <LogOut className="size-4" />
              {ar ? "خروج" : "Logout"}
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
            className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1 hover:text-primary transition-colors cursor-pointer z-50 pointer-events-auto"
          >
            <MapPin className="size-3 shrink-0" />
            {role?.address || (ar ? "عرض الموقع على الخريطة" : "View on map")}
          </a>
        ) : (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            <MapPin className="size-3 shrink-0" />
            {ar ? "لم يتم تحديد العنوان بعد" : "No address set yet"}
          </p>
        )}
      </div>

      {/* Dashboard title — mirrored from supplies */}
      <div className="px-4 pb-1">
        <h2 className="font-display font-extrabold text-lg text-foreground/90">
          {ar ? "لوحة تحكم شركة الزرعات" : "Implant Company Dashboard"}
        </h2>
      </div>

      {/* Tabs — mirror SupplyDashboard exactly */}
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

      {/* Tab content */}
      <div className="px-4 pt-4 pb-6">
        {activeTab === "products" && <ImplantProductsPanel />}
        {activeTab === "offers" && <OffersPanel supplierId={companyId} />}
        {activeTab === "orders" && <OrdersPanel />}
      </div>
    </MobileShell>
  );
}

function ImplantProductsPanel() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: allProducts = [], isLoading } = useProducts();
  const upsert = useUpsertProduct();
  const remove = useDeleteProduct();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [brand, setBrand] = useState("");
  const [materialGrade, setMaterialGrade] = useState("");
  const [surfaceTreatment, setSurfaceTreatment] = useState("");
  const [diameters, setDiameters] = useState<string[]>([]);
  const [lengths, setLengths] = useState<string[]>([]);
  const [connectionType, setConnectionType] = useState("Internal Hex");
  const [recommendedTorque, setRecommendedTorque] = useState("");
  const [kitType, setKitType] = useState<"implant" | "surgical_kit">("implant");
  const [country, setCountry] = useState("KR");
  const [implantType, setImplantType] = useState<"immediate" | "non-immediate">("immediate");
  const [subType, setSubType] = useState<"basal" | "compressive" | "">("");
  const [price, setPrice] = useState("");
  const [catalogUrl, setCatalogUrl] = useState("");
  const [certificationsStr, setCertificationsStr] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const implantProducts = allProducts.filter(
    (p) => p.category === "implant" && p.companyId === auth.currentUser?.uid,
  );

  const connectionOptions = ["Internal Hex", "Conical Connection", "External Hex", "Morse Taper"];

  const countryOptions = [
    { value: "KR", ar: "كورية", en: "Korean" },
    { value: "CH", ar: "سويسرية", en: "Swiss" },
    { value: "DE", ar: "ألمانية", en: "German" },
    { value: "IT", ar: "إيطالية", en: "Italian" },
  ];

  const clearForm = () => {
    setEditing(null);
    setNameAr("");
    setNameEn("");
    setBrand("");
    setPrice("");
    setMaterialGrade("");
    setSurfaceTreatment("");
    setDiameters([]);
    setLengths([]);
    setConnectionType("Internal Hex");
    setRecommendedTorque("");
    setKitType("implant");
    setCountry("KR");
    setImplantType("immediate");
    setSubType("");
    setCatalogUrl("");
    setCertificationsStr("");
    setImageFiles([]);
    setImagePreviews([]);
    setFormError("");
  };

  const openAdd = () => {
    clearForm();
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setNameAr(p.ar);
    setNameEn(p.en);
    setBrand(p.brand);
    setPrice(p.price ? String(p.price) : "");
    setMaterialGrade(p.implantSpec?.materialGrade ?? "");
    setSurfaceTreatment(p.implantSpec?.surfaceTreatment ?? "");
    setDiameters((p.implantSpec?.diameters ?? []).map(String));
    setLengths((p.implantSpec?.lengths ?? []).map(String));
    setConnectionType(p.implantSpec?.connectionType ?? "Internal Hex");
    setRecommendedTorque(p.implantSpec?.recommendedTorque ?? "");
    setKitType(p.implantSpec?.kitType ?? "implant");
    setCountry(p.country || p.implantSpec?.country || "KR");
    setImplantType(p.implantSpec?.implantType ?? "immediate");
    setSubType(p.implantSpec?.subType ?? "");
    setCatalogUrl(p.implantSpec?.catalogUrl ?? "");
    setCertificationsStr((p.implantSpec?.certifications ?? []).join(", "));
    setImageFiles([]);
    setImagePreviews([]);
    setFormError("");
    setShowForm(true);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).slice(0, MAX_PRODUCT_IMAGES - imageFiles.length);
    if (incoming.length === 0) return;
    setImageFiles((prev) => [...prev, ...incoming]);
    setImagePreviews((prev) => [...prev, ...incoming.map((f) => URL.createObjectURL(f))]);
  };

  const removePreview = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeExistingImage = async (path: string) => {
    if (!editing) return;
    await removeProductImage(path);
    setEditing({ ...editing, images: editing.images.filter((img) => img !== path) });
  };

  const toNums = (arr: string[]): number[] =>
    arr.map((s) => parseFloat(s)).filter((n) => !isNaN(n) && n > 0);

  const submit = async () => {
    setFormError("");
    if (!nameAr.trim() || !brand.trim()) {
      setFormError(
        ar ? "الرجاء إدخال اسم المنتج والعلامة التجارية" : "Please enter product name and brand",
      );
      return;
    }

    setBusy(true);
    try {
      const productId = editing?.id ?? crypto.randomUUID();

      const uploadedPaths: string[] = [];
      for (const file of imageFiles) {
        try {
          uploadedPaths.push(await uploadProductImage(productId, file));
        } catch {
          setBusy(false);
          return;
        }
      }

      await upsert.mutateAsync({
        id: productId,
        branch: "implant",
        ar: nameAr.trim(),
        en: nameEn.trim() || nameAr.trim(),
        brand: brand.trim(),
        price: Math.max(0, parseFloat(price) || 0),
        currency: "USD",
        stock: 1,
        inStock: true,
        images: [...(editing?.images ?? []), ...uploadedPaths],
        category: "implant",
        country,
        companyId: auth.currentUser?.uid ?? editing?.companyId ?? "",
        implantSpec: {
          materialGrade: materialGrade.trim() || undefined,
          surfaceTreatment: surfaceTreatment.trim() || undefined,
          diameters: toNums(diameters),
          lengths: toNums(lengths),
          connectionType: connectionType.trim() || undefined,
          recommendedTorque: recommendedTorque.trim() || undefined,
          kitType,
          implantType,
          subType: (subType || undefined) as "basal" | "compressive" | undefined,
          country,
          catalogUrl: catalogUrl.trim() || undefined,
          certifications: certificationsStr
            .split(/[,،\n]+/)
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });

      setShowForm(false);
    } catch (e: any) {
      setFormError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(ar ? "حذف هذا المنتج؟" : "Delete this product?")) return;
    await remove.mutateAsync(p.id);
  };

  const implantPaths = implantProducts.flatMap((p) => p.images);
  const { data: imageUrlMap = {} } = useSignedImageUrls(implantPaths);
  const editingPaths = editing?.images ?? [];
  const { data: editUrlMap = {} } = useSignedImageUrls(editingPaths);

  return (
    <>
      {/* Add button */}
      {!showForm && (
        <button
          onClick={openAdd}
          className="w-full h-14 rounded-2xl text-white font-display font-bold flex items-center justify-center gap-2 hover:opacity-95 transition shadow-lg mb-4"
          style={{ background: "linear-gradient(to right, #2AA6D1, #4FC3E8)" }}
        >
          <Plus className="size-5" />
          {ar ? "إضافة منتج زرعات جديد" : "Add new implant product"}
        </button>
      )}

      {/* Modal form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90svh] overflow-y-auto rounded-3xl p-5 sm:rounded-3xl [&>button]:hidden">
          <DialogHeader className="p-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display font-bold text-lg">
                {editing
                  ? ar
                    ? "تعديل منتج"
                    : "Edit product"
                  : ar
                    ? "منتج زرعات جديد"
                    : "New implant product"}
              </DialogTitle>
              <button
                onClick={() => setShowForm(false)}
                className="size-9 rounded-xl bg-[#E7F4FE] hover:bg-[#DCEEFB] text-[#1C6FB5] flex items-center justify-center transition cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <DialogDescription className="sr-only">
              {editing
                ? ar
                  ? "تعديل تفاصيل المنتج"
                  : "Edit product details"
                : ar
                  ? "إضافة زرعة جديدة"
                  : "إضافة زرعة جديدة"}
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "اسم المنتج (عربي)" : "Product name (Arabic)"}
            </label>
            <input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={ar ? "مثال: AnyRidge" : "e.g. AnyRidge"}
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "اسم المنتج (انكليزي)" : "Product name (English)"}
            </label>
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              placeholder="Optional"
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "العلامة التجارية" : "Brand"}
            </label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder={ar ? "مثال: MegaGen" : "e.g. MegaGen"}
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "السعر الابتدائي (دولار)" : "Starting price (USD)"}
            </label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              dir="ltr"
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "نوع المنتج" : "Product type"}
            </label>
            <div className="flex gap-2">
              {(["implant", "surgical_kit"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setKitType(t)}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-semibold border-2 transition-all duration-300",
                    kitType === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100",
                  )}
                >
                  {t === "implant"
                    ? ar
                      ? "زرعة"
                      : "Implant"
                    : ar
                      ? "حقيبة جراحية"
                      : "Surgical Kit"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "درجة المادة" : "Material grade"}
            </label>
            <input
              value={materialGrade}
              onChange={(e) => setMaterialGrade(e.target.value)}
              placeholder={ar ? "مثال: Titanium Grade 5" : "e.g. Titanium Grade 5"}
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "معالجة السطح" : "Surface treatment"}
            </label>
            <input
              value={surfaceTreatment}
              onChange={(e) => setSurfaceTreatment(e.target.value)}
              placeholder={ar ? "مثال: SLA" : "e.g. SLA Surface"}
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "نوع الاتصال" : "Connection type"}
            </label>
            <select
              value={connectionType}
              onChange={(e) => setConnectionType(e.target.value)}
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            >
              {connectionOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "بلد الصنع" : "Manufacturing country"}
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            >
              {countryOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {ar ? c.ar : c.en} ({c.value})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "التصنيف" : "Classification"}
            </label>
            <div className="flex gap-2">
              {(
                [
                  { value: "immediate" as const, ar: "فورية", en: "Immediate" },
                  { value: "non-immediate" as const, ar: "غير فورية", en: "Non-immediate" },
                ] as const
              ).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setImplantType(t.value)}
                  className={cn(
                    "flex-1 h-11 rounded-xl text-sm font-semibold border-2 transition-all duration-300",
                    implantType === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100",
                  )}
                >
                  {ar ? t.ar : t.en}
                </button>
              ))}
            </div>
          </div>

          {implantType === "immediate" && (
            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                {ar ? "النوع الفرعي" : "Sub-type"}
              </label>
              <div className="flex gap-2">
                {(
                  [
                    { value: "basal" as const, ar: "Basal", en: "Basal" },
                    { value: "compressive" as const, ar: "Compressive", en: "Compressive" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setSubType(t.value)}
                    className={cn(
                      "flex-1 h-11 rounded-xl text-sm font-semibold border-2 transition-all duration-300",
                      subType === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100",
                    )}
                  >
                    {ar ? t.ar : t.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                {ar ? "الأقطار (مم)" : "Diameters (mm)"}
              </label>
              <TagInput
                value={diameters}
                onChange={setDiameters}
                prefix="Ø"
                placeholder="3.3"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                {ar ? "الأطوال (مم)" : "Lengths (mm)"}
              </label>
              <TagInput
                value={lengths}
                onChange={setLengths}
                suffix="mm"
                placeholder="10"
              />
            </div>
          </div>

          {kitType === "surgical_kit" && (
            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                {ar ? "عزم الدوران الموصى به" : "Recommended torque"}
              </label>
              <input
                value={recommendedTorque}
                onChange={(e) => setRecommendedTorque(e.target.value)}
                placeholder={ar ? "مثال: 35-45 Ncm" : "e.g. 35-45 Ncm"}
                dir="ltr"
                className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "رابط الكتالوج" : "Catalog URL"}
            </label>
            <input
              value={catalogUrl}
              onChange={(e) => setCatalogUrl(e.target.value)}
              placeholder="https://..."
              dir="ltr"
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "الشهادات (ISO/FDA)" : "Certifications (ISO/FDA)"}
            </label>
            <input
              value={certificationsStr}
              onChange={(e) => setCertificationsStr(e.target.value)}
              placeholder={ar ? "مثال: ISO 13485, FDA" : "e.g. ISO 13485, FDA"}
              className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
            />
          </div>

          {/* Images */}
          <div>
            <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
              {ar ? "صور المنتج" : "Product images"}
            </label>
            {editing && editing.images.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-3">
                {editing.images.map((path) => (
                  <div
                    key={path}
                    className="relative size-16 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden group"
                  >
                    {editUrlMap[path] ? (
                      <img src={editUrlMap[path]} alt="" className="size-full object-cover" />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <Package className="size-5 text-slate-300" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingImage(path)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                    >
                      <Trash2 className="size-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageFiles.length + (editing?.images.length ?? 0) < MAX_PRODUCT_IMAGES && (
              <label className="w-full h-32 rounded-xl border-2 border-dashed border-[#D3E8F7] bg-[#F5FAFE] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                <Upload className="size-6 text-slate-400 group-hover:text-primary transition" />
                <p className="text-xs text-slate-400 group-hover:text-primary transition font-medium">
                  {ar ? "اضغط لرفع صورة" : "Tap to upload image"}
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            )}
            {imagePreviews.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {imagePreviews.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative size-16 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden shadow-sm"
                  >
                    <img src={url} alt="" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePreview(idx)}
                      className="absolute top-0.5 end-0.5 size-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
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
                : "text-white hover:opacity-95",
            )}
            style={busy ? undefined : { background: "linear-gradient(to right, #2AA6D1, #4FC3E8)" }}
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
                  ? "إضافة المنتج"
                  : "Add product"}
          </button>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : implantProducts.length === 0 && !showForm ? (
        <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
          <Package className="size-14 mb-4 opacity-20" />
          <p className="font-display font-bold text-lg text-slate-400">
            {ar ? "لا توجد منتجات زرعات بعد" : "No implant products yet"}
          </p>
          <p className="text-sm mt-1 max-w-xs text-slate-400">
            {ar
              ? "اضغط على 'إضافة منتج' لإضافة أول منتج زرعات"
              : "Tap 'Add new implant product' to add your first product"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {implantProducts.map((p) => {
            const spec = p.implantSpec;
            const isKit = spec?.kitType === "surgical_kit";
            const imgUrl =
              p.images.length > 0 && imageUrlMap[p.images[0]] ? imageUrlMap[p.images[0]] : null;
            const diams = spec?.diameters ?? [];
            const lens = spec?.lengths ?? [];
            const countryLabel = countryOptions.find(
              (c) => c.value === (p.country || spec?.country),
            );
            return (
              <div
                key={p.id}
                className="bg-card border border-border rounded-2xl p-4 shadow-soft space-y-3"
              >
                <div className="flex gap-3">
                  <div className="size-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <Package className="size-6 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm">
                      {ar ? p.ar || p.en : p.en || p.ar}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.brand}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {countryLabel && (
                        <span className="inline-block text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {ar ? countryLabel.ar : countryLabel.en}
                        </span>
                      )}
                      {spec?.implantType && (
                        <span
                          className={cn(
                            "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            spec.implantType === "immediate"
                              ? "bg-[oklch(0.93_0.06_30)] text-[oklch(0.5_0.18_30)]"
                              : "bg-[oklch(0.93_0.06_250)] text-[oklch(0.45_0.18_256)]",
                          )}
                        >
                          {spec.implantType === "immediate"
                            ? ar
                              ? "فورية"
                              : "Immediate"
                            : ar
                              ? "غير فورية"
                              : "Non-immediate"}
                        </span>
                      )}
                      {isKit && (
                        <span className="inline-block text-[10px] font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">
                          {ar ? "حقيبة جراحية" : "Surgical Kit"}
                        </span>
                      )}
                      {spec?.connectionType && !isKit && (
                        <span className="inline-block text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {spec.connectionType}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(spec?.materialGrade || spec?.surfaceTreatment) && (
                  <div className="flex gap-2 flex-wrap">
                    {spec.materialGrade && (
                      <span className="text-[10px] font-semibold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-200">
                        {spec.materialGrade}
                      </span>
                    )}
                    {spec.surfaceTreatment && (
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">
                        {spec.surfaceTreatment}
                      </span>
                    )}
                  </div>
                )}

                {(diams.length > 0 || lens.length > 0) && (
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
                )}

                {isKit && spec?.recommendedTorque && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex items-center gap-2">
                    <Shield className="size-4 text-amber-600" />
                    <span className="font-bold text-amber-800">
                      {ar ? "عزم الدوران الموصى به:" : "Recommended torque:"}{" "}
                      {spec.recommendedTorque}
                    </span>
                  </div>
                )}

                {(spec?.catalogUrl || spec?.certifications?.length) && (
                  <div className="space-y-1.5 pt-1 border-t border-border">
                    {spec?.catalogUrl && (
                      <a
                        href={spec.catalogUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-700 font-semibold hover:bg-sky-100 transition"
                      >
                        <Download className="size-4" />
                        {ar ? "تحميل الكتالوج الرسمي (PDF)" : "Download official catalog (PDF)"}
                        <Link2 className="size-3 ml-auto" />
                      </a>
                    )}
                    {spec?.certifications && spec.certifications.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        <Shield className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        {spec.certifications.map((cert, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {p.price > 0 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <DollarSign className="size-3.5 text-green-600" />
                    <span className="text-sm font-bold text-green-700">${p.price.toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {ar ? "السعر الابتدائي" : "starting price"}
                    </span>
                  </div>
                )}

                <div className="flex gap-1 pt-2 border-t border-border">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 h-8 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-sky-100 hover:text-sky-600 flex items-center justify-center gap-1 transition"
                  >
                    <Pencil className="size-3" />
                    {ar ? "تعديل" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="w-8 h-8 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

const DEFAULT_CITY = "بغداد";

type CompanyCategory = "supplies" | "implants";

type CompanyItem = {
  id: string;
  name: { ar: string; en: string };
  category: CompanyCategory;
  cityId: string;
  rating: number;
  itemsCount: number;
  area: { ar: string; en: string };
  route: string;
  params: Record<string, string>;
};

function cityIdFromName(nameEn: string): string {
  const match = CITIES.find((c) => c.en.toLowerCase() === nameEn.toLowerCase());
  return match ? match.id : "baghdad";
}

function resolveCityId(cityValue: string | undefined | null): string {
  if (!cityValue) return "baghdad";
  const trimmed = cityValue.trim();
  const lower = trimmed.toLowerCase();
  const match = CITIES.find(
    (c) => c.id === lower || c.en.toLowerCase() === lower || c.ar === trimmed,
  );
  return match ? match.id : "baghdad";
}

function getCityName(cityId: string, ar: boolean): string {
  const match = CITIES.find((c) => c.id === cityId);
  return match ? (ar ? match.ar : match.en) : ar ? "بغداد" : "Baghdad";
}

function BrowseSupplies() {
  const { t, lang, dir } = useI18n();
  const Chevron = dir === "rtl" ? ChevronLeft : ChevronRight;
  const { offices: OFFICES, branches: BRANCHES } = useAdminStore();
  const { data: PRODUCTS = [] } = useProducts();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"default" | "rating" | "items">("default");
  const [city, setCity] = useState<string>("all");

  const { data: implantCompanies = [] } = useQuery({
    queryKey: ["supplies-implant-companies"],
    queryFn: async (): Promise<CompanyItem[]> => {
      try {
        const snap = await getDocs(collection(db, "user_roles"));
        const results: CompanyItem[] = [];
        for (const d of snap.docs) {
          const u = d.data() as UserRoleDoc;
          const matchesImplant =
            u.accountType === "implant" || (u.accountType as string) === "dental_implants";
          if (!matchesImplant) continue;

          if (!u.city) {
            updateDoc(d.ref, { city: DEFAULT_CITY }).catch(() => {});
          }

          results.push({
            id: u.userId,
            name: { ar: u.name || "", en: u.name || "" },
            category: "implants" as CompanyCategory,
            cityId: resolveCityId(u.city || DEFAULT_CITY),
            rating: 0,
            itemsCount: 0,
            area: { ar: "", en: "" },
            route: "/profile/$accountId",
            params: { accountId: u.userId },
          });
        }
        return results;
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  const { data: firestoreSupplies = [] } = useQuery({
    queryKey: ["supplies-firestore-supplies"],
    queryFn: async (): Promise<CompanyItem[]> => {
      try {
        const snap = await getDocs(collection(db, "user_roles"));
        const results: CompanyItem[] = [];
        for (const d of snap.docs) {
          const u = d.data() as UserRoleDoc;
          const matchesSupply =
            u.accountType === "supply" || (u.accountType as string) === "medical_supplies";
          if (!matchesSupply) continue;

          if (!u.city) {
            updateDoc(d.ref, { city: DEFAULT_CITY }).catch(() => {});
          }

          results.push({
            id: u.userId,
            name: { ar: u.name || "", en: u.name || "" },
            category: "supplies" as CompanyCategory,
            cityId: resolveCityId(u.city || DEFAULT_CITY),
            rating: 0,
            itemsCount: 0,
            area: { ar: "", en: "" },
            route: "/profile/$accountId",
            params: { accountId: u.userId },
          });
        }
        return results;
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });

  const suppliesCompanies: CompanyItem[] = useMemo(() => {
    const fromOffices = OFFICES.map((o) => ({
      id: o.id,
      name: { ar: o.ar, en: o.en },
      category: "supplies" as CompanyCategory,
      cityId: cityIdFromName(o.city.en),
      rating: o.rating,
      itemsCount: o.itemsCount,
      area: o.area,
      route: "/supplies/$officeId",
      params: { officeId: o.id },
    }));
    return [...fromOffices, ...firestoreSupplies];
  }, [OFFICES, firestoreSupplies]);

  const allCompanies = useMemo<CompanyItem[]>(() => {
    return suppliesCompanies;
  }, [suppliesCompanies]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = allCompanies.filter((item) => {
      if (city !== "all" && item.cityId !== city) return false;
      if (!needle) return true;
      return (
        item.name.ar.toLowerCase().includes(needle) ||
        item.name.en.toLowerCase().includes(needle) ||
        getCityName(item.cityId, true).includes(needle) ||
        getCityName(item.cityId, false).toLowerCase().includes(needle) ||
        item.area.ar.toLowerCase().includes(needle) ||
        item.area.en.toLowerCase().includes(needle)
      );
    });
    if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    if (sort === "items") list = [...list].sort((a, b) => b.itemsCount - a.itemsCount);
    return list;
  }, [q, sort, city, allCompanies]);

  const chips: { key: typeof sort; ar: string; en: string }[] = [
    { key: "default", ar: "الكل", en: "All" },
    { key: "rating", ar: "الأعلى تقييماً", en: "Top rated" },
    { key: "items", ar: "الأكثر تنوعاً", en: "Most items" },
  ];

  return (
    <MobileShell>
      <TopBar
        title={t("supplies")}
        showBack
        showSearch
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder={lang === "ar" ? "ابحث عن شركة أو مدينة…" : "Search company or city…"}
      />
      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-2">
          <button
            onClick={() => setCity("all")}
            className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition ${
              city === "all"
                ? "bg-foreground text-background border-foreground"
                : "bg-card text-foreground border-border hover:bg-accent"
            }`}
          >
            {lang === "ar" ? "كل المدن" : "All cities"}
          </button>
          {CITIES.map((c) => {
            const active = city === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCity(c.id)}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition ${
                  active
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-foreground border-border hover:bg-accent"
                }`}
              >
                {lang === "ar" ? c.ar : c.en}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-1">
          {chips.map((c) => (
            <button
              key={c.key}
              onClick={() => setSort(c.key)}
              className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition ${
                sort === c.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:bg-accent"
              }`}
            >
              {lang === "ar" ? c.ar : c.en}
            </button>
          ))}
        </div>

        <h2 className="font-display font-bold text-base mb-3">{t("offices_title")}</h2>
        {filtered.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <SearchX className="size-8 mb-2" />
            <p className="text-sm">{lang === "ar" ? "لا توجد نتائج" : "No results"}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => (
              <li key={`${item.category}-${item.id}`}>
                <Link
                  to={item.route}
                  params={item.params}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 shadow-soft hover:shadow-card transition"
                >
                  <span className="size-12 rounded-2xl bg-primary-soft text-primary font-display font-extrabold flex items-center justify-center text-lg">
                    {(lang === "ar" ? item.name.ar : item.name.en).slice(0, 1)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-foreground truncate">
                      {lang === "ar" ? item.name.ar : item.name.en}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {item.area.ar
                          ? `${getCityName(item.cityId, lang === "ar")} - ${item.area.ar}`
                          : getCityName(item.cityId, lang === "ar")}
                      </span>
                      {item.rating > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-500">
                          <Star className="size-3 fill-current" />
                          <span className="font-semibold">{item.rating}</span>
                        </span>
                      )}
                      {item.itemsCount > 0 && (
                        <span>
                          {item.itemsCount}+ {lang === "ar" ? "صنف" : "items"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Chevron className="size-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
