import { readFileSync, writeFileSync } from "node:fs";

const src = JSON.parse(readFileSync("dentalstation_brands.json", "utf8"));
const total = src.length;

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

function isValidLogo(img) {
  if (!img) return false;
  if (!/\/uploads\//.test(img)) return false;
  if (/logo-\d+/i.test(img)) return false; // generic fallback logo
  return true;
}

async function fetchImage(brand) {
  try {
    const res = await fetch(brand.url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DentalHubBot/1.0)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const img = extractOgImage(html);
    if (!img) return null;
    const clean = encodeURI(decodeEntities(img.trim()));
    return isValidLogo(clean) ? clean : null;
  } catch {
    return null;
  }
}

const results = new Array(total);
let next = 0;

async function worker() {
  while (next < total) {
    const idx = next++;
    const b = src[idx];
    const image = await fetchImage(b);
    results[idx] = { ...b, image: image || "" };
    process.stdout.write(`\r${idx + 1}/${total}  ${b.slug}  ->  ${image || "NONE"}`);
  }
}

const CONCURRENCY = 14;
console.log(`Scraping ${total} brands with ${CONCURRENCY} workers...`);
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
process.stdout.write("\n");

const withImage = results.filter((r) => r.image);
const missing = results.filter((r) => !r.image);
console.log(`\nDone. ${withImage.length} with image, ${missing.length} without.`);

// 1) Reference JSON
writeFileSync(
  "dentalstation_brands_images.json",
  JSON.stringify(results, null, 2),
);

// 2) TypeScript data module keyed by slug
const lines = withImage.map((r) => `  ${JSON.stringify(r.slug)}: ${JSON.stringify(r.image)},`);
const ts =
  "// Auto-generated from dentalstation_brands.json (brand logo images).\n" +
  "export const BRAND_IMAGES: Record<string, string> = {\n" +
  lines.join("\n") +
  "\n};\n";
writeFileSync("src/data/brand-images.ts", ts);

// 3) Print missing slugs for reference
if (missing.length) {
  console.log("\nMissing images for:");
  console.log(missing.map((m) => m.slug).join(", "));
}
