import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  updateDoc, doc, writeBatch, setDoc,
} from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Bell, CheckCheck, Package, Truck, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

type Notification = {
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

export function createNotification(data: Omit<Notification, "id" | "isRead" | "createdAt" | "expiresAt">) {
  const id = `${data.userId}_${Date.now()}`;
  return setDoc(doc(db, "notifications", id), {
    ...data, id, isRead: false, createdAt: Date.now(), expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
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
  const navigate = useNavigate();

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
      const now = Date.now();
      setNotifications(
        snap.docs
          .map((d) => ({ ...d.data(), id: d.id } as Notification))
          .filter((n) => !n.expiresAt || n.expiresAt > now),
      );
    });
  }, [userId]);

  const unread = notifications.filter((n) => !n.isRead).length;

  const markRead = async (id: string) => {
    await updateDoc(doc(db, "notifications", id), { isRead: true });
  };

  const handleItemClick = (n: Notification) => {
    markRead(n.id);
    if (n.invoiceId) {
      setOpen(false);
      navigate({ to: "/doctor-invoices/$invoiceId", params: { invoiceId: n.invoiceId } });
      return;
    }
    if (n.orderId || n.type === "order_new") {
      setOpen(false);
      navigate({ to: "/orders" });
    }
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
        <div className="absolute top-full end-0 mt-2 w-[22rem] sm:w-[26rem] bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-sky-50/60 to-transparent">
            <h3 className="font-display font-extrabold text-sm text-slate-800">الإشعارات</h3>
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
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      "w-full text-start px-4 py-3.5 flex gap-3 border-b border-slate-100 transition",
                      !n.isRead ? "bg-sky-50/40 hover:bg-sky-50" : "hover:bg-slate-50",
                    )}
                  >
                    <span className="relative shrink-0">
                      {n.senderPhotoURL ? (
                        <img
                          src={n.senderPhotoURL}
                          alt={n.senderName || ""}
                          className={cn(
                            "size-11 rounded-2xl object-cover ring-2",
                            n.isRead ? "ring-slate-200" : "ring-sky-200",
                          )}
                        />
                      ) : (
                        <span
                          className={cn(
                            "size-11 rounded-2xl flex items-center justify-center",
                            n.isRead ? "bg-slate-100 text-slate-500" : "bg-sky-100 text-sky-600",
                          )}
                        >
                          <Icon className="size-5" />
                        </span>
                      )}
                      {!n.isRead && (
                        <span className="absolute -top-0.5 -end-0.5 size-3 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                    </span>

                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-[13px] leading-snug text-slate-800", !n.isRead && "font-bold")}>
                          {n.title}
                        </p>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0 mt-0.5">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {n.senderName && (
                        <p className="text-[11px] font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                          <span className="size-1 rounded-full bg-slate-300" />
                          {n.senderName}
                        </p>
                      )}
                      <p
                        className={cn(
                          "text-xs leading-relaxed mt-1 line-clamp-2",
                          n.isRead ? "text-slate-500" : "text-slate-700",
                        )}
                      >
                        {n.body}
                      </p>
                    </div>
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
