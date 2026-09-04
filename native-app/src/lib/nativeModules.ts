// Detects whether a native module is compiled into the running app build.
// Requires the same registry that expo-modules-core's `requireNativeModule`
// uses (globalThis.expo.modules) so the check can never disagree with it.
// NOTE: do NOT fall back to legacy NativeModules here — on some runtimes it
// reports false positives for modules that are actually absent.
export function hasNativeModule(name: string): boolean {
  try {
    const g = globalThis as { expo?: { modules?: Record<string, unknown> } };
    if (g.expo?.modules && name in g.expo.modules) return true;
  } catch {
    /* ignore */
  }
  return false;
}
