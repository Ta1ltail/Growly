import {
  LayoutDashboard,
  CalendarDays,
  ListTodo,
  LayoutGrid,
  CalendarRange,
  Target,
  LayoutTemplate,
  NotebookPen,
  ChartColumnIncreasing,
  Trophy,
  ShoppingBag,
  Settings2,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

// Full sidebar navigation (desktop-first), grouped by purpose.
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/today", label: "Today", icon: CalendarDays },
    ],
  },
  {
    title: "Track",
    items: [
      { href: "/habits", label: "Habits", icon: ListTodo },
      { href: "/tracker", label: "Tracker", icon: LayoutGrid },
      { href: "/calendar", label: "Calendar", icon: CalendarRange },
    ],
  },
  {
    title: "Grow",
    items: [
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/notes", label: "Notes", icon: NotebookPen },
    ],
  },
  {
    title: "Review",
    items: [
      { href: "/stats", label: "Statistics", icon: ChartColumnIncreasing },
      { href: "/achievements", label: "Achievements", icon: Trophy },
      { href: "/shop", label: "Shop", icon: ShoppingBag },
    ],
  },
  {
    title: "You",
    items: [
      { href: "/settings", label: "Settings", icon: Settings2 },
      { href: "/profile", label: "Profile", icon: UserRound },
    ],
  },
];

// Compact mobile bottom navigation (the five most-used screens).
export const NAV_BOTTOM: NavItem[] = [
  { href: "/today", label: "Today", icon: CalendarDays },
  { href: "/tracker", label: "Tracker", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/stats", label: "Stats", icon: ChartColumnIncreasing },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
