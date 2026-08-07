import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useOrders, type OrderStatus } from "@/lib/ordersStore";
import {
  Clock, User, Wrench, CalendarDays, Truck, Hash, Building2, ClipboardList,
} from "lucide-react";

export const Route = createFileRoute("/track-cases/")({
  component: TrackCases,
});

type StatusStyle = {
  bg: string;
  border: string;
  text: string;
  accent: string;
  dot: string;
  light: string;
};

const STATUS: Record<"all", StatusStyle> & Record<OrderStatus, StatusStyle> = {
  all: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-700",
    accent: "border-l-slate-400",
    dot: "bg-slate-500",
    light: "bg-slate-50/30",
  },
  delayed: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    text: "text-rose-700",
    accent: "border-l-rose-400",
    dot: "bg-rose-500",
    light: "bg-rose-50/30",
  },
  in_progress: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    accent: "border-l-amber-400",
    dot: "bg-amber-500",
    light: "bg-amber-50/30",
  },
  completed: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-700",
    accent: "border-l-emerald-400",
    dot: "bg-emerald-500",
    light: "bg-emerald-50/30",
  },
};

const STATUS_LABELS: Record<OrderStatus, { ar: string; en: string }> = {
  delayed: { ar: "متأخرة", en: "Delayed" },
  in_progress: { ar: "قيد التنفيذ", en: "In Progress" },
  completed: { ar: "مكتملة", en: "Completed" },
};

function TrackCases() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const orders = useOrders();
  const [filter, setFilter] = useState<string>("all");

  const statuses = [
    { id: "all", ar: "الكل", en: "All" },
    { id: "delayed", ar: "متأخرة", en: "Delayed" },
    { id: "in_progress", ar: "قيد التنفيذ", en: "In Progress" },
    { id: "completed", ar: "مكتملة", en: "Completed" },
  ];

  const counts: Record<string, number> = {};
  statuses.forEach((s) => {
    counts[s.id] = s.id === "all" ? orders.length : orders.filter((o) => o.status === s.id).length;
  });

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <MobileShell>
      <TopBar title={ar ? "تتبع حالاتك" : "Track your cases"} showBack />
      <div className="px-3 pt-4 pb-6">
        {/* Status count cards */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {statuses.map((s) => {
            const st = STATUS[s.id as keyof typeof STATUS];
            const active = filter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setFilter(s.id)}
                className={cn(
                  "rounded-2xl p-3 text-center transition-all duration-200 border-2",
                  active
                    ? `${st.bg} ${st.border} ring-2 ring-offset-1 ${st.border.replace("200", "300")}`
                    : "bg-white border-slate-200 hover:bg-slate-50",
                )}
              >
                <p className={cn("font-extrabold text-xl", active ? st.text : "text-slate-700")}>
                  {counts[s.id]}
                </p>
                <p className={cn("text-[10px] font-semibold mt-0.5", active ? st.text : "text-slate-500")}>
                  {ar ? s.ar : s.en}
                </p>
              </button>
            );
          })}
        </div>

        {/* Case list */}
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center">
            <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <ClipboardList className="size-9 text-slate-300" />
            </div>
            <p className="font-bold text-slate-500">{ar ? "لا توجد حالات" : "No cases"}</p>
            <p className="text-sm text-slate-400 mt-1">
              {ar
                ? "ستظهر هنا حالات المرضى المرسلة من المختبر"
                : "Patient cases sent from the lab will appear here"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((o) => {
              const st = STATUS[o.status] ?? STATUS.delayed;
              const label = STATUS_LABELS[o.status] ?? STATUS_LABELS.delayed;
              return (
                <div
                  key={o.id}
                  className={cn(
                    "bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden",
                    "border-s-4",
                    st.accent,
                  )}
                >
                  <div className={cn("px-4 pt-3 pb-1", st.light)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={cn("size-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0", st.bg, st.text)}>
                          {(o.patient || "?").charAt(0)}
                        </span>
                        <p className="font-bold text-sm text-slate-800">{o.patient}</p>
                      </div>
                      <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", st.bg, st.text)}>
                        {ar ? label.ar : label.en}
                      </span>
                    </div>
                  </div>

                  <div className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1"><User className="size-3 text-slate-400" />{o.doctor}</span>
                      <span className="inline-flex items-center gap-1"><Wrench className="size-3 text-slate-400" />{o.workType}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="size-3 text-slate-400" />{o.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-600">
                      <span className="inline-flex items-center gap-1"><Truck className="size-3 text-slate-400" />{o.agent || "—"}</span>
                      <span className="inline-flex items-center gap-1"><Hash className="size-3 text-slate-400" />{o.unitsCount} {ar ? "وحدة" : "units"}</span>
                    </div>
                    {o.clinic && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Building2 className="size-3 text-slate-400" />{ar ? "عيادة" : "Clinic"}: {o.clinic}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
