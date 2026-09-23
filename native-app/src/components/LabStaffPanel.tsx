import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import {
  Building2,
  Mail,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';

import { Text, Input, Button } from '@/components/ui';
import {
  useLabMembers,
  inviteLabMember,
  updateLabMember,
  removeLabMember,
  roleForDepartment,
  type LabMember,
  type LabRole,
} from '@/lib/labMembersStore';
import { DEPARTMENTS, getDepartment } from '@/data/staffDepartments';
import type { StaffDepartment } from '@/lib/staffStore';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

// Ported from the web app's labs.staff.tsx ("كادر المختبر"): department cards
// derived from the real `lab_members` roster (not the "الفريق" flat list this
// tab used to be), with a working invite flow — `inviteLabMember` already
// existed in lib/labMembersStore.ts, unused until now.

const ROLE_LABELS: Record<LabRole, { ar: string; en: string; bg: string; text: string }> = {
  DESIGNER: { ar: 'مصمم CAD', en: 'Designer', bg: 'bg-sky-100', text: 'text-sky-700' },
  TECHNICIAN: { ar: 'فني', en: 'Technician', bg: 'bg-violet-100', text: 'text-violet-700' },
  ADMIN: { ar: 'إدارة', en: 'Admin', bg: 'bg-amber-100', text: 'text-amber-700' },
};
const ROLE_ORDER: LabRole[] = ['DESIGNER', 'TECHNICIAN', 'ADMIN'];

// Matching hex for each department's Lucide icon — `DepartmentDef.color` is a
// web Tailwind className string (e.g. "text-sky-600 bg-sky-50"); the `bg-*`
// half still works as a View className directly, but lucide-react-native
// icons take an explicit `color` prop rather than inheriting `currentColor`.
const DEPT_ICON_HEX: Record<StaffDepartment, string> = {
  cad_designer: '#0284C7',
  ceramist: '#DB2777',
  mix_tech: '#7C3AED',
  prosthetics_tech: '#D97706',
  sales: '#059669',
  zirconia: '#0891B2',
  acrylic: '#EA580C',
  admin_support: '#475569',
};

function Chips<T extends string>({ options, value, onChange, ar }: { options: { id: T; ar: string; en: string }[]; value: T; onChange: (v: T) => void; ar: boolean }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} className={cn('rounded-xl border px-3 py-2.5', active ? 'border-primary bg-primary/10' : 'border-slate-200 bg-white')}>
            <Text className={cn('text-xs font-bold', active ? 'text-primary' : 'text-slate-700')}>{ar ? o.ar : o.en}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function LabStaffPanel({ labId, ar }: { labId: string; ar: boolean }) {
  const { members } = useLabMembers(labId);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LabMember | null>(null);
  const [viewDeptId, setViewDeptId] = useState<StaffDepartment | null>(null);

  const filteredDepartments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DEPARTMENTS;
    return DEPARTMENTS.filter((d) => {
      const nameMatch = (ar ? d.ar : d.en).toLowerCase().includes(q);
      const memberMatch = members.some(
        (m) => m.department === d.id && (m.name.toLowerCase().includes(q) || (m.phone || '').includes(q) || (m.email || '').toLowerCase().includes(q)),
      );
      return nameMatch || memberMatch;
    });
  }, [search, ar, members]);

  const countFor = (id: StaffDepartment) => members.filter((m) => m.department === id).length;
  const membersOf = (id: StaffDepartment) => members.filter((m) => m.department === id);

  const openAdd = () => {
    setEditing(null);
    setShowForm(true);
  };
  const openEdit = (m: LabMember) => {
    setEditing(m);
    setShowForm(true);
  };

  const handleSave = async (data: { name: string; email: string; phone: string; role: LabRole; department: StaffDepartment; password: string }) => {
    if (editing) {
      await updateLabMember(labId, editing.id, { name: data.name, phone: data.phone, role: data.role, department: data.department });
      toast.success(ar ? 'تم تحديث بيانات العضو بنجاح' : 'Member updated successfully');
    } else {
      await inviteLabMember(labId, data);
      toast.success(
        ar
          ? `تم إنشاء الحساب — أعطِ ${data.name}: ${data.email} / ${data.password}`
          : `Account created — give ${data.name}: ${data.email} / ${data.password}`,
      );
    }
    setShowForm(false);
    setEditing(null);
  };

  const handleRemove = (m: LabMember) => {
    Alert.alert(ar ? 'إزالة عضو' : 'Remove member', m.name, [
      { text: ar ? 'إلغاء' : 'Cancel', style: 'cancel' },
      {
        text: ar ? 'إزالة' : 'Remove',
        style: 'destructive',
        onPress: () => {
          removeLabMember(m.id);
          toast.success(ar ? 'تم حذف العضو' : 'Member removed');
        },
      },
    ]);
  };

  const viewDept = viewDeptId ? getDepartment(viewDeptId) : undefined;
  const viewMembers = viewDeptId ? membersOf(viewDeptId) : [];

  return (
    <View className="gap-4">
      <Pressable onPress={openAdd} className="h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-sm">
        <UserPlus size={17} color="#FFFFFF" />
        <Text className="text-sm font-extrabold text-white">{ar ? 'دعوة عضو جديد' : 'Invite New Member'}</Text>
      </Pressable>

      <View className="flex-row items-center gap-3 rounded-2xl border border-slate-200 bg-card p-4 shadow-sm">
        <View className="h-12 w-12 items-center justify-center rounded-xl bg-sky-50">
          <Users size={22} color="#0284C7" />
        </View>
        <View>
          <Text className="text-xs font-semibold text-slate-500">{ar ? 'إجمالي الأعضاء' : 'Total Members'}</Text>
          <Text className="text-2xl font-extrabold text-slate-900">{members.length}</Text>
        </View>
      </View>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder={ar ? 'ابحث باسم العضو أو الوظيفة…' : 'Search by member or role…'}
        leftIcon={<Search size={16} color="#94A3B8" />}
      />

      {filteredDepartments.length === 0 ? (
        <Text className="py-8 text-center text-sm text-slate-400">{ar ? 'لا توجد نتائج مطابقة' : 'No matching departments'}</Text>
      ) : (
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {filteredDepartments.map((d) => {
            const Icon = d.icon;
            const count = countFor(d.id);
            const bgClass = d.color.split(' ').find((c) => c.startsWith('bg-')) ?? 'bg-slate-50';
            return (
              <View key={d.id} className="w-[48.5%] gap-3 rounded-2xl border border-slate-100 bg-card p-3.5 shadow-sm">
                <View className={cn('h-11 w-11 items-center justify-center rounded-xl', bgClass)}>
                  <Icon size={19} color={DEPT_ICON_HEX[d.id]} />
                </View>
                <View>
                  <Text numberOfLines={1} className="text-xs font-extrabold text-slate-800">{ar ? d.ar : d.en}</Text>
                  <Text className="mt-0.5 text-[10px] font-semibold text-slate-400">
                    {count} {ar ? 'أعضاء' : 'members'}
                  </Text>
                </View>
                <Text numberOfLines={2} className="text-[11px] leading-relaxed text-slate-500">
                  {ar ? d.descAr : d.descEn}
                </Text>
                <Pressable onPress={() => setViewDeptId(d.id)} className="h-9 flex-row items-center justify-center gap-1.5 rounded-xl bg-slate-100">
                  <UserCheck size={13} color="#334155" />
                  <Text className="text-[11px] font-bold text-slate-700">{ar ? 'عرض الأعضاء' : 'View Members'}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {showForm && (
        <MemberFormModal
          ar={ar}
          editing={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}

      {!!viewDeptId && !!viewDept && (
        <ViewMembersModal
          ar={ar}
          dept={viewDept}
          members={viewMembers}
          onClose={() => setViewDeptId(null)}
          onEdit={(m) => {
            setViewDeptId(null);
            openEdit(m);
          }}
          onRemove={handleRemove}
        />
      )}
    </View>
  );
}

function MemberFormModal({
  ar,
  editing,
  onClose,
  onSave,
}: {
  ar: boolean;
  editing: LabMember | null;
  onClose: () => void;
  onSave: (data: { name: string; email: string; phone: string; role: LabRole; department: StaffDepartment; password: string }) => Promise<void>;
}) {
  const [name, setName] = useState(editing?.name ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<LabRole>(editing?.role ?? 'DESIGNER');
  const [department, setDepartment] = useState<StaffDepartment>(editing?.department ?? 'cad_designer');
  const [busy, setBusy] = useState(false);
  // Shown inline rather than via the global toast: this form renders inside
  // a native `<Modal>`, which opens its own OS-level window layered above
  // everything else on the screen — including the app-root `ToastHost`. A
  // toast fired while this modal is open is set correctly but rendered
  // behind it, so it's invisible and the failure looks like the button did
  // nothing at all.
  const [formError, setFormError] = useState('');

  const changeDepartment = (d: StaffDepartment) => {
    setDepartment(d);
    setRole(roleForDepartment(d));
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!name.trim()) {
      setFormError(ar ? 'اسم العضو مطلوب' : 'Member name is required');
      return;
    }
    if (!editing) {
      if (!email.trim()) {
        setFormError(ar ? 'البريد الإلكتروني مطلوب للدعوة' : 'Email is required to invite');
        return;
      }
      if (password.length < 6) {
        setFormError(ar ? 'الرمز يجب أن يكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
        return;
      }
      if (password !== confirmPassword) {
        setFormError(ar ? 'الرمز وتأكيده غير متطابقين' : "Password and confirmation don't match");
        return;
      }
    }
    setBusy(true);
    try {
      await onSave({ name: name.trim(), email: email.trim(), phone: phone.trim(), role, department, password });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : ar ? 'فشل حفظ العضو' : 'Failed to save member');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View className="flex-1 justify-end bg-black/40">
        <ScrollView className="max-h-[90%] rounded-t-3xl bg-white p-5" contentContainerClassName="gap-3 pb-8">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-sky-50">
                <UserPlus size={16} color="#0284C7" />
              </View>
              <Text className="text-base font-extrabold text-slate-900">
                {editing ? (ar ? 'تعديل عضو' : 'Edit Member') : ar ? 'دعوة عضو جديد' : 'Invite New Member'}
              </Text>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <X size={15} color="#64748B" />
            </Pressable>
          </View>

          <Input value={name} onChangeText={setName} placeholder={ar ? 'اسم العضو' : 'Member name'} />

          {!editing && (
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="member@lab.com"
              autoCapitalize="none"
              keyboardType="email-address"
              leftIcon={<Mail size={14} color="#94A3B8" />}
              style={{ writingDirection: 'ltr' }}
            />
          )}

          {!editing && (
            <>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder={ar ? 'الرمز (٦ أحرف على الأقل)' : 'Password (min. 6 characters)'}
                secureTextEntry
                leftIcon={<ShieldCheck size={14} color="#94A3B8" />}
                style={{ writingDirection: 'ltr' }}
              />
              <Input
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder={ar ? 'تأكيد الرمز' : 'Confirm password'}
                secureTextEntry
                leftIcon={<ShieldCheck size={14} color="#94A3B8" />}
                style={{ writingDirection: 'ltr' }}
              />
            </>
          )}

          <View className="gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <ShieldCheck size={13} color="#64748B" />
              <Text className="text-xs font-bold text-slate-600">{ar ? 'الدور (الصلاحية)' : 'Role'}</Text>
            </View>
            <Chips options={ROLE_ORDER.map((r) => ({ id: r, ar: ROLE_LABELS[r].ar, en: ROLE_LABELS[r].en }))} value={role} onChange={setRole} ar={ar} />
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <Building2 size={13} color="#64748B" />
              <Text className="text-xs font-bold text-slate-600">{ar ? 'القسم' : 'Department'}</Text>
            </View>
            <Chips options={DEPARTMENTS.map((d) => ({ id: d.id, ar: d.ar, en: d.en }))} value={department} onChange={changeDepartment} ar={ar} />
          </View>

          {!!formError && (
            <Text className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">
              {formError}
            </Text>
          )}

          <Button
            title={editing ? (ar ? 'حفظ التعديلات' : 'Save Changes') : ar ? 'تأكيد' : 'Confirm'}
            loading={busy}
            onPress={handleSubmit}
          />
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ViewMembersModal({
  ar,
  dept,
  members,
  onClose,
  onEdit,
  onRemove,
}: {
  ar: boolean;
  dept: NonNullable<ReturnType<typeof getDepartment>>;
  members: LabMember[];
  onClose: () => void;
  onEdit: (m: LabMember) => void;
  onRemove: (m: LabMember) => void;
}) {
  const Icon = dept.icon;
  const bgClass = dept.color.split(' ').find((c) => c.startsWith('bg-')) ?? 'bg-slate-50';
  return (
    <Modal visible transparent animationType="fade">
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[85%] rounded-t-3xl bg-white" style={{ minHeight: 260 }}>
          <View className="flex-row items-center justify-between border-b border-slate-100 p-5">
            <View className="flex-row items-center gap-2.5">
              <View className={cn('h-9 w-9 items-center justify-center rounded-xl', bgClass)}>
                <Icon size={16} color={DEPT_ICON_HEX[dept.id]} />
              </View>
              <View>
                <Text className="text-base font-extrabold text-slate-900">{ar ? dept.ar : dept.en}</Text>
                <Text className="text-[11px] font-semibold text-slate-400">
                  {members.length} {ar ? 'أعضاء' : 'members'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} className="h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
              <X size={15} color="#64748B" />
            </Pressable>
          </View>

          <ScrollView contentContainerClassName="p-5 gap-2">
            {members.length === 0 ? (
              <View className="items-center py-10">
                <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <Users size={22} color="#94A3B8" />
                </View>
                <Text className="text-sm text-slate-400">{ar ? 'لا يوجد أعضاء في هذا القسم بعد' : 'No members in this department yet'}</Text>
              </View>
            ) : (
              members.map((m) => (
                <View key={m.id} className="flex-row items-center gap-3 rounded-xl border border-slate-100 bg-card px-3 py-2.5">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                    <Text className="text-sm font-extrabold text-slate-600">{m.name.charAt(0)}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text numberOfLines={1} className="flex-shrink text-sm font-semibold text-slate-800">{m.name}</Text>
                      <View className={cn('shrink-0 rounded-full px-1.5 py-0.5', ROLE_LABELS[m.role]?.bg ?? 'bg-slate-100')}>
                        <Text className={cn('text-[9px] font-bold', ROLE_LABELS[m.role]?.text ?? 'text-slate-500')}>
                          {ar ? ROLE_LABELS[m.role]?.ar : ROLE_LABELS[m.role]?.en}
                        </Text>
                      </View>
                    </View>
                    {!!m.email && (
                      <Text numberOfLines={1} className="text-xs text-slate-400" style={{ writingDirection: 'ltr' }}>{m.email}</Text>
                    )}
                    {!!m.phone && <Text className="text-xs text-slate-400" style={{ writingDirection: 'ltr' }}>{m.phone}</Text>}
                  </View>
                  <Pressable onPress={() => onEdit(m)} className="h-8 w-8 items-center justify-center rounded-lg bg-sky-50">
                    <Pencil size={13} color="#0284C7" />
                  </Pressable>
                  <Pressable onPress={() => onRemove(m)} className="h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
                    <Trash2 size={13} color="#F43F5E" />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
