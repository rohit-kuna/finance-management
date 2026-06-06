"use client";

import { forwardRef, useRef } from "react";
import { CalendarDays } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MonthInputProps = InputProps;

export const MonthInput = forwardRef<HTMLInputElement, MonthInputProps>(
  ({ className, ...props }, ref) => {
    const innerRef = useRef<HTMLInputElement>(null);

    return (
      <div className="relative">
        <Input
          ref={(node) => {
            innerRef.current = node;

            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          type="month"
          className={cn("h-10 pr-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => innerRef.current?.showPicker?.()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open month picker"
          title="Open month picker"
        >
          <CalendarDays className="size-4" />
        </button>
      </div>
    );
  }
);

MonthInput.displayName = "MonthInput";
