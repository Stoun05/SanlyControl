import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export function DialogContent({ className, children, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/55 backdrop-blur-md" />
      <DialogPrimitive.Content asChild {...props}>
        <motion.section
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(620px,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-3xl border border-line bg-white p-6 shadow-2xl",
            className,
          )}
        >
          {children}
          <DialogPrimitive.Close
            className="absolute right-5 top-5 grid size-9 place-items-center rounded-xl border border-line bg-white hover:bg-mist"
            aria-label="Ýap"
          >
            <X size={17} />
          </DialogPrimitive.Close>
        </motion.section>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export function DialogTitle(props) {
  return (
    <DialogPrimitive.Title
      className="text-2xl font-bold tracking-[-.04em]"
      {...props}
    />
  );
}
export function DialogDescription(props) {
  return (
    <DialogPrimitive.Description
      className="mt-2 text-sm leading-6 text-muted"
      {...props}
    />
  );
}
