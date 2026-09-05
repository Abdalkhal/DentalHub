import { useEffect, useRef, useState } from "react";
import { Send, Image as ImageIcon, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CaseImage } from "@/components/CaseImage";
import { toast } from "sonner";
import {
  useCaseMessages,
  sendCaseMessage,
  uploadChatAttachment,
  type CaseMessageSenderRole,
} from "@/lib/caseMessages";

type Props = {
  labId: string;
  caseId: string;
  currentUserId: string;
  senderRole: CaseMessageSenderRole;
  senderName: string;
};

function formatTime(ts: { toMillis?: () => number } | null | undefined): string {
  if (!ts || typeof ts.toMillis !== "function") return "";
  const d = new Date(ts.toMillis());
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function CaseChat({ labId, caseId, currentUserId, senderRole, senderName }: Props) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { messages, loading, error } = useCaseMessages(labId, caseId);

  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handlePickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const paths: string[] = [];
    for (const file of Array.from(files)) {
      try {
        paths.push(await uploadChatAttachment(labId, caseId, file));
      } catch (err) {
        console.error("Chat attachment upload failed:", err);
      }
    }
    setAttachments((prev) => [...prev, ...paths]);
    setUploading(false);
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text && attachments.length === 0) return;
    setIsSending(true);
    setSendError(null);
    try {
      await sendCaseMessage(labId, caseId, {
        senderId: currentUserId,
        senderRole,
        senderName,
        text,
        attachments,
      });
      setDraft("");
      setAttachments([]);
    } catch (err) {
      console.error("Failed to send case message:", err);
      const msg = err instanceof Error ? err.message : String(err);
      setSendError(msg);
      toast.error(ar ? "فشل إرسال الرسالة" : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[320px] max-h-[420px] rounded-2xl border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-600">
          {ar ? "التواصل والتحديثات" : "Case Chat"}
        </p>
        {loading && <Loader2 className="size-3.5 text-slate-400 animate-spin" />}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {error && (
          <p className="text-center text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-2">
            {error}
          </p>
        )}
        {messages.length === 0 && !loading && !error ? (
          <p className="text-center text-xs text-slate-400 py-8">
            {ar ? "لا توجد رسائل بعد — ابدأ المحادثة" : "No messages yet — start the conversation"}
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={cn("flex gap-2", mine ? "justify-end" : "justify-start")}>
                {!mine && (
                  <span className="size-8 shrink-0 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[11px] font-bold">
                    {(m.senderName || "?").charAt(0)}
                  </span>
                )}
                <div className={cn("max-w-[75%] space-y-1", mine && "text-end")}>
                  <div className={cn("flex items-center gap-2", mine && "justify-end")}>
                    <span className="text-[10px] font-bold text-slate-500">{mine ? (ar ? "أنت" : "You") : m.senderName}</span>
                    <span className="text-[9px] text-slate-400" dir="ltr">{formatTime(m.createdAt)}</span>
                  </div>
                  <div
                    className={cn(
                      "inline-block px-3 py-2 rounded-2xl text-sm text-slate-700 whitespace-pre-wrap break-words",
                      mine ? "bg-sky-600 text-white rounded-br-sm" : "bg-slate-100 rounded-bl-sm",
                    )}
                  >
                    {m.text}
                  </div>
                  {m.attachments && m.attachments.length > 0 && (
                    <div className={cn("flex flex-wrap gap-1.5", mine && "justify-end")}>
                      {m.attachments.map((att, i) => (
                        <CaseImage
                          key={i}
                          path={att}
                          alt="attachment"
                          className="size-16 rounded-xl object-cover border border-slate-200"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-3 pb-1 flex flex-wrap gap-1.5">
          {attachments.map((att, i) => (
            <div key={i} className="relative">
              <CaseImage
                path={att}
                alt="preview"
                className="size-14 rounded-lg object-cover border border-slate-200"
              />
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, x) => x !== i))}
                className="absolute -top-1 -end-1 size-4 rounded-full bg-slate-700 text-white text-[9px] flex items-center justify-center"
                aria-label="remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {sendError && (
        <div className="px-3 pb-1">
          <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1.5">
            {sendError}
          </p>
        </div>
      )}

      {/* Composer */}
      <div className="px-3 py-2.5 border-t border-slate-100 flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            handlePickFiles(e.target.files);
            e.target.value = "";
          }}
        />        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="size-9 shrink-0 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 flex items-center justify-center disabled:opacity-50"
          title={ar ? "إرفاق صورة" : "Attach photo"}
        >
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={ar ? "اكتب رسالة…" : "Type a message…"}
          className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={isSending || (!draft.trim() && attachments.length === 0)}
          className="size-9 shrink-0 rounded-xl bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center disabled:opacity-40"
          title={ar ? "إرسال" : "Send"}
        >
          {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
    </div>
  );
}
