import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../../atoms/icon/icon.js";
import { ButtonBase } from "./button-base.js";

const meta = { title: "Primitives/Interaction/ButtonBase", component: ButtonBase } satisfies Meta<typeof ButtonBase>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <ButtonBase>Primary</ButtonBase>
      <ButtonBase variant="secondary">Secondary</ButtonBase>
      <ButtonBase variant="outline">Outline</ButtonBase>
      <ButtonBase variant="ghost">Ghost</ButtonBase>
    </div>
  ),
};

export const IconOnly: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <ButtonBase iconOnly aria-label="Refresh" variant="outline">
        <Icon name="refresh-cw" />
      </ButtonBase>
      <ButtonBase iconOnly aria-label="Open settings" variant="secondary">
        <Icon name="settings-2" />
      </ButtonBase>
      <ButtonBase iconOnly aria-label="Delete item" variant="ghost">
        <Icon name="trash-2" />
      </ButtonBase>
    </div>
  ),
};
