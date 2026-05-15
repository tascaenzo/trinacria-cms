import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field, FieldDescription, FieldError, FieldGroup, FieldHint, FieldLabel } from "./field.js";

const meta = { title: "Forms/Infrastructure/Field", component: Field } satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Composition: Story = {
  render: () => (
    <div className="max-w-xl">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="tenant-name">Tenant</FieldLabel>
          <FieldDescription>Identificatore principale del tenant.</FieldDescription>
          <input
            id="tenant-name"
            className="h-10 rounded-lg border border-[color:var(--color-border)] px-3"
          />
          <FieldHint>Usato per DNS e provisioning.</FieldHint>
        </Field>
        <Field>
          <FieldLabel htmlFor="client-id">Client ID</FieldLabel>
          <input
            id="client-id"
            className="h-10 rounded-[var(--radius-control)] border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-bg)] px-3"
          />
          <FieldError>Il campo e obbligatorio.</FieldError>
        </Field>
      </FieldGroup>
    </div>
  )
};
