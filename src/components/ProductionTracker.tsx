import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import {
  useOrders,
  updateOrderStage,
  updateOrderStatus,
  type Order,
  type ProdStageId,
} from "@/lib/ordersStore";

const STAGE_ORDER: ProdStageId[] = [
  "impression",
  "design",
  "printing",
  "ceramic",
  "qc",
  "dispatch",
];

const STEPS: {
  id: ProdStageId;
  ar: string;
  en: string;
  color: string;
  dotColor: string;
}[] = [
  {
    id: "impression",
    ar: "استلام الطبعة",
    en: "Impression Received",
    color: "border-sky-200 bg-sky-50",
    dotColor: "bg-sky-500",
  },
  {
    id: "design",
    ar: "التصميم الرقمي",
    en: "Digital Design",
    color: "border-indigo-200 bg-indigo-50",
    dotColor: "bg-indigo-500",
  },
  {
    id: "printing",
    ar: "الخرط/الطباعة",
    en: "Printing/Milling",
    color: "border-amber-200 bg-amber-50",
    dotColor: "bg-amber-500",
  },
  {
    id: "ceramic",
    ar: "السيراميك",
    en: "Ceramic",
    color: "border-rose-200 bg-rose-50",
    dotColor: "bg-rose-500",
  },
  {
    id: "qc",
    ar: "فحص الجودة",
    en: "Quality Check",
    color: "border-purple-200 bg-purple-50",
    dotColor: "bg-purple-500",
  },
  {
    id: "dispatch",
    ar: "التوصيل",
    en: "Dispatch",
    color: "border-emerald-200 bg-emerald-50",
    dotColor: "bg-emerald-500",
  },
];

const WORK_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  crown: { ar: "تاج", en: "Crown" },
  veneer: { ar: "قشرة", en: "Veneer" },
  implant: { ar: "زرعة", en: "Implant" },
  clear_aligner: { ar: "مصفف شفاف", en: "Clear Aligner" },
};

function formatShortDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
}

export function ProductionTracker() {
  const { lang, t } = useI18n();
  const ar = lang === "ar";
  const orders = useOrders();
  const [expandedStep, setExpandedStep] = useState<ProdStageId | null>(null);

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== "completed"), [orders]);

  const grouped = useMemo(() => {
    const map: Record<ProdStageId, Order[]> = {
      impression: [],
      design: [],
      printing: [],
      ceramic: [],
      qc: [],
      dispatch: [],
    };
    for (const o of activeOrders) {
      const stage = o.currentStage ?? "impression";
      if (map[stage]) {
        map[stage].push(o);
      } else {
        map.impression.push(o);
      }
    }
    return map;
  }, [activeOrders]);

  const handleAdvance = (order: Order) => {
    const current = order.currentStage ?? "impression";
    const idx = STAGE_ORDER.indexOf(current);
    if (idx < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[idx + 1];
      updateOrderStage(order.id, nextStage);
    } else {
      updateOrderStatus(order.id, "completed");
    }
  };

  return (
    <div className="space-y-3">
      {STEPS.map((step) => {
        const stepOrders = grouped[step.id];
        const isExpanded = expandedStep === step.id;
        const delayedCount = stepOrders.filter((o) => o.status === "delayed").length;

        return (
          <div key={step.id} className="bg-card border border-border rounded-2xl overflow-hidden">
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
                    {stepOrders.length} {ar ? "حالة" : "case"}
                    {stepOrders.length !== 1 ? (ar ? "ات" : "s") : ""}
                    {delayedCount > 0 && (
                      <span className="text-rose-500 font-semibold">
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

            {isExpanded && (
              <div className="px-4 pb-3 pt-2 space-y-2">
                {stepOrders.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground/50">
                    <CheckCircle2 className="size-5" />
                    <p className="text-xs">
                      {ar ? "لا توجد حالات في هذه المرحلة" : "No cases in this stage"}
                    </p>
                  </div>
                ) : (
                  stepOrders.map((o) => {
                    const wt = WORK_TYPE_LABELS[o.workType] ?? {
                      ar: o.workType,
                      en: o.workType,
                    };
                    const isLastStage =
                      (o.currentStage ?? "impression") === STAGE_ORDER[STAGE_ORDER.length - 1];
                    const isDelayed = o.status === "delayed";
                    return (
                      <div
                        key={o.id}
                        className={cn(
                          "rounded-xl border p-3 space-y-2 transition-all",
                          isDelayed ? "border-rose-200 bg-rose-50/50" : "border-border bg-muted/30",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-muted-foreground">
                                {o.orderNumber}
                              </span>
                              {isDelayed && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-full">
                                  <AlertTriangle className="size-3" />
                                  {ar ? "متأخرة" : "Delayed"}
                                </span>
                              )}
                            </div>
                            <p className="font-display font-bold text-sm text-foreground leading-snug mt-0.5">
                              {o.patient}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate">{o.doctor}</p>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                            <Clock className="size-3" />
                            {formatShortDate(o.receivedDate)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                          <span className="inline-block text-[10px] font-semibold bg-card text-foreground px-2 py-0.5 rounded-full border border-border leading-relaxed">
                            {ar ? wt.ar : wt.en}
                          </span>
                          <button
                            onClick={() => handleAdvance(o)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold hover:bg-primary/20 transition"
                          >
                            {isLastStage
                              ? ar
                                ? "إكمال الطلب"
                                : "Complete Order"
                              : ar
                                ? "نقل للمرحلة التالية"
                                : "Move to Next"}
                            <ArrowRight className={cn("size-3", lang === "ar" && "rotate-180")} />
                          </button>
                        </div>
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
