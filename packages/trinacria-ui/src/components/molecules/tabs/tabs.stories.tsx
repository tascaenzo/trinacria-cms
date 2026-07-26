import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Tabs } from "./tabs.js";

const meta = {
  title: "Navigation/Tabs",
  component: Tabs,
  args: {
    items: [
      { value: "available", label: "Disponibili", count: 8 },
      { value: "deleted", label: "Eliminati", count: 2 }
    ],
    value: "available",
    onValueChange: () => undefined,
    children: null
  }
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value);
    return (
      <Tabs {...args} value={value} onValueChange={setValue}>
        <div className="py-5 text-sm text-[color:var(--color-ink-muted)]">
          Contenuto della sezione {value}.
        </div>
      </Tabs>
    );
  }
};
