import { router } from "expo-router";
import { auth } from "@/integrations/firebase/client";

/**
 * Guest browsing (App Store guideline 5.1.1(v)): the app may not force
 * registration before people can use features that aren't account based.
 * Signed-out visitors can browse the catalog — everything below reads only
 * Firestore collections and Storage paths that allow unauthenticated reads
 * (products, offers, ads, surgical_guide_companies, product images).
 *
 * Everything else is account based (cart, orders, favorites, clinic,
 * messages, …) or reads `public_profiles`, which requires sign-in — e.g. the
 * supplier/lab directories and vendor profiles — so the root layout sends a
 * signed-out visitor to /login when they open one of those routes.
 */
const GUEST_ROUTES = new Set([
  "/",
  "/offers",
  "/account",
  "/more",
  "/login",
  "/admin-login",
  "/brands",
  "/implants",
  "/specialized-implants",
  "/bone-grafts",
  "/surgical-guide",
  "/help",
  "/privacy",
]);

const GUEST_ROUTE_PREFIXES = ["/brand/", "/implant-country/", "/specialized-implants/", "/product-detail/"];

export function isGuestRoute(pathname: string): boolean {
  return GUEST_ROUTES.has(pathname) || GUEST_ROUTE_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * For account-based actions on guest screens (e.g. add to cart): sends a
 * signed-out visitor to /login and returns true, so the caller can bail out.
 */
export function requireSignIn(): boolean {
  if (auth.currentUser) return false;
  router.push("/login");
  return true;
}
