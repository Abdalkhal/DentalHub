import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { useOrders, type Order } from "@/lib/ordersStore";
import {
  X,
  Phone,
  Calendar,
  FileText,
  Search,
  User,
  Stethoscope,
  CheckCircle,
  Clock,
  Syringe,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CaseStatus = "completed" | "in_progress" | "pending";

type PatientCase = {
  id: string;
  date: string;
  workType: { ar: string; en: string };
  doctor: string;
  status: CaseStatus;
};

type Patient = {
  id: string;
  name: { ar: string; en: string };
  phone: string;
  lastVisit: string;
  totalCases: number;
  cases: PatientCase[];
};

const WORK_TYPES: Record<string, { ar: string; en: string }> = {
  crown: { ar: "تاج", en: "Crown" },
  veneer: { ar: "قشرة تجميلية", en: "Veneer" },
  implant: { ar: "زرعة", en: "Implant" },
  clear_aligner: { ar: "مصفف شفاف", en: "Clear Aligner" },
};

const STATUS_LABELS: Record<CaseStatus, { ar: string; en: string }> = {
  completed: { ar: "مكتمل", en: "Completed" },
  in_progress: { ar: "قيد التنفيذ", en: "In Progress" },
  pending: { ar: "معلق", en: "Pending" },
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  completed: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-amber-100 text-amber-700",
  pending: "bg-slate-100 text-slate-600",
};

const STATUS_ICONS: Record<CaseStatus, typeof CheckCircle> = {
  completed: CheckCircle,
  in_progress: Clock,
  pending: Clock,
};

function mapOrderStatus(status: string): CaseStatus {
  if (status === "completed") return "completed";
  if (status === "in_progress") return "in_progress";
  return "pending";
}

function loadManualPatients(): Patient[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("dental_hub_patients");
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function formatDate(dateStr: string, lang: "ar" | "en") {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: lang === "ar" ? "numeric" : "short",
    day: "numeric",
  };
  return d.toLocaleDateString(lang === "ar" ? "ar-IQ" : "en-US", opts);
}

function patientIdFromName(name: string): string {
  return `patient-${name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")}`;
}

export const Route = createFileRoute("/patients")({
  component: PatientsPage,
});

function PatientsPage() {
  const { t, lang, dir } = useI18n();
  const orders = useOrders();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const patients: Patient[] = useMemo(() => {
    // --- Auto-extract from orders ---
    const byName = new Map<string, Order[]>();
    for (const o of orders) {
      const key = o.patient.trim().toLowerCase();
      if (!key) continue;
      const existing = byName.get(key);
      if (existing) {
        existing.push(o);
      } else {
        byName.set(key, [o]);
      }
    }

    const extracted: Patient[] = [];
    for (const [, group] of byName) {
      const sorted = [...group].sort(
        (a, b) => new Date(b.dueDate || b.receivedDate).getTime() - new Date(a.dueDate || a.receivedDate).getTime(),
      );
      const name = sorted[0].patient.trim();
      extracted.push({
        id: patientIdFromName(name),
        name: { ar: name, en: name },
        phone: "",
        lastVisit: sorted[0].dueDate || sorted[0].receivedDate,
        totalCases: sorted.length,
        cases: sorted.map((o) => ({
          id: String(o.caseId || o.id.slice(0, 8)),
          date: o.dueDate || o.receivedDate,
          workType: WORK_TYPES[o.workType] ?? { ar: o.workType, en: o.workType },
          doctor: o.doctor,
          status: mapOrderStatus(o.status),
        })),
      });
    }

    // --- Merge with manual patients ---
    const manualPatients = loadManualPatients();
    const merged = [...extracted];
    for (const mp of manualPatients) {
      if (!merged.find((p) => p.name.ar === mp.name.ar || p.name.en === mp.name.en)) {
        merged.push(mp);
      }
    }

    return merged;
  }, [orders]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return patients;
    const q = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.ar.toLowerCase().includes(q) ||
        p.name.en.toLowerCase().includes(q) ||
        p.phone.includes(q),
    );
  }, [patients, searchQuery]);

  return (
    <MobileShell>
      <TopBar
        title={lang === "ar" ? "المرضى" : "Patients"}
        showSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={
          lang === "ar" ? "ابحث باسم المريض أو الهاتف…" : "Search by name or phone…"
        }
      />

      <div className="px-4 pt-2 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
            {lang === "ar" ? `المرضى (${filtered.length})` : `Patients (${filtered.length})`}
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-16 rounded-full bg-sky-100 flex items-center justify-center mb-4">
              <Search className="size-7 text-sky-400" />
            </div>
            <p className="font-semibold text-foreground">
              {lang === "ar" ? "لا يوجد مرضى" : "No patients found"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {lang === "ar"
                ? orders.length === 0
                  ? "أضف طلبات ليظهر المرضى تلقائياً"
                  : "حاول تغيير عبارة البحث"
                : orders.length === 0
                  ? "Add orders to see patients automatically"
                  : "Try a different search term"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((patient) => (
              <li key={patient.id}>
                <button
                  onClick={() => setSelectedPatient(patient)}
                  className="w-full text-start bg-white rounded-2xl border border-sky-100 p-4 shadow-sm hover:shadow-md hover:border-sky-200 transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm">
                      {patient.name[lang === "ar" ? "ar" : "en"][0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground truncate">
                        {patient.name[lang === "ar" ? "ar" : "en"]}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {patient.phone && (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone className="size-3" />
                              {patient.phone}
                            </span>
                            <span className="text-muted-foreground text-[10px]">·</span>
                          </>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          {formatDate(patient.lastVisit, lang)}
                        </span>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="text-lg font-bold text-sky-700">{patient.totalCases}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {lang === "ar" ? "حالة" : "cases"}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedPatient && (
        <PatientModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          lang={lang}
          dir={dir}
        />
      )}
    </MobileShell>
  );
}

function PatientModal({
  patient,
  onClose,
  lang,
  dir,
}: {
  patient: Patient;
  onClose: () => void;
  lang: "ar" | "en";
  dir: "rtl" | "ltr";
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[440px] max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-sky-100 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {patient.name[lang === "ar" ? "ar" : "en"][0]}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-foreground truncate">
                {patient.name[lang === "ar" ? "ar" : "en"]}
              </h2>
              {patient.phone && (
                <p className="text-xs text-muted-foreground">{patient.phone}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 hover:bg-sky-100 shrink-0"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-sky-50 rounded-xl p-3 text-center">
              <Calendar className="size-5 text-sky-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">
                {lang === "ar" ? "آخر زيارة" : "Last Visit"}
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {formatDate(patient.lastVisit, lang)}
              </p>
            </div>
            <div className="bg-sky-50 rounded-xl p-3 text-center">
              <FileText className="size-5 text-sky-600 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">
                {lang === "ar" ? "إجمالي الحالات" : "Total Cases"}
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">{patient.totalCases}</p>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Syringe className="size-4 text-sky-600" />
              {lang === "ar" ? "سجل الحالات" : "Case History"}
            </h3>

            <div className="relative">
              <div className="absolute top-2 bottom-2 start-[19px] w-0.5 bg-sky-200 rounded-full" />

              <ul className="space-y-4">
                {[...patient.cases]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((c, idx) => {
                    const StatusIcon = STATUS_ICONS[c.status];
                    return (
                      <li
                        key={c.id}
                        className={cn(
                          "relative flex gap-4",
                          dir === "rtl" ? "flex-row-reverse" : "",
                        )}
                      >
                        <div className="relative z-10 mt-1">
                          <div
                            className={cn(
                              "size-[38px] rounded-full flex items-center justify-center shadow-sm border-2 border-white",
                              c.status === "completed"
                                ? "bg-emerald-100 text-emerald-600"
                                : c.status === "in_progress"
                                  ? "bg-amber-100 text-amber-600"
                                  : "bg-slate-100 text-slate-500",
                            )}
                          >
                            <StatusIcon className="size-[18px]" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 bg-white rounded-xl border border-sky-100 p-3.5 shadow-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-sm text-foreground">
                                {c.workType[lang === "ar" ? "ar" : "en"]}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                <User className="size-3 inline" />
                                {c.doctor}
                              </p>
                            </div>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                              {c.id}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-sky-50">
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="size-3" />
                              {formatDate(c.date, lang)}
                            </span>
                            <span
                              className={cn(
                                "text-[11px] font-semibold px-2.5 py-0.5 rounded-full",
                                STATUS_COLORS[c.status],
                              )}
                            >
                              {STATUS_LABELS[c.status][lang]}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
