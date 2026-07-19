import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ChevronDown,
  ChevronUp,
  Flag,
  X,
} from "lucide-react";

export type ProdStepId = "impression" | "design" | "printing" | "ceramic" | "qc" | "dispatch";

export type ProdCase = {
  id: string;
  orderNo: string;
  patient: string;
  doctor: string;
  work: { ar: string; en: string };
  daysInStage: number;
  stageId: ProdStepId;
  delayed: boolean;
  notes: string;
};

const STEPS: {
  id: ProdStepId;
  ar: string;
  en: string;
  icon: typeof FileText;
  color: string;
  dotColor: string;
}[] = [
  {
    id: "impression",
    ar: "استلام الطبعة",
    en: "Impression Received",
    icon: FileText,
    color: "border-sky-200 bg-sky-50",
    dotColor: "bg-sky-500",
  },
  {
    id: "design",
    ar: "التصميم الرقمي",
    en: "Design",
    icon: FileText,
    color: "border-indigo-200 bg-indigo-50",
    dotColor: "bg-indigo-500",
  },
  {
    id: "printing",
    ar: "الخرط/الطباعة",
    en: "Printing/Milling",
    icon: FileText,
    color: "border-amber-200 bg-amber-50",
    dotColor: "bg-amber-500",
  },
  {
    id: "ceramic",
    ar: "السيراميك",
    en: "Ceramic",
    icon: FileText,
    color: "border-rose-200 bg-rose-50",
    dotColor: "bg-rose-500",
  },
  {
    id: "qc",
    ar: "فحص الجودة",
    en: "QC",
    icon: FileText,
    color: "border-purple-200 bg-purple-50",
    dotColor: "bg-purple-500",
  },
  {
    id: "dispatch",
    ar: "التوصيل",
    en: "Dispatch",
    icon: FileText,
    color: "border-emerald-200 bg-emerald-50",
    dotColor: "bg-emerald-500",
  },
];

const INITIAL_CASES: ProdCase[] = [
  {
    id: "c1",
    orderNo: "ORD-001",
    patient: "سارة محمد",
    doctor: "د. أحمد علي",
    work: { ar: "تاج", en: "Crown" },
    daysInStage: 2,
    stageId: "design",
    delayed: false,
    notes: "",
  },
  {
    id: "c2",
    orderNo: "ORD-004",
    patient: "أحمد رضا",
    doctor: "د. ليلى نصر",
    work: { ar: "مصفف شفاف", en: "Clear Aligner" },
    daysInStage: 1,
    stageId: "impression",
    delayed: false,
    notes: "",
  },
  {
    id: "c3",
    orderNo: "ORD-007",
    patient: "لينا عبد الله",
    doctor: "د. ليلى نصر",
    work: { ar: "زرعة", en: "Implant" },
    daysInStage: 4,
    stageId: "printing",
    delayed: true,
    notes: "في انتظار المادة",
  },
  {
    id: "c4",
    orderNo: "ORD-005",
    patient: "نورة فهد",
    doctor: "د. أحمد علي",
    work: { ar: "تاج", en: "Crown" },
    daysInStage: 7,
    stageId: "ceramic",
    delayed: true,
    notes: "إعادة تشكيل",
  },
  {
    id: "c5",
    orderNo: "ORD-002",
    patient: "خالد عمر",
    doctor: "د. نورا سعيد",
    work: { ar: "قشرة", en: "Veneer" },
    daysInStage: 0,
    stageId: "dispatch",
    delayed: false,
    notes: "",
  },
  {
    id: "c6",
    orderNo: "ORD-006",
    patient: "فيصل هاني",
    doctor: "د. سامي نور",
    work: { ar: "قشرة", en: "Veneer" },
    daysInStage: 0,
    stageId: "qc",
    delayed: false,
    notes: "",
  },
];

export function ProductionTracker() {
  const { lang, t } = useI18n();
  const ar = lang === "ar";
  const [cases, setCases] = useState<ProdCase[]>(INITIAL_CASES);
  const [expandedStep, setExpandedStep] = useState<ProdStepId | null>(null);
  const [editingCase, setEditingCase] = useState<string | null>(null);

  const toggleDelay = (caseId: string) => {
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, delayed: !c.delayed } : c)));
  };

  const updateNote = (caseId: string, note: string) => {
    setCases((prev) => prev.map((c) => (c.id === caseId ? { ...c, notes: note } : c)));
  };

  return (
    <div className="space-y-3">
      {STEPS.map((step, si) => {
        const stepCases = cases.filter((c) => c.stageId === step.id);
        const isExpanded = expandedStep === step.id;
        const delayedCount = stepCases.filter((c) => c.delayed).length;

        return (
          <div key={step.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            {/* Step header */}
            <button
              onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3.5 text-start transition-colors",
                isExpanded && "border-b border-border",
              )}
            >
              <span className={cn("size-3 rounded-full shrink-0", step.dotColor)} />
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm text-foreground">
                  {ar ? step.ar : step.en}
                </p>
                {!isExpanded && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {stepCases.length} {ar ? "حالة" : "case"}
                    {stepCases.length !== 1 ? (ar ? "ات" : "s") : ""}
                    {delayedCount > 0 && (
                      <span className="text-rose-500 font-semibold me-1">
                        {" · "}
                        {delayedCount} {ar ? "متأخرة" : "delayed"}
                      </span>
                    )}
                  </p>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Expanded cases */}
            {isExpanded && (
              <div className="px-4 pb-3 pt-2 space-y-2">
                {stepCases.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground/50">
                    <CheckCircle2 className="size-5" />
                    <p className="text-xs">
                      {ar ? "لا توجد حالات في هذه المرحلة" : "No cases in this stage"}
                    </p>
                  </div>
                ) : (
                  stepCases.map((c) => {
                    const isEditing = editingCase === c.id;
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          "rounded-xl border p-3 space-y-2 transition-all",
                          c.delayed ? "border-rose-200 bg-rose-50/50" : "border-border bg-muted/30",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-muted-foreground">
                                {c.orderNo}
                              </span>
                              {c.delayed && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">
                                  <AlertTriangle className="size-3" />
                                  {ar ? "تأخير" : "Delayed"}
                                </span>
                              )}
                            </div>
                            <p className="font-display font-bold text-sm text-foreground leading-snug mt-0.5">
                              {c.patient}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{c.doctor}</p>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                            <Clock className="size-3" />
                            {c.daysInStage}d
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                          <span className="inline-block text-[10px] font-semibold bg-card text-foreground px-2 py-0.5 rounded-full border border-border leading-relaxed">
                            {ar ? c.work.ar : c.work.en}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleDelay(c.id)}
                              className={cn(
                                "size-7 rounded-lg flex items-center justify-center transition",
                                c.delayed
                                  ? "bg-rose-100 text-rose-600"
                                  : "bg-card border border-border text-muted-foreground hover:bg-accent",
                              )}
                              title={c.delayed ? t("clear_flag") : t("flag_delay")}
                            >
                              <Flag className={cn("size-3.5", c.delayed && "fill-rose-500")} />
                            </button>
                            <button
                              onClick={() => setEditingCase(isEditing ? null : c.id)}
                              className={cn(
                                "size-7 rounded-lg flex items-center justify-center transition",
                                isEditing
                                  ? "bg-primary/10 text-primary"
                                  : "bg-card border border-border text-muted-foreground hover:bg-accent",
                              )}
                              title={t("lab_notes")}
                            >
                              <FileText className="size-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Notes editor */}
                        {isEditing && (
                          <div className="pt-1">
                            <textarea
                              value={c.notes}
                              onChange={(e) => updateNote(c.id, e.target.value)}
                              placeholder={ar ? "أضف ملاحظة…" : "Add a note…"}
                              rows={2}
                              className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary resize-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
