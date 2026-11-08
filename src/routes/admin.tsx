import { createFileRoute, redirect } from "@tanstack/react-router";

// The admin pages are one console now (/admin-standalone).
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/admin-standalone" });
  },
});
