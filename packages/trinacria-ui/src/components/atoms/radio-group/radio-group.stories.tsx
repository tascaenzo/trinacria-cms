import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RadioGroup } from "./radio-group.js";

const meta = { title: "Forms/Selection/RadioGroup", component: RadioGroup } satisfies Meta<typeof RadioGroup>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => {
    const [value, setValue] = useState("manual");

    return (
      <div className="max-w-3xl">
        <RadioGroup
          label="Publishing mode"
          hint="Determina come vengono rese pubbliche le modifiche editoriali."
          name="publishing-mode"
          value={value}
          onValueChange={setValue}
          orientation="horizontal"
          options={[
            { value: "manual", label: "Manual", description: "Gli editor pubblicano ogni modifica esplicitamente." },
            { value: "scheduled", label: "Scheduled", description: "Le modifiche vengono pubblicate secondo finestre pianificate." },
            { value: "instant", label: "Instant", description: "Ogni modifica valida va online subito." }
          ]}
        />
      </div>
    );
  }
};
