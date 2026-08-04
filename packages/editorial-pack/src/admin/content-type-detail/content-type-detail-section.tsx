import { FormSection } from "@trinacria-cms/trinacria-ui";
import type { ReactNode } from "react";

export function ContentTypeDetailSection({
  title,
  description,
  children,
  headerAddon
}: {
  title: string;
  description: string;
  children: ReactNode;
  headerAddon?: ReactNode;
}) {
  return (
    <FormSection actions={headerAddon} description={description} title={title}>
      {children}
    </FormSection>
  );
}
