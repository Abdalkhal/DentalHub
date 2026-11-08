import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, Share, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronLeft, KeyRound, Share2, Trash2, UserPlus, Users, X } from 'lucide-react-native';

import { Text } from '@/components/ui';
import { useClinics } from '@/lib/clinicsStore';
import {
  clinicCodeMessage,
  createClinicInvite,
  getClinicJoinCode,
  inviteMessage,
  joinClinicWithCode,
  lookupClinicCode,
  removeClinicMember,
  resolveClinicRequest,
  revokeClinicInvite,
  roleHint,
  roleLabel,
  setClinicMemberRole,
  teamErrorMessage,
  useClinicTeam,
  useMyClinicMemberships,
  type ClinicMember,
  type ClinicRole,
  type CodeInfo,
} from '@/lib/clinicTeam';
import { MemberControls } from '@/components/ClinicTeamFinance';
import { useSession } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

const ROLES: ClinicRole[] = ['doctor', 'visitor'];

function RolePills({ value, onChange, ar }: { value: ClinicRole; onChange: (r: ClinicRole) => void; ar: boolean }) {
  return (
    <View className="flex-row gap-1.5">
      {ROLES.map((r) => (
        <Pressable
          key={r}
          onPress={() => onChange(r)}
          className={cn('h-8 justify-center rounded-full border px-3', value === r ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
        >
          <Text className={cn('text-[11px] font-bold', value === r ? 'text-primary-foreground' : 'text-slate-500')}>{roleLabel(r, ar)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ShareButton({ text, ar }: { text: string; ar: boolean }) {
  return (
    <Pressable onPress={() => void Share.share({ message: text })} className="h-10 flex-row items-center justify-center gap-1.5 rounded-xl bg-emerald-600">
      <Share2 size={14} color="#FFFFFF" />
      <Text className="text-[11px] font-bold text-white">{ar ? 'مشاركة (واتساب وغيره)' : 'Share (WhatsApp and more)'}</Text>
    </Pressable>
  );
}

export const Code = ({ code }: { code: string }) => (
  <Text selectable className="text-center text-lg font-extrabold text-slate-900" style={{ letterSpacing: 3, writingDirection: 'ltr' }}>
    {code}
  </Text>
);

export function MemberLine({ m }: { m: Pick<ClinicMember, 'memberName' | 'memberPhoto' | 'memberPhone'> }) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-100">
        {m.memberPhoto ? (
          <Image source={{ uri: m.memberPhoto }} className="h-full w-full" />
        ) : (
          <Text className="text-sm font-extrabold text-sky-700">{m.memberName.trim().charAt(0) || '?'}</Text>
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="text-xs font-bold text-slate-800">{m.memberName}</Text>
        {!!m.memberPhone && <Text className="text-[11px] text-slate-500" style={{ writingDirection: 'ltr' }}>{m.memberPhone}</Text>}
      </View>
    </View>
  );
}

/** The owner's side: invite doctors, answer requests, manage roles. */
export function ClinicTeamCard({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const { clinics, activeClinicId } = useClinics();
  const clinicName = clinics.find((c) => c.id === activeClinicId)?.name ?? '';
  const team = useClinicTeam(user?.uid, activeClinicId);
  const [panel, setPanel] = useState<'invite' | 'code' | null>(null);
  const [role, setRole] = useState<ClinicRole>('doctor');
  const [clinicCode, setClinicCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  const openCode = () => {
    setPanel('code');
    if (!clinicCode && activeClinicId) {
      void run(async () => setClinicCode((await getClinicJoinCode(activeClinicId)).code));
    }
  };

  const confirmRemove = (m: ClinicMember) =>
    Alert.alert(ar ? 'إزالة من الفريق' : 'Remove from team', ar ? `إزالة ${m.memberName} من الفريق؟ تبقى المواعيد في عيادتك.` : `Remove ${m.memberName}? Appointments stay in your clinic.`, [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: ar ? 'إزالة' : 'Remove', style: 'destructive', onPress: () => void run(() => removeClinicMember(m.id)) },
    ]);

  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <Users size={19} color="#2563EB" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-extrabold text-slate-900">{ar ? 'فريق العيادة' : 'Clinic team'}</Text>
          <Text className="text-[11px] leading-5 text-slate-500">
            {clinicName ? `${clinicName} · ` : ''}{ar ? 'كل طبيب يدخل بحسابه ويعمل على مرضاه ومواعيده' : 'Each doctor uses their own account and works on their own patients'}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-2">
        <Pressable onPress={() => setPanel(panel === 'invite' ? null : 'invite')} className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary">
          <UserPlus size={16} color="#FFFFFF" />
          <Text className="text-xs font-bold text-primary-foreground">{ar ? 'دعوة طبيب' : 'Invite a doctor'}</Text>
        </Pressable>
        <Pressable onPress={openCode} className="h-11 flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white">
          <KeyRound size={16} color="#475569" />
          <Text className="text-xs font-bold text-slate-700">{ar ? 'رمز العيادة' : 'Clinic code'}</Text>
        </Pressable>
      </View>

      {panel === 'invite' && (
        <View className="gap-2 rounded-xl bg-slate-50 p-3">
          <RolePills value={role} onChange={setRole} ar={ar} />
          <Text className="text-[11px] text-slate-500">{roleHint(role, ar)}</Text>
          <Pressable
            disabled={busy || !activeClinicId}
            onPress={() => void run(() => createClinicInvite(activeClinicId, role))}
            className="h-10 items-center justify-center rounded-xl bg-primary"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            <Text className="text-xs font-bold text-primary-foreground">{ar ? 'إنشاء دعوة' : 'Create invite'}</Text>
          </Pressable>
        </View>
      )}

      {panel === 'code' && (
        <View className="gap-2 rounded-xl bg-slate-50 p-3">
          <Text className="text-[11px] leading-5 text-slate-500">
            {ar ? 'شاركه مع طبيب ليرسل طلب انضمام. لا ينضم أحد بهذا الرمز إلا بعد موافقتك.' : 'Share it so a doctor can send a request. Nobody joins until you approve.'}
          </Text>
          {clinicCode ? (
            <>
              <Code code={clinicCode} />
              <ShareButton text={clinicCodeMessage(clinicCode, clinicName, ar)} ar={ar} />
            </>
          ) : (
            busy && <ActivityIndicator color="#2563EB" />
          )}
        </View>
      )}

      {!!error && <Text className="text-xs font-medium text-rose-600">{error}</Text>}

      {team.requests.length > 0 && (
        <View className="gap-2">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'طلبات الانضمام' : 'Join requests'}</Text>
          {team.requests.map((m) => (
            <View key={m.id} className="gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <MemberLine m={m} />
              <View className="flex-row gap-2">
                <Pressable disabled={busy} onPress={() => void run(() => resolveClinicRequest(m.id, true, 'doctor'))} className="h-10 flex-1 items-center justify-center rounded-xl bg-primary">
                  <Text className="text-[11px] font-bold text-primary-foreground">{ar ? 'قبول كطبيب' : 'As doctor'}</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => void run(() => resolveClinicRequest(m.id, true, 'visitor'))} className="h-10 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <Text className="text-[11px] font-bold text-slate-700">{ar ? 'قبول كزائر' : 'As visitor'}</Text>
                </Pressable>
                <Pressable disabled={busy} onPress={() => void run(() => resolveClinicRequest(m.id, false))} className="h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <X size={16} color="#64748B" />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {team.invites.length > 0 && (
        <View className="gap-2">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'دعوات لم تُقبل بعد' : 'Open invites'}</Text>
          {team.invites.map((i) => (
            <View key={i.code} className="gap-2 rounded-xl border border-slate-200 p-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-[11px] font-bold text-slate-500">{i.role ? roleLabel(i.role, ar) : ''}</Text>
                <Pressable disabled={busy} onPress={() => void run(() => revokeClinicInvite(i.code))}>
                  <Text className="text-[11px] font-bold text-rose-600">{ar ? 'إلغاء الدعوة' : 'Revoke'}</Text>
                </Pressable>
              </View>
              <Code code={i.code} />
              <ShareButton text={inviteMessage(i.code, clinicName, ar)} ar={ar} />
            </View>
          ))}
        </View>
      )}

      {team.active.length > 0 && (
        <View className="gap-2">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'أعضاء الفريق' : 'Team members'}</Text>
          {team.active.map((m) => (
            <View key={m.id} className="gap-2 rounded-xl border border-slate-200 p-3">
              <MemberLine m={m} />
              <View className="flex-row items-center justify-between">
                <RolePills value={m.role} onChange={(r) => void run(() => setClinicMemberRole(m.id, r))} ar={ar} />
                <Pressable disabled={busy} onPress={() => confirmRemove(m)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                  <Trash2 size={14} color="#64748B" />
                </Pressable>
              </View>
              <MemberControls m={m} ar={ar} busy={busy} run={run} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

/** Enter a code (or arrive with one from a link), see what it is, confirm. */
export function JoinCodePanel({ ar, initialCode, onJoined }: { ar: boolean; initialCode?: string; onJoined?: () => void }) {
  const [code, setCode] = useState(initialCode ?? '');
  const [info, setInfo] = useState<CodeInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const check = async (value: string) => {
    if (!value.trim()) return;
    setBusy(true);
    setError('');
    setDone('');
    setInfo(null);
    try {
      setInfo(await lookupClinicCode(value));
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (initialCode) void check(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const confirm = async () => {
    if (!info) return;
    setBusy(true);
    setError('');
    try {
      const r = await joinClinicWithCode(info.code);
      setDone(
        r.status === 'active'
          ? ar ? `انضممت إلى ${r.clinicName}.` : `You joined ${r.clinicName}.`
          : ar ? `أُرسل طلبك إلى ${r.clinicName}. سيصلك إشعار عند الموافقة.` : `Request sent to ${r.clinicName}. You'll be notified.`,
      );
      setInfo(null);
      setCode('');
      onJoined?.();
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v.toUpperCase());
            setInfo(null);
            setError('');
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={ar ? 'رمز الدعوة أو رمز العيادة' : 'Invite or clinic code'}
          placeholderTextColor="#94A3B8"
          textAlignVertical="center"
          className="h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-800"
          style={{ textAlign: 'center', writingDirection: 'ltr' }}
        />
        <Pressable disabled={busy || !code.trim()} onPress={() => void check(code)} className="h-12 items-center justify-center rounded-xl bg-primary px-4" style={{ opacity: busy || !code.trim() ? 0.6 : 1 }}>
          {busy && !info ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-xs font-bold text-primary-foreground">{ar ? 'متابعة' : 'Continue'}</Text>}
        </Pressable>
      </View>
      {!!error && <Text className="text-xs font-medium text-rose-600">{error}</Text>}
      {!!done && (
        <View className="rounded-xl bg-emerald-50 p-3">
          <Text className="text-xs font-semibold text-emerald-800">{done}</Text>
        </View>
      )}
      {info && (
        <View className="gap-2 rounded-xl bg-blue-50 p-3">
          <Text className="text-sm font-extrabold text-blue-950">{info.clinicName}</Text>
          <Text className="text-[11px] text-blue-900">
            {ar ? `صاحب العيادة: ${info.ownerName}` : `Owner: ${info.ownerName}`}
            {info.role ? ` · ${roleLabel(info.role, ar)}` : ''}
          </Text>
          <Text className="text-[11px] leading-5 text-blue-900">
            {info.kind === 'invite'
              ? roleHint(info.role ?? 'doctor', ar)
              : ar ? 'سيصل طلبك إلى صاحب العيادة، وهو من يحدد دورك.' : 'The owner receives your request and sets your role.'}
          </Text>
          {info.role !== 'secretary' && (
            <Text className="text-[11px] leading-5 text-blue-900">
              {ar ? 'تبقى عيادتك ومرضاك الخاصون منفصلين، ولا يراهم صاحب هذه العيادة.' : 'Your own clinic and patients stay separate and private.'}
            </Text>
          )}
          {info.mine ? (
            <Text className="text-xs font-bold text-rose-600">{ar ? 'هذه عيادتك أنت' : 'This is your own clinic'}</Text>
          ) : (
            <Pressable disabled={busy} onPress={() => void confirm()} className="h-11 items-center justify-center rounded-xl bg-primary" style={{ opacity: busy ? 0.6 : 1 }}>
              <Text className="text-xs font-bold text-primary-foreground">
                {info.kind === 'invite' ? (ar ? 'قبول الدعوة' : 'Accept invite') : ar ? 'إرسال طلب الانضمام' : 'Send join request'}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/** The doctor's side: other clinics they work in, or asked to join. */
export function JoinedClinicsCard({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const list = useMyClinicMemberships(user?.uid);
  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View>
        <Text className="text-sm font-extrabold text-slate-900">{ar ? 'الانضمام إلى عيادة' : 'Join a clinic'}</Text>
        <Text className="text-[11px] text-slate-500">{ar ? 'أدخل الرمز الذي وصلك من صاحب العيادة.' : "Enter the code the clinic's owner gave you."}</Text>
      </View>
      <JoinCodePanel ar={ar} />
      {list.length > 0 && (
        <View className="gap-2">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'عيادات أعمل فيها' : 'Clinics I work in'}</Text>
          {list.map((m) =>
            m.status === 'active' ? (
              <Pressable
                key={m.id}
                onPress={() => router.push({ pathname: '/joined-clinic' as never, params: { ownerId: m.ownerId, clinicId: m.clinicId } })}
                className="flex-row items-center gap-2 rounded-xl border border-slate-200 p-3"
              >
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-xs font-bold text-slate-800">{m.clinicName}</Text>
                  <Text className="text-[11px] text-slate-500">{m.ownerName} · {roleLabel(m.role, ar)}</Text>
                </View>
                <ChevronLeft size={16} color="#94A3B8" />
              </Pressable>
            ) : (
              <View key={m.id} className="flex-row items-center gap-2 rounded-xl border border-slate-200 p-3">
                <View className="min-w-0 flex-1">
                  <Text numberOfLines={1} className="text-xs font-bold text-slate-800">{m.clinicName}</Text>
                  <Text className="text-[11px] text-amber-700">{ar ? 'بانتظار موافقة صاحب العيادة' : "Awaiting the owner's approval"}</Text>
                </View>
                <Pressable onPress={() => void removeClinicMember(m.id)}>
                  <Text className="text-[11px] font-bold text-rose-600">{ar ? 'سحب الطلب' : 'Withdraw'}</Text>
                </Pressable>
              </View>
            ),
          )}
        </View>
      )}
    </View>
  );
}
