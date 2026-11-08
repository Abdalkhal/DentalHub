import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
vi.mock("@/integrations/firebase/client", () => ({ db: {}, storage: {}, auth: {} }));
vi.mock("@/integrations/firebase/config", () => ({ app: {} }));
vi.mock("@/lib/useAuth", () => ({ useSession: () => ({ user: { uid: "doc" } }) }));
vi.mock("@/lib/products", () => ({ useSignedImageUrls: () => ({ data: {} }) }));
vi.mock("@/lib/orders", () => ({
  useDentistOrders: () => ({
    isLoading: false,
    data: [
      {
        id: "o1", status: "confirmed", supplierId: "s1", createdAt: { toMillis: () => 1 },
        items: [
          { productId: "gloves", name: "قفازات", quantity: 10, price: 1 },
          { productId: "comp", name: "كومبوزيت", quantity: 4, price: 1 },
          { productId: "gone", name: "منتج غير متوفر", quantity: 1, price: 1, availability: "not_available" },
          { productId: "skip", name: "منتج لا أريده", quantity: 1, price: 1 },
        ],
      },
      { id: "o2", status: "rejected", supplierId: "s1", createdAt: { toMillis: () => 2 }, items: [{ productId: "rej", name: "مرفوض", quantity: 1, price: 1 }] },
    ],
  }),
}));
const PRODUCTS: Record<string, unknown> = {
  gloves: { branch: "general", subCategory: "قفازات" },
  comp: { branch: "operative", subCategory: "كومبوزيت" },
  skip: { branch: "general" },
};
vi.mock("firebase/firestore", async (orig) => ({
  ...(await orig<object>()),
  doc: (_db: unknown, col: string, id: string) => ({ col, id }),
  getDoc: async (r: { col: string; id: string }) => ({
    exists: () => (r.col === "products" ? !!PRODUCTS[r.id] : false),
    data: () => PRODUCTS[r.id],
  }),
  onSnapshot: () => () => {},
}));

const { ClinicMaterials } = await import("./ClinicMaterials");
const store = await import("@/lib/materialsStore");

const flush = () => act(() => new Promise<void>((r) => setTimeout(r, 30)));
const btn = (root: HTMLElement | Document, t: string) => [...root.querySelectorAll("button")].find((b) => b.textContent?.includes(t)) as HTMLButtonElement;

it("adds what the doctor picks from their purchases, each to its own section", async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  store.setMaterialsStoreUser("", "cli");
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => createRoot(host).render(<ClinicMaterials ar />));
  await flush();

  // Only confirmed, available lines are offered.
  expect(host.textContent).toContain("3 منتج من مشترياتك");
  await act(async () => btn(host, "مراجعة").click());
  expect(host.textContent).toContain("قفازات");
  expect(host.textContent).not.toContain("مرفوض");
  expect(host.textContent).not.toContain("غير متوفر");
  expect(host.textContent).toContain("معالجة الأسنان · كومبوزيت");

  // Untick one, add the rest.
  const skip = host.querySelector('button[aria-label="منتج لا أريده"]') as HTMLButtonElement;
  await act(async () => skip.click());
  await act(async () => btn(host, "إضافة 2 إلى المخزن").click());
  await flush();

  const saved = JSON.parse(localStorage.getItem("dh_materials_v1:guest:cli") || "[]") as { name: string; category: string; qty: number }[];
  expect(saved.map((m) => [m.name, m.category, m.qty]).sort()).toEqual([["قفازات", "general", 10], ["كومبوزيت", "operative", 4]].sort());
  // The unticked one is still offered; the added ones aren't.
  expect(host.textContent).toContain("منتج واحد من مشترياتك");
  expect(host.textContent).toContain("كومبوزيت");
});
