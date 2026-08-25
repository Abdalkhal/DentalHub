const FALLBACK_TIMEOUT = 10000;

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number = FALLBACK_TIMEOUT): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Operation timed out"));
    }, timeoutMs);
    promise
      .then((val) => { clearTimeout(timer); resolve(val); })
      .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

export function safeFirestoreGet<T>(
  getter: () => Promise<T>,
  fallback: T,
  timeoutMs?: number,
): Promise<T> {
  return withTimeout(getter(), timeoutMs).catch((err) => {
    console.warn("Firestore get failed, using fallback:", err);
    return fallback;
  });
}

/**
 * Recursively removes `undefined` values from a value before it is written to
 * Firestore (which rejects `undefined`). Undefined properties are replaced
 * with `null`; nested objects and arrays are traversed as well.
 */
export function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined) return null as T;
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeForFirestore(v)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeForFirestore(v);
    }
    return out as T;
  }
  return value;
}
