# DentalHub — منصة B2B لطب الأسنان

تطبيق يربط أطباء الأسنان بمكاتب المستلزمات والمختبرات ووكلاء زرعات الأسنان في الموصل والعراق.

## التقنيات
- **React 19 + TypeScript** مع **TanStack Router** و **TanStack Query**
- **TailwindCSS v4** و **shadcn/ui** (مكوّنات في `src/components/ui`)
- **Firebase** (Authentication, Firestore, Storage)
- واجهة **عربية RTL** بشكل افتراضي

## بنية المشروع
- `src/routes/` — صفحات File-based routing
- `src/components/` — مكوّنات الواجهة
- `src/lib/` — المنطق والمخازن (cart, orders, invoices, products, …)
- `src/integrations/firebase/` — إعداد Firebase والأنواع
- `firestore.rules` / `firestore.indexes.json` — قواعد الأمان والفهارس

## القواعد الهندسية

### 1. التصميم العريض للـ Modals
النماذج المعقدة تُعرض في Modals **عريضة ومتجاوبة** (`max-w-2xl` → `max-w-6xl`) مع `max-h-[90svh] overflow-y-auto` وترويسة/تذييل ثابتين، وشبكات `md:grid-cols-2 lg:grid-cols-4`.

### 2. حظر حذف مستندات Firestore عند إتمام الطلب
عند إتمام الطلب (Checkout):
- **لا يُحذف أي مستند من Firestore** (ممنوع `deleteDoc` على `invoices`/`orders`).
- يُحفظ الطلب دائمًا في `invoices` بحالة `pending`.
- يُمسح فقط السلة المحلية (`clearCart()`).
- يبقى الطلب ظاهرًا في "طلباتي" (للطبيب) و"فواتير الأطباء" (للمكتب).

### 3. دعم العربية و RTL افتراضيًا
- الافتراضي: `lang = "ar"` و `dir = "rtl"`.
- استخدم الخصائص المنطقية `start-*`/`end-*` بدل `left-*`/`right-*`.
- كل النصوص ثنائية اللغة (`{ ar, en }`).
- الخط العربي: Cairo.

## التشغيل
```bash
npm install
npm run dev      # خادم التطوير
npm run build    # البناء للإنتاج
npm run typecheck # فحص الأنواع (tsc --noEmit)
```

## النشر (Firestore)
```bash
firebase deploy --only firestore:rules,firestore:indexes
```
