import { useEffect, useState } from "react";
import { setDoc, doc, collection, onSnapshot, query, where } from "firebase/firestore";
import { auth, db } from "@/integrations/firebase/client";

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "order_new" | "order_status" | "message";
  isRead: boolean;
  createdAt: number;
  orderId?: string;
  invoiceId?: string;
  expiresAt?: number;
  /** The account that triggered this notification — required by the
   * `notifications` Firestore rule (must equal the writer's own uid). */
  senderId?: string;
  senderName?: string;
  senderPhotoURL?: string;
  /** For type "message": the other participant's uid, so opening the
   * notification can jump straight into that direct-message thread. */
  chatWith?: string;
};

/** Live list of the user's non-expired notifications, newest first. Sorted
 * client-side so the query needs only the automatic single-field index. */
export function useNotifications(userId?: string) {
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    return onSnapshot(
      q,
      (snap) => {
        const now = Date.now();
        const list = snap.docs
          .map((d) => ({ ...d.data(), id: d.id }) as Notification)
          .filter((n) => !n.expiresAt || n.expiresAt > now);
        list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setNotes(list);
        setLoading(false);
      },
      () => {
        setNotes([]);
        setLoading(false);
      },
    );
  }, [userId]);

  return { notes, loading };
}

export function createNotification(
  data: Omit<Notification, "id" | "isRead" | "createdAt" | "expiresAt" | "senderId">,
) {
  const id = `${data.userId}_${Date.now()}`;
  return setDoc(doc(db, "notifications", id), {
    ...data,
    id,
    senderId: auth.currentUser?.uid ?? "",
    isRead: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
}
