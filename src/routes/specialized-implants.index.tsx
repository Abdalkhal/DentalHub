import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Zap,
  Brain,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import specializedImplantImg from "@/assets/spetialized_implant.jpg";
import tiryGuidImg from "@/assets/tiry_guid.jpg";
import zigumaticImg from "@/assets/zigumatic.jpg";
import allOn4Img from "@/assets/all_on4.jpg";
import tranusImg from "@/assets/tranus.jpg";
import customMeshImg from "@/assets/3d_custom_mesh.jpg";

export const Route = createFileRoute("/specialized-implants/")({
  component: SpecializedImplantsPage,
});

type System = {
  id: string;
  ar: string;
  en: string;
  descAr: string;
  descEn: string;
  img: string;
};

const SYSTEMS: System[] = [
  {
    id: "subperiosteal",
    ar: "زراعات تحت السمحاق",
    en: "Subperiosteal Implant",
    descAr: "إطار معدني مخصص يوضع على العظم للحالات ذات الفقد العظمي الشديد",
    descEn: "Custom metal frame over bone for severe bone loss cases",
    img: specializedImplantImg,
  },
  {
    id: "pterygoid",
    ar: "زراعات الجناحية",
    en: "Pterygoid Implant",
    descAr: "تثبيت خلفي عبر الناتئ الجناحي للفك العلوي",
    descEn: "Posterior anchorage through the pterygoid process",
    img: tiryGuidImg,
  },
  {
    id: "zygomatic",
    ar: "زراعات الوجنة",
    en: "Zygomatic Implant",
    descAr: "رسوٌّ طويل في العظم الوجني لتفادي الترقيع",
    descEn: "Long anchorage in the zygomatic bone avoiding grafts",
    img: zigumaticImg,
  },
  {
    id: "allonx",
    ar: "حلول All-on-4® / All-on-X",
    en: "All-on-4® / All-on-X",
    descAr: "تركيبة فك كامل على 4 زرعات أو أكثر في جلسة واحدة",
    descEn: "Full-arch prosthesis on 4+ implants in a single session",
    img: allOn4Img,
  },
  {
    id: "transsinus",
    ar: "زراعات عبر الجيب الفكي",
    en: "Trans Sinus Implant",
    descAr: "زرع عبر الجيب الفكي العلوي للفك الخلفي الضعيف",
    descEn: "Through the maxillary sinus for a weak posterior maxilla",
    img: tranusImg,
  },
  {
    id: "mesh",
    ar: "شبكة تيتانيوم مخصصة ثلاثية الأبعاد",
    en: "3D Custom Titanium Mesh",
    descAr: "شبكة مطبوعة ثلاثية الأبعاد لإعادة بناء العظم بدقة",
    descEn: "3D-printed mesh for precise bone reconstruction",
    img: customMeshImg,
  },
];

const FEATURES: { ar: string; en: string; icon: LucideIcon }[] = [
  { ar: "نتائج تجميلية ووظيفية", en: "Esthetic & functional outcomes", icon: Sparkles },
  { ar: "تقليل الحاجة للترقيع", en: "Less grafting required", icon: ShieldCheck },
  { ar: "ثبات فوري عالٍ", en: "High primary stability", icon: Zap },
  { ar: "حلول للحالات المعقدة", en: "Solutions for complex cases", icon: Brain },
];

const BRANDS = ["Nobel Biocare", "Zygoma", "Osteogenics", "Osstem"];

function SpecializedImplantsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";
  const router = useRouter();

  return (
    <MobileShell>
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.history.back()}
            className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition"
            aria-label={ar ? "رجوع" : "Back"}
          >
            <ArrowRight className="size-5 rtl:rotate-180" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="size-5 text-sky-600 shrink-0" />
            <h1 className="font-display font-extrabold text-lg text-slate-900 truncate">
              {ar ? "الزرعات المتخصصة" : "Specialized Implants"}
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              toast.info(
                ar
                  ? "المساعدة: استشر مختصاً لاختيار النظام المناسب"
                  : "Help: consult a specialist for the right system",
              )
            }
            className="flex items-center gap-1 h-10 px-3 rounded-xl bg-sky-50 text-sky-700 text-xs font-bold hover:bg-sky-100 transition"
          >
            <HelpCircle className="size-4" />
            {ar ? "مساعدة ⓘ" : "Help ⓘ"}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {ar
            ? "حلول زرع متقدمة للحالات المعقدة وفقدان العظم الشديد"
            : "Advanced implant solutions for complex cases and severe bone loss"}
        </p>
      </div>

      <div className="px-4 pt-4 pb-10 space-y-6">
        {/* Specialized systems grid */}
        <div className="grid grid-cols-2 gap-3">
          {SYSTEMS.map((s) => (
            <Link
              key={s.id}
              to="/specialized-implants/$category"
              params={{ category: s.id }}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col cursor-pointer"
            >
              {/* Top row: title (dual language) */}
              <div className="px-3.5 pt-3 pb-2.5">
                <p className="font-display font-bold text-sm leading-snug text-slate-800">{s.ar}</p>
                <p className="text-[11px] font-bold text-slate-800 mt-0.5 truncate" dir="ltr">
                  {s.en}
                </p>
              </div>

              {/* Middle row: image */}
              <div className="h-36 bg-slate-100 overflow-hidden">
                <img
                  src={s.img}
                  alt={`${s.ar} / ${s.en}`}
                  className="size-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Bottom section: description */}
              <div className="px-3.5 pt-2.5 pb-3.5 flex flex-col flex-1">
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                  {ar ? s.descAr : s.descEn}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Features banner */}
        <div
          className="rounded-3xl p-4 text-white shadow-lg relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)" }}
        >
          <div className="absolute -top-10 -end-10 size-36 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <p className="font-display font-extrabold text-base mb-3">
              {ar ? "لماذا الزرعات المتخصصة؟" : "Why specialized implants?"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.en}
                    className="flex items-center gap-2.5 bg-white/10 backdrop-blur rounded-2xl p-3"
                  >
                    <span className="size-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Icon className="size-4" />
                    </span>
                    <p className="text-[12px] font-bold leading-snug">{ar ? f.ar : f.en}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Brands carousel */}
        <div>
          <p className="font-display font-bold text-sm text-slate-800 mb-3">
            {ar ? "الماركات المدعومة" : "Supported Brands"}
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
            {BRANDS.map((b) => (
              <div
                key={b}
                className="shrink-0 inline-flex items-center justify-center h-12 px-5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-bold shadow-sm"
              >
                {b}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom action + disclaimer */}
        <div className="space-y-3">
          <Link
            to="/implants"
            className="w-full h-14 rounded-2xl bg-sky-600 text-white font-display font-extrabold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition shadow-lg"
          >
            <Plus className="size-5" />
            {ar ? "إضافة زرعة متخصصة جديدة" : "Add New Specialized Implant"}
          </Link>
          <p className="text-[11px] text-slate-400 leading-relaxed text-center">
            {ar
              ? "هذه الأنظمة تتطلب تخطيطاً دقيقاً وتقييماً سريرياً وتصويراً متقدماً (CBCT) من قبل مختص ذوي خبرة"
              : "These systems require careful planning, clinical evaluation, and advanced imaging (CBCT) by an experienced specialist"}
          </p>
        </div>
      </div>
    </MobileShell>
  );
}
