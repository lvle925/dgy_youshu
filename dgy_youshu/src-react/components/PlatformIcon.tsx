import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, Building, Building2, CalendarDays,
  ChevronDown, ChevronRight, CircleHelp, ClipboardList, Crown, Eye, EyeOff,
  FileSearch, FileText, FolderKanban, Gavel, Globe2, History, Home, Landmark,
  LayoutDashboard, LogOut, Map, MapPinned, Network, Plus, Search, Settings2,
  ShieldCheck, Star, Users, UsersRound, WalletCards, X, type LucideIcon,
} from 'lucide-react';

const iconSet = {
  activity: Activity,
  arrowDownRight: ArrowDownRight,
  arrowUpRight: ArrowUpRight,
  bell: Bell,
  building: Building2,
  buildingSmall: Building,
  calendar: CalendarDays,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  help: CircleHelp,
  clipboard: ClipboardList,
  crown: Crown,
  eye: Eye,
  eyeOff: EyeOff,
  fileSearch: FileSearch,
  policy: FileText,
  folder: FolderKanban,
  bidding: Gavel,
  globe: Globe2,
  history: History,
  home: Home,
  landmark: Landmark,
  dashboard: LayoutDashboard,
  logout: LogOut,
  map: MapPinned,
  network: Network,
  plus: Plus,
  search: Search,
  settings: Settings2,
  shield: ShieldCheck,
  star: Star,
  users: UsersRound,
  billing: WalletCards,
  close: X,
} satisfies Record<string, LucideIcon>;

// Business pictograms were generated as a native 4096×4096 master and extracted
// into transparent assets. Tiny interaction controls retain their vector shapes.
const generatedAssets: Partial<Record<keyof typeof iconSet, string>> = {
  activity:'dashboard', arrowDownRight:'building', arrowUpRight:'building',
  building:'building', buildingSmall:'building', calendar:'calendar',
  clipboard:'phone', crown:'shield', fileSearch:'folder', policy:'policy',
  folder:'folder', bidding:'bidding', globe:'globe', history:'history',
  home:'dashboard', landmark:'building', dashboard:'dashboard', map:'map',
  network:'network', search:'search', settings:'settings', shield:'shield',
  star:'policy', users:'users', billing:'billing',
};

export type PlatformIconName = keyof typeof iconSet;

type PlatformIconProps = {
  name: PlatformIconName;
  className?: string;
  variant?: 'generated' | 'line';
};

/** Generated business pictograms with a vector fallback for interaction controls. */
export function PlatformIcon({ name, className = '', variant = 'generated' }: PlatformIconProps) {
  const Icon = iconSet[name];
  const asset = generatedAssets[name];
  if (asset && variant === 'generated') return <span className={`platform-icon platform-icon--generated ${className}`.trim()} data-icon-name={name} aria-hidden="true"><img src={`/images/icons/${asset}.webp`} alt="" width={128} height={128} decoding="async" /></span>;
  return <span className={`platform-icon ${className}`.trim()} data-icon-name={name} aria-hidden="true"><Icon /></span>;
}
