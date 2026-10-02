import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { LabOrdersGroupList } from "@/components/LabOrdersGroupList";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/lab-patients")({
  component: LabPatientsPage,
});

function LabPatientsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  return (
    <MobileShell wide>
      <TopBar title={ar ? "المرضى" : "Patients"} showBack wide maxW="6xl" />
      <div className="px-4 pt-4 pb-8 md:px-6 md:pt-6 lg:px-8 lg:max-w-6xl lg:mx-auto">
        <LabOrdersGroupList groupBy="patient" ar={ar} />
      </div>
    </MobileShell>
  );
}
