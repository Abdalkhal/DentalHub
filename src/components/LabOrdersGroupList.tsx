import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, Stethoscope, Users } from "lucide-react";
import { useOrders, connectLabOrders, disconnectLabOrders, type Order } from "@/lib/ordersStore";
import { useSession } from "@/lib/useAuth";
import { cn, normalizeName } from "@/lib/utils";

// The lab's own read-only view of its cases grouped by doctor or by patient,
// derived from the lab's real orders — same as native's lab-doctors /
// lab-patients screens.

type Entry = { name: string; orders: Order[] };

const STATUS_META: Record<string, { ar: string; en: string; cls: string }> = {
  new: { ar: "جديد", en: "New", cls: "bg-sky-50 text-sky-600" },
  in_progress: { ar: "قيد التنفيذ", en: "In Progress", cls: "bg-amber-50 text-amber-600" },
  completed: { ar: "مكتملة", en: "Completed", cls: "bg-emerald-50 text-emerald-600" },
  delayed: { ar: "متأخرة", en: "Delayed", cls: "bg-rose-50 text-rose-600" },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-GB");
}

export function LabOrdersGroupList({ groupBy, ar }: { groupBy: "doctor" | "patient"; ar: boolean }) {
  const { user } = useSession();
  const labId = user?.uid ?? "";
  const orders = useOrders();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Entry | null>(null);

  useEffect(() => {
    if (!labId) return;
    connectLabOrders(labId);
    return () => disconnectLabOrders();
  }, [labId]);

  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      const name = ((groupBy === "doctor" ? o.doctor : o.patient) || "").trim();
      if (!name) continue;
      const list = map.get(name) ?? [];
      list.push(o);
      map.set(name, list);
    }
    return [...map.entries()]
      .map(([name, list]) => ({ name, orders: list }))
      .sort((a, b) => b.orders.length - a.orders.length);
  }, [orders, groupBy]);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = normalizeName(search);
    return groups.filter((g) => normalizeName(g.name).includes(q));
  }, [search, groups]);

  const tone =
    groupBy === "doctor"
      ? "border-sky-100 bg-sky-50 text-sky-600"
      : "border-violet-100 bg-violet-50 text-violet-600";
  const countLabel = (n: number) =>
    groupBy === "doctor"
      ? `${n} ${ar ? (n === 1 ? "طلب" : "طلبات") : n === 1 ? "order" : "orders"}`
      : `${n} ${ar ? (n === 1 ? "حالة" : "حالات") : n === 1 ? "case" : "cases"}`;
  const EmptyIcon = groupBy === "doctor" ? Stethoscope : Users;

  if (selected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className={cn("size-12 rounded-2xl border flex items-center justify-center text-lg font-extrabold", tone)}>
            {selected.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold text-slate-900">{selected.name}</p>
            <p className="mt-0.5 text-xs text-slate-400">{countLabel(selected.orders.length)}</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {selected.orders.map((o) => {
            const meta = STATUS_META[o.status] ?? { ar: o.status, en: o.status, cls: "bg-slate-50 text-slate-600" };
            return (
              <div key={o.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400" dir="ltr">
                    {o.orderNumber}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", meta.cls)}>
                    {ar ? meta.ar : meta.en}
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-400">
                      {groupBy === "doctor" ? (ar ? "المريض" : "Patient") : ar ? "الطبيب" : "Doctor"}
                    </p>
                    <p className="text-xs font-semibold text-slate-800">
                      {(groupBy === "doctor" ? o.patient : o.doctor) || "—"}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-400">{ar ? "التاريخ" : "Date"}</p>
                    <p className="text-xs font-semibold text-slate-800">{formatDate(o.receivedDate)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSelected(null)}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <ChevronUp className="size-4" />
          {ar ? "العودة إلى القائمة" : "Back to list"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative md:max-w-md">
        <Search className="size-4 absolute top-1/2 -translate-y-1/2 start-3.5 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={
            groupBy === "doctor"
              ? ar
                ? "ابحث عن طبيب…"
                : "Search by doctor…"
              : ar
                ? "ابحث عن مريض…"
                : "Search by patient…"
          }
          className="w-full h-11 bg-white rounded-xl border border-slate-200 ps-10 pe-4 text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <EmptyIcon className="size-10 text-slate-300" />
          <p className="mt-3 text-sm">
            {groupBy === "doctor"
              ? ar
                ? "لا يوجد أطباء مطابقون"
                : "No matching doctors"
              : ar
                ? "لا يوجد مرضى مطابقون"
                : "No matching patients"}
          </p>
        </div>
      ) : (
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((g) => (
            <button
              key={g.name}
              type="button"
              onClick={() => setSelected(g)}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm text-start hover:shadow-md transition"
            >
              <span className={cn("size-12 rounded-2xl border flex items-center justify-center text-lg font-extrabold shrink-0", tone)}>
                {g.name.charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-slate-900">{g.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{countLabel(g.orders.length)}</p>
              </div>
              <ChevronDown className="size-4 text-slate-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
