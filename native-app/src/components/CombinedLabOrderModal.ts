// Type-only module so `lib/ordersStore` can import the `CombinedLabOrder` type
// without pulling in the (web) component. The real component is ported in Phase 3.
export type PricingItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currency: "USD" | "IQD";
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
};
