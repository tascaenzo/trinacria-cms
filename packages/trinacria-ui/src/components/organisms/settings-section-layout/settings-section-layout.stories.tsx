import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { Input } from "../../atoms/input/input.js";
import { FormSection } from "../form-section/form-section.js";
import { SettingsSectionLayout } from "./settings-section-layout.js";

const meta = {
  title: "Layout/SettingsSectionLayout",
  component: SettingsSectionLayout,
  parameters: { layout: "fullscreen" }
} satisfies Meta<typeof SettingsSectionLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Impostazioni generali",
    description: "Configura identità e indirizzo pubblico del sito.",
    actions: (
      <>
        <Button variant="secondary">Ripristina</Button>
        <Button>Salva</Button>
      </>
    ),
    children: (
      <FormSection headingLevel={3} variant="plain" title="Identità del sito">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nome del sito" defaultValue="Trinacria CMS" />
          <Input label="URL pubblico" defaultValue="https://example.com" />
        </div>
      </FormSection>
    )
  }
};
