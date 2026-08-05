import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { removeOrder, setOrderStatus, useClinic, type ClinicOrderStatus } from "@/lib/clinicStore";
import { ClipboardList, FlaskConical, Package, Trash2 } from "lucide-react";
import { Stat } from "./clinic.materials";

export const Route = createFileRoute("/clinic/orders")({
  head: () => ({
    meta: [
      { title: "طلبيات العيادة | DentalHub" },
      { name: "description", content: "متابعة طلبات المختبرات ومشتريات المستلزمات مع حالات التنفيذ والتسليم." },
      { property: "og:title", content: "طلبيات العيادة | DentalHub" },
      { property: "og:description", content: "متابعة طلبات المختبرات ومشتريات المستلزمات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

const STATUS: Record<ClinicOrderStatus, { ar: string; en: string; cls: string }> = {
  pending: { ar: "مستحق الدفع", en: "Due", cls: "bg-slate-100 text-slate-700" },
  in_progress: { ar: "قيد التنفيذ", en: "In progress", cls: "bg-amber-100 text-amber-700" },
  delivered: { ar: "مكتمل", en: "Completed", cls: "bg-emerald-100 text-emerald-700" },
};

function fmtIQD(n: number) {
  return `${n.toLocaleString()} د.ع`;
}

function OrdersPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { orders } = useClinic();
  const [tab, setTab] = useState<"all" | "lab" | "supply">("all");

  const list = orders.filter((o) => tab === "all" || o.kind === tab);
  const openCount = orders.filter((o) => o.status !== "delivered").length;
  const due = orders.filter((o) => o.status !== "delivered").reduce((s, o) => s + o.amount, 0);

  return (
    <MobileShell>
      <TopBar title={ar ? "طلبيات العيادة" : "Clinic Orders"} showBack />
      <div className="px-3 pt-3 pb-6">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label={ar ? "طلبات مفتوحة" : "Open orders"} value={String(openCount)} tone="warn" />
          <Stat label={ar ? "مبالغ مستحقة" : "Due amount"} value={fmtIQD(due)} tone="bad" />
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {(["all", "lab", "supply"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn("h-8 px-3 rounded-full text-[11px] font-bold border transition", tab === k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border")}>
              {k === "all" ? (ar ? "الكل" : "All") : k === "lab" ? (ar ? "المختبرات" : "Labs") : ar ? "المستلزمات" : "Supplies"}
            </button>
          ))}
        </div>

        <ul className="mt-3 space-y-2.5">
          {orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <ClipboardList className="size-8 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm font-semibold">{ar ? "لا توجد طلبيات مسجلة حالياً" : "No orders registered yet"}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {ar ? "ستظهر طلبات المختبرات والمستلزمات تلقائياً هنا عند إرسالها من ملف المريض أو المتجر." : "Lab and supply orders will appear here automatically when sent from patient files or the store."}
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <ClipboardList className="size-8 mx-auto text-muted-foreground/50" />
              <p className="mt-2 text-sm font-semibold">{ar ? "لا توجد طلبيات في هذه الفئة" : "No orders in this category"}</p>
            </div>
          ) : (
            list.map((o) => (
              <li key={o.id} className="rounded-2xl bg-card border border-border p-3.5 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className={cn("size-10 shrink-0 rounded-2xl flex items-center justify-center", o.kind === "lab" ? "bg-violet-100 text-violet-600" : "bg-emerald-100 text-emerald-600")}>
                    {o.kind === "lab" ? <FlaskConical className="size-5" /> : <Package className="size-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-extrabold text-sm truncate">{o.title}</p>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", STATUS[o.status].cls)}>
                        {ar ? STATUS[o.status].ar : STATUS[o.status].en}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{o.ref} · {o.vendor} · {o.date}</p>
                    <p className="text-[11px] font-bold text-primary mt-0.5">{fmtIQD(o.amount)}</p>
                  </div>
                  <button onClick={() => removeOrder(o.id)} className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {(Object.keys(STATUS) as ClinicOrderStatus[]).map((s) => (
                    <button key={s} onClick={() => setOrderStatus(o.id, s)}
                      className={cn("flex-1 h-8 rounded-xl text-[10px] font-bold border transition", o.status === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border")}>
                      {ar ? STATUS[s].ar : STATUS[s].en}
                    </button>
                  ))}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </MobileShell>
  );
}
