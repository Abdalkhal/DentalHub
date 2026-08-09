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
