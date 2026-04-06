import type { SVGProps } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  LockKeyhole,
  LogOut,
  FolderCog,
  KeyRound,
  LayoutDashboard,
  type LucideIcon,
  PanelLeft,
  PanelLeftClose,
  Search,
  Settings2,
  Sparkles,
  Shield,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "../utils/class-names.js";

const ICONS: Record<string, LucideIcon> = {
  "arrow-right": ArrowRight,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "folder-cog": FolderCog,
  "key-round": KeyRound,
  "layout-dashboard": LayoutDashboard,
  "lock-keyhole": LockKeyhole,
  "log-out": LogOut,
  "panel-left": PanelLeft,
  "panel-left-close": PanelLeftClose,
  search: Search,
  "settings-2": Settings2,
  sparkles: Sparkles,
  shield: Shield,
  "shield-check": ShieldCheck,
  "user-round": UserRound,
  users: Users,
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: string;
}

/**
 * Icon keeps the icon registry inside the UI package so admin contributions can
 * stay string-based and not depend on React icon components directly.
 */
export function Icon({ className, name, ...props }: IconProps) {
  const Component = ICONS[name];

  if (!Component) {
    return null;
  }

  return <Component className={cn("h-4 w-4 shrink-0", className)} {...props} />;
}
