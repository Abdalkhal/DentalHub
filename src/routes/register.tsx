import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/register")({
  component: () => <AuthCard defaultMode="register" />,
});
