// Direct 1:1 messaging between any two accounts (dentist <-> supply office,
// dentist <-> implant company, dentist <-> lab, or any other pair). Separate
// from `caseMessages.ts`, which is a case-scoped chat between a dentist and
// the lab handling that case. Identical in the web app and the native app
// (src/lib/directMessages.ts) — both read and write `dm_threads`.
//
//   dm_threads/{a_b}            participants, names/photos (as last sent),
//                               lastMessage*, unread{uid: n}, readAt{uid},
//                               notifiedAt{uid}, blockedBy[]
//   dm_threads/{a_b}/messages   senderId, text, image?, createdAt, deleted?
//   (Storage) dm_files/{a_b}/…  photos sent in the conversation
//
// Unread counts and "seen" live on the thread doc, so they are the same on
// every device (they used to be per-device local storage markers).
import { useEffect, useState } from "react";
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  increment,
  limitToLast,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { createNotification } from "@/lib/notifications";

export const DM_MAX_LENGTH = 2000;
/** One push per conversation burst: a new one only after the recipient read, or after this long. */
const NOTIFY_GAP_MS = 10 * 60 * 1000;

export type DmImage = { path: string; width?: number; height?: number };

export type DmMessage = {
  id: string;
  senderId: string;
  text: string;
  image?: DmImage;
  deleted?: boolean;
  createdAt: Timestamp | null;
};

export type DmThread = {
  id: string;
  participants: string[];
  names: Record<string, string>;
  photos: Record<string, string>;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  lastSenderId: string;
  unread?: Record<string, number>;
  readAt?: Record<string, Timestamp | null>;
  notifiedAt?: Record<string, number>;
  blockedBy?: string[];
};

/** Deterministic thread id — the Firestore rules verify it matches `participants`. */
export function dmThreadId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

const threadRef = (threadId: string) => doc(db, "dm_threads", threadId);
const messagesCollection = (threadId: string) => collection(db, "dm_threads", threadId, "messages");

export const otherParticipant = (t: Pick<DmThread, "participants">, me: string | undefined) =>
  t.participants.find((p) => p !== me) ?? "";

export const unreadFor = (t: DmThread | null | undefined, me: string | undefined) =>
  (me && t?.unread?.[me]) || 0;

export const isBlocked = (t: DmThread | null | undefined) => (t?.blockedBy?.length ?? 0) > 0;

/** Real-time list of a user's threads, newest first (sorted client-side, no composite index). */
export function useDmThreads(userId: string | undefined) {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setThreads([]);
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    const q = query(collection(db, "dm_threads"), where("participants", "array-contains", userId));
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DmThread);
        list.sort((a, b) => (b.lastMessageAt?.toMillis?.() ?? 0) - (a.lastMessageAt?.toMillis?.() ?? 0));
        setThreads(list);
        setLoading(false);
      },
      (err) => {
        console.error("DM threads listener error:", err);
        setLoading(false);
      },
    );
  }, [userId]);

  return { threads, loading };
}

/** Total unread messages across all threads (for the tab badge). */
export function useDmUnreadTotal(userId: string | undefined): number {
  const { threads } = useDmThreads(userId);
  return threads.reduce((n, t) => n + unreadFor(t, userId), 0);
}

/** One thread doc, live (block state, seen marker). */
export function useDmThread(threadId: string) {
  const [thread, setThread] = useState<DmThread | null>(null);
  useEffect(() => {
    if (!threadId) return setThread(null);
    return onSnapshot(
      threadRef(threadId),
      (s) => setThread(s.exists() ? ({ id: s.id, ...s.data() } as DmThread) : null),
      () => setThread(null),
    );
  }, [threadId]);
  return thread;
}

/** The latest messages of a thread, oldest first. */
export function useDmMessages(threadId: string, max = 300) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    const q = query(messagesCollection(threadId), orderBy("createdAt", "asc"), limitToLast(max));
    return onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as DmMessage));
        setLoading(false);
      },
      (err) => {
        console.error("DM messages listener error:", err);
        setLoading(false);
      },
    );
  }, [threadId, max]);

  return { messages, loading };
}

export const dmImagePath = (threadId: string, fileId: string, ext = "jpg") => `dm_files/${threadId}/${fileId}.${ext}`;

/**
 * Sends a message (text and/or an already-uploaded image). Creates the thread
 * on the first message; afterwards only touches the sender's own name/photo.
 * Throws "blocked" when either side has blocked the conversation.
 */
export async function sendDmMessage(opts: {
  senderId: string;
  recipientId: string;
  senderName: string;
  recipientName: string;
  senderPhoto?: string;
  recipientPhoto?: string;
  text: string;
  image?: DmImage;
}) {
  const { senderId, recipientId, senderName, recipientName, senderPhoto, recipientPhoto, image } = opts;
  const text = opts.text.trim().slice(0, DM_MAX_LENGTH);
  if (!text && !image) return dmThreadId(senderId, recipientId);
  const threadId = dmThreadId(senderId, recipientId);
  const snap = await getDoc(threadRef(threadId)).catch(() => null);
  const existing = snap?.exists() ? (snap.data() as Omit<DmThread, "id">) : null;
  if (existing && (existing.blockedBy?.length ?? 0) > 0) throw new Error("blocked");

  const now = Date.now();
  const lastNotified = existing?.notifiedAt?.[recipientId] ?? 0;
  const readSince = (existing?.readAt?.[recipientId]?.toMillis?.() ?? 0) > lastNotified;
  const notify = !lastNotified || readSince || now - lastNotified > NOTIFY_GAP_MS;
  const preview = text || "📷 صورة";

  await setDoc(
    threadRef(threadId),
    {
      participants: [senderId, recipientId].sort(),
      // On create both names are needed; afterwards each side only refreshes
      // its own (the rules refuse changes to the other side's entry).
      names: existing ? { [senderId]: senderName } : { [senderId]: senderName, [recipientId]: recipientName },
      photos: existing
        ? { [senderId]: senderPhoto || "" }
        : { [senderId]: senderPhoto || "", [recipientId]: recipientPhoto || "" },
      lastMessage: preview.slice(0, 200),
      lastMessageAt: serverTimestamp(),
      lastSenderId: senderId,
      unread: { [recipientId]: increment(1), [senderId]: 0 },
      readAt: { [senderId]: serverTimestamp() },
      ...(notify ? { notifiedAt: { [recipientId]: now } } : {}),
    },
    { merge: true },
  );
  await addDoc(messagesCollection(threadId), {
    senderId,
    text,
    ...(image ? { image } : {}),
    createdAt: serverTimestamp(),
  });

  // Best-effort: a failed notification must never undo a sent message.
  if (notify)
    createNotification({
      userId: recipientId,
      title: `رسالة جديدة من ${senderName}`,
      body: preview.length > 80 ? `${preview.slice(0, 80)}…` : preview,
      type: "message",
      senderName,
      senderPhotoURL: senderPhoto,
      chatWith: senderId,
    }).catch(() => {});

  return threadId;
}

/** Clears my unread count and stamps "seen" — synced to every device. */
export function markDmThreadRead(thread: DmThread | null | undefined, userId: string | undefined) {
  if (!thread || !userId) return;
  const seen = thread.readAt?.[userId]?.toMillis?.() ?? 0;
  const last = thread.lastMessageAt?.toMillis?.() ?? 0;
  if (!unreadFor(thread, userId) && (thread.lastSenderId === userId || seen >= last)) return;
  updateDoc(threadRef(thread.id), {
    [`unread.${userId}`]: 0,
    [`readAt.${userId}`]: serverTimestamp(),
  }).catch(() => {});
}

/** My own message only: removed for both sides (kept as "message deleted"). */
export function deleteDmMessage(threadId: string, messageId: string) {
  return updateDoc(doc(db, "dm_threads", threadId, "messages", messageId), { deleted: true, text: "", image: null });
}

export function setDmBlocked(threadId: string, userId: string, blocked: boolean) {
  return updateDoc(threadRef(threadId), { blockedBy: blocked ? arrayUnion(userId) : arrayRemove(userId) });
}

/** Reports a conversation to the admins (reports collection, admin-only read). */
export function reportDmThread(opts: { threadId: string; reporterId: string; reportedId: string; reason: string }) {
  return addDoc(collection(db, "reports"), {
    kind: "dm",
    threadId: opts.threadId,
    reporterId: opts.reporterId,
    reportedId: opts.reportedId,
    reason: opts.reason.slice(0, 500),
    createdAt: serverTimestamp(),
    status: "open",
  });
}

/* ── Formatting ────────────────────────────────────────────── */

const pad = (n: number) => String(n).padStart(2, "0");

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "10:42 م" */
export function dmTime(ts: Timestamp | null | undefined, ar = true): string {
  const d = ts?.toDate?.();
  if (!d) return "";
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${pad(d.getMinutes())} ${h < 12 ? (ar ? "ص" : "AM") : ar ? "م" : "PM"}`;
}

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** List time: today → time, yesterday → "أمس", this week → day name, else date. */
export function dmListTime(ts: Timestamp | null | undefined, ar = true, now = new Date()): string {
  const d = ts?.toDate?.();
  if (!d) return "";
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return dmTime(ts, ar);
  if (days === 1) return ar ? "أمس" : "Yesterday";
  if (days < 7) return (ar ? DAYS_AR : DAYS_EN)[d.getDay()];
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() % 100}`;
}

/** Day separator: "اليوم" / "أمس" / "الثلاثاء 4/11/2026". */
export function dmDayLabel(ts: Timestamp | null | undefined, ar = true, now = new Date()): string {
  const d = ts?.toDate?.() ?? now;
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return ar ? "اليوم" : "Today";
  if (days === 1) return ar ? "أمس" : "Yesterday";
  return `${(ar ? DAYS_AR : DAYS_EN)[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export const sameDay = (a: Timestamp | null | undefined, b: Timestamp | null | undefined) => {
  const x = a?.toDate?.() ?? new Date();
  const y = b?.toDate?.() ?? new Date();
  return startOfDay(x) === startOfDay(y);
};

/** Seen by the other side when their readAt is at/after the message time. */
export function seenByOther(thread: DmThread | null | undefined, me: string | undefined, m: DmMessage): boolean {
  if (!thread || !me) return false;
  const other = otherParticipant(thread, me);
  const seen = thread.readAt?.[other]?.toMillis?.() ?? 0;
  return !!m.createdAt && seen >= m.createdAt.toMillis();
}

export const ACCOUNT_TYPE_LABEL: Record<string, { ar: string; en: string }> = {
  dentist: { ar: "طبيب أسنان", en: "Dentist" },
  supply: { ar: "مستلزمات طبية", en: "Dental supplies" },
  lab: { ar: "مختبر أسنان", en: "Dental lab" },
  implant: { ar: "شركة زرعات", en: "Implant company" },
};

export const ACCOUNT_TYPE_COLOR: Record<string, string> = {
  dentist: "#2563EB",
  supply: "#0891B2",
  lab: "#7C3AED",
  implant: "#0E7490",
};
