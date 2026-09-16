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

  const normalizedEmail = String(email).trim().toLowerCase();

  let uid;
  let created = false;
  try {
    const existing = await auth.getUserByEmail(normalizedEmail);
    uid = existing.uid;
  } catch (err) {
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
  } catch (err) {
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
