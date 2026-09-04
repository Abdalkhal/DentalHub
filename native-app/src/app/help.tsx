import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { Screen, Card, Text } from '@/components/ui';
import { helpTopics } from '@/data/help-topics';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export default function HelpScreen() {
  const { lang } = useI18n();
  const ar = lang === 'ar';
  const [open, setOpen] = useState<string | null>(null);

  return (
    <Screen>
      <Text className="text-xl font-extrabold text-slate-800">{ar ? 'المساعدة' : 'Help'}</Text>
      <Text className="mt-0.5 text-xs text-slate-500">
        {ar ? 'إجابات على الأسئلة الشائعة' : 'Answers to common questions'}
      </Text>

      <View className="mt-4 gap-3 pb-6">
        {helpTopics.map((topic) => {
          const Icon = topic.icon;
          const expanded = open === topic.slug;
          return (
            <Card key={topic.slug} className="p-0">
              <Pressable
                onPress={() => setOpen(expanded ? null : topic.slug)}
                className="flex-row items-center gap-3 px-4 py-3.5"
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <Icon size={20} color="#334155" strokeWidth={2.1} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-extrabold text-slate-800">
                    {ar ? topic.title.ar : topic.title.en}
                  </Text>
                  <Text numberOfLines={1} className="mt-0.5 text-[11px] text-slate-400">
                    {ar ? topic.intro.ar : topic.intro.en}
                  </Text>
                </View>
                <ChevronDown
                  size={18}
                  color="#94A3B8"
                  style={expanded ? { transform: [{ rotate: '180deg' }] } : undefined}
                />
              </Pressable>

              {expanded && (
                <View className="gap-2.5 border-t border-slate-100 px-4 py-3">
                  {topic.faqs.map((f, i) => (
                    <View key={i}>
                      <Text className="text-xs font-bold text-slate-800">
                        {ar ? f.q.ar : f.q.en}
                      </Text>
                      <Text className={cn('mt-0.5 text-xs leading-relaxed text-slate-500')}>
                        {ar ? f.a.ar : f.a.en}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
