import { View } from 'react-native';

import { Screen, Card, Text } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

type Section = { title: { ar: string; en: string }; body: { ar: string; en: string }[] };

const SECTIONS: Section[] = [
  {
    title: { ar: 'البيانات التي نجمعها', en: 'Data we collect' },
    body: [
      {
        ar: 'بيانات الحساب عند التسجيل: الاسم، الدور، اسم العيادة/الشركة، المدينة، الهاتف/البريد.',
        en: 'Account data you provide at registration: name, role, clinic/company name, city, phone/email.',
      },
      {
        ar: 'بيانات تنشئها داخل التطبيق: المنتجات، العروض، الطلبات، سجلات المرضى، الوصفات، حالات المختبر، الرسائل والمرفقات، الإشعارات.',
        en: 'Data you create in the app: products, offers, orders, patient records (dentist-entered), prescriptions, lab cases, messages and chat attachments, notifications.',
      },
      {
        ar: 'رمز الإشعارات عند تفعيلها (يُستخدم للتوصيل فقط).',
        en: 'Device push token when you enable push notifications (stored only to deliver notifications).',
      },
      {
        ar: 'الصور المرفوعة إلى Firebase Storage.',
        en: 'Product/ad images you upload to Firebase Storage.',
      },
    ],
  },
  {
    title: { ar: 'كيف نستخدمها', en: 'How we use it' },
    body: [
      {
        ar: 'لتشغيل سوق المستلزمات وسير عمل الحالات بين الأدوار.',
        en: 'To operate the marketplace and lab-case workflow between the roles.',
      },
      {
        ar: 'لإرسال تحديثات الطلبات/الحالات والإشعارات التي توافق عليها.',
        en: 'To send order/case updates and notifications you opt into.',
      },
      {
        ar: 'لا تُباع بياناتك لأي طرف ثالث. تُستضاف البيانات لدى Firebase (Google) وفق معايير أمنية، وتحمي قواعد الأمان الوصول إليها.',
        en: 'Never sold to third parties. Firebase (Google) hosts data with its own security/compliance; Firestore/Storage access is protected by security rules.',
      },
    ],
  },
  {
    title: { ar: 'خياراتك', en: 'Your choices' },
    body: [
      {
        ar: 'يمكنك حذف محتواك داخل التطبيق، وطلب حذف الحساب عبر الدعم.',
        en: 'You can delete your own content in the app. Request account deletion by contacting support.',
      },
      {
        ar: 'الإشعارات اختيارية ويمكن إيقافها من إعدادات الجهاز أو التطبيق.',
        en: 'Push notifications are optional (turn off in device settings / the app).',
      },
    ],
  },
];

export default function PrivacyScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">
        {ar ? 'سياسة الخصوصية' : 'Privacy Policy'}
      </Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {ar ? 'آخر تحديث: سبتمبر 2026' : 'Last updated: September 2026'}
      </Text>

      <Card className="mt-4">
        <Text className="text-xs leading-relaxed text-slate-600">
          {ar
            ? 'تطبيق "دنت هب" يساعد عيادات الأسنان والمكاتب وشركات الزرعات والمختبرات على التواصل وتصفّح المنتجات وإدارة الحالات.'
            : 'Dent Hub ("the App") helps dental clinics, suppliers, implant companies and laboratories communicate, browse products and manage cases.'}
        </Text>
      </Card>

      <View className="mt-4 gap-3 pb-6">
        {SECTIONS.map((section) => (
          <Card key={section.title.en}>
            <Text className="text-sm font-extrabold text-slate-800">
              {ar ? section.title.ar : section.title.en}
            </Text>
            <View className="mt-2 gap-1.5">
              {section.body.map((line, i) => (
                <View key={i} className="flex-row items-start gap-1.5">
                  <Text className="text-xs text-slate-400">{'•'}</Text>
                  <Text className="flex-1 text-xs leading-relaxed text-slate-600">
                    {ar ? line.ar : line.en}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        ))}

        <Card>
          <Text className="text-sm font-extrabold text-slate-800">
            {ar ? 'للتواصل' : 'Contact'}
          </Text>
          <Text className="mt-2 text-xs leading-relaxed text-slate-600">
            {ar
              ? 'دعم التطبيق من قسم المساعدة أو رابط واتساب الظاهر داخل التطبيق.'
              : "Dent Hub support (via the app's Help section or WhatsApp link shown in-app)."}
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
