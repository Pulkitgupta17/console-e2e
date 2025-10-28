import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: "bg-transparent border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        primary: "bg-[var(--input-primary-bg)] border-[var(--input-primary-border)] text-[var(--input-primary-text)] placeholder:text-[var(--input-primary-placeholder)] focus-visible:border-[var(--input-primary-focus-border)] focus-visible:ring-[var(--input-primary-focus-shadow)] focus-visible:ring-[3px]",
        dark: "bg-[var(--input-dark-bg)] border-[var(--input-dark-border)] text-[var(--input-dark-text)] placeholder:text-[var(--input-dark-placeholder)] focus-visible:border-[var(--input-dark-focus-border)] focus-visible:ring-[var(--input-dark-focus-shadow)] focus-visible:ring-[3px]",
        light: "bg-[var(--input-light-bg)] border-[var(--input-light-border)] text-[var(--input-light-text)] placeholder:text-[var(--input-light-placeholder)] focus-visible:border-[var(--input-light-focus-border)] focus-visible:ring-[var(--input-light-focus-shadow)] focus-visible:ring-[3px]",
      },
      size: {
        default: "h-9",
        lg: "h-12",
        xl: "h-14",
        otp: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.ComponentProps<"input">, "size">,
    VariantProps<typeof inputVariants> {}

function Input({ className, type, variant, size, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputVariants({ variant, size }),
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
