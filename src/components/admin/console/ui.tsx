// The admin console's small design system: one place for its look.
import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Loader2, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "blue" | "green" | "amber" | "rose" | "violet" | "slate";

const TONES: Record<Tone, { soft: string; text: string }> = {
  blue: { soft: "bg-blue-50", text: "text-blue-700" },
  green: { soft: "bg-emerald-50", text: "text-emerald-700" },
  amber: { soft: "bg-amber-50", text: "text-amber-700" },
  rose: { soft: "bg-rose-50", text: "text-rose-700" },
  violet: { soft: "bg-violet-50", text: "text-violet-700" },
  slate: { soft: "bg-slate-100", text: "text-slate-600" },
};

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Panel({ title, hint, action, children, flush }: { title?: string; hint?: string; action?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {(title || action) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-extrabold text-slate-900">{title}</h2>}
            {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = "blue" }: { label: string; value: ReactNode; sub?: ReactNode; icon: LucideIcon; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", t.soft, t.text)}>
          <Icon className="size-[18px]" />
        </span>
      </div>
      <div className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-tight text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function Badge({ tone = "slate", children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold", t.soft, t.text)}>{children}</span>;
}

export function Button({
  children, onClick, variant = "primary", size = "md", disabled, icon: Icon, busy, type = "button",
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  icon?: LucideIcon;
  busy?: boolean;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "text-slate-600 hover:bg-slate-100",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
        styles,
      )}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
    </button>
  );
}

export function SegmentedTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-bold transition",
            value === o.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-[10px]", value === o.value ? "bg-blue-50 text-blue-700" : "bg-slate-200 text-slate-600")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-xl border border-slate-200 bg-white pe-3 ps-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
    </div>
  );
}

export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Empty({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="size-6" />
      </span>
      <p className="mt-3 text-sm font-bold text-slate-700">{title}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="size-6 animate-spin text-slate-400" />
    </div>
  );
}

/** A row that opens to show its details, so long lists stay calm. */
export function ExpandRow({ header, children, defaultOpen }: { header: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className={cn("border-b border-slate-100 last:border-b-0", open && "bg-slate-50/60")}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-3.5 text-start transition hover:bg-slate-50">
        <div className="min-w-0 flex-1">{header}</div>
        <ChevronDown className={cn("size-4 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  );
}

export function Dialog({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]" onClick={onClose} role="dialog" aria-modal="true">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function SlideOver({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose} role="dialog" aria-modal="true">
      <aside className="h-full w-full max-w-lg overflow-y-auto bg-slate-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h3 className="truncate text-sm font-extrabold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">{children}</div>
      </aside>
    </div>
  );
}

export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";
