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
    <MobileShell wide>
      <TopBar title={ar ? "حالات العمل" : "Production Status"} showBack wide maxW="6xl" />
      <div className="px-4 pt-4 pb-6 space-y-4 md:px-6 md:pt-6 md:pb-12 md:space-y-6 lg:px-8 lg:max-w-6xl lg:mx-auto">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-muted-foreground font-medium">{t("live_updating")}</span>
        </div>
        <ProductionTracker />
      </div>
    </MobileShell>
  );
}
