import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Helper de clases de shadcn/ui.
 *
 * `clsx` resuelve condicionales (strings, arrays, objetos) y `twMerge` hace
 * que la última clase de Tailwind en conflicto gane (útil para sobrescribir
 * estilos de un componente base sin depender de `!important`).
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}