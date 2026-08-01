import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/useAuth";
import { useOrders, type Order } from "@/lib/ordersStore";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  TrendingUp,
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
  ChevronDown,
  X,
  Plus,
  Save,
  Pencil,
} from "lucide-react";

export const Route = createFileRoute("/finance")({
  component: FinancePage,
});

/* ── Types ────────────────────────────────────────── */

type PaymentRecord = {
  id: string;
  clinic: string;
  amount: number;
  currency: "USD" | "IQD";
  date: string;
};

type ExpenseItem = {
  label: string;
  amount: number;
};

type ExpenseCategory = {
  id: string;
  category: string;
  icon: string;
  items: ExpenseItem[];
};

type LabFinanceDoc = {
  payments: PaymentRecord[];
  expenses: ExpenseCategory[];
};

type ClinicSummary = {
  name: string;
  billed: number;
  collected: number;
  remaining: number;
};

/* ── Default expense categories ──────────────────── */

const DEFAULT_EXPENSES: ExpenseCategory[] = [
  {
    id: "clinical",
    category: "المواد السريرية",
    icon: "Stethoscope",
    items: [
      { label: "حشوات تجميلية", amount: 0 },
      { label: "مواد تبييض", amount: 0 },
      { label: "أدوات تعقيم", amount: 0 },
    ],
  },
  {
    id: "cosmetic",
    category: "مواد تجميلية",
    icon: "FlaskConical",
    items: [{ label: "مواد تجميلية عامة", amount: 0 }],
  },
  {
    id: "whitening",
    category: "مواد تبيض",
    icon: "Lightbulb",
    items: [{ label: "مواد تبييض الأسنان", amount: 0 }],
  },
  {
    id: "sterilization",
    category: "أدوات تعقيم",
    icon: "Syringe",
    items: [{ label: "مستلزمات تعقيم", amount: 0 }],
  },
  {
    id: "lab",
    category: "مواد المختبر",
    icon: "Microscope",
    items: [
      { label: "انطباعات رقمية", amount: 0 },
      { label: "تيجان مؤقتة", amount: 0 },
    ],
  },
  {
    id: "utilities",
    category: "كهرباء / خدمات",
    icon: "Cog",
    items: [
      { label: "كهرباء", amount: 0 },
      { label: "ماء", amount: 0 },
      { label: "إنترنت", amount: 0 },
    ],
  },
];

const ICON_MAP: Record<string, typeof DollarSign> = {
  Stethoscope,
  FlaskConical,
  Syringe,
  Microscope,
  Cog,
  Lightbulb,
  Wifi,
  ScrollText,
  Wallet,
};

/* ── Helpers ─────────────────────────────────────── */

function fmt(n: number) {
  return n.toLocaleString() + " د.ع";
}

function fmtShort(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}

/* ── Page Component ──────────────────────────────── */

function FinancePage() {
  const { lang, t } = useI18n();
  const ar = lang === "ar";
  const queryClient = useQueryClient();
  const { user } = useSession();
  const orders = useOrders();
  const userId = user?.uid ?? "";

  const [filter, setFilter] = useState<"all" | "paid" | "pending">("all");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingExpenseCat, setEditingExpenseCat] = useState<string | null>(null);
  const [paymentClinic, setPaymentClinic] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCurrency, setPaymentCurrency] = useState<"USD" | "IQD">("IQD");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  /* ── Load lab finances from Firestore ────────────── */

  const { data: finDoc, isLoading: finLoading } = useQuery({
    queryKey: ["lab-finances", userId],
    queryFn: async (): Promise<LabFinanceDoc> => {
      if (!userId) return { payments: [], expenses: [] };
      const snap = await getDoc(doc(db, "lab_finances", userId));
      if (snap.exists()) {
        const data = snap.data() as LabFinanceDoc;
        return {
          payments: data.payments ?? [],
          expenses:
            data.expenses && data.expenses.length > 0
              ? data.expenses
              : DEFAULT_EXPENSES.map((e) => ({ ...e, items: e.items.map((i) => ({ ...i })) })),
        };
      }
      return {
        payments: [],
        expenses: DEFAULT_EXPENSES.map((e) => ({ ...e, items: e.items.map((i) => ({ ...i })) })),
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const payments: PaymentRecord[] = finDoc?.payments ?? [];
  const expenses: ExpenseCategory[] = finDoc?.expenses ?? [];

  /* ── Save mutation ──────────────────────────────── */

  const saveMutation = useMutation({
    mutationFn: async (data: LabFinanceDoc) => {
      if (!userId) return;
      await setDoc(doc(db, "lab_finances", userId), data, { merge: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab-finances", userId] });
    },
  });

  /* ── Derived clinic summaries ───────────────────── */

  const clinicSummaries: ClinicSummary[] = useMemo(() => {
    const byClinic = new Map<string, Order[]>();
    for (const o of orders) {
      const key = o.doctor.trim();
      if (!key) continue;
      const arr = byClinic.get(key);
      if (arr) arr.push(o);
      else byClinic.set(key, [o]);
    }

    const results: ClinicSummary[] = [];
    for (const [name, clinicOrders] of byClinic) {
      const billed = clinicOrders.reduce((s, o) => s + o.price, 0);
      const collected = payments.filter((p) => p.clinic === name).reduce((s, p) => s + p.amount, 0);
      results.push({ name, billed, collected, remaining: billed - collected });
    }
    return results;
  }, [orders, payments]);

  /* ── Totals ─────────────────────────────────────── */

  const totalInvoiced = useMemo(
    () => clinicSummaries.reduce((s, c) => s + c.billed, 0),
    [clinicSummaries],
  );
  const totalCollected = useMemo(
    () => payments.reduce((s, p) => s + p.amount, 0),
    [payments],
  );
  const totalRemaining = totalInvoiced - totalCollected;

  const totalExpenses = useMemo(
    () => expenses.reduce((s, cat) => s + cat.items.reduce((a, i) => a + i.amount, 0), 0),
    [expenses],
  );

  /* ── Filtered clinics ───────────────────────────── */

  const filteredClinics = useMemo(() => {
    if (filter === "paid") return clinicSummaries.filter((c) => c.remaining <= 0);
    if (filter === "pending") return clinicSummaries.filter((c) => c.remaining > 0);
    return clinicSummaries;
  }, [clinicSummaries, filter]);

  /* ── Payment modal handlers ─────────────────────── */

  const handleAddPayment = () => {
    const amt = parseFloat(paymentAmount);
    if (!paymentClinic.trim() || !amt || amt <= 0) return;
    const newPayment: PaymentRecord = {
      id: crypto.randomUUID(),
      clinic: paymentClinic.trim(),
      amount: amt,
      currency: paymentCurrency,
      date: paymentDate,
    };
    const updated: LabFinanceDoc = {
      payments: [...payments, newPayment],
      expenses,
    };
    saveMutation.mutate(updated);
    setPaymentClinic("");
    setPaymentAmount("");
    setPaymentCurrency("IQD");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setShowPaymentModal(false);
  };

  /* ── Expense editing handlers ───────────────────── */

  const handleExpenseItemChange = (catId: string, itemIdx: number, amount: number) => {
    const updatedExpenses = expenses.map((cat) => {
      if (cat.id !== catId) return cat;
      return {
        ...cat,
        items: cat.items.map((item, i) => (i === itemIdx ? { ...item, amount } : item)),
      };
    });
    const updated: LabFinanceDoc = { payments, expenses: updatedExpenses };
    saveMutation.mutate(updated);
  };

  const handleExpenseCategoryToggle = (catId: string) => {
    setEditingExpenseCat((prev) => (prev === catId ? null : catId));
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "المالية" : "Finance"} showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        {/* ── Account Summary ─────────────────────────── */}
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
            <button
              onClick={() => setShowPaymentModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:opacity-90 transition"
            >
              <Plus className="size-3.5" />
              {ar ? "تسجيل دفعة" : "Log Payment"}
            </button>
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
                {fmt(totalCollected)}
              </p>
            </div>
            <div className="bg-amber-50/80 rounded-2xl p-3 text-center">
              <p className="text-[10px] font-semibold text-amber-700 mb-1">
                {t("outstanding_balance")}
              </p>
              <p className="font-display font-extrabold text-sm text-amber-700">
                {fmt(totalRemaining)}
              </p>
            </div>
          </div>
        </div>

        {/* ── Clinic Invoices ─────────────────────────── */}
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

          {finLoading ? (
            <div className="text-center py-8">
              <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredClinics.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
              {orders.length === 0
                ? ar
                  ? "لا توجد طلبات بعد — أضف طلبات لعرض فواتير العيادات"
                  : "No orders yet — add orders to see clinic invoices"
                : t("no_invoices")}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClinics.map((clinic) => (
                <div
                  key={clinic.name}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className={cn(
                        "size-10 rounded-xl flex items-center justify-center shrink-0",
                        clinic.remaining <= 0
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600",
                      )}
                    >
                      {clinic.remaining <= 0 ? (
                        <CheckCircle2 className="size-5" />
                      ) : (
                        <Clock className="size-5" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-sm truncate">{clinic.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {ar ? "باقي" : "Remaining"}: {fmt(clinic.remaining)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setPaymentClinic(clinic.name);
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition"
                    >
                      {ar ? "تسجيل دفعة" : "Log Payment"}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="bg-slate-50 rounded-xl p-2">
                      <p className="text-muted-foreground">{t("total_invoiced")}</p>
                      <p className="font-bold text-foreground">{fmt(clinic.billed)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-2">
                      <p className="text-emerald-600">{t("collected_paid")}</p>
                      <p className="font-bold text-emerald-700">{fmt(clinic.collected)}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-2">
                      <p className="text-amber-600">{t("outstanding_balance")}</p>
                      <p className="font-bold text-amber-700">{fmt(clinic.remaining)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Operating Expenses ──────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-extrabold text-base text-foreground">
              {t("operational_expenses")}
            </h2>
            <span className="text-xs font-bold text-muted-foreground bg-slate-100 rounded-full px-2.5 py-1">
              {ar ? "الإجمالي" : "Total"}: {fmt(totalExpenses)}
            </span>
          </div>

          {finLoading ? (
            <div className="text-center py-8">
              <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground bg-card border border-dashed border-border rounded-2xl">
              {t("no_expenses")}
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map((cat) => {
                const catTotal = cat.items.reduce((s, i) => s + i.amount, 0);
                const Icon = ICON_MAP[cat.icon] ?? DollarSign;
                const isEditing = editingExpenseCat === cat.id;
                return (
                  <div
                    key={cat.id}
                    className="bg-card border border-border rounded-2xl overflow-hidden"
                  >
                    <button
                      onClick={() => handleExpenseCategoryToggle(cat.id)}
                      className="w-full p-4 flex items-center gap-3 border-b border-border hover:bg-slate-50/50 transition"
                    >
                      <span className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <p className="flex-1 font-bold text-foreground text-sm text-start">
                        {cat.category}
                      </p>
                      <span className="font-display font-extrabold text-foreground">
                        {fmt(catTotal)}
                      </span>
                      <Pencil
                        className={cn(
                          "size-3.5 text-muted-foreground transition-transform",
                          isEditing && "rotate-90 text-primary",
                        )}
                      />
                    </button>
                    {isEditing && (
                      <div className="divide-y divide-border/50">
                        {cat.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-4 py-2.5 gap-3"
                          >
                            <span className="text-sm text-muted-foreground shrink-0">
                              {item.label}
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={item.amount || ""}
                                onChange={(e) =>
                                  handleExpenseItemChange(
                                    cat.id,
                                    idx,
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                placeholder="0"
                                dir="ltr"
                                className="w-28 h-9 rounded-lg bg-slate-50 border border-border px-3 text-sm text-right font-semibold outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                              />
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                د.ع
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Payment Logging Modal ────────────────────── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPaymentModal(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-base">
                {ar ? "تسجيل دفعة جديدة" : "Log New Payment"}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="size-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                {ar ? "العيادة / الطبيب" : "Clinic / Doctor"}
              </label>
              <div className="relative">
                <select
                  value={paymentClinic}
                  onChange={(e) => setPaymentClinic(e.target.value)}
                  className="w-full h-11 rounded-xl bg-slate-50 border border-border ps-4 pe-10 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition appearance-none"
                >
                  <option value="">{ar ? "اختر العيادة" : "Select clinic"}</option>
                  {clinicSummaries.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute top-1/2 -translate-y-1/2 end-3 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                {ar ? "المبلغ" : "Amount"}
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0"
                    dir="ltr"
                    className="w-full h-11 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
                <div className="flex rounded-xl bg-slate-50 border border-border overflow-hidden shrink-0">
                  <button
                    type="button"
                    onClick={() => setPaymentCurrency("USD")}
                    className={cn(
                      "px-3.5 text-sm font-semibold transition",
                      paymentCurrency === "USD"
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    $
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentCurrency("IQD")}
                    className={cn(
                      "px-3.5 text-sm font-semibold transition",
                      paymentCurrency === "IQD"
                        ? "bg-primary text-primary-foreground"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {ar ? "د.ع" : "IQD"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">
                {ar ? "التاريخ" : "Date"}
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full h-11 rounded-xl bg-slate-50 border border-border px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
              />
            </div>

            <button
              onClick={handleAddPayment}
              disabled={saveMutation.isPending}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-display font-bold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {ar ? "حفظ الدفعة" : "Save Payment"}
            </button>
          </div>
        </div>
      )}
    </MobileShell>
  );
}
