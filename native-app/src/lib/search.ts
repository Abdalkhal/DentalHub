import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

export type VendorCategory = "supplies" | "implants" | "labs";

export type VendorAccount = {
  id: string;
  name: string;
  category: VendorCategory;
  location: string;
  photoURL: string;
};

// Same query already used by the Explore tab (a full, uncapped fetch of
// `user_roles` — not `limit(30)`, which would silently miss an existing
// account whenever it isn't among the first 30 docs Firestore happens to
// return) — pulled out here so the home search bar can search accounts
// too, not just products.
export function useVendorAccounts() {
  return useQuery({
    queryKey: ["vendor-accounts"],
    queryFn: async (): Promise<VendorAccount[]> => {
      const snap = await getDocs(collection(db, "user_roles"));
      const results: VendorAccount[] = [];
      for (const d of snap.docs) {
        const u = d.data() as Record<string, unknown>;
        const name = String(u.name || u.surname || "").trim();
        if (!name) continue;
        let category: VendorCategory | null = null;
        if (u.accountType === "supply" || u.accountType === "medical_supplies") category = "supplies";
        else if (u.accountType === "implant" || u.accountType === "dental_implants") category = "implants";
        else if (u.accountType === "lab") category = "labs";
        if (!category) continue;
        const id = String(u.userId ?? "");
        if (!id) continue;
        results.push({
          id,
          name,
          category,
          location: String(u.city || u.address || ""),
          photoURL: typeof u.photoURL === "string" ? u.photoURL : "",
        });
      }
      return results;
    },
    staleTime: 30_000,
  });
}
