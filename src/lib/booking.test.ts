import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/firebase/client", () => ({ db: {} }));

import {
  bookableDates,
  daySlots,
  effectiveStatus,
  freeSlots,
  isSlotTaken,
  normalizeIraqiPhone,
  qrPath,
  type BookingPage,
} from "./booking";

const page = (over: Partial<BookingPage> = {}): BookingPage => ({
  slug: "dr-x",
  ownerId: "u1",
  enabled: true,
  doctorName: "د. س",
  slotMinutes: 30,
  daysAhead: 14,
  closedDates: [],
  clinics: [],
  updatedAt: 0,
  ...over,
});
const clinic = {
  id: "c1",
  name: "A",
  address: "",
  enabled: true,
  // 2026-11-03 is a Tuesday ("2").
  hours: { "2": { open: true, from: "16:00", to: "18:00", breakFrom: "17:00", breakTo: "17:30" } },
};
// 2026-11-01 09:00 in Baghdad.
const NOW = new Date("2026-11-01T06:00:00Z");

describe("slots", () => {
  it("lists slot starts and skips the break", () => {
    expect(daySlots(clinic.hours["2"], 30)).toEqual(["16:00", "16:30", "17:30"]);
    expect(daySlots({ open: false, from: "16:00", to: "18:00" }, 30)).toEqual([]);
  });

  it("treats overlapping bookings as taken", () => {
    expect(isSlotTaken("16:30", ["16:15"], 30)).toBe(true);
    expect(isSlotTaken("16:30", ["16:00"], 30)).toBe(false);
  });

  it("removes taken slots, closed dates and closed weekdays", () => {
    expect(freeSlots(page(), clinic, "2026-11-03", ["16:30"], NOW)).toEqual(["16:00", "17:30"]);
    expect(freeSlots(page({ closedDates: ["2026-11-03"] }), clinic, "2026-11-03", [], NOW)).toEqual([]);
    expect(freeSlots(page(), clinic, "2026-11-04", [], NOW)).toEqual([]);
  });

  it("hides today's slots that are past or within 15 minutes", () => {
    const at1620 = new Date("2026-11-03T13:20:00Z"); // 16:20 Baghdad
    expect(freeSlots(page(), clinic, "2026-11-03", [], at1620)).toEqual(["17:30"]);
  });

  it("offers today through daysAhead", () => {
    const d = bookableDates(page({ daysAhead: 7 }), NOW);
    expect(d[0]).toBe("2026-11-01");
    expect(d).toHaveLength(8);
  });
});

describe("phone", () => {
  it("accepts Iraqi mobiles in any common form", () => {
    for (const raw of ["07701234567", "+964 770 123 4567", "009647701234567", "٠٧٧٠١٢٣٤٥٦٧", "7701234567"]) {
      expect(normalizeIraqiPhone(raw)).toBe("07701234567");
    }
  });
  it("rejects anything else", () => {
    for (const raw of ["0770123456", "+44 7700 900123", "06701234567", ""]) expect(normalizeIraqiPhone(raw)).toBeNull();
  });
});

it("expires a pending request once its time has passed", () => {
  const r = { status: "pending" as const, date: "2026-11-01", time: "08:30" };
  expect(effectiveStatus(r, NOW)).toBe("expired");
  expect(effectiveStatus({ ...r, time: "10:00" }, NOW)).toBe("pending");
  expect(effectiveStatus({ ...r, status: "accepted" }, NOW)).toBe("accepted");
});

it("builds a QR code path", () => {
  const { d, size } = qrPath("https://dental-hub-df069.web.app/book/dr-x");
  expect(size).toBeGreaterThanOrEqual(21);
  expect(d.startsWith("M")).toBe(true);
});
