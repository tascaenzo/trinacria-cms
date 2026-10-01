import { cn } from "../../../utils/class-names.js";
import { Icon } from "../icon/icon.js";
import type { IconTileProps } from "./icon-tile.types.js";

const tones = {
  neutral: "bg-[color:var(--color-neutral-bg)] text-[color:var(--color-neutral-ink)]",
  accent: "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)]",
  info: "bg-[color:var(--color-info-bg)] text-[color:var(--color-info-ink)]",
  success: "bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]",
  warning: "bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]",
  danger: "bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]"
};
export function IconTile({
  icon,
  tone = "neutral",
  size = "md",
  label,
  className,
  ...props
}: IconTileProps) {
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)]",
    tones[tone],
    size === "sm" ? "h-9 w-9" : size === "lg" ? "h-12 w-12" : "h-11 w-11",
    className
  );
  const content = <Icon name={icon} className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />;
  return label ? (
    <span {...props} role="img" aria-label={label} className={classes}>
      {content}
    </span>
  ) : (
    <span {...props} aria-hidden="true" className={classes}>
      {content}
    </span>
  );
}
