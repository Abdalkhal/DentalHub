import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { signOut } from "firebase/auth";
import { MobileShell } from "@/components/MobileShell";
import { NotificationBell } from "@/components/NotificationBell";
import { auth } from "@/integrations/firebase/client";
import { useI18n } from "@/lib/i18n";
import { useSession, useLabStaffClaim } from "@/lib/useAuth";
import { useDesignerCases } from "@/lib/designerStore";
import { useDmThreads, getDmLastReadMs } from "@/lib/directMessages";
import type { Order, OrderStatus } from "@/lib/ordersStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Layers,
  Loader2,
  LogOut,
  MessageCircle,
  Package,
  PenTool,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/designer/")({
  component: DesignerIndex,
});

const STATUS_META: Record<OrderStatus, { ar: string; en: string; bg: string; fg: string; icon?: LucideIcon }> = {
  new: { ar: "جديدة", en: "New", bg: "#E0F2FE", fg: "#0369A1" },
  in_progress: { ar: "قيد التصميم", en: "In design", bg: "#FEF3C7", fg: "#B45309", icon: Clock },
  completed: { ar: "مكتملة", en: "Completed", bg: "#D1FAE5", fg: "#047857", icon: CheckCircle2 },
  delayed: { ar: "متأخرة", en: "Delayed", bg: "#FEE2E2", fg: "#B91C1C", icon: Clock },
};
const STATUS_ORDER: OrderStatus[] = ["new", "in_progress", "completed", "delayed"];
const FALLBACK_META = { ar: "—", en: "—", bg: "#E2E8F0", fg: "#475569" };

function statusMeta(status: string) {
  return STATUS_META[status as OrderStatus] ?? FALLBACK_META;
}

function MetaRow({ icon, children }: { icon: ReactNode; children?: ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {icon}
      <span className="truncate text-[11px] text-slate-500">{children}</span>
    </div>
  );
}

function ShortcutCard({
  icon,
  iconBg,
  title,
  subtitle,
  onClick,
  ar,
}: {
  icon: ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onClick: () => void;
  ar: boolean;
}) {
  const Chevron = ar ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm text-start hover:shadow-md transition"
    >
      <span className="size-11 shrink-0 rounded-2xl flex items-center justify-center" style={{ backgroundColor: iconBg }}>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-extrabold text-slate-800">{title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-slate-500">{subtitle}</span>
      </span>
      <Chevron className="size-4 text-slate-300" />
    </button>
  );
}

// Lists only the cases assigned to the signed-in lab staff member — same
// as native's designer screen.
function DesignerIndex() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const navigate = useNavigate();
  const { user } = useSession();
  const { claim } = useLabStaffClaim();
  const { cases, loading } = useDesignerCases(user?.uid || "");
  const { threads: dmThreads } = useDmThreads(user?.uid);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | null>(null);

  const [dmReadTick, setDmReadTick] = useState(0);
  useEffect(() => {
    const onRead = () => setDmReadTick((t) => t + 1);
    window.addEventListener("dm-thread-read", onRead);
    return () => window.removeEventListener("dm-thread-read", onRead);
  }, []);
  const unreadThreadsCount = useMemo(() => {
    if (!user?.uid) return 0;
    return dmThreads.filter((t) => {
      if (!t.lastSenderId || t.lastSenderId === user.uid) return false;
      const lastMs = t.lastMessageAt?.toMillis?.() ?? 0;
      return lastMs > getDmLastReadMs(t.id, user.uid);
    }).length;
    // dmReadTick re-evaluates read markers after a thread is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dmThreads, user?.uid, dmReadTick]);

  const counts = useMemo(() => {
    const c: Record<OrderStatus, number> = { new: 0, in_progress: 0, completed: 0, delayed: 0 };
    cases.forEach(({ order }) => {
      if (order.status in c) c[order.status] += 1;
    });
    return c;
  }, [cases]);

  const filteredCases = useMemo(
    () => (activeFilter ? cases.filter((c) => c.order.status === activeFilter) : cases),
    [cases, activeFilter],
  );

  const roleLabel =
    claim?.role === "TECHNICIAN" ? (ar ? "فني مختبر" : "Lab Technician") : ar ? "مصمم مختبر" : "Dental Lab Designer";
  const displayName = user?.displayName || user?.email || (ar ? "عضو المختبر" : "Lab member");

  const openCase = (orderId: string) => navigate({ to: "/designer/$caseId", params: { caseId: orderId } });

  const openChat = (order: Order) => {
    if (!order.dentistId) {
      toast.error(ar ? "لا يوجد طبيب مرتبط بهذه الحالة بعد" : "No dentist is linked to this case yet");
      return;
    }
    navigate({ to: "/messages", search: { with: order.dentistId, withName: order.doctor } });
  };

  const confirmSignOut = () => {
    if (!confirm(ar ? "هل تريد تسجيل الخروج من حسابك؟" : "Do you want to sign out of your account?")) return;
    void signOut(auth);
  };

  return (
    <MobileShell wide>
      <div className="px-4 pt-4 pb-8 md:px-6 md:pt-8 lg:px-8 lg:max-w-5xl lg:mx-auto">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative shrink-0">
              <span className="size-11 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-base font-extrabold">
                {displayName.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="absolute -end-0.5 bottom-0 size-3 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-900">{displayName}</p>
              <p className="truncate text-[11px] text-slate-500">{roleLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell userId={user?.uid || ""} />
            <span className="text-base font-extrabold tracking-tight">
              <span className="text-primary">Dent</span>
              <span className="text-slate-900"> Hub</span>
            </span>
          </div>
        </div>

        <h1 className="text-xl font-extrabold text-slate-900">{ar ? "حالاتي" : "My cases"}</h1>
        <p className="mt-0.5 text-xs text-slate-500">{ar ? "عرض جميع الحالات المسندة إليك" : "All the cases assigned to you"}</p>

        {/* Shortcuts */}
        <div className="mt-4 flex gap-3">
          <ShortcutCard
            ar={ar}
            icon={<MessageCircle className="size-5 text-sky-600" />}
            iconBg="#E0F2FE"
            title={ar ? "المحادثات" : "Messages"}
            subtitle={
              unreadThreadsCount > 0
                ? ar
                  ? `${unreadThreadsCount} رسالة جديدة`
                  : `${unreadThreadsCount} new message${unreadThreadsCount > 1 ? "s" : ""}`
                : ar
                  ? "لا رسائل جديدة"
                  : "No new messages"
            }
            onClick={() => navigate({ to: "/messages" })}
          />
          <ShortcutCard
            ar={ar}
            icon={<ClipboardList className="size-5 text-violet-600" />}
            iconBg="#EDE9FE"
            title={ar ? "الحالات المسندة" : "Assigned cases"}
            subtitle={ar ? `${cases.length} حالات` : `${cases.length} cases`}
            onClick={() => setActiveFilter(null)}
          />
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_ORDER.map((key) => {
            const meta = STATUS_META[key];
            const Icon = meta.icon;
            const active = activeFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveFilter((f) => (f === key ? null : key))}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold transition",
                  active ? "bg-primary text-white" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {Icon && <Icon className="size-3.5" style={{ color: active ? "#FFFFFF" : meta.fg }} />}
                {ar ? meta.ar : meta.en}
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold",
                    active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Cases */}
        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-7 animate-spin text-primary" />
            </div>
          ) : filteredCases.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <PenTool className="size-11 text-slate-300" strokeWidth={1.4} />
              <p className="mt-3 text-sm font-semibold text-slate-400">
                {cases.length === 0
                  ? ar
                    ? "لا توجد حالات مسندة إليك"
                    : "No cases assigned to you"
                  : ar
                    ? "لا توجد حالات ضمن هذا التصنيف"
                    : "No cases in this filter"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {cases.length === 0
                  ? ar
                    ? "ستظهر الحالات المسندة إليك هنا"
                    : "Cases assigned to you will appear here"
                  : ar
                    ? "جرّب تصنيفاً آخر"
                    : "Try another filter"}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredCases.map(({ order }) => {
                const meta = statusMeta(order.status);
                return (
                  <div
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openCase(order.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openCase(order.id);
                    }}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-3">
                      <span className="size-14 shrink-0 rounded-2xl flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
                        <Layers className="size-6" style={{ color: meta.fg }} />
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-[11px] font-extrabold text-primary">#{order.orderNumber || order.caseId}</p>
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {order.workType || (ar ? "غير محدد" : "Unspecified")}
                        </p>
                        <MetaRow icon={<Stethoscope className="size-3 text-slate-400 shrink-0" />}>{order.doctor}</MetaRow>
                        <MetaRow icon={<Building2 className="size-3 text-slate-400 shrink-0" />}>{order.clinic}</MetaRow>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                          <MetaRow icon={<Calendar className="size-3 text-slate-400 shrink-0" />}>
                            {order.dueDate ? `${ar ? "موعد التسليم" : "Due"}: ${order.dueDate}` : undefined}
                          </MetaRow>
                          <MetaRow icon={<Package className="size-3 text-slate-400 shrink-0" />}>
                            {order.material ? `${ar ? "المادة" : "Material"}: ${order.material}` : undefined}
                          </MetaRow>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: meta.bg, color: meta.fg }}>
                        {ar ? meta.ar : meta.en}
                      </span>
                    </div>

                    <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openCase(order.id)}
                        className="h-10 flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition"
                      >
                        <ClipboardList className="size-3.5" />
                        {ar ? "الحالة" : "Case"}
                      </button>
                      <button
                        type="button"
                        onClick={() => openChat(order)}
                        className={cn(
                          "h-10 flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition",
                          !order.dentistId && "opacity-40",
                        )}
                      >
                        <MessageCircle className="size-3.5" />
                        {ar ? "محادثة" : "Chat"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={confirmSignOut}
          className="mt-4 w-full h-14 flex items-center justify-center gap-2 rounded-2xl bg-rose-50 text-sm font-extrabold text-rose-600 hover:bg-rose-100 transition md:max-w-sm"
        >
          <LogOut className="size-4" />
          {ar ? "تسجيل الخروج من الحساب" : "Sign out"}
        </button>
      </div>
    </MobileShell>
  );
}
