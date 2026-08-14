import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { TagInput } from "@/components/TagInput";
import { BoneGraftModal } from "@/components/BoneGraftModal";
import { COUNTRIES, SURGICAL_GUIDE_COMPANIES, IMPLANTS } from "@/data/implants";
import {
  useProducts,
  useUpsertProduct,
  useDeleteProduct,
  uploadProductImage,
  removeProductImage,
  useSignedImageUrls,
  MAX_PRODUCT_IMAGES,
  COUNTRY_CODE_TO_SLUG,
  type Product,
  type ProductAccessory,
  type Currency,
} from "@/lib/products";
import { useOffers, useUpsertOffer, useDeleteOffer, type Offer } from "@/lib/offers";
import { useOrders } from "@/lib/orders";
import { useUserRole } from "@/lib/useAuth";
import { auth, db } from "@/integrations/firebase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CountryCombobox } from "@/components/CountryCombobox";
import { ALL_COUNTRIES, countryCodeToFlag } from "@/data/countries";
import {
  Crosshair,
  Search,
  UserCircle2,
  Phone,
  MapPin,
  LogOut,
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
  Image,
  Paperclip,
  GripVertical,
  MoreHorizontal,
  Settings,
  SlidersHorizontal,
  ChevronRight,
  Bone,
  Stethoscope,
} from "lucide-react";

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
    <MobileShell hideBottomNav className="bg-transparent">
      <div
        className="min-h-full"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px), linear-gradient(to bottom right, #f8fafc, #ffffff, #eef2ff)",
          backgroundSize: "20px 20px, 100% 100%",
        }}
      >
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <Link
              to="/account"
              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition"
            >
              <div className="size-12 rounded-full bg-primary/10 ring-2 ring-primary/20 flex items-center justify-center overflow-hidden">
                <UserCircle2 className="size-7 text-primary" />
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

type AccessoryRow = {
  key: string;
  imageFile: File | null;
  imagePreview: string;
  existingImageUrl: string;
  type: string;
  name: string;
  specs: string;
  price: string;
  currency: Currency;
};

function emptyAccessory(): AccessoryRow {
  return {
    key: crypto.randomUUID(),
    imageFile: null,
    imagePreview: "",
    existingImageUrl: "",
    type: "Abutment",
    name: "",
    specs: "",
    price: "",
    currency: "USD",
  };
}

function ImplantProductsPanel() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: allProducts = [], isLoading } = useProducts();
  const upsert = useUpsertProduct();
  const remove = useDeleteProduct();

  const companyId = auth.currentUser?.uid ?? "";

  const implantProducts = allProducts.filter(
    (p) => p.category === "implant" && p.companyId === companyId,
  );

  const [showForm, setShowForm] = useState(false);
  const [showBoneGraft, setShowBoneGraft] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [productType, setProductType] = useState<"main_implant" | "accessory">("main_implant");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [country, setCountry] = useState("KR");
  const [line, setLine] = useState("");
  const [selectedDiameters, setSelectedDiameters] = useState<string[]>([]);
  const [selectedLengths, setSelectedLengths] = useState<string[]>([]);
  const [accessoryRows, setAccessoryRows] = useState<AccessoryRow[]>([]);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<Currency>("USD");
  const [minOrderQty, setMinOrderQty] = useState("");
  const [stock, setStock] = useState("100");
  const [description, setDescription] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [parentId, setParentId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const countryByCode = useMemo(
    () => Object.fromEntries(ALL_COUNTRIES.map((c) => [c.code, c])),
    [],
  );

  const brandSuggestions = useMemo(() => [...new Set(IMPLANTS.map((i) => i.name))], []);

  const clearForm = () => {
    setEditing(null);
    setName("");
    setBrand("");
    setCountry("KR");
    setLine("");
    setSelectedDiameters([]);
    setSelectedLengths([]);
    setAccessoryRows([]);
    setPrice("");
    setCurrency("USD");
    setMinOrderQty("");
    setStock("100");
    setDescription("");
    setAttachmentFiles([]);
    setAttachmentNames([]);
    setImageFiles([]);
    setImagePreviews([]);
    setFormError("");
    setProductType("main_implant");
    setParentId("");
  };

  const openAdd = () => {
    clearForm();
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.ar);
    setBrand(p.brand);
    setCountry(p.country || p.implantSpec?.country || "KR");
    setLine(p.implantSpec?.connectionType || "");
    setSelectedDiameters((p.implantSpec?.diameters ?? []).map(String));
    setSelectedLengths((p.implantSpec?.lengths ?? []).map(String));
    setAccessoryRows(
      (p.accessories || []).map((a) => ({
        key: crypto.randomUUID(),
        imageFile: null,
        imagePreview: "",
        existingImageUrl: a.imageUrl || "",
        type: a.type || "Abutment",
        name: a.name || "",
        specs: a.specs || "",
        price: a.price ? String(a.price) : "",
        currency: a.currency || "USD",
      })),
    );
    setPrice(p.price ? String(p.price) : "");
    setStock(p.stock ? String(p.stock) : "100");
    setCurrency(p.currency || "USD");
    setMinOrderQty("");
    setDescription(p.description || "");
    setAttachmentFiles([]);
    setAttachmentNames([]);
    setImageFiles([]);
    setImagePreviews([]);
    setFormError("");
    setProductType(p.productType || "main_implant");
    setParentId(p.parentId || "");
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

  const addAccessoryRow = () => {
    setAccessoryRows((prev) => [...prev, emptyAccessory()]);
  };

  const removeAccessoryRow = (key: string) => {
    setAccessoryRows((prev) => prev.filter((a) => a.key !== key));
  };

  const updateAccessoryRow = (key: string, patch: Partial<AccessoryRow>) => {
    setAccessoryRows((prev) => prev.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  };

  const submit = async () => {
    setFormError("");
    if (!name.trim()) {
      setFormError(ar ? "الرجاء إدخال اسم الزرعة" : "Please enter the implant name");
      return;
    }
    if (!brand.trim()) {
      setFormError(ar ? "الرجاء إدخال اسم الشركة" : "Please enter the company name");
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

      const savedAccessories: ProductAccessory[] = accessoryRows
        .filter((a) => a.type && a.name.trim())
        .map((a) => ({
          type: a.type,
          name: a.name.trim(),
          specs: a.specs.trim(),
          price: Math.max(0, parseFloat(a.price) || 0),
          imageUrl: a.existingImageUrl || "",
          currency: a.currency,
        }));

      await upsert.mutateAsync({
        id: productId,
        branch: "implant",
        ar: name.trim(),
        en: name.trim(),
        brand: brand.trim(),
        price: Math.max(0, parseFloat(price) || 0),
        currency,
        stock: Math.max(0, parseInt(stock) || 0),
        inStock: parseInt(stock) > 0,
        images: [...(editing?.images ?? []), ...uploadedPaths],
        category: "implant",
        country: productType === "accessory" ? undefined : country,
        countryFlag: productType === "accessory" ? undefined : countryCodeToFlag(country),
        companyId: auth.currentUser?.uid ?? editing?.companyId ?? "",
        implantSpec:
          productType === "accessory"
            ? undefined
            : {
                country,
                connectionType: line.trim() || undefined,
                diameters: selectedDiameters.length > 0
                  ? selectedDiameters.map(Number).filter((n) => !isNaN(n) && n > 0)
                  : undefined,
                lengths: selectedLengths.length > 0
                  ? selectedLengths.map(Number).filter((n) => !isNaN(n) && n > 0)
                  : undefined,
              },
        accessories: savedAccessories.length > 0 ? savedAccessories : undefined,
        productType,
        parentId: productType === "accessory" ? parentId || null : null,
        description: description.trim() || undefined,
      });

      setShowForm(false);
    } catch (e: any) {
      setFormError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
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

  const editingImagePaths = editing?.images ?? [];
  const { data: editUrlMap = {} } = useSignedImageUrls(editingImagePaths);

  const previewImageUrl = useMemo(() => {
    if (imagePreviews.length > 0) return imagePreviews[0];
    if (editing && editing.images.length > 0) {
      const firstPath = editing.images[0];
      return editUrlMap[firstPath] || null;
    }
    return null;
  }, [imagePreviews, editing, editUrlMap]);

  const groupedProducts = useMemo(() => {
    const mainImplants = implantProducts.filter(
      (p) => !p.productType || p.productType === "main_implant",
    );
    const accessories = implantProducts.filter((p) => p.productType === "accessory");
    const childrenByParent: Record<string, Product[]> = {};
    for (const acc of accessories) {
      if (acc.parentId) {
        if (!childrenByParent[acc.parentId]) childrenByParent[acc.parentId] = [];
        childrenByParent[acc.parentId].push(acc);
      }
    }
    return mainImplants.map((p) => ({
      product: p,
      children: childrenByParent[p.id] || [],
    }));
  }, [implantProducts]);

  if (selectedProduct) {
    return (
      <ImplantDetailView
        product={selectedProduct}
        onBack={() => setSelectedProduct(null)}
        onSaved={(updated) => {
          setSelectedProduct(updated);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!showForm && (
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
      )}

      {showForm && (
        <>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition mb-1"
          >
            <ArrowLeft className="size-4" />
            {ar ? "رجوع إلى المنتجات" : "Back to products"}
          </button>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-display font-bold text-xl text-foreground">
                {ar ? "إضافة منتج جديد" : "Add New Product"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {ar ? "أضف زرعة وإكسسواراتها بسهولة" : "Add implant and its accessories easily"}
              </p>
            </div>
            <div className="flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setProductType("main_implant")}
                className={cn(
                  "flex items-center gap-1.5 h-10 px-5 rounded-xl text-sm font-bold transition",
                  productType === "main_implant"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <Settings className="size-4" />
                {ar ? "زرعة" : "Implant"}
              </button>
              <button
                type="button"
                onClick={() => setProductType("accessory")}
                className={cn(
                  "flex items-center gap-1.5 h-10 px-5 rounded-xl text-sm font-bold transition",
                  productType === "accessory"
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
              >
                <Paperclip className="size-4" />
                {ar ? "إكسسوار" : "Accessory"}
              </button>
            </div>
          </div>

          {productType === "main_implant" ? (
            <>
              <div className="bg-white border border-border/50 rounded-3xl p-5 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      {ar ? "صورة المنتج" : "Product Image"}
                    </label>

                    {editing && editing.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {editing.images.map((path) => (
                          <div
                            key={path}
                            className="relative size-20 rounded-xl bg-slate-50 border border-border overflow-hidden group"
                          >
                            {editUrlMap[path] ? (
                              <img
                                src={editUrlMap[path]}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="size-full flex items-center justify-center">
                                <Package className="size-6 text-slate-300" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removeExistingImage(path)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                            >
                              <Trash2 className="size-5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {imageFiles.length + (editing?.images.length ?? 0) < MAX_PRODUCT_IMAGES && (
                      <label className="w-full aspect-square max-w-[280px] rounded-2xl border-2 border-dashed border-border bg-slate-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                        <Image className="size-10 text-slate-300 group-hover:text-primary transition" />
                        <p className="text-xs text-slate-400 group-hover:text-primary transition font-semibold">
                          {ar ? "إضافة صورة (PNG, JPG)" : "Add Image (PNG, JPG)"}
                        </p>
                        <p className="text-[10px] text-slate-300">
                          {imageFiles.length + (editing?.images.length ?? 0)}/{MAX_PRODUCT_IMAGES}
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
                            className="relative size-20 rounded-xl bg-slate-50 border border-border overflow-hidden shadow-sm"
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

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        {ar ? "اسم الزرعة" : "Implant Name"}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={ar ? "مثال: Straumann BLX" : "e.g. Straumann BLX"}
                        className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        {ar ? "الشركة المصنعة" : "Manufacturer"}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder={ar ? "مثال: Straumann" : "e.g. Straumann"}
                        list="brand-suggestions"
                        className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      />
                      <datalist id="brand-suggestions">
                        {brandSuggestions.map((b) => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        {ar ? "بلد الصنع" : "Country of Manufacture"}
                      </label>
                      <CountryCombobox value={country} onChange={setCountry} lang={lang} />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        {ar ? "خط المنتج (اختياري)" : "Product Line (Optional)"}
                      </label>
                      <input
                        value={line}
                        onChange={(e) => setLine(e.target.value)}
                        placeholder={ar ? "مثال: BLX" : "e.g. BLX"}
                        className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border/50 rounded-3xl p-5 space-y-4 shadow-md">
                <h3 className="font-display font-bold text-base text-foreground">
                  {ar ? "أطوال وأقطار الزرعة" : "Implant Dimensions"}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="flex items-center justify-center">
                    <div className="relative w-full max-w-[200px] aspect-[3/4] max-h-64 bg-slate-100 rounded-2xl border-2 border-slate-200 overflow-hidden">
                      {previewImageUrl ? (
                        <>
                          <img
                            src={previewImageUrl}
                            alt=""
                            className="size-full object-contain p-4"
                          />
                          <svg
                            className="absolute inset-0 size-full pointer-events-none"
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                          >
                            <line
                              x1="18"
                              y1="12"
                              x2="18"
                              y2="88"
                              stroke="currentColor"
                              strokeWidth="0.5"
                              strokeDasharray="3 2"
                              className="text-primary/50"
                            />
                            <line
                              x1="12"
                              y1="12"
                              x2="24"
                              y2="12"
                              stroke="currentColor"
                              strokeWidth="0.5"
                              className="text-primary/40"
                            />
                            <line
                              x1="12"
                              y1="88"
                              x2="24"
                              y2="88"
                              stroke="currentColor"
                              strokeWidth="0.5"
                              className="text-primary/40"
                            />
                            <text
                              x="10"
                              y="50"
                              textAnchor="middle"
                              transform="rotate(-90,10,50)"
                              fill="currentColor"
                              className="text-primary/60"
                              fontSize="3.5"
                              fontWeight="bold"
                            >
                              {ar ? "الطول" : "Length"}
                            </text>
                            <line
                              x1="28"
                              y1="82"
                              x2="75"
                              y2="82"
                              stroke="currentColor"
                              strokeWidth="0.5"
                              strokeDasharray="3 2"
                              className="text-primary/50"
                            />
                            <line
                              x1="28"
                              y1="77"
                              x2="28"
                              y2="87"
                              stroke="currentColor"
                              strokeWidth="0.5"
                              className="text-primary/40"
                            />
                            <line
                              x1="75"
                              y1="77"
                              x2="75"
                              y2="87"
                              stroke="currentColor"
                              strokeWidth="0.5"
                              className="text-primary/40"
                            />
                            <text
                              x="52"
                              y="95"
                              textAnchor="middle"
                              fill="currentColor"
                              className="text-primary/60"
                              fontSize="3.5"
                              fontWeight="bold"
                            >
                              {ar ? "القطر" : "Diameter"}
                            </text>
                          </svg>
                        </>
                      ) : (
                        <>
                          <div className="absolute inset-0 grid grid-cols-3 grid-rows-4 opacity-30">
                            {Array.from({ length: 12 }).map((_, i) => (
                              <div key={i} className="border border-slate-300" />
                            ))}
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                            <Image className="size-7 text-slate-300" />
                            <p className="text-[10px] text-slate-400 font-medium text-center px-2 leading-tight">
                              {ar
                                ? "ارفع صورة للزرعة لعرضها هنا"
                                : "Upload implant image to preview"}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                        {ar ? "الأقطار (mm):" : "Diameters (mm):"}
                      </label>
                      <TagInput
                        value={selectedDiameters}
                        onChange={setSelectedDiameters}
                        prefix="Ø"
                        placeholder="3.3"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                        {ar ? "الأطوال (mm):" : "Lengths (mm):"}
                      </label>
                      <TagInput
                        value={selectedLengths}
                        onChange={setSelectedLengths}
                        suffix="mm"
                        placeholder="10"
                      />
                    </div>

                    {selectedDiameters.length > 0 || selectedLengths.length > 0 ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                        <div className="size-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                        <span className="text-sm font-semibold text-blue-700">
                          {ar ? "المقاس المحدد:" : "Selected size:"}{" "}
                          {selectedDiameters.length > 0
                            ? `${ar ? "قطر" : "Ø"} ${[...selectedDiameters].sort((a, b) => Number(a) - Number(b)).join(" / ")} mm`
                            : ""}
                          {selectedDiameters.length > 0 && selectedLengths.length > 0 ? " × " : ""}
                          {selectedLengths.length > 0
                            ? `${ar ? "طول" : "L"} ${[...selectedLengths].sort((a, b) => Number(a) - Number(b)).join(" / ")} mm`
                            : ""}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
                        <span className="text-sm text-slate-400">
                          {ar ? "أدخل قطرًا وطولًا للزرعة" : "Enter implant diameter and length"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-border/50 rounded-3xl p-5 shadow-md">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <div>
                    <h3 className="font-display font-bold text-base text-foreground">
                      {ar ? "الإكسسوارات" : "Accessories"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ar
                        ? "أضف الإكسسوارات المرتبطة بهذه الزرعة"
                        : "Add accessories linked to this implant"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addAccessoryRow}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition shadow-sm"
                  >
                    <Plus className="size-4" />
                    {ar ? "إضافة إكسسوار" : "Add Accessory"}
                  </button>
                </div>

                {accessoryRows.length > 0 ? (
                  <div className="overflow-x-auto -mx-1">
                    <div className="min-w-[700px]">
                      <div className="grid grid-cols-[36px_110px_1fr_1fr_140px_44px] gap-2 px-3 py-2.5 bg-slate-50 rounded-t-xl border-b-2 border-border">
                        <span className="text-[10px] font-bold text-muted-foreground flex items-center">
                          <GripVertical className="size-3" />
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {ar ? "نوع الإكسسوار" : "Accessory Type"}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {ar ? "اسم الإكسسوار" : "Accessory Name"}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {ar ? "المواصفات" : "Specifications"}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {ar ? "السعر" : "Price"}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground text-center">
                          {ar ? "إجراء" : "Action"}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {accessoryRows.map((acc) => {
                          const typeColors: Record<string, string> = {
                            Abutment: "bg-blue-100 text-blue-700 border-blue-200",
                            "Healing Screw": "bg-green-100 text-green-700 border-green-200",
                            "Scan Body": "bg-purple-100 text-purple-700 border-purple-200",
                            "Digital Analog": "bg-orange-100 text-orange-700 border-orange-200",
                          };
                          return (
                            <div
                              key={acc.key}
                              className="grid grid-cols-[36px_110px_1fr_1fr_140px_44px] gap-2 px-3 py-2.5 items-center bg-white hover:bg-slate-50/50 transition"
                            >
                              <div className="flex items-center justify-center">
                                {acc.imagePreview ? (
                                  <div className="relative size-7 rounded-md overflow-hidden border border-border">
                                    <img
                                      src={acc.imagePreview}
                                      alt=""
                                      className="size-full object-cover"
                                    />
                                  </div>
                                ) : acc.existingImageUrl ? (
                                  <div className="size-7 rounded-md overflow-hidden border border-border bg-slate-200">
                                    <Package className="size-3 text-slate-400 m-auto mt-1.5" />
                                  </div>
                                ) : (
                                  <label className="flex items-center justify-center size-7 rounded-md border border-dashed border-slate-300 bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition">
                                    <Upload className="size-3 text-slate-300" />
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        updateAccessoryRow(acc.key, {
                                          imageFile: file,
                                          imagePreview: URL.createObjectURL(file),
                                        });
                                      }}
                                    />
                                  </label>
                                )}
                              </div>

                              <select
                                value={acc.type}
                                onChange={(e) =>
                                  updateAccessoryRow(acc.key, { type: e.target.value })
                                }
                                className={cn(
                                  "w-full h-9 rounded-lg border px-2 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-primary/20 transition",
                                  typeColors[acc.type] || "bg-white border-border",
                                )}
                              >
                                <option value="Abutment">Abutment</option>
                                <option value="Healing Screw">Healing Screw</option>
                                <option value="Scan Body">Scan Body</option>
                                <option value="Digital Analog">Digital Analog</option>
                              </select>

                              <input
                                value={acc.name}
                                onChange={(e) =>
                                  updateAccessoryRow(acc.key, { name: e.target.value })
                                }
                                placeholder={ar ? "اسم الإكسسوار" : "Accessory name"}
                                className="w-full h-9 rounded-lg bg-white border border-border px-2 text-[11px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                              />

                              <input
                                value={acc.specs}
                                onChange={(e) =>
                                  updateAccessoryRow(acc.key, { specs: e.target.value })
                                }
                                placeholder={ar ? "المواصفات" : "Specifications"}
                                className="w-full h-9 rounded-lg bg-white border border-border px-2 text-[11px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                              />

                              <div className="flex items-center gap-1">
                                <div className="relative flex-1">
                                  <input
                                    type="number"
                                    value={acc.price}
                                    onChange={(e) =>
                                      updateAccessoryRow(acc.key, { price: e.target.value })
                                    }
                                    placeholder="0"
                                    min="0"
                                    step="0.01"
                                    dir="ltr"
                                    className="w-full h-9 rounded-lg bg-white border border-border px-2 text-[11px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                                  />
                                </div>
                                <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => updateAccessoryRow(acc.key, { currency: "USD" })}
                                    className={cn(
                                      "px-1.5 py-0.5 text-[9px] font-semibold transition",
                                      acc.currency === "USD"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-slate-400 hover:text-slate-600",
                                    )}
                                  >
                                    $
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateAccessoryRow(acc.key, { currency: "IQD" })}
                                    className={cn(
                                      "px-1.5 py-0.5 text-[9px] font-semibold transition",
                                      acc.currency === "IQD"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-slate-400 hover:text-slate-600",
                                    )}
                                  >
                                    {ar ? "د.ع" : "IQD"}
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  className="size-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition"
                                >
                                  <MoreHorizontal className="size-3.5 text-slate-400" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeAccessoryRow(acc.key)}
                                  className="size-7 rounded-lg hover:bg-rose-50 flex items-center justify-center transition"
                                >
                                  <Trash2 className="size-3.5 text-rose-500" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">
                    {ar ? "لا توجد إكسسوارات مضافة بعد" : "No accessories added yet"}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="bg-white border border-border/50 rounded-3xl p-5 shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        {ar ? "اسم الإكسسوار" : "Accessory Name"}{" "}
                        <span className="text-rose-500">*</span>
                      </label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={ar ? "مثال: Abutment Straight" : "e.g. Abutment Straight"}
                        className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        {ar ? "نوع الإكسسوار" : "Accessory Type"}
                      </label>
                      <select
                        value={line}
                        onChange={(e) => setLine(e.target.value)}
                        className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition appearance-none"
                      >
                        <option value="">{ar ? "-- اختر النوع --" : "-- Select type --"}</option>
                        <option value="Abutment">Abutment</option>
                        <option value="Healing Screw">Healing Screw</option>
                        <option value="Scan Body">Scan Body</option>
                        <option value="Digital Analog">Digital Analog</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        {ar ? "المواصفات" : "Specifications"}
                      </label>
                      <input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={ar ? "مثال: Titanium Grade 5" : "e.g. Titanium Grade 5"}
                        className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                        {ar ? "ربط مع زرعة أساسية" : "Link to Main Implant"}
                      </label>
                      <select
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition appearance-none"
                      >
                        <option value="">
                          {ar ? "-- اختر الزرعة الأساسية --" : "-- Select main implant --"}
                        </option>
                        {allProducts
                          .filter(
                            (p) =>
                              p.category === "implant" &&
                              p.companyId === companyId &&
                              (!p.productType || p.productType === "main_implant") &&
                              p.id !== editing?.id,
                          )
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.ar || p.en} ({p.brand})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                      {ar ? "صورة المنتج" : "Product Image"}
                    </label>

                    {editing && editing.images.length > 0 && (
                      <div className="flex gap-2 flex-wrap mb-3">
                        {editing.images.map((path) => (
                          <div
                            key={path}
                            className="relative size-16 rounded-xl bg-slate-50 border border-border overflow-hidden group"
                          >
                            {editUrlMap[path] ? (
                              <img
                                src={editUrlMap[path]}
                                alt=""
                                className="size-full object-cover"
                              />
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
                      <label className="w-full h-40 rounded-2xl border-2 border-dashed border-border bg-slate-50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                        <Upload className="size-8 text-slate-400 group-hover:text-primary transition" />
                        <p className="text-xs text-slate-400 group-hover:text-primary transition font-semibold">
                          {ar ? "اضغط لرفع صورة" : "Tap to upload image"}
                        </p>
                        <p className="text-[10px] text-slate-300">
                          {imageFiles.length + (editing?.images.length ?? 0)}/{MAX_PRODUCT_IMAGES} ·
                          JPG, PNG
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
                            className="relative size-16 rounded-xl bg-slate-50 border border-border overflow-hidden shadow-sm"
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
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-border/50 rounded-3xl p-5 space-y-4 shadow-md">
              <h3 className="font-display font-bold text-base text-foreground">
                {ar ? "السعر والمخزون" : "Price & Stock"}
              </h3>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {ar ? "العملة" : "Currency"}
                </label>
                <div className="flex rounded-xl bg-slate-50 border border-border overflow-hidden w-fit">
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
                    IQD
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {ar ? "السعر الأساسي للزرعة" : "Base Implant Price"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  dir="ltr"
                  className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {ar ? "أدنى كمية طلب (اختياري)" : "Min Order Qty (Optional)"}
                </label>
                <input
                  type="number"
                  value={minOrderQty}
                  onChange={(e) => setMinOrderQty(e.target.value)}
                  placeholder="1"
                  min="1"
                  dir="ltr"
                  className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {ar ? "الكمية المتوفرة" : "Available Quantity"}
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="100"
                  min="0"
                  dir="ltr"
                  className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                />
              </div>
            </div>

            <div className="bg-white border border-border/50 rounded-3xl p-5 space-y-4 shadow-md">
              <h3 className="font-display font-bold text-base text-foreground">
                {ar ? "معلومات إضافية" : "Additional Information"}
              </h3>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {ar ? "الوصف (اختياري)" : "Description (Optional)"}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    ar
                      ? "وصف المنتج، المميزات، الاستخدامات..."
                      : "Product description, features, uses..."
                  }
                  rows={4}
                  className="w-full rounded-xl bg-slate-50 border border-border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  {ar ? "المرفقات (اختياري)" : "Attachments (Optional)"}
                </label>
                <label className="w-full h-28 rounded-xl border-2 border-dashed border-border bg-slate-50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                  <Paperclip className="size-6 text-slate-400 group-hover:text-primary transition" />
                  <p className="text-xs text-slate-400 group-hover:text-primary transition font-medium">
                    {ar
                      ? "اضغط لرفع ملفات أو اسحب وأفلت..."
                      : "Click to upload files or drag and drop..."}
                  </p>
                  <p className="text-[10px] text-slate-300">PDF, DOC, XLS</p>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (!files) return;
                      setAttachmentFiles((prev) => [...prev, ...Array.from(files)]);
                      setAttachmentNames((prev) => [
                        ...prev,
                        ...Array.from(files).map((f) => f.name),
                      ]);
                    }}
                  />
                </label>
                {attachmentNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {attachmentNames.map((fname, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-600"
                      >
                        <Paperclip className="size-3" />
                        {fname}
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentNames((prev) => prev.filter((_, i) => i !== idx));
                            setAttachmentFiles((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="ml-0.5 hover:text-rose-500 transition"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {formError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 text-center font-semibold">
              {formError}
            </p>
          )}

          <div className="flex gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className={cn(
                "flex-1 h-14 rounded-2xl font-display font-bold flex items-center justify-center gap-2 transition shadow-card",
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
                    : "Save Changes"
                  : ar
                    ? "حفظ المنتج"
                    : "Save Product"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-14 px-8 rounded-2xl font-display font-bold flex items-center gap-2 transition bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </>
      )}

      {!showForm &&
        (isLoading ? (
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
            {groupedProducts.map(({ product, children }) => (
              <div key={product.id}>
                <div
                  onClick={() => setSelectedProduct(product)}
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
                          <span className="text-lg leading-none">{countryCodeToFlag(c.code)}</span>
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
                    {children.length > 0 && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md">
                        {children.length} {ar ? "قطعة تكميلية" : "accessory"}
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
                        openEdit(product);
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

                {children.length > 0 && (
                  <div className="ml-4 mt-2 space-y-2 border-l-2 border-blue-200 pl-3">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="bg-blue-50/60 border border-blue-200/60 rounded-xl p-3 hover:shadow-sm transition cursor-pointer"
                        onClick={() => setSelectedProduct(child)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="size-10 rounded-lg bg-white border border-border overflow-hidden shrink-0 flex items-center justify-center">
                            {child.images.length > 0 && imageUrlMap[child.images[0]] ? (
                              <img
                                src={imageUrlMap[child.images[0]]}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <Package className="size-4 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">{child.ar || child.en}</p>
                            {child.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1">
                                {child.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-display font-bold text-blue-600 shrink-0">
                            {fmtPrice(child)}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-2 pt-2 border-t border-blue-200/40">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(child);
                            }}
                            className="flex-1 h-7 rounded-lg text-[10px] font-semibold bg-white hover:bg-sky-100 hover:text-sky-600 flex items-center justify-center gap-1 transition"
                          >
                            <Pencil className="size-3" />
                            {ar ? "تعديل" : "Edit"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(child);
                            }}
                            className="w-7 h-7 rounded-lg text-[10px] font-semibold bg-white hover:bg-rose-100 hover:text-rose-600 flex items-center justify-center transition"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

      {showBoneGraft && <BoneGraftModal onClose={() => setShowBoneGraft(false)} />}
    </div>
  );
}

function ImplantDetailView({
  product,
  onBack,
  onSaved,
}: {
  product: Product;
  onBack: () => void;
  onSaved: (p: Product) => void;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const countryByCode = useMemo(
    () => Object.fromEntries(ALL_COUNTRIES.map((c) => [c.code, c])),
    [],
  );

  const [accItems, setAccItems] = useState<AccessoryRow[]>(
    (product.accessories || []).map((a) => ({
      key: crypto.randomUUID(),
      imageFile: null,
      imagePreview: "",
      existingImageUrl: a.imageUrl || "",
      type: a.type || "Abutment",
      name: a.name || "",
      specs: a.specs || "",
      price: a.price ? String(a.price) : "",
      currency: a.currency || "USD",
    })),
  );
  const [accBusy, setAccBusy] = useState(false);
  const [accError, setAccError] = useState("");

  const allPaths = useMemo(
    () => accItems.filter((a) => a.existingImageUrl).map((a) => a.existingImageUrl),
    [accItems],
  );
  const { data: accImageUrlMap = {} } = useSignedImageUrls(allPaths);

  const saveAccessories = async () => {
    setAccBusy(true);
    setAccError("");
    try {
      const saved: ProductAccessory[] = [];
      for (const acc of accItems) {
        let imageUrl = acc.existingImageUrl;
        if (acc.imageFile) {
          try {
            imageUrl = await uploadProductImage(product.id, acc.imageFile);
          } catch {
            setAccBusy(false);
            return;
          }
        }
        if (acc.type && acc.name.trim()) {
          saved.push({
            type: acc.type,
            name: acc.name.trim(),
            specs: acc.specs.trim(),
            price: Math.max(0, parseFloat(acc.price) || 0),
            imageUrl,
            currency: acc.currency,
          });
        }
      }

      await updateDoc(doc(db, "products", product.id), {
        accessories: saved.length > 0 ? saved : [],
      });

      onSaved({ ...product, accessories: saved.length > 0 ? saved : undefined });
    } catch (e: any) {
      setAccError(e?.message || String(e));
    } finally {
      setAccBusy(false);
    }
  };

  const addRow = () => {
    setAccItems((prev) => [...prev, emptyAccessory()]);
  };

  const fmtPrice = (p: Product) => {
    const isIQD = p.currency === "IQD";
    const val = isIQD ? Number(p.price).toLocaleString() : p.price.toFixed(2);
    const sym = isIQD ? "د.ع" : "$";
    return isIQD ? `${val} ${sym}` : `${sym}${val}`;
  };

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
        <div className="text-right shrink-0">
          <p className="font-display font-extrabold text-lg text-primary">{fmtPrice(product)}</p>
          <p className="text-[10px] text-muted-foreground">
            {ar ? "المخزون" : "Stock"}: {product.stock}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-base text-foreground">
            {ar ? "الإكسسوارات" : "Accessories"}
          </h3>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition"
          >
            <Plus className="size-3.5" />
            {ar ? "إضافة إكسسوار" : "Add Accessory"}
          </button>
        </div>

        {accItems.length > 0 ? (
          <div className="overflow-x-auto -mx-1">
            <div className="min-w-[580px]">
              <div className="grid grid-cols-[44px_90px_1fr_1fr_130px_36px] gap-1.5 px-3 py-2 border-b-2 border-border bg-slate-50/50 rounded-t-xl">
                <span className="text-[10px] font-bold text-muted-foreground">
                  {ar ? "صورة" : "Img"}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {ar ? "النوع" : "Type"}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {ar ? "الاسم" : "Name"}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {ar ? "المواصفات" : "Specs"}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {ar ? "السعر" : "Price"}
                </span>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {ar ? "حذف" : "Del"}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {accItems.map((acc) => (
                  <div
                    key={acc.key}
                    className="grid grid-cols-[44px_90px_1fr_1fr_130px_36px] gap-1.5 px-3 py-2 items-center bg-white hover:bg-slate-50/50 transition"
                  >
                    <div>
                      {acc.imagePreview ? (
                        <div className="relative size-9 rounded-md overflow-hidden border border-border">
                          <img src={acc.imagePreview} alt="" className="size-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              setAccItems((prev) =>
                                prev.map((a) =>
                                  a.key === acc.key
                                    ? { ...a, imageFile: null, imagePreview: "" }
                                    : a,
                                ),
                              )
                            }
                            className="absolute inset-0 bg-black/40 flex items-center justify-center"
                          >
                            <X className="size-3 text-white" />
                          </button>
                        </div>
                      ) : acc.existingImageUrl ? (
                        <div className="size-9 rounded-md overflow-hidden border border-border bg-slate-200">
                          {accImageUrlMap[acc.existingImageUrl] ? (
                            <img
                              src={accImageUrlMap[acc.existingImageUrl]}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <div className="size-full flex items-center justify-center">
                              <Package className="size-3 text-slate-400" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <label className="flex items-center justify-center size-9 rounded-md border border-dashed border-slate-300 bg-white cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition">
                          <Upload className="size-3 text-slate-300" />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setAccItems((prev) =>
                                prev.map((a) =>
                                  a.key === acc.key
                                    ? {
                                        ...a,
                                        imageFile: file,
                                        imagePreview: URL.createObjectURL(file),
                                      }
                                    : a,
                                ),
                              );
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <select
                      value={acc.type}
                      onChange={(e) =>
                        setAccItems((prev) =>
                          prev.map((a) => (a.key === acc.key ? { ...a, type: e.target.value } : a)),
                        )
                      }
                      className="w-full h-9 rounded-lg bg-white border border-border px-1.5 text-[10px] font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    >
                      <option value="Abutment">Abutment</option>
                      <option value="Healing Screw">Healing Screw</option>
                      <option value="Scan Body">Scan Body</option>
                      <option value="Digital Analog">Digital Analog</option>
                    </select>

                    <input
                      value={acc.name}
                      onChange={(e) =>
                        setAccItems((prev) =>
                          prev.map((a) => (a.key === acc.key ? { ...a, name: e.target.value } : a)),
                        )
                      }
                      placeholder={ar ? "اسم الإكسسوار" : "Accessory name"}
                      className="w-full h-9 rounded-lg bg-white border border-border px-2 text-[11px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />

                    <input
                      value={acc.specs}
                      onChange={(e) =>
                        setAccItems((prev) =>
                          prev.map((a) =>
                            a.key === acc.key ? { ...a, specs: e.target.value } : a,
                          ),
                        )
                      }
                      placeholder={ar ? "المواصفات" : "Specifications"}
                      className="w-full h-9 rounded-lg bg-white border border-border px-2 text-[11px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />

                    <div className="flex gap-1">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          value={acc.price}
                          onChange={(e) =>
                            setAccItems((prev) =>
                              prev.map((a) =>
                                a.key === acc.key ? { ...a, price: e.target.value } : a,
                              ),
                            )
                          }
                          placeholder="0"
                          min="0"
                          step="0.01"
                          dir="ltr"
                          className="w-full h-9 rounded-lg bg-white border border-border px-2 text-[11px] outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                        />
                      </div>
                      <div className="flex rounded-lg bg-white border border-border overflow-hidden shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setAccItems((prev) =>
                              prev.map((a) => (a.key === acc.key ? { ...a, currency: "USD" } : a)),
                            )
                          }
                          className={cn(
                            "px-1.5 py-0.5 text-[9px] font-semibold transition",
                            acc.currency === "USD"
                              ? "bg-primary text-primary-foreground"
                              : "text-slate-400 hover:text-slate-600",
                          )}
                        >
                          $
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAccItems((prev) =>
                              prev.map((a) => (a.key === acc.key ? { ...a, currency: "IQD" } : a)),
                            )
                          }
                          className={cn(
                            "px-1.5 py-0.5 text-[9px] font-semibold transition",
                            acc.currency === "IQD"
                              ? "bg-primary text-primary-foreground"
                              : "text-slate-400 hover:text-slate-600",
                          )}
                        >
                          {ar ? "د.ع" : "IQD"}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAccItems((prev) => prev.filter((a) => a.key !== acc.key))}
                      className="size-8 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">
            {ar ? "لا توجد إكسسوارات مضافة بعد" : "No accessories added yet"}
          </p>
        )}

        {accError && (
          <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 text-center font-semibold mt-3">
            {accError}
          </p>
        )}

        <button
          type="button"
          onClick={saveAccessories}
          disabled={accBusy}
          className={cn(
            "w-full h-12 rounded-2xl font-display font-bold flex items-center justify-center gap-2 transition mt-4 shadow-card",
            accBusy
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:opacity-90",
          )}
        >
          {accBusy ? <Loader2 className="size-5 animate-spin" /> : null}
          {accBusy
            ? ar
              ? "جارٍ الحفظ..."
              : "Saving..."
            : ar
              ? "حفظ الإكسسوارات"
              : "Save Accessories"}
        </button>
      </div>
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
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {ar ? "العنوان" : "Title"}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={ar ? "مثال: خصم 20% على الزرعات" : "e.g. 20% off implants"}
              className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {ar ? "الوصف" : "Description"}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={ar ? "تفاصيل العرض..." : "Offer details..."}
              rows={3}
              className="w-full rounded-xl bg-slate-50 border border-border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {ar ? "تاريخ الانتهاء" : "Expiry date"}
            </label>
            <div className="relative">
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full h-12 rounded-xl bg-slate-50 border border-border pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
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
                className="w-full h-12 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
              <div className="flex rounded-xl bg-slate-50 border border-border overflow-hidden shrink-0">
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
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              {ar ? "صورة العرض" : "Offer image"}
            </label>
            {imagePreview ? (
              <div className="relative w-full h-40 rounded-xl bg-slate-50 border border-border overflow-hidden">
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
              <div className="relative w-full h-40 rounded-xl bg-slate-50 border border-border overflow-hidden">
                {urlMap[editing.imageUrl] ? (
                  <img src={urlMap[editing.imageUrl]} alt="" className="size-full object-cover" />
                ) : (
                  <div className="size-full flex items-center justify-center">
                    <Package className="size-8 text-slate-300" />
                  </div>
                )}
              </div>
            ) : (
              <label className="w-full h-32 rounded-xl border-2 border-dashed border-border bg-slate-50 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
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
  const { data: orders = [], isLoading } = useOrders(companyId);

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center text-muted-foreground">
          <ClipboardList className="size-14 mb-4 opacity-20" />
          <p className="font-display font-bold text-lg text-slate-400">
            {ar ? "لا توجد طلبات بعد" : "No orders yet"}
          </p>
          <p className="text-sm mt-1 max-w-xs text-slate-400">
            {ar ? "ستظهر الطلبات هنا عند استلامها" : "Orders will appear here when received"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-card border border-border rounded-2xl p-3.5 shadow-soft"
            >
              <div className="flex gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm">{order.productName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ar ? "الكمية:" : "Qty:"} {order.quantity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ar ? "الإجمالي:" : "Total:"} {order.total} {order.currency}
                  </p>
                </div>
                <span className="text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full h-fit">
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
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
    { to: "", img: "/photo/bonecraft.jpg", title: ar ? "البون كرافت" : "Bone Graft" },
    { to: "", img: "/photo/surgecalguid.jpg", title: ar ? "الدليل الجراحي" : "Surgical Guide" },
    { to: "", img: "/photo/subperustul.jpg", title: ar ? "زرعات Subperiosteal" : "Subperiosteal Implants" },
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
              <div key={c.title} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
                <div className="h-24 bg-slate-50 flex items-center justify-center p-2">
                  <img src={c.img} alt={c.title} className="size-full object-cover rounded-lg" loading="lazy" />
                </div>
                <p className="p-2 text-[11px] font-bold text-center">{c.title}</p>
              </div>
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
