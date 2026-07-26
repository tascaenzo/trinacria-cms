import {
  Button,
  type ButtonProps,
  Icon,
  IconButton,
  JsonViewDialog,
  type JsonViewDialogProps
} from "@trinacria-cms/trinacria-ui";
import { useState } from "react";

export interface JsonPreviewActionProps {
  className?: string;
  closeLabel?: string;
  description?: string;
  dialogVariant?: JsonViewDialogProps["variant"];
  iconOnly?: boolean;
  label?: string;
  payloadTitle?: string;
  size?: ButtonProps["size"];
  title: string;
  value: unknown;
  variant?: ButtonProps["variant"];
  width?: JsonViewDialogProps["width"];
}

/**
 * Standard trigger for JSON inspection in admin pages. Keep JSON out of inline
 * layouts and open it through one consistent modal/drawer interaction.
 */
export function JsonPreviewAction({
  className,
  closeLabel,
  description,
  dialogVariant = "drawer",
  iconOnly = false,
  label,
  payloadTitle,
  size = "sm",
  title,
  value,
  variant = "secondary",
  width = "lg"
}: JsonPreviewActionProps) {
  const [open, setOpen] = useState(false);
  const triggerLabel = label ?? title;

  return (
    <>
      {iconOnly ? (
        <IconButton
          className={className}
          icon="file-json"
          label={triggerLabel}
          size={size}
          variant={variant}
          onClick={() => setOpen(true)}
        />
      ) : (
        <Button
          className={className}
          type="button"
          size={size}
          variant={variant}
          onClick={() => setOpen(true)}
        >
          <Icon name="file-json" className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      )}
      <JsonViewDialog
        open={open}
        onClose={() => setOpen(false)}
        closeLabel={closeLabel}
        title={title}
        description={description}
        payloadTitle={payloadTitle}
        value={value}
        variant={dialogVariant}
        width={width}
      />
    </>
  );
}
