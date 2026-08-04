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
  headingLevel = 2,
  title,
  variant = "panel",
  ...props
}: FormSectionProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  const content = (
    <>
      {title || description ? (
        <div className="space-y-1.5">
          {title ? (
            <Heading
              className={cn(
                "font-semibold text-[color:var(--color-ink)]",
                variant === "plain" ? "text-base" : "text-lg"
              )}
            >
              {title}
            </Heading>
          ) : null}
          {description ? <BodyText>{description}</BodyText> : null}
        </div>
      ) : null}
      {error ? <ErrorBanner message={error} /> : null}
      <div className="grid gap-4">{children}</div>
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[color:var(--color-border)] pt-4">
          {actions}
        </div>
      ) : null}
    </>
  );

  if (variant === "plain") {
    return (
      <section className={cn("grid gap-5", className)} {...props}>
        {content}
      </section>
    );
  }

  return (
    <Panel className={cn("grid gap-4 p-5", className)} radius="lg" {...props}>
      {content}
    </Panel>
  );
}
