#!/usr/bin/env node
/**
 * One-time migration: assign an expiryDate (+3 years from createdAt) to every
 * product document that currently has no expiryDate.
 *
 * Usage:
 *   node scripts/backfill-expiry.mjs <path-to-service-account.json>
 */
import { readFile } from "node:fs/promises";
import { initializeApp, cert, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error("Usage: node scripts/backfill-expiry.mjs <path-to-service-account.json>");
  process.exit(1);
}

const serviceAccount = JSON.parse(await readFile(serviceAccountPath, "utf8"));

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

const YEARS = 3;

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function createdAtDate(data) {
  const t = data.createdAt;
  if (!t) return new Date();
  if (typeof t.toDate === "function") return t.toDate();
  if (typeof t.seconds === "number") return new Date(t.seconds * 1000);
  return new Date();
}

async function main() {
  const snap = await db.collection("products").get();

  const updates = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.expiryDate) continue;
    updates.push({
      ref: doc.ref,
      expiryDate: toDateString(addYears(createdAtDate(data), YEARS)),
    });
  }

  console.log(`Total products: ${snap.size}`);
  console.log(`Products without expiryDate: ${updates.length}`);

  if (updates.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  const BATCH_SIZE = 450;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const u of chunk) {
      batch.update(u.ref, { expiryDate: u.expiryDate });
    }
    await batch.commit();
    console.log(`Updated ${Math.min(i + chunk.length, updates.length)}/${updates.length}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await deleteApp(app);
  });
