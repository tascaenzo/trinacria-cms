import type { PropsWithChildren } from "react";
import { cn } from "../../../utils/class-names.js";
import { Eyebrow } from "../../primitives/eyebrow/eyebrow.js";
import { Panel } from "../../primitives/panel/panel.js";
import { BodyText } from "../../primitives/text/text.js";
import type { KeyValueItemProps, KeyValuePanelProps } from "./key-value-panel.types.js";

export function KeyValuePanel({
  children,
  className,
  ...props
}: PropsWithChildren<KeyValuePanelProps>) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)} {...props}>
      {children}
    </div>
  );
}

export function KeyValueItem({ className, label, value, ...props }: KeyValueItemProps) {
  return (
    <Panel className={cn("p-4", className)} tone="soft" radius="lg" {...props}>
      <Eyebrow className="tracking-[0.14em]">{label}</Eyebrow>
      <BodyText className="mt-2" tone="default">
        {value}
      </BodyText>
    </Panel>
  );
}
