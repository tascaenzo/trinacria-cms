import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState, ErrorBanner } from "../../molecules/feedback/feedback.js";
import { StateStack } from "./state-stack.js";

const meta = { title: "Display/Status/StateStack", component: StateStack } satisfies Meta<typeof StateStack>;
export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyWithError: Story = {
  render: () => (
    <StateStack
      error={<ErrorBanner message="Impossibile completare il fetch." />}
      empty={<EmptyState text="Nessun record disponibile." />}
      isEmpty
    >
      <div>Content</div>
    </StateStack>
  )
};
