/* Shared with src/lib/clinicDedupe.ts — keep the two identical. */
/**
 * Two clinics with the same name (usually two "العيادة الرئيسية") could be
 * left in a dentist's list: each device used to create its own first clinic,
 * and the merge by name only ran on a device's first sync. This drops such a
 * duplicate — but only one that is completely empty: no patients,
 * appointments or materials in the cloud, and no local data on this device.
 * The active clinic is never dropped, and nothing is deleted: the clinic just
 * leaves the list.
 */
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { RECORDS } from "./dentistRecords";

type ClinicLite = { id: string; name: string };

/** Local data kept per clinic on this device (finance, patients, appointments, materials). */
const LOCAL_PREFIXES = ["dh_clinic_v3:", "dh:patients:v1:", "dh_appointments_v1:", "dh_materials_v1:"];

function hasLocalData(uid: string, clinicId: string): boolean {
  for (const p of LOCAL_PREFIXES) {
    try {
      const raw = localStorage.getItem(`${p}${uid}:${clinicId}`);
      if (!raw) continue;
      const v = JSON.parse(raw) as unknown;
      if (Array.isArray(v) ? v.length > 0 : v && typeof v === "object" && Object.values(v as object).some((x) => (Array.isArray(x) ? x.length > 0 : !!x))) {
        return true;
      }
    } catch {
      return true; // unreadable: treat as data, never drop
    }
  }
  return false;
}

/** Clinic ids that have anything in the cloud. */
async function clinicsWithCloudData(uid: string): Promise<Set<string>> {
  const used = new Set<string>();
  for (const name of ["patients", "appointments", "materials"]) {
    const snap = await getDocs(query(collection(db, RECORDS, uid, name), where("deleted", "==", false)));
    for (const d of snap.docs) {
      const c = (d.data() as { clinicId?: string }).clinicId;
      if (c) used.add(c);
    }
  }
  return used;
}

/**
 * The clinic ids to drop from the list: empty duplicates of another clinic
 * with the same name. Returns [] when there are none (or on any error).
 */
export async function emptyDuplicateClinics(uid: string, clinics: ClinicLite[], activeId: string): Promise<string[]> {
  const byName = new Map<string, ClinicLite[]>();
  for (const c of clinics) {
    const k = c.name.trim();
    byName.set(k, [...(byName.get(k) ?? []), c]);
  }
  const groups = [...byName.values()].filter((g) => g.length > 1);
  if (!groups.length) return [];
  let cloud: Set<string>;
  try {
    cloud = await clinicsWithCloudData(uid);
  } catch {
    return [];
  }
  const drop: string[] = [];
  for (const g of groups) {
    const hasData = (c: ClinicLite) => c.id === activeId || cloud.has(c.id) || hasLocalData(uid, c.id);
    const keep = g.filter(hasData);
    // Keep at least one of the group: the active one, or the first.
    if (!keep.length) keep.push(g[0]);
    for (const c of g) if (!keep.includes(c)) drop.push(c.id);
  }
  return drop;
}
