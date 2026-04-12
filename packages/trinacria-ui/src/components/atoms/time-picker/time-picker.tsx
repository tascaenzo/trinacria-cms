import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../../utils/class-names.js";
import { Button } from "../button/button.js";
import {
  buildFormControlAria,
  FormControlShell,
  formControlClassName,
  useFormControlIds,
} from "../form-control/form-control.js";
import { Icon } from "../icon/icon.js";
import type { TimePickerProps } from "./time-picker.types.js";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function parseTime(value?: string | null): { hour: number; minute: number } | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function formatTimeLabel(value?: string | null): string | null {
  const parsed = parseTime(value);
  if (!parsed) {
    return null;
  }

  return `${pad(parsed.hour)}:${pad(parsed.minute)}`;
}

export function TimePicker({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  className,
  defaultValue,
  disabled = false,
  error,
  hint,
  id,
  label,
  minuteStep = 5,
  onValueChange,
  placeholder = "Seleziona un orario",
  value,
  ...props
}: TimePickerProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;
  const parsed = parseTime(currentValue) ?? { hour: 9, minute: 0 };
  const ids = useFormControlIds(id);
  const popupId = `${ids.controlId}-popup`;
  const popupTitleId = `${ids.controlId}-popup-title`;
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const hourSelectRef = useRef<HTMLSelectElement | null>(null);
  const aria = buildFormControlAria({
    describedBy: ariaDescribedBy,
    error,
    errorId: ids.errorId,
    hint,
    hintId: ids.hintId,
  });

  useEffect(() => {
    setHour(parsed.hour);
    setMinute(parsed.minute);
  }, [parsed.hour, parsed.minute]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      hourSelectRef.current?.focus();
    }
  }, [isOpen]);

  const minuteOptions = useMemo(() => {
    const values: number[] = [];
    for (let current = 0; current < 60; current += minuteStep) {
      values.push(current);
    }
    return values;
  }, [minuteStep]);

  function commit(nextHour: number, nextMinute: number) {
    const nextValue = `${pad(nextHour)}:${pad(nextMinute)}`;
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  function closeAndRestoreFocus() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  const displayValue = formatTimeLabel(currentValue);

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
      <div ref={containerRef} {...props}>
        <div className="relative">
          <button
            ref={triggerRef}
            id={ids.controlId}
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((current) => !current)}
            className={cn("flex items-center justify-between text-left", formControlClassName({ disabled, error }))}
            aria-describedby={aria.describedBy}
            aria-errormessage={aria.errorMessage}
            aria-expanded={isOpen}
            aria-haspopup="dialog"
            aria-controls={popupId}
            aria-invalid={error ? true : ariaInvalid}
            aria-label={typeof ariaLabel === "string" ? ariaLabel : undefined}
          >
            <span className={cn(!displayValue && "text-[color:var(--color-ink-subtle)]")}>
              {displayValue ?? placeholder}
            </span>
            <Icon name="clock-3" className="text-[color:var(--color-ink-subtle)]" />
          </button>

          {isOpen ? (
            <div
              id={popupId}
              role="dialog"
              aria-modal="false"
              aria-labelledby={popupTitleId}
              className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[280px] rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.16)]"
            >
              <div className="grid gap-4">
                <div id={popupTitleId} className="text-sm font-semibold text-[color:var(--color-ink)]">
                  Selettore orario
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
                      Ore
                    </span>
                    <select
                      ref={hourSelectRef}
                      value={pad(hour)}
                      onChange={(event) => setHour(Number(event.target.value))}
                      className="h-10 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-ink)]"
                    >
                      {Array.from({ length: 24 }, (_, item) => (
                        <option key={item} value={pad(item)}>
                          {pad(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <span className="pb-2 text-lg font-semibold text-[color:var(--color-ink-subtle)]">:</span>
                  <label className="grid gap-2">
                    <span className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]">
                      Minuti
                    </span>
                    <select
                      value={pad(minute)}
                      onChange={(event) => setMinute(Number(event.target.value))}
                      className="h-10 rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-ink)]"
                    >
                      {minuteOptions.map((item) => (
                        <option key={item} value={pad(item)}>
                          {pad(item)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (value === undefined) {
                        setInternalValue("");
                      }
                      onValueChange?.("");
                      closeAndRestoreFocus();
                    }}
                    className="text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]"
                    aria-label="Reset time"
                  >
                    reset
                  </button>
                  <Button
                    size="sm"
                    onClick={() => {
                      commit(hour, minute);
                      closeAndRestoreFocus();
                    }}
                  >
                    Conferma
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </FormControlShell>
  );
}
