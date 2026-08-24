/**
 * Cloud Functions for Firebase — DentalHub
 *
 * inviteLabMember   (PHASE 2)  — creates/links a real Auth account, sets custom
 *                                claims (role + labId) and writes `lab_members`.
 * backfillLabFinance(PHASE 1)  — migrates financial fields from case docs into
 *                                the private `cases/{caseId}/private/finance`
 *                                subcollection (and strips them from the case).
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

setGlobalOptions({ maxInstances: 10 });

admin.initializeApp();
const auth = admin.auth();
const firestore = admin.firestore();

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

function randomPassword() {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2).toUpperCase();
}

/**
 * Invites a new lab member. The caller must be the lab owner (uid === labId) or
 * a member with the ADMIN role.
 *
 * Payload: { labId, email, name, phone, role, department }
 */
exports.inviteLabMember = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const data = request.data || {};
  const { labId, email, name, role } = data;

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
    const user = await auth.createUser({
      email: normalizedEmail,
      password: randomPassword(),
      emailVerified: false,
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

  if (created) {
    try {
      await auth.generatePasswordResetLink(normalizedEmail);
      logger.info("Password reset link generated for new lab member", normalizedEmail);
    } catch (err) {
      logger.warn("Could not generate password reset link", err);
    }
  }

  return { memberId: uid, uid, created };
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
