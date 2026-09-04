import { clsx, type ClassValue } from "clsx";

// NOTE: `tailwind-merge` will be added once NativeWind is configured (Phase 1).
// For now this simply joins truthy class names.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
