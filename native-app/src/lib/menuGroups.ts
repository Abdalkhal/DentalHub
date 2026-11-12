/* Shared with src/lib/menuGroups.ts — keep the two identical. */
/**
 * The "More" menu, in groups: each item goes under a short heading, and each
 * group has one calm colour for its icons, so a doctor finds things by place
 * and colour instead of reading every row.
 */

export type MenuGroupKey = "work" | "clinic" | "shop" | "account" | "help";

export const MENU_GROUPS: Record<MenuGroupKey, { ar: string; en: string; fg: string; bg: string }> = {
  work: { ar: "العمل", en: "Work", fg: "#4F46E5", bg: "#EEF0FF" },
  clinic: { ar: "العيادة", en: "Clinic", fg: "#1D6FE8", bg: "#E8F1FE" },
  shop: { ar: "التسوق", en: "Shopping", fg: "#7C3AED", bg: "#F1EAFE" },
  account: { ar: "حسابي", en: "My account", fg: "#0F766E", bg: "#DDF4F1" },
  help: { ar: "المساعدة والخصوصية", en: "Help & privacy", fg: "#475569", bg: "#EEF2F7" },
};

const ORDER: MenuGroupKey[] = ["work", "clinic", "shop", "account", "help"];

const CLINIC = ["/clinic", "/patients", "/track-cases"];
const SHOP = ["/supplies", "/brands", "/offers", "/favorites", "/cart", "/implants", "/labs", "/explore"];
const ACCOUNT = ["/my-ads", "/messages", "/notifications", "/settings", "/account/settings", "/orders", "/reports", "/pricing"];
const HELP = ["/help", "/account/help", "/privacy", "/account/about"];

/** Which group a link belongs to. An office's own dashboard pages are "work". */
export function menuGroupOf(to: string, accountType: string): MenuGroupKey {
  if (accountType !== "dentist" && (to === "/supplies" || to === "/implants")) return "work";
  if (CLINIC.includes(to)) return "clinic";
  if (SHOP.includes(to)) return "shop";
  if (ACCOUNT.includes(to)) return "account";
  if (HELP.includes(to)) return "help";
  return "work";
}

/** The items split into ordered groups, keeping each item's order inside its group. */
export function groupMenu<T extends { to: string }>(items: T[], accountType: string): Array<{ key: MenuGroupKey; items: T[] }> {
  const by = new Map<MenuGroupKey, T[]>();
  for (const it of items) {
    const k = menuGroupOf(it.to, accountType);
    by.set(k, [...(by.get(k) ?? []), it]);
  }
  return ORDER.filter((k) => by.has(k)).map((k) => ({ key: k, items: by.get(k)! }));
}
