# Supplies Directory Dual-Filtering & Legacy Account Handling

## Overview

The `/supplies` directory page (`src/routes/supplies.index.tsx` — `BrowseSupplies` component) displays a browsable list of implant and medical supply companies. It supports dual filtering by governorate and sub-category, plus graceful handling of legacy accounts missing a city field.

---

## 1. Data Sources

| Source | Origin | Route |
|--------|--------|-------|
| **Implant companies** | Firestore `user_roles` where `accountType === "implant"` | `/profile/$accountId` |
| **Supply companies** | Firestore `user_roles` where `accountType === "supply"` **+** static `OFFICES` from admin store | `/profile/$accountId` or `/supplies/$officeId` |

Both Firestore queries live in `BrowseSupplies` as `@tanstack/react-query` hooks with `staleTime: 30000`.

---

## 2. Dual-Filtering State

```tsx
const [city, setCity] = useState<string>("all");
const [category, setCategory] = useState<"all" | CompanyCategory>("all"); // "all" | "supplies" | "implants"
```

**Filtering logic** (applied via `useMemo` in `filtered`):
1. `city !== "all"` → only companies whose `cityId` matches the selected city
2. `category !== "all"` → only companies whose `category` matches
3. Both filters compound: e.g., "شركات الزرعات" + "نينوى" shows implant companies in Nineveh only
4. A text search `q` further narrows by name, city, or area

---

## 3. Sub-Category Tabs

Rendered below the city scrollbar. Three tabs:
- **الكل** (`"all"`) — shows all companies regardless of category
- **شركات الزرعات** (`"implants"`) — filters by `category === "implants"` (matched from `accountType: "implant" | "dental_implants"`)
- **شركات المستلزمات** (`"supplies"`) — filters by `category === "supplies"` (matched from `accountType: "supply" | "medical_supplies"`)

---

## 4. Legacy Account Handling

**Constant:** `const DEFAULT_CITY = "بغداد";`

When fetching from Firestore in both queries:
- If `account.city` is missing, `null`, or `undefined`:
  - **Client state:** `cityId` defaults via `resolveCityId(u.city || DEFAULT_CITY)`
  - **Firestore:** `updateDoc(d.ref, { city: DEFAULT_CITY })` fires in background (`.catch(() => {})`)

**Helper functions:**

| Function | Purpose |
|----------|---------|
| `cityIdFromName(nameEn)` | Maps English city name → city ID; falls back to `"baghdad"` |
| `resolveCityId(cityValue)` | Maps Firestore city value → city ID; handles IDs, English names, and Arabic names; falls back to `"baghdad"` |
| `getCityName(cityId, ar)` | Maps city ID → display name in requested language |

`resolveCityId` matches against `c.id`, `c.en` (lowercased), and `c.ar` (preserving Arabic script), so legacy docs updated with `"بغداد"` resolve correctly to the `"baghdad"` ID.

---

## 5. Account Type Matching

| Tab | Matched `accountType` values |
|-----|------------------------------|
| شركات الزرعات | `"implant"` or `"dental_implants"` |
| شركات المستلزمات | `"supply"` or `"medical_supplies"` |

Casting to `(u.accountType as string)` is used in comparisons because `UserRoleDoc.accountType` has the union type `"dentist" | "supply" | "implant" | "lab"` which doesn't include `"dental_implants"` or `"medical_supplies"`.

---

## 6. Offline / Empty State

- Both queries return `[]` on error (catch → empty array)
- Filtered results with no matches show a `<SearchX>` empty state
- Cities use `CITIES` from `@/data/offices`
- Static branch cards (dental specialties section) are always shown regardless of filters
