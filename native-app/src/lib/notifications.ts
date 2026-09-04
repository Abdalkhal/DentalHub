import { setDoc, doc } from "firebase/firestore";
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
};

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
