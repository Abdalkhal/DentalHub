import { useState } from "react";
import { Plus, X } from "lucide-react";

type Props = {
  value: string[];
  onChange: (v: string[]) => void;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  className?: string;
};

/** Dynamic tag input: type a value and press Enter / "+" to append a removable badge. */
export function TagInput({ value, onChange, prefix, suffix, placeholder, className }: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setDraft("");
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div
      className={`rounded-xl bg-[#F5FAFE] border border-[#D3E8F7] px-3 py-2 focus-within:ring-2 focus-within:ring-[#2E93E0]/30 focus-within:border-[#2E93E0] transition ${className ?? ""}`}
    >
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((v, i) => (
            <span
              key={`${v}-${i}`}
              className="inline-flex items-center gap-1 bg-[#E7F4FE] text-[#1C6FB5] text-xs font-semibold rounded-full px-2.5 py-1"
            >
              {prefix ? prefix + " " : ""}{v}{suffix ? " " + suffix : ""}
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-0.5 hover:text-rose-600 transition"
                aria-label="remove"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        {prefix && <span className="text-sm font-bold text-[#7A94A8] shrink-0">{prefix}</span>}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          dir="ltr"
          inputMode="decimal"
          className="flex-1 min-w-0 bg-transparent text-sm text-[#17324A] outline-none placeholder:text-[#7A94A8]"
        />
        {suffix && <span className="text-sm font-semibold text-[#7A94A8] shrink-0">{suffix}</span>}
        <button
          type="button"
          onClick={add}
          className="size-7 rounded-lg bg-[#E7F4FE] text-[#1C6FB5] flex items-center justify-center shrink-0 hover:bg-[#DCEEFB] transition"
          aria-label="add"
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
