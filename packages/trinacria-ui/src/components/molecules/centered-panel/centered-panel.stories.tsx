import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { Input } from "../../atoms/input/input.js";
import { CenteredPanel } from "./centered-panel.js";

const meta = {
  title: "Layout/CenteredPanel",
  component: CenteredPanel,
  parameters: { layout: "fullscreen" }
} satisfies Meta<typeof CenteredPanel>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Login: Story = {
  args: {
    title: "Accedi",
    description: "Gestisci il tuo sito",
    children: (
      <form className="grid gap-4">
        <Input label="Email" type="email" />
        <Input label="Password" type="password" />
        <Button type="submit">Accedi</Button>
      </form>
    )
  }
};
