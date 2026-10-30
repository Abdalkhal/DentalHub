import { cn } from "@/lib/utils";
import type { Currency } from "@/lib/clinicStore";

const OPTIONS: { id: Currency; symbol: string; ar: string; en: string }[] = [
  { id: "IQD", symbol: "د.ع", ar: "دينار عراقي", en: "Iraqi dinar" },
  { id: "USD", symbol: "$", ar: "دولار أمريكي", en: "US dollar" },
];

/** Dinar / dollar segmented control for the finance and reports screens —
 *  the two currencies are always shown separately, never summed. */
export function CurrencySwitch({
  value,
  onChange,
  ar,
  className,
}: {
  value: Currency;
  onChange: (c: Currency) => void;
  ar: boolean;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex gap-1 rounded-2xl border border-border bg-card p-1 shadow-soft",
        className,
      )}
    >
      {OPTIONS.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition",
              active
                ? "bg-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            <span
              className={cn(
                "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold",
                active ? "bg-white/20" : "bg-muted",
              )}
            >
              {o.symbol}
            </span>
            {ar ? o.ar : o.en}
          </button>
        );
      })}
    </div>
  );
}
