import { expect, it, vi } from "vitest";

vi.mock("@/integrations/firebase/client", () => ({ db: {} }));
vi.mock("@/integrations/firebase/config", () => ({ app: {} }));

import { inviteMessage, joinLink, sortShared, teamErrorMessage, type SharedAppointment } from "./clinicTeam";

const a = (id: string, date: string, time: string) => ({ id, date, time }) as SharedAppointment;

it("lists coming appointments soonest first, then past ones latest first", () => {
  const sorted = sortShared(
    [a("past-old", "2026-01-01", "10:00"), a("later", "2026-12-02", "09:00"), a("past-new", "2026-10-01", "10:00"), a("soon", "2026-12-01", "11:00"), a("today", "2026-11-05", "08:00")],
    "2026-11-05",
  );
  expect(sorted.map((x) => x.id)).toEqual(["today", "soon", "later", "past-new", "past-old"]);
});

it("invite message carries the link and the code", () => {
  const text = inviteMessage("ABCD2345", "عيادة الصفوة", true);
  expect(text).toContain(joinLink("ABCD2345"));
  expect(text).toContain("عيادة الصفوة");
  expect(text).toContain("7 أيام");
});

it("explains server refusals, and never shows raw errors", () => {
  expect(teamErrorMessage({ message: "invalid-code" }, true)).toBe("الرمز غير صحيح أو انتهت صلاحيته");
  expect(teamErrorMessage({ message: "internal stack trace" }, true)).toContain("تعذر");
});
