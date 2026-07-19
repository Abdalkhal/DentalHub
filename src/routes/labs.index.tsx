import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useAdminStore } from "@/lib/adminStore";
import { useI18n } from "@/lib/i18n";
import { Star, Clock, ListChecks } from "lucide-react";
import dentalBridge from "@/assets/dental-bridge.png";

export const Route = createFileRoute("/labs/")({
  component: LabsIndex,
});

function LabsIndex() {
  const { t, lang } = useI18n();
  const { labs: LABS } = useAdminStore();
  return (
    <MobileShell>
      <TopBar title={t("labs")} showBack />
      <div className="px-4 pt-4">
        {/* Featured: Fixed Bridge */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[oklch(0.95_0.05_175)] to-[oklch(0.92_0.08_200)] border border-border p-4 mb-4 flex items-center gap-3 shadow-soft">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[oklch(0.45_0.15_175)] uppercase tracking-wide">
              {lang === "ar" ? "عمل المختبر" : "Lab work"}
            </p>
            <p className="font-display font-extrabold text-base leading-tight mt-0.5">
              {lang === "ar" ? "جسر ثابت (Fixed Bridge)" : "Dental Fixed Bridge"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {lang === "ar" ? "زيركون / PFM — تنفيذ دقيق" : "Zirconia / PFM — precise fit"}
            </p>
          </div>
          <img
            src={dentalBridge}
            alt="Dental fixed bridge"
            loading="lazy"
            className="size-24 object-contain shrink-0"
          />
        </div>

        <Link
          to="/labs/cases"
          className="flex items-center gap-3 bg-primary text-primary-foreground rounded-2xl p-4 shadow-card mb-4"
        >
          <span className="size-10 rounded-xl bg-white/15 flex items-center justify-center">
            <ListChecks className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-display font-bold">{t("track_cases")}</p>
            <p className="text-xs opacity-90">{t("cases")}</p>
          </div>
          <span className="font-bold">›</span>
        </Link>

        {LABS.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <p className="text-sm">
              {lang === "ar" ? "لا توجد مختبرات مسجلة بعد" : "No labs registered yet"}
            </p>
            <p className="text-xs mt-1">
              {lang === "ar"
                ? "ستظهر المختبرات هنا بعد تسجيل أصحابها"
                : "Labs appear here after their owners register"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {LABS.map((l) => (
              <li key={l.id}>
                <Link
                  to="/labs/$labId"
                  params={{ labId: l.id }}
                  className="flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 shadow-soft hover:shadow-card transition"
                >
                  <span className="size-12 rounded-2xl bg-[oklch(0.95_0.05_175)] flex items-center justify-center overflow-hidden">
                    <img
                      src={dentalBridge}
                      alt=""
                      loading="lazy"
                      className="size-10 object-contain"
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold truncate">{lang === "ar" ? l.ar : l.en}</p>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>{lang === "ar" ? l.area.ar : l.area.en}</span>
                      <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
                        <Star className="size-3 fill-current" />
                        {l.rating}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {l.deliveryDays} {t("delivery_days")}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
