import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { RoleGuard } from "@/components/RoleGuard";
import { AdsDashboard } from "@/components/AdsDashboard";

export const Route = createFileRoute("/my-ads")({
  component: MyAdsPage,
});

function MyAdsPage() {
  return (
    <RoleGuard allowedRoles={["dentist", "supply", "implant", "lab"]}>
      <MobileShell>
        <AdsDashboard />
      </MobileShell>
    </RoleGuard>
  );
}
