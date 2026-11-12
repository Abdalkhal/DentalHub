/** Orthodontic and implant session forms for the treatment work sheet. */
import { useMemo, type ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Check, Plus, X } from "lucide-react-native";

import { Text } from "@/components/ui";
import { IMPLANTS } from "@/data/implants";
import { useImplantCompanyNames } from "@/lib/implantOffers";
import { cn } from "@/lib/utils";
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

const PRIMARY = "#2563EB";
const inputCls =
  "h-10 rounded-xl border border-slate-200 bg-white px-2.5 text-[12px] text-slate-800";
const ltr = { writingDirection: "ltr" as const, textAlign: "left" as const };
const num = (v: string) => v.replace(/[^\d.,]/g, "").replace(",", ".");
const LTR_ROW = { direction: "ltr" as const };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-[11px] font-extrabold text-slate-700">{title}</Text>
      {children}
    </View>
  );
}

function Chip({
  on,
  onPress,
  children,
}: {
  on: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "h-8 justify-center rounded-full border px-3",
        on ? "border-primary bg-primary" : "border-slate-200 bg-white",
      )}
    >
      <Text className={cn("text-[11px] font-bold", on ? "text-white" : "text-slate-500")}>
        {children}
      </Text>
    </Pressable>
  );
}

function Choice({
  options,
  value,
  onChange,
  ar,
  isLtr,
}: {
  options: Option[];
  value?: string;
  onChange: (v: string | undefined) => void;
  ar: boolean;
  isLtr?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap gap-1.5" style={isLtr ? LTR_ROW : undefined}>
      {options.map((o) => (
        <Chip
          key={o.key}
          on={value === o.key}
          onPress={() => onChange(value === o.key ? undefined : o.key)}
        >
          {ar ? o.ar : o.en}
        </Chip>
      ))}
    </View>
  );
}

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
    <View className="flex-row flex-wrap gap-1.5">
      {options.map((o) => (
        <Chip
          key={o.key}
          on={list.includes(o.key)}
          onPress={() =>
            onChange(list.includes(o.key) ? list.filter((k) => k !== o.key) : [...list, o.key])
          }
        >
          {ar ? o.ar : o.en}
        </Chip>
      ))}
    </View>
  );
}

function Num({
  value,
  onChange,
  placeholder,
  suffix,
  flex,
}: {
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  flex?: boolean;
}) {
  return (
    <View
      className={cn(
        "flex-row items-center rounded-xl border border-slate-200 bg-white pr-2.5",
        flex && "flex-1",
      )}
      style={LTR_ROW}
    >
      <TextInput
        value={value ?? ""}
        onChangeText={(v) => onChange(num(v))}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        className="h-10 flex-1 px-2.5 text-[12px] text-slate-800"
        style={ltr}
      />
      {!!suffix && <Text className="text-[10px] font-bold text-slate-400">{suffix}</Text>}
    </View>
  );
}

function Toggle({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center gap-2">
      <View
        className={cn(
          "h-5 w-5 items-center justify-center rounded-md border",
          on ? "border-primary bg-primary" : "border-slate-300 bg-white",
        )}
      >
        {on && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
      </View>
      <Text className="text-[12px] font-bold text-slate-700">{label}</Text>
    </Pressable>
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
    <View className="flex-row flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1.5">
      {options.map((o) => {
        const on = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            className={cn("h-9 items-center justify-center rounded-xl px-1", on && "bg-white")}
            style={{ width: "48.5%" }}
          >
            <Text
              className={cn("text-[11px] font-extrabold", on ? "text-primary" : "text-slate-500")}
            >
              {ar ? o.ar : o.en}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
    <View className="gap-1.5 rounded-xl border border-slate-200 p-2.5">
      <Text className="text-[11px] font-extrabold text-slate-800">{label}</Text>
      <View className="flex-row flex-wrap gap-1.5" style={LTR_ROW}>
        {WIRE_SIZES.map((o) => (
          <Chip
            key={o.key}
            on={w.size === o.key}
            onPress={() => onChange({ ...w, size: w.size === o.key ? undefined : o.key })}
          >
            {o.en}
          </Chip>
        ))}
      </View>
      <View className="flex-row flex-wrap gap-1.5" style={LTR_ROW}>
        {WIRE_MATERIALS.map((o) => (
          <Chip
            key={o.key}
            on={w.material === o.key}
            onPress={() => onChange({ ...w, material: w.material === o.key ? undefined : o.key })}
          >
            {o.en}
          </Chip>
        ))}
      </View>
    </View>
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
      <View className="flex-row flex-wrap gap-1.5">
        {NEXT_WEEKS.map((w) => (
          <Chip
            key={w.key}
            on={o.nextWeeks === w.key}
            onPress={() => set({ nextWeeks: o.nextWeeks === w.key ? undefined : w.key })}
          >
            {ar ? `${w.key} أسابيع` : `${w.key} weeks`}
          </Chip>
        ))}
      </View>
      {!!next && (
        <Text className="text-[11px] font-bold text-primary">
          {ar ? "الموعد المقترح " : "Suggested "}
          {"⁦" + next + "⁩"}
        </Text>
      )}
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
          <>
            <Section title={ar ? "نظام البراكت" : "Prescription"}>
              <Choice
                options={ORTHO_PRESCRIPTIONS}
                value={o.prescription}
                onChange={(v) => set({ prescription: v })}
                ar={ar}
                isLtr
              />
            </Section>
            <Section title={ar ? "مقاس الشق" : "Slot"}>
              <Choice
                options={ORTHO_SLOTS}
                value={o.slot}
                onChange={(v) => set({ slot: v })}
                ar={ar}
                isLtr
              />
            </Section>
          </>
        )}
        <Section title={ar ? "تشخيص البداية" : "Initial diagnosis"}>
          <Choice
            options={MOLAR_CLASSES}
            value={o.molarClass}
            onChange={(v) => set({ molarClass: v })}
            ar={ar}
            isLtr
          />
          <View className="flex-row gap-2" style={LTR_ROW}>
            <Num
              value={o.overjet}
              onChange={(v) => set({ overjet: v })}
              placeholder="Overjet"
              suffix="mm"
              flex
            />
            <Num
              value={o.overbite}
              onChange={(v) => set({ overbite: v })}
              placeholder="Overbite"
              suffix="mm"
              flex
            />
          </View>
        </Section>
        <Section title={ar ? "أسنان للقلع (إن وجدت)" : "Extractions (if any)"}>
          <TextInput
            value={o.extractions ?? ""}
            onChangeText={(v) => set({ extractions: v })}
            placeholder="14, 24, 34, 44"
            placeholderTextColor="#94A3B8"
            className={inputCls}
            style={ltr}
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
          <View className="flex-row gap-2" style={LTR_ROW}>
            <Num
              value={o.alignerNo}
              onChange={(v) => set({ alignerNo: v.replace(/\D/g, "") })}
              placeholder={ar ? "الحالي" : "Current"}
              flex
            />
            <Num
              value={o.alignerTotal}
              onChange={(v) => set({ alignerTotal: v.replace(/\D/g, "") })}
              placeholder={ar ? "المجموع" : "Total"}
              flex
            />
          </View>
        </Section>
        <Toggle
          on={!!o.attachments}
          onPress={() => set({ attachments: !o.attachments })}
          label={ar ? "تم وضع Attachments" : "Attachments placed"}
        />
        <Section title={ar ? "IPR (الأسنان والملم)" : "IPR (teeth & mm)"}>
          <TextInput
            value={o.ipr ?? ""}
            onChangeText={(v) => set({ ipr: v })}
            placeholder="31/41 0.2mm"
            placeholderTextColor="#94A3B8"
            className={inputCls}
            style={ltr}
          />
        </Section>
        <Section title={ar ? "ساعات اللبس يومياً" : "Wear hours a day"}>
          <Choice
            options={WEAR_HOURS}
            value={o.wearHours}
            onChange={(v) => set({ wearHours: v })}
            ar={ar}
            isLtr
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
      </Section>
      <Section title={ar ? "المطاط" : "Elastics"}>
        <Choice
          options={ELASTIC_TYPES}
          value={o.elasticType}
          onChange={(v) => set({ elasticType: v })}
          ar={ar}
          isLtr
        />
        {!!o.elasticType && (
          <>
            <Choice
              options={ELASTIC_SIZES}
              value={o.elasticSize}
              onChange={(v) => set({ elasticSize: v })}
              ar={ar}
              isLtr
            />
            <Choice
              options={ELASTIC_FORCES}
              value={o.elasticForce}
              onChange={(v) => set({ elasticForce: v })}
              ar={ar}
            />
            <View className="flex-row flex-wrap gap-1.5">
              {WEAR_HOURS.map((h) => (
                <Chip
                  key={h.key}
                  on={o.elasticHours === h.key}
                  onPress={() =>
                    set({ elasticHours: o.elasticHours === h.key ? undefined : h.key })
                  }
                >
                  {ar ? `${h.key} ساعة` : `${h.key} h`}
                </Chip>
              ))}
            </View>
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
        <TextInput
          value={o.extrasNote ?? ""}
          onChangeText={(v) => set({ extrasNote: v })}
          placeholder={ar ? "المكان، أو الأسنان التي أعيد لصق براكتها" : "Where, or teeth rebonded"}
          placeholderTextColor="#94A3B8"
          className={inputCls}
        />
      </Section>
      <Section title={ar ? "لون الربطات" : "Ligature colour"}>
        <TextInput
          value={o.ligature ?? ""}
          onChangeText={(v) => set({ ligature: v })}
          placeholder={ar ? "مثال: أزرق" : "e.g. Blue"}
          placeholderTextColor="#94A3B8"
          className={inputCls}
        />
      </Section>
      <Section title={ar ? "نظافة الفم" : "Oral hygiene"}>
        <Choice options={HYGIENE} value={o.hygiene} onChange={(v) => set({ hygiene: v })} ar={ar} />
      </Section>
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
  return useMemo(
    () =>
      Array.from(
        new Set([
          ...IMPLANTS.map((b) => b.name),
          ...Object.values(companies),
          ...COMMON_IMPLANT_SYSTEMS,
        ]),
      ).sort(),
    [companies],
  );
}

function FixtureCard({
  fx,
  index,
  full,
  systems,
  onChange,
  onRemove,
  ar,
}: {
  fx: ImplantFixture;
  index: number;
  full: boolean;
  systems: string[];
  onChange: (fx: ImplantFixture) => void;
  onRemove?: () => void;
  ar: boolean;
}) {
  const set = (patch: Partial<ImplantFixture>) => onChange({ ...fx, ...patch });
  const q = (fx.brand ?? "").trim().toLowerCase();
  // Suggestions while typing, hidden once a listed system is chosen.
  const matches =
    full && q && !systems.some((s) => s.toLowerCase() === q)
      ? systems.filter((s) => s.toLowerCase().includes(q)).slice(0, 6)
      : [];
  return (
    <View className="gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2.5" style={LTR_ROW}>
      <View className="flex-row items-center gap-2">
        <View className="h-7 w-7 items-center justify-center rounded-full bg-primary">
          <Text className="text-[11px] font-extrabold text-white">{index + 1}</Text>
        </View>
        <TextInput
          value={fx.site}
          onChangeText={(v) => set({ site: v.replace(/\D/g, "").slice(0, 2) })}
          keyboardType="number-pad"
          placeholder={ar ? "السن" : "Site"}
          placeholderTextColor="#94A3B8"
          className={cn(inputCls, "w-16 font-extrabold")}
          style={ltr}
        />
        {full ? (
          <TextInput
            value={fx.brand ?? ""}
            onChangeText={(v) => set({ brand: v })}
            placeholder={ar ? "الشركة / النظام" : "Brand / system"}
            placeholderTextColor="#94A3B8"
            className={cn(inputCls, "flex-1")}
            style={ltr}
          />
        ) : (
          <Text className="flex-1 text-[12px] text-slate-500" style={ltr}>
            {[fx.brand, fx.diameter && fx.length ? `${fx.diameter}×${fx.length}` : ""]
              .filter(Boolean)
              .join(" ")}
          </Text>
        )}
        {onRemove && (
          <Pressable onPress={onRemove} hitSlop={6} className="p-1">
            <X size={15} color="#94A3B8" />
          </Pressable>
        )}
      </View>
      {matches.length > 0 && (
        <View className="flex-row flex-wrap gap-1.5">
          {matches.map((s) => (
            <Pressable
              key={s}
              onPress={() => set({ brand: s })}
              className="h-7 justify-center rounded-full bg-blue-50 px-2.5"
            >
              <Text className="text-[11px] font-bold text-primary">{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {full ? (
        <>
          <View className="flex-row gap-2">
            <Num
              value={fx.diameter}
              onChange={(v) => set({ diameter: v })}
              placeholder="Ø 4.0"
              suffix="mm"
              flex
            />
            <Num
              value={fx.length}
              onChange={(v) => set({ length: v })}
              placeholder="L 10"
              suffix="mm"
              flex
            />
          </View>
          <View className="flex-row gap-2">
            <TextInput
              value={fx.lot ?? ""}
              onChangeText={(v) => set({ lot: v })}
              placeholder="Lot #"
              placeholderTextColor="#94A3B8"
              className={cn(inputCls, "flex-1")}
              style={ltr}
            />
            <Num
              value={fx.torque}
              onChange={(v) => set({ torque: v })}
              placeholder={ar ? "العزم" : "Torque"}
              suffix="Ncm"
              flex
            />
            <Num value={fx.isq} onChange={(v) => set({ isq: v })} placeholder="ISQ" flex />
          </View>
          <View className="flex-row gap-1.5">
            {BONE_TYPES.map((b) => (
              <Chip
                key={b.key}
                on={fx.bone === b.key}
                onPress={() => set({ bone: fx.bone === b.key ? undefined : b.key })}
              >
                {b.en}
              </Chip>
            ))}
          </View>
        </>
      ) : (
        <Num value={fx.isq} onChange={(v) => set({ isq: v })} placeholder="ISQ" />
      )}
    </View>
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
      {im.fixtures.map((fx, i) => (
        <FixtureCard
          key={i}
          fx={fx}
          index={i}
          full={surgery}
          systems={systems}
          ar={ar}
          onChange={(x) => setFixture(i, x)}
          onRemove={
            surgery && im.fixtures.length > 1
              ? () => set({ fixtures: im.fixtures.filter((_, j) => j !== i) })
              : undefined
          }
        />
      ))}
      {surgery && (
        <Pressable
          onPress={() => set({ fixtures: [...im.fixtures, { site: "" }] })}
          className="h-8 flex-row items-center gap-1 self-start rounded-full bg-blue-50 px-3"
        >
          <Plus size={13} color={PRIMARY} strokeWidth={3} />
          <Text className="text-[11px] font-bold text-primary">
            {ar ? "إضافة زرعة" : "Add implant"}
          </Text>
        </Pressable>
      )}
    </Section>
  );

  if (surgery)
    return (
      <>
        {fixtures}
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
        <Toggle
          on={!!im.guided}
          onPress={() => set({ guided: !im.guided })}
          label={ar ? "باستخدام دليل جراحي" : "Guided surgery"}
        />
        <Section title={ar ? "الطعم العظمي" : "Bone graft"}>
          <Choice options={GRAFTS} value={im.graft} onChange={(v) => set({ graft: v })} ar={ar} />
        </Section>
        {!!im.graft && im.graft !== "none" && (
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
        <Section title={ar ? "الخياطة" : "Sutures"}>
          <TextInput
            value={im.sutures ?? ""}
            onChangeText={(v) => set({ sutures: v })}
            placeholder="4-0 Vicryl"
            placeholderTextColor="#94A3B8"
            className={inputCls}
            style={ltr}
          />
        </Section>
        <Section title={ar ? "العلاج الدوائي" : "Medication"}>
          <TextInput
            value={im.meds ?? ""}
            onChangeText={(v) => set({ meds: v })}
            placeholder={ar ? "مضاد حيوي، مسكن…" : "Antibiotic, analgesic…"}
            placeholderTextColor="#94A3B8"
            className={inputCls}
          />
        </Section>
        <Section title={ar ? "التحميل بعد" : "Loading after"}>
          <View className="flex-row flex-wrap gap-1.5">
            {LOADING_MONTHS.map((m) => (
              <Chip
                key={m.key}
                on={im.loadingMonths === m.key}
                onPress={() =>
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
          </View>
          {!!loading && (
            <Text className="text-[11px] font-bold text-primary">
              {ar ? "التحميل المتوقع " : "Expected "}
              {"⁦" + loading + "⁩"}
            </Text>
          )}
        </Section>
      </>
    );

  if (im.type === "uncover")
    return (
      <>
        {fixtures}
        <Section title={ar ? "مقاس الـHealing abutment" : "Healing abutment"}>
          <TextInput
            value={im.healingSize ?? ""}
            onChangeText={(v) => set({ healingSize: v })}
            placeholder="4.5 × 4"
            placeholderTextColor="#94A3B8"
            className={inputCls}
            style={ltr}
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
        <Section title={ar ? "مادة التاج" : "Crown material"}>
          <Choice
            options={CROWN_MATERIALS}
            value={im.crown}
            onChange={(v) => set({ crown: v })}
            ar={ar}
            isLtr
          />
        </Section>
        <Section title={ar ? "اللون" : "Shade"}>
          <TextInput
            value={im.shade ?? ""}
            onChangeText={(v) => set({ shade: v })}
            placeholder="A2"
            placeholderTextColor="#94A3B8"
            className={inputCls}
            style={ltr}
          />
        </Section>
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

/** The implants of a session, one compact row each, on its card. */
export function FixturesList({ fixtures }: { fixtures: ImplantFixture[] }) {
  const rows = fixtures.filter((fx) => fx.site || fx.brand);
  if (!rows.length) return null;
  return (
    <View className="mt-2.5 overflow-hidden rounded-xl border border-slate-200" style={LTR_ROW}>
      {rows.map((fx, i) => (
        <View
          key={i}
          className={cn(
            "flex-row items-start gap-2 px-2.5 py-2",
            i > 0 && "border-t border-slate-100",
          )}
        >
          <View className="h-7 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Text className="text-[11px] font-extrabold text-primary">{fx.site || "—"}</Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-[12px] font-bold text-slate-800" style={ltr}>
              {[fx.brand, fx.diameter && fx.length ? `${fx.diameter} × ${fx.length} mm` : ""]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
            <Text className="text-[10px] text-slate-500" style={ltr}>
              {[
                fx.lot ? `Lot ${fx.lot}` : "",
                fx.torque ? `${fx.torque} Ncm` : "",
                fx.isq ? `ISQ ${fx.isq}` : "",
                fx.bone,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
