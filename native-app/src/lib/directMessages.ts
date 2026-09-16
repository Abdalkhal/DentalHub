// Direct 1:1 messaging between any two accounts (dentist <-> supply office,
// dentist <-> implant company, dentist <-> lab, or any other pair). This is
// deliberately separate from `caseMessages.ts`, which is a *case*-scoped
// chat between a dentist and the lab handling that specific case — direct
// messages have no case/order attached, just two participants.
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { createNotification } from "@/lib/notifications";

export type DmMessage = {
  id: string;
  senderId: string;
  text: string;
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
};

/** Deterministic thread id so the same two accounts always land on the same
 * thread doc, and Firestore rules can verify `threadId` matches `participants`
 * without an extra lookup. */
export function dmThreadId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

function threadRef(threadId: string) {
  return doc(db, "dm_threads", threadId);
}
function messagesCollection(threadId: string) {
  return collection(db, "dm_threads", threadId, "messages");
}

/** Real-time list of a user's DM threads. Sorted client-side (not via
 * `orderBy` in the query) so the `participants array-contains uid` query
 * needs no composite index — same convention as the rest of this app. */
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
    const unsub = onSnapshot(
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
    return unsub;
  }, [userId]);

  return { threads, loading };
}

/** Real-time listener on one thread's `messages` subcollection (ascending). */
export function useDmMessages(threadId: string) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    const q = query(messagesCollection(threadId), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
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
    return unsub;
  }, [threadId]);

  return { messages, loading };
}

/** Creates/refreshes the thread doc (merge, so this is safe on every send,
 * not just the first) and appends the message. */
export async function sendDmMessage(opts: {
  senderId: string;
  recipientId: string;
  senderName: string;
  recipientName: string;
  senderPhoto?: string;
  recipientPhoto?: string;
  text: string;
}) {
  const { senderId, recipientId, senderName, recipientName, senderPhoto, recipientPhoto, text } = opts;
  const threadId = dmThreadId(senderId, recipientId);
  await setDoc(
    threadRef(threadId),
    {
      participants: [senderId, recipientId].sort(),
      names: { [senderId]: senderName, [recipientId]: recipientName },
      photos: { [senderId]: senderPhoto || "", [recipientId]: recipientPhoto || "" },
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      lastSenderId: senderId,
    },
    { merge: true },
  );
  await addDoc(messagesCollection(threadId), { senderId, text, createdAt: serverTimestamp() });

  // Best-effort, non-blocking — same pattern as the order/case notifications
  // elsewhere in this app (see placeCartOrder in lib/orders.ts): a failure
  // here must never stop the message itself from having sent.
  createNotification({
    userId: recipientId,
    title: `رسالة جديدة من ${senderName}`,
    body: text,
    type: "message",
    senderName,
    senderPhotoURL: senderPhoto,
    chatWith: senderId,
  }).catch(() => {});

  return threadId;
}

/* ── Unread tracking (localStorage-backed read markers, same pattern as
   caseMessages.ts) ─────────────────────────────────────────────────── */

const READ_EVENT = "dm-thread-read";

function readKey(threadId: string, userId: string) {
  return `dm_read_${threadId}_${userId}`;
}

export function getDmLastReadMs(threadId: string, userId: string): number {
  try {
    const v = localStorage.getItem(readKey(threadId, userId));
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

export function markDmThreadRead(threadId: string, userId: string) {
  try {
    localStorage.setItem(readKey(threadId, userId), String(Date.now()));
    window.dispatchEvent(new CustomEvent(READ_EVENT, { detail: { threadId, userId } }));
  } catch {
    /* non-critical */
  }
}

/** Unread count for a thread = messages from the other side newer than the
 * last-read marker. */
export function useDmUnreadCount(threadId: string, userId: string | undefined) {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onRead = () => setTick((t) => t + 1);
    window.addEventListener(READ_EVENT, onRead);
    return () => window.removeEventListener(READ_EVENT, onRead);
  }, []);

  useEffect(() => {
    if (!threadId || !userId) {
      setCount(0);
      return () => {};
    }
    const q = query(messagesCollection(threadId), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lastRead = getDmLastReadMs(threadId, userId);
        let n = 0;
        snap.forEach((d) => {
          const m = d.data() as DmMessage;
          if (m.senderId === userId) return;
          const ms = m.createdAt?.toMillis?.() ?? 0;
          if (ms > lastRead) n += 1;
        });
        setCount(n);
      },
      (err) => {
        console.error("DM unread listener error:", err);
        setCount(0);
      },
    );
    return unsub;
  }, [threadId, userId, tick]);

  return count;
}
