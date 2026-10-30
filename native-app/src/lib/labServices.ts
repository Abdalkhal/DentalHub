// Lab service photos. Identical in the web app and the native app
// (src/lib/labServices.ts).
//
// The services list is one Firestore document (lab_services/{labId}). Photos
// used to be stored inside it as base64 `data:` URLs, so after a few photos
// the document passed Firestore's 1 MB limit and saving failed — and every
// doctor opening the lab's page downloaded all of them at once. Photos now
// go to Storage (lab_services/{labId}/…) and the document keeps only their
// download URL, which renders as-is on both platforms.
import { getDownloadURL, ref } from "firebase/storage";
import { dataUrlToBytes, uploadData } from "./uploadData";
import { storage } from "@/integrations/firebase/client";

export const isInlineImage = (url?: string): url is string => !!url && url.startsWith("data:");

async function upload(labId: string, serviceId: string, dataUrl: string): Promise<string> {
  const r = ref(storage, `lab_services/${labId}/${serviceId}-${Date.now()}.jpg`);
  const { bytes, contentType } = dataUrlToBytes(dataUrl);
  await uploadData(r, bytes, { contentType });
  return getDownloadURL(r);
}

/**
 * Returns a URL safe to save: inline images are uploaded first. If the upload
 * is refused (e.g. offline), the photo is kept inline as before rather than
 * failing the save; it moves to Storage on a later visit.
 */
export async function storeServiceImage(labId: string, serviceId: string, imageUrl?: string): Promise<string | undefined> {
  if (!isInlineImage(imageUrl)) return imageUrl || undefined;
  try {
    return await upload(labId, serviceId, imageUrl);
  } catch (err) {
    console.warn("Service photo kept inline:", err);
    return imageUrl;
  }
}

/**
 * Moves photos still stored inline to Storage. Returns the updated list, or
 * null when there was nothing to move. A photo that fails to upload is kept
 * inline and retried next time.
 */
export async function migrateInlineServiceImages<T extends { id: string; imageUrl?: string }>(
  labId: string,
  services: T[],
): Promise<T[] | null> {
  if (!services.some((s) => isInlineImage(s.imageUrl))) return null;
  let changed = false;
  const next: T[] = [];
  for (const s of services) {
    if (!isInlineImage(s.imageUrl)) {
      next.push(s);
      continue;
    }
    try {
      next.push({ ...s, imageUrl: await upload(labId, s.id, s.imageUrl) });
      changed = true;
    } catch {
      next.push(s);
    }
  }
  return changed ? next : null;
}
