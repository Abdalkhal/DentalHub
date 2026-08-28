import { useState } from "react";
import { X, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useUpsertProduct, type Product, type Currency } from "@/lib/products";
import {
  SPECIALIZED_CATEGORIES,
  SPECIALIZED_FIELDS,
  type SpecializedField,
} from "@/data/specializedImplants";
import { auth } from "@/integrations/firebase/client";
import { toast } from "sonner";

const inputCls =
  "w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition";
const labelCls = "text-[11px] font-bold text-slate-500 mb-1.5 block";

function renderField(
  field: SpecializedField,
  value: string,
  onChange: (v: string) => void,
  ar: boolean,
) {
  if (field.type === "text") {
    return (
      <div key={field.id}>
        <label className={labelCls}>{ar ? field.ar : field.en}</label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={inputCls}
        />
      </div>
    );
  }
  return (
    <div key={field.id}>
      <label className={labelCls}>{ar ? field.ar : field.en}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputCls, "appearance-none pe-9")}
      >
        <option value="">{ar ? "-- اختر --" : "-- Select --"}</option>
        {field.options?.map((o) => (
          <option key={o.value} value={o.value}>
            {ar ? o.ar ?? o.value : o.value}
          </option>
        ))}
      </select>
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

  const [category, setCategory] = useState(
    product?.specializedImplant?.category ?? "subperiosteal",
  );
  const [name, setName] = useState(product?.ar ?? "");
  const [manufacturer, setManufacturer] = useState(product?.brand ?? "");
  const [price, setPrice] = useState(product?.price ? String(product.price) : "");
  const [currency, setCurrency] = useState<Currency>(product?.currency || "USD");
  const [stock, setStock] = useState(product?.stock ? String(product.stock) : "0");
  const [fields, setFields] = useState<Record<string, string>>(
    product?.specializedImplant?.fields ?? {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const activeFields = SPECIALIZED_FIELDS[category] ?? [];

  const selectCategory = (id: string) => {
    setCategory(id);
    setFields({});
  };

  const setField = (id: string, value: string) => {
    setFields((prev) => {
      const next = { ...prev };
      if (value.trim()) next[id] = value;
      else delete next[id];
      return next;
    });
  };

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError(ar ? "الرجاء إدخال اسم الزرعة المتخصصة" : "Please enter the specialized implant name");
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
      const cleanFields: Record<string, string> = {};
      Object.entries(fields).forEach(([k, v]) => {
        if (v && v.trim()) cleanFields[k] = v.trim();
      });

      await upsert.mutateAsync({
        id: productId,
        branch: "specialized_implant",
        ar: name.trim(),
        en: name.trim(),
        brand: manufacturer.trim(),
        price: Math.max(0, Number(price) || 0),
        currency,
        stock: Math.max(0, Number(stock) || 0),
        inStock: Number(stock) > 0,
        images: product?.images ?? [],
        category: "specialized_implant",
        companyId: product?.companyId || auth.currentUser?.uid || "",
        specializedImplant: {
          category,
          fields: cleanFields,
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
              {ar ? "حلول متقدمة للحالات المعقدة وفقدان العظم الشديد" : "Advanced solutions for complex cases"}
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
            <label className={labelCls}>{ar ? "فئة الزرعة المتخصصة" : "Specialized Category"}</label>
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
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-4 space-y-3">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-indigo-500" />
              {ar ? "معلومات أساسية" : "Basic Information"}
            </p>
            <div>
              <label className={labelCls}>{ar ? "اسم الزرعة المتخصصة" : "Implant Name"}</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={ar ? "مثال: Subperiosteal Mesh Upper" : "e.g. Subperiosteal Mesh Upper"}
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
          </div>

          {/* Dynamic fields */}
          {activeFields.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-4 space-y-3">
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-indigo-500" />
                {ar ? "المواصفات الخاصة" : "Category Specifications"}
              </p>
              {activeFields.map((f) =>
                renderField(f, fields[f.id] ?? "", (v) => setField(f.id, v), ar),
              )}
            </div>
          )}

          {/* Pricing & stock */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-4 space-y-3">
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-indigo-500" />
              {ar ? "السعر والمخزون" : "Price & Stock"}
            </p>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500">{ar ? "العملة" : "Currency"}</label>
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
                <label className={labelCls}>{ar ? "السعر" : "Price"}</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  dir="ltr"
                  className={inputCls}
                />
              </div>
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
            </div>
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
            {busy ? (ar ? "جارٍ الحفظ..." : "Saving...") : ar ? "حفظ الزرعة المتخصصة" : "Save Specialized Implant"}
          </button>
        </div>
      </div>
    </div>
  );
}
