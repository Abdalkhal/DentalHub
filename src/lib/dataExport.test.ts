import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/firebase/client", () => ({ auth: {}, db: {} }));
vi.mock("@/integrations/firebase/config", () => ({ app: {} }));

import { exportErrorMessage, exportStage, hoursUntil, type DataExport } from "./dataExport";

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;
const make = (over: Partial<DataExport>): DataExport => ({ status: "pending", requestedAt: NOW, ...over });

describe("exportStage", () => {
  it("offers an export when none was ever requested", () => {
    expect(exportStage(null, NOW)).toEqual({ stage: "idle" });
  });

  it("shows work in progress, and lets a dead build be retried", () => {
    expect(exportStage(make({ status: "processing" }), NOW + 60_000).stage).toBe("working");
    expect(exportStage(make({ status: "processing" }), NOW + 20 * 60_000).stage).toBe("failed");
  });

  it("offers the download only until the link expires", () => {
    const ready = make({ status: "ready", downloadUrl: "https://x", expiresAt: NOW + 48 * HOUR });
    expect(exportStage(ready, NOW + HOUR).stage).toBe("ready");
    expect(exportStage(ready, NOW + 49 * HOUR)).toEqual({ stage: "idle" });
  });

  it("holds to one export a day after the link is gone", () => {
    const expired = make({ status: "expired" });
    expect(exportStage(expired, NOW + HOUR)).toEqual({ stage: "cooldown", nextAt: NOW + 24 * HOUR });
    expect(exportStage(expired, NOW + 25 * HOUR)).toEqual({ stage: "idle" });
  });
});

it("explains a wrong password and rounds hours up", () => {
  expect(exportErrorMessage({ code: "auth/invalid-credential" }, true)).toBe("كلمة المرور غير صحيحة");
  expect(hoursUntil(NOW + 90 * 60_000, NOW)).toBe(2);
});
