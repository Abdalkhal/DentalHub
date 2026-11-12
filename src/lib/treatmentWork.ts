/* Shared with native-app/src/lib/treatmentWork.ts — keep the two identical. */
/**
 * The work record of a treatment-plan procedure.
 *
 * A procedure is proposed, the patient agrees (`approvedAt`), the doctor
 * starts it (status "active") and records each session here, then finishes
 * it (status "done"). It lives inside the plan step on the patient document,
 * so it syncs with the rest of the record. A secretary's copy of the patient
 * is built field by field on the server and never includes it.
 */
import {
  addVisit,
  getPatient,
  getPlan,
  setTooth,
  updatePlanStep,
  type PlanStep,
  type ToothStatus,
} from "./patientsStore";

export type EndoCanal = {
  name: string;
  /** Working length, mm. */
  length?: string;
  /** Reference point, e.g. "MB cusp". */
  ref?: string;
  /** Master apical file, e.g. "25/.06". */
  maf?: string;
};

export type EndoSession = {
  stage?: string;
  canals: EndoCanal[];
  system?: string;
  apexLocator?: boolean;
  irrigation?: string[];
  naocl?: string;
  medicament?: string;
  obturation?: string;
  sealer?: string;
  restoration?: string;
};

export type GeneralSession = {
  /** What was done. */
  done?: string;
  materials?: string;
};

export type OrthoWire = { material?: string; size?: string };

export type OrthoSession = {
  /** setup | adjust | aligner | debond — see ORTHO_TYPES. */
  type: string;
  // Setup
  appliance?: string;
  arches?: string;
  prescription?: string;
  slot?: string;
  molarClass?: string;
  overjet?: string;
  overbite?: string;
  extractions?: string;
  anchorage?: string;
  /** Estimated length of treatment, months. */
  months?: string;
  // Adjustment
  visit?: string;
  upper?: OrthoWire;
  lower?: OrthoWire;
  elasticType?: string;
  elasticSize?: string;
  elasticForce?: string;
  elasticHours?: string;
  extras?: string[];
  /** Where the power chain / springs go, teeth rebonded… */
  extrasNote?: string;
  ligature?: string;
  hygiene?: string;
  /** Weeks to the next visit. */
  nextWeeks?: string;
  // Aligners
  alignerNo?: string;
  alignerTotal?: string;
  attachments?: boolean;
  ipr?: string;
  wearHours?: string;
  // Debond
  retainers?: string[];
};

export type ImplantFixture = {
  site: string;
  brand?: string;
  diameter?: string;
  length?: string;
  lot?: string;
  /** Insertion torque, Ncm. */
  torque?: string;
  isq?: string;
  bone?: string;
};

export type ImplantSession = {
  /** surgery | uncover | prosthetic | followup — see IMPLANT_TYPES. */
  type: string;
  fixtures: ImplantFixture[];
  // Surgery
  timing?: string;
  flap?: string;
  guided?: boolean;
  graft?: string;
  membrane?: string;
  sinus?: string;
  closure?: string;
  healingHeight?: string;
  sutures?: string;
  meds?: string;
  /** Months until loading. */
  loadingMonths?: string;
  // Uncovery
  healingSize?: string;
  gingiva?: string;
  // Prosthetic
  impression?: string;
  abutment?: string;
  retention?: string;
  crown?: string;
  shade?: string;
  // Follow-up
  pain?: string;
  /** Bone loss on the X-ray, mm. */
  boneLoss?: string;
};

export type WorkSession = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  note?: string;
  endo?: EndoSession;
  ortho?: OrthoSession;
  implant?: ImplantSession;
  general?: GeneralSession;
};

export type TreatmentWork = {
  /** Which work sheet this procedure started with; the form follows the department. */
  kind: "endo" | "ortho" | "implant" | "general";
  startedAt: string;
  finishedAt?: string;
  sessions: WorkSession[];
};

/** Today in Baghdad, YYYY-MM-DD. */
export const workToday = () => new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);

export const workKind = (s: Pick<PlanStep, "dept">): TreatmentWork["kind"] =>
  s.dept === "endo"
    ? "endo"
    : s.dept === "ortho"
      ? "ortho"
      : s.dept === "implant"
        ? "implant"
        : "general";

/** Where a procedure is on its way from proposed to done. */
export type WorkStage = "proposed" | "approved" | "inProgress" | "done";
export function workStage(s: PlanStep): WorkStage {
  if (s.status === "done") return "done";
  if (s.status === "active" || s.work) return "inProgress";
  return s.approvedAt ? "approved" : "proposed";
}

export const WORK_STAGE_META: Record<
  WorkStage,
  { ar: string; en: string; bg: string; fg: string }
> = {
  proposed: { ar: "مقترح", en: "Proposed", bg: "#F1F5F9", fg: "#64748B" },
  approved: { ar: "وافق المريض", en: "Approved", bg: "#EDE9FE", fg: "#6D28D9" },
  inProgress: { ar: "قيد العلاج", en: "In treatment", bg: "#DBEAFE", fg: "#1D4ED8" },
  done: { ar: "مكتمل", en: "Done", bg: "#D1FAE5", fg: "#047857" },
};

// ---- Root canal options ----

export const ENDO_STAGES = [
  { key: "access", ar: "فتح وتنظيف", en: "Access & cleaning" },
  { key: "shaping", ar: "تشكيل القنوات", en: "Shaping" },
  { key: "obturation", ar: "حشو القنوات", en: "Obturation" },
  { key: "retreatment", ar: "إعادة علاج", en: "Re-treatment" },
  { key: "review", ar: "مراجعة", en: "Review" },
];

export const ENDO_SYSTEMS = [
  "ProTaper Gold",
  "ProTaper Next",
  "WaveOne Gold",
  "Reciproc Blue",
  "HyFlex EDM",
  "TruNatomy",
  "Mtwo",
  "K3XF",
  "Hand K-File",
];

export const ENDO_IRRIGANTS = ["NaOCl", "EDTA 17%", "CHX 2%", "Saline"];
export const NAOCL_STRENGTHS = ["1%", "2.5%", "3%", "5.25%"];
export const ENDO_MEDICAMENTS = [
  { key: "none", ar: "بدون", en: "None" },
  { key: "caoh", ar: "هيدروكسيد الكالسيوم", en: "Ca(OH)₂" },
  { key: "ledermix", ar: "ليدرمكس", en: "Ledermix" },
];
export const ENDO_OBTURATION = [
  { key: "single", ar: "مخروط واحد", en: "Single cone" },
  { key: "lateral", ar: "تكثيف جانبي", en: "Lateral condensation" },
  { key: "warm", ar: "تكثيف عمودي حراري", en: "Warm vertical" },
  { key: "carrier", ar: "حامل حراري", en: "Carrier-based" },
];
export const ENDO_SEALERS = ["AH Plus", "Bioceramic", "ZOE"];
export const ENDO_RESTORATION = [
  { key: "temp", ar: "حشوة مؤقتة", en: "Temporary" },
  { key: "final", ar: "حشوة نهائية", en: "Final filling" },
  { key: "crown", ar: "تحويل للتاج", en: "Refer for crown" },
];

/** Label of a keyed option in the current language. */
export function optionLabel(
  list: { key: string; ar: string; en: string }[],
  key: string | undefined,
  ar: boolean,
): string {
  const o = list.find((x) => x.key === key);
  return o ? (ar ? o.ar : o.en) : "";
}

/** The usual canals of a permanent tooth (FDI), as a starting point. */
export function suggestCanals(tooth: number): string[] {
  const q = Math.floor(tooth / 10);
  const u = tooth % 10;
  if (q < 1 || q > 4 || u < 1 || u > 8) return ["Canal"];
  const upper = q === 1 || q === 2;
  if (upper) {
    if (u === 4) return ["B", "P"];
    if (u === 6) return ["MB", "MB2", "DB", "P"];
    if (u === 7 || u === 8) return ["MB", "DB", "P"];
    return ["Canal"];
  }
  if (u === 6 || u === 7) return ["MB", "ML", "D"];
  if (u === 8) return ["M", "D"];
  return ["Canal"];
}

/** Tooth numbers written on the step, e.g. "16, 17". */
export function stepTeeth(s: Pick<PlanStep, "tooth">): number[] {
  return String(s.tooth || "")
    .split(/[^\d]+/)
    .map(Number)
    .filter((n) => n >= 11 && n <= 85);
}

/** An empty root canal session; canals and choices carry over from the last one. */
export function newEndoSession(s: PlanStep): EndoSession {
  const last = [...(s.work?.sessions ?? [])].reverse().find((x) => x.endo)?.endo;
  if (last) {
    return {
      canals: last.canals.map((c) => ({ ...c })),
      system: last.system,
      apexLocator: last.apexLocator,
      irrigation: last.irrigation ? [...last.irrigation] : undefined,
      naocl: last.naocl,
    };
  }
  const tooth = stepTeeth(s)[0];
  return {
    canals: (tooth ? suggestCanals(tooth) : ["Canal"]).map((name) => ({ name })),
    irrigation: ["NaOCl"],
  };
}

// ---- Actions ----

export function approveStep(patientId: string, stepId: string, approved: boolean) {
  updatePlanStep(patientId, stepId, { approvedAt: approved ? workToday() : undefined });
}

export function startStep(patientId: string, step: PlanStep) {
  const today = workToday();
  updatePlanStep(patientId, step.id, {
    status: "active",
    approvedAt: step.approvedAt || today,
    work: step.work ?? { kind: workKind(step), startedAt: today, sessions: [] },
  });
}

function currentStep(patientId: string, stepId: string): PlanStep | undefined {
  const p = getPatient(patientId);
  return p ? getPlan(p).find((s) => s.id === stepId) : undefined;
}

/** Adds or replaces a session; a new one is also logged as a visit. */
export function saveSession(
  patientId: string,
  stepId: string,
  session: Omit<WorkSession, "id"> & { id?: string },
  ar: boolean,
) {
  const step = currentStep(patientId, stepId);
  if (!step) return;
  const work = step.work ?? { kind: workKind(step), startedAt: workToday(), sessions: [] };
  const isNew = !session.id || !work.sessions.some((x) => x.id === session.id);
  const saved: WorkSession = { ...session, id: session.id || `ws_${Date.now().toString(36)}` };
  const sessions = isNew
    ? [...work.sessions, saved]
    : work.sessions.map((x) => (x.id === saved.id ? saved : x));
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  updatePlanStep(patientId, stepId, {
    status: step.status === "done" ? "done" : "active",
    work: { ...work, sessions },
  });
  if (isNew) {
    const n = sessions.findIndex((x) => x.id === saved.id) + 1;
    addVisit(patientId, {
      date: saved.date,
      procedure: `${step.title}${step.tooth ? ` (${step.tooth})` : ""} — ${ar ? `الجلسة ${n}` : `session ${n}`}`,
      note: saved.note,
      status: "completed",
    });
  }
}

export function removeSession(patientId: string, stepId: string, sessionId: string) {
  const step = currentStep(patientId, stepId);
  if (!step?.work) return;
  updatePlanStep(patientId, stepId, {
    work: { ...step.work, sessions: step.work.sessions.filter((x) => x.id !== sessionId) },
  });
}

/** What finishing a procedure marks on the tooth chart, if anything. */
export function chartStatusFor(s: Pick<PlanStep, "dept">): ToothStatus | null {
  if (s.dept === "endo") return "rct";
  if (s.dept === "implant") return "implant";
  if (s.dept === "fillings") return "filled";
  return null;
}

/** Marks the procedure done and, where it applies, updates its teeth on the chart. */
export function finishStep(patientId: string, stepId: string) {
  const step = currentStep(patientId, stepId);
  if (!step) return;
  updatePlanStep(patientId, stepId, {
    status: "done",
    work: {
      ...(step.work ?? { kind: workKind(step), startedAt: workToday(), sessions: [] }),
      finishedAt: workToday(),
    },
  });
  const mark = chartStatusFor(step);
  if (!mark) return;
  const teeth = new Set(stepTeeth(step));
  if (step.dept === "implant") {
    for (const x of step.work?.sessions ?? [])
      for (const fx of x.implant?.fixtures ?? [])
        stepTeeth({ tooth: fx.site }).forEach((t) => teeth.add(t));
  }
  teeth.forEach((t) => setTooth(patientId, t, mark));
}

export function reopenStep(patientId: string, stepId: string) {
  const step = currentStep(patientId, stepId);
  if (!step) return;
  updatePlanStep(patientId, stepId, {
    status: "active",
    work: step.work ? { ...step.work, finishedAt: undefined } : undefined,
  });
}

/** One line per session for lists, e.g. "Shaping — MB 21 · DB 20.5 mm — WaveOne Gold". */
export function sessionSummary(x: WorkSession, ar: boolean): string {
  if (x.endo) {
    const lengths = x.endo.canals
      .filter((c) => c.length)
      .map((c) => `${c.name} ${c.length}`)
      .join(" · ");
    return [
      optionLabel(ENDO_STAGES, x.endo.stage, ar),
      lengths ? `${lengths} mm` : "",
      x.endo.system ?? "",
    ]
      .filter(Boolean)
      .join(" — ");
  }
  return [x.general?.done, x.general?.materials].filter(Boolean).join(" — ");
}

// ---- Shared option lists ----

export type Option = { key: string; ar: string; en: string };
/** Options whose label is the same in both languages. */
const same = (...keys: string[]): Option[] => keys.map((k) => ({ key: k, ar: k, en: k }));

/** Adds the date `weeks` or `months` after a YYYY-MM-DD day. */
export function addToDate(day: string, by: { weeks?: number; months?: number }): string {
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  if (by.weeks) d.setUTCDate(d.getUTCDate() + by.weeks * 7);
  if (by.months) d.setUTCMonth(d.getUTCMonth() + by.months);
  return d.toISOString().slice(0, 10);
}

// ---- Orthodontics ----

export const ORTHO_TYPES: Option[] = [
  { key: "setup", ar: "تركيب الجهاز", en: "Bonding / setup" },
  { key: "adjust", ar: "متابعة وشد", en: "Adjustment" },
  { key: "aligner", ar: "متابعة الشفاف", en: "Aligner check" },
  { key: "debond", ar: "فك وتثبيت", en: "Debond & retention" },
];
export const ORTHO_APPLIANCES: Option[] = [
  { key: "metal", ar: "معدني", en: "Metal" },
  { key: "ceramic", ar: "خزفي", en: "Ceramic" },
  { key: "selfLigating", ar: "ذاتي الربط", en: "Self-ligating" },
  { key: "aligners", ar: "شفاف (Aligners)", en: "Clear aligners" },
  { key: "removable", ar: "متحرك", en: "Removable" },
];
export const ORTHO_ARCHES: Option[] = [
  { key: "upper", ar: "العلوي", en: "Upper" },
  { key: "lower", ar: "السفلي", en: "Lower" },
  { key: "both", ar: "الفكان", en: "Both" },
];
export const ORTHO_PRESCRIPTIONS = same("MBT", "Roth", "Damon");
export const ORTHO_SLOTS = same("0.022", "0.018");
export const MOLAR_CLASSES = same("Class I", "Class II/1", "Class II/2", "Class III");
export const ORTHO_ANCHORAGE: Option[] = [
  { key: "none", ar: "بدون", en: "None" },
  { key: "tads", ar: "TADs", en: "TADs" },
  { key: "tpa", ar: "TPA", en: "TPA" },
  { key: "headgear", ar: "Headgear", en: "Headgear" },
];
export const ORTHO_VISITS: Option[] = [
  { key: "adjust", ar: "شد", en: "Activation" },
  { key: "wire", ar: "تغيير سلك", en: "Wire change" },
  { key: "rebond", ar: "إعادة لصق براكت", en: "Rebond" },
  { key: "emergency", ar: "طارئة", en: "Emergency" },
];
export const WIRE_MATERIALS = same("NiTi", "HA NiTi", "SS", "TMA");
export const WIRE_SIZES = same("0.012", "0.014", "0.016", "0.018", "16×22", "17×25", "19×25");
export const ELASTIC_TYPES = same("Class II", "Class III", "Box", "Crossbite", "Triangle");
export const ELASTIC_SIZES = same('1/8"', '3/16"', '1/4"', '5/16"');
export const ELASTIC_FORCES: Option[] = [
  { key: "light", ar: "خفيف", en: "Light" },
  { key: "medium", ar: "متوسط", en: "Medium" },
  { key: "heavy", ar: "قوي", en: "Heavy" },
];
export const WEAR_HOURS = same("12", "20", "22");
export const ORTHO_EXTRAS: Option[] = [
  { key: "powerChain", ar: "Power chain", en: "Power chain" },
  { key: "openCoil", ar: "نابض فتح", en: "Open coil" },
  { key: "closedCoil", ar: "نابض غلق", en: "Closed coil" },
  { key: "tads", ar: "TADs", en: "TADs" },
  { key: "biteTurbos", ar: "رافع عضة", en: "Bite turbos" },
];
export const HYGIENE: Option[] = [
  { key: "good", ar: "جيدة", en: "Good" },
  { key: "fair", ar: "متوسطة", en: "Fair" },
  { key: "poor", ar: "سيئة", en: "Poor" },
];
export const NEXT_WEEKS = same("3", "4", "6", "8");
export const RETAINERS: Option[] = [
  { key: "bonded", ar: "سلك ملصوق 3-3", en: "Bonded 3-3" },
  { key: "essix", ar: "Essix شفاف", en: "Essix" },
  { key: "hawley", ar: "Hawley", en: "Hawley" },
];

function lastOf<K extends "ortho" | "implant">(
  s: PlanStep,
  k: K,
): NonNullable<WorkSession[K]> | undefined {
  return [...(s.work?.sessions ?? [])].reverse().find((x) => x[k])?.[k] as
    NonNullable<WorkSession[K]> | undefined;
}

/** The setup session of an orthodontic case, if recorded. */
export const orthoSetup = (s: PlanStep) =>
  (s.work?.sessions ?? []).find((x) => x.ortho?.type === "setup");

/** A new orthodontic visit: the first is the setup, then adjustments carry the wires over. */
export function newOrthoSession(s: PlanStep, type?: string): OrthoSession {
  const setup = orthoSetup(s)?.ortho;
  const last = lastOf(s, "ortho");
  const t = type ?? (!setup ? "setup" : setup.appliance === "aligners" ? "aligner" : "adjust");
  if (t === "setup")
    return { type: t, appliance: "metal", arches: "both", prescription: "MBT", slot: "0.022" };
  if (t === "aligner")
    return {
      type: t,
      alignerNo: last?.alignerNo ? String(Number(last.alignerNo) + 1 || "") : "",
      alignerTotal: last?.alignerTotal,
      wearHours: last?.wearHours ?? "22",
      nextWeeks: last?.nextWeeks,
    };
  if (t === "debond") return { type: t, retainers: ["bonded"] };
  return {
    type: t,
    visit: "adjust",
    upper: last?.upper ? { ...last.upper } : undefined,
    lower: last?.lower ? { ...last.lower } : undefined,
    elasticType: last?.elasticType,
    elasticSize: last?.elasticSize,
    elasticForce: last?.elasticForce,
    elasticHours: last?.elasticHours,
    nextWeeks: last?.nextWeeks ?? "4",
  };
}

/** Months since the setup, and the estimate, for the progress bar. */
export function orthoProgress(s: PlanStep): { month: number; of: number } | null {
  const setup = orthoSetup(s);
  const of = Number(setup?.ortho?.months);
  if (!setup || !of) return null;
  const from = new Date(`${setup.date}T12:00:00Z`).getTime();
  const month = Math.max(1, Math.floor((Date.now() - from) / (30.44 * 86400000)) + 1);
  return { month: Math.min(month, 99), of };
}

const wireText = (w?: OrthoWire) => [w?.size, w?.material].filter(Boolean).join(" ");

// ---- Implants ----

export const IMPLANT_TYPES: Option[] = [
  { key: "surgery", ar: "وضع الزرعة", en: "Placement" },
  { key: "uncover", ar: "الكشف", en: "Uncovery" },
  { key: "prosthetic", ar: "التركيب", en: "Prosthetic" },
  { key: "followup", ar: "متابعة", en: "Follow-up" },
];
export const IMPLANT_TIMING: Option[] = [
  { key: "immediate", ar: "فوري", en: "Immediate" },
  { key: "early", ar: "مبكر", en: "Early" },
  { key: "delayed", ar: "متأخر", en: "Delayed" },
];
export const IMPLANT_FLAP: Option[] = [
  { key: "flap", ar: "بشق", en: "Flap" },
  { key: "flapless", ar: "بدون شق", en: "Flapless" },
];
export const BONE_TYPES = same("D1", "D2", "D3", "D4");
export const GRAFTS: Option[] = [
  { key: "none", ar: "بدون", en: "None" },
  { key: "xeno", ar: "Xenograft", en: "Xenograft" },
  { key: "allo", ar: "Allograft", en: "Allograft" },
  { key: "auto", ar: "ذاتي (Autograft)", en: "Autograft" },
  { key: "synthetic", ar: "صناعي", en: "Synthetic" },
];
export const MEMBRANES: Option[] = [
  { key: "none", ar: "بدون", en: "None" },
  { key: "resorbable", ar: "قابل للامتصاص", en: "Resorbable" },
  { key: "nonResorbable", ar: "غير قابل للامتصاص", en: "Non-resorbable" },
];
export const SINUS_LIFT: Option[] = [
  { key: "none", ar: "بدون", en: "None" },
  { key: "lateral", ar: "جانبي", en: "Lateral" },
  { key: "crestal", ar: "عبر الحافة", en: "Crestal" },
];
export const CLOSURE: Option[] = [
  { key: "cover", ar: "غطاء (Cover screw)", en: "Cover screw" },
  { key: "healing", ar: "Healing abutment", en: "Healing abutment" },
];
export const LOADING_MONTHS = same("0", "2", "3", "4", "6");
export const GINGIVA: Option[] = [
  { key: "healthy", ar: "سليمة", en: "Healthy" },
  { key: "inflamed", ar: "ملتهبة", en: "Inflamed" },
];
export const IMPRESSIONS: Option[] = [
  { key: "open", ar: "طبعة مفتوحة", en: "Open tray" },
  { key: "closed", ar: "طبعة مغلقة", en: "Closed tray" },
  { key: "digital", ar: "مسح رقمي", en: "Digital scan" },
];
export const ABUTMENTS: Option[] = [
  { key: "stock", ar: "جاهزة", en: "Stock" },
  { key: "custom", ar: "مخصصة", en: "Custom" },
  { key: "multiunit", ar: "Multi-unit", en: "Multi-unit" },
  { key: "tibase", ar: "Ti-base", en: "Ti-base" },
];
export const RETENTION: Option[] = [
  { key: "screw", ar: "بالبرغي", en: "Screw-retained" },
  { key: "cement", ar: "بالإسمنت", en: "Cemented" },
];
export const CROWN_MATERIALS = same("Zirconia", "E.max", "PFM", "PMMA");
export const PAIN: Option[] = [
  { key: "none", ar: "لا يوجد", en: "None" },
  { key: "mild", ar: "خفيف", en: "Mild" },
  { key: "severe", ar: "شديد", en: "Severe" },
];
/** Common systems, offered as suggestions next to the ones listed in the app. */
export const COMMON_IMPLANT_SYSTEMS = [
  "Straumann",
  "Nobel Biocare",
  "Osstem",
  "Dentium",
  "MegaGen",
  "Neodent",
  "Zimmer",
  "BioHorizons",
  "Alpha-Bio",
  "MIS",
];

/** A new implant session: placement first, later ones carry the implants over. */
export function newImplantSession(s: PlanStep, type?: string): ImplantSession {
  const done = new Set((s.work?.sessions ?? []).map((x) => x.implant?.type).filter(Boolean));
  const surgery = [...(s.work?.sessions ?? [])].find((x) => x.implant?.type === "surgery")?.implant;
  const t =
    type ??
    (!surgery
      ? "surgery"
      : surgery.closure === "cover" && !done.has("uncover")
        ? "uncover"
        : !done.has("prosthetic")
          ? "prosthetic"
          : "followup");
  if (t === "surgery") {
    const teeth = stepTeeth(s);
    return {
      type: t,
      fixtures: (teeth.length ? teeth : [0]).map((n) => ({ site: n ? String(n) : "" })),
      closure: "cover",
      loadingMonths: "3",
    };
  }
  // Later sessions keep the sites and the implant details, without this visit's readings.
  const fixtures = (surgery?.fixtures ?? stepTeeth(s).map((n): ImplantFixture => ({ site: String(n) }))).map(
    (fx) => ({
      site: fx.site,
      brand: fx.brand,
      diameter: fx.diameter,
      length: fx.length,
    }),
  );
  return { type: t, fixtures };
}

/** Expected loading day: placement day plus the healing months. */
export function implantLoadingDate(s: PlanStep): string {
  const x = (s.work?.sessions ?? []).find((y) => y.implant?.type === "surgery");
  const months = Number(x?.implant?.loadingMonths);
  return x && months ? addToDate(x.date, { months }) : "";
}

const fixtureText = (fx: ImplantFixture) =>
  [
    fx.site,
    [fx.brand, fx.diameter && fx.length ? `${fx.diameter}×${fx.length}` : ""]
      .filter(Boolean)
      .join(" "),
  ]
    .filter(Boolean)
    .join(": ");

/** Short lines describing a session, for its card. */
export function sessionLines(x: WorkSession, ar: boolean): string[] {
  const o = x.ortho;
  if (o) {
    if (o.type === "setup")
      return [
        [
          optionLabel(ORTHO_APPLIANCES, o.appliance, ar),
          optionLabel(ORTHO_ARCHES, o.arches, ar),
          o.prescription,
          o.slot,
        ]
          .filter(Boolean)
          .join(" · "),
        [o.molarClass, o.overjet ? `OJ ${o.overjet}mm` : "", o.overbite ? `OB ${o.overbite}mm` : ""]
          .filter(Boolean)
          .join(" · "),
        o.extractions ? `${ar ? "قلع" : "Extractions"}: ${o.extractions}` : "",
        o.months ? (ar ? `المدة المتوقعة ${o.months} شهر` : `Estimated ${o.months} months`) : "",
      ].filter(Boolean);
    if (o.type === "aligner")
      return [
        o.alignerNo ? `Aligner ${o.alignerNo}${o.alignerTotal ? ` / ${o.alignerTotal}` : ""}` : "",
        [
          o.attachments ? "Attachments" : "",
          o.ipr ? `IPR ${o.ipr}` : "",
          o.wearHours ? `${o.wearHours} h/day` : "",
        ]
          .filter(Boolean)
          .join(" · "),
      ].filter(Boolean);
    if (o.type === "debond")
      return [(o.retainers ?? []).map((r) => optionLabel(RETAINERS, r, ar)).join(" + ")].filter(
        Boolean,
      );
    return [
      [
        wireText(o.upper) ? `U ${wireText(o.upper)}` : "",
        wireText(o.lower) ? `L ${wireText(o.lower)}` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      [
        o.elasticType,
        o.elasticSize,
        optionLabel(ELASTIC_FORCES, o.elasticForce, ar),
        o.elasticHours ? `${o.elasticHours}h` : "",
      ]
        .filter(Boolean)
        .join(" "),
      [...(o.extras ?? []).map((e) => optionLabel(ORTHO_EXTRAS, e, ar)), o.extrasNote ?? ""]
        .filter(Boolean)
        .join(" · "),
    ].filter(Boolean);
  }
  const im = x.implant;
  if (im) {
    const fixtures = im.fixtures
      .filter((fx) => fx.site)
      .map(fixtureText)
      .join(" — ");
    if (im.type === "surgery")
      return [
        fixtures,
        [
          optionLabel(IMPLANT_TIMING, im.timing, ar),
          optionLabel(IMPLANT_FLAP, im.flap, ar),
          im.guided ? (ar ? "دليل جراحي" : "Guided") : "",
        ]
          .filter(Boolean)
          .join(" · "),
        [
          im.graft && im.graft !== "none"
            ? `${ar ? "طعم" : "Graft"}: ${optionLabel(GRAFTS, im.graft, ar)}`
            : "",
          im.sinus && im.sinus !== "none"
            ? `${ar ? "رفع الجيب" : "Sinus lift"}: ${optionLabel(SINUS_LIFT, im.sinus, ar)}`
            : "",
          optionLabel(CLOSURE, im.closure, ar),
        ]
          .filter(Boolean)
          .join(" · "),
      ].filter(Boolean);
    if (im.type === "prosthetic")
      return [
        [
          optionLabel(IMPRESSIONS, im.impression, ar),
          optionLabel(ABUTMENTS, im.abutment, ar),
          optionLabel(RETENTION, im.retention, ar),
        ]
          .filter(Boolean)
          .join(" · "),
        [im.crown, im.shade].filter(Boolean).join(" "),
      ].filter(Boolean);
    if (im.type === "uncover")
      return [
        im.fixtures
          .filter((fx) => fx.isq)
          .map((fx) => `${fx.site}: ISQ ${fx.isq}`)
          .join(" · "),
        [im.healingSize ? `Healing ${im.healingSize}` : "", optionLabel(GINGIVA, im.gingiva, ar)]
          .filter(Boolean)
          .join(" · "),
      ].filter(Boolean);
    return [
      [
        im.pain ? `${ar ? "الألم" : "Pain"}: ${optionLabel(PAIN, im.pain, ar)}` : "",
        optionLabel(GINGIVA, im.gingiva, ar),
        im.boneLoss ? `${ar ? "فقدان العظم" : "Bone loss"} ${im.boneLoss}mm` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ].filter(Boolean);
  }
  const line = sessionSummary(x, ar);
  return line ? [line] : [];
}

/** The type label shown next to a session number. */
export function sessionTypeLabel(x: WorkSession, ar: boolean): string {
  if (x.endo) return optionLabel(ENDO_STAGES, x.endo.stage, ar);
  if (x.ortho) return optionLabel(ORTHO_TYPES, x.ortho.type, ar);
  if (x.implant) return optionLabel(IMPLANT_TYPES, x.implant.type, ar);
  return "";
}
