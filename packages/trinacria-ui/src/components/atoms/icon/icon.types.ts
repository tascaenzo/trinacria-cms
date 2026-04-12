import type { SVGProps } from "react";
import type { IconName } from "./icon.js";

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}
