import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";
import type { UserRoleDoc, AppRole } from "@/integrations/firebase/types";

export function getAccountDashboard(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "supply":
      return "/supplies-office";
    case "dentist":
      return "/";
    case "implant":
      return "/implants-office";
    case "lab":
      return "/labs-office";
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
  const [role, setRole] = useState<UserRoleDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const q = query(collection(db, "user_roles"), where("userId", "==", user.uid));
        const snap = await getDocs(q);
        if (!cancelled) setRole(snap.empty ? null : (snap.docs[0].data() as UserRoleDoc));
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { user, role, loading: authLoading || loading };
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
