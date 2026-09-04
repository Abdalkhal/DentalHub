/**
 * Storage Security Rules emulator tests.
 *
 * Run with the Storage emulator:
 *   firebase emulators:exec --only storage,firestore \
 *     "node --test scripts/storage.rules.test.js"
 *
 * The rule these tests exist for: Storage Rules are OR-based across matching
 * path patterns, so a trailing `match /{allPaths=**}` granting read to any
 * signed-in user silently overrides every stricter rule above it. `storage.rules`
 * carried exactly that, which meant every case scan in the system was readable
 * by any authenticated account. These assertions are what stop it coming back.
 */

import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PROJECT_ID = "demo-dentalhub";
const STORAGE_RULES = fs.readFileSync(path.join(__dirname, "..", "storage.rules"), "utf8");
const FIRESTORE_RULES = fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8");

const LAB = "lab-1";
const CASE = "case-1";
const DENTIST = "dentist-1";
const ASSIGNED_DESIGNER = "designer-assigned";
const OTHER_DESIGNER = "designer-other";
const OUTSIDER = "random-dentist";

const SCAN = `case_scans/${LAB}/${CASE}/scan.stl`;
const BYTES = Buffer.from("solid test\nendsolid test\n");
const META = { customMetadata: { dentistId: DENTIST, caseId: CASE } };

let env;

/** A designer of `lab`, as the invite Cloud Function issues them. */
function staff(uid, role, labId = LAB) {
  return env.authenticatedContext(uid, { role, labId });
}

test.before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    storage: { rules: STORAGE_RULES, host: "127.0.0.1", port: 9299 },
    firestore: { rules: FIRESTORE_RULES, host: "127.0.0.1", port: 8111 },
  });

  // The rules resolve case assignment from Firestore, so the case document has
  // to exist for designer access checks to mean anything.
  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx
      .firestore()
      .doc(`lab_orders/${LAB}/cases/${CASE}`)
      .set({ dentistId: DENTIST, designerId: ASSIGNED_DESIGNER, patient: "Test" });
  });

  await env.withSecurityRulesDisabled(async (ctx) => {
    await ctx.storage().ref(SCAN).put(BYTES, META);
  });
});

test.after(async () => {
  await env.cleanup();
});

test("the lab owner can read a case scan", async () => {
  await assertSucceeds(env.authenticatedContext(LAB).storage().ref(SCAN).getMetadata());
});

test("the referring dentist can read their own scan", async () => {
  await assertSucceeds(env.authenticatedContext(DENTIST).storage().ref(SCAN).getMetadata());
});

test("the assigned designer can read the scan", async () => {
  await assertSucceeds(staff(ASSIGNED_DESIGNER, "DESIGNER").storage().ref(SCAN).getMetadata());
});

test("a designer in the same lab but NOT assigned cannot read the scan", async () => {
  await assertFails(staff(OTHER_DESIGNER, "DESIGNER").storage().ref(SCAN).getMetadata());
});

test("a designer from a DIFFERENT lab cannot read the scan", async () => {
  await assertFails(
    staff(OTHER_DESIGNER, "DESIGNER", "lab-2").storage().ref(SCAN).getMetadata(),
  );
});

// The regression test for the removed catch-all.
test("an unrelated signed-in user cannot read a case scan", async () => {
  await assertFails(env.authenticatedContext(OUTSIDER).storage().ref(SCAN).getMetadata());
});

test("a signed-out visitor cannot read a case scan", async () => {
  await assertFails(env.unauthenticatedContext().storage().ref(SCAN).getMetadata());
});

test("an unrelated user cannot overwrite an existing scan", async () => {
  await assertFails(
    env
      .authenticatedContext(OUTSIDER)
      .storage()
      .ref(SCAN)
      .put(Buffer.from("malicious"), { customMetadata: { dentistId: OUTSIDER, caseId: CASE } }),
  );
});

test("even the referring dentist cannot overwrite a scan already uploaded", async () => {
  await assertFails(env.authenticatedContext(DENTIST).storage().ref(SCAN).put(BYTES, META));
});

test("a case upload without dentistId/caseId metadata is rejected", async () => {
  await assertFails(
    env
      .authenticatedContext(DENTIST)
      .storage()
      .ref(`case_scans/${LAB}/${CASE}/no-metadata.stl`)
      .put(BYTES),
  );
});

test("the dentist can create a new scan with correct metadata", async () => {
  await assertSucceeds(
    env
      .authenticatedContext(DENTIST)
      .storage()
      .ref(`case_scans/${LAB}/${CASE}/second-scan.stl`)
      .put(BYTES, META),
  );
});

test("a path with no explicit rule is denied (no catch-all)", async () => {
  await assertFails(
    env.authenticatedContext(OUTSIDER).storage().ref("some/unmapped/path.bin").getMetadata(),
  );
});
