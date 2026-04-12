import { cn } from "../../../utils/class-names.js";
import type { ResourcePageProps } from "./resource-page.types.js";

export function ResourcePage({
  children,
  className,
  feedback,
  header,
  sidebar,
  toolbar,
  ...props
}: ResourcePageProps) {
  return (
    <div className={cn("grid gap-4", className)} {...props}>
      {header}
      {toolbar}
      {feedback}
      {sidebar ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">{children}</div>
          <aside className="grid gap-4">{sidebar}</aside>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
