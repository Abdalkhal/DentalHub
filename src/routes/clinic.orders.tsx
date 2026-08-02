import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { addOrder, removeOrder, setOrderStatus, useClinic, type ClinicOrderStatus } from "@/lib/clinicStore";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import { EmptyState, Field, Sheet, Stat, inputCls } from "./clinic.materials";

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
  pending: { ar: "قيد الانتظار", en: "Pending", cls: "bg-slate-100 text-slate-700" },
  in_progress: { ar: "قيد التنفيذ", en: "In progress", cls: "bg-amber-100 text-amber-700" },
  delivered: { ar: "تم التسليم", en: "Delivered", cls: "bg-emerald-100 text-emerald-700" },
};

function OrdersPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { orders } = useClinic();
  const [tab, setTab] = useState<"all" | "lab" | "supply">("all");
  const [open, setOpen] = useState(false);

  const list = orders.filter((o) => tab === "all" || o.kind === tab);
  const openCount = orders.filter((o) => o.status !== "delivered").length;
  const due = orders.filter((o) => o.status !== "delivered").reduce((s, o) => s + o.amount, 0);

  return (
    <MobileShell>
      <TopBar title={ar ? "طلبيات العيادة" : "Clinic Orders"} showBack />
      <div className="px-3 pt-3 pb-6">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label={ar ? "طلبات مفتوحة" : "Open orders"} value={String(openCount)} tone="warn" />
          <Stat label={ar ? "مبالغ مستحقة" : "Due amount"} value={`${due} $`} tone="bad" />
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {(["all", "lab", "supply"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "h-8 px-3 rounded-full text-[11px] font-bold border transition",
                tab === k ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
              )}
            >
              {k === "all" ? (ar ? "الكل" : "All") : k === "lab" ? (ar ? "المختبرات" : "Labs") : ar ? "المستلزمات" : "Supplies"}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card flex items-center justify-center gap-2"
        >
          <Plus className="size-4" strokeWidth={3} />
          {ar ? "إضافة طلبية" : "Add order"}
        </button>

        <ul className="mt-3 space-y-2.5">
          {list.length === 0 ? (
            <EmptyState icon={ClipboardList} title={ar ? "لا توجد طلبيات" : "No orders yet"} sub={ar ? "سجّل أول طلبية للمختبر أو المستلزمات" : "Add your first order"} />
          ) : (
            list.map((o) => (
              <li key={o.id} className="rounded-2xl bg-card border border-border p-3.5 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-extrabold text-sm truncate">{o.title}</p>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0", STATUS[o.status].cls)}>
                        {ar ? STATUS[o.status].ar : STATUS[o.status].en}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {o.ref} · {o.vendor} · {o.date}
                    </p>
                    <p className="text-[11px] font-bold text-primary mt-0.5">{o.amount} $</p>
                  </div>
                  <button onClick={() => removeOrder(o.id)} className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5">
                  {(Object.keys(STATUS) as ClinicOrderStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setOrderStatus(o.id, s)}
                      className={cn(
                        "flex-1 h-8 rounded-xl text-[10px] font-bold border transition",
                        o.status === s ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
                      )}
                    >
                      {ar ? STATUS[s].ar : STATUS[s].en}
                    </button>
                  ))}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {open && <OrderModal ar={ar} onClose={() => setOpen(false)} />}
    </MobileShell>
  );
}

function OrderModal({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [f, setF] = useState({
    title: "",
    vendor: "",
    kind: "lab" as "lab" | "supply",
    amount: 0,
    status: "pending" as ClinicOrderStatus,
  });
  return (
    <Sheet onClose={onClose} title={ar ? "إضافة طلبية" : "Add order"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.title.trim()) return;
          addOrder(f);
          onClose();
        }}
        className="space-y-3"
      >
        <Field label={ar ? "عنوان الطلبية" : "Order title"}>
          <input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputCls} />
        </Field>
        <Field label={ar ? "الجهة (مختبر / مكتب)" : "Vendor"}>
          <input value={f.vendor} onChange={(e) => setF({ ...f, vendor: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={ar ? "النوع" : "Type"}>
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "lab" | "supply" })} className={inputCls}>
              <option value="lab">{ar ? "مختبر" : "Lab"}</option>
              <option value="supply">{ar ? "مستلزمات" : "Supplies"}</option>
            </select>
          </Field>
          <Field label={ar ? "المبلغ ($)" : "Amount ($)"}>
            <input type="number" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
        <Field label={ar ? "الحالة" : "Status"}>
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ClinicOrderStatus })} className={inputCls}>
            {(Object.keys(STATUS) as ClinicOrderStatus[]).map((s) => (
              <option key={s} value={s}>{ar ? STATUS[s].ar : STATUS[s].en}</option>
            ))}
          </select>
        </Field>
        <button type="submit" className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card">
          {ar ? "حفظ" : "Save"}
        </button>
      </form>
    </Sheet>
  );
}
