/**
 * Prices for approved doctors only.
 *
 * An office can choose to show its prices only to doctors it approves. Its
 * products stay public (`products` is readable by anyone), so their prices
 * cannot stay on them: every price field of such a product is moved to
 * `office_prices/{officeId}`, which only the office and its approved doctors
 * may read, and the product keeps zeros plus `priceHidden: true`.
 *
 * Approvals live in `price_access/{officeId}_{doctorId}` (status "pending",
 * "approved" or "declined"), written by the apps under the Firestore rules.
 *
 * Which fields are prices: any number under a key `price`, `priceUsd` or
 * `priceIqd`, at any depth (the product price, quantity tiers, accessories,
 * bone graft pack sizes and membranes). `purchasePrice` is not one of them.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");

const OPTS = { region: "us-central1", maxInstances: 10 };
const OFFICE_TYPES = ["supply", "implant", "medical_supplies"];
const PRICE_KEY = /^price(Usd|Iqd)?$/;

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * The product's prices, and the product with them set to zero.
 * @param {object} data a product document.
 * @return {object} { entries: [{ p: "a.0.price", v }], zeroed: { topKey: value } }
 *   where `zeroed` holds only the top-level fields that carry a price.
 */
function extractPrices(data) {
  const entries = [];
  const zeroed = {};
  const walk = (value, path) => {
    if (Array.isArray(value)) return value.map((x, i) => walk(x, [...path, i]));
    if (!isPlain(value)) return value;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (PRICE_KEY.test(k) && typeof v === "number") {
        if (v !== 0) entries.push({ p: [...path, k].join("."), v });
        out[k] = 0;
      } else {
        out[k] = walk(v, [...path, k]);
      }
    }
    return out;
  };
  for (const [k, v] of Object.entries(data || {})) {
    const before = entries.length;
    if (PRICE_KEY.test(k) && typeof v === "number") {
      if (v !== 0) entries.push({ p: k, v });
      zeroed[k] = 0;
    } else if (Array.isArray(v) || isPlain(v)) {
      const z = walk(v, [k]);
      if (entries.length > before) zeroed[k] = z;
    }
  }
  return { entries, zeroed };
}

/** Whether `path` (dotted) leads to a price field that exists in `data`. */
function hasPath(data, path) {
  const parts = path.split(".");
  let cur = data;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur == null || typeof cur !== "object") return false;
    cur = cur[parts[i]];
  }
  return cur != null && typeof cur === "object" && parts[parts.length - 1] in cur;
}

/**
 * The product with its hidden prices put back.
 * @param {object} data a product document.
 * @param {Array} entries its entries from office_prices.
 * @return {object} a copy of the product.
 */
function applyPrices(data, entries) {
  const out = JSON.parse(JSON.stringify(data || {}));
  for (const { p, v } of entries || []) {
    if (!hasPath(out, p)) continue;
    const parts = p.split(".");
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]];
    cur[parts[parts.length - 1]] = v;
  }
  return out;
}

/**
 * A product's stored prices after a write. A top-level field the write left
 * as it was keeps its stored prices (a stock update, say). A field the write
 * changed takes only the prices it now carries: an edited accessory list is
 * the whole list, and an index of the old one may now be another accessory.
 * @param {Array} old the stored entries.
 * @param {Array} fresh prices found on the product just now.
 * @param {object} data the product after the write.
 * @param {object} [before] the product before it; omitted means unchanged.
 * @return {Array} the entries to store.
 */
function mergeEntries(old, fresh, data, before) {
  const top = (p) => p.split(".")[0];
  const same = (k) => !before || JSON.stringify(before[k]) === JSON.stringify(data[k]);
  const freshTops = new Set((fresh || []).map((e) => top(e.p)));
  const byPath = new Map();
  for (const e of old || []) {
    if (freshTops.has(top(e.p)) || !same(top(e.p)) || !hasPath(data, e.p)) continue;
    byPath.set(e.p, e.v);
  }
  for (const e of fresh || []) byPath.set(e.p, e.v);
  return [...byPath.entries()].map(([p, v]) => ({ p, v }));
}

/**
 * @param {object} admin firebase-admin.
 * @return {object} { functions, revealPrices, officePrices }.
 */
function hiddenPrices(admin) {
  const firestore = admin.firestore();
  const FV = admin.firestore.FieldValue;
  const pricesRef = (officeId) => firestore.collection("office_prices").doc(officeId);
  const accessRef = (officeId, doctorId) =>
    firestore.collection("price_access").doc(`${officeId}_${doctorId}`);

  /** The office's stored prices: productId -> entries. */
  async function officePrices(officeId) {
    const snap = await pricesRef(officeId).get();
    return (snap.exists && snap.data().products) || {};
  }

  /** Whether `viewerId` may see `officeId`'s prices. */
  async function maySee(officeId, viewerId) {
    if (!viewerId) return false;
    if (viewerId === officeId) return true;
    const snap = await accessRef(officeId, viewerId).get();
    return snap.exists && snap.data().status === "approved";
  }

  /**
   * Puts real prices on the hidden-price products `viewerId` may see, in
   * place, and removes the ones they may not.
   * @param {string} viewerId the buyer.
   * @param {Map<string, object>} products productId -> product data.
   * @return {Promise<Array<string>>} the productIds removed.
   */
  async function revealPrices(viewerId, products) {
    const offices = new Set();
    for (const p of products.values()) if (p && p.priceHidden === true) offices.add(p.companyId);
    const removed = [];
    for (const officeId of offices) {
      const allowed = await maySee(officeId, viewerId);
      const prices = allowed ? await officePrices(officeId) : {};
      for (const [id, p] of products) {
        if (p.priceHidden !== true || p.companyId !== officeId) continue;
        if (!allowed) {
          products.delete(id);
          removed.push(id);
        } else {
          products.set(id, applyPrices(p, prices[id]));
        }
      }
    }
    return removed;
  }

  // Any write to a hidden-price office's product that carries a price moves it
  // to office_prices — so every screen that saves a product keeps working.
  const hideProductPrices = onDocumentWritten(
    { document: "products/{productId}", region: "us-central1" },
    async (event) => {
      const productId = event.params.productId;
      if (!event.data.after.exists) {
        const before = event.data.before.exists ? event.data.before.data() : null;
        if (before && before.priceHidden === true && before.companyId) {
          await pricesRef(before.companyId)
            .update({ [`products.${productId}`]: FV.delete() })
            .catch(() => {});
        }
        return;
      }
      const data = event.data.after.data();
      if (!data.companyId) return;
      const { entries, zeroed } = extractPrices(data);
      // No price showing: nothing to hide. Ends the loop after our own write.
      if (entries.length === 0) return;
      const owner = await firestore.collection("user_roles").doc(data.companyId).get();
      if (!owner.exists || owner.data().pricesHidden !== true) return;
      await firestore.runTransaction(async (tx) => {
        const stored = await tx.get(pricesRef(data.companyId));
        const old = ((stored.exists && stored.data().products) || {})[productId] || [];
        tx.set(
          pricesRef(data.companyId),
          {
            officeId: data.companyId,
            products: {
              [productId]: mergeEntries(
                old,
                entries,
                data,
                event.data.before.exists ? event.data.before.data() : undefined,
              ),
            },
            updatedAt: Date.now(),
          },
          { merge: true },
        );
        tx.update(event.data.after.ref, { ...zeroed, priceHidden: true });
      });
    },
  );

  const setPricesHidden = onCall(OPTS, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "not-signed-in");
    const uid = request.auth.uid;
    const roleRef = firestore.collection("user_roles").doc(uid);
    const role = await roleRef.get();
    if (!role.exists || !OFFICE_TYPES.includes(role.data().accountType)) {
      throw new HttpsError("permission-denied", "not-allowed");
    }
    const hidden = request.data && request.data.hidden === true;
    // The flag first: the trigger then hides (or leaves alone) every write
    // that follows, including the ones below.
    await roleRef.update({ pricesHidden: hidden });
    const snap = await firestore.collection("products").where("companyId", "==", uid).get();
    const stored = await officePrices(uid);
    let batch = firestore.batch();
    let pending = 0;
    const flush = async (force) => {
      if (pending === 0 || (!force && pending < 400)) return;
      await batch.commit();
      batch = firestore.batch();
      pending = 0;
    };
    let moved = 0;
    if (hidden) {
      const all = { ...stored };
      for (const d of snap.docs) {
        const { entries, zeroed } = extractPrices(d.data());
        if (entries.length === 0 && d.data().priceHidden === true) continue;
        all[d.id] = mergeEntries(stored[d.id], entries, d.data());
        batch.update(d.ref, { ...zeroed, priceHidden: true });
        pending += 1;
        moved += 1;
        await flush(false);
      }
      await flush(true);
      await pricesRef(uid).set({ officeId: uid, products: all, updatedAt: Date.now() });
    } else {
      for (const d of snap.docs) {
        if (d.data().priceHidden !== true && !stored[d.id]) continue;
        const restored = applyPrices(d.data(), stored[d.id]);
        const patch = { priceHidden: FV.delete() };
        for (const { p } of stored[d.id] || []) {
          const top = p.split(".")[0];
          patch[top] = restored[top];
        }
        batch.update(d.ref, patch);
        pending += 1;
        moved += 1;
        await flush(false);
      }
      await flush(true);
      await pricesRef(uid).delete();
    }
    return { hidden, products: moved };
  });

  return {
    functions: { hideProductPrices, setPricesHidden },
    revealPrices,
    officePrices,
  };
}

module.exports = hiddenPrices;
module.exports.extractPrices = extractPrices;
module.exports.applyPrices = applyPrices;
module.exports.mergeEntries = mergeEntries;
