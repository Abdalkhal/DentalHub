import { useEffect, useRef } from "react";

// Product forms are long; closing one by mistake (✕, a click outside, Esc,
// closing or reloading the tab) used to throw away everything typed. These
// ask first — but only when something was actually entered, so an untouched
// form still closes at once. Same API as native's src/lib/confirmClose.ts.

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
  // Closing or reloading the tab gets the browser's own "leave site?" prompt.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return () => {
    const msg = ar ? "لديك بيانات لم تُحفظ، وستضيع إذا خرجت. هل تريد الخروج؟" : "You have unsaved input; it will be lost if you leave. Leave anyway?";
    if (!dirty || window.confirm(msg)) onClose();
  };
}
