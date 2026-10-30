// Voice-note recorder for the case chat, built on expo-audio.
//
// IMPORTANT: never import this file statically. expo-audio calls
// requireNativeModule('ExpoAudio') at import time and crashes any app build
// that doesn't contain it (store builds before 1.0.2). CaseChatModal loads it
// with a guarded require — see `loadVoiceRecorder` there.
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { Mic, Square, Trash2 } from 'lucide-react-native';

import { Text } from '@/components/ui';

function fmt(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function VoiceRecorder({
  ar,
  disabled,
  onRecordingChange,
  onFinish,
  onError,
}: {
  ar: boolean;
  disabled?: boolean;
  onRecordingChange: (recording: boolean) => void;
  onFinish: (uri: string, durationMs: number) => void;
  onError: (message: string) => void;
}) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed(Date.now() - startedAt.current), 250);
    return () => clearInterval(t);
  }, [recording]);

  const start = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        onError(ar ? 'لم يُسمح باستخدام الميكروفون' : 'Microphone permission denied');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAt.current = Date.now();
      setElapsed(0);
      setRecording(true);
      onRecordingChange(true);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const stop = async (keep: boolean) => {
    const durationMs = Date.now() - startedAt.current;
    try {
      await recorder.stop();
    } catch {
      /* already stopped */
    }
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    setRecording(false);
    onRecordingChange(false);
    if (keep && recorder.uri && durationMs >= 700) onFinish(recorder.uri, durationMs);
  };

  if (!recording) {
    return (
      <Pressable
        onPress={start}
        disabled={disabled}
        className="h-11 w-11 items-center justify-center rounded-2xl bg-primary"
        style={{ opacity: disabled ? 0.4 : 1 }}
      >
        <Mic size={18} color="#FFFFFF" />
      </Pressable>
    );
  }

  return (
    <View className="flex-1 flex-row items-center gap-2">
      <Pressable onPress={() => stop(false)} className="h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
        <Trash2 size={17} color="#475569" />
      </Pressable>
      <View className="h-11 flex-1 flex-row items-center gap-2 rounded-2xl bg-rose-50 px-3">
        <View className="h-2.5 w-2.5 rounded-full bg-rose-500" />
        <Text className="text-xs font-bold text-rose-600">{ar ? 'جارٍ التسجيل' : 'Recording'}</Text>
        <Text className="ms-auto text-xs font-bold text-rose-600" style={{ writingDirection: 'ltr' }}>
          {fmt(elapsed)}
        </Text>
      </View>
      <Pressable onPress={() => stop(true)} className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
        <Square size={15} color="#FFFFFF" fill="#FFFFFF" />
      </Pressable>
    </View>
  );
}
