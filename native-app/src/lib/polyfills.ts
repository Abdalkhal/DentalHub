// Runtime polyfills so verbatim-ported lib code works in React Native without
// edits. Import this module once at app startup (before any store reads).
import * as ExpoCrypto from "expo-crypto";

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
const g = globalThis as {
  crypto?: { randomUUID?: unknown; subtle?: { digest?: unknown } };
};
if (!g.crypto?.randomUUID) {
  g.crypto = { ...(g.crypto ?? {}), randomUUID };
}

// ---- crypto.subtle.digest polyfill ----
// Hermes has no WebCrypto. `storagePipeline.sha256Hex` (ported verbatim from the
// web app) calls `crypto.subtle.digest`, which would throw on the very first
// line of every case-file upload. expo-crypto's `digest` takes the same
// (algorithm, BufferSource) shape, so map the two algorithm spellings across.
if (!g.crypto?.subtle?.digest) {
  const ALGORITHMS: Record<string, ExpoCrypto.CryptoDigestAlgorithm> = {
    "SHA-1": ExpoCrypto.CryptoDigestAlgorithm.SHA1,
    "SHA-256": ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    "SHA-384": ExpoCrypto.CryptoDigestAlgorithm.SHA384,
    "SHA-512": ExpoCrypto.CryptoDigestAlgorithm.SHA512,
  };

  const digest = (
    algorithm: string | { name: string },
    data: Parameters<typeof ExpoCrypto.digest>[1],
  ): Promise<ArrayBuffer> => {
    const name = typeof algorithm === "string" ? algorithm : algorithm.name;
    const mapped = ALGORITHMS[name.toUpperCase()];
    if (!mapped) return Promise.reject(new Error(`Unsupported digest algorithm: ${name}`));
    return ExpoCrypto.digest(mapped, data);
  };

  g.crypto = { ...(g.crypto ?? {}), subtle: { ...(g.crypto?.subtle ?? {}), digest } };
}
