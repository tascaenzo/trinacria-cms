import type { PropsWithChildren, ReactNode } from "react";

export interface AdminShellNavigationItem {
  id: string;
  routeId: string;
  title: string;
  icon?: string;
  group?: string;
  badge?: string;
  order?: number;
  params?: Readonly<Record<string, string>>;
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
  activeNavigationParams?: string;
  navigation: readonly AdminShellNavigationItem[];
  hiddenNavigationIds?: readonly string[];
  onNavigate: (routeId: string, params?: URLSearchParams) => void;
  statusBadges?: readonly AdminShellStatusBadge[];
  headerActions?: ReactNode;
  sidebarFooter?: ReactNode;
  hideHeader?: boolean;
  navigationLabel?: string;
  openSidebarLabel?: string;
  closeSidebarLabel?: string;
  expandSidebarLabel?: string;
  collapseSidebarLabel?: string;
}
