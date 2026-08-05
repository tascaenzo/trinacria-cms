import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../../atoms/badge/badge.js";
import { Button } from "../../atoms/button/button.js";
import { ActionBar, ContentSection, PageHeader } from "./page-section.js";

const meta = { title: "Layout/Sections/PageSection", component: PageHeader } satisfies Meta<
  typeof PageHeader
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ResourceHeader: Story = {
  render: () => (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Runtime"
        title="Plugin operativi"
        description="Pattern di intestazione per schermate amministrative."
        actions={
          <>
            <Button variant="secondary">Aggiorna</Button>
            <Button>Esegui sync</Button>
          </>
        }
      />
      <ActionBar>
        <p className="text-sm text-[color:var(--color-ink-muted)]">
          12 plugin registrati, 1 richiede attenzione.
        </p>
        <Badge tone="warning">Degraded</Badge>
      </ActionBar>
    </div>
  )
};

export const LinearDocumentSections: Story = {
  render: () => (
    <div className="max-w-3xl space-y-6">
      <ContentSection
        title="Corpo del documento"
        description="Il contenuto viene modificato nell'editor dedicato."
        actions={<Button variant="secondary">Apri editor</Button>}
      >
        <p className="border-y border-[color:var(--color-border)] py-4 text-sm text-[color:var(--color-ink-muted)]">
          Anteprima sintetica del documento, senza contenitori visivi ridondanti.
        </p>
      </ContentSection>
      <ContentSection title="Dati base" description="Metadati usati dal CMS.">
        <p className="text-sm text-[color:var(--color-ink-muted)]">Slug e proprietà editoriali.</p>
      </ContentSection>
    </div>
  )
};
