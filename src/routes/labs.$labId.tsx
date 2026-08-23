import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { LabRxFormModal } from "@/components/LabRxFormModal";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Clock, Sparkles, Crown, Stethoscope, MapPin, Phone, Loader2,
  ShoppingCart, ChevronLeft, ChevronRight, Send,
} from "lucide-react";

export const Route = createFileRoute("/labs/$labId")({
  component: LabPage,
});

type Service = {
  id: string; titleAr: string; titleEn: string; category: string;
  turnaroundAr: string; turnaroundEn: string;
  price: number; currency: "USD" | "IQD"; imageUrl?: string;
};

const PILL_COLORS = ["bg-sky-500","bg-violet-500","bg-indigo-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-cyan-500","bg-fuchsia-500"];

function LabPage() {
  const { labId } = Route.useParams();
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const BackIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  const [profile, setProfile] = useState<UserRoleDoc | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showSendCase, setShowSendCase] = useState(false);

  useEffect(() => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) { done = true; setLoading(false); }
    }, 8000);

    const unsubProfile = onSnapshot(doc(db, "user_roles", labId), (snap) => {
      if (snap.exists()) setProfile(snap.data() as UserRoleDoc);
      if (!done) { done = true; clearTimeout(timeout); }
      setLoading(false);
    }, () => {
      if (!done) { done = true; clearTimeout(timeout); }
      setLoading(false);
    });

    const unsubServices = onSnapshot(doc(db, "lab_services", labId), (snap) => {
      if (snap.exists()) setServices((snap.data() as any).services ?? []);
      else setServices([]);
    });

    return () => { clearTimeout(timeout); unsubProfile(); unsubServices(); };
  }, [labId]);

  const labName = profile?.name || (ar ? "مختبر" : "Lab");
  const phone = profile?.phone || "";
  const address = profile?.address || "";

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

  if (loading) return <MobileShell><TopBar title={ar ? "تحميل..." : "Loading..."} showBack /><div className="flex justify-center py-20"><Loader2 className="size-8 animate-spin text-primary" /></div></MobileShell>;

  if (!profile) return <MobileShell><TopBar title={ar ? "غير موجود" : "Not found"} showBack /><div className="p-6 text-center text-slate-400"><p className="font-semibold">{ar ? "المختبر غير موجود" : "Lab not found"}</p></div></MobileShell>;

  return (
    <MobileShell>
      <TopBar title={labName} showBack />

      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Profile header */}
        <div className="bg-gradient-to-r from-sky-50 to-indigo-50/30 border border-sky-100 rounded-3xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="size-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center font-bold text-xl shrink-0">
              {labName.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-lg text-slate-800">{labName}</p>
              <span className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full mt-1.5 bg-sky-50 text-sky-600">{ar ? "مختبر أسنان" : "Dental Lab"}</span>
              {phone && <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-2.5"><Phone className="size-3.5" />{phone.replace(/\D/g, "").replace(/^964/, "+964 ")}</p>}
            </div>
          </div>
          {address && <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-3 border-t border-sky-100 pt-3"><MapPin className="size-3.5" />{address}</p>}

          <button
            onClick={() => setShowSendCase(true)}
            className="w-full mt-4 h-10 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-600 transition"
          >
            <Send className="size-4" />
            {ar ? "إرسال حالة للمختبر" : "Send case to lab"}
          </button>
        </div>

        {/* Filter pills */}
        {services.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <Pill active={filter === "all"} color="bg-sky-500" onClick={() => setFilter("all")}>{ar ? "الكل" : "All"}</Pill>
            {dynamicCategories.map((c) => <Pill key={c.id} active={filter === c.id} color={c.color} onClick={() => setFilter(c.id)}>{c.id}</Pill>)}
          </div>
        )}

        {/* Services grid */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Stethoscope className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">{ar ? "لا توجد خدمات بعد" : "No services yet"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((s) => {
              const cat = dynamicCategories.find((c) => c.id === s.category);
              const fmt = s.currency === "IQD" ? `${s.price.toLocaleString()} د.ع` : `$${s.price.toFixed(2)}`;
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className={cn("h-1", cat?.color ?? "bg-slate-300")} />
                  {s.imageUrl ? <div className="h-36 bg-slate-50 flex items-center justify-center p-2"><img src={s.imageUrl} alt="" className="size-full object-contain" loading="lazy" /></div>
                  : <div className="h-24 bg-slate-50 flex items-center justify-center"><Crown className="size-8 text-slate-300" /></div>}
                  <div className="p-3">
                    <p className="font-bold text-sm leading-snug line-clamp-2 text-slate-800">{ar ? s.titleAr : s.titleEn}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 rounded-lg text-[10px] font-semibold text-slate-600"><Clock className="size-3" />{ar ? s.turnaroundAr : s.turnaroundEn}</span>
                      <span className="font-bold text-sm text-blue-600">{fmt}</span>
                    </div>
                    {s.category && <p className="text-[10px] text-slate-400 mt-1.5">{ar ? `الفئة: ${s.category}` : `Category: ${s.category}`}</p>}
                    <button className="w-full h-7 mt-2 rounded-lg bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-primary/20 transition">
                      <ShoppingCart className="size-3" />{ar ? "طلب" : "Order"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <LabRxFormModal
        labId={labId}
        labName={labName}
        labPhone={phone}
        labAddress={address}
        labInstagram={(profile as any).instagram || ""}
        open={showSendCase}
        onClose={() => setShowSendCase(false)}
      />
    </MobileShell>
  );
}

function Pill({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={cn("shrink-0 px-4 h-9 rounded-full text-xs font-bold border-2 transition-all", active ? `${color} text-white border-transparent shadow-lg` : "bg-white text-slate-600 border-slate-200 hover:border-slate-300")}>{children}</button>;
}
