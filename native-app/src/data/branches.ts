import {
  Activity,
  AlignCenterHorizontal,
  Baby,
  BookOpen,
  Cog,
  Droplets,
  FlaskConical,
  HeartPulse,
  Package,
  Scissors,
  Settings,
  Shield,
  Shirt,
  Sparkles,
  Stethoscope,
  Wrench,
  type LucideIcon,
} from 'lucide-react-native';

// The 16 dental-supply "branches" (main product categories), shared between
// the supplier's own catalog (add/edit product, dashboard category grid) and
// the dentist-facing office profile — kept in one place so the two never
// drift out of sync.
export type BranchOption = { value: string; ar: string; en: string };

export const BRANCH_OPTIONS: BranchOption[] = [
  { value: 'general', ar: 'مواد عامة', en: 'General' },
  { value: 'operative', ar: 'معالجة الأسنان', en: 'Operative' },
  { value: 'endodontic', ar: 'علاج الجذور', en: 'Endodontics' },
  { value: 'prosthodontic', ar: 'التركيبات', en: 'Prosthodontics' },
  { value: 'surgery', ar: 'جراحة الفم', en: 'Surgery' },
  { value: 'orthopedic', ar: 'تقويم الأسنان', en: 'Orthodontics' },
  { value: 'pedodontic', ar: 'أسنان الأطفال', en: 'Pedodontics' },
  { value: 'periodontic', ar: 'علاج اللثة', en: 'Periodontics' },
  { value: 'equipment', ar: 'معدات', en: 'Equipment' },
  { value: 'burs', ar: 'مبردات الأسنان', en: 'Dental Burs' },
  { value: 'sterilization', ar: 'مواد التعقيم', en: 'Sterilization' },
  { value: 'oral-care', ar: 'العناية بالفم', en: 'Oral Care' },
  { value: 'apparel', ar: 'ملابس وأزياء', en: 'Apparel' },
  { value: 'training', ar: 'التعلم والتدريب', en: 'Training' },
  { value: 'maintenance', ar: 'مواد الصيانة', en: 'Maintenance' },
  { value: 'lab-materials', ar: 'مواد المختبر', en: 'Lab Materials' },
];

export const BRANCH_CODE: Record<string, string> = {
  general: 'GEN',
  operative: 'OPE',
  endodontic: 'END',
  prosthodontic: 'PRO',
  surgery: 'SUR',
  orthopedic: 'ORT',
  pedodontic: 'PED',
  periodontic: 'PER',
  equipment: 'EQP',
  burs: 'BUR',
  sterilization: 'STE',
  'oral-care': 'ORC',
  apparel: 'APR',
  training: 'TRN',
  maintenance: 'MNT',
  'lab-materials': 'LAB',
};

export const BRANCH_IMAGES: Record<string, number> = {
  general: require('../../assets/branches/general.png'),
  operative: require('../../assets/branches/operative.png'),
  endodontic: require('../../assets/branches/endodontic.png'),
  prosthodontic: require('../../assets/branches/prosthodontic.png'),
  surgery: require('../../assets/branches/surgery.png'),
  orthopedic: require('../../assets/branches/orthopedic.png'),
  pedodontic: require('../../assets/branches/pedodontic.jpg'),
  periodontic: require('../../assets/branches/periodontic.png'),
  equipment: require('../../assets/branches/equipment.png'),
  burs: require('../../assets/branches/burs.png'),
  sterilization: require('../../assets/branches/sterilization.jpg'),
  'oral-care': require('../../assets/branches/oral-care.png'),
  apparel: require('../../assets/branches/apparel.png'),
  training: require('../../assets/branches/training.png'),
  maintenance: require('../../assets/branches/maintenance.png'),
  'lab-materials': require('../../assets/branches/lab-materials.png'),
};

export const BRANCH_BADGE: Record<string, LucideIcon> = {
  general: Package,
  operative: Sparkles,
  endodontic: Activity,
  prosthodontic: Stethoscope,
  surgery: Scissors,
  orthopedic: AlignCenterHorizontal,
  pedodontic: Baby,
  periodontic: HeartPulse,
  equipment: Wrench,
  burs: Cog,
  sterilization: Shield,
  'oral-care': Droplets,
  apparel: Shirt,
  training: BookOpen,
  maintenance: Settings,
  'lab-materials': FlaskConical,
};

/** Branches whose sub-categories drive the dynamic technical-spec form. */
export const TECH_BRANCHES = new Set([
  'endodontic',
  'prosthodontic',
  'surgery',
  'equipment',
  'periodontic',
  'orthopedic',
  'pedodontic',
  'apparel',
  'oral-care',
  'sterilization',
  'burs',
  'lab-materials',
  'maintenance',
  'training',
]);
