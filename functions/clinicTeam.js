/**
 * Clinic team: a doctor joins another doctor's clinic as a member. Each keeps
 * their own account; nobody ever enters someone else's.
 *
 *   clinic_codes/{CODE}        an invite (one use, 7 days) or the clinic's own
 *                              code that doctors send a join request with
 *   clinic_members/{owner_clinic_member}
 *                              requested | active | left, and the role
 *   clinic_shared_appointments/{owner_appt}
 *                              a copy of one appointment for the doctor it is
 *                              assigned to
 *   clinic_shared_patients/{owner_patient_member}
 *                              one member's copy of a patient they treat, with
 *                              the fees left out unless they may see them
 *
 * dentist_records/{owner} stays readable by its owner alone. A member only ever
 * receives the copies made here, and they are deleted when the member leaves.
 * A member's edits are single operations applied here to the owner's record,
 * so a status can't be forged and nothing else in the record can be touched.
 */

const crypto = require("crypto");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

const ROLES = ["doctor", "visitor"];
const PERMISSIONS = [
  "appointments",
  "bookings",
  "patients",
  "medical",
  "files",
  "payments",
  "balances",
  "reports",
  "materials",
];
const RECEPTION = { appointments: true, bookings: true, patients: true };
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const INVITE_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_OPEN_INVITES = 20;
const NOTIFY_TTL = 30 * 24 * 60 * 60 * 1000;
const STATUSES = ["confirmed", "waiting", "completed", "cancelled"];

/**
 * @param {FirebaseFirestore.Firestore} firestore the database.
 * @param {function(object): Promise<boolean>} isVerifiedAccount email check.
 * @param {function(): object} getBucket the Storage bucket.
 * @return {object} the callable functions and the helpers index.js triggers use.
 */
module.exports = function clinicTeam(firestore, isVerifiedAccount, getBucket) {
  const members = firestore.collection("clinic_members");
  const codes = firestore.collection("clinic_codes");
  const shared = firestore.collection("clinic_shared_appointments");
  const sharedPatients = firestore.collection("clinic_shared_patients");
  const fileTokens = firestore.collection("clinic_file_tokens");
  const activity = firestore.collection("clinic_activity");
  const memberKey = (owner, clinic, member) => `${owner}_${clinic}_${member}`;
  const records = (uid) => firestore.collection("dentist_records").doc(uid);

  const newCode = () =>
    [...crypto.randomBytes(8)].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
  const cleanCode = (v) =>
    String(v || "")
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "")
      .slice(0, 12);
  const cleanId = (v) => {
    const id = String(v || "");
    if (!id || id.length > 300 || id.includes("/")) {
      throw new HttpsError("invalid-argument", "bad-id");
    }
    return id;
  };

  /**
   * Who an account is, for the other side to see.
   * @param {string} uid the account.
   * @return {Promise<object>} name, photo, phone and account type.
   */
  async function card(uid) {
    const [role, pub] = await Promise.all([
      firestore.collection("user_roles").doc(uid).get(),
      firestore.collection("public_profiles").doc(uid).get(),
    ]);
    const r = role.exists ? role.data() : {};
    const p = pub.exists ? pub.data() : {};
    return {
      name: String(r.name || p.name || r.clinicName || "طبيب"),
      photoURL: String(p.photoURL || r.photoURL || ""),
      phone: String(r.phone || ""),
      accountType: String(r.accountType || ""),
    };
  }

  /**
   * Only verified dentists take part.
   * @param {object} request the callable request.
   * @return {Promise<{uid: string, me: object}>} the caller.
   */
  async function dentist(request) {
    if (!request.auth) throw new HttpsError("unauthenticated", "sign-in");
    const me = await card(request.auth.uid);
    if (me.accountType !== "dentist") {
      throw new HttpsError("permission-denied", "dentists-only");
    }
    if (!(await isVerifiedAccount(request.auth))) {
      throw new HttpsError("failed-precondition", "verify-email");
    }
    return { uid: request.auth.uid, me };
  }

  /**
   * A doctor or a secretary: everyone who can hold a membership.
   * @param {object} request the callable request.
   * @return {Promise<{uid: string, me: object}>} the caller.
   */
  async function memberAccount(request) {
    if (!request.auth) throw new HttpsError("unauthenticated", "sign-in");
    const me = await card(request.auth.uid);
    if (me.accountType !== "dentist" && me.accountType !== "secretary") {
      throw new HttpsError("permission-denied", "dentists-only");
    }
    if (!(await isVerifiedAccount(request.auth))) {
      throw new HttpsError("failed-precondition", "verify-email");
    }
    return { uid: request.auth.uid, me };
  }

  /**
   * Keeps only known permissions, as booleans.
   * @param {object} input what the client sent.
   * @return {object} the permissions.
   */
  function normalizePermissions(input) {
    const out = {};
    for (const k of PERMISSIONS) out[k] = !!(input && input[k] === true);
    // These open a patient's file, so they can't exist without the patient list.
    if (out.medical || out.files || out.payments || out.balances) out.patients = true;
    return out;
  }

  /**
   * One line of the clinic's activity record. Clients can read it, not write it.
   * @param {object} m the membership.
   * @param {object} who the person acting.
   * @param {string} message what they did.
   * @return {Promise<void>} once written.
   */
  async function logActivity(m, who, message) {
    await activity
      .add({
        ownerId: m.ownerId,
        clinicId: m.clinicId,
        memberId: who.uid || m.memberId,
        memberName: who.name || m.memberName,
        message,
        at: Date.now(),
      })
      .catch((err) => console.warn("Activity not recorded", err));
  }

  const isSecretary = (m) => m.role === "secretary";
  const can = (m, permission) => isSecretary(m) && (m.permissions || {})[permission] === true;

  /**
   * Finds one of the caller's own clinics.
   * @param {string} uid the owner.
   * @param {string} clinicId the clinic.
   * @return {Promise<object>} the clinic.
   */
  async function ownClinic(uid, clinicId) {
    const snap = await records(uid).get();
    const list = (snap.exists && snap.data().clinics) || [];
    const clinic = list.find((c) => c.id === clinicId);
    if (!clinic) throw new HttpsError("not-found", "no-clinic");
    return clinic;
  }

  /**
   * Writes an in-app notification (pushed by sendPushOnNotification).
   * @param {string} userId the recipient.
   * @param {string} title the heading.
   * @param {string} body the text.
   * @return {Promise<void>} once written.
   */
  async function notify(userId, title, body) {
    const now = Date.now();
    const id = `team_${userId}_${now}_${crypto.randomBytes(3).toString("hex")}`;
    await firestore
      .collection("notifications")
      .doc(id)
      .set({
        id,
        userId,
        title,
        body,
        type: "clinic_team",
        senderId: "system",
        isRead: false,
        createdAt: now,
        expiresAt: now + NOTIFY_TTL,
      })
      .catch((err) => console.warn("Team notification failed", err));
  }

  /**
   * Keeps the assigned doctor's copy of an appointment in step with the record.
   * @param {string} ownerId the clinic's owner.
   * @param {string} apptId the appointment.
   * @param {object|null} appt the appointment now, if it still exists.
   * @return {Promise<void>} once done.
   */
  async function syncSharedAppointment(ownerId, apptId, appt) {
    await syncStaffAppointments(ownerId, apptId, appt);
    const ref = shared.doc(`${ownerId}_${apptId}`);
    const doctorUid = appt && !appt.deleted ? appt.doctorUid : null;
    let active = false;
    if (doctorUid && appt.clinicId) {
      const m = await members.doc(memberKey(ownerId, appt.clinicId, doctorUid)).get();
      active = m.exists && m.data().status === "active";
    }
    if (!active) {
      await ref.delete();
      return;
    }
    await ref.set({
      ownerId,
      appointmentId: apptId,
      clinicId: appt.clinicId,
      doctorUid,
      patientName: appt.patientName || "",
      phone: appt.phone || "",
      date: appt.date || "",
      time: appt.time || "",
      appointmentType: appt.appointmentType || "",
      treatment: appt.treatment || "",
      notes: appt.notes || "",
      status: appt.status || "confirmed",
      updatedAt: Date.now(),
    });
  }

  /**
   * A secretary's copy of an appointment: one per secretary allowed to see it.
   * It uses the same field and rule as a doctor's copy: only they can read it.
   * @param {string} ownerId the clinic's owner.
   * @param {string} apptId the appointment.
   * @param {object|null} appt the appointment now, if it still exists.
   * @return {Promise<void>} once done.
   */
  async function syncStaffAppointments(ownerId, apptId, appt) {
    const snap = await members.where("ownerId", "==", ownerId).get();
    for (const d of snap.docs) {
      const m = d.data();
      if (!isSecretary(m)) continue;
      const ref = shared.doc(`${ownerId}_${apptId}_${m.memberId}`);
      const entitled =
        appt &&
        !appt.deleted &&
        m.status === "active" &&
        m.clinicId === appt.clinicId &&
        can(m, "appointments");
      if (!entitled) {
        await ref.delete();
        continue;
      }
      await ref.set({
        ownerId,
        appointmentId: apptId,
        clinicId: appt.clinicId,
        doctorUid: m.memberId,
        staff: true,
        doctor: appt.doctor || "",
        assignedDoctorUid: appt.doctorUid || "",
        patientName: appt.patientName || "",
        phone: appt.phone || "",
        date: appt.date || "",
        time: appt.time || "",
        appointmentType: appt.appointmentType || "",
        treatment: appt.treatment || "",
        notes: appt.notes || "",
        status: appt.status || "confirmed",
        createdBy: appt.createdBy || "",
        updatedAt: Date.now(),
      });
    }
  }

  /**
   * Gives a newly active member the appointments already assigned to them.
   * @param {string} ownerId the clinic's owner.
   * @param {string} clinicId the clinic.
   * @param {string} memberId the member.
   * @return {Promise<void>} once done.
   */
  async function shareExisting(ownerId, clinicId, memberId) {
    await syncMemberPatients(ownerId, clinicId, memberId);
    const m = await members.doc(memberKey(ownerId, clinicId, memberId)).get();
    const staff = m.exists && isSecretary(m.data());
    const q = records(ownerId).collection("appointments");
    // A secretary may see the whole calendar; a doctor gets what is theirs.
    const snap = await (
      staff ? q.where("clinicId", "==", clinicId) : q.where("doctorUid", "==", memberId)
    ).get();
    for (const d of snap.docs) {
      if (d.data().clinicId === clinicId) {
        await syncSharedAppointment(ownerId, d.id, d.data());
      }
    }
  }

  /**
   * Removes every copy a doctor holds from one clinic owner.
   * @param {string} ownerId the owner.
   * @param {string} clinicId the clinic.
   * @param {string} memberId the doctor.
   * @return {Promise<void>} once done.
   */
  async function unshare(ownerId, clinicId, memberId) {
    const snap = await shared.where("doctorUid", "==", memberId).get();
    for (const d of snap.docs) {
      const a = d.data();
      if (a.ownerId === ownerId && a.clinicId === clinicId) await d.ref.delete();
    }
    const copies = await sharedPatients.where("memberId", "==", memberId).get();
    for (const d of copies.docs) {
      const a = d.data();
      if (a.ownerId !== ownerId || a.clinicId !== clinicId) continue;
      await d.ref.delete();
      // They may have kept the file links: replace them for whoever remains.
      if ((a.files || []).length) await revokeFileLinks(ownerId, a.id);
    }
  }

  /* ── Patients a member treats ──────────────────────────────────── */

  const isOwnFile = (ownerId, f) =>
    f.path && f.path.startsWith(`dentist_records/${ownerId}/`) && !f.path.includes("..");

  /**
   * Download links for a patient's files. One token per file, kept out of
   * clients' reach here; the link itself only ever goes in the copy of a
   * doctor treating that patient.
   * @param {string} ownerId the owner.
   * @param {object} patient the record.
   * @return {Promise<Array<object>>} the files with their links.
   */
  async function filesWithLinks(ownerId, patient) {
    const files = (patient.files || []).filter((f) => isOwnFile(ownerId, f));
    if (!files.length) return [];
    const ref = fileTokens.doc(`${ownerId}_${patient.id}`);
    const snap = await ref.get();
    const tokens = snap.exists ? snap.data().tokens || {} : {};
    const bucket = getBucket();
    const out = [];
    let added = false;
    for (const f of files) {
      if (!tokens[f.id]) {
        const token = crypto.randomUUID();
        try {
          await bucket
            .file(f.path)
            .setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
        } catch (err) {
          console.warn("Shared file not found", f.path, err.message);
          continue;
        }
        tokens[f.id] = { token, path: f.path };
        added = true;
      }
      out.push({
        id: f.id,
        name: f.name,
        type: f.type,
        addedAt: f.addedAt,
        url:
          `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
          `${encodeURIComponent(f.path)}?alt=media&token=${tokens[f.id].token}`,
      });
    }
    if (added) await ref.set({ tokens });
    return out;
  }

  /**
   * Ends every download link of one patient, then rebuilds remaining copies.
   * @param {string} ownerId the owner.
   * @param {string} patientId the patient.
   * @return {Promise<void>} once done.
   */
  async function revokeFileLinks(ownerId, patientId) {
    const ref = fileTokens.doc(`${ownerId}_${patientId}`);
    const snap = await ref.get();
    if (!snap.exists) return;
    const bucket = getBucket();
    for (const t of Object.values(snap.data().tokens || {})) {
      await bucket
        .file(t.path)
        .setMetadata({ metadata: { firebaseStorageDownloadTokens: null } })
        .catch(() => {});
    }
    await ref.delete();
    const rec = await records(ownerId).collection("patients").doc(patientId).get();
    if (rec.exists) await syncPatientCopies(ownerId, patientId, rec.data());
  }

  const FEE_FIELDS = ["currency", "cost"];

  /**
   * What one member receives of a patient: named fields only, so anything added
   * to the record later stays private until it is listed here.
   * @param {string} ownerId the owner.
   * @param {string} patientId the patient.
   * @param {object} p the record.
   * @param {object} m the membership.
   * @param {Array<object>} files the files with links.
   * @return {object} the copy.
   */
  function patientCopy(ownerId, patientId, p, m, files) {
    if (isSecretary(m)) return staffPatientCopy(ownerId, patientId, p, m, files);
    const finance = m.financeAccess === true;
    const plan = (p.plan || []).map((s) => {
      if (finance) return s;
      const c = { ...s };
      FEE_FIELDS.forEach((k) => delete c[k]);
      return c;
    });
    return {
      id: patientId,
      ownerId,
      clinicId: p.clinicId,
      memberId: m.memberId,
      fileNo: p.fileNo || "",
      name: p.name || "",
      age: p.age || "",
      gender: p.gender || "",
      phone: p.phone || "",
      status: p.status || "new",
      history: p.history || {},
      complaint: p.complaint || "",
      doctorNote: p.doctorNote || "",
      allergies: p.allergies || "",
      meds: p.meds || "",
      lastVisit: p.lastVisit || "",
      createdAt: p.createdAt || "",
      teeth: p.teeth || {},
      visits: p.visits || [],
      plan,
      log: p.log || [],
      files,
      updatedAt: Date.now(),
      ...(finance
        ? {
            finance: {
              fees: feesOf(p),
              payments: (p.payments || []).map((x) => ({
                id: x.id,
                date: x.date,
                amount: x.amount,
                currency: payCurrency(p, x),
                receiptNo: x.receiptNo || "",
                note: x.note || "",
              })),
            },
          }
        : {}),
    };
  }

  /**
   * A secretary's copy: the basics, plus only what each permission opens.
   * @param {string} ownerId the owner.
   * @param {string} patientId the patient.
   * @param {object} p the record.
   * @param {object} m the membership.
   * @param {Array<object>} files the files with links.
   * @return {object} the copy.
   */
  function staffPatientCopy(ownerId, patientId, p, m, files) {
    return {
      id: patientId,
      ownerId,
      clinicId: p.clinicId,
      memberId: m.memberId,
      fileNo: p.fileNo || "",
      name: p.name || "",
      age: p.age || "",
      gender: p.gender || "",
      phone: p.phone || "",
      status: p.status || "new",
      lastVisit: p.lastVisit || "",
      createdAt: p.createdAt || "",
      updatedAt: Date.now(),
      ...(can(m, "medical")
        ? {
            medical: {
              history: p.history || {},
              complaint: p.complaint || "",
              doctorNote: p.doctorNote || "",
              allergies: p.allergies || "",
              meds: p.meds || "",
              teeth: p.teeth || {},
              visits: (p.visits || []).map((v) => ({
                id: v.id,
                date: v.date,
                procedure: v.procedure,
                note: v.note || "",
              })),
              plan: (p.plan || []).map((s) => ({
                id: s.id,
                title: s.title,
                status: s.status,
                tooth: s.tooth || "",
                note: s.note || "",
              })),
            },
          }
        : {}),
      ...(can(m, "files") ? { files } : {}),
      ...(can(m, "balances")
        ? {
            finance: {
              fees: feesOf(p),
              payments: (p.payments || []).map((x) => ({
                id: x.id,
                date: x.date,
                amount: x.amount,
                currency: payCurrency(p, x),
                receiptNo: x.receiptNo || "",
                note: x.note || "",
              })),
            },
          }
        : {}),
    };
  }

  const seesPatient = (m, p) =>
    isSecretary(m)
      ? can(m, "patients")
      : m.allPatients === true || (p.doctorUids || []).includes(m.memberId);

  // Same rules as src/lib/patientsStore.ts.
  const payCurrency = (p, x) => x.currency || p.feeCurrency || "USD";
  const feesOf = (p) => {
    if (p.fees) return { USD: Number(p.fees.USD) || 0, IQD: Number(p.fees.IQD) || 0 };
    const out = { USD: 0, IQD: 0 };
    out[p.feeCurrency || "USD"] = Number(p.totalFees) || 0;
    return out;
  };

  /**
   * Writes each entitled member's copy of a patient and removes the others'.
   * @param {string} ownerId the owner.
   * @param {string} patientId the patient.
   * @param {object|null} p the record now, if it still exists.
   * @return {Promise<void>} once done.
   */
  async function syncPatientCopies(ownerId, patientId, p) {
    const snap = await members.where("ownerId", "==", ownerId).get();
    if (snap.empty) return;
    const live = p && !p.deleted ? p : null;
    const assigned = (live && live.doctorUids) || [];
    let files = null;
    for (const d of snap.docs) {
      const m = d.data();
      const ref = sharedPatients.doc(`${ownerId}_${patientId}_${m.memberId}`);
      const entitled =
        live &&
        m.status === "active" &&
        m.clinicId === live.clinicId &&
        seesPatient(m, { doctorUids: assigned });
      if (!entitled) {
        await ref.delete();
        continue;
      }
      // A file link is only made for someone who may open the files.
      const wantsFiles = !isSecretary(m) || can(m, "files");
      if (wantsFiles && files === null)
        files = await filesWithLinks(ownerId, { ...live, id: patientId });
      await ref.set(patientCopy(ownerId, patientId, live, m, wantsFiles ? files : []));
    }
  }

  /**
   * Brings one member's copies in line with their permissions.
   * @param {string} ownerId the owner.
   * @param {string} clinicId the clinic.
   * @param {string} memberId the member.
   * @return {Promise<void>} once done.
   */
  async function syncMemberPatients(ownerId, clinicId, memberId) {
    const m = await members.doc(memberKey(ownerId, clinicId, memberId)).get();
    const allPatients = m.exists && (m.data().allPatients === true || can(m.data(), "patients"));
    const snap = await records(ownerId)
      .collection("patients")
      .where("clinicId", "==", clinicId)
      .get();
    const had = await sharedPatients.where("memberId", "==", memberId).get();
    const ids = new Set(
      had.docs.filter((d) => d.data().ownerId === ownerId).map((d) => d.data().id),
    );
    for (const d of snap.docs) {
      const p = d.data();
      if (allPatients || (p.doctorUids || []).includes(memberId) || ids.has(d.id)) {
        await syncPatientCopies(ownerId, d.id, p);
      }
    }
  }

  /**
   * A deleted account leaves every team, on either side.
   * @param {string} uid the deleted account.
   * @return {Promise<void>} once done.
   */
  async function removeDeletedAccount(uid) {
    const own = await sharedPatients.where("ownerId", "==", uid).get();
    for (const d of own.docs) await d.ref.delete();
    const [asMember, asOwner] = await Promise.all([
      members.where("memberId", "==", uid).get(),
      members.where("ownerId", "==", uid).get(),
    ]);
    for (const d of [...asMember.docs, ...asOwner.docs]) {
      const m = d.data();
      await unshare(m.ownerId, m.clinicId, m.memberId);
      await d.ref.delete();
    }
    const invites = await codes.where("ownerId", "==", uid).get();
    for (const d of invites.docs) await d.ref.delete();
  }

  const createClinicInvite = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    const { uid, me } = await dentist(request);
    const data = request.data || {};
    const clinic = await ownClinic(uid, cleanId(data.clinicId));
    const secretary = data.role === "secretary";
    const role = secretary ? "secretary" : ROLES.includes(data.role) ? data.role : "doctor";
    const open = await codes.where("ownerId", "==", uid).get();
    const live = open.docs.filter(
      (d) => d.data().kind === "invite" && d.data().expiresAt > Date.now(),
    );
    if (live.length >= MAX_OPEN_INVITES) {
      throw new HttpsError("resource-exhausted", "too-many-invites");
    }
    const code = newCode();
    const expiresAt = Date.now() + INVITE_TTL;
    await codes.doc(code).set({
      code,
      kind: "invite",
      ownerId: uid,
      ownerName: me.name,
      clinicId: clinic.id,
      clinicName: clinic.name || "",
      role,
      ...(secretary ? { permissions: normalizePermissions(data.permissions || RECEPTION) } : {}),
      createdAt: Date.now(),
      expiresAt,
    });
    return { code, expiresAt };
  });

  const getClinicJoinCode = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    const { uid, me } = await dentist(request);
    const clinic = await ownClinic(uid, cleanId((request.data || {}).clinicId));
    const snap = await codes.where("ownerId", "==", uid).get();
    const found = snap.docs.find(
      (d) => d.data().kind === "clinic" && d.data().clinicId === clinic.id,
    );
    if (found) return { code: found.id };
    const code = newCode();
    await codes.doc(code).set({
      code,
      kind: "clinic",
      ownerId: uid,
      ownerName: me.name,
      clinicId: clinic.id,
      clinicName: clinic.name || "",
      createdAt: Date.now(),
    });
    return { code };
  });

  const liveCode = (snap) => {
    const c = snap.exists ? snap.data() : null;
    if (!c || (c.kind === "invite" && c.expiresAt <= Date.now())) {
      throw new HttpsError("not-found", "invalid-code");
    }
    return c;
  };

  const lookupClinicCode = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    await memberAccount(request);
    const code = cleanCode((request.data || {}).code);
    if (!code) throw new HttpsError("not-found", "invalid-code");
    const c = liveCode(await codes.doc(code).get());
    return {
      code,
      kind: c.kind,
      clinicName: c.clinicName,
      ownerName: c.ownerName,
      role: c.role || null,
      permissions: c.permissions || null,
      mine: c.ownerId === request.auth.uid,
    };
  });

  // The invite page before signing up: a secretary has no account yet. It says
  // no more than the invite link's holder is meant to know.
  const lookupStaffInvite = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    const code = cleanCode((request.data || {}).code);
    if (!code) throw new HttpsError("not-found", "invalid-code");
    const c = liveCode(await codes.doc(code).get());
    if (c.role !== "secretary") return { secretary: false };
    return { secretary: true, clinicName: c.clinicName, ownerName: c.ownerName };
  });

  const joinClinicWithCode = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    const { uid, me } = await memberAccount(request);
    const code = cleanCode((request.data || {}).code);
    if (!code) throw new HttpsError("not-found", "invalid-code");
    const ref = codes.doc(code);
    const result = await firestore.runTransaction(async (tx) => {
      const c = liveCode(await tx.get(ref));
      if (c.ownerId === uid) throw new HttpsError("failed-precondition", "own-clinic");
      // A secretary's invite is for a secretary account, a doctor's for a doctor's.
      if ((c.role === "secretary") !== (me.accountType === "secretary")) {
        throw new HttpsError(
          "failed-precondition",
          c.role === "secretary" ? "needs-secretary-account" : "needs-doctor-account",
        );
      }
      const mRef = members.doc(memberKey(c.ownerId, c.clinicId, uid));
      const cur = await tx.get(mRef);
      const status = cur.exists ? cur.data().status : null;
      if (status === "active") throw new HttpsError("already-exists", "already-member");
      if (status === "requested" && c.kind === "clinic") {
        throw new HttpsError("already-exists", "already-requested");
      }
      const invited = c.kind === "invite";
      tx.set(mRef, {
        ownerId: c.ownerId,
        ownerName: c.ownerName,
        clinicId: c.clinicId,
        clinicName: c.clinicName,
        memberId: uid,
        memberName: me.name,
        memberPhoto: me.photoURL,
        memberPhone: me.phone,
        role: invited ? c.role : "doctor",
        financeAccess: invited && c.role === "doctor",
        ...(c.role === "secretary" ? { permissions: normalizePermissions(c.permissions) } : {}),
        status: invited ? "active" : "requested",
        requestedAt: Date.now(),
        ...(invited ? { joinedAt: Date.now() } : {}),
      });
      // An invite is good for one doctor.
      if (invited) tx.delete(ref);
      return { invited, ownerId: c.ownerId, clinicId: c.clinicId, clinicName: c.clinicName };
    });
    if (result.invited) {
      await shareExisting(result.ownerId, result.clinicId, uid);
      await notify(
        result.ownerId,
        "انضم عضو جديد إلى عيادتك",
        `قبل ${me.name} دعوتك إلى ${result.clinicName}.`,
      );
    } else {
      await notify(
        result.ownerId,
        "طلب انضمام إلى عيادتك",
        `يطلب ${me.name} الانضمام إلى ${result.clinicName}.`,
      );
    }
    return { status: result.invited ? "active" : "requested", clinicName: result.clinicName };
  });

  /**
   * Loads a membership the caller owns.
   * @param {string} uid the caller.
   * @param {string} id the membership.
   * @return {Promise<object>} its reference and data.
   */
  async function ownedMember(uid, id) {
    const ref = members.doc(cleanId(id));
    const snap = await ref.get();
    if (!snap.exists || snap.data().ownerId !== uid) {
      throw new HttpsError("permission-denied", "not-owner");
    }
    return { ref, m: snap.data() };
  }

  const resolveClinicRequest = onCall(
    { region: "us-central1", maxInstances: 5 },
    async (request) => {
      const { uid } = await dentist(request);
      const data = request.data || {};
      const { ref, m } = await ownedMember(uid, data.memberDocId);
      if (m.status !== "requested") throw new HttpsError("failed-precondition", "not-pending");
      if (data.approve !== true) {
        await ref.delete();
        await notify(
          m.memberId,
          "لم يُقبل طلب الانضمام",
          `لم يُقبل طلبك للانضمام إلى ${m.clinicName}.`,
        );
        return { ok: true };
      }
      const role = ROLES.includes(data.role) ? data.role : "doctor";
      await ref.update({
        status: "active",
        role,
        financeAccess: role === "doctor",
        joinedAt: Date.now(),
      });
      await shareExisting(uid, m.clinicId, m.memberId);
      await notify(m.memberId, "قُبل طلب الانضمام", `أصبحت عضواً في ${m.clinicName}.`);
      return { ok: true };
    },
  );

  const setClinicMemberRole = onCall(
    { region: "us-central1", maxInstances: 5 },
    async (request) => {
      const { uid } = await dentist(request);
      const data = request.data || {};
      if (!ROLES.includes(data.role)) throw new HttpsError("invalid-argument", "bad-role");
      const { ref, m } = await ownedMember(uid, data.memberDocId);
      if (m.status !== "active" || isSecretary(m)) {
        throw new HttpsError("failed-precondition", "not-active");
      }
      // A visitor doesn't handle money; a change of role decides it anew.
      await ref.update({ role: data.role, financeAccess: data.role === "doctor" });
      await syncMemberPatients(uid, m.clinicId, m.memberId);
      return { ok: true };
    },
  );

  // The owner removes a member, or a doctor leaves or withdraws their request.
  const removeClinicMember = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "sign-in");
    const uid = request.auth.uid;
    const ref = members.doc(cleanId((request.data || {}).memberDocId));
    const snap = await ref.get();
    const m = snap.exists ? snap.data() : null;
    if (!m || (m.ownerId !== uid && m.memberId !== uid)) {
      throw new HttpsError("permission-denied", "not-allowed");
    }
    if (m.status !== "active") {
      await ref.delete();
      return { ok: true };
    }
    await ref.update({ status: "left", leftAt: Date.now() });
    await unshare(m.ownerId, m.clinicId, m.memberId);
    if (m.ownerId === uid) {
      await notify(m.memberId, "انتهت عضويتك في عيادة", `لم تعد عضواً في ${m.clinicName}.`);
    } else {
      await notify(m.ownerId, "غادر عضو عيادتك", `غادر ${m.memberName} ${m.clinicName}.`);
    }
    return { ok: true };
  });

  const revokeClinicInvite = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    const { uid } = await dentist(request);
    const ref = codes.doc(cleanCode((request.data || {}).code) || "-");
    const snap = await ref.get();
    if (snap.exists && snap.data().ownerId === uid && snap.data().kind === "invite") {
      await ref.delete();
    }
    return { ok: true };
  });

  // A member with the doctor role updates the status and notes of their own
  // appointment. A visitor only reads.
  const updateSharedAppointment = onCall(
    { region: "us-central1", maxInstances: 5 },
    async (request) => {
      const { uid } = await dentist(request); // secretaries use updateStaffAppointment
      const data = request.data || {};
      const copy = await shared.doc(cleanId(data.id)).get();
      if (!copy.exists || copy.data().doctorUid !== uid) {
        throw new HttpsError("permission-denied", "not-assigned");
      }
      const a = copy.data();
      const m = await members.doc(memberKey(a.ownerId, a.clinicId, uid)).get();
      if (!m.exists || m.data().status !== "active" || m.data().role !== "doctor") {
        throw new HttpsError("permission-denied", "not-allowed");
      }
      const patch = { updatedAt: Date.now() };
      if (data.status !== undefined) {
        if (!STATUSES.includes(data.status)) throw new HttpsError("invalid-argument", "bad-status");
        patch.status = data.status;
      }
      if (data.notes !== undefined) patch.notes = String(data.notes).slice(0, 1000);
      await records(a.ownerId).collection("appointments").doc(a.appointmentId).update(patch);
      return { ok: true };
    },
  );

  /* ── A member's work on a patient ──────────────────────────────── */

  /**
   * The caller's active membership.
   * @param {string} ownerId the owner.
   * @param {string} clinicId the clinic.
   * @param {string} uid the caller.
   * @return {Promise<object>} the membership.
   */
  async function activeMember(ownerId, clinicId, uid) {
    const snap = await members.doc(memberKey(cleanId(ownerId), cleanId(clinicId), uid)).get();
    if (!snap.exists || snap.data().status !== "active") {
      throw new HttpsError("permission-denied", "not-member");
    }
    return snap.data();
  }

  const newId = (prefix) =>
    `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
  const today = () => new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const text = (v, max = 1000) =>
    String(v == null ? "" : v)
      .trim()
      .slice(0, max);
  const amountOf = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0 || n > 1e12)
      throw new HttpsError("invalid-argument", "bad-amount");
    return n;
  };
  const currencyOf = (v) => {
    if (v !== "USD" && v !== "IQD") throw new HttpsError("invalid-argument", "bad-currency");
    return v;
  };
  const money = (n, c) => (c === "USD" ? `$${n}` : `${Number(n).toLocaleString("en-US")} د.ع`);

  const createSharedPatient = onCall(
    { region: "us-central1", maxInstances: 5 },
    async (request) => {
      const { uid, me } = await memberAccount(request);
      const data = request.data || {};
      const m = await activeMember(data.ownerId, data.clinicId, uid);
      if (m.role !== "doctor" && !can(m, "patients")) {
        throw new HttpsError("permission-denied", "not-allowed");
      }
      const name = text(data.name, 120);
      if (!name) throw new HttpsError("invalid-argument", "name-required");
      const col = records(m.ownerId).collection("patients");
      const id = newId("p");
      await firestore.runTransaction(async (tx) => {
        const list = await tx.get(col.where("clinicId", "==", m.clinicId));
        const nums = list.docs
          .map((d) => Number(String(d.data().fileNo || "").replace(/\D/g, "")))
          .filter(Boolean);
        const now = new Date().toISOString();
        tx.set(col.doc(id), {
          id,
          clinicId: m.clinicId,
          deleted: false,
          fileNo: `PAT-${Math.max(100, ...nums) + 1}`,
          name,
          age: Number(data.age) || "",
          gender: data.gender === "female" ? "female" : "male",
          phone: text(data.phone, 30),
          history: {
            diabetes: false,
            hypertension: false,
            heart: false,
            allergy: false,
            bleeding: false,
          },
          complaint: text(data.complaint),
          status: "new",
          lastVisit: now.slice(0, 10),
          createdAt: now,
          teeth: {},
          visits: [],
          files: [],
          payments: [],
          totalFees: 0,
          // A secretary registers the patient; they don't treat them.
          doctorUids: isSecretary(m) ? [] : [uid],
          log: [{ id: newId("l"), date: today(), text: `${me.name}: سجّل المريض` }],
          updatedAt: Date.now(),
        });
      });
      await logActivity(m, { uid, name: me.name }, `سجّل المريض ${name}`);
      return { id };
    },
  );

  const TOOTH_STATUSES = [
    "healthy",
    "caries",
    "filled",
    "crown",
    "missing",
    "implant",
    "rct",
    "bridge",
    "unerupted",
  ];
  const PLAN_STATUSES = ["done", "active", "planned"];

  const updateSharedPatient = onCall(
    { region: "us-central1", maxInstances: 5 },
    async (request) => {
      const { uid, me } = await memberAccount(request);
      const data = request.data || {};
      const m = await activeMember(data.ownerId, data.clinicId, uid);
      const ref = records(m.ownerId).collection("patients").doc(cleanId(data.patientId));
      // What a secretary may do to a patient, op by op. Clinical work isn't here.
      if (isSecretary(m)) {
        const needed = { setBasics: "patients", addPayment: "payments", addFile: "files" }[data.op];
        if (!needed || !can(m, needed)) throw new HttpsError("permission-denied", "not-allowed");
      } else if (data.op === "setBasics") {
        throw new HttpsError("permission-denied", "not-allowed");
      }
      let actionText = "";
      let issued = null;

      // A file goes from the doctor's upload folder into the owner's patient
      // folder, outside the transaction (which may run more than once).
      let newFile = null;
      if (data.op === "addFile") {
        const source = String(data.uploadPath || "");
        if (!source.startsWith(`clinic_uploads/${uid}/`) || source.includes("..")) {
          throw new HttpsError("permission-denied", "bad-path");
        }
        const check = await ref.get();
        const cur = check.exists ? check.data() : null;
        if (!cur || cur.clinicId !== m.clinicId || !seesPatient(m, cur)) {
          throw new HttpsError("permission-denied", "not-assigned");
        }
        const id = newId("f");
        const name = text(data.name, 100) || "file";
        const safe = name.replace(/[^\w.-]+/g, "_").slice(-80);
        const dest = `dentist_records/${m.ownerId}/patients/${ref.id}/${id}-${safe}`;
        const bucket = getBucket();
        await bucket.file(source).copy(bucket.file(dest));
        await bucket.file(source).delete({ ignoreNotFound: true });
        const tag = data.tag === "xray" ? "[xray] " : "";
        newFile = {
          id,
          name: tag + name,
          path: dest,
          type: text(data.type, 80),
          addedAt: new Date().toISOString(),
        };
      }

      await firestore.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const p = snap.exists ? snap.data() : null;
        if (!p || p.deleted || p.clinicId !== m.clinicId)
          throw new HttpsError("not-found", "no-patient");
        if (!seesPatient(m, p)) {
          throw new HttpsError("permission-denied", "not-assigned");
        }
        const patch = {};
        let what = "";
        switch (data.op) {
          case "setBasics": {
            const name = text(data.name, 120);
            if (!name) throw new HttpsError("invalid-argument", "name-required");
            patch.name = name;
            patch.phone = text(data.phone, 30);
            patch.age = Number(data.age) || "";
            patch.gender = data.gender === "female" ? "female" : "male";
            what = "عدّل بيانات المريض";
            break;
          }
          case "setNotes":
            patch.complaint = text(data.complaint);
            patch.doctorNote = text(data.doctorNote);
            what = "عدّل الشكوى والملاحظات";
            break;
          case "addVisit": {
            const procedure = text(data.procedure, 200);
            if (!procedure) throw new HttpsError("invalid-argument", "bad-input");
            const date = /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : today();
            const upcoming = data.upcoming === true;
            patch.visits = [
              {
                id: newId("v"),
                date,
                procedure,
                doctor: me.name,
                note: text(data.note),
                upcoming,
                byName: me.name,
              },
              ...(p.visits || []),
            ];
            if (!upcoming) patch.lastVisit = date;
            what = `سجّل زيارة: ${procedure}`;
            break;
          }
          case "addPlanStep": {
            const title = text(data.title, 200);
            if (!title) throw new HttpsError("invalid-argument", "bad-input");
            const step = { id: newId("pl"), title, status: "planned", byName: me.name };
            if (data.dept) step.dept = text(data.dept, 40);
            if (data.tooth) step.tooth = text(data.tooth, 40);
            if (data.note) step.note = text(data.note);
            // Prices are for those who may see money.
            if (m.financeAccess === true && Number(data.cost) > 0) {
              step.cost = amountOf(data.cost);
              step.currency = currencyOf(data.currency);
            }
            patch.plan = [...(p.plan || []), step];
            what = `أضاف إلى الخطة: ${title}`;
            break;
          }
          case "setPlanStatus": {
            if (!PLAN_STATUSES.includes(data.status))
              throw new HttpsError("invalid-argument", "bad-input");
            const step = (p.plan || []).find((s) => s.id === data.stepId);
            if (!step) throw new HttpsError("not-found", "no-step");
            patch.plan = p.plan.map((s) =>
              s.id === data.stepId ? { ...s, status: data.status } : s,
            );
            what = `غيّر حالة «${step.title}»`;
            break;
          }
          case "setTooth": {
            const tooth = Number(data.tooth);
            const valid = (tooth >= 11 && tooth <= 48) || (tooth >= 51 && tooth <= 85);
            if (!valid || !TOOTH_STATUSES.includes(data.status)) {
              throw new HttpsError("invalid-argument", "bad-input");
            }
            const teeth = { ...(p.teeth || {}) };
            if (data.status === "healthy") delete teeth[tooth];
            else teeth[tooth] = data.status;
            patch.teeth = teeth;
            what = `عدّل حالة السن ${tooth}`;
            break;
          }
          case "addNote": {
            const note = text(data.text);
            if (!note) throw new HttpsError("invalid-argument", "bad-input");
            what = note;
            break;
          }
          case "addPayment": {
            if (!can(m, "payments") && (m.role !== "doctor" || m.financeAccess !== true)) {
              throw new HttpsError("permission-denied", "not-allowed");
            }
            const amount = amountOf(data.amount);
            const currency = currencyOf(data.currency);
            const seq = (p.receiptSeq || 0) + 1;
            const file = String(p.fileNo || "").replace(/\D/g, "") || ref.id.slice(-4);
            const receiptNo = `REC-${file}-${String(seq).padStart(2, "0")}`;
            patch.receiptSeq = seq;
            patch.payments = [
              {
                id: newId("pay"),
                date: today(),
                amount,
                currency,
                receiptNo,
                // Counts towards the treating doctor, not the secretary taking it.
                ...(isSecretary(m)
                  ? (p.doctorUids || [])[0]
                    ? { doctorUid: p.doctorUids[0] }
                    : {}
                  : { doctorUid: uid }),
                byName: me.name,
                ...(data.note ? { note: text(data.note) } : {}),
              },
              ...(p.payments || []),
            ];
            what = `سجّل دفعة ${money(amount, currency)} (وصل ${receiptNo})`;
            issued = {
              receiptNo,
              amount,
              currency,
              date: today(),
              patientName: p.name,
              fileNo: p.fileNo || "",
              note: text(data.note),
            };
            if (can(m, "balances")) {
              const fees = Number(feesOf(p)[currency]) || 0;
              const paid =
                (p.payments || [])
                  .filter((x) => payCurrency(p, x) === currency)
                  .reduce((sum, x) => sum + (Number(x.amount) || 0), 0) + amount;
              issued.balance = { fees, paid, remaining: fees - paid };
            }
            break;
          }
          case "addFile":
            patch.files = [newFile, ...(p.files || [])];
            what = `أضاف ملفاً: ${newFile.name}`;
            break;
          default:
            throw new HttpsError("invalid-argument", "bad-op");
        }
        actionText = `${what} (${p.name})`;
        tx.update(ref, {
          ...patch,
          // Every change by a team member is on the record, under their name.
          log: [{ id: newId("l"), date: today(), text: `${me.name}: ${what}` }, ...(p.log || [])],
          updatedAt: Date.now(),
        });
      });
      await logActivity(m, { uid, name: me.name }, actionText);
      return { ok: true, receipt: issued };
    },
  );

  /* ── Agreements and dues ───────────────────────────────────────── */

  const updateClinicMember = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    const { uid } = await dentist(request);
    const data = request.data || {};
    const { ref, m } = await ownedMember(uid, data.memberDocId);
    if (m.status !== "active" || isSecretary(m)) {
      throw new HttpsError("failed-precondition", "not-active");
    }
    const patch = {};
    if (typeof data.allPatients === "boolean") patch.allPatients = data.allPatients;
    if (typeof data.financeAccess === "boolean") {
      if (data.financeAccess && m.role !== "doctor") {
        throw new HttpsError("invalid-argument", "not-allowed");
      }
      patch.financeAccess = data.financeAccess;
    }
    if (data.agreementType !== undefined) {
      if (!["percentage", "fixed"].includes(data.agreementType)) {
        throw new HttpsError("invalid-argument", "bad-input");
      }
      const percent = data.agreementType === "percentage" ? Number(data.agreementPercent) : 0;
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        throw new HttpsError("invalid-argument", "bad-percent");
      }
      patch.agreementType = data.agreementType;
      patch.agreementPercent = percent;
      // Kept with dates: a new percentage must not rewrite what was earned.
      patch.agreementHistory = [
        ...(m.agreementHistory || []),
        { from: today(), type: data.agreementType, percent, at: Date.now() },
      ];
    }
    await ref.update(patch);
    if (patch.allPatients !== undefined || patch.financeAccess !== undefined) {
      await syncMemberPatients(uid, m.clinicId, m.memberId);
    }
    return { ok: true };
  });

  /**
   * The percentage in force on a date.
   * @param {object} m the membership.
   * @param {string} date YYYY-MM-DD.
   * @return {number} the percentage.
   */
  function percentOn(m, date) {
    const list = [...(m.agreementHistory || [])].sort((a, b) => a.at - b.at);
    let cur = null;
    for (const a of list) {
      if (a.from <= date) cur = a;
    }
    // A payment older than the first agreement counts under that agreement.
    if (!cur) cur = list[0];
    return cur && cur.type === "percentage" ? Number(cur.percent) || 0 : 0;
  }

  const getClinicDues = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "sign-in");
    const snap = await members.doc(cleanId((request.data || {}).memberDocId)).get();
    const m = snap.exists ? snap.data() : null;
    if (
      !m ||
      isSecretary(m) ||
      (m.ownerId !== request.auth.uid && m.memberId !== request.auth.uid)
    ) {
      throw new HttpsError("permission-denied", "not-allowed");
    }
    const patients = await records(m.ownerId)
      .collection("patients")
      .where("clinicId", "==", m.clinicId)
      .get();
    const totals = {
      IQD: { collected: 0, earned: 0, paidOut: 0 },
      USD: { collected: 0, earned: 0, paidOut: 0 },
    };
    const items = [];
    for (const d of patients.docs) {
      const p = d.data();
      if (p.deleted) continue;
      for (const x of p.payments || []) {
        if (x.doctorUid !== m.memberId) continue;
        const currency = payCurrency(p, x);
        const percent = percentOn(m, x.date);
        const share = ((Number(x.amount) || 0) * percent) / 100;
        totals[currency].collected += Number(x.amount) || 0;
        totals[currency].earned += share;
        items.push({
          date: x.date,
          patientName: p.name,
          fileNo: p.fileNo,
          receiptNo: x.receiptNo || "",
          amount: x.amount,
          currency,
          percent,
          share,
        });
      }
    }
    for (const o of m.payouts || []) {
      if (!o.voidedAt && totals[o.currency]) totals[o.currency].paidOut += Number(o.amount) || 0;
    }
    items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return {
      agreementType: m.agreementType || null,
      agreementPercent: m.agreementPercent || 0,
      totals,
      items: items.slice(0, 200),
      payouts: m.payouts || [],
    };
  });

  const addDoctorPayout = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    const { uid } = await dentist(request);
    const data = request.data || {};
    const { ref, m } = await ownedMember(uid, data.memberDocId);
    const payout = {
      id: newId("po"),
      date: today(),
      amount: amountOf(data.amount),
      currency: currencyOf(data.currency),
      note: text(data.note, 200),
      at: Date.now(),
    };
    await ref.update({ payouts: [payout, ...(m.payouts || [])] });
    await notify(
      m.memberId,
      "سُجلت لك دفعة من عيادة",
      `${money(payout.amount, payout.currency)} من ${m.clinicName}.`,
    );
    return { ok: true };
  });

  // A mistaken payout is marked void, not erased: both sides can see it.
  const voidDoctorPayout = onCall({ region: "us-central1", maxInstances: 5 }, async (request) => {
    const { uid } = await dentist(request);
    const data = request.data || {};
    const { ref, m } = await ownedMember(uid, data.memberDocId);
    await ref.update({
      payouts: (m.payouts || []).map((o) =>
        o.id === data.payoutId ? { ...o, voidedAt: Date.now() } : o,
      ),
    });
    return { ok: true };
  });

  return {
    callables: {
      createSharedPatient,
      updateSharedPatient,
      updateClinicMember,
      getClinicDues,
      addDoctorPayout,
      voidDoctorPayout,
      createClinicInvite,
      getClinicJoinCode,
      lookupClinicCode,
      lookupStaffInvite,
      joinClinicWithCode,
      resolveClinicRequest,
      setClinicMemberRole,
      removeClinicMember,
      revokeClinicInvite,
      updateSharedAppointment,
    },
    syncSharedAppointment,
    syncPatientCopies,
    removeDeletedAccount,
    staffHelpers: {
      activeMember,
      cleanId,
      logActivity,
      memberAccount,
      money,
      newId,
      normalizePermissions,
      ownedMember,
      records,
      shareExisting,
      syncMemberPatients,
      text,
      today,
    },
  };
};
