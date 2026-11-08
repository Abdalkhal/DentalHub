// Turns all_products.csv into the product catalog the app reads.
//
//   node allProducts/build-catalog.cjs
//
// Keeps the name, brand, section, sub-section, country and product image.
// Prices and source links are never carried over. Writes:
//   public/catalog/products.json   what the app loads
//   allProducts/catalog.csv        the same thing, to read or edit by eye
//   allProducts/review.csv         everything set aside or worth a human look
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

// Source image URL -> our Firebase Storage copy, or "" where the source image
// no longer exists (see upload-images-to-storage.mjs).
const STORAGE_IMAGES_PATH = path.join(__dirname, "storage-images.json");
const STORAGE_IMAGES = fs.existsSync(STORAGE_IMAGES_PATH) ? JSON.parse(fs.readFileSync(STORAGE_IMAGES_PATH, "utf8")) : {};

/* ── Reading the CSV ─────────────────────────────── */

function parseCsv(t) {
  const rows = [];
  let row = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      rows.push(row);
      row = [];
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

/* ── Spelling ────────────────────────────────────── */

// Whole words only, case-insensitive; the replacement keeps the word's casing.
const TYPOS = {
  abtument: "abutment", absorable: "absorbable", accessorie: "accessory", activater: "activator",
  alminium: "aluminium", aoutomatic: "automatic", applicatore: "applicator", articane: "articaine",
  bladw: "blade", boder: "border", cacification: "calcification", carbmide: "carbamide",
  carboxylat: "carboxylate", carie: "caries", cartidage: "cartridge", casset: "cassette",
  celing: "ceiling", cheeck: "cheek", clyndrical: "cylindrical", condensor: "condenser",
  convertable: "convertible", curetter: "curette", daimond: "diamond", depresser: "depressor",
  desensibilize: "desensitize", desensitising: "desensitizing", diamon: "diamond", dics: "discs",
  elastromic: "elastomeric", elavator: "elevator", elevatore: "elevator", endodonetic: "endodontic",
  engien: "engine", eestorations: "restorations", excavatore: "excavator", floweablity: "flowability",
  flouride: "fluoride", fluride: "fluoride", guage: "gauge", guttaa: "gutta", hanpiece: "handpiece",
  hemispherica: "hemispherical", hydorlic: "hydraulic", hygenic: "hygienic", hypbrid: "hybrid",
  hybride: "hybrid", impreesion: "impression", impregnatedhighlight: "impregnated highlight",
  injectore: "injector", intergration: "integration", intsruments: "instruments", ionomwe: "ionomer",
  iubrication: "lubrication", knive: "knife", laether: "leather", lagenback: "Langenbeck",
  langenback: "Langenbeck", lence: "lens", loacater: "locator", locato: "locator", lodoform: "iodoform",
  loups: "loupes", manikan: "manikin", materia: "material", measurment: "measurement", metalic: "metallic",
  mircofiber: "microfiber", mixier: "mixer", noched: "notched", ntiseptic: "antiseptic", offive: "office",
  orginal: "original", ospery: "osprey", particls: "particles", periodental: "periodontal",
  peplacement: "replacement", pinnackel: "pinnacle", poket: "pocket", polycarboxilate: "polycarboxylate",
  posterio: "posterior", powerd: "powered", prepartion: "preparation", preperation: "preparation",
  prepration: "preparation", prob: "probe", probs: "probes", protable: "portable", qartz: "quartz",
  radioopac: "radiopaque", repare: "repair", restrative: "restorative", senseitive: "sensitive",
  sticikng: "sticking", standered: "standard", stirelization: "sterilization", torbine: "turbine",
  turbin: "turbine", tounge: "tongue", transparant: "transparent", twezeer: "tweezer", ueneer: "veneer",
  uitrasonic: "ultrasonic", urved: "curved", vacum: "vacuum", venrrers: "veneers", whiteing: "whitening",
  wrnech: "wrench", carbideburs: "carbide burs", turbineburs: "turbine burs", rotaryfile: "rotary file",
  lowspeed: "low speed", airmotor: "air motor", coporation: "corporation",
};

function fixWord(word) {
  const fix = TYPOS[word.toLowerCase()];
  if (!fix) return word;
  if (word === word.toUpperCase() && word.length > 1) return fix.toUpperCase();
  if (word[0] === word[0].toUpperCase()) return fix[0].toUpperCase() + fix.slice(1);
  return fix;
}

// Shouted words stay shouted when they are a model name (short, or with digits).
function titleIfShouting(name) {
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length < 6 || letters !== letters.toUpperCase()) return name;
  return name
    .split(" ")
    .map((w) => (w.length <= 4 || /\d/.test(w) ? w : w[0] + w.slice(1).toLowerCase()))
    .join(" ");
}

function cleanName(raw) {
  let s = raw
    .replace(/\s+/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .replace(/,(?=[^\s\d])/g, ", ")
    .replace(/\s*\|\s*/g, " | ")
    .replace(/[A-Za-zÀ-ÿ]+/g, fixWord)
    .replace(/[|,\-.\s]+$/g, "")
    .replace(/^[|,\-.\s]+/g, "")
    .trim();
  s = titleIfShouting(s);
  return s[0] ? s[0].toUpperCase() + s.slice(1) : s;
}

/* ── Brands ──────────────────────────────────────── */

const BRAND_FIX = {
  ivoclar: "Ivoclar",
  "new-stetic": "New Stetic",
  heydent: "Heydent",
  "i-dental": "i-dental",
  yuwell: "Yuwell",
  "point implant": "Point Implant",
  "Roott implant": "Roott Implant",
  "Zahntium implant": "Zahntium Implant",
  "Tissue Regeneration Coporation": "Tissue Regeneration Corporation",
  "OCC switzerland": "OCC Switzerland",
  "K.r.a.n.z": "KRANZ",
  "Frank.Dental": "Frank Dental",
  "GAP dental": "GAP Dental",
  "MATT orthodontics": "MATT Orthodontics",
  "AVITR FARMICA PVT LTD": "Avitr Farmica",
  WOODPECKER: "Woodpecker",
};

// The country a brand's company comes from. Left out when not known for
// certain: an office fills it in rather than the catalog guessing.
const BRAND_COUNTRY = {
  "3M": "USA", ADS: "USA", Angelus: "Brazil", BIOLASE: "USA", Bioclear: "USA", Bisco: "USA",
  Cavex: "Netherlands", Centrix: "USA", Cerkamed: "Poland", Coltene: "Switzerland",
  Dentaurum: "Germany", Dentium: "South Korea", "Dentsply Sirona": "USA", Detax: "Germany",
  Diadent: "South Korea", EMS: "Switzerland", FGM: "Brazil", FKG: "Switzerland", GC: "Japan",
  Garrison: "USA", Hahnenkratt: "Germany", "Henry Schein": "USA", Hoffmanns: "Germany", Huons: "South Korea",
  Itena: "France", Ivoclar: "Liechtenstein", "J. Morita": "Japan", Jota: "Switzerland",
  Kerr: "USA", Kettenbach: "Germany", Komet: "Germany", Kulzer: "Germany", Kuraray: "Japan",
  Leone: "Italy", MANI: "Japan", MORELLI: "Brazil", "Meta-Biomed": "South Korea", Micerium: "Italy",
  Milestone: "USA", MyRay: "Italy", NSK: "Japan", NextDent: "Netherlands", Ormco: "USA",
  PacDent: "USA", Pentron: "USA", Polydentia: "Switzerland", "Prevest DenPro": "India", Ribbond: "USA",
  SDI: "Australia", Saremco: "Switzerland", Shofu: "Japan", Tokuyama: "Japan", "Tor Vm": "Russia",
  Ultradent: "USA", VSI: "Germany", Vannini: "Italy", Vericom: "South Korea", Vita: "Germany",
  Vladmiva: "Russia", "W&H": "Austria", Woodpecker: "China", "Young Innovations": "USA",
  Zhermack: "Italy", Zirc: "USA",
};

// The brand directory the app already shows doctors knows more of them.
const keyOf = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const directoryCountry = new Map();
for (const file of ["brands.ts", "brands-extra.ts"]) {
  const src = fs.readFileSync(path.join(ROOT, "src/data", file), "utf8");
  for (const m of src.matchAll(/\{\s*name:\s*"([^"]+)",\s*country:\s*"([^"]+)"/g)) directoryCountry.set(keyOf(m[1]), m[2]);
  for (const m of src.matchAll(/\[\s*"([^"]+)",\s*"([^"]+)"\s*\]/g)) directoryCountry.set(keyOf(m[1]), m[2]);
  for (const m of src.matchAll(/name:\s*"([^"]+)"[\s\S]{0,120}?countryEn:\s*"([^"/]+)"/g)) directoryCountry.set(keyOf(m[1]), m[2]);
}
const countryOf = (brand) => {
  const known = BRAND_COUNTRY[brand] || directoryCountry.get(keyOf(brand)) || "";
  return known === "Generic" ? "" : known;
};

// Excluded until someone decides: possibly counterfeit goods.
const COPY_BRAND = /\bcopy\b/i;
// A shop's bundle or promotion, not a product an office can list.
const NOT_A_PRODUCT = /\boffer\b|\bpackage\b|\bbundle\b|\d(st|nd|rd|th) year|\s\+\s.*\s\+\s/i;

/* ── Sections ────────────────────────────────────── */

const fromCollection = {
  "instruments-restorative-instruments-burs": ["burs", null],
  "instruments-restorative-instruments": ["operative", "Restorative instruments"],
  "instruments-surgical-instruments": ["surgery", "Surgical instruments"],
  "instruments-general-instruments": ["general", "General accessories"],
  "instruments-perio-instruments": ["periodontic", "Perio instruments"],
  "instruments-prostho-instruments": ["prosthodontic", "Prostho Instruments"],
  "general-dentistry": ["operative", null],
  "general-dentistry-restorative": ["operative", null],
  "general-dentistry-restorative-composites": ["operative", "Composites"],
  equipments: ["equipment", "General equipments"],
  "equipments-general-equipments-shade-guides": ["operative", "Opaquers & Tints"],
  "equipments-dental-handpieces": ["equipment", "Handpieces & Turbines"],
  "equipments-digital-impression": ["equipment", "Intraoral Scanners"],
  "equipments-general-equipments-loupes-magnifiers": ["equipment", "Loupes & Microscopes"],
  endodontics: ["endodontic", null],
  "endodontics-obturation": ["endodontic", "Obturation"],
  "endodontics-post-core": ["endodontic", "Post & Core"],
  "endodontics-re-treatment": ["endodontic", "Re-treatment"],
  "endodontics-endodontic-accessories": ["endodontic", "Endodontic Accessories"],
  orthodontics: ["orthopedic", null],
  "orthodontics-ortho-instruments": ["orthopedic", "Ortho instruments"],
  consumables: ["general", "General Disposables"],
  "consumables-protective-gear": ["general", "Protective gear"],
  maintenance: ["maintenance", "Spare Parts"],
  implantology: ["surgery", "Surgical instruments"],
  prosthodontics: ["prosthodontic", null],
  sterilization: ["sterilization", null],
  "sterilization-instrument-sterilizers": ["sterilization", "Instrument Sterilizers"],
  "learning-training": ["training", "Training Teeth and Models"],
  photography: ["equipment", "Imaging Systems"],
  paedodontics: ["pedodontic", null],
  periodontics: ["periodontic", null],
  "oral-surgery": ["surgery", null],
  laboratory: ["lab-materials", null],
  "oral-care": ["oral-care", null],
  "clothing-uniforms": ["apparel", null],
};

// Tried in order, within a section. The first match wins, so narrow words first.
const SUB_RULES = {
  operative: [
    [/shade guide|\bshade tab/i, "Opaquers & Tints"],
    [/opaquer|\btint\b|characteriz|color-corrector|colou?r(ed)? system|colourfluid|paintart|estelite.* color/i, "Opaquers & Tints"],
    [/glycerin|\bdeox|air block|airblock/i, "Glycerin"],
    [/modeling (liquid|resin)|modelling|composite wetting|wetting resin/i, "Composite Modeling Liquid"],
    [/caries (detect|indicat|marker|spot)|caries control|\bsdf\b|silver diamine|sable|seek\b/i, "Caries Detectors/Control"],
    [/polish|finish|sof-lex|super-snap|\bstrips?\b|\bdisc\b|\bdisk\b|occlubrush|enhance|diacomp|flexi-d|\bra\b|gloss|rubber cup|felt|\bwheel\b|prophy brush|\bbrush(es)?\b/i, "Finishing & Polishing"],
    [/\bjewel|\bgems?\b|crystal ornament|skyce/i, "Finishing & Polishing"],
    [/amalgam/i, "Amalgams"],
    [/etch|phosphoric|\bbond\b|charmbond|bonding|adhesi|primer|silane|silano|desensiti|gluma|conditioner|cleaning agent|zirclean/i, "Bonding Agents & Etchants"],
    [/calcium hydroxide|dycal|theracal|\bmta\b|biodentine|pulp/i, "Pulp Protection"],
    [/temporary (filling|material|restor|cement)|cavit\b|caviton|provisional|zinc oxide|eugenol|dentine-paste|-temp\b|\btemp\b/i, "Temporary Filling Material"],
    [/glass.?ionomer|\bgic\b|ionomer|fuji\b|riva\b|equia|ketac|\bglc\b|\birm\b/i, "Glass Ionomer"],
    [/\bcement|cem\b|zinc phosphate|polycarboxylate|relyx|panavia|variolink|multilink|luting|linkace/i, "Cement base"],
    [/liner|lining|\bbase\b/i, "Pulp Protection"],
    [/composite|nanohybrid|restorative|flowable|filtek|bulk.?fill|palfique|estelite|omnichroma|herculite|charisma|\bflow\b|tetric|empress|beautifil|gaenial|g-.nial|oneshade|olirevo|escom|restorations? i|repair kit/i, "Composites"],
    [/matri|wedge|rubber dam|dental dam|\bdam\b|cofferdam|resin barrier|clamp|articulating|applicator|micro.?brush|mixing|carrier|burnisher|excavator|carver|instrument|\bgun\b|dispens|tips?\b|mandrel|puncturer|fit checker|occlu/i, "Restorative instruments"],
  ],
  endodontic: [
    [/\baccess\b|access cavity|\bgates?\b|peeso|\bendo.?z\b|pathfind|glide|pulp opening/i, "Access Cavity Preparation"],
    [/retreat|re-treat|solvent|reroot|desobtur|\bd-race|broken (file|tool)|fractured|tfrk/i, "Re-treatment"],
    [/\bposts?\b|core\b|fibrapost|whitepost|\bscrew|\bpins\b|everstick|ever stick|bio-tack/i, "Post & Core"],
    [/sealer|sealing|gutta|obtur|paper point|absorbent|spreader|plugger|\bseal\b|ah plus|calamus|sealapex|cera.?seal|bioseal/i, "Obturation"],
    [/\bmta\b|repair|neomta|biodentine|putty|trioxident/i, "Root Repair"],
    [/hypochlorite|chlorhexidine|edta|irrig|calcium hydroxide|metapex|paste|medicament|formocresol|camphor|lubricant|chelat|cresophene|ledermix|dressing|devitaliz|iodoform|naocl|saline|chex|formalin|cresodent|eugenol|pulpotec|tiedent|endo (clean|cleaner)/i, "RC irrigants & Medicament"],
    [/file|rotary|reamer|taper|\bprotaper|waveone|reciproc|broach|protaper|\bniti\b|hyflex|canal|shaping|preparation kit/i, "Canal Preparation & Cleaning"],
    [/.*/, "Endodontic Accessories"],
  ],
  prosthodontic: [
    [/impression|alginate|silicone|polyether|putty|\bvps\b|tray|bite regist|exabite|panasil|aquasil|i-sil|x-flex|light body/i, "Impression Materials"],
    [/crown|bridge|temporary|provisional|\bcement|temp\b|spatula/i, "Crown & Bridge"],
    [/gypsum|plaster|model|articulator|stone\b|mould|caliper|occlusal|base plate/i, "Model Creation"],
    [/acrylic|resin\b/i, "Acrylics"],
    [/\bwax\b|waxes/i, "Dental Waxes"],
    [/reline|rebas|soft liner|tissue conditioner/i, "Denture relines"],
    [/denture/i, "Denture Processing"],
  ],
  surgery: [
    [/suture|silk\b|vicryl|nylon/i, "Sutures"],
    [/hemostat|haemosta|spon|gelatin|alveo|antiseptic|chlorhexidine|tranexamic|hemo|viscostat|socket|aluminum chloride|staunch/i, "Hemostatic / Antiseptic"],
    [/.*/, "Surgical instruments"],
  ],
  orthopedic: [
    [/instrument|plier|cutter|tweezer|bracket holder|ligature director|band pusher|forcep|scaler|gauge|positioner|\bpiler\b|caliper|forming|mathieu|tucker|ligation gun|screw ?driver|\bdriver|screw tools|organizer|retractor/i, "Ortho instruments"],
    [/\barch ?wires?\b|arches\b|\bwires?\b|\bss\b|niti|rematitan/i, "Wire Products"],
    [/elastic|ligature|power chain|\bchain\b|\btie\b|separator|module/i, "Ligatures & Elastics"],
    [/bracket|razor|\bmbt\b|\broth\b|\bself.?ligat/i, "Bracket Systems"],
    [/expan|\brpe\b|\bmarpe\b|hyrax|hyrex|distaliz|quad helix|retainer|appliance|aligner/i, "Expansion & Appliances"],
    [/\bipr\b|interproximal|stripping/i, "Interproximal Reduction — IPR"],
    [/miniscrew|mini.?implant|\btads?\b|anchor/i, "Orthodontics Anchorage"],
    [/buccal tube|\btube\b|\bbands?\b|\bhook\b|button|eyelet|lingual|attachment|bite turbo/i, "Attachments"],
    [/adhesive|transbond|bond|etch|primer|cement/i, "Adhesives"],
    [/.*/, "Ortho Accessories"],
  ],
  pedodontic: [
    [/crown/i, "Pediatric Crowns"],
    [/space|maintainer/i, "Space Maintainer"],
    [/pulp|formocresol|metapex|mta/i, "Pulp Therapy"],
    [/anesth|matri|needle/i, "Pediatric Anesthesia & Matrices"],
    [/.*/, "Preventive"],
  ],
  periodontic: [
    [/prf\b|platelet|\btack/i, "GBR Fixation & Biologics"],
    [/bone|graft|\bgbr\b|membrane/i, "Bone Grafts"],
    [/dressing|coe-pak|pak\b/i, "Surgical dressings"],
    [/retraction|cord|tissue|alustat|staunch/i, "Tissue Management"],
    [/splint|mouth ?guard|ribbond|night guard/i, "Splints & Mouth Guards"],
    [/plaque|disclos|airflow|prophy|scaler tip|\bpaste\b/i, "Plaque Control"],
    [/instrument|curette|probe|scaler|elevator|tips?\b/i, "Perio instruments"],
    [/.*/, "Surgical products"],
  ],
  equipment: [
    [/loupe|microscope|magnif|headlamp|headlight|neitz light/i, "Loupes & Microscopes"],
    [/spare|replacement|sensor cover|\bfilter\b|compressor|suction|sucker|battery|batteries|\bstool wheel|gas cylinder/i, "Other Equipment"],
    [/handpiece|turbine|micromotor|air motor|contra.?angle|low speed|high speed|straight/i, "Handpieces & Turbines"],
    [/scanner|smilescan/i, "Intraoral Scanners"],
    [/x-?ray|sensor|imaging|camera|photo|mirror|intraoral|\bphosphor\b|apron/i, "Imaging Systems"],
    [/implant motor|surgic|piezo/i, "Implant Motors"],
    [/autoclave|steriliz|sealing machine|distill/i, "Sterilization Equipment"],
    [/portable (unit|dental)|mobile unit/i, "Portable Units"],
    [/.*/, "General equipments"],
  ],
  burs: [
    [/kit|\bset\b|assorted/i, "Bur Kits"],
    [/polish|diacomp|\bcup\b|occlupol/i, "Polishers"],
    [/surg|lindemann|zekrya/i, "Surgical Burs"],
    [/carbide|tungsten|\btc\b|\bfg\b.*carb/i, "Carbide Burs"],
    [/steel|stainless/i, "Steel Burs"],
    [/abrasive|stone|mounted|disc\b|sand/i, "Abrasive Burs"],
    [/.*/, "Diamond Burs"],
  ],
  sterilization: [
    [/autoclave|steriliz(er|ers)|sanitizer instrument|ultrasonic clean/i, "Instrument Sterilizers"],
    [/pouch|roll|reel/i, "Sterilization Pouches"],
    [/indicator|\bcleaning\b|test/i, "Sterilization Indicators & Cleaning"],
    [/contactless|touchless|automatic dispens/i, "Contactless Dispensers"],
    [/dispens/i, "Hand Sanitizer Dispensers"],
    [/hand sanit|hand rub/i, "Hand Sanitizers"],
    [/barrier|sleeve|cover/i, "Barrier Protection"],
    [/mask|glove|gown|shield/i, "Personal Protective Equipment"],
    [/.*/, "Surface Disinfectants"],
  ],
  "oral-care": [
    [/water ?jet|irrigator/i, "Water Jet"],
    [/floss/i, "Flosser"],
    [/toothpaste/i, "Toothpaste"],
    [/brush/i, "Toothbrush"],
    [/mouth ?wash|rinse/i, "Mouthwashes"],
    [/denture/i, "Denture Care"],
    [/.*/, "Toothpaste"],
  ],
  apparel: [
    [/coat/i, "Lab Coats"],
    [/jacket/i, "Scrub Jackets"],
    [/\bcap\b|\bcaps\b/i, "Head Caps"],
    [/clog|slipper|shoe/i, "Clogs (Slippers)"],
    [/scrub/i, "Medical Scrubs"],
    [/.*/, "Accessories"],
  ],
  "lab-materials": [
    [/teeth/i, "Denture teeth"],
    [/zircon|cad|cam\b|3disc|disc\b|milling/i, "CAD CAM"],
    [/ceramic|porcelain|vmk|optiglaze|\blisi\b/i, "Ceramic Material"],
    [/gypsum|plaster|impression|model/i, "Impression & Gypsum"],
    [/.*/, "Acrylic Resins & Waxes"],
  ],
  general: [
    [/glove/i, "Gloves"],
    [/\bmask|face ?mask|\bcap\b|\bcaps\b/i, "Face masks & Caps"],
    [/gown|shield|goggle|eyewear|protective/i, "Protective gear"],
    [/.*/, "General accessories"],
  ],
  maintenance: [
    [/oil|lubric|spray|clean/i, "Handpiece Lubricant"],
    [/.*/, "Spare Parts"],
  ],
};

// Anywhere in the store, these words settle the section.
const SECTION_OVERRIDE = [
  [/disinfect|aseptoprint/i, "sterilization", "Surface Disinfectants"],
  [/practice model|\btraining\b|manikin|teaching/i, "training", "Training Teeth and Models"],
  [/\bbone graft|\bmembrane\b|allograft|xenograft/i, "periodontic", "Bone Grafts"],
  [/\bgloves?\b/i, "general", "Gloves"],
  [/\bface ?masks?\b|\bsurgical masks?\b/i, "general", "Face masks & Caps"],
  [/\banesth|\blidocaine|lidokwal|articaine|mepivacaine|\bcarpule|\bbenzocaine/i, "surgery", "Local Anesthesia"],
  [/^(?!.*irrig).*\bneedles?\b/i, "surgery", "Local Anesthesia", /needle (flat|end|holder)|needle-(end|shaped)/i],
  [/aspirat.*syringe|syringe.*aspirat|\bdental syringes?\b|metal dental syringe/i, "surgery", "Local Anesthesia"],
  [/\bsutures?\b/i, "surgery", "Sutures"],
  [/surgical blades?|scalpel/i, "surgery", "Surgical instruments"],
  [/\bautoclave/i, "equipment", "Sterilization Equipment"],
  [/\bwhiten|\bbleach|carbamide|opalescence|opalustre|tooth jewel/i, "operative", "Whitening"],
  [/retraction|gingibraid|\bcord\b.*knitted|ultrapak|hemostatic retraction/i, "periodontic", "Tissue Management"],
  [/\bendo ?motor|\bapex locat|endo activator|sonic irrigat|obturation (pen|gun|system)|ultra endo|endodontic motor/i, "endodontic", "Endodontic Accessories"],
  [/impression trays?|\bdental tray impression|rim lock/i, "prosthodontic", "Impression Materials"],
];

// In the mixed "general dentistry" list, the name decides the section.
const GENERAL_DENTISTRY = [
  [/gypsum|elite (rock|stone|model)|dental stone|fujirock/i, "prosthodontic", "Model Creation"],
  [/impression|alginate|silicone|polysiloxane|polyether|\bvps\b|bite regist|tracing stick|\bstents?\b|izy sil|occluspray/i, "prosthodontic", "Impression Materials"],
  [/temporary (crown|c&b)|c&b\b|care c&b|protemp|temporisation/i, "prosthodontic", "Crown & Bridge"],
  [/disclosing|plaque/i, "periodontic", "Plaque Control"],
  [/acrylic|charmbase|palaseal|lisi press/i, "lab-materials", "Acrylic Resins & Waxes"],
  [/retraction|\bcord\b/i, "periodontic", "Tissue Management"],
  [/prophy|prophylaxis|airflow|sodium bicarbonate|aluminum (oxide )?powder/i, "periodontic", "Plaque Control"],
  [/fluorid|\bapf\b|fluorination|tooth mousse|mi paste|fissure sealant/i, "pedodontic", "Preventive"],
  [/preparation (set|kit)|prep(aration)? set|prep kit|crown & bridge pre|crown and bridge preparation|grinding and filling kit/i, "burs", "Bur Kits"],
  [/diamond bur|fine burs|inverted cone/i, "burs", "Diamond Burs"],
  [/carbide finisher/i, "burs", "Carbide Burs"],
  [/x-?ray|sensor (holder|positioner)/i, "equipment", "Imaging Systems"],
  [/contra angle|handpiece/i, "equipment", "Handpieces & Turbines"],
  [/root canal|bioceramic|sealer/i, "endodontic", "Obturation"],
  [/mirror handle/i, "general", "General accessories"],
];

function classify(name, collection) {
  for (const [re, branch, sub, unless] of SECTION_OVERRIDE) {
    if (re.test(name) && !(unless && unless.test(name))) return { branch, sub, sure: true };
  }
  if (collection.startsWith("general-dentistry")) {
    for (const [re, branch, sub] of GENERAL_DENTISTRY) {
      if (re.test(name)) return { branch, sub, sure: true };
    }
  }
  if (collection === "orthodontics" && /\bbur\b|\bburs\b/i.test(name)) return { branch: "burs", sub: "Carbide Burs", sure: false };
  if (collection === "endodontics" && /\bbur\b|\bburs\b/i.test(name) && !/endo.?z|pulp opening/i.test(name)) {
    return { branch: "burs", sub: /carbide|tungsten/i.test(name) ? "Carbide Burs" : "Diamond Burs", sure: true };
  }
  const base = fromCollection[collection];
  if (!base) throw new Error("unknown collection " + collection);
  const [branch, baseSub] = base;
  if (baseSub) {
    // A narrower word in the name beats the collection's own default, except
    // on instrument lists, where the words describe what the tool is used on.
    for (const [re, sub] of collection.startsWith("instruments-") && branch !== "burs" ? [] : SUB_RULES[branch] || []) {
      if (re.source !== ".*" && re.test(name)) return { branch, sub, sure: true };
    }
    return { branch, sub: baseSub, sure: true };
  }
  for (const [re, sub] of SUB_RULES[branch] || []) {
    if (re.test(name)) return { branch, sub, sure: re.source !== ".*" || branch === "burs" };
  }
  // Nothing in the name settles it: the broad bucket, flagged for a look.
  const fallback = { operative: "Restorative instruments", endodontic: "Endodontic Accessories", prosthodontic: "Prostho Instruments" };
  return { branch, sub: fallback[branch] || null, sure: false };
}

/* ── Build ───────────────────────────────────────── */

const text = fs.readFileSync(path.join(__dirname, "all_products.csv"), "utf8").replace(/^﻿/, "");
const rows = parseCsv(text);
const head = rows.shift();
const data = rows
  .filter((r) => r.length > 1)
  .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));

const slug = (s) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);

const out = [];
const review = [];
const seen = new Map();
const ids = new Set();
let renamed = 0;
for (const d of data) {
  const brand = BRAND_FIX[d.brand] || d.brand;
  const en = cleanName(d.name);
  if (en !== d.name) renamed += 1;
  if (COPY_BRAND.test(brand)) {
    review.push({ reason: "brand-marked-copy", name: en, brand });
    continue;
  }
  if (NOT_A_PRODUCT.test(en)) {
    review.push({ reason: "shop-bundle", name: en, brand });
    continue;
  }
  const key = `${en.toLowerCase()}|${brand.toLowerCase()}`;
  if (seen.has(key)) {
    review.push({ reason: "duplicate", name: en, brand });
    continue;
  }
  const { branch, sub, sure } = classify(en, d.collection);
  const unbranded = brand === "Unbranded";
  let id = slug(`${unbranded ? "generic" : brand}-${en}`);
  while (ids.has(id)) id += "-2";
  ids.add(id);
  const row = { id, en, brand: unbranded ? "" : brand, branch, sub: sub || "", image: (d.image in STORAGE_IMAGES ? STORAGE_IMAGES[d.image] : d.image) || "" };
  const country = countryOf(brand);
  if (country) row.country = country;
  seen.set(key, row);
  out.push(row);
  if (!sure) review.push({ reason: "section-unsure", name: en, brand, branch, sub: sub || "", source: d.collection });
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v ?? ""));
fs.mkdirSync(path.join(ROOT, "public/catalog"), { recursive: true });
// Short keys: this file is fetched by phones.
fs.writeFileSync(
  path.join(ROOT, "public/catalog/products.json"),
  JSON.stringify(out.map((r) => ({ i: r.id, n: r.en, b: r.brand, s: r.branch, u: r.sub, c: r.country || "", g: r.image || "" }))),
);
fs.writeFileSync(
  path.join(__dirname, "catalog.csv"),
  "﻿" + ["id,name,brand,section,subsection,country,image", ...out.map((r) => [r.id, r.en, r.brand, r.branch, r.sub, r.country || "", r.image || ""].map(csvCell).join(","))].join("\n"),
);
fs.writeFileSync(
  path.join(__dirname, "review.csv"),
  "﻿" + ["reason,name,brand,section,subsection,source", ...review.map((r) => [r.reason, r.name, r.brand, r.branch || "", r.sub || "", r.source || ""].map(csvCell).join(","))].join("\n"),
);

const by = (arr, f) => {
  const m = new Map();
  for (const x of arr) m.set(f(x), (m.get(f(x)) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
console.log("in", data.length, "catalog", out.length, "names changed", renamed);
console.log("set aside", JSON.stringify(by(review, (r) => r.reason)));
console.log("no brand", out.filter((r) => !r.brand).length, "with country", out.filter((r) => r.country).length);
console.log("no subsection", out.filter((r) => !r.sub).length);
console.log(JSON.stringify(by(out, (r) => r.branch)));
const size = fs.statSync(path.join(ROOT, "public/catalog/products.json")).size;
console.log("json bytes", size);
if (process.argv[2] === "--dump") {
  const groups = new Map();
  for (const r of out) {
    const k = `${r.branch} / ${r.sub}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r.en.split(" | ")[0].slice(0, 28));
  }
  for (const [k, v] of [...groups.entries()].sort()) console.log(`\n# ${k} (${v.length}): ${v.slice(0, Number(process.argv[3] || 14)).join(" ; ")}`);
}
