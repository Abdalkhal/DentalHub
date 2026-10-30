import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Image as ImageIcon,
  Loader2,
  Mic,
  Square,
  Trash2,
  Paperclip,
  FileText,
  FileArchive,
  Box,
  Download,
  Play,
  Pause,
  X,
  CheckCheck,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CaseImage } from "@/components/CaseImage";
import { toast } from "sonner";
import {
  useCaseMessages,
  sendCaseMessage,
  uploadChatFile,
  notifyCaseMessage,
  messagePreview,
  markCaseRead,
  CHAT_FILE_MAX_MB,
  type CaseMessage,
  type CaseMessageSenderRole,
  type ChatFile,
} from "@/lib/caseMessages";
import { resolveCaseFileUrl, releaseCaseFileUrl } from "@/lib/storagePipeline";

/** What the conversation is about — shown pinned above the messages. */
export type CaseChatContext = {
  patient: string;
  orderNumber?: string;
  workType?: string;
  statusLabel?: string;
  /** The other side's display name (the lab for a doctor, the doctor for a lab). */
  counterpartName?: string;
};

type Props = {
  labId: string;
  caseId: string;
  currentUserId: string;
  senderRole: CaseMessageSenderRole;
  senderName: string;
  /** Who gets the notification: the lab owner (doctor sending) or the dentist (lab sending). */
  counterpartId?: string;
  context?: CaseChatContext;
  /** "embedded" inside a case window (fixed height) or "full" (fills its parent). */
  variant?: "embedded" | "full";
};

type Pending =
  | { kind: "image"; path: string; name: string }
  | { kind: "file"; file: ChatFile };

const toMs = (ts: CaseMessage["createdAt"]) => (ts && typeof ts.toMillis === "function" ? ts.toMillis() : Date.now());

function timeLabel(ms: number) {
  return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(ms: number, ar: boolean) {
  const d = new Date(ms);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return ar ? "اليوم" : "Today";
  if (same(d, yesterday)) return ar ? "أمس" : "Yesterday";
  return d.toLocaleDateString(ar ? "ar-IQ-u-nu-latn" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fmtSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDuration(ms?: number) {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function FileGlyph({ type, name, className }: { type: string; name: string; className?: string }) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".stl") || lower.endsWith(".ply") || lower.endsWith(".obj")) return <Box className={className} />;
  if (type.includes("zip") || lower.endsWith(".zip") || lower.endsWith(".rar")) return <FileArchive className={className} />;
  return <FileText className={className} />;
}

async function downloadPath(path: string, name: string) {
  const url = await resolveCaseFileUrl(path);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => releaseCaseFileUrl(url), 30_000);
}

function FileCard({ f, mine, ar }: { f: ChatFile; mine: boolean; ar: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        setBusy(true);
        try {
          await downloadPath(f.path, f.name);
        } catch {
          toast.error(ar ? "تعذر تنزيل الملف" : "Could not download file");
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        "flex w-64 max-w-full items-center gap-3 rounded-2xl p-2.5 text-start transition",
        mine ? "bg-white/15 hover:bg-white/25" : "bg-white hover:bg-slate-50 border border-slate-200",
      )}
    >
      <span className={cn("size-10 shrink-0 rounded-xl flex items-center justify-center", mine ? "bg-white/20" : "bg-sky-50 text-sky-600")}>
        <FileGlyph type={f.type} name={f.name} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-bold" dir="ltr">{f.name}</span>
        <span className={cn("block text-[10px]", mine ? "text-white/70" : "text-slate-400")}>
          {fmtSize(f.size) || (ar ? "ملف" : "File")}
        </span>
      </span>
      {busy ? <Loader2 className="size-4 shrink-0 animate-spin" /> : <Download className="size-4 shrink-0 opacity-80" />}
    </button>
  );
}

function VoiceNote({ f, mine }: { f: ChatFile; mine: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      if (urlRef.current) releaseCaseFileUrl(urlRef.current);
    },
    [],
  );

  const toggle = async () => {
    if (playing) {
      audioRef.current?.pause();
      return;
    }
    if (!audioRef.current) {
      setLoading(true);
      try {
        urlRef.current = await resolveCaseFileUrl(f.path);
        const audio = new Audio(urlRef.current);
        audio.ontimeupdate = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
        audio.onplay = () => setPlaying(true);
        audio.onpause = () => setPlaying(false);
        audio.onended = () => {
          setPlaying(false);
          setProgress(0);
        };
        audioRef.current = audio;
      } catch {
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    void audioRef.current.play();
  };

  return (
    <div className={cn("flex w-60 max-w-full items-center gap-2.5 rounded-2xl px-2.5 py-2", mine ? "bg-white/15" : "bg-white border border-slate-200")}>
      <button
        type="button"
        onClick={toggle}
        className={cn("size-9 shrink-0 rounded-full flex items-center justify-center", mine ? "bg-white text-sky-700" : "bg-sky-600 text-white")}
        aria-label={playing ? "pause" : "play"}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : playing ? <Pause className="size-4" /> : <Play className="size-4 ms-0.5" />}
      </button>
      <div className="flex-1">
        <div className={cn("h-1.5 rounded-full overflow-hidden", mine ? "bg-white/30" : "bg-slate-200")}>
          <div className={cn("h-full rounded-full transition-[width]", mine ? "bg-white" : "bg-sky-500")} style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      <span className={cn("text-[10px] font-semibold tabular-nums", mine ? "text-white/80" : "text-slate-500")} dir="ltr">
        {fmtDuration(f.durationMs)}
      </span>
    </div>
  );
}

/** Voice recording through the browser's MediaRecorder. */
function useRecorder() {
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 250);
    return () => clearInterval(t);
  }, [recording]);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((m) => MediaRecorder.isTypeSupported?.(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.start();
    recRef.current = rec;
    startRef.current = Date.now();
    setElapsed(0);
    setRecording(true);
  };

  /** Stops; resolves with the clip, or null when cancelled. */
  const stop = (keep: boolean) =>
    new Promise<{ blob: Blob; durationMs: number } | null>((resolve) => {
      const rec = recRef.current;
      if (!rec) return resolve(null);
      const durationMs = Date.now() - startRef.current;
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop());
        recRef.current = null;
        setRecording(false);
        resolve(keep ? { blob: new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }), durationMs } : null);
      };
      rec.stop();
    });

  return { recording, elapsed, start, stop };
}

export function CaseChat({
  labId,
  caseId,
  currentUserId,
  senderRole,
  senderName,
  counterpartId,
  context,
  variant = "embedded",
}: Props) {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const { messages, loading, error } = useCaseMessages(labId, caseId);

  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Pending[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const recorder = useRecorder();

  const scrollRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    if (currentUserId && messages.length) markCaseRead(caseId, currentUserId);
  }, [messages, caseId, currentUserId]);

  const notify = (m: Pick<CaseMessage, "text" | "attachments" | "files">) => {
    if (!counterpartId) return;
    void notifyCaseMessage({
      toUserId: counterpartId,
      forRole: senderRole === "doctor" ? "lab" : "doctor",
      senderName,
      patient: context?.patient ?? "",
      orderNumber: context?.orderNumber,
      caseId,
      labId,
      preview: messagePreview(m, ar),
      ar,
    });
  };

  const pick = async (files: FileList | null, kind: "image" | "file") => {
    if (!files?.length) return;
    setMenuOpen(false);
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > CHAT_FILE_MAX_MB * 1024 * 1024) {
        toast.error(ar ? `${file.name} أكبر من ${CHAT_FILE_MAX_MB} ميجابايت` : `${file.name} is over ${CHAT_FILE_MAX_MB} MB`);
        continue;
      }
      try {
        const path = await uploadChatFile(labId, caseId, file, file.name, file.type);
        const isImage = kind === "image" && file.type.startsWith("image/");
        setPending((p) => [
          ...p,
          isImage
            ? { kind: "image", path, name: file.name }
            : { kind: "file", file: { path, name: file.name, type: file.type || "application/octet-stream", size: file.size } },
        ]);
      } catch (err) {
        console.error("Chat upload failed:", err);
        toast.error(ar ? `تعذر رفع ${file.name}` : `Could not upload ${file.name}`);
      }
    }
    setUploading(false);
  };

  const send = async (extra?: { files?: ChatFile[] }) => {
    const text = draft.trim();
    const attachments = pending.filter((p) => p.kind === "image").map((p) => (p as { path: string }).path);
    const files = [...pending.filter((p) => p.kind === "file").map((p) => (p as { file: ChatFile }).file), ...(extra?.files ?? [])];
    if (!text && attachments.length === 0 && files.length === 0) return;
    setIsSending(true);
    try {
      await sendCaseMessage(labId, caseId, { senderId: currentUserId, senderRole, senderName, text, attachments, files });
      notify({ text, attachments, files });
      setDraft("");
      setPending([]);
    } catch (err) {
      console.error("Failed to send case message:", err);
      toast.error(ar ? "فشل إرسال الرسالة" : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      await recorder.start();
    } catch {
      toast.error(ar ? "لم يُسمح باستخدام الميكروفون" : "Microphone permission denied");
    }
  };

  const finishRecording = async () => {
    const clip = await recorder.stop(true);
    if (!clip || clip.durationMs < 700) return;
    setIsSending(true);
    try {
      const ext = clip.blob.type.includes("mp4") ? "m4a" : "webm";
      const name = `voice-${Date.now()}.${ext}`;
      const path = await uploadChatFile(labId, caseId, clip.blob, name, clip.blob.type);
      await send({ files: [{ path, name, type: clip.blob.type, size: clip.blob.size, durationMs: clip.durationMs }] });
    } catch {
      toast.error(ar ? "تعذر إرسال الرسالة الصوتية" : "Could not send voice note");
    } finally {
      setIsSending(false);
    }
  };

  // Day separators between messages of different days.
  const rows = useMemo(() => {
    const out: Array<{ type: "day"; label: string; key: string } | { type: "msg"; m: CaseMessage }> = [];
    let lastDay = "";
    for (const m of messages) {
      const ms = toMs(m.createdAt);
      const day = new Date(ms).toDateString();
      if (day !== lastDay) {
        out.push({ type: "day", label: dayLabel(ms, ar), key: `d-${day}` });
        lastDay = day;
      }
      out.push({ type: "msg", m });
    }
    return out;
  }, [messages, ar]);

  const canSend = !!draft.trim() || pending.length > 0;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm",
        variant === "embedded" ? "h-[520px]" : "h-full min-h-0",
      )}
    >
      {/* Pinned case context — which case this conversation is about. */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-gradient-to-l from-sky-50 to-white px-4 py-3">
        <span className="size-10 shrink-0 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white font-extrabold flex items-center justify-center">
          {(context?.patient || "?").charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-extrabold text-slate-800">
            {context?.patient || (ar ? "محادثة الحالة" : "Case chat")}
            {context?.orderNumber && <span className="ms-1.5 font-mono text-[11px] font-bold text-slate-400">{context.orderNumber}</span>}
          </p>
          <p className="truncate text-[11px] text-slate-500">
            {[context?.counterpartName, context?.workType].filter(Boolean).join(" · ") || (ar ? "التواصل والتحديثات" : "Updates & conversation")}
          </p>
        </div>
        {context?.statusLabel && (
          <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-700">{context.statusLabel}</span>
        )}
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-slate-400" />}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgb(226 232 240 / 0.7) 1px, transparent 0)", backgroundSize: "18px 18px" }}
      >
        {error && <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-center text-[11px] text-rose-600">{error}</p>}
        {messages.length === 0 && !loading && !error && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="size-14 rounded-3xl bg-sky-50 text-sky-500 flex items-center justify-center">
              <Send className="size-6" />
            </span>
            <p className="text-sm font-bold text-slate-600">{ar ? "ابدأ المحادثة حول هذه الحالة" : "Start the conversation about this case"}</p>
            <p className="max-w-xs text-[11px] text-slate-400">
              {ar ? "أرسل رسالة أو صورة أو ملفاً أو رسالة صوتية" : "Send a message, a photo, a file or a voice note"}
            </p>
          </div>
        )}
        {rows.map((row) => {
          if (row.type === "day") {
            return (
              <div key={row.key} className="flex justify-center py-2">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold text-slate-500 shadow-sm ring-1 ring-slate-100">{row.label}</span>
              </div>
            );
          }
          const m = row.m;
          const mine = m.senderId === currentUserId;
          const voice = (m.files ?? []).filter((f) => f.type.startsWith("audio/"));
          const docs = (m.files ?? []).filter((f) => !f.type.startsWith("audio/"));
          return (
            <div key={m.id} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
              {!mine && (
                <span className="mb-4 size-7 shrink-0 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                  {(m.senderName || "?").charAt(0)}
                </span>
              )}
              <div className={cn("flex max-w-[78%] flex-col gap-1", mine ? "items-end" : "items-start")}>
                {!mine && <span className="px-1 text-[10px] font-bold text-slate-500">{m.senderName}</span>}
                <div
                  className={cn(
                    "space-y-1.5 rounded-3xl px-3 py-2 shadow-sm",
                    mine
                      ? "rounded-ee-md bg-gradient-to-br from-sky-500 to-blue-600 text-white"
                      : "rounded-es-md bg-white text-slate-800 ring-1 ring-slate-100",
                  )}
                >
                  {m.attachments && m.attachments.length > 0 && (
                    <div className={cn("grid gap-1", m.attachments.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                      {m.attachments.map((att) => (
                        <button key={att} type="button" onClick={() => setLightbox(att)} className="overflow-hidden rounded-2xl">
                          <CaseImage path={att} alt="" className="h-36 w-full min-w-28 object-cover transition hover:scale-[1.02]" />
                        </button>
                      ))}
                    </div>
                  )}
                  {voice.map((f) => (
                    <VoiceNote key={f.path} f={f} mine={mine} />
                  ))}
                  {docs.map((f) => (
                    <FileCard key={f.path} f={f} mine={mine} ar={ar} />
                  ))}
                  {m.text && <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">{m.text}</p>}
                </div>
                <span className="flex items-center gap-1 px-1 text-[9px] text-slate-400" dir="ltr">
                  {timeLabel(toMs(m.createdAt))}
                  {mine && <CheckCheck className="size-3 text-sky-500" />}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pending attachments */}
      {pending.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50 px-3 py-2">
          {pending.map((p, i) => (
            <div key={i} className="relative shrink-0">
              {p.kind === "image" ? (
                <CaseImage path={p.path} alt="" className="size-16 rounded-xl object-cover ring-1 ring-slate-200" />
              ) : (
                <div className="flex h-16 w-40 items-center gap-2 rounded-xl bg-white px-2 ring-1 ring-slate-200">
                  <FileGlyph type={p.file.type} name={p.file.name} className="size-5 shrink-0 text-sky-600" />
                  <span className="min-w-0 truncate text-[11px] font-semibold" dir="ltr">{p.file.name}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setPending((list) => list.filter((_, x) => x !== i))}
                className="absolute -end-1.5 -top-1.5 size-5 rounded-full bg-slate-800 text-white flex items-center justify-center"
                aria-label={ar ? "إزالة" : "Remove"}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="relative border-t border-slate-100 bg-white px-3 py-2.5">
        <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void pick(e.target.files, "image"); e.target.value = ""; }} />
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { void pick(e.target.files, "file"); e.target.value = ""; }} />

        {menuOpen && (
          <div className="absolute bottom-full start-3 z-10 mb-2 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <button type="button" onClick={() => imageRef.current?.click()} className="flex w-full items-center gap-3 px-4 py-3 text-start text-[13px] font-semibold hover:bg-slate-50">
              <span className="size-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center"><ImageIcon className="size-4" /></span>
              {ar ? "صورة" : "Photo"}
            </button>
            <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-3 px-4 py-3 text-start text-[13px] font-semibold hover:bg-slate-50">
              <span className="size-8 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center"><FileText className="size-4" /></span>
              {ar ? "ملف (PDF / STL / ZIP)" : "File (PDF / STL / ZIP)"}
            </button>
          </div>
        )}

        {recorder.recording ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void recorder.stop(false)} className="size-10 shrink-0 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200" aria-label={ar ? "إلغاء" : "Cancel"}>
              <Trash2 className="size-4" />
            </button>
            <div className="flex h-10 flex-1 items-center gap-2 rounded-2xl bg-rose-50 px-3">
              <span className="size-2.5 animate-pulse rounded-full bg-rose-500" />
              <span className="text-[12px] font-bold text-rose-600">{ar ? "جارٍ التسجيل" : "Recording"}</span>
              <span className="ms-auto text-[12px] font-bold tabular-nums text-rose-600" dir="ltr">{fmtDuration(recorder.elapsed)}</span>
            </div>
            <button type="button" onClick={() => void finishRecording()} className="size-10 shrink-0 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center" aria-label={ar ? "إرسال" : "Send"}>
              <Square className="size-4 fill-current" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={uploading}
              className={cn("size-10 shrink-0 rounded-2xl flex items-center justify-center transition", menuOpen ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}
              aria-label={ar ? "إرفاق" : "Attach"}
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
            </button>
            <textarea
              value={draft}
              rows={1}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={ar ? "اكتب رسالة…" : "Type a message…"}
              className="max-h-28 min-h-10 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] outline-none focus:border-sky-400 focus:bg-white focus:ring-2 focus:ring-sky-500/15"
            />
            {canSend ? (
              <button
                type="button"
                onClick={() => void send()}
                disabled={isSending}
                className="size-10 shrink-0 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 disabled:opacity-50"
                aria-label={ar ? "إرسال" : "Send"}
              >
                {isSending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 rtl:-scale-x-100" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startRecording()}
                disabled={isSending || typeof MediaRecorder === "undefined"}
                className="size-10 shrink-0 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-500/25 disabled:opacity-40"
                aria-label={ar ? "رسالة صوتية" : "Voice note"}
                title={ar ? "رسالة صوتية" : "Voice note"}
              >
                {isSending ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
              </button>
            )}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute end-4 top-4 size-10 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="close">
            <X className="size-5" />
          </button>
          <CaseImage path={lightbox} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}
