import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stepper } from "./stepper.js";

const steps = [
  { id: "model", label: "Modello", description: "Scegli la base" },
  { id: "workflow", label: "Workflow", description: "Componi il percorso" },
  { id: "review", label: "Conferma", description: "Controlla e salva" }
] as const;

const meta = {
  title: "Navigation/Stepper",
  component: Stepper,
  args: {
    items: steps,
    currentStep: "workflow"
  }
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FirstStep: Story = {
  args: { currentStep: "model" }
};

export const Completed: Story = {
  args: { currentStep: "review" }
};
