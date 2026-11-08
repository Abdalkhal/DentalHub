// Clinic materials. Identical in the web app and the native app
// (src/lib/materialsStore.ts). Local storage is the instant cache; every change
// also syncs to dentist_records/{uid}/materials/{id}, so the stock is the same on
// every device and survives reinstalling. Materials used to live on one device.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { collection, doc, getDoc, onSnapshot, query, setDoc, where, type QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { RECORDS, toFirestore } from "./dentistRecords";
import { useDentistOrders } from "./orders";

export type MaterialStatus = "available" | "half" | "low" | "out";

export type Material = {
  id: string;
  name: string;
  category: string; // the supply section's key, e.g. "operative"
  subCategory?: string;
  qty: number;
  minQty: number;
  unit: string;
  price: number;
  expiryDate: string;
  batchNumber: string;
  supplierName: string;
  storageLocation: string;
  productId?: string;
  image?: string;
  status: MaterialStatus;
  statusAt: number;
  lastRestockAt: number;
  restockQty: number;
  // How long past quantities lasted: what "enough for about a month" comes from.
  cycles: { days: number; qty: number }[];
  createdAt: string;
  updatedAt: number;
};

export type MaterialMeta = {
  leadDays: number; // warn this long before a material runs out
  expiryDays: number; // and this long before it expires
  reviewDays: number; // ask about materials not updated for this long; 0 = off
  imported: string[]; // order lines already in the stock
  ignored: string[]; // order lines the doctor dismissed
  seen: string[]; // alerts the doctor has already seen
};

export const DEFAULT_META: MaterialMeta = { leadDays: 30, expiryDays: 60, reviewDays: 30, imported: [], ignored: [], seen: [] };

/** Same sections as the medical supplies, so a purchase lands in its own. */
export const MATERIAL_SECTIONS: { id: string; ar: string; en: string }[] = [
  { id: "general", ar: "مواد عامة", en: "General" },
  { id: "operative", ar: "معالجة الأسنان", en: "Operative" },
  { id: "endodontic", ar: "علاج الجذور", en: "Endodontics" },
  { id: "prosthodontic", ar: "التركيبات", en: "Prosthodontics" },
  { id: "surgery", ar: "جراحة الفم", en: "Surgery" },
  { id: "orthopedic", ar: "تقويم الأسنان", en: "Orthodontics" },
  { id: "pedodontic", ar: "أسنان الأطفال", en: "Pedodontics" },
  { id: "periodontic", ar: "علاج اللثة", en: "Periodontics" },
  { id: "equipment", ar: "معدات", en: "Equipment" },
  { id: "burs", ar: "مبردات الأسنان", en: "Burs" },
  { id: "sterilization", ar: "مواد التعقيم", en: "Sterilization" },
  { id: "oral-care", ar: "العناية بالفم", en: "Oral care" },
  { id: "apparel", ar: "ملابس وأزياء", en: "Apparel" },
  { id: "training", ar: "التعلم والتدريب", en: "Training" },
  { id: "maintenance", ar: "مواد الصيانة", en: "Maintenance" },
  { id: "lab-materials", ar: "مواد المختبر", en: "Lab materials" },
];
const knownSection = (id: string | undefined) => (MATERIAL_SECTIONS.some((s) => s.id === id) ? (id as string) : "general");

const LEGACY_SECTION: Record<string, { category: string; subCategory?: string }> = {
  consumables: { category: "general" },
  composite: { category: "operative", subCategory: "كومبوزيت" },
  anesthesia: { category: "surgery" },
  impression: { category: "prosthodontic" },
  other: { category: "general" },
};

const DAY = 24 * 60 * 60 * 1000;

/* ── What needs attention (pure) ───────────────────────────────── */

/** Days until it runs out, once a past quantity has shown how fast it goes. */
export function daysLeft(m: Material, now: number): number | null {
  if (m.status === "out") return 0;
  const recent = (m.cycles ?? []).filter((c) => c.days > 0 && c.qty > 0).slice(-3);
  if (recent.length === 0 || !m.lastRestockAt) return null;
  const perUnit = recent.reduce((s, c) => s + c.days / c.qty, 0) / recent.length;
  const total = perUnit * Math.max(m.restockQty || m.qty, 1);
  return Math.max(0, Math.round(total - (now - m.lastRestockAt) / DAY));
}

export const expiryDaysLeft = (m: Material, now: number): number | null => {
  const t = m.expiryDate ? Date.parse(m.expiryDate) : NaN;
  return Number.isNaN(t) ? null : Math.ceil((t - now) / DAY);
};

export type AttentionReason = "out" | "low" | "soon" | "expired" | "expiring";

export function attentionOf(m: Material, meta: Pick<MaterialMeta, "leadDays" | "expiryDays">, now: number): AttentionReason | null {
  const exp = expiryDaysLeft(m, now);
  if (exp !== null && exp < 0) return "expired";
  if (m.status === "out") return "out";
  if (m.status === "low" || (m.minQty > 0 && m.qty <= m.minQty)) return "low";
  const left = daysLeft(m, now);
  if (left !== null && left <= meta.leadDays) return "soon";
  if (exp !== null && exp <= meta.expiryDays) return "expiring";
  return null;
}

/** Materials no one has updated for a while: the quick check-up. */
export function needsReview(m: Material, reviewDays: number, now: number): boolean {
  if (reviewDays <= 0 || m.status === "out") return false;
  return now - Math.max(m.statusAt || 0, m.lastRestockAt || 0) > reviewDays * DAY;
}

/** The number on the icon: alerts not seen yet. Seen ones stay seen until the
 *  material recovers (see pruneSeen), so one shortage doesn't nag twice. */
export function unseenAlerts(list: Material[], meta: MaterialMeta, now: number): string[] {
  return list.filter((m) => attentionOf(m, meta, now) && !meta.seen.includes(m.id)).map((m) => m.id);
}
export function pruneSeen(list: Material[], meta: MaterialMeta, now: number): string[] {
  const active = new Set(list.filter((m) => attentionOf(m, meta, now)).map((m) => m.id));
  return meta.seen.filter((id) => active.has(id));
}

/** Words for how long it lasts: "نحو 3 أسابيع". */
export function durationText(days: number, ar: boolean): string {
  if (days >= 60) return ar ? `نحو ${Math.round(days / 30)} أشهر` : `about ${Math.round(days / 30)} months`;
  if (days >= 28) return ar ? "نحو شهر" : "about a month";
  if (days >= 14) return ar ? `نحو ${Math.round(days / 7)} أسابيع` : `about ${Math.round(days / 7)} weeks`;
  if (days >= 7) return ar ? "نحو أسبوع" : "about a week";
  if (days >= 2) return ar ? `${days} أيام` : `${days} days`;
  return ar ? "يوم واحد" : "a day";
}

export function statusLine(m: Material, meta: MaterialMeta, now: number, ar: boolean): { text: string; tone: "bad" | "warn" | "ok" | "muted" } {
  const exp = expiryDaysLeft(m, now);
  if (exp !== null && exp < 0) return { text: ar ? "انتهت صلاحيتها" : "Expired", tone: "bad" };
  if (m.status === "out") return { text: ar ? "نفدت" : "Out of stock", tone: "bad" };
  if (m.status === "low") return { text: ar ? "قاربت على النفاد" : "Running low", tone: "bad" };
  if (m.minQty > 0 && m.qty <= m.minQty) return { text: ar ? "وصلت للحد الأدنى" : "At minimum", tone: "bad" };
  const left = daysLeft(m, now);
  if (left !== null && left <= meta.leadDays) return { text: ar ? `تكفي ${durationText(left, true)}` : `Lasts ${durationText(left, false)}`, tone: "bad" };
  if (exp !== null && exp <= meta.expiryDays) return { text: ar ? `تنتهي صلاحيتها خلال ${exp} يوماً` : `Expires in ${exp} days`, tone: "warn" };
  if (left !== null) return { text: ar ? `تكفي ${durationText(left, true)}` : `Lasts ${durationText(left, false)}`, tone: "ok" };
  if (m.status === "half") return { text: ar ? "نصفها تقريباً" : "About half left", tone: "muted" };
  return { text: ar ? "متوفرة" : "In stock", tone: "muted" };
}

/* ── State ─────────────────────────────────────────────────────── */

const KEY_PREFIX = "dh_materials_v1:";
const LEGACY_PREFIX = "dh_clinic_v3:";
let currentUserId = "";
let currentClinicId = "";
let state: Material[] = [];
let meta: MaterialMeta = DEFAULT_META;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const keyFor = (uid: string, clinicId: string) => `${KEY_PREFIX}${uid || "guest"}:${clinicId || "default"}`;
const getKey = () => keyFor(currentUserId, currentClinicId);
const metaKey = () => `${getKey()}:meta`;
const deletedKey = () => `${getKey()}:deleted`;

function normalize(m: Partial<Material> & { id: string; name: string }): Material {
  const legacy = LEGACY_SECTION[m.category ?? ""];
  const qty = Math.max(0, Number(m.qty) || 0);
  const createdAt = m.createdAt ?? new Date().toISOString();
  const started = Date.parse(createdAt) || Date.now();
  return {
    unit: "",
    price: 0,
    expiryDate: "",
    batchNumber: "",
    supplierName: "",
    storageLocation: "",
    minQty: 0,
    ...m,
    category: legacy ? legacy.category : knownSection(m.category),
    ...(legacy?.subCategory && !m.subCategory ? { subCategory: legacy.subCategory } : {}),
    qty,
    status: m.status ?? (qty === 0 ? "out" : "available"),
    statusAt: m.statusAt ?? started,
    lastRestockAt: m.lastRestockAt ?? started,
    restockQty: m.restockQty ?? qty,
    cycles: m.cycles ?? [],
    createdAt,
    updatedAt: m.updatedAt ?? started,
  };
}

function load(): Material[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(getKey());
    if (raw) return (JSON.parse(raw) as Material[]).map(normalize);
    // First run after materials moved here: bring over what this device had.
    // The old copy is left where it is.
    const old = JSON.parse(localStorage.getItem(`${LEGACY_PREFIX}${currentUserId || "guest"}:${currentClinicId}`) || "{}") as { materials?: Material[] };
    return (old.materials ?? []).map(normalize);
  } catch {
    return [];
  }
}

function ensure() {
  if (loaded || typeof window === "undefined") return;
  state = load();
  try {
    meta = { ...DEFAULT_META, ...(JSON.parse(localStorage.getItem(metaKey()) || "{}") as Partial<MaterialMeta>) };
  } catch {
    meta = DEFAULT_META;
  }
  loaded = true;
  // Anything brought over from the old device-only storage goes up.
  for (const m of state) schedulePush(m.id);
}

function saveLocal() {
  try {
    localStorage.setItem(getKey(), JSON.stringify(state));
  } catch {
    /* the cloud copy still has it */
  }
  emit();
}

export function setMaterialsStoreUser(uid: string, clinicId: string) {
  if (uid === currentUserId && clinicId === currentClinicId && loaded) return;
  flushPushes();
  currentUserId = uid;
  currentClinicId = clinicId;
  loaded = false;
  state = [];
  meta = DEFAULT_META;
  startSync();
  emit();
}

const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
const EMPTY: Material[] = [];

export function useMaterials(): Material[] {
  return useSyncExternalStore(subscribe, () => { ensure(); return state; }, () => EMPTY);
}
export function useMaterialMeta(): MaterialMeta {
  return useSyncExternalStore(subscribe, () => { ensure(); return meta; }, () => DEFAULT_META);
}

/** The red number on the clinic and materials icons. */
export function useMaterialsBadge(): number {
  const list = useMaterials();
  const m = useMaterialMeta();
  return useMemo(() => unseenAlerts(list, m, Date.now()).length, [list, m]);
}

/* ── Changes ───────────────────────────────────────────────────── */

function patch(id: string, p: Partial<Material>) {
  ensure();
  state = state.map((m) => (m.id === id ? { ...m, ...p, updatedAt: Date.now() } : m));
  saveLocal();
  schedulePush(id);
}

const newId = () => `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function addMaterial(input: Omit<Partial<Material>, "id"> & { name: string; qty: number; category: string }): Material {
  ensure();
  const now = Date.now();
  const m = normalize({ minQty: 1, ...input, id: newId(), restockQty: input.qty, lastRestockAt: now, statusAt: now, updatedAt: now });
  state = [m, ...state];
  saveLocal();
  schedulePush(m.id);
  return m;
}

export function updateMaterial(id: string, p: Partial<Material>) {
  patch(id, p);
}

/** A finished quantity teaches how long this much lasts here. */
function finishedCycle(m: Material, now: number): Material["cycles"] {
  const days = Math.round((now - (m.lastRestockAt || now)) / DAY);
  const qty = m.restockQty || m.qty;
  return days >= 1 && qty > 0 ? [...(m.cycles ?? []), { days, qty }].slice(-6) : m.cycles ?? [];
}

/** One tap, no counting: the doctor says how it stands. */
export function setMaterialStatus(id: string, status: MaterialStatus) {
  ensure();
  const m = state.find((x) => x.id === id);
  if (!m) return;
  const now = Date.now();
  const full = Math.max(m.restockQty || m.qty, 1);
  if (status === "out") {
    patch(id, { status, statusAt: now, qty: 0, cycles: m.status === "out" ? m.cycles : finishedCycle(m, now) });
  } else if (status === "available") {
    const refilled = m.status === "out";
    patch(id, { status, statusAt: now, qty: refilled || m.qty === 0 ? full : m.qty, ...(refilled ? { lastRestockAt: now, restockQty: full } : {}) });
  } else {
    patch(id, { status, statusAt: now, qty: Math.max(1, Math.ceil(full * (status === "half" ? 0.5 : 0.2))) });
  }
}

export function adjustMaterialQty(id: string, delta: number) {
  ensure();
  const m = state.find((x) => x.id === id);
  if (!m) return;
  const qty = Math.max(0, m.qty + delta);
  if (qty === 0) return setMaterialStatus(id, "out");
  const now = Date.now();
  const refilled = m.status === "out";
  patch(id, {
    qty,
    statusAt: now,
    ...(refilled ? { status: "available" as const, lastRestockAt: now, restockQty: qty } : {}),
    // Counting by hand again: an old "half" or "low" no longer describes it.
    ...(!refilled && delta > 0 ? { status: "available" as const, restockQty: Math.max(m.restockQty, qty) } : {}),
  });
}

export function confirmMaterial(id: string) {
  patch(id, { statusAt: Date.now() });
}

export function removeMaterial(id: string) {
  ensure();
  state = state.filter((m) => m.id !== id);
  saveLocal();
  pushDelete(id);
}

export function setMaterialMeta(p: Partial<MaterialMeta>) {
  ensure();
  meta = { ...meta, ...p };
  try {
    localStorage.setItem(metaKey(), JSON.stringify(meta));
  } catch {
    /* the cloud copy still has it */
  }
  emit();
  if (syncEnabled() && currentClinicId) {
    setDoc(metaDoc(currentUserId, currentClinicId), toFirestore(meta), { merge: true }).catch((err) =>
      console.warn("Materials settings not synced yet:", err),
    );
  }
}

/** Opening the page clears the number, and only that: the rows stay marked. */
export function markMaterialsSeen() {
  ensure();
  const now = Date.now();
  const seen = state.filter((m) => attentionOf(m, meta, now)).map((m) => m.id);
  if (seen.length === meta.seen.length && seen.every((id) => meta.seen.includes(id))) return;
  setMaterialMeta({ seen });
}

/* ── From purchases ────────────────────────────────────────────── */

export type ImportLine = {
  key: string; // orderId:index
  orderId: string;
  productId: string;
  name: string;
  qty: number;
  category: string;
  subCategory?: string;
  image?: string;
  supplierName: string;
  price: number;
  orderedAt: number;
  existing?: Material;
};

/** Lines of confirmed orders that aren't in the stock and weren't dismissed. */
export function pendingLines(
  orders: { id: string; status: string; supplierId: string; createdAt: { toMillis?: () => number }; items: { productId: string; name: string; quantity: number; price: number; availability?: string }[] }[],
  m: Pick<MaterialMeta, "imported" | "ignored">,
): Omit<ImportLine, "category" | "subCategory" | "image" | "supplierName">[] {
  const done = new Set([...m.imported, ...m.ignored]);
  const out: Omit<ImportLine, "category" | "subCategory" | "image" | "supplierName">[] = [];
  for (const o of orders) {
    if (o.status !== "confirmed") continue;
    o.items.forEach((it, i) => {
      const key = `${o.id}:${i}`;
      if (done.has(key) || it.availability === "not_available") return;
      out.push({ key, orderId: o.id, productId: it.productId, name: it.name, qty: it.quantity, price: it.price, orderedAt: o.createdAt?.toMillis?.() ?? 0 });
    });
  }
  return out;
}

/** What was bought and is waiting to go in the stock, with its section. */
export function useMaterialImports(uid: string | undefined) {
  const { data: orders = [], isLoading } = useDentistOrders(uid);
  const m = useMaterialMeta();
  const list = useMaterials();
  const base = useMemo(() => pendingLines(orders as never, m), [orders, m]);
  const [details, setDetails] = useState<Record<string, { category: string; subCategory?: string; image?: string; supplierName: string }>>({});
  const missing = useMemo(() => {
    const need = new Set<string>();
    for (const l of base) if (l.productId && !details[l.productId]) need.add(l.productId);
    return [...need].join(",");
  }, [base, details]);

  useEffect(() => {
    if (!missing) return;
    let live = true;
    void (async () => {
      const found: typeof details = {};
      const bySupplier = new Map((orders as { items: { productId: string }[]; supplierId: string }[]).flatMap((o) => o.items.map((i) => [i.productId, o.supplierId] as const)));
      for (const id of missing.split(",")) {
        try {
          const [p, card] = await Promise.all([
            getDoc(doc(db, "products", id)),
            bySupplier.get(id) ? getDoc(doc(db, "public_profiles", bySupplier.get(id) as string)) : null,
          ]);
          const d = p.exists() ? (p.data() as { branch?: string; subCategory?: string; images?: string[] }) : {};
          const c = card?.exists() ? (card.data() as { name?: string; clinicName?: string }) : {};
          found[id] = { category: knownSection(d.branch), subCategory: d.subCategory, image: d.images?.[0], supplierName: c.name || c.clinicName || "" };
        } catch {
          // A deleted product still goes in the stock; the doctor can pick its section.
          found[id] = { category: "general", supplierName: "" };
        }
      }
      if (live) setDetails((cur) => ({ ...cur, ...found }));
    })();
    return () => {
      live = false;
    };
  }, [missing, orders]);

  const lines: ImportLine[] = useMemo(
    () =>
      base.map((l) => ({
        ...l,
        ...(details[l.productId] ?? { category: "general", supplierName: "" }),
        existing: list.find((x) => x.productId && x.productId === l.productId),
      })),
    [base, details, list],
  );
  return { lines, loading: isLoading };
}

/**
 * Adds the chosen lines to the stock. A product already there gains quantity
 * rather than a second row; `finished` says its previous quantity had run out,
 * which also teaches how long it lasted.
 */
export function importMaterials(chosen: (ImportLine & { finished?: boolean; expiryDate?: string })[]) {
  ensure();
  const now = Date.now();
  for (const l of chosen) {
    const existing = state.find((x) => x.productId && x.productId === l.productId);
    if (existing) {
      const wasOut = l.finished || existing.status === "out";
      const cycles = l.finished && existing.status !== "out" ? finishedCycle(existing, now) : existing.cycles;
      const qty = (wasOut ? 0 : existing.qty) + l.qty;
      patch(existing.id, {
        qty,
        status: "available",
        statusAt: now,
        cycles,
        lastRestockAt: wasOut ? now : existing.lastRestockAt,
        restockQty: wasOut ? qty : Math.max(existing.restockQty, qty),
        ...(l.expiryDate ? { expiryDate: l.expiryDate } : {}),
      });
    } else {
      addMaterial({
        name: l.name,
        qty: l.qty,
        category: l.category,
        subCategory: l.subCategory,
        productId: l.productId,
        image: l.image,
        supplierName: l.supplierName,
        price: l.price,
        expiryDate: l.expiryDate ?? "",
      });
    }
  }
  setMaterialMeta({ imported: [...new Set([...meta.imported, ...chosen.map((l) => l.key)])] });
}

export function ignoreLines(keys: string[]) {
  ensure();
  setMaterialMeta({ ignored: [...new Set([...meta.ignored, ...keys])] });
}

/* ── Cloud sync: same scheme as appointmentsStore.ts ───────────── */

type Remote = Material & { clinicId?: string; deleted?: boolean };
const materialsCol = (uid: string) => collection(db, RECORDS, uid, "materials");
const materialDoc = (uid: string, id: string) => doc(db, RECORDS, uid, "materials", id);
const metaDoc = (uid: string, clinicId: string) => doc(db, RECORDS, uid, "material_settings", clinicId);

const PUSH_DELAY_MS = 800;
const pushTimers = new Map<string, ReturnType<typeof setTimeout>>();
let unsubscribe: (() => void) | null = null;
let unsubscribeMeta: (() => void) | null = null;
let syncReady = false;
const syncEnabled = () => !!currentUserId && syncReady && typeof window !== "undefined";

export function setMaterialsSyncReady(ready: boolean) {
  const was = syncReady;
  syncReady = ready;
  if (ready && !was) startSync();
  if (!ready) stopSync();
}

export function resyncMaterials() {
  if (syncEnabled()) startSync();
}

function schedulePush(id: string) {
  if (!syncEnabled() || !currentClinicId) return;
  const key = `${currentUserId}|${currentClinicId}|${id}`;
  const prev = pushTimers.get(key);
  if (prev) clearTimeout(prev);
  pushTimers.set(
    key,
    setTimeout(() => {
      pushTimers.delete(key);
      void push(key);
    }, PUSH_DELAY_MS),
  );
}

function flushPushes() {
  for (const [key, timer] of pushTimers) {
    clearTimeout(timer);
    void push(key);
  }
  pushTimers.clear();
}

async function push(key: string) {
  const [uid, clinicId, id] = key.split("|");
  let m: Material | undefined;
  if (uid === currentUserId && clinicId === currentClinicId) m = state.find((x) => x.id === id);
  else {
    try {
      m = (JSON.parse(localStorage.getItem(keyFor(uid, clinicId)) || "[]") as Material[]).find((x) => x.id === id);
    } catch {
      m = undefined;
    }
  }
  if (!m) return;
  try {
    await setDoc(materialDoc(uid, id), toFirestore({ ...m, clinicId, deleted: false }));
  } catch (err) {
    console.warn("Material not synced yet:", id, err);
  }
}

function readDeleted(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(deletedKey()) || "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function pushDelete(id: string) {
  if (!currentClinicId || typeof window === "undefined") return;
  const at = Date.now();
  try {
    localStorage.setItem(deletedKey(), JSON.stringify({ ...readDeleted(), [id]: at }));
  } catch {
    /* best effort */
  }
  if (!syncEnabled()) return;
  setDoc(materialDoc(currentUserId, id), { id, clinicId: currentClinicId, deleted: true, updatedAt: at }, { merge: true }).catch((err) =>
    console.warn("Material delete not synced yet:", id, err),
  );
}

function mergeRemote(docs: QueryDocumentSnapshot[], complete: boolean) {
  ensure();
  const deletedHere = readDeleted();
  const byId = new Map(state.map((m) => [m.id, m] as const));
  const seen = new Set<string>();
  const toPush: string[] = [];
  const tombstones: string[] = [];
  let changed = false;
  for (const d of docs) {
    const { clinicId: _c, deleted, ...remote } = d.data() as Remote;
    const id = d.id;
    seen.add(id);
    const local = byId.get(id);
    const rTime = remote.updatedAt ?? 0;
    const lTime = local?.updatedAt ?? 0;
    if (deleted) {
      if (local && lTime > 0 && lTime <= rTime) {
        byId.delete(id);
        changed = true;
      } else if (local) toPush.push(id);
      continue;
    }
    if (!local) {
      const at = deletedHere[id];
      if (at !== undefined && at >= rTime) tombstones.push(id);
      else {
        byId.set(id, normalize({ ...(remote as Material), id }));
        changed = true;
      }
    } else if (rTime > lTime) {
      byId.set(id, normalize({ ...(remote as Material), id }));
      changed = true;
    } else if (lTime > rTime) toPush.push(id);
  }
  if (complete) for (const id of byId.keys()) if (!seen.has(id)) toPush.push(id);
  if (changed) {
    state = [...byId.values()].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    saveLocal();
  }
  toPush.forEach(schedulePush);
  tombstones.forEach(pushDelete);
  const pruned = pruneSeen(state, meta, Date.now());
  if (pruned.length !== meta.seen.length) setMaterialMeta({ seen: pruned });
}

function stopSync() {
  unsubscribe?.();
  unsubscribe = null;
  unsubscribeMeta?.();
  unsubscribeMeta = null;
}

function startSync() {
  stopSync();
  if (!syncEnabled() || !currentClinicId) return;
  const uid = currentUserId;
  const clinicId = currentClinicId;
  try {
    unsubscribe = onSnapshot(
      query(materialsCol(uid), where("clinicId", "==", clinicId)),
      { includeMetadataChanges: true },
      (snap) => {
        if (uid !== currentUserId || clinicId !== currentClinicId || snap.metadata.hasPendingWrites) return;
        mergeRemote(snap.docs, !snap.metadata.fromCache);
      },
      (err) => console.warn("Materials sync listener error:", err),
    );
    unsubscribeMeta = onSnapshot(
      metaDoc(uid, clinicId),
      (snap) => {
        if (uid !== currentUserId || clinicId !== currentClinicId || !snap.exists() || snap.metadata.hasPendingWrites) return;
        ensure();
        const r = snap.data() as Partial<MaterialMeta>;
        // Imported lines only ever grow, so two devices can't import one twice.
        meta = {
          ...meta,
          ...r,
          imported: [...new Set([...meta.imported, ...(r.imported ?? [])])],
          ignored: [...new Set([...meta.ignored, ...(r.ignored ?? [])])],
        };
        try {
          localStorage.setItem(metaKey(), JSON.stringify(meta));
        } catch {
          /* cached next time */
        }
        emit();
      },
      (err) => console.warn("Materials settings listener error:", err),
    );
  } catch (err) {
    console.warn("Materials sync not started:", err);
  }
}

if (typeof document !== "undefined" && typeof window !== "undefined" && typeof document.addEventListener === "function") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resyncMaterials();
  });
}
