import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import type { IconName } from "../../atoms/icon/icon.js";

export interface CardProps
  extends PropsWithChildren,
    Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  eyebrow?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  /** Set to none when composing the card with CardHeader, CardContent and CardActions. */
  padding?: "md" | "none";
  elevation?: "none" | "sm";
}

export interface CardHeadingProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  actions?: ReactNode;
  headingLevel?: 2 | 3 | 4;
}
