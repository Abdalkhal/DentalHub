import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/integrations/firebase/client";
import { MobileShell } from "@/components/MobileShell";
import { TopBar } from "@/components/TopBar";
import { useI18n } from "@/lib/i18n";
import { Loader2, MapPin, Phone, Stethoscope } from "lucide-react";

export const Route = createFileRoute("/doctors")({
  component: DoctorsPage,
});

type Doctor = { id: string; name: string; city: string; phone?: string; clinic?: string };

// Directory of dentists on the platform, grouped by city — same as native's
// doctors screen. (The lab's own cases grouped by doctor live at /lab-doctors.)
function DoctorsPage() {
  const { lang } = useI18n();
  const ar = lang === "ar";

  const { data: doctors = [], isLoading } = useQuery({
    queryKey: ["doctors-directory"],
    queryFn: async (): Promise<Doctor[]> => {
      const snap = await getDocs(collection(db, "public_profiles"));
      return snap.docs
        .map((d) => d.data() as Record<string, unknown>)
        .filter((u) => u.accountType === "dentist")
        .map((u) => ({
          id: String(u.userId ?? ""),
          name: [u.name, u.surname].filter(Boolean).join(" "),
          city: String(u.city || ""),
          phone: typeof u.phone === "string" ? u.phone : undefined,
          clinic: typeof u.clinicName === "string" ? u.clinicName : undefined,
        }))
        .filter((d) => d.id && d.name);
    },
    staleTime: 60_000,
  });

  const otherLabel = ar ? "أخرى" : "Other";
  const byCity = useMemo(() => {
    const m: Record<string, number> = {};
    doctors.forEach((d) => {
      const k = d.city || otherLabel;
      m[k] = (m[k] ?? 0) + 1;
    });
    return m;
  }, [doctors, otherLabel]);

  return (
    <MobileShell wide>
      <TopBar title={ar ? "الأطباء" : "Doctors"} showBack wide maxW="6xl" />
      <div className="px-4 pt-4 pb-8 md:px-6 md:pt-6 lg:px-8 lg:max-w-6xl lg:mx-auto">
        <p className="text-xs text-slate-500">
          {doctors.length} {ar ? "طبيب" : "doctors"}
        </p>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : doctors.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Stethoscope className="size-12 text-slate-300" />
            <p className="mt-3 text-sm text-slate-400">{ar ? "لا يوجد أطباء بعد" : "No doctors yet"}</p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {Object.entries(byCity).map(([city, count]) => (
              <section key={city}>
                <p className="mb-2 text-xs font-bold text-slate-500">
                  {city} · {count}
                </p>
                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  {doctors
                    .filter((d) => (d.city || otherLabel) === city)
                    .map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm"
                      >
                        <span className="size-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-base font-extrabold shrink-0">
                          {d.name.charAt(0)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-800">{d.name}</p>
                          <div className="mt-0.5 flex items-center gap-3">
                            {d.city && (
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <MapPin className="size-3 text-slate-400" />
                                {d.city}
                              </span>
                            )}
                            {d.clinic && <span className="truncate text-[11px] text-slate-400">{d.clinic}</span>}
                          </div>
                        </div>
                        {d.phone && (
                          <a
                            href={`tel:${d.phone}`}
                            aria-label={ar ? "اتصال" : "Call"}
                            className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition shrink-0"
                          >
                            <Phone className="size-4" />
                          </a>
                        )}
                      </div>
                    ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </MobileShell>
  );
}
