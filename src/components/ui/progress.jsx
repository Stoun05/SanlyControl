import * as ProgressPrimitive from "@radix-ui/react-progress";
export function Progress({ value = 0, className = "" }) {
  return (
    <ProgressPrimitive.Root
      className={`h-2 overflow-hidden rounded-full bg-slate-100 ${className}`}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className="h-full rounded-full bg-teal transition-transform duration-500"
        style={{ transform: `translateX(-${100 - Math.min(100, value)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
