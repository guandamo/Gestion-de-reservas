import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"

import { cn } from "@/lib/utils"

/**
 * InputOTP — wrapper de `input-otp` con la paleta del proyecto
 * (cards `#222222`, inputs `#171717`, bordes `white/10`, foco `verde-claro`).
 *
 * Sin dependencia de `lucide-react` (el separador es un guion inline SVG).
 * Acepta un único `slot` con 6 dígitos vía `maxLength={6}`; el consumidor
 * decide la composición visual (grupos/separador).
 */
const InputOTP = React.forwardRef(({ className, containerClassName, ...props }, ref) => (
  <OTPInput
    ref={ref}
    containerClassName={cn(
      "flex items-center gap-2 has-[:disabled]:opacity-50",
      containerClassName
    )}
    className={cn("disabled:cursor-not-allowed", className)}
    {...props}
  />
))
InputOTP.displayName = "InputOTP"

const InputOTPGroup = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center", className)} {...props} />
))
InputOTPGroup.displayName = "InputOTPGroup"

const InputOTPSlot = React.forwardRef(({ index, className, ...props }, ref) => {
  const inputOTPContext = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  return (
    <div
      ref={ref}
      className={cn(
        // Caja visual coherente con los inputs del proyecto (#171717 sobre
        // fondo `#222222`, borde white/10, foco verde-claro).
        "relative flex h-11 w-10 sm:h-12 sm:w-12 items-center justify-center",
        "border-y border-r border-white/10 bg-[#171717]",
        "text-blanco text-lg sm:text-xl font-semibold text-center",
        "shadow-sm transition-all outline-none",
        "first:rounded-l-lg last:rounded-r-md",
        // Cerramos los bordes laterales al inicio/fin
        "first:border-l last:border-r",
        isActive && "z-10 ring-2 ring-verde-claro/60 border-verde-claro/60",
        className
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-blanco duration-1000" />
        </div>
      )}
    </div>
  )
})
InputOTPSlot.displayName = "InputOTPSlot"

/**
 * Separador entre grupos de casillas. Reemplaza el `Minus` de lucide-react
 * (que el proyecto no tiene) por un guion SVG del mismo tamaño que las cajas.
 */
const InputOTPSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    aria-orientation="horizontal"
    className={cn("flex items-center justify-center px-1 text-gray-400", className)}
    {...props}
  >
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path strokeLinecap="round" d="M5 12h14" />
    </svg>
  </div>
))
InputOTPSeparator.displayName = "InputOTPSeparator"

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
