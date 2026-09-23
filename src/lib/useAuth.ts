import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { useQuery } from "@tanstack/react-query";
import { auth, db } from "@/integrations/firebase/client";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import type { UserRoleDoc, AppRole } from "@/integrations/firebase/types";

export function getAccountDashboard(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "supply":
      return "/supplies";
    case "dentist":
      return "/";
    case "implant":
      return "/implants";
    case "lab":
      return "/labs/dashboard";
    default:
      return "/";
  }
}

export async function fetchUserRoleDoc(userId: string): Promise<UserRoleDoc | null> {
  const d = await getDoc(doc(db, "user_roles", userId));
  if (!d.exists()) return null;
  return d.data() as UserRoleDoc;
}

export function useSession() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setLoading(false);
    });
    return unsub;
  }, []);
  return { user, loading };
}

export function useUserRole() {
  const { user, loading: authLoading } = useSession();
  const userId = user?.uid;
  const q = useQuery({
    queryKey: ["user-role", userId],
    enabled: !!userId,
    staleTime: 0,
    queryFn: async (): Promise<UserRoleDoc | null> => {
      const q = query(collection(db, "user_roles"), where("userId", "==", userId!));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      return snap.docs[0].data() as UserRoleDoc;
    },
  });
  return { user, role: q.data ?? null, loading: authLoading || q.isLoading };
}

/** Lab staff roles issued as custom claims by the `inviteLabMember` function. */
export type LabStaffRole = "ADMIN" | "DESIGNER" | "TECHNICIAN";

export type LabStaffClaim = { labId: string; role: LabStaffRole } | null;

/**
 * Reads the lab-staff custom claims off the ID token.
 *
 * Invited staff get an Auth user plus a `lab_members` document, but no
 * `user_roles` document — so `useUserRole` returns null for them. The claim
 * is the only signal that a signed-in user is a lab designer/ceramist.
 */
export function useLabStaffClaim() {
  const { user, loading: authLoading } = useSession();
  const [claim, setClaim] = useState<LabStaffClaim>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setClaim(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const token = await user.getIdTokenResult();
        const role = token.claims.role as LabStaffRole | undefined;
        const labId = token.claims.labId as string | undefined;
        if (!cancelled) {
          setClaim(
            role && labId && ["ADMIN", "DESIGNER", "TECHNICIAN"].includes(role)
              ? { labId, role }
              : null,
          );
        }
      } catch {
        if (!cancelled) setClaim(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { claim, loading: authLoading || loading };
}

export function useIsAdmin() {
  const { user, loading } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      setClaimsLoading(false);
      return;
    }
    setClaimsLoading(true);
    user
      .getIdTokenResult()
      .then((res) => {
        if (!cancelled) setIsAdmin(res.claims.role === "admin");
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      })
      .finally(() => {
        if (!cancelled) setClaimsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { user, loading: loading || claimsLoading, isAdmin };
}
