// Phase 4 — print/share invoices & prescriptions as PDF.
// expo-print / expo-sharing are native modules; never require their JS wrapper
// unless the native module is compiled in (missing modules crash in dev).

import { hasNativeModule } from '@/lib/nativeModules';

type PrintApi = { printToFileAsync: (o: { html: string }) => Promise<{ uri: string }> };
type ShareApi = {
  isAvailableAsync: () => Promise<boolean>;
  shareAsync: (uri: string, options: unknown) => Promise<void>;
};

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

const SHELL = (body: string) => `
<!doctype html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box;font-family:Arial,'Cairo',sans-serif}
  body{margin:0;padding:24px;color:#0f172a}
  .brand{color:#3B82F6;font-weight:800;font-size:20px}
  h1{font-size:16px;margin:2px 0 2px}
  .meta{color:#64748b;font-size:12px;margin:0 0 16px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:left;padding:8px 6px;border-bottom:1px solid #e2e8f0}
  th{background:#f1f5f9;font-size:12px}
  .tot td{border-top:2px solid #cbd5e1;font-weight:800;border-bottom:none}
  .tot{font-weight:800}
</style></head><body>
<div class="brand">Dental<span style="color:#0f172a">Hub</span></div>
${body}
</body></html>`;

export function invoiceHtml(opts: {
  title: string;
  meta: { label: string; value: string }[];
  rows: { name: string; detail?: string; qty?: number; price?: string }[];
  totals?: { label: string; value: string }[];
}): string {
  const rowsHtml = opts.rows
    .map(
      (r) =>
        `<tr><td>${r.name}</td><td>${r.detail ?? ''}</td><td>${r.qty ?? ''}</td><td style="text-align:right">${r.price ?? ''}</td></tr>`,
    )
    .join('');
  const totalsHtml = (opts.totals ?? [])
    .map((t) => `<tr class="tot"><td colspan="3">${t.label}</td><td style="text-align:right">${t.value}</td></tr>`)
    .join('');
  const metaHtml = opts.meta.map((m) => `<span class="meta">${m.label}: ${m.value} &nbsp;&nbsp;</span>`).join('');
  const body = `
    <h1>${opts.title}</h1>
    <p class="meta">${metaHtml}</p>
    <table>
      <thead><tr><th>Item</th><th>Detail</th><th>Qty</th><th style="text-align:right">Price</th></tr></thead>
      <tbody>${rowsHtml}${totalsHtml}</tbody>
    </table>`;
  return SHELL(body);
}
