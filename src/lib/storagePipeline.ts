import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { storage, db } from "@/integrations/firebase/client";

const PREVIEW_MAX_BYTES = 200 * 1024;

/** Computes a SHA-256 hex digest of a file (Web Crypto, runs in the browser). */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Gzip-compresses a blob using the native CompressionStream API. */
export async function compressGzip(blob: Blob): Promise<Blob> {
  if (typeof CompressionStream === "undefined") return blob;
  const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
  return new Response(stream).blob();
}

function hashDocRef(labId: string, hash: string) {
  return doc(db, "storage_hashes", `${labId}_${hash}`);
}

/** PHASE 5 — dedup: returns the existing download URL if this exact hash is already stored. */
export async function findExistingByHash(labId: string, hash: string): Promise<string | null> {
  const snap = await getDoc(hashDocRef(labId, hash));
  if (!snap.exists()) return null;
  return (snap.data() as { url?: string }).url ?? null;
}

/** Registers a hash → URL mapping after a successful upload. */
export async function registerHash(
  labId: string,
  hash: string,
  entry: { url: string; path: string; caseId: string; previewUrl?: string; dentistId?: string },
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
  url: string;
  previewUrl?: string;
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
    return { url: existing, hash, deduplicated: true };
  }

  const folder = kind === "design" ? "case_designs" : "case_scans";
  const compressed = await compressGzip(file);
  const preview = await generatePreviewMesh(file);

  const customMetadata: Record<string, string> = {
    dentistId,
    caseId,
    hash,
  };
  if (designerId) customMetadata.designerId = designerId;

  const baseMetadata = {
    cacheControl: "private, max-age=86400",
    contentType: (file as File).type || "model/stl",
    customMetadata,
  };

  const upload = async (blob: Blob, path: string) => {
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, blob, baseMetadata);
    return getDownloadURL(fileRef);
  };

  const url = await upload(compressed, `${folder}/${labId}/${caseId}/${fileName}`);

  let previewUrl: string | undefined;
  if (preview && preview !== file) {
    previewUrl = await upload(preview, `previews/${labId}/${caseId}/preview_${fileName}`);
  }

  await registerHash(labId, hash, {
    url,
    path: `${folder}/${labId}/${caseId}/${fileName}`,
    caseId,
    previewUrl,
    dentistId,
  }).catch(() => {
    /* hash bookkeeping is non-critical */
  });

  return { url, previewUrl, hash, deduplicated: false };
}
