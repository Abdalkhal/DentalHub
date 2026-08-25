import { createFileRoute } from "@tanstack/react-router";
import { DesignerCaseDetail } from "@/components/designer/DesignerCaseDetail";

export const Route = createFileRoute("/designer/$caseId")({
  component: DesignerCaseDetailRoute,
});

function DesignerCaseDetailRoute() {
  const { caseId } = Route.useParams();
  return <DesignerCaseDetail caseId={caseId} />;
}
