import { describe, it, expect } from "vitest";
import { validate, assertValid } from "@/lib/validation";
import { notificationSchema, offerSchema, productSchema, userRoleSchema } from "@/lib/schemas";
import { z } from "zod";

describe("validate", () => {
  it("returns success with data for valid input", () => {
    const schema = z.object({ name: z.string() });
    const result = validate(schema, { name: "test" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ name: "test" });
  });

  it("returns error string for invalid input", () => {
    const schema = z.object({ name: z.string() });
    const result = validate(schema, { name: 123 });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toContain("name");
  });

  it("assertValid throws on failure", () => {
    const schema = z.object({ name: z.string() });
    expect(() => assertValid(schema, { name: 123 })).toThrow("Validation failed");
  });

  it("assertValid returns data on success", () => {
    const schema = z.object({ name: z.string() });
    expect(assertValid(schema, { name: "ok" })).toEqual({ name: "ok" });
  });
});

describe("notificationSchema", () => {
  it("validates a valid notification", () => {
    const result = notificationSchema.safeParse({
      userId: "user1",
      title: "New order",
      body: "You have a new order",
      type: "order_new",
      orderId: "ord123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing userId", () => {
    const result = notificationSchema.safeParse({
      title: "Test",
      body: "Body",
      type: "order_new",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = notificationSchema.safeParse({
      userId: "user1",
      title: "Test",
      body: "Body",
      type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });
});

describe("userRoleSchema", () => {
  it("validates a dentist role", () => {
    const result = userRoleSchema.safeParse({
      userId: "uid1",
      role: "dentist",
      accountType: "dentist",
      name: "Dr. Ahmed",
      surname: "Ali",
      email: "ahmed@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("validates a supply role", () => {
    const result = userRoleSchema.safeParse({
      userId: "uid2",
      role: "supply",
      accountType: "supply",
      name: "Supply Co",
      email: "supply@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = userRoleSchema.safeParse({
      userId: "uid1",
      role: "dentist",
      accountType: "dentist",
      name: "Test",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = userRoleSchema.safeParse({
      userId: "uid1",
      role: "hacker",
      accountType: "dentist",
      name: "Test",
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
  });
});

describe("productSchema", () => {
  it("validates a product", () => {
    const result = productSchema.safeParse({
      id: "prod1",
      category: "materials",
      price: 100,
      companyId: "company1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative price", () => {
    const result = productSchema.safeParse({
      id: "prod1",
      category: "materials",
      price: -10,
      companyId: "company1",
    });
    expect(result.success).toBe(false);
  });
});

describe("offerSchema", () => {
  it("validates an offer", () => {
    const result = offerSchema.safeParse({
      id: "offer1",
      supplierId: "supplier1",
      title: "Special offer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing supplierId", () => {
    const result = offerSchema.safeParse({
      id: "offer1",
      title: "Special offer",
    });
    expect(result.success).toBe(false);
  });
});
