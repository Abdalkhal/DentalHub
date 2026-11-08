import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, Pencil, Plus, RefreshCw, Search, TicketPercent, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { RoleGuard } from "@/components/RoleGuard";
import { useI18n } from "@/lib/i18n";
import { useSession, useUserRole } from "@/lib/useAuth";
import { useProductsByCompany } from "@/lib/products";
import { useOrders } from "@/lib/orders";
import {
  deletePromoCode,
  discountErrorMessage,
  doctorDiscountsKey,
  emptyPromoForm,
  generatePromoCode,
  officeDoctors,
  promoCodesKey,
  promoFormError,
  promoReport,
  promoShareText,
  promoState,
  promoSummary,
  promoToForm,
  savePromoCode,
  setDoctorDiscount,
  useOfficeDoctorDiscounts,
  useOfficePromoCodes,
  type PromoCode,
  type PromoForm,
} from "@/lib/promo";

export const Route = createFileRoute("/office-discounts")({
  component: () => (
    <RoleGuard allowedRoles={["supply", "implant"]}>
      <OfficeDiscounts />
    </RoleGuard>
  ),
});

const TEAL = "#0E6E66";
const fieldClass =
  "w-full h-11 rounded-xl bg-slate-50 border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-[#0E6E66]/20 focus:border-[#0E6E66]";

function warnBelowCost(names: string[], ar: boolean) {
  if (names.length === 0) return;
  toast.warning(
    ar
      ? `تنبيه: هذا الخصم يجعل البيع أقل من سعر الشراء في: ${names.join("، ")}`
      : `Heads up: this sells below cost on: ${names.join(", ")}`,
    { duration: 8000 },
  );
}

function OfficeDiscounts() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const [tab, setTab] = useState<"codes" | "doctors">("codes");

  return (
    <MobileShell wide>
      <TopBar title={ar ? "الخصومات" : "Discounts"} showBack wide maxW="3xl" />
      <div className="px-4 py-4 space-y-4 pb-24 md:px-6 md:py-8 lg:max-w-3xl lg:mx-auto">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
          {(
            [
              { key: "codes", label: ar ? "أكواد الخصم" : "Codes", icon: TicketPercent },
              { key: "doctors", label: ar ? "خصم الأطباء" : "Doctors", icon: Users },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`h-10 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition ${
                tab === t.key ? "bg-white shadow-sm text-[#0E6E66]" : "text-slate-500"
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {ar
            ? "خصم الكمية يُضبط من صفحة كل منتج ويُطبق تلقائياً. بعده يطبَّق الأكبر من خصم الطبيب أو الكود، ولا يجتمعان."
            : "Quantity discounts are set on each product and apply by themselves. After that the larger of the doctor's discount or the code applies, never both."}
        </p>
        {tab === "codes" ? <CodesTab /> : <DoctorsTab />}
      </div>
    </MobileShell>
  );
}

function CodesTab() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { role } = useUserRole();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const { data: codes = [], isLoading } = useOfficePromoCodes(uid);
  const [editing, setEditing] = useState<{ form: PromoForm; isNew: boolean } | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: promoCodesKey(uid) });

  const toggle = async (p: PromoCode) => {
    try {
      await savePromoCode({ ...promoToForm(p), active: !p.active }, true);
      refresh();
    } catch (e) {
      toast.error(discountErrorMessage(e, ar));
    }
  };
  const remove = async (p: PromoCode) => {
    if (!window.confirm(ar ? `حذف الكود ${p.code}؟ الطلبات السابقة تبقى كما هي.` : `Delete ${p.code}? Past orders stay as they are.`)) return;
    try {
      await deletePromoCode(p.id);
      refresh();
    } catch (e) {
      toast.error(discountErrorMessage(e, ar));
    }
  };
  const copy = async (p: PromoCode) => {
    try {
      await navigator.clipboard?.writeText(promoShareText(p, role?.name || "", ar));
      toast.success(ar ? "تم نسخ الكود" : "Copied");
    } catch {
      toast.error(ar ? "تعذر النسخ" : "Couldn't copy");
    }
  };

  if (editing) {
    return (
      <PromoFormView
        initial={editing.form}
        isNew={editing.isNew}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setEditing({ form: { ...emptyPromoForm(), code: generatePromoCode() }, isNew: true })}
        className="w-full h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition"
        style={{ backgroundColor: TEAL }}
      >
        <Plus className="size-4" />
        {ar ? "كود خصم جديد" : "New code"}
      </button>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
      ) : codes.length === 0 ? (
        <div className="py-12 text-center">
          <TicketPercent className="size-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-500">{ar ? "لا توجد أكواد بعد" : "No codes yet"}</p>
        </div>
      ) : (
        codes.map((p) => {
          const state = promoState(p, ar);
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono font-extrabold text-base text-slate-800" dir="ltr">{p.code}</p>
                  <p className="text-xs text-slate-500 mt-1">{promoSummary(p, ar)}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{promoReport(p, ar)}</p>
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    state.live ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {state.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-50">
                <SmallButton icon={Copy} label={ar ? "نسخ" : "Copy"} onClick={() => copy(p)} />
                <SmallButton icon={Pencil} label={ar ? "تعديل" : "Edit"} onClick={() => setEditing({ form: promoToForm(p), isNew: false })} />
                <SmallButton icon={p.active ? X : Check} label={p.active ? (ar ? "تعطيل" : "Turn off") : ar ? "تفعيل" : "Turn on"} onClick={() => toggle(p)} />
                <SmallButton icon={Trash2} label={ar ? "حذف" : "Delete"} danger onClick={() => remove(p)} />
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function SmallButton({ icon: Icon, label, onClick, danger }: { icon: typeof Copy; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition ${
        danger ? "border-rose-100 text-rose-600 hover:bg-rose-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3 rounded-xl border text-xs font-bold transition ${
        active ? "bg-[#0E6E66] border-[#0E6E66] text-white" : "bg-white border-slate-200 text-slate-600"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-600">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

const toggled = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function PromoFormView({
  initial,
  isNew,
  onClose,
  onSaved,
}: {
  initial: PromoForm;
  isNew: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const uid = user?.uid;
  const [f, setF] = useState<PromoForm>(initial);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const set = (patch: Partial<PromoForm>) => setF((x) => ({ ...x, ...patch }));

  const { data: mine = [] } = useProductsByCompany(uid);
  const branches = useMemo(() => [...new Set(mine.map((p) => p.branch).filter(Boolean))], [mine]);
  const shownProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return mine.filter((p) => !q || `${p.ar} ${p.en}`.toLowerCase().includes(q)).slice(0, 50);
  }, [mine, search]);
  const { data: orders = [] } = useOrders(uid);
  const { data: discounts = [] } = useOfficeDoctorDiscounts(uid);
  const doctors = useMemo(() => officeDoctors(orders, discounts), [orders, discounts]);
  const [forSome, setForSome] = useState(initial.doctorIds.length > 0);

  const submit = async () => {
    const payload = { ...f, doctorIds: forSome ? f.doctorIds : [] };
    const problem = promoFormError(payload, ar);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      const res = await savePromoCode(payload, !isNew);
      toast.success(ar ? "تم حفظ الكود" : "Code saved");
      warnBelowCost(res.belowCost, ar);
      onSaved();
    } catch (e) {
      toast.error(discountErrorMessage(e, ar));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-slate-800">{isNew ? (ar ? "كود خصم جديد" : "New code") : ar ? "تعديل الكود" : "Edit code"}</p>
        <button type="button" onClick={onClose} className="size-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
          <X className="size-4" />
        </button>
      </div>

      <Field label={ar ? "الكود" : "Code"}>
        <div className="flex gap-2">
          <input
            dir="ltr"
            value={f.code}
            disabled={!isNew}
            onChange={(e) => set({ code: e.target.value.toUpperCase() })}
            className={`${fieldClass} font-mono uppercase disabled:opacity-60`}
          />
          {isNew && (
            <button
              type="button"
              aria-label={ar ? "توليد كود" : "Generate"}
              onClick={() => set({ code: generatePromoCode() })}
              className="size-11 shrink-0 rounded-xl border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50"
            >
              <RefreshCw className="size-4" />
            </button>
          )}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={ar ? "نوع الخصم" : "Type"}>
          <select value={f.type} onChange={(e) => set({ type: e.target.value as PromoForm["type"] })} className={fieldClass}>
            <option value="percent">{ar ? "نسبة مئوية" : "Percentage"}</option>
            <option value="fixed">{ar ? "مبلغ ثابت" : "Fixed amount"}</option>
          </select>
        </Field>
        <Field label={f.type === "percent" ? (ar ? "النسبة %" : "Percent") : ar ? "المبلغ" : "Amount"}>
          <input type="number" min="0" dir="ltr" value={f.value} onChange={(e) => set({ value: e.target.value })} className={fieldClass} />
        </Field>
      </div>

      <Field
        label={ar ? "العملة" : "Currency"}
        hint={
          f.type === "percent"
            ? ar
              ? "النسبة تُطبق على الدولار والدينار. العملة هنا للحد الأدنى للشراء فقط."
              : "A percentage applies to both currencies; this is only for the minimum purchase."
            : undefined
        }
      >
        <select value={f.currency} onChange={(e) => set({ currency: e.target.value as PromoForm["currency"] })} className={fieldClass}>
          <option value="USD">{ar ? "دولار" : "USD"}</option>
          <option value="IQD">{ar ? "دينار" : "IQD"}</option>
        </select>
      </Field>

      <div>
        <p className="text-xs font-bold text-slate-600 mb-1.5">{ar ? "يشمل" : "Covers"}</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={f.scope === "office"} label={ar ? "كل منتجاتي" : "All my products"} onClick={() => set({ scope: "office" })} />
          <Chip active={f.scope === "products"} label={ar ? "منتجات محددة" : "Some products"} onClick={() => set({ scope: "products" })} />
          <Chip active={f.scope === "branch"} label={ar ? "قسم معين" : "A section"} onClick={() => set({ scope: "branch" })} />
        </div>
        {f.scope === "products" && (
          <div className="mt-3 space-y-2">
            <div className="relative">
              <Search className="size-4 absolute start-3 top-3.5 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "ابحث عن منتج" : "Search products"} className={`${fieldClass} ps-9`} />
            </div>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
              {shownProducts.map((p) => (
                <label key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={f.productIds.includes(p.id)} onChange={() => set({ productIds: toggled(f.productIds, p.id) })} className="size-4 accent-[#0E6E66]" />
                  <span className="truncate">{ar ? p.ar || p.en : p.en || p.ar}</span>
                </label>
              ))}
              {shownProducts.length === 0 && <p className="px-3 py-4 text-xs text-slate-400 text-center">{ar ? "لا توجد منتجات" : "No products"}</p>}
            </div>
          </div>
        )}
        {f.scope === "branch" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {branches.map((b) => (
              <Chip key={b} active={f.branches.includes(b)} label={b} onClick={() => set({ branches: toggled(f.branches, b) })} />
            ))}
            {branches.length === 0 && <p className="text-xs text-slate-400">{ar ? "لا توجد أقسام" : "No sections"}</p>}
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-bold text-slate-600 mb-1.5">{ar ? "لمن" : "For"}</p>
        <div className="flex flex-wrap gap-2">
          <Chip active={!forSome} label={ar ? "كل الأطباء" : "All doctors"} onClick={() => setForSome(false)} />
          <Chip active={forSome} label={ar ? "أطباء محددون" : "Some doctors"} onClick={() => setForSome(true)} />
        </div>
        {forSome && (
          <div className="mt-3">
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
              {doctors.map((d) => (
                <label key={d.id} className="flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={f.doctorIds.includes(d.id)} onChange={() => set({ doctorIds: toggled(f.doctorIds, d.id) })} className="size-4 accent-[#0E6E66]" />
                  <span className="truncate">{d.name || (ar ? "طبيب" : "Doctor")}</span>
                </label>
              ))}
              {doctors.length === 0 && (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">
                  {ar ? "يظهر هنا الأطباء الذين طلبوا من مكتبك" : "Doctors who have ordered from you appear here"}
                </p>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{ar ? "يصلهم إشعار بالكود عند الحفظ." : "They get a notification when you save."}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label={ar ? "من تاريخ (اختياري)" : "From (optional)"}>
          <input type="date" dir="ltr" value={f.startDate} onChange={(e) => set({ startDate: e.target.value })} className={fieldClass} />
        </Field>
        <Field label={ar ? "إلى تاريخ (اختياري)" : "Until (optional)"}>
          <input type="date" dir="ltr" value={f.endDate} onChange={(e) => set({ endDate: e.target.value })} className={fieldClass} />
        </Field>
        <Field label={ar ? "حد أدنى للشراء" : "Min. purchase"}>
          <input type="number" min="0" dir="ltr" value={f.minSubtotal} onChange={(e) => set({ minSubtotal: e.target.value })} className={fieldClass} />
        </Field>
        <Field label={ar ? "حد أدنى للكمية" : "Min. quantity"}>
          <input type="number" min="0" dir="ltr" value={f.minQuantity} onChange={(e) => set({ minQuantity: e.target.value })} className={fieldClass} />
        </Field>
        <Field label={ar ? "عدد الاستخدامات الكلي" : "Total uses"} hint={ar ? "فارغ يعني بلا حد" : "Empty means no limit"}>
          <input type="number" min="0" dir="ltr" value={f.maxUses} onChange={(e) => set({ maxUses: e.target.value })} className={fieldClass} />
        </Field>
        <Field label={ar ? "استخدامات لكل طبيب" : "Uses per doctor"} hint={ar ? "فارغ يعني بلا حد" : "Empty means no limit"}>
          <input type="number" min="0" dir="ltr" value={f.maxUsesPerDoctor} onChange={(e) => set({ maxUsesPerDoctor: e.target.value })} className={fieldClass} />
        </Field>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="w-full h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        style={{ backgroundColor: TEAL }}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        {ar ? "حفظ الكود" : "Save code"}
      </button>
    </div>
  );
}

function DoctorsTab() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const { data: discounts = [], isLoading } = useOfficeDoctorDiscounts(uid);
  const { data: orders = [] } = useOrders(uid);
  const doctors = useMemo(() => officeDoctors(orders, discounts), [orders, discounts]);
  const pctOf = useMemo(() => new Map(discounts.map((d) => [d.doctorId, d.pct])), [discounts]);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const save = async (doctorId: string, pct: number) => {
    if (!(pct >= 0 && pct <= 100)) {
      toast.error(ar ? "النسبة بين 0 و100" : "Between 0 and 100");
      return;
    }
    setBusy(doctorId);
    try {
      const res = await setDoctorDiscount(doctorId, pct);
      toast.success(pct === 0 ? (ar ? "أُزيل الخصم" : "Removed") : ar ? "تم حفظ الخصم" : "Saved");
      warnBelowCost(res.belowCost, ar);
      setDrafts((d) => {
        const next = { ...d };
        delete next[doctorId];
        return next;
      });
      await queryClient.invalidateQueries({ queryKey: doctorDiscountsKey(uid) });
    } catch (e) {
      toast.error(discountErrorMessage(e, ar));
    } finally {
      setBusy(null);
    }
  };

  const q = search.trim().toLowerCase();
  const shown = doctors.filter((d) => !q || d.name.toLowerCase().includes(q));

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (doctors.length === 0) {
    return (
      <div className="py-12 text-center px-6">
        <Users className="size-10 mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-bold text-slate-500">{ar ? "لا يوجد أطباء بعد" : "No doctors yet"}</p>
        <p className="text-xs text-slate-400 mt-1">
          {ar ? "يظهر هنا الأطباء الذين طلبوا من مكتبك." : "Doctors who have ordered from you appear here."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="size-4 absolute start-3 top-3.5 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={ar ? "ابحث عن طبيب" : "Search doctors"} className={`${fieldClass} ps-9 bg-white`} />
      </div>
      {shown.map((d) => {
        const current = pctOf.get(d.id) ?? 0;
        const draft = drafts[d.id];
        const value = draft ?? (current ? String(current) : "");
        const dirty = draft !== undefined && Number(draft || 0) !== current;
        return (
          <div key={d.id} className="bg-white rounded-2xl border border-slate-100 shadow-soft p-3.5 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800 truncate">{d.name || (ar ? "طبيب" : "Doctor")}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {current ? (ar ? `خصم خاص ${current}%` : `Own discount ${current}%`) : ar ? "بلا خصم خاص" : "No own discount"}
              </p>
            </div>
            <div className="relative w-20 shrink-0">
              <input
                type="number"
                min="0"
                max="100"
                dir="ltr"
                aria-label={ar ? "نسبة الخصم" : "Discount percent"}
                value={value}
                onChange={(e) => setDrafts((x) => ({ ...x, [d.id]: e.target.value }))}
                className={`${fieldClass} h-10 pe-6`}
              />
              <span className="absolute end-2.5 top-2.5 text-xs text-slate-400">%</span>
            </div>
            <button
              type="button"
              disabled={!dirty || busy === d.id}
              aria-label={ar ? "حفظ" : "Save"}
              onClick={() => save(d.id, Number(draft || 0))}
              className="size-10 shrink-0 rounded-xl text-white flex items-center justify-center disabled:opacity-30"
              style={{ backgroundColor: TEAL }}
            >
              {busy === d.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
