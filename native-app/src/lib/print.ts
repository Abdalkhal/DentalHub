// Phase 4 — print/share invoices & prescriptions as PDF.
// expo-print / expo-sharing are native modules; never require their JS wrapper
// unless the native module is compiled in (missing modules crash in dev).

import { Directory, File, Paths } from 'expo-file-system';

import { hasNativeModule } from '@/lib/nativeModules';

type PrintApi = { printToFileAsync: (o: { html: string }) => Promise<{ uri: string }> };
type ShareApi = {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (uri: string, options: unknown) => Promise<void>;
};

/** Writes a CSV string to a cache file and opens the native share sheet. */
export async function shareCsv(filename: string, csv: string): Promise<boolean> {
  if (!hasNativeModule('ExpoSharing')) return false;
  try {
    const Sharing = require('expo-sharing') as ShareApi;
    const dir = new Directory(Paths.cache, 'reports');
    if (!dir.exists) dir.create({ intermediates: true });
    const file = new File(dir, filename);
    if (file.exists) file.delete();
    file.create();
    file.write(String.fromCharCode(0xfeff) + csv);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: filename,
        UTI: 'public.comma-separated-values-text',
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function sharePdf(filename: string, html: string): Promise<boolean> {
  if (!hasNativeModule('ExpoPrint') || !hasNativeModule('ExpoSharing')) return false;
  try {
    const Print = require('expo-print') as PrintApi;
    const Sharing = require('expo-sharing') as ShareApi;
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: filename, UTI: 'com.adobe.pdf' });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Every consumer of this shell is either fully Arabic or fully English content
// — there is no mixed-direction body — so a single `dir`/`lang` on <html> is
// enough. Without it the WebView that renders the PDF (and any PDF viewer
// that later opens the file, e.g. from a Telegram attachment) falls back to
// LTR: table columns, headings and the price column all lay out mirrored
// against the Arabic text, which is the "broken design" the printed/shared
// PDF showed compared to the in-app screen (which is wrapped in RTL by the
// app's own layout).
const SHELL = (body: string, ar: boolean) => `
<!doctype html><html dir="${ar ? 'rtl' : 'ltr'}" lang="${ar ? 'ar' : 'en'}"><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box;font-family:'Cairo',Arial,sans-serif}
  body{margin:0;padding:24px;color:#0f172a}
  .brand{color:#3B82F6;font-weight:800;font-size:20px;direction:ltr;text-align:${ar ? 'right' : 'left'}}
  h1{font-size:16px;margin:2px 0 10px}
  .meta-grid{display:flex;flex-wrap:wrap;gap:0;margin:0 0 16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
  .meta-cell{width:50%;padding:8px 10px;border-bottom:1px solid #e2e8f0;box-sizing:border-box}
  .meta-cell:nth-child(odd){border-${ar ? 'left' : 'right'}:1px solid #e2e8f0}
  .meta-label{display:block;color:#94a3b8;font-size:10px;font-weight:700;margin-bottom:1px}
  .meta-value{display:block;color:#0f172a;font-size:12px;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:${ar ? 'right' : 'left'};padding:8px 6px;border-bottom:1px solid #e2e8f0}
  th{background:#f1f5f9;font-size:12px}
  td.num,th.num{text-align:${ar ? 'left' : 'right'}}
  .tot td{border-top:2px solid #cbd5e1;font-weight:800;border-bottom:none}
  .tot{font-weight:800}
  .note{margin-top:14px;padding:10px 12px;background:#f8fafc;border-radius:8px;font-size:12px;color:#334155}
  .note b{color:#64748b;font-size:10px;display:block;margin-bottom:2px}
</style></head><body>
<div class="brand">Dent<span style="color:#0f172a"> Hub</span></div>
${body}
</body></html>`;

export function invoiceHtml(opts: {
  ar: boolean;
  title: string;
  meta: { label: string; value: string }[];
  rows: { name: string; detail?: string; qty?: number; price?: string }[];
  totals?: { label: string; value: string }[];
  note?: { label: string; value: string };
}): string {
  const { ar } = opts;
  const rowsHtml = opts.rows
    .map(
      (r) =>
        `<tr><td>${r.name}</td><td>${r.detail ?? ''}</td><td class="num">${r.qty ?? ''}</td><td class="num">${r.price ?? ''}</td></tr>`,
    )
    .join('');
  const totalsHtml = (opts.totals ?? [])
    .map((t) => `<tr class="tot"><td colspan="3">${t.label}</td><td class="num">${t.value}</td></tr>`)
    .join('');
  const metaHtml = opts.meta
    .map((m) => `<div class="meta-cell"><span class="meta-label">${m.label}</span><span class="meta-value">${m.value}</span></div>`)
    .join('');
  const noteHtml = opts.note
    ? `<div class="note"><b>${opts.note.label}</b>${opts.note.value}</div>`
    : '';
  const body = `
    <h1>${opts.title}</h1>
    <div class="meta-grid">${metaHtml}</div>
    <table>
      <thead><tr>
        <th>${ar ? 'الصنف' : 'Item'}</th>
        <th>${ar ? 'التفاصيل' : 'Detail'}</th>
        <th class="num">${ar ? 'الكمية' : 'Qty'}</th>
        <th class="num">${ar ? 'السعر' : 'Price'}</th>
      </tr></thead>
      <tbody>${rowsHtml}${totalsHtml}</tbody>
    </table>
    ${noteHtml}`;
  return SHELL(body, ar);
}
