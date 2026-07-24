import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { CASES } from "@/data/labs";
import { useAdminStore } from "@/lib/adminStore";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CaseTimeline } from "@/components/CaseTimeline";
import { Send, Star, Clock, FileText } from "lucide-react";

export const Route = createFileRoute("/labs/$labId")({
  component: LabPage,
});

function LabPage() {
  const { labId } = Route.useParams();
  const { labs: LABS } = useAdminStore();
  const lab = LABS.find((l) => l.id === labId);
  const { t, lang } = useI18n();
  const isVisitor = useRouterState({
    select: (s) =>
      s.location.state != null &&
      (s.location.state as unknown as Record<string, unknown>)?.isVisitor === true,
  });
  const labCases = lab ? CASES.filter((c) => c.labId === lab.id).slice(0, 2) : [];

  if (!lab) {
    return (
      <MobileShell>
        <TopBar title={lang === "ar" ? "غير موجود" : "Not found"} showBack />
        <div className="p-6 text-center text-sm text-muted-foreground">
          {lang === "ar" ? "المختبر غير موجود" : "Lab not found"}
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <TopBar title={lang === "ar" ? lab.ar : lab.en} showBack />
      <div className="px-4 pt-4 space-y-5">
        {/* Header card */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-soft">
          <p className="text-xs text-muted-foreground">
            {lang === "ar" ? lab.area.ar : lab.area.en}
          </p>
          <h2 className="font-display font-bold text-lg mt-0.5">
            {lang === "ar" ? lab.ar : lab.en}
          </h2>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="inline-flex items-center gap-1 text-amber-500 font-semibold">
              <Star className="size-4 fill-current" />
              {lab.rating}
            </span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Clock className="size-4" />
              {lab.deliveryDays} {t("delivery_days")}
            </span>
          </div>
          <div className={cn("grid gap-2", isVisitor ? "grid-cols-1" : "grid-cols-2")}>
            {!isVisitor && (
              <button className="h-11 rounded-xl bg-primary text-primary-foreground font-display font-bold inline-flex items-center justify-center gap-2">
                <Send className="size-4" />
                {t("send_case")}
              </button>
            )}
            <Link
              to="/labs/$labId/statement"
              params={{ labId: lab.id }}
              className="h-11 rounded-xl bg-card border border-border text-foreground font-display font-bold inline-flex items-center justify-center gap-2 hover:bg-accent"
            >
              <FileText className="size-4" />
              {lang === "ar" ? "كشف الحساب" : "Statement"}
            </Link>
          </div>
        </div>

        {/* Work types */}
        <section>
          <h3 className="font-display font-bold text-base mb-2">{t("work_types")}</h3>
          <ul className="flex flex-wrap gap-2">
            {lab.workTypes.map((w: { ar: string; en: string }, i: number) => (
              <li
                key={i}
                className="px-3 py-1.5 rounded-full bg-primary-soft text-primary text-xs font-semibold"
              >
                {lang === "ar" ? w.ar : w.en}
              </li>
            ))}
          </ul>
        </section>

        {/* Prices */}
        <section>
          <h3 className="font-display font-bold text-base mb-2">{t("price_list")}</h3>
          <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
            {lab.priceList.map((item: { ar: string; en: string; price: number }, i: number) => (
              <li key={i} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm">{lang === "ar" ? item.ar : item.en}</span>
                <span className="font-display font-extrabold text-primary">${item.price}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent cases at this lab */}
        {labCases.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-base">{t("cases")}</h3>
              <Link to="/labs/cases" className="text-xs font-semibold text-primary">
                {t("view_all")}
              </Link>
            </div>
            <ul className="space-y-3">
              {labCases.map((c) => (
                <li key={c.id} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-display font-bold text-sm">
                      {lang === "ar" ? c.work.ar : c.work.en}
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground">{c.id}</span>
                  </div>
                  <CaseTimeline status={c.status} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </MobileShell>
  );
}
