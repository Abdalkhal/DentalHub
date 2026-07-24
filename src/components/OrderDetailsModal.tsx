import { X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/ordersStore";

const STATUS_META: Record<OrderStatus, { ar: string; en: string; badge: string; dot: string }> = {
  in_progress: {
    ar: "قيد التنفيذ",
    en: "In Progress",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  completed: {
    ar: "مكتملة",
    en: "Completed",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  delayed: {
    ar: "متأخرة",
    en: "Delayed",
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

const WORK_TYPE_LABELS: Record<string, { ar: string; en: string }> = {
  crown: { ar: "تاج", en: "Crown" },
  veneer: { ar: "قشرة", en: "Veneer" },
  implant: { ar: "زرعة", en: "Implant" },
  clear_aligner: { ar: "مصفف شفاف", en: "Clear Aligner" },
};

type Props = {
  order: Order;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
};

export function OrderDetailsModal({ order, onClose, onStatusChange }: Props) {
  const { lang } = useI18n();
  const ar = lang === "ar";

  const sm = STATUS_META[order.status];
  const wt = WORK_TYPE_LABELS[order.workType] ?? { ar: order.workType, en: order.workType };

  const nextStatus: OrderStatus | null =
    order.status === "delayed"
      ? "in_progress"
      : order.status === "in_progress"
        ? "completed"
        : null;

  const nextLabel = nextStatus
    ? ar
      ? STATUS_META[nextStatus].ar
      : STATUS_META[nextStatus].en
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-extrabold text-lg">
            {ar ? `تفاصيل الطلب ${order.orderNumber}` : `Order ${order.orderNumber}`}
          </h3>
          <button
            onClick={onClose}
            className="size-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {ar ? "رقم الطلب" : "Order #"}
              </p>
              <p className="font-bold text-slate-900">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {ar ? "تاريخ الاستلام" : "Date Received"}
              </p>
              <p className="font-bold text-slate-900">{order.receivedDate}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {ar ? "المريض" : "Patient"}
              </p>
              <p className="font-bold text-slate-900">{order.patient}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {ar ? "الطبيب" : "Doctor"}
              </p>
              <p className="font-bold text-slate-900">{order.doctor}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {ar ? "نوع العمل" : "Work Type"}
              </p>
              <p className="font-bold text-slate-900">{ar ? wt.ar : wt.en}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">
                {ar ? "الحالة" : "Status"}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border",
                  sm.badge,
                )}
              >
                <span className={cn("size-1.5 rounded-full", sm.dot)} />
                {ar ? sm.ar : sm.en}
              </span>
            </div>
          </div>

          {nextStatus && nextLabel && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                {ar ? "تغيير الحالة" : "Change Status"}
              </p>
              <button
                onClick={() => onStatusChange(order.id, nextStatus)}
                className={cn(
                  "w-full h-11 rounded-xl text-sm font-bold border-2 transition-all",
                  STATUS_META[nextStatus].badge,
                )}
              >
                {ar
                  ? `نقل إلى "${STATUS_META[nextStatus].ar}"`
                  : `Move to "${STATUS_META[nextStatus].en}"`}
              </button>
            </div>
          )}

          {!nextStatus && (
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-emerald-600 mb-2">
                {ar ? "هذا الطلب مكتمل" : "This order is completed"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
