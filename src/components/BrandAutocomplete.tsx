import { useState, useMemo, useRef, useEffect } from "react";
import { Check } from "lucide-react";
import { BRANDS } from "@/data/brands";
import { cn } from "@/lib/utils";

const BRAND_SUGGESTIONS = [
  ...new Set(BRANDS.flatMap((b) => [b.name, b.ar].filter((x) => x && x.trim()))),
].sort((a, b) => a.localeCompare(b));

type Props = {
  value: string;
  onChange: (brand: string) => void;
  placeholder?: string;
  className?: string;
};

export function BrandAutocomplete({ value, onChange, placeholder, className }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const query = value.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return BRAND_SUGGESTIONS.slice(0, 20);
    return BRAND_SUGGESTIONS.filter((s) => s.toLowerCase().includes(query))
      .sort((a, b) => {
        const aStart = a.toLowerCase().startsWith(query) ? 0 : 1;
        const bStart = b.toLowerCase().startsWith(query) ? 0 : 1;
        return aStart - bStart || a.localeCompare(b);
      })
      .slice(0, 30);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? "e.g. 3M"}
        autoComplete="off"
        className={cn(
          "w-full h-12 rounded-xl bg-[#F5FAFE] border-[#D3E8F7] px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E93E0]/30 focus:border-[#2E93E0] transition",
          className,
        )}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 top-full start-0 end-0 mt-1 max-h-60 overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl py-1">
          {filtered.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-[#2E93E0]/5 transition text-start"
              >
                <span className="truncate">{s}</span>
                {s === value && <Check className="size-4 text-[#2E93E0] shrink-0" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
