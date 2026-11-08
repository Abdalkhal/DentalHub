/**
 * Phone notifications.
 *
 * Every event already writes a `notifications/{id}` doc; this sends it to the
 * recipient's phones as well.
 *
 * Android goes straight to Firebase Cloud Messaging with the project's own
 * credentials. Sending Android pushes through Expo needs an FCM key uploaded to
 * EAS, and none ever was, so every Android push was silently dropped. iPhones
 * still go through Expo, which needs the APNs key uploaded to EAS.
 *
 * Devices live in `push_devices/{uid}` (server-only), and a device belongs to
 * one account at a time: signing in moves it, signing out removes it. Before,
 * one phone used by several accounts kept the tokens of all of them and showed
 * each account's notifications to whoever held the phone.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

const OPTS = { region: "us-central1", maxInstances: 10 };
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN = /^Expo(nent)?PushToken\[[^\]]{10,200}\]$/;
// Firebase tokens are long, URL-safe and have a colon after the instance id.
const FCM_TOKEN = /^[\w:-]{100,4096}$/;
// Fields of a notification the app needs to open the right screen.
const ROUTE_FIELDS = ["type", "orderId", "invoiceId", "chatWith", "forRole", "senderId"];
const DEAD_FCM = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

const clean = (v, re) => {
  const s = typeof v === "string" ? v.trim() : "";
  return re.test(s) ? s : "";
};
const uniq = (list) => [...new Set(list.filter(Boolean))];

/**
 * @param {object} admin the initialized firebase-admin module.
 * @param {Function} [fetchImpl] fetch, replaceable in tests.
 * @return {object} the functions.
 */
module.exports = function push(admin, fetchImpl) {
  const firestore = admin.firestore();
  const FV = admin.firestore.FieldValue;
  const send = fetchImpl || ((...a) => fetch(...a));
  const devicesRef = (uid) => firestore.collection("push_devices").doc(uid);

  /**
   * Takes these tokens off every other account.
   * @param {string} uid the account keeping them.
   * @param {string} expo the Expo token.
   * @param {string} fcm the Firebase token.
   * @return {Promise<void>} resolves when done.
   */
  async function detachFromOthers(uid, expo, fcm) {
    const jobs = [];
    const strip = async (col, field, token) => {
      if (!token) return;
      const snap = await firestore.collection(col).where(field, "array-contains", token).get();
      await Promise.all(
        snap.docs
          .filter((d) => d.id !== uid)
          .map((d) => d.ref.update({ [field]: FV.arrayRemove(token) }).catch(() => {})),
      );
    };
    jobs.push(strip("push_devices", "expo", expo), strip("push_devices", "fcm", fcm));
    jobs.push(strip("user_roles", "pushTokens", expo));
    await Promise.all(jobs);
  }

  const registerPushDevice = onCall(OPTS, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "not-signed-in");
    const uid = request.auth.uid;
    const data = request.data || {};
    const expo = clean(data.expoToken, EXPO_TOKEN);
    const fcm = clean(data.fcmToken, FCM_TOKEN);
    if (!expo && !fcm) throw new HttpsError("invalid-argument", "no-token");
    await detachFromOthers(uid, expo, fcm);
    // An Android phone with a Firebase token is reached through Firebase only;
    // its Expo token would deliver the same notification twice once Expo can.
    const viaFcm = !!fcm;
    await devicesRef(uid).set(
      {
        fcm: viaFcm ? FV.arrayUnion(fcm) : FV.arrayUnion(),
        expo: !viaFcm && expo ? FV.arrayUnion(expo) : FV.arrayUnion(),
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    if (viaFcm && expo) {
      await devicesRef(uid).update({ expo: FV.arrayRemove(expo) });
    }
    if (expo) {
      // The old place tokens were kept, never read again for this device.
      await firestore
        .collection("user_roles")
        .doc(uid)
        .update({ pushTokens: FV.arrayRemove(expo) })
        .catch(() => {});
    }
    return { ok: true, via: viaFcm ? "fcm" : "expo" };
  });

  const unregisterPushDevice = onCall(OPTS, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "not-signed-in");
    const uid = request.auth.uid;
    const data = request.data || {};
    const expo = clean(data.expoToken, EXPO_TOKEN);
    const fcm = clean(data.fcmToken, FCM_TOKEN);
    const removals = {};
    if (expo) removals.expo = FV.arrayRemove(expo);
    if (fcm) removals.fcm = FV.arrayRemove(fcm);
    if (Object.keys(removals).length)
      await devicesRef(uid)
        .update(removals)
        .catch(() => {});
    if (expo) {
      await firestore
        .collection("user_roles")
        .doc(uid)
        .update({ pushTokens: FV.arrayRemove(expo) })
        .catch(() => {});
    }
    return { ok: true };
  });

  /**
   * Android, through Firebase. Sent as data in the same shape Expo's own
   * service uses, so the app shows it and opens it like any other.
   * @param {Array<string>} tokens Firebase tokens.
   * @param {object} n the notification.
   * @param {object} routeData what the app needs to open it.
   * @return {Promise<Array<string>>} tokens that no longer exist.
   */
  async function sendFcm(tokens, n, routeData) {
    if (tokens.length === 0) return [];
    const res = await admin.messaging().sendEachForMulticast({
      tokens,
      data: {
        title: String(n.title),
        message: n.body ? String(n.body) : "",
        body: JSON.stringify(routeData),
        channelId: "default",
        sound: "default",
      },
      android: { priority: "high", ttl: 7 * 24 * 60 * 60 * 1000 },
    });
    const dead = [];
    res.responses.forEach((r, i) => {
      if (r.success) return;
      const code = r.error && r.error.code;
      if (DEAD_FCM.has(code)) dead.push(tokens[i]);
      else console.error("FCM push failed", code, r.error && r.error.message);
    });
    return dead;
  }

  /**
   * iPhones (and Android phones from before this change), through Expo.
   * @param {Array<string>} tokens Expo tokens.
   * @param {object} n the notification.
   * @param {object} routeData what the app needs to open it.
   * @return {Promise<Array<string>>} tokens that no longer exist.
   */
  async function sendExpo(tokens, n, routeData) {
    const dead = [];
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      const messages = chunk.map((to) => ({
        to,
        title: String(n.title),
        body: n.body ? String(n.body) : "",
        data: routeData,
        sound: "default",
        channelId: "default",
        priority: "high",
      }));
      try {
        const res = await send(EXPO_PUSH_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(messages),
        });
        const json = await res.json().catch(() => ({}));
        const tickets = Array.isArray(json.data) ? json.data : [];
        tickets.forEach((t, idx) => {
          if (!t || t.status !== "error") return;
          const why = t.details && t.details.error;
          if (why === "DeviceNotRegistered") dead.push(chunk[idx]);
          // InvalidCredentials means the project's push key isn't on EAS.
          else console.error("Expo push failed", why, t.message);
        });
        if (!res.ok) console.error("Expo push request failed", res.status, JSON.stringify(json));
      } catch (err) {
        console.error("Expo push request error", err);
      }
    }
    return dead;
  }

  const sendPushOnNotification = onDocumentCreated(
    { document: "notifications/{notificationId}", region: "us-central1" },
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const n = snap.data() || {};
      if (!n.userId || !n.title) return;
      const uid = String(n.userId);

      const [roleSnap, devSnap] = await Promise.all([
        firestore.collection("user_roles").doc(uid).get(),
        devicesRef(uid).get(),
      ]);
      const role = roleSnap.exists ? roleSnap.data() || {} : {};
      // The in-app settings toggle ("الإشعارات") opts the account out of pushes.
      if (role.notificationsEnabled === false) return;
      const dev = devSnap.exists ? devSnap.data() || {} : {};

      const fcm = uniq((dev.fcm || []).filter((t) => FCM_TOKEN.test(t)));
      const expo = uniq(
        [...(dev.expo || []), ...(role.pushTokens || [])].filter((t) => EXPO_TOKEN.test(t)),
      );
      if (fcm.length === 0 && expo.length === 0) return;

      const routeData = { notificationId: snap.id };
      for (const f of ROUTE_FIELDS) if (n[f]) routeData[f] = String(n[f]);

      const [deadFcm, deadExpo] = await Promise.all([
        sendFcm(fcm, n, routeData).catch((e) => {
          console.error("FCM push error", e);
          return [];
        }),
        sendExpo(expo, n, routeData),
      ]);

      // Uninstalled apps / revoked permission: drop them so they aren't retried.
      if (deadFcm.length || deadExpo.length) {
        const patch = {};
        if (deadFcm.length) patch.fcm = FV.arrayRemove(...deadFcm);
        if (deadExpo.length) patch.expo = FV.arrayRemove(...deadExpo);
        if (devSnap.exists)
          await devicesRef(uid)
            .update(patch)
            .catch(() => {});
        if (deadExpo.length && roleSnap.exists) {
          await firestore
            .collection("user_roles")
            .doc(uid)
            .update({ pushTokens: FV.arrayRemove(...deadExpo) })
            .catch(() => {});
        }
      }
    },
  );

  return { registerPushDevice, unregisterPushDevice, sendPushOnNotification };
};
