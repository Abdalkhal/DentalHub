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
  .section{margin-top:18px}
  .section-title{font-size:13px;font-weight:800;color:#0f172a;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
  .empty{padding:10px 0;color:#94a3b8;font-size:11px}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
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

// Full patient-record PDF, shared from the patient screen's share button.
// Fixed section order for every patient — info, complaint/notes, visits,
// teeth, treatment plan — so the printed file always reads the same way
// regardless of how much data a given patient has.
export function patientRecordHtml(opts: {
  ar: boolean;
  meta: { label: string; value: string }[];
  complaint?: string;
  doctorNotes?: string;
  visits: { date: string; time?: string; procedure: string; doctor?: string; status?: string; note?: string }[];
  teeth: { tooth: number; status: string; color: string }[];
  plan: { title: string; tooth?: string; dept?: string; cost?: string; status: string; statusColor: string; note?: string }[];
}): string {
  const { ar } = opts;
  const t = (ar: string, en: string) => (opts.ar ? ar : en);

  const metaHtml = opts.meta
    .map((m) => `<div class="meta-cell"><span class="meta-label">${m.label}</span><span class="meta-value">${m.value}</span></div>`)
    .join('');

  const complaintHtml =
    opts.complaint || opts.doctorNotes
      ? `<div class="section">
          <h2 class="section-title">${t('الشكوى والملاحظات', 'Complaint & Notes')}</h2>
          ${opts.complaint ? `<div class="note"><b>${t('الشكوى الرئيسية', 'Main complaint')}</b>${opts.complaint}</div>` : ''}
          ${opts.doctorNotes ? `<div class="note" style="margin-top:8px"><b>${t('ملاحظات الطبيب', "Doctor's notes")}</b>${opts.doctorNotes}</div>` : ''}
        </div>`
      : '';

  const visitsRows = opts.visits
    .map(
      (v) => `<tr>
        <td>${v.date}${v.time ? ` ${v.time}` : ''}</td>
        <td>${v.procedure}</td>
        <td>${v.doctor ?? '—'}</td>
        <td>${v.status ?? '—'}</td>
        <td>${v.note ?? ''}</td>
      </tr>`,
    )
    .join('');
  const visitsHtml = `
    <div class="section">
      <h2 class="section-title">${t('الزيارات', 'Visits')}</h2>
      ${
        opts.visits.length
          ? `<table>
              <thead><tr>
                <th>${t('التاريخ', 'Date')}</th>
                <th>${t('الإجراء', 'Procedure')}</th>
                <th>${t('الطبيب', 'Doctor')}</th>
                <th>${t('الحالة', 'Status')}</th>
                <th>${t('ملاحظة', 'Note')}</th>
              </tr></thead>
              <tbody>${visitsRows}</tbody>
            </table>`
          : `<div class="empty">${t('لا توجد زيارات مسجّلة', 'No visits recorded')}</div>`
      }
    </div>`;

  const teethHtml = `
    <div class="section">
      <h2 class="section-title">${t('حالة الأسنان', 'Teeth')}</h2>
      ${
        opts.teeth.length
          ? `<div class="tags">${opts.teeth
              .map(
                (x) =>
                  `<span class="pill" style="background:${x.color}22;color:${x.color}">${t('سن', 'Tooth')} ${x.tooth} — ${x.status}</span>`,
              )
              .join('')}</div>`
          : `<div class="empty">${t('كل الأسنان سليمة — لا توجد ملاحظات', 'All teeth healthy — nothing flagged')}</div>`
      }
    </div>`;

  const planRows = opts.plan
    .map(
      (s) => `<tr>
        <td>${s.title}</td>
        <td>${s.tooth ?? '—'}</td>
        <td>${s.dept ?? '—'}</td>
        <td><span class="pill" style="background:${s.statusColor}22;color:${s.statusColor}">${s.status}</span></td>
        <td class="num">${s.cost ?? '—'}</td>
      </tr>`,
    )
    .join('');
  const planHtml = `
    <div class="section">
      <h2 class="section-title">${t('خطة العلاج', 'Treatment Plan')}</h2>
      ${
        opts.plan.length
          ? `<table>
              <thead><tr>
                <th>${t('الإجراء المختار', 'Chosen Procedure')}</th>
                <th>${t('السن', 'Tooth')}</th>
                <th>${t('القسم', 'Department')}</th>
                <th>${t('الحالة', 'Status')}</th>
                <th class="num">${t('التكلفة', 'Cost')}</th>
              </tr></thead>
              <tbody>${planRows}</tbody>
            </table>`
          : `<div class="empty">${t('لا توجد خطة علاج بعد', 'No treatment plan yet')}</div>`
      }
    </div>`;

  const body = `
    <h1>${t('ملف المريض', 'Patient Record')}</h1>
    <div class="meta-grid">${metaHtml}</div>
    ${complaintHtml}
    ${visitsHtml}
    ${teethHtml}
    ${planHtml}`;
  return SHELL(body, ar);
}
