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
import { ref } from "firebase/storage";
import { uploadData } from "./uploadData";
import { db, storage } from "@/integrations/firebase/client";

export type CaseMessageSenderRole = "doctor" | "lab";

/** A non-image attachment (PDF, STL, ZIP…) or a voice note. Images stay in
 *  `attachments` (paths) so older app versions still show them. */
export type ChatFile = {
  path: string;
  name: string;
  type: string;
  size?: number;
  // Voice notes only.
  durationMs?: number;
};

export type CaseMessage = {
  id: string;
  senderId: string;
  senderRole: CaseMessageSenderRole;
  senderName: string;
  text: string;
  attachments?: string[];
  files?: ChatFile[];
  createdAt: Timestamp | null;
};

export type SendMessageInput = {
  senderId: string;
  senderRole: CaseMessageSenderRole;
  senderName: string;
  text: string;
  attachments?: string[];
  files?: ChatFile[];
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
    ...(data.files?.length ? { files: data.files } : {}),
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
  await uploadData(ref(storage, path), file, {
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

/** Largest chat attachment — keep in sync with `case_messages` in storage.rules. */
export const CHAT_FILE_MAX_MB = 50;

/** Uploads any chat attachment (image, PDF, STL, ZIP, voice note) and
 *  returns its storage path. */
export async function uploadChatFile(
  labId: string,
  caseId: string,
  data: Blob | Uint8Array | ArrayBuffer,
  name: string,
  type: string,
): Promise<string> {
  const safeName = `${Date.now()}_${(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const path = `case_messages/${labId}/${caseId}/${safeName}`;
  await uploadData(ref(storage, path), data, {
    contentType: type || "application/octet-stream",
    cacheControl: "private, max-age=86400",
  });
  return path;
}

/** One-line preview of a message for notifications and lists. */
export function messagePreview(m: Pick<CaseMessage, "text" | "attachments" | "files">, ar: boolean): string {
  if (m.text.trim()) return m.text.trim();
  if (m.files?.some((f) => f.type.startsWith("audio/"))) return ar ? "🎤 رسالة صوتية" : "🎤 Voice note";
  if (m.attachments?.length) return ar ? "📷 صورة" : "📷 Photo";
  if (m.files?.length) return ar ? `📎 ${m.files[0].name}` : `📎 ${m.files[0].name}`;
  return "";
}

/**
 * Tells the other side of the case about a new message (in-app + push via
 * sendPushOnNotification). The doctor's messages go to the lab, the lab's
 * to the referring doctor. Best effort — the message itself is already sent.
 */
export async function notifyCaseMessage(opts: {
  toUserId: string;
  forRole: CaseMessageSenderRole;
  senderName: string;
  patient: string;
  orderNumber?: string;
  caseId: string;
  labId: string;
  preview: string;
  ar: boolean;
}) {
  if (!opts.toUserId) return;
  const { createNotification } = await import("./notifications");
  const where = opts.orderNumber ? `${opts.patient} · ${opts.orderNumber}` : opts.patient;
  await createNotification({
    userId: opts.toUserId,
    title: opts.ar ? `رسالة جديدة — ${where}` : `New message — ${where}`,
    body: `${opts.senderName}: ${opts.preview}`.slice(0, 180),
    type: "case_message",
    orderId: opts.caseId,
    labId: opts.labId,
    forRole: opts.forRole,
  }).catch((err) => console.warn("Case message notification failed:", err));
}
