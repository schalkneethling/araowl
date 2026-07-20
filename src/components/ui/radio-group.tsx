import {
  composeRenderProps,
  RadioGroup as RadioGroupPrimitive,
  Radio as RadioPrimitive,
  type RadioGroupProps,
  type RadioProps,
} from "react-aria-components";

import { cn } from "@/lib/utils";

function RadioGroup({ className, ...props }: RadioGroupProps) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("grid w-full gap-2", className)}
      {...props}
    />
  );
}

function RadioGroupItem({ className, children, ...props }: RadioProps) {
  return (
    <RadioPrimitive
      data-slot="radio-group-item"
      className={cn(
        "group/radio-group-item peer flex items-start gap-3 rounded-md p-2 outline-none data-focus-visible:ring-3 data-focus-visible:ring-ring/50 data-hovered:bg-muted/50 data-invalid:ring-3 data-invalid:ring-destructive/20 data-selected:bg-muted/30 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 dark:data-invalid:ring-destructive/40",
        className,
      )}
      {...props}
    >
      {composeRenderProps(children, (children, { isSelected }) => (
        <>
          <span
            data-slot="radio-group-indicator"
            className="relative mt-1 flex aspect-square size-4 shrink-0 items-center justify-center rounded-full border border-input group-data-focus-visible/radio-group-item:border-ring group-data-invalid/radio-group-item:border-destructive group-data-selected/radio-group-item:border-primary group-data-selected/radio-group-item:bg-primary dark:bg-input/30 dark:group-data-selected/radio-group-item:bg-primary"
          >
            {isSelected && (
              <span className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground" />
            )}
          </span>
          <span className="flex-1">{children}</span>
        </>
      ))}
    </RadioPrimitive>
  );
}

export { RadioGroup, RadioGroupItem };
