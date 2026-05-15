import { ButtonBase } from "../../primitives/button-base/button-base.js";
import { Icon } from "../icon/icon.js";
import type { IconButtonProps } from "./icon-button.types.js";

export function IconButton({ icon, label, size = "md", title, ...props }: IconButtonProps) {
  return (
    <ButtonBase {...props} size={size} iconOnly aria-label={label} title={title ?? label}>
      <Icon name={icon} />
    </ButtonBase>
  );
}
