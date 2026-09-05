import { ref, uploadBytes, uploadBytesResumable, getBlob } from "firebase/storage";
import { Directory, File, Paths } from "expo-file-system";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { storage, db } from "@/integrations/firebase/client";

const PREVIEW_MAX_BYTES = 200 * 1024;

/**
 * Case files are addressed by storage *path*, never by download URL.
 *
 * `getDownloadURL()` mints a permanent, unauthenticated token that bypasses
 * Storage Rules entirely, so anyone who ever sees one keeps access forever —
 * including a designer removed from the lab. Fetching by path goes through
 * `getBlob`, which the rules evaluate against the caller on every request.
 */
export async function fetchCaseFile(path: string): Promise<Blob> {
  return getBlob(ref(storage, path));
}

/**
 * Downloads a case file into the app cache and returns a local `file://` URI
 * suitable for `Sharing.shareAsync` or an external viewer.
 *
 * React Native has no `URL.createObjectURL`, so the bytes have to land on disk
 * before anything else can open them.
 */
export async function resolveCaseFileUri(path: string, fileName?: string): Promise<string> {
  const blob = await fetchCaseFile(path);
  const name = fileName || path.split("/").pop() || "case-file";

  const dir = new Directory(Paths.cache, "case-files");
  if (!dir.exists) dir.create({ intermediates: true });

  const file = new File(dir, name);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(await blob.arrayBuffer()));
  return file.uri;
}

/** Computes a SHA-256 hex digest of a file (Web Crypto, runs in the browser). */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Gzip-compresses a blob using the CompressionStream API, reporting whether
 * compression actually happened.
 *
 * The caller MUST set `contentEncoding: "gzip"` when `compressed` is true —
 * otherwise the bucket stores gzip bytes and serves them verbatim as `.stl`,
 * which no CAD package can open. React Native (Hermes) has no CompressionStream
 * at all, so here this is normally a no-op; claiming the header anyway would
 * corrupt the download in the opposite direction, hence the flag.
 */
export async function compressGzip(blob: Blob): Promise<{ blob: Blob; compressed: boolean }> {
  if (typeof CompressionStream === "undefined") return { blob, compressed: false };
  const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
  return { blob: await new Response(stream).blob(), compressed: true };
}

function hashDocRef(labId: string, hash: string) {
  return doc(db, "storage_hashes", `${labId}_${hash}`);
}

/** PHASE 5 — dedup: returns the existing storage path if this exact hash is already stored. */
export async function findExistingByHash(labId: string, hash: string): Promise<string | null> {
  const snap = await getDoc(hashDocRef(labId, hash));
  if (!snap.exists()) return null;
  return (snap.data() as { path?: string }).path ?? null;
}

/** Registers a hash → URL mapping after a successful upload. */
export async function registerHash(
  labId: string,
  hash: string,
  entry: { path: string; caseId: string; previewPath?: string; dentistId?: string },
): Promise<void> {
  await setDoc(hashDocRef(labId, hash), {
    labId,
    hash,
    ...entry,
    createdAt: new Date().toISOString(),
  });
}

function isAsciiStl(bytes: Uint8Array): boolean {
  const head = new TextDecoder().decode(bytes.slice(0, 5)).toLowerCase();
  return head.startsWith("solid");
}

/**
 * PHASE 5 — generates a lightweight (~200KB) preview mesh from a raw STL by
 * decimating triangles. Handles both ASCII and binary STL.
 */
export async function generatePreviewMesh(
  stlBlob: Blob,
  maxBytes = PREVIEW_MAX_BYTES,
): Promise<Blob | null> {
  const bytes = new Uint8Array(await stlBlob.arrayBuffer());
  if (bytes.length <= maxBytes) return stlBlob;

  if (isAsciiStl(bytes)) {
    const text = new TextDecoder().decode(bytes);
    const header = text.slice(0, text.indexOf("facet"));
    const facets = text
      .split("facet")
      .slice(1)
      .map((f) => "facet" + f);
    if (facets.length === 0) return null;
    const step = Math.ceil((facets.length * (header.length + 1) + facets.length * 50) / maxBytes);
    const keep = facets.filter((_, i) => i % step === 0);
    const preview = header + keep.join("");
    return new Blob([preview], { type: "model/stl" });
  }

  // Binary STL: 80-byte header, uint32 triangle count, then 50-byte triangles.
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const header = bytes.slice(0, 80);
  const count = view.getUint32(80, true);
  const triangleSize = 50;
  const step = Math.ceil((count * triangleSize) / (maxBytes - 84));
  const kept: Uint8Array[] = [];
  let keptCount = 0;
  for (let i = 0; i < count; i += 1) {
    if (i % step === 0) {
      const start = 84 + i * triangleSize;
      kept.push(bytes.slice(start, start + triangleSize));
      keptCount += 1;
    }
  }
  const out = new Uint8Array(84 + keptCount * triangleSize);
  out.set(header, 0);
  new DataView(out.buffer).setUint32(80, keptCount, true);
  kept.forEach((tri, i) => out.set(tri, 84 + i * triangleSize));
  return new Blob([out], { type: "model/stl" });
}

export type CaseUploadResult = {
  /** Storage path — the canonical reference persisted on the case document. */
  path: string;
  previewPath?: string;
  hash: string;
  deduplicated: boolean;
};

export type CaseUploadOptions = {
  labId: string;
  caseId: string;
  file: File | Blob;
  fileName: string;
  dentistId: string;
  designerId?: string;
  /** "scan" (dentist upload) or "design" (designer upload). */
  kind: "scan" | "design";
};

/**
 * PHASE 5 — full upload pipeline:
 *   1. SHA-256 hash deduplication (skip if the exact file already exists).
 *   2. `Cache-Control: private, max-age=86400` metadata (no public CDN caching).
 *   3. Gzip compression of the raw file.
 *   4. A ~200KB preview mesh generated alongside the raw upload.
 *   5. Required `dentistId` / `caseId` custom metadata (enforced by storage rules).
 */
export async function uploadCaseFile(opts: CaseUploadOptions): Promise<CaseUploadResult> {
  const { labId, caseId, file, fileName, dentistId, designerId, kind } = opts;

  const hash = await sha256Hex(file);
  const existing = await findExistingByHash(labId, hash);
  if (existing) {
    return { path: existing, hash, deduplicated: true };
  }

  const folder = kind === "design" ? "case_designs" : "case_scans";
  const path = `${folder}/${labId}/${caseId}/${fileName}`;
  const preview = await generatePreviewMesh(file);

  // Required by the storage rules, which reject any case upload that does not
  // identify its dentist and case.
  const customMetadata: Record<string, string> = { dentistId, caseId, hash };
  if (designerId) customMetadata.designerId = designerId;

  const contentType = (file as globalThis.File).type || "model/stl";

  const upload = async (blob: Blob, at: string, opts?: { gzip?: boolean }) => {
    await uploadBytes(ref(storage, at), blob, {
      cacheControl: "private, max-age=86400",
      contentType,
      ...(opts?.gzip ? { contentEncoding: "gzip" } : {}),
      customMetadata,
    });
  };

  const master = await compressGzip(file);
  await upload(master.blob, path, { gzip: master.compressed });

  let previewPath: string | undefined;
  if (preview && preview !== file) {
    previewPath = `previews/${labId}/${caseId}/preview_${fileName}`;
    const previewGz = await compressGzip(preview);
    await upload(previewGz.blob, previewPath, { gzip: previewGz.compressed });
  }

  await registerHash(labId, hash, { path, caseId, previewPath, dentistId }).catch(() => {
    /* hash bookkeeping is non-critical */
  });

  return { path, previewPath, hash, deduplicated: false };
}

/**
 * Uploads a dentist's raw scanner file (STL/ZIP) to `orders_files/{orderId}/{fileName}`
 * with a progress callback. Returns the storage path to persist on the order.
 *
 * `labId` and `dentistId` are stamped as metadata because this path carries no
 * lab segment — the rules read the owning lab from the object itself, and rely
 * on these objects being immutable so the stamp cannot be forged later by
 * overwriting someone else's file.
 */
export async function uploadOrderFile(opts: {
  orderId: string;
  labId: string;
  dentistId: string;
  file: globalThis.File | Blob;
  fileName: string;
  onProgress?: (pct: number) => void;
}): Promise<{ path: string }> {
  const { orderId, labId, dentistId, file, fileName, onProgress } = opts;
  const path = `orders_files/${orderId}/${fileName}`;
  const fileRef = ref(storage, path);

  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, file, {
      contentType: (file as globalThis.File).type || "application/octet-stream",
      cacheControl: "private, max-age=86400",
      customMetadata: { labId, dentistId, orderId },
    });
    task.on(
      "state_changed",
      (snapshot) => {
        const pct = snapshot.totalBytes
          ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          : 0;
        onProgress?.(pct);
      },
      (err) => reject(err),
      () => resolve(),
    );
  });

  return { path };
}
