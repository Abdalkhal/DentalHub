// Uploads the product photo set in "allProducts/dental photos/photos" to
// Firebase Storage and records where each product's photos live.
//
//   node allProducts/upload-photos.mjs <service-account.json>
//
// The folder layout is photos/<category>/<product-slug>/<NN_name>.jpg, where
// <product-slug> is the last part of the product's `url` in all_products.csv.
// Each file goes to gs://<bucket>/catalog_photos/<product-slug>/<file> with a
// download token. The result, product slug -> photo URLs in file-name order,
// is written to allProducts/catalog-photos.json, which build-catalog.cjs
// reads. Resumable: photos already in the JSON are skipped.
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PHOTOS = join(__dirname, "dental photos", "photos");
const OUT = join(__dirname, "catalog-photos.json");
const BUCKET = "dental-hub-df069.firebasestorage.app";
const PREFIX = "catalog_photos";
const CONCURRENCY = 8;

const keyPath = process.argv[2];
if (!keyPath) {
  console.error("usage: node allProducts/upload-photos.mjs <service-account.json>");
  process.exit(1);
}

const { initializeApp, cert } = await import("firebase-admin/app");
const { getStorage } = await import("firebase-admin/storage");
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))), storageBucket: BUCKET });
const bucket = getStorage().bucket();

// slug -> { file name -> URL }
const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const byFile = Object.fromEntries(
  Object.entries(done).map(([slug, urls]) => [slug, Object.fromEntries(urls.map((u) => [decodeURIComponent(u.split("/o/")[1].split("?")[0]).split("/").pop(), u]))]),
);

const jobs = [];
for (const category of readdirSync(PHOTOS)) {
  for (const slug of readdirSync(join(PHOTOS, category))) {
    for (const file of readdirSync(join(PHOTOS, category, slug)).sort()) {
      if (!/\.(jpe?g|png|webp)$/i.test(file)) continue;
      if (byFile[slug]?.[file]) continue;
      jobs.push({ slug, file, local: join(PHOTOS, category, slug, file) });
    }
    byFile[slug] ??= {};
  }
}

const save = () => {
  const out = {};
  for (const [slug, files] of Object.entries(byFile)) {
    const names = Object.keys(files).sort();
    if (names.length) out[slug] = names.map((n) => files[n]);
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1));
  return out;
};

console.log(`${jobs.length} photos to upload`);
let ok = 0;
const fail = [];
let i = 0;
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (i < jobs.length) {
      const { slug, file, local } = jobs[i++];
      const dest = `${PREFIX}/${slug}/${file}`;
      const token = randomUUID();
      const type = /\.png$/i.test(file) ? "image/png" : /\.webp$/i.test(file) ? "image/webp" : "image/jpeg";
      try {
        await bucket.upload(local, {
          destination: dest,
          resumable: false,
          metadata: {
            contentType: type,
            cacheControl: "public, max-age=31536000, immutable",
            metadata: { firebaseStorageDownloadTokens: token },
          },
        });
        byFile[slug][file] = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
        if (++ok % 250 === 0) {
          save();
          console.log(`  uploaded ${ok}…`);
        }
      } catch (e) {
        fail.push([dest, e.message]);
      }
    }
  }),
);
const out = save();
console.log(`uploaded ${ok}, failed ${fail.length}; ${Object.keys(out).length} products have photos`);
for (const [d, m] of fail) console.log("  FAIL", d, m);
