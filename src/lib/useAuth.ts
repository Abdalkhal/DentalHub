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

export function useIsAdmin() {
  const { user, loading } = useSession();
  const userId = user?.uid;
  const q = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<boolean> => {
      const q = query(
        collection(db, "user_roles"),
        where("userId", "==", userId!),
        where("role", "==", "admin"),
      );
      const snap = await getDocs(q);
      return !snap.empty;
    },
  });
  return { user, loading: loading || q.isLoading, isAdmin: q.data === true };
}
