import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { auth } from "@/integrations/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { fetchUserRoleDoc, getAccountDashboard, type LabStaffRole } from "@/lib/useAuth";
import { AuthPage } from "@/routes/auth";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const roleDoc = await fetchUserRoleDoc(user.uid);
        let path = roleDoc ? getAccountDashboard(roleDoc.role) : "/";
        if (!roleDoc) {
          const staffClaims = (await user.getIdTokenResult()).claims as {
            role?: LabStaffRole;
            labId?: string;
          };
          if (staffClaims.labId && ["DESIGNER", "TECHNICIAN"].includes(staffClaims.role ?? "")) {
            path = "/designer";
          }
        }
        navigate({ to: path, replace: true });
      } else {
        setChecking(false);
      }
    });
    return unsub;
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#E6F0FF]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <AuthPage />;
}
