import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { ProductionTracker } from "@/components/ProductionTracker";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/production")({
  component: ProductionPage,
});

function ProductionPage() {
  const { t, lang } = useI18n();
  const ar = lang === "ar";

  return (
    <MobileShell>
      <TopBar title={ar ? "حالات العمل" : "Production Status"} showBack />
      <div className="px-4 pt-4 pb-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">{t("live_updating")}</span>
        </div>
        <ProductionTracker />
      </div>
    </MobileShell>
  );
}
