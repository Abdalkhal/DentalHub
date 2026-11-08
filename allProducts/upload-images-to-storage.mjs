// Moves the catalog's product photos off dentalstation.co and into our own
// Firebase Storage bucket, then points the catalog at the Storage copies.
//
//   node allProducts/upload-images-to-storage.mjs download
//       Fetches every distinct image URL into allProducts/images/ (no
//       credentials needed). Resumable: files already on disk are skipped.
//
//   node allProducts/upload-images-to-storage.mjs upload <service-account.json>
//       Uploads allProducts/images/ to gs://<bucket>/catalog_images/ with a
//       download token, records source URL -> Storage URL in
//       allProducts/storage-images.json (resumable), then rewrites
//       public/catalog/products.json and allProducts/catalog.csv.
//
//   node allProducts/upload-images-to-storage.mjs clear-dead
//       Maps every source image that could not be downloaded to "" (no image).
//
//   node allProducts/upload-images-to-storage.mjs apply
//       Only the last step: rewrite the catalog from storage-images.json.
//       build-catalog.cjs also applies that map, so rebuilding keeps them.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash, randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PRODUCTS_JSON = join(ROOT, "public", "catalog", "products.json");
const CATALOG_CSV = join(__dirname, "catalog.csv");
const IMG_DIR = join(__dirname, "images");
const MAP_PATH = join(__dirname, "storage-images.json");
const BUCKET = "dental-hub-df069.firebasestorage.app";
const PREFIX = "catalog_images";
const CONCURRENCY = 8;

const products = JSON.parse(readFileSync(PRODUCTS_JSON, "utf8"));
const loadMap = () => (existsSync(MAP_PATH) ? JSON.parse(readFileSync(MAP_PATH, "utf8")) : {});
const saveMap = (m) => writeFileSync(MAP_PATH, JSON.stringify(m, null, 2));

const isRemote = (u) => /^https?:\/\//.test(u) && !u.includes("firebasestorage.googleapis.com");
const sources = [...new Set(products.map((p) => p.g).filter((g) => g && isRemote(g)))];
const keyOf = (url) => createHash("sha1").update(url).digest("hex").slice(0, 16);

const EXT_BY_TYPE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const TYPE_BY_EXT = Object.fromEntries(Object.entries(EXT_BY_TYPE).map(([t, e]) => [e, t]));

async function pool(items, fn) {
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) await fn(items[i++]);
    }),
  );
}

function localFile(url) {
  const k = keyOf(url);
  return readdirSync(IMG_DIR).find((f) => f.startsWith(k + "."));
}

/* ── download ────────────────────────────────────── */

async function download() {
  mkdirSync(IMG_DIR, { recursive: true });
  let ok = 0, skip = 0, fail = [];
  const have = new Set(readdirSync(IMG_DIR).map((f) => f.split(".")[0]));
  await pool(sources, async (url) => {
    if (have.has(keyOf(url))) return void skip++;
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (catalog image mirror)" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const type = (res.headers.get("content-type") || "").split(";")[0].trim();
      const ext = EXT_BY_TYPE[type] || url.split("?")[0].split(".").pop().toLowerCase();
      if (!TYPE_BY_EXT[ext]) throw new Error("not an image: " + type);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 100) throw new Error("empty body");
      writeFileSync(join(IMG_DIR, `${keyOf(url)}.${ext}`), buf);
      ok++;
      if (ok % 100 === 0) console.log(`  downloaded ${ok}…`);
    } catch (e) {
      fail.push([url, e.message]);
    }
  });
  console.log(`download: ${ok} new, ${skip} already on disk, ${fail.length} failed (of ${sources.length})`);
  for (const [u, m] of fail) console.log("  FAIL", m, u);
}

/* ── upload ──────────────────────────────────────── */

async function upload(keyPath) {
  if (!keyPath) throw new Error("usage: upload <path-to-service-account.json>");
  const { initializeApp, cert } = await import("firebase-admin/app");
  const { getStorage } = await import("firebase-admin/storage");
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))), storageBucket: BUCKET });
  const bucket = getStorage().bucket();
  const map = loadMap();
  let ok = 0, missing = 0, fail = [];
  const todo = sources.filter((u) => !map[u]);
  await pool(todo, async (url) => {
    const file = localFile(url);
    if (!file) return void missing++;
    const ext = file.split(".").pop();
    const dest = `${PREFIX}/${file}`;
    const token = randomUUID();
    try {
      await bucket.upload(join(IMG_DIR, file), {
        destination: dest,
        resumable: false,
        metadata: {
          contentType: TYPE_BY_EXT[ext],
          cacheControl: "public, max-age=31536000, immutable",
          metadata: { firebaseStorageDownloadTokens: token, source: url },
        },
      });
      map[url] =
        `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
      if (++ok % 100 === 0) {
        saveMap(map);
        console.log(`  uploaded ${ok}…`);
      }
    } catch (e) {
      fail.push([url, e.message]);
    }
  });
  saveMap(map);
  console.log(`upload: ${ok} new, ${sources.length - todo.length} done before, ${missing} not downloaded, ${fail.length} failed`);
  for (const [u, m] of fail) console.log("  FAIL", m, u);
  apply();
}

/* ── apply ───────────────────────────────────────── */

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ""));

function apply() {
  const map = loadMap();
  let n = 0;
  for (const p of products) if (p.g && p.g in map) (p.g = map[p.g]), n++;
  writeFileSync(PRODUCTS_JSON, JSON.stringify(products));
  writeFileSync(
    CATALOG_CSV,
    "﻿" +
      ["id,name,brand,section,subsection,country,image", ...products.map((r) => [r.i, r.n, r.b, r.s, r.u, r.c, r.g].map(csvCell).join(","))].join("\n"),
  );
  const left = products.filter((p) => p.g && isRemote(p.g)).length;
  console.log(`apply: ${n} products updated from the map, ${left} still point elsewhere`);
}

// Images the source site no longer has (never downloaded): map them to "" so
// those products show no image rather than a broken one.
function clearDead() {
  mkdirSync(IMG_DIR, { recursive: true });
  const map = loadMap();
  let n = 0;
  for (const u of sources) if (!map[u] && !localFile(u)) (map[u] = ""), n++;
  saveMap(map);
  console.log(`clear-dead: ${n} dead links mapped to no image`);
  apply();
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "download") await download();
else if (cmd === "upload") await upload(arg);
else if (cmd === "clear-dead") clearDead();
else if (cmd === "apply") apply();
else console.log("usage: download | upload <service-account.json> | apply");
