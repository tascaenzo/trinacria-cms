import { cn } from "../../../utils/class-names.js";
import { ErrorBanner } from "../../molecules/feedback/feedback.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import type { FormSectionProps } from "./form-section.types.js";

export function FormSection({
  actions,
  children,
  className,
  description,
  error,
  title,
  ...props
}: FormSectionProps) {
  return (
    <Panel className={cn("grid gap-4 p-5", className)} radius="lg" {...props}>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-[color:var(--color-ink)]">{title}</h2>
        {description ? <BodyText>{description}</BodyText> : null}
      </div>
      {error ? <ErrorBanner message={error} /> : null}
      <div className="grid gap-4">{children}</div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[color:var(--color-border)] pt-4">
          {actions}
        </div>
      ) : null}
    </Panel>
  );
}
