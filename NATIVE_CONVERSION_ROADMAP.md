# DentalHub — React Native Conversion Roadmap

> Goal: convert the existing web app (`TanStack Start` + React 19 + Firebase web SDK) into a native
> Android/iOS app using React Native (Expo). This document is the single source of truth for the
> migration. The new app lives in the `/native-app` folder.

---

## 1. Current state (baseline)

| Dimension | Finding |
|---|---|
| Framework | TanStack Start (SSR) + React 19 + Vite + Tailwind v4 |
| Firebase | **web SDK** — `firestore` (44 imports), `auth` (14), `storage` (7), `functions` (2); config from `VITE_*` env |
| Scale | **67 routes**, **103 components**, **44 lib files**, **16 data files** |
| State | 20+ local stores built on `createLocalStore` (localStorage + `useSyncExternalStore`) + Firestore react-query/onSnapshot stores |
| UI kit | shadcn/ui + Radix (46 primitives), lucide-react, recharts, react-easy-crop, html5-qrcode, sonner, embla-carousel, date-fns |
| Web-only APIs | `localStorage` (56), `window`/`document` (53), `navigator.share/clipboard` (14), `window.print` (5), `crypto.randomUUID` (37), `File`/`FileReader`/`URL.createObjectURL`, `toast` (92), `toLocaleString` (79) |
| i18n | `useI18n()` context — `lang`, `dir` (RTL Arabic first), `t()`, `toggle` |

**Key insight:** the app is already ~95% client-side (Firebase + local state). SSR is not core to the
product, and most `src/lib/*` logic is pure TypeScript that ports almost unchanged.

---

## 2. Strategic decisions

1. **Framework: Expo (managed) + Expo Router + TypeScript.**
   File-based routing mirrors the TanStack file routes. Easiest Firebase native config, camera,
   notifications, OTA updates, and EAS builds for Play/App Store.

2. **Styling: NativeWind (Tailwind v4 for RN).**
   Reuses existing `className` strings — the single biggest time-saver. Web-only utilities
   (`hover:`, `backdrop-blur`, some shadows/grids) need light rework.

3. **Firebase: `@react-native-firebase` (auth / firestore / storage / functions).**
   Native modules = real offline persistence + native uploads. Requires `google-services.json`
   (Android) and `GoogleService-Info.plist` (iOS).
   *Fallback:* modular `firebase` JS SDK also runs in RN (worse Storage/persistence).

4. **Local stores: swap `createLocalStore` backend from `localStorage` → `AsyncStorage`.**
   Single-file change; the store abstraction is already clean.

5. **Web-only APIs → native equivalents** (see mapping table below).

---

## 3. Web → React Native mapping

| Web | React Native replacement |
|---|---|
| `localStorage` | `@react-native-async-storage/async-storage` |
| `window.print` (Rx / invoices / cart) | `react-native-print`, or generate + `Share` a PDF |
| `navigator.share` | React Native `Share` API |
| `navigator.clipboard` | `@react-native-clipboard/clipboard` |
| `html5-qrcode` (barcode scan) | `expo-camera` / `react-native-vision-camera` barcode scanner |
| `react-easy-crop` | `expo-image-manipulator` / `react-native-image-crop-picker` |
| `recharts` | `react-native-gifted-charts` (or victory-native) |
| `embla-carousel` | `FlatList` paging / `react-native-reanimated-carousel` |
| `sonner` toasts | `react-native-toast-message` (or custom) |
| `File`/`FileReader`/`URL.createObjectURL` | `expo-image-picker` + `expo-file-system` + fetch blob |
| `crypto.randomUUID` | `expo-crypto` / small polyfill |
| shadcn/Radix modals/drawers/selects | `@gorhom/bottom-sheet` + RN `Modal`/`ActionSheetIOS` + custom primitives |
| `document.documentElement.dir` | `I18nManager.forceRTL` + flexDirection (NativeWind RTL) |

---

## 4. Phased migration plan

### Phase 0 — Scaffolding (~1 day) ✅ DONE
- [x] `npx create-expo-app` in `/native-app` (Expo Router + TypeScript) — **Expo SDK 57 / RN 0.86 / React 19.2**.
- [x] Added **Firebase JS SDK** (12.18), AsyncStorage, expo-crypto, clsx, NativeWind, tailwindcss v3, react-query, lucide-react-native, react-native-svg.
- [x] Ported `i18n.tsx`, `env.ts`, Firebase `config.ts`/`client.ts` (RN auth persistence), `types.ts`.
- [x] `.env.example` (EXPO_PUBLIC_FIREBASE_*) + type shims (CSS/assets).

> **Decision (revised from RNFirebase):** the web **Firebase JS SDK** is used instead of React Native Firebase — it's what the web app already uses (ports verbatim) and runs in **Expo Go** (no native build needed for dev). RNFirebase can be added later via a dev build if Analytics/Crashlytics/push are needed.

### Phase 1 — Core infrastructure ✅ DONE (data layer + styling foundation)
- [x] Ported **all `src/lib/*` stores + Firestore hooks + `src/data/*`** (39 + 16 files) with RN adapters:
  - `storage.ts` (sync AsyncStorage facade + `localStorage`/`sessionStorage` polyfill, `hydrateStorage()` gate)
  - `polyfills.ts` (minimal `window`/`Event`/`CustomEvent` + `crypto.randomUUID`)
  - `randomId.ts`, `toast.ts`, `notifications.ts`, type-only `CombinedLabOrderModal`
- [x] Rewrote `useAuth` (plain hooks; no react-query); Firebase auth RN-only exports via typed cast (no augmentation).
- [x] **NativeWind v4 configured** (tailwind/babel/metro/global.css/nativewind-env/app.json); **React Compiler disabled** for safety.
- [x] Shared UI primitives: `Button`, `Card`, `Input`, `Badge`, `Screen`, `Spinner`, `Text`.
- [ ] (deferred to Phase 3/4) **Image-upload pipeline** (`File`/`FileReader` → expo-image-picker + blob) and `navigator.share/clipboard/print`.
- [x] `tsc --noEmit` → **0 errors**.

### Phase 2 — Data / domain layer (largely covered by Phase 1 above)
- [x] products, orders, offers, patients, cart, quickOrders, promo, surgicalGuides, adminPanel, realtime ported.
- [x] **Image upload** adapted for RN (expo-image-picker → blob → `uploadProductImage`).

### Phase 3 — Screens by role ✅ (core slice)
- [x] **Dentist**: login, home (role-aware), supplies catalog, product detail (add-to-cart + share), cart → checkout, orders, patients + patient detail, **clinic** (appointments + finance), **Rx prescription**, **favorites**, **notifications**, more (language/logout).
- [x] **Quick Orders** (`quick-orders.tsx`): most-ordered list, image URLs, reorder → cart + purchase history.
- [x] **Offers** (`offers.tsx`): product offers from `useImplantOffers` + classifieds (localStorage) with add-ad modal (expo-image-picker, base64 images) and ad details (gallery, call, WhatsApp).
- [x] **Explore tab** (real): live directory of supply/implant/lab accounts with search + category chips → profile.
- [x] **Account hub** (`account.tsx`): profile card, language toggle, notifications/favorites/offers/quick-orders rows, sign out.
- [x] **Profile page** (`profile/[accountId].tsx`): account header, call/WhatsApp/map actions, offers + product grid → product detail.
- [x] **Toasts wired**: `ToastHost` renders real feedback for actions (was a silent no-op).
- [x] **Supply office**: dashboard, add/edit/delete products with image upload (`supplies-office`).
- [x] **Implant company**: dashboard, add/edit/delete products (`implants-office`).
- [x] **Lab**: dashboard with stats + order status workflow (`labs-office`).
- [x] **Admin**: stats + **ads control** (approve pending / deactivate active).
- [x] **Track your cases** (`track-cases.tsx`): live dentist lab-case statuses, filters, progress bars, detail sheet (read markers).
- [x] **Messages** (`messages.tsx`): dentist ↔ lab case chat (real-time subcollection), unread badges, read tracking.
- [x] **Help** (`help.tsx`) with clean Arabic from the web data source.
- [x] **Lab suite** (`labs-office.tsx`): Cases/Team tabs, status cards + filters, stage progress, Advance/Delay controls, case detail, team remove.
- [x] **Admin** (`admin.tsx`): accounts by type, accounts management (search chips, suspend/activate, +3 months subscription), ads approval/deactivation.
- [x] **Doctor Invoices** (`doctor-invoices.tsx`): supplier invoice list, USD/IQD totals, paid/pending/overdue actions.
- [x] **Surgical Guides** (`surgical-guide.tsx`): live guide-company directory (logo, city, systems/material, call).
- [x] **Offers** now lists every supplier's active offers (public "Product Offers" tab).
- [x] _Optional web-only parity deferred (not in the five-role core): case designer, lab pricing/my-services, clinic reports detail._

### Phase 4 — Native feature parity ✅ (code complete; native build required for modules)
- [x] Image upload (expo-image-picker + blob), Share (RN `Share`).
- [x] **Print / PDF**: `expo-print` + `expo-sharing` (`lib/print.ts`) → PDF share for **Rx** and **cart invoice**.
- [x] **Charts**: monthly income/expense bar chart in Clinic Finance (pure Views).
- [x] **Maps**: Google Maps deep links on Profile pages (call/WhatsApp too).
- [x] **QR / barcode scan**: `scan.tsx` (expo-camera) — scans QR + 1D codes, opens matching product; entry from Supplies.
- [x] **Push notifications**: `lib/push.ts` — Android channel + permission + Expo push-token stored on the user doc (`pushTokens`); enable toggle in Notifications.
  - Note: receiving remote pushes on a device needs the Expo push (FCM) credentials configured in the EAS/Expo console; the token registration code is in place.

### Phase 5 — Polish & release (pending user's machine)
- [x] **EAS development builds** (Android APK) — automated keystore, working dev-client workflow.
- [x] **Real fonts**: Cairo (Arabic) + Urbanist (English) via `expo-font`; `ui/Text` maps weight→family by language.
- [x] **Arabic RTL**: `I18nManager.forceRTL` on launch + reload on language toggle; language persisted (`dh_lang`).
- [x] **Home overhaul** to mirror the web home (header, search, hero, image category tiles, brands strip, orders row, Quick Orders + Special Offers cards).
- [x] **Product images**: shared `ProductImage` (URL + lucide placeholder + error fallback); assets copied from web (`assets/home/*`).
- [x] **Deep links**: app scheme `dentalhub://`, plus https `intentFilters` for `dental-hub-df069.web.app`.
- [x] **Privacy & Data Safety**: `PRIVACY_POLICY.md` (bilingual) ready for store review.
- [x] **Production-ready config**: `preview`/`production` EAS profiles (Node 24), all 7 `EXPO_PUBLIC_FIREBASE_*` vars available for `development` + `preview` + `production`; keystore signing in place.
- [ ] **Offline persistence**: Firestore data needs native persistence — the Firebase JS SDK has no offline cache in React Native (local stores already persist via AsyncStorage). Real offline Firestore requires moving to `@react-native-firebase` (deferred; rules/UI unaffected).
- [ ] **Branded icon/splash**: config uses brand blue; final icon artwork requires the project's logo PNG (1024×1024) — supply the file to bake it in.
- [ ] Final device verification (`npx expo start` + install each build) and store submission.

---

## 5. Risks & mitigations

- **Effort:** 67 screens + 103 components is weeks of work. Port `src/lib` logic first (~60% of value).
- **RTL Arabic:** validate `I18nManager.forceRTL` + NativeWind on day one.
- **Firebase native config:** needs platform config files; **existing security rules stay valid** (no rewrite).
- **Charts (recharts):** rebuild finance/reports charts only.
- **SSR bits:** `document`/`window` guards + `getServerSnapshot` become no-ops in RN (safe).

---

## 6. File-by-file port checklist

### `src/lib` (state + logic — port mostly as-is)
- [ ] adminPanel.ts · adminStore.ts · appointmentsStore.ts · cartStore.ts · caseMessages.ts
- [ ] caseTracking.ts · catalogStore.ts · clinicStore.ts · createLocalStore.ts · dentalConfig.ts
- [ ] designerStore.ts · env.ts · favoritesStore.ts · financeStore.ts · firestorePagination.ts
- [ ] firestoreUtils.ts · implantOffers.ts · invoices.ts · labMembersStore.ts · offers.ts
- [ ] orderLines.ts · orders.ts · ordersStore.ts · patientsStore.ts · productImage.ts
- [ ] products.ts · promo.ts · quickOrders.ts · realtime.ts · rxPatientsStore.ts
- [ ] rxTranslations.ts · search.ts · staffStore.ts · storagePipeline.ts · surgicalGuides.ts
- [ ] useAuth.ts · utils.ts · validation.ts

### `src/data` (static data — copy as-is)
- [ ] brands.ts · countries.ts · implants.ts · labs.ts · offices.ts · specs.ts · specializedImplants.ts (+ others)

### `src/integrations/firebase` (replace web SDK with RNFirebase)
- [ ] client.ts → RNFirebase init · config.ts → `EXPO_PUBLIC_*` · types.ts (keep)

### Shared components (rebuild as RN primitives)
- [ ] MobileShell → native navigator + bottom tabs · TopBar → header · BottomTabBar / LabBottomTabBar
- [ ] ProductDetailsModal, ImplantFormModal, BoneGraftModal, SpecializedImplantForm, AdsDashboard/AdsCreationWizard
- [ ] CartDrawer, NotificationBell, CountryCombobox (→ native select), LabRxFormModal, OrderInvoiceModal, etc.

### Routes (mirror into `app/`)
- [ ] Dentist: index, supplies.*, implants.*, orders, quick-orders, favorites, offers, account.*, clinic.*, patients.*, bone-grafts, specialized-implants.*, my-ads, more, explore, profile.*, labs.*, products.*, brands.*
- [ ] Supply: supplies.index + panels
- [ ] Implant: implants.index + panels
- [ ] Lab: labs.dashboard, labs.staff, labs.cases, labs.explore, lab.my-services
- [ ] Admin: admin-standalone, admin

---

## 7. Recommended execution order

1. **Phase 0 + 1** (Expo scaffold + core infra + i18n + stores + Firebase).
2. **Dentist vertical slice** end-to-end to validate the pattern.
3. Scale to the other four roles.
4. Native parity + release.
