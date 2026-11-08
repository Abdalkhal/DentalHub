import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { Ban, ChevronDown, History, ShieldCheck, Trash2, UserPlus } from 'lucide-react-native';

import { Code, MemberLine, ShareButton } from '@/components/ClinicTeam';
import { Text } from '@/components/ui';
import { useClinics } from '@/lib/clinicsStore';
import {
  activityTime,
  createStaffInvite,
  joinLink,
  removeClinicMember,
  revokeClinicInvite,
  setStaffPermissions,
  STAFF_PERMISSIONS,
  STAFF_RED_LINES,
  STAFF_TEMPLATES,
  staffTemplateOf,
  teamErrorMessage,
  togglePermission,
  useClinicActivity,
  useClinicTeam,
  type StaffMember,
  type StaffPermissions,
} from '@/lib/clinicTeam';
import { useSession } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

/** The on/off list, used when inviting and when changing a secretary later. */
function PermissionToggles({ value, onChange, disabled, ar }: { value: StaffPermissions; onChange: (next: StaffPermissions) => void; disabled?: boolean; ar: boolean }) {
  return (
    <View className="gap-1.5">
      {STAFF_PERMISSIONS.map((p) => {
        const on = !!value[p.key];
        return (
          <Pressable
            key={p.key}
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            disabled={disabled}
            onPress={() => onChange(togglePermission(value, p.key))}
            className={cn('flex-row items-center gap-3 rounded-xl border p-2.5', on ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white')}
            style={{ opacity: disabled ? 0.6 : 1 }}
          >
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-bold text-slate-800">{ar ? p.ar : p.en}</Text>
              <Text className="text-[10px] leading-4 text-slate-500">{ar ? p.hintAr : p.hintEn}</Text>
            </View>
            <View className={cn('h-5 w-9 justify-center rounded-full px-0.5', on ? 'items-end bg-primary' : 'items-start bg-slate-300')}>
              <View className="h-4 w-4 rounded-full bg-white" />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function TemplatePills({ value, onPick, ar }: { value: StaffPermissions; onPick: (p: StaffPermissions) => void; ar: boolean }) {
  const current = staffTemplateOf(value)?.id;
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {STAFF_TEMPLATES.map((t) => (
        <Pressable key={t.id} onPress={() => onPick(t.permissions)} className={cn('h-8 justify-center rounded-full border px-3', current === t.id ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}>
          <Text className={cn('text-[11px] font-bold', current === t.id ? 'text-primary-foreground' : 'text-slate-500')}>{ar ? t.ar : t.en}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const staffInviteMessage = (code: string, clinicName: string, ar: boolean) =>
  ar
    ? `دعوة للعمل في ${clinicName} على Dent Hub.\nافتح الرابط وأنشئ حسابك: ${joinLink(code)}\nتنتهي الدعوة بعد 7 أيام.`
    : `You're invited to work at ${clinicName} on Dent Hub.\nOpen the link and create your account: ${joinLink(code)}\nThe invite expires in 7 days.`;

const permissionCount = (p: StaffPermissions) => STAFF_PERMISSIONS.filter((x) => p[x.key]).length;

function StaffRow({ m, ar, busy, run }: { m: StaffMember; ar: boolean; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const template = staffTemplateOf(m.permissions);
  const save = (next: StaffPermissions) => void run(() => setStaffPermissions(m.id, next));
  const confirmStop = () =>
    Alert.alert(ar ? 'إيقاف الوصول' : 'Stop access', ar ? `إيقاف ${m.memberName}؟ يفقد الوصول إلى العيادة فوراً، ويبقى ما سجله.` : `Stop ${m.memberName}? They lose access at once; what they recorded stays.`, [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      { text: ar ? 'إيقاف' : 'Stop', style: 'destructive', onPress: () => void run(() => removeClinicMember(m.id)) },
    ]);
  return (
    <View className="rounded-xl border border-slate-200">
      <Pressable onPress={() => setOpen(!open)} className="flex-row items-center gap-2 p-3">
        <View className="min-w-0 flex-1">
          <MemberLine m={m} />
        </View>
        <View className="rounded-full bg-blue-50 px-2.5 py-1">
          <Text className="text-[10px] font-bold text-primary">
            {template ? (ar ? template.ar : template.en) : ar ? `${permissionCount(m.permissions)} من ${STAFF_PERMISSIONS.length}` : `${permissionCount(m.permissions)} of ${STAFF_PERMISSIONS.length}`}
          </Text>
        </View>
        <ChevronDown size={16} color="#94A3B8" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open && (
        <View className="gap-2.5 border-t border-slate-200 p-3">
          <TemplatePills value={m.permissions} onPick={save} ar={ar} />
          <PermissionToggles value={m.permissions} onChange={save} disabled={busy} ar={ar} />
          <Pressable disabled={busy} onPress={confirmStop} className="h-10 flex-row items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50">
            <Trash2 size={14} color="#BE123C" />
            <Text className="text-[11px] font-bold text-rose-700">{ar ? 'إيقاف الوصول فوراً' : 'Stop access now'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** The owner's side: invite secretaries, choose what each may do, see what they did. */
export function ClinicStaffCard({ ar }: { ar: boolean }) {
  const { user } = useSession();
  const { clinics, activeClinicId } = useClinics();
  const clinicName = clinics.find((c) => c.id === activeClinicId)?.name ?? '';
  const team = useClinicTeam(user?.uid, activeClinicId);
  const activity = useClinicActivity('ownerId', user?.uid, activeClinicId);
  const [inviting, setInviting] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [draft, setDraft] = useState<StaffPermissions>(STAFF_TEMPLATES[0].permissions);
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

  return (
    <View className="gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
          <ShieldCheck size={19} color="#7C3AED" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-extrabold text-slate-900">{ar ? 'السكرتارية' : 'Secretaries'}</Text>
          <Text className="text-[11px] leading-5 text-slate-500">{ar ? 'لكل سكرتير حسابه، ويرى فقط ما تسمح به أنت' : 'Each has their own account and sees only what you allow'}</Text>
        </View>
        <Pressable onPress={() => setInviting(!inviting)} className="h-10 flex-row items-center gap-1.5 rounded-xl bg-primary px-3">
          <UserPlus size={15} color="#FFFFFF" />
          <Text className="text-xs font-bold text-primary-foreground">{ar ? 'دعوة' : 'Invite'}</Text>
        </Pressable>
      </View>

      {inviting && (
        <View className="gap-2.5 rounded-xl bg-slate-50 p-3">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'ابدأ بقالب، ثم عدّل كما تريد' : 'Start from a template, then adjust'}</Text>
          <TemplatePills value={draft} onPick={setDraft} ar={ar} />
          <PermissionToggles value={draft} onChange={setDraft} ar={ar} />
          <View className="rounded-xl border border-slate-200 bg-white p-2.5">
            <View className="mb-1 flex-row items-center gap-1">
              <Ban size={13} color="#BE123C" />
              <Text className="text-[11px] font-bold text-rose-700">{ar ? 'لا يستطيع السكرتير أبداً' : 'A secretary can never'}</Text>
            </View>
            <Text className="text-[10px] leading-4 text-slate-500">{STAFF_RED_LINES.map((l) => (ar ? l.ar : l.en)).join(ar ? '، ' : ', ')}</Text>
          </View>
          <Pressable
            disabled={busy || !activeClinicId}
            onPress={() =>
              void run(async () => {
                await createStaffInvite(activeClinicId, draft);
                setInviting(false);
              })
            }
            className="h-11 items-center justify-center rounded-xl bg-primary"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-xs font-bold text-primary-foreground">{ar ? 'إنشاء الدعوة' : 'Create invite'}</Text>}
          </Pressable>
        </View>
      )}

      {!!error && <Text className="text-xs font-medium text-rose-600">{error}</Text>}

      {team.staffInvites.length > 0 && (
        <View className="gap-2">
          <Text className="text-[11px] font-bold text-slate-500">{ar ? 'دعوات لم تُقبل بعد' : 'Open invites'}</Text>
          {team.staffInvites.map((i) => (
            <View key={i.code} className="gap-2 rounded-xl border border-slate-200 p-3">
              <Pressable disabled={busy} onPress={() => void run(() => revokeClinicInvite(i.code))} className="self-end">
                <Text className="text-[11px] font-bold text-rose-600">{ar ? 'إلغاء الدعوة' : 'Revoke'}</Text>
              </Pressable>
              <Code code={i.code} />
              <ShareButton text={staffInviteMessage(i.code, clinicName, ar)} ar={ar} />
            </View>
          ))}
        </View>
      )}

      {team.staff.length > 0 ? (
        <View className="gap-2">
          {team.staff.map((m) => (
            <StaffRow key={m.id} m={m} ar={ar} busy={busy} run={run} />
          ))}
        </View>
      ) : (
        !inviting &&
        team.staffInvites.length === 0 && (
          <View className="items-center rounded-xl border border-dashed border-slate-200 py-5">
            <Text className="text-[11px] text-slate-500">{ar ? 'لا يوجد سكرتير بعد' : 'No secretaries yet'}</Text>
          </View>
        )
      )}

      {activity.length > 0 && (
        <View>
          <Pressable onPress={() => setShowLog(!showLog)} className="flex-row items-center gap-1.5">
            <History size={14} color="#64748B" />
            <Text className="flex-1 text-[11px] font-bold text-slate-500">{ar ? 'سجل النشاط' : 'Activity log'}</Text>
            <ChevronDown size={16} color="#94A3B8" style={{ transform: [{ rotate: showLog ? '180deg' : '0deg' }] }} />
          </Pressable>
          {showLog && (
            <View className="mt-2 gap-1">
              {activity.slice(0, 40).map((a) => (
                <View key={a.id} className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <Text className="text-[11px] text-slate-700">
                    <Text className="text-[11px] font-bold text-slate-800">{a.memberName}: </Text>
                    {a.message}
                  </Text>
                  <Text className="text-[10px] text-slate-400">{activityTime(a.at, ar)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
