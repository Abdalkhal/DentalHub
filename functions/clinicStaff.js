/**
 * Clinic secretaries: staff with their own account and permissions set by the
 * doctor, one by one. Built on clinicTeam.js (invites and memberships).
 *
 * Every function here checks the permission again on the server, so hiding a
 * button is never the protection. The red lines have no function at all: a
 * secretary can't delete a patient or a payment, change fees, export, manage
 * staff, or see doctors' dues.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");

const OPTS = { region: "us-central1", maxInstances: 5 };
const STATUSES = ["confirmed", "waiting", "completed", "cancelled"];

const TREATMENT_BY_REASON = {
  cleaning: "تنظيف اسنان",
  filling: "حشوة",
  implant: "زراعة اسنان",
  ortho: "تقويم",
  cosmetic: "تبييض",
};

/**
 * @param {FirebaseFirestore.Firestore} firestore the database.
 * @param {object} team helpers from clinicTeam.js.
 * @return {object} the callable functions.
 */
module.exports = function clinicStaff(firestore, team) {
  const {
    activeMember,
    cleanId,
    logActivity,
    memberAccount,
    newId,
    normalizePermissions,
    ownedMember,
    records,
    shareExisting,
    syncMemberPatients,
    text,
    today,
  } = team;

  /**
   * The caller's membership, and that it holds a permission.
   * @param {object} request the callable request.
   * @param {string} permission the permission needed.
   * @return {Promise<{uid: string, me: object, m: object}>} the caller.
   */
  async function staffWith(request, permission) {
    const { uid, me } = await memberAccount(request);
    const data = request.data || {};
    const m = await activeMember(data.ownerId, data.clinicId, uid);
    if (m.role !== "secretary" || !(m.permissions || {})[permission]) {
      throw new HttpsError("permission-denied", "not-allowed");
    }
    return { uid, me, m };
  }

  // The doctor changes what one secretary may do. Copies follow at once.
  const setStaffPermissions = onCall(OPTS, async (request) => {
    const { uid, me } = await memberAccount(request);
    const data = request.data || {};
    const { ref, m } = await ownedMember(uid, data.memberDocId);
    if (m.role !== "secretary" || m.status !== "active") {
      throw new HttpsError("failed-precondition", "not-active");
    }
    const permissions = normalizePermissions(data.permissions);
    await ref.update({ permissions });
    await logActivity(m, { name: me.name, uid }, `عدّل صلاحيات ${m.memberName}`);
    await shareExisting(uid, m.clinicId, m.memberId);
    await syncMemberPatients(uid, m.clinicId, m.memberId);
    return { ok: true };
  });

  // Doctors of the clinic, to choose from when booking.
  const getStaffContext = onCall(OPTS, async (request) => {
    const { uid } = await memberAccount(request);
    const data = request.data || {};
    const m = await activeMember(data.ownerId, data.clinicId, uid);
    if (m.role !== "secretary") throw new HttpsError("permission-denied", "not-allowed");
    const snap = await firestore
      .collection("clinic_members")
      .where("ownerId", "==", m.ownerId)
      .get();
    const doctors = [{ uid: "", name: m.ownerName }];
    for (const d of snap.docs) {
      const x = d.data();
      if (x.clinicId === m.clinicId && x.status === "active" && x.role !== "secretary") {
        doctors.push({ uid: x.memberId, name: x.memberName });
      }
    }
    return { doctors };
  });

  /**
   * Checks a doctor chosen for an appointment belongs to this clinic.
   * @param {object} m the membership.
   * @param {string} doctorUid the chosen doctor, or empty for the owner.
   * @return {Promise<object>} the fields to store.
   */
  async function doctorFields(m, doctorUid) {
    if (!doctorUid) return { doctor: m.ownerName, doctorUid: "" };
    const d = await firestore
      .collection("clinic_members")
      .doc(`${m.ownerId}_${m.clinicId}_${cleanId(doctorUid)}`)
      .get();
    if (!d.exists || d.data().status !== "active" || d.data().role === "secretary") {
      throw new HttpsError("invalid-argument", "bad-doctor");
    }
    return { doctor: d.data().memberName, doctorUid };
  }

  const validSlot = (date, time) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date)) || !/^\d{2}:\d{2}$/.test(String(time))) {
      throw new HttpsError("invalid-argument", "bad-date");
    }
  };

  const createStaffAppointment = onCall(OPTS, async (request) => {
    const { me, m } = await staffWith(request, "appointments");
    const data = request.data || {};
    const patientName = text(data.patientName, 120);
    if (!patientName) throw new HttpsError("invalid-argument", "name-required");
    validSlot(data.date, data.time);
    const id = newId("a");
    const doctor = await doctorFields(m, data.doctorUid);
    await records(m.ownerId)
      .collection("appointments")
      .doc(id)
      .set({
        id,
        patientName,
        phone: text(data.phone, 30),
        date: data.date,
        time: data.time,
        appointmentType: text(data.appointmentType, 80),
        clinicRoom: "",
        treatment: text(data.treatment, 200),
        notes: text(data.notes),
        reminder: true,
        status: "confirmed",
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        clinicId: m.clinicId,
        deleted: false,
        createdBy: me.name,
        ...doctor,
      });
    await logActivity(m, me, `حجز موعداً لـ ${patientName} يوم ${data.date} ${data.time}`);
    return { id };
  });

  const updateStaffAppointment = onCall(OPTS, async (request) => {
    const { me, m } = await staffWith(request, "appointments");
    const data = request.data || {};
    const ref = records(m.ownerId).collection("appointments").doc(cleanId(data.appointmentId));
    const snap = await ref.get();
    const a = snap.exists ? snap.data() : null;
    if (!a || a.deleted || a.clinicId !== m.clinicId)
      throw new HttpsError("not-found", "no-appointment");
    const patch = { updatedAt: Date.now() };
    const changes = [];
    if (data.status !== undefined) {
      if (!STATUSES.includes(data.status)) throw new HttpsError("invalid-argument", "bad-status");
      patch.status = data.status;
      changes.push(data.status === "cancelled" ? "ألغى" : "غيّر حالة");
    }
    if (data.date !== undefined || data.time !== undefined) {
      const date = data.date ?? a.date;
      const time = data.time ?? a.time;
      validSlot(date, time);
      patch.date = date;
      patch.time = time;
      changes.push(`نقل إلى ${date} ${time}`);
    }
    if (data.notes !== undefined) {
      patch.notes = text(data.notes);
      changes.push("عدّل ملاحظة");
    }
    if (data.doctorUid !== undefined) {
      Object.assign(patch, await doctorFields(m, data.doctorUid));
      changes.push("غيّر الطبيب");
    }
    await ref.update(patch);
    await logActivity(m, me, `${changes.join("، ") || "عدّل"} موعد ${a.patientName}`);
    return { ok: true };
  });

  const listStaffBookings = onCall(OPTS, async (request) => {
    const { m } = await staffWith(request, "bookings");
    const snap = await firestore
      .collection("booking_requests")
      .where("ownerId", "==", m.ownerId)
      .get();
    const now = Date.now();
    const requests = snap.docs
      .map((d) => ({ ...d.data(), id: d.id }))
      .filter(
        (r) =>
          r.clinicId === m.clinicId &&
          r.status === "pending" &&
          Date.parse(`${r.date}T${r.time}`) > now - 86400000,
      )
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
      .map((r) => ({
        id: r.id,
        patientName: r.patientName,
        phone: r.phone,
        date: r.date,
        time: r.time,
        reason: r.reason,
        note: r.note || "",
        code: r.code || "",
      }));
    return { requests };
  });

  const resolveStaffBooking = onCall(OPTS, async (request) => {
    const { me, m } = await staffWith(request, "bookings");
    const data = request.data || {};
    const ref = firestore.collection("booking_requests").doc(cleanId(data.id));
    const snap = await ref.get();
    const r = snap.exists ? snap.data() : null;
    if (!r || r.ownerId !== m.ownerId || r.clinicId !== m.clinicId) {
      throw new HttpsError("not-found", "no-request");
    }
    if (r.status !== "pending") throw new HttpsError("failed-precondition", "already-handled");
    if (data.accept !== true) {
      const reason = text(data.reason, 300);
      await ref.update({ status: "rejected", rejectReason: reason, handledAt: Date.now() });
      await logActivity(m, me, `رفض طلب حجز ${r.patientName}`);
      return { ok: true };
    }
    const id = newId("a");
    await records(m.ownerId)
      .collection("appointments")
      .doc(id)
      .set({
        id,
        patientName: r.patientName,
        phone: r.phone,
        date: r.date,
        time: r.time,
        appointmentType:
          r.reason === "pain" ? "طوارئ" : r.reason === "checkup" ? "فحص دوري" : "استشارة",
        clinicRoom: "",
        doctor: m.ownerName,
        treatment: TREATMENT_BY_REASON[r.reason] || "",
        notes: r.note || "",
        reminder: true,
        status: "confirmed",
        source: "booking",
        bookingRequestId: ref.id,
        createdAt: new Date().toISOString(),
        updatedAt: Date.now(),
        clinicId: m.clinicId,
        deleted: false,
        createdBy: me.name,
      });
    await ref.update({ status: "accepted", appointmentId: id, handledAt: Date.now() });
    await logActivity(m, me, `قبل طلب حجز ${r.patientName} يوم ${r.date} ${r.time}`);
    return { ok: true };
  });

  const listStaffMaterials = onCall(OPTS, async (request) => {
    const { m } = await staffWith(request, "materials");
    const snap = await records(m.ownerId)
      .collection("materials")
      .where("clinicId", "==", m.clinicId)
      .get();
    const items = snap.docs
      .map((d) => d.data())
      .filter((x) => !x.deleted)
      .map((x) => ({
        id: x.id,
        name: x.name,
        qty: Number(x.qty) || 0,
        status: x.status || "available",
        category: x.category || "general",
        expiryDate: x.expiryDate || "",
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return { items };
  });

  const setStaffMaterial = onCall(OPTS, async (request) => {
    const { me, m } = await staffWith(request, "materials");
    const data = request.data || {};
    if (!["available", "half", "low", "out"].includes(data.status)) {
      throw new HttpsError("invalid-argument", "bad-status");
    }
    const ref = records(m.ownerId).collection("materials").doc(cleanId(data.id));
    const snap = await ref.get();
    const x = snap.exists ? snap.data() : null;
    if (!x || x.deleted || x.clinicId !== m.clinicId)
      throw new HttpsError("not-found", "no-material");
    const now = Date.now();
    const full = Math.max(Number(x.restockQty) || Number(x.qty) || 0, 1);
    const patch = { status: data.status, statusAt: now, updatedAt: now };
    if (data.status === "out") {
      patch.qty = 0;
      const days = Math.round((now - (x.lastRestockAt || now)) / 86400000);
      // Same learning as materialsStore.ts: how long this quantity lasted.
      patch.cycles =
        x.status !== "out" && days >= 1
          ? [...(x.cycles || []), { days, qty: full }].slice(-6)
          : x.cycles || [];
    } else if (data.status === "available") {
      if (x.status === "out") {
        patch.lastRestockAt = now;
        patch.restockQty = full;
      }
      if (x.status === "out" || !x.qty) patch.qty = full;
    } else {
      patch.qty = Math.max(1, Math.ceil(full * (data.status === "half" ? 0.5 : 0.2)));
    }
    await ref.update(patch);
    await logActivity(m, me, `غيّر حالة مادة ${x.name}`);
    return { ok: true };
  });

  // Clinic income only. Doctors' percentages and dues are never in here.
  const getStaffReport = onCall(OPTS, async (request) => {
    const { m } = await staffWith(request, "reports");
    const [patients, appts] = await Promise.all([
      records(m.ownerId).collection("patients").where("clinicId", "==", m.clinicId).get(),
      records(m.ownerId).collection("appointments").where("clinicId", "==", m.clinicId).get(),
    ]);
    const month = today().slice(0, 7);
    const totals = { IQD: { month: 0, all: 0 }, USD: { month: 0, all: 0 } };
    let patientCount = 0;
    for (const d of patients.docs) {
      const p = d.data();
      if (p.deleted) continue;
      patientCount += 1;
      for (const x of p.payments || []) {
        const c = x.currency || p.feeCurrency || "USD";
        if (!totals[c]) continue;
        totals[c].all += Number(x.amount) || 0;
        if (String(x.date).startsWith(month)) totals[c].month += Number(x.amount) || 0;
      }
    }
    const live = appts.docs.map((d) => d.data()).filter((a) => !a.deleted);
    return {
      totals,
      patientCount,
      appointmentsThisMonth: live.filter((a) => String(a.date).startsWith(month)).length,
      appointmentsToday: live.filter((a) => a.date === today()).length,
    };
  });

  return {
    setStaffPermissions,
    getStaffContext,
    createStaffAppointment,
    updateStaffAppointment,
    listStaffBookings,
    resolveStaffBooking,
    listStaffMaterials,
    setStaffMaterial,
    getStaffReport,
  };
};
