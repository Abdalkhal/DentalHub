import { useState } from "react";
import { X, Plus, Trash2, Upload, Image, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { TagInput } from "@/components/TagInput";
import { useUpsertProduct, uploadProductImage, MAX_PRODUCT_IMAGES } from "@/lib/products";
import { auth } from "@/integrations/firebase/client";
import { toast } from "sonner";

const GRAFT_TYPES = [
  { ar: "تركيبي", en: "Synthetic" },
  { ar: "حيواني", en: "Xenograft" },
  { ar: "بشري", en: "Allograft" },
  { ar: "ذاتي", en: "Autograft" },
];

const GRAFT_FORMS = [
  { ar: "حبيبات", en: "Granules" },
  { ar: "حقنة", en: "Syringe" },
  { ar: "كتل", en: "Blocks" },
];

type PackRow = {
  key: string;
  volume: string;
  priceUsd: string;
  priceIqd: string;
  available: boolean;
};

function newRow(): PackRow {
  return { key: crypto.randomUUID(), volume: "", priceUsd: "", priceIqd: "", available: true };
}

export function BoneGraftModal({ onClose }: { onClose: () => void }) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const upsert = useUpsertProduct();

  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [country, setCountry] = useState("");
  const [graftType, setGraftType] = useState(GRAFT_TYPES[0].ar);
  const [form, setForm] = useState(GRAFT_FORMS[0].ar);
  const [materialSource, setMaterialSource] = useState("");
  const [composition, setComposition] = useState("");
  const [particleSize, setParticleSize] = useState("");
  const [sterilizationMethod, setSterilizationMethod] = useState("");
  const [shelfLife, setShelfLife] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<PackRow[]>([newRow()]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const inputCls =
    "w-full h-11 rounded-xl bg-[#F5FAFE] border border-[#D3E8F7] px-3 text-sm text-[#17324A] placeholder:text-[#7A94A8] focus:outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0]";

  const labelCls = "text-[11px] font-bold text-[#17324A] mb-1.5 block";

  const sectionCls = "rounded-xl bg-white border border-[#D3E8F7] p-4 space-y-3 shadow-sm";

  const sectionTitleCls = "text-sm font-bold text-[#1C6FB5] flex items-center gap-1.5";

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).slice(0, MAX_PRODUCT_IMAGES - imageFiles.length);
    if (incoming.length === 0) return;
    setImageFiles((prev) => [...prev, ...incoming]);
    setImagePreviews((prev) => [...prev, ...incoming.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updateRow = (key: string, patch: Partial<PackRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const submit = async () => {
    setError("");
    if (!name.trim()) {
      setError(ar ? "الرجاء إدخال اسم المنتج التجاري" : "Please enter the commercial product name");
      return;
    }
    if (!manufacturer.trim()) {
      setError(ar ? "الرجاء إدخال اسم الشركة المصنعة" : "Please enter the manufacturer name");
      return;
    }

    setBusy(true);
    try {
      const productId = crypto.randomUUID();
      const uploadedPaths: string[] = [];
      for (const file of imageFiles) {
        uploadedPaths.push(await uploadProductImage(productId, file));
      }

      const packSizes = rows
        .filter((r) => r.volume.trim())
        .map((r) => ({
          volume: r.volume.trim(),
          priceUsd: parseFloat(r.priceUsd) || 0,
          priceIqd: parseFloat(r.priceIqd) || 0,
          available: r.available,
        }));

      const firstUsd = packSizes.find((p) => p.priceUsd > 0)?.priceUsd ?? 0;

      await upsert.mutateAsync({
        id: productId,
        branch: "bone_graft",
        ar: name.trim(),
        en: name.trim(),
        brand: manufacturer.trim(),
        price: firstUsd,
        currency: "USD",
        stock: 1,
        inStock: true,
        images: uploadedPaths,
        category: "implant",
        country,
        companyId: auth.currentUser?.uid ?? "",
        description: description.trim() || undefined,
        boneGraft: {
          graftType,
          form,
          materialSource: materialSource.trim(),
          composition: composition.trim(),
          particleSize: particleSize.trim(),
          sterilizationMethod: sterilizationMethod.trim(),
          shelfLife: shelfLife.trim(),
          features,
          packSizes,
        },
      });

      toast.success(ar ? "تمت إضافة البون كرافت بنجاح" : "Bone graft added successfully");
      onClose();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[#17324A]/40 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] max-h-[92vh] flex flex-col rounded-t-3xl overflow-hidden animate-in slide-in-from-bottom"
        style={{ background: "linear-gradient(to bottom, #F7FCFF, #DCEEFB, #BFE1F7)" }}
      >
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 text-white"
          style={{ background: "linear-gradient(to right, #2E93E0, #1C6FB5)" }}
        >
          <h2 className="font-display font-extrabold text-base">{ar ? "إضافة بون كرافت" : "Add Bone Graft"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-full bg-white/20 backdrop-blur border border-white/40 flex items-center justify-center text-white hover:bg-white/30 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Section 1 */}
          <section className={sectionCls}>
            <p className={sectionTitleCls}><span className="size-1.5 rounded-full bg-[#1C6FB5]" />{ar ? "المعلومات الأساسية والشركة المصنعة" : "Basic & Manufacturer Info"}</p>
            <div>
              <label className={labelCls}>{ar ? "اسم المنتج التجاري" : "Commercial Product Name"}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={ar ? "مثال: Bio-Oss" : "e.g. Bio-Oss"} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{ar ? "الشركة المصنعة" : "Manufacturer Name"}</label>
              <input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder={ar ? "مثال: Geistlich" : "e.g. Geistlich"} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{ar ? "بلد المنشأ" : "Country of Origin"}</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder={ar ? "مثال: سويسرا" : "e.g. Switzerland"} className={inputCls} />
            </div>
          </section>

          {/* Section 2 */}
          <section className={sectionCls}>
            <p className={sectionTitleCls}><span className="size-1.5 rounded-full bg-[#1C6FB5]" />{ar ? "المواصفات الفنية والمادة" : "Technical & Material Specifications"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{ar ? "نوع المصدر" : "Graft Type"}</label>
                <select value={graftType} onChange={(e) => setGraftType(e.target.value)} className={cn(inputCls, "pe-8")}>
                  {GRAFT_TYPES.map((t) => <option key={t.ar} value={t.ar}>{ar ? t.ar : t.en}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{ar ? "الشكل الفيزيائي" : "Form"}</label>
                <select value={form} onChange={(e) => setForm(e.target.value)} className={cn(inputCls, "pe-8")}>
                  {GRAFT_FORMS.map((f) => <option key={f.ar} value={f.ar}>{ar ? f.ar : f.en}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>{ar ? "مصدر المادة التفصيلي" : "Material Source"}</label>
              <input value={materialSource} onChange={(e) => setMaterialSource(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{ar ? "التركيب المادي" : "Composition"}</label>
              <input value={composition} onChange={(e) => setComposition(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{ar ? "حجم الحبيبات" : "Particle Size"}</label>
                <input value={particleSize} onChange={(e) => setParticleSize(e.target.value)} placeholder="0.25 - 1 mm" dir="ltr" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{ar ? "طريقة التعقيم" : "Sterilization Method"}</label>
                <input value={sterilizationMethod} onChange={(e) => setSterilizationMethod(e.target.value)} placeholder={ar ? "أشعة غاما" : "Gamma"} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{ar ? "مدة الصلاحية والاستخدام" : "Shelf Life & Usage"}</label>
              <input value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} placeholder={ar ? "مثال: 3 سنوات" : "e.g. 3 years"} className={inputCls} />
            </div>
          </section>

          {/* Section 3 */}
          <section className={sectionCls}>
            <p className={sectionTitleCls}><span className="size-1.5 rounded-full bg-[#1C6FB5]" />{ar ? "المميزات والخصائص السريرية" : "Key Clinical Features"}</p>
            <div>
              <label className={labelCls}>{ar ? "المميزات" : "Features"}</label>
              <TagInput value={features} onChange={setFeatures} placeholder={ar ? "اكتب ميزة واضغط Enter" : "Type a feature and press Enter"} />
            </div>
            <div>
              <label className={labelCls}>{ar ? "وصف عام للمنتج" : "General Description"}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={cn(inputCls, "h-auto py-2.5 resize-none")}
              />
            </div>
          </section>

          {/* Section 4 */}
          <section className={sectionCls}>
            <div className="flex items-center justify-between">
              <p className={sectionTitleCls}><span className="size-1.5 rounded-full bg-[#1C6FB5]" />{ar ? "الأحجام والأسعار" : "Pack Sizes & Pricing"}</p>
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, newRow()])}
                className="flex items-center gap-1 text-xs font-bold text-[#1C6FB5] hover:opacity-80"
              >
                <Plus className="size-3.5" />
                {ar ? "إضافة حجم" : "Add size"}
              </button>
            </div>

            {rows.map((r) => (
              <div key={r.key} className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={r.volume}
                    onChange={(e) => updateRow(r.key, { volume: e.target.value })}
                    placeholder={ar ? "مثال: 0.5g أو 0.5cc" : "e.g. 0.5g or 0.5cc"}
                    className="flex-1 h-10 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0]"
                  />
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                    className="size-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition shrink-0"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7A94A8]">$</span>
                    <input
                      value={r.priceUsd}
                      onChange={(e) => updateRow(r.key, { priceUsd: e.target.value })}
                      inputMode="decimal"
                      placeholder="USD"
                      dir="ltr"
                      className="h-10 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] ps-7 pe-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] w-full"
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute start-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#7A94A8]">د.ع</span>
                    <input
                      value={r.priceIqd}
                      onChange={(e) => updateRow(r.key, { priceIqd: e.target.value })}
                      inputMode="decimal"
                      placeholder="IQD"
                      dir="ltr"
                      className="h-10 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] ps-9 pe-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] w-full"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateRow(r.key, { available: !r.available })}
                    className={cn(
                      "h-10 px-2.5 rounded-xl text-[11px] font-bold flex items-center gap-1 transition shrink-0",
                      r.available ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    <Check className="size-3.5" />
                    {r.available ? (ar ? "متوفر" : "Avail.") : (ar ? "نفد" : "Out")}
                  </button>
                </div>
              </div>
            ))}
          </section>

          {/* Section 5 */}
          <section className={sectionCls}>
            <p className={sectionTitleCls}><span className="size-1.5 rounded-full bg-[#1C6FB5]" />{ar ? "الصور والمرفقات" : "Product Images"}</p>
            <div className="grid grid-cols-3 gap-2">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#D3E8F7]">
                  <img src={src} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 end-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
              {imageFiles.length < MAX_PRODUCT_IMAGES && (
                <label className="aspect-square rounded-xl border-2 border-dashed border-[#D3E8F7] flex flex-col items-center justify-center gap-1 text-[#7A94A8] cursor-pointer hover:border-[#2E93E0] hover:text-[#1C6FB5] transition bg-[#E7F4FE]/50">
                  <Upload className="size-5" />
                  <span className="text-[10px] font-bold">{ar ? "إضافة" : "Add"}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </section>

          {error && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="p-4 border-t border-[#D3E8F7] bg-white shrink-0">
          <button
            onClick={submit}
            disabled={busy}
            className="w-full h-12 rounded-2xl text-white font-display font-extrabold text-sm shadow-lg flex items-center justify-center gap-1.5 disabled:opacity-60 transition hover:opacity-95"
            style={{ background: "linear-gradient(to right, #2AA6D1, #4FC3E8)" }}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Image className="size-4" />}
            {ar ? "حفظ البون كرافت" : "Save Bone Graft"}
          </button>
        </div>
      </div>
    </div>
  );
}
