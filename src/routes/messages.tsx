import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  Send,
  Paperclip,
  FileText,
  Image,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
} from "lucide-react";

type Attachment = { name: string; type: "image" | "pdf" };
type Message = {
  id: string;
  senderId: "me" | string;
  text: string;
  timestamp: Date;
  attachment?: Attachment;
};
type Conversation = {
  id: string;
  name: string;
  nameAr: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: Message[];
};

const CONVERSATIONS: Conversation[] = [];

function formatTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `منذ ${days} يوم`;
  return d.toLocaleDateString("ar-IQ", { day: "numeric", month: "short" });
}

export const Route = createFileRoute("/messages")({
  component: Messages,
});

function Messages() {
  const { lang, dir } = useI18n();
  const ar = lang === "ar";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [convs, setConvs] = useState(CONVERSATIONS);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const selected = convs.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedId, convs]);

  function sendMessage() {
    if (!input.trim() || !selected) return;
    const msg: Message = {
      id: `m_${Date.now()}`,
      senderId: "me",
      text: input.trim(),
      timestamp: new Date(),
    };
    setConvs((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              lastMessage: input.trim(),
              lastTime: formatTime(new Date()),
              unread: 0,
              messages: [...c.messages, msg],
            }
          : c,
      ),
    );
    setInput("");
  }

  function handleAttachment(files: FileList | null) {
    if (!files || !files[0] || !selected) return;
    const file = files[0];
    const isImage = file.type.startsWith("image/");
    const msg: Message = {
      id: `m_${Date.now()}`,
      senderId: "me",
      text: "",
      timestamp: new Date(),
      attachment: { name: file.name, type: isImage ? "image" : "pdf" },
    };
    setConvs((prev) =>
      prev.map((c) =>
        c.id === selected.id
          ? {
              ...c,
              lastMessage: file.name,
              lastTime: formatTime(new Date()),
              unread: 0,
              messages: [...c.messages, msg],
            }
          : c,
      ),
    );
  }

  function markRead(id: string) {
    setConvs((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  const BackIcon = dir === "rtl" ? ChevronRight : ChevronLeft;

  return (
    <MobileShell hideBottomNav>
      <div className="flex h-svh flex-col">
        <TopBar title={ar ? "الرسائل" : "Messages"} />

        <div className="flex flex-1 overflow-hidden">
          {/* Conversation list — hidden on mobile when a chat is selected */}
          <div
            className={cn(
              "flex flex-col w-full md:w-80 md:border-e md:border-border shrink-0",
              selected && "hidden md:flex",
            )}
          >
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {convs.map((c) => {
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      markRead(c.id);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-start transition-colors",
                      active ? "bg-primary-soft/60 ring-1 ring-primary/20" : "hover:bg-accent",
                    )}
                  >
                    <span className="size-11 rounded-2xl bg-gradient-to-br from-primary to-blue-500 text-white font-display font-extrabold text-lg flex items-center justify-center shrink-0 shadow-sm">
                      {c.avatar}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold text-sm truncate">
                          {ar ? c.nameAr : c.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0 ms-2">
                          {c.lastTime}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {c.lastMessage}
                      </p>
                    </div>
                    {c.unread > 0 && (
                      <span className="size-5 rounded-full bg-primary text-[11px] font-bold text-white flex items-center justify-center shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chat panel */}
          <div className={cn("flex flex-col flex-1", !selected && "hidden md:flex")}>
            {selected ? (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card/60">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden size-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground hover:bg-accent"
                  >
                    <BackIcon className="size-4" />
                  </button>
                  <span className="size-10 rounded-2xl bg-gradient-to-br from-primary to-blue-500 text-white font-display font-extrabold flex items-center justify-center shrink-0 shadow-sm">
                    {selected.avatar}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm truncate">
                      {ar ? selected.nameAr : selected.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{ar ? "متصل" : "Online"}</p>
                  </div>
                  <CircleCheck className="size-4 text-emerald-500 ms-auto" />
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {selected.messages.map((msg) => {
                    const isMe = msg.senderId === "me";
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isMe ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-card border border-border rounded-bl-md",
                          )}
                          style={isMe ? { direction: "ltr" } : undefined}
                        >
                          {msg.text && (
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {msg.text}
                            </p>
                          )}
                          {msg.attachment && (
                            <div
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-3 py-2 mt-1.5 text-xs font-semibold",
                                isMe ? "bg-white/15 text-white" : "bg-muted text-foreground",
                              )}
                            >
                              {msg.attachment.type === "image" ? (
                                <Image className="size-4 shrink-0" />
                              ) : (
                                <FileText className="size-4 shrink-0" />
                              )}
                              <span className="truncate">{msg.attachment.name}</span>
                            </div>
                          )}
                          <p
                            className={cn(
                              "text-[10px] mt-1 opacity-60",
                              isMe ? "text-end" : "text-start",
                            )}
                          >
                            {formatTime(msg.timestamp)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-border bg-card/80 px-3 py-3">
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="size-10 rounded-xl bg-muted hover:bg-accent flex items-center justify-center text-muted-foreground shrink-0 transition-colors"
                    >
                      <Paperclip className="size-5" />
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        handleAttachment(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex-1 relative">
                      <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        rows={1}
                        placeholder={ar ? "اكتب رسالتك..." : "Type a message..."}
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary resize-none max-h-32"
                        style={{ direction: dir }}
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim()}
                      className="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                  <p className="font-display font-bold text-foreground">
                    {ar ? "اختر محادثة" : "Select a conversation"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {ar
                      ? "اختر محادثة من القائمة لعرض الرسائل"
                      : "Pick a conversation from the list to view messages"}
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
