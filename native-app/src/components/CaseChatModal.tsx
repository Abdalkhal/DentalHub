import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { File } from 'expo-file-system';
import {
  Box,
  CheckCheck,
  Download,
  FileArchive,
  FileText,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Pause,
  Play,
  Send,
  X,
} from 'lucide-react-native';

import { Text } from '@/components/ui';
import {
  CHAT_FILE_MAX_MB,
  markCaseRead,
  messagePreview,
  notifyCaseMessage,
  sendCaseMessage,
  uploadChatFile,
  useCaseMessages,
  type CaseMessage,
  type CaseMessageSenderRole,
  type ChatFile,
} from '@/lib/caseMessages';
import { resolveCaseFileUri } from '@/lib/storagePipeline';
import { hasNativeModule } from '@/lib/nativeModules';
import { toast } from '@/lib/toast';

/** What the conversation is about — pinned above the messages. */
export type CaseChatContext = {
  patient: string;
  orderNumber?: string;
  workType?: string;
  statusLabel?: string;
  counterpartName?: string;
};

type VoiceRecorderComponent = typeof import('./VoiceRecorder').VoiceRecorder;
type AudioApi = typeof import('expo-audio');

// expo-audio crashes at import in builds that don't contain it (store builds
// before 1.0.2), so it is only ever required behind this check.
const hasAudio = hasNativeModule('ExpoAudio');
function loadVoiceRecorder(): VoiceRecorderComponent | null {
  if (!hasAudio) return null;
  try {
    return (require('./VoiceRecorder') as typeof import('./VoiceRecorder')).VoiceRecorder;
  } catch {
    return null;
  }
}
function audioApi(): AudioApi | null {
  if (!hasAudio) return null;
  try {
    return require('expo-audio') as AudioApi;
  } catch {
    return null;
  }
}
const VoiceRecorder = loadVoiceRecorder();

type PickerApi = {
  getDocumentAsync: (o: { multiple?: boolean; copyToCacheDirectory?: boolean; type?: string }) => Promise<{
    canceled: boolean;
    assets: { uri: string; name?: string; mimeType?: string; size?: number }[];
  }>;
};
function documentPicker(): PickerApi | null {
  if (!hasNativeModule('ExpoDocumentPicker')) return null;
  try {
    return require('expo-document-picker') as PickerApi;
  } catch {
    return null;
  }
}

const BLUE = '#2563EB';

/** Downloaded copies (rules-checked, via the SDK) cached per Storage path. */
const localUris = new Map<string, string>();
async function localUri(path: string, name: string): Promise<string> {
  const cached = localUris.get(path);
  if (cached) return cached;
  const uri = await resolveCaseFileUri(path, `${Date.now()}-${name.replace(/[^\w.\-]+/g, '_')}`);
  localUris.set(path, uri);
  return uri;
}

function useLocalUri(path: string | undefined, name: string) {
  const [uri, setUri] = useState<string | undefined>(() => (path ? localUris.get(path) : undefined));
  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    localUri(path, name)
      .then((u) => !cancelled && setUri(u))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [path, name]);
  return uri;
}

const toMs = (ts: CaseMessage['createdAt']) => (ts && typeof ts.toMillis === 'function' ? ts.toMillis() : Date.now());
const pad = (n: number) => String(n).padStart(2, '0');
const timeLabel = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
function dayLabel(ms: number, ar: boolean) {
  const d = new Date(ms);
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return ar ? 'اليوم' : 'Today';
  if (d.toDateString() === y.toDateString()) return ar ? 'أمس' : 'Yesterday';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
const fmtSize = (b?: number) => (!b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const fmtDuration = (ms?: number) => {
  const s = Math.max(0, Math.round((ms ?? 0) / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
};

function FileGlyph({ f, color }: { f: { name: string; type: string }; color: string }) {
  const n = f.name.toLowerCase();
  if (n.endsWith('.stl') || n.endsWith('.ply') || n.endsWith('.obj')) return <Box size={18} color={color} />;
  if (f.type.includes('zip') || n.endsWith('.zip') || n.endsWith('.rar')) return <FileArchive size={18} color={color} />;
  return <FileText size={18} color={color} />;
}

async function openShared(path: string, name: string, ar: boolean) {
  try {
    const uri = await localUri(path, name);
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
  } catch {
    toast.error(ar ? 'تعذر فتح الملف' : 'Could not open file');
  }
}

function ChatImage({ path, onPress }: { path: string; onPress: () => void }) {
  const uri = useLocalUri(path, 'image.jpg');
  return (
    <Pressable onPress={onPress} className="overflow-hidden rounded-2xl bg-slate-200" style={{ width: 180, height: 150 }}>
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <ActivityIndicator style={{ flex: 1 }} color="#94A3B8" />}
    </Pressable>
  );
}

function FileCard({ f, mine, ar }: { f: ChatFile; mine: boolean; ar: boolean }) {
  const [busy, setBusy] = useState(false);
  return (
    <Pressable
      onPress={async () => {
        setBusy(true);
        await openShared(f.path, f.name, ar);
        setBusy(false);
      }}
      className="flex-row items-center gap-2.5 rounded-2xl p-2.5"
      style={{ width: 230, backgroundColor: mine ? 'rgba(255,255,255,0.18)' : '#F8FAFC' }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: mine ? 'rgba(255,255,255,0.22)' : '#E0F2FE' }}>
        <FileGlyph f={f} color={mine ? '#FFFFFF' : '#0284C7'} />
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-xs font-bold" style={{ color: mine ? '#FFFFFF' : '#1E293B', writingDirection: 'ltr' }}>
          {f.name}
        </Text>
        <Text className="text-[10px]" style={{ color: mine ? 'rgba(255,255,255,0.75)' : '#94A3B8' }}>
          {fmtSize(f.size) || (ar ? 'ملف' : 'File')}
        </Text>
      </View>
      {busy ? <ActivityIndicator size="small" color={mine ? '#FFFFFF' : BLUE} /> : <Download size={16} color={mine ? '#FFFFFF' : '#64748B'} />}
    </Pressable>
  );
}

function VoiceNote({ f, mine, ar }: { f: ChatFile; mine: boolean; ar: boolean }) {
  const playerRef = useRef<ReturnType<AudioApi['createAudioPlayer']> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => () => playerRef.current?.remove(), []);

  const toggle = async () => {
    const audio = audioApi();
    if (!audio) {
      // This build has no audio player — hand the clip to the phone's player.
      await openShared(f.path, f.name, ar);
      return;
    }
    if (playing) {
      playerRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (!playerRef.current) {
      setLoading(true);
      try {
        const uri = await localUri(f.path, f.name);
        const player = audio.createAudioPlayer(uri);
        player.addListener('playbackStatusUpdate', (s) => {
          setProgress(s.duration ? s.currentTime / s.duration : 0);
          if (s.didJustFinish) {
            setPlaying(false);
            setProgress(0);
            player.seekTo(0);
          }
        });
        playerRef.current = player;
      } catch {
        setLoading(false);
        toast.error(ar ? 'تعذر تشغيل الرسالة الصوتية' : 'Could not play voice note');
        return;
      }
      setLoading(false);
    }
    playerRef.current?.play();
    setPlaying(true);
  };

  const fg = mine ? '#FFFFFF' : BLUE;
  return (
    <View className="flex-row items-center gap-2.5 rounded-2xl px-2.5 py-2" style={{ width: 220, backgroundColor: mine ? 'rgba(255,255,255,0.18)' : '#F8FAFC' }}>
      <Pressable onPress={toggle} className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: mine ? '#FFFFFF' : BLUE }}>
        {loading ? (
          <ActivityIndicator size="small" color={mine ? BLUE : '#FFFFFF'} />
        ) : playing ? (
          <Pause size={15} color={mine ? BLUE : '#FFFFFF'} />
        ) : (
          <Play size={15} color={mine ? BLUE : '#FFFFFF'} />
        )}
      </Pressable>
      <View className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: mine ? 'rgba(255,255,255,0.3)' : '#E2E8F0' }}>
        <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: fg }} />
      </View>
      <Text className="text-[10px] font-semibold" style={{ color: mine ? 'rgba(255,255,255,0.85)' : '#64748B', writingDirection: 'ltr' }}>
        {fmtDuration(f.durationMs)}
      </Text>
    </View>
  );
}

function ImageViewer({ path, onClose }: { path: string; onClose: () => void }) {
  const uri = useLocalUri(path, 'image.jpg');
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black">
        <Pressable onPress={onClose} className="absolute end-4 top-12 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <X size={20} color="#FFFFFF" />
        </Pressable>
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '80%' }} resizeMode="contain" /> : <ActivityIndicator color="#FFFFFF" />}
      </View>
    </Modal>
  );
}

type Pending = { kind: 'image'; path: string } | { kind: 'file'; file: ChatFile };

export function CaseChatModal({
  visible,
  onClose,
  ar,
  labId,
  caseId,
  currentUserId,
  senderRole,
  senderName,
  counterpartId,
  context,
}: {
  visible: boolean;
  onClose: () => void;
  ar: boolean;
  labId: string;
  caseId: string;
  currentUserId: string;
  senderRole: CaseMessageSenderRole;
  senderName: string;
  counterpartId?: string;
  context: CaseChatContext;
}) {
  const insets = useSafeAreaInsets();
  const { messages, loading, error } = useCaseMessages(visible ? labId : '', visible ? caseId : '');
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [menu, setMenu] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && messages.length) markCaseRead(caseId, currentUserId);
  }, [visible, messages.length, caseId, currentUserId]);

  const upload = async (uri: string, name: string, type: string, size?: number) => {
    if (size && size > CHAT_FILE_MAX_MB * 1024 * 1024) {
      toast.error(ar ? `${name} أكبر من ${CHAT_FILE_MAX_MB} ميجابايت` : `${name} is over ${CHAT_FILE_MAX_MB} MB`);
      return null;
    }
    // Native read — fetch(uri).blob() is unreliable for binaries on Android.
    const bytes = new Uint8Array(await new File(uri).arrayBuffer());
    return uploadChatFile(labId, caseId, bytes, name, type);
  };

  const pickImages = async () => {
    setMenu(false);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.8 });
    if (res.canceled || !res.assets?.length) return;
    setUploading(true);
    for (const a of res.assets) {
      try {
        const type = a.mimeType ?? 'image/jpeg';
        const path = await upload(a.uri, a.fileName ?? `photo-${Date.now()}.jpg`, type, a.fileSize);
        if (path) setPending((p) => [...p, { kind: 'image', path }]);
      } catch {
        toast.error(ar ? 'تعذر رفع الصورة' : 'Could not upload photo');
      }
    }
    setUploading(false);
  };

  const pickFiles = async () => {
    setMenu(false);
    const picker = documentPicker();
    if (!picker) {
      toast.error(ar ? 'اختيار الملفات يتطلب أحدث إصدار من التطبيق' : 'File picking needs the latest app build');
      return;
    }
    const res = await picker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
    if (res.canceled || !res.assets.length) return;
    setUploading(true);
    for (const a of res.assets) {
      try {
        const name = a.name ?? `file-${Date.now()}`;
        const type = a.mimeType ?? 'application/octet-stream';
        const path = await upload(a.uri, name, type, a.size);
        if (path) setPending((p) => [...p, { kind: 'file', file: { path, name, type, size: a.size } }]);
      } catch {
        toast.error(ar ? 'تعذر رفع الملف' : 'Could not upload file');
      }
    }
    setUploading(false);
  };

  const send = async (extraFiles: ChatFile[] = []) => {
    const text = draft.trim();
    const attachments = pending.flatMap((p) => (p.kind === 'image' ? [p.path] : []));
    const files = [...pending.flatMap((p) => (p.kind === 'file' ? [p.file] : [])), ...extraFiles];
    if (!text && !attachments.length && !files.length) return;
    setSending(true);
    try {
      await sendCaseMessage(labId, caseId, { senderId: currentUserId, senderRole, senderName, text, attachments, files });
      if (counterpartId) {
        void notifyCaseMessage({
          toUserId: counterpartId,
          forRole: senderRole === 'doctor' ? 'lab' : 'doctor',
          senderName,
          patient: context.patient,
          orderNumber: context.orderNumber,
          caseId,
          labId,
          preview: messagePreview({ text, attachments, files }, ar),
          ar,
        });
      }
      setDraft('');
      setPending([]);
    } catch {
      toast.error(ar ? 'فشل إرسال الرسالة' : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendVoice = async (uri: string, durationMs: number) => {
    setSending(true);
    try {
      const name = `voice-${Date.now()}.m4a`;
      const path = await upload(uri, name, 'audio/mp4');
      if (path) await send([{ path, name, type: 'audio/mp4', durationMs }]);
    } catch {
      toast.error(ar ? 'تعذر إرسال الرسالة الصوتية' : 'Could not send voice note');
    } finally {
      setSending(false);
    }
  };

  const rows = useMemo(() => {
    const out: ({ type: 'day'; key: string; label: string } | { type: 'msg'; m: CaseMessage })[] = [];
    let last = '';
    for (const m of messages) {
      const ms = toMs(m.createdAt);
      const day = new Date(ms).toDateString();
      if (day !== last) {
        out.push({ type: 'day', key: `d-${day}`, label: dayLabel(ms, ar) });
        last = day;
      }
      out.push({ type: 'msg', m });
    }
    return out;
  }, [messages, ar]);

  const canSend = !!draft.trim() || pending.length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View className="flex-1 bg-slate-100" style={{ paddingTop: insets.top }}>
          {/* Pinned case context — which case this conversation is about. */}
          <View className="flex-row items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <X size={18} color="#334155" />
            </Pressable>
            <View className="h-10 w-10 items-center justify-center rounded-2xl" style={{ backgroundColor: BLUE }}>
              <Text className="text-base font-extrabold text-white">{(context.patient || '?').charAt(0)}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">
                {context.patient}
                {context.orderNumber ? `  ·  ${context.orderNumber}` : ''}
              </Text>
              <Text numberOfLines={1} className="text-[11px] text-slate-500">
                {[context.counterpartName, context.workType].filter(Boolean).join(' · ') || (ar ? 'محادثة الحالة' : 'Case conversation')}
              </Text>
            </View>
            {!!context.statusLabel && (
              <View className="rounded-full bg-sky-100 px-2.5 py-1">
                <Text className="text-[10px] font-bold text-sky-700">{context.statusLabel}</Text>
              </View>
            )}
          </View>

          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerStyle={{ padding: 12, gap: 6, flexGrow: 1 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
          >
            {loading && <ActivityIndicator color={BLUE} />}
            {!!error && <Text className="text-center text-xs text-rose-600">{error}</Text>}
            {!loading && !error && messages.length === 0 && (
              <View className="flex-1 items-center justify-center gap-2">
                <View className="h-14 w-14 items-center justify-center rounded-3xl bg-sky-100">
                  <Send size={22} color={BLUE} />
                </View>
                <Text className="text-sm font-bold text-slate-600">{ar ? 'ابدأ المحادثة حول هذه الحالة' : 'Start the conversation about this case'}</Text>
                <Text className="text-[11px] text-slate-400">{ar ? 'رسالة، صورة، ملف أو رسالة صوتية' : 'A message, photo, file or voice note'}</Text>
              </View>
            )}
            {rows.map((row) => {
              if (row.type === 'day') {
                return (
                  <View key={row.key} className="items-center py-2">
                    <View className="rounded-full bg-white px-3 py-1">
                      <Text className="text-[10px] font-bold text-slate-500">{row.label}</Text>
                    </View>
                  </View>
                );
              }
              const m = row.m;
              const mine = m.senderId === currentUserId;
              const voice = (m.files ?? []).filter((f) => f.type.startsWith('audio/'));
              const docs = (m.files ?? []).filter((f) => !f.type.startsWith('audio/'));
              return (
                <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                  {!mine && <Text className="mb-0.5 px-1 text-[10px] font-bold text-slate-500">{m.senderName}</Text>}
                  <View
                    className="gap-1.5 px-3 py-2"
                    style={{
                      maxWidth: '82%',
                      borderRadius: 22,
                      borderBottomRightRadius: mine ? 6 : 22,
                      borderBottomLeftRadius: mine ? 22 : 6,
                      backgroundColor: mine ? BLUE : '#FFFFFF',
                    }}
                  >
                    {(m.attachments ?? []).map((path) => (
                      <ChatImage key={path} path={path} onPress={() => setViewer(path)} />
                    ))}
                    {voice.map((f) => (
                      <VoiceNote key={f.path} f={f} mine={mine} ar={ar} />
                    ))}
                    {docs.map((f) => (
                      <FileCard key={f.path} f={f} mine={mine} ar={ar} />
                    ))}
                    {!!m.text && (
                      <Text className="text-[13px] leading-5" style={{ color: mine ? '#FFFFFF' : '#1E293B' }}>
                        {m.text}
                      </Text>
                    )}
                  </View>
                  <View className="mt-0.5 flex-row items-center gap-1 px-1">
                    <Text className="text-[9px] text-slate-400">{timeLabel(toMs(m.createdAt))}</Text>
                    {mine && <CheckCheck size={11} color="#0EA5E9" />}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {pending.length > 0 && (
            <ScrollView horizontal className="max-h-24 border-t border-slate-200 bg-white" contentContainerStyle={{ padding: 8, gap: 8 }}>
              {pending.map((p, i) => (
                <View key={i}>
                  {p.kind === 'image' ? (
                    <ChatImage path={p.path} onPress={() => {}} />
                  ) : (
                    <View className="h-16 w-40 flex-row items-center gap-2 rounded-xl bg-slate-50 px-2">
                      <FileGlyph f={p.file} color="#0284C7" />
                      <Text numberOfLines={1} className="flex-1 text-[11px] font-semibold" style={{ writingDirection: 'ltr' }}>
                        {p.file.name}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => setPending((list) => list.filter((_, x) => x !== i))}
                    className="absolute -end-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-slate-800"
                  >
                    <X size={11} color="#FFFFFF" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          {menu && (
            <View className="mx-3 mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Pressable onPress={pickImages} className="flex-row items-center gap-3 px-4 py-3">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
                  <ImageIcon size={16} color="#7C3AED" />
                </View>
                <Text className="text-[13px] font-semibold text-slate-800">{ar ? 'صورة' : 'Photo'}</Text>
              </Pressable>
              <Pressable onPress={pickFiles} className="flex-row items-center gap-3 border-t border-slate-100 px-4 py-3">
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-sky-100">
                  <FileText size={16} color="#0284C7" />
                </View>
                <Text className="text-[13px] font-semibold text-slate-800">{ar ? 'ملف (PDF / STL / ZIP)' : 'File (PDF / STL / ZIP)'}</Text>
              </Pressable>
            </View>
          )}

          {/* Composer */}
          <View className="flex-row items-end gap-2 border-t border-slate-200 bg-white px-3 pt-2.5" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
            {!recording && (
              <>
                <Pressable
                  onPress={() => setMenu((v) => !v)}
                  disabled={uploading}
                  className="h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: menu ? '#DBEAFE' : '#F1F5F9' }}
                >
                  {uploading ? <ActivityIndicator size="small" color={BLUE} /> : <Paperclip size={18} color="#475569" />}
                </Pressable>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={ar ? 'اكتب رسالة…' : 'Type a message…'}
                  placeholderTextColor="#94A3B8"
                  multiline
                  className="max-h-28 min-h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-800"
                  style={{ textAlign: ar ? 'right' : 'left' }}
                />
              </>
            )}
            {canSend ? (
              <Pressable onPress={() => send()} disabled={sending} className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: BLUE }}>
                {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Send size={17} color="#FFFFFF" style={{ transform: [{ scaleX: ar ? -1 : 1 }] }} />}
              </Pressable>
            ) : VoiceRecorder ? (
              <VoiceRecorder
                ar={ar}
                disabled={sending}
                onRecordingChange={setRecording}
                onFinish={sendVoice}
                onError={(msg) => toast.error(msg)}
              />
            ) : (
              <Pressable
                onPress={() =>
                  toast.error(
                    ar ? 'تسجيل الرسائل الصوتية يتطلب تحديث التطبيق من المتجر' : 'Voice notes need the latest app version from the store',
                  )
                }
                className="h-11 w-11 items-center justify-center rounded-2xl"
                style={{ backgroundColor: BLUE, opacity: 0.45 }}
              >
                <Mic size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      {!!viewer && <ImageViewer path={viewer} onClose={() => setViewer(null)} />}
    </Modal>
  );
}
