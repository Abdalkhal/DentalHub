import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { CASES, LABS } from "@/data/labs";
import { useI18n } from "@/lib/i18n";
import { CaseTimeline } from "@/components/CaseTimeline";

export const Route = createFileRoute("/labs/cases")({
  component: CasesPage,
});

function CasesPage() {
  const { t, lang } = useI18n();
  return (
    <MobileShell>
      <TopBar title={t("track_cases")} showBack />
      <div className="px-4 pt-4">
        {CASES.length === 0 ? (
          <div className="py-12 flex flex-col items-center text-center text-muted-foreground">
            <p className="text-sm">{lang === "ar" ? "لا توجد حالات بعد" : "No cases yet"}</p>
            <p className="text-xs mt-1">
              {lang === "ar"
                ? "ستظهر الحالات هنا بعد إرسالها إلى المختبر"
                : "Cases will appear here once sent to a lab"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {CASES.map((c) => {
              const lab = LABS.find((l) => l.id === c.labId);
              return (
                <li key={c.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm">
                        {lang === "ar" ? c.work.ar : c.work.en}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.patient} · {lab ? (lang === "ar" ? lab.ar : lab.en) : ""}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                      {c.id}
                    </span>
                  </div>
                  <CaseTimeline status={c.status} />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
