import { useRef } from 'react';
import { Alert } from 'react-native';

// Product forms are long; closing one by mistake (✕, Android back, a stray
// tap) used to throw away everything typed. These ask first — but only when
// something was actually entered, so an untouched form still closes at once.
// Same API as the web app's src/lib/confirmClose.ts.

/**
 * True once the form's values differ from what it opened with. A form that
 * stays mounted and is refilled each time it opens passes `active` (its
 * open flag): the starting point is retaken whenever it opens.
 */
export function useFormDirty(values: unknown, active = true): boolean {
  const snapshot = JSON.stringify(values);
  const initial = useRef(snapshot);
  const wasActive = useRef(active);
  if (!active || !wasActive.current) initial.current = snapshot;
  wasActive.current = active;
  return active && snapshot !== initial.current;
}

/** A close handler that asks before discarding unsaved input. */
export function useConfirmClose(dirty: boolean, onClose: () => void, ar: boolean): () => void {
  return () => {
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert(
      ar ? 'الخروج بدون حفظ؟' : 'Leave without saving?',
      ar ? 'لديك بيانات لم تُحفظ، وستضيع إذا خرجت.' : 'You have unsaved input; it will be lost if you leave.',
      [
        { text: ar ? 'متابعة التعديل' : 'Keep editing', style: 'cancel' },
        { text: ar ? 'خروج' : 'Leave', style: 'destructive', onPress: onClose },
      ],
    );
  };
}
