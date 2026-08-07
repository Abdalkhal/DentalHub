import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useOrders, type Order, type OrderStatus } from "@/lib/ordersStore";
import { Clock, User, Wrench } from "lucide-react";

export const Route = createFileRoute("/track-cases/")({
  component: TrackCases,
});

const STATUS_META: Record<OrderStatus, { ar: string; en: string; color: string }> = {
  delayed: { ar: "متأخرة", en: "Delayed", color: "bg-rose-100 text-rose-700" },
  in_progress: { ar: "قيد التنفيذ", en: "In Progress", color: "bg-amber-100 text-amber-700" },
  completed: { ar: "مكتملة", en: "Completed", color: "bg-emerald-100 text-emerald-700" },
  pending: { ar: "قيد الانتظار", en: "Pending", color: "bg-sky-100 text-sky-700" },
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
  statuses.forEach((s) => { counts[s.id] = s.id === "all" ? orders.length : orders.filter((o) => o.status === s.id).length; });

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  return (
    <MobileShell>
      <TopBar title={ar ? "تتبع حالاتك" : "Track your cases"} showBack />
      <div className="px-3 pt-4 pb-6">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {statuses.map((s) => (
            <button key={s.id} onClick={() => setFilter(s.id)}
              className={cn("rounded-2xl p-3 text-center transition border-2", filter === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-white text-slate-600 border-slate-200")}>
              <p className="font-extrabold text-lg">{counts[s.id]}</p>
              <p className="text-[10px] font-semibold mt-0.5">{ar ? s.ar : s.en}</p>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Clock className="size-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">{ar ? "لا توجد حالات" : "No cases"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((o) => {
              const sm = STATUS_META[o.status] ?? STATUS_META.pending;
              return (
                <div key={o.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{o.patient}</p>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", sm.color)}>{ar ? sm.ar : sm.en}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1"><User className="size-3" />{o.doctor}</span>
                        <span className="flex items-center gap-1"><Wrench className="size-3" />{o.workType}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span>{o.dueDate}</span>
                        <span>·</span>
                        <span>{o.agent || "—"}</span>
                        <span>·</span>
                        <span>{o.unitsCount} {ar ? "وحدة" : "units"}</span>
                      </div>
                      {o.clinic && <p className="text-[10px] text-slate-400 mt-1">{ar ? "عيادة" : "Clinic"}: {o.clinic}</p>}
                    </div>
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
