/**
 * The admin console's server side. Every admin action happens here so that it
 * takes effect for real and leaves a record the client cannot write or remove
 * (admin_logs). The console reads business data through here too: lab figures
 * are counted on the server, so patient details never reach the admin's browser.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");

const OPTS = { region: "us-central1", maxInstances: 5 };
const ACCOUNT_STATUSES = ["active", "suspended", "expired"];
const SUPPLIER_TYPES = ["supply", "implant"];
const DEFAULT_RATES = { supply: 1, implant: 0 };

/**
 * @param {object} admin the firebase-admin module.
 * @return {object} the callable functions.
 */
module.exports = function adminConsole(admin) {
  const firestore = admin.firestore();
  const auth = admin.auth();
  const roles = firestore.collection("user_roles");
  const settingsRef = firestore.collection("platform_settings").doc("commission");

  /**
   * Allows admins only; the role is read on the server, never from the client.
   * @param {object} request the callable request.
   * @return {Promise<{uid: string, name: string}>} the admin.
   */
  async function requireAdmin(request) {
    if (!request.auth) throw new HttpsError("unauthenticated", "sign-in");
    const me = await roles.doc(request.auth.uid).get();
    const isAdmin =
      request.auth.token.role === "admin" || (me.exists && me.data().role === "admin");
    if (!isAdmin) throw new HttpsError("permission-denied", "not-admin");
    return { uid: request.auth.uid, name: (me.exists && me.data().name) || "Admin" };
  }

  /**
   * Writes one line of the audit trail.
   * @param {object} who the admin.
   * @param {string} type what kind of action.
   * @param {string} message what happened.
   * @param {object} [extra] target, reason, before and after.
   * @return {Promise<void>} once written.
   */
  async function log(who, type, message, extra = {}) {
    await firestore.collection("admin_logs").add({
      type,
      message,
      adminUid: who.uid,
      adminName: who.name,
      createdAt: admin.firestore.Timestamp.now(),
      ...extra,
    });
  }

  const text = (v, max = 500) =>
    String(v == null ? "" : v)
      .trim()
      .slice(0, max);
  const cleanId = (v) => {
    const id = String(v || "");
    if (!id || id.length > 300 || id.includes("/"))
      throw new HttpsError("invalid-argument", "bad-id");
    return id;
  };
  const accountName = (d) => String((d && (d.name || d.clinicName || d.email)) || "حساب");
  const millis = (v) => {
    if (!v) return 0;
    if (typeof v === "number") return v;
    if (typeof v.toMillis === "function") return v.toMillis();
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  };

  /**
   * Hides or restores what an account has published.
   * @param {string} uid the account.
   * @param {boolean} hide true on suspension, false on reactivation.
   * @return {Promise<void>} once done.
   */
  async function setContentVisibility(uid, hide) {
    const products = await firestore.collection("products").where("companyId", "==", uid).get();
    for (const d of products.docs) await d.ref.update({ suspended: hide });
    const offers = await firestore.collection("offers").where("supplierId", "==", uid).get();
    const ads = await firestore.collection("ads").where("accountId", "==", uid).get();
    const del = admin.firestore.FieldValue.delete();
    for (const [docs, stopped] of [
      [offers.docs, "expired"],
      [ads.docs, "rejected"],
    ]) {
      for (const d of docs) {
        const x = d.data();
        if (hide && x.status === "active") {
          await d.ref.update({ status: stopped, statusBeforeSuspension: "active" });
        } else if (!hide && x.statusBeforeSuspension) {
          await d.ref.update({ status: x.statusBeforeSuspension, statusBeforeSuspension: del });
        }
      }
    }
  }

  const adminSetAccountStatus = onCall(OPTS, async (request) => {
    const who = await requireAdmin(request);
    const data = request.data || {};
    const uid = cleanId(data.uid);
    if (!ACCOUNT_STATUSES.includes(data.status))
      throw new HttpsError("invalid-argument", "bad-status");
    const reason = text(data.reason);
    if (data.status === "suspended" && !reason)
      throw new HttpsError("invalid-argument", "reason-required");
    if (uid === who.uid) throw new HttpsError("failed-precondition", "not-yourself");
    const snap = await roles.doc(uid).get();
    if (!snap.exists) throw new HttpsError("not-found", "no-account");
    const cur = snap.data();
    if (cur.role === "admin") throw new HttpsError("failed-precondition", "target-is-admin");
    const before = cur.accountStatus || "active";
    const suspended = data.status === "suspended";

    // The doc first: both apps show the suspended screen from it immediately.
    await roles.doc(uid).update({
      accountStatus: data.status,
      suspendedReason: suspended ? reason : admin.firestore.FieldValue.delete(),
    });
    await auth.updateUser(uid, { disabled: suspended }).catch((err) => {
      if (err.code !== "auth/user-not-found") throw err;
    });
    if (suspended) await auth.revokeRefreshTokens(uid).catch(() => {});
    if (suspended || before === "suspended") await setContentVisibility(uid, suspended);
    await log(who, "account_status", `تغيرت حالة الحساب من ${before} إلى ${data.status}`, {
      targetUid: uid,
      targetName: accountName(cur),
      before,
      after: data.status,
      reason,
    });
    return { ok: true };
  });

  const adminExtendSubscription = onCall(OPTS, async (request) => {
    const who = await requireAdmin(request);
    const data = request.data || {};
    const uid = cleanId(data.uid);
    const months = Math.floor(Number(data.months));
    if (!(months >= 1 && months <= 36)) throw new HttpsError("invalid-argument", "bad-months");
    const snap = await roles.doc(uid).get();
    if (!snap.exists) throw new HttpsError("not-found", "no-account");
    const cur = snap.data();
    const base = Math.max(Date.now(), millis(cur.subscriptionExpiry));
    const expiry = new Date(base + months * 30 * 24 * 3600 * 1000).toISOString();
    await roles.doc(uid).update({ subscriptionExpiry: expiry });
    await log(
      who,
      "extend_subscription",
      `مُدد الاشتراك ${months} شهر حتى ${expiry.slice(0, 10)}`,
      {
        targetUid: uid,
        targetName: accountName(cur),
        before: cur.subscriptionExpiry || null,
        after: expiry,
      },
    );
    return { ok: true, expiry };
  });

  const adminRevokeSessions = onCall(OPTS, async (request) => {
    const who = await requireAdmin(request);
    const uid = cleanId((request.data || {}).uid);
    const snap = await roles.doc(uid).get();
    await auth.revokeRefreshTokens(uid);
    await log(who, "revoke_sessions", "أُنهيت جلسات الدخول", {
      targetUid: uid,
      targetName: accountName(snap.exists ? snap.data() : null),
    });
    return { ok: true };
  });

  const adminAdAction = onCall(OPTS, async (request) => {
    const who = await requireAdmin(request);
    const data = request.data || {};
    const col = data.collection === "ads" ? "ads" : "offers";
    const ref = firestore.collection(col).doc(cleanId(data.id));
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "no-ad");
    const x = snap.data();
    const title = text(x.title || x.description, 80);
    if (data.action === "approve") {
      const expiry = Date.parse(data.expiryDate);
      if (Number.isNaN(expiry)) throw new HttpsError("invalid-argument", "bad-date");
      const expiryDate = new Date(expiry).toISOString();
      await ref.update({ status: "active", expiryDate, rejectReason: null });
      await log(who, "approve_ad", `قُبل إعلان «${title}» حتى ${expiryDate.slice(0, 10)}`, {
        targetId: ref.id,
      });
    } else if (data.action === "reject") {
      const reason = text(data.reason);
      if (!reason) throw new HttpsError("invalid-argument", "reason-required");
      await ref.update({ status: "rejected", rejectReason: reason });
      await log(who, "reject_ad", `رُفض إعلان «${title}»`, { targetId: ref.id, reason });
    } else if (data.action === "stop") {
      await ref.update({ status: col === "ads" ? "rejected" : "expired" });
      await log(who, "deactivate_ad", `أُوقف إعلان «${title}»`, { targetId: ref.id });
    } else {
      throw new HttpsError("invalid-argument", "bad-action");
    }
    return { ok: true };
  });

  const adminResolveReport = onCall(OPTS, async (request) => {
    const who = await requireAdmin(request);
    const data = request.data || {};
    if (!["open", "reviewing", "resolved"].includes(data.status)) {
      throw new HttpsError("invalid-argument", "bad-status");
    }
    const ref = firestore.collection("reports").doc(cleanId(data.id));
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError("not-found", "no-report");
    const note = text(data.note);
    await ref.update({
      status: data.status,
      adminNote: note,
      handledBy: who.name,
      handledAt: Date.now(),
    });
    await log(who, "report", `صارت حالة البلاغ ${data.status}`, {
      targetId: ref.id,
      targetUid: snap.data().reportedId || null,
      reason: note,
    });
    return { ok: true };
  });

  const adminSetCommission = onCall(OPTS, async (request) => {
    const who = await requireAdmin(request);
    const data = request.data || {};
    const rate = Number(data.rate);
    if (!SUPPLIER_TYPES.includes(data.accountType))
      throw new HttpsError("invalid-argument", "bad-type");
    if (!Number.isFinite(rate) || rate < 0 || rate > 100)
      throw new HttpsError("invalid-argument", "bad-rate");
    const snap = await settingsRef.get();
    const cur = snap.exists ? snap.data() : {};
    const rates = { ...DEFAULT_RATES, ...(cur.rates || {}) };
    const before = rates[data.accountType];
    rates[data.accountType] = rate;
    const from = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
    // Dated, so a new rate doesn't rewrite what was already earned.
    const history = [
      ...(cur.history || []),
      { accountType: data.accountType, rate, from, at: Date.now() },
    ];
    await settingsRef.set({ rates, history });
    await log(who, "commission", `تغيرت نسبة الربح من ${before}% إلى ${rate}%`, {
      targetId: data.accountType,
      before,
      after: rate,
    });
    return { ok: true };
  });

  const adminGetBusiness = onCall({ ...OPTS, memory: "512MiB" }, async (request) => {
    await requireAdmin(request);
    const [ordersSnap, rolesSnap, settingsSnap, casesSnap] = await Promise.all([
      firestore.collection("orders").get(),
      roles.get(),
      settingsRef.get(),
      firestore.collectionGroup("cases").get(),
    ]);
    const accounts = new Map(rolesSnap.docs.map((d) => [d.id, d.data()]));
    const orders = ordersSnap.docs.map((d) => {
      const o = d.data();
      return {
        id: d.id,
        orderNumber: o.orderNumber || "",
        supplierId: o.supplierId || "",
        dentistId: o.dentistId || "",
        dentistName: o.dentistName || "",
        clinicName: o.clinicName || "",
        status: o.status || "pending",
        totalIQD: Number(o.totalIQD) || 0,
        totalUSD: Number(o.totalUSD) || 0,
        items: (o.items || []).map((i) => ({
          name: i.name || "",
          quantity: Number(i.quantity) || 0,
          price: Number(i.price) || 0,
          currency: i.currency === "IQD" ? "IQD" : "USD",
          available: i.available !== false && i.availability !== "not_available",
        })),
        createdAt: millis(o.createdAt),
      };
    });
    const suppliers = rolesSnap.docs
      .filter((d) => SUPPLIER_TYPES.includes(d.data().accountType))
      .map((d) => ({ id: d.id, name: accountName(d.data()), accountType: d.data().accountType }));

    // Lab figures: counts only. Case documents hold patient details, which
    // stay on the server.
    const labs = new Map();
    rolesSnap.docs
      .filter((d) => d.data().accountType === "lab")
      .forEach((d) =>
        labs.set(d.id, {
          id: d.id,
          name: accountName(d.data()),
          total: 0,
          byStatus: {},
          doctors: {},
          months: {},
        }),
      );
    for (const d of casesSnap.docs) {
      const parent = d.ref.parent.parent;
      if (!parent || parent.parent.id !== "lab_orders") continue;
      if (!labs.has(parent.id)) {
        labs.set(parent.id, {
          id: parent.id,
          name: accountName(accounts.get(parent.id)),
          total: 0,
          byStatus: {},
          doctors: {},
          months: {},
        });
      }
      const lab = labs.get(parent.id);
      const c = d.data();
      const raw = String(c.status || "new");
      const status = raw === "مكتملة" || raw === "مكتمل" ? "completed" : raw;
      lab.total += 1;
      lab.byStatus[status] = (lab.byStatus[status] || 0) + 1;
      const key = c.dentistId || `name:${c.doctor || c.clinic || "—"}`;
      const doctorName =
        (c.dentistId && accountName(accounts.get(c.dentistId))) || c.doctor || c.clinic || "—";
      if (!lab.doctors[key]) lab.doctors[key] = { name: doctorName, count: 0 };
      lab.doctors[key].count += 1;
      const month = String(c.receivedDate || "").slice(0, 7);
      if (/^\d{4}-\d{2}$/.test(month)) lab.months[month] = (lab.months[month] || 0) + 1;
    }
    const s = settingsSnap.exists ? settingsSnap.data() : {};
    return {
      orders,
      suppliers,
      labs: [...labs.values()].map((l) => ({
        ...l,
        doctors: Object.values(l.doctors).sort((a, b) => b.count - a.count),
      })),
      settings: { rates: { ...DEFAULT_RATES, ...(s.rates || {}) }, history: s.history || [] },
    };
  });

  const adminGetAccountFile = onCall(OPTS, async (request) => {
    await requireAdmin(request);
    const uid = cleanId((request.data || {}).uid);
    const snap = await roles.doc(uid).get();
    const r = snap.exists ? snap.data() : {};
    const user = await auth.getUser(uid).catch(() => null);
    const count = async (q) => (await q.count().get()).data().count;
    const [asSupplier, asDentist, products, offers, patients, cases, reports] = await Promise.all([
      count(firestore.collection("orders").where("supplierId", "==", uid)),
      count(firestore.collection("orders").where("dentistId", "==", uid)),
      count(firestore.collection("products").where("companyId", "==", uid)),
      count(firestore.collection("offers").where("supplierId", "==", uid)),
      // A number only: the admin never reads patient files.
      count(
        firestore
          .collection("dentist_records")
          .doc(uid)
          .collection("patients")
          .where("deleted", "==", false),
      ),
      count(firestore.collection("lab_orders").doc(uid).collection("cases")),
      count(firestore.collection("reports").where("reportedId", "==", uid)),
    ]);
    const logs = await firestore.collection("admin_logs").where("targetUid", "==", uid).get();
    return {
      uid,
      name: accountName(r),
      email: (user && user.email) || r.email || "",
      phone: r.phone || "",
      address: r.address || "",
      photoURL: r.photoURL || "",
      accountType: r.accountType || "",
      role: r.role || "",
      status: r.accountStatus || "active",
      suspendedReason: r.suspendedReason || "",
      subscriptionExpiry: r.subscriptionExpiry || "",
      emailVerified: !!(user && user.emailVerified),
      disabled: !!(user && user.disabled),
      createdAt: millis(r.createdAt),
      lastSignIn:
        user && user.metadata.lastSignInTime ? Date.parse(user.metadata.lastSignInTime) : 0,
      counts: { asSupplier, asDentist, products, offers, patients, cases, reports },
      history: logs.docs
        .map((d) => {
          const x = d.data();
          return {
            id: d.id,
            message: x.message,
            reason: x.reason || "",
            adminName: x.adminName,
            at: millis(x.createdAt),
          };
        })
        .sort((a, b) => b.at - a.at)
        .slice(0, 30),
    };
  });

  return {
    adminSetAccountStatus,
    adminExtendSubscription,
    adminRevokeSessions,
    adminAdAction,
    adminResolveReport,
    adminSetCommission,
    adminGetBusiness,
    adminGetAccountFile,
  };
};
