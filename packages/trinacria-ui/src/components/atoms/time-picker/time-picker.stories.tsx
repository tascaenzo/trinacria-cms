import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TimePicker } from "./time-picker.js";

const meta = { title: "Forms/Pickers/TimePicker", component: TimePicker } satisfies Meta<typeof TimePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => {
    const [value, setValue] = useState("09:30");

    return (
      <div className="grid max-w-xl gap-4">
        <TimePicker label="Cutoff time" value={value} onValueChange={setValue} />
        <TimePicker label="Maintenance start" minuteStep={15} hint="Slot disponibili ogni 15 minuti." />
        <TimePicker label="Review slot" error="L'orario selezionato collide con un blocco editoriale." />
      </div>
    );
  }
};
