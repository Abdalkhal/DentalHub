// Printable documents (same layout as the native app's shared PDFs, see
// native-app/src/lib/print.ts). On the web they open in the browser's print
// dialog, where the user can print or "Save as PDF".

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Only ever interpolated into style attributes; anything but a hex color is dropped.
function color(v: string): string {
  return /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : "#64748b";
}

const SHELL = (title: string, body: string, ar: boolean) => `
<!doctype html><html dir="${ar ? "rtl" : "ltr"}" lang="${ar ? "ar" : "en"}"><head><meta charset="utf-8"/>
<title>${esc(title)}</title>
<style>
  *{box-sizing:border-box;font-family:'Cairo',Arial,sans-serif}
  body{margin:0;padding:24px;color:#0f172a}
  .brand{color:#3B82F6;font-weight:800;font-size:20px;direction:ltr;text-align:${ar ? "right" : "left"}}
  h1{font-size:16px;margin:2px 0 10px}
  .meta-grid{display:flex;flex-wrap:wrap;margin:0 0 16px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
  .meta-cell{width:50%;padding:8px 10px;border-bottom:1px solid #e2e8f0}
  .meta-cell:nth-child(odd){border-${ar ? "left" : "right"}:1px solid #e2e8f0}
  .meta-label{display:block;color:#94a3b8;font-size:10px;font-weight:700;margin-bottom:1px}
  .meta-value{display:block;color:#0f172a;font-size:12px;font-weight:700}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th,td{text-align:${ar ? "right" : "left"};padding:8px 6px;border-bottom:1px solid #e2e8f0}
  th{background:#f1f5f9;font-size:12px}
  td.num,th.num{text-align:${ar ? "left" : "right"}}
  .note{margin-top:14px;padding:10px 12px;background:#f8fafc;border-radius:8px;font-size:12px;color:#334155;white-space:pre-wrap}
  .note b{color:#64748b;font-size:10px;display:block;margin-bottom:2px}
  .section{margin-top:18px}
  .section-title{font-size:13px;font-weight:800;margin:0 0 8px;padding-bottom:6px;border-bottom:2px solid #e2e8f0}
  .empty{padding:10px 0;color:#94a3b8;font-size:11px}
  .pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700}
  .tags{display:flex;flex-wrap:wrap;gap:6px}
  @media print{body{padding:0}}
</style></head><body>
<div class="brand">Dent<span style="color:#0f172a"> Hub</span></div>
${body}
</body></html>`;

export function patientRecordHtml(opts: {
  ar: boolean;
  title: string;
  meta: { label: string; value: string }[];
  complaint?: string;
  doctorNotes?: string;
  visits: { date: string; time?: string; procedure: string; doctor?: string; status?: string; note?: string }[];
  teeth: { tooth: number; status: string; color: string }[];
  plan: { title: string; tooth?: string; dept?: string; cost?: string; status: string; statusColor: string; note?: string }[];
}): string {
  const t = (ar: string, en: string) => (opts.ar ? ar : en);

  const metaHtml = opts.meta
    .map((m) => `<div class="meta-cell"><span class="meta-label">${esc(m.label)}</span><span class="meta-value">${esc(m.value)}</span></div>`)
    .join("");

  const complaintHtml =
    opts.complaint || opts.doctorNotes
      ? `<div class="section">
          <h2 class="section-title">${t("الشكوى والملاحظات", "Complaint & Notes")}</h2>
          ${opts.complaint ? `<div class="note"><b>${t("الشكوى الرئيسية", "Main complaint")}</b>${esc(opts.complaint)}</div>` : ""}
          ${opts.doctorNotes ? `<div class="note" style="margin-top:8px"><b>${t("ملاحظات الطبيب", "Doctor's notes")}</b>${esc(opts.doctorNotes)}</div>` : ""}
        </div>`
      : "";

  const visitsRows = opts.visits
    .map(
      (v) => `<tr>
        <td>${esc(v.date)}${v.time ? ` ${esc(v.time)}` : ""}</td>
        <td>${esc(v.procedure)}</td>
        <td>${esc(v.doctor ?? "—")}</td>
        <td>${esc(v.status ?? "—")}</td>
        <td>${esc(v.note ?? "")}</td>
      </tr>`,
    )
    .join("");
  const visitsHtml = `
    <div class="section">
      <h2 class="section-title">${t("الزيارات", "Visits")}</h2>
      ${
        opts.visits.length
          ? `<table><thead><tr>
                <th>${t("التاريخ", "Date")}</th><th>${t("الإجراء", "Procedure")}</th><th>${t("الطبيب", "Doctor")}</th>
                <th>${t("الحالة", "Status")}</th><th>${t("ملاحظة", "Note")}</th>
              </tr></thead><tbody>${visitsRows}</tbody></table>`
          : `<div class="empty">${t("لا توجد زيارات مسجّلة", "No visits recorded")}</div>`
      }
    </div>`;

  const teethHtml = `
    <div class="section">
      <h2 class="section-title">${t("حالة الأسنان", "Teeth")}</h2>
      ${
        opts.teeth.length
          ? `<div class="tags">${opts.teeth
              .map((x) => `<span class="pill" style="background:${color(x.color)}22;color:${color(x.color)}">${t("سن", "Tooth")} ${esc(x.tooth)} — ${esc(x.status)}</span>`)
              .join("")}</div>`
          : `<div class="empty">${t("كل الأسنان سليمة — لا توجد ملاحظات", "All teeth healthy — nothing flagged")}</div>`
      }
    </div>`;

  const planRows = opts.plan
    .map(
      (s) => `<tr>
        <td>${esc(s.title)}</td>
        <td>${esc(s.tooth ?? "—")}</td>
        <td>${esc(s.dept ?? "—")}</td>
        <td><span class="pill" style="background:${color(s.statusColor)}22;color:${color(s.statusColor)}">${esc(s.status)}</span></td>
        <td class="num">${esc(s.cost ?? "—")}</td>
      </tr>`,
    )
    .join("");
  const planHtml = `
    <div class="section">
      <h2 class="section-title">${t("خطة العلاج", "Treatment Plan")}</h2>
      ${
        opts.plan.length
          ? `<table><thead><tr>
                <th>${t("الإجراء المختار", "Chosen Procedure")}</th><th>${t("السن", "Tooth")}</th><th>${t("القسم", "Department")}</th>
                <th>${t("الحالة", "Status")}</th><th class="num">${t("التكلفة", "Cost")}</th>
              </tr></thead><tbody>${planRows}</tbody></table>`
          : `<div class="empty">${t("لا توجد خطة علاج بعد", "No treatment plan yet")}</div>`
      }
    </div>`;

  const body = `
    <h1>${t("ملف المريض", "Patient Record")}</h1>
    <div class="meta-grid">${metaHtml}</div>
    ${complaintHtml}${visitsHtml}${teethHtml}${planHtml}`;
  return SHELL(opts.title, body, opts.ar);
}

/** Prints a standalone HTML document via a hidden iframe (no popup needed). */
export function printHtml(html: string): void {
  if (typeof document === "undefined") return;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  win.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    win.focus();
    win.print();
  }, 250);
}
