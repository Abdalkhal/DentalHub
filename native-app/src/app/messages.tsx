import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { MessageCircle, Send } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { db } from '@/integrations/firebase/client';
import { useOrders } from '@/lib/ordersStore';
import { useDentistCases, filterLegacyOrders } from '@/lib/caseTracking';
import {
  useCaseMessages,
  sendCaseMessage,
  markCaseRead,
  useCaseUnreadCount,
  type CaseMessage,
} from '@/lib/caseMessages';
import {
  useDmThreads,
  useDmMessages,
  sendDmMessage,
  markDmThreadRead,
  useDmUnreadCount,
  dmThreadId,
  type DmThread,
  type DmMessage,
} from '@/lib/directMessages';
import { useSession, useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

type Conv = { labId: string; caseId: string; patient: string; orderNo: string };
type ChatBubble = { id: string; senderId: string; text: string; createdAt: CaseMessage['createdAt'] };

function timeLabel(d?: CaseMessage['createdAt'] | null): string {
  if (!d || !d.toDate) return '';
  const date = d.toDate();
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function UnreadDot({ labId, caseId, uid }: { labId?: string; caseId: string; uid?: string }) {
  const count = useCaseUnreadCount(labId ?? '', caseId, uid);
  if (!count) return null;
  return (
    <View className="min-w-5 h-5 shrink-0 items-center justify-center rounded-full bg-primary px-1">
      <Text className="text-[10px] font-bold text-white">{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

function DmUnreadDot({ threadId, uid }: { threadId: string; uid?: string }) {
  const count = useDmUnreadCount(threadId, uid);
  if (!count) return null;
  return (
    <View className="min-w-5 h-5 shrink-0 items-center justify-center rounded-full bg-primary px-1">
      <Text className="text-[10px] font-bold text-white">{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

function Avatar({ photo, label }: { photo?: string; label: string }) {
  if (photo) {
    return <Image source={{ uri: photo }} className="h-11 w-11 shrink-0 rounded-2xl bg-slate-100" />;
  }
  return (
    <View className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB]">
      <Text className="text-lg font-extrabold text-white">{label.charAt(0) || '؟'}</Text>
    </View>
  );
}

export default function MessagesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const { role } = useUserRole();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ with?: string; withName?: string; withPhoto?: string }>();
  const localOrders = useOrders();
  const { cases: remoteCases } = useDentistCases(user?.uid ?? '');
  const doctorName = [role?.name, role?.surname].filter(Boolean).join(' ').trim();
  const myName = doctorName || user?.displayName || user?.email || (ar ? 'أنا' : 'Me');
  const myPhoto = role?.photoURL || '';

  const [selectedCase, setSelectedCase] = useState<Conv | null>(null);
  const [selectedDm, setSelectedDm] = useState<DmThread | null>(null);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const { threads: dmThreads } = useDmThreads(user?.uid);

  // `withPhoto` used to be passed as a router param straight from the
  // profile/invoice screen (a Firebase Storage download URL, which itself
  // contains `?alt=media&token=...`) — a URL-with-a-query-string riding as
  // one query param value is exactly the kind of thing that gets mangled by
  // href serialization, and it was: the avatar came through blank. Fetching
  // the account doc directly here sidesteps that whole class of bug and is
  // also the single source of truth, the same way profile/[accountId].tsx
  // itself resolves this data.
  const { data: withAccount } = useQuery({
    queryKey: ['dm-with-account', params.with],
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'public_profiles', params.with ?? ''));
      if (!snap.exists()) return null;
      const d = snap.data() as Record<string, unknown>;
      return {
        name: String(d.name || d.surname || ''),
        photoURL: typeof d.photoURL === 'string' ? d.photoURL : '',
      };
    },
    enabled: !!params.with,
    staleTime: 60_000,
  });

  // Arriving from a profile/invoice "Message" button (?with=accountId): open
  // that thread if it already exists, or a not-yet-created one otherwise —
  // the thread doc itself is only written once the first message is sent.
  useEffect(() => {
    if (!params.with || !user?.uid) return;
    const threadId = dmThreadId(user.uid, params.with);
    const existing = dmThreads.find((t) => t.id === threadId);
    if (existing) {
      setSelectedDm(existing);
      return;
    }
    setSelectedDm({
      id: threadId,
      participants: [user.uid, params.with].sort(),
      names: { [params.with]: withAccount?.name || params.withName || (ar ? 'مستخدم' : 'User'), [user.uid]: myName },
      photos: { [params.with]: withAccount?.photoURL || '', [user.uid]: myPhoto },
      lastMessage: '',
      lastMessageAt: null,
      lastSenderId: '',
    });
    // `user` comes from useSession() with no loading gate on this screen, so
    // on first mount user?.uid is often still undefined (auth hasn't resolved
    // yet) — without it in the deps, the effect ran once, bailed out on the
    // guard above, and never got a second chance once the user did resolve,
    // leaving the screen stuck on the empty list instead of opening the chat.
    // `dmThreads`/`myName`/`myPhoto` are intentionally left out so an
    // already-open synthesized thread isn't reset every time those update;
    // `withAccount` IS included so the real photo/name replace the params
    // fallback the moment the fetch resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.with, user?.uid, withAccount]);

  const convs = useMemo<Conv[]>(() => {
    const remote = remoteCases.map((c) => ({
      labId: c.labId || (c.order.targetLabId as string | undefined) || '',
      caseId: c.order.id,
      patient: c.order.patient || (ar ? 'مريض' : 'Patient'),
      orderNo: c.order.orderNumber || c.order.id.slice(0, 6),
    }));
    const ids = new Set(remote.map((r) => r.caseId));
    const legacy = filterLegacyOrders(localOrders, ids, doctorName).map((o) => ({
      labId: (o.targetLabId as string | undefined) || '',
      caseId: o.id,
      patient: o.patient || (ar ? 'مريض' : 'Patient'),
      orderNo: o.orderNumber || o.id.slice(0, 6),
    }));
    return Array.from(new Map([...remote, ...legacy].map((c) => [c.caseId, c])).values());
  }, [remoteCases, localOrders, doctorName, ar]);

  const { data: labNames = {} } = useQuery({
    queryKey: ['lab-names'],
    queryFn: async () => {
      const snap = await getDocs(collection(db, 'public_profiles'));
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const u = d.data() as Record<string, unknown>;
        if (u.accountType === 'lab' && u.name) map[String(u.userId)] = String(u.name);
      });
      return map;
    },
    staleTime: 120_000,
  });

  const { messages: caseMessages } = useCaseMessages(selectedCase?.labId ?? '', selectedCase?.caseId ?? '');
  const { messages: dmMessages } = useDmMessages(selectedDm?.id ?? '');

  const otherId = selectedDm ? selectedDm.participants.find((p) => p !== user?.uid) ?? '' : '';
  const otherName = selectedDm ? selectedDm.names[otherId] || (ar ? 'مستخدم' : 'User') : '';
  const otherPhoto = selectedDm ? selectedDm.photos[otherId] || '' : '';

  const bubbles: ChatBubble[] = selectedCase
    ? caseMessages.map((m) => ({ id: m.id, senderId: m.senderId, text: m.text, createdAt: m.createdAt }))
    : dmMessages.map((m: DmMessage) => ({ id: m.id, senderId: m.senderId, text: m.text, createdAt: m.createdAt }));

  useEffect(() => {
    if (selectedCase && user?.uid) markCaseRead(selectedCase.caseId, user.uid);
  }, [selectedCase, caseMessages.length, user?.uid]);

  useEffect(() => {
    if (selectedDm && user?.uid) markDmThreadRead(selectedDm.id, user.uid);
  }, [selectedDm, dmMessages.length, user?.uid]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [selectedCase, selectedDm, bubbles.length]);

  const closeChat = () => {
    setSelectedCase(null);
    setSelectedDm(null);
  };

  const send = async () => {
    const t = text.trim();
    if (!t || !user) return;
    if (!selectedCase && !selectedDm) return;
    setText('');
    try {
      if (selectedCase) {
        await sendCaseMessage(selectedCase.labId, selectedCase.caseId, {
          senderId: user.uid,
          senderRole: 'doctor',
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
      toast.error(ar ? 'تعذر الإرسال' : 'Could not send');
    }
  };

  const selected = selectedCase || selectedDm;

  // This screen renders its own in-chat header (back button + avatar + name)
  // once a conversation is open, stacked underneath the native Stack header
  // from _layout.tsx — two header bars was eating into the keyboard math:
  // Android's `KeyboardAvoidingView behavior="height"` only shrinks its own
  // (JS-measured) tree, so it has no idea the native header above it exists,
  // and the input row stayed short of the keyboard by roughly that header's
  // height. Hiding the native header while a chat is open removes the part
  // the JS layout can't see, so "height" shrinks the right amount.
  useEffect(() => {
    navigation.setOptions({ headerShown: !selected });
  }, [selected, navigation]);

  if (!selected) {
    const empty = convs.length === 0 && dmThreads.length === 0;
    return (
      <Screen>
        <Text className="text-xl font-extrabold text-slate-800">{ar ? 'الرسائل' : 'Messages'}</Text>

        {empty ? (
          <View className="items-center py-16">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-sky-100">
              <MessageCircle size={34} color="#3B82F6" strokeWidth={1.8} />
            </View>
            <Text className="font-bold text-slate-500">{ar ? 'لا توجد محادثات' : 'No conversations'}</Text>
            <Text className="mt-1 text-center text-xs text-slate-400">
              {ar ? 'ابدأ محادثة من صفحة أي حساب' : 'Start a chat from any account’s profile'}
            </Text>
          </View>
        ) : (
          <View className="mt-3 gap-1.5">
            {dmThreads.map((t) => {
              const oid = t.participants.find((p) => p !== user?.uid) ?? '';
              const name = t.names[oid] || (ar ? 'مستخدم' : 'User');
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setSelectedDm(t)}
                  className="flex-row items-center gap-3 rounded-2xl px-3 py-3"
                >
                  <Avatar photo={t.photos[oid]} label={name} />
                  <View className="min-w-0 flex-1">
                    <Text className="truncate text-sm font-bold text-slate-800">{name}</Text>
                    {!!t.lastMessage && (
                      <Text className="mt-0.5 truncate text-xs text-slate-400">{t.lastMessage}</Text>
                    )}
                  </View>
                  <DmUnreadDot threadId={t.id} uid={user?.uid} />
                </Pressable>
              );
            })}

            {convs.length > 0 && (
              <>
                <Text className="mb-1 mt-4 text-xs font-bold text-slate-400">
                  {ar ? 'محادثات حالات المختبر' : 'Lab case conversations'}
                </Text>
                {convs.map((c) => (
                  <Pressable
                    key={c.caseId}
                    onPress={() => setSelectedCase(c)}
                    className="flex-row items-center gap-3 rounded-2xl px-3 py-3"
                  >
                    <Avatar label={c.patient} />
                    <View className="min-w-0 flex-1">
                      <Text className="truncate text-sm font-bold text-slate-800">{c.patient}</Text>
                      <Text className="mt-0.5 truncate text-xs text-slate-400">
                        {labNames[c.labId] || (ar ? 'المختبر' : 'Lab')} · {c.orderNo}
                      </Text>
                    </View>
                    <UnreadDot labId={c.labId} caseId={c.caseId} uid={user?.uid} />
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}
      </Screen>
    );
  }

  const headerName = selectedCase ? selectedCase.patient : otherName;
  const headerSubtitle = selectedCase ? labNames[selectedCase.labId] || (ar ? 'المختبر' : 'Lab') : '';

  return (
    <KeyboardAvoidingView
      // `behavior: undefined` on Android is a no-op — it does nothing and
      // just relies on the OS resizing the window (AndroidManifest already
      // sets windowSoftInputMode="adjustResize"), which is exactly why the
      // input stayed hidden behind the keyboard: that resize wasn't reaching
      // this screen's layout. "height" makes KeyboardAvoidingView shrink
      // itself by the keyboard's height directly (JS-driven, via RN's own
      // Keyboard show/hide events), independent of native window resize —
      // the same approach chat apps like WhatsApp/Telegram rely on.
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
    {/* `scroll` (default true) wraps Screen's children in a ScrollView, which
        breaks a chat layout: the input row is no longer pinned to the bottom
        of the viewport, it just flows after the messages list — so once the
        keyboard opens there's nothing keeping it in view. A chat screen needs
        a plain flex column instead. */}
    <Screen padded={false} scroll={false}>
      {/* Chat header */}
      <View className="flex-row items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Pressable onPress={closeChat} className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-card">
          <Text className="text-slate-600">‹</Text>
        </Pressable>
        <Avatar photo={selectedDm ? otherPhoto : undefined} label={headerName} />
        <View className="min-w-0 flex-1">
          <Text className="truncate text-sm font-bold text-slate-800">{headerName}</Text>
          {!!headerSubtitle && <Text className="text-[11px] text-slate-400">{headerSubtitle}</Text>}
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 py-3"
        contentContainerClassName="gap-3"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {bubbles.length === 0 && (
          <Text className="mt-10 text-center text-xs text-slate-400">
            {ar ? 'ابدأ المحادثة…' : 'Start the conversation…'}
          </Text>
        )}
        {bubbles.map((m) => {
          const isMe = m.senderId === user?.uid;
          return (
            <View key={m.id} className={cn('flex-row', isMe ? 'justify-end' : 'justify-start')}>
              <View
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm',
                  isMe ? 'rounded-br-md bg-[#2563EB]' : 'rounded-bl-md border border-slate-200 bg-white',
                )}
              >
                {!!m.text && (
                  <Text className={cn('text-sm leading-relaxed', isMe ? 'text-white' : 'text-slate-800')}>
                    {m.text}
                  </Text>
                )}
                <Text className={cn('mt-0.5 text-[10px]', isMe ? 'text-end text-white/60' : 'text-start text-slate-400')}>
                  {timeLabel(m.createdAt)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Input */}
      <View className="flex-row items-end gap-2 border-t border-slate-200 bg-white px-3 py-3">
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={ar ? 'اكتب رسالتك…' : 'Type a message…'}
          placeholderTextColor="#94A3B8"
          multiline
          className="max-h-28 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800"
        />
        <Pressable
          onPress={send}
          disabled={!text.trim()}
          className="h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB] active:opacity-90 disabled:opacity-40"
        >
          <Send size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </Screen>
    </KeyboardAvoidingView>
  );
}
