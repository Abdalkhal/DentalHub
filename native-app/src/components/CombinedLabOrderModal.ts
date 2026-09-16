// Type-only module so `lib/ordersStore` can import the `CombinedLabOrder` type
// without pulling in the (web) component. The real component is ported in Phase 3.
export type PricingItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: "USD" | "IQD";
  // Per-item material/work-type, so a case mixing several distinct work
  // items (e.g. an Emax veneer + a Zirconia crown) keeps each item's own
  // material instead of sharing the case-wide selection.
  material?: string;
  workType?: string;
  manufacturingMethod?: string;
  frameworkCreation?: string;
};

export type CombinedLabOrder = {
  patientName: string;
  doctorName: string;
  clinicName: string;
  deliveryDate: string;
  material: string;
  workType?: string;
  manufacturingMethod?: string;
  frameworkCreation?: string;
  pricingMode: "single" | "mixed";
  currency: "USD" | "IQD";
  pricingItems?: PricingItem[];
  unitsCount: number;
  unitPriceIQD: number;
  subtotalIQD: number;
  discountAmountIQD: number;
  finalTotalIQD: number;
  finalTotalUSD: number;
  shade?: string;
  notes: string;
  implantCompany?: string;
  implantSystem?: string;
  implantConnection?: string;
  implantPlatform?: string;
  implantScanBody?: string;
  implantLevel?: string;
  implantRetention?: string;
  alignerTreatmentType?: string;
  alignerArch?: string;
  alignerScans?: string;
  alignerCount?: string;
  alignerWearProtocol?: string;
  titaniumFrameworkType?: string;
  designerId?: string;
  designerName?: string;
  ceramistId?: string;
  ceramistName?: string;
  // Set only when the lab picked a real registered dentist account while
  // typing the doctor name (see new-lab-order.tsx's suggestion dropdown).
  // Without it the case has no way to reach that doctor's "تتبع الحالات"
  // screen, which filters strictly by this id.
  dentistId?: string;
};
