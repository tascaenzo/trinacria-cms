import type { Meta, StoryObj } from "@storybook/react-vite";
import { BodyText } from "./text.js";

const meta = { title: "Primitives/Typography/Text", component: BodyText } satisfies Meta<typeof BodyText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Tones: Story = {
  render: () => (
    <div className="grid gap-3">
      <BodyText tone="default">Primary body text for readable content.</BodyText>
      <BodyText tone="muted">Muted body text for supporting descriptions.</BodyText>
      <BodyText tone="subtle">Subtle body text for secondary metadata.</BodyText>
    </div>
  )
};
