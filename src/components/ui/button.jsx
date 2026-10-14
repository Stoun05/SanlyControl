import { forwardRef } from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const variants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-ink text-white shadow-sm hover:-translate-y-0.5 hover:bg-ink/92 hover:shadow-lg",
        accent:
          "bg-lime text-ink shadow-sm hover:-translate-y-0.5 hover:bg-lime/90 hover:shadow-lg",
        outline: "border border-line bg-white text-ink hover:bg-mist",
        ghost: "text-current hover:bg-black/5",
        danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
      },
      size: {
        default: "h-11",
        sm: "h-9 min-h-9 rounded-lg px-3 text-xs",
        lg: "h-14 min-h-14 rounded-2xl px-6 text-base",
        icon: "size-11 px-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export const Button = forwardRef(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(variants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
