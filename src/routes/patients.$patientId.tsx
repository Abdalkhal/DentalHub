import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { STATUS_META, HISTORY_LABELS, inputCls, Field } from "./patients.index";
import { DentalArch, LEGEND_ORDER, TOOTH_META } from "@/components/DentalArch";
import { ArchViewer, ARCH_ZOOM_MIN, ARCH_ZOOM_MAX } from "@/components/ArchViewer";

import {
  addFile,
  addLogEntry,
  addPayment,
  addPlanStep,
  addVisit,
  cyclePlanStep,
  getLog,
  getPlan,
  paidTotal,
  removeFile,
  removeLogEntry,
  removePayment,
  removePlanStep,
  removeVisit,
  setTooth,
  updatePatient,
  updatePlanStep,
  usePatients,
  type PlanStatus,
  type ToothStatus,
} from "@/lib/patientsStore";
import { listOrders } from "@/lib/ordersStore";
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  Brush,
  HeartPulse,
  Shield,
  Camera,
  CircleDot,
  LayoutGrid,
  Activity,
  Grid3x3,
  Wand2,
  Repeat,
  ClipboardPlus,
  X,

  Bell,
  Bone,
  CalendarDays,
  Check,
  Cloud,
  FileImage,
  Info,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Scan,
  Share2,
  Smile,
  Syringe,
  Trash2,
  Wallet,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export const Route = createFileRoute("/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "سجل المريض | DentalHub" },
      { name: "description", content: "ملف المريض التفصيلي: خريطة الأسنان التفاعلية، الخطة العلاجية، التاريخ المرضي، المرفقات والحسابات." },
      { property: "og:title", content: "سجل المريض | DentalHub" },
      { property: "og:description", content: "ملف المريض التفصيلي داخل DentalHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PatientProfile,
});

type TabKey = "summary" | "history" | "meds" | "files" | "notes" | "visits" | "orders" | "billing";

type Sub = { ar: string; en: string };

const BRANCHES: Array<{ key: string; ar: string; en: string; icon: typeof Smile; cls: string; subs: Sub[] }> = [
  {
    key: "radio", ar: "أشعة الأسنان", en: "Radiology", icon: Camera,
    cls: "bg-[oklch(0.95_0.04_215)] text-[oklch(0.45_0.13_220)]",
    subs: [],
  },
  {
    key: "pedo", ar: "الأسنان اللبنية", en: "Pediatric", icon: Baby,
    cls: "bg-[oklch(0.95_0.05_160)] text-[oklch(0.45_0.12_165)]",
    subs: [
      { ar: "أسنان لبنية (Primary Teeth)", en: "Primary teeth" },
      { ar: "حشوات الأطفال", en: "Pediatric fillings" },
      { ar: "بتر العصب (Pulpotomy)", en: "Pulpotomy" },
      { ar: "حافظ مسافة (Space Maintainer)", en: "Space maintainer" },
    ],
  },
  {
    key: "scaling", ar: "تنظيف الأسنان", en: "Scaling", icon: Brush,
    cls: "bg-[oklch(0.95_0.05_200)] text-[oklch(0.45_0.13_200)]",
    subs: [
      { ar: "إزالة الجير (Scaling)", en: "Scaling" },
      { ar: "التلميع (Polishing)", en: "Polishing" },
    ],
  },
  {
    key: "perio", ar: "علاج اللثة", en: "Periodontics", icon: HeartPulse,
    cls: "bg-[oklch(0.95_0.05_20)] text-[oklch(0.5_0.16_20)]",
    subs: [
      { ar: "تنظيف لثة عميق (Root Planing)", en: "Root planing" },
      { ar: "قص وتجميل اللثة (Gingivectomy)", en: "Gingivectomy" },
      { ar: "علاج الجيوب اللثوية", en: "Periodontal pockets treatment" },
    ],
  },
  {
    key: "preventive", ar: "العلاجات الوقائية", en: "Preventive", icon: Shield,
    cls: "bg-[oklch(0.95_0.05_150)] text-[oklch(0.45_0.13_155)]",
    subs: [
      { ar: "تطبيق الفلورايد (Fluoride Application)", en: "Fluoride application" },
      { ar: "سد الشقوق (Fissure Sealants)", en: "Fissure sealants" },
    ],
  },
  {
    key: "fillings", ar: "حشوات الأسنان", en: "Fillings", icon: ClipboardPlus,
    cls: "bg-[oklch(0.95_0.04_270)] text-[oklch(0.45_0.14_270)]",
    subs: [
      { ar: "حشوة كاريز تجميلية (Composite)", en: "Composite filling" },
      { ar: "حشوة مؤقتة", en: "Temporary filling" },
      { ar: "حشوة زجاجية (GIC)", en: "GIC filling" },
    ],
  },
  {
    key: "endo", ar: "علاج العصب", en: "Endodontics", icon: CircleDot,
    cls: "bg-[oklch(0.96_0.05_60)] text-[oklch(0.5_0.14_50)]",
    subs: [
      { ar: "علاج عصب (Root Canal Treatment)", en: "Root canal treatment" },
      { ar: "إعادة علاج عصب (Re-RCT)", en: "Re-RCT" },
      { ar: "حشو القناة الجذرية", en: "Root canal obturation" },
    ],
  },
  {
    key: "prostho", ar: "التركيبات والجسور", en: "Prosthodontics", icon: LayoutGrid,
    cls: "bg-[oklch(0.95_0.05_190)] text-[oklch(0.45_0.12_195)]",
    subs: [
      { ar: "تاج زيركون / بورسلين (Crowns)", en: "Crown" },
      { ar: "جسور ثابتة (Bridges)", en: "Fixed bridge" },
      { ar: "تركيبة متحركة", en: "Removable denture" },
    ],
  },
  {
    key: "surgery", ar: "جراحة الفم والخلع", en: "Oral surgery", icon: Activity,
    cls: "bg-[oklch(0.95_0.04_240)] text-[oklch(0.45_0.14_245)]",
    subs: [
      { ar: "خلع بسيط", en: "Simple extraction" },
      { ar: "خلع جراحي (Tooth Extraction)", en: "Surgical extraction" },
      { ar: "جراحة فموية", en: "Oral surgery" },
    ],
  },
  {
    key: "ortho", ar: "تقويم الأسنان", en: "Orthodontics", icon: Grid3x3,
    cls: "bg-[oklch(0.95_0.05_300)] text-[oklch(0.45_0.15_300)]",
    subs: [
      { ar: "تقويم معدني", en: "Metal braces" },
      { ar: "تقويم شفاف (Clear Aligners)", en: "Clear aligners" },
      { ar: "متابعة تقويم", en: "Ortho follow-up" },
    ],
  },
  {
    key: "implant", ar: "زراعة الأسنان", en: "Implantology", icon: Syringe,
    cls: "bg-[oklch(0.96_0.05_75)] text-[oklch(0.5_0.14_65)]",
    subs: [
      { ar: "زراعة سن (Dental Implant)", en: "Dental implant" },
      { ar: "طعم عظم (Bone Graft)", en: "Bone graft" },
    ],
  },
  {
    key: "cosmetic", ar: "تجميل الأسنان", en: "Cosmetic", icon: Wand2,
    cls: "bg-[oklch(0.95_0.05_330)] text-[oklch(0.5_0.15_330)]",
    subs: [
      { ar: "تبييض الأسنان (Teeth Whitening)", en: "Teeth whitening" },
      { ar: "عدسات تجميلية (Veneers / Lumineers)", en: "Veneers / Lumineers" },
    ],
  },
];



const PLAN_META: Record<PlanStatus, { ar: string; en: string; cls: string; num: string }> = {
  done: { ar: "مكتمل", en: "Done", cls: "bg-emerald-100 text-emerald-700", num: "bg-emerald-500" },
  active: { ar: "قيد التنفيذ", en: "In progress", cls: "bg-blue-100 text-blue-700", num: "bg-blue-500" },
  planned: { ar: "مقترح", en: "Planned", cls: "bg-muted text-muted-foreground", num: "bg-slate-400" },
};

function PatientProfile() {
  const { patientId } = Route.useParams();
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const patients = usePatients();
  const p = patients.find((x) => x.id === patientId);
  const [tab, setTab] = useState<TabKey>("summary");
  const Back = dir === "rtl" ? ArrowRight : ArrowLeft;

  if (!p) {
    return (
      <MobileShell>
        <div className="p-6 text-center">
          <p className="text-sm font-semibold">{ar ? "لم يتم العثور على المريض" : "Patient not found"}</p>
          <Link to="/patients" className="text-primary text-xs font-bold mt-2 inline-block">
            {ar ? "العودة لسجل المرضى" : "Back to patients"}
          </Link>
        </div>
      </MobileShell>
    );
  }

  const tabs: Array<{ key: TabKey; ar: string; en: string }> = [
    { key: "summary", ar: "ملخص", en: "Summary" },
    { key: "history", ar: "التاريخ المرضي", en: "History" },
    { key: "meds", ar: "الأدوية والحساسيات", en: "Meds & allergies" },
    { key: "files", ar: "المرفقات", en: "Attachments" },
    { key: "notes", ar: "الملاحظات", en: "Notes" },
    { key: "visits", ar: "الزيارات", en: "Visits" },
    { key: "orders", ar: "طلبات المختبر", en: "Lab orders" },
    { key: "billing", ar: "المالية", en: "Billing" },
  ];

  return (
    <MobileShell>
      <TopBar title={ar ? "سجل المرضى" : "Patient record"} showBack />

      {/* Quick actions */}
      <div className="px-4 pt-3 flex items-center gap-1.5">
        <IconBtn onClick={() => setTab("notes")}><MoreHorizontal className="size-4" /></IconBtn>
        <span className="relative">
          <IconBtn><Bell className="size-4" /></IconBtn>
          <span className="absolute top-1 end-1 size-2 rounded-full bg-destructive ring-2 ring-background" />
        </span>
        <IconBtn onClick={() => typeof window !== "undefined" && window.print()}><Printer className="size-4" /></IconBtn>
        <IconBtn
          onClick={() => {
            if (typeof navigator !== "undefined" && navigator.share) navigator.share({ title: p.name, url: window.location.href });
          }}
        >
          <Share2 className="size-4" />
        </IconBtn>
        <div className="flex-1" />
        <span className={cn("text-[11px] font-bold px-2.5 py-1 rounded-full", STATUS_META[p.status]?.cls)}>
          {ar ? STATUS_META[p.status]?.ar : STATUS_META[p.status]?.en}
        </span>
      </div>

      {/* Patient info card */}
      <section className="px-4 mt-3">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="size-12 shrink-0 rounded-full overflow-hidden bg-[oklch(0.95_0.04_250)] text-[oklch(0.45_0.18_256)] font-display font-extrabold text-lg flex items-center justify-center">
              {p.avatar ? <img src={p.avatar} alt={p.name} className="size-full object-cover" /> : p.name.trim().charAt(0) || "?"}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="font-display font-extrabold text-[15px] truncate">{p.name}</p>
                <button
                  onClick={() => {
                    const v = window.prompt(ar ? "اسم المريض" : "Patient name", p.name);
                    if (v) updatePatient(p.id, { name: v });
                  }}
                  className="text-primary shrink-0"
                  aria-label={ar ? "تعديل الاسم" : "Edit name"}
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <CalendarDays className="size-3 shrink-0" />
                <span dir="ltr">{p.dob || p.lastVisit || "—"}</span>
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Meta label={ar ? "العمر" : "Age"} value={`${p.age || "—"}${p.age ? (ar ? " سنة" : "y") : ""}`} />
            <Meta label={ar ? "الجنس" : "Gender"} value={p.gender === "male" ? (ar ? "ذكر" : "Male") : ar ? "أنثى" : "Female"} />
            <Meta label={ar ? "رقم الملف" : "File #"} value={`#${p.fileNo.replace(/\D/g, "") || p.fileNo}`} />
            <Meta label={ar ? "الهاتف" : "Phone"} value={p.phone || "—"} ltr icon={Phone} />
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="mt-3 px-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition border",
                tab === tb.key
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border"
              )}
            >
              {ar ? tb.ar : tb.en}
            </button>
          ))}
        </div>
      </nav>

      <section className="px-4 py-3 pb-8 grid gap-2.5 items-start">
        <div className="space-y-2.5 min-w-0">
          {tab === "summary" && <Summary p={p} ar={ar} />}
          {tab === "history" && <HistoryTab p={p} ar={ar} />}
          {tab === "meds" && <MedsTab p={p} ar={ar} />}
          {tab === "files" && <FilesCard p={p} ar={ar} />}
          {tab === "notes" && <NotesCard p={p} ar={ar} />}
          {tab === "visits" && <Visits p={p} ar={ar} />}
          {tab === "orders" && <LabOrders p={p} ar={ar} />}
          {tab === "billing" && <Billing p={p} ar={ar} />}
        </div>

        {/* Quick info */}
        <aside className="space-y-2.5 min-w-0">


          <Card title={ar ? "معلومات سريعة" : "Quick info"} action={<Info className="size-4 text-primary" />}>
            <dl className="text-[11px] divide-y divide-border">
              <QuickRow k={ar ? "آخر زيارة" : "Last visit"} v={p.lastVisit} />
              <QuickRow k={ar ? "الطبيب المعالج" : "Doctor"} v={p.doctorName || "—"} />
              <QuickRow k={ar ? "رقم الجوال" : "Phone"} v={p.phone || "—"} />
            </dl>
          </Card>
        </aside>
      </section>
    </MobileShell>
  );
}

type P = ReturnType<typeof usePatients>[number];

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="size-9 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground shadow-sm"
    >
      {children}
    </button>
  );
}

function Meta({ label, value, ltr, icon: Icon }: { label: string; value: string; ltr?: boolean; icon?: typeof Phone }) {
  return (
    <div className="rounded-xl bg-background border border-border px-3 py-2 min-w-0">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
        {Icon && <Icon className="size-3 shrink-0" />}
        {label}
      </p>
      <p className="text-[12px] font-display font-extrabold mt-0.5 truncate" dir={ltr ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  );
}



function QuickRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-2 gap-2">
      <span className="font-semibold truncate">{v}</span>
      <span className="text-muted-foreground shrink-0">{k}</span>
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3.5 shadow-soft">
      <div className="flex items-center justify-between mb-2.5">
        <p className="font-display font-extrabold text-[13px]">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ---------------- Summary ---------------- */

function Summary({ p, ar }: { p: P; ar: boolean }) {
  return (
    <div className="space-y-2.5">
      <ChartCard p={p} ar={ar} />
      <PlanCard p={p} ar={ar} />
      <div className="grid gap-2.5 md:grid-cols-2">
        <HistoryCard p={p} ar={ar} compact />
        <NotesCard p={p} ar={ar} />
      </div>
      <FilesCard p={p} ar={ar} />

    </div>
  );
}

function ChartCard({ p, ar }: { p: P; ar: boolean }) {
  const [jaw, setJaw] = useState<"upper" | "lower">("upper");
  const [brush, setBrush] = useState<ToothStatus>("caries");
  const [three, setThree] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selecting, setSelecting] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <Card title={ar ? "ملخّص الحالة — خريطة الأسنان" : "Case summary — dental map"}>
      <div className="flex items-center justify-center gap-1.5 mb-2">
        {(["upper", "lower"] as const).map((j) => (
          <button
            key={j}
            onClick={() => setJaw(j)}
            className={cn(
              "h-8 px-3 rounded-full text-[11px] font-bold border transition flex items-center gap-1.5",
              jaw === j ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
            )}
          >
            <span className={cn("size-2 rounded-full", jaw === j ? "bg-primary-foreground" : "bg-border")} />
            {j === "upper" ? (ar ? "الفك العلوي" : "Upper") : ar ? "الفك السفلي" : "Lower"}
          </button>
        ))}
      </div>


      <div className="space-y-2.5 min-w-0 overflow-hidden">
        <div className="rounded-2xl bg-card border border-border p-2 overflow-hidden">
          <ArchViewer zoom={zoom} onZoomChange={setZoom} height={220} className="max-w-full">
            <div
              style={{ transform: `perspective(700px) rotateX(${three ? 10 : 0}deg)` }}
              className="size-full transition-transform origin-center"
            >
              <DentalArch
                jaw={jaw}
                teeth={p.teeth}
                onTooth={(n) => {
                  if (!selecting) return;
                  setSaved(false);
                  setTooth(p.id, n, p.teeth[n] === brush ? "healthy" : brush);
                }}
              />
            </div>
          </ArchViewer>
          <p className="text-center text-[10px] text-muted-foreground mt-1.5">
            {ar
              ? "اختر لوناً من المفتاح ثم اضغط على السن · قرّب بالإصبعين واسحب للتنقل"
              : "Pick a legend color then tap a tooth · pinch to zoom, drag to pan"}
          </p>
        </div>



        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-border p-2.5">
            <p className="text-[11px] font-display font-extrabold mb-1.5">{ar ? "مفتاح الخريطة" : "Legend"}</p>
            <ul className="grid gap-1">
              {LEGEND_ORDER.map((s) => (
                <li key={s}>
                  <button
                    onClick={() => setBrush(s)}
                    className={cn(
                      "w-full flex items-center gap-2 text-[11px] px-1.5 h-7 rounded-lg transition",
                      brush === s ? "bg-primary/10 text-primary font-bold" : "text-muted-foreground"
                    )}
                  >
                    <span className={cn("size-2.5 rounded-full shrink-0", TOOTH_META[s].dot)} />
                    {ar ? TOOTH_META[s].ar : TOOTH_META[s].en}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border p-2.5 self-start">
            <p className="text-[11px] font-display font-extrabold mb-1.5">{ar ? "عرض ثلاثي الأبعاد" : "3D view"}</p>
            <button
              onClick={() => setThree((v) => !v)}
              className={cn(
                "h-7 w-14 rounded-full flex items-center px-1 transition",
                three ? "bg-primary justify-start" : "bg-muted justify-end"
              )}
            >
              {three && <span className="text-[9px] font-bold text-primary-foreground px-1">ON</span>}
              <span className="size-5 rounded-full bg-card shadow-sm" />
              {!three && <span className="text-[9px] font-bold text-muted-foreground px-1">OFF</span>}
            </button>
            <div className="mt-2 flex items-center gap-1.5">
              <MiniBtn onClick={() => setZoom(1)}><RotateCcw className="size-3.5" /></MiniBtn>
              <MiniBtn onClick={() => setZoom((z) => Math.max(ARCH_ZOOM_MIN, z - 0.2))}><ZoomOut className="size-3.5" /></MiniBtn>
              <MiniBtn onClick={() => setZoom((z) => Math.min(ARCH_ZOOM_MAX, z + 0.2))}><ZoomIn className="size-3.5" /></MiniBtn>

            </div>
          </div>
        </div>


        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSaved(true)}
            className="flex-1 min-w-[46%] h-10 rounded-full bg-primary text-primary-foreground text-[12px] font-display font-extrabold flex items-center justify-center gap-1.5"
          >
            <Check className="size-4" strokeWidth={3} />
            {saved ? (ar ? "تم الحفظ" : "Saved") : ar ? "حفظ مخطط الأسنان" : "Save chart"}
          </button>
          <button
            onClick={() => setSelecting((v) => !v)}
            className={cn(
              "flex-1 min-w-[46%] h-10 rounded-full text-[12px] font-display font-extrabold border flex items-center justify-center gap-1.5 transition",
              selecting ? "bg-primary/10 text-primary border-primary" : "bg-card text-muted-foreground border-border"
            )}
          >
            <Scan className="size-4" />
            {selecting ? (ar ? "إيقاف تحديد الأسنان" : "Disable selection") : ar ? "تفعيل تحديد الأسنان" : "Enable selection"}
          </button>
        </div>
      </div>
    </Card>
  );
}


function MiniBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="size-8 rounded-full border border-border bg-card text-primary flex items-center justify-center">
      {children}
    </button>
  );
}

function PlanCard({ p, ar }: { p: P; ar: boolean }) {
  const [dept, setDept] = useState<string>(p.branch || BRANCHES[0].key);
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);
  const [form, setForm] = useState({ title: "", tooth: "", cost: "", note: "" });
  const xrayRef = useRef<HTMLInputElement>(null);

  const all = getPlan(p);
  const plan = all.filter((s) => (s.dept ?? "general") === dept);
  const deptMeta = BRANCHES.find((b) => b.key === dept) ?? BRANCHES[0];
  const isRadio = deptMeta.key === "radio";
  const total = plan.reduce((s, x) => s + (Number(x.cost) || 0), 0);
  const doneCount = plan.filter((s) => s.status === "done").length;
  const statusLabel =
    plan.length === 0
      ? ar ? "لم تبدأ" : "Not started"
      : doneCount === plan.length
        ? ar ? "مكتملة" : "Completed"
        : ar ? "نشطة" : "Active";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    addPlanStep(p.id, form.title, {
      dept,
      tooth: form.tooth.trim() || undefined,
      cost: form.cost === "" ? undefined : Number(form.cost),
      note: form.note.trim() || undefined,
    });
    setForm({ title: "", tooth: "", cost: "", note: "" });
    setAdding(false);
  };

  return (
    <div className="space-y-2.5">
      {/* Department selector bar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 py-0.5">
        {BRANCHES.map((b) => {
          const on = b.key === dept;
          const count = all.filter((s) => (s.dept ?? "general") === b.key).length;
          return (
            <button
              key={b.key}
              onClick={() => setDept(b.key)}
              className={cn(
                "h-10 px-3.5 rounded-xl text-[12px] font-bold whitespace-nowrap transition flex items-center gap-1.5",
                on ? "bg-primary text-primary-foreground shadow-card" : b.cls
              )}
            >
              <b.icon className="size-3.5" />
              {ar ? b.ar : b.en}
              {count > 0 && (
                <span className={cn("text-[10px] rounded-full px-1.5", on ? "bg-primary-foreground/20" : "bg-background/70")}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Card
        title={
          isRadio
            ? ar ? "أشعة الأسنان الخاصة بالمريض" : "Patient radiographs"
            : `${ar ? "خطة علاج" : "Treatment plan"}: ${ar ? deptMeta.ar : deptMeta.en}`
        }
        action={
          <button
            onClick={() => (isRadio ? xrayRef.current?.click() : setPicking(true))}
            className="h-7 px-2.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center gap-1"
          >
            {isRadio ? <Cloud className="size-3.5" /> : <Plus className="size-3.5" strokeWidth={3} />}
            {isRadio ? (ar ? "رفع أشعة" : "Upload X-ray") : ar ? "إجراء جديد" : "New procedure"}
          </button>
        }
      >
        <div className={cn("flex items-center gap-2 mb-2.5 text-[11px]", isRadio && "hidden")}>
          <span className={cn("font-bold px-2 py-0.5 rounded-full", statusLabel === (ar ? "نشطة" : "Active") ? "bg-blue-100 text-blue-700" : statusLabel === (ar ? "مكتملة" : "Completed") ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")}>
            {statusLabel}
          </span>
          <span className="text-muted-foreground">
            {doneCount}/{plan.length} {ar ? "منجز" : "done"}
          </span>
          {total > 0 && (
            <span className="ms-auto font-display font-extrabold">
              {total.toLocaleString()} {ar ? "$" : "$"}
            </span>
          )}
        </div>

        {adding && (
          <form onSubmit={submit} className="mb-2.5 rounded-xl border border-border bg-background p-2.5 space-y-2">
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={ar ? "اسم الإجراء (مثال: حشوة جذر)" : "Procedure name"}
              className="w-full h-10 rounded-lg border border-border bg-card px-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={form.tooth}
                onChange={(e) => setForm({ ...form, tooth: e.target.value })}
                placeholder={ar ? "رقم السن" : "Tooth #"}
                className="h-10 rounded-lg border border-border bg-card px-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              <input
                inputMode="decimal"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder={ar ? "الكلفة" : "Cost"}
                className="h-10 rounded-lg border border-border bg-card px-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={ar ? "ملاحظة (الجلسة الثانية…)" : "Note (session 2…)"}
              className="w-full h-10 rounded-lg border border-border bg-card px-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button type="submit" className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-[12px] font-display font-extrabold">
              {ar ? "إضافة للخطة" : "Add to plan"}
            </button>
          </form>
        )}

        {isRadio ? (
          <RadiologyGallery p={p} ar={ar} inputRef={xrayRef} />
        ) : plan.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">
            {ar ? "لا توجد إجراءات مضافة في هذا الفرع بعد" : "No procedures in this department yet"}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {plan.map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 py-2">
                <span className={cn("size-8 shrink-0 rounded-full text-[11px] font-display font-extrabold flex items-center justify-center", deptMeta.cls)}>
                  {s.tooth || "—"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[12px] font-semibold truncate", s.status === "done" && "line-through text-muted-foreground")}>
                    {s.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {[s.note, s.cost ? `${Number(s.cost).toLocaleString()} $` : ""].filter(Boolean).join(" · ") || (ar ? "بدون ملاحظات" : "No notes")}
                  </p>
                </div>
                <button
                  onClick={() => cyclePlanStep(p.id, s.id)}
                  className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", PLAN_META[s.status].cls)}
                >
                  {ar ? PLAN_META[s.status].ar : PLAN_META[s.status].en}
                </button>
                <button
                  onClick={() => updatePlanStep(p.id, s.id, { status: s.status === "done" ? "planned" : "done" })}
                  className={cn(
                    "size-5 shrink-0 rounded-md border flex items-center justify-center",
                    s.status === "done" ? "bg-primary border-primary text-primary-foreground" : "border-border bg-card"
                  )}
                  aria-label={ar ? "تم" : "Done"}
                >
                  {s.status === "done" && <Check className="size-3.5" strokeWidth={3} />}
                </button>
                <button onClick={() => removePlanStep(p.id, s.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {picking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
          <button
            aria-label={ar ? "إغلاق" : "Close"}
            onClick={() => setPicking(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-[2px]"
          />
          <div className="relative w-full max-w-[440px] max-h-[75vh] overflow-y-auto rounded-t-3xl bg-card border-t border-border p-4 pb-6 shadow-card">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h3 className="text-[14px] font-display font-extrabold">
                {ar ? `اختر الإجراء الخاص بـ (${deptMeta.ar})` : `Choose a procedure — ${deptMeta.en}`}
              </h3>
              <button onClick={() => setPicking(false)} className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                <X className="size-4" />
              </button>
            </div>
            <ul className="divide-y divide-border">
              {deptMeta.subs.map((s) => (
                <li key={s.ar}>
                  <button
                    onClick={() => {
                      setForm({ title: ar ? s.ar : s.en, tooth: "", cost: "", note: "" });
                      setPicking(false);
                      setAdding(true);
                    }}
                    className="w-full flex items-center gap-2.5 py-3 text-start"
                  >
                    <span className={cn("size-8 shrink-0 rounded-xl flex items-center justify-center", deptMeta.cls)}>
                      <deptMeta.icon className="size-4" />
                    </span>
                    <span className="flex-1 text-[13px] font-semibold">{ar ? s.ar : s.en}</span>
                    <Plus className="size-4 text-primary shrink-0" strokeWidth={3} />
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => {
                setForm({ title: "", tooth: "", cost: "", note: "" });
                setPicking(false);
                setAdding(true);
              }}
              className="mt-3 w-full h-10 rounded-xl border border-border bg-background text-[12px] font-bold"
            >
              {ar ? "إجراء مخصص…" : "Custom procedure…"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

}

const XRAY_TAG = "[xray] ";

function RadiologyGallery({
  p,
  ar,
  inputRef,
}: {
  p: P;
  ar: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const xrays = p.files.filter((f) => f.name.startsWith(XRAY_TAG));

  const onPick = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      addFile(p.id, { name: XRAY_TAG + f.name, dataUrl, type: f.type });
    }
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => onPick(e.target.files)}
      />
      {xrays.length === 0 ? (
        <div className="rounded-xl border border-border bg-[oklch(0.98_0.01_240)] py-7 flex flex-col items-center gap-2">
          <FileImage className="size-9 text-muted-foreground" />
          <p className="text-[12px] text-muted-foreground text-center px-4">
            {ar ? "لا توجد صور أشعة مرفوعة للمريض بعد" : "No radiographs uploaded yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {xrays.map((f) => (
            <div key={f.id} className="relative">
              <a href={f.dataUrl} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-border bg-card">
                {f.type.startsWith("image/") ? (
                  <img src={f.dataUrl} alt={f.name.replace(XRAY_TAG, "")} className="w-full aspect-square object-cover" />
                ) : (
                  <span className="w-full aspect-square flex items-center justify-center">
                    <FileImage className="size-6 text-muted-foreground" />
                  </span>
                )}
              </a>
              <p className="text-[9px] text-muted-foreground text-center mt-1" dir="ltr">
                {f.addedAt.slice(0, 10)}
              </p>
              <button
                onClick={() => removeFile(p.id, f.id)}
                className="absolute top-1 end-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                aria-label={ar ? "حذف" : "Delete"}
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ p, ar, compact }: { p: P; ar: boolean; compact?: boolean }) {
  const log = getLog(p);
  const shown = compact ? log.slice(0, 4) : log;
  return (
    <Card
      title={ar ? "التاريخ المرضي" : "Medical history"}
      action={
        <button
          onClick={() => {
            const v = window.prompt(ar ? "أدخل الحدث المرضي" : "History entry");
            if (v) addLogEntry(p.id, { text: v, date: new Date().toISOString().slice(0, 10) });
          }}
          className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center"
        >
          <Plus className="size-3.5" strokeWidth={3} />
        </button>
      }
    >
      {log.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">{ar ? "لا توجد سجلات" : "No records"}</p>
      ) : (
        <ul className="space-y-1.5">
          {shown.map((e) => (
            <li key={e.id} className="rounded-xl border border-border px-2.5 py-2 flex items-center gap-2">
              <span className="flex-1 min-w-0 text-[12px] font-semibold truncate">{e.text}</span>
              <span className="text-[10px] text-muted-foreground shrink-0" dir="ltr">{e.date}</span>
              {!compact && (
                <button onClick={() => removeLogEntry(p.id, e.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {compact && log.length > 4 && (
        <p className="text-center text-[11px] font-bold text-primary mt-2">{ar ? "عرض الكل" : "View all"}</p>
      )}
    </Card>
  );
}

function HistoryTab({ p, ar }: { p: P; ar: boolean }) {
  const active = HISTORY_LABELS.filter((h) => p.history[h.key]);
  return (
    <div className="space-y-2.5">
      <Card title={ar ? "الملف الطبي" : "Medical profile"}>
        {active.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">{ar ? "لا توجد أمراض مسجلة" : "No conditions recorded"}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {active.map((h) => (
              <span key={h.key} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                {ar ? h.ar : h.en}
              </span>
            ))}
          </div>
        )}
      </Card>
      <HistoryCard p={p} ar={ar} />
      <Card title={ar ? "حالة العلاج" : "Treatment status"}>
        <div className="flex gap-1.5">
          {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((s) => (
            <button
              key={s}
              onClick={() => updatePatient(p.id, { status: s })}
              className={cn(
                "flex-1 h-9 rounded-xl text-[11px] font-bold border transition",
                p.status === s ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground"
              )}
            >
              {ar ? STATUS_META[s].ar : STATUS_META[s].en}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MedsTab({ p, ar }: { p: P; ar: boolean }) {
  return (
    <div className="space-y-2.5">
      <Card title={ar ? "الحساسيات" : "Allergies"}>
        <textarea
          rows={3}
          value={p.allergies ?? ""}
          onChange={(e) => updatePatient(p.id, { allergies: e.target.value })}
          placeholder={ar ? "مثال: حساسية من البنسلين…" : "e.g. penicillin allergy…"}
          className={cn(inputCls, "h-auto py-2 resize-none")}
        />
      </Card>
      <Card title={ar ? "الأدوية الحالية" : "Current medications"}>
        <textarea
          rows={3}
          value={p.meds ?? ""}
          onChange={(e) => updatePatient(p.id, { meds: e.target.value })}
          placeholder={ar ? "اكتب الأدوية والجرعات…" : "Medications and dosage…"}
          className={cn(inputCls, "h-auto py-2 resize-none")}
        />
      </Card>
      <Card title={ar ? "الشكوى الرئيسية" : "Chief complaint"}>
        <textarea
          rows={3}
          value={p.complaint}
          onChange={(e) => updatePatient(p.id, { complaint: e.target.value })}
          className={cn(inputCls, "h-auto py-2 resize-none")}
        />
      </Card>
    </div>
  );
}

function NotesCard({ p, ar }: { p: P; ar: boolean }) {
  return (
    <Card title={ar ? "ملاحظات الطبيب" : "Doctor notes"} action={<Pencil className="size-3.5 text-primary" />}>
      <textarea
        rows={5}
        value={p.doctorNote ?? ""}
        onChange={(e) => updatePatient(p.id, { doctorNote: e.target.value, doctorNoteDate: new Date().toISOString().slice(0, 10) })}
        placeholder={ar ? "اكتب ملاحظاتك السريرية…" : "Clinical notes…"}
        className={cn(inputCls, "h-auto py-2 resize-none text-[12px]")}
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Field label={ar ? "الطبيب المعالج" : "Doctor"}>
          <input
            value={p.doctorName ?? ""}
            onChange={(e) => updatePatient(p.id, { doctorName: e.target.value })}
            className={cn(inputCls, "h-9 text-[12px]")}
          />
        </Field>
        <Field label={ar ? "تاريخ الملاحظة" : "Note date"}>
          <input
            type="date"
            value={p.doctorNoteDate ?? ""}
            onChange={(e) => updatePatient(p.id, { doctorNoteDate: e.target.value })}
            className={cn(inputCls, "h-9 text-[12px]")}
          />
        </Field>
      </div>
    </Card>
  );
}

/* ---------------- Files ---------------- */

function FilesCard({ p, ar }: { p: P; ar: boolean }) {
  const ref = useRef<HTMLInputElement>(null);

  const onPick = async (files: FileList | null) => {
    if (!files) return;
    for (const f of Array.from(files)) {
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(f);
      });
      addFile(p.id, { name: f.name, dataUrl, type: f.type });
    }
  };

  return (
    <Card title={ar ? "الملفات والصور" : "Files & images"} action={<Paperclip className="size-4 text-primary" />}>
      <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
        <button
          onClick={() => ref.current?.click()}
          className="aspect-square rounded-2xl border-2 border-dashed border-border bg-[oklch(0.98_0.01_240)] flex flex-col items-center justify-center gap-1 text-muted-foreground"
        >
          <Cloud className="size-5 text-primary" />
          <span className="text-[10px] font-bold">{ar ? "رفع ملف" : "Upload"}</span>
        </button>
        <input ref={ref} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => onPick(e.target.files)} />

        {p.files.filter((f) => !f.name.startsWith("[xray] ")).map((f) => (
          <div key={f.id} className="relative">
            <a href={f.dataUrl} target="_blank" rel="noreferrer" className="block rounded-2xl overflow-hidden border border-border bg-card">
              {f.type.startsWith("image/") ? (
                <img src={f.dataUrl} alt={f.name} className="w-full aspect-square object-cover" />
              ) : (
                <span className="w-full aspect-square flex items-center justify-center">
                  <FileImage className="size-6 text-muted-foreground" />
                </span>
              )}
            </a>
            <p className="text-[10px] font-semibold truncate mt-1 text-center">{f.name}</p>
            <p className="text-[9px] text-muted-foreground text-center" dir="ltr">{f.addedAt.slice(0, 10)}</p>
            <button
              onClick={() => removeFile(p.id, f.id)}
              className="absolute top-1 end-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <Trash2 className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Visits / Orders / Billing ---------------- */

function Visits({ p, ar }: { p: P; ar: boolean }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [procedure, setProcedure] = useState("");
  const [upcoming, setUpcoming] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!procedure.trim()) return;
    addVisit(p.id, { date, procedure, upcoming });
    setProcedure("");
  };

  return (
    <div className="space-y-2.5">
      <Card title={ar ? "إضافة زيارة / موعد" : "Add visit / appointment"}>
        <form onSubmit={submit} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label={ar ? "التاريخ" : "Date"}>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label={ar ? "النوع" : "Type"}>
              <select value={upcoming ? "1" : "0"} onChange={(e) => setUpcoming(e.target.value === "1")} className={inputCls}>
                <option value="0">{ar ? "زيارة منجزة" : "Completed visit"}</option>
                <option value="1">{ar ? "موعد قادم" : "Upcoming"}</option>
              </select>
            </Field>
          </div>
          <Field label={ar ? "الإجراء / خطة العلاج" : "Procedure / plan"}>
            <input value={procedure} onChange={(e) => setProcedure(e.target.value)} className={inputCls} />
          </Field>
          <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center gap-1.5">
            <Plus className="size-3.5" strokeWidth={3} /> {ar ? "إضافة" : "Add"}
          </button>
        </form>
      </Card>

      <Card title={ar ? "الجدول الزمني" : "Timeline"}>
        {p.visits.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">{ar ? "لا توجد زيارات مسجلة" : "No visits recorded"}</p>
        ) : (
          <ol className="space-y-3">
            {p.visits.map((v) => (
              <li key={v.id} className="flex gap-3">
                <span
                  className={cn(
                    "size-8 shrink-0 rounded-full flex items-center justify-center border",
                    v.upcoming ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-primary text-primary-foreground border-primary"
                  )}
                >
                  <CalendarDays className="size-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold">{v.procedure}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {v.date} · {v.upcoming ? (ar ? "موعد قادم" : "Upcoming") : ar ? "منجزة" : "Done"}
                  </p>
                </div>
                <button onClick={() => removeVisit(p.id, v.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function LabOrders({ p, ar }: { p: P; ar: boolean }) {
  const orders = useMemo(() => {
    const key = [p.name.trim().toLowerCase(), p.fileNo.toLowerCase()];
    return listOrders().filter((o) => {
      const hay = `${o.notes ?? ""} ${o.patient} ${o.doctor}`.toLowerCase();
      return key.some((k) => k && hay.includes(k));
    });
  }, [p]);

  return (
    <Card
      title={ar ? "طلبات المختبر المرتبطة" : "Linked lab orders"}
      action={<Link to="/orders" className="text-[10px] font-bold text-primary">{ar ? "كل الطلبات" : "All orders"}</Link>}
    >
      {orders.length === 0 ? (
        <p className="text-[12px] text-muted-foreground">
          {ar
            ? `لا توجد طلبات مرتبطة. اذكر اسم المريض أو ${p.fileNo} في ملاحظة الطلب لربطه تلقائياً.`
            : `No linked orders. Mention the patient name or ${p.fileNo} in the order note.`}
        </p>
      ) : (
        <ul className="space-y-2">
          {orders.map((o) => (
            <li key={o.id} className="rounded-xl border border-border p-2.5">
              <div className="flex items-center justify-between">
                <p className="font-display font-extrabold text-[12px]">{o.id}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{o.status}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1 truncate">{o.doctor} · {o.workType}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Billing({ p, ar }: { p: P; ar: boolean }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const paid = paidTotal(p);
  const remaining = (Number(p.totalFees) || 0) - paid;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!n) return;
    addPayment(p.id, { amount: n, note, date: new Date().toISOString().slice(0, 10) });
    setAmount("");
    setNote("");
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2">
        <Stat label={ar ? "إجمالي الأتعاب" : "Total fees"} value={p.totalFees} cls="bg-[oklch(0.96_0.03_240)] text-foreground" />
        <Stat label={ar ? "المدفوع" : "Paid"} value={paid} cls="bg-emerald-50 text-emerald-700" />
        <Stat label={ar ? "المتبقي" : "Remaining"} value={remaining} cls={remaining > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"} />
      </div>

      <Card title={ar ? "إجمالي الأتعاب" : "Total fees"} action={<Wallet className="size-4 text-primary" />}>
        <input
          type="number"
          min={0}
          value={p.totalFees}
          onChange={(e) => updatePatient(p.id, { totalFees: Number(e.target.value) || 0 })}
          className={inputCls}
        />
      </Card>

      <Card title={ar ? "تسجيل دفعة" : "Record payment"}>
        <form onSubmit={submit} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label={ar ? "المبلغ" : "Amount"}>
              <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
            </Field>
            <Field label={ar ? "ملاحظة" : "Note"}>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </Field>
          </div>
          <button className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-[12px] font-bold">
            {ar ? "إضافة الدفعة" : "Add payment"}
          </button>
        </form>
      </Card>

      <Card title={ar ? "سجل المدفوعات" : "Payment history"}>
        {p.payments.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">{ar ? "لا توجد مدفوعات" : "No payments yet"}</p>
        ) : (
          <ul className="space-y-1.5">
            {p.payments.map((x) => (
              <li key={x.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold">${x.amount}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{x.date}{x.note ? ` · ${x.note}` : ""}</p>
                </div>
                <button onClick={() => removePayment(p.id, x.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={cn("rounded-2xl p-3 text-center border border-border", cls)}>
      <p className="font-display font-extrabold text-base leading-none">${value || 0}</p>
      <p className="text-[10px] mt-1 opacity-80">{label}</p>
    </div>
  );
}
