import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlipButton } from "@/components/ui/FlipButton";

interface FilterDropdownProps {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative z-[100]" ref={containerRef}>
      <FlipButton
        onClick={() => setIsOpen(!isOpen)}
        faceShadow='0 8px 16px -6px rgb(var(--c-shadow)/calc(0.55*var(--shadow))), 0 3px 6px -2px rgb(var(--c-shadow)/calc(0.35*var(--shadow))), 0 0 0 1px rgb(var(--c-accent)/0.05)'
        wrapperClassName="w-full"
        className={cn("btn-flip-secondary")}
        style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '8px', boxShadow: '0 1px 3px rgb(var(--c-shadow)/calc(0.1*var(--shadow)))' }}
      >
        <div className="flex items-center gap-2">
          <span className="opacity-60">{label}:</span>
          <span className="font-semibold">{value}</span>
          <ChevronDown
            size={14}
            className={cn(
              "text-[rgb(var(--c-text)/0.4)] transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </FlipButton>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[160px] origin-top bg-[rgb(var(--c-surface))] border border-[rgb(var(--c-border)/1)] rounded-[10px] overflow-hidden"
          style={{
            boxShadow: "0 2px 6px rgb(var(--c-shadow)/calc(0.18*var(--shadow)))",
            animation: "dropdown-enter 150ms ease-out forwards",
          }}
        >
          <style>{`
            @keyframes dropdown-enter {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
            }
          `}</style>
          <div className="py-1">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2 font-sans text-[13px] transition-colors",
                  value === opt
                    ? "text-[rgb(var(--c-accent))] bg-[rgb(var(--c-accent)/0.06)] font-medium"
                    : "text-[rgb(var(--c-text))] hover:bg-[rgb(var(--c-accent)/0.06)]"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
