/**
 * Product search without loading every product: each product keeps the
 * beginnings of its words, so a client asks for one word with an index instead
 * of downloading the catalog and filtering it.
 */

const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");

const MIN_PREFIX = 2;
const MAX_PREFIX = 15;
const MAX_WORDS = 400;
const FLAG = "productSearchBackfill";

/**
 * The searchable beginnings of a product's words.
 * @param {object} p the product.
 * @return {Array<string>} the prefixes, sorted so unchanged products compare equal.
 */
function searchWords(p) {
  const text = [p.en, p.ar, p.brand, p.barcode, p.sku].filter(Boolean).join(" ").toLowerCase();
  const out = new Set();
  for (const word of text.split(/[^\p{L}\p{N}]+/u)) {
    if (word.length < MIN_PREFIX) continue;
    const longest = Math.min(word.length, MAX_PREFIX);
    for (let n = MIN_PREFIX; n <= longest; n += 1) out.add(word.slice(0, n));
  }
  return [...out].sort().slice(0, MAX_WORDS);
}

const same = (a, b) => Array.isArray(a) && a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * @param {FirebaseFirestore.Firestore} firestore the database.
 * @return {object} the functions.
 */
module.exports = function productSearch(firestore) {
  const indexProductSearch = onDocumentWritten(
    { document: "products/{productId}", region: "us-central1" },
    async (event) => {
      if (!event.data.after.exists) return;
      const after = event.data.after.data();
      const words = searchWords(after);
      // This write triggers the function again; equal words end it there.
      if (same(after.searchWords, words)) return;
      await event.data.after.ref.update({ searchWords: words });
    },
  );

  // Products saved before search existed get their words once, then this only
  // ever reads the one flag.
  const backfillProductSearch = onSchedule(
    { schedule: "every 60 minutes", region: "us-central1" },
    async () => {
      const flag = firestore.collection("system_flags").doc(FLAG);
      if ((await flag.get()).exists) return;
      const snap = await firestore.collection("products").get();
      let batch = firestore.batch();
      let pending = 0;
      for (const d of snap.docs) {
        const words = searchWords(d.data());
        if (same(d.data().searchWords, words)) continue;
        batch.update(d.ref, { searchWords: words });
        pending += 1;
        if (pending === 400) {
          await batch.commit();
          batch = firestore.batch();
          pending = 0;
        }
      }
      if (pending > 0) await batch.commit();
      await flag.set({ doneAt: Date.now(), products: snap.size });
    },
  );

  return { indexProductSearch, backfillProductSearch };
};
module.exports.searchWords = searchWords;
