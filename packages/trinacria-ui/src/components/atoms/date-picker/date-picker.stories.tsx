import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DatePicker } from "./date-picker.js";

const meta = { title: "Forms/Pickers/DatePicker", component: DatePicker } satisfies Meta<typeof DatePicker>;
export default meta;
type Story = StoryObj<typeof meta>;

export const States: Story = {
  render: () => {
    const [value, setValue] = useState("2026-04-11");

    return (
      <div className="grid max-w-xl gap-4">
        <DatePicker label="Publish date" value={value} onValueChange={setValue} />
        <DatePicker label="Freeze window start" hint="Sono accettate solo date future." min="2026-04-11" />
        <DatePicker label="Archive date" error="La data deve essere successiva alla publish date." />
      </div>
    );
  }
};
