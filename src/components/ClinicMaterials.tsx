import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, BellRing, Boxes, Check, ChevronDown, ClipboardCheck, Minus, PackagePlus, Plus, Search, Settings2, ShoppingBag, Trash2, X } from "lucide-react";
import {
  addMaterial,
  adjustMaterialQty,
  attentionOf,
  confirmMaterial,
  ignoreLines,
  importMaterials,
  markMaterialsSeen,
  MATERIAL_SECTIONS,
  needsReview,
  removeMaterial,
  setMaterialMeta,
  setMaterialStatus,
  statusLine,
  updateMaterial,
  useMaterialImports,
  useMaterialMeta,
  useMaterials,
  type ImportLine,
  type Material,
  type MaterialMeta,
  type MaterialStatus,
} from "@/lib/materialsStore";
import { subcategoriesOf } from "@/data/subcategories";
import { useSignedImageUrls } from "@/lib/products";
import { useSession } from "@/lib/useAuth";
import { cn } from "@/lib/utils";

const inp = "w-full h-11 rounded-xl border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40";
const sectionName = (id: string, ar: boolean) => {
  const s = MATERIAL_SECTIONS.find((x) => x.id === id);
  return s ? (ar ? s.ar : s.en) : id;
};
const STATUSES: { id: MaterialStatus; ar: string; en: string; on: string }[] = [
  { id: "available", ar: "متوفرة", en: "In stock", on: "bg-emerald-600 text-white border-emerald-600" },
  { id: "half", ar: "نصفها", en: "About half", on: "bg-sky-600 text-white border-sky-600" },
  { id: "low", ar: "قاربت", en: "Running low", on: "bg-amber-500 text-white border-amber-500" },
  { id: "out", ar: "نفدت", en: "Out", on: "bg-rose-600 text-white border-rose-600" },
];
const TONE = { bad: "text-rose-600", warn: "text-amber-600", ok: "text-emerald-700", muted: "text-muted-foreground" };

function Sheet({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] md:items-center md:p-6" onClick={onClose} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[90vh] w-full max-w-[480px] flex-col rounded-t-3xl bg-background md:rounded-3xl md:shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-base font-extrabold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-border p-4">{footer}</div>}
      </div>
    </div>
  );
}

function Thumb({ image, urls, name, className }: { image?: string; urls: Record<string, string>; name: string; className?: string }) {
  const url = image ? urls[image] : undefined;
  return (
    <span className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 font-display font-extrabold text-slate-500", className ?? "size-11 text-sm")}>
      {url ? <img src={url} alt="" className="size-full object-cover" /> : name.trim().charAt(0) || "?"}
    </span>
  );
}

export function ClinicMaterials({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const list = useMaterials();
  const meta = useMaterialMeta();
  const { lines } = useMaterialImports(user?.uid);
  const [section, setSection] = useState("all");
  const [sub, setSub] = useState("all");
  const [q, setQ] = useState("");
  const [panel, setPanel] = useState<"import" | "add" | "settings" | "review" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const now = Date.now();

  // A visit clears the number on the icons; the rows here stay marked.
  useEffect(() => {
    markMaterialsSeen();
  }, [list]);

  const paths = useMemo(() => [...new Set([...list.map((m) => m.image), ...lines.map((l) => l.image)].filter(Boolean) as string[])], [list, lines]);
  const { data: urls = {} } = useSignedImageUrls(paths);

  const attention = list.filter((m) => attentionOf(m, meta, now));
  const review = list.filter((m) => needsReview(m, meta.reviewDays, now) && !attentionOf(m, meta, now));
  const counts = (id: string) => list.filter((m) => m.category === id).length;
  const usedSections = MATERIAL_SECTIONS.filter((s) => counts(s.id) > 0);
  const inSection = section === "all" ? list : list.filter((m) => m.category === section);
  const subs = section === "all" ? [] : [...new Set(inSection.map((m) => m.subCategory).filter(Boolean) as string[])];
  const needle = q.trim().toLowerCase();
  const shown = inSection
    .filter((m) => sub === "all" || m.subCategory === sub)
    .filter((m) => !needle || m.name.toLowerCase().includes(needle))
    .sort((a, b) => Number(!!attentionOf(b, meta, now)) - Number(!!attentionOf(a, meta, now)) || a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-3 pb-8 pt-3 md:px-6 md:pt-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-xs font-semibold text-muted-foreground">{ar ? "في المخزن" : "In stock"}</p>
          <p className="mt-1 font-display text-2xl font-extrabold">{list.length} <span className="text-sm font-bold text-muted-foreground">{ar ? "مادة" : "items"}</span></p>
        </div>
        <div className={cn("rounded-2xl border p-4 shadow-soft", attention.length ? "border-rose-200 bg-rose-50" : "border-border bg-card")}>
          <p className={cn("text-xs font-semibold", attention.length ? "text-rose-700" : "text-muted-foreground")}>{ar ? "تحتاج انتباهك" : "Need attention"}</p>
          <p className={cn("mt-1 font-display text-2xl font-extrabold", attention.length && "text-rose-700")}>{attention.length} <span className="text-sm font-bold opacity-70">{ar ? "مادة" : "items"}</span></p>
        </div>
      </div>

      {lines.length > 0 && (
        <button type="button" onClick={() => setPanel("import")} className="flex w-full items-center gap-3 rounded-2xl bg-blue-600 p-4 text-start text-white shadow-soft transition hover:bg-blue-700">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/20"><ShoppingBag className="size-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold">{ar ? (lines.length === 1 ? 'منتج واحد من مشترياتك' : `${lines.length} منتج من مشترياتك`) : `${lines.length} products you bought`}</span>
            <span className="block text-xs text-white/85">{ar ? "حدد ما تريد وأضفه إلى المخزن بضغطة" : "Choose and add them to your stock in one tap"}</span>
          </span>
          <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-extrabold text-blue-700">{ar ? "مراجعة" : "Review"}</span>
        </button>
      )}

      {review.length > 0 && (
        <button type="button" onClick={() => setPanel("review")} className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-start shadow-soft hover:bg-muted/40">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><ClipboardCheck className="size-[18px]" /></span>
          <span className="min-w-0 flex-1 text-sm font-bold">{ar ? (review.length === 1 ? 'مادة واحدة لم تُحدَّث منذ مدة' : `${review.length} مواد لم تُحدَّث منذ مدة`) : `${review.length} items not updated lately`}</span>
          <span className="text-xs font-bold text-primary">{ar ? "مراجعة سريعة" : "Quick check"}</span>
        </button>
      )}

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ar ? "ابحث عن مادة" : "Search materials"} className={cn(inp, "ps-9")} />
        </div>
        <button type="button" onClick={() => setPanel("settings")} aria-label={ar ? "إعدادات التنبيه" : "Alert settings"} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted">
          <Settings2 className="size-5" />
        </button>
        <button type="button" onClick={() => setPanel("add")} className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
          <Plus className="size-4" strokeWidth={3} />
          {ar ? "مادة" : "Item"}
        </button>
      </div>

      {usedSections.length > 0 && (
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3">
          {[{ id: "all", ar: "الكل", en: "All" }, ...usedSections].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => { setSection(s.id); setSub("all"); }}
              className={cn("h-9 shrink-0 whitespace-nowrap rounded-full border px-3.5 text-xs font-bold transition", section === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}
            >
              {ar ? s.ar : s.en}
              {s.id !== "all" && <span className="ms-1.5 opacity-70">{counts(s.id)}</span>}
            </button>
          ))}
        </div>
      )}
      {subs.length > 0 && (
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
          {["all", ...subs].map((s) => (
            <button key={s} type="button" onClick={() => setSub(s)} className={cn("h-7 shrink-0 whitespace-nowrap rounded-full px-3 text-[11px] font-bold", sub === s ? "bg-slate-800 text-white" : "bg-muted text-muted-foreground")}>
              {s === "all" ? (ar ? "الكل" : "All") : s}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Boxes className="size-7" /></span>
          <p className="mt-3 text-sm font-extrabold">{list.length === 0 ? (ar ? "مخزنك جاهز" : "Your stock is ready") : ar ? "لا توجد مواد مطابقة" : "No matching items"}</p>
          {list.length === 0 && (
            <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
              {ar ? "ما تطلبه من المستلزمات يظهر هنا لتضيفه بضغطة، أو أضف مادة بنفسك." : "What you order from supplies appears here to add in one tap, or add an item yourself."}
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {shown.map((m) => (
            <MaterialRow key={m.id} m={m} meta={meta} now={now} ar={ar} urls={urls} open={openId === m.id} onToggle={() => setOpenId(openId === m.id ? null : m.id)} />
          ))}
        </div>
      )}

      {panel === "import" && <ImportSheet ar={ar} lines={lines} urls={urls} onClose={() => setPanel(null)} />}
      {panel === "add" && <AddSheet ar={ar} onClose={() => setPanel(null)} />}
      {panel === "settings" && <SettingsSheet ar={ar} meta={meta} onClose={() => setPanel(null)} />}
      {panel === "review" && <ReviewSheet ar={ar} items={review} urls={urls} onClose={() => setPanel(null)} />}
    </div>
  );
}

function StatusPicker({ m, ar }: { m: Material; ar: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {STATUSES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => setMaterialStatus(m.id, s.id)}
          className={cn("h-9 rounded-xl border text-[11px] font-bold transition", m.status === s.id ? s.on : "border-border bg-card text-muted-foreground hover:bg-muted")}
        >
          {ar ? s.ar : s.en}
        </button>
      ))}
    </div>
  );
}

function MaterialRow({ m, meta, now, ar, urls, open, onToggle }: { m: Material; meta: MaterialMeta; now: number; ar: boolean; urls: Record<string, string>; open: boolean; onToggle: () => void }) {
  const line = statusLine(m, meta, now, ar);
  const details = [
    [ar ? "القسم" : "Section", [sectionName(m.category, ar), m.subCategory].filter(Boolean).join(" · ")],
    [ar ? "المكتب" : "Supplier", m.supplierName],
    [ar ? "مكان التخزين" : "Stored in", m.storageLocation],
    [ar ? "رقم التشغيلة" : "Batch", m.batchNumber],
  ].filter(([, v]) => v);
  return (
    <div className={cn("border-b border-border last:border-b-0", open && "bg-muted/30")}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-start">
        <Thumb image={m.image} urls={urls} name={m.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">{m.name}</span>
          <span className={cn("block truncate text-xs font-semibold", TONE[line.tone])}>{line.text}</span>
        </span>
        <span className="font-display text-lg font-extrabold tabular-nums">{m.qty}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 px-4 pb-4">
          <div>
            <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">{ar ? "كيف أصبحت؟" : "How is it now?"}</p>
            <StatusPicker m={m} ar={ar} />
          </div>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-[11px] font-bold text-muted-foreground">{ar ? "الكمية بالضبط (اختياري)" : "Exact quantity (optional)"}</span>
            <button type="button" onClick={() => adjustMaterialQty(m.id, -1)} aria-label={ar ? "إنقاص" : "Less"} className="flex size-9 items-center justify-center rounded-xl border border-border bg-card"><Minus className="size-4" /></button>
            <span className="w-8 text-center text-sm font-extrabold tabular-nums">{m.qty}</span>
            <button type="button" onClick={() => adjustMaterialQty(m.id, 1)} aria-label={ar ? "زيادة" : "More"} className="flex size-9 items-center justify-center rounded-xl border border-border bg-card"><Plus className="size-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">{ar ? "تاريخ الصلاحية" : "Expiry date"}</span>
              <input type="date" value={m.expiryDate} onChange={(e) => updateMaterial(m.id, { expiryDate: e.target.value })} dir="ltr" className={cn(inp, "mt-1 h-10 bg-card text-xs")} />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold text-muted-foreground">{ar ? "نبّهني عند كمية" : "Alert at quantity"}</span>
              <input inputMode="numeric" value={m.minQty} onChange={(e) => updateMaterial(m.id, { minQty: Number(e.target.value.replace(/\D/g, "")) || 0 })} dir="ltr" className={cn(inp, "mt-1 h-10 bg-card text-xs")} />
            </label>
          </div>
          {details.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              {details.map(([k, v]) => (
                <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold">{v}</dd></div>
              ))}
            </dl>
          )}
          <div className="flex gap-2">
            {m.productId && (
              <Link to="/products/$productId" params={{ productId: m.productId }} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-xs font-bold text-primary">
                <PackagePlus className="size-4" />
                {ar ? "إعادة الطلب" : "Reorder"}
              </Link>
            )}
            <button type="button" onClick={() => { if (window.confirm(ar ? `حذف «${m.name}» من المخزن؟` : `Remove "${m.name}"?`)) removeMaterial(m.id); }} className="flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold text-rose-600 hover:bg-rose-50">
              <Trash2 className="size-4" />
              {ar ? "حذف" : "Remove"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportSheet({ ar, lines, urls, onClose }: { ar: boolean; lines: ImportLine[]; urls: Record<string, string>; onClose: () => void }) {
  const [picked, setPicked] = useState<Set<string>>(() => new Set(lines.map((l) => l.key)));
  const [edits, setEdits] = useState<Record<string, { category?: string; qty?: number; finished?: boolean; expiryDate?: string }>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const set = (k: string, p: (typeof edits)[string]) => setEdits((e) => ({ ...e, [k]: { ...e[k], ...p } }));
  const line = (l: ImportLine) => ({ ...l, ...edits[l.key] });
  const chosen = lines.filter((l) => picked.has(l.key));
  const toggle = (k: string) => setPicked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const add = () => {
    importMaterials(chosen.map(line));
    onClose();
  };
  return (
    <Sheet
      title={ar ? "إضافة من مشترياتك" : "Add from your purchases"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button type="button" disabled={chosen.length === 0} onClick={add} className="h-12 flex-1 rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50">
            {ar ? `إضافة ${chosen.length} إلى المخزن` : `Add ${chosen.length} to stock`}
          </button>
          <button
            type="button"
            disabled={chosen.length === 0}
            onClick={() => { if (window.confirm(ar ? "إخفاء المنتجات المحددة من هذه القائمة؟" : "Hide the selected products from this list?")) { ignoreLines(chosen.map((l) => l.key)); onClose(); } }}
            className="h-12 rounded-2xl border border-border px-4 text-xs font-bold text-muted-foreground disabled:opacity-50"
          >
            {ar ? "تجاهل" : "Ignore"}
          </button>
        </div>
      }
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{ar ? "كل منتج يذهب إلى قسمه تلقائياً." : "Each product goes to its own section."}</p>
        <button type="button" onClick={() => setPicked(picked.size === lines.length ? new Set() : new Set(lines.map((l) => l.key)))} className="text-xs font-bold text-primary">
          {picked.size === lines.length ? (ar ? "إلغاء الكل" : "Clear all") : ar ? "تحديد الكل" : "Select all"}
        </button>
      </div>
      {lines.map((raw) => {
        const l = line(raw);
        const on = picked.has(l.key);
        const open = editing === l.key;
        return (
          <div key={l.key} className={cn("rounded-2xl border p-3 transition", on ? "border-primary/40 bg-primary/5" : "border-border bg-card")}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => toggle(l.key)} aria-pressed={on} aria-label={l.name} className={cn("flex size-6 shrink-0 items-center justify-center rounded-lg border-2", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                {on && <Check className="size-4" strokeWidth={3} />}
              </button>
              <Thumb image={l.image} urls={urls} name={l.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{l.name}</p>
                <p className="truncate text-xs text-muted-foreground">{[sectionName(l.category, ar), l.subCategory].filter(Boolean).join(" · ")} · {l.qty} {ar ? "قطعة" : "pcs"}</p>
              </div>
              <button type="button" onClick={() => setEditing(open ? null : l.key)} className="shrink-0 text-xs font-bold text-primary">{ar ? "تعديل" : "Edit"}</button>
            </div>
            {l.existing && l.existing.status !== "out" && (
              <label className="mt-2.5 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                <input type="checkbox" checked={!!l.finished} onChange={(e) => set(l.key, { finished: e.target.checked })} />
                {ar ? `عندك ${l.existing.qty} في المخزن. هل نفدت الكمية السابقة؟` : `You have ${l.existing.qty} in stock. Did the previous quantity run out?`}
              </label>
            )}
            {open && (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <label className="col-span-2 block">
                  <span className="text-[11px] font-bold text-muted-foreground">{ar ? "القسم" : "Section"}</span>
                  <select value={l.category} onChange={(e) => set(l.key, { category: e.target.value })} className={cn(inp, "mt-1 h-10 text-xs")}>
                    {MATERIAL_SECTIONS.map((s) => <option key={s.id} value={s.id}>{ar ? s.ar : s.en}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold text-muted-foreground">{ar ? "الكمية" : "Quantity"}</span>
                  <input inputMode="numeric" value={l.qty} onChange={(e) => set(l.key, { qty: Number(e.target.value.replace(/\D/g, "")) || 0 })} dir="ltr" className={cn(inp, "mt-1 h-10 text-xs")} />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold text-muted-foreground">{ar ? "الصلاحية (اختياري)" : "Expiry (optional)"}</span>
                  <input type="date" value={l.expiryDate ?? ""} onChange={(e) => set(l.key, { expiryDate: e.target.value })} dir="ltr" className={cn(inp, "mt-1 h-10 text-xs")} />
                </label>
              </div>
            )}
          </div>
        );
      })}
    </Sheet>
  );
}

function AddSheet({ ar, onClose }: { ar: boolean; onClose: () => void }) {
  const [f, setF] = useState({ name: "", category: "general", subCategory: "", qty: "1", minQty: "1", expiryDate: "", storageLocation: "", supplierName: "" });
  const subs = subcategoriesOf(f.category);
  const save = () => {
    if (!f.name.trim()) return;
    addMaterial({ ...f, name: f.name.trim(), subCategory: f.subCategory || undefined, qty: Number(f.qty) || 0, minQty: Number(f.minQty) || 0 });
    onClose();
  };
  const label = (t: string, c: React.ReactNode) => <label className="block"><span className="text-[11px] font-bold text-muted-foreground">{t}</span><div className="mt-1">{c}</div></label>;
  return (
    <Sheet title={ar ? "إضافة مادة" : "Add an item"} onClose={onClose} footer={<button type="button" disabled={!f.name.trim()} onClick={save} className="h-12 w-full rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground disabled:opacity-50">{ar ? "حفظ" : "Save"}</button>}>
      {label(ar ? "اسم المادة" : "Name", <input autoFocus value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} />)}
      <div className="grid grid-cols-2 gap-2.5">
        {label(ar ? "القسم" : "Section", <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value, subCategory: "" })} className={inp}>{MATERIAL_SECTIONS.map((s) => <option key={s.id} value={s.id}>{ar ? s.ar : s.en}</option>)}</select>)}
        {label(ar ? "القسم الفرعي" : "Subsection", <select value={f.subCategory} onChange={(e) => setF({ ...f, subCategory: e.target.value })} className={inp}><option value="">—</option>{subs.map((s) => <option key={s.ar} value={s.ar}>{ar ? s.ar : s.en}</option>)}</select>)}
        {label(ar ? "الكمية" : "Quantity", <input inputMode="numeric" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value.replace(/\D/g, "") })} dir="ltr" className={inp} />)}
        {label(ar ? "نبّهني عند كمية" : "Alert at quantity", <input inputMode="numeric" value={f.minQty} onChange={(e) => setF({ ...f, minQty: e.target.value.replace(/\D/g, "") })} dir="ltr" className={inp} />)}
      </div>
      {label(ar ? "تاريخ الصلاحية (اختياري)" : "Expiry date (optional)", <input type="date" value={f.expiryDate} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} dir="ltr" className={inp} />)}
      {label(ar ? "مكان التخزين (اختياري)" : "Stored in (optional)", <input value={f.storageLocation} onChange={(e) => setF({ ...f, storageLocation: e.target.value })} className={inp} />)}
    </Sheet>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: number; options: { v: number; t: string }[]; onChange: (v: number) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)} className={cn("h-9 rounded-full border px-3.5 text-xs font-bold", value === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground")}>
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsSheet({ ar, meta, onClose }: { ar: boolean; meta: MaterialMeta; onClose: () => void }) {
  return (
    <Sheet title={ar ? "إعدادات التنبيه" : "Alert settings"} onClose={onClose}>
      <p className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
        <BellRing className="mt-0.5 size-4 shrink-0" />
        {ar ? "لا تصلك إشعارات. يظهر رقم أحمر على أيقونة المواد ويختفي عند فتحها." : "No notifications. A red number appears on the materials icon and clears when you open it."}
      </p>
      <Choice label={ar ? "نبّهني قبل نفاد المادة بـ" : "Warn before it runs out"} value={meta.leadDays} onChange={(leadDays) => setMaterialMeta({ leadDays })} options={[{ v: 14, t: ar ? "أسبوعين" : "2 weeks" }, { v: 30, t: ar ? "شهر" : "1 month" }, { v: 60, t: ar ? "شهرين" : "2 months" }]} />
      <Choice label={ar ? "نبّهني قبل انتهاء الصلاحية بـ" : "Warn before expiry"} value={meta.expiryDays} onChange={(expiryDays) => setMaterialMeta({ expiryDays })} options={[{ v: 30, t: ar ? "شهر" : "1 month" }, { v: 60, t: ar ? "شهرين" : "2 months" }, { v: 90, t: ar ? "3 أشهر" : "3 months" }]} />
      <Choice label={ar ? "اسألني عن المواد غير المحدَّثة كل" : "Ask about stale items every"} value={meta.reviewDays} onChange={(reviewDays) => setMaterialMeta({ reviewDays })} options={[{ v: 14, t: ar ? "أسبوعين" : "2 weeks" }, { v: 30, t: ar ? "شهر" : "1 month" }, { v: 60, t: ar ? "شهرين" : "2 months" }, { v: 0, t: ar ? "إيقاف" : "Off" }]} />
      <p className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        {ar ? "وقت النفاد تقدير يتعلمه التطبيق كلما سجلت أن مادة نفدت. قبل ذلك يعتمد على الكمية التي تحددها لكل مادة." : "Run-out time is an estimate learned each time you mark an item out. Until then it uses the alert quantity."}
      </p>
    </Sheet>
  );
}

function ReviewSheet({ ar, items, urls, onClose }: { ar: boolean; items: Material[]; urls: Record<string, string>; onClose: () => void }) {
  const [ids] = useState(() => items.map((m) => m.id));
  const list = useMaterials().filter((m) => ids.includes(m.id));
  return (
    <Sheet title={ar ? "مراجعة سريعة" : "Quick check"} onClose={onClose} footer={<button type="button" onClick={() => { list.forEach((m) => confirmMaterial(m.id)); onClose(); }} className="h-12 w-full rounded-2xl bg-primary text-sm font-extrabold text-primary-foreground">{ar ? "تم" : "Done"}</button>}>
      <p className="text-xs text-muted-foreground">{ar ? "اضغط الحالة لكل مادة." : "Tap the status of each item."}</p>
      {list.map((m) => (
        <div key={m.id} className="rounded-2xl border border-border bg-card p-3">
          <div className="mb-2.5 flex items-center gap-3">
            <Thumb image={m.image} urls={urls} name={m.name} className="size-9 text-xs" />
            <p className="min-w-0 flex-1 truncate text-sm font-bold">{m.name}</p>
          </div>
          <StatusPicker m={m} ar={ar} />
        </div>
      ))}
    </Sheet>
  );
}

/** The quiet red number: no notification, gone once the page is opened. */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn("absolute z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-extrabold leading-none text-white ring-2 ring-white", className ?? "-end-1 -top-1")}>
      {count > 99 ? "99+" : count}
    </span>
  );
}
