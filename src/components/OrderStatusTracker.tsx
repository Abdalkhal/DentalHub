import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Truck, PackageCheck, AlertCircle } from "lucide-react";

export type SupplyOrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

const STATUS_CONFIG: Record<SupplyOrderStatus, { ar: string; en: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { ar: "قيد الانتظار", en: "Pending", icon: Clock, color: "bg-amber-500 ring-amber-200 text-amber-600" },
  confirmed: { ar: "مؤكد", en: "Confirmed", icon: CheckCircle2, color: "bg-sky-500 ring-sky-200 text-sky-600" },
  processing: { ar: "قيد التجهيز", en: "Processing", icon: PackageCheck, color: "bg-indigo-500 ring-indigo-200 text-indigo-600" },
  shipped: { ar: "تم الشحن", en: "Shipped", icon: Truck, color: "bg-violet-500 ring-violet-200 text-violet-600" },
  delivered: { ar: "تم التسليم", en: "Delivered", icon: PackageCheck, color: "bg-emerald-500 ring-emerald-200 text-emerald-600" },
  cancelled: { ar: "ملغي", en: "Cancelled", icon: AlertCircle, color: "bg-rose-500 ring-rose-200 text-rose-600" },
};

const STATUS_FLOW: SupplyOrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

type OrderStatusTrackerProps = {
  currentStatus: SupplyOrderStatus;
  onStatusChange: (status: SupplyOrderStatus) => void;
  readonly?: boolean;
};

export function OrderStatusTracker({ currentStatus, onStatusChange, readonly }: OrderStatusTrackerProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);

  return (
    <div className="flex items-center gap-0.5">
      {STATUS_FLOW.map((status, i) => {
        const config = STATUS_CONFIG[status];
        const Icon = config.icon;
        const isDone = i < currentIdx && currentStatus !== "cancelled";
        const isCurrent = status === currentStatus && currentStatus !== "cancelled";
        const isCancelled = currentStatus === "cancelled";

        return (
          <div key={status} className="flex-1 flex flex-col items-center gap-1">
            <button
              type="button"
              disabled={readonly || isCancelled}
              onClick={() => onStatusChange(status)}
              className={cn(
                "size-8 rounded-full flex items-center justify-center ring-2 transition-all",
                isDone
                  ? "bg-emerald-500 ring-emerald-200 text-white"
                  : isCurrent
                    ? config.color
                    : "bg-slate-200 ring-slate-100 text-slate-400",
                isCancelled && "bg-slate-200 ring-slate-100 text-slate-300",
                !readonly && !isCancelled && "hover:scale-110 cursor-pointer",
              )}
              title={ar ? config.ar : config.en}
            >
              <Icon className="size-3.5" />
            </button>
            <span className={cn(
              "text-[9px] font-semibold text-center leading-tight max-w-[48px]",
              isDone ? "text-emerald-600" : isCurrent ? "text-slate-700" : "text-slate-400",
              isCancelled && "text-rose-500",
            )}>
              {ar ? config.ar : config.en}
            </span>
            {i < STATUS_FLOW.length - 1 && (
              <div className={cn("absolute -z-0 h-0.5 w-[calc(12.5%)] mt-3", isDone ? "bg-emerald-400" : "bg-slate-200")} style={{ left: `calc(${(i * 100) / 5 + 12.5}% + 0.5rem)` }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function getSupplyOrderStatusLabel(status: SupplyOrderStatus, lang: "ar" | "en") {
  const config = STATUS_CONFIG[status];
  if (!config) return status;
  return lang === "ar" ? config.ar : config.en;
}

export function getSupplyOrderStatusColor(status: SupplyOrderStatus) {
  return STATUS_CONFIG[status]?.color ?? "bg-slate-500";
}
