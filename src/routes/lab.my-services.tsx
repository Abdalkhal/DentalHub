import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/integrations/firebase/client";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus, X, CheckCircle2, Clock, Sparkles, Crown, Upload,
  ChevronLeft, ChevronRight, Stethoscope, Loader2, Pencil, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/lab/my-services")({
  component: LabMyServices,
});

type Service = {
  id: string;
  titleAr: string;
  titleEn: string;
  category: string;
  turnaroundAr: string;
  turnaroundEn: string;
  price: number;
  currency: "USD" | "IQD";
  imageUrl?: string;
};

const PILL_COLORS = [
  "bg-sky-500", "bg-violet-500", "bg-indigo-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-fuchsia-500",
];

const INITIAL_FORM = { titleAr: "", titleEn: "", category: "", turnaroundAr: "", turnaroundEn: "", price: "", currency: "USD" as "USD" | "IQD" };

function LabMyServices() {
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const BackIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  const labId = auth.currentUser?.uid;

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["lab-services", labId],
    queryFn: async (): Promise<Service[]> => {
      if (!labId) return [];
      const s = await getDoc(doc(db, "lab_services", labId));
      return s.exists() ? ((s.data() as any).services ?? []) : [];
    },
    enabled: !!labId,
  });

  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState("");
  const [editingImg, setEditingImg] = useState("");

  const dynamicCategories = useMemo(() => {
    const seen = new Set<string>();
    return services.reduce((acc, s) => {
      const c = s.category.trim();
      if (c && !seen.has(c)) { seen.add(c); acc.push({ id: c, color: PILL_COLORS[acc.length % PILL_COLORS.length] }); }
      return acc;
    }, [] as { id: string; color: string }[]);
  }, [services]);

  const filtered = useMemo(() =>
    filter === "all" ? services : services.filter((s) => s.category === filter),
  [services, filter]);

  const openAdd = () => { setEditingId(null); setForm({ ...INITIAL_FORM }); setImgFile(null); setImgPreview(""); setEditingImg(""); setShowForm(true); };
  const openEdit = (s: Service) => { setEditingId(s.id); setForm({ titleAr: s.titleAr, titleEn: s.titleEn, category: s.category, turnaroundAr: s.turnaroundAr, turnaroundEn: s.turnaroundEn, price: String(s.price || ""), currency: s.currency || "USD" }); setImgFile(null); setImgPreview(""); setEditingImg(s.imageUrl || ""); setShowForm(true); };

  const save = async () => {
    if (!form.titleAr.trim()) { toast.error(ar ? "اسم الخدمة مطلوب" : "Service name required"); return; }
    if (!labId) { toast.error(ar ? "الرجاء تسجيل الدخول" : "Please login"); return; }
    setSaving(true);
    try {
      let img = editingImg;
      if (imgFile) img = await new Promise<string>((r) => { const reader = new FileReader(); reader.onload = () => r(reader.result as string); reader.readAsDataURL(imgFile); });
      const svc: Service = { id: editingId ?? crypto.randomUUID(), titleAr: form.titleAr.trim(), titleEn: form.titleEn.trim() || form.titleAr.trim(), category: form.category.trim(), turnaroundAr: form.turnaroundAr.trim(), turnaroundEn: form.turnaroundEn.trim(), price: parseFloat(form.price) || 0, currency: form.currency, imageUrl: img || undefined };
      const updated = editingId ? services.map((s) => (s.id === editingId ? svc : s)) : [svc, ...services];
      await setDoc(doc(db, "lab_services", labId), { services: updated }, { merge: true });
      await queryClient.invalidateQueries({ queryKey: ["lab-services", labId] });
      toast.success(ar ? "تمت إضافة الخدمة بنجاح" : "Service added successfully");
      setShowForm(false);
    } catch (e: any) {
      toast.error(ar ? `فشل: ${e.message || e}` : `Failed: ${e.message || e}`);
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    const updated = services.filter((s) => s.id !== id);
    await setDoc(doc(db, "lab_services", labId!), { services: updated }, { merge: true });
    queryClient.invalidateQueries({ queryKey: ["lab-services", labId] });
  };

  if (!labId) {
    return <MobileShell><div className="flex items-center justify-center min-h-svh"><Loader2 className="size-8 animate-spin text-primary" /></div></MobileShell>;
  }

  return (
    <MobileShell hideBottomNav>
      <div className="min-h-svh bg-slate-50">
        {/* Header */}
        <div className="bg-gradient-to-br from-sky-500 to-indigo-600 rounded-b-[2.5rem] px-5 pt-6 pb-8 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => navigate({ to: "/labs/dashboard" })} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 text-white text-xs font-bold hover:bg-white/25"><BackIcon className="size-4" />{ar ? "رجوع" : "Back"}</button>
            <span className="text-[10px] font-bold text-white/80 tracking-widest">DentalHub</span>
            <div className="size-10 rounded-full bg-white/15 flex items-center justify-center"><Stethoscope className="size-5 text-white" /></div>
          </div>
          <h1 className="font-display font-extrabold text-xl text-white">{ar ? "خدمات المختبر" : "Lab Services"}</h1>
        </div>

        {/* Filter pills */}
        <div className="px-4 -mt-5 relative z-10">
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            <Pill active={filter === "all"} color="bg-sky-500" onClick={() => setFilter("all")} label={ar ? "الكل" : "All"} />
            {dynamicCategories.map((c) => <Pill key={c.id} active={filter === c.id} color={c.color} onClick={() => setFilter(c.id)} label={c.id} />)}
          </div>
        </div>

        {/* Add button */}
        <div className="px-4 mt-3">
          <button onClick={openAdd} className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition"><Plus className="size-5" />{ar ? "إضافة خدمة / نوع عمل" : "Add Service / Work Type"}</button>
        </div>

        {/* Grid */}
        <div className="px-4 mt-4 pb-8">
          {isLoading ? <div className="flex justify-center py-16"><Loader2 className="size-8 animate-spin text-primary" /></div>
          : filtered.length === 0 ? <div className="py-16 text-center text-slate-400"><Sparkles className="size-10 mx-auto mb-3 opacity-30" /><p className="font-semibold">{ar ? "لا توجد خدمات" : "No services yet"}</p></div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => {
              const cat = dynamicCategories.find((c) => c.id === s.category);
              const fmt = s.currency === "IQD" ? `${s.price.toLocaleString()} د.ع` : `$${s.price.toFixed(2)}`;
              return (
                <div key={s.id} className="group bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-lg transition-all">
                  <div className={cn("h-1", cat?.color ?? "bg-slate-300")} />
                  {s.imageUrl ? <div className="h-40 bg-slate-50 flex items-center justify-center"><img src={s.imageUrl} alt="" className="size-full object-contain" loading="lazy" /></div>
                  : <div className="h-28 bg-slate-50 flex items-center justify-center"><Crown className="size-10 text-slate-300" /></div>}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-sm leading-snug line-clamp-2 flex-1">{ar ? s.titleAr : s.titleEn}</p>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                        <button onClick={() => openEdit(s)} className="size-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100"><Pencil className="size-3" /></button>
                        <button onClick={() => remove(s.id)} className="size-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100"><Trash2 className="size-3" /></button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg text-[10px] font-semibold text-slate-600"><Clock className="size-3" />{ar ? s.turnaroundAr : s.turnaroundEn}</span>
                      <span className="font-bold text-sm text-blue-600">{fmt}</span>
                    </div>
                    {s.category && <p className="text-[10px] text-slate-400 mt-1.5">{ar ? `الفئة: ${s.category}` : `Category: ${s.category}`}</p>}
                  </div>
                </div>
              );
            })}
          </div>}
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-3 max-h-[90svh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between"><h3 className="font-bold text-lg">{editingId ? (ar ? "تعديل" : "Edit") : ar ? "إضافة خدمة" : "Add Service"}</h3><button onClick={() => setShowForm(false)} className="size-8 rounded-xl hover:bg-slate-100 flex items-center justify-center"><X className="size-4" /></button></div>
            <F label={ar ? "اسم الخدمة (عربي)" : "Service Name (Arabic)"} v={form.titleAr} onChange={(v) => setForm((d) => ({ ...d, titleAr: v }))} ph={ar ? "مثال: تاج زيركونيا" : "e.g. Zirconia Crown"} />
            <F label={ar ? "اسم الخدمة (إنكليزي)" : "Service Name (English)"} v={form.titleEn} onChange={(v) => setForm((d) => ({ ...d, titleEn: v }))} ph="Optional" />
            <F label={ar ? "الفئة" : "Category"} v={form.category} onChange={(v) => setForm((d) => ({ ...d, category: v }))} ph={ar ? "مثال: تركيبات ثابتة، زيركون" : "e.g. Fixed, Zirconia"} />
            <F label={ar ? "وقت الإنجاز (عربي)" : "Turnaround (Arabic)"} v={form.turnaroundAr} onChange={(v) => setForm((d) => ({ ...d, turnaroundAr: v }))} ph={ar ? "مثال: 3-4 أيام" : "e.g. 3-4 days"} />
            <F label={ar ? "وقت الإنجاز (إنكليزي)" : "Turnaround (English)"} v={form.turnaroundEn} onChange={(v) => setForm((d) => ({ ...d, turnaroundEn: v }))} ph="Optional" />
            <div><label className="text-xs font-bold text-muted-foreground mb-1.5 block">{ar ? "السعر" : "Price"}</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((d) => ({ ...d, price: e.target.value }))} placeholder="0.00" dir="ltr" className="flex-1 h-11 rounded-xl bg-slate-50 border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
                <div className="flex rounded-xl bg-slate-50 border overflow-hidden shrink-0">
                  <button type="button" onClick={() => setForm((d) => ({ ...d, currency: "USD" }))} className={cn("px-3 text-xs font-bold transition", form.currency === "USD" ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700")}>$</button>
                  <button type="button" onClick={() => setForm((d) => ({ ...d, currency: "IQD" }))} className={cn("px-3 text-xs font-bold transition", form.currency === "IQD" ? "bg-primary text-primary-foreground" : "text-slate-500 hover:text-slate-700")}>{ar ? "د.ع" : "IQD"}</button>
                </div>
              </div>
            </div>
            <div><label className="text-xs font-bold text-muted-foreground mb-1.5 block">{ar ? "صورة" : "Image"} ({ar ? "اختياري" : "optional"})</label>
              {imgPreview ? <div className="relative h-40 rounded-xl overflow-hidden bg-slate-50 border"><img src={imgPreview} alt="" className="size-full object-contain" /><button type="button" onClick={() => { setImgFile(null); setImgPreview(""); }} className="absolute top-2 end-2 size-7 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="size-3.5" /></button></div>
              : editingImg ? <div className="relative h-40 rounded-xl overflow-hidden bg-slate-50 border"><img src={editingImg} alt="" className="size-full object-contain" /><button type="button" onClick={() => setEditingImg("")} className="absolute top-2 end-2 size-7 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="size-3.5" /></button></div>
              : <label className="flex flex-col items-center justify-center gap-1.5 h-32 rounded-xl border-2 border-dashed border-border bg-slate-50 cursor-pointer hover:border-primary/40 hover:bg-sky-50/30 transition"><Upload className="size-6 text-slate-400" /><span className="text-xs text-slate-400">{ar ? "اضغط لرفع صورة" : "Tap to upload"}</span><input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImgFile(f); setImgPreview(URL.createObjectURL(f)); } }} /></label>}
            </div>
            <button type="button" onClick={save} disabled={saving || !form.titleAr.trim()} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition">{saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{editingId ? (ar ? "حفظ" : "Save") : ar ? "إضافة الخدمة" : "Add Service"}</button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}

function Pill({ active, color, onClick, label }: { active: boolean; color: string; onClick: () => void; label: string }) {
  return <button onClick={onClick} className={cn("shrink-0 px-4 h-10 rounded-full text-xs font-bold border-2 transition-all", active ? `${color} text-white border-transparent shadow-lg` : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>{label}</button>;
}

function F({ label, v, onChange, ph }: { label: string; v: string; onChange: (v: string) => void; ph: string }) {
  return <div><label className="text-xs font-bold text-muted-foreground mb-1.5 block">{label}</label><input value={v} onChange={(e) => onChange(e.target.value)} placeholder={ph} className="w-full h-11 rounded-xl bg-slate-50 border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></div>;
}
