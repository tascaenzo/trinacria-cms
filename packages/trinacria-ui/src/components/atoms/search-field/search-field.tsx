import { forwardRef } from "react";
import { cn } from "../../../utils/class-names.js";
import { FormControlSurface } from "../form-control/form-control.js";
import { Icon } from "../icon/icon.js";
import type { SearchFieldProps } from "./search-field.types.js";

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  {
    "aria-label": ariaLabel,
    className,
    clearLabel = "Cancella ricerca",
    disabled,
    onChange,
    onKeyDown,
    searchLabel = "Cerca",
    value,
    ...props
  },
  ref
) {
  const hasValue = typeof value === "string" ? value.length > 0 : false;

  return (
    <FormControlSurface
      className={cn("flex h-10 items-center gap-2 px-3 shadow-sm", className)}
      disabled={disabled}
    >
      <Icon name="search" className="h-4 w-4 text-[color:var(--color-ink-subtle)]" />
      <input
        ref={ref}
        aria-label={ariaLabel ?? searchLabel}
        type="search"
        value={value}
        disabled={disabled}
        onChange={onChange}
        onKeyDown={onKeyDown}
        className="w-full border-0 bg-transparent text-sm text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-ink-subtle)]"
        {...props}
      />
      {hasValue ? (
        <button
          type="button"
          aria-label={clearLabel}
          disabled={disabled}
          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-[color:var(--color-ink-subtle)] transition hover:bg-[color:var(--color-panel-soft)] hover:text-[color:var(--color-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            onChange?.({
              target: { value: "" },
              currentTarget: { value: "" }
            } as React.ChangeEvent<HTMLInputElement>);
          }}
        >
          <Icon name="x" className="h-4 w-4" />
        </button>
      ) : null}
    </FormControlSurface>
  );
});
