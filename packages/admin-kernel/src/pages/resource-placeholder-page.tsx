import type { AdminPageRenderContext } from "../runtime/admin-route-runtime.js";
import { Card, Button } from "@trinacria-cms/admin-ui";

export interface ResourcePlaceholderPageProps {
  accentLabel: string;
  summary: string;
}

/**
 * ResourcePlaceholderPage is a scaffold page used while a module exists in the
 * navigation contract but its full CRUD surface is not implemented yet.
 */
export function ResourcePlaceholderPage({
  accentLabel,
  summary,
}: ResourcePlaceholderPageProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
      <Card eyebrow={accentLabel} title="Module scaffolded">
        <p className="max-w-3xl text-sm leading-7 text-[color:var(--color-ink-muted)]">
          {summary}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button>Design resource table</Button>
          <Button variant="secondary">Add filters and forms</Button>
        </div>
      </Card>
      <Card eyebrow="Next step" title="Implementation checklist">
        <ul className="space-y-3 text-sm leading-6 text-[color:var(--color-ink-muted)]">
          <li>Connect the page to the generated SDK operations for this module.</li>
          <li>Add capability-aware actions instead of static scaffold buttons.</li>
          <li>Project plugin-specific widgets into the shell when they exist.</li>
        </ul>
      </Card>
    </div>
  );
}

export function createResourcePlaceholderRender(
  props: ResourcePlaceholderPageProps,
) {
  return (_context: AdminPageRenderContext) => (
    <ResourcePlaceholderPage {...props} />
  );
}
