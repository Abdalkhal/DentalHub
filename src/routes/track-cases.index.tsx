import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { IncomingOrderRxModal } from "@/components/IncomingOrderRxModal";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useOrders, type Order, type OrderStatus } from "@/lib/ordersStore";
import {
  useDentistCases,
  filterLegacyOrders,
  getCaseProgress,
  getStageLabel,
  isCompletedStatus,
  isInProgressStatus,
  isNewStatus,
} from "@/lib/caseTracking";
import { useCaseUnreadCount } from "@/lib/caseMessages";
import { useSession, useUserRole } from "@/lib/useAuth";
import {
  User, Wrench, CalendarDays, Truck, Hash, Building2, ClipboardList,
  RefreshCw,
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
  new: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    accent: "border-l-sky-400",
    dot: "bg-sky-500",
    light: "bg-sky-50/30",
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
  new: { ar: "جديد", en: "New" },
  delayed: { ar: "متأخرة", en: "Delayed" },
  in_progress: { ar: "قيد التنفيذ", en: "In Progress" },
  completed: { ar: "مكتملة", en: "Completed" },
};

/** Maps any status string (English or Arabic) to its canonical OrderStatus. */
function canonicalStatus(status: string | undefined): OrderStatus {
  if (isCompletedStatus(status)) return "completed";
  if (isInProgressStatus(status)) return "in_progress";
  if (isNewStatus(status)) return "new";
  return "delayed";
}

type TrackedCase = { labId: string; order: Order };

function UnreadBadge({ labId, caseId, userId }: { labId?: string; caseId: string; userId?: string }) {
  const count = useCaseUnreadCount(labId ?? "", caseId, userId);
  if (!count) return null;
  return (
    <span className="shrink-0 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function TrackCases() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { role } = useUserRole();
  const localOrders = useOrders();
  const doctorName =
    role?.accountType === "dentist"
      ? [role.name, role.surname].filter(Boolean).join(" ").trim()
      : "";
  const { cases: remoteCases, loading } = useDentistCases(user?.uid ?? "");
  const [selectedCase, setSelectedCase] = useState<TrackedCase | null>(null);

  // Filter strictly by the doctor's unique id (Firestore), with a legacy
  // fallback: cases that lack `dentistId` are matched by doctor name
  // (case-insensitive + trimmed). Everything is deduplicated by order.id.
  const allCases = useMemo<TrackedCase[]>(() => {
    const remote: TrackedCase[] = remoteCases.map((c) => ({ labId: c.labId, order: c.order }));
    const remoteIds = new Set(remote.map((r) => r.order.id));
    const legacy: TrackedCase[] = filterLegacyOrders(localOrders, remoteIds, doctorName).map(
      (o) => ({ labId: "", order: o }),
    );
    return Array.from(
      new Map([...remote, ...legacy].map((c) => [c.order.id, c])).values(),
    );
  }, [remoteCases, localOrders, doctorName]);

  const [filter, setFilter] = useState<string>("all");

  const statuses = [
    { id: "all", ar: "الكل", en: "All" },
    { id: "new", ar: "جديد", en: "New" },
    { id: "delayed", ar: "متأخرة", en: "Delayed" },
    { id: "in_progress", ar: "قيد التنفيذ", en: "In Progress" },
    { id: "completed", ar: "مكتملة", en: "Completed" },
  ];

  const counts: Record<string, number> = {};
  statuses.forEach((s) => {
    counts[s.id] =
      s.id === "all"
        ? allCases.length
        : allCases.filter((c) => canonicalStatus(c.order.status) === s.id).length;
  });

  const filtered =
    filter === "all"
      ? allCases
      : allCases.filter((c) => canonicalStatus(c.order.status) === filter);

  return (
    <MobileShell>
      <TopBar title={ar ? "تتبع حالاتك" : "Track your cases"} showBack />
      <div className="px-3 pt-4 pb-6">
        {/* Status count cards */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {loading && (
              <span className="text-[10px] font-semibold text-slate-400 inline-flex items-center gap-1">
                <RefreshCw className="size-3 animate-spin" />
                {ar ? "تحديث..." : "Syncing..."}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2 mb-5">
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
            {filtered.map((c) => {
              const o = c.order;
              const st = STATUS[canonicalStatus(o.status)];
              const label = STATUS_LABELS[canonicalStatus(o.status)];
              return (
                <div
                  key={o.id}
                  onClick={() => setSelectedCase(c)}
                  className={cn(
                    "bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer",
                    "border-s-4",
                    st.accent,
                  )}
                >
                  <div className={cn("px-4 pt-3 pb-1", st.light)}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={cn("size-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0", st.bg, st.text)}>
                          {(o.patient || "?").charAt(0)}
                        </span>
                        <p className="font-bold text-sm text-slate-800 truncate">{o.patient}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <UnreadBadge labId={c.labId} caseId={o.id} userId={user?.uid} />
                        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full", st.bg, st.text)}>
                          {ar ? label.ar : label.en}
                        </span>
                      </div>
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
                    {o.currentStage && (
                      <div className="pt-1">
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400 transition-all duration-700"
                            style={{ width: `${getCaseProgress(o.currentStage)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 text-center">
                          {getStageLabel(o.currentStage, lang)}
                        </p>
                      </div>
                    )}
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

      {selectedCase && (
        <IncomingOrderRxModal
          order={selectedCase.order}
          onClose={() => setSelectedCase(null)}
          labId={selectedCase.labId || undefined}
          currentUserId={user?.uid}
          senderRole="doctor"
          senderName={
            role?.name || user?.displayName || user?.email || (ar ? "الطبيب" : "Doctor")
          }
        />
      )}
    </MobileShell>
  );
}
