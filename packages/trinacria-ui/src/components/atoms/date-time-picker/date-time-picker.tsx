import { useState } from "react";
import { cn } from "../../../utils/class-names.js";
import { DatePicker } from "../date-picker/date-picker.js";
import { formatDateLabel } from "../date-picker/date-picker.utils.js";
import { buildFormControlAria, useFormControlIds } from "../form-control/form-control.js";
import { TimePicker } from "../time-picker/time-picker.js";
import type { DateTimePickerProps } from "./date-time-picker.types.js";

function splitValue(value?: string | null): { date: string; time: string } {
  if (!value) {
    return { date: "", time: "" };
  }

  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

function composeValue(date: string, time: string): string {
  if (!date && !time) {
    return "";
  }
  if (!date) {
    return "";
  }
  return `${date}T${time || "00:00"}`;
}

function formatDateTimeLabel(value?: string | null): string | null {
  const parts = splitValue(value);
  const dateLabel = formatDateLabel(parts.date);
  if (!dateLabel) {
    return null;
  }

  if (!parts.time) {
    return dateLabel;
  }

  return `${dateLabel} alle ${parts.time}`;
}

export function DateTimePicker({
  className,
  dateLabel = "Data",
  defaultValue,
  disabled = false,
  error,
  hint,
  id,
  label,
  minuteStep,
  name,
  onValueChange,
  timeLabel = "Ora",
  value,
  ...props
}: DateTimePickerProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const currentValue = value ?? internalValue;
  const parts = splitValue(currentValue);
  const ids = useFormControlIds(id, name);
  const aria = buildFormControlAria({
    describedBy: props["aria-describedby"],
    error,
    errorId: ids.errorId,
    hint,
    hintId: ids.hintId
  });

  function update(date: string, time: string) {
    const nextValue = composeValue(date, time);
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  }

  return (
    <div
      {...props}
      className={cn("grid gap-2", className)}
      role="group"
      aria-labelledby={label ? ids.labelId : undefined}
      aria-describedby={aria.describedBy}
      aria-errormessage={aria.errorMessage}
      aria-invalid={error ? true : undefined}
    >
      {label ? (
        <span id={ids.labelId} className="text-sm font-medium text-(--color-ink)">
          {label}
        </span>
      ) : null}
      {name ? <input type="hidden" name={name} value={currentValue} disabled={disabled} /> : null}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <DatePicker
          id={`${ids.controlId}-date`}
          aria-label={dateLabel}
          aria-describedby={aria.describedBy}
          aria-invalid={error ? true : undefined}
          value={parts.date}
          onValueChange={(nextDate) => update(nextDate, parts.time)}
          disabled={disabled}
        />
        <TimePicker
          id={`${ids.controlId}-time`}
          aria-label={timeLabel}
          aria-describedby={aria.describedBy}
          aria-invalid={error ? true : undefined}
          value={parts.time}
          onValueChange={(nextTime) => update(parts.date, nextTime)}
          disabled={disabled}
          minuteStep={minuteStep}
        />
      </div>
      {currentValue ? (
        <span className="text-xs font-medium uppercase tracking-[0.12em] text-(--color-ink-subtle)">
          {formatDateTimeLabel(currentValue)}
        </span>
      ) : null}
      {error ? (
        <span id={ids.errorId} className="text-xs leading-5 text-(--color-danger-ink)">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span id={ids.hintId} className="text-xs leading-5 text-(--color-ink-subtle)">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
