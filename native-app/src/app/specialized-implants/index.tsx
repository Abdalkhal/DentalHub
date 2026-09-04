import { Image, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Brain, ShieldCheck, Sparkles, Zap } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen, Text } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

type System = { id: string; ar: string; en: string; descAr: string; descEn: string; img: number };

const SYSTEMS: System[] = [
  {
    id: 'subperiosteal',
    ar: 'زراعات تحت السمحاق',
    en: 'Subperiosteal Implant',
    descAr: 'إطار معدني مخصص يوضع على العظم للحالات ذات الفقد العظمي الشديد',
    descEn: 'Custom metal frame over bone for severe bone loss cases',
    img: require('../../../assets/specialized/spetialized_implant.jpg'),
  },
  {
    id: 'pterygoid',
    ar: 'زراعات الجناحية',
    en: 'Pterygoid Implant',
    descAr: 'تثبيت خلفي عبر الناتئ الجناحي للفك العلوي',
    descEn: 'Posterior anchorage through the pterygoid process',
    img: require('../../../assets/specialized/tiry_guid.jpg'),
  },
  {
    id: 'zygomatic',
    ar: 'زراعات الوجنة',
    en: 'Zygomatic Implant',
    descAr: 'رسوّ طويل في العظم الوجني لتفادي الترقيع',
    descEn: 'Long anchorage in the zygomatic bone avoiding grafts',
    img: require('../../../assets/specialized/zigumatic.jpg'),
  },
  {
    id: 'allonx',
    ar: 'حلول All-on-4® / All-on-X',
    en: 'All-on-4® / All-on-X',
    descAr: 'تركيبة فك كامل على 4 زرعات أو أكثر في جلسة واحدة',
    descEn: 'Full-arch prosthesis on 4+ implants in a single session',
    img: require('../../../assets/specialized/all_on4.jpg'),
  },
  {
    id: 'transsinus',
    ar: 'زراعات عبر الجيب الفكي',
    en: 'Trans Sinus Implant',
    descAr: 'زرع عبر الجيب الفكي العلوي للفك الخلفي الضعيف',
    descEn: 'Through the maxillary sinus for a weak posterior maxilla',
    img: require('../../../assets/specialized/tranus.jpg'),
  },
  {
    id: 'mesh',
    ar: 'شبكة تيتانيوم مخصصة ثلاثية الأبعاد',
    en: '3D Custom Titanium Mesh',
    descAr: 'شبكة مطبوعة ثلاثية الأبعاد لإعادة بناء العظم بدقة',
    descEn: '3D-printed mesh for precise bone reconstruction',
    img: require('../../../assets/specialized/3d_custom_mesh.jpg'),
  },
];

const FEATURES: { ar: string; en: string; icon: LucideIcon }[] = [
  { ar: 'نتائج تجميلية ووظيفية', en: 'Esthetic & functional outcomes', icon: Sparkles },
  { ar: 'تقليل الحاجة للترقيع', en: 'Less grafting required', icon: ShieldCheck },
  { ar: 'ثبات فوري عالٍ', en: 'High primary stability', icon: Zap },
  { ar: 'حلول للحالات المعقدة', en: 'Solutions for complex cases', icon: Brain },
];

export default function SpecializedImplantsIndex() {
  const { lang } = useI18n();
  const ar = lang === 'ar';

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-900">
        {ar ? 'الزرعات المتخصصة' : 'Specialized Implants'}
      </Text>
      <Text className="mt-1 text-xs text-slate-500">
        {ar
          ? 'حلول زرع متقدمة للحالات المعقدة وفقدان العظم الشديد'
          : 'Advanced implant solutions for complex cases and severe bone loss'}
      </Text>

      <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
        {SYSTEMS.map((s) => (
          <Pressable
            key={s.id}
            onPress={() =>
              router.push({
                pathname: '/specialized-implants/[category]',
                params: { category: s.id },
              } as never)
            }
            className="w-[48.5%] overflow-hidden rounded-2xl border border-slate-200 bg-card shadow-sm"
          >
            <View className="px-3.5 pb-2.5 pt-3">
              <Text className="text-sm font-bold leading-snug text-slate-800">{s.ar}</Text>
              <Text className="mt-0.5 truncate text-[11px] font-bold text-slate-800">{s.en}</Text>
            </View>
            <View className="h-32 overflow-hidden bg-slate-100">
              <Image source={s.img} className="h-full w-full" resizeMode="cover" />
            </View>
            <View className="px-3.5 pb-3.5 pt-2.5">
              <Text numberOfLines={3} className="text-[11px] leading-relaxed text-slate-500">
                {ar ? s.descAr : s.descEn}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      {/* Features banner */}
      <View className="mt-5 overflow-hidden rounded-3xl bg-[#1d4ed8] p-4 shadow-lg">
        <View className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
        <Text className="relative text-base font-extrabold text-white">
          {ar ? 'لماذا الزرعات المتخصصة؟' : 'Why specialized implants?'}
        </Text>
        <View className="relative mt-3 flex-row flex-wrap justify-between gap-y-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <View key={f.en} className="w-[48%] flex-row items-center gap-2 rounded-2xl bg-white/10 p-3">
                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <Icon size={16} color="#FFFFFF" />
                </View>
                <Text className="flex-1 text-[12px] font-bold leading-snug text-white">
                  {ar ? f.ar : f.en}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
