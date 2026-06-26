import { useState } from "react";

export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange: ((value: T) => void) | undefined
) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const resolvedValue = isControlled ? value : internalValue;

  function setValue(nextValue: T) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  }

  return [resolvedValue, setValue] as const;
}
