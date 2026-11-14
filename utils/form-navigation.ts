/**
 * Industrial Enter-Key Form Navigation Utility (Enter-as-Tab)
 *
 * Designed for high-density clinical EMR, reception triage, and pharmacy POS terminals.
 * Pressing Enter on an input field advances focus to the next logical interactive field,
 * auto-selecting its text for instant overwriting, while preserving textarea multiline behavior,
 * skipping disabled/hidden elements, and triggering submit on action buttons.
 */

export interface FormNavigationOptions {
  selector?: string;
  container?: HTMLElement | null;
  autoSelect?: boolean;
  onComplete?: () => void;
  filterElement?: (el: HTMLElement) => boolean;
}

const DEFAULT_FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled]):not([readonly]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([readonly]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  'button[type="submit"]:not([disabled])',
  'button[data-enter-submit="true"]:not([disabled])',
].join(", ");

function isElementVisible(el: HTMLElement): boolean {
  if (!el || (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0)) {
    return false;
  }
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  if (el.getAttribute("data-ignore-enter-nav") === "true") {
    return false;
  }
  return true;
}

export function handleEnterNavigation(
  event: React.KeyboardEvent | KeyboardEvent,
  options: FormNavigationOptions = {}
): boolean {
  if (event.key !== "Enter") return false;

  const target = event.target as HTMLElement;
  if (!target) return false;

  // Let Shift+Enter or Enter inside textareas operate normally unless marked
  if (target.tagName.toLowerCase() === "textarea" && !event.ctrlKey) {
    if (target.getAttribute("data-enter-next") !== "true") {
      return false;
    }
  }

  // Prevent default form submit on Enter
  event.preventDefault();

  const container =
    options.container ||
    (target.closest("form") as HTMLElement) ||
    (target.closest("[data-form-container]") as HTMLElement) ||
    document.body;

  const selector = options.selector || DEFAULT_FOCUSABLE_SELECTOR;
  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => isElementVisible(el) && (!options.filterElement || options.filterElement(el))
  );

  const currentIndex = elements.indexOf(target);
  if (currentIndex === -1) return false;

  const nextIndex = currentIndex + 1;

  if (nextIndex < elements.length) {
    const nextEl = elements[nextIndex];
    nextEl.focus();

    if (
      options.autoSelect !== false &&
      (nextEl instanceof HTMLInputElement || nextEl instanceof HTMLTextAreaElement)
    ) {
      if (typeof nextEl.select === "function") {
        nextEl.select();
      }
    }
    return true;
  } else {
    // Last element reached
    if (options.onComplete) {
      options.onComplete();
    } else if (target instanceof HTMLButtonElement && target.type === "submit") {
      target.click();
    }
    return true;
  }
}

export const handleEnterKeyNavigation = handleEnterNavigation;

