import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

vi.mock("@/lib/labMembersStore", () => ({ useLabMembers: () => ({ members: [] }) }));
vi.mock("@/lib/catalogStore", async () => {
  const cfg = await vi.importActual<typeof import("@/lib/dentalConfig")>("@/lib/dentalConfig");
  return {
    useLabCatalog: () => ({
      catalog: {
        materials: cfg.MATERIALS,
        workTypes: cfg.WORK_TYPES,
        manufacturingMethods: cfg.MANUFACTURING_METHODS,
      },
    }),
    saveLabCatalog: vi.fn(),
  };
});

import { CombinedLabOrderModal } from "./CombinedLabOrderModal";

// Regression: hooks declared after `if (!open) return null` crashed the page
// ("Rendered more hooks than during the previous render") when the lab
// clicked "تأكيد" and the modal flipped from closed to open.
it("opens after being rendered closed without crashing", () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const props = { onClose: () => {}, onSubmit: () => {}, labId: "lab1" };
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(<CombinedLabOrderModal open={false} {...props} />));
  act(() =>
    root.render(
      <CombinedLabOrderModal
        open
        {...props}
        prefill={{ patientName: "Hakim", doctorName: "d", clinicName: "c", notes: "" }}
      />,
    ),
  );
  expect(host.innerHTML).toContain("Hakim");
  act(() => root.unmount());
});
