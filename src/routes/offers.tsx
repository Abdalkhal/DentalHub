import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useImplantOffers } from "@/lib/implantOffers";
import {
  Plus, X, Phone, MapPin, User, Briefcase, Upload, Megaphone,
  ChevronRight, ChevronLeft, Send, MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/offers")({
  component: OffersPage,
});

type Classified = {
  id: string;
  category: string;
  title: string;
  location: string;
  publisher: string;
  phone: string;
  price: number;
  currency: "USD" | "IQD";
  images: string[];
  description?: string;
};

const CLASSIFIED_CATS = [
  { id: "all", ar: "الكل", en: "All" },
  { id: "clinic", ar: "عيادات وإيجار", en: "Clinics & Rent" },
  { id: "courses", ar: "دورات وورش عمل", en: "Courses & Workshops" },
  { id: "used", ar: "أجهزة مستعملة", en: "Used Equipment" },
  { id: "jobs", ar: "فرص عمل", en: "Job Openings" },
];

function loadClassifieds(): Classified[] {
  try { return JSON.parse(localStorage.getItem("dh_classifieds") || "[]"); } catch { return []; }
}
function saveClassifieds(d: Classified[]) {
  localStorage.setItem("dh_classifieds", JSON.stringify(d));
}

function fmtPrice(n: number, c: string) {
  return c === "IQD" ? `${n.toLocaleString()} د.ع` : `$${n.toFixed(2)}`;
}

function OffersPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [tab, setTab] = useState<"products" | "classifieds">("products");
  const [cat, setCat] = useState("all");
  const [classifieds, setClassifieds] = useState<Classified[]>(loadClassifieds);
  const [showForm, setShowForm] = useState(false);
  const [selectedAd, setSelectedAd] = useState<Classified | null>(null);
  const { offers: realOffers = [], isLoading } = useImplantOffers();

  const filtered = useMemo(() => {
    return cat === "all" ? classifieds : classifieds.filter((c) => c.category === cat);
  }, [classifieds, cat]);

  return (
    <MobileShell>
      <div className="px-3 pt-4 pb-24">
        {/* Top Tab Toggle */}
        <div className="flex gap-1.5 mb-4">
          <button onClick={() => setTab("products")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition border-2", tab === "products" ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200")}>{ar ? "عروض المنتجات والخصومات" : "Product Offers & Discounts"}</button>
          <button onClick={() => setTab("classifieds")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition border-2", tab === "classifieds" ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200")}>{ar ? "الإعلانات والفرص المهنية" : "Classifieds & Opportunities"}</button>
        </div>

        {tab === "products" ? (
          isLoading ? (
            <div className="flex justify-center py-12"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
          ) : realOffers.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Megaphone className="size-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">{ar ? "لا توجد عروض أو خصومات متاحة حالياً" : "No offers available yet"}</p>
              <p className="text-[11px] text-slate-400 mt-1">{ar ? "ستظهر هنا عروض المكاتب والمختبرات" : "Offers from suppliers will appear here"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {realOffers.map((o) => (
                <div key={o.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="font-bold text-sm">{o.title}</p>
                  {o.description && <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{o.description}</p>}
                  {o.price != null && <p className="font-extrabold text-sm text-primary mt-1.5">{fmtPrice(o.price, o.currency || "USD")}</p>}
                  {o.expiryDate && <p className="text-[10px] text-slate-400 mt-1">{ar ? "ينتهي" : "Expires"}: {o.expiryDate}</p>}
                </div>
              ))}
            </div>
          )
        ) : (
          <>
            {/* Category filter chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
              {CLASSIFIED_CATS.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 h-8 px-3 rounded-full text-[11px] font-bold border transition", cat === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200")}>{ar ? c.ar : c.en}</button>
              ))}
            </div>

            <button onClick={() => setShowForm(true)} className="w-full h-11 rounded-2xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 mb-3 shadow-lg">
              <Plus className="size-4" />{ar ? "إضافة إعلان / فرصة" : "Add Ad / Opportunity"}
            </button>

            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Briefcase className="size-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">{ar ? "لا توجد إعلانات" : "No classifieds yet"}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {filtered.map((ad) => (
                  <button
                    key={ad.id}
                    onClick={() => setSelectedAd(ad)}
                    className="w-full bg-white border border-slate-200 rounded-2xl p-3 shadow-sm text-start hover:shadow-md hover:border-slate-300 transition-all flex gap-3 items-stretch"
                  >
                    {/* Thumbnail */}
                    <div className="relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-100">
                      {ad.images[0] ? (
                        <img src={ad.images[0]} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="size-full flex items-center justify-center text-slate-300">
                          <Megaphone className="size-6" />
                        </div>
                      )}
                      {ad.images.length > 1 && (
                        <span className="absolute top-1.5 start-1.5 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold">
                          1/{ad.images.length}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <p className="font-bold text-sm text-slate-800 line-clamp-2">{ad.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="size-3" />{ad.location}</span>
                        <span className="flex items-center gap-1"><User className="size-3" />{ad.publisher}</span>
                      </div>
                      <div className="mt-auto pt-1.5">
                        <p className="font-extrabold text-sm text-primary">{fmtPrice(ad.price, ad.currency)}</p>
                      </div>
                    </div>

                    <ChevronRight className="size-4 self-center text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showForm && <ClassifiedModal ar={ar} onClose={() => setShowForm(false)} onAdd={(ad) => { setClassifieds((prev) => { const updated = [ad, ...prev]; saveClassifieds(updated); return updated; }); setShowForm(false); toast.success(ar ? "تم نشر الإعلان" : "Ad published"); }} />}

      {selectedAd && <AdDetailsModal ar={ar} ad={selectedAd} onClose={() => setSelectedAd(null)} />}
    </MobileShell>
  );
}

function AdDetailsModal({ ar, ad, onClose }: { ar: boolean; ad: Classified; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const images = ad.images.length > 0 ? ad.images : [];
  const current = images[idx] ?? null;

  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-4xl max-h-[92svh] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-base text-slate-800 truncate">
            {ar ? "تفاصيل الإعلان" : "Ad Details"}: {ad.title}
          </h3>
          <button onClick={onClose} className="size-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 shrink-0">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: gallery carousel */}
            <div className="bg-slate-900 md:h-full flex flex-col">
              <div className="relative aspect-square bg-slate-900 flex items-center justify-center">
                {current ? (
                  <img src={current} alt="" className="size-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center text-slate-500">
                    <Megaphone className="size-12 mb-2 opacity-40" />
                    <span className="text-xs">{ar ? "لا توجد صور" : "No images"}</span>
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <button onClick={prev} className="absolute start-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition">
                      <ChevronLeft className="size-5" />
                    </button>
                    <button onClick={next} className="absolute end-2 top-1/2 -translate-y-1/2 size-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition">
                      <ChevronRight className="size-5" />
                    </button>
                    <span className="absolute bottom-2 end-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-bold">
                      {idx + 1}/{images.length}
                    </span>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setIdx(i)}
                      className={`relative shrink-0 size-14 rounded-lg overflow-hidden border-2 transition ${i === idx ? "border-sky-400" : "border-transparent opacity-60 hover:opacity-100"}`}
                    >
                      <img src={img} alt="" className="size-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: info */}
            <div className="p-5 space-y-4 flex flex-col">
              <div>
                <h4 className="font-bold text-lg text-slate-900 leading-snug">{ad.title}</h4>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="size-3.5" />{ad.location || "-"}</span>
                  <span className="flex items-center gap-1"><User className="size-3.5" />{ad.publisher}</span>
                </div>
              </div>

              <span className="inline-flex w-fit px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm font-extrabold">
                {fmtPrice(ad.price, ad.currency)}
              </span>

              {ad.description && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{ar ? "وصف تفصيلي" : "Detailed Description"}</p>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{ad.description}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{ar ? "الفئة" : "Category"}</p>
                <span className="inline-flex px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-[11px] font-bold">
                  {CLASSIFIED_CATS.find((c) => c.id === ad.category)?.ar ?? ad.category}
                </span>
              </div>

              {/* Actions */}
              <div className="mt-auto pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
                <button
                  onClick={() => toast.success(ar ? "تم إرسال طلب الاستفسار" : "Inquiry request sent")}
                  className="h-11 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center gap-1"
                >
                  <Send className="size-3.5" />
                  {ar ? "إرسال طلب استفسار" : "Send Inquiry"}
                </button>
                <a href={`tel:${ad.phone}`} className="h-11 rounded-xl bg-sky-50 text-sky-700 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-sky-100">
                  <Phone className="size-3.5" />
                  {ar ? "اتصال" : "Call"}
                </a>
                <a href={`https://wa.me/${ad.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="h-11 rounded-xl bg-emerald-500 text-white text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-600">
                  <MessageCircle className="size-3.5" />
                  {ar ? "واتساب" : "WhatsApp"}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ClassifiedModal({ ar, onClose, onAdd }: { ar: boolean; onClose: () => void; onAdd: (ad: Classified) => void }) {
  const [f, setF] = useState({ title: "", location: "", publisher: "", phone: "", price: "", currency: "USD" as "USD" | "IQD", category: "clinic", images: [] as string[], description: "" });
  const [previews, setPreviews] = useState<string[]>([]);
  const inp = "w-full h-11 rounded-xl bg-slate-50 border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

  const handleImage = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files).slice(0, 4 - f.images.length)) {
      const url = await new Promise<string>((r) => { const reader = new FileReader(); reader.onload = () => r(reader.result as string); reader.readAsDataURL(file); });
      setF((d) => ({ ...d, images: [...d.images, url] }));
      setPreviews((p) => [...p, URL.createObjectURL(file)]);
    }
  };

  const submit = () => {
    if (!f.title.trim() || !f.publisher.trim()) { toast.error(ar ? "املأ الحقول المطلوبة" : "Fill required fields"); return; }
    onAdd({ id: crypto.randomUUID(), title: f.title.trim(), location: f.location.trim(), publisher: f.publisher.trim(), phone: f.phone.trim(), price: Number(f.price) || 0, currency: f.currency, category: f.category, images: f.images, description: f.description.trim() });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-bold text-lg">{ar ? "إضافة إعلان / فرصة" : "Add Ad / Opportunity"}</h3><button onClick={onClose} className="size-8 rounded-xl bg-slate-100 flex items-center justify-center"><X className="size-4" /></button></div>

        <div className="flex flex-wrap gap-1.5">
          {CLASSIFIED_CATS.filter((c) => c.id !== "all").map((c) => (
            <button key={c.id} onClick={() => setF({ ...f, category: c.id })} className={cn("px-3 h-8 rounded-full text-[11px] font-bold border transition", f.category === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-slate-50 text-slate-600 border-slate-200")}>{ar ? c.ar : c.en}</button>
          ))}
        </div>

        <label className="block"><span className="text-xs font-bold text-slate-500">{ar ? "العنوان" : "Title"} *</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={`${inp} mt-1`} /></label>
        <label className="block"><span className="text-xs font-bold text-slate-500">{ar ? "الموقع" : "Location"}</span><input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} className={`${inp} mt-1`} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-xs font-bold text-slate-500">{ar ? "اسم الناشر" : "Publisher"} *</span><input value={f.publisher} onChange={(e) => setF({ ...f, publisher: e.target.value })} className={`${inp} mt-1`} /></label>
          <label className="block"><span className="text-xs font-bold text-slate-500">{ar ? "رقم الهاتف" : "Phone"}</span><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={`${inp} mt-1`} /></label>
        </div>

        <label className="block"><span className="text-xs font-bold text-slate-500">{ar ? "السعر" : "Price"}</span>
            <div className="flex gap-2 mt-1">
            <input type="number" min="0" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} placeholder="0" className={`${inp} flex-1 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`} dir="ltr" />
            <div className="flex rounded-xl bg-slate-50 border overflow-hidden shrink-0">
              <button onClick={() => setF({ ...f, currency: "USD" })} className={cn("px-3 text-xs font-bold transition", f.currency === "USD" ? "bg-primary text-primary-foreground" : "text-slate-500")}>$</button>
              <button onClick={() => setF({ ...f, currency: "IQD" })} className={cn("px-3 text-xs font-bold transition", f.currency === "IQD" ? "bg-primary text-primary-foreground" : "text-slate-500")}>{ar ? "د.ع" : "IQD"}</button>
            </div>
          </div>
        </label>

        <label className="block"><span className="text-xs font-bold text-slate-500">{ar ? "الوصف التفصيلي" : "Detailed Description"}</span>
          <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} placeholder={ar ? "تفاصيل إضافية، مواصفات، مساحة، معدات..." : "Extra details, specs, area, equipment..."} className="w-full mt-1 rounded-xl bg-slate-50 border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" />
        </label>

        <div>
          <span className="text-xs font-bold text-slate-500">{ar ? "الصور" : "Images"} ({f.images.length}/4)</span>
          <div className="flex gap-2 mt-1.5 flex-wrap">
            {previews.map((url, i) => (
              <div key={i} className="relative size-16 rounded-xl overflow-hidden bg-slate-50 border">
                <img src={url} alt="" className="size-full object-cover" />
                <button onClick={() => { setF({ ...f, images: f.images.filter((_, j) => j !== i) }); setPreviews((p) => p.filter((_, j) => j !== i)); }} className="absolute top-0.5 end-0.5 size-5 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="size-3" /></button>
              </div>
            ))}
            {f.images.length < 4 && (
              <label className="size-16 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition">
                <Upload className="size-4 text-slate-400" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        <button onClick={submit} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold">{ar ? "نشر الإعلان" : "Publish Ad"}</button>
      </div>
    </div>
  );
}
