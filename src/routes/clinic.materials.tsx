import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { addMaterial, addOrder, removeMaterial, updateMaterialQty, useClinic, type Material } from "@/lib/clinicStore";
import { Boxes, Minus, Plus, Trash2, AlertTriangle, Truck } from "lucide-react";


export const Route = createFileRoute("/clinic/materials")({
  head: () => ({
    meta: [
      { title: "مواد العيادة | DentalHub" },
      { name: "description", content: "تتبع مخزون مواد العيادة: الكمبوزيت، المخدر الموضعي، مواد الطبعة والمستهلكات." },
      { property: "og:title", content: "مواد العيادة | DentalHub" },
      { property: "og:description", content: "تتبع مخزون مواد ومستهلكات العيادة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MaterialsPage,
});

const CATS = [
  { id: "consumables", ar: "مستهلكات", en: "Consumables" },
  { id: "composite", ar: "كمبوزيت", en: "Composite" },
  { id: "anesthesia", ar: "مخدر موضعي", en: "Anesthesia" },
  { id: "impression", ar: "مواد طبعة", en: "Impression" },
  { id: "other", ar: "أخرى", en: "Other" },
];

function MaterialsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { materials } = useClinic();
  const navigate = useNavigate();
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);

  const list = materials.filter((m) => cat === "all" || m.category === cat);
  const lowItems = materials.filter((m) => m.qty <= m.minQty);
  const low = lowItems.length;

  const reorderQty = (m: Material) => Math.max(1, m.minQty * 2 - m.qty);

  const reorder = (m: Material) => {
    const q = reorderQty(m);
    addOrder({
      kind: "supply",
      vendor: ar ? "مكتب مستلزمات" : "Supply office",
      title: ar ? `إعادة تزويد: ${m.name} (${q} ${m.unit})` : `Restock: ${m.name} (${q} ${m.unit})`,
      amount: Math.round(q * m.price),
      status: "pending",
    });
    navigate({ to: "/clinic/orders" });
  };

  const reorderAll = () => {
    lowItems.forEach((m) => {
      const q = reorderQty(m);
      addOrder({
        kind: "supply",
        vendor: ar ? "مكتب مستلزمات" : "Supply office",
        title: ar ? `إعادة تزويد: ${m.name} (${q} ${m.unit})` : `Restock: ${m.name} (${q} ${m.unit})`,
        amount: Math.round(q * m.price),
        status: "pending",
      });
    });
    navigate({ to: "/clinic/orders" });
  };

  return (
    <MobileShell>
      <TopBar title={ar ? "مواد العيادة" : "Clinic Materials"} showBack />
      <div className="px-3 pt-3 pb-6">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label={ar ? "أصناف المخزون" : "Items"} value={String(materials.length)} />
          <Stat label={ar ? "قاربت على النفاد" : "Low stock"} value={String(low)} tone="warn" />
        </div>

        {low > 0 && (
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="size-9 shrink-0 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="size-4" strokeWidth={2.4} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-display font-extrabold text-sm text-amber-800">
                  {ar ? `تنبيه نقص مخزون (${low})` : `Low stock alert (${low})`}
                </p>
                <p className="text-[11px] text-amber-700/80 mt-0.5">
                  {ar ? "هذه المواد وصلت للحد الأدنى — اطلب إعادة التزويد الآن" : "These items hit their minimum — request a restock now"}
                </p>
              </div>
            </div>

            <ul className="mt-2.5 space-y-1.5">
              {lowItems.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded-xl bg-card border border-amber-200/70 px-2.5 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold truncate">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {m.qty}/{m.minQty} {m.unit} · {ar ? "المقترح" : "Suggested"}: {reorderQty(m)} {m.unit}
                    </p>
                  </div>
                  <button
                    onClick={() => reorder(m)}
                    className="shrink-0 h-8 px-3 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-1"
                  >
                    <Truck className="size-3" strokeWidth={2.6} />
                    {ar ? "طلب تزويد" : "Reorder"}
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={reorderAll}
              className="mt-2.5 w-full h-10 rounded-xl border border-amber-300 bg-card text-amber-800 text-[11px] font-extrabold"
            >
              {ar ? "طلب إعادة تزويد للكل → طلبيات العيادة" : "Reorder all → Clinic orders"}
            </button>
          </div>
        )}


        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[{ id: "all", ar: "الكل", en: "All" }, ...CATS].map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "h-8 px-3 rounded-full text-[11px] font-bold border whitespace-nowrap transition",
                cat === c.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"
              )}
            >
              {ar ? c.ar : c.en}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card flex items-center justify-center gap-2"
        >
          <Plus className="size-4" strokeWidth={3} />
          {ar ? "إضافة مادة" : "Add material"}
        </button>

        <ul className="mt-3 space-y-2.5">
          {list.length === 0 ? (
            <EmptyState icon={Boxes} title={ar ? "لا توجد مواد بعد" : "No materials yet"} sub={ar ? "أضف أول مادة لبدء تتبع المخزون" : "Add your first material"} />
          ) : (
            list.map((m) => {
              const isLow = m.qty <= m.minQty;
              return (
                <li key={m.id} className="rounded-2xl bg-card border border-border p-3.5 shadow-soft">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-display font-extrabold text-sm truncate">{m.name}</p>
                        {isLow && (
                          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            <AlertTriangle className="size-3" />
                            {ar ? "منخفض" : "Low"}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {ar ? CATS.find((c) => c.id === m.category)?.ar : CATS.find((c) => c.id === m.category)?.en} · {m.price} $
                      </p>
                    </div>
                    <button onClick={() => removeMaterial(m.id)} className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {ar ? "الحد الأدنى" : "Min"}: {m.minQty} {m.unit}
                    </span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateMaterialQty(m.id, m.qty - 1)} className="size-8 rounded-xl border border-border bg-card flex items-center justify-center">
                        <Minus className="size-3.5" />
                      </button>
                      <span className="min-w-14 text-center font-display font-extrabold text-sm">
                        {m.qty} <span className="text-[10px] font-semibold text-muted-foreground">{m.unit}</span>
                      </span>
                      <button onClick={() => updateMaterialQty(m.id, m.qty + 1)} className="size-8 rounded-xl border border-border bg-card flex items-center justify-center">
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>

      {open && <MaterialModal ar={ar} onClose={() => setOpen(false)} />}
    </MobileShell>
  );
}

function MaterialModal({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [f, setF] = useState({ name: "", category: "consumables", qty: 0, minQty: 5, unit: ar ? "قطعة" : "pcs", price: 0 });
  return (
    <Sheet onClose={onClose} title={ar ? "إضافة مادة" : "Add material"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!f.name.trim()) return;
          addMaterial(f);
          onClose();
        }}
        className="space-y-3"
      >
        <Field label={ar ? "اسم المادة" : "Material name"}>
          <input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
        </Field>
        <Field label={ar ? "التصنيف" : "Category"}>
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className={inputCls}>
            {CATS.map((c) => (
              <option key={c.id} value={c.id}>{ar ? c.ar : c.en}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label={ar ? "الكمية" : "Quantity"}>
            <input type="number" min={0} value={f.qty} onChange={(e) => setF({ ...f, qty: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label={ar ? "الحد الأدنى" : "Min qty"}>
            <input type="number" min={0} value={f.minQty} onChange={(e) => setF({ ...f, minQty: Number(e.target.value) })} className={inputCls} />
          </Field>
          <Field label={ar ? "الوحدة" : "Unit"}>
            <input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} className={inputCls} />
          </Field>
          <Field label={ar ? "السعر ($)" : "Price ($)"}>
            <input type="number" min={0} value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
        <button type="submit" className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-sm shadow-card">
          {ar ? "حفظ" : "Save"}
        </button>
      </form>
    </Sheet>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" | "good" | "bad" }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 shadow-soft">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-display font-extrabold text-lg mt-0.5",
          tone === "warn" && "text-amber-600",
          tone === "good" && "text-emerald-600",
          tone === "bad" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
      <Icon className="size-8 mx-auto text-muted-foreground/50" />
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-background p-4 pb-24">
        <h2 className="font-display font-extrabold text-base mb-3">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export const inputCls =
  "w-full h-11 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
