// Fills the empty `image` column in all_products.csv by scraping the product's
// own page (its `url` column) for the og:image meta tag, the same way
// scripts/scrape-brand-images.mjs pulls brand logos.
//
//   node allProducts/scrape-product-images.mjs
//
// Resumable: results are checkpointed to product-images.checkpoint.json
// (including URLs that returned nothing, so they are not retried) and an
// interrupted run can be restarted with no duplicate work.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "all_products.csv");
const CHECKPOINT_PATH = join(__dirname, "product-images.checkpoint.json");

/* ── CSV ─────────────────────────────────────────── */

function parseCsv(t) {
  const rows = [];
  let row = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

const csvCell = (v) =>
  /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? "");

/* ── og:image extraction ─────────────────────────── */

function extractOgImage(html) {
  const patterns = [
    /property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /content=["']([^"']+)["']\s+property=["']og:image["']/i,
    /name=["']og:image["']\s+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return null;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
}

// Product images live under /media/ or /uploads/. A bare domain or the store's
// own logo means the page had no real product photo.
function isValidProductImage(img) {
  if (!img) return false;
  if (!/^https?:\/\//i.test(img)) return false;
  if (/\/media\/|\/uploads\//i.test(img)) return true;
  return false;
}

async function fetchImage(url) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DentalHubBot/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const img = extractOgImage(html);
    if (!img) return null;
    const clean = encodeURI(decodeEntities(img.trim()));
    return isValidProductImage(clean) ? clean : null;
  } catch {
    return null;
  }
}

/* ── Read input ──────────────────────────────────── */

const raw = readFileSync(CSV_PATH, "utf8");
const bom = raw.charCodeAt(0) === 0xfeff ? "\uFEFF" : "";
const rows = parseCsv(raw.replace(/^\uFEFF/, ""));
const head = rows.shift();
const idx = Object.fromEntries(head.map((h, i) => [h, i]));

// url -> image URL ("" means it was already tried and found nothing).
const result = new Map();
if (existsSync(CHECKPOINT_PATH)) {
  for (const [k, v] of Object.entries(JSON.parse(readFileSync(CHECKPOINT_PATH, "utf8")))) {
    result.set(k, v ?? "");
  }
}

// Every row that still needs an image fetched.
const todo = [];
for (const row of rows) {
  if (row.length <= 1) continue;
  const url = (row[idx.url] || "").trim();
  const image = (row[idx.image] || "").trim();
  if (!url) continue;
  if (image) continue; // already has one in the CSV
  if (result.has(url)) continue; // already attempted
  todo.push(row);
}

console.log(
  `${rows.length} rows · ${todo.length} still need images · ${result.size} already attempted`,
);

/* ── Scrape with a pool of workers ───────────────── */

const CONCURRENCY = Number(process.env.CONCURRENCY || 12);
let done = 0;
let success = 0;
let next = 0;

async function worker() {
  while (next < todo.length) {
    const row = todo[next++];
    const url = (row[idx.url] || "").trim();
    const image = await fetchImage(url);
    result.set(url, image ?? "");
    if (image) success++;
    done++;
    if (done % 25 === 0 || done === todo.length) {
      process.stdout.write(`\r${done}/${todo.length}  ${success} found`);
      save();
    }
  }
}

function save() {
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(Object.fromEntries(result), null, 2));
  for (const row of rows) {
    if (row.length <= 1) continue;
    const url = (row[idx.url] || "").trim();
    if (result.has(url)) row[idx.image] = result.get(url);
  }
  const csv =
    bom +
    [head.join(","), ...rows.map((r) => r.map((v) => csvCell(v)).join(","))].join("\n") +
    "\n";
  writeFileSync(CSV_PATH, csv);
}

if (todo.length === 0) {
  save();
  console.log("\nNothing to scrape.");
} else {
  console.log(`Scraping with ${CONCURRENCY} workers...`);
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, () => worker()));
  process.stdout.write("\n");
  save();
  const missing = todo.filter((r) => !result.get((r[idx.url] || "").trim()));
  console.log(
    `Done. ${success} new images, ${missing.length} of ${todo.length} still missing.`,
  );
  if (missing.length) {
    console.log("Missing sample (first 20):");
    for (const r of missing.slice(0, 20)) console.log("  - " + (r[idx.name] || "").trim());
  }
}
