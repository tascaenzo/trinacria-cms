/** Enabled actions are the only stops in a menu's arrow-key navigation. */
function getEnabledMenuItems(menu: HTMLElement | null) {
  return Array.from(
    menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? []
  );
}

export function focusMenuItem(menu: HTMLElement | null, index: number) {
  const items = getEnabledMenuItems(menu);
  if (!items.length) return;
  items[((index % items.length) + items.length) % items.length]?.focus();
}

export function navigateMenu(
  menu: HTMLElement | null,
  event: { key: string; preventDefault: () => void }
) {
  const items = getEnabledMenuItems(menu);
  if (!items.length) return;
  const currentIndex = items.findIndex((item) => item === document.activeElement);
  let nextIndex: number;
  switch (event.key) {
    case "ArrowDown":
      nextIndex = (currentIndex + 1) % items.length;
      break;
    case "ArrowUp":
      nextIndex = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = items.length - 1;
      break;
    default:
      return;
  }
  event.preventDefault();
  items[nextIndex]?.focus();
}
