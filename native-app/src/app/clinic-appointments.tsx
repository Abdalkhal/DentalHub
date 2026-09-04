import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';

import { Screen, Card, Button, Input, Text } from '@/components/ui';
import { useUserRole } from '@/lib/useAuth';
import { setAppointmentsStoreUser, useAppointments, addAppointment, removeAppointment } from '@/lib/appointmentsStore';
import { useI18n } from '@/lib/i18n';

export default function ClinicAppointmentsScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const { user } = useUserRole();
  useEffect(() => {
    if (user?.uid) setAppointmentsStoreUser(user.uid);
  }, [user?.uid]);

  const appointments = useAppointments();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <Screen>
      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-extrabold text-slate-800">{ar ? 'المواعيد' : 'Appointments'}</Text>
        <Button size="sm" title={ar ? '+ موعد' : '+ Add'} onPress={() => setShowAdd(true)} />
      </View>

      {appointments.length === 0 ? (
        <Text className="mt-10 text-center text-slate-500">{ar ? 'لا توجد مواعيد' : 'No appointments'}</Text>
      ) : (
        <View className="mt-4 space-y-3">
          {appointments.map((a) => (
            <Card key={a.id} className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-800">{a.patientName}</Text>
                <Text className="text-[11px] text-slate-400">
                  {a.date} · {a.time || '—'} {a.treatment ? `· ${a.treatment}` : ''}
                </Text>
              </View>
              <Button variant="ghost" title="✕" onPress={() => removeAppointment(a.id)} />
            </Card>
          ))}
        </View>
      )}

      <AddAppointmentModal open={showAdd} onClose={() => setShowAdd(false)} ar={ar} />
    </Screen>
  );
}

function AddAppointmentModal({
  open,
  onClose,
  ar,
}: {
  open: boolean;
  onClose: () => void;
  ar: boolean;
}) {
  const [patientName, setPatientName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('');
  const [treatment, setTreatment] = useState('');

  const save = () => {
    if (!patientName.trim()) return;
    addAppointment({
      patientName: patientName.trim(),
      phone: '',
      date,
      time: time.trim(),
      appointmentType: '',
      clinicRoom: '',
      doctor: '',
      treatment: treatment.trim(),
      notes: '',
      reminder: false,
    });
    setPatientName('');
    setTime('');
    setTreatment('');
    onClose();
  };

  return (
    <Modal visible={open} transparent animationType="slide">
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-3xl bg-white p-5 pb-8">
          <Text className="text-lg font-extrabold">{ar ? 'إضافة موعد' : 'Add appointment'}</Text>
          <View className="mt-4 space-y-3">
            <Input value={patientName} onChangeText={setPatientName} placeholder={ar ? 'اسم المريض' : 'Patient name'} />
            <Input value={date} onChangeText={setDate} placeholder={ar ? 'التاريخ (YYYY-MM-DD)' : 'Date (YYYY-MM-DD)'} />
            <Input value={time} onChangeText={setTime} placeholder={ar ? 'الوقت' : 'Time'} />
            <Input value={treatment} onChangeText={setTreatment} placeholder={ar ? 'العلاج' : 'Treatment'} />
          </View>
          <View className="mt-4 flex-row gap-2">
            <Button variant="outline" title={ar ? 'إلغاء' : 'Cancel'} onPress={onClose} className="flex-1" />
            <Button title={ar ? 'حفظ' : 'Save'} onPress={save} className="flex-1" />
          </View>
        </View>
      </View>
    </Modal>
  );
}
