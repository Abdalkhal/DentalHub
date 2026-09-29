import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, MessageCircle, Send } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { db } from "@/integrations/firebase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useSession, useUserRole } from "@/lib/useAuth";
import { useOrders } from "@/lib/ordersStore";
import { useDentistCases, filterLegacyOrders } from "@/lib/caseTracking";
import {
  useCaseMessages,
  sendCaseMessage,
  markCaseRead,
  useCaseUnreadCount,
  type CaseMessage,
} from "@/lib/caseMessages";
import {
  useDmThreads,
  useDmMessages,
  sendDmMessage,
  markDmThreadRead,
  useDmUnreadCount,
  dmThreadId,
  type DmThread,
} from "@/lib/directMessages";

const messagesSearchSchema = z.object({
  with: z.string().optional().catch(undefined),
  withName: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/messages")({
  validateSearch: messagesSearchSchema,
  component: Messages,
});

type Conv = { labId: string; caseId: string; patient: string; orderNo: string };
type ChatBubble = { id: string; senderId: string; text: string; createdAt: CaseMessage["createdAt"] };

function timeLabel(d?: CaseMessage["createdAt"] | null): string {
  if (!d || !d.toDate) return "";
  return d.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function CountBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="min-w-5 h-5 px-1 shrink-0 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function CaseUnread({ labId, caseId, uid }: { labId: string; caseId: string; uid?: string }) {
  return <CountBadge count={useCaseUnreadCount(labId, caseId, uid)} />;
}

function DmUnread({ threadId, uid }: { threadId: string; uid?: string }) {
  return <CountBadge count={useDmUnreadCount(threadId, uid)} />;
}

function Avatar({ photo, label, size = "size-11" }: { photo?: string; label: string; size?: string }) {
  if (photo) return <img src={photo} alt="" className={cn(size, "shrink-0 rounded-2xl object-cover bg-slate-100")} />;
  return (
    <span className={cn(size, "shrink-0 rounded-2xl bg-[#2563EB] text-white font-display font-extrabold text-lg flex items-center justify-center")}>
      {label.charAt(0) || "؟"}
    </span>
  );
}

function Messages() {
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const { user } = useSession();
  const { role } = useUserRole();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const localOrders = useOrders();
  const { cases: remoteCases } = useDentistCases(user?.uid ?? "");
  const doctorName = [role?.name, role?.surname].filter(Boolean).join(" ").trim();
  const myName = doctorName || user?.displayName || user?.email || (ar ? "أنا" : "Me");
  const myPhoto = role?.photoURL || "";

  const [selectedCase, setSelectedCase] = useState<Conv | null>(null);
  const [selectedDm, setSelectedDm] = useState<DmThread | null>(null);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { threads: dmThreads } = useDmThreads(user?.uid);

  const { data: withAccount } = useQuery({
    queryKey: ["dm-with-account", search.with],
    queryFn: async () => {
      const snap = await getDoc(doc(db, "public_profiles", search.with ?? ""));
      if (!snap.exists()) return null;
      const d = snap.data() as Record<string, unknown>;
      return {
        name: String(d.name || d.surname || ""),
        photoURL: typeof d.photoURL === "string" ? d.photoURL : "",
      };
    },
    enabled: !!search.with,
    staleTime: 60_000,
  });

  // Arriving via ?with=<accountId> (profile "Message" button, a message
  // notification, …): open that thread, or a not-yet-written one — the thread
  // doc itself is only created when the first message is sent.
  useEffect(() => {
    if (!search.with || !user?.uid || search.with === user.uid) return;
    const threadId = dmThreadId(user.uid, search.with);
    const existing = dmThreads.find((t) => t.id === threadId);
    if (existing) {
      setSelectedDm(existing);
      return;
    }
    setSelectedDm({
      id: threadId,
      participants: [user.uid, search.with].sort(),
      names: { [search.with]: withAccount?.name || search.withName || (ar ? "مستخدم" : "User"), [user.uid]: myName },
      photos: { [search.with]: withAccount?.photoURL || "", [user.uid]: myPhoto },
      lastMessage: "",
      lastMessageAt: null,
      lastSenderId: "",
    });
    // dmThreads/myName/myPhoto left out so an open synthesized thread isn't
    // reset every time they update; withAccount is in so the real name/photo
    // replace the fallback once fetched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.with, user?.uid, withAccount]);

  const convs = useMemo<Conv[]>(() => {
    const remote = remoteCases.map((c) => ({
      labId: c.labId || (c.order.targetLabId as string | undefined) || "",
      caseId: c.order.id,
      patient: c.order.patient || (ar ? "مريض" : "Patient"),
      orderNo: c.order.orderNumber || c.order.id.slice(0, 6),
    }));
    const ids = new Set(remote.map((r) => r.caseId));
    const legacy = filterLegacyOrders(localOrders, ids, doctorName).map((o) => ({
      labId: (o.targetLabId as string | undefined) || "",
      caseId: o.id,
      patient: o.patient || (ar ? "مريض" : "Patient"),
      orderNo: o.orderNumber || o.id.slice(0, 6),
    }));
    return Array.from(new Map([...remote, ...legacy].map((c) => [c.caseId, c])).values());
  }, [remoteCases, localOrders, doctorName, ar]);

  const { data: labNames = {} } = useQuery({
    queryKey: ["lab-names"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "public_profiles"));
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const u = d.data() as Record<string, unknown>;
        if (u.accountType === "lab" && u.name) map[String(u.userId)] = String(u.name);
      });
      return map;
    },
    staleTime: 120_000,
  });

  const { messages: caseMessages } = useCaseMessages(selectedCase?.labId ?? "", selectedCase?.caseId ?? "");
  const { messages: dmMessages } = useDmMessages(selectedDm?.id ?? "");

  const otherId = selectedDm ? selectedDm.participants.find((p) => p !== user?.uid) ?? "" : "";
  const otherName = selectedDm ? selectedDm.names[otherId] || (ar ? "مستخدم" : "User") : "";
  const otherPhoto = selectedDm ? selectedDm.photos[otherId] || "" : "";

  const bubbles: ChatBubble[] = selectedCase
    ? caseMessages.map((m) => ({ id: m.id, senderId: m.senderId, text: m.text, createdAt: m.createdAt }))
    : dmMessages.map((m) => ({ id: m.id, senderId: m.senderId, text: m.text, createdAt: m.createdAt }));

  useEffect(() => {
    if (selectedCase && user?.uid) markCaseRead(selectedCase.caseId, user.uid);
  }, [selectedCase, caseMessages.length, user?.uid]);

  useEffect(() => {
    if (selectedDm && user?.uid) markDmThreadRead(selectedDm.id, user.uid);
  }, [selectedDm, dmMessages.length, user?.uid]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [selectedCase, selectedDm, bubbles.length]);

  const closeChat = () => {
    setSelectedCase(null);
    setSelectedDm(null);
    if (search.with) navigate({ to: "/messages", search: {}, replace: true });
  };

  const send = async () => {
    const t = text.trim();
    if (!t || !user) return;
    if (!selectedCase && !selectedDm) return;
    setText("");
    try {
      if (selectedCase) {
        await sendCaseMessage(selectedCase.labId, selectedCase.caseId, {
          senderId: user.uid,
          senderRole: "doctor",
          senderName: myName,
          text: t,
        });
      } else if (selectedDm) {
        await sendDmMessage({
          senderId: user.uid,
          recipientId: otherId,
          senderName: myName,
          recipientName: otherName,
          senderPhoto: myPhoto,
          recipientPhoto: otherPhoto,
          text: t,
        });
      }
    } catch {
      setText(t);
      toast.error(ar ? "تعذر الإرسال" : "Could not send");
    }
  };

  const selected = selectedCase || selectedDm;
  const empty = convs.length === 0 && dmThreads.length === 0;
  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const headerName = selectedCase ? selectedCase.patient : otherName;
  const headerSubtitle = selectedCase ? labNames[selectedCase.labId] || (ar ? "المختبر" : "Lab") : "";

  return (
    <MobileShell wide hideBottomNav>
      <div className="flex h-svh flex-col lg:h-[calc(100svh-4rem)] lg:max-w-7xl lg:mx-auto lg:w-full">
        <TopBar title={ar ? "الرسائل" : "Messages"} showBack wide maxW="7xl" />

        <div className="flex flex-1 overflow-hidden">
          {/* Conversation list — hidden on phones while a chat is open */}
          <div className={cn("flex flex-col w-full md:w-80 lg:w-96 md:border-e md:border-border shrink-0", selected && "hidden md:flex")}>
            <div className="flex-1 overflow-y-auto px-3 py-2">
              {empty ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <span className="mb-4 size-20 rounded-3xl bg-sky-100 flex items-center justify-center">
                    <MessageCircle className="size-9 text-blue-500" strokeWidth={1.8} />
                  </span>
                  <p className="font-bold text-slate-500">{ar ? "لا توجد محادثات" : "No conversations"}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {ar ? "ابدأ محادثة من صفحة أي حساب" : "Start a chat from any account’s profile"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {dmThreads.map((t) => {
                    const oid = t.participants.find((p) => p !== user?.uid) ?? "";
                    const name = t.names[oid] || (ar ? "مستخدم" : "User");
                    const active = selectedDm?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedCase(null);
                          setSelectedDm(t);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-start transition-colors",
                          active ? "bg-primary-soft/60 ring-1 ring-primary/20" : "hover:bg-accent",
                        )}
                      >
                        <Avatar photo={t.photos[oid]} label={name} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{name}</p>
                          {t.lastMessage && <p className="mt-0.5 truncate text-xs text-slate-400">{t.lastMessage}</p>}
                        </div>
                        <DmUnread threadId={t.id} uid={user?.uid} />
                      </button>
                    );
                  })}

                  {convs.length > 0 && (
                    <>
                      <p className="px-3 pt-4 pb-1 text-xs font-bold text-slate-400">
                        {ar ? "محادثات حالات المختبر" : "Lab case conversations"}
                      </p>
                      {convs.map((c) => {
                        const active = selectedCase?.caseId === c.caseId;
                        return (
                          <button
                            key={c.caseId}
                            onClick={() => {
                              setSelectedDm(null);
                              setSelectedCase(c);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-start transition-colors",
                              active ? "bg-primary-soft/60 ring-1 ring-primary/20" : "hover:bg-accent",
                            )}
                          >
                            <Avatar label={c.patient} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-slate-800">{c.patient}</p>
                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {labNames[c.labId] || (ar ? "المختبر" : "Lab")} · {c.orderNo}
                              </p>
                            </div>
                            <CaseUnread labId={c.labId} caseId={c.caseId} uid={user?.uid} />
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat panel */}
          <div className={cn("flex flex-col flex-1 min-w-0", !selected && "hidden md:flex")}>
            {selected ? (
              <>
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/60 lg:px-8 lg:py-4">
                  <button
                    onClick={closeChat}
                    className="md:hidden size-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent"
                  >
                    <BackIcon className="size-4" />
                  </button>
                  <Avatar photo={selectedDm ? otherPhoto : undefined} label={headerName} size="size-10" />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm truncate">{headerName}</p>
                    {headerSubtitle && <p className="text-[11px] text-muted-foreground">{headerSubtitle}</p>}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 lg:px-8 lg:py-5">
                  {bubbles.length === 0 && (
                    <p className="mt-10 text-center text-xs text-slate-400">
                      {ar ? "ابدأ المحادثة…" : "Start the conversation…"}
                    </p>
                  )}
                  {bubbles.map((m) => {
                    const isMe = m.senderId === user?.uid;
                    return (
                      <div key={m.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[85%] md:max-w-[70%] lg:max-w-[52%] rounded-2xl px-4 py-2.5 shadow-sm",
                            isMe ? "bg-[#2563EB] text-white rounded-br-md" : "bg-card border border-border rounded-bl-md text-slate-800",
                          )}
                        >
                          {m.text && <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>}
                          <p className={cn("mt-0.5 text-[10px]", isMe ? "text-end text-white/60" : "text-start text-slate-400")}>
                            {timeLabel(m.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={endRef} />
                </div>

                <div className="border-t border-border bg-card/80 px-3 py-3">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={1}
                      placeholder={ar ? "اكتب رسالتك…" : "Type a message…"}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary resize-none max-h-32"
                      style={{ direction: dir }}
                    />
                    <button
                      onClick={send}
                      disabled={!text.trim()}
                      className="size-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 hover:bg-[#1D4ED8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="size-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center px-6">
                  <div className="size-20 rounded-3xl bg-primary-soft text-primary mx-auto flex items-center justify-center mb-4">
                    <Send className="size-9" />
                  </div>
                  <p className="font-display font-bold text-foreground">{ar ? "اختر محادثة" : "Select a conversation"}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ar ? "اختر محادثة من القائمة لعرض الرسائل" : "Pick a conversation from the list to view messages"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
