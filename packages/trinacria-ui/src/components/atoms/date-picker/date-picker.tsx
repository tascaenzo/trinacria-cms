import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { cn } from "../../../utils/class-names.js";
import { OverlaySurface } from "../../primitives/overlay-surface/overlay-surface.js";
import {
  buildFormControlAria,
  FormControlShell,
  formControlClassName,
  useFormControlIds
} from "../form-control/form-control.js";
import { Icon } from "../icon/icon.js";
import type { DatePickerProps } from "./date-picker.types.js";
import {
  buildCalendar,
  clampDateKey,
  formatDateAriaLabel,
  formatDateLabel,
  monthLabel,
  parseDateKey,
  shiftMonth,
  toDateKey
} from "./date-picker.utils.js";

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

function useControllableDate(
  value?: string,
  defaultValue?: string,
  onValueChange?: (value: string) => void
) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const currentValue = isControlled ? (value ?? "") : internalValue;

  function setValue(nextValue: string) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  return [currentValue, setValue] as const;
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

export function DatePicker({
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
  max,
  min,
  onValueChange,
  placeholder = "Seleziona una data",
  value,
  ...props
}: DatePickerProps) {
  const [selectedValue, setSelectedValue] = useControllableDate(value, defaultValue, onValueChange);
  const selectedDate = parseDateKey(selectedValue);
  const ids = useFormControlIds(id);
  const popupId = `${ids.controlId}-popup`;
  const monthLabelId = `${ids.controlId}-month`;
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => selectedDate ?? new Date());
  const [focusedKey, setFocusedKey] = useState(selectedValue || toDateKey(new Date()));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const aria = buildFormControlAria({
    describedBy: ariaDescribedBy,
    error,
    errorId: ids.errorId,
    hint,
    hintId: ids.hintId
  });

  useEffect(() => {
    if (selectedDate) {
      setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [selectedValue, selectedDate]);

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

  const calendar = useMemo(() => buildCalendar(visibleMonth), [visibleMonth]);
  const calendarRows = useMemo(() => {
    return Array.from({ length: 6 }, (_, rowIndex) =>
      calendar.slice(rowIndex * 7, rowIndex * 7 + 7)
    );
  }, [calendar]);
  const displayValue = formatDateLabel(selectedValue);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const candidate = selectedValue || toDateKey(new Date());
    setFocusedKey(candidate);
  }, [isOpen, selectedValue]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const button = dayRefs.current[focusedKey];
    button?.focus();
  }, [focusedKey, isOpen, visibleMonth]);

  function closeAndRestoreFocus() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function selectDay(nextValue: string) {
    if (!clampDateKey(nextValue, min, max)) {
      return;
    }

    setSelectedValue(nextValue);
    closeAndRestoreFocus();
  }

  function moveFocus(nextDate: Date) {
    const nextKey = toDateKey(nextDate);
    setFocusedKey(nextKey);
    setVisibleMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
  }

  function handleDayKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, date: Date) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus(addDays(date, -1));
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus(addDays(date, 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveFocus(addDays(date, -7));
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveFocus(addDays(date, 7));
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      moveFocus(addDays(date, -(date.getDay() === 0 ? 6 : date.getDay() - 1)));
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      moveFocus(addDays(date, date.getDay() === 0 ? 0 : 7 - date.getDay()));
      return;
    }

    if (event.key === "PageUp") {
      event.preventDefault();
      moveFocus(shiftMonth(date, -1));
      return;
    }

    if (event.key === "PageDown") {
      event.preventDefault();
      moveFocus(shiftMonth(date, 1));
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectDay(toDateKey(date));
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
      <div ref={containerRef} {...props}>
        <div className="relative">
          <button
            ref={triggerRef}
            id={ids.controlId}
            type="button"
            disabled={disabled}
            onClick={() => setIsOpen((current) => !current)}
            className={cn(
              "flex items-center justify-between text-left",
              formControlClassName({ disabled, error })
            )}
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
            <span className="flex items-center gap-2 text-[color:var(--color-ink-subtle)]">
              <Icon name="calendar-days" />
            </span>
          </button>
          {selectedValue && !disabled ? (
            <button
              type="button"
              onClick={() => setSelectedValue("")}
              className="absolute right-9 top-1/2 -translate-y-1/2 text-xs font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]"
              aria-label="Reset date"
            >
              reset
            </button>
          ) : null}

          {isOpen ? (
            <OverlaySurface
              id={popupId}
              role="dialog"
              aria-modal="false"
              aria-labelledby={monthLabelId}
              className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-[320px] p-4"
            >
              <div className="mb-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => shiftMonth(current, -1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)]"
                  aria-label="Mese precedente"
                >
                  <Icon name="chevron-left" />
                </button>
                <div
                  id={monthLabelId}
                  className="text-sm font-semibold capitalize text-[color:var(--color-ink)]"
                >
                  {monthLabel(visibleMonth)}
                </div>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((current) => shiftMonth(current, 1))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border)] text-[color:var(--color-ink-muted)] hover:bg-[color:var(--color-interactive-hover)] hover:text-[color:var(--color-ink)]"
                  aria-label="Mese successivo"
                >
                  <Icon name="chevron-right" />
                </button>
              </div>

              <div role="grid" aria-labelledby={monthLabelId}>
                <div
                  role="row"
                  className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--color-ink-subtle)]"
                >
                  {WEEKDAY_LABELS.map((weekday) => (
                    <span key={weekday} role="columnheader" className="py-2">
                      {weekday}
                    </span>
                  ))}
                </div>

                <div className="grid gap-1">
                  {calendarRows.map((row, rowIndex) => (
                    <div key={rowIndex} role="row" className="grid grid-cols-7 gap-1">
                      {row.map((cell) => {
                        const key = toDateKey(cell.date);
                        const isSelected = key === selectedValue;
                        const isToday = key === toDateKey(new Date());
                        const isDisabled = !clampDateKey(key, min, max);
                        const isFocused = key === focusedKey;

                        return (
                          <button
                            key={key}
                            ref={(element) => {
                              dayRefs.current[key] = element;
                            }}
                            type="button"
                            role="gridcell"
                            tabIndex={isFocused ? 0 : -1}
                            disabled={isDisabled}
                            aria-selected={isSelected}
                            aria-current={isToday ? "date" : undefined}
                            aria-label={formatDateAriaLabel(key)}
                            onClick={() => selectDay(key)}
                            onKeyDown={(event) => handleDayKeyDown(event, cell.date)}
                            onFocus={() => setFocusedKey(key)}
                            className={cn(
                              "inline-flex h-10 items-center justify-center rounded-sm text-sm transition",
                              cell.inCurrentMonth
                                ? "text-[color:var(--color-ink)]"
                                : "text-[color:var(--color-ink-subtle)]",
                              isSelected &&
                                "bg-[color:var(--color-interactive-selected)] font-semibold text-[color:var(--color-interactive-selected-ink)] hover:bg-[color:var(--color-interactive-selected)]",
                              !isSelected &&
                                !isDisabled &&
                                "hover:bg-[color:var(--color-interactive-hover)]",
                              isToday &&
                                !isSelected &&
                                "border border-[color:var(--color-interactive-soft)]",
                              isDisabled && "cursor-not-allowed opacity-35"
                            )}
                          >
                            {cell.date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </OverlaySurface>
          ) : null}
        </div>
      </div>
    </FormControlShell>
  );
}
