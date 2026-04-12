import type { ButtonBaseProps } from "../../primitives/button-base/button-base.types.js";
import type { IconName } from "../icon/icon.js";

export interface IconButtonProps extends Omit<ButtonBaseProps, "children" | "iconOnly"> {
  icon: IconName;
  label: string;
}
