import { useMemo } from "react"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

/**
 * `Field` y compañía — adaptadas a la paleta del proyecto.
 *
 * Las versiones generadas por la CLI usan tokens `oklch()` de shadcn v4,
 * que no existen en esta configuración (Tailwind v3 con paleta custom).
 * Se mantienen las clases estructurales y los `data-slot` para que el
 * consumidor pueda estilar con Tailwind utilities; los colores cosméticos
 * se inyectan desde el consumidor (clases del modal o del campo).
 */

function FieldSet({ className, ...props }) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-4 sm:gap-6",
        "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className
      )}
      {...props}
    />
  )
}

function FieldLegend({ className, variant = "legend", ...props }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-2 sm:mb-3 font-medium text-blanco",
        "data-[variant=legend]:text-base",
        "data-[variant=label]:text-sm",
        className
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group flex w-full flex-col gap-4 sm:gap-7",
        "[&>[data-slot=field-group]]:gap-4",
        className
      )}
      {...props}
    />
  )
}

const fieldVariants = cva(
  "group/field flex w-full gap-3",
  {
    variants: {
      orientation: {
        vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
        horizontal: [
          "flex-row items-center",
          "[&>[data-slot=field-label]]:flex-auto",
          "has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px has-[>[data-slot=field-content]]:items-start",
        ],
        responsive: [
          "sm:flex-row sm:items-center sm:[&>*]:w-auto flex-col [&>*]:w-full [&>.sr-only]:w-auto",
          "sm:[&>[data-slot=field-label]]:flex-auto",
          "sm:has-[>[data-slot=field-content]]:items-start sm:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
        ],
      },
    },
    defaultVariants: { orientation: "vertical" },
  }
)

function Field({ className, orientation = "vertical", ...props }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }) {
  return (
    <div
      data-slot="field-content"
      className={cn(
        "group/field-content flex flex-1 flex-col gap-1.5 leading-snug",
        className
      )}
      {...props}
    />
  )
}

function FieldLabel({ className, ...props }) {
  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-snug text-blanco",
        "group-data-[disabled=true]/field:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }) {
  return (
    <div
      data-slot="field-title"
      className={cn(
        "flex w-fit items-center gap-2 text-sm font-medium leading-snug text-blanco",
        "group-data-[disabled=true]/field:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-gray-300 text-sm font-normal leading-normal",
        className
      )}
      {...props}
    />
  )
}

function FieldSeparator({ children, className, ...props }) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm",
        className
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="bg-[#222222] text-gray-300 relative mx-auto block w-fit px-2"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({ className, children, errors, ...props }) {
  const content = useMemo(() => {
    if (children) return children
    if (!errors) return null
    if (errors?.length === 1 && errors[0]?.message) return errors[0].message
    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {errors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>
        )}
      </ul>
    )
  }, [children, errors])

  if (!content) return null

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("text-red-300 text-sm font-normal", className)}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
