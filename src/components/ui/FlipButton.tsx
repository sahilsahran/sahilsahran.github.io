import React, { useState } from "react";
import { cn } from "@/lib/utils";

export interface FlipButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  wrapperClassName?: string;
  frontClassName?: string;
  backClassName?: string;
  /** Shadow on both faces; defaults to the landing-page shadow */
  faceShadow?: string;
}

export const FlipButton = React.forwardRef<HTMLButtonElement, FlipButtonProps>(
  ({ children, className, wrapperClassName, frontClassName, backClassName, faceShadow, style, ...props }, ref) => {
    const [flipped, setFlipped] = useState(false);

    return (
      <div
        className={cn("flip-wrapper relative inline-flex", wrapperClassName)}
        style={{ perspective: '1000px' }}
        onMouseEnter={() => setFlipped(true)}
        onMouseLeave={() => setFlipped(false)}
      >
        <button
          ref={ref}
          className={cn(
            "flip-inner relative w-full h-full preserve-3d cursor-pointer",
            "transition-transform duration-250 ease-in-out",
            className
          )}
          style={{
            ...style,
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateX(-180deg)' : 'rotateX(0deg)',
          }}
          {...props}
        >
          {/* Invisible spacer to dictate the physical size of the button */}
          <span className="invisible flex items-center justify-center pointer-events-none gap-2">
            {children}
          </span>

          {/* Front Face */}
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2 rounded-[inherit] pointer-events-none",
              frontClassName
            )}
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              boxShadow: faceShadow ?? '0 12px 24px -8px rgb(var(--c-shadow)/calc(0.6*var(--shadow))), 0 4px 8px -2px rgb(var(--c-shadow)/calc(0.4*var(--shadow))), 0 0 0 1px rgb(var(--c-accent)/0.05)'
            }}
          >
            {children}
          </span>

          {/* Back Face */}
          <span
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2 rounded-[inherit] pointer-events-none",
              backClassName || frontClassName,
              !backClassName && (className?.includes("icon") ? "btn-flip-icon-back" : "btn-flip-back")
            )}
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateX(180deg)',
              boxShadow: faceShadow ?? '0 12px 24px -8px rgb(var(--c-shadow)/calc(0.6*var(--shadow))), 0 4px 8px -2px rgb(var(--c-shadow)/calc(0.4*var(--shadow))), 0 0 0 1px rgb(var(--c-accent)/0.05)'
            }}
          >
            {children}
          </span>
        </button>
      </div>
    );
  }
);

FlipButton.displayName = "FlipButton";
