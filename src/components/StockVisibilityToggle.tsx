import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "إظهار المخزون / إخفاء المخزون" switch shown above a product form's stock
 * input. Some offices don't want to publish their stock count: with "hide"
 * selected the form omits the quantity input and the product is saved with
 * `stockHidden` (orderable, no number shown to buyers).
 */
export function StockVisibilityToggle({
  ar,
  hidden,
  onChange,
  className,
}: {
  ar: boolean;
  hidden: boolean;
  onChange: (hidden: boolean) => void;
  className?: string;
}) {
  const options = [
    { hide: false, label: ar ? "إظهار المخزون" : "Show stock", Icon: Eye },
    { hide: true, label: ar ? "إخفاء المخزون" : "Hide stock", Icon: EyeOff },
  ];
  return (
    <div className={cn("flex gap-1.5 rounded-xl bg-slate-100 p-1", className)}>
      {options.map(({ hide, label, Icon }) => {
        const active = hidden === hide;
        return (
          <button
            key={label}
            type="button"
            onClick={() => onChange(hide)}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition",
              active ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
