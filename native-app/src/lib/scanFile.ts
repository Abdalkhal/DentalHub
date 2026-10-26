import { File } from "expo-file-system";

/** Largest scan file Storage accepts — keep in sync with `orders_files` in storage.rules. */
export const SCAN_MAX_MB = 150;
export const SCAN_MAX_BYTES = SCAN_MAX_MB * 1024 * 1024;

/**
 * Reads a picked scan file (STL/ZIP) from local storage as raw bytes for the
 * Firebase Storage upload.
 *
 * This used to be `fetch(uri).then((r) => r.blob())`, which is unreliable in
 * React Native on Android for large binary files — the upload of a real STL
 * from an Android phone failed outright. expo-file-system reads the file
 * natively instead.
 */
export async function readScanFile(uri: string): Promise<Uint8Array> {
  const file = new File(uri);
  if (file.size != null && file.size > SCAN_MAX_BYTES) {
    throw new Error(`Scan file is larger than ${SCAN_MAX_MB} MB`);
  }
  return new Uint8Array(await file.arrayBuffer());
}
