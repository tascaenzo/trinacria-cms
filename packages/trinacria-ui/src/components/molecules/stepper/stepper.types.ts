export interface StepperItem {
  id: string;
  label: string;
  description?: string;
}

export interface StepperProps {
  items: readonly StepperItem[];
  currentStep: string;
  ariaLabel?: string;
}
