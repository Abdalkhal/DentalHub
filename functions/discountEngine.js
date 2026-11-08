/**
 * The arithmetic of a discount, with no database in it. The cart preview, the
 * order and the invoice all use these functions, so the three can never
 * disagree on a price.
 *
 * Order of work, per office:
 *  1. The quantity tier sets the line's price.
 *  2. For each currency, the larger of the doctor's own discount or the code
 *     applies, never both.
 *  3. A discounted dinar total is rounded down to the nearest 250.
 *
 * Each line keeps its own share of the discount, so an item that later turns
 * out to be unavailable takes its share of the discount away with it.
 */

const IQD_STEP = 250;
const CURRENCIES = ["USD", "IQD"];

const roundMoney = (n, currency) =>
  currency === "IQD" ? Math.round(n) : Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The price a quantity earns on a product.
 * @param {number} listPrice the product's price.
 * @param {Array} tiers the product's discount tiers.
 * @param {number} quantity the total quantity of this product in the cart.
 * @param {string} currency the product's currency.
 * @return {number} the unit price, never above the list price.
 */
function tierPrice(listPrice, tiers, quantity, currency) {
  let best = listPrice;
  for (const t of Array.isArray(tiers) ? tiers : []) {
    const from = Number(t && t.fromQty) || 0;
    const to = Number(t && t.toQty) || 0;
    if (from <= 0 || quantity < from || (to > 0 && quantity > to)) continue;
    const fixed = Number(t.price) || 0;
    const pct = Math.min(100, Number(t.discountPct) || 0);
    let candidate = null;
    if (fixed > 0) candidate = fixed;
    else if (pct > 0) candidate = roundMoney(listPrice * (1 - pct / 100), currency);
    if (candidate !== null && candidate < best) best = candidate;
  }
  return best;
}

const lineGross = (l) => l.price * l.quantity;

/**
 * Whether a code covers a line.
 * @param {object} line the cart line.
 * @param {object} promo the code.
 * @return {boolean} true if it does.
 */
function promoCoversLine(line, promo) {
  if (promo.scope === "products") return (promo.productIds || []).includes(line.productId);
  if (promo.scope === "branch") return (promo.branches || []).includes(line.branch);
  return true;
}

/**
 * The date in Iraq, as YYYY-MM-DD. A code's dates are days in Iraq.
 * @param {number} now the current time in milliseconds.
 * @return {string} the date.
 */
function baghdadDate(now) {
  return new Date(now + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Whether a code can apply to an office's lines right now.
 * @param {object} promo the code.
 * @param {object} ctx doctorId, lines, doctorUses and now.
 * @return {object} { ok } or { ok: false, reason, needed, currency }.
 */
function checkPromo(promo, { doctorId, lines, doctorUses, now }) {
  const allowed = promo.doctorIds || [];
  // A code for other doctors reads exactly like a code that doesn't exist.
  if (!promo.active || (allowed.length > 0 && !allowed.includes(doctorId))) {
    return { ok: false, reason: "invalid" };
  }
  const today = baghdadDate(now);
  if (promo.startDate && today < promo.startDate) return { ok: false, reason: "not-started" };
  if (promo.endDate && today > promo.endDate) return { ok: false, reason: "expired" };
  if (promo.maxUses > 0 && (promo.usedCount || 0) >= promo.maxUses) {
    return { ok: false, reason: "exhausted" };
  }
  if (promo.maxUsesPerDoctor > 0 && (doctorUses || 0) >= promo.maxUsesPerDoctor) {
    return { ok: false, reason: "doctor-limit" };
  }

  const covered = lines.filter((l) => promoCoversLine(l, promo));
  if (covered.length === 0) return { ok: false, reason: "no-eligible" };
  if (promo.type === "fixed" && !covered.some((l) => l.currency === promo.currency)) {
    return { ok: false, reason: "no-eligible" };
  }
  if (promo.minQuantity > 0) {
    const quantity = covered.reduce((s, l) => s + l.quantity, 0);
    if (quantity < promo.minQuantity) {
      return { ok: false, reason: "min-quantity", needed: promo.minQuantity };
    }
  }
  if (promo.minSubtotal > 0) {
    const currency = promo.currency === "IQD" ? "IQD" : "USD";
    const base = covered
      .filter((l) => l.currency === currency)
      .reduce((s, l) => s + lineGross(l), 0);
    if (base < promo.minSubtotal) {
      return { ok: false, reason: "min-subtotal", needed: promo.minSubtotal, currency };
    }
  }
  return { ok: true };
}

/**
 * Gives each line its share of an amount, adding up to it exactly.
 * @param {number} amount the amount.
 * @param {Array} lines the lines sharing it.
 * @param {string} currency their currency.
 */
function shareAcross(amount, lines, currency) {
  const base = lines.reduce((s, l) => s + lineGross(l), 0);
  if (base <= 0 || amount <= 0) return;
  let left = amount;
  lines.forEach((l, i) => {
    const share =
      i === lines.length - 1
        ? left
        : Math.min(left, roundMoney((amount * lineGross(l)) / base, currency));
    l.discountAmount = roundMoney(l.discountAmount + share, currency);
    left = roundMoney(left - share, currency);
  });
}

/**
 * What rounding a dinar total down takes off it. Nothing below one step, so a
 * small total never rounds to free.
 * @param {number} net the total after discount.
 * @return {number} the amount to take off.
 */
function iqdRoundingLoss(net) {
  return net >= IQD_STEP ? net % IQD_STEP : 0;
}

/**
 * Prices one office's lines.
 * @param {Array} rawLines lines with productId, name, quantity, listPrice,
 *     currency, branch, tiers and index.
 * @param {object} offer doctorPct and promo (already checked).
 * @return {object} the priced lines, what applied and the totals.
 */
function priceOffice(rawLines, { doctorPct = 0, promo = null } = {}) {
  const lines = rawLines.map((l) => ({
    ...l,
    price: tierPrice(l.listPrice, l.tiers, l.tierQuantity || l.quantity, l.currency),
    discountAmount: 0,
  }));
  const source = {};
  for (const currency of CURRENCIES) {
    const own = lines.filter((l) => l.currency === currency);
    if (own.length === 0) continue;
    const gross = own.reduce((s, l) => s + lineGross(l), 0);
    const doctorAmount = roundMoney((gross * Math.min(100, doctorPct)) / 100, currency);

    let codeLines = [];
    let codeAmount = 0;
    if (promo) {
      codeLines = own.filter((l) => promoCoversLine(l, promo));
      const base = codeLines.reduce((s, l) => s + lineGross(l), 0);
      if (promo.type === "percent") {
        codeAmount = roundMoney((base * Math.min(100, promo.value)) / 100, currency);
      } else if (promo.currency === currency) {
        codeAmount = Math.min(promo.value, base);
      }
    }

    // A tie goes to the doctor's discount, which doesn't use up a code.
    if (codeAmount > doctorAmount) {
      shareAcross(codeAmount, codeLines, currency);
      source[currency] = "code";
    } else if (doctorAmount > 0) {
      shareAcross(doctorAmount, own, currency);
      source[currency] = "doctor";
    }
  }

  // Rounding belongs to a discounted total only: a tier or a discount made it
  // an uneven number. A plain order stays exactly what the office priced it.
  const iqd = lines.filter((l) => l.currency === "IQD");
  const iqdDiscounted = iqd.some((l) => l.discountAmount > 0 || l.price < l.listPrice);
  if (iqdDiscounted) {
    const net = iqd.reduce((s, l) => s + lineGross(l) - l.discountAmount, 0);
    let loss = iqdRoundingLoss(net);
    for (let i = iqd.length - 1; i >= 0 && loss > 0; i -= 1) {
      const room = lineGross(iqd[i]) - iqd[i].discountAmount;
      const take = Math.min(room, loss);
      iqd[i].discountAmount += take;
      loss -= take;
    }
  }

  return {
    lines,
    source,
    codeUsed: Object.values(source).includes("code"),
    ...officeTotals(lines),
  };
}

/**
 * The totals of a set of priced lines.
 * @param {Array} lines the lines.
 * @return {object} per currency: list total, tier saving, discount, net.
 */
function officeTotals(lines) {
  const out = {};
  for (const currency of CURRENCIES) {
    const own = lines.filter((l) => l.currency === currency);
    const raw = own.reduce((s, l) => s + (l.listPrice ?? l.price) * l.quantity, 0);
    const gross = own.reduce((s, l) => s + lineGross(l), 0);
    const discount = own.reduce((s, l) => s + (Number(l.discountAmount) || 0), 0);
    out[`raw${currency}`] = roundMoney(raw, currency);
    out[`tierSaved${currency}`] = roundMoney(raw - gross, currency);
    out[`discount${currency}`] = roundMoney(discount, currency);
    out[`net${currency}`] = roundMoney(Math.max(0, gross - discount), currency);
  }
  return out;
}

/**
 * What an order comes to with only its available items. An order from before
 * line discounts keeps the fixed amount it was placed with.
 * @param {object} order the order.
 * @param {Array} items the items being billed.
 * @return {object} totalUSD, totalIQD, total, discountUSD and discountIQD.
 */
function settleOrder(order, items) {
  const perLine = (order.items || []).some((i) => i.discountAmount !== undefined);
  if (!perLine) {
    const rawOf = (c) =>
      items
        .filter((i) => (c === "IQD" ? i.currency === "IQD" : i.currency !== "IQD"))
        .reduce((s, i) => s + i.price * i.quantity, 0);
    const discountUSD = Math.max(0, Number(order.discount && order.discount.discountUSD) || 0);
    const discountIQD = Math.max(0, Number(order.discount && order.discount.discountIQD) || 0);
    const totalUSD = Math.max(0, rawOf("USD") - discountUSD);
    const totalIQD = Math.max(0, rawOf("IQD") - discountIQD);
    return { totalUSD, totalIQD, total: totalUSD + totalIQD, discountUSD, discountIQD };
  }

  const t = officeTotals(items);
  // Removing an item can leave an uneven dinar total; round it as before.
  const iqdDiscounted = items.some(
    (i) =>
      i.currency === "IQD" && (Number(i.discountAmount) > 0 || i.price < (i.listPrice ?? i.price)),
  );
  const loss = iqdDiscounted ? iqdRoundingLoss(t.netIQD) : 0;
  const totalUSD = t.netUSD;
  const totalIQD = t.netIQD - loss;
  return {
    totalUSD,
    totalIQD,
    total: totalUSD + totalIQD,
    discountUSD: t.discountUSD,
    discountIQD: t.discountIQD + loss,
  };
}

module.exports = {
  baghdadDate,
  checkPromo,
  officeTotals,
  priceOffice,
  promoCoversLine,
  roundMoney,
  settleOrder,
  tierPrice,
};
