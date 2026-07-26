import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SearchField } from "./search-field.js";

const meta = {
  title: "Forms/SearchField",
  component: SearchField
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    function Demo() {
      const [value, setValue] = useState("");

      return (
        <div className="max-w-md">
          <SearchField
            value={value}
            placeholder="Cerca moduli, route o impostazioni"
            onChange={(event) => setValue(event.target.value)}
          />
        </div>
      );
    }

    return <Demo />;
  }
};
