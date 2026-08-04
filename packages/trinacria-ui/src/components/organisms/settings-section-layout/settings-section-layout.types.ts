import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";

export type SettingsSectionWidth = "form" | "wide" | "full";

export interface SettingsSectionLayoutProps
  extends PropsWithChildren<Omit<HTMLAttributes<HTMLElement>, "title">> {
  actions?: ReactNode;
  description?: ReactNode;
  feedback?: ReactNode;
  headerActions?: ReactNode;
  title: ReactNode;
  width?: SettingsSectionWidth;
  headingLevel?: 2 | 3;
}
