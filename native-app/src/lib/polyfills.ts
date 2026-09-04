// Runtime polyfills so verbatim-ported lib code works in React Native without
// edits. Import this module once at app startup (before any store reads).
import "./storage";
import { randomUUID } from "./randomId";

// ---- Minimal Event / CustomEvent ----
type Handler = (event: unknown) => void;
const eventListeners = new Map<string, Set<Handler>>();

class PolyEvent {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
}

class PolyCustomEvent {
  type: string;
  detail: unknown;
  constructor(type: string, opts?: { detail?: unknown }) {
    this.type = type;
    this.detail = opts?.detail;
  }
}

// ---- Minimal window EventTarget (for `window.addEventListener/dispatchEvent`) ----
(globalThis as Record<string, unknown>).Event = PolyEvent;
(globalThis as Record<string, unknown>).CustomEvent = PolyCustomEvent;
(globalThis as Record<string, unknown>).window = {
  addEventListener(type: string, cb: Handler) {
    let set = eventListeners.get(type);
    if (!set) {
      set = new Set();
      eventListeners.set(type, set);
    }
    set.add(cb);
  },
  removeEventListener(type: string, cb: Handler) {
    eventListeners.get(type)?.delete(cb);
  },
  dispatchEvent(event: { type: string }) {
    eventListeners.get(event.type)?.forEach((cb) => cb(event));
    return true;
  },
};

// ---- crypto.randomUUID polyfill (Hermes has no crypto.randomUUID) ----
const g = globalThis as { crypto?: { randomUUID?: unknown } };
if (!g.crypto?.randomUUID) {
  g.crypto = { ...(g.crypto ?? {}), randomUUID };
}
