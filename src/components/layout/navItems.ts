import {
  CalendarDays,
  LayoutGrid,
  CalendarRange,
  ChartColumnIncreasing,
  Settings2,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Today", icon: CalendarDays },
  { href: "/tracker", label: "Tracker", icon: LayoutGrid },
  { href: "/calendar", label: "Calendar", icon: CalendarRange },
  { href: "/stats", label: "Stats", icon: ChartColumnIncreasing },
  { href: "/profile", label: "Profile", icon: Settings2 },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
