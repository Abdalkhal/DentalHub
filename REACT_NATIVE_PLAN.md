# React Native Migration Plan – DentalHub

## PHASE 0: Foundation (Week 1)

### 0.1 Expo SDK 52+ (Managed Workflow + Dev Client)
```
npx create-expo-app@latest DentalHubNative --template blank-typescript
```
- Use **Expo Router** (file-based routing, mirrors TanStack Router pattern)
- Enable **Expo Dev Client** for native module support (Firebase RN requires it)
- Metro bundler replaces Vite — configure `metro.config.js` with `@expo/metro-config`

### 0.2 React Native Firebase (Same Backend — Zero Backend Changes)
```json
"@react-native-firebase/app": "latest",
"@react-native-firebase/auth": "latest",
"@react-native-firebase/firestore": "latest",
"@react-native-firebase/storage": "latest"
```
- Identical Firebase project, same `google-services.json` (Android) / `GoogleService-Info.plist` (iOS)
- Auth: `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `onAuthStateChanged` — same API surface
- Firestore: `collection()`, `getDocs()`, `setDoc()`, `updateDoc()`, `deleteDoc()` — identical to Web SDK
- Storage: `ref()`, `uploadBytes()` → `putFile()` (minor API diff for file uploads)
- **No backend changes needed.** The Firestore collections, security rules, and auth remain identical.

### 0.3 Shared Code Module
Create a shared `/shared` package for all backend-agnostic code that runs on both web and RN:
```
/shared/
  types.ts          ← UserRoleDoc, ProductDoc, OrderDoc, AccountType (from integrations/firebase/types.ts)
  cities.ts         ← CITIES, BRANCHES (from data/offices.ts)
  implants.ts       ← static implant data (from data/implants.ts)
  countries.ts      ← ALL_COUNTRIES (from data/countries.ts)
  specialities.ts   ← DENTAL_SPECIALITIES
  helpTopics.ts     ← help topics data
  constants.ts      ← DEFAULT_CITY, currency types, etc.
  validators.ts     ← Zod schemas reused across platforms
```
These files have zero DOM/Firebase dependencies — pure TypeScript.

---

## PHASE 1: Styling & UI Framework (Week 2)

### 1.1 NativeWind v4 (Tailwind for React Native)
```json
"nativewind": "latest",
"tailwindcss": "^4.0.0"
```
- Identical utility classes: `px-4`, `bg-primary`, `rounded-2xl`, `font-bold`, `shadow-card`
- The web app's `cn()` utility works identically in RN with `clsx` + `tailwind-merge`
- Custom theme tokens (`--color-primary`, `--font-display`) map to NativeWind's `tailwind.config.ts`
- **~80% of existing className strings port directly** (RN-safe: flex, padding, margin, colors, typography, border-radius. NOT unsafe: grid, sticky, backdrop-blur — need RN alternatives)

### 1.2 React Native Reusables (shadcn/ui for React Native)
Use **`@rn-primitives`** (by the same team as shadcn/ui) + NativeWind:
```
npx @rn-primitives/cli@latest init
```
Mapping web shadcn/ui → RN:
| Web Component | React Native Equivalent |
|---|---|
| `Dialog` / `DialogContent` | `@rn-primitives/dialog` + RN `Modal` |
| `Tabs` | `@rn-primitives/tabs` |
| `Select` | `@rn-primitives/select` (or `@react-native-picker/picker`) |
| `Button` | `@rn-primitives/button` (Pressable + NativeWind) |
| `Input` | `@rn-primitives/input` (TextInput + NativeWind) |
| `Checkbox` | `@rn-primitives/checkbox` |
| `Switch` | `@rn-primitives/switch` / RN `Switch` |
| `Avatar` | `@rn-primitives/avatar` (Image + fallback) |
| `Card` | Custom `View` with NativeWind styling |
| `Badge` | Custom `View` with NativeWind |
| `Sonner` (toasts) | `react-native-toast-message` |
| `Carousel` | `react-native-reanimated-carousel` |
| `Calendar` | `react-native-calendars` |
| `Command` | `@react-native-aria/combobox` or BottomSheet list |
| `Slider` | `@react-native-community/slider` |
| `Progress` | Custom `View` with animated width |
| `Skeleton` | `rn-placeholder` or custom shimmer `View` |
| `ScrollArea` | `ScrollView` (built-in) |
| `Sheet` (Drawer) | `@gorhom/bottom-sheet` |
| `Accordion` | `react-native-collapsible` |
| `Tooltip` | `rn-tooltip` |
| `DropdownMenu` | `zeego` (native dropdown menus on iOS/Android) |
| `ContextMenu` | `zeego` |
| `HoverCard` | **Skip** — no hover on mobile |

### 1.3 Icons
```json
"lucide-react-native": "latest"
```
- Same icon set, identical names — just `import { Package } from "lucide-react-native"` instead of `lucide-react`.

### 1.4 Fonts
```bash
npx expo install expo-font @expo-google-fonts/cairo @expo-google-fonts/urbanist @expo-google-fonts/epilogue
```
- Same fonts (Cairo, Urbanist, Epilogue) via Expo Google Fonts
- RTL/LTR font swapping identical to web

### 1.5 Maps
```json
"react-native-maps": "latest"
```
- Replaces Leaflet. `MapView` with `Marker` components.
- Google Maps URLs open via `Linking.openURL()` (identical behavior to web)

### 1.6 Charts
```json
"victory-native": "latest"
```
- Replaces `recharts`. Skia-backed, high performance.

### 1.7 PDF / Image Export
```json
"react-native-view-shot": "latest",
"expo-print": "latest"
```
- `captureRef()` replaces `html2canvas`
- `Print.printToFileAsync()` replaces `jspdf`

---

## PHASE 2: Architecture Matching (Week 2-3)

### 2.1 Navigation (Expo Router → TanStack Router)
Expo Router is file-based, identical pattern to TanStack Router:

| TanStack Router | Expo Router |
|---|---|
| `createFileRoute('/supplies/')` | `app/supplies/index.tsx` |
| `createFileRoute('/supplies/$officeId/')` | `app/supplies/[officeId]/index.tsx` |
| `createFileRoute('/supplies/$officeId/$branchSlug')` | `app/supplies/[officeId]/[branchSlug].tsx` |
| `createFileRoute('/profile/$accountId')` | `app/profile/[accountId].tsx` |
| `Link({ to: '/supplies', params })` | `Link({ href: '/supplies' })` or `router.push()` |
| `useNavigate()` | `useRouter()` from `expo-router` |
| `validateSearch` (Zod) | Route params + `useLocalSearchParams()` |

Navigation structure reproduces all routes from the web app:
```
app/
  (tabs)/
    _layout.tsx          ← Bottom tab navigator (replaces MobileShell BottomTabBar)
    index.tsx            ← Home (/)
    explore.tsx          ← Explore (/explore)
    orders.tsx           ← Orders (/orders)
    account.tsx          ← Account (/account)
    more.tsx             ← More (/more)
  auth.tsx               ← Auth (/auth)
  login.tsx              ← Login (/login)
  supplies/
    index.tsx            ← Supplies index (/supplies)
    branch/
      [branchSlug].tsx   ← Branch detail
    [officeId]/
      index.tsx           ← Office detail
      [branchSlug].tsx   ← Office branch detail
  labs/
    index.tsx
    explore.tsx
    dashboard.tsx
    cases.tsx
    [labId]/
      index.tsx
      statement.tsx
  implants/
    index.tsx
    [country].tsx
  profile/
    [accountId].tsx
  admin.tsx
  pricing.tsx
  /* ... remaining routes */
```

### 2.2 Layout Pattern (MobileShell → Root Layout + Tab Navigator)
Replace `MobileShell` (web-only DOM wrapper) with:
- `app/_layout.tsx` — Root `Stack` navigator (header + background wrapper)
- `app/(tabs)/_layout.tsx` — `BottomTabNavigator` with 5 tabs (Home, Explore, Orders, Account, More)
- `SafeAreaView` replaces `min-h-screen` / viewport handling
- `KeyboardAvoidingView` for form screens

### 2.3 TopBar → Stack Header
- Expo Router's `Stack.Screen` with `headerTitle`, `headerLeft` (back), `headerRight` (language toggle + search icon)
- Search mode: `Stack.Screen` with `headerSearchBarOptions` (iOS native search bar) or custom header
- Language toggle in header right (same pattern as web)

---

## PHASE 3: Auth Flow (Week 2-3)

### 3.1 Firebase Auth — Identical Logic
The `useAuth.ts` hooks work near-identically:
```typescript
// useSession() — identical
import auth from '@react-native-firebase/auth';
const useSession = () => {
  const [user, setUser] = useState(auth().currentUser);
  useEffect(() => {
    const sub = auth().onAuthStateChanged(setUser);
    return sub;
  }, []);
  return { user, loading: user === undefined };
};
```
- `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut` — identical API
- `updatePassword`, `deleteUser`, `reauthenticateWithCredential` — all identical
- **Auth state persistence** works via Keychain (iOS) / Keystore (Android) automatically

### 3.2 Registration Forms
- Reuse the same field structure and business logic from `auth.tsx` / `AuthCard.tsx`
- `react-hook-form` + `zod` work identically in React Native
- Account type selector: same 4-card layout (dentist/supply/lab/implant)
- City dropdown: use `@rn-primitives/select` with same CITIES data
- Date picker for DOB: `@react-native-community/datetimepicker` or Expo's date picker

---

## PHASE 4: Data Layer (Week 2-3)

### 4.1 React Query — Exact Same Pattern
```typescript
// products.ts — identical except import source
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Query keys identical: ["products"], ["user-role", uid], ["orders", id], etc.
// Cache settings identical: staleTime, etc.
```

### 4.2 Firestore Operations — Near-identical
| Web SDK | RN Firebase |
|---|---|
| `getDocs(collection(db, "user_roles"))` | `firestore().collection("user_roles").get()` |
| `setDoc(doc(db, "products", id), data)` | `firestore().collection("products").doc(id).set(data)` |
| `updateDoc(d.ref, { city: "بغداد" })` | `doc.ref.update({ city: "بغداد" })` |
| `doc(db, "user_roles", uid)` | `firestore().collection("user_roles").doc(uid)` |
| `query(collection, where(...), orderBy(...))` | `firestore().collection("products").where(...).orderBy(...)` |
| `Timestamp.now()` | `firestore.Timestamp.now()` |
| `serverTimestamp()` | `firestore.FieldValue.serverTimestamp()` |

### 4.3 Storage Operations — Minor Differences
| Web SDK | RN Firebase |
|---|---|
| `uploadBytes(ref(storage, path), file)` | `storage().ref(path).putFile(file.uri)` |
| `getDownloadURL(ref(storage, path))` | `storage().ref(path).getDownloadURL()` |
| `deleteObject(ref(storage, path))` | `storage().ref(path).delete()` |
| Image picker: `<input type="file">` | `expo-image-picker` (`launchImageLibraryAsync`) |

### 4.4 Local Storage Stores (adminStore, ordersStore)
- Replace `localStorage` with `@react-native-async-storage/async-storage` or `expo-secure-store`
- `useSyncExternalStore` pattern works the same in RN (polyfilled in React 18+)
- `ordersStore.ts` and `adminStore.ts` port with minimal changes (swap storage backend)

---

## PHASE 5: i18n & RTL (Week 3)

### 5.1 Translation System — Identical
- The `i18n.tsx` module ports directly: same `dict` object, same `useI18n()` hook, same `t(key)` function
- Language toggle in headers same as web
- RTL handling:
  ```typescript
  import { I18nManager } from 'react-native';
  // Set: I18nManager.forceRTL(true) on language change + reload
  // Or use Expo's: expo-localization + expo-updates for hot reload
  ```
- Better approach: `expo-localization` detects device locale, pre-sets `I18nManager`
- All NativeWind RTL utilities (`start-3` / `end-3` / `text-left` / `text-right`) work auto-mirrored

### 5.2 Fonts — Same
- Cairo (Arabic), Urbanist (display), Epilogue (body) — loaded via `expo-font`
- Same CSS classes map to NativeWind font family classes

---

## PHASE 6: Feature Porting Order (Week 3-6)

### Week 3: Core Screens
1. **Auth** (`/auth`, `/login`, `/register`) — Firebase Auth + Firestore user_roles creation
2. **Home** (`/`) — Banner carousel (react-native-reanimated-carousel), sections grid (Pressable cards)
3. **Account** (`/account`) — Profile display, photo upload (expo-image-picker), navigation
4. **Account Settings** (`/account/settings`) — Form-based profile editing, password change, city picker
5. **More** (`/more`) — Link list to all sections

### Week 4: Supply Directory (the feature you just built)
6. **Supplies Index** (`/supplies`) — `BrowseSupplies` component:
   - City scrollbar (horizontal `ScrollView` with Pressable pills)
   - Category tabs (3 tabs: الكل, شركات الزرعات, شركات المستلزمات)
   - Dual-filtering logic (identical `useMemo`)
   - Legacy account handling with `DEFAULT_CITY + updateDoc`
   - Office detail (`/supplies/[officeId]`) — product listing
   - Branch detail (`/supplies/[officeId]/[branchSlug]`) — products by branch

### Week 5: Supplier Dashboards & Products
7. **Supply Dashboard** — Products CRUD, Offers, Orders tabs
8. **Implant Dashboard** — Implant products with full specs (Diameter, Length, Connection, Country)
9. **Product forms** — Image upload via `expo-image-picker`, form validation with react-hook-form

### Week 6: Remaining Sections
10. **Orders** (`/orders`) — Lists, status filters, CRUD modals
11. **Labs** (`/labs/*`) — Lab listing, exploration, detail, cases
12. **Implants** (`/implants/*`) — Country-based browsing
13. **Explore** — Global search across all data
14. **Admin** — Branches/Offices/Labs management

### Lower Priority / V2
- Dashboard analytics (charts)
- Finance / invoicing
- Messages (chat — needs real-time Firestore listeners or push notifications)
- Reports (PDF generation)
- Production tracker (Kanban)
- Patients / Doctors directories
- Pricing page

---

## PHASE 7: Publishing (Week 6-7)

### 7.1 EAS Build (Expo Application Services)
```bash
npx eas-cli build:configure
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
```
- Managed signing certificates (iOS Provisioning Profile + Android Keystore)
- Auto-incrementing build numbers
- OTA updates via `expo-updates` for non-native changes

### 7.2 App Store Configuration
- iOS: App Store Connect listing (screenshots, description, privacy policy)
- Android: Google Play Console listing
- Same bundle ID (`com.dentalhub.app`)
- In-app purchases via RevenueCat for premium features (future)

### 7.3 Push Notifications
```bash
npx expo install expo-notifications
```
- Firebase Cloud Messaging (FCM) token registration
- Order status updates, new offers, lab case status changes
- Configure APNs (iOS) + FCM (Android) in Firebase Console

---

## PHASE 8: Production Hardening (Week 7-8)

### 8.1 Offline Support
```json
"@react-native-firebase/firestore"  // already has offline persistence enabled via
// firestore().settings({ persistence: true })  // default in RN Firebase
```
- React Query `staleTime` already provides cache-first reads
- Firestore offline persistence gives writes even without internet

### 8.2 Error Monitoring
```bash
npx expo install expo-crashlytics
```
- `@react-native-firebase/crashlytics` — crash reporting
- Error boundaries per route (same pattern as web)

### 8.3 Performance
- `FlatList` with `windowSize={5}` for long scrollable lists
- Image caching: `expo-image` (Glide/SDWebImage under the hood) instead of RN `Image`
- `React.memo` + `useMemo` on filtered lists (already in web code)
- Hermes engine (default in Expo SDK 52+) — bytecode precompilation

### 8.4 Security
- React Native Firebase enforces App Check (AppAttest for iOS, Play Integrity for Android)
- Same Firestore security rules — no changes needed
- Auth token management handled automatically by RN Firebase

### 8.5 Deep Linking
```typescript
// app.json / app.config.ts
{
  "scheme": "dentalhub",
  "plugins": ["expo-router"]
}
```
- Universal links: `https://dentalhub.app/supplies/office123`
- Share order links: `dentalhub://orders/abc`
- Push notification tap → deep link to relevant screen

---

## CRITICAL REUSE SUMMARY

| Layer | Reuse % | What Changes |
|---|---|---|
| **Firebase Backend** | 100% | Nothing. Same project, same collections, same rules. |
| **Data types** | 100% | Copy `types.ts` to shared module. |
| **Static data** | 100% | CITIES, BRANCHES, implants, countries, specialties, help topics. |
| **Business logic** | 95% | Filtering logic, role checks, form validation (Zod schemas), i18n dict, currency formatting, product specs. |
| **React Query hooks** | 90% | Query keys, cache settings identical. Firestore API names differ slightly. |
| **Auth flow** | 90% | Same API. Registration form layout adapts to RN ScrollView. |
| **i18n/RTL** | 85% | Same dict, toggle, font switching. RTL via `I18nManager` instead of `<html dir>`. |
| **UI styles** | 80% | Tailwind classes port directly via NativeWind. Grid → Flexbox, backdrop-blur → opacity overlay, sticky → not available (use absolute positioned header). |
| **Component markup** | 70% | div→View, span→Text, img→Image, button→Pressable, input→TextInput. Semantic structure identical. |
| **Navigation** | 60% | Expo Router has same file-based pattern, but API differs (`<Link href>` vs `to+params`, `router.push` vs `navigate`). |
| **Storage uploads** | 50% | `putFile(uri)` instead of `uploadBytes(file)`. Image picker replaces `<input type="file">`. |
| **Charts/PDF** | 20% | Different libraries (victory-native vs recharts, expo-print vs jspdf). Logic stays, rendering changes. |

---

## TOTAL ESTIMATE: 7-8 weeks for a solo developer

| Phase | Duration | Deliverable |
|---|---|---|
| Foundation + Shared code | Week 1 | Expo project, Firebase RN, shared types/data |
| UI Framework + Navigation | Week 2 | NativeWind, rn-primitives, tab navigator, headers |
| Auth + Account | Week 2-3 | Login, register, profile, settings |
| Supply Directory | Week 3-4 | BrowseSupplies (dual-filtering), office/branch detail |
| Supplier Dashboards | Week 4-5 | Products CRUD, offers, orders |
| Labs + Implants + Orders | Week 5-6 | All remaining business screens |
| Publishing | Week 6-7 | EAS builds, store listings |
| Polish + Hardening | Week 7-8 | Offline, push notifications, crash reporting, deep links |
