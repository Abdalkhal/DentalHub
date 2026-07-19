import { createFileRoute } from "@tanstack/react-router";
import { DashboardHome } from "@/components/DashboardHome";

export const Route = createFileRoute("/dashboard")({
  component: DashboardHome,
});
