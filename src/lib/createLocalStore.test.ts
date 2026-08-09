import { describe, it, expect, beforeEach } from "vitest";
import { createLocalStore } from "@/lib/createLocalStore";

interface TestState {
  count: number;
  name: string;
}

describe("createLocalStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the default value initially", () => {
    const store = createLocalStore<TestState>("test_key", { count: 0, name: "" });
    expect(store.getSnapshot()).toEqual({ count: 0, name: "" });
  });

  it("persists state to localStorage", () => {
    const store = createLocalStore<TestState>("test_key", { count: 0, name: "" });
    store.set({ count: 5, name: "test" });
    const raw = localStorage.getItem("test_key");
    expect(raw).toBe(JSON.stringify({ count: 5, name: "test" }));
  });

  it("loads persisted state on init", () => {
    localStorage.setItem("test_key", JSON.stringify({ count: 10, name: "stored" }));
    const store = createLocalStore<TestState>("test_key", { count: 0, name: "" });
    expect(store.getSnapshot()).toEqual({ count: 10, name: "stored" });
  });

  it("accepts updater function", () => {
    const store = createLocalStore<TestState>("test_key", { count: 0, name: "" });
    store.set((prev) => ({ ...prev, count: prev.count + 1 }));
    expect(store.getSnapshot().count).toBe(1);
  });

  it("resets to default value", () => {
    const store = createLocalStore<TestState>("test_key", { count: 0, name: "" });
    store.set({ count: 100, name: "modified" });
    store.reset();
    expect(store.getSnapshot()).toEqual({ count: 0, name: "" });
  });

  it("notifies subscribers", () => {
    const store = createLocalStore<TestState>("test_key", { count: 0, name: "" });
    let notified = false;
    const unsub = store.subscribe(() => { notified = true; });
    store.set({ count: 1, name: "a" });
    expect(notified).toBe(true);
    notified = false;
    unsub();
    store.set({ count: 2, name: "b" });
    expect(notified).toBe(false);
  });
});
