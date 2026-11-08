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
 * sendPushOnNotification (PUSH) — delivers every new `notifications` doc to
 *                                the recipient's devices via Expo Push.
 * discounts.js (DISCOUNTS)     — office codes and a doctor's own discount; the
 *                                price of a cart is only worked out there.
 * clinicStaff.js (STAFF)       — secretaries, with permissions set by the doctor.
 * clinicTeam.js (TEAM)         — doctors join each other's clinics by invite or
 *                                request, with a role.
 * adminConsole.js (ADMIN)      — admin actions with a server-written audit trail,
 *                                and the console's earnings and lab figures.
 * requestDataExport (EXPORT)   — "تصدير بياناتي": a dentist asks for a ZIP of
 *                                their patient records (see dataExport.js).
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const {
  onDocumentWritten,
  onDocumentCreated,
  onDocumentDeleted,
} = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { settleOrder } = require("./discountEngine");
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

const DENTIST_PRIVATE_FIELDS = ["phone", "address", "latitude", "longitude", "mapUrl", "instagram"];

/**
 * Strips private fields from a `user_roles` doc.
 * @param {object} data user_roles document data.
 * @return {object} the public subset.
 */
function toPublicProfile(data) {
  const out = { ...data };
  for (const f of PRIVATE_PROFILE_FIELDS) delete out[f];
  // Dentists are customers, not businesses: any signed-in account can list
  // this collection, so their phone and location must not be in it. Labs get
  // the phone of a doctor who sends them a case on the case itself.
  if (data.accountType === "dentist") {
    for (const f of DENTIST_PRIVATE_FIELDS) delete out[f];
  }
  return out;
}

exports.syncPublicProfile = onDocumentWritten(
  { document: "user_roles/{uid}", region: "us-central1" },
  async (event) => {
    const ref = firestore.collection("public_profiles").doc(event.params.uid);
    const after = event.data && event.data.after;
    // A secretary is staff, not someone other accounts look up.
    if (!after || !after.exists || after.data().accountType === "secretary") {
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
  const x = d.data();
  const allowed = x.doctorIds || [];
  if (allowed.length && !allowed.includes(request.auth.uid)) return { promo: null };
  // Only what an app still running the old cart reads; the amount it works out
  // is ignored, since placeVerifiedOrder prices the order itself.
  return {
    promo: {
      id: d.id,
      code: x.code,
      officeId: x.officeId,
      type: x.type,
      value: x.value,
      currency: x.currency,
      active: x.active,
      expiresAt: x.endDate || null,
      minSubtotal: x.minSubtotal || 0,
    },
  };
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

/**
 * Same rule as firestore.rules' isVerifiedAccount(): accounts created on or
 * after the cutoff must have confirmed their email before ordering.
 * @param {object} authCtx request.auth of a callable.
 * @return {Promise<boolean>} whether the account may publish/order.
 */
async function isVerifiedAccount(authCtx) {
  if (authCtx.token.email_verified === true) return true;
  const role = await firestore.collection("user_roles").doc(authCtx.uid).get();
  if (!role.exists) return true;
  const created = role.get("createdAt");
  if (!created || typeof created.toMillis !== "function") return true;
  return created.toMillis() < Date.UTC(2026, 10, 1);
}

const team = require("./clinicTeam")(firestore, isVerifiedAccount, () => admin.storage().bucket());
Object.assign(exports, team.callables);
Object.assign(exports, require("./clinicStaff")(firestore, team.staffHelpers));
Object.assign(exports, require("./adminConsole")(admin));
Object.assign(exports, require("./productSearch")(firestore));
const discounts = require("./discounts")(admin);
Object.assign(exports, discounts.functions);

exports.placeVerifiedOrder = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  if (!(await isVerifiedAccount(request.auth))) {
    throw new HttpsError("failed-precondition", "email-not-verified");
  }
  const data = request.data || {};
  const rawItems = Array.isArray(data.items) ? data.items : [];
  if (rawItems.length === 0) {
    throw new HttpsError("invalid-argument", "Cart is empty.");
  }

  const dentistId = request.auth.uid;
  const dentistInput = data.dentist || {};

  const dentistDoc = await firestore.collection("user_roles").doc(dentistId).get();

  // A secretary works in a clinic; the store isn't theirs.
  if (dentistDoc.exists && dentistDoc.data().accountType === "secretary") {
    throw new HttpsError("permission-denied", "not-allowed");
  }
  const dentistPhotoURL = dentistDoc.exists ? dentistDoc.data().photoURL || "" : "";
  const dentistName =
    String(dentistInput.name || (dentistDoc.exists && dentistDoc.data().name) || "").trim() ||
    "طبيب";

  // Everything billed comes from the database: prices, tiers, the doctor's own
  // discount, and whether a code really applies. The client sends code text and
  // never an amount. An app still running the old cart sends `discount.code`
  // alongside an amount it worked out itself; only the code is read from it.
  const codes = Array.isArray(data.codes) ? data.codes : [];
  if (data.discount && data.discount.code) codes.push(data.discount.code);
  const priced = await discounts.priceCart(dentistId, rawItems, codes);
  // A product deleted (or its office suspended) since it went in the cart is
  // dropped; `skippedCount` lets the client say so instead of reporting success.
  const skippedCount = priced.skipped.length;
  if (priced.offices.length === 0) {
    throw new HttpsError("invalid-argument", "No valid items.");
  }

  // The doctor agreed to the total they were shown. If anything moved since,
  // they see the new one and decide again.
  const expected = data.expected;
  if (
    expected &&
    (Math.abs((Number(expected.usd) || 0) - priced.totals.netUSD) > 0.005 ||
      Math.abs((Number(expected.iqd) || 0) - priced.totals.netIQD) > 0.5)
  ) {
    throw new HttpsError("failed-precondition", "price-changed");
  }

  const taken = await discounts.reserve(dentistId, priced.offices);
  const placedOffices = new Set();
  let firstOrderId;
  const orderIds = [];
  let n = 0;
  try {
    for (const office of priced.offices) {
      const supplierId = office.officeId;
      const lineItems = office.lines.map((l) => ({
        productId: l.productId,
        name: l.name,
        quantity: l.quantity,
        price: l.price,
        listPrice: l.listPrice,
        discountAmount: l.discountAmount,
        currency: l.currency,
      }));
      const orderRef = firestore.collection("orders").doc();
      const orderNumber = genOrderNumber();

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
        total: office.netUSD + office.netIQD,
        totalUSD: office.netUSD,
        totalIQD: office.netIQD,
        note: data.note || "",
        discount: discounts.orderDiscount(office),
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      placedOffices.add(supplierId);

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
  } catch (e) {
    // A code isn't spent on an order that was never written.
    await Promise.all(
      taken
        .filter((use) => !placedOffices.has(use.officeId))
        .map((use) => discounts.release(dentistId, use).catch(() => {})),
    );
    throw e;
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
  const settled = settleOrder(
    { ...order, items: nextItems },
    nextItems.filter((i) => i.availability !== "not_available"),
  );
  await orderRef.update({
    items: nextItems,
    total: settled.total,
    totalUSD: settled.totalUSD,
    totalIQD: settled.totalIQD,
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

  // Each line carries its own share of the discount, so an unavailable item
  // takes its share away with it and the percentage the doctor got still holds.
  const settled = settleOrder(order, availableItems);
  const { total, totalUSD, totalIQD } = settled;

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
    discount: order.discount
      ? { ...order.discount, discountUSD: settled.discountUSD, discountIQD: settled.discountIQD }
      : null,
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

  await discounts.settleUsage(order, settled);

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

/* ============================================================
 * PUSH — deliver in-app notifications to the recipient's devices.
 *
 * Both apps already write a `notifications/{id}` doc for every event (new
 * Rx case, order, message…) and the native app stores each device's Expo
 * push token on `user_roles/{uid}.pushTokens` — but nothing ever sent
 * those tokens a push, so a lab only learned about a new case by opening
 * the app. This trigger closes that gap for every notification type at
 * once, with no client change needed.
 * ============================================================ */

// Lives in push.js: Android through Firebase, iPhones through Expo.
Object.assign(exports, require("./push")(admin));

/* ============================================================
 * ACCOUNT DELETION — remove what a deleted account published.
 *
 * Deleting an account (both apps delete `user_roles/{uid}`, then the Auth
 * user) left its products, offers and ads on the marketplace, so dentists
 * kept seeing listings from a company that no longer exists.
 * ============================================================ */

// [collection, owner field] for everything an account can publish.
const PUBLISHED_CONTENT = [
  ["products", "companyId"],
  ["offers", "supplierId"],
  ["ads", "accountId"],
  ["booking_pages", "ownerId"],
];

/**
 * Deletes every listing owned by `uid`, and its images in Storage.
 * @param {string} uid the deleted account.
 * @return {Promise<number>} how many documents were removed.
 */
async function purgeAccountContent(uid) {
  if (!uid) return 0;
  const bucket = admin.storage().bucket();
  let removed = 0;
  for (const [col, field] of PUBLISHED_CONTENT) {
    const snap = await firestore.collection(col).where(field, "==", uid).get();
    for (const d of snap.docs) {
      if (col === "products") {
        await bucket.deleteFiles({ prefix: `products/${d.id}/` }).catch(() => {});
      }
      await d.ref.delete();
      removed += 1;
    }
  }
  await bucket.deleteFiles({ prefix: `ads/${uid}/` }).catch(() => {});
  await bucket.deleteFiles({ prefix: `product_images/${uid}/` }).catch(() => {});
  return removed;
}

exports.purgeDeletedAccountContent = onDocumentDeleted(
  { document: "user_roles/{uid}", region: "us-central1" },
  async (event) => {
    await team.removeDeletedAccount(event.params.uid);
    const removed = await purgeAccountContent(event.params.uid);
    console.log("Purged deleted account content", event.params.uid, removed);
  },
);

/**
 * One-off repair (admin only): removes listings whose owner account no
 * longer exists — accounts deleted before purgeDeletedAccountContent did.
 * Safe to re-run.
 */
exports.cleanupOrphanedContent = onCall(
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

    const owners = new Set();
    for (const [col, field] of PUBLISHED_CONTENT) {
      const snap = await firestore.collection(col).select(field).get();
      for (const d of snap.docs) {
        const owner = d.get(field);
        if (typeof owner === "string" && owner) owners.add(owner);
      }
    }
    const gone = [];
    for (const uid of owners) {
      const role = await firestore.collection("user_roles").doc(uid).get();
      if (!role.exists) gone.push(uid);
    }
    let removed = 0;
    for (const uid of gone) removed += await purgeAccountContent(uid);
    return { accounts: gone.length, removed };
  },
);

/* ============================================================
 * BOOKING — public "book an appointment" link (src/lib/booking.ts).
 *
 * Patients have no account, so they never write to Firestore directly:
 * every request goes through createBookingRequest, which checks the slot
 * is still free (in a transaction, so two patients can't take the same
 * one), limits how many requests a device/number can send, and notifies
 * the dentist. The public page only ever reads the dentist's published
 * settings and `booking_busy` — the taken start times, no names.
 * The patient follows/cancels the request with a secret token returned
 * once (only its hash is stored).
 * ============================================================ */

const crypto = require("crypto");

const BOOKING_MAX_PER_IP_HOUR = 6;
const BOOKING_MAX_PENDING_PER_PHONE = 2;
const BOOKING_REASONS = [
  "checkup",
  "cleaning",
  "pain",
  "filling",
  "ortho",
  "cosmetic",
  "implant",
  "other",
];
const BOOKING_NOTIFY_TTL = 30 * 24 * 60 * 60 * 1000;

/**
 * @param {string} s text to hash.
 * @return {string} hex sha256.
 */
function sha256(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex");
}

/**
 * @param {string} t "HH:MM".
 * @return {number} minutes since midnight.
 */
function toMinutes(t) {
  const parts = String(t || "0:0")
    .split(":")
    .map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * @param {number} n minutes since midnight.
 * @return {string} "HH:MM".
 */
function fromMinutes(n) {
  const h = String(Math.floor(n / 60)).padStart(2, "0");
  return `${h}:${String(n % 60).padStart(2, "0")}`;
}

/**
 * Today's date and the minutes since midnight in Baghdad (UTC+3, no DST).
 * @return {{date: string, minutes: number}} now in Baghdad.
 */
function baghdadNow() {
  const b = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return {
    date: b.toISOString().slice(0, 10),
    minutes: b.getUTCHours() * 60 + b.getUTCMinutes(),
  };
}

/**
 * Slot starts of one working day (same rules as booking.ts's daySlots).
 * @param {object} hours DayHours.
 * @param {number} slot minutes per appointment.
 * @return {string[]} "HH:MM" starts.
 */
function daySlots(hours, slot) {
  if (!hours || !hours.open || !(slot > 0)) return [];
  const start = toMinutes(hours.from);
  const end = toMinutes(hours.to);
  const bFrom = hours.breakFrom ? toMinutes(hours.breakFrom) : -1;
  const bTo = hours.breakTo ? toMinutes(hours.breakTo) : -1;
  const out = [];
  for (let t = start; t + slot <= end; t += slot) {
    if (bFrom >= 0 && bTo > bFrom && t < bTo && t + slot > bFrom) continue;
    out.push(fromMinutes(t));
  }
  return out;
}

/**
 * @param {string} s slot start.
 * @param {string[]} taken booked starts.
 * @param {number} slot minutes.
 * @return {boolean} whether any booking overlaps the slot.
 */
function slotTaken(s, taken, slot) {
  const a = toMinutes(s);
  return taken.some((t) => {
    const b = toMinutes(t);
    return b < a + slot && a < b + slot;
  });
}

/**
 * Iraqi mobile number normalised to "07XXXXXXXXX", or null.
 * @param {string} raw as typed.
 * @return {?string} the number, or null.
 */
function normalizeIraqiPhone(raw) {
  let d = String(raw || "")
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)))
    .replace(/\D/g, "");
  if (d.startsWith("00964")) d = d.slice(5);
  else if (d.startsWith("964")) d = d.slice(3);
  if (d.startsWith("7")) d = `0${d}`;
  return /^07[0-9]{9}$/.test(d) ? d : null;
}

/**
 * @param {*} v any value.
 * @param {number} max length cap.
 * @return {string} trimmed, capped string.
 */
function cleanText(v, max) {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/**
 * Recomputes `booking_busy/{owner}_{clinic}_{date}` from the dentist's
 * synced appointments and the open booking requests of that day.
 * Skipped for dentists without a booking page.
 * @param {string} ownerId dentist uid.
 * @param {string} clinicId clinic id.
 * @param {string} date YYYY-MM-DD.
 * @return {Promise<void>}
 */
async function recomputeBusy(ownerId, clinicId, date) {
  if (!ownerId || !clinicId || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) {
    return;
  }
  const page = await firestore
    .collection("booking_pages")
    .where("ownerId", "==", ownerId)
    .limit(1)
    .get();
  if (page.empty) return;
  const [appts, reqs] = await Promise.all([
    firestore
      .collection("dentist_records")
      .doc(ownerId)
      .collection("appointments")
      .where("clinicId", "==", clinicId)
      .where("date", "==", date)
      .get(),
    firestore
      .collection("booking_requests")
      .where("ownerId", "==", ownerId)
      .where("date", "==", date)
      .get(),
  ]);
  const times = new Set();
  for (const d of appts.docs) {
    const a = d.data();
    if (a.deleted || a.status === "cancelled" || !a.time) continue;
    times.add(String(a.time).slice(0, 5));
  }
  for (const d of reqs.docs) {
    const r = d.data();
    if (r.clinicId !== clinicId) continue;
    if (r.status === "pending" || r.status === "accepted") times.add(r.time);
  }
  await firestore
    .collection("booking_busy")
    .doc(`${ownerId}_${clinicId}_${date}`)
    .set({
      ownerId,
      clinicId,
      date,
      times: [...times].sort(),
      updatedAt: Date.now(),
    });
}

/**
 * Writes an in-app notification (pushed by sendPushOnNotification).
 * @param {string} id notification doc id.
 * @param {object} fields title, body, type…
 * @return {Promise<void>}
 */
async function notifyBooking(id, fields) {
  await firestore
    .collection("notifications")
    .doc(id)
    .set({
      id,
      senderId: "booking",
      isRead: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + BOOKING_NOTIFY_TTL,
      ...fields,
    })
    .catch((err) => console.warn("Booking notification failed", err));
}

exports.createBookingRequest = onCall(
  { region: "us-central1", maxInstances: 5 },
  async (request) => {
    const input = request.data || {};
    // Honeypot: a field real visitors never see or fill.
    if (input.website) {
      throw new HttpsError("invalid-argument", "rejected");
    }
    const slug = cleanText(input.slug, 40);
    const clinicId = cleanText(input.clinicId, 80);
    const date = cleanText(input.date, 10);
    const time = cleanText(input.time, 5);
    const name = cleanText(input.name, 60);
    const phone = normalizeIraqiPhone(input.phone);
    const reason = BOOKING_REASONS.includes(input.reason) ? input.reason : "other";
    const note = cleanText(input.note, 300);
    if (!slug || !clinicId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      throw new HttpsError("invalid-argument", "bad-request");
    }
    if (name.length < 2) throw new HttpsError("invalid-argument", "name");
    if (!phone) throw new HttpsError("invalid-argument", "phone");

    // Per-IP limit (only a hash of the address is kept).
    const raw = request.rawRequest;
    const ip = (raw && (raw.headers["x-forwarded-for"] || raw.ip)) || "-";
    const ipKey = sha256(`booking|${String(ip).split(",")[0].trim()}`);
    const limitRef = firestore.collection("booking_limits").doc(ipKey);
    await firestore.runTransaction(async (tx) => {
      const snap = await tx.get(limitRef);
      const now = Date.now();
      const d = snap.exists ? snap.data() : null;
      if (d && now - d.windowStart < 60 * 60 * 1000) {
        if (d.count >= BOOKING_MAX_PER_IP_HOUR) {
          throw new HttpsError("resource-exhausted", "too-many");
        }
        tx.update(limitRef, { count: d.count + 1 });
      } else {
        tx.set(limitRef, { count: 1, windowStart: now });
      }
    });

    const pageSnap = await firestore.collection("booking_pages").doc(slug).get();
    const page = pageSnap.exists ? pageSnap.data() : null;
    if (!page || !page.enabled) {
      throw new HttpsError("failed-precondition", "closed");
    }
    const clinic = (page.clinics || []).find((c) => c && c.id === clinicId && c.enabled);
    if (!clinic) throw new HttpsError("failed-precondition", "closed");
    const slot = Number(page.slotMinutes) || 30;
    const today = baghdadNow();
    const last = new Date(`${today.date}T00:00:00Z`);
    last.setUTCDate(last.getUTCDate() + Math.max(1, page.daysAhead || 14));
    const weekday = String(new Date(`${date}T00:00:00Z`).getUTCDay());
    const hours = clinic.hours && clinic.hours[weekday];
    const valid =
      date >= today.date &&
      date <= last.toISOString().slice(0, 10) &&
      !(page.closedDates || []).includes(date) &&
      daySlots(hours, slot).includes(time) &&
      !(date === today.date && toMinutes(time) <= today.minutes + 15);
    if (!valid) throw new HttpsError("failed-precondition", "slot-taken");

    const ownerId = page.ownerId;
    const mine = await firestore
      .collection("booking_requests")
      .where("ownerId", "==", ownerId)
      .where("phone", "==", phone)
      .get();
    const open = mine.docs.filter((d) => {
      const r = d.data();
      return r.status === "pending" && r.date >= today.date;
    });
    if (open.length >= BOOKING_MAX_PENDING_PER_PHONE) {
      throw new HttpsError("resource-exhausted", "phone-limit");
    }

    const token = crypto.randomBytes(24).toString("hex");
    const code = `DH-${crypto.randomInt(1000, 10000)}`;
    const reqRef = firestore.collection("booking_requests").doc();
    const busyRef = firestore.collection("booking_busy").doc(`${ownerId}_${clinicId}_${date}`);
    const clinicName = cleanText(clinic.name, 80);
    await firestore.runTransaction(async (tx) => {
      const busy = await tx.get(busyRef);
      const taken = busy.exists ? busy.data().times || [] : [];
      if (slotTaken(time, taken, slot)) {
        throw new HttpsError("failed-precondition", "slot-taken");
      }
      tx.set(reqRef, {
        id: reqRef.id,
        ownerId,
        slug,
        clinicId,
        clinicName,
        date,
        time,
        patientName: name,
        phone,
        reason,
        note,
        code,
        status: "pending",
        tokenHash: sha256(token),
        createdAt: Date.now(),
      });
      tx.set(busyRef, {
        ownerId,
        clinicId,
        date,
        times: [...taken, time].sort(),
        updatedAt: Date.now(),
      });
    });

    await notifyBooking(`${ownerId}_booking_${reqRef.id}`, {
      userId: ownerId,
      title: `طلب حجز جديد: ${name}`,
      body: `${date} · ${time} — ${clinicName}`,
      type: "booking_new",
      bookingRequestId: reqRef.id,
      senderName: name,
    });

    return { id: reqRef.id, token, code };
  },
);

/**
 * Loads a booking request for its patient, checking the secret token.
 * @param {object} data { id, token } from the client.
 * @return {Promise<object>} the request's DocumentSnapshot.
 */
async function bookingForPatient(data) {
  const id = cleanText(data && data.id, 40);
  const token = String((data && data.token) || "");
  if (!id || !token) throw new HttpsError("invalid-argument", "bad-request");
  const snap = await firestore.collection("booking_requests").doc(id).get();
  if (!snap.exists || snap.data().tokenHash !== sha256(token)) {
    throw new HttpsError("not-found", "not-found");
  }
  return snap;
}

exports.getBookingRequest = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
  const r = (await bookingForPatient(request.data)).data();
  const page = await firestore.collection("booking_pages").doc(r.slug).get();
  const p = page.exists ? page.data() : {};
  const clinic = (p.clinics || []).find((c) => c && c.id === r.clinicId);
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    date: r.date,
    time: r.time,
    patientName: r.patientName,
    reason: r.reason,
    rejectReason: r.rejectReason || "",
    clinicName: r.clinicName,
    clinicAddress: clinic ? clinic.address || "" : "",
    mapUrl: clinic ? clinic.mapUrl || "" : "",
    doctorName: p.doctorName || "",
    photoURL: p.photoURL || "",
    whatsapp: p.whatsapp || "",
    slug: r.slug,
  };
});

exports.cancelBookingRequest = onCall(
  { region: "us-central1", maxInstances: 5 },
  async (request) => {
    const snap = await bookingForPatient(request.data);
    const r = snap.data();
    if (r.status !== "pending" && r.status !== "accepted") {
      return { status: r.status };
    }
    await snap.ref.update({ status: "cancelled", cancelledAt: Date.now() });
    // An accepted request is already on the dentist's calendar: mark that
    // appointment cancelled; it syncs to every device of the dentist.
    if (r.appointmentId) {
      await firestore
        .collection("dentist_records")
        .doc(r.ownerId)
        .collection("appointments")
        .doc(r.appointmentId)
        .set({ status: "cancelled", updatedAt: Date.now() }, { merge: true })
        .catch((err) => console.warn("Appointment cancel failed", err));
    }
    await notifyBooking(`${r.ownerId}_booking_cancel_${snap.id}`, {
      userId: r.ownerId,
      title: `ألغى ${r.patientName} موعده`,
      body: `${r.date} · ${r.time} — ${r.clinicName}`,
      type: "booking_cancelled",
      bookingRequestId: snap.id,
      senderName: r.patientName,
    });
    return { status: "cancelled" };
  },
);

exports.onBookingRequestWritten = onDocumentWritten(
  { document: "booking_requests/{id}", region: "us-central1" },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    const r = after || before;
    if (!r) return;
    if (before && after && before.status === after.status) return;
    await recomputeBusy(r.ownerId, r.clinicId, r.date);
  },
);

// Keeps team members' copies of a patient in step with the record.
exports.onPatientWritten = onDocumentWritten(
  { document: "dentist_records/{uid}/patients/{id}", region: "us-central1", memory: "512MiB" },
  async (event) => {
    const after = event.data.after.exists ? event.data.after.data() : null;
    await team.syncPatientCopies(event.params.uid, event.params.id, after);
  },
);

exports.onAppointmentWritten = onDocumentWritten(
  {
    document: "dentist_records/{uid}/appointments/{id}",
    region: "us-central1",
  },
  async (event) => {
    const before = event.data.before.exists ? event.data.before.data() : null;
    const after = event.data.after.exists ? event.data.after.data() : null;
    await team.syncSharedAppointment(event.params.uid, event.params.id, after);
    if (
      before &&
      after &&
      before.time === after.time &&
      before.status === after.status &&
      before.date === after.date &&
      !!before.deleted === !!after.deleted
    ) {
      return;
    }
    const keys = new Set();
    for (const a of [before, after]) {
      if (a && a.clinicId && a.date) keys.add(`${a.clinicId}|${a.date}`);
    }
    for (const k of keys) {
      const [clinicId, date] = k.split("|");
      await recomputeBusy(event.params.uid, clinicId, date);
    }
  },
);

/* ============================================================
 * DATA EXPORT — "تصدير بياناتي".
 *
 * One live export per account: data_exports/{uid}, readable by its owner and
 * written only here. The ZIP is built on the server, so a large account does
 * not depend on the phone staying awake. It is reachable only through a
 * tokened link stored in that document, and removed after EXPORT_TTL.
 * ============================================================ */

const EXPORT_TTL = 48 * 60 * 60 * 1000;
const EXPORT_COOLDOWN = 24 * 60 * 60 * 1000;
// The longest the builder can run (its timeout), plus a margin. A "processing"
// export older than this died and may be requested again.
const EXPORT_STALE = 15 * 60 * 1000;
// These are medical records: the password must have just been re-entered.
const EXPORT_REAUTH_WINDOW = 5 * 60;

exports.requestDataExport = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const uid = request.auth.uid;
  const authAge = Date.now() / 1000 - Number(request.auth.token.auth_time || 0);
  if (authAge > EXPORT_REAUTH_WINDOW) {
    throw new HttpsError("failed-precondition", "recent-login-required");
  }
  const clinicId =
    typeof (request.data || {}).clinicId === "string" && request.data.clinicId
      ? request.data.clinicId.slice(0, 128)
      : null;

  const records = firestore.collection("dentist_records").doc(uid);
  let patients = records.collection("patients").where("deleted", "==", false);
  if (clinicId) patients = patients.where("clinicId", "==", clinicId);
  const any = await patients.limit(1).get();
  if (any.empty) throw new HttpsError("failed-precondition", "no-data");

  const ref = firestore.collection("data_exports").doc(uid);
  const now = Date.now();
  await firestore.runTransaction(async (tx) => {
    const cur = await tx.get(ref);
    const d = cur.exists ? cur.data() : {};
    const working = d.status === "pending" || d.status === "processing";
    if (working && now - (d.requestedAt || 0) < EXPORT_STALE) {
      throw new HttpsError("already-exists", "in-progress");
    }
    if (
      (d.status === "ready" || d.status === "expired") &&
      now - (d.requestedAt || 0) < EXPORT_COOLDOWN
    ) {
      throw new HttpsError("resource-exhausted", "once-a-day");
    }
    tx.set(ref, {
      ownerId: uid,
      status: "pending",
      clinicId,
      requestedAt: now,
      // Kept so the builder can remove the last ZIP when this one is ready.
      previousPath: d.path || d.previousPath || null,
    });
    // Who exported what and when. No client can read or write this.
    tx.create(firestore.collection("data_export_log").doc(), {
      uid,
      clinicId,
      requestedAt: now,
    });
  });
  return { ok: true };
});

/**
 * Notifies the owner about their export (delivered as a push as well).
 * @param {string} uid the account.
 * @param {string} title the heading.
 * @param {string} body the text.
 * @return {Promise<void>} once written.
 */
async function notifyExport(uid, title, body) {
  const now = Date.now();
  const id = `export_${uid}_${now}`;
  await firestore
    .collection("notifications")
    .doc(id)
    .set({
      id,
      userId: uid,
      title,
      body,
      type: "data_export",
      senderId: "system",
      isRead: false,
      createdAt: now,
      expiresAt: now + EXPORT_TTL,
    })
    .catch((err) => console.warn("Export notification failed", err));
}

exports.buildDataExport = onDocumentWritten(
  {
    document: "data_exports/{uid}",
    region: "us-central1",
    memory: "1GiB",
    timeoutSeconds: 540,
    maxInstances: 3,
    retry: false,
  },
  async (event) => {
    const after = event.data.after.exists ? event.data.after.data() : null;
    const before = event.data.before.exists ? event.data.before.data() : {};
    if (!after || after.status !== "pending") return;
    if (before.status === "pending" && before.requestedAt === after.requestedAt) return;

    const uid = event.params.uid;
    const ref = event.data.after.ref;
    // Events can be delivered twice; only one delivery may build.
    const claimed = await firestore.runTransaction(async (tx) => {
      const cur = await tx.get(ref);
      if (!cur.exists || cur.data().status !== "pending") return false;
      tx.update(ref, { status: "processing" });
      return true;
    });
    if (!claimed) return;
    const bucket = admin.storage().bucket();
    // The link to the last ZIP went with the new request, so nothing reaches it.
    if (after.previousPath) {
      await bucket
        .file(after.previousPath)
        .delete({ ignoreNotFound: true })
        .catch((err) => console.warn("Old export not removed", err));
    }
    try {
      // Heavy libraries, needed by nothing else in this file.
      const { buildExportZip } = require("./dataExport");
      const { pipeline } = require("stream/promises");
      const records = firestore.collection("dentist_records").doc(uid);
      const [rootSnap, patientSnap, apptSnap] = await Promise.all([
        records.get(),
        records.collection("patients").get(),
        records.collection("appointments").get(),
      ]);
      const inScope = (x) => !x.deleted && (!after.clinicId || x.clinicId === after.clinicId);
      const clinics = (rootSnap.exists && rootSnap.data().clinics) || [];
      const { stream, done } = buildExportZip({
        uid,
        clinics,
        patients: patientSnap.docs.map((d) => ({ ...d.data(), id: d.id })).filter(inScope),
        appointments: apptSnap.docs.map((d) => d.data()).filter(inScope),
        readFile: async (p) => (await bucket.file(p).download())[0],
      });

      const now = Date.now();
      const path = `data_exports/${uid}/${now}/dent-hub-export.zip`;
      const token = crypto.randomUUID();
      const file = bucket.file(path);
      const day = new Date(now).toISOString().slice(0, 10);
      const [summary] = await Promise.all([
        done,
        pipeline(
          stream,
          file.createWriteStream({
            contentType: "application/zip",
            metadata: {
              contentDisposition: `attachment; filename="dent-hub-export-${day}.zip"`,
              metadata: { firebaseStorageDownloadTokens: token },
            },
          }),
        ),
      ]);
      const [meta] = await file.getMetadata();
      await ref.update({
        status: "ready",
        path,
        downloadUrl:
          `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
          `${encodeURIComponent(path)}?alt=media&token=${token}`,
        readyAt: Date.now(),
        expiresAt: Date.now() + EXPORT_TTL,
        sizeBytes: Number(meta.size) || 0,
        patients: summary.patients,
        files: summary.files,
        missing: summary.missing.length,
      });
      await notifyExport(
        uid,
        "ملف بياناتك جاهز للتحميل",
        "افتح الإعدادات ثم «تصدير بياناتي» لتحميله خلال 48 ساعة. إذا لم تطلب هذا التصدير، غيّر كلمة المرور فوراً.",
      );
    } catch (err) {
      console.error("Data export failed", uid, err);
      await ref.update({ status: "failed", failedAt: Date.now() });
      await notifyExport(
        uid,
        "تعذر تجهيز ملف بياناتك",
        "حاول مرة أخرى من الإعدادات ثم «تصدير بياناتي».",
      );
    }
  },
);

exports.purgeExpiredDataExports = onSchedule(
  { schedule: "every 1 hours", region: "us-central1", maxInstances: 1 },
  async () => {
    const bucket = admin.storage().bucket();
    const due = await firestore
      .collection("data_exports")
      .where("expiresAt", "<=", Date.now())
      .get();
    for (const d of due.docs) {
      const { path } = d.data();
      if (path) await bucket.file(path).delete({ ignoreNotFound: true });
      await d.ref.update({
        status: "expired",
        path: admin.firestore.FieldValue.delete(),
        downloadUrl: admin.firestore.FieldValue.delete(),
        expiresAt: admin.firestore.FieldValue.delete(),
      });
    }
  },
);
