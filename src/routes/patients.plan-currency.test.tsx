import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: Record<string, unknown>) => ({
    ...opts,
    options: opts,
    useParams: () => ({ patientId: "test1" }),
  }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/components/MobileShell", () => ({
  MobileShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/TopBar", () => ({ TopBar: () => null }));
vi.mock("@/lib/useAuth", () => ({ useSession: () => ({ user: null }) }));
vi.mock("@/lib/clinicsStore", () => ({ setClinicsStoreUser: () => {} }));
vi.mock("@/lib/clinicStore", () => ({ useClinic: () => ({ doctors: [] }) }));

// A step saved before currencies existed (no `currency`), like real data.
localStorage.setItem(
  "dh:patients:v1:guest:default",
  JSON.stringify([
    {
      id: "test1", name: "Test", age: 35, gender: "male", phone: "", fileNo: "PAT-1", status: "new",
      history: {}, complaint: "", teeth: {}, visits: [], files: [], payments: [], totalFees: 0,
      lastVisit: "2026-10-29", branch: "fillings",
      plan: [{ id: "pl_old", title: "Composite", status: "planned", dept: "fillings", tooth: "35", cost: 25000 }],
    },
  ]),
);

const { Route } = await import("./patients.$patientId");
const { LanguageProvider } = await import("@/lib/i18n"); // defaults to Arabic

function setInput(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  setter.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
const byText = (root: HTMLElement, text: string) =>
  [...root.querySelectorAll("button")].find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

it("plan costs carry a chosen currency and comma formatting", () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const Page = (Route as unknown as { component: React.ComponentType }).component;
  act(() => root.render(<LanguageProvider><Page /></LanguageProvider>));

  // Legacy step: no "$", shown in dinars with a comma.
  expect(host.textContent).toContain("25,000 د.ع");
  expect(host.textContent).not.toContain("25,000 $");

  act(() => byText(host, "إجراء جديد").click());
  act(() => byText(host, "إجراء مخصص").click());
  const inputs = host.querySelectorAll("form input");
  const [title, , cost] = [...inputs] as HTMLInputElement[];
  act(() => setInput(title, "Scaling"));
  act(() => setInput(cost, "1234567"));
  expect(cost.value).toBe("1,234,567");

  act(() => byText(host, "دولار").click()); // switch the new step to dollars
  act(() => (host.querySelector("form button[type=submit]") as HTMLButtonElement).click());

  expect(host.textContent).toContain("$1,234,567");
  expect(host.textContent).toContain("$1,234,567 + 25,000 د.ع"); // per-currency total
  act(() => root.unmount());
});

it("rejects an invalid tooth number and edits an existing step", () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  const Page = (Route as unknown as { component: React.ComponentType }).component;
  act(() => root.render(<LanguageProvider><Page /></LanguageProvider>));

  // Open the legacy step for editing by clicking its title.
  const stepBtn = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("Composite")) as HTMLButtonElement;
  act(() => stepBtn.click());
  const [, tooth, cost] = [...host.querySelectorAll("form input")] as HTMLInputElement[];
  expect(tooth.value).toBe("35");
  expect(cost.value).toBe("25,000");

  act(() => setInput(tooth, "99"));
  act(() => (host.querySelector("form button[type=submit]") as HTMLButtonElement).click());
  expect(host.textContent).toContain("رقم السن غير صحيح");
  expect(host.querySelector("form")).not.toBeNull(); // not saved

  act(() => setInput(tooth, "36"));
  act(() => setInput(cost, "30000"));
  act(() => (host.querySelector("form button[type=submit]") as HTMLButtonElement).click());
  expect(host.querySelector("form")).toBeNull();
  expect(host.textContent).toContain("30,000 د.ع");
  expect(host.textContent).not.toContain("25,000 د.ع");
  act(() => root.unmount());
});
