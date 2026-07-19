import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Phone,
  Stethoscope,
  Activity,
  Clock,
  ThumbsUp,
  DollarSign,
  X,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Star,
  Award,
} from "lucide-react";

type Doctor = {
  id: string;
  name: { ar: string; en: string };
  clinic: { ar: string; en: string };
  specialty: { ar: string; en: string };
  activeCases: number;
  tier: "gold" | "silver" | "bronze";
  phone: string;
  metrics: {
    totalCasesThisMonth: number;
    avgTurnaroundDays: number;
    satisfactionRate: number;
    revenueGenerated: number;
  };
};

const DOCTORS: Doctor[] = [];

const tierConfig = {
  gold: {
    label: { ar: "ذهبي", en: "Gold" },
    bg: "bg-amber-50 border-amber-200 text-amber-700",
    icon: Star,
  },
  silver: {
    label: { ar: "فضي", en: "Silver" },
    bg: "bg-slate-50 border-slate-300 text-slate-600",
    icon: Award,
  },
  bronze: {
    label: { ar: "برونزي", en: "Bronze" },
    bg: "bg-orange-50 border-orange-300 text-orange-700",
    icon: BadgeCheck,
  },
} as const;

export const Route = createFileRoute("/doctors")({
  component: DoctorsPage,
});

function DoctorsPage() {
  const { t, lang, dir } = useI18n();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Doctor | null>(null);

  const filtered = useMemo(
    () =>
      DOCTORS.filter(
        (d) =>
          d.name[lang].toLowerCase().includes(search.toLowerCase()) ||
          d.specialty[lang].toLowerCase().includes(search.toLowerCase()),
      ),
    [search, lang],
  );

  if (selected) {
    const m = selected.metrics;
    return (
      <MobileShell>
        <TopBar title={selected.name[lang]} showBack />
        <div className="px-4 pt-4 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
            <p className="text-xs text-muted-foreground">{lang === "ar" ? "العيادة" : "Clinic"}</p>
            <p className="font-display font-bold text-base">{selected.clinic[lang]}</p>
            <div className="flex items-center gap-2 mt-2">
              <span
                className={cn(
                  "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                  tierConfig[selected.tier].bg,
                )}
              >
                {tierConfig[selected.tier].label[lang]}
              </span>
              <span className="text-xs text-muted-foreground">{selected.specialty[lang]}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              {
                icon: Activity,
                label: lang === "ar" ? "إجمالي الحالات هذا الشهر" : "Total cases this month",
                value: m.totalCasesThisMonth,
                color: "text-blue-600",
              },
              {
                icon: Clock,
                label: lang === "ar" ? "متوسط وقت الإنجاز" : "Avg turnaround",
                value: `${m.avgTurnaroundDays} ${lang === "ar" ? "أيام" : "days"}`,
                color: "text-emerald-600",
              },
              {
                icon: ThumbsUp,
                label: lang === "ar" ? "نسبة الرضا" : "Satisfaction rate",
                value: `${m.satisfactionRate}%`,
                color: "text-violet-600",
              },
              {
                icon: DollarSign,
                label: lang === "ar" ? "الإيرادات المحققة" : "Revenue generated",
                value: `$${m.revenueGenerated.toLocaleString()}`,
                color: "text-amber-600",
              },
            ].map(({ icon: Icon, label, value, color }) => (
              <div
                key={label}
                className="bg-card border border-border rounded-xl p-3.5 shadow-soft"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "size-8 rounded-lg flex items-center justify-center",
                      color.replace("text-", "bg-").replace("600", "100"),
                    )}
                  >
                    <Icon className={cn("size-4", color)} />
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
                </div>
                <p className={cn("font-display font-extrabold text-lg", color)}>{value}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setSelected(null)}
            className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl bg-card border border-border text-sm font-semibold text-foreground hover:bg-accent"
          >
            <ChevronUp className="size-4" />
            {lang === "ar" ? "العودة إلى القائمة" : "Back to list"}
          </button>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar
        title={lang === "ar" ? "الأطباء" : "Doctors & Clinics"}
        showSearch
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={
          lang === "ar" ? "ابحث عن طبيب أو تخصص…" : "Search by doctor or specialty…"
        }
      />
      <div className="px-4 pt-4">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center text-muted-foreground">
            <p className="text-sm">
              {lang === "ar" ? "لا يوجد أطباء مطابقون" : "No matching doctors"}
            </p>
            <p className="text-xs mt-1">
              {lang === "ar" ? "حاول تغيير كلمة البحث" : "Try a different search term"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((d) => {
              const TierIcon = tierConfig[d.tier].icon;
              return (
                <li key={d.id}>
                  <button
                    onClick={() => setSelected(d)}
                    className="w-full text-start bg-card border border-border rounded-2xl p-3.5 shadow-soft hover:shadow-card transition flex items-start gap-3"
                  >
                    <span className="size-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 font-display font-extrabold text-lg">
                      {d.name[lang].charAt(0)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-bold truncate">{d.name[lang]}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {d.clinic[lang]}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {d.specialty[lang]}
                        </span>
                        <span
                          className={cn(
                            "text-[11px] font-bold px-2 py-0.5 rounded-full border",
                            tierConfig[d.tier].bg,
                          )}
                        >
                          {tierConfig[d.tier].label[lang]}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {d.activeCases} {lang === "ar" ? "حالة نشطة" : "active cases"}
                        </span>
                      </div>
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground shrink-0 mt-1" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
