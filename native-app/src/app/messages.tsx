// Messages: direct conversations with any account, and (for dentists) the
// chats of their lab cases. Mirrors the web's src/routes/messages.tsx; data in
// lib/directMessages.ts (identical in both apps).
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
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
  MessageCircle,
  MoreVertical,
  Search,
  SendHorizontal,
  X,
} from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { CaseChatModal } from '@/components/CaseChatModal';
import { useOrders } from '@/lib/ordersStore';
import { useDentistCases, filterLegacyOrders } from '@/lib/caseTracking';
import { useCaseUnreadCount } from '@/lib/caseMessages';
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
} from '@/lib/directMessages';
import { uploadDmImage, useDmImageUrl } from '@/lib/dmUpload';
import { useAccountCard, useAccountCards } from '@/lib/accountCards';
import { alertUploadError } from '@/lib/uploadAlert';
import { useSession, useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

const BLUE = '#2563EB';

type CaseConv = { labId: string; caseId: string; patient: string; orderNo: string; workType?: string };
type Peer = { id: string; name: string; photo: string; type: string };

function Avatar({ photo, name, type, size = 48 }: { photo?: string; name: string; type?: string; size?: number }) {
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: size / 2.6 }} className="bg-slate-100" />;
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2.6, backgroundColor: ACCOUNT_TYPE_COLOR[type ?? ''] ?? '#64748B' }}
      className="items-center justify-center"
    >
      <Text className="font-extrabold text-white" style={{ fontSize: size * 0.4 }}>
        {name.trim().charAt(0) || '؟'}
      </Text>
    </View>
  );
}

function CountBadge({ n }: { n: number }) {
  if (!n) return null;
  return (
    <View className="h-5 min-w-5 items-center justify-center rounded-full px-1.5" style={{ backgroundColor: BLUE }}>
      <Text className="text-[10px] font-bold text-white">{n > 99 ? '99+' : n}</Text>
    </View>
  );
}

export default function MessagesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const { role } = useUserRole();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ with?: string; withName?: string }>();
  const uid = user?.uid;
  const isDentist = role?.accountType === 'dentist';
  // Invited lab staff have no account doc — never show their email as a name.
  const myName = role
    ? [role.name, role.surname].filter(Boolean).join(' ').trim() || role.clinicName || (ar ? 'مستخدم' : 'User')
    : user?.displayName || (ar ? 'كادر المختبر' : 'Lab staff');
  const myPhoto = role?.photoURL || '';

  const { threads, loading } = useDmThreads(uid);
  const [openThreadId, setOpenThreadId] = useState('');
  const [openCase, setOpenCase] = useState<CaseConv | null>(null);
  const [tab, setTab] = useState<'dm' | 'cases'>('dm');
  const [search, setSearch] = useState('');

  // Arriving from a "مراسلة" button (?with=accountId): open that conversation,
  // even before its first message exists.
  useEffect(() => {
    if (params.with && uid && params.with !== uid) setOpenThreadId(dmThreadId(uid, params.with));
  }, [params.with, uid]);

  const otherIds = threads.map((t) => otherParticipant(t, uid));
  const cards = useAccountCards(otherIds);
  const peerOf = (t: DmThread): Peer => {
    const id = otherParticipant(t, uid);
    const c = cards[id];
    return { id, name: c?.name || t.names?.[id] || (ar ? 'مستخدم' : 'User'), photo: c?.photoURL || t.photos?.[id] || '', type: c?.accountType ?? '' };
  };

  // Dentist's lab case chats.
  const localOrders = useOrders();
  const { cases: remoteCases } = useDentistCases(isDentist ? uid ?? '' : '');
  const caseConvs = useMemo<CaseConv[]>(() => {
    if (!isDentist) return [];
    const remote = remoteCases.map((c) => ({
      labId: c.labId || (c.order.targetLabId as string | undefined) || '',
      caseId: c.order.id,
      patient: c.order.patient || (ar ? 'مريض' : 'Patient'),
      orderNo: c.order.orderNumber || c.order.id.slice(0, 6),
      workType: c.order.workType,
    }));
    const ids = new Set(remote.map((r) => r.caseId));
    const doctorName = [role?.name, role?.surname].filter(Boolean).join(' ').trim();
    const legacy = filterLegacyOrders(localOrders, ids, doctorName).map((o) => ({
      labId: (o.targetLabId as string | undefined) || '',
      caseId: o.id,
      patient: o.patient || (ar ? 'مريض' : 'Patient'),
      orderNo: o.orderNumber || o.id.slice(0, 6),
      workType: o.workType,
    }));
    return Array.from(new Map([...remote, ...legacy].map((c) => [c.caseId, c])).values()).filter((c) => c.labId);
  }, [isDentist, remoteCases, localOrders, role?.name, role?.surname, ar]);
  const labCards = useAccountCards(caseConvs.map((c) => c.labId));

  // Android back / swipe while a conversation is open returns to the list —
  // unless it was opened from another screen's "مراسلة" button.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (!openThreadId || params.with) return;
        e.preventDefault();
        setOpenThreadId('');
      }),
    [navigation, openThreadId, params.with],
  );
  useEffect(() => {
    navigation.setOptions({ headerShown: !openThreadId });
  }, [openThreadId, navigation]);

  if (openThreadId && uid) {
    const t = threads.find((x) => x.id === openThreadId);
    const peerId = openThreadId.split('_').find((p) => p !== uid) ?? '';
    return (
      <ChatView
        ar={ar}
        uid={uid}
        threadId={openThreadId}
        peerId={peerId}
        fallbackName={t?.names?.[peerId] || params.withName || ''}
        fallbackPhoto={t?.photos?.[peerId] || ''}
        myName={myName}
        myPhoto={myPhoto}
        onBack={() => (params.with && router.canGoBack() ? router.back() : setOpenThreadId(''))}
      />
    );
  }

  const needle = search.trim().toLowerCase();
  const visibleThreads = threads.filter((t) => !needle || peerOf(t).name.toLowerCase().includes(needle));
  const visibleCases = caseConvs.filter(
    (c) => !needle || c.patient.toLowerCase().includes(needle) || (labCards[c.labId]?.name ?? '').toLowerCase().includes(needle),
  );
  const dmUnread = threads.reduce((n, t) => n + unreadFor(t, uid), 0);

  return (
    <Screen>
      <View className="mb-3 flex-row items-center rounded-2xl border border-slate-200 bg-white px-3">
        <Search size={17} color="#94A3B8" />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={ar ? 'ابحث عن محادثة…' : 'Search conversations…'}
          placeholderTextColor="#94A3B8"
          className="h-11 flex-1 px-2 text-sm text-slate-800"
          style={{ textAlign: ar ? 'right' : 'left' }}
        />
      </View>

      {isDentist && (
        <View className="mb-3 flex-row gap-1 rounded-2xl bg-slate-100 p-1">
          {(
            [
              ['dm', ar ? 'المحادثات' : 'Chats', dmUnread],
              ['cases', ar ? 'محادثات الحالات' : 'Case chats', 0],
            ] as const
          ).map(([id, label, n]) => (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              className={cn('h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl', tab === id && 'bg-white')}
            >
              <Text className={cn('text-xs font-bold', tab === id ? 'text-slate-900' : 'text-slate-500')}>{label}</Text>
              <CountBadge n={n} />
            </Pressable>
          ))}
        </View>
      )}

      {tab === 'dm' || !isDentist ? (
        loading ? (
          <ActivityIndicator className="py-16" color={BLUE} />
        ) : visibleThreads.length === 0 ? (
          <EmptyState ar={ar} isDentist={isDentist} searching={!!needle} />
        ) : (
          <View className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
            {visibleThreads.map((t, i) => {
              const p = peerOf(t);
              const n = unreadFor(t, uid);
              const mine = t.lastSenderId === uid;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setOpenThreadId(t.id)}
                  className={cn('flex-row items-center gap-3 px-4 py-3.5 active:bg-slate-50', i > 0 && 'border-t border-slate-100')}
                >
                  <Avatar photo={p.photo} name={p.name} type={p.type} />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text numberOfLines={1} className={cn('flex-1 text-[15px] text-slate-900', n ? 'font-extrabold' : 'font-bold')}>
                        {p.name}
                      </Text>
                      <Text className={cn('text-[11px]', n ? 'font-bold text-blue-600' : 'text-slate-400')}>{dmListTime(t.lastMessageAt, ar)}</Text>
                    </View>
                    <View className="mt-0.5 flex-row items-center gap-2">
                      <Text numberOfLines={1} className={cn('flex-1 text-[13px]', n ? 'font-semibold text-slate-700' : 'text-slate-500')}>
                        {mine ? (ar ? 'أنت: ' : 'You: ') : ''}
                        {t.lastMessage}
                      </Text>
                      {isBlocked(t) ? <Ban size={14} color="#94A3B8" /> : <CountBadge n={n} />}
                    </View>
                    {!!p.type && (
                      <Text className="mt-1 text-[10px] font-semibold" style={{ color: ACCOUNT_TYPE_COLOR[p.type] ?? '#64748B' }}>
                        {ACCOUNT_TYPE_LABEL[p.type]?.[ar ? 'ar' : 'en']}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )
      ) : visibleCases.length === 0 ? (
        <View className="items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14">
          <FlaskConical size={34} color="#CBD5E1" />
          <Text className="mt-3 font-bold text-slate-600">{ar ? 'لا توجد محادثات حالات' : 'No case chats'}</Text>
          <Text className="mt-1 text-center text-xs leading-5 text-slate-400">
            {ar ? 'عند إرسال حالة لمختبر تظهر محادثتها هنا.' : 'Cases you send to a lab show up here.'}
          </Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-3xl border border-slate-100 bg-white">
          {visibleCases.map((c, i) => (
            <CaseRow key={c.caseId} c={c} uid={uid} labName={labCards[c.labId]?.name} ar={ar} first={i === 0} onPress={() => setOpenCase(c)} />
          ))}
        </View>
      )}

      {openCase && uid && (
        <CaseChatModal
          visible
          onClose={() => setOpenCase(null)}
          ar={ar}
          labId={openCase.labId}
          caseId={openCase.caseId}
          currentUserId={uid}
          senderRole="doctor"
          senderName={myName}
          counterpartId={openCase.labId}
          context={{
            patient: openCase.patient,
            orderNumber: openCase.orderNo,
            workType: openCase.workType,
            counterpartName: labCards[openCase.labId]?.name,
          }}
        />
      )}
    </Screen>
  );
}

function CaseRow({
  c,
  uid,
  labName,
  ar,
  first,
  onPress,
}: {
  c: CaseConv;
  uid?: string;
  labName?: string;
  ar: boolean;
  first: boolean;
  onPress: () => void;
}) {
  const n = useCaseUnreadCount(c.labId, c.caseId, uid);
  return (
    <Pressable onPress={onPress} className={cn('flex-row items-center gap-3 px-4 py-3.5 active:bg-slate-50', !first && 'border-t border-slate-100')}>
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-violet-50">
        <FlaskConical size={22} color="#7C3AED" />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className={cn('text-[15px] text-slate-900', n ? 'font-extrabold' : 'font-bold')}>
          {c.patient}
        </Text>
        <Text numberOfLines={1} className="mt-0.5 text-[13px] text-slate-500">
          {labName || (ar ? 'المختبر' : 'Lab')} · {c.orderNo}
        </Text>
      </View>
      <CountBadge n={n} />
    </Pressable>
  );
}

function EmptyState({ ar, isDentist, searching }: { ar: boolean; isDentist: boolean; searching: boolean }) {
  return (
    <View className="items-center rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-14">
      <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-sky-50">
        <MessageCircle size={34} color="#3B82F6" strokeWidth={1.8} />
      </View>
      <Text className="font-bold text-slate-600">{searching ? (ar ? 'لا نتائج' : 'No results') : ar ? 'لا توجد محادثات بعد' : 'No conversations yet'}</Text>
      {!searching && (
        <Text className="mt-1 text-center text-xs leading-5 text-slate-400">
          {isDentist
            ? ar
              ? 'افتح صفحة أي مورد أو مختبر أو شركة زرعات واضغط «مراسلة».'
              : 'Open any supplier, lab or implant company and tap “Message”.'
            : ar
              ? 'ستظهر هنا رسائل الأطباء. ويمكنك مراسلة أي طبيب من صفحة الأطباء أو من طلباته.'
              : 'Dentists’ messages appear here. Message a dentist from Doctors or their orders.'}
        </Text>
      )}
    </View>
  );
}

/* ── Conversation ──────────────────────────────────────────── */

type Pending = { id: string; text: string; localUri?: string; failed?: boolean };

function ChatView({
  ar,
  uid,
  threadId,
  peerId,
  fallbackName,
  fallbackPhoto,
  myName,
  myPhoto,
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
  onBack: () => void;
}) {
  const thread = useDmThread(threadId);
  const { messages, loading } = useDmMessages(threadId);
  const card = useAccountCard(peerId);
  const peer: Peer = {
    id: peerId,
    name: card?.name || fallbackName || (ar ? 'مستخدم' : 'User'),
    photo: card?.photoURL || fallbackPhoto,
    type: card?.accountType ?? '',
  };
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [busyImage, setBusyImage] = useState(false);
  const [viewer, setViewer] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const BackIcon = ar ? ChevronRight : ChevronLeft;
  const blockedByMe = !!thread?.blockedBy?.includes(uid);
  const blocked = isBlocked(thread);

  useEffect(() => {
    markDmThreadRead(thread, uid);
  }, [thread, uid, messages.length]);

  const send = async (opts: { text?: string; image?: { uri: string; name?: string | null; type?: string | null; width?: number; height?: number } }) => {
    const body = (opts.text ?? '').trim();
    if (!body && !opts.image) return;
    const id = `p_${Date.now()}`;
    setPending((p) => [...p, { id, text: body, localUri: opts.image?.uri }]);
    try {
      const image = opts.image ? await uploadDmImage(threadId, opts.image) : undefined;
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
      if ((e as Error)?.message === 'blocked') toast.error(ar ? 'لا يمكن الإرسال في هذه المحادثة' : 'You can’t send in this conversation');
      else if (opts.image) alertUploadError(e, ar);
      else toast.error(ar ? 'لم تُرسل الرسالة — اضغط عليها لإعادة المحاولة' : 'Not sent — tap it to retry');
    }
  };

  const sendText = () => {
    const t = text;
    if (!t.trim()) return;
    setText('');
    void send({ text: t });
  };

  const retry = (p: Pending) => {
    setPending((list) => list.filter((x) => x.id !== p.id));
    if (p.localUri) return; // photos are re-picked
    void send({ text: p.text });
  };

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });
    if (res.canceled || !res.assets?.length) return;
    const a = res.assets[0];
    setBusyImage(true);
    await send({ image: { uri: a.uri, name: a.fileName, type: a.mimeType, width: a.width, height: a.height } });
    setBusyImage(false);
  };

  const menu = () =>
    Alert.alert(peer.name, undefined, [
      { text: ar ? 'عرض الملف' : 'View profile', onPress: () => router.push({ pathname: '/profile/[accountId]', params: { accountId: peerId } }) },
      ...(thread
        ? [
            {
              text: blockedByMe ? (ar ? 'إلغاء الحظر' : 'Unblock') : ar ? 'حظر المحادثة' : 'Block',
              style: 'destructive' as const,
              onPress: () =>
                setDmBlocked(threadId, uid, !blockedByMe)
                  .then(() => toast.success(blockedByMe ? (ar ? 'تم إلغاء الحظر' : 'Unblocked') : ar ? 'تم حظر المحادثة' : 'Blocked'))
                  .catch(() => toast.error(ar ? 'تعذّر التنفيذ' : 'Failed')),
            },
            {
              text: ar ? 'إبلاغ الإدارة' : 'Report',
              style: 'destructive' as const,
              onPress: () =>
                reportDmThread({ threadId, reporterId: uid, reportedId: peerId, reason: 'reported-from-app' })
                  .then(() => toast.success(ar ? 'وصل البلاغ للإدارة، شكراً لك' : 'Reported, thank you'))
                  .catch(() => toast.error(ar ? 'تعذّر الإبلاغ' : 'Failed')),
            },
          ]
        : []),
      { text: ar ? 'إغلاق' : 'Close', style: 'cancel' as const },
    ]);

  const confirmDelete = (m: DmMessage) =>
    Alert.alert(ar ? 'حذف الرسالة؟' : 'Delete message?', ar ? 'ستُحذف عند الطرفين.' : 'It will be removed for both sides.', [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: ar ? 'حذف' : 'Delete', style: 'destructive', onPress: () => void deleteDmMessage(threadId, m.id).catch(() => {}) },
    ]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} keyboardVerticalOffset={0}>
      <Screen padded={false} scroll={false}>
        {/* Header */}
        <View className="flex-row items-center gap-3 border-b border-slate-100 bg-white px-3 py-2.5">
          <Pressable onPress={onBack} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full bg-slate-50">
            <BackIcon size={22} color="#0F172A" />
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/profile/[accountId]', params: { accountId: peerId } })}
            className="flex-1 flex-row items-center gap-2.5"
          >
            <Avatar photo={peer.photo} name={peer.name} type={peer.type} size={40} />
            <View className="flex-1">
              <Text numberOfLines={1} className="text-[15px] font-bold text-slate-900">
                {peer.name}
              </Text>
              {!!peer.type && (
                <Text numberOfLines={1} className="text-[11px] text-slate-500">
                  {ACCOUNT_TYPE_LABEL[peer.type]?.[ar ? 'ar' : 'en']}
                </Text>
              )}
            </View>
          </Pressable>
          <Pressable onPress={menu} hitSlop={8} className="h-10 w-10 items-center justify-center rounded-full">
            <MoreVertical size={20} color="#475569" />
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1 bg-[#F4F7FB]"
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 12, gap: 4 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <ActivityIndicator className="py-10" color={BLUE} />
          ) : messages.length === 0 && pending.length === 0 ? (
            <View className="items-center py-16">
              <Avatar photo={peer.photo} name={peer.name} type={peer.type} size={72} />
              <Text className="mt-3 text-base font-bold text-slate-800">{peer.name}</Text>
              <Text className="mt-1 text-xs text-slate-500">{ar ? 'ابدأ المحادثة بكتابة رسالة' : 'Say hello to start the conversation'}</Text>
            </View>
          ) : (
            messages.map((m, i) => {
              const mine = m.senderId === uid;
              const prev = messages[i - 1];
              const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
              const grouped = !newDay && prev?.senderId === m.senderId;
              return (
                <View key={m.id}>
                  {newDay && (
                    <View className="my-3 items-center">
                      <View className="rounded-full bg-white px-3 py-1">
                        <Text className="text-[11px] font-semibold text-slate-500">{dmDayLabel(m.createdAt, ar)}</Text>
                      </View>
                    </View>
                  )}
                  <Bubble
                    m={m}
                    mine={mine}
                    grouped={grouped}
                    seen={mine && seenByOther(thread, uid, m)}
                    ar={ar}
                    onImage={setViewer}
                    onLongPress={mine && !m.deleted ? () => confirmDelete(m) : undefined}
                  />
                </View>
              );
            })
          )}
          {pending.map((p) => (
            <Pressable key={p.id} onPress={p.failed ? () => retry(p) : undefined} className="flex-row justify-end">
              <View className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2" style={{ backgroundColor: p.failed ? '#FEE2E2' : '#93C5FD' }}>
                {!!p.localUri && <Image source={{ uri: p.localUri }} style={{ width: 200, height: 150, borderRadius: 12 }} />}
                {!!p.text && <Text className={cn('text-[15px] leading-6', p.failed ? 'text-rose-800' : 'text-white')}>{p.text}</Text>}
                <View className="mt-0.5 flex-row items-center justify-end gap-1">
                  {p.failed ? (
                    <Text className="text-[10px] font-bold text-rose-700">{ar ? 'لم تُرسل — اضغط لإعادة المحاولة' : 'Not sent — tap to retry'}</Text>
                  ) : (
                    <Clock3 size={11} color="rgba(255,255,255,0.85)" />
                  )}
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {/* Input */}
        {blocked ? (
          <View className="flex-row items-center gap-3 border-t border-slate-100 bg-white px-4 py-4">
            <Ban size={18} color="#94A3B8" />
            <Text className="flex-1 text-xs leading-5 text-slate-500">
              {blockedByMe
                ? ar
                  ? 'حظرت هذه المحادثة. لن تصلك رسائل منها.'
                  : 'You blocked this conversation.'
                : ar
                  ? 'لا يمكن الإرسال في هذه المحادثة.'
                  : 'You can’t send messages here.'}
            </Text>
            {blockedByMe && (
              <Pressable onPress={() => void setDmBlocked(threadId, uid, false)} className="rounded-xl bg-slate-100 px-3 py-2">
                <Text className="text-xs font-bold text-slate-700">{ar ? 'إلغاء الحظر' : 'Unblock'}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="flex-row items-end gap-2 border-t border-slate-100 bg-white px-3 py-2.5">
            <Pressable onPress={pickImage} disabled={busyImage} className="h-11 w-11 items-center justify-center rounded-full bg-slate-50">
              {busyImage ? <ActivityIndicator color={BLUE} size="small" /> : <ImagePlus size={21} color="#475569" />}
            </Pressable>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={ar ? 'اكتب رسالتك…' : 'Type a message…'}
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={DM_MAX_LENGTH}
              className="max-h-32 min-h-11 flex-1 rounded-3xl bg-slate-50 px-4 py-2.5 text-[15px] text-slate-800"
              style={{ textAlign: ar ? 'right' : 'left', textAlignVertical: 'center' }}
            />
            {/* A clear send arrow: blue on light blue until there is text, then
                white on solid blue. It points the way the text reads. */}
            <Pressable
              onPress={sendText}
              disabled={!text.trim()}
              accessibilityRole="button"
              accessibilityLabel={ar ? 'إرسال' : 'Send'}
              className="h-12 w-12 items-center justify-center rounded-full"
              style={
                text.trim()
                  ? { backgroundColor: BLUE, shadowColor: '#1D4ED8', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }
                  : { backgroundColor: '#E8F1FE' }
              }
            >
              <SendHorizontal
                size={23}
                strokeWidth={2.4}
                color={text.trim() ? '#FFFFFF' : BLUE}
                style={{ transform: [{ scaleX: ar ? -1 : 1 }] }}
              />
            </Pressable>
          </View>
        )}
      </Screen>

      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer('')}>
        <Pressable className="flex-1 items-center justify-center bg-black/95" onPress={() => setViewer('')}>
          {!!viewer && <Image source={{ uri: viewer }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
          <View className="absolute right-5 top-12 h-10 w-10 items-center justify-center rounded-full bg-white/15">
            <X size={20} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function Bubble({
  m,
  mine,
  grouped,
  seen,
  ar,
  onImage,
  onLongPress,
}: {
  m: DmMessage;
  mine: boolean;
  grouped: boolean;
  seen: boolean;
  ar: boolean;
  onImage: (url: string) => void;
  onLongPress?: () => void;
}) {
  const url = useDmImageUrl(m.deleted ? undefined : m.image?.path);
  const ratio = m.image?.width && m.image?.height ? m.image.width / m.image.height : 4 / 3;
  const w = 220;
  return (
    <View className={cn('flex-row', mine ? 'justify-end' : 'justify-start', !grouped && 'mt-1.5')}>
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2',
          mine ? 'rounded-br-md' : 'rounded-bl-md border border-slate-100 bg-white',
        )}
        style={mine ? { backgroundColor: BLUE } : undefined}
      >
        {m.deleted ? (
          <Text className={cn('text-[13px] italic', mine ? 'text-white/75' : 'text-slate-400')}>
            {ar ? 'تم حذف هذه الرسالة' : 'This message was deleted'}
          </Text>
        ) : (
          <>
            {!!m.image && (
              <Pressable onPress={() => url && onImage(url)} className="mb-1 overflow-hidden rounded-xl bg-black/10">
                {url ? (
                  <Image source={{ uri: url }} style={{ width: w, height: Math.min(320, w / ratio) }} resizeMode="cover" />
                ) : (
                  <View style={{ width: w, height: Math.min(320, w / ratio) }} className="items-center justify-center">
                    <ActivityIndicator color={mine ? '#fff' : BLUE} />
                  </View>
                )}
              </Pressable>
            )}
            {!!m.text && <Text className={cn('text-[15px] leading-6', mine ? 'text-white' : 'text-slate-800')}>{m.text}</Text>}
          </>
        )}
        <View className="mt-0.5 flex-row items-center justify-end gap-1">
          <Text className={cn('text-[10px]', mine ? 'text-white/70' : 'text-slate-400')}>{dmTime(m.createdAt, ar)}</Text>
          {mine && !m.deleted && (seen ? <CheckCheck size={13} color="#BFDBFE" /> : <Check size={13} color="rgba(255,255,255,0.75)" />)}
        </View>
      </Pressable>
    </View>
  );
}
