// Direct 1:1 messaging between any two accounts. Separate from
// `caseMessages.ts`, which is a case-scoped chat between a dentist and the
// lab handling that case. Mirrors native-app/src/lib/directMessages.ts —
// both apps read and write the same `dm_threads` collection.
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

/** Deterministic thread id — the Firestore rules verify it matches `participants`. */
export function dmThreadId(a: string, b: string): string {
  return [a, b].sort().join("_");
}

function messagesCollection(threadId: string) {
  return collection(db, "dm_threads", threadId, "messages");
}

export function useDmThreads(userId: string | undefined) {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setThreads([]);
      setLoading(false);
      return;
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

export function useDmMessages(threadId: string) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(messagesCollection(threadId), orderBy("createdAt", "asc"));
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
  }, [threadId]);

  return { messages, loading };
}

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
    doc(db, "dm_threads", threadId),
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

  // Best-effort: a failed notification must never undo a sent message.
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
      return;
    }
    const q = query(messagesCollection(threadId), orderBy("createdAt", "asc"));
    return onSnapshot(
      q,
      (snap) => {
        const lastRead = getDmLastReadMs(threadId, userId);
        let n = 0;
        snap.forEach((d) => {
          const m = d.data() as DmMessage;
          if (m.senderId === userId) return;
          if ((m.createdAt?.toMillis?.() ?? 0) > lastRead) n += 1;
        });
        setCount(n);
      },
      () => setCount(0),
    );
  }, [threadId, userId, tick]);

  return count;
}
