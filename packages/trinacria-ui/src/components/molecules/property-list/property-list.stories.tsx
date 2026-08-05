import type { Meta, StoryObj } from "@storybook/react-vite";
import { PropertyItem, PropertyList } from "./property-list.js";

const meta = {
  title: "Data Display/PropertyList",
  component: PropertyList
} satisfies Meta<typeof PropertyList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {
  render: () => (
    <PropertyList columns={2}>
      <PropertyItem
        label="Detected key"
        value="storage.s3.bucket"
        hint="Configurata automaticamente dal runtime."
      />
      <PropertyItem
        label="Owner plugin"
        value="media-storage"
        hint="Plugin responsabile della write policy."
      />
      <PropertyItem label="Method" value="PUT" />
      <PropertyItem label="Mode" value="Signed handoff" />
    </PropertyList>
  )
};

export const LinearRecordDetail: Story = {
  render: () => (
    <PropertyList variant="linear">
      <PropertyItem label="Email" value="operator@trinacria.test" />
      <PropertyItem label="Ruolo" value="Amministratore" />
      <PropertyItem label="Stato" value="Attivo" />
    </PropertyList>
  )
};

export const KeyValueRecordDetail: Story = {
  render: () => (
    <PropertyList variant="key-value">
      <PropertyItem label="Email" value="operator@trinacria.test" />
      <PropertyItem label="Ruolo" value="Amministratore" />
      <PropertyItem label="Stato" value="Attivo" />
    </PropertyList>
  )
};
