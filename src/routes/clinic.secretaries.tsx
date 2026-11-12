import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { KeyRound, Link2, ShieldCheck, UserPlus } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { ClinicStaffCard } from "@/components/ClinicStaff";
import { useI18n } from "@/lib/i18n";
import { setClinicsStoreUser } from "@/lib/clinicsStore";
import { useSession } from "@/lib/useAuth";

export const Route = createFileRoute("/clinic/secretaries")({
  head: () => ({
    meta: [
      { title: "السكرتارية | DentalHub" },
      { name: "description", content: "دعوة السكرتارية إلى العيادة وتحديد ما يراه كل سكرتير." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecretariesPage,
});

function SecretariesPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();

  useEffect(() => {
    // Landing here directly (a reload, a link) must still resolve which clinic
    // is active, or the list would belong to the wrong clinic.
    setClinicsStoreUser(user?.uid || "");
  }, [user?.uid]);

  const steps = [
    { icon: UserPlus, title: ar ? "ادعُ السكرتير" : "Invite", text: ar ? "اختر قالب الصلاحيات وأنشئ رابط الدعوة" : "Pick a permission set and create a link" },
    { icon: Link2, title: ar ? "يفتح الرابط" : "They open it", text: ar ? "ينشئ حسابه الخاص وينضم تلقائياً" : "They make their own account and join" },
    { icon: KeyRound, title: ar ? "تتحكم أنت" : "You decide", text: ar ? "عدّل الصلاحيات أو أوقف الوصول متى شئت" : "Change access or stop it any time" },
  ];

  return (
    <MobileShell wide>
      <TopBar title={ar ? "السكرتارية" : "Secretaries"} showBack wide />
      <div className="px-3 pt-3 pb-6 space-y-4 md:px-6 md:pt-6 md:pb-12 lg:px-8 lg:max-w-5xl lg:mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 p-5 text-white shadow-card md:p-7">
          <div className="absolute -top-10 -end-10 size-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start gap-3">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 md:size-14">
              <ShieldCheck className="size-6 md:size-7" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-extrabold md:text-xl">{ar ? "سكرتارية العيادة" : "Clinic secretaries"}</h2>
              <p className="mt-1 text-xs leading-relaxed text-white/85 md:text-sm">
                {ar
                  ? "لكل سكرتير حسابه الخاص، ويرى فقط ما تسمح به: المواعيد، الحجوزات، الدفعات، المواد. لا يحذف مريضاً ولا دفعة، ولا يرى مستحقات الأطباء."
                  : "Each secretary has their own account and sees only what you allow. They can't delete a patient or a payment, or see doctors' dues."}
              </p>
            </div>
          </div>
        </div>

        <ol className="grid grid-cols-3 gap-2 md:gap-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-border bg-card p-3 text-center shadow-soft md:p-4">
              <span className="mx-auto flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600 md:size-11">
                <s.icon className="size-4 md:size-5" />
              </span>
              <p className="mt-2 font-display text-[12px] font-extrabold md:text-sm">
                {i + 1}. {s.title}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground md:text-xs">{s.text}</p>
            </li>
          ))}
        </ol>

        <ClinicStaffCard ar={ar} />
      </div>
    </MobileShell>
  );
}
