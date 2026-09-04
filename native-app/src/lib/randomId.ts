// Synchronous UUID v4 generator (not cryptographically secure). Used only for
// non-security identifiers (product ids, pack rows, etc.), matching the web
// app's `crypto.randomUUID()` usage.
export function randomUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
