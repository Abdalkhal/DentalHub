// How many patients each of the dentist's clinics holds in the cloud. The
// patients screens use it to say "your patients are in another clinic" —
// patients belong to one clinic, and adding a clinic switches to it, so an
// empty list used to look like the patients had been deleted. Identical in
// the web app and the native app (src/lib/patientClinicCounts.ts).
import { useQuery } from "@tanstack/react-query";
import { getDocs, query, where } from "firebase/firestore";
import { patientsCol } from "./dentistRecords";

export function usePatientCountsByClinic(uid: string | undefined) {
  return (
    useQuery({
      queryKey: ["patient-counts-by-clinic", uid],
      enabled: !!uid,
      staleTime: 60_000,
      queryFn: async () => {
        const snap = await getDocs(query(patientsCol(uid!), where("deleted", "==", false)));
        const counts: Record<string, number> = {};
        for (const d of snap.docs) {
          const c = (d.data() as { clinicId?: string }).clinicId;
          if (c) counts[c] = (counts[c] ?? 0) + 1;
        }
        return counts;
      },
    }).data ?? {}
  );
}
