import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard Shadcn Tailwind class name merger
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Truncates text safely with ellipsis
 */
export function truncate(str: string, length: number = 30): string {
  if (!str) return "";
  return str.length > length ? str.slice(0, length) + "…" : str;
}
