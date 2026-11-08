import { useState } from 'react';
import { Alert, Linking, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, ChevronLeft, Phone, Plus, Users } from 'lucide-react-native';
import { DuesPanel } from '@/components/ClinicTeamFinance';

import { Screen, Text } from '@/components/ui';
import {
  canAddPatients,
  createSharedPatient,
  teamErrorMessage,
  useSharedPatients,
  removeClinicMember,
  roleHint,
  roleLabel,
  statusLabel,
  updateSharedAppointment,
  useMyClinicMemberships,
  useSharedAppointments,
  type SharedAppointment,
} from '@/lib/clinicTeam';
import { useI18n } from '@/lib/i18n';
import { useSession } from '@/lib/useAuth';
import { cn } from '@/lib/utils';

const STATUSES: SharedAppointment['status'][] = ['confirmed', 'waiting', 'completed', 'cancelled'];

export default function JoinedClinicScreen() {
  const { ownerId, clinicId } = useLocalSearchParams<{ ownerId: string; clinicId: string }>();
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useSession();
  const memberships = useMyClinicMemberships(user?.uid);
  const member = memberships.find((m) => m.ownerId === ownerId && m.clinicId === clinicId && m.status === 'active');
  const { list, loading } = useSharedAppointments(user?.uid, String(ownerId), String(clinicId));
  const [tab, setTab] = useState<'patients' | 'appointments' | 'dues'>('patients');
  const tabs: ['patients' | 'appointments' | 'dues', string][] = [
    ['patients', ar ? 'مرضاي' : 'My patients'],
    ['appointments', ar ? 'مواعيدي' : 'Appointments'],
    ['dues', ar ? 'مستحقاتي' : 'My dues'],
  ];

  const leave = () => {
    if (!member) return;
    Alert.alert(ar ? 'مغادرة العيادة' : 'Leave clinic', ar ? `مغادرة ${member.clinicName}؟ ستُزال مواعيدها من حسابك.` : `Leave ${member.clinicName}? Its appointments will be removed from your account.`, [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      {
        text: ar ? 'مغادرة' : 'Leave',
        style: 'destructive',
        onPress: () => void removeClinicMember(member.id).then(() => router.back()),
      },
    ]);
  };

  return (
    <Screen>
      <View className="gap-3">
        {member && (
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-sm font-extrabold text-slate-900">{member.clinicName}</Text>
            <Text className="mt-1 text-xs font-bold text-slate-600">{ar ? `صاحب العيادة: ${member.ownerName}` : `Owner: ${member.ownerName}`}</Text>
            <Text className="mt-1 text-[11px] leading-5 text-slate-500">
              {roleLabel(member.role, ar)} · {roleHint(member.role, ar)}
            </Text>
          </View>
        )}

        <View className="flex-row gap-1 rounded-2xl bg-slate-100 p-1">
          {tabs.map(([k, label]) => (
            <Pressable key={k} onPress={() => setTab(k)} className={cn('h-10 flex-1 items-center justify-center rounded-xl', tab === k && 'bg-white')}>
              <Text className={cn('text-[11px] font-bold', tab === k ? 'text-slate-900' : 'text-slate-500')}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'patients' && member && <PatientsTab ownerId={String(ownerId)} clinicId={String(clinicId)} uid={user?.uid} ar={ar} canAdd={canAddPatients(member)} />}
        {tab === 'dues' && member && (
          <View className="rounded-2xl border border-slate-200 bg-white p-4">
            <DuesPanel memberDocId={member.id} ar={ar} />
          </View>
        )}
        {tab === 'appointments' && !loading && list.length === 0 && (
          <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white py-12">
            <CalendarDays size={36} color="#CBD5E1" />
            <Text className="mt-2 text-xs font-semibold text-slate-500">
              {ar ? 'لم يُسند إليك أي موعد في هذه العيادة بعد' : 'No appointments assigned to you here yet'}
            </Text>
          </View>
        )}
        {tab === 'appointments' && list.map((a) => (
          <AppointmentCard key={a.id} a={a} ar={ar} canEdit={member?.role === 'doctor'} />
        ))}

        {member && (
          <Pressable onPress={leave} className="h-11 items-center justify-center rounded-xl border border-rose-200 bg-white">
            <Text className="text-xs font-bold text-rose-600">{ar ? 'مغادرة العيادة' : 'Leave clinic'}</Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

function PatientsTab({ ownerId, clinicId, uid, ar, canAdd }: { ownerId: string; clinicId: string; uid?: string; ar: boolean; canAdd: boolean }) {
  const { list, loading } = useSharedPatients(uid, ownerId, clinicId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [complaint, setComplaint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inp = 'h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800';
  const add = async () => {
    setBusy(true);
    setError('');
    try {
      await createSharedPatient(ownerId, clinicId, { name, phone, complaint });
      setAdding(false);
      setName('');
      setPhone('');
      setComplaint('');
    } catch (err) {
      setError(teamErrorMessage(err, ar));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View className="gap-2.5">
      {canAdd && (
        <Pressable onPress={() => setAdding((v) => !v)} className="h-11 flex-row items-center justify-center gap-1.5 rounded-2xl bg-primary">
          <Plus size={16} color="#FFFFFF" />
          <Text className="text-xs font-bold text-primary-foreground">{ar ? 'إضافة مريض إلى هذه العيادة' : 'Add a patient to this clinic'}</Text>
        </Pressable>
      )}
      {adding && (
        <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-3.5">
          <TextInput value={name} onChangeText={setName} placeholder={ar ? 'اسم المريض' : 'Patient name'} placeholderTextColor="#94A3B8" className={inp} />
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder={ar ? 'الهاتف' : 'Phone'} placeholderTextColor="#94A3B8" className={inp} />
          <TextInput value={complaint} onChangeText={setComplaint} placeholder={ar ? 'الشكوى الرئيسية' : 'Main complaint'} placeholderTextColor="#94A3B8" className={inp} />
          {!!error && <Text className="text-xs font-medium text-rose-600">{error}</Text>}
          <Pressable disabled={busy || !name.trim()} onPress={() => void add()} className="h-10 items-center justify-center rounded-xl bg-primary" style={{ opacity: busy || !name.trim() ? 0.5 : 1 }}>
            <Text className="text-xs font-bold text-primary-foreground">{ar ? 'حفظ' : 'Save'}</Text>
          </Pressable>
        </View>
      )}
      {!loading && list.length === 0 && (
        <View className="items-center rounded-2xl border border-dashed border-slate-200 bg-white py-12">
          <Users size={36} color="#CBD5E1" />
          <Text className="mt-2 text-xs font-semibold text-slate-500">
            {ar ? 'لم يُسند إليك أي مريض في هذه العيادة بعد' : 'No patients assigned to you here yet'}
          </Text>
        </View>
      )}
      {list.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => router.push({ pathname: '/shared-patient' as never, params: { ownerId, clinicId, patientId: p.id } })}
          className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-sky-100">
            <Text className="text-sm font-extrabold text-sky-700">{p.name.trim().charAt(0) || '?'}</Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-sm font-bold text-slate-900">{p.name}</Text>
            <Text className="text-[11px] text-slate-500">{p.fileNo}{p.lastVisit ? ` · ${p.lastVisit}` : ''}</Text>
          </View>
          <ChevronLeft size={16} color="#94A3B8" />
        </Pressable>
      ))}
    </View>
  );
}

function AppointmentCard({ a, ar, canEdit }: { a: SharedAppointment; ar: boolean; canEdit: boolean }) {
  const [notes, setNotes] = useState(a.notes);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const save = (patch: { status?: SharedAppointment['status']; notes?: string }) => {
    setBusy(true);
    setFailed(false);
    updateSharedAppointment(a.id, patch)
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  };
  return (
    <View className="gap-2 rounded-2xl border border-slate-200 bg-white p-3.5">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">{a.patientName}</Text>
          <Text className="text-[11px] text-slate-500" style={{ writingDirection: 'ltr', textAlign: 'right' }}>{a.date} {a.time}</Text>
        </View>
        {!canEdit && (
          <View className="rounded-full bg-slate-100 px-2.5 py-1">
            <Text className="text-[10px] font-bold text-slate-600">{statusLabel(a.status, ar)}</Text>
          </View>
        )}
      </View>
      {!!a.phone && (
        <Pressable onPress={() => void Linking.openURL(`tel:${a.phone}`)} className="flex-row items-center gap-1">
          <Phone size={12} color="#2563EB" />
          <Text className="text-[11px] font-semibold text-primary">{a.phone}</Text>
        </Pressable>
      )}
      {!!(a.treatment || a.appointmentType) && <Text className="text-[11px] text-slate-500">{a.treatment || a.appointmentType}</Text>}
      {canEdit ? (
        <>
          <View className="flex-row flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Pressable
                key={s}
                disabled={busy}
                onPress={() => s !== a.status && save({ status: s })}
                className={cn('h-8 justify-center rounded-full border px-3', a.status === s ? 'border-primary bg-primary' : 'border-slate-200 bg-white')}
              >
                <Text className={cn('text-[11px] font-bold', a.status === s ? 'text-primary-foreground' : 'text-slate-500')}>{statusLabel(s, ar)}</Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row gap-2">
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={ar ? 'ملاحظة' : 'Note'}
              placeholderTextColor="#94A3B8"
              textAlignVertical="center"
              className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-800"
            />
            {notes !== a.notes && (
              <Pressable disabled={busy} onPress={() => save({ notes })} className="h-11 items-center justify-center rounded-xl bg-primary px-4">
                <Text className="text-xs font-bold text-primary-foreground">{ar ? 'حفظ' : 'Save'}</Text>
              </Pressable>
            )}
          </View>
          {failed && <Text className="text-[11px] font-medium text-rose-600">{ar ? 'تعذر الحفظ. حاول مجدداً.' : 'Could not save. Try again.'}</Text>}
        </>
      ) : (
        !!a.notes && <Text className="text-[11px] text-slate-500">{a.notes}</Text>
      )}
    </View>
  );
}
