import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  buildFormControlAria,
  FormControlShell,
  formControlClassName,
  useFormControlIds
} from "../../atoms/form-control/form-control.js";
import { Icon } from "../../atoms/icon/icon.js";
import { OverlaySurface } from "../../primitives/overlay-surface/overlay-surface.js";
import { cn } from "../../../utils/class-names.js";
import type { ComboboxOption, ComboboxProps } from "./combobox.types.js";

function normalize(text: string) {
  return text.toLocaleLowerCase().trim();
}

function sanitizeIdPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function optionDomId(controlId: string, option: ComboboxOption, index: number) {
  return `${controlId}-option-${index}-${sanitizeIdPart(option.value)}`;
}

function useControllableValue(
  value: string | undefined,
  defaultValue: string | undefined,
  onValueChange: ((value: string) => void) | undefined
) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const resolvedValue = isControlled ? value : internalValue;

  function setValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onValueChange?.(nextValue);
  }

  return [resolvedValue, setValue] as const;
}

export function Combobox({
  allowClear = false,
  className,
  defaultValue,
  disabled = false,
  emptyText = "No results found.",
  error,
  hint,
  id,
  label,
  name,
  onValueChange,
  options,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  value,
  ...props
}: ComboboxProps) {
  const ids = useFormControlIds(id, name);
  const aria = buildFormControlAria({
    describedBy: undefined,
    error,
    errorId: ids.errorId,
    hint,
    hintId: ids.hintId
  });
  const [selectedValue, setSelectedValue] = useControllableValue(
    value,
    defaultValue,
    onValueChange
  );
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const deferredQuery = useDeferredValue(query);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === selectedValue),
    [options, selectedValue]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(deferredQuery);

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) => {
      const haystack = normalize(
        [option.label, option.value, ...(option.keywords ?? [])].filter(Boolean).join(" ")
      );

      return haystack.includes(normalizedQuery);
    });
  }, [deferredQuery, options]);

  const enabledOptions = useMemo(
    () => filteredOptions.filter((option) => !option.disabled),
    [filteredOptions]
  );
  const activeOption = enabledOptions[activeIndex];
  const activeOptionRenderedIndex = activeOption
    ? filteredOptions.findIndex((option) => option === activeOption)
    : -1;

  useEffect(() => {
    setQuery(selectedOption?.label ?? "");
  }, [selectedOption]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(target)) {
        setIsOpen(false);
        setQuery(selectedOption?.label ?? "");
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery(selectedOption?.label ?? "");
        inputRef.current?.blur();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, selectedOption]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextIndex = enabledOptions.findIndex((option) => option.value === selectedValue);
    setActiveIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [enabledOptions, isOpen, selectedValue]);

  function commitSelection(option: ComboboxOption) {
    setSelectedValue(option.value);
    setQuery(option.label);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (
      !isOpen &&
      (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter")
    ) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!enabledOptions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % enabledOptions.length);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + enabledOptions.length) % enabledOptions.length);
    }

    if (event.key === "Enter") {
      event.preventDefault();
      commitSelection(enabledOptions[activeIndex] ?? enabledOptions[0]);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setQuery(selectedOption?.label ?? "");
    }
  }

  return (
    <FormControlShell
      className={className}
      controlId={ids.controlId}
      error={error}
      errorId={ids.errorId}
      hint={hint}
      hintId={ids.hintId}
      label={label}
      labelFor={ids.controlId}
      labelId={ids.labelId}
    >
      <div ref={rootRef} className="relative" {...props}>
        {name ? (
          <input type="hidden" name={name} value={selectedValue} disabled={disabled} />
        ) : null}
        <input
          ref={inputRef}
          id={ids.controlId}
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={`${ids.controlId}-listbox`}
          aria-describedby={aria.describedBy}
          aria-errormessage={aria.errorMessage}
          aria-expanded={isOpen}
          aria-invalid={error ? true : undefined}
          aria-activedescendant={
            isOpen && activeOption && activeOptionRenderedIndex >= 0
              ? optionDomId(ids.controlId, activeOption, activeOptionRenderedIndex)
              : undefined
          }
          disabled={disabled}
          value={query}
          placeholder={isOpen ? searchPlaceholder : placeholder}
          className={formControlClassName({
            className: "pr-20",
            disabled,
            error
          })}
          onFocus={() => {
            setIsOpen(true);
            setQuery(selectedOption?.label ?? "");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />

        <div className="pointer-events-none absolute inset-y-0 right-11 flex items-center text-[color:var(--color-ink-subtle)]">
          <Icon name="search" className="h-4 w-4" />
        </div>

        <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2">
          {allowClear && selectedValue ? (
            <button
              type="button"
              aria-label="Clear selection"
              disabled={disabled}
              onClick={() => {
                setSelectedValue("");
                setQuery("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-[color:var(--color-ink-subtle)] transition hover:bg-[color:var(--color-action-ghost-hover)] hover:text-[color:var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-overlay-soft)]"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            aria-label={isOpen ? "Close options" : "Open options"}
            disabled={disabled}
            onClick={() => {
              setIsOpen((current) => !current);
              inputRef.current?.focus();
            }}
            className="inline-flex h-7 w-7 items-center justify-center rounded-[var(--radius-control)] text-[color:var(--color-ink-subtle)] transition hover:bg-[color:var(--color-action-ghost-hover)] hover:text-[color:var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-overlay-soft)]"
          >
            <Icon
              name="chevron-down"
              className={cn("h-4 w-4 transition", isOpen && "rotate-180")}
            />
          </button>
        </div>

        {isOpen ? (
          <OverlaySurface
            id={`${ids.controlId}-listbox`}
            role="listbox"
            className="absolute z-40 mt-2 max-h-72 w-full overflow-auto p-1.5"
          >
            {filteredOptions.length ? (
              <div className="grid gap-1">
                {filteredOptions.map((option, index) => {
                  const isSelected = option.value === selectedValue;
                  const enabledIndex = enabledOptions.findIndex(
                    (enabledOption) => enabledOption === option
                  );
                  const isActive = enabledIndex >= 0 && enabledIndex === activeIndex;

                  return (
                    <button
                      key={`${option.value}-${index}`}
                      id={optionDomId(ids.controlId, option, index)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onMouseEnter={() => {
                        if (enabledIndex >= 0) {
                          setActiveIndex(enabledIndex);
                        }
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      onClick={() => commitSelection(option)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-[var(--radius-control)] px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[color:var(--color-overlay-soft)]",
                        option.disabled && "cursor-not-allowed opacity-50",
                        !option.disabled &&
                          !isSelected &&
                          !isActive &&
                          "text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)]",
                        !option.disabled &&
                          isActive &&
                          !isSelected &&
                          "bg-[color:var(--color-interactive-hover)] text-[color:var(--color-ink)]",
                        isSelected &&
                          "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)] ring-1 ring-[color:var(--color-accent-border)]"
                      )}
                    >
                      {option.icon ? <Icon name={option.icon} className="mt-0.5 h-4 w-4" /> : null}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3">
                          <span className="block font-medium">{option.label}</span>
                          {option.meta ? (
                            <span className="text-xs font-medium text-[color:var(--color-ink-subtle)]">
                              {option.meta}
                            </span>
                          ) : null}
                        </span>
                        {option.description ? (
                          <span className="mt-0.5 block text-xs leading-5 text-[color:var(--color-ink-subtle)]">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? <Icon name="check" className="mt-0.5 h-4 w-4" /> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-2 text-sm text-[color:var(--color-ink-subtle)]">
                {emptyText}
              </div>
            )}
          </OverlaySurface>
        ) : null}
      </div>
    </FormControlShell>
  );
}
