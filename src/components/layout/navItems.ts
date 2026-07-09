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
  Users,
  Lightbulb,
  Medal,
  Bell,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
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
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
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
    title: "Social",
    items: [
      { href: "/friends", label: "Friends", icon: Users },
      { href: "/leaderboard", label: "Leaderboard", icon: Medal },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/suggestions", label: "Suggestions", icon: Lightbulb },
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

// Route → Tailwind text-color class for nav icons, giving each section a
// distinct accent while keeping the palette cohesive and not garish.
export const routeIconColors: Record<string, string> = {
  "/": "text-sky-500",
  "/dashboard": "text-indigo-500",
  "/today": "text-emerald-500",
  "/habits": "text-violet-500",
  "/tracker": "text-cyan-500",
  "/calendar": "text-rose-500",
  "/goals": "text-amber-500",
  "/templates": "text-orange-500",
  "/notes": "text-pink-500",
  "/stats": "text-blue-500",
  "/achievements": "text-yellow-500",
  "/shop": "text-emerald-500",
  "/friends": "text-teal-500",
  "/leaderboard": "text-amber-400",
  "/notifications": "text-red-400",
  "/suggestions": "text-purple-400",
  "/settings": "text-slate-400",
  "/profile": "text-violet-400",
};

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
