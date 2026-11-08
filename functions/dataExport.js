/**
 * "تصدير بياناتي" — builds the ZIP a dentist takes with them:
 *
 *   قائمة المرضى.xlsx            every patient (and appointment) in tables
 *   المرضى/<patient>/ملف المريض.pdf
 *   المرضى/<patient>/الأشعة/...   and صور خطة العلاج/<department>/..., ملفات/...
 *   اقرأني.txt                   what was exported, and any file not found
 *
 * Kept apart from index.js and free of Firebase so it can be run on sample
 * data on a developer's machine.
 */

const path = require("path");
const { Readable } = require("stream");
const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");
const yazl = require("yazl");
const bidi = require("bidi-js")();

const FONT_REGULAR = path.join(__dirname, "assets/fonts/Cairo_400Regular.ttf");
const FONT_BOLD = path.join(__dirname, "assets/fonts/Cairo_700Bold.ttf");

const STATUS = { in_treatment: "قيد العلاج", completed: "مكتمل", new: "مريض جديد" };
const PLAN_STATUS = { done: "مكتمل", active: "قيد التنفيذ", planned: "مقترح" };
const TOOTH = {
  healthy: "سليم",
  caries: "تسوس",
  filled: "حشو",
  crown: "تاج",
  missing: "مفقود",
  implant: "زرعة",
  rct: "عصب",
  bridge: "جسر",
  unerupted: "غير بازغ",
};
const HISTORY = {
  diabetes: "السكري",
  hypertension: "ضغط الدم",
  heart: "أمراض القلب",
  allergy: "الحساسية",
  bleeding: "النزف",
};
const DEPARTMENTS = {
  general: "عام",
  radio: "أشعة الأسنان",
  pedo: "الأسنان اللبنية",
  scaling: "تنظيف الأسنان",
  perio: "علاج اللثة",
  preventive: "العلاجات الوقائية",
  fillings: "حشوات الأسنان",
  endo: "علاج العصب",
  prostho: "التركيبات والجسور",
  surgery: "جراحة الفم والخلع",
  ortho: "تقويم الأسنان",
  implant: "زراعة الأسنان",
  cosmetic: "تجميل الأسنان",
};
const VISIT_STATUS = {
  confirmed: "مؤكد",
  waiting: "بالانتظار",
  cancelled: "ملغي",
  completed: "مكتمل",
};

const money = (n, cur) => {
  const v = (Number(n) || 0).toLocaleString("en-US", {
    maximumFractionDigits: cur === "USD" ? 2 : 0,
  });
  return cur === "USD" ? `$${v}` : `${v} د.ع`;
};
// Same rules as src/lib/patientsStore.ts: each currency has its own fee and
// payments; older records had one fee and one label (feeCurrency).
const paymentCurrency = (p, x) => x.currency || p.feeCurrency || "USD";
const balanceIn = (p, c) => {
  const legacy = p.feeCurrency || "USD";
  const fees = p.fees ? Number(p.fees[c]) || 0 : c === legacy ? Number(p.totalFees) || 0 : 0;
  const paid = (p.payments || [])
    .filter((x) => paymentCurrency(p, x) === c)
    .reduce((s, x) => s + (Number(x.amount) || 0), 0);
  return { fees, paid, remaining: fees - paid };
};
const genderLabel = (g) => (g === "female" ? "أنثى" : g === "male" ? "ذكر" : "—");
const historyLabels = (p) =>
  Object.keys(HISTORY)
    .filter((k) => p.history && p.history[k])
    .map((k) => HISTORY[k]);

/* ── PDF ─────────────────────────────────────────────────────────── */

const PAGE_MARGIN = 40;
const INK = "#0F172A";
const MUTED = "#64748B";
const LINE = "#E2E8F0";
const BRAND = "#3B82F6";
const MIRROR = { "(": ")", ")": "(", "[": "]", "]": "[", "«": "»", "»": "«" };
const HAS_ARABIC = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

/**
 * Splits a line into runs in the order they are drawn left to right (Unicode
 * bidi). pdfkit knows nothing of right-to-left text; its font engine only
 * shapes and reverses an Arabic run it is given whole.
 * @param {string} text one line, in logical order.
 * @return {Array<{text: string, rtl: boolean, level: number}>} visual runs.
 */
function visualRuns(text) {
  const { levels } = bidi.getEmbeddingLevels(text, "rtl");
  const runs = [];
  for (let i = 0; i < text.length; i++) {
    const last = runs[runs.length - 1];
    if (last && last.level === levels[i]) last.text += text[i];
    else runs.push({ text: text[i], level: levels[i], rtl: levels[i] % 2 === 1 });
  }
  // Rule L2: from the highest level down, reverse each stretch at or above it.
  const max = runs.reduce((m, r) => Math.max(m, r.level), 0);
  for (let lvl = max; lvl >= 1; lvl--) {
    for (let i = 0; i < runs.length; i++) {
      if (runs[i].level < lvl) continue;
      let j = i;
      while (j + 1 < runs.length && runs[j + 1].level >= lvl) j++;
      const part = runs.slice(i, j + 1).reverse();
      runs.splice(i, part.length, ...part);
      i = j;
    }
  }
  return runs;
}

/**
 * What to hand the font engine for one run. It reverses text with Arabic
 * letters itself, but brackets inside must be swapped first, and a run with
 * no letters (a lone dash or bracket) comes through in logical order.
 * @param {{text: string, rtl: boolean}} run a visual run.
 * @return {string} the text to draw.
 */
function runToDraw(run) {
  if (!run.rtl) return run.text;
  const mirrored = [...run.text].map((c) => MIRROR[c] || c).join("");
  return HAS_ARABIC.test(run.text) ? mirrored : [...mirrored].reverse().join("");
}

class RtlPdf {
  constructor() {
    this.doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: false });
    this.doc.registerFont("r", FONT_REGULAR);
    this.doc.registerFont("b", FONT_BOLD);
    this.y = PAGE_MARGIN;
    this.left = PAGE_MARGIN;
    this.right = this.doc.page.width - PAGE_MARGIN;
    this.bottom = this.doc.page.height - PAGE_MARGIN;
  }

  lineHeight(size) {
    return size * 1.75;
  }

  wrap(text, width, size, bold) {
    this.doc.font(bold ? "b" : "r").fontSize(size);
    const out = [];
    for (const para of String(text).split(/\r?\n/)) {
      let line = "";
      for (const word of para.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word;
        if (line && this.doc.widthOfString(next) > width) {
          out.push(line);
          line = word;
        } else {
          line = next;
        }
      }
      out.push(line);
    }
    return out;
  }

  /** Draws one line whose right edge (or left, or centre) is at the box's. */
  drawLine(line, x, y, width, { size = 10, bold = false, color = INK, align = "right" } = {}) {
    if (!line) return;
    const doc = this.doc;
    doc
      .font(bold ? "b" : "r")
      .fontSize(size)
      .fillColor(color);
    // An Arabic run goes word by word: pdfkit places a shaped run's glyphs one
    // after another and loses its spaces and word order when given several.
    const space = doc.widthOfString(" ");
    const runs = [];
    for (const r of visualRuns(line)) {
      if (!r.rtl) {
        runs.push({ draw: r.text, w: doc.widthOfString(r.text) });
        continue;
      }
      for (const token of r.text.split(/( +)/).filter(Boolean).reverse()) {
        if (token.trim()) {
          const draw = runToDraw({ text: token, rtl: true });
          runs.push({ draw, w: doc.widthOfString(draw) });
        } else {
          runs.push({ draw: "", w: space * token.length });
        }
      }
    }
    const total = runs.reduce((s, r) => s + r.w, 0);
    let cx = align === "right" ? x + width - total : align === "left" ? x : x + (width - total) / 2;
    for (const r of runs) {
      if (r.draw) doc.text(r.draw, cx, y, { lineBreak: false });
      cx += r.w;
    }
    // text() moves pdfkit's own cursor and can add pages by itself; layout here
    // is explicit, so keep the cursor out of the way.
    doc.x = this.left;
    doc.y = PAGE_MARGIN;
  }

  ensure(height) {
    if (this.y + height > this.bottom) {
      this.doc.addPage();
      this.y = PAGE_MARGIN;
      return true;
    }
    return false;
  }

  paragraph(text, opts = {}) {
    const size = opts.size || 10;
    const lh = this.lineHeight(size);
    for (const line of this.wrap(text, this.right - this.left, size, opts.bold)) {
      this.ensure(lh);
      this.drawLine(line, this.left, this.y, this.right - this.left, { ...opts, size });
      this.y += lh;
    }
  }

  section(title) {
    this.ensure(50);
    this.y += 12;
    this.drawLine(title, this.left, this.y, this.right - this.left, { size: 12, bold: true });
    this.y += this.lineHeight(12);
    this.doc.moveTo(this.left, this.y).lineTo(this.right, this.y).lineWidth(1).stroke(LINE);
    this.y += 6;
  }

  /** Two cells per row, label above value. */
  metaGrid(items) {
    const gap = 8;
    const w = (this.right - this.left - gap) / 2;
    for (let i = 0; i < items.length; i += 2) {
      const row = items.slice(i, i + 2);
      const lines = row.map((m) => this.wrap(m.value || "—", w - 16, 10, true));
      const h = 26 + Math.max(...lines.map((l) => l.length)) * this.lineHeight(10);
      this.ensure(h + gap);
      row.forEach((m, c) => {
        const x = c === 0 ? this.right - w : this.left;
        this.doc.roundedRect(x, this.y, w, h, 6).lineWidth(1).stroke(LINE);
        this.drawLine(m.label, x + 8, this.y + 5, w - 16, { size: 8, color: MUTED, bold: true });
        lines[c].forEach((line, n) =>
          this.drawLine(line, x + 8, this.y + 21 + n * this.lineHeight(10), w - 16, {
            size: 10,
            bold: true,
          }),
        );
      });
      this.y += h + gap;
    }
  }

  /** Columns run from the right; `w` are fractions of the full width. */
  table(cols, rows) {
    const full = this.right - this.left;
    const size = 9;
    const lh = this.lineHeight(size);
    const pad = 5;
    const header = () => {
      this.ensure(lh + 2 * pad);
      this.doc.rect(this.left, this.y, full, lh + 2 * pad).fill("#F1F5F9");
      let right = this.right;
      for (const c of cols) {
        const w = c.w * full;
        this.drawLine(c.label, right - w + pad, this.y + pad, w - 2 * pad, { size, bold: true });
        right -= w;
      }
      this.y += lh + 2 * pad;
    };
    header();
    for (const row of rows) {
      const cells = cols.map((c, i) =>
        this.wrap(row[i] == null || row[i] === "" ? "—" : row[i], c.w * full - 2 * pad, size),
      );
      const h = Math.max(...cells.map((l) => l.length)) * lh + 2 * pad;
      if (this.ensure(h)) header();
      let right = this.right;
      cols.forEach((c, i) => {
        const w = c.w * full;
        cells[i].forEach((line, n) =>
          this.drawLine(line, right - w + pad, this.y + pad + n * lh, w - 2 * pad, { size }),
        );
        right -= w;
      });
      this.y += h;
      this.doc.moveTo(this.left, this.y).lineTo(this.right, this.y).lineWidth(0.5).stroke(LINE);
    }
  }

  empty(text) {
    this.paragraph(text, { size: 9, color: MUTED });
  }

  toBuffer() {
    return new Promise((resolve, reject) => {
      const chunks = [];
      this.doc.on("data", (c) => chunks.push(c));
      this.doc.on("end", () => resolve(Buffer.concat(chunks)));
      this.doc.on("error", reject);
      this.doc.end();
    });
  }
}

/**
 * @param {object} p a patient record.
 * @param {string} clinicName the clinic it belongs to.
 * @return {Promise<Buffer>} the patient's record as a PDF.
 */
function patientPdf(p, clinicName) {
  const pdf = new RtlPdf();
  pdf.drawLine("Dent Hub", pdf.left, pdf.y, pdf.right - pdf.left, {
    size: 16,
    bold: true,
    color: BRAND,
  });
  pdf.drawLine("ملف المريض", pdf.left, pdf.y + 4, pdf.right - pdf.left, {
    size: 14,
    bold: true,
    align: "left",
  });
  pdf.y += 34;

  const cur = p.feeCurrency || "IQD";
  pdf.metaGrid([
    { label: "اسم المريض", value: p.name },
    { label: "رقم الملف", value: p.fileNo },
    { label: "العمر", value: p.age ? `${p.age} سنة` : "—" },
    { label: "الجنس", value: genderLabel(p.gender) },
    { label: "الهاتف", value: p.phone },
    { label: "الحالة", value: STATUS[p.status] || "—" },
    { label: "آخر زيارة", value: p.lastVisit },
    { label: "العيادة", value: clinicName },
  ]);

  const history = historyLabels(p);
  if (p.complaint || p.doctorNote || p.notes) {
    pdf.section("الشكوى والملاحظات");
    if (p.complaint) pdf.paragraph(`الشكوى الرئيسية: ${p.complaint}`);
    if (p.doctorNote) pdf.paragraph(`ملاحظات الطبيب: ${p.doctorNote}`);
    if (p.notes) pdf.paragraph(`ملاحظات: ${p.notes}`);
  }

  pdf.section("التاريخ الطبي والأدوية");
  pdf.paragraph(`الأمراض: ${history.length ? history.join("، ") : "لا يوجد"}`);
  pdf.paragraph(`الحساسية: ${p.allergies || "لا يوجد"}`);
  pdf.paragraph(`الأدوية: ${p.meds || "لا يوجد"}`);

  pdf.section("الزيارات");
  if ((p.visits || []).length) {
    pdf.table(
      [
        { label: "التاريخ", w: 0.2 },
        { label: "الإجراء", w: 0.3 },
        { label: "الطبيب", w: 0.17 },
        { label: "الحالة", w: 0.13 },
        { label: "ملاحظة", w: 0.2 },
      ],
      p.visits.map((v) => [
        [v.date, v.time].filter(Boolean).join(" "),
        v.procedure,
        v.doctor,
        VISIT_STATUS[v.status] || (v.upcoming ? "موعد قادم" : "منجزة"),
        v.note,
      ]),
    );
  } else {
    pdf.empty("لا توجد زيارات مسجلة");
  }

  pdf.section("حالة الأسنان");
  const teeth = Object.keys(p.teeth || {})
    .filter((t) => p.teeth[t] && p.teeth[t] !== "healthy")
    .sort((a, b) => Number(a) - Number(b));
  if (teeth.length) {
    pdf.table(
      [
        { label: "السن", w: 0.3 },
        { label: "الحالة", w: 0.7 },
      ],
      teeth.map((t) => [t, TOOTH[p.teeth[t]] || p.teeth[t]]),
    );
  } else {
    pdf.empty("كل الأسنان سليمة — لا توجد ملاحظات");
  }

  pdf.section("خطة العلاج");
  if ((p.plan || []).length) {
    pdf.table(
      [
        { label: "الإجراء", w: 0.3 },
        { label: "السن", w: 0.1 },
        { label: "القسم", w: 0.2 },
        { label: "الحالة", w: 0.13 },
        { label: "التكلفة", w: 0.13 },
        { label: "ملاحظة", w: 0.14 },
      ],
      p.plan.map((s) => [
        s.title,
        s.tooth,
        DEPARTMENTS[s.dept || "general"] || s.dept,
        PLAN_STATUS[s.status] || "",
        s.cost ? money(s.cost, s.currency || cur) : "",
        s.note,
      ]),
    );
  } else {
    pdf.empty("لا توجد خطة علاج بعد");
  }

  pdf.section("المالية");
  const used = ["IQD", "USD"].filter((c) => {
    const b = balanceIn(p, c);
    return b.fees > 0 || b.paid > 0;
  });
  if (used.length) {
    pdf.table(
      [
        { label: "العملة", w: 0.16 },
        { label: "الأتعاب", w: 0.28 },
        { label: "المدفوع", w: 0.28 },
        { label: "المتبقي", w: 0.28 },
      ],
      used.map((c) => {
        const b = balanceIn(p, c);
        return [
          c === "USD" ? "دولار" : "دينار",
          money(b.fees, c),
          money(b.paid, c),
          money(b.remaining, c),
        ];
      }),
    );
  } else {
    pdf.empty("لا توجد مبالغ مسجلة");
  }
  if ((p.payments || []).length) {
    pdf.y += 8;
    pdf.table(
      [
        { label: "التاريخ", w: 0.22 },
        { label: "رقم الوصل", w: 0.24 },
        { label: "المبلغ", w: 0.24 },
        { label: "ملاحظة", w: 0.3 },
      ],
      p.payments.map((x) => [x.date, x.receiptNo, money(x.amount, paymentCurrency(p, x)), x.note]),
    );
  }
  if ((p.feeHistory || []).length) {
    pdf.y += 8;
    pdf.paragraph("تغييرات إجمالي الأتعاب:", { bold: true });
    for (const h of p.feeHistory) {
      pdf.paragraph(
        `تم تغيير الإجمالي من ${money(h.from, h.currency)} إلى ${money(h.to, h.currency)} بتاريخ ${h.at}`,
      );
    }
  }

  if ((p.deletedPayments || []).length) {
    pdf.y += 8;
    pdf.paragraph("دفعات محذوفة:", { bold: true });
    for (const d of p.deletedPayments) {
      pdf.paragraph(
        `حُذفت دفعة ${money(d.amount, d.currency)} (وصل ${d.receiptNo || "—"}، بتاريخ ${d.date}) في ${d.at}`,
      );
    }
  }

  if ((p.log || []).length) {
    pdf.section("السجل العلاجي");
    pdf.table(
      [
        { label: "التاريخ", w: 0.25 },
        { label: "الملاحظة", w: 0.75 },
      ],
      p.log.map((e) => [e.date, e.text]),
    );
  }
  return pdf.toBuffer();
}

/* ── Excel ───────────────────────────────────────────────────────── */

/**
 * @param {Array<object>} patients the records.
 * @param {Array<object>} appointments the calendar.
 * @param {function(string): string} clinicName id to name.
 * @return {Promise<Buffer>} the workbook.
 */
async function workbook(patients, appointments, clinicName) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Dent Hub";
  const sheet = (name, columns, rows) => {
    const ws = wb.addWorksheet(name, {
      views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
    });
    ws.columns = columns.map(([header, width]) => ({ header, width }));
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
    // Plain values only: exceljs writes strings as text, so a name that begins
    // with "=" (booking names come from the public) is never run as a formula.
    rows.forEach((r) => ws.addRow(r));
    return ws;
  };

  sheet(
    "المرضى",
    [
      ["العيادة", 20],
      ["رقم الملف", 12],
      ["الاسم", 26],
      ["العمر", 7],
      ["الجنس", 7],
      ["الهاتف", 16],
      ["الحالة", 12],
      ["آخر زيارة", 12],
      ["تاريخ التسجيل", 13],
      ["الشكوى", 30],
      ["الأمراض", 22],
      ["الحساسية", 18],
      ["الأدوية", 18],
      ["الأتعاب (دينار)", 14],
      ["المدفوع (دينار)", 14],
      ["المتبقي (دينار)", 14],
      ["الأتعاب (دولار)", 14],
      ["المدفوع (دولار)", 14],
      ["المتبقي (دولار)", 14],
      ["عدد الزيارات", 11],
    ],
    patients.map((p) => [
      clinicName(p.clinicId),
      p.fileNo || "",
      p.name || "",
      p.age || "",
      genderLabel(p.gender),
      p.phone || "",
      STATUS[p.status] || "",
      p.lastVisit || "",
      String(p.createdAt || "").slice(0, 10),
      p.complaint || "",
      historyLabels(p).join("، "),
      p.allergies || "",
      p.meds || "",
      balanceIn(p, "IQD").fees,
      balanceIn(p, "IQD").paid,
      balanceIn(p, "IQD").remaining,
      balanceIn(p, "USD").fees,
      balanceIn(p, "USD").paid,
      balanceIn(p, "USD").remaining,
      (p.visits || []).length,
    ]),
  );

  sheet(
    "المواعيد",
    [
      ["العيادة", 20],
      ["التاريخ", 12],
      ["الوقت", 8],
      ["المريض", 26],
      ["الهاتف", 16],
      ["العلاج", 22],
      ["الطبيب", 18],
      ["الحالة", 11],
      ["ملاحظات", 30],
    ],
    appointments.map((a) => [
      clinicName(a.clinicId),
      a.date || "",
      a.time || "",
      a.patientName || "",
      a.phone || "",
      a.treatment || a.appointmentType || "",
      a.doctor || "",
      VISIT_STATUS[a.status] || "",
      a.notes || "",
    ]),
  );
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/* ── ZIP ─────────────────────────────────────────────────────────── */

/**
 * Makes user-written text safe as one folder or file name in the ZIP.
 * @param {string} name the text.
 * @param {string} fallback used when nothing is left of it.
 * @return {string} a name with no path separators or reserved characters.
 */
function safeName(name, fallback) {
  const clean = String(name || "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "_")
    .replace(/\s+/g, " ")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .slice(0, 80);
  return clean || fallback;
}

/**
 * Which folder of the patient's a file belongs in, and its name without the
 * app's marker ("[xray] " / "[plan:scaling] ").
 * @param {string} name the stored file name.
 * @return {{folder: string, name: string}} where it goes.
 */
function fileLocation(name) {
  const m = /^\[(xray|plan:([^\]]+))\] (.*)$/.exec(String(name || ""));
  if (!m) return { folder: "ملفات", name: String(name || "") };
  if (m[1] === "xray") return { folder: "الأشعة", name: m[3] };
  return {
    folder: `صور خطة العلاج/${safeName(DEPARTMENTS[m[2]] || m[2], "عام")}`,
    name: m[3],
  };
}

/**
 * @param {{uid: string, clinics: Array<object>, patients: Array<object>,
 *   appointments: Array<object>, readFile: function(string): Promise<Buffer>}}
 *   input the account's data; readFile fetches a Storage object.
 * @return {{stream: Readable, done: Promise<object>}} the ZIP as it is built,
 *   and the summary once complete.
 */
function buildExportZip({ uid, clinics, patients, appointments, readFile }) {
  const zip = new yazl.ZipFile();
  const used = new Set();
  const unique = (wanted) => {
    let p = wanted;
    const dot = wanted.lastIndexOf(".");
    const base = dot > wanted.lastIndexOf("/") ? wanted.slice(0, dot) : wanted;
    const ext = dot > wanted.lastIndexOf("/") ? wanted.slice(dot) : "";
    for (let n = 2; used.has(p.toLowerCase()); n++) p = `${base} (${n})${ext}`;
    used.add(p.toLowerCase());
    return p;
  };
  const clinicById = new Map((clinics || []).map((c) => [c.id, c.name]));
  const clinicName = (id) => clinicById.get(id) || "";
  const manyClinics = new Set(patients.map((p) => p.clinicId)).size > 1;
  const summary = { patients: patients.length, files: 0, missing: [] };
  // A record's `path` is written by the client. Only this account's own folder
  // is ever read, or a crafted record could fetch another dentist's files.
  const ownPrefix = `dentist_records/${uid}/`;

  const lazyBuffer = (make) => (cb) => {
    make().then(
      (buf) => cb(null, Readable.from([buf])),
      (err) => cb(err),
    );
  };

  const sorted = [...patients].sort((a, b) =>
    String(a.fileNo || "").localeCompare(String(b.fileNo || ""), "en", { numeric: true }),
  );
  const steps = [];
  for (const p of sorted) {
    const label = safeName([p.fileNo, p.name].filter(Boolean).join(" "), "مريض");
    const group = manyClinics ? `${safeName(clinicName(p.clinicId), "عيادة")}/` : "";
    const folder = unique(`المرضى/${group}${label}`);
    zip.addReadStreamLazy(
      `${folder}/ملف المريض.pdf`,
      { compress: true },
      lazyBuffer(() => patientPdf(p, clinicName(p.clinicId))),
    );
    for (const f of p.files || []) {
      const where = fileLocation(f.name);
      const shown = `${where.folder}/${safeName(where.name, f.id || "ملف")}`;
      const allowed = f.path && f.path.startsWith(ownPrefix) && !f.path.includes("..");
      if (!allowed) {
        if (f.path) summary.missing.push(`${label}: ${shown}`);
        continue;
      }
      steps.push({ f, target: unique(`${folder}/${shown}`), label, shown });
    }
  }
  // A file that was removed from Storage must not lose the whole export, so
  // each is fetched before its entry is created.
  const done = (async () => {
    zip.addBuffer(await workbook(sorted, appointments, clinicName), "قائمة المرضى.xlsx");
    for (const s of steps) {
      let buf = null;
      try {
        buf = await readFile(s.f.path);
      } catch (err) {
        console.warn("Export: file not read", s.f.path, err.message);
      }
      if (!buf) {
        summary.missing.push(`${s.label}: ${s.shown}`);
        continue;
      }
      summary.files += 1;
      // Photos are already compressed; storing them keeps this fast.
      await new Promise((resolve, reject) => {
        const body = Readable.from([buf]);
        body.on("end", resolve);
        body.on("error", reject);
        zip.addReadStream(body, s.target, { compress: false });
      });
    }
    const missing = summary.missing.length
      ? `\r\nملفات تعذر العثور عليها (${summary.missing.length}):\r\n${summary.missing.join("\r\n")}\r\n`
      : "";
    zip.addBuffer(
      Buffer.from(
        `﻿بيانات عيادتك من Dent Hub\r\n` +
          `عدد المرضى: ${summary.patients}\r\n` +
          `عدد الصور والملفات: ${summary.files}\r\n` +
          `عدد المواعيد: ${appointments.length}\r\n` +
          `\r\nقائمة المرضى.xlsx: جدول بكل المرضى والمواعيد.\r\n` +
          `المرضى: مجلد لكل مريض فيه ملفه بصيغة PDF وصوره.\r\n` +
          missing,
        "utf8",
      ),
      "اقرأني.txt",
    );
    zip.end();
    return summary;
  })();
  zip.on("error", (err) => zip.outputStream.destroy(err));
  done.catch((err) => zip.outputStream.destroy(err));
  return { stream: zip.outputStream, done };
}

module.exports = { buildExportZip, patientPdf, workbook, visualRuns, safeName, fileLocation };
