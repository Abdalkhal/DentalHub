/**
 * Cloud Functions for Firebase — DentalHub
 *
 * inviteLabMember   (PHASE 2)  — creates/links a real Auth account, sets custom
 *                                claims (role + labId) and writes `lab_members`.
 * backfillLabFinance(PHASE 1)  — migrates financial fields from case docs into
 *                                the private `cases/{caseId}/private/finance`
 *                                subcollection (and strips them from the case).
 * createInitialAdmin(SECURITY) — one-time bootstrap: creates the first super-admin
 *                                account and grants it the `role: 'admin'` claim.
 * setAdminRole      (SECURITY) — lets an existing admin grant/revoke the
 *                                `role: 'admin'` claim on other accounts.
 * checkImageSafety  (ADS)      — runs Cloud Vision SafeSearch on a just-uploaded
 *                                "إعلاناتي" ad image; deletes it on the spot if
 *                                it fails the check.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const vision = require("@google-cloud/vision");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();
const auth = admin.auth();
const firestore = admin.firestore();
const visionClient = new vision.ImageAnnotatorClient();

const VALID_ROLES = ["ADMIN", "DESIGNER", "TECHNICIAN"];

// Fields considered financial — never kept on the public case document.
const FINANCIAL_FIELDS = [
  "price",
  "currency",
  "unitPrice",
  "discount",
  "pricingMode",
  "pricingItems",
  "subtotalIQD",
  "discountAmountIQD",
  "finalTotalUSD",
];

/**
 * Invites a new lab member. The caller must be the lab owner (uid === labId) or
 * a member with the ADMIN role.
 *
 * Payload: { labId, email, name, phone, role, department, password }
 *
 * `password` is chosen by the lab owner and relayed to the member directly
 * (WhatsApp, verbally, etc.) — there is no email/SMS delivery in this app, so
 * the owner is the delivery channel. Only used when the Auth account is first
 * created; an existing account's password is left untouched.
 */
exports.inviteLabMember = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data || {};
  const { labId, email, name, role, password } = data;

  if (!labId || !email || !name || !role) {
    throw new HttpsError("invalid-argument", "Missing required fields: labId, email, name, role.");
  }
  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError("invalid-argument", `role must be one of ${VALID_ROLES.join(", ")}.`);
  }

  const callerLabId = request.auth.token.labId || request.auth.uid;
  const callerRole = request.auth.token.role || "";
  const isOwner = request.auth.uid === labId;
  const isAdmin = callerRole === "ADMIN" && callerLabId === labId;
  if (!isOwner && !isAdmin) {
    throw new HttpsError("permission-denied", "Only the lab owner or an admin can invite members.");
  }

  // `isOwner` above only proves the caller passed their OWN uid as `labId` —
  // it does not prove `labId` is actually a registered lab account. Without
  // this, any signed-up account (dentist, supplier, anyone) could self-invoke
  // "lab owner" for a `labId` that's just their own uid and start minting
  // staff claims / lab_members docs, and — worse — reuse the branch below to
  // touch OTHER people's accounts.
  if (isOwner) {
    const labDoc = await firestore.collection("user_roles").doc(labId).get();
    if (!labDoc.exists || labDoc.data().accountType !== "lab") {
      throw new HttpsError(
        "permission-denied",
        "Only a registered lab account can invite members.",
      );
    }
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  let uid;
  let created = false;
  try {
    const existing = await auth.getUserByEmail(normalizedEmail);
    uid = existing.uid;

    // The target Auth account already exists — it may belong to a total
    // stranger (a dentist, a different lab's staff, even the platform
    // admin), not someone this caller has any right to touch. Only allow
    // proceeding if the account is either already staff of THIS SAME lab
    // (idempotent re-invite/reactivation) or has no independent registered
    // identity at all (e.g. a stub Auth user left over from a previous
    // invite that was never completed). Otherwise `setCustomUserClaims`
    // below would silently wipe and replace a real, unrelated account's
    // actual role/labId/admin claim.
    const existingClaims = existing.customClaims || {};
    const alreadyThisLab = existingClaims.labId === labId;
    if (!alreadyThisLab) {
      const [roleDoc, memberSnap] = await Promise.all([
        firestore.collection("user_roles").doc(uid).get(),
        firestore.collection("lab_members").doc(uid).get(),
      ]);
      const hasIndependentIdentity = roleDoc.exists || memberSnap.exists || !!existingClaims.role;
      if (hasIndependentIdentity) {
        throw new HttpsError(
          "already-exists",
          "This email already belongs to a registered account and cannot be invited as lab staff.",
        );
      }
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    if (err && err.code !== "auth/user-not-found") throw err;
    if (!password || String(password).length < 6) {
      throw new HttpsError("invalid-argument", "password must be at least 6 characters.");
    }
    const user = await auth.createUser({
      email: normalizedEmail,
      password: String(password),
      emailVerified: false,
      displayName: String(name).trim(),
    });
    uid = user.uid;
    created = true;
  }

  await auth.setCustomUserClaims(uid, { role, labId });

  await firestore
    .collection("lab_members")
    .doc(uid)
    .set(
      {
        labId,
        uid,
        email: normalizedEmail,
        name: String(name).trim(),
        phone: data.phone || "",
        role,
        department: data.department || "",
        status: created ? "invited" : "active",
        createdAt: new Date().toISOString(),
        invitedBy: request.auth.uid,
      },
      { merge: true },
    );

  return { memberId: uid, uid, created };
});

/**
 * Lists a lab's members. Reads via the Admin SDK (bypassing Firestore rules)
 * rather than a client-side `collectionGroup` query: Firestore requires a
 * security rule declared with the recursive `{path=**}` wildcard to
 * authorize a `collectionGroup()` query, separately from the ordinary rule
 * that already covers a direct `collection()`/`doc()` read at that same
 * path — easy to miss, and the failure mode is a flat "Missing or
 * insufficient permissions" with no partial results. Routing the read
 * through the same trusted server path as `inviteLabMember` sidesteps that
 * class of bug entirely for a list that doesn't need to be realtime anyway.
 *
 * Payload: { labId }
 */
exports.listLabMembers = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data || {};
  const { labId } = data;
  if (!labId) {
    throw new HttpsError("invalid-argument", "Missing required field: labId.");
  }

  const callerLabId = request.auth.token.labId || request.auth.uid;
  const callerRole = request.auth.token.role || "";
  const isOwner = request.auth.uid === labId;
  const isAdmin = callerRole === "ADMIN" && callerLabId === labId;
  if (!isOwner && !isAdmin) {
    throw new HttpsError("permission-denied", "Only the lab owner or an admin can list members.");
  }

  const snap = await firestore.collection("lab_members").where("labId", "==", labId).get();
  return { members: snap.docs.map((d) => ({ id: d.id, ...d.data() })) };
});

/**
 * Lists the cases assigned to the calling staff member — as either the
 * designer or the ceramist ("طلب جديد"'s "تخصيص الكادر الفني" section
 * assigns each case's `designerId` and `ceramistId` independently, and a
 * TECHNICIAN-role member is typically assigned via the ceramist slot, not
 * the designer one — so both fields have to be checked, not just
 * `designerId`, or a ceramist's own assigned cases never show up for them.
 *
 * Reads via the Admin SDK rather than the client-side `collectionGroup`
 * equivalent: see `listLabMembers` for why that needs a `{path=**}`
 * collection-group security rule and fails outright (not just empty) without
 * one. Uses the caller's own uid, not a client-supplied id, so staff can
 * only ever list cases assigned to them.
 */
exports.listDesignerCases = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;
  const [designerSnap, ceramistSnap] = await Promise.all([
    firestore.collectionGroup("cases").where("designerId", "==", uid).get(),
    firestore.collectionGroup("cases").where("ceramistId", "==", uid).get(),
  ]);
  const byPath = new Map();
  for (const d of [...designerSnap.docs, ...ceramistSnap.docs]) {
    byPath.set(d.ref.path, {
      labId: d.ref.parent.parent ? d.ref.parent.parent.id : "",
      ...d.data(),
    });
  }
  const cases = Array.from(byPath.values());
  cases.sort((a, b) => (Number(b.caseId) || 0) - (Number(a.caseId) || 0));
  return { cases };
});

/**
 * PHASE 1 — backfill migration. Copies financial fields from every case under
 * the lab into `cases/{caseId}/private/finance` and (optionally) strips them
 * from the public case document.
 *
 * Payload: { labId, removeFromCase? }
 */
exports.backfillLabFinance = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data || {};
  const labId = data.labId || request.auth.uid;

  const callerRole = request.auth.token.role || "";
  const isOwner = request.auth.uid === labId;
  const isAdmin = callerRole === "ADMIN" && request.auth.token.labId === labId;
  if (!isOwner && !isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only the lab owner or an admin can backfill finance.",
    );
  }

  const removeFromCase = Boolean(data.removeFromCase);
  const casesSnap = await firestore.collection("lab_orders").doc(labId).collection("cases").get();

  let migrated = 0;
  for (const caseDoc of casesSnap.docs) {
    const docData = caseDoc.data() || {};

    const finance = {
      labId,
      caseId: caseDoc.id,
      price: Number(docData.price || 0),
      currency: docData.currency ?? null,
      unitPrice: docData.unitPrice ?? null,
      discount: docData.discount ?? null,
      pricingMode: docData.pricingMode ?? null,
      pricingItems: docData.pricingItems ?? null,
      subtotalIQD: docData.subtotalIQD ?? null,
      discountAmountIQD: docData.discountAmountIQD ?? null,
      finalTotalUSD: docData.finalTotalUSD ?? null,
      updatedAt: new Date().toISOString(),
    };

    // cases/{caseId}/private/finance  (document id "finance")
    await caseDoc.ref.collection("private").doc("finance").set(finance);

    if (removeFromCase) {
      const stripped = { ...docData };
      FINANCIAL_FIELDS.forEach((field) => delete stripped[field]);
      await caseDoc.ref.set(stripped, { merge: true });
    }

    migrated += 1;
  }

  return { migrated };
});

/**
 * SECURITY — one-time bootstrap for the first super-admin.
 *
 * Only succeeds while NO admin account exists yet (guarded against re-runs).
 * Creates (or reuses) the admin Auth user, sets the `role: 'admin'` custom
 * claim and writes the `user_roles` document. Password comes from the caller
 * or the `ADMIN_PASSWORD` environment variable.
 *
 * Payload: { email?, password? }
 */
exports.createInitialAdmin = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data || {};

  // This is a one-time production bootstrap, not a general-purpose endpoint —
  // "signed in" alone must never be enough to self-grant global admin. The
  // Firestore "no admin doc exists yet" check below is a best-effort mirror
  // check, not a real access-control decision: it's a non-atomic query (a
  // race lets two concurrent callers both pass it) and it drifts from the
  // truth if that doc is ever deleted/missing independent of the real
  // `role: 'admin'` claim. Requiring this deploy-only secret (an env var,
  // which callers can neither read nor set) means the function stays inert
  // by default and only does anything during a deliberately-opened bootstrap
  // window — the Firestore check below still applies as a second layer.
  const bootstrapSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  if (!bootstrapSecret || data.secret !== bootstrapSecret) {
    throw new HttpsError("permission-denied", "Admin bootstrap is not open.");
  }

  const email = String(data.email || process.env.ADMIN_EMAIL || "admin@dentalhub.com")
    .trim()
    .toLowerCase();
  const password = data.password || process.env.ADMIN_PASSWORD;

  const existingAdmins = await firestore
    .collection("user_roles")
    .where("role", "==", "admin")
    .limit(1)
    .get();
  if (!existingAdmins.empty) {
    throw new HttpsError("already-exists", "An admin account already exists.");
  }

  if (!password || password.length < 8) {
    throw new HttpsError("invalid-argument", "Password must be at least 8 characters.");
  }

  let uid;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    if (existing.customClaims && existing.customClaims.role) {
      // Never overwrite an account that already has a real role/claim of its
      // own (e.g. the caller's own dentist/lab account, or lab staff) — this
      // bootstrap is only meant to mint a brand-new super-admin identity.
      throw new HttpsError(
        "already-exists",
        "This email belongs to an account with an existing role and cannot be used for bootstrap.",
      );
    }
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    if (err && err.code !== "auth/user-not-found") throw err;
    const user = await auth.createUser({ email, password, emailVerified: true });
    uid = user.uid;
  }

  await auth.setCustomUserClaims(uid, { role: "admin" });

  await firestore.collection("user_roles").doc(uid).set(
    {
      userId: uid,
      role: "admin",
      accountType: "dentist",
      name: "مدير النظام",
      surname: "Admin",
      email,
      accountStatus: "active",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { uid, email };
});

/**
 * SECURITY — grant or revoke the super-admin role on another account.
 *
 * Caller must already hold the `role: 'admin'` claim. Sets/clears the custom
 * claim and mirrors the value into the `user_roles` document.
 *
 * Payload: { uid, isAdmin } or { email, isAdmin } — either identifies the
 * target account; `email` is resolved to a uid via the Auth admin API
 * (never exposed to clients directly) so an admin can promote/demote
 * another account without needing to already know its uid.
 */
exports.setAdminRole = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  if (request.auth.token.role !== "admin") {
    throw new HttpsError("permission-denied", "Only an admin can manage admin roles.");
  }

  const data = request.data || {};
  const isAdmin = Boolean(data.isAdmin);
  let uid = data.uid;
  if (!uid && data.email) {
    const target = await auth.getUserByEmail(String(data.email).trim().toLowerCase());
    uid = target.uid;
  }
  if (!uid) {
    throw new HttpsError("invalid-argument", "Missing required field: uid or email.");
  }

  const target = await auth.getUser(uid);
  const claims = target.customClaims || {};
  if (isAdmin) {
    await auth.setCustomUserClaims(uid, { ...claims, role: "admin" });
  } else {
    const { role: _removed, ...rest } = claims;
    await auth.setCustomUserClaims(uid, rest);
  }

  const docSnap = await firestore.collection("user_roles").doc(uid).get();
  const accountType = docSnap.exists ? docSnap.data().accountType || "dentist" : "dentist";
  await firestore
    .collection("user_roles")
    .doc(uid)
    .set({ role: isAdmin ? "admin" : accountType }, { merge: true });

  return { uid, isAdmin };
});

/**
 * ADS CONTENT MODERATION — runs Cloud Vision SafeSearch on an ad image right
 * after it's uploaded to `ads/{uid}/...`, and deletes the object immediately
 * if it fails. The path prefix is checked against the caller's own uid so
 * nobody can use this to scan (or trigger deletion of) someone else's file.
 *
 * Payload: { path } — the Storage path just uploaded, e.g. "ads/<uid>/<file>".
 */
exports.checkImageSafety = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const path = String(request.data?.path || "");
  const expectedPrefix = `ads/${request.auth.uid}/`;
  if (!path.startsWith(expectedPrefix)) {
    throw new HttpsError("permission-denied", "Path does not belong to the caller.");
  }

  const bucket = admin.storage().bucket();
  const gcsUri = `gs://${bucket.name}/${path}`;

  let safeSearch;
  try {
    const [result] = await visionClient.safeSearchDetection(gcsUri);
    safeSearch = result.safeSearchAnnotation;
  } catch (err) {
    // Vision itself failing (quota, transient error, ...) should not silently
    // let an unchecked image through — treat it as a failed check.
    throw new HttpsError("internal", `Safety check failed: ${err.message}`);
  }

  const FLAGGED = ["LIKELY", "VERY_LIKELY"];
  const flags = [];
  if (FLAGGED.includes(safeSearch.adult)) flags.push("adult");
  if (FLAGGED.includes(safeSearch.racy)) flags.push("racy");
  if (FLAGGED.includes(safeSearch.violence)) flags.push("violence");

  if (flags.length > 0) {
    await bucket
      .file(path)
      .delete()
      .catch(() => {});
    return { safe: false, reason: flags.join(", ") };
  }
  return { safe: true };
});

/**
 * PRIVACY — public profile mirror.
 *
 * `user_roles` holds private account data (email, dob, gender, account
 * status, subscription, push tokens) but the directory pages (explore,
 * search, labs, supplies, brands, profiles) need other accounts' business
 * details. Those pages read `public_profiles/{uid}` instead, a copy of the
 * account doc with the private fields removed, kept in sync here. Clients
 * can't write it (see firestore.rules).
 */
const PRIVATE_PROFILE_FIELDS = [
  "email",
  "dob",
  "gender",
  "role",
  "accountStatus",
  "subscriptionExpiry",
  "pushTokens",
  "notificationsEnabled",
];

/**
 * Strips private fields from a `user_roles` doc.
 * @param {object} data user_roles document data.
 * @return {object} the public subset.
 */
function toPublicProfile(data) {
  const out = { ...data };
  for (const f of PRIVATE_PROFILE_FIELDS) delete out[f];
  return out;
}

exports.syncPublicProfile = onDocumentWritten(
  { document: "user_roles/{uid}", region: "us-central1" },
  async (event) => {
    const ref = firestore.collection("public_profiles").doc(event.params.uid);
    const after = event.data && event.data.after;
    if (!after || !after.exists) {
      await ref.delete();
      return;
    }
    await ref.set(toPublicProfile(after.data()));
  },
);

/**
 * PRIVACY — promo code lookup.
 *
 * `promo_codes` used to be readable by every signed-in account so the cart
 * could query it by code, which also let anyone list every code. The cart
 * now asks for one code by its exact value and gets only that code back.
 *
 * Payload: { code }
 */
exports.lookupPromoCode = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const code = String((request.data && request.data.code) || "")
    .trim()
    .toUpperCase();
  if (!code || code.length > 64) return { promo: null };

  const snap = await firestore.collection("promo_codes").where("code", "==", code).limit(1).get();
  if (snap.empty) return { promo: null };
  const d = snap.docs[0];
  return { promo: { id: d.id, ...d.data() } };
});

/**
 * PRIVACY — (re)build every `public_profiles` doc from `user_roles`. Needed
 * once for accounts created before syncPublicProfile existed; safe to re-run.
 * Admin only (custom claim, or role 'admin' on the caller's user_roles doc,
 * matching isAdmin() in firestore.rules).
 */
exports.backfillPublicProfiles = onCall(
  { region: "us-central1", maxInstances: 1 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    let isAdmin = request.auth.token.role === "admin";
    if (!isAdmin) {
      const me = await firestore.collection("user_roles").doc(request.auth.uid).get();
      isAdmin = me.exists && me.data().role === "admin";
    }
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Only an admin can run this.");
    }

    const snap = await firestore.collection("user_roles").get();
    let batch = firestore.batch();
    let n = 0;
    for (const d of snap.docs) {
      batch.set(firestore.collection("public_profiles").doc(d.id), toPublicProfile(d.data()));
      if (++n % 400 === 0) {
        await batch.commit();
        batch = firestore.batch();
      }
    }
    await batch.commit();
    return { copied: n };
  },
);

/* ============================================================
 * PHASE 6 — server-verified checkout / confirm / item-availability.
 *
 * `orders`/`invoices` create is now Admin-SDK-only (see firestore.rules):
 * a plain client `create` could set `items[].price`/`total` to anything —
 * nothing ever recomputed them from the real `products/{productId}.price`,
 * so either party in a transaction could forge the billed amount. These
 * three functions are now the only way `orders`/`invoices` financial data
 * gets written, and are what `placeCartOrder`/`confirmOrder`/
 * `updateOrderItemAvailability` (both apps) call instead of writing
 * Firestore directly.
 * ============================================================ */

function genOrderNumber() {
  return `DNT-${Math.floor(1000 + Math.random() * 9000)}`;
}

exports.placeVerifiedOrder = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const data = request.data || {};
  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (rawItems.length === 0) {
    throw new HttpsError("invalid-argument", "Cart is empty.");
  }

  const dentistId = request.auth.uid;
  const dentistInput = data.dentist || {};

  const productIds = [...new Set(rawItems.map((i) => String((i && i.productId) || "")))].filter(
    Boolean,
  );
  if (productIds.length === 0) {
    throw new HttpsError("invalid-argument", "No valid items.");
  }

  const [productSnaps, dentistDoc] = await Promise.all([
    Promise.all(productIds.map((id) => firestore.collection("products").doc(id).get())),
    firestore.collection("user_roles").doc(dentistId).get(),
  ]);
  const productsById = new Map();
  productSnaps.forEach((snap, i) => {
    if (snap.exists) productsById.set(productIds[i], snap.data());
  });

  const dentistPhotoURL = dentistDoc.exists ? dentistDoc.data().photoURL || "" : "";
  const dentistName =
    String(dentistInput.name || (dentistDoc.exists && dentistDoc.data().name) || "").trim() ||
    "طبيب";

  // Group verified line items (price/currency/supplier read straight off
  // the product doc, never off the client's cart) by supplier. A cart item
  // whose product was deleted (or lost its companyId) between add-to-cart
  // and checkout is dropped here — `skippedCount` is returned so the client
  // can tell the dentist rather than silently reporting full success.
  const bySupplier = new Map();
  let skippedCount = 0;
  for (const raw of rawItems) {
    const productId = String((raw && raw.productId) || "");
    const product = productsById.get(productId);
    if (!product || !product.companyId) {
      skippedCount += 1;
      continue;
    }
    const quantity = Math.max(1, Math.floor(Number(raw.quantity) || 1));
    const line = {
      productId,
      name: product.ar || product.en || "",
      quantity,
      price: Number(product.price) || 0,
      currency: product.currency === "IQD" ? "IQD" : "USD",
    };
    if (!bySupplier.has(product.companyId)) bySupplier.set(product.companyId, []);
    bySupplier.get(product.companyId).push(line);
  }
  if (bySupplier.size === 0) {
    throw new HttpsError("invalid-argument", "No valid items.");
  }

  // A promo-code discount is computed client-side against the WHOLE cart's
  // subtotal (see src/lib/promo.ts's computeDiscount), but the cart is split
  // into one order per supplier below. Prorate the discount across those
  // orders by each one's share of the relevant currency's subtotal, so a
  // multi-supplier cart doesn't hand the whole discount to one order (or
  // drop it entirely).
  const groups = [...bySupplier.entries()].map(([supplierId, lineItems]) => ({
    supplierId,
    lineItems,
    rawUSD: lineItems
      .filter((i) => i.currency !== "IQD")
      .reduce((s, i) => s + i.price * i.quantity, 0),
    rawIQD: lineItems
      .filter((i) => i.currency === "IQD")
      .reduce((s, i) => s + i.price * i.quantity, 0),
  }));
  const discountInput = data.discount || null;
  const discountUSDTotal = Math.max(0, Number(discountInput?.discountUSD) || 0);
  const discountIQDTotal = Math.max(0, Number(discountInput?.discountIQD) || 0);
  const grandUSD = groups.reduce((s, g) => s + g.rawUSD, 0);
  const grandIQD = groups.reduce((s, g) => s + g.rawIQD, 0);

  let firstOrderId;
  const orderIds = [];
  let n = 0;
  for (const { supplierId, lineItems, rawUSD, rawIQD } of groups) {
    const orderRef = firestore.collection("orders").doc();
    const orderNumber = genOrderNumber();
    const shareDiscountUSD = grandUSD > 0 ? discountUSDTotal * (rawUSD / grandUSD) : 0;
    const shareDiscountIQD = grandIQD > 0 ? discountIQDTotal * (rawIQD / grandIQD) : 0;
    const totalUSD = Math.max(0, rawUSD - shareDiscountUSD);
    const totalIQD = Math.max(0, rawIQD - shareDiscountIQD);
    const total = totalUSD + totalIQD;

    await orderRef.set({
      id: orderRef.id,
      supplierId,
      dentistId,
      dentistName,
      dentistPhone: dentistInput.phone || "",
      dentistAddress: dentistInput.address || "",
      clinicName: dentistInput.clinicName || dentistName,
      orderNumber,
      items: lineItems,
      total,
      totalUSD,
      totalIQD,
      note: data.note || "",
      discount: discountInput
        ? { ...discountInput, discountUSD: shareDiscountUSD, discountIQD: shareDiscountIQD }
        : null,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const itemLabel = lineItems.length === 1 ? "منتج" : "منتجات";
    await firestore
      .collection("notifications")
      .doc(`${supplierId}_${Date.now()}_${n}`)
      .set({
        id: `${supplierId}_${Date.now()}_${n}`,
        userId: supplierId,
        title: `طلب جديد من ${dentistName}`,
        body: dentistInput.address
          ? `رقم الطلب ${orderNumber} · ${lineItems.length} ${itemLabel} — ${dentistInput.address}`
          : `رقم الطلب ${orderNumber} · ${lineItems.length} ${itemLabel}`,
        type: "order_new",
        orderId: orderRef.id,
        senderId: dentistId,
        senderName: dentistName,
        senderPhotoURL: dentistPhotoURL,
        isRead: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      })
      .catch(() => {});

    if (!firstOrderId) firstOrderId = orderRef.id;
    orderIds.push(orderRef.id);
    n += 1;
  }

  // Stock is decremented on confirmation (confirmVerifiedOrder), not here —
  // at this point the office hasn't reviewed the order yet, so an item can
  // still end up rejected or marked unavailable; decrementing this early
  // would wrongly reduce stock for something that may never actually ship.
  return { count: orderIds.length, orderId: firstOrderId, skippedCount };
});

exports.setOrderItemAvailability = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const { orderId, index, availability } = request.data || {};
  if (
    !orderId ||
    !Number.isInteger(index) ||
    !["available", "not_available"].includes(availability)
  ) {
    throw new HttpsError(
      "invalid-argument",
      "orderId, index and a valid availability are required.",
    );
  }

  const orderRef = firestore.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }
  const order = orderSnap.data();
  if (order.supplierId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Only the order's own supplier may edit it.");
  }
  const items = Array.isArray(order.items) ? order.items : [];
  if (index < 0 || index >= items.length) {
    throw new HttpsError("invalid-argument", "index out of range.");
  }
  const nextItems = items.map((it, i) => (i === index ? { ...it, availability } : it));
  await orderRef.update({
    items: nextItems,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { ok: true };
});

exports.confirmVerifiedOrder = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const { orderId } = request.data || {};
  if (!orderId) {
    throw new HttpsError("invalid-argument", "orderId is required.");
  }

  const orderRef = firestore.collection("orders").doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) {
    throw new HttpsError("not-found", "Order not found.");
  }
  const order = orderSnap.data();
  if (order.supplierId !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Only the order's own supplier may confirm it.");
  }
  if (order.status === "confirmed") {
    throw new HttpsError("failed-precondition", "Order is already confirmed.");
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const availableItems = items.filter((i) => i.availability !== "not_available");
  const unavailableItems = items.filter((i) => i.availability === "not_available");

  const rawUSD = availableItems
    .filter((i) => i.currency !== "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);
  const rawIQD = availableItems
    .filter((i) => i.currency === "IQD")
    .reduce((s, i) => s + i.price * i.quantity, 0);
  // The order's discount was already fixed (and prorated to this supplier)
  // at placement time in placeVerifiedOrder — honor that same amount here
  // rather than recomputing it, only capping so an item that turned out to
  // be unavailable can't make the discount exceed what's actually billed.
  const discountUSD = Math.max(0, Number(order.discount?.discountUSD) || 0);
  const discountIQD = Math.max(0, Number(order.discount?.discountIQD) || 0);
  const totalUSD = Math.max(0, rawUSD - discountUSD);
  const totalIQD = Math.max(0, rawIQD - discountIQD);
  const total = totalUSD + totalIQD;

  const invoiceRef = firestore.collection("invoices").doc();
  await invoiceRef.set({
    id: invoiceRef.id,
    orderNumber: order.orderNumber || genOrderNumber(),
    officeId: order.supplierId,
    doctorId: order.dentistId,
    doctorName: order.dentistName,
    clinicName: order.clinicName || order.dentistName,
    doctorPhone: order.dentistPhone || "",
    doctorAddress: order.dentistAddress || "",
    items: availableItems,
    total,
    totalUSD,
    totalIQD,
    note: order.note || "",
    discount: order.discount || null,
    status: "confirmed",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
    shippedAt: null,
    deliveredAt: null,
    rejectedAt: null,
  });

  if (unavailableItems.length > 0 && order.dentistId) {
    const supplierDoc = await firestore.collection("user_roles").doc(order.supplierId).get();
    const senderName = supplierDoc.exists ? supplierDoc.data().name || "" : "";
    const senderPhotoURL = supplierDoc.exists ? supplierDoc.data().photoURL || "" : "";
    const notifId = `${order.dentistId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await firestore
      .collection("notifications")
      .doc(notifId)
      .set({
        id: notifId,
        userId: order.dentistId,
        title: "تعذر توفير منتج في طلبك",
        body:
          unavailableItems.length === 1
            ? `تعذر توفير المنتج "${unavailableItems[0].name}" في طلبك ${order.orderNumber || ""}`
            : `تعذر توفير المنتجات التالية في طلبك ${order.orderNumber || ""}: ${unavailableItems
                .map((i) => i.name)
                .join("، ")}`,
        type: "order_status",
        orderId,
        senderId: order.supplierId,
        senderName,
        senderPhotoURL,
        isRead: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      })
      .catch(() => {});
  }

  await orderRef.update({
    status: "confirmed",
    invoiceId: invoiceRef.id,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Decrement stock now that the office has actually confirmed the order —
  // only for the items that made it into the invoice (an item marked
  // "not_available" above must never touch stock). Transactional per
  // product, best-effort: a failure here must never undo the confirmation.
  const byProductQty = new Map();
  for (const item of availableItems) {
    if (!item.productId) continue;
    byProductQty.set(
      item.productId,
      (byProductQty.get(item.productId) || 0) + (item.quantity || 1),
    );
  }
  await Promise.all(
    [...byProductQty.entries()].map(async ([productId, qty]) => {
      const ref = firestore.collection("products").doc(productId);
      try {
        await firestore.runTransaction(async (tx) => {
          const snap = await tx.get(ref);
          if (!snap.exists) return;
          const current = Number(snap.data().stock);
          if (!Number.isFinite(current) || current <= 0) return;
          const next = Math.max(0, current - qty);
          tx.update(ref, { stock: next, inStock: next > 0 });
        });
      } catch {
        /* best-effort */
      }
    }),
  );

  return { invoiceId: invoiceRef.id };
});
