// Two-device simulation of the dentist records sync (patientsStore +
// clinicsStore) against an in-memory fake of the Firestore API they use.
import { afterEach, expect, it, vi } from "vitest";

type Listener = { path: string; clinicId?: string; next: (snap: unknown) => void };

const backend = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  listeners: [] as Listener[],
}));

function snapshotFor(l: Listener) {
  if (l.clinicId === undefined) {
    const data = backend.docs.get(l.path);
    return { exists: () => !!data, data: () => data, metadata: { fromCache: false } };
  }
  const docs = [...backend.docs.entries()]
    .filter(([p, d]) => p.startsWith(l.path + "/") && d.clinicId === l.clinicId)
    .map(([p, d]) => ({ id: p.split("/").pop()!, data: () => structuredClone(d) }));
  return { docs, metadata: { fromCache: false } };
}

vi.mock("@/integrations/firebase/client", () => ({ db: {}, storage: {} }));
vi.mock("firebase/storage", () => ({
  ref: (_s: unknown, path: string) => ({ path }),
  uploadBytes: async () => {},
  uploadString: async () => {},
  getBlob: async () => new Blob(),
  deleteObject: async () => {},
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  collection: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  where: (_f: string, _op: string, value: string) => ({ value }),
  query: (col: { path: string }, w: { value: string }) => ({ path: col.path, clinicId: w.value }),
  setDoc: async (ref: { path: string }, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
    const prev = backend.docs.get(ref.path) ?? {};
    backend.docs.set(ref.path, structuredClone(opts?.merge ? { ...prev, ...data } : data));
    for (const l of backend.listeners) if (ref.path === l.path || ref.path.startsWith(l.path + "/")) setTimeout(() => l.next(snapshotFor(l)));
  },
  onSnapshot: (ref: { path: string; clinicId?: string }, next: (s: unknown) => void) => {
    const l: Listener = { path: ref.path, clinicId: ref.clinicId, next };
    backend.listeners.push(l);
    setTimeout(() => next(snapshotFor(l)));
    return () => {
      backend.listeners = backend.listeners.filter((x) => x !== l);
    };
  },
}));

const settle = (ms = 1200) => new Promise((r) => setTimeout(r, ms));
const UID = "u1";

/** Boots a fresh copy of the stores as one device with the given local storage. */
async function device(storage: Record<string, string>) {
  backend.listeners = []; // the previous "device" is closed
  localStorage.clear();
  for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, v);
  vi.resetModules();
  const clinics = await import("./clinicsStore");
  const patients = await import("./patientsStore");
  clinics.setClinicsStoreUser(UID);
  await settle();
  const dump = () => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)!]));
  return { clinics, patients, dump };
}

const pat = (id: string, name: string, extra = {}) => ({
  id, name, fileNo: "PAT-1", age: "", gender: "male", phone: "", history: {}, complaint: "", status: "new",
  lastVisit: "", createdAt: `2026-10-0${id.slice(-1)}`, teeth: {}, visits: [], files: [], totalFees: 0, payments: [],
  updatedAt: 1000, ...extra,
});

afterEach(() => {
  backend.docs.clear();
  backend.listeners = [];
});

it("merges two devices' clinics and patients without losing anything, and syncs deletes", async () => {
  // Web: its own default clinic "W" with patient p1 (pre-sync data).
  const web = await device({
    [`dh_clinics_v1:${UID}`]: JSON.stringify({ clinics: [{ id: "W", name: "العيادة الرئيسية", address: "", workDays: "" }], activeClinicId: "W" }),
    [`dh:patients:v1:${UID}:W`]: JSON.stringify([pat("p1", "From web")]),
  });
  expect(backend.docs.get(`dentist_records/${UID}`)?.clinics).toEqual([expect.objectContaining({ id: "W" })]);
  expect(backend.docs.get(`dentist_records/${UID}/patients/p1`)).toMatchObject({ name: "From web", clinicId: "W", deleted: false });
  const webStorage = web.dump();

  // Phone: a different random id "A" for the same-named default clinic, patient p2.
  const phone = await device({
    [`dh_clinics_v1:${UID}`]: JSON.stringify({ clinics: [{ id: "A", name: "العيادة الرئيسية", address: "", workDays: "" }], activeClinicId: "A" }),
    [`dh:patients:v1:${UID}:A`]: JSON.stringify([pat("p2", "From phone")]),
  });
  // Merged into the web's clinic, not a duplicate.
  expect(phone.clinics.useClinics).toBeDefined();
  expect((backend.docs.get(`dentist_records/${UID}`)?.clinics as { id: string }[]).map((c) => c.id)).toEqual(["W"]);
  expect(phone.patients.getPatients().map((p) => p.id).sort()).toEqual(["p1", "p2"]);
  expect(backend.docs.get(`dentist_records/${UID}/patients/p2`)).toMatchObject({ name: "From phone", clinicId: "W" });
  // The phone's original local data is still there (never deleted).
  expect(localStorage.getItem(`dh:patients:v1:${UID}:A`)).toContain("p2");

  // Edit on the phone, then delete p1 there.
  phone.patients.updatePatient("p2", { complaint: "pain" });
  await settle();
  expect(backend.docs.get(`dentist_records/${UID}/patients/p2`)).toMatchObject({ complaint: "pain" });
  phone.patients.removePatient("p1");
  await settle();
  expect(backend.docs.get(`dentist_records/${UID}/patients/p1`)).toMatchObject({ deleted: true });

  // Web relaunches with its old cache: gets p2 + the edit, drops p1, and
  // does NOT resurrect p1 from its stale local copy.
  const webAgain = await device(webStorage);
  const list = webAgain.patients.getPatients();
  expect(list.map((p) => p.id)).toEqual(["p2"]);
  expect(list[0].complaint).toBe("pain");
  expect(backend.docs.get(`dentist_records/${UID}/patients/p1`)).toMatchObject({ deleted: true });
}, 30_000);

it("keeps a guest's patients local only", async () => {
  backend.listeners = [];
  localStorage.clear();
  vi.resetModules();
  const clinics = await import("./clinicsStore");
  const patients = await import("./patientsStore");
  clinics.setClinicsStoreUser("");
  patients.addPatient({ name: "Guest", age: "", gender: "male", phone: "", history: {} as never, complaint: "", status: "new" });
  await settle();
  expect(patients.getPatients()).toHaveLength(1);
  expect(backend.docs.size).toBe(0);
});
