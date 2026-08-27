import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { auth } from "@/integrations/firebase/client";
import {
  useUpsertSurgicalGuideCompany,
  uploadGuideFile,
  SURGICAL_GUIDE_SOFTWARE,
  SURGICAL_GUIDE_SYSTEMS,
  SURGICAL_GUIDE_MATERIALS,
  type SurgicalGuideCompany,
} from "@/lib/surgicalGuides";
import {
  X,
  Plus,
  Trash2,
  Upload,
  Image,
  Check,
  Loader2,
  ChevronDown,
  Building2,
  Phone,
  Layers,
  Printer,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/surgical-guide/create")({
  component: SurgicalGuideCreate,
});

const MAX_GALLERY = 10;

function SurgicalGuideCreate() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const upsert = useUpsertSurgicalGuideCompany();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [city, setCity] = useState("");
  const [software, setSoftware] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [systems, setSystems] = useState<string[]>(["Conventional"]);
  const [material, setMaterial] = useState("Medical Grade Resin");
  const [gallery, setGallery] = useState<
    { file: File; preview: string; caption: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const inputCls =
    "w-full h-12 rounded-2xl bg-white border border-slate-200 px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition";
  const labelCls = "text-[11px] font-bold text-slate-500 mb-1.5 block";
  const cardCls = "rounded-2xl bg-white border border-slate-200/80 shadow-sm p-4 space-y-3";
  const sectionTitleCls = "text-sm font-bold text-slate-800 flex items-center gap-1.5";

  const descWords = description.trim() ? description.trim().length : 0;

  const handleLogo = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  };

  const addGalleryFiles = (files: FileList | null) => {
    if (!files) return;
    const incoming = Array.from(files).slice(0, MAX_GALLERY - gallery.length);
    if (incoming.length === 0) return;
    setGallery((prev) => [
      ...prev,
      ...incoming.map((f) => ({ file: f, preview: URL.createObjectURL(f), caption: "" })),
    ]);
  };

  const removeGallery = (idx: number) => {
    setGallery((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const toggleSystem = (en: string) => {
    setSystems((prev) =>
      prev.includes(en) ? prev.filter((x) => x !== en) : [...prev, en],
    );
  };

  const submit = async () => {
    setError("");
    if (!nameAr.trim()) {
      setError(ar ? "الرجاء إدخال اسم الشركة بالعربية" : "Please enter the Arabic company name");
      return;
    }
    if (!nameEn.trim()) {
      setError(ar ? "الرجاء إدخال اسم الشركة بالإنجليزية" : "Please enter the English company name");
      return;
    }
    if (!software) {
      setError(ar ? "الرجاء اختيار برنامج التصميم" : "Please select a design software");
      return;
    }

    setBusy(true);
    try {
      const id = crypto.randomUUID();
      const uid = auth.currentUser?.uid ?? "";

      let logoUrl: string | undefined;
      if (logoFile) {
        logoUrl = await uploadGuideFile(id, logoFile);
      }

      const galleryData: { url: string; caption: string }[] = [];
      for (const g of gallery) {
        const url = await uploadGuideFile(id, g.file);
        galleryData.push({ url, caption: g.caption.trim() });
      }

      const payload: SurgicalGuideCompany = {
        id,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim(),
        city: city.trim(),
        software,
        phone: phone.trim(),
        description: description.trim(),
        logoUrl,
        systems,
        printingMaterial: material,
        gallery: galleryData,
        companyId: uid,
        createdAt: Date.now(),
      };

      await upsert.mutateAsync(payload);

      toast.success(ar ? "تم حفظ الشركة بنجاح" : "Company saved successfully");
      navigate({ to: "/surgical-guide" });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "إضافة شركة دليل جراحي" : "Add Surgical Guide Company"} showBack />
      <div className="px-4 pt-4 pb-10 space-y-4">
        {/* Section 1: Basic Information */}
        <section className={cardCls}>
          <p className={sectionTitleCls}>
            <Building2 className="size-4 text-emerald-600" />
            {ar ? "معلومات الشركة الأساسية" : "Basic Information"}
          </p>

          <div className="flex items-start gap-4">
            <div className="shrink-0 w-24">
              <label className={labelCls}>{ar ? "شعار الشركة" : "Company Logo"}</label>
              {logoPreview ? (
                <div className="relative size-24 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50">
                  <img src={logoPreview} alt="" className="size-full object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      URL.revokeObjectURL(logoPreview);
                      setLogoPreview("");
                      setLogoFile(null);
                      if (logoInputRef.current) logoInputRef.current.value = "";
                    }}
                    className="absolute top-1 end-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ) : (
                <label className="size-24 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-400 hover:text-emerald-500 transition text-slate-400">
                  <Upload className="size-6" />
                  <span className="text-[9px] font-bold">{ar ? "رفع الشعار" : "Upload"}</span>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => handleLogo(e.target.files)}
                  />
                </label>
              )}
            </div>

            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  {ar ? "اسم الشركة بالعربية" : "Arabic Company Name"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder={ar ? "مثال: شركة دليل المستقبل" : "e.g. Future Guide Co."} className={inputCls} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>
                  {ar ? "اسم الشركة بالإنجليزية" : "English Company Name"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="e.g. Future Guide Co." dir="ltr" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{ar ? "المدينة" : "City"}</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={ar ? "مثال: الموصل" : "e.g. Mosul"} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>
                  {ar ? "برنامج التصميم" : "Design Software"}{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select value={software} onChange={(e) => setSoftware(e.target.value)} className={cn(inputCls, "appearance-none pe-9")}>
                    <option value="">{ar ? "-- اختر --" : "-- Select --"}</option>
                    {SURGICAL_GUIDE_SOFTWARE.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute end-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{ar ? "رقم الهاتف" : "Phone Number"}</label>
                <div className="relative">
                  <Phone className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+964 7XX XXX XXXX" dir="ltr" className={cn(inputCls, "ps-10")} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>{ar ? "وصف الشركة" : "Company Description"}</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
                  rows={4}
                  placeholder={ar ? "اكتب نبذة عن الشركة وخدماتها..." : "Describe the company and its services..."}
                  className={cn(inputCls, "h-auto py-3 resize-none")}
                />
                <p className="text-[10px] font-semibold text-slate-400 text-end">{descWords}/1000</p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Supported Systems */}
        <section className={cardCls}>
          <p className={sectionTitleCls}>
            <Layers className="size-4 text-emerald-600" />
            {ar ? "الأنظمة الجراحية المدعومة" : "Supported Systems"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SURGICAL_GUIDE_SYSTEMS.map((s) => {
              const active = systems.includes(s.en);
              return (
                <button
                  key={s.en}
                  type="button"
                  onClick={() => toggleSystem(s.en)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition text-start",
                    active
                      ? "bg-emerald-50 border-emerald-400 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-700 hover:border-emerald-400",
                  )}
                >
                  <span
                    className={cn(
                      "size-4 rounded border flex items-center justify-center shrink-0 transition",
                      active ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300",
                    )}
                  >
                    {active && <Check className="size-3" />}
                  </span>
                  {ar ? s.ar : s.en}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Printing Material */}
        <section className={cardCls}>
          <p className={sectionTitleCls}>
            <Printer className="size-4 text-emerald-600" />
            {ar ? "مادة طباعة الدليل الجراحي" : "Printing Material"}
          </p>
          <div className="space-y-2">
            {SURGICAL_GUIDE_MATERIALS.map((m) => (
              <label
                key={m.en}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer transition",
                  material === m.en
                    ? "bg-emerald-50 border-emerald-400"
                    : "bg-white border-slate-200 hover:border-emerald-400",
                )}
              >
                <input
                  type="radio"
                  name="print-material"
                  checked={material === m.en}
                  onChange={() => setMaterial(m.en)}
                  className="accent-emerald-600 size-4"
                />
                <span className={cn("text-sm font-semibold", material === m.en ? "text-emerald-700" : "text-slate-700")}>
                  {ar ? m.ar : m.en}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Section 4: Clinical Cases Gallery */}
        <section className={cardCls}>
          <p className={sectionTitleCls}>
            <Image className="size-4 text-emerald-600" />
            {ar ? "معرض صور وفيديوهات الحالات" : "Clinical Cases & Work Gallery"}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {gallery.map((g, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  <img src={g.preview} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGallery(idx)}
                    className="absolute top-1 end-1 size-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <input
                  value={g.caption}
                  onChange={(e) =>
                    setGallery((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, caption: e.target.value } : x)),
                    )
                  }
                  placeholder={ar ? "وصف الصورة" : "Caption"}
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-[10px] text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            ))}
            {gallery.length < MAX_GALLERY && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition"
              >
                <Plus className="size-6" />
                <span className="text-[10px] font-bold">{ar ? "إضافة" : "Add"}</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-400">
            {gallery.length}/{MAX_GALLERY} · {ar ? "صور أو فيديوهات" : "photos or videos"}
          </p>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,video/mp4"
            multiple
            className="hidden"
            onChange={(e) => addGalleryFiles(e.target.files)}
          />
        </section>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 text-center font-semibold">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full h-14 rounded-2xl text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition hover:opacity-95 disabled:opacity-60"
          style={{ background: "linear-gradient(to right, #10B981, #059669)" }}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
          {busy ? (ar ? "جارٍ الحفظ..." : "Saving...") : ar ? "حفظ الشركة" : "Save Company"}
        </button>
      </div>
    </MobileShell>
  );
}
