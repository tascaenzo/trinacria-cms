import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DateTimePicker } from "./date-time-picker.js";

const meta = { title: "Forms/Pickers/DateTimePicker", component: DateTimePicker } satisfies Meta<typeof DateTimePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => {
    const [value, setValue] = useState("2026-04-11T14:30");

    return (
      <div className="grid max-w-3xl gap-4">
        <DateTimePicker
          label="Publication slot"
          hint="Usa data e ora per schedulare il rilascio editoriale."
          value={value}
          onValueChange={setValue}
        />
        <DateTimePicker label="Maintenance window" minuteStep={15} />
        <DateTimePicker label="Escalation deadline" error="La deadline deve essere successiva alla creazione del ticket." />
      </div>
    );
  }
};
