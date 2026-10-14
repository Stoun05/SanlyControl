import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-line bg-white p-5 shadow-[0_1px_0_rgba(7,25,21,.03)]",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("mb-4 flex items-start justify-between gap-4", className)}
      {...props}
    />
  );
}
export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn("text-lg font-bold tracking-[-.025em]", className)}
      {...props}
    />
  );
}
export function CardDescription({ className, ...props }) {
  return (
    <p
      className={cn("mt-1 text-sm leading-6 text-muted", className)}
      {...props}
    />
  );
}
