import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Landmark,
  TrendingUp,
  Building2,
  AlertCircle,
  Wallet,
  Stethoscope,
  FlaskConical,
  Syringe,
  Microscope,
  Cog,
  Lightbulb,
  Wifi,
  ScrollText,
  CheckCircle2,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/finance")({
  component: FinancePage,
});

type Invoice = {
  id: string;
  clinic: string;
  amount: number;
  paid: boolean;
  dueDate: string;
};

type Expense = {
  id: string;
  category: string;
  icon: typeof DollarSign;
  items: { label: string; amount: number }[];
};

const INVOICES: Invoice[] = [
  { id: "i1", clinic: "عيادة النور", amount: 4200, paid: true, dueDate: "2026-07-15" },
  { id: "i2", clinic: "مجمع عيادات الفارابي", amount: 8500, paid: true, dueDate: "2026-07-14" },
  { id: "i3", clinic: "عيادة الريان", amount: 3100, paid: false, dueDate: "2026-07-20" },
  { id: "i4", clinic: "عيادة السلام", amount: 6200, paid: false, dueDate: "2026-07-22" },
  { id: "i5", clinic: "عيادة الزهراء", amount: 1800, paid: true, dueDate: "2026-07-10" },
  { id: "i6", clinic: "عيادة النور", amount: 2700, paid: false, dueDate: "2026-07-25" },
];

const EXPENSES: Expense[] = [
  {
    id: "e1",
    category: "المواد السريرية",
    icon: Stethoscope,
    items: [
      { label: "حشوات تجميلية", amount: 3400 },
      { label: "مواد تبييض", amount: 1200 },
      { label: "أدوات تعقيم", amount: 900 },
    ],
  },
  {
    id: "e2",
    category: "مواد المختبر",
    icon: FlaskConical,
    items: [
      { label: "انطباعات رقمية", amount: 2800 },
      { label: "تيجان مؤقتة", amount: 1500 },
    ],
  },
  {
    id: "e3",
    category: "الزرعات",
    icon: Syringe,
    items: [
      { label: "زرعات كورية", amount: 6200 },
      { label: "أغطية التئام", amount: 800 },
    ],
  },
  {
    id: "e4",
    category: "التجهيزات والمعدات",
    icon: Microscope,
    items: [
      { label: "صيانة جهاز", amount: 1100 },
      { label: "قطع غيار كرسي", amount: 2400 },
    ],
  },
  {
    id: "e5",
    category: "الصيانة والتشغيل",
    icon: Cog,
    items: [
      { label: "صيانة مكيفات", amount: 600 },
      { label: "تنظيف", amount: 400 },
    ],
  },
  {
    id: "e6",
    category: "المرافق",
    icon: Lightbulb,
    items: [
      { label: "كهرباء", amount: 850 },
      { label: "ماء", amount: 200 },
    ],
  },
  {
    id: "e7",
    category: "الإنترنت والاتصالات",
    icon: Wifi,
    items: [
      { label: "إنترنت", amount: 150 },
      { label: "هاتف", amount: 80 },
    ],
  },
  {
    id: "e8",
    category: "مصاريف إدارية",
    icon: ScrollText,
    items: [
      { label: "قرطاسية", amount: 300 },
      { label: "تراخيص", amount: 1200 },
    ],
  },
];

function fmt(n: number) {
  return n.toLocaleString() + " د.ع";
}

function FinancePage() {
  const { lang, t } = useI18n();
  const ar = lang === "ar";
  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");

  const totalInvoiced = useMemo(() => INVOICES.reduce((s, i) => s + i.amount, 0), []);
  const collected = useMemo(
    () => INVOICES.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0),
    [],
  );
  const outstanding = totalInvoiced - collected;

  const totalExpenses = useMemo(
    () => EXPENSES.reduce((s, cat) => s + cat.items.reduce((a, i) => a + i.amount, 0), 0),
    [],
  );

  const filteredInvoices = useMemo(() => {
    if (filter === "paid") return INVOICES.filter((i) => i.paid);
    if (filter === "pending") return INVOICES.filter((i) => !i.paid);
    return INVOICES;
  }, [filter]);

  return (
    <MobileShell>
      <TopBar title={ar ? "المالية" : "Finance"} showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* Running Balance Card */}
        <div className="bg-gradient-to-br from-primary/10 to-primary-soft/30 rounded-3xl border border-primary/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-9 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                <DollarSign className="size-5" />
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                {ar ? "ملخص الحساب" : "Account Summary"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {ar ? "آخر تحديث: اليوم" : "Updated: Today"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card/80 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                {t("total_invoiced")}
              </p>
              <p className="font-display font-extrabold text-sm text-foreground">
                {fmt(totalInvoiced)}
              </p>
            </div>
            <div className="bg-emerald-50/80 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-semibold text-emerald-700 mb-1">
                {t("collected_paid")}
              </p>
              <p className="font-display font-extrabold text-sm text-emerald-700">
                {fmt(collected)}
              </p>
            </div>
            <div className="bg-amber-50/80 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-semibold text-amber-700 mb-1">
                {t("outstanding_balance")}
              </p>
              <p className="font-display font-extrabold text-sm text-amber-700">
                {fmt(outstanding)}
              </p>
            </div>
          </div>
        </div>

        {/* Clinic Billing */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-extrabold text-base text-foreground">
              {t("clinic_billing")}
            </h2>
            <div className="flex gap-1">
              {(["all", "paid", "pending"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2.5 h-7 rounded-full text-[10px] font-semibold border transition",
                    filter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border hover:bg-accent",
                  )}
                >
                  {f === "all" ? (ar ? "الكل" : "All") : f === "paid" ? t("paid") : t("pending")}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
                {t("no_invoices")}
              </div>
            ) : (
              filteredInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
                >
                  <span
                    className={cn(
                      "size-10 rounded-xl flex items-center justify-center shrink-0",
                      inv.paid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600",
                    )}
                  >
                    {inv.paid ? <CheckCircle2 className="size-5" /> : <Clock className="size-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm truncate">{inv.clinic}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ar ? "تاريخ الاستحقاق" : "Due"}: {inv.dueDate}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-display font-extrabold text-foreground">{fmt(inv.amount)}</p>
                    <span
                      className={cn(
                        "inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1",
                        inv.paid
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {inv.paid ? t("paid") : t("pending")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Operational Expenses */}
        <section>
          <h2 className="font-display font-extrabold text-base text-foreground mb-3">
            {t("operational_expenses")}
          </h2>
          <div className="space-y-3">
            {EXPENSES.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
                {t("no_expenses")}
              </div>
            ) : (
              EXPENSES.map((cat) => {
                const catTotal = cat.items.reduce((s, i) => s + i.amount, 0);
                const Icon = cat.icon;
                return (
                  <div
                    key={cat.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden"
                  >
                    <div className="p-4 flex items-center gap-3 border-b border-border">
                      <span className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <p className="flex-1 font-bold text-foreground text-sm">{cat.category}</p>
                      <span className="font-display font-extrabold text-foreground">
                        {fmt(catTotal)}
                      </span>
                    </div>
                    <div className="divide-y divide-border/50">
                      {cat.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                          <span className="text-sm text-muted-foreground">{item.label}</span>
                          <span className="text-sm font-semibold text-foreground">
                            {fmt(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}
