import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { setClinicsStoreUser } from "@/lib/clinicsStore";
import { useSession } from "@/lib/useAuth";
import { ClinicMaterials } from "@/components/ClinicMaterials";


export const Route = createFileRoute("/clinic/materials")({
  head: () => ({
    meta: [
      { title: "مواد العيادة | DentalHub" },
      { name: "description", content: "تتبع مخزون مواد العيادة: الكمبوزيت، المخدر الموضعي، مواد الطبعة والمستهلكات." },
      { property: "og:title", content: "مواد العيادة | DentalHub" },
      { property: "og:description", content: "تتبع مخزون مواد ومستهلكات العيادة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MaterialsPage,
});

function MaterialsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();

  useEffect(() => {
    // Defensive re-init for landing directly on this route (e.g. a reload)
    // without passing through the home route's effect first — must resolve
    // the full clinic context (list + active clinic), not just re-key this
    // one store, or it could point at the wrong clinic's data.
    setClinicsStoreUser(user?.uid || "");
  }, [user?.uid]);

  return (
    <MobileShell wide>
      <TopBar title={ar ? "مواد العيادة" : "Clinic Materials"} showBack wide />
      <ClinicMaterials ar={ar} />
    </MobileShell>
  );
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" | "good" | "bad" }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 shadow-soft md:p-5 md:shadow-none">
      <p className="text-[11px] text-muted-foreground md:text-sm">{label}</p>
      <p
        className={cn(
          "font-display font-extrabold text-lg mt-0.5 md:text-3xl md:mt-1.5",
          tone === "warn" && "text-amber-600",
          tone === "good" && "text-emerald-600",
          tone === "bad" && "text-destructive"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, sub }: { icon: React.ElementType; title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center md:col-span-full md:py-20">
      <Icon className="size-8 mx-auto text-muted-foreground/50 md:size-14" />
      <p className="mt-2 text-sm font-semibold md:mt-5 md:text-lg">{title}</p>
      <p className="text-[11px] text-muted-foreground mt-1 md:text-sm md:mt-2">{sub}</p>
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[440px] max-h-[88vh] overflow-y-auto rounded-t-3xl bg-background p-4 pb-24">
        <h2 className="font-display font-extrabold text-base mb-3">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export const inputCls =
  "w-full h-11 rounded-xl bg-card border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
