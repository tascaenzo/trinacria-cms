import { cn } from "../../../utils/class-names.js";
import { BodyText } from "../../primitives/text/text.js";
import type {
  SettingsSectionLayoutProps,
  SettingsSectionWidth
} from "./settings-section-layout.types.js";

export function SettingsSectionLayout({
  actions,
  children,
  className,
  description,
  feedback,
  headerActions,
  headingLevel = 2,
  title,
  width = "form",
  ...props
}: SettingsSectionLayoutProps) {
  const widthClassName = getWidthClassName(width);
  const Heading = headingLevel === 3 ? "h3" : "h2";

  return (
    <section
      className={cn("flex h-full min-h-0 flex-col bg-[color:var(--color-surface)]", className)}
      {...props}
    >
      <div className="min-h-0 flex-1 overflow-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className={cn("mx-auto grid gap-6", widthClassName)}>
          <header className="flex flex-col gap-4 border-b border-[color:var(--color-border)] pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <Heading className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--color-ink)]">
                {title}
              </Heading>
              {description ? <BodyText>{description}</BodyText> : null}
            </div>
            {headerActions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
            ) : null}
          </header>
          {feedback}
          {children}
        </div>
      </div>

      {actions ? (
        <footer className="shrink-0 border-t border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-4 py-3 sm:px-6 lg:px-8">
          <div
            className={cn(
              "mx-auto flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end",
              widthClassName
            )}
          >
            {actions}
          </div>
        </footer>
      ) : null}
    </section>
  );
}

function getWidthClassName(width: SettingsSectionWidth) {
  if (width === "wide") return "w-full max-w-6xl";
  if (width === "full") return "w-full max-w-none";
  return "w-full max-w-4xl";
}
