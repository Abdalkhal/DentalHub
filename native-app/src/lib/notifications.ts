import { useEffect, useState } from "react";
import { setDoc, doc, collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";

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
  senderName?: string;
  senderPhotoURL?: string;
  /** For type "message": the other participant's uid, so tapping the
   * notification can open that direct-message thread. */
  chatWith?: string;
};

/**
 * Live unread-notification count for a bell icon badge. Without this, a
 * notification can be written correctly (e.g. by placeCartOrder when a
 * dentist checks out) with no visible sign anywhere in the app that it
 * arrived — the recipient only finds out by opening /notifications on their
 * own initiative.
 */
export function useUnreadNotificationsCount(userId?: string): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const unsub = onSnapshot(
      q,
      (snap) => setCount(snap.docs.filter((d) => !d.data().isRead).length),
      () => setCount(0),
    );
    return unsub;
  }, [userId]);

  return count;
}

export function createNotification(
  data: Omit<Notification, "id" | "isRead" | "createdAt" | "expiresAt">,
) {
  const id = `${data.userId}_${Date.now()}`;
  return setDoc(doc(db, "notifications", id), {
    ...data,
    id,
    isRead: false,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
}
