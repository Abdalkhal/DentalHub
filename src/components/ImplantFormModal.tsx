import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { doc, updateDoc } from "firebase/firestore";
import { X, Plus, Trash2, Upload, Image, Settings, Paperclip, Loader2, Package, Check, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  useProducts,
  useUpsertProduct,
  uploadProductImage,
  removeProductImage,
  useSignedImageUrls,
  MAX_PRODUCT_IMAGES,
  productsQueryKey,
  type Product,
  type ProductAccessory,
  type Currency,
} from "@/lib/products";
import { auth, db } from "@/integrations/firebase/client";
import { CountryCombobox } from "@/components/CountryCombobox";
import { TagInput } from "@/components/TagInput";
import { countryCodeToFlag } from "@/data/countries";
import { IMPLANTS } from "@/data/implants";

type VariantRow = {
  key: string;
  diameter: string;
  length: string;
  stock: string;
};

const emptyVariant = (): VariantRow => ({
  key: crypto.randomUUID(),
  diameter: "",
  length: "",
  stock: "0",
});

type AccessoryRow = {
  key: string;
  imageFile: File | null;
  imagePreview: string;
  existingImageUrl: string;
  type: string;
  subType: string;
  specs: string;
  price: string;
  currency: Currency;
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

export const SURGICAL_GUIDE_TOOLS = [
  { ar: "طقم الدليل الجراحي", en: "Surgical guide kit" },
  { ar: "طقم الحفر الموجّه", en: "Guided drill kit" },
  { ar: "جلبات التوجيه", en: "Guided sleeves" },
  { ar: "أدوات الجراحة الموجّهة", en: "Guided Surgical Tools" },
];

export function ImplantFormModal({
  onClose,
  product,
}: {
  onClose: () => void;
  product?: Product;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { data: allProducts = [] } = useProducts();
  const upsert = useUpsertProduct();
  const queryClient = useQueryClient();

  const supplierUid = auth.currentUser?.uid ?? "";
  const editing = product ?? null;

  const implantProducts = useMemo(
    () => allProducts.filter((p) => p.category === "implant" && p.companyId === supplierUid),
    [allProducts, supplierUid],
  );

  const [productType, setProductType] = useState<"main_implant" | "accessory" | "surgical_kit">(
    product?.productType === "accessory"
      ? "accessory"
      : product?.category === "surgical_kit"
        ? "surgical_kit"
        : "main_implant",
  );
  const [surgicalGuide, setSurgicalGuide] = useState<"Guided" | "Unguided">(
    product?.surgicalGuide === "Guided" ? "Guided" : "Unguided",
  );
  const [surgicalGuideTools, setSurgicalGuideTools] = useState<string[]>(
    product?.surgicalGuideTools ?? [],
  );
  const [kitType, setKitType] = useState(product?.surgicalKit?.kitType ?? "Guided Surgical Kit");
  const [placementType, setPlacementType] = useState(
    product?.surgicalKit?.placementType ?? "فورية (Immediate Placement)",
  );
  const [compatibility, setCompatibility] = useState<string[]>(
    product?.surgicalKit?.compatibility ?? [],
  );
  const [toolsCount, setToolsCount] = useState(
    product?.surgicalKit?.toolsCount ? String(product.surgicalKit.toolsCount) : "",
  );
  const [kitPurchasePrice, setKitPurchasePrice] = useState(
    product?.purchasePrice ? String(product.purchasePrice) : "",
  );
  const [kitSku, setKitSku] = useState(product?.sku ?? "");
  const [kitInStock, setKitInStock] = useState(product?.inStock ?? true);
  const [kitManufacturerMode, setKitManufacturerMode] = useState<"list" | "custom">("list");
  const [name, setName] = useState(product?.ar ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [country, setCountry] = useState(product?.country || product?.implantSpec?.country || "KR");
  const [implantCategory, setImplantCategory] = useState<"comprehensive" | "basal" | "non_immediate">(
    product?.implantSpec?.implantType === "non-immediate"
      ? "non_immediate"
      : product?.implantSpec?.subType === "basal"
        ? "basal"
        : "comprehensive",
  );
  const [line, setLine] = useState(
    product?.surgicalKit?.productLine ?? product?.implantSpec?.connectionType ?? "",
  );
  const [accessoryCategory, setAccessoryCategory] = useState("");
  const [accessorySubType, setAccessorySubType] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>(() => {
    const src = (
      product?.implantSpec?.variants ?? product?.implantSpec?.dimensionStocks ?? []
    ).map((v) => ({
      diameter: Number(v.diameter) || 0,
      length: Number(v.length) || 0,
      stock: Number((v as { stock?: number }).stock ?? (v as { quantity?: number }).quantity ?? 0),
    }));
    return src.length > 0
      ? src.map((v) => ({
          key: crypto.randomUUID(),
          diameter: v.diameter ? String(v.diameter) : "",
          length: v.length ? String(v.length) : "",
          stock: String(v.stock),
        }))
      : [emptyVariant()];
  });
  const [accessoryRows] = useState<AccessoryRow[]>([]);
  const [price, setPrice] = useState(product?.price ? String(product.price) : "");
  const [currency, setCurrency] = useState<Currency>(product?.currency || "USD");
  const [minOrderQty, setMinOrderQty] = useState("");
  const [description, setDescription] = useState(product?.description || "");
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(product?.images ?? []);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [parentId, setParentId] = useState(product?.parentId || "");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const brandSuggestions = useMemo(() => [...new Set(IMPLANTS.map((i) => i.name))], []);

  const { data: editUrlMap = {} } = useSignedImageUrls(existingImages);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).slice(
      0,
      MAX_PRODUCT_IMAGES - imageFiles.length - existingImages.length,
    );
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

  const removeExistingImage = (path: string) => {
    setRemovedImages((prev) => [...prev, path]);
    setExistingImages((prev) => prev.filter((img) => img !== path));
  };

  const updateVariant = (key: string, field: "diameter" | "length" | "stock", value: string) => {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, [field]: value } : v)));
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, emptyVariant()]);
  };

  const removeVariant = (key: string) => {
    setVariants((prev) => (prev.length > 1 ? prev.filter((v) => v.key !== key) : prev));
  };

  const toggleSurgicalTool = (tool: string) => {
    setSurgicalGuideTools((prev) =>
      prev.includes(tool) ? prev.filter((x) => x !== tool) : [...prev, tool],
    );
  };

  const submit = async () => {
    setFormError("");
    if (!name.trim()) {
      setFormError(ar ? "الرجاء إدخال اسم المنتج" : "Please enter the product name");
      return;
    }
    if (productType !== "accessory" && !brand.trim()) {
      setFormError(ar ? "الرجاء إدخال اسم الشركة" : "Please enter the company name");
      return;
    }

    const parentImplant =
      productType === "accessory" && parentId
        ? implantProducts.find((p) => p.id === parentId)
        : undefined;
    const finalBrand =
      productType === "accessory" ? (parentImplant?.brand || "") : brand.trim();

    setBusy(true);
    try {
      if (productType === "accessory") {
        if (!parentId || !parentImplant) {
          setBusy(false);
          setFormError(ar ? "الرجاء اختيار الزرعة الأساسية" : "Please select the main implant");
          return;
        }
        let imageUrl = "";
        for (const file of imageFiles) {
          try {
            imageUrl = await uploadProductImage(parentId, file);
          } catch {
            setBusy(false);
            return;
          }
        }
        const newAccessory: ProductAccessory = {
          type: ACCESSORY_CATEGORIES.find((c) => c.id === accessoryCategory)?.en ?? accessoryCategory,
          name: name.trim(),
          specs: "",
          price: 0,
          imageUrl,
          currency: "USD",
        };
        await updateDoc(doc(db, "products", parentId), {
          accessories: [...(parentImplant.accessories ?? []), newAccessory],
        });
        queryClient.invalidateQueries({ queryKey: productsQueryKey });
      } else if (productType === "surgical_kit") {
        const productId = editing?.id ?? crypto.randomUUID();

        for (const path of removedImages) {
          try {
            await removeProductImage(path);
          } catch { /* already removed */ }
        }

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
          branch: "surgical_kit",
          ar: name.trim(),
          en: name.trim(),
          brand: brand.trim(),
          price: Math.max(0, parseFloat(price) || 0),
          purchasePrice: Math.max(0, parseFloat(kitPurchasePrice) || 0) || undefined,
          currency,
          stock: kitInStock ? 1 : 0,
          inStock: kitInStock,
          images: [...existingImages, ...uploadedPaths],
          category: "surgical_kit",
          country,
          companyId: supplierUid || editing?.companyId || "",
          sku: kitSku.trim() || undefined,
          surgicalKit: {
            productLine: line.trim() || undefined,
            kitType,
            placementType,
            compatibility: compatibility.length > 0 ? compatibility : undefined,
            toolsCount: toolsCount ? Number(toolsCount) : undefined,
          },
        });
      } else {
        const productId = editing?.id ?? crypto.randomUUID();

        for (const path of removedImages) {
          try {
            await removeProductImage(path);
          } catch { /* already removed */ }
        }

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
          .filter((a) => a.type && a.subType)
          .map((a) => ({
            type: ACCESSORY_CATEGORIES.find((c) => c.id === a.type)?.en ?? a.type,
            name: a.subType,
            specs: a.specs.trim(),
            price: Math.max(0, parseFloat(a.price) || 0),
            imageUrl: a.existingImageUrl || "",
            currency: a.currency,
          }));

        const variantsArr = variants
          .map((v) => ({
            diameter: Number(v.diameter),
            length: Number(v.length),
            stock: Math.max(0, parseInt(v.stock || "0") || 0),
          }))
          .filter((v) => !isNaN(v.diameter) && v.diameter > 0 && !isNaN(v.length) && v.length > 0);
        const totalStock = variantsArr.reduce((sum, v) => sum + v.stock, 0);
        const uniqueDiameters = [...new Set(variantsArr.map((v) => v.diameter))];
        const uniqueLengths = [...new Set(variantsArr.map((v) => v.length))];

        await upsert.mutateAsync({
          id: productId,
          branch: "implant",
          ar: name.trim(),
          en: name.trim(),
          brand: finalBrand,
          price: Math.max(0, parseFloat(price) || 0),
          currency,
          stock: totalStock,
          inStock: totalStock > 0,
          images: [...existingImages, ...uploadedPaths],
          category: "implant",
          country,
          countryFlag: countryCodeToFlag(country),
          companyId: supplierUid || editing?.companyId || "",
          implantSpec: {
            country,
            implantType: implantCategory === "non_immediate" ? "non-immediate" : "immediate",
            subType: implantCategory === "basal" ? "basal" : undefined,
            connectionType: line.trim() || undefined,
            diameters: uniqueDiameters.length > 0 ? uniqueDiameters : undefined,
            lengths: uniqueLengths.length > 0 ? uniqueLengths : undefined,
            variants: variantsArr.length > 0 ? variantsArr : undefined,
          },
          accessories: savedAccessories.length > 0 ? savedAccessories : undefined,
          productType: "main_implant",
          parentId: null,
          description: description.trim() || undefined,
          surgicalGuide,
          surgicalGuideTools:
            surgicalGuide === "Guided" && surgicalGuideTools.length > 0
              ? surgicalGuideTools
              : undefined,
        });
      }

      onClose();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 top-6 mx-auto w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom"
        style={{ background: "linear-gradient(to bottom, #F7FCFF, #DCEEFB, #BFE1F7)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b border-white/70">
          <div>
            <h2 className="font-display font-extrabold text-base text-[#17324A]">
              {editing
                ? ar
                  ? "تعديل زرعة"
                  : "Edit Implant"
                : ar
                  ? "إضافة زرعة جديدة"
                  : "Add New Implant"}
            </h2>
            <p className="text-[11px] text-[#7A94A8] mt-0.5">
              {ar ? "أضف زرعة وإكسسواراتها بسهولة" : "Add implant and its accessories easily"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-9 rounded-xl bg-white/70 border border-white/80 text-slate-500 flex items-center justify-center hover:bg-white transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Type toggle */}
        <div className="px-4 pt-3 shrink-0">
          <div className="flex rounded-2xl bg-[#E7F4FE] p-1">
            <button
              type="button"
              onClick={() => setProductType("main_implant")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl text-sm font-bold transition",
                productType === "main_implant"
                  ? "bg-[#2E93E0] text-white shadow-sm"
                  : "text-[#7A94A8] hover:text-[#17324A]",
              )}
            >
              <Settings className="size-4" />
              {ar ? "زرعة" : "Implant"}
            </button>
            <button
              type="button"
              onClick={() => setProductType("accessory")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl text-sm font-bold transition",
                productType === "accessory"
                  ? "bg-[#2E93E0] text-white shadow-sm"
                  : "text-[#7A94A8] hover:text-[#17324A]",
              )}
            >
              <Paperclip className="size-4" />
              {ar ? "إكسسوار" : "Accessory"}
            </button>
            <button
              type="button"
              onClick={() => setProductType("surgical_kit")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 h-10 px-2 rounded-xl text-sm font-bold transition",
                productType === "surgical_kit"
                  ? "bg-[#2E93E0] text-white shadow-sm"
                  : "text-[#7A94A8] hover:text-[#17324A]",
              )}
            >
              <Wrench className="size-4" />
              {ar ? "كت جراحي" : "Surgical Kit"}
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4">
          {productType === "main_implant" ? (
            <>
              <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 shadow-md">
                <div className="flex flex-col gap-4">
                  {/* Row 1: Implant Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                      {ar ? "اسم الزرعة" : "Implant Name"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={ar ? "مثال: Straumann BLX" : "e.g. Straumann BLX"}
                      className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                    />
                  </div>

                  {/* Row 2: Manufacturer */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                      {ar ? "الشركة المصنعة" : "Manufacturer"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder={ar ? "مثال: Straumann" : "e.g. Straumann"}
                      list="implant-brand-suggestions"
                      className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                    />
                    <datalist id="implant-brand-suggestions">
                      {brandSuggestions.map((b) => (
                        <option key={b} value={b} />
                      ))}
                    </datalist>
                  </div>

                  {/* Row 3: Country of Manufacture | Implant Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                        {ar ? "بلد الصنع" : "Country of Manufacture"}
                      </label>
                      <CountryCombobox value={country} onChange={setCountry} lang={lang} />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                        {ar ? "نوع الزرعة" : "Implant Type"}
                      </label>
                      <select
                        value={implantCategory}
                        onChange={(e) =>
                          setImplantCategory(e.target.value as "comprehensive" | "basal" | "non_immediate")
                        }
                        className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                      >
                        <option value="comprehensive">
                          {ar ? "فورية (Compressive)" : "Immediate (Compressive)"}
                        </option>
                        <option value="basal">{ar ? "فورية (Basal)" : "Immediate (Basal)"}</option>
                        <option value="non_immediate">
                          {ar
                            ? "غير فورية (Conventional / Delayed)"
                            : "Non-Immediate (Conventional / Delayed)"}
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Row 4: Product Line */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                      {ar ? "خط المنتج (اختياري)" : "Product Line (Optional)"}
                    </label>
                    <input
                      value={line}
                      onChange={(e) => setLine(e.target.value)}
                      placeholder={ar ? "مثال: BLX" : "e.g. BLX"}
                      className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                    />
                  </div>

                  {/* Row 5: Product Image (standalone row) */}
                  <div className="flex flex-col gap-3 pt-2 border-t border-[#E7F4FE]">
                    <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                      {ar ? "صورة المنتج" : "Product Image"}
                    </label>

                    {existingImages.length > 0 && (
                      <div className="flex gap-2 flex-wrap justify-center">
                        {existingImages.map((path) => (
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

                    {imageFiles.length + existingImages.length < MAX_PRODUCT_IMAGES && (
                      <label className="w-full max-w-[220px] aspect-square mx-auto rounded-2xl border-2 border-dashed border-[#D3E8F7] bg-[#F5FAFE] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                        <Image className="size-8 text-slate-300 group-hover:text-primary transition" />
                        <p className="text-[10px] text-slate-400 group-hover:text-primary transition font-semibold text-center">
                          {ar ? "إضافة صورة (PNG, JPG)" : "Add Image (PNG, JPG)"}
                        </p>
                        <p className="text-[10px] text-slate-300">
                          {imageFiles.length + existingImages.length}/{MAX_PRODUCT_IMAGES}
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
                      <div className="flex gap-2 flex-wrap justify-center">
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
                </div>
              </div>

              <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 space-y-4 shadow-md">
                <h3 className="font-display font-bold text-base text-[#1C6FB5] flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#1C6FB5]" />
                  {ar ? "أطوال وأقطار الزرعة" : "Implant Dimensions"}
                </h3>

                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[#17324A] mb-2 block">
                        {ar ? "القياسات المتوفرة" : "Available Sizes"}
                      </label>
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-[1fr_1fr_1fr_44px] gap-2 px-1 text-[10px] font-bold text-[#7A94A8]">
                          <span>{ar ? "القطر (Ø mm)" : "Diameter (Ø mm)"}</span>
                          <span>{ar ? "الطول (mm)" : "Length (mm)"}</span>
                          <span>{ar ? "الكمية المتوفرة" : "Available Qty"}</span>
                          <span />
                        </div>
                        {variants.map((v) => (
                          <div key={v.key} className="grid grid-cols-[1fr_1fr_1fr_44px] gap-2 items-center">
                            <input type="number" step="0.1" min="0" dir="ltr" placeholder="3.3" value={v.diameter} onChange={(e) => updateVariant(v.key, "diameter", e.target.value)} className="w-full h-11 rounded-lg bg-white border border-[#D3E8F7] px-3 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition" />
                            <input type="number" step="0.5" min="0" dir="ltr" placeholder="10" value={v.length} onChange={(e) => updateVariant(v.key, "length", e.target.value)} className="w-full h-11 rounded-lg bg-white border border-[#D3E8F7] px-3 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition" />
                            <input type="number" min="0" dir="ltr" placeholder="0" value={v.stock} onChange={(e) => updateVariant(v.key, "stock", e.target.value)} className="w-full h-11 rounded-lg bg-white border border-[#D3E8F7] px-3 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition" />
                            <button type="button" onClick={() => removeVariant(v.key)} disabled={variants.length <= 1} className="size-11 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition disabled:opacity-30" aria-label={ar ? "حذف القياس" : "Delete size"}>
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={addVariant} className="mt-2.5 w-full h-11 rounded-xl border-2 border-dashed border-[#BFE1F7] bg-white text-[#2E93E0] text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-sky-50/40 transition">
                        <Plus className="size-4" />
                        {ar ? "إضافة قياس جديد" : "Add New Size"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Surgical Guide System */}
              <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 space-y-4 shadow-md">
                <h3 className="font-display font-bold text-base text-[#1C6FB5] flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#1C6FB5]" />
                  {ar ? "نظام الدليل الجراحي" : "Surgical Guide System"}
                </h3>

                <div className="flex gap-2">
                  {(["Guided", "Unguided"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSurgicalGuide(mode)}
                      className={cn(
                        "flex-1 h-11 rounded-xl text-sm font-bold border transition",
                        surgicalGuide === mode
                          ? "bg-[#2E93E0] text-white border-[#2E93E0]"
                          : "bg-white text-[#7A94A8] border-[#D3E8F7] hover:border-[#2E93E0]",
                      )}
                    >
                      {mode === "Guided" ? (ar ? "موجّه (Guided)" : "Guided") : ar ? "غير موجّه (Unguided)" : "Unguided"}
                    </button>
                  ))}
                </div>

                {surgicalGuide === "Guided" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SURGICAL_GUIDE_TOOLS.map((tool) => {
                      const active = surgicalGuideTools.includes(tool.en);
                      return (
                        <button
                          key={tool.en}
                          type="button"
                          onClick={() => toggleSurgicalTool(tool.en)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition text-start",
                            active
                              ? "bg-[#E7F4FE] border-[#2E93E0] text-[#1C6FB5]"
                              : "bg-white border-[#D3E8F7] text-[#17324A] hover:border-[#2E93E0]",
                          )}
                        >
                          <span
                            className={cn(
                              "size-4 rounded border flex items-center justify-center shrink-0 transition",
                              active ? "bg-[#2E93E0] border-[#2E93E0] text-white" : "border-[#D3E8F7]",
                            )}
                          >
                            {active && <Check className="size-3" />}
                          </span>
                          {ar ? tool.ar : tool.en}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : productType === "surgical_kit" ? (
            <>
              {/* Basic info */}
              <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 shadow-md">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                      {ar ? "اسم المنتج" : "Product Name"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={ar ? "مثال: Surgical Kit – Guided" : "e.g. Surgical Kit – Guided"}
                      className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                      {ar ? "الشركة المصنعة" : "Manufacturer"} <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={kitManufacturerMode === "list" && brandSuggestions.includes(brand) ? brand : "custom"}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setKitManufacturerMode("custom");
                        } else {
                          setBrand(e.target.value);
                          setKitManufacturerMode("list");
                        }
                      }}
                      className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition appearance-none"
                    >
                      <option value="">{ar ? "-- اختر --" : "-- Select --"}</option>
                      {brandSuggestions.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                      <option value="custom">{ar ? "أخرى (إدخال يدوي)" : "Other (manual entry)"}</option>
                    </select>
                    {kitManufacturerMode === "custom" && (
                      <input
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        placeholder={ar ? "اكتب اسم الشركة" : "Type manufacturer"}
                        className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                      />
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                        {ar ? "بلد المنشأ" : "Country of Origin"}
                      </label>
                      <CountryCombobox value={country} onChange={setCountry} lang={lang} />
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                        {ar ? "خط المنتج" : "Product Line"}
                      </label>
                      <input
                        value={line}
                        onChange={(e) => setLine(e.target.value)}
                        placeholder={ar ? "مثال: GuideSystem" : "e.g. GuideSystem"}
                        className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Kit configuration */}
              <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 space-y-4 shadow-md">
                <h3 className="font-display font-bold text-base text-[#1C6FB5] flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#1C6FB5]" />
                  {ar ? "إعدادات الكت الجراحي" : "Surgical Kit Configuration"}
                </h3>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                    {ar ? "نوع الكت" : "Kit Type"}
                  </label>
                  <select
                    value={kitType}
                    onChange={(e) => setKitType(e.target.value)}
                    className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition appearance-none"
                  >
                    <option value="Guided Surgical Kit">Guided Surgical Kit</option>
                    <option value="Standard Surgical Kit">Standard Surgical Kit</option>
                    <option value="Prosthetic Kit">Prosthetic Kit</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                    {ar ? "بروتوكول الزرع" : "Implant Placement Protocol"}
                  </label>
                  <select
                    value={placementType}
                    onChange={(e) => setPlacementType(e.target.value)}
                    className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition appearance-none"
                  >
                    <option value="فورية (Immediate Placement)">فورية (Immediate Placement)</option>
                    <option value="غير فورية / تقليدية (Conventional)">غير فورية / تقليدية (Conventional)</option>
                    <option value="كلاهما (Both)">كلاهما (Both)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                    {ar ? "التوافق" : "Compatibility"}
                  </label>
                  <TagInput
                    value={compatibility}
                    onChange={setCompatibility}
                    placeholder={ar ? "اكتب قيمة واضغط Enter" : "Type a value and press Enter"}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                    {ar ? "عدد الأدوات" : "Tools Count"}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={toolsCount}
                    onChange={(e) => setToolsCount(e.target.value)}
                    placeholder="0"
                    dir="ltr"
                    className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                  />
                </div>
              </div>

              {/* Pricing & stock */}
              <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 space-y-4 shadow-md">
                <h3 className="font-display font-bold text-base text-[#1C6FB5] flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#1C6FB5]" />
                  {ar ? "السعر والمخزون" : "Pricing & Stock"}
                </h3>

                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#17324A]">
                    {ar ? "العملة" : "Currency"}
                  </label>
                  <div className="flex rounded-xl bg-[#F5FAFE] border border-[#D3E8F7] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setCurrency("USD")}
                      className={cn(
                        "px-4 py-2 text-sm font-bold transition",
                        currency === "USD" ? "bg-[#2E93E0] text-white" : "text-[#7A94A8]",
                      )}
                    >
                      $
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("IQD")}
                      className={cn(
                        "px-4 py-2 text-sm font-bold transition",
                        currency === "IQD" ? "bg-[#2E93E0] text-white" : "text-[#7A94A8]",
                      )}
                    >
                      د.ع
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                      {ar ? "سعر الشراء" : "Purchase Price"}
                    </label>
                    <input
                      type="number"
                      value={kitPurchasePrice}
                      onChange={(e) => setKitPurchasePrice(e.target.value)}
                      placeholder="0"
                      dir="ltr"
                      className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                      {ar ? "سعر البيع" : "Selling Price"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0"
                      dir="ltr"
                      className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[#17324A] whitespace-nowrap">
                    {ar ? "رمز SKU" : "SKU / Code"}
                  </label>
                  <input
                    value={kitSku}
                    onChange={(e) => setKitSku(e.target.value)}
                    placeholder="KIT-001"
                    dir="ltr"
                    className="w-full min-h-[42px] h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#F5FAFE] border border-[#D3E8F7] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#17324A]">{ar ? "الحالة" : "Availability"}</p>
                    <p className="text-[11px] text-[#7A94A8]">
                      {kitInStock ? (ar ? "متوفر" : "In Stock") : ar ? "غير متوفر" : "Out of Stock"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKitInStock((v) => !v)}
                    className={cn(
                      "relative w-14 h-8 rounded-full transition-colors",
                      kitInStock ? "bg-emerald-500" : "bg-slate-300",
                    )}
                    aria-pressed={kitInStock}
                  >
                    <span
                      className={cn(
                        "absolute top-1 size-6 rounded-full bg-white shadow transition-all",
                        kitInStock ? "start-7" : "start-1",
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Image upload */}
              <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 space-y-3 shadow-md">
                <h3 className="font-display font-bold text-base text-[#1C6FB5] flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-[#1C6FB5]" />
                  {ar ? "صورة المنتج" : "Product Image"}
                </h3>

                {existingImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {existingImages.map((path) => (
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

                {imageFiles.length + existingImages.length < MAX_PRODUCT_IMAGES && (
                  <label className="w-full h-32 rounded-2xl border-2 border-dashed border-[#D3E8F7] bg-[#F5FAFE] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                    <Upload className="size-6 text-slate-400 group-hover:text-primary transition" />
                    <p className="text-xs text-slate-400 group-hover:text-primary transition font-semibold">
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
                  <div className="flex gap-2 flex-wrap">
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
            </>
          ) : (
            <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                      {ar ? "اسم الإكسسوار الرئيسي" : "Main Accessory Category"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={accessoryCategory}
                      onChange={(e) => {
                        setAccessoryCategory(e.target.value);
                        setAccessorySubType("");
                        setName("");
                      }}
                      className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition appearance-none"
                    >
                      <option value="">{ar ? "-- اختر الفئة --" : "-- Select category --"}</option>
                      {ACCESSORY_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>
                          {ar ? c.ar : c.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                      {ar ? "نوع وشكل الإكسسوار التفصيلي" : "Detailed Sub-type"}{" "}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={accessorySubType}
                      onChange={(e) => {
                        setAccessorySubType(e.target.value);
                        setName(e.target.value);
                      }}
                      disabled={!accessoryCategory}
                      className={cn(
                        "w-full h-12 rounded-xl border px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition appearance-none",
                        !accessoryCategory
                          ? "bg-[#F5FAFE] border-[#D3E8F7] text-[#7A94A8] cursor-not-allowed"
                          : "bg-[#F5FAFE] border-[#D3E8F7] text-[#17324A]",
                      )}
                    >
                      <option value="">{ar ? "-- اختر النوع --" : "-- Select sub-type --"}</option>
                      {(ACCESSORY_CATEGORIES.find((c) => c.id === accessoryCategory)?.subTypes ?? []).map((st) => (
                        <option key={st.en} value={ar ? st.ar : st.en}>
                          {ar ? st.ar : st.en}
                        </option>
                      ))}
                    </select>
                    {accessoryCategory && accessorySubType && (
                      <p className="mt-1.5 text-[11px] text-[#1C6FB5] bg-[#E7F4FE] border border-[#BFE1F7] rounded-lg px-2.5 py-1.5">
                        {ar
                          ? `المعاينة: ${ACCESSORY_CATEGORIES.find((c) => c.id === accessoryCategory)?.ar ?? ""} · ${accessorySubType}`
                          : `Preview: ${ACCESSORY_CATEGORIES.find((c) => c.id === accessoryCategory)?.en ?? ""} · ${accessorySubType}`}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                      {ar ? "ربط مع زرعة أساسية" : "Link to Main Implant"}
                    </label>
                    <select
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition appearance-none"
                    >
                      <option value="">
                        {ar ? "-- اختر الزرعة الأساسية --" : "-- Select main implant --"}
                      </option>
                      {implantProducts
                        .filter(
                          (p) =>
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
                  <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                    {ar ? "صورة المنتج" : "Product Image"}
                  </label>

                  {existingImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {existingImages.map((path) => (
                        <div key={path} className="relative size-16 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden group">
                          {editUrlMap[path] ? (
                            <img src={editUrlMap[path]} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="size-full flex items-center justify-center">
                              <Package className="size-5 text-slate-300" />
                            </div>
                          )}
                          <button type="button" onClick={() => removeExistingImage(path)} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                            <Trash2 className="size-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {imageFiles.length + (existingImages.length) < MAX_PRODUCT_IMAGES && (
                    <label className="w-full h-40 rounded-2xl border-2 border-dashed border-[#D3E8F7] bg-[#F5FAFE] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                      <Upload className="size-8 text-slate-400 group-hover:text-primary transition" />
                      <p className="text-xs text-slate-400 group-hover:text-primary transition font-semibold">
                        {ar ? "اضغط لرفع صورة" : "Tap to upload image"}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        {imageFiles.length + (existingImages.length)}/{MAX_PRODUCT_IMAGES} · JPG, PNG
                      </p>
                      <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                    </label>
                  )}

                  {imagePreviews.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {imagePreviews.map((url, idx) => (
                        <div key={idx} className="relative size-16 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] overflow-hidden shadow-sm">
                          <img src={url} alt="" className="size-full object-cover" />
                          <button type="button" onClick={() => removePreview(idx)} className="absolute top-0.5 end-0.5 size-5 rounded-full bg-black/60 text-white flex items-center justify-center">
                            <X className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 space-y-4 shadow-md">
            <h3 className="font-display font-bold text-base text-[#1C6FB5] flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#1C6FB5]" />
              {ar ? "السعر والمخزون" : "Price & Stock"}
            </h3>

            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                {ar ? "العملة" : "Currency"}
              </label>
              <div className="flex rounded-xl bg-[#F5FAFE] border border-[#D3E8F7] overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={cn(
                    "px-4 py-2.5 text-sm font-bold transition",
                    currency === "USD" ? "bg-[#2E93E0] text-white" : "text-[#7A94A8] hover:text-[#17324A]",
                  )}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("IQD")}
                  className={cn(
                    "px-4 py-2.5 text-sm font-bold transition",
                    currency === "IQD" ? "bg-[#2E93E0] text-white" : "text-[#7A94A8] hover:text-[#17324A]",
                  )}
                >
                  IQD
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                {ar ? "السعر الأساسي للزرعة" : "Base Implant Price"} <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                dir="ltr"
                className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                {ar ? "أدنى كمية طلب (اختياري)" : "Min Order Qty (Optional)"}
              </label>
              <input
                type="number"
                value={minOrderQty}
                onChange={(e) => setMinOrderQty(e.target.value)}
                placeholder="1"
                min="1"
                dir="ltr"
                className="w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition"
              />
            </div>
          </div>

          {productType === "main_implant" && (
            <div className="bg-white border border-[#D3E8F7] rounded-3xl p-5 space-y-4 shadow-md">
              <h3 className="font-display font-bold text-base text-[#1C6FB5] flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#1C6FB5]" />
                {ar ? "معلومات إضافية" : "Additional Information"}
              </h3>

              <div>
                <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                  {ar ? "الوصف (اختياري)" : "Description (Optional)"}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={ar ? "وصف المنتج، المميزات، الاستخدامات..." : "Product description, features, uses..."}
                  rows={4}
                  className="w-full rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#17324A] mb-1.5 block">
                  {ar ? "المرفقات (اختياري)" : "Attachments (Optional)"}
                </label>
                <label className="w-full h-28 rounded-xl border-2 border-dashed border-[#D3E8F7] bg-[#F5FAFE] flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition group">
                  <Paperclip className="size-6 text-slate-400 group-hover:text-primary transition" />
                  <p className="text-xs text-slate-400 group-hover:text-primary transition font-medium">
                    {ar ? "اضغط لرفع ملفات أو اسحب وأفلت..." : "Click to upload files or drag and drop..."}
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
                      setAttachmentNames((prev) => [...prev, ...Array.from(files).map((f) => f.name)]);
                    }}
                  />
                </label>
                {attachmentNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {attachmentNames.map((fname, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-600">
                        <Paperclip className="size-3" />
                        {fname}
                        <button
                          type="button"
                          onClick={() => {
                            setAttachmentNames((prev) => prev.filter((_, i) => i !== idx));
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
          )}

          {formError && (
            <p className="text-sm text-rose-600 bg-rose-50 rounded-xl px-4 py-2.5 text-center font-semibold">
              {formError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/70 bg-white/95 backdrop-blur p-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className={cn(
                "flex-1 h-14 rounded-2xl font-display font-bold flex items-center justify-center gap-2 transition shadow-lg text-white",
                busy ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "hover:opacity-95",
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
                    : "Save Changes"
                  : ar
                    ? "حفظ المنتج"
                    : "Save Product"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-14 px-8 rounded-2xl font-display font-bold flex items-center gap-2 transition bg-[#E7F4FE] hover:bg-[#DCEEFB] text-[#1C6FB5]"
            >
              {ar ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
