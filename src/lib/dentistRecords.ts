// Cloud copy of a dentist's clinic records — the clinic list and patient
// files. These used to live only in the device's local storage, so a record
// typed on the phone never reached the web app (or another phone), and was
// lost with the app's data. Layout, all private to the account (see
// firestore.rules / storage.rules → `dentist_records`):
//
//   dentist_records/{uid}                         { clinics: Clinic[] }
//   dentist_records/{uid}/patients/{patientId}    Patient + { clinicId, updatedAt, deleted? }
//   (Storage) dentist_records/{uid}/patients/{patientId}/{fileId}-{name}
//
// Identical in the web app and the native app (src/lib/dentistRecords.ts).
import { collection, doc } from "firebase/firestore";
import { deleteObject, getBlob, ref, uploadBytes, uploadString } from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";

export const RECORDS = "dentist_records";

export const clinicsDoc = (uid: string) => doc(db, RECORDS, uid);
export const patientsCol = (uid: string) => collection(db, RECORDS, uid, "patients");
export const patientDoc = (uid: string, patientId: string) => doc(db, RECORDS, uid, "patients", patientId);

export function patientFilePath(uid: string, patientId: string, fileId: string, name: string): string {
  const safe = (name || "file").replace(/[^\w.\-]+/g, "_").slice(-80);
  return `${RECORDS}/${uid}/patients/${patientId}/${fileId}-${safe}`;
}

/** Firestore rejects `undefined` anywhere in a document; JSON drops it. */
export function toFirestore<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function uploadPatientFile(
  path: string,
  data: Blob | Uint8Array | ArrayBuffer,
  contentType: string,
): Promise<void> {
  await uploadBytes(ref(storage, path), data, { contentType: contentType || "application/octet-stream" });
}

/** Moves a legacy in-browser `data:` URL file to Storage. */
export async function uploadDataUrl(path: string, dataUrl: string): Promise<void> {
  await uploadString(ref(storage, path), dataUrl, "data_url");
}

/** Fetched through the SDK so the Storage rules are checked on every read. */
export function fetchPatientFile(path: string): Promise<Blob> {
  return getBlob(ref(storage, path));
}

export async function deletePatientFile(path: string): Promise<void> {
  try {
    await deleteObject(ref(storage, path));
  } catch {
    /* already gone, or offline — the record no longer references it */
  }
}
