// Messages: direct conversations with any account, and (for dentists) the
// chats of their lab cases. Mirrors the native app's app/messages.tsx; data
// in lib/directMessages.ts (identical in both apps).
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  Ban,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flag,
  FlaskConical,
  ImagePlus,
  Loader2,
  MessageCircle,
  MoreVertical,
  Search,
  Send,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { CaseChat } from "@/components/CaseChat";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSession, useUserRole } from "@/lib/useAuth";
import { useOrders } from "@/lib/ordersStore";
import { useDentistCases, filterLegacyOrders } from "@/lib/caseTracking";
import { useCaseUnreadCount } from "@/lib/caseMessages";
import {
  ACCOUNT_TYPE_COLOR,
  ACCOUNT_TYPE_LABEL,
  DM_MAX_LENGTH,
  deleteDmMessage,
  dmDayLabel,
  dmListTime,
  dmThreadId,
  dmTime,
  isBlocked,
  markDmThreadRead,
  otherParticipant,
  reportDmThread,
  sameDay,
  seenByOther,
  sendDmMessage,
  setDmBlocked,
  unreadFor,
  useDmMessages,
  useDmThread,
  useDmThreads,
  type DmMessage,
  type DmThread,
} from "@/lib/directMessages";
import { uploadDmImage, useDmImageUrl } from "@/lib/dmUpload";
import { useAccountCard, useAccountCards } from "@/lib/accountCards";

const messagesSearchSchema = z.object({
  with: z.string().optional().catch(undefined),
  withName: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/messages")({
  validateSearch: messagesSearchSchema,
  component: Messages,
});

type CaseConv = { labId: string; caseId: string; patient: string; orderNo: string; workType?: string };
type Peer = { id: string; name: string; photo: string; type: string };

function Avatar({ photo, name, type, size = 48 }: { photo?: string; name: string; type?: string; size?: number }) {
  const style = { width: size, height: size, borderRadius: size / 2.6 };
  if (photo) return <img src={photo} alt="" style={style} className="shrink-0 bg-slate-100 object-cover" />;
  return (
    <span
      style={{ ...style, backgroundColor: ACCOUNT_TYPE_COLOR[type ?? ""] ?? "#64748B", fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center font-extrabold text-white"
    >
      {name.trim().charAt(0) || "؟"}
    </span>
  );
}

function CountBadge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#2563EB] px-1.5 text-[10px] font-bold text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}

function Messages() {
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const uid = user?.uid;
  const isDentist = role?.accountType === "dentist";
  // Invited lab staff have no account doc — never show their email as a name.
  const myName = role
    ? [role.name, role.surname].filter(Boolean).join(" ").trim() || role.clinicName || (ar ? "مستخدم" : "User")
    : user?.displayName || (ar ? "كادر المختبر" : "Lab staff");
  const myPhoto = role?.photoURL || "";

  const { threads, loading } = useDmThreads(uid);
  const [openThreadId, setOpenThreadId] = useState("");
  const [openCase, setOpenCase] = useState<CaseConv | null>(null);
  const [tab, setTab] = useState<"dm" | "cases">("dm");
  const [q, setQ] = useState("");

  useEffect(() => {
    if (search.with && uid && search.with !== uid) {
      setOpenCase(null);
      setOpenThreadId(dmThreadId(uid, search.with));
    }
  }, [search.with, uid]);

  const cards = useAccountCards(threads.map((t) => otherParticipant(t, uid)));
  const peerOf = (t: DmThread): Peer => {
    const id = otherParticipant(t, uid);
    const c = cards[id];
    return { id, name: c?.name || t.names?.[id] || (ar ? "مستخدم" : "User"), photo: c?.photoURL || t.photos?.[id] || "", type: c?.accountType ?? "" };
  };

  const localOrders = useOrders();
  const { cases: remoteCases } = useDentistCases(isDentist ? (uid ?? "") : "");
  const caseConvs = useMemo<CaseConv[]>(() => {
    if (!isDentist) return [];
    const remote = remoteCases.map((c) => ({
      labId: c.labId || (c.order.targetLabId as string | undefined) || "",
      caseId: c.order.id,
      patient: c.order.patient || (ar ? "مريض" : "Patient"),
      orderNo: c.order.orderNumber || c.order.id.slice(0, 6),
      workType: c.order.workType,
    }));
    const ids = new Set(remote.map((r) => r.caseId));
    const doctorName = [role?.name, role?.surname].filter(Boolean).join(" ").trim();
    const legacy = filterLegacyOrders(localOrders, ids, doctorName).map((o) => ({
      labId: (o.targetLabId as string | undefined) || "",
      caseId: o.id,
      patient: o.patient || (ar ? "مريض" : "Patient"),
      orderNo: o.orderNumber || o.id.slice(0, 6),
      workType: o.workType,
    }));
    return Array.from(new Map([...remote, ...legacy].map((c) => [c.caseId, c])).values()).filter((c) => c.labId);
  }, [isDentist, remoteCases, localOrders, role?.name, role?.surname, ar]);
  const labCards = useAccountCards(caseConvs.map((c) => c.labId));

  const close = () => {
    setOpenThreadId("");
    setOpenCase(null);
    if (search.with) navigate({ to: "/messages", search: {}, replace: true });
  };

  const needle = q.trim().toLowerCase();
  const visibleThreads = threads.filter((t) => !needle || peerOf(t).name.toLowerCase().includes(needle));
  const visibleCases = caseConvs.filter(
    (c) => !needle || c.patient.toLowerCase().includes(needle) || (labCards[c.labId]?.name ?? "").toLowerCase().includes(needle),
  );
  const dmUnread = threads.reduce((n, t) => n + unreadFor(t, uid), 0);
  const selected = !!openThreadId || !!openCase;
  const openPeerId = openThreadId ? (openThreadId.split("_").find((p) => p !== uid) ?? "") : "";
  const openThread = threads.find((t) => t.id === openThreadId);
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <MobileShell wide hideBottomNav>
      <div className="flex h-svh flex-col lg:mx-auto lg:h-[calc(100svh-4rem)] lg:w-full lg:max-w-7xl">
        <div className={cn(selected && "hidden md:block")}>
          <TopBar title={ar ? "الرسائل" : "Messages"} showBack wide maxW="7xl" />
        </div>

        <div className="flex flex-1 overflow-hidden md:border-t md:border-slate-100">
          {/* List */}
          <aside className={cn("flex w-full shrink-0 flex-col bg-white md:w-[340px] md:border-e md:border-slate-100 lg:w-[380px]", selected && "hidden md:flex")}>
            <div className="space-y-3 p-3">
              <label className="flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-[#2563EB] focus-within:bg-white">
                <Search className="size-4 text-slate-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={ar ? "ابحث عن محادثة…" : "Search conversations…"}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </label>
              {isDentist && (
                <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
                  {(
                    [
                      ["dm", ar ? "المحادثات" : "Chats", dmUnread],
                      ["cases", ar ? "محادثات الحالات" : "Case chats", 0],
                    ] as const
                  ).map(([id, label, n]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={cn(
                        "flex h-9 items-center justify-center gap-1.5 rounded-xl text-xs font-bold",
                        tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500",
                      )}
                    >
                      {label} <CountBadge n={n} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pb-6">
              {tab === "dm" || !isDentist ? (
                loading ? (
                  <div className="flex justify-center py-16">
                    <Loader2 className="size-6 animate-spin text-slate-300" />
                  </div>
                ) : visibleThreads.length === 0 ? (
                  <EmptyState ar={ar} isDentist={isDentist} searching={!!needle} />
                ) : (
                  visibleThreads.map((t) => {
                    const p = peerOf(t);
                    const n = unreadFor(t, uid);
                    const active = t.id === openThreadId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setOpenCase(null);
                          setOpenThreadId(t.id);
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-slate-50",
                          active && "bg-blue-50/70 hover:bg-blue-50",
                        )}
                      >
                        <Avatar photo={p.photo} name={p.name} type={p.type} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className={cn("min-w-0 flex-1 truncate text-[15px] text-slate-900", n ? "font-extrabold" : "font-bold")}>{p.name}</span>
                            <span className={cn("shrink-0 text-[11px]", n ? "font-bold text-blue-600" : "text-slate-400")}>
                              {dmListTime(t.lastMessageAt, ar)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center gap-2">
                            <span className={cn("min-w-0 flex-1 truncate text-[13px]", n ? "font-semibold text-slate-700" : "text-slate-500")}>
                              {t.lastSenderId === uid ? (ar ? "أنت: " : "You: ") : ""}
                              {t.lastMessage}
                            </span>
                            {isBlocked(t) ? <Ban className="size-3.5 text-slate-400" /> : <CountBadge n={n} />}
                          </span>
                          {p.type && (
                            <span className="mt-1 block text-[10px] font-semibold" style={{ color: ACCOUNT_TYPE_COLOR[p.type] ?? "#64748B" }}>
                              {ACCOUNT_TYPE_LABEL[p.type]?.[ar ? "ar" : "en"]}
                            </span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )
              ) : visibleCases.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-16 text-center">
                  <FlaskConical className="size-9 text-slate-300" />
                  <p className="mt-3 font-bold text-slate-600">{ar ? "لا توجد محادثات حالات" : "No case chats"}</p>
                  <p className="mt-1 text-xs text-slate-400">{ar ? "عند إرسال حالة لمختبر تظهر محادثتها هنا." : "Cases you send to a lab show up here."}</p>
                </div>
              ) : (
                visibleCases.map((c) => (
                  <CaseRow
                    key={c.caseId}
                    c={c}
                    uid={uid}
                    labName={labCards[c.labId]?.name}
                    ar={ar}
                    active={openCase?.caseId === c.caseId}
                    onClick={() => {
                      setOpenThreadId("");
                      setOpenCase(c);
                    }}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Conversation */}
          <section className={cn("flex min-w-0 flex-1 flex-col bg-[#F4F7FB]", !selected && "hidden md:flex")}>
            {openThreadId && uid ? (
              <ChatPane
                key={openThreadId}
                ar={ar}
                uid={uid}
                threadId={openThreadId}
                peerId={openPeerId}
                fallbackName={openThread?.names?.[openPeerId] || search.withName || ""}
                fallbackPhoto={openThread?.photos?.[openPeerId] || ""}
                myName={myName}
                myPhoto={myPhoto}
                BackIcon={BackIcon}
                onBack={close}
              />
            ) : openCase && uid ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-3 py-2.5 lg:px-6">
                  <button type="button" onClick={close} className="flex size-10 items-center justify-center rounded-full bg-slate-50 md:hidden">
                    <BackIcon className="size-5" />
                  </button>
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                    <FlaskConical className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-bold text-slate-900">{openCase.patient}</span>
                    <span className="block truncate text-[11px] text-slate-500">
                      {labCards[openCase.labId]?.name || (ar ? "المختبر" : "Lab")} · {openCase.orderNo}
                    </span>
                  </span>
                </div>
                <div className="min-h-0 flex-1">
                  <CaseChat
                    key={openCase.caseId}
                    variant="full"
                    labId={openCase.labId}
                    caseId={openCase.caseId}
                    currentUserId={uid}
                    senderRole="doctor"
                    senderName={myName}
                    counterpartId={openCase.labId}
                    context={{ patient: openCase.patient, orderNumber: openCase.orderNo, workType: openCase.workType, counterpartName: labCards[openCase.labId]?.name }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <span className="flex size-20 items-center justify-center rounded-3xl bg-white text-[#2563EB] shadow-sm">
                  <MessageCircle className="size-9" strokeWidth={1.8} />
                </span>
                <p className="mt-4 font-bold text-slate-600">{ar ? "اختر محادثة" : "Pick a conversation"}</p>
                <p className="mt-1 text-xs text-slate-400">{ar ? "رسائلك مع الحسابات الأخرى تظهر هنا" : "Your conversations appear here"}</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </MobileShell>
  );
}

function CaseRow({
  c,
  uid,
  labName,
  ar,
  active,
  onClick,
}: {
  c: CaseConv;
  uid?: string;
  labName?: string;
  ar: boolean;
  active: boolean;
  onClick: () => void;
}) {
  const n = useCaseUnreadCount(c.labId, c.caseId, uid);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex w-full items-center gap-3 px-4 py-3 text-start transition hover:bg-slate-50", active && "bg-violet-50/60")}
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <FlaskConical className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate text-[15px] text-slate-900", n ? "font-extrabold" : "font-bold")}>{c.patient}</span>
        <span className="mt-0.5 block truncate text-[13px] text-slate-500">
          {labName || (ar ? "المختبر" : "Lab")} · {c.orderNo}
        </span>
      </span>
      <CountBadge n={n} />
    </button>
  );
}

function EmptyState({ ar, isDentist, searching }: { ar: boolean; isDentist: boolean; searching: boolean }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <span className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-sky-50 text-sky-500">
        <MessageCircle className="size-9" strokeWidth={1.8} />
      </span>
      <p className="font-bold text-slate-600">{searching ? (ar ? "لا نتائج" : "No results") : ar ? "لا توجد محادثات بعد" : "No conversations yet"}</p>
      {!searching && (
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-400">
          {isDentist
            ? ar
              ? "افتح صفحة أي مورد أو مختبر أو شركة زرعات واضغط «مراسلة»."
              : "Open any supplier, lab or implant company and click “Message”."
            : ar
              ? "ستظهر هنا رسائل الأطباء. ويمكنك مراسلة أي طبيب من صفحة الأطباء أو من طلباته."
              : "Dentists’ messages appear here. Message a dentist from Doctors or their orders."}
        </p>
      )}
    </div>
  );
}

/* ── Conversation ──────────────────────────────────────────── */

type Pending = { id: string; text: string; localUrl?: string; failed?: boolean };

function ChatPane({
  ar,
  uid,
  threadId,
  peerId,
  fallbackName,
  fallbackPhoto,
  myName,
  myPhoto,
  BackIcon,
  onBack,
}: {
  ar: boolean;
  uid: string;
  threadId: string;
  peerId: string;
  fallbackName: string;
  fallbackPhoto: string;
  myName: string;
  myPhoto: string;
  BackIcon: typeof ChevronLeft;
  onBack: () => void;
}) {
  const thread = useDmThread(threadId);
  const { messages, loading } = useDmMessages(threadId);
  const card = useAccountCard(peerId);
  const peer: Peer = {
    id: peerId,
    name: card?.name || fallbackName || (ar ? "مستخدم" : "User"),
    photo: card?.photoURL || fallbackPhoto,
    type: card?.accountType ?? "",
  };
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [busyImage, setBusyImage] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewer, setViewer] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const blockedByMe = !!thread?.blockedBy?.includes(uid);
  const blocked = isBlocked(thread);

  useEffect(() => {
    markDmThreadRead(thread, uid);
  }, [thread, uid, messages.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pending.length]);

  const send = async (opts: { text?: string; file?: File }) => {
    const body = (opts.text ?? "").trim();
    if (!body && !opts.file) return;
    const id = `p_${Date.now()}`;
    setPending((p) => [...p, { id, text: body, localUrl: opts.file ? URL.createObjectURL(opts.file) : undefined }]);
    try {
      const image = opts.file ? await uploadDmImage(threadId, opts.file) : undefined;
      await sendDmMessage({
        senderId: uid,
        recipientId: peerId,
        senderName: myName,
        recipientName: peer.name,
        senderPhoto: myPhoto,
        recipientPhoto: peer.photo,
        text: body,
        image,
      });
      setPending((p) => p.filter((x) => x.id !== id));
    } catch (e) {
      setPending((p) => p.map((x) => (x.id === id ? { ...x, failed: true } : x)));
      const msg = (e as Error)?.message;
      toast.error(
        msg === "blocked"
          ? ar
            ? "لا يمكن الإرسال في هذه المحادثة"
            : "You can’t send in this conversation"
          : msg === "too-large"
            ? ar
              ? "الصورة أكبر من 10 ميغابايت"
              : "Image is over 10 MB"
            : ar
              ? "لم تُرسل — اضغط عليها لإعادة المحاولة"
              : "Not sent — click it to retry",
      );
    }
  };

  const submit = () => {
    const t = text;
    if (!t.trim()) return;
    setText("");
    void send({ text: t });
  };

  const retry = (p: Pending) => {
    setPending((list) => list.filter((x) => x.id !== p.id));
    if (!p.localUrl) void send({ text: p.text });
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusyImage(true);
    await send({ file: f });
    setBusyImage(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleBlock = () => {
    setMenuOpen(false);
    setDmBlocked(threadId, uid, !blockedByMe)
      .then(() => toast.success(blockedByMe ? (ar ? "تم إلغاء الحظر" : "Unblocked") : ar ? "تم حظر المحادثة" : "Blocked"))
      .catch(() => toast.error(ar ? "تعذّر التنفيذ" : "Failed"));
  };
  const report = () => {
    setMenuOpen(false);
    if (!window.confirm(ar ? "إبلاغ الإدارة عن هذه المحادثة؟" : "Report this conversation?")) return;
    reportDmThread({ threadId, reporterId: uid, reportedId: peerId, reason: "reported-from-web" })
      .then(() => toast.success(ar ? "وصل البلاغ للإدارة، شكراً لك" : "Reported, thank you"))
      .catch(() => toast.error(ar ? "تعذّر الإبلاغ" : "Failed"));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="relative flex items-center gap-3 border-b border-slate-100 bg-white px-3 py-2.5 lg:px-6">
        <button type="button" onClick={onBack} className="flex size-10 items-center justify-center rounded-full bg-slate-50 md:hidden">
          <BackIcon className="size-5" />
        </button>
        <Link to="/profile/$accountId" params={{ accountId: peerId }} className="flex min-w-0 flex-1 items-center gap-2.5">
          <Avatar photo={peer.photo} name={peer.name} type={peer.type} size={40} />
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold text-slate-900">{peer.name}</span>
            {peer.type && <span className="block truncate text-[11px] text-slate-500">{ACCOUNT_TYPE_LABEL[peer.type]?.[ar ? "ar" : "en"]}</span>}
          </span>
        </Link>
        <button type="button" onClick={() => setMenuOpen((v) => !v)} className="flex size-10 items-center justify-center rounded-full hover:bg-slate-50">
          <MoreVertical className="size-5 text-slate-600" />
        </button>
        {menuOpen && (
          <>
            <button type="button" aria-label="close" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
            <div className="absolute end-3 top-14 z-20 w-52 overflow-hidden rounded-2xl border border-slate-100 bg-white py-1 shadow-xl">
              <Link
                to="/profile/$accountId"
                params={{ accountId: peerId }}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <UserRound className="size-4" /> {ar ? "عرض الملف" : "View profile"}
              </Link>
              {thread && (
                <>
                  <button type="button" onClick={toggleBlock} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                    <Ban className="size-4" /> {blockedByMe ? (ar ? "إلغاء الحظر" : "Unblock") : ar ? "حظر المحادثة" : "Block"}
                  </button>
                  <button type="button" onClick={report} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                    <Flag className="size-4" /> {ar ? "إبلاغ الإدارة" : "Report"}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:px-10">
        <div className="mx-auto max-w-3xl space-y-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-6 animate-spin text-slate-300" />
            </div>
          ) : messages.length === 0 && pending.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Avatar photo={peer.photo} name={peer.name} type={peer.type} size={72} />
              <p className="mt-3 text-base font-bold text-slate-800">{peer.name}</p>
              <p className="mt-1 text-xs text-slate-500">{ar ? "ابدأ المحادثة بكتابة رسالة" : "Say hello to start the conversation"}</p>
            </div>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
              const mine = m.senderId === uid;
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">{dmDayLabel(m.createdAt, ar)}</span>
                    </div>
                  )}
                  <Bubble
                    m={m}
                    mine={mine}
                    grouped={!newDay && prev?.senderId === m.senderId}
                    seen={mine && seenByOther(thread, uid, m)}
                    ar={ar}
                    onImage={setViewer}
                    onDelete={
                      mine && !m.deleted
                        ? () => {
                            if (window.confirm(ar ? "حذف الرسالة عند الطرفين؟" : "Delete for both sides?")) void deleteDmMessage(threadId, m.id).catch(() => {});
                          }
                        : undefined
                    }
                  />
                </div>
              );
            })
          )}
          {pending.map((p) => (
            <div key={p.id} className="flex justify-end">
              <button
                type="button"
                onClick={p.failed ? () => retry(p) : undefined}
                className={cn("max-w-[78%] rounded-2xl rounded-ee-md px-3.5 py-2 text-start", p.failed ? "bg-rose-100" : "bg-[#93C5FD]")}
              >
                {p.localUrl && <img src={p.localUrl} alt="" className="mb-1 max-h-60 rounded-xl" />}
                {p.text && <span className={cn("block whitespace-pre-wrap text-[15px] leading-6", p.failed ? "text-rose-800" : "text-white")}>{p.text}</span>}
                <span className="mt-0.5 flex items-center justify-end gap-1">
                  {p.failed ? (
                    <span className="text-[10px] font-bold text-rose-700">{ar ? "لم تُرسل — اضغط لإعادة المحاولة" : "Not sent — click to retry"}</span>
                  ) : (
                    <Clock3 className="size-3 text-white/85" />
                  )}
                </span>
              </button>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input */}
      {blocked ? (
        <div className="flex items-center gap-3 border-t border-slate-100 bg-white px-4 py-4">
          <Ban className="size-5 text-slate-400" />
          <p className="flex-1 text-xs text-slate-500">
            {blockedByMe ? (ar ? "حظرت هذه المحادثة. لن تصلك رسائل منها." : "You blocked this conversation.") : ar ? "لا يمكن الإرسال في هذه المحادثة." : "You can’t send messages here."}
          </p>
          {blockedByMe && (
            <button type="button" onClick={toggleBlock} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
              {ar ? "إلغاء الحظر" : "Unblock"}
            </button>
          )}
        </div>
      ) : (
        <div className="border-t border-slate-100 bg-white px-3 py-2.5 lg:px-10">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busyImage}
              aria-label={ar ? "إرسال صورة" : "Send a photo"}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100"
            >
              {busyImage ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            </button>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={1}
              maxLength={DM_MAX_LENGTH}
              placeholder={ar ? "اكتب رسالتك…" : "Type a message…"}
              className="max-h-36 min-h-11 flex-1 resize-none rounded-3xl bg-slate-50 px-4 py-2.5 text-[15px] leading-6 outline-none focus:bg-slate-100"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!text.trim()}
              aria-label={ar ? "إرسال" : "Send"}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-white transition disabled:bg-slate-300"
            >
              <Send className={cn("size-5", ar && "-scale-x-100")} />
            </button>
          </div>
        </div>
      )}

      {viewer && (
        <button type="button" onClick={() => setViewer("")} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4">
          <img src={viewer} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
          <span className="absolute end-5 top-5 flex size-10 items-center justify-center rounded-full bg-white/15 text-white">
            <X className="size-5" />
          </span>
        </button>
      )}
    </div>
  );
}

function Bubble({
  m,
  mine,
  grouped,
  seen,
  ar,
  onImage,
  onDelete,
}: {
  m: DmMessage;
  mine: boolean;
  grouped: boolean;
  seen: boolean;
  ar: boolean;
  onImage: (url: string) => void;
  onDelete?: () => void;
}) {
  const url = useDmImageUrl(m.deleted ? undefined : m.image?.path);
  const ratio = m.image?.width && m.image?.height ? m.image.width / m.image.height : 4 / 3;
  return (
    <div className={cn("group flex items-center gap-1.5", mine ? "justify-end" : "justify-start", !grouped && "pt-1.5")}>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={ar ? "حذف" : "Delete"}
          className="order-first flex size-7 items-center justify-center rounded-full text-slate-300 opacity-0 transition hover:bg-white hover:text-rose-500 group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2 md:max-w-[65%]",
          mine ? "rounded-ee-md bg-[#2563EB] text-white" : "rounded-es-md border border-slate-100 bg-white text-slate-800",
        )}
      >
        {m.deleted ? (
          <p className={cn("text-[13px] italic", mine ? "text-white/75" : "text-slate-400")}>{ar ? "تم حذف هذه الرسالة" : "This message was deleted"}</p>
        ) : (
          <>
            {m.image && (
              <button type="button" onClick={() => url && onImage(url)} className="mb-1 block overflow-hidden rounded-xl bg-black/10">
                {url ? (
                  <img src={url} alt="" className="block w-60 object-cover" style={{ aspectRatio: String(ratio), maxHeight: 320 }} />
                ) : (
                  <span className="flex w-60 items-center justify-center" style={{ aspectRatio: String(ratio) }}>
                    <Loader2 className="size-5 animate-spin opacity-70" />
                  </span>
                )}
              </button>
            )}
            {m.text && <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{m.text}</p>}
          </>
        )}
        <span className="mt-0.5 flex items-center justify-end gap-1">
          <span className={cn("text-[10px]", mine ? "text-white/70" : "text-slate-400")}>{dmTime(m.createdAt, ar)}</span>
          {mine && !m.deleted && (seen ? <CheckCheck className="size-3.5 text-blue-200" /> : <Check className="size-3.5 text-white/75" />)}
        </span>
      </div>
    </div>
  );
}
