import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Stethoscope, FileText, Clock, X } from "lucide-react";

const ORDERS_KEY = "dental_hub_orders";

type OrderData = {
  id: string;
  orderNumber: string;
  patient: string;
  doctor: string;
  workType: string;
  receivedDate: string;
  status: string;
};

type DoctorEntry = {
  name: string;
  orderCount: number;
  orders: OrderData[];
};

const normalizeStr = (str: string) =>
  str
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .trim()
    .toLowerCase();

function loadOrders(): OrderData[] {
  try {
    const saved = localStorage.getItem(ORDERS_KEY);
    if (saved) return JSON.parse(saved);
    const old = localStorage.getItem("dental_orders");
    if (old) {
      const parsed = JSON.parse(old) as OrderData[];
      localStorage.setItem(ORDERS_KEY, JSON.stringify(parsed));
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function buildDoctors(orders: OrderData[]): DoctorEntry[] {
  const map = new Map<string, OrderData[]>();
  for (const o of orders) {
    if (!o.doctor) continue;
    const existing = map.get(o.doctor) ?? [];
    existing.push(o);
    map.set(o.doctor, existing);
  }
  return Array.from(map.entries())
    .map(([name, orders]) => ({ name, orders, orderCount: orders.length }))
    .sort((a, b) => b.orderCount - a.orderCount);
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB");
  } catch {
    return dateStr;
  }
}

const STATUS_LABELS: Record<string, { ar: string; en: string; color: string }> = {
  in_progress: { ar: "قيد التنفيذ", en: "In Progress", color: "text-amber-600 bg-amber-50" },
  completed: { ar: "مكتملة", en: "Completed", color: "text-emerald-600 bg-emerald-50" },
  delayed: { ar: "متأخرة", en: "Delayed", color: "text-rose-600 bg-rose-50" },
};

export const Route = createFileRoute("/doctors")({
  component: DoctorsPage,
});

function DoctorsPage() {
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DoctorEntry | null>(null);

  const doctors = useMemo(() => {
    const orders = loadOrders();
    return buildDoctors(orders);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = normalizeStr(search);
    return doctors.filter((d) => normalizeStr(d.name).includes(q));
  }, [search, doctors]);

  if (selected) {
    return (
      <MobileShell>
        <TopBar title={selected.name} showBack />
        <div className="px-4 pt-4 space-y-3">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-soft flex items-center gap-3">
            <span className="size-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-display font-extrabold text-lg">
              {selected.name.charAt(0)}
            </span>
            <div>
              <p className="font-display font-bold text-base">{selected.name}</p>
              <p className="text-xs text-muted-foreground">
                {selected.orderCount} {ar ? "طلب" : "order"}
                {selected.orderCount !== 1 ? (ar ? "ات" : "s") : ""}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {selected.orders.map((o) => (
              <div
                key={o.id}
                className="bg-card border border-border rounded-2xl p-3.5 shadow-soft"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {o.orderNumber}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full",
                      STATUS_LABELS[o.status]?.color ?? "bg-slate-50 text-slate-600",
                    )}
                  >
                    {ar
                      ? (STATUS_LABELS[o.status]?.ar ?? o.status)
                      : (STATUS_LABELS[o.status]?.en ?? o.status)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">{ar ? "المريض" : "Patient"}</span>
                    <p className="font-semibold">{o.patient}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{ar ? "التاريخ" : "Date"}</span>
                    <p className="font-semibold">{formatDate(o.receivedDate)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setSelected(null)}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-card border border-border text-sm font-semibold text-foreground hover:bg-accent"
          >
            <ChevronUp className="size-4" />
            {ar ? "العودة إلى القائمة" : "Back to list"}
          </button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar
        title={ar ? "الأطباء" : "Doctors & Clinics"}
        showBack
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={ar ? "ابحث عن طبيب…" : "Search by doctor…"}
      />
      <div className="px-4 pt-4">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center text-muted-foreground">
            <Stethoscope className="size-10 mb-3 text-muted-foreground/40" />
            <p className="text-sm">{ar ? "لا يوجد أطباء مطابقون" : "No matching doctors"}</p>
            <p className="text-xs mt-1">
              {ar ? "حاول تغيير كلمة البحث" : "Try a different search term"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((d) => (
              <li key={d.name}>
                <button
                  onClick={() => setSelected(d)}
                  className="w-full text-start bg-card border border-border rounded-2xl p-3.5 shadow-soft hover:shadow-card transition flex items-start gap-3"
                >
                  <span className="size-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-display font-extrabold text-lg">
                    {d.name.charAt(0)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {d.orderCount} {ar ? "طلب" : "order"}
                      {d.orderCount !== 1 ? (ar ? "ات" : "s") : ""}
                    </p>
                  </div>
                  <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-1" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
