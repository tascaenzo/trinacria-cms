import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ColorSwatchGrid } from "./color-swatch-grid.js";

const colors = [
  { value: "gray", label: "Grigio", backgroundColor: "#f1f1ef", foregroundColor: "#787774" },
  { value: "orange", label: "Arancione", backgroundColor: "#faebdd", foregroundColor: "#d9730d" },
  { value: "green", label: "Verde", backgroundColor: "#edf3ec", foregroundColor: "#448361" },
  { value: "blue", label: "Blu", backgroundColor: "#e7f3f8", foregroundColor: "#337ea9" }
] as const;

const meta = {
  title: "Inputs/ColorSwatchGrid",
  component: ColorSwatchGrid
} satisfies Meta<typeof ColorSwatchGrid>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Selectable: Story = {
  render: () => {
    const [selected, setSelected] = useState("blue");
    return (
      <ColorSwatchGrid
        label="Colore testo"
        options={colors}
        selected={selected}
        onSelect={setSelected}
        renderSwatch={() => "A"}
      />
    );
  }
};
