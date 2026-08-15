import { readFileSync, writeFileSync } from "node:fs";

const originals = JSON.parse(readFileSync("dentalstation_brands.json", "utf8"));
const scraped = JSON.parse(readFileSync("dentalstation_brands_images.json", "utf8"));

const imageBySlug = new Map();
for (const r of scraped) {
  if (r.image) imageBySlug.set(r.slug, r.image);
}

const nameBySlug = new Map();
for (const o of originals) {
  nameBySlug.set(o.slug, o.brand);
}

const slugs = [...imageBySlug.keys()].sort();

const imageLines = slugs.map((s) => `  ${JSON.stringify(s)}: ${JSON.stringify(imageBySlug.get(s))},`);
const nameLines = [...nameBySlug.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([s, n]) => `  ${JSON.stringify(s)}: ${JSON.stringify(n)},`);

const ts =
  "// Auto-generated from dentalstation_brands.json (brand logo images).\n" +
  "export const BRAND_IMAGES: Record<string, string> = {\n" +
  imageLines.join("\n") +
  "\n};\n\n" +
  "export const BRAND_NAMES: Record<string, string> = {\n" +
  nameLines.join("\n") +
  "\n};\n";

writeFileSync("src/data/brand-images.ts", ts);
console.log(`Wrote brand-images.ts: ${imageLines.length} images, ${nameLines.length} names.`);
