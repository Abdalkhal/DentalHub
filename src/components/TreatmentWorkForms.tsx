/** Orthodontic and implant session forms for the treatment work sheet. */
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMPLANTS } from "@/data/implants";
import { useImplantCompanyNames } from "@/lib/implantOffers";
import {
  ABUTMENTS,
  BONE_TYPES,
  CLOSURE,
  COMMON_IMPLANT_SYSTEMS,
  CROWN_MATERIALS,
  ELASTIC_FORCES,
  ELASTIC_SIZES,
  ELASTIC_TYPES,
  GINGIVA,
  GRAFTS,
  HYGIENE,
  IMPLANT_FLAP,
  IMPLANT_TIMING,
  IMPLANT_TYPES,
  IMPRESSIONS,
  LOADING_MONTHS,
  MEMBRANES,
  MOLAR_CLASSES,
  NEXT_WEEKS,
  ORTHO_ANCHORAGE,
  ORTHO_APPLIANCES,
  ORTHO_ARCHES,
  ORTHO_EXTRAS,
  ORTHO_PRESCRIPTIONS,
  ORTHO_SLOTS,
  ORTHO_TYPES,
  ORTHO_VISITS,
  PAIN,
  RETAINERS,
  RETENTION,
  SINUS_LIFT,
  WEAR_HOURS,
  WIRE_MATERIALS,
  WIRE_SIZES,
  addToDate,
  type ImplantFixture,
  type ImplantSession,
  type Option,
  type OrthoSession,
  type OrthoWire,
} from "@/lib/treatmentWork";

const fieldCls =
  "h-10 w-full rounded-lg border border-border bg-card px-2.5 text-[12px] focus:outline-none focus:ring-2 focus:ring-ring/40";
const num = (v: string) => v.replace(/[^\d.,]/g, "").replace(",", ".");

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-extrabold text-foreground/80">{title}</p>
      {children}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full border text-[11px] font-bold transition",
        on
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card text-muted-foreground border-border hover:border-primary/40",
      )}
    >
      {children}
    </button>
  );
}

/** One choice out of a list; tapping the chosen one again clears it. */
function Choice({
  options,
  value,
  onChange,
  ar,
  ltr,
}: {
  options: Option[];
  value?: string;
  onChange: (v: string | undefined) => void;
  ar: boolean;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" dir={ltr ? "ltr" : undefined}>
      {options.map((o) => (
        <Chip
          key={o.key}
          on={value === o.key}
          onClick={() => onChange(value === o.key ? undefined : o.key)}
        >
          {ar ? o.ar : o.en}
        </Chip>
      ))}
    </div>
  );
}

/** Several choices out of a list. */
function Multi({
  options,
  value,
  onChange,
  ar,
}: {
  options: Option[];
  value?: string[];
  onChange: (v: string[]) => void;
  ar: boolean;
}) {
  const list = value ?? [];
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Chip
          key={o.key}
          on={list.includes(o.key)}
          onClick={() =>
            onChange(list.includes(o.key) ? list.filter((k) => k !== o.key) : [...list, o.key])
          }
        >
          {ar ? o.ar : o.en}
        </Chip>
      ))}
    </div>
  );
}

function Num({
  value,
  onChange,
  placeholder,
  suffix,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="relative" dir="ltr">
      <input
        value={value ?? ""}
        onChange={(e) => onChange(num(e.target.value))}
        inputMode="decimal"
        placeholder={placeholder}
        className={cn(fieldCls, suffix && "pe-10")}
      />
      {suffix && (
        <span className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** Session type picker shown at the top of the form. */
export function TypePicker({
  options,
  value,
  onChange,
  ar,
}: {
  options: Option[];
  value: string;
  onChange: (v: string) => void;
  ar: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-muted/60 p-1.5 sm:grid-cols-4">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "h-9 rounded-xl text-[11px] font-extrabold transition",
            value === o.key
              ? "bg-card text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {ar ? o.ar : o.en}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orthodontics
// ---------------------------------------------------------------------------

function WireRow({
  label,
  wire,
  onChange,
}: {
  label: string;
  wire?: OrthoWire;
  onChange: (w: OrthoWire) => void;
}) {
  const w = wire ?? {};
  return (
    <div className="rounded-xl border border-border p-2.5 space-y-1.5" dir="ltr">
      <p className="text-[11px] font-extrabold">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {WIRE_SIZES.map((o) => (
          <Chip
            key={o.key}
            on={w.size === o.key}
            onClick={() => onChange({ ...w, size: w.size === o.key ? undefined : o.key })}
          >
            {o.en}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {WIRE_MATERIALS.map((o) => (
          <Chip
            key={o.key}
            on={w.material === o.key}
            onClick={() => onChange({ ...w, material: w.material === o.key ? undefined : o.key })}
          >
            {o.en}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function OrthoFields({
  value: o,
  onChange,
  date,
  ar,
}: {
  value: OrthoSession;
  onChange: (o: OrthoSession) => void;
  date: string;
  ar: boolean;
}) {
  const set = (patch: Partial<OrthoSession>) => onChange({ ...o, ...patch });
  const next = o.nextWeeks ? addToDate(date, { weeks: Number(o.nextWeeks) }) : "";

  const nextVisit = (
    <Section title={ar ? "الموعد القادم بعد" : "Next visit in"}>
      <div className="flex flex-wrap items-center gap-1.5">
        {NEXT_WEEKS.map((w) => (
          <Chip
            key={w.key}
            on={o.nextWeeks === w.key}
            onClick={() => set({ nextWeeks: o.nextWeeks === w.key ? undefined : w.key })}
          >
            {ar ? `${w.key} أسابيع` : `${w.key} weeks`}
          </Chip>
        ))}
        {next && (
          <span className="text-[11px] font-bold text-primary">
            {ar ? "الموعد المقترح" : "Suggested"} <bdi dir="ltr">{next}</bdi>
          </span>
        )}
      </div>
    </Section>
  );

  if (o.type === "setup")
    return (
      <>
        <Section title={ar ? "نوع الجهاز" : "Appliance"}>
          <Choice
            options={ORTHO_APPLIANCES}
            value={o.appliance}
            onChange={(v) => set({ appliance: v })}
            ar={ar}
          />
        </Section>
        <Section title={ar ? "الفك" : "Arches"}>
          <Choice
            options={ORTHO_ARCHES}
            value={o.arches}
            onChange={(v) => set({ arches: v })}
            ar={ar}
          />
        </Section>
        {o.appliance !== "aligners" && o.appliance !== "removable" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Section title={ar ? "نظام البراكت" : "Prescription"}>
              <Choice
                options={ORTHO_PRESCRIPTIONS}
                value={o.prescription}
                onChange={(v) => set({ prescription: v })}
                ar={ar}
                ltr
              />
            </Section>
            <Section title={ar ? "مقاس الشق" : "Slot"}>
              <Choice
                options={ORTHO_SLOTS}
                value={o.slot}
                onChange={(v) => set({ slot: v })}
                ar={ar}
                ltr
              />
            </Section>
          </div>
        )}
        <Section title={ar ? "تشخيص البداية" : "Initial diagnosis"}>
          <Choice
            options={MOLAR_CLASSES}
            value={o.molarClass}
            onChange={(v) => set({ molarClass: v })}
            ar={ar}
            ltr
          />
          <div className="grid grid-cols-2 gap-2">
            <Num
              value={o.overjet}
              onChange={(v) => set({ overjet: v })}
              placeholder="Overjet"
              suffix="mm"
            />
            <Num
              value={o.overbite}
              onChange={(v) => set({ overbite: v })}
              placeholder="Overbite"
              suffix="mm"
            />
          </div>
        </Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title={ar ? "أسنان للقلع (إن وجدت)" : "Extractions (if any)"}>
            <input
              value={o.extractions ?? ""}
              onChange={(e) => set({ extractions: e.target.value })}
              placeholder="14, 24, 34, 44"
              className={fieldCls}
              dir="ltr"
            />
          </Section>
          <Section title={ar ? "المدة المتوقعة" : "Estimated duration"}>
            <Num
              value={o.months}
              onChange={(v) => set({ months: v.replace(/\D/g, "") })}
              placeholder="18"
              suffix={ar ? "شهر" : "mo"}
            />
          </Section>
        </div>
        <Section title={ar ? "التثبيت (Anchorage)" : "Anchorage"}>
          <Choice
            options={ORTHO_ANCHORAGE}
            value={o.anchorage}
            onChange={(v) => set({ anchorage: v })}
            ar={ar}
          />
        </Section>
        {nextVisit}
      </>
    );

  if (o.type === "aligner")
    return (
      <>
        <Section title={ar ? "رقم الـAligner" : "Aligner number"}>
          <div className="grid grid-cols-2 gap-2">
            <Num
              value={o.alignerNo}
              onChange={(v) => set({ alignerNo: v.replace(/\D/g, "") })}
              placeholder={ar ? "الحالي" : "Current"}
            />
            <Num
              value={o.alignerTotal}
              onChange={(v) => set({ alignerTotal: v.replace(/\D/g, "") })}
              placeholder={ar ? "المجموع" : "Total"}
            />
          </div>
        </Section>
        <label className="flex items-center gap-2 text-[12px] font-bold">
          <input
            type="checkbox"
            checked={!!o.attachments}
            onChange={(e) => set({ attachments: e.target.checked })}
            className="size-4 accent-primary"
          />
          {ar ? "تم وضع Attachments" : "Attachments placed"}
        </label>
        <Section title={ar ? "IPR (الأسنان والملم)" : "IPR (teeth & mm)"}>
          <input
            value={o.ipr ?? ""}
            onChange={(e) => set({ ipr: e.target.value })}
            placeholder="31/41 0.2mm"
            className={fieldCls}
            dir="ltr"
          />
        </Section>
        <Section title={ar ? "ساعات اللبس يومياً" : "Wear hours a day"}>
          <Choice
            options={WEAR_HOURS}
            value={o.wearHours}
            onChange={(v) => set({ wearHours: v })}
            ar={ar}
            ltr
          />
        </Section>
        <Section title={ar ? "نظافة الفم" : "Oral hygiene"}>
          <Choice
            options={HYGIENE}
            value={o.hygiene}
            onChange={(v) => set({ hygiene: v })}
            ar={ar}
          />
        </Section>
        {nextVisit}
      </>
    );

  if (o.type === "debond")
    return (
      <Section title={ar ? "المثبت (Retainer)" : "Retainers"}>
        <Multi
          options={RETAINERS}
          value={o.retainers}
          onChange={(v) => set({ retainers: v })}
          ar={ar}
        />
      </Section>
    );

  return (
    <>
      <Section title={ar ? "نوع الزيارة" : "Visit"}>
        <Choice
          options={ORTHO_VISITS}
          value={o.visit}
          onChange={(v) => set({ visit: v })}
          ar={ar}
        />
      </Section>
      <Section title={ar ? "السلك" : "Archwires"}>
        <div className="grid gap-2 md:grid-cols-2">
          <WireRow
            label={ar ? "العلوي (U)" : "Upper (U)"}
            wire={o.upper}
            onChange={(w) => set({ upper: w })}
          />
          <WireRow
            label={ar ? "السفلي (L)" : "Lower (L)"}
            wire={o.lower}
            onChange={(w) => set({ lower: w })}
          />
        </div>
      </Section>
      <Section title={ar ? "المطاط" : "Elastics"}>
        <Choice
          options={ELASTIC_TYPES}
          value={o.elasticType}
          onChange={(v) => set({ elasticType: v })}
          ar={ar}
          ltr
        />
        {o.elasticType && (
          <>
            <Choice
              options={ELASTIC_SIZES}
              value={o.elasticSize}
              onChange={(v) => set({ elasticSize: v })}
              ar={ar}
              ltr
            />
            <div className="flex flex-wrap gap-3">
              <Choice
                options={ELASTIC_FORCES}
                value={o.elasticForce}
                onChange={(v) => set({ elasticForce: v })}
                ar={ar}
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {WEAR_HOURS.map((h) => (
                  <Chip
                    key={h.key}
                    on={o.elasticHours === h.key}
                    onClick={() =>
                      set({ elasticHours: o.elasticHours === h.key ? undefined : h.key })
                    }
                  >
                    {ar ? `${h.key} ساعة` : `${h.key} h`}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        )}
      </Section>
      <Section title={ar ? "إضافات" : "Auxiliaries"}>
        <Multi
          options={ORTHO_EXTRAS}
          value={o.extras}
          onChange={(v) => set({ extras: v })}
          ar={ar}
        />
        <input
          value={o.extrasNote ?? ""}
          onChange={(e) => set({ extrasNote: e.target.value })}
          placeholder={ar ? "المكان، أو الأسنان التي أعيد لصق براكتها" : "Where, or teeth rebonded"}
          className={fieldCls}
        />
      </Section>
      <div className="grid gap-4 sm:grid-cols-2">
        <Section title={ar ? "لون الربطات" : "Ligature colour"}>
          <input
            value={o.ligature ?? ""}
            onChange={(e) => set({ ligature: e.target.value })}
            placeholder={ar ? "مثال: أزرق" : "e.g. Blue"}
            className={fieldCls}
          />
        </Section>
        <Section title={ar ? "نظافة الفم" : "Oral hygiene"}>
          <Choice
            options={HYGIENE}
            value={o.hygiene}
            onChange={(v) => set({ hygiene: v })}
            ar={ar}
          />
        </Section>
      </div>
      {nextVisit}
    </>
  );
}

// ---------------------------------------------------------------------------
// Implants
// ---------------------------------------------------------------------------

/** Implant systems listed in the app, plus the common ones. */
function useImplantSystems(): string[] {
  const companies = useImplantCompanyNames();
  return Array.from(
    new Set([
      ...IMPLANTS.map((b) => b.name),
      ...Object.values(companies),
      ...COMMON_IMPLANT_SYSTEMS,
    ]),
  ).sort();
}

function FixtureCard({
  fx,
  index,
  full,
  onChange,
  onRemove,
  ar,
}: {
  fx: ImplantFixture;
  index: number;
  /** Placement shows everything; later sessions only the readings. */
  full: boolean;
  onChange: (fx: ImplantFixture) => void;
  onRemove?: () => void;
  ar: boolean;
}) {
  const set = (patch: Partial<ImplantFixture>) => onChange({ ...fx, ...patch });
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-2.5 space-y-2" dir="ltr">
      <div className="flex items-center gap-2">
        <span className="size-7 rounded-full bg-primary text-primary-foreground text-[11px] font-extrabold flex items-center justify-center">
          {index + 1}
        </span>
        <input
          value={fx.site}
          onChange={(e) => set({ site: e.target.value.replace(/\D/g, "").slice(0, 2) })}
          inputMode="numeric"
          placeholder={ar ? "السن" : "Site"}
          className={cn(fieldCls, "w-20 font-extrabold")}
        />
        <input
          value={fx.brand ?? ""}
          onChange={(e) => set({ brand: e.target.value })}
          list="implant-systems"
          placeholder={ar ? "الشركة / النظام" : "Brand / system"}
          className={cn(fieldCls, "flex-1")}
          disabled={!full}
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="size-8 rounded-full hover:bg-muted flex items-center justify-center"
            aria-label={ar ? "حذف" : "Remove"}
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        )}
      </div>
      {full ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Num
              value={fx.diameter}
              onChange={(v) => set({ diameter: v })}
              placeholder="Ø 4.0"
              suffix="mm"
            />
            <Num
              value={fx.length}
              onChange={(v) => set({ length: v })}
              placeholder="L 10"
              suffix="mm"
            />
            <input
              value={fx.lot ?? ""}
              onChange={(e) => set({ lot: e.target.value })}
              placeholder="Lot #"
              className={fieldCls}
            />
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
            <Num
              value={fx.torque}
              onChange={(v) => set({ torque: v })}
              placeholder={ar ? "العزم" : "Torque"}
              suffix="Ncm"
            />
            <Num value={fx.isq} onChange={(v) => set({ isq: v })} placeholder="ISQ" />
            <div className="flex gap-1">
              {BONE_TYPES.map((b) => (
                <Chip
                  key={b.key}
                  on={fx.bone === b.key}
                  onClick={() => set({ bone: fx.bone === b.key ? undefined : b.key })}
                >
                  {b.en}
                </Chip>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Num value={fx.isq} onChange={(v) => set({ isq: v })} placeholder="ISQ" />
          <span className="self-center text-[11px] text-muted-foreground">
            {[fx.diameter && fx.length ? `${fx.diameter}×${fx.length}` : ""]
              .filter(Boolean)
              .join("")}
          </span>
        </div>
      )}
    </div>
  );
}

export function ImplantFields({
  value: im,
  onChange,
  date,
  ar,
}: {
  value: ImplantSession;
  onChange: (im: ImplantSession) => void;
  date: string;
  ar: boolean;
}) {
  const systems = useImplantSystems();
  const set = (patch: Partial<ImplantSession>) => onChange({ ...im, ...patch });
  const setFixture = (i: number, fx: ImplantFixture) =>
    set({ fixtures: im.fixtures.map((x, j) => (j === i ? fx : x)) });
  const surgery = im.type === "surgery";
  const loading =
    surgery && im.loadingMonths && im.loadingMonths !== "0"
      ? addToDate(date, { months: Number(im.loadingMonths) })
      : "";

  const fixtures = (
    <Section title={ar ? "الزرعات" : "Implants"}>
      <datalist id="implant-systems">
        {systems.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <div className="space-y-2">
        {im.fixtures.map((fx, i) => (
          <FixtureCard
            key={i}
            fx={fx}
            index={i}
            full={surgery}
            ar={ar}
            onChange={(x) => setFixture(i, x)}
            onRemove={
              surgery && im.fixtures.length > 1
                ? () => set({ fixtures: im.fixtures.filter((_, j) => j !== i) })
                : undefined
            }
          />
        ))}
      </div>
      {surgery && (
        <button
          type="button"
          onClick={() => set({ fixtures: [...im.fixtures, { site: "" }] })}
          className="h-8 px-3 rounded-full bg-primary/10 text-primary text-[11px] font-bold inline-flex items-center gap-1"
        >
          <Plus className="size-3.5" strokeWidth={3} />
          {ar ? "إضافة زرعة" : "Add implant"}
        </button>
      )}
    </Section>
  );

  if (surgery)
    return (
      <>
        {fixtures}
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title={ar ? "التوقيت" : "Timing"}>
            <Choice
              options={IMPLANT_TIMING}
              value={im.timing}
              onChange={(v) => set({ timing: v })}
              ar={ar}
            />
          </Section>
          <Section title={ar ? "طريقة الجراحة" : "Approach"}>
            <Choice
              options={IMPLANT_FLAP}
              value={im.flap}
              onChange={(v) => set({ flap: v })}
              ar={ar}
            />
          </Section>
        </div>
        <label className="flex items-center gap-2 text-[12px] font-bold">
          <input
            type="checkbox"
            checked={!!im.guided}
            onChange={(e) => set({ guided: e.target.checked })}
            className="size-4 accent-primary"
          />
          {ar ? "باستخدام دليل جراحي" : "Guided surgery"}
        </label>
        <Section title={ar ? "الطعم العظمي" : "Bone graft"}>
          <Choice options={GRAFTS} value={im.graft} onChange={(v) => set({ graft: v })} ar={ar} />
        </Section>
        {im.graft && im.graft !== "none" && (
          <Section title={ar ? "الغشاء" : "Membrane"}>
            <Choice
              options={MEMBRANES}
              value={im.membrane}
              onChange={(v) => set({ membrane: v })}
              ar={ar}
            />
          </Section>
        )}
        <Section title={ar ? "رفع الجيب الأنفي" : "Sinus lift"}>
          <Choice
            options={SINUS_LIFT}
            value={im.sinus}
            onChange={(v) => set({ sinus: v })}
            ar={ar}
          />
        </Section>
        <Section title={ar ? "الإغلاق" : "Closure"}>
          <Choice
            options={CLOSURE}
            value={im.closure}
            onChange={(v) => set({ closure: v })}
            ar={ar}
          />
          {im.closure === "healing" && (
            <Num
              value={im.healingHeight}
              onChange={(v) => set({ healingHeight: v })}
              placeholder={ar ? "ارتفاع الـHealing" : "Healing height"}
              suffix="mm"
            />
          )}
        </Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title={ar ? "الخياطة" : "Sutures"}>
            <input
              value={im.sutures ?? ""}
              onChange={(e) => set({ sutures: e.target.value })}
              placeholder="4-0 Vicryl"
              className={fieldCls}
              dir="ltr"
            />
          </Section>
          <Section title={ar ? "العلاج الدوائي" : "Medication"}>
            <input
              value={im.meds ?? ""}
              onChange={(e) => set({ meds: e.target.value })}
              placeholder={ar ? "مضاد حيوي، مسكن…" : "Antibiotic, analgesic…"}
              className={fieldCls}
            />
          </Section>
        </div>
        <Section title={ar ? "التحميل بعد" : "Loading after"}>
          <div className="flex flex-wrap items-center gap-1.5">
            {LOADING_MONTHS.map((m) => (
              <Chip
                key={m.key}
                on={im.loadingMonths === m.key}
                onClick={() =>
                  set({ loadingMonths: im.loadingMonths === m.key ? undefined : m.key })
                }
              >
                {m.key === "0"
                  ? ar
                    ? "فوري"
                    : "Immediate"
                  : ar
                    ? `${m.key} أشهر`
                    : `${m.key} months`}
              </Chip>
            ))}
            {loading && (
              <span className="text-[11px] font-bold text-primary">
                {ar ? "التحميل المتوقع" : "Expected"} <bdi dir="ltr">{loading}</bdi>
              </span>
            )}
          </div>
        </Section>
      </>
    );

  if (im.type === "uncover")
    return (
      <>
        {fixtures}
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title={ar ? "مقاس الـHealing abutment" : "Healing abutment"}>
            <input
              value={im.healingSize ?? ""}
              onChange={(e) => set({ healingSize: e.target.value })}
              placeholder="4.5 × 4"
              className={fieldCls}
              dir="ltr"
            />
          </Section>
          <Section title={ar ? "حالة اللثة" : "Gingiva"}>
            <Choice
              options={GINGIVA}
              value={im.gingiva}
              onChange={(v) => set({ gingiva: v })}
              ar={ar}
            />
          </Section>
        </div>
      </>
    );

  if (im.type === "prosthetic")
    return (
      <>
        <Section title={ar ? "الطبعة" : "Impression"}>
          <Choice
            options={IMPRESSIONS}
            value={im.impression}
            onChange={(v) => set({ impression: v })}
            ar={ar}
          />
        </Section>
        <Section title={ar ? "الدعامة" : "Abutment"}>
          <Choice
            options={ABUTMENTS}
            value={im.abutment}
            onChange={(v) => set({ abutment: v })}
            ar={ar}
          />
        </Section>
        <Section title={ar ? "التثبيت" : "Retention"}>
          <Choice
            options={RETENTION}
            value={im.retention}
            onChange={(v) => set({ retention: v })}
            ar={ar}
          />
        </Section>
        <div className="grid gap-4 sm:grid-cols-2">
          <Section title={ar ? "مادة التاج" : "Crown material"}>
            <Choice
              options={CROWN_MATERIALS}
              value={im.crown}
              onChange={(v) => set({ crown: v })}
              ar={ar}
              ltr
            />
          </Section>
          <Section title={ar ? "اللون" : "Shade"}>
            <input
              value={im.shade ?? ""}
              onChange={(e) => set({ shade: e.target.value })}
              placeholder="A2"
              className={fieldCls}
              dir="ltr"
            />
          </Section>
        </div>
      </>
    );

  return (
    <>
      <Section title={ar ? "الألم" : "Pain"}>
        <Choice options={PAIN} value={im.pain} onChange={(v) => set({ pain: v })} ar={ar} />
      </Section>
      <Section title={ar ? "حالة اللثة" : "Gingiva"}>
        <Choice
          options={GINGIVA}
          value={im.gingiva}
          onChange={(v) => set({ gingiva: v })}
          ar={ar}
        />
      </Section>
      <Section title={ar ? "فقدان العظم في الأشعة" : "Bone loss on X-ray"}>
        <Num
          value={im.boneLoss}
          onChange={(v) => set({ boneLoss: v })}
          placeholder="0.5"
          suffix="mm"
        />
      </Section>
    </>
  );
}

/** The implants placed in a session, as a table on its card. */
export function FixturesTable({ fixtures }: { fixtures: ImplantFixture[] }) {
  const rows = fixtures.filter((fx) => fx.site || fx.brand);
  if (!rows.length) return null;
  return (
    <div className="mt-2.5 overflow-x-auto rounded-xl border border-border" dir="ltr">
      <table className="w-full text-[11px] whitespace-nowrap">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            {["Site", "System", "Ø × L", "Lot", "Ncm", "ISQ", "Bone"].map((h) => (
              <th key={h} className="px-2 py-1.5 text-left font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((fx, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-2 py-1.5 font-extrabold">{fx.site || "—"}</td>
              <td className="px-2 py-1.5">{fx.brand || "—"}</td>
              <td className="px-2 py-1.5 font-bold text-primary">
                {fx.diameter && fx.length ? `${fx.diameter} × ${fx.length}` : "—"}
              </td>
              <td className="px-2 py-1.5">{fx.lot || "—"}</td>
              <td className="px-2 py-1.5">{fx.torque || "—"}</td>
              <td className="px-2 py-1.5">{fx.isq || "—"}</td>
              <td className="px-2 py-1.5">{fx.bone || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { IMPLANT_TYPES, ORTHO_TYPES };
