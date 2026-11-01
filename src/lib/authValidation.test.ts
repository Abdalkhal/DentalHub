import { describe, expect, it } from "vitest";
import { checkEmail, checkPassword } from "./authValidation";

describe("checkEmail", () => {
  it("accepts and normalises real addresses", () => {
    expect(checkEmail("  Ahmed.Ali@Gmail.com ")).toEqual({ ok: true, email: "ahmed.ali@gmail.com" });
    expect(checkEmail("dr.sara@clinic.iq").ok).toBe(true);
    expect(checkEmail("info@uokerbala.edu.iq").ok).toBe(true);
  });

  it("rejects malformed addresses", () => {
    for (const e of ["ahmed", "ahmed@", "ahmed@gmail", "ahmed@gmail.c", "a..b@gmail.com", "ahmed @gmail.com", "@gmail.com"]) {
      expect(checkEmail(e)).toMatchObject({ ok: false, reason: "format" });
    }
  });

  it("suggests the intended provider for typos", () => {
    expect(checkEmail("ahmed@gmial.com")).toMatchObject({ ok: false, reason: "typo", suggestion: "ahmed@gmail.com" });
    expect(checkEmail("ahmed@hotmial.com")).toMatchObject({ suggestion: "ahmed@hotmail.com" });
    expect(checkEmail("ahmed@gmaill.com")).toMatchObject({ suggestion: "ahmed@gmail.com" });
  });

  it("refuses throw-away inboxes", () => {
    expect(checkEmail("x@mailinator.com")).toMatchObject({ ok: false, reason: "disposable" });
  });
});

describe("checkPassword", () => {
  it("needs 8+ characters with letters and digits, not a common one", () => {
    expect(checkPassword("123456").problems).toContain("length");
    expect(checkPassword("abcdefgh").problems).toContain("digit");
    expect(checkPassword("12345678").ok).toBe(false);
    expect(checkPassword("password1").problems).toContain("common");
    expect(checkPassword("clinic2026")).toMatchObject({ ok: true, score: 2 });
    expect(checkPassword("Clinic2026!")).toMatchObject({ ok: true, score: 3 });
  });
});
