import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import type { CenteredPanelProps } from "./centered-panel.types.js";
export function CenteredPanel({ children, title, description, eyebrow }: CenteredPanelProps) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-[color:var(--color-panel-soft)] px-4 py-8 sm:px-6 md:py-12">
      <Panel className="w-full max-w-md space-y-6 p-6 sm:p-8" radius="xl">
        <header className="space-y-2">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-[color:var(--color-ink-subtle)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--color-ink)]">
            {title}
          </h1>
          {description ? <BodyText>{description}</BodyText> : null}
        </header>
        {children}
      </Panel>
    </div>
  );
}
