import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { AccountType } from "@/integrations/firebase/types";
import { ToothIcon, SupplyIcon, LabIcon, ImplantIcon } from "./AuthIcons";

type AccountTypeSelectorProps = {
  accountType: AccountType;
  onSelect: (type: AccountType) => void;
};

const options: {
  id: AccountType;
  arLabel: string;
  enLabel: string;
  arDesc: string;
  enDesc: string;
  icon: (p: { className?: string }) => ReactNode;
  color: string;
}[] = [
  {
    id: "dentist",
    arLabel: "طبيب أسنان",
    enLabel: "Dentist",
    arDesc: "تصفح المواد واطلب من المكاتب",
    enDesc: "Browse supplies & order from offices",
    icon: ToothIcon,
    color: "sky",
  },
  {
    id: "supply",
    arLabel: "مكتب مستلزمات",
    enLabel: "Supplies Office",
    arDesc: "أدر منتجاتك وعروضك وطلباتك",
    enDesc: "Manage your products, offers & orders",
    icon: SupplyIcon,
    color: "emerald",
  },
  {
    id: "lab",
    arLabel: "مختبر",
    enLabel: "Laboratory",
    arDesc: "استلم وتابع حالات الأطباء",
    enDesc: "Receive & track dentist cases",
    icon: LabIcon,
    color: "violet",
  },
  {
    id: "implant",
    arLabel: "شركة زرعات",
    enLabel: "Implant Company",
    arDesc: "أدر علاماتك التجارية ومنتجاتك",
    enDesc: "Manage your brands & products",
    icon: ImplantIcon,
    color: "amber",
  },
];

const colorMap: Record<
  string,
  { bg: string; ring: string; text: string; border: string; icon: string; glow: string }
> = {
  sky: {
    bg: "bg-sky-50",
    ring: "ring-sky-500",
    text: "text-sky-700",
    border: "border-sky-500",
    icon: "text-sky-500",
    glow: "shadow-sky-500/25",
  },
  emerald: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-500",
    text: "text-emerald-700",
    border: "border-emerald-500",
    icon: "text-emerald-500",
    glow: "shadow-emerald-500/25",
  },
  violet: {
    bg: "bg-violet-50",
    ring: "ring-violet-500",
    text: "text-violet-700",
    border: "border-violet-500",
    icon: "text-violet-500",
    glow: "shadow-violet-500/25",
  },
  amber: {
    bg: "bg-amber-50",
    ring: "ring-amber-500",
    text: "text-amber-700",
    border: "border-amber-500",
    icon: "text-amber-500",
    glow: "shadow-amber-500/25",
  },
};

export function AccountTypeSelector({ accountType, onSelect }: AccountTypeSelectorProps) {
  const { lang } = useI18n();
  const ar = lang === "ar";

  return (
    <div className="mb-6">
      <p className="text-xs font-bold text-muted-foreground mb-3 px-1 flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-sky-400" />
        {ar ? "نوع الحساب" : "Account type"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const active = accountType === opt.id;
          const c = colorMap[opt.color];
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className={cn(
                "group flex flex-col items-center gap-2.5 rounded-2xl px-3 py-5 border-2 transition-all duration-300 ease-out",
                active
                  ? `${c.bg} ${c.border} shadow-md scale-[1.03]`
                  : "border-transparent bg-slate-50 hover:bg-slate-100 hover:border-slate-200 hover:scale-[1.02]",
              )}
            >
              <div
                className={cn(
                  "size-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                  active
                    ? `${c.bg} ring-2 ${c.ring} ${c.glow} shadow-lg`
                    : "bg-white ring-1 ring-slate-200 group-hover:ring-slate-300",
                )}
              >
                <Icon
                  className={cn(
                    "size-8 transition-all duration-300",
                    active ? `${c.icon}` : "text-slate-400 group-hover:text-slate-600",
                  )}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-bold leading-tight text-center transition-colors duration-300",
                  active ? `${c.text}` : "text-slate-600",
                )}
              >
                {ar ? opt.arLabel : opt.enLabel}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight text-center px-0.5 opacity-70">
                {ar ? opt.arDesc : opt.enDesc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
