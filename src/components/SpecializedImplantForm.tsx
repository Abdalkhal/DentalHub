import { useEffect, useRef, useState } from "react";
import { X, Plus, Upload, Loader2, Check, Package, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  useUpsertProduct,
  uploadProductImage,
  removeProductImage,
  useSignedImageUrls,
  MAX_PRODUCT_IMAGES,
  type Product,
  type Currency,
} from "@/lib/products";
import {
  SPECIALIZED_CATEGORIES,
  SPECIALIZED_FIELDS,
  type SpecializedField,
} from "@/data/specializedImplants";
import { auth } from "@/integrations/firebase/client";
import { CountryCombobox } from "@/components/CountryCombobox";
import { toast } from "sonner";

const MAX_CLINICAL_IMAGES = 10;

const inputCls =
  "w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition";
const labelCls = "text-[11px] font-bold text-slate-500 mb-1.5 block";
const cardCls = "rounded-2xl bg-white border border-slate-200/80 shadow-sm p-4 space-y-3";

function CreatableCombobox({
  field,
  value,
  onChange,
  ar,
}: {
  field: SpecializedField;
  value: string;
  onChange: (v: string) => void;
  ar: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => {
    if (!value) return "";
    const opt = field.options?.find((o) => o.value === value);
    return opt ? (ar ? (opt.ar ?? opt.value) : opt.value) : value;
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const options = field.options ?? [];
  const label = (o: { value: string; ar?: string }) => (ar ? (o.ar ?? o.value) : o.value);
  const normalized = query.trim().toLowerCase();
  const filtered = options.filter((o) => label(o).toLowerCase().includes(normalized));

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        placeholder={ar ? "اختر أو اكتب القيمة..." : "Select or type a value..."}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        className={cn(inputCls, "pe-10")}
      />
      <ChevronDown
        className={cn(
          "absolute top-1/2 -translate-y-1/2 end-3 size-4 pointer-events-none transition",
          open ? "text-indigo-500 rotate-180" : "text-slate-400",
        )}
      />
      {open && (
        <div className="absolute z-30 mt-1.5 w-full max-h-48 overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-xl py-1">
          {filtered.length > 0 ? (
            filtered.map((o) => {
              const active = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setQuery(label(o));
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-start px-3.5 py-2.5 text-sm transition flex items-center justify-between gap-2",
                    active
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span>{label(o)}</span>
                  {active && <Check className="size-4 shrink-0" />}
                </button>
              );
            })
          ) : (
            <p className="px-3.5 py-3 text-xs text-slate-400">
              {query.trim()
                ? ar
                  ? `ستُحفظ القيمة المدخلة: "${query.trim()}"`
                  : `The typed value will be saved: "${query.trim()}"`
                : ar
                  ? "لا توجد اقتراحات"
                  : "No suggestions"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function renderField(
  field: SpecializedField,
  value: string | string[] | undefined,
  onChange: (v: string | string[] | undefined) => void,
  ar: boolean,
) {
  if (field.type === "text") {
    return (
      <div key={field.id}>
        <label className={labelCls}>{ar ? field.ar : field.en}</label>
        <input
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          placeholder={field.placeholder}
          className={inputCls}
        />
      </div>
    );
  }

  if (field.type === "multi") {
    const selected = (value as string[]) || [];
    return (
      <div key={field.id}>
        <label className={labelCls}>{ar ? field.ar : field.en}</label>
        <div className="flex flex-wrap gap-2">
          {field.options?.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  const next = active
                    ? selected.filter((x) => x !== o.value)
                    : [...selected, o.value];
                  onChange(next.length > 0 ? next : undefined);
                }}
                className={cn(
                  "flex items-center gap-1.5 h-10 px-3.5 rounded-full text-xs font-bold border transition",
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400",
                )}
              >
                {active && <Check className="size-3.5" />}
                {ar ? (o.ar ?? o.value) : o.value}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div key={field.id}>
      <label className={labelCls}>{ar ? field.ar : field.en}</label>
      <CreatableCombobox
        field={field}
        value={(value as string) || ""}
        onChange={(v) => onChange(v || undefined)}
        ar={ar}
      />
    </div>
  );
}

export function SpecializedImplantForm({
  onClose,
  product,
}: {
  onClose: () => void;
  product?: Product;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const upsert = useUpsertProduct();
  const productInputRef = useRef<HTMLInputElement>(null);
  const clinicalInputRef = useRef<HTMLInputElement>(null);

  const [category, setCategory] = useState(
    product?.specializedImplant?.category ?? "subperiosteal",
  );
  const [name, setName] = useState(product?.ar ?? "");
  const [manufacturer, setManufacturer] = useState(product?.brand ?? "");
  const [country, setCountry] = useState(product?.country ?? "");
  const [price, setPrice] = useState(product?.price ? String(product.price) : "");
  const [currency, setCurrency] = useState<Currency>(product?.currency || "USD");
  const [stock, setStock] = useState(product?.stock ? String(product.stock) : "0");
  const [description, setDescription] = useState(product?.description ?? "");
  const [fields, setFields] = useState<Record<string, string | string[]>>(
    product?.specializedImplant?.fields ?? {},
  );
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(product?.images ?? []);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [clinicalFiles, setClinicalFiles] = useState<File[]>([]);
  const [clinicalPreviews, setClinicalPreviews] = useState<string[]>([]);
  const [existingClinical, setExistingClinical] = useState<string[]>(
    product?.specializedImplant?.clinicalImages ?? [],
  );
  const [removedClinical, setRemovedClinical] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const activeFields = SPECIALIZED_FIELDS[category] ?? [];
  const hideStock = category === "subperiosteal";

  const { data: existingUrlMap = {} } = useSignedImageUrls(existingImages);
  const { data: clinicalUrlMap = {} } = useSignedImageUrls(existingClinical);

  const selectCategory = (id: string) => {
    setCategory(id);
    setFields({});
  };

  const setField = (id: string, value: string | string[] | undefined) => {
    setFields((prev) => {
      const next = { ...prev };
      if (
        value === undefined ||
        (typeof value === "string" && !value.trim()) ||
        (Array.isArray(value) && value.length === 0)
      ) {
        delete next[id];
      } else {
        next[id] = value;
      }
      return next;
    });
  };

  const handleProductFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).slice(
      0,
      MAX_PRODUCT_IMAGES - imageFiles.length - existingImages.length,
    );
    if (incoming.length === 0) return;
    setImageFiles((prev) => [...prev, ...incoming]);
    setImagePreviews((prev) => [...prev, ...incoming.map((f) => URL.createObjectURL(f))]);
  };

  const removeProductPreview = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeExistingProductImage = (path: string) => {
    setRemovedImages((prev) => [...prev, path]);
    setExistingImages((prev) => prev.filter((p) => p !== path));
  };

  const handleClinicalFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).slice(
      0,
      MAX_CLINICAL_IMAGES - clinicalFiles.length - existingClinical.length,
    );
    if (incoming.length === 0) return;
    setClinicalFiles((prev) => [...prev, ...incoming]);
    setClinicalPreviews((prev) => [...prev, ...incoming.map((f) => URL.createObjectURL(f))]);
  };

  const removeClinicalPreview = (idx: number) => {
    setClinicalFiles((prev) => prev.filter((_, i) => i !== idx));
    setClinicalPreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const removeExistingClinical = (path: string) => {
    setRemovedClinical((prev) => [...prev, path]);
    setExistingClinical((prev) => prev.filter((p) => p !== path));
  };

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError(
        ar ? "الرجاء إدخال اسم الزرعة المتخصصة" : "Please enter the specialized implant name",
      );
      return;
    }
    if (!manufacturer.trim()) {
      setError(ar ? "الرجاء إدخال اسم الشركة المصنعة" : "Please enter the manufacturer name");
      return;
    }
    if (!price.trim() || isNaN(Number(price))) {
      setError(ar ? "الرجاء إدخال سعر صحيح" : "Please enter a valid price");
      return;
    }

    setBusy(true);
    try {
      const productId = product?.id ?? crypto.randomUUID();

      for (const path of [...removedImages, ...removedClinical]) {
        try {
          await removeProductImage(path);
        } catch {
          /* already removed */
        }
      }

      const uploadedPaths: string[] = [];
      for (const file of imageFiles) {
        uploadedPaths.push(await uploadProductImage(productId, file));
      }
      const clinicalPaths: string[] = [];
      for (const file of clinicalFiles) {
        clinicalPaths.push(await uploadProductImage(productId, file));
      }

      const cleanFields: Record<string, string | string[]> = {};
      Object.entries(fields).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          if (v.length > 0) cleanFields[k] = v;
        } else if (typeof v === "string" && v.trim()) {
          cleanFields[k] = v.trim();
        }
      });

      const clinicalImages = [...existingClinical, ...clinicalPaths];

      await upsert.mutateAsync({
        id: productId,
        branch: "specialized_implant",
        ar: name.trim(),
        en: name.trim(),
        brand: manufacturer.trim(),
        price: Math.max(0, Number(price) || 0),
        currency,
        stock: hideStock ? 1 : Math.max(0, Number(stock) || 0),
        inStock: true,
        images: [...existingImages, ...uploadedPaths],
        category: "specialized_implant",
        companyId: product?.companyId || auth.currentUser?.uid || "",
        country: country || undefined,
        description: description.trim() || undefined,
        specializedImplant: {
          category,
          fields: cleanFields,
          clinicalImages: clinicalImages.length > 0 ? clinicalImages : undefined,
        },
      });

      toast.success(ar ? "تم حفظ الزرعة المتخصصة بنجاح" : "Specialized implant saved successfully");
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="absolute inset-x-0 bottom-0 top-6 mx-auto w-full max-w-md flex flex-col rounded-t-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom"
        style={{ background: "linear-gradient(to bottom, #F7FCFF, #EAE4FF, #D6CDFF)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b border-white/70">
          <div>
            <h2 className="font-display font-extrabold text-base text-slate-900">
              {ar ? "إضافة زرعة متخصصة" : "Add Specialized Implant"}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {ar
                ? "حلول متقدمة للحالات المعقدة وفقدان العظم الشديد"
                : "Advanced solutions for complex cases"}
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

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-4">
          {/* Category selector */}
          <div>
            <label className={labelCls}>
              {ar ? "فئة الزرعة المتخصصة" : "Specialized Category"}
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {SPECIALIZED_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCategory(c.id)}
                  className={cn(
                    "shrink-0 h-10 px-3.5 rounded-full text-xs font-bold border transition whitespace-nowrap",
                    category === c.id
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400",
                  )}
                >
                  {ar ? c.ar : c.en}
                </button>
              ))}
            </div>
          </div>

          {/* Basic fields */}
          <div className={cardCls}>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-indigo-500" />
              {ar ? "معلومات أساسية" : "Basic Information"}
            </p>
            <div>
              <label className={labelCls}>{ar ? "اسم الزرعة المتخصصة" : "Implant Name"}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  ar ? "مثال: Subperiosteal Mesh Upper" : "e.g. Subperiosteal Mesh Upper"
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{ar ? "الشركة المصنعة" : "Manufacturer"}</label>
              <input
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                placeholder={ar ? "مثال: Zygoma" : "e.g. Zygoma"}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{ar ? "بلد المنشأ" : "Country of Origin"}</label>
              <CountryCombobox value={country} onChange={setCountry} lang={lang} />
            </div>
            <div>
              <label className={labelCls}>{ar ? "الوصف" : "Description"}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder={ar ? "اكتب وصفاً للمنتج..." : "Describe the implant..."}
                className={cn(inputCls, "h-auto py-3 resize-none")}
              />
            </div>
          </div>

          {/* Product images */}
          <div className={cardCls}>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-indigo-500" />
              {ar ? "صور المنتج" : "Product Images"}
            </p>
            <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1">
              {existingImages.map((path) => (
                <div
                  key={path}
                  className="relative size-20 shrink-0 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden"
                >
                  {existingUrlMap[path] ? (
                    <img src={existingUrlMap[path]} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <Package className="size-5 text-slate-300" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingProductImage(path)}
                    className="absolute top-1 end-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {imagePreviews.map((url, i) => (
                <div
                  key={url}
                  className="relative size-20 shrink-0 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden"
                >
                  <img src={url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeProductPreview(i)}
                    className="absolute top-1 end-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {imageFiles.length + existingImages.length < MAX_PRODUCT_IMAGES && (
                <button
                  type="button"
                  onClick={() => productInputRef.current?.click()}
                  className="shrink-0 size-20 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition"
                >
                  <Plus className="size-5" />
                  <span className="text-[9px] font-bold">{ar ? "إضافة" : "Add"}</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {imageFiles.length + existingImages.length}/{MAX_PRODUCT_IMAGES} · JPG, PNG
            </p>
            <input
              ref={productInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleProductFiles(e.target.files)}
            />
          </div>

          {/* Dynamic fields */}
          {activeFields.length > 0 && (
            <div className={cardCls}>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-indigo-500" />
                {ar ? "المواصفات الخاصة" : "Category Specifications"}
              </p>
              {activeFields.map((f) => renderField(f, fields[f.id], (v) => setField(f.id, v), ar))}
            </div>
          )}

          {/* Pricing & stock */}
          <div className={cardCls}>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-indigo-500" />
              {ar ? "السعر والمخزون" : "Price & Stock"}
            </p>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500">
                {ar ? "العملة" : "Currency"}
              </label>
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setCurrency("USD")}
                  className={cn(
                    "px-3 h-8 rounded-lg text-xs font-bold transition",
                    currency === "USD" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                  )}
                >
                  $
                </button>
                <button
                  type="button"
                  onClick={() => setCurrency("IQD")}
                  className={cn(
                    "px-3 h-8 rounded-lg text-xs font-bold transition",
                    currency === "IQD" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                  )}
                >
                  {ar ? "د.ع" : "IQD"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{ar ? "سعر الوحدة الواحدة" : "Unit Price"}</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  dir="ltr"
                  className={inputCls}
                />
              </div>
              {!hideStock && (
                <div>
                  <label className={labelCls}>{ar ? "المخزون" : "Stock"}</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="0"
                    dir="ltr"
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Clinical cases images */}
          <div className={cardCls}>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-indigo-500" />
              {ar ? "رفع صور حالات العمل" : "Clinical Cases Images"}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {existingClinical.map((path) => (
                <div
                  key={path}
                  className="relative aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden"
                >
                  {clinicalUrlMap[path] ? (
                    <img src={clinicalUrlMap[path]} alt="" className="size-full object-cover" />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <Package className="size-5 text-slate-300" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeExistingClinical(path)}
                    className="absolute top-1 end-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {clinicalPreviews.map((url, i) => (
                <div
                  key={url}
                  className="relative aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden"
                >
                  <img src={url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeClinicalPreview(i)}
                    className="absolute top-1 end-1 size-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
              {clinicalFiles.length + existingClinical.length < MAX_CLINICAL_IMAGES && (
                <button
                  type="button"
                  onClick={() => clinicalInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition"
                >
                  <Upload className="size-5" />
                  <span className="text-[9px] font-bold">{ar ? "إضافة" : "Add"}</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {clinicalFiles.length + existingClinical.length}/{MAX_CLINICAL_IMAGES} · JPG, PNG
            </p>
            <input
              ref={clinicalInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleClinicalFiles(e.target.files)}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/70 bg-white/95 backdrop-blur p-4">
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="w-full h-13 min-h-12 rounded-2xl bg-indigo-600 text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            {busy
              ? ar
                ? "جارٍ الحفظ..."
                : "Saving..."
              : ar
                ? "حفظ الزرعة المتخصصة"
                : "Save Specialized Implant"}
          </button>
        </div>
      </div>
    </div>
  );
}
