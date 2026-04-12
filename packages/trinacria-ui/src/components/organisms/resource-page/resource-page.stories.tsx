import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { ErrorBanner } from "../../molecules/feedback/feedback.js";
import { PageHeader } from "../../molecules/page-section/page-section.js";
import { ResourceToolbar } from "../resource-toolbar/resource-toolbar.js";
import { ResourcePage } from "./resource-page.js";

const meta = { title: "Layout/Pages/ResourcePage", component: ResourcePage } satisfies Meta<typeof ResourcePage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ResourcePage
      header={
        <PageHeader
          eyebrow="Runtime"
          title="Plugin operativi"
          description="Scheletro standard per schermate amministrative."
          actions={<Button>Esegui sync</Button>}
        />
      }
      toolbar={
        <ResourceToolbar
          leading={<p className="text-sm text-[color:var(--color-ink-muted)]">12 record trovati</p>}
          actions={<Button variant="secondary">Aggiorna</Button>}
        />
      }
      feedback={<ErrorBanner message="Timeout durante refresh del catalogo runtime." />}
      sidebar={
        <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-4 text-sm text-[color:var(--color-ink-muted)]">
          Sidebar contestuale
        </div>
      }
    >
      <div className="rounded-2xl border border-[color:var(--color-border)] bg-white p-6 text-sm text-[color:var(--color-ink-muted)]">
        Area contenuti principale
      </div>
    </ResourcePage>
  )
};
