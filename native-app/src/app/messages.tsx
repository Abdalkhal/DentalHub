import { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
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
import { useSession, useUserRole } from '@/lib/useAuth';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';

type Conv = { labId: string; caseId: string; patient: string; orderNo: string };

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

export default function MessagesScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const { role } = useUserRole();
  const localOrders = useOrders();
  const { cases: remoteCases } = useDentistCases(user?.uid ?? '');
  const doctorName = [role?.name, role?.surname].filter(Boolean).join(' ').trim();

  const [selected, setSelected] = useState<Conv | null>(null);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

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
      const snap = await getDocs(collection(db, 'user_roles'));
      const map: Record<string, string> = {};
      snap.docs.forEach((d) => {
        const u = d.data() as Record<string, unknown>;
        if (u.accountType === 'lab' && u.name) map[String(u.userId)] = String(u.name);
      });
      return map;
    },
    staleTime: 120_000,
  });

  const { messages, loading } = useCaseMessages(selected?.labId ?? '', selected?.caseId ?? '');

  useEffect(() => {
    if (selected && user?.uid) markCaseRead(selected.caseId, user.uid);
  }, [selected, messages.length, user?.uid]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [selected, messages.length]);

  const send = async () => {
    const t = text.trim();
    if (!t || !selected || !user) return;
    setText('');
    try {
      await sendCaseMessage(selected.labId, selected.caseId, {
        senderId: user.uid,
        senderRole: 'doctor',
        senderName: doctorName || user.displayName || user.email || 'Doctor',
        text: t,
      });
    } catch {
      toast.error(ar ? 'تعذر الإرسال' : 'Could not send');
    }
  };

  if (!selected) {
    return (
      <Screen>
        <Text className="text-xl font-extrabold text-slate-800">{ar ? 'الرسائل' : 'Messages'}</Text>
        <Text className="mt-0.5 text-xs text-slate-500">
          {ar ? 'محادثاتك مع المختبرات حول الحالات' : 'Your chats with labs about cases'}
        </Text>

        {convs.length === 0 ? (
          <View className="items-center py-16">
            <View className="mb-4 h-20 w-20 items-center justify-center rounded-3xl bg-sky-100">
              <MessageCircle size={34} color="#3B82F6" strokeWidth={1.8} />
            </View>
            <Text className="font-bold text-slate-500">{ar ? 'لا توجد محادثات' : 'No conversations'}</Text>
            <Text className="mt-1 text-center text-xs text-slate-400">
              {ar ? 'ستظهر المحادثات عند إرسال المختبر رسائل عن حالاتك' : 'Chats appear when labs message you about your cases'}
            </Text>
          </View>
        ) : (
          <View className="mt-3 gap-1.5">
            {convs.map((c) => (
              <Pressable
                key={c.caseId}
                onPress={() => setSelected(c)}
                className="flex-row items-center gap-3 rounded-2xl px-3 py-3"
              >
                <View className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2563EB]">
                  <Text className="text-lg font-extrabold text-white">{c.patient.charAt(0)}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text className="truncate text-sm font-bold text-slate-800">{c.patient}</Text>
                  </View>
                  <Text className="mt-0.5 truncate text-xs text-slate-400">
                    {labNames[c.labId] || (ar ? 'المختبر' : 'Lab')} · {c.orderNo}
                  </Text>
                </View>
                <UnreadDot labId={c.labId} caseId={c.caseId} uid={user?.uid} />
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
    );
  }

  const labName = labNames[selected.labId] || (ar ? 'المختبر' : 'Lab');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
    <Screen padded={false}>
      {/* Chat header */}
      <View className="flex-row items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <Pressable onPress={() => setSelected(null)} className="h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-card">
          <Text className="text-slate-600">‹</Text>
        </Pressable>
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-[#2563EB]">
          <Text className="text-lg font-extrabold text-white">{selected.patient.charAt(0)}</Text>
        </View>
        <View className="min-w-0 flex-1">
          <Text className="truncate text-sm font-bold text-slate-800">{selected.patient}</Text>
          <Text className="text-[11px] text-slate-400">{labName}</Text>
        </View>
        <Text className="text-xs font-bold text-emerald-600">{ar ? 'متصل' : 'Online'}</Text>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 py-3"
        contentContainerClassName="gap-3"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {!loading && messages.length === 0 && (
          <Text className="mt-10 text-center text-xs text-slate-400">
            {ar ? 'ابدأ المحادثة مع المختبر…' : 'Start the conversation…'}
          </Text>
        )}
        {messages.map((m) => {
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
                {(m.attachments ?? []).length > 0 && (
                  <Text className={cn('mt-1 text-[10px]', isMe ? 'text-white/70' : 'text-slate-400')}>
                    📎 {(m.attachments ?? []).join(', ')}
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
