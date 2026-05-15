import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../../atoms/button/button.js";
import { Input } from "../../atoms/input/input.js";
import { FilterBar } from "./filter-bar.js";

const meta = {
  title: "Forms/FilterBar",
  component: FilterBar
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <FilterBar
      summary="Filtra per owner plugin e aggiorna manualmente l'inventario definizioni."
      actions={
        <>
          <div className="self-end">
            <Button type="submit" variant="secondary">
              Apply
            </Button>
          </div>
          <div className="self-end">
            <Button type="button">Refresh</Button>
          </div>
        </>
      }
    >
      <Input
        label="Owner plugin"
        name="ownerPluginId"
        hint="Filtra per proprietario del setting."
      />
    </FilterBar>
  )
};
