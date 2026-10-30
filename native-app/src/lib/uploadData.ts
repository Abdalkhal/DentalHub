// Uploads to Firebase Storage. Identical in the web app and the native app
// (src/lib/uploadData.ts).
//
// Always the chunked (resumable) upload: the one-shot `uploadBytes` wraps
// the data in a Blob, which React Native refuses for raw bytes ("Creating
// blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported") — so
// every photo picked in the app failed to upload, while case scans (already
// resumable) worked. Resumable works the same on the web.
import { uploadBytesResumable, type StorageReference, type UploadMetadata } from "firebase/storage";

export async function uploadData(
  ref: StorageReference,
  data: Blob | Uint8Array | ArrayBuffer,
  metadata?: UploadMetadata,
): Promise<void> {
  await uploadBytesResumable(ref, data, metadata);
}

/** "data:image/jpeg;base64,…" → bytes + type (uploadString has the same Blob problem). */
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const comma = dataUrl.indexOf(",");
  const head = dataUrl.slice(0, comma);
  const contentType = /^data:([^;,]+)/.exec(head)?.[1] ?? "application/octet-stream";
  const body = dataUrl.slice(comma + 1);
  const bin = head.includes(";base64") ? atob(body) : decodeURIComponent(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, contentType };
}
