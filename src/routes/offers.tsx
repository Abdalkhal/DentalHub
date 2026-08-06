import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, X, Phone, MapPin, User, Tag, Briefcase,
  GraduationCap, Wrench, Search, TrendingDown, Upload, ImageOff,
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

const PROMO_ITEMS = [
  { id: "p1", title: "كومبوزيت 3M Filtek", vendor: "مكتب بغداد الطبي", oldPrice: 45, newPrice: 38, discount: 15, currency: "USD" as const },
  { id: "p2", title: "طقم زرعات Dentium", vendor: "شركة الموصل", oldPrice: 1200, newPrice: 1020, discount: 15, currency: "USD" as const },
  { id: "p3", title: "تيجان زيركون", vendor: "مختبر دنتال هب", oldPrice: 80, newPrice: 68, discount: 15, currency: "USD" as const },
  { id: "p4", title: "قفازات نتريل (100)", vendor: "مكتب بغداد الطبي", oldPrice: 9, newPrice: 7, discount: 22, currency: "USD" as const },
];

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
          <div className="grid grid-cols-1 gap-3">
            {PROMO_ITEMS.map((p) => (
              <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-start gap-3">
                <span className="size-12 shrink-0 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-extrabold text-xs">-{p.discount}%</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{p.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.vendor}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="font-extrabold text-sm text-primary">{fmtPrice(p.newPrice, p.currency)}</span>
                    <span className="text-[11px] text-slate-400 line-through">{fmtPrice(p.oldPrice, p.currency)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
                  <div key={ad.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                    <p className="font-bold text-sm">{ad.title}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="size-3" />{ad.location}</span>
                      <span className="flex items-center gap-1"><User className="size-3" />{ad.publisher}</span>
                    </div>
                    <p className="font-extrabold text-sm text-primary mt-1.5">{fmtPrice(ad.price, ad.currency)}</p>
                    <div className="flex gap-2 mt-3">
                      <a href={`https://wa.me/${ad.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="flex-1 h-9 rounded-xl bg-emerald-50 text-emerald-700 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-100"><Phone className="size-3" />{ar ? "واتساب" : "WhatsApp"}</a>
                      <a href={`tel:${ad.phone}`} className="flex-1 h-9 rounded-xl bg-sky-50 text-sky-700 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-sky-100"><Phone className="size-3" />{ar ? "اتصال" : "Call"}</a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showForm && <ClassifiedModal ar={ar} onClose={() => setShowForm(false)} onAdd={(ad) => { setClassifieds((prev) => { const updated = [ad, ...prev]; saveClassifieds(updated); return updated; }); setShowForm(false); toast.success(ar ? "تم نشر الإعلان" : "Ad published"); }} />}
    </MobileShell>
  );
}

function ClassifiedModal({ ar, onClose, onAdd }: { ar: boolean; onClose: () => void; onAdd: (ad: Classified) => void }) {
  const [f, setF] = useState({ title: "", location: "", publisher: "", phone: "", price: "", currency: "USD" as "USD" | "IQD", category: "clinic", images: [] as string[] });
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
    onAdd({ id: crypto.randomUUID(), title: f.title.trim(), location: f.location.trim(), publisher: f.publisher.trim(), phone: f.phone.trim(), price: Number(f.price) || 0, currency: f.currency, category: f.category, images: f.images });
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
