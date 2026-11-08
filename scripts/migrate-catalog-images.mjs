#!/usr/bin/env node
/**
 * Points existing `products` documents at our Firebase Storage copies of the
 * catalog photos (allProducts/storage-images.json) instead of dentalstation.co.
 * Only entries in `images` that appear in the map are replaced; office-uploaded
 * photos are left alone.
 *
 * Usage:
 *   node scripts/migrate-catalog-images.mjs <service-account.json>          dry run
 *   node scripts/migrate-catalog-images.mjs <service-account.json> --write  apply
 */
import { readFile } from "node:fs/promises";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const [keyPath, flag] = process.argv.slice(2);
if (!keyPath) {
  console.error("Usage: node scripts/migrate-catalog-images.mjs <service-account.json> [--write]");
  process.exit(1);
}
const write = flag === "--write";
const map = JSON.parse(await readFile(new URL("../allProducts/storage-images.json", import.meta.url), "utf8"));
initializeApp({ credential: cert(JSON.parse(await readFile(keyPath, "utf8"))) });
const db = getFirestore();

const snap = await db.collection("products").get();
let changed = 0, deadLeft = 0;
let batch = db.batch(), inBatch = 0;
for (const d of snap.docs) {
  const images = d.get("images");
  if (!Array.isArray(images)) continue;
  const next = images.map((u) => map[u] || u);
  deadLeft += next.filter((u) => typeof u === "string" && u.includes("dentalstation.co")).length;
  if (next.every((u, i) => u === images[i])) continue;
  changed++;
  if (write) {
    batch.update(d.ref, { images: next });
    if (++inBatch === 400) {
      await batch.commit();
      batch = db.batch();
      inBatch = 0;
    }
  }
}
if (write && inBatch) await batch.commit();
console.log(
  `${snap.size} products scanned; ${changed} ${write ? "updated" : "would be updated"}; ` +
    `${deadLeft} image links still on dentalstation.co (no Storage copy)`,
);
