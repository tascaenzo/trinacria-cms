import { forwardRef } from "react";
import { ButtonBase } from "../../primitives/button-base/button-base.js";
import type { ButtonProps } from "./button.types.js";

/**
 * Button follows the shell rhythm used across the dashboard: compact sizing,
 * restrained radius, and contrast-first variants instead of decorative chrome.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, ...props },
  ref
) {
  return (
    <ButtonBase ref={ref} {...props}>
      {children}
    </ButtonBase>
  );
});
