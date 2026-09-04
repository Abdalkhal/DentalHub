import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import type { UserRoleDoc } from "@/integrations/firebase/types";
import { useAllOffers } from "./offers";
import type { Offer } from "./offers";
import { useMemo } from "react";

export function useImplantOffers(): { offers: Offer[]; isLoading: boolean } {
  const { data: allOffers = [], isLoading: offersLoading } = useAllOffers();

  const { data: implantIds = new Set<string>(), isLoading: idsLoading } = useQuery({
    queryKey: ["implant-company-ids"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "user_roles"));
      return new Set(
        snap.docs
          .map((d) => d.data() as UserRoleDoc)
          .filter((u) => u.accountType === "implant")
          .map((u) => u.userId)
      );
    },
    staleTime: 60_000,
  });

  const offers = useMemo(
    () => allOffers.filter((o) => implantIds.has(o.supplierId)),
    [allOffers, implantIds]
  );

  return { offers, isLoading: offersLoading || idsLoading };
}

export function useImplantCompanyNames(): Record<string, string> {
  const { data = {} } = useQuery({
    queryKey: ["implant-company-names"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "user_roles"));
      const map: Record<string, string> = {};
      for (const d of snap.docs) {
        const u = d.data() as UserRoleDoc;
        if (u.accountType === "implant" && u.userId) {
          map[u.userId] = u.name || u.surname || u.title || "Implant Company";
        }
      }
      return map;
    },
    staleTime: 60_000,
  });
  return data;
}
