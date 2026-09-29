import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, MessageCircle, Package, Truck } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationTarget,
  notificationTimeAgo,
} from "@/components/NotificationBell";
import { useNotifications, type Notification } from "@/lib/notifications";
import { useSession } from "@/lib/useAuth";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

const TYPE_META: Record<Notification["type"], { icon: typeof Package; tone: string }> = {
  order_new: { icon: Package, tone: "bg-sky-100 text-sky-600" },
  order_status: { icon: Truck, tone: "bg-amber-100 text-amber-600" },
  message: { icon: MessageCircle, tone: "bg-emerald-100 text-emerald-600" },
};

function NotificationsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const navigate = useNavigate();
  const { notes } = useNotifications(user?.uid);
  const unreadCount = notes.filter((n) => !n.isRead).length;

  const open = (n: Notification) => {
    markNotificationRead(n.id);
    const target = notificationTarget(n);
    if (target) navigate(target);
  };

  return (
    <MobileShell wide>
      <TopBar title={ar ? "الإشعارات" : "Notifications"} showBack wide maxW="3xl" />
      <div className="px-4 pt-4 pb-6 md:px-6 md:pt-8 lg:px-0 lg:max-w-3xl lg:mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-slate-600">
            {ar ? "الإشعارات" : "Notifications"} {unreadCount > 0 ? `(${unreadCount})` : ""}
          </p>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllNotificationsRead(notes)}
              className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              <CheckCheck className="size-3.5" />
              {ar ? "تحديد الكل كمقروء" : "Mark all read"}
            </button>
          )}
        </div>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Bell className="size-10 text-slate-300" strokeWidth={1.5} />
            <p className="mt-3 text-sm text-slate-400">{ar ? "لا توجد إشعارات حاليًا" : "No notifications yet"}</p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {notes.map((n) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.message;
              const Icon = meta.icon;
              const unread = !n.isRead;
              return (
                <li key={n.id}>
                  <button
                    onClick={() => open(n)}
                    className={cn(
                      "w-full flex gap-3 rounded-2xl border p-3.5 text-start transition hover:shadow-sm",
                      unread ? "border-sky-100 bg-sky-50/50" : "border-slate-200 bg-card",
                    )}
                  >
                    <span className="relative shrink-0">
                      {n.senderPhotoURL ? (
                        <img
                          src={n.senderPhotoURL}
                          alt=""
                          className={cn("size-11 rounded-2xl object-cover border-2", unread ? "border-sky-200" : "border-slate-200")}
                        />
                      ) : (
                        <span className={cn("size-11 rounded-2xl flex items-center justify-center", meta.tone)}>
                          <Icon className="size-5" />
                        </span>
                      )}
                      {unread && (
                        <span className="absolute -top-0.5 -end-0.5 size-3 rounded-full border-2 border-white bg-rose-500" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("flex-1 text-[13px] leading-snug text-slate-800 line-clamp-2", unread && "font-bold")}>
                          {n.title || "—"}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-400">{notificationTimeAgo(n.createdAt, ar)}</span>
                      </div>
                      {n.senderName && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <span className="size-1 rounded-full bg-slate-300" />
                          {n.senderName}
                        </p>
                      )}
                      {n.body && (
                        <p className={cn("mt-1 text-xs leading-relaxed line-clamp-2", unread ? "text-slate-700" : "text-slate-500")}>
                          {n.body}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
