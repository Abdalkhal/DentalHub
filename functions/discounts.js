/**
 * Office discounts: codes, a doctor's own discount, and the priced cart.
 *
 * The price of a cart is only ever worked out here. The client sends products,
 * quantities and code text, never an amount. Codes and their usage counters
 * have no client write access at all, see firestore.rules.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const hiddenPrices = require("./hiddenPrices");
const {
  checkPromo,
  officeTotals,
  priceOffice,
  promoCoversLine,
  tierPrice,
} = require("./discountEngine");

const OPTS = { region: "us-central1", maxInstances: 10 };
const OFFICE_TYPES = ["supply", "implant", "medical_supplies"];
const CODE_RE = /^[A-Z0-9_-]{3,24}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CODES = 10;
const MAX_LIST = 300;

const cleanCode = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();
const positive = (v) => Math.max(0, Number(v) || 0);
const whole = (v) => Math.floor(positive(v));
const cleanDate = (v) => (DATE_RE.test(String(v || "")) ? String(v) : "");
const cleanIds = (v) =>
  [
    ...new Set((Array.isArray(v) ? v : []).map((x) => String(x || "").trim()).filter(Boolean)),
  ].slice(0, MAX_LIST);

/**
 * @param {object} admin the initialized firebase-admin module.
 * @return {object} { functions, priceCart, reserve, release, orderDiscount, settleUsage }.
 */
module.exports = function discounts(admin) {
  const firestore = admin.firestore();
  const FV = admin.firestore.FieldValue;
  // Prices of offices that show them to approved doctors only.
  const prices = require("./hiddenPrices")(admin);
  const promoRef = (id) => firestore.collection("promo_codes").doc(id);
  const redemptionRef = (promoId, doctorId) =>
    firestore.collection("promo_redemptions").doc(`${promoId}_${doctorId}`);

  /**
   * Works out a cart's price from the database.
   * @param {string} doctorId the buyer.
   * @param {Array} rawItems { productId, quantity } in cart order.
   * @param {Array} rawCodes the codes typed.
   * @return {Promise<object>} { offices, codes, skipped, totals }.
   */
  async function priceCart(doctorId, rawItems, rawCodes) {
    const ids = [...new Set(rawItems.map((i) => String((i && i.productId) || "")))].filter(Boolean);
    const snaps = await Promise.all(
      ids.map((id) => firestore.collection("products").doc(id).get()),
    );
    const products = new Map();
    snaps.forEach((s, i) => {
      if (s.exists) products.set(ids[i], s.data());
    });
    // Hidden prices are filled in for a doctor the office approved; for anyone
    // else those products drop out, like a product that doesn't exist.
    await prices.revealPrices(doctorId, products);

    // A product split over several cart rows still earns its quantity's tier.
    const quantityOf = (raw) => Math.max(1, Math.floor(Number(raw && raw.quantity) || 1));
    const totalQuantity = new Map();
    for (const raw of rawItems) {
      const id = String((raw && raw.productId) || "");
      totalQuantity.set(id, (totalQuantity.get(id) || 0) + quantityOf(raw));
    }

    const byOffice = new Map();
    const skipped = [];
    rawItems.forEach((raw, index) => {
      const productId = String((raw && raw.productId) || "");
      const product = products.get(productId);
      // A suspended office's products are hidden and it takes no orders.
      if (!product || !product.companyId || product.suspended === true) {
        skipped.push(productId);
        return;
      }
      if (!byOffice.has(product.companyId)) byOffice.set(product.companyId, []);
      const listPrice = Number(product.price) || 0;
      const currency = product.currency === "IQD" ? "IQD" : "USD";
      const tiers = product.discountTiers || [];
      byOffice.get(product.companyId).push({
        index,
        productId,
        name: product.ar || product.en || "",
        quantity: quantityOf(raw),
        tierQuantity: totalQuantity.get(productId),
        listPrice,
        // A code's minimum is measured on what the doctor actually pays.
        price: tierPrice(listPrice, tiers, totalQuantity.get(productId), currency),
        currency,
        branch: product.branch || "",
        tiers,
      });
    });

    const doctorSnap = await firestore
      .collection("office_doctor_discounts")
      .where("doctorId", "==", doctorId)
      .get();
    const doctorPct = new Map();
    doctorSnap.docs.forEach((d) => {
      const x = d.data();
      if (x.active !== false) doctorPct.set(x.officeId, Number(x.pct) || 0);
    });

    // The same text can be a code at two offices, and each applies to its own.
    const codes = [...new Set((rawCodes || []).map(cleanCode))]
      .filter((c) => CODE_RE.test(c))
      .slice(0, MAX_CODES);
    const codeResults = new Map(codes.map((c) => [c, { code: c, status: "invalid" }]));
    const promoDocs = await Promise.all(
      codes.map((c) => firestore.collection("promo_codes").where("code", "==", c).get()),
    );

    const now = Date.now();
    const officeOffers = new Map();
    for (const snap of promoDocs) {
      for (const d of snap.docs) {
        const promo = { id: d.id, ...d.data() };
        const lines = byOffice.get(promo.officeId);
        if (!lines) continue;
        const result = codeResults.get(promo.code);
        if (officeOffers.has(promo.officeId)) {
          result.status = "one-per-office";
          result.officeId = promo.officeId;
          continue;
        }
        const usage = promo.maxUsesPerDoctor ? await redemptionRef(promo.id, doctorId).get() : null;
        const doctorUses = usage && usage.exists ? Number(usage.data().count) || 0 : 0;
        const check = checkPromo(promo, { doctorId, lines, doctorUses, now });
        if (!check.ok) {
          if (result.status === "invalid") {
            Object.assign(result, {
              status: check.reason,
              needed: check.needed,
              currency: check.currency,
              officeId: check.reason === "invalid" ? undefined : promo.officeId,
            });
          }
          continue;
        }
        officeOffers.set(promo.officeId, promo);
        Object.assign(result, { status: "pending", officeId: promo.officeId });
      }
    }

    const offices = [...byOffice.entries()].map(([officeId, lines]) => {
      const promo = officeOffers.get(officeId) || null;
      const pct = doctorPct.get(officeId) || 0;
      const priced = priceOffice(lines, { doctorPct: pct, promo });
      if (promo) {
        // The office's own discount for this doctor came out larger.
        codeResults.get(promo.code).status = priced.codeUsed ? "applied" : "beaten";
      }
      return { officeId, doctorPct: pct, promo, ...priced };
    });

    const totals = officeTotals(offices.flatMap((o) => o.lines));
    // Rounding happens per office, so the totals add up what each one settled.
    for (const key of ["discountUSD", "discountIQD", "netUSD", "netIQD"]) {
      totals[key] = offices.reduce((s, o) => s + o[key], 0);
    }
    totals.netUSD = Math.round(totals.netUSD * 100) / 100;
    totals.discountUSD = Math.round(totals.discountUSD * 100) / 100;

    return { offices, codes: [...codeResults.values()], skipped, totals };
  }

  /**
   * Takes one use of each code an order is about to spend. Checked again here
   * inside a transaction, so two doctors can't both take a code's last use.
   * @param {string} doctorId the buyer.
   * @param {Array} offices the priced offices.
   * @return {Promise<Array>} what was taken, for release().
   */
  async function reserve(doctorId, offices) {
    const used = offices.filter((o) => o.codeUsed && o.promo);
    if (used.length === 0) return [];
    return firestore.runTransaction(async (tx) => {
      const taken = [];
      const reads = [];
      for (const o of used) {
        const pRef = promoRef(o.promo.id);
        const rRef = redemptionRef(o.promo.id, doctorId);
        reads.push({ o, pRef, rRef, p: await tx.get(pRef), r: await tx.get(rRef) });
      }
      for (const { o, pRef, rRef, p, r } of reads) {
        if (!p.exists) throw new HttpsError("failed-precondition", "price-changed");
        const promo = p.data();
        const count = r.exists ? Number(r.data().count) || 0 : 0;
        if (
          !promo.active ||
          (promo.maxUses > 0 && (promo.usedCount || 0) >= promo.maxUses) ||
          (promo.maxUsesPerDoctor > 0 && count >= promo.maxUsesPerDoctor)
        ) {
          throw new HttpsError("failed-precondition", "price-changed");
        }
        tx.update(pRef, {
          usedCount: (promo.usedCount || 0) + 1,
          savedUSD: (promo.savedUSD || 0) + o.discountUSD,
          savedIQD: (promo.savedIQD || 0) + o.discountIQD,
        });
        tx.set(rRef, {
          promoId: o.promo.id,
          officeId: o.officeId,
          doctorId,
          count: count + 1,
        });
        taken.push({
          officeId: o.officeId,
          promoId: o.promo.id,
          savedUSD: o.discountUSD,
          savedIQD: o.discountIQD,
        });
      }
      return taken;
    });
  }

  /**
   * Gives a use of a code back.
   * @param {string} doctorId the buyer.
   * @param {object} use promoId, savedUSD and savedIQD.
   * @param {object} [orderRef] the order to mark, so it can't be given back twice.
   * @return {Promise<void>} resolves when done.
   */
  async function release(doctorId, use, orderRef) {
    await firestore.runTransaction(async (tx) => {
      const pRef = promoRef(use.promoId);
      const rRef = redemptionRef(use.promoId, doctorId);
      const order = orderRef ? await tx.get(orderRef) : null;
      const p = await tx.get(pRef);
      const r = await tx.get(rRef);
      if (order && (!order.exists || (order.data().discount || {}).released)) return;
      if (p.exists) {
        const x = p.data();
        tx.update(pRef, {
          usedCount: Math.max(0, (x.usedCount || 0) - 1),
          savedUSD: Math.max(0, (x.savedUSD || 0) - (use.savedUSD || 0)),
          savedIQD: Math.max(0, (x.savedIQD || 0) - (use.savedIQD || 0)),
        });
      }
      if (r.exists) tx.update(rRef, { count: Math.max(0, (r.data().count || 0) - 1) });
      if (order) tx.update(orderRef, { "discount.released": true });
    });
  }

  /**
   * The discount record kept on an order.
   * @param {object} office the priced office.
   * @return {object|null} the record, or null if nothing was discounted.
   */
  function orderDiscount(office) {
    const anything =
      office.discountUSD > 0 ||
      office.discountIQD > 0 ||
      office.tierSavedUSD > 0 ||
      office.tierSavedIQD > 0;
    if (!anything) return null;
    const out = {
      source: office.source,
      discountUSD: office.discountUSD,
      discountIQD: office.discountIQD,
      tierSavedUSD: office.tierSavedUSD,
      tierSavedIQD: office.tierSavedIQD,
    };
    if (office.codeUsed && office.promo) {
      out.code = office.promo.code;
      out.promoId = office.promo.id;
      out.type = office.promo.type;
      out.value = office.promo.value;
      if (office.promo.type === "fixed") out.currency = office.promo.currency;
    }
    if (Object.values(office.source).includes("doctor")) out.doctorPct = office.doctorPct;
    return out;
  }

  /**
   * After a confirmation billed less than the order was placed for, the code's
   * figures follow what was really discounted. Best effort, they are a report.
   * @param {object} order the order.
   * @param {object} settled the confirmed totals.
   * @return {Promise<void>} resolves when done.
   */
  async function settleUsage(order, settled) {
    const d = order.discount;
    if (!d || !d.promoId) return;
    const lessUSD = (d.discountUSD || 0) - settled.discountUSD;
    const lessIQD = (d.discountIQD || 0) - settled.discountIQD;
    if (lessUSD <= 0 && lessIQD <= 0) return;
    await promoRef(d.promoId)
      .update({
        savedUSD: FV.increment(-Math.max(0, lessUSD)),
        savedIQD: FV.increment(-Math.max(0, lessIQD)),
      })
      .catch(() => {});
  }

  const clientLine = (l) => ({
    index: l.index,
    productId: l.productId,
    quantity: l.quantity,
    listPrice: l.listPrice,
    price: l.price,
    currency: l.currency,
    discountAmount: l.discountAmount,
  });

  const previewCart = onCall(OPTS, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "not-signed-in");
    const data = request.data || {};
    const items = Array.isArray(data.items) ? data.items.slice(0, 200) : [];
    const priced = await priceCart(request.auth.uid, items, data.codes);
    return {
      offices: priced.offices.map((o) => ({
        officeId: o.officeId,
        lines: o.lines.map(clientLine),
        source: o.source,
        code: o.codeUsed && o.promo ? o.promo.code : null,
        doctorPct: Object.values(o.source).includes("doctor") ? o.doctorPct : 0,
        rawUSD: o.rawUSD,
        rawIQD: o.rawIQD,
        tierSavedUSD: o.tierSavedUSD,
        tierSavedIQD: o.tierSavedIQD,
        discountUSD: o.discountUSD,
        discountIQD: o.discountIQD,
        netUSD: o.netUSD,
        netIQD: o.netIQD,
      })),
      codes: priced.codes,
      skipped: priced.skipped,
      totals: priced.totals,
    };
  });

  /**
   * The caller, who must be an office.
   * @param {object} request the callable request.
   * @return {Promise<{uid: string, me: object}>} the office.
   */
  async function officeAccount(request) {
    if (!request.auth) throw new HttpsError("unauthenticated", "not-signed-in");
    const uid = request.auth.uid;
    const snap = await firestore.collection("user_roles").doc(uid).get();
    const me = snap.exists ? snap.data() : null;
    if (!me || !OFFICE_TYPES.includes(me.accountType)) {
      throw new HttpsError("permission-denied", "not-allowed");
    }
    return { uid, me };
  }

  /**
   * Tells a doctor about a discount meant for them.
   * @param {string} doctorId the doctor.
   * @param {object} office the office's account.
   * @param {string} officeId the office.
   * @param {string} title the title.
   * @param {string} body the body.
   * @return {Promise<void>} resolves when done.
   */
  async function notifyDoctor(doctorId, office, officeId, title, body) {
    const id = `${doctorId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await firestore
      .collection("notifications")
      .doc(id)
      .set({
        id,
        userId: doctorId,
        title,
        body,
        type: "discount",
        senderId: officeId,
        senderName: office.name || "",
        senderPhotoURL: office.photoURL || "",
        isRead: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      })
      .catch(() => {});
  }

  /**
   * The office's products a percentage would sell below what they cost it.
   * Worked out at each product's lowest tier, the price a discount lands on.
   * @param {string} officeId the office.
   * @param {number} pct the percentage.
   * @param {object} [scope] the code, to limit it to the products it covers.
   * @return {Promise<Array<string>>} up to five product names.
   */
  async function belowCost(officeId, pct, scope) {
    const snap = await firestore.collection("products").where("companyId", "==", officeId).get();
    const hidden = snap.docs.some((d) => d.data().priceHidden === true)
      ? await prices.officePrices(officeId)
      : {};
    const names = [];
    for (const d of snap.docs) {
      const p = hiddenPrices.applyPrices(d.data(), hidden[d.id]);
      const cost = Number(p.purchasePrice) || 0;
      const price = Number(p.price) || 0;
      if (cost <= 0 || price <= 0) continue;
      const line = { productId: d.id, branch: p.branch || "" };
      if (scope && !promoCoversLine(line, scope)) continue;
      const tiers = (p.discountTiers || []).map((t) =>
        Number(t.price) > 0 ? Number(t.price) : price * (1 - (Number(t.discountPct) || 0) / 100),
      );
      const lowest = Math.min(price, ...tiers);
      if (lowest * (1 - pct / 100) < cost) names.push(p.ar || p.en || "");
    }
    return names.slice(0, 5);
  }

  const savePromoCode = onCall(OPTS, async (request) => {
    const { uid, me } = await officeAccount(request);
    const data = request.data || {};
    const code = cleanCode(data.code);
    if (!CODE_RE.test(code)) throw new HttpsError("invalid-argument", "bad-code");
    const type = data.type === "fixed" ? "fixed" : "percent";
    const value = positive(data.value);
    if (value <= 0 || (type === "percent" && value > 100)) {
      throw new HttpsError("invalid-argument", "bad-value");
    }
    const scope = ["products", "branch"].includes(data.scope) ? data.scope : "office";
    const productIds = scope === "products" ? cleanIds(data.productIds) : [];
    const branches = scope === "branch" ? cleanIds(data.branches) : [];
    if ((scope === "products" && !productIds.length) || (scope === "branch" && !branches.length)) {
      throw new HttpsError("invalid-argument", "bad-scope");
    }
    if (productIds.length) {
      const own = await Promise.all(
        productIds.map((id) => firestore.collection("products").doc(id).get()),
      );
      if (own.some((p) => !p.exists || p.data().companyId !== uid)) {
        throw new HttpsError("permission-denied", "not-your-product");
      }
    }
    const startDate = cleanDate(data.startDate);
    const endDate = cleanDate(data.endDate);
    if (startDate && endDate && endDate < startDate) {
      throw new HttpsError("invalid-argument", "bad-dates");
    }

    // Each office has one of a given code, so the code is the document's name
    // and changing it means making a new one.
    const id = `${uid}_${code}`;
    const ref = promoRef(id);
    const existing = await ref.get();
    const editing = data.editing === true;
    if (editing !== existing.exists) {
      throw new HttpsError("already-exists", editing ? "not-found" : "code-taken");
    }
    const before = existing.exists ? existing.data() : null;
    const doctorIds = cleanIds(data.doctorIds);
    const record = {
      id,
      code,
      officeId: uid,
      officeName: me.name || "",
      type,
      value,
      currency: data.currency === "IQD" ? "IQD" : "USD",
      active: data.active !== false,
      scope,
      productIds,
      branches,
      doctorIds,
      startDate,
      endDate,
      minSubtotal: positive(data.minSubtotal),
      minQuantity: whole(data.minQuantity),
      maxUses: whole(data.maxUses),
      maxUsesPerDoctor: whole(data.maxUsesPerDoctor),
      updatedAt: Date.now(),
    };
    if (before) await ref.update(record);
    else
      await ref.set({ ...record, usedCount: 0, savedUSD: 0, savedIQD: 0, createdAt: Date.now() });

    const told = new Set(before ? before.doctorIds || [] : []);
    const label = type === "percent" ? `${value}%` : `${value} ${record.currency}`;
    await Promise.all(
      doctorIds
        .filter((d) => !told.has(d))
        .map((d) =>
          notifyDoctor(
            d,
            me,
            uid,
            "لديك كود خصم",
            `كود ${code} من ${me.name || "المكتب"} يمنحك خصم ${label}`,
          ),
        ),
    );

    return {
      id,
      belowCost: type === "percent" ? await belowCost(uid, value, record) : [],
    };
  });

  const deletePromoCode = onCall(OPTS, async (request) => {
    const { uid } = await officeAccount(request);
    const id = String((request.data && request.data.id) || "");
    if (!id) throw new HttpsError("invalid-argument", "bad-id");
    const ref = promoRef(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data().officeId !== uid) {
      throw new HttpsError("permission-denied", "not-allowed");
    }
    // Past orders keep their own copy of the discount they were placed with.
    await ref.delete();
    return { ok: true };
  });

  const setDoctorDiscount = onCall(OPTS, async (request) => {
    const { uid, me } = await officeAccount(request);
    const data = request.data || {};
    const doctorId = String(data.doctorId || "");
    const pct = positive(data.pct);
    if (!doctorId || pct > 100) throw new HttpsError("invalid-argument", "bad-value");
    const ref = firestore.collection("office_doctor_discounts").doc(`${uid}_${doctorId}`);
    if (pct === 0) {
      await ref.delete();
      return { removed: true, belowCost: [] };
    }
    const doctor = await firestore.collection("user_roles").doc(doctorId).get();
    if (!doctor.exists || doctor.data().accountType !== "dentist") {
      throw new HttpsError("not-found", "no-doctor");
    }
    const existing = await ref.get();
    const before = existing.exists ? Number(existing.data().pct) || 0 : 0;
    await ref.set({
      officeId: uid,
      officeName: me.name || "",
      doctorId,
      doctorName: doctor.data().name || "",
      pct,
      active: true,
      updatedAt: Date.now(),
    });
    if (pct > before) {
      await notifyDoctor(
        doctorId,
        me,
        uid,
        "لديك خصم خاص",
        `${me.name || "المكتب"} منحك خصماً خاصاً ${pct}% على منتجاته، ويُطبق تلقائياً في السلة`,
      );
    }
    return { removed: false, belowCost: await belowCost(uid, pct) };
  });

  // Offices reject orders with a direct status write, so this is what gives
  // the code back. Only from "pending": a confirmed order has been billed.
  const releasePromoOnRejectedOrder = onDocumentUpdated(
    { document: "orders/{orderId}", region: "us-central1" },
    async (event) => {
      const before = event.data.before.data();
      const after = event.data.after.data();
      const d = after.discount;
      if (before.status !== "pending" || after.status !== "rejected") return;
      if (!d || !d.promoId || d.released) return;
      await release(
        after.dentistId,
        { promoId: d.promoId, savedUSD: d.discountUSD, savedIQD: d.discountIQD },
        event.data.after.ref,
      );
    },
  );

  return {
    priceCart,
    reserve,
    release,
    orderDiscount,
    settleUsage,
    functions: {
      previewCart,
      savePromoCode,
      deletePromoCode,
      setDoctorDiscount,
      releasePromoOnRejectedOrder,
    },
  };
};
