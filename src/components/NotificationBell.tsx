import { useState, useEffect, useRef } from "react";
import { updateDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { Bell, CheckCheck, Package, Truck, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { useNotifications, type Notification } from "@/lib/notifications";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

const TYPE_ICONS: Record<string, typeof Package> = {
  order_new: Package,
  order_status: Truck,
  message: MessageCircle,
};

/** Same destinations as the native notifications screen. */
export function notificationTarget(n: Notification):
  | { to: "/messages"; search: { with: string } }
  | { to: "/doctor-invoices/$invoiceId"; params: { invoiceId: string } }
  | { to: "/orders" }
  | null {
  if (n.type === "message" && n.chatWith) return { to: "/messages", search: { with: n.chatWith } };
  if (n.invoiceId) return { to: "/doctor-invoices/$invoiceId", params: { invoiceId: n.invoiceId } };
  if (n.orderId || n.type === "order_new") return { to: "/orders" };
  return null;
}

export function markNotificationRead(id: string) {
  return updateDoc(doc(db, "notifications", id), { isRead: true }).catch(() => {});
}

export function markAllNotificationsRead(notes: Notification[]) {
  const batch = writeBatch(db);
  notes.filter((n) => !n.isRead).forEach((n) => batch.update(doc(db, "notifications", n.id), { isRead: true }));
  return batch.commit().catch(() => {});
}

export function notificationTimeAgo(ts: number | undefined, ar: boolean): string {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return ar ? "الآن" : "now";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return ar ? `منذ ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return ar ? `منذ ${hours} س` : `${hours}h ago`;
  return ar ? `منذ ${Math.floor(hours / 24)} يوم` : `${Math.floor(hours / 24)}d ago`;
}

/** A short two-tone chime via Web Audio (no audio asset needed). */
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.32);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch {
    /* audio blocked until the user interacts with the page — the toast still shows */
  }
}

/**
 * Announces notifications that arrive while the page is open: a toast, a
 * chime, and a desktop notification when the tab is in the background. The
 * bell's badge alone went unnoticed — a lab working on a laptop never knew a
 * new case had arrived. Only notifications created after the page loaded are
 * announced, so reloading never replays old ones.
 */
function useAnnounceNewNotifications(notifications: Notification[], ar: boolean) {
  const since = useRef(Date.now());
  const announced = useRef(new Set<string>());
  useEffect(() => {
    for (const n of notifications) {
      if (n.isRead || announced.current.has(n.id) || (n.createdAt ?? 0) < since.current) continue;
      announced.current.add(n.id);
      toast(n.title, { description: n.body });
      playChime();
      if (typeof window !== "undefined" && "Notification" in window && document.hidden && Notification.permission === "granted") {
        try {
          new Notification(n.title, { body: n.body, lang: ar ? "ar" : "en", tag: n.id });
        } catch {
          /* some browsers only allow notifications from a service worker */
        }
      }
    }
  }, [notifications, ar]);
}

/** Desktop notifications need a user gesture to request — asked on the first bell click. */
function requestDesktopNotifications() {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
    void Notification.requestPermission().catch(() => {});
  }
}

export function NotificationBell({
  userId,
  dark = false,
  className,
}: {
  userId: string;
  dark?: boolean;
  // Extra classes merged onto the trigger button. Used by pages whose header
  // is dark on phones but light at md:+, so the `dark` styling can be undone
  // at the wider breakpoints without changing it anywhere else.
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { notes: notifications } = useNotifications(userId || undefined);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { lang } = useI18n();
  const ar = lang === "ar";
  useAnnounceNewNotifications(notifications, ar);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifications.filter((n) => !n.isRead).length;

  const handleItemClick = (n: Notification) => {
    markNotificationRead(n.id);
    const target = notificationTarget(n);
    if (target) {
      setOpen(false);
      navigate(target);
    }
  };

  const markAllRead = () => markAllNotificationsRead(notifications);

  const timeAgo = (ts: number) => notificationTimeAgo(ts, ar);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          requestDesktopNotifications();
          setOpen(!open);
        }}
        className={cn(
          "relative size-10 rounded-xl flex items-center justify-center transition",
          dark
            ? "bg-white/10 border border-white/20 text-white hover:bg-white/20"
            : "border border-slate-200 bg-white shadow-sm hover:bg-slate-100 text-slate-500",
          className,
        )}
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
            <h3 className="font-display font-extrabold text-sm text-slate-800">{ar ? "الإشعارات" : "Notifications"}</h3>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1">
                  <CheckCheck className="size-3" />
                  {ar ? "تحديد الكل كمقروء" : "Mark all read"}
                </button>
              )}
              <Link to="/notifications" onClick={() => setOpen(false)} className="text-[11px] font-semibold text-slate-500 hover:text-primary hover:underline">
                {ar ? "عرض الكل" : "View all"}
              </Link>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                <Bell className="size-8 mx-auto mb-2 text-slate-300" />
                {ar ? "لا توجد إشعارات حالياً" : "No notifications yet"}
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
