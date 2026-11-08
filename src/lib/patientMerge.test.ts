import { expect, it, vi } from "vitest";

vi.mock("@/integrations/firebase/client", () => ({ db: {}, storage: {}, auth: {} }));

import { duplicateFileNumbers, mergeRecords, type Patient } from "./patientsStore";

const pat = (over: Partial<Patient>): Patient =>
  ({ id: "p", fileNo: "PAT-1", name: "n", visits: [], files: [], payments: [], teeth: {}, createdAt: "2026-01-01", ...over }) as Patient;
const v = (id: string) => ({ id, date: "2026-01-01", procedure: id });
const pay = (id: string, amount = 1) => ({ id, date: "2026-01-01", amount });

it("keeps what either copy added: a team member's visit survives the owner's save", () => {
  const owner = pat({ updatedAt: 20, complaint: "owner edit", visits: [v("a")], payments: [pay("x")] } as Partial<Patient>);
  const cloud = pat({ updatedAt: 10, complaint: "old", visits: [v("a"), v("member")], payments: [pay("x"), pay("member-pay", 5)] } as Partial<Patient>);
  const m = mergeRecords(owner, cloud);
  expect(m.visits.map((x) => x.id).sort()).toEqual(["a", "member"]);
  expect(m.payments.map((x) => x.id).sort()).toEqual(["member-pay", "x"]);
  expect(m.complaint).toBe("owner edit");
});

it("doesn't bring back what was removed, from either side", () => {
  const removedHere = pat({ updatedAt: 20, visits: [], removedItems: ["a"] });
  expect(mergeRecords(removedHere, pat({ updatedAt: 10, visits: [v("a")] })).visits).toEqual([]);
  // The older copy is the one that recorded the removal.
  const stale = pat({ updatedAt: 20, visits: [v("a"), v("b")] });
  const m = mergeRecords(stale, pat({ updatedAt: 10, visits: [v("b")], removedItems: ["a"] }));
  expect(m.visits.map((x) => x.id)).toEqual(["b"]);
  expect(m.removedItems).toEqual(["a"]);
});

it("takes the newer version of an item both copies hold, and the higher receipt counter", () => {
  const step = (status: "done" | "planned") => ({ id: "s", title: "t", status });
  const m = mergeRecords(pat({ updatedAt: 20, plan: [step("done")], receiptSeq: 2 }), pat({ updatedAt: 10, plan: [step("planned")], receiptSeq: 5 }));
  expect(m.plan?.[0].status).toBe("done");
  expect(m.receiptSeq).toBe(5);
});

it("gives duplicate file numbers unused ones; the earliest registered keeps the number", () => {
  const list = [
    pat({ id: "late", fileNo: "PAT-101", createdAt: "2026-03-01" }),
    pat({ id: "first", fileNo: "PAT-101", createdAt: "2026-01-01" }),
    pat({ id: "mid", fileNo: "PAT-101", createdAt: "2026-02-01" }),
    pat({ id: "other", fileNo: "PAT-105", createdAt: "2026-02-15" }),
  ];
  const changes = duplicateFileNumbers(list);
  expect([...changes.entries()].sort()).toEqual([["late", "PAT-107"], ["mid", "PAT-106"]]);
  // Any device, in any order, reaches the same answer.
  expect(duplicateFileNumbers([...list].reverse())).toEqual(changes);
  // Nothing to do once they are unique.
  const fixed = list.map((p) => ({ ...p, fileNo: changes.get(p.id) ?? p.fileNo }));
  expect(duplicateFileNumbers(fixed).size).toBe(0);
});
