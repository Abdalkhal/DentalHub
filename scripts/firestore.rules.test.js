/**
 * Firestore Security Rules emulator tests (PHASE 3).
 *
 * Run with the Firestore emulator:
 *   firebase emulators:exec --only firestore "node --test scripts/firestore.rules.test.js"
 *
 * Asserts the PHASE 0/1/3 boundary conditions:
 *   - DESIGNER / TECHNICIAN cannot read `private/finance`.
 *   - DESIGNER / TECHNICIAN cannot read unassigned cases.
 *   - DESIGNER cannot modify `designerId`.
 *   - Only the referring dentist or lab owner may create a case.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");

const PROJECT_ID = "demo-dentalhub";
const RULES = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");

let env;

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: RULES, host: "127.0.0.1", port: 8080 },
  });
});

test.after(async () => {
  await env.cleanup();
});

async function seed() {
  const admin = env.authenticatedContext("lab1"); // lab owner (uid === labId)
  const db = admin.firestore();

  // Lab owner account (uid === labId).
  await db.doc("user_roles/lab1").set({ role: "lab", accountType: "lab" });

  // Assigned case (designer1 is the assigned designer).
  await db.doc("lab_orders/lab1/cases/case1").set({
    id: "case1",
    caseId: 1,
    dentistId: "dentist1",
    doctor: "Dr. X",
    patient: "Patient A",
    designerId: "designer1",
    status: "in_progress",
  });

  // Unassigned case (no designerId).
  await db.doc("lab_orders/lab1/cases/case2").set({
    id: "case2",
    caseId: 2,
    dentistId: "dentist1",
    doctor: "Dr. X",
    patient: "Patient B",
    status: "new",
  });

  // Private finance subcollection.
  await db.doc("lab_orders/lab1/cases/case1/private/finance").set({
    labId: "lab1",
    caseId: "case1",
    price: 500,
    currency: "USD",
  });
}

test("designer can read their assigned case", async () => {
  await seed();
  const db = env.authenticatedContext("designer1", { role: "DESIGNER", labId: "lab1" }).firestore();
  await assertSucceeds(db.doc("lab_orders/lab1/cases/case1").get());
});

test("designer cannot read an unassigned case", async () => {
  await seed();
  const db = env.authenticatedContext("designer1", { role: "DESIGNER", labId: "lab1" }).firestore();
  await assertFails(db.doc("lab_orders/lab1/cases/case2").get());
});

test("technician cannot read an unassigned case", async () => {
  await seed();
  const db = env.authenticatedContext("tech1", { role: "TECHNICIAN", labId: "lab1" }).firestore();
  await assertFails(db.doc("lab_orders/lab1/cases/case2").get());
});

test("designer cannot read private/finance", async () => {
  await seed();
  const db = env.authenticatedContext("designer1", { role: "DESIGNER", labId: "lab1" }).firestore();
  await assertFails(db.doc("lab_orders/lab1/cases/case1/private/finance").get());
});

test("technician cannot read private/finance", async () => {
  await seed();
  const db = env.authenticatedContext("tech1", { role: "TECHNICIAN", labId: "lab1" }).firestore();
  await assertFails(db.doc("lab_orders/lab1/cases/case1/private/finance").get());
});

test("lab owner can read private/finance", async () => {
  await seed();
  const db = env.authenticatedContext("lab1").firestore();
  await assertSucceeds(db.doc("lab_orders/lab1/cases/case1/private/finance").get());
});

test("lab admin can read private/finance", async () => {
  await seed();
  const db = env.authenticatedContext("admin1", { role: "ADMIN", labId: "lab1" }).firestore();
  await assertSucceeds(db.doc("lab_orders/lab1/cases/case1/private/finance").get());
});

test("designer cannot modify designerId", async () => {
  await seed();
  const db = env.authenticatedContext("designer1", { role: "DESIGNER", labId: "lab1" }).firestore();
  await assertFails(
    db.doc("lab_orders/lab1/cases/case1").update({ designerId: "designer2" }),
  );
});

test("designer can update non-sensitive fields on an assigned case", async () => {
  await seed();
  const db = env.authenticatedContext("designer1", { role: "DESIGNER", labId: "lab1" }).firestore();
  await assertSucceeds(db.doc("lab_orders/lab1/cases/case1").update({ currentStage: "design" }));
});

test("designer cannot modify financial fields on an assigned case", async () => {
  await seed();
  const db = env.authenticatedContext("designer1", { role: "DESIGNER", labId: "lab1" }).firestore();
  await assertFails(db.doc("lab_orders/lab1/cases/case1").update({ price: 1 }));
});

test("dentist can create a case", async () => {
  await seed();
  const db = env.authenticatedContext("dentist1").firestore();
  await assertSucceeds(
    db.doc("lab_orders/lab1/cases/case3").set({
      id: "case3",
      caseId: 3,
      dentistId: "dentist1",
      doctor: "Dr. X",
      patient: "Patient C",
      status: "new",
    }),
  );
});

test("unauthenticated user cannot create a case", async () => {
  await seed();
  const db = env.unauthenticatedContext().firestore();
  await assertFails(
    db.doc("lab_orders/lab1/cases/case4").set({
      id: "case4",
      dentistId: "dentist1",
      patient: "Patient D",
    }),
  );
});

test("a foreign designer cannot read another designer's case", async () => {
  await seed();
  const db = env.authenticatedContext("designer2", { role: "DESIGNER", labId: "lab1" }).firestore();
  await assertFails(db.doc("lab_orders/lab1/cases/case1").get());
});

test("member of another lab cannot read this lab's case", async () => {
  await seed();
  const db = env.authenticatedContext("designer1", { role: "DESIGNER", labId: "lab2" }).firestore();
  await assertFails(db.doc("lab_orders/lab1/cases/case1").get());
});

test("unauthenticated user cannot read private/finance", async () => {
  await seed();
  const db = env.unauthenticatedContext().firestore();
  await assertFails(db.doc("lab_orders/lab1/cases/case1/private/finance").get());
});
