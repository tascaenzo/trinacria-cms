import { cn } from "../../../utils/class-names.js";
import { StatCard } from "../../molecules/stat-card/stat-card.js";
import type { SummaryCardProps, SummaryGridProps } from "./summary-grid.types.js";

export function SummaryGrid({ children, className, ...props }: SummaryGridProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)} {...props}>
      {children}
    </div>
  );
}

export function SummaryCard({
  badge,
  className,
  description,
  label,
  value,
  ...props
}: SummaryCardProps) {
  return (
    <StatCard
      className={className}
      label={label}
      value={value}
      description={description}
      badge={badge}
      {...props}
    />
  );
}
