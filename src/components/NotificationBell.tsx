import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  updateDoc, doc, writeBatch, setDoc,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Bell, CheckCheck, Package, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "order_new" | "order_status" | "message";
  isRead: boolean;
  createdAt: number;
  orderId?: string;
};

export function createNotification(data: Omit<Notification, "id" | "isRead" | "createdAt">) {
  const id = `${data.userId}_${Date.now()}`;
  return setDoc(doc(db, "notifications", id), {
    ...data, id, isRead: false, createdAt: Date.now(),
  });
}

const TYPE_ICONS: Record<string, typeof Package> = {
  order_new: Package,
  order_status: Truck,
  message: CheckCircle2,
};

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!userId) return;
    const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Notification)));
    });
  }, [userId]);

  const unread = notifications.filter((n) => !n.isRead).length;

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { isRead: true });
  };

  const markAllRead = async () => {
    const batch = writeBatch(db);
    notifications.filter((n) => !n.isRead).forEach((n) => batch.update(doc(db, "notifications", n.id), { isRead: true }));
    await batch.commit();
  };

  const timeAgo = (ts: number) => {
    const seconds = Math.floor((Date.now() - ts) / 1000);
    if (seconds < 60) return "الآن";
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative size-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-500"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 end-1.5 size-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full end-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-sm">الإشعارات</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="size-3" />تحديد الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                <Bell className="size-8 mx-auto mb-2 text-slate-300" />
                لا توجد إشعارات حالياً
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICONS[n.type] ?? Package;
                return (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "w-full text-start px-4 py-3 flex gap-3 border-b border-gray-50 hover:bg-sky-50/50 transition",
                      !n.isRead && "bg-sky-50/30",
                    )}
                  >
                    <span className={cn("size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", n.isRead ? "bg-slate-100 text-slate-500" : "bg-sky-100 text-sky-600")}>
                      <Icon className="size-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs leading-snug", !n.isRead && "font-bold text-slate-800")}>{n.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="size-2 rounded-full bg-sky-500 shrink-0 mt-1" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
