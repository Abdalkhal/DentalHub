import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { addTransaction, clinicTotals, removeTransaction, useClinic, type TxKind } from "@/lib/clinicStore";
import { Wallet, Plus, Trash2 } from "lucide-react";
import { EmptyState, Field, Sheet, Stat, inputCls } from "./clinic.materials";

export const Route = createFileRoute("/clinic/finance")({
  head: () => ({
    meta: [
      { title: "المالية والحسابات | DentalHub" },
      { name: "description", content: "تتبع إيرادات العيادة والمصاريف وفواتير المختبر ومدفوعات المرضى والمتبقي." },
      { property: "og:title", content: "المالية والحسابات | DentalHub" },
      { property: "og:description", content: "إيرادات ومصاريف وفواتير العيادة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancePage,
});

const SOURCES = [
  { id: "patient", ar: "مريض", en: "Patient" },
  { id: "lab", ar: "مختبر", en: "Lab" },
  { id: "supply", ar: "مستلزمات", en: "Supplies" },
  { id: "other", ar: "أخرى", en: "Other" },
] as const;

function FinancePage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const data = useClinic();
  const { income, expense, net, dueOrders } = clinicTotals(data);
  const [open, setOpen] = useState(false);

  return (
    <MobileShell>
      <TopBar title={ar ? "المالية والحسابات" : "Finance & Accounts"} showBack />
      <div className="px-3 pt-3 pb-6">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label={ar ? "الإيرادات" : "Revenue"} value={`${income} $`} tone="good" />
          <Stat label={ar ? "المصاريف" : "Expenses"} value={`${expense} $`} tone="bad" />
          <Stat label={ar ? "الصافي" : "Net"} value={`${net} $`} tone={net >= 0 ? "good" : "bad"} />
          <Stat label={ar ? "متبقي للموردين" : "Outstanding"} value={`${dueOrders} $`} tone="warn" />
        </div>

        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card flex items-center justify-center gap-2"
        >
          <Plus className="size-4" strokeWidth={3} />
          {ar ? "إضافة حركة مالية" : "Add transaction"}
        </button>

        <ul className="mt-3 space-y-2.5">
          {data.transactions.length === 0 ? (
            <EmptyState icon={Wallet} title={ar ? "لا توجد حركات مالية" : "No transactions"} sub={ar ? "سجّل أول دفعة أو مصروف" : "Add your first entry"} />
          ) : (
            data.transactions.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3.5 shadow-soft">
                <span
                  className={cn(
                    "size-10 shrink-0 rounded-2xl flex items-center justify-center font-display font-extrabold text-sm",
                    t.kind === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  )}
                >
                  {t.kind === "income" ? "+" : "−"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-extrabold text-sm truncate">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.date} · {ar ? SOURCES.find((s) => s.id === t.source)?.ar : SOURCES.find((s) => s.id === t.source)?.en}
                  </p>
                </div>
                <span className={cn("font-display font-extrabold text-sm", t.kind === "income" ? "text-emerald-600" : "text-rose-600")}>
                  {t.amount} $
                </span>
                <button onClick={() => removeTransaction(t.id)} className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      {open && <TxModal ar={ar} onClose={() => setOpen(false)} />}
    </MobileShell>
  );
}

function TxModal({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [f, setF] = useState({ label: "", kind: "income" as TxKind, amount: 0, source: "patient" as (typeof SOURCES)[number]["id"] });
  return (
    <Sheet onClose={onClose} title={ar ? "إضافة حركة مالية" : "Add transaction"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.label.trim()) return;
          addTransaction(f);
          onClose();
        }}
        className="space-y-3"
      >
        <Field label={ar ? "البيان" : "Label"}>
          <input required value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={ar ? "النوع" : "Type"}>
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as TxKind })} className={inputCls}>
              <option value="income">{ar ? "إيراد" : "Income"}</option>
              <option value="expense">{ar ? "مصروف" : "Expense"}</option>
            </select>
          </Field>
          <Field label={ar ? "المبلغ ($)" : "Amount ($)"}>
            <input type="number" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
        <Field label={ar ? "المصدر" : "Source"}>
          <select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as (typeof SOURCES)[number]["id"] })} className={inputCls}>
            {SOURCES.map((s) => (
              <option key={s.id} value={s.id}>{ar ? s.ar : s.en}</option>
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
