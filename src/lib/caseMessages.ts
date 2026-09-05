import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/integrations/firebase/client";

export type CaseMessageSenderRole = "doctor" | "lab";

export type CaseMessage = {
  id: string;
  senderId: string;
  senderRole: CaseMessageSenderRole;
  senderName: string;
  text: string;
  attachments?: string[];
  createdAt: Timestamp | null;
};

export type SendMessageInput = {
  senderId: string;
  senderRole: CaseMessageSenderRole;
  senderName: string;
  text: string;
  attachments?: string[];
};

function messagesCollection(labId: string, caseId: string) {
  return collection(db, "lab_orders", labId, "cases", caseId, "messages");
}

/** Real-time listener on a case's `messages` subcollection (ascending). */
export function useCaseMessages(labId: string, caseId: string) {
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!labId || !caseId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return () => {};
    }
    setLoading(true);
    setError(null);
    const q = query(messagesCollection(labId, caseId), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CaseMessage));
        setLoading(false);
      },
      (err) => {
        console.error("Case messages listener error:", err);
        setError(err instanceof Error ? err.message : "Failed to load messages");
        setLoading(false);
      },
    );
    return unsub;
  }, [labId, caseId]);

  return { messages, loading, error };
}

/** Appends a new message to the case's `messages` subcollection. */
export async function sendCaseMessage(labId: string, caseId: string, data: SendMessageInput) {
  const attachmentsList = data.attachments ?? [];
  const messageData = {
    text: data.text,
    senderId: data.senderId,
    senderRole: data.senderRole,
    senderName: data.senderName,
    createdAt: serverTimestamp(),
    attachments: attachmentsList.length > 0 ? attachmentsList : [],
  };
  await addDoc(messagesCollection(labId, caseId), messageData);
}

/**
 * Uploads a chat image and returns its storage *path*.
 *
 * Not a download URL: those are permanent unauthenticated handles on patient
 * imagery. Consumers resolve the path through `resolveCaseFileUrl`, which is
 * checked against Storage Rules on every fetch.
 */
export async function uploadChatAttachment(
  labId: string,
  caseId: string,
  file: File,
): Promise<string> {
  const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const path = `case_messages/${labId}/${caseId}/${safeName}`;
  await uploadBytes(ref(storage, path), file, {
    contentType: file.type || "image/jpeg",
    cacheControl: "private, max-age=86400",
  });
  return path;
}

/* ── Unread tracking (localStorage-backed read markers) ───────────── */

const READ_EVENT = "case-message-read";

function readKey(caseId: string, userId: string) {
  return `case_read_${caseId}_${userId}`;
}

export function getLastReadMs(caseId: string, userId: string): number {
  try {
    const v = localStorage.getItem(readKey(caseId, userId));
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

/** Marks a case as read "now" and notifies unread badges to refresh. */
export function markCaseRead(caseId: string, userId: string) {
  try {
    localStorage.setItem(readKey(caseId, userId), String(Date.now()));
    window.dispatchEvent(new CustomEvent(READ_EVENT, { detail: { caseId, userId } }));
  } catch {
    /* non-critical */
  }
}

/** Unread count for a case = messages from others newer than the last read marker. */
export function useCaseUnreadCount(labId: string, caseId: string, userId: string | undefined) {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const onRead = () => setTick((t) => t + 1);
    window.addEventListener(READ_EVENT, onRead);
    return () => window.removeEventListener(READ_EVENT, onRead);
  }, []);

  useEffect(() => {
    if (!labId || !caseId || !userId) {
      setCount(0);
      return () => {};
    }
    const q = query(messagesCollection(labId, caseId), orderBy("createdAt", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const lastRead = getLastReadMs(caseId, userId);
        let n = 0;
        snap.forEach((d) => {
          const m = d.data() as CaseMessage;
          if (m.senderId === userId) return;
          const ms = m.createdAt?.toMillis?.() ?? 0;
          if (ms > lastRead) n += 1;
        });
        setCount(n);
      },
      (err) => {
        console.error("Case unread listener error:", err);
        setCount(0);
      },
    );
    return unsub;
  }, [labId, caseId, userId, tick]);

  return count;
}
