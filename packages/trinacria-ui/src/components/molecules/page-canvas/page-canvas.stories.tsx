import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../../atoms/input/input.js";
import { PageHeader } from "../page-section/page-section.js";
import { PageCanvas } from "./page-canvas.js";

const meta = { title: "Layout/PageCanvas", component: PageCanvas } satisfies Meta<
  typeof PageCanvas
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Form: Story = {
  args: {
    width: "form",
    children: (
      <div className="grid gap-6">
        <PageHeader
          title="Modifica contenuto"
          description="La stessa spaziatura per ogni dominio."
        />
        <Input label="Titolo" />
      </div>
    )
  }
};
