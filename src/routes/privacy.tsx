import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { PRIVACY_SECTIONS } from "./account.about";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "سياسة الخصوصية — DentalHub" },
      {
        name: "description",
        content:
          "سياسة الخصوصية لتطبيق DentalHub: البيانات التي نجمعها، كيفية استخدامها، ومشاركتها، وحقوق المستخدم.",
      },
    ],
  }),
});

function PrivacyPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";

  return (
    <MobileShell wide>
      <TopBar title={ar ? "سياسة الخصوصية" : "Privacy Policy"} showBack wide maxW="3xl" />
      <div className="px-4 pt-4 pb-8 space-y-4 md:px-6 md:pt-8 lg:px-8 lg:max-w-3xl lg:mx-auto">
        <p className="text-xs text-muted-foreground">
          {ar ? "آخر تحديث: سبتمبر 2026" : "Last updated: September 2026"}
        </p>
        {PRIVACY_SECTIONS.map((s, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 shadow-soft">
            <p className="font-display font-bold text-sm mb-1">{ar ? s.title.ar : s.title.en}</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              {ar ? s.body.ar : s.body.en}
            </p>
          </div>
        ))}
      </div>
    </MobileShell>
  );
}
