import type { PropsWithChildren, ReactNode } from "react";

export interface AdminShellNavigationItem {
  id: string;
  routeId: string;
  title: string;
  icon?: string;
  group?: string;
  badge?: string;
  order?: number;
}

export interface AdminShellStatusBadge {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}

export interface AdminShellProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  activeRouteId: string;
  navigation: readonly AdminShellNavigationItem[];
  hiddenNavigationIds?: readonly string[];
  onNavigate: (routeId: string) => void;
  statusBadges?: readonly AdminShellStatusBadge[];
  headerActions?: ReactNode;
  sidebarFooter?: ReactNode;
  hideHeader?: boolean;
}
