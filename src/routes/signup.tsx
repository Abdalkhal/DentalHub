import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { auth } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { fetchUserRoleDoc, getAccountDashboard } from "@/lib/useAuth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const roleDoc = await fetchUserRoleDoc(user.uid);
        const path = roleDoc ? getAccountDashboard(roleDoc.role) : "/";
        navigate({ to: path, replace: true });
      } else {
        setChecking(false);
      }
    });
    return unsub;
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[oklch(0.98_0.01_250)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AuthCard defaultMode="register" />;
}
