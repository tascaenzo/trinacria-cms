import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Combobox } from "./combobox.js";

const environmentOptions = [
  {
    value: "production-eu",
    label: "Production EU",
    description: "Primary region for customer traffic and scheduled jobs.",
    meta: "Frankfurt",
    keywords: ["prod", "eu", "live"],
    icon: "globe"
  },
  {
    value: "production-us",
    label: "Production US",
    description: "Secondary production cluster for North America.",
    meta: "Virginia",
    keywords: ["prod", "us", "na"],
    icon: "server"
  },
  {
    value: "staging-main",
    label: "Staging Main",
    description: "Pre-release validation for plugin and content updates.",
    meta: "Shared",
    keywords: ["stage", "qa"],
    icon: "package"
  },
  {
    value: "sandbox-labs",
    label: "Sandbox Labs",
    description: "Experimental runtime used by internal contributors.",
    meta: "Internal",
    keywords: ["sandbox", "labs", "test"],
    icon: "sparkles"
  },
  {
    value: "edge-preview",
    label: "Edge Preview",
    description: "Preview branch deploys with CDN and media transforms.",
    meta: "Preview",
    keywords: ["preview", "edge"],
    icon: "image"
  },
  {
    value: "archive",
    label: "Archive Node",
    description: "Historical environment kept for audit and restore tests.",
    meta: "Read only",
    keywords: ["archive", "restore"],
    icon: "hard-drive",
    disabled: true
  }
] as const;

const meta = {
  title: "Forms/Inputs/Combobox",
  component: Combobox
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [value, setValue] = useState("production-eu");

    return (
      <div className="max-w-xl">
        <Combobox
          label="Environment"
          hint="Use search when the runtime list gets long."
          options={environmentOptions.map((option) => ({ ...option }))}
          value={value}
          onValueChange={setValue}
          allowClear
        />
      </div>
    );
  }
};

export const EmptyResults: Story = {
  render: () => (
    <div className="max-w-xl">
      <Combobox
        label="Plugin owner"
        options={[
          {
            value: "core-pack",
            label: "core-pack",
            keywords: ["system", "core"],
            icon: "shield-check"
          },
          {
            value: "content-suite",
            label: "content-suite",
            keywords: ["content", "editorial"],
            icon: "file-text"
          }
        ]}
        defaultValue="core-pack"
        emptyText="No owner matches the current search."
      />
    </div>
  )
};
