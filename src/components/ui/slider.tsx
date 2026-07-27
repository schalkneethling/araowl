import {
  Slider as SliderPrimitive,
  SliderOutput as SliderOutputPrimitive,
  type SliderProps,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";

import { cn } from "@/lib/utils";

/**
 * Single-thumb slider on the shadcn aria pattern. Label and output are the
 * caller's responsibility (react-aria wires them via context: render a
 * `Label` and `SliderOutput` inside).
 */
function Slider({ className, children, ...props }: SliderProps) {
  return (
    <SliderPrimitive data-slot="slider" className={cn("grid w-full gap-2", className)} {...props}>
      {(renderProps) => (
        <>
          {typeof children === "function" ? children(renderProps) : children}
          <SliderTrack
            data-slot="slider-track"
            className="relative h-6 w-full data-[disabled]:opacity-50"
          >
            {({ state }) => (
              <>
                <span className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-muted" />
                <span
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
                  style={{ width: `${state.getThumbPercent(0) * 100}%` }}
                />
                <SliderThumb
                  data-slot="slider-thumb"
                  className="top-1/2 size-5 rounded-full border border-primary bg-background shadow outline-none data-dragging:bg-muted data-focus-visible:ring-3 data-focus-visible:ring-ring/50 data-[disabled]:cursor-not-allowed"
                />
              </>
            )}
          </SliderTrack>
        </>
      )}
    </SliderPrimitive>
  );
}

const SliderOutput = SliderOutputPrimitive;

export { Slider, SliderOutput };
