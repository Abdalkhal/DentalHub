import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { Shield, FileText, Star, Share2 } from "lucide-react";

export const Route = createFileRoute("/account/about")({
  component: AboutPage,
});

function AboutPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";

  const links = [
    { icon: FileText, label: ar ? "شروط الاستخدام" : "Terms of use" },
    { icon: Shield, label: ar ? "سياسة الخصوصية" : "Privacy policy" },
    { icon: Star, label: ar ? "قيّم التطبيق" : "Rate the app" },
    { icon: Share2, label: ar ? "شارك التطبيق" : "Share app" },
  ];

  return (
    <MobileShell>
      <TopBar title={ar ? "عن التطبيق" : "About"} showBack />
      <div className="px-4 pt-4 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-5 shadow-soft text-center">
          <div className="mx-auto size-16 rounded-2xl bg-primary text-primary-foreground font-display font-extrabold text-2xl flex items-center justify-center">
            DH
          </div>
          <p className="mt-3 font-display font-extrabold text-lg">
            <span className="text-foreground">Dental</span>
            <span className="text-primary">Hub</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {ar ? "الإصدار 1.0.0" : "Version 1.0.0"}
          </p>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            {ar
              ? "منصة تربط أطباء الأسنان بمكاتب المستلزمات والمختبرات ووكلاء الزراعة في العراق."
              : "A platform connecting dentists with supply offices, labs, and implant dealers in Iraq."}
          </p>
        </div>

        <ul className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden shadow-soft">
          {links.map((l, i) => (
            <li key={i}>
              <button className="w-full flex items-center gap-3 px-4 py-3.5 text-start hover:bg-accent transition">
                <span className="size-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center">
                  <l.icon className="size-[18px]" />
                </span>
                <span className="flex-1 text-sm font-semibold">{l.label}</span>
                <span className="text-muted-foreground">›</span>
              </button>
            </li>
          ))}
        </ul>

        <p className="text-center text-[11px] text-muted-foreground pt-2">
          © 2026 DentalHub · {ar ? "صُنع في الموصل" : "Made in Mosul"}
        </p>
      </div>
    </MobileShell>
  );
}
