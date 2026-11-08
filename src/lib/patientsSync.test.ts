// Two-device simulation of the dentist records sync (patientsStore +
// clinicsStore) against an in-memory fake of the Firestore API they use.
import { afterEach, expect, it, vi } from "vitest";

type Listener = { path: string; clinicId?: string; next: (snap: unknown) => void };
type Q = { path: string; field?: string; value?: unknown; clinicId?: string };

const backend = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  listeners: [] as Listener[],
  failWrites: false,
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
  uploadBytesResumable: async () => {},
  uploadString: async () => {},
  getBlob: async () => new Blob(),
  deleteObject: async () => {},
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  collection: (_db: unknown, ...segs: string[]) => ({ path: segs.join("/") }),
  where: (field: string, _op: string, value: unknown) => ({ field, value }),
  query: (col: { path: string }, w: { field: string; value: unknown }) =>
    w.field === "clinicId" ? { path: col.path, clinicId: w.value as string } : { path: col.path, field: w.field, value: w.value },
  getDocs: async (q: Q) => {
    const docs = [...backend.docs.entries()]
      .filter(([p, d]) => p.startsWith(q.path + "/") && (!q.field || d[q.field] === q.value))
      .map(([p, d]) => ({ id: p.split("/").pop()!, data: () => structuredClone(d) }));
    return { empty: docs.length === 0, docs };
  },
  setDoc: async (ref: { path: string }, data: Record<string, unknown>, opts?: { merge?: boolean }) => {
    if (backend.failWrites && ref.path.includes("/patients/")) throw Object.assign(new Error("offline"), { code: "unavailable" });
    const prev = backend.docs.get(ref.path) ?? {};
    backend.docs.set(ref.path, structuredClone(opts?.merge ? { ...prev, ...data } : data));
    for (const l of backend.listeners) if (ref.path === l.path || ref.path.startsWith(l.path + "/")) setTimeout(() => l.next(snapshotFor(l)));
  },
  // Like the SDK: (ref, next) or (ref, options, next).
  onSnapshot: (ref: { path: string; clinicId?: string }, a: unknown, b?: unknown) => {
    const next = (typeof a === "function" ? a : b) as (s: unknown) => void;
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
  backend.failWrites = false;
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

  // The tombstone keeps the record's data (merge), so it can be undone.
  expect(backend.docs.get(`dentist_records/${UID}/patients/p1`)).toMatchObject({ name: "From web" });

  // Web relaunches with its old cache: gets p2 + the edit, and — since the
  // apps have no delete action — a "deleted" marker never removes a patient
  // that a device still has: p1 is restored for everyone.
  const webAgain = await device(webStorage);
  const list = webAgain.patients.getPatients();
  expect(list.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
  expect(list.find((p) => p.id === "p2")?.complaint).toBe("pain");
  expect(backend.docs.get(`dentist_records/${UID}/patients/p1`)).toMatchObject({ deleted: false, name: "From web" });
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

it("reports a failed upload and sends everything on \"sync now\"", async () => {
  backend.failWrites = true;
  const phone = await device({
    [`dh_clinics_v1:${UID}`]: JSON.stringify({ clinics: [{ id: "A", name: "العيادة الرئيسية", address: "", workDays: "" }], activeClinicId: "A" }),
    [`dh:patients:v1:${UID}:A`]: JSON.stringify([pat("p1", "Only on phone")]),
  });
  expect(backend.docs.get(`dentist_records/${UID}/patients/p1`)).toBeUndefined();
  expect(await phone.patients.syncPatientsNow()).toMatchObject({ sent: 0, failed: 1, error: "unavailable: offline" });

  backend.failWrites = false;
  expect(await phone.patients.syncPatientsNow()).toEqual({ sent: 1, failed: 0, error: undefined });
  expect(backend.docs.get(`dentist_records/${UID}/patients/p1`)).toMatchObject({ name: "Only on phone", clinicId: "A" });
}, 30_000);

it("syncs appointments between devices, including deletes", async () => {
  const clinicsKey = `dh_clinics_v1:${UID}`;
  const clinics = JSON.stringify({ clinics: [{ id: "W", name: "العيادة الرئيسية", address: "", workDays: "" }], activeClinicId: "W" });
  await device({ [clinicsKey]: clinics });
  const appts = await import("./appointmentsStore");
  const a = appts.addAppointment({
    patientName: "A", phone: "", date: "2026-11-03", time: "16:00", appointmentType: "", clinicRoom: "",
    doctor: "", treatment: "", notes: "", reminder: false, status: "confirmed",
  });
  await settle();
  expect(backend.docs.get(`dentist_records/${UID}/appointments/${a.id}`)).toMatchObject({ time: "16:00", clinicId: "W", deleted: false });

  await device({ [clinicsKey]: clinics });
  const other = await import("./appointmentsStore");
  expect(other.getAppointments().map((x) => x.id)).toEqual([a.id]);
  other.removeAppointment(a.id);
  await settle();
  expect(backend.docs.get(`dentist_records/${UID}/appointments/${a.id}`)).toMatchObject({ deleted: true });
}, 30_000);

it("never deletes a record without updatedAt that another device doesn't hold yet (the Oct 2026 bug)", async () => {
  const clinicsKey = `dh_clinics_v1:${UID}`;
  const clinics = JSON.stringify({ clinics: [{ id: "W", name: "العيادة الرئيسية", address: "", workDays: "" }], activeClinicId: "W" });
  // A pre-sync record in the cloud, without updatedAt.
  backend.docs.set(`dentist_records/${UID}`, { clinics: [{ id: "W", name: "العيادة الرئيسية", address: "", workDays: "" }] });
  const legacy = pat("p7", "Legacy patient", { updatedAt: undefined });
  delete (legacy as Record<string, unknown>).updatedAt;
  backend.docs.set(`dentist_records/${UID}/patients/p7`, { ...legacy, clinicId: "W", deleted: false });

  // A device that has never seen it opens the account.
  const other = await device({ [clinicsKey]: clinics });
  expect(other.patients.getPatients().map((p) => p.id)).toEqual(["p7"]);
  expect(backend.docs.get(`dentist_records/${UID}/patients/p7`)).toMatchObject({ deleted: false, name: "Legacy patient" });
}, 30_000);

it("restores patients the bug already replaced with a deleted marker, from a copy on the device", async () => {
  const clinicsKey = `dh_clinics_v1:${UID}`;
  backend.docs.set(`dentist_records/${UID}`, { clinics: [{ id: "W", name: "العيادة الرئيسية", address: "", workDays: "" }] });
  // What the bug left in the cloud: an id with no data.
  backend.docs.set(`dentist_records/${UID}/patients/p8`, { id: "p8", clinicId: "W", deleted: true, updatedAt: 5 });
  // The device still has it under its old (pre-merge) clinic key.
  const phone = await device({
    [clinicsKey]: JSON.stringify({ clinics: [{ id: "W", name: "العيادة الرئيسية", address: "", workDays: "" }], activeClinicId: "W" }),
    [`dh:patients:v1:${UID}:OLD`]: JSON.stringify([pat("p8", "Lost patient")]),
  });
  await settle();
  expect(backend.docs.get(`dentist_records/${UID}/patients/p8`)).toMatchObject({ deleted: false, name: "Lost patient", clinicId: "W" });
  expect(phone.patients.getPatients().map((p) => p.id)).toContain("p8");
}, 30_000);
