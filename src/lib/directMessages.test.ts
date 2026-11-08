import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/firebase/client", () => ({ db: {} }));
vi.mock("@/lib/notifications", () => ({ createNotification: async () => {} }));

import { dmDayLabel, dmListTime, dmThreadId, isBlocked, sameDay, seenByOther, unreadFor, type DmThread } from "./directMessages";

const ts = (iso: string) => ({ toDate: () => new Date(iso), toMillis: () => new Date(iso).getTime() }) as never;
const NOW = new Date("2026-11-04T15:00:00");

describe("thread ids", () => {
  it("is the same for both sides", () => {
    expect(dmThreadId("b", "a")).toBe("a_b");
    expect(dmThreadId("a", "b")).toBe("a_b");
  });
});

describe("times", () => {
  it("labels the list by recency", () => {
    expect(dmListTime(ts("2026-11-04T09:05:00"), true, NOW)).toBe("9:05 ص");
    expect(dmListTime(ts("2026-11-03T22:00:00"), true, NOW)).toBe("أمس");
    expect(dmListTime(ts("2026-11-01T10:00:00"), true, NOW)).toBe("الأحد");
    expect(dmListTime(ts("2026-10-01T10:00:00"), true, NOW)).toBe("1/10/26");
  });
  it("labels day separators", () => {
    expect(dmDayLabel(ts("2026-11-04T01:00:00"), true, NOW)).toBe("اليوم");
    expect(dmDayLabel(ts("2026-11-03T23:00:00"), true, NOW)).toBe("أمس");
    expect(sameDay(ts("2026-11-04T01:00:00"), ts("2026-11-04T23:00:00"))).toBe(true);
  });
});

describe("unread, seen, blocked", () => {
  const t: DmThread = {
    id: "a_b",
    participants: ["a", "b"],
    names: {},
    photos: {},
    lastMessage: "",
    lastMessageAt: null,
    lastSenderId: "a",
    unread: { b: 3 },
    readAt: { b: ts("2026-11-04T10:00:00") },
  };
  it("counts unread per side, synced on the thread", () => {
    expect(unreadFor(t, "b")).toBe(3);
    expect(unreadFor(t, "a")).toBe(0);
  });
  it("marks my messages seen once the other side read after them", () => {
    const m = (iso: string) => ({ id: "1", senderId: "a", text: "x", createdAt: ts(iso) });
    expect(seenByOther(t, "a", m("2026-11-04T09:59:00"))).toBe(true);
    expect(seenByOther(t, "a", m("2026-11-04T10:01:00"))).toBe(false);
  });
  it("is blocked when either side blocked", () => {
    expect(isBlocked(t)).toBe(false);
    expect(isBlocked({ ...t, blockedBy: ["b"] })).toBe(true);
  });
});
