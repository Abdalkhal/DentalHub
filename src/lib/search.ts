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

// Full, uncapped fetch of vendor accounts (supply offices, implant companies,
// labs) for the home search — a `limit(30)` query silently misses any account
// that isn't among the first 30 docs returned. Same as the native app.
export function useVendorAccounts() {
  return useQuery({
    queryKey: ["vendor-accounts"],
    queryFn: async (): Promise<VendorAccount[]> => {
      const snap = await getDocs(collection(db, "public_profiles"));
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
