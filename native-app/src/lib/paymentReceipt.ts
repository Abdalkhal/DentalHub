// Payment receipts and the finance section of the shared patient file.
// Identical in the web app and the native app (src/lib/paymentReceipt.ts).
import {
  balanceIn,
  formatMoney,
  patientDeletedPayments,
  patientFeeHistory,
  paymentCurrency,
  usedCurrencies,
  type DeletedPayment,
  type FeeCurrency,
  type Patient,
  type Payment,
} from "./patientsStore";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const currencyName = (c: FeeCurrency, ar: boolean) => (c === "USD" ? (ar ? "الدولار" : "USD") : ar ? "الدينار" : "IQD");

function remainingLine(remaining: number, c: FeeCurrency, ar: boolean) {
  return {
    label: remaining < 0 ? (ar ? "دفع زائد" : "Overpaid") : ar ? "المتبقي" : "Remaining",
    value: formatMoney(Math.abs(remaining), c),
  };
}

/** The message sent to the patient on WhatsApp. */
export function receiptText(p: Patient, x: Payment, clinicName: string, ar: boolean): string {
  const c = paymentCurrency(p, x);
  const b = balanceIn(p, c);
  const rest = remainingLine(b.remaining, c, ar);
  const lines = ar
    ? [
        `وصل دفع${clinicName ? ` — ${clinicName}` : ""}`,
        `المريض: ${p.name}`,
        `رقم الوصل: ${x.receiptNo ?? "—"}`,
        `التاريخ: ${x.date}`,
        `المبلغ المدفوع: ${formatMoney(x.amount, c)}`,
        ...(x.note ? [`ملاحظة: ${x.note}`] : []),
        `إجمالي الأتعاب: ${formatMoney(b.fees, c)}`,
        `مجموع المدفوع: ${formatMoney(b.paid, c)}`,
        `${rest.label}: ${rest.value}`,
      ]
    : [
        `Payment receipt${clinicName ? ` — ${clinicName}` : ""}`,
        `Patient: ${p.name}`,
        `Receipt #: ${x.receiptNo ?? "—"}`,
        `Date: ${x.date}`,
        `Amount paid: ${formatMoney(x.amount, c)}`,
        ...(x.note ? [`Note: ${x.note}`] : []),
        `Total fees: ${formatMoney(b.fees, c)}`,
        `Total paid: ${formatMoney(b.paid, c)}`,
        `${rest.label}: ${rest.value}`,
      ];
  return lines.join("\n");
}

/** Body of the printed receipt; goes inside the app's print shell. */
export function receiptBodyHtml(p: Patient, x: Payment, clinicName: string, ar: boolean): string {
  const t = (a: string, e: string) => (ar ? a : e);
  const c = paymentCurrency(p, x);
  const b = balanceIn(p, c);
  const rest = remainingLine(b.remaining, c, ar);
  const cell = (label: string, value: string) =>
    `<div class="meta-cell"><span class="meta-label">${esc(label)}</span><span class="meta-value">${esc(value)}</span></div>`;
  const row = (label: string, value: string, strong = false) =>
    `<tr${strong ? ' class="tot"' : ""}><td${strong ? ' style="font-weight:800"' : ""}>${esc(label)}</td><td class="num"${strong ? ' style="font-weight:800"' : ""}>${esc(value)}</td></tr>`;
  return `
    <h1>${t("وصل دفع", "Payment receipt")}</h1>
    ${clinicName ? `<p style="margin:0 0 12px;color:#64748b;font-size:12px;font-weight:700">${esc(clinicName)}</p>` : ""}
    <div style="margin:0 0 16px;padding:18px;border-radius:12px;background:#ecfdf5;text-align:center">
      <div style="color:#047857;font-size:11px;font-weight:700">${t("المبلغ المدفوع", "Amount paid")}</div>
      <div style="color:#065f46;font-size:26px;font-weight:800;margin-top:4px">${esc(formatMoney(x.amount, c))}</div>
    </div>
    <div class="meta-grid">
      ${cell(t("رقم الوصل", "Receipt #"), x.receiptNo ?? "—")}
      ${cell(t("التاريخ", "Date"), x.date)}
      ${cell(t("اسم المريض", "Patient"), p.name)}
      ${cell(t("رقم الملف", "File #"), p.fileNo)}
    </div>
    ${x.note ? `<div class="note"><b>${t("ملاحظة", "Note")}</b>${esc(x.note)}</div>` : ""}
    <div class="section">
      <h2 class="section-title">${t(`الرصيد بعملة ${currencyName(c, true)}`, `Balance in ${currencyName(c, false)}`)}</h2>
      <table><tbody>
        ${row(t("إجمالي الأتعاب", "Total fees"), formatMoney(b.fees, c))}
        ${row(t("مجموع المدفوع", "Total paid"), formatMoney(b.paid, c))}
        ${row(rest.label, rest.value, true)}
      </tbody></table>
    </div>
    <p style="margin-top:28px;color:#94a3b8;font-size:10px;text-align:center">${t("الرصيد كما هو عند إصدار هذه النسخة من الوصل.", "Balance as of when this copy was issued.")}</p>`;
}

/** The "المالية" section of the shared patient file. */
export function financeSectionHtml(p: Patient, ar: boolean): string {
  const t = (a: string, e: string) => (ar ? a : e);
  const used = usedCurrencies(p);
  const summary = used
    .map((c) => {
      const b = balanceIn(p, c);
      const rest = remainingLine(b.remaining, c, ar);
      return `<tr>
        <td>${esc(currencyName(c, ar))}</td>
        <td class="num">${esc(formatMoney(b.fees, c))}</td>
        <td class="num">${esc(formatMoney(b.paid, c))}</td>
        <td class="num" style="font-weight:800">${esc(rest.value)}${b.remaining < 0 ? ` (${esc(rest.label)})` : ""}</td>
      </tr>`;
    })
    .join("");
  const payments = p.payments
    .map(
      (x) => `<tr>
        <td>${esc(x.date)}</td>
        <td>${esc(x.receiptNo ?? "—")}</td>
        <td>${esc(x.note ?? "")}</td>
        <td class="num">${esc(formatMoney(x.amount, paymentCurrency(p, x)))}</td>
      </tr>`,
    )
    .join("");
  const history = patientFeeHistory(p);
  const deleted = patientDeletedPayments(p);
  return `
    <div class="section">
      <h2 class="section-title">${t("المالية", "Finances")}</h2>
      ${
        used.length
          ? `<table>
              <thead><tr>
                <th>${t("العملة", "Currency")}</th>
                <th class="num">${t("إجمالي الأتعاب", "Total fees")}</th>
                <th class="num">${t("المدفوع", "Paid")}</th>
                <th class="num">${t("المتبقي", "Remaining")}</th>
              </tr></thead>
              <tbody>${summary}</tbody>
            </table>`
          : `<div class="empty">${t("لا توجد مبالغ مسجلة", "No amounts recorded")}</div>`
      }
    </div>
    ${
      p.payments.length
        ? `<div class="section">
            <h2 class="section-title">${t("سجل الدفعات", "Payments")}</h2>
            <table>
              <thead><tr>
                <th>${t("التاريخ", "Date")}</th>
                <th>${t("رقم الوصل", "Receipt #")}</th>
                <th>${t("ملاحظة", "Note")}</th>
                <th class="num">${t("المبلغ", "Amount")}</th>
              </tr></thead>
              <tbody>${payments}</tbody>
            </table>
          </div>`
        : ""
    }
    ${
      history.length
        ? `<div class="section">
            <h2 class="section-title">${t("تغييرات إجمالي الأتعاب", "Changes to total fees")}</h2>
            ${history.map((h) => `<div class="note" style="margin-top:6px">${esc(feeChangeText(h, ar))}</div>`).join("")}
          </div>`
        : ""
    }
    ${
      deleted.length
        ? `<div class="section">
            <h2 class="section-title">${t("دفعات محذوفة", "Deleted payments")}</h2>
            ${deleted.map((d) => `<div class="note" style="margin-top:6px">${esc(deletedPaymentText(d, ar))}</div>`).join("")}
          </div>`
        : ""
    }`;
}

/** "حُذفت دفعة 100,000 د.ع (وصل REC-105-01، بتاريخ 2026-11-04) في 2026-11-05". */
export function deletedPaymentText(d: DeletedPayment, ar: boolean): string {
  const amount = formatMoney(d.amount, d.currency);
  const no = d.receiptNo ?? "—";
  return ar
    ? `حُذفت دفعة ${amount} (وصل ${no}، بتاريخ ${d.date}) في ${d.at}`
    : `Payment of ${amount} deleted on ${d.at} (receipt ${no}, dated ${d.date})`;
}

/** "تم تغيير الإجمالي من 500,000 د.ع إلى 575,000 د.ع بتاريخ 2026-11-05". */
export function feeChangeText(h: { from: number; to: number; currency: FeeCurrency; at: string }, ar: boolean): string {
  const from = formatMoney(h.from, h.currency);
  const to = formatMoney(h.to, h.currency);
  return ar ? `تم تغيير الإجمالي من ${from} إلى ${to} بتاريخ ${h.at}` : `Total changed from ${from} to ${to} on ${h.at}`;
}
