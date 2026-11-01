// Uploads a picked file (by its local URI) straight to Firebase Storage from
// the native layer, through Storage's REST endpoint with the user's ID token.
//
// Why: the Firebase JS SDK has to read the photo into a JS byte array and
// send it through React Native's XHR, which handles binary bodies poorly —
// photos picked in the app never reached Storage while the same upload from
// the web worked. The native file uploader streams the file itself. The same
// Storage rules apply (the request is authenticated as the user).
//
// Tries, in order: expo-file-system's File.upload (current API), the legacy
// uploadAsync (older app binaries), then the JS SDK as a last resort — and
// reports every failure, so an error is never swallowed.
import { File, UploadType } from "expo-file-system";
import * as Legacy from "expo-file-system/legacy";
import { ref } from "firebase/storage";
import { auth, storage } from "@/integrations/firebase/client";
import { uploadData } from "./uploadData";

function restUrl(path: string): string {
  const bucket = storage.app.options.storageBucket;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(path)}`;
}

function check(status: number, body: string) {
  if (status >= 200 && status < 300) return;
  let msg = body;
  try {
    const j = JSON.parse(body) as { error?: { message?: string; code?: number } };
    msg = j.error?.message ?? body;
  } catch {
    /* plain text */
  }
  const err = new Error(`HTTP ${status}: ${msg}`.slice(0, 300)) as Error & { code?: string };
  err.code = status === 403 ? "storage/unauthorized" : `storage/http-${status}`;
  throw err;
}

export async function uploadFileUri(path: string, uri: string, contentType: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const token = await user.getIdToken();
  const headers = { Authorization: `Firebase ${token}`, "Content-Type": contentType };
  const url = restUrl(path);
  const errors: string[] = [];

  try {
    const res = await new File(uri).upload(url, {
      httpMethod: "POST",
      uploadType: UploadType.BINARY_CONTENT,
      headers,
    });
    check(res.status, res.body);
    return;
  } catch (e) {
    // A refusal from Storage itself is final — retrying another way won't help.
    if ((e as { code?: string }).code === "storage/unauthorized") throw e;
    errors.push(`native: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const res = await Legacy.uploadAsync(url, uri, {
      httpMethod: "POST",
      uploadType: Legacy.FileSystemUploadType.BINARY_CONTENT,
      headers,
    });
    check(res.status, res.body);
    return;
  } catch (e) {
    if ((e as { code?: string }).code === "storage/unauthorized") throw e;
    errors.push(`legacy: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const bytes = new Uint8Array(await new File(uri).arrayBuffer());
    await uploadData(ref(storage, path), bytes, { contentType });
  } catch (e) {
    errors.push(`sdk: ${e instanceof Error ? e.message : String(e)}`);
    throw new Error(errors.join("\n"));
  }
}
