import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FlipButton } from "@/components/ui/FlipButton";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  values: string[];
  onChange: (vals: string[]) => void;
}

export function MultiSelectDropdown({ label, options, values, onChange }: MultiSelectDropdownProps) {
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

  const toggleOption = (opt: string) => {
    if (values.includes(opt)) {
      onChange(values.filter((v) => v !== opt));
    } else {
      onChange([...values, opt]);
    }
  };

  const displayValue = (() => {
    if (values.length === 0 || values.length === options.length) return "All";
    if (values.length === 1) return values[0];
    return `${values.length} Skills`;
  })();

  return (
    <div className="relative z-[100]" ref={containerRef}>
      <FlipButton
        onClick={() => setIsOpen(!isOpen)}
        faceShadow="0 8px 16px -6px rgba(0,0,0,0.55), 0 3px 6px -2px rgba(0,0,0,0.35), 0 0 0 1px rgba(196,238,240,0.05)"
        wrapperClassName="w-full"
        className={cn(
          "btn-flip-secondary",
          values.length > 0 && values.length < options.length && "ring-1 ring-[rgba(196,238,240,0.25)]"
        )}
        style={{ padding: "6px 14px", fontSize: "13px", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
      >
        <div className="flex items-center gap-2">
          <span className="opacity-60">{label}:</span>
          <span className="font-semibold">{displayValue}</span>
          <ChevronDown
            size={14}
            className={cn(
              "text-[rgba(210,220,229,0.4)] transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </div>
      </FlipButton>

      {isOpen && (
        <div
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 min-w-[180px] max-h-[calc(100dvh-80px)] overflow-y-auto minimal-scrollbar origin-top bg-[#2E353B] border border-[rgba(54,62,69,1)] rounded-[10px]"
          style={{
            boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
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
            {/* "All" option — clears all filters */}
            <button
              onClick={() => onChange([])}
              className={cn(
                "w-full text-left px-4 py-2 font-sans text-[13px] transition-colors flex items-center gap-2",
                values.length === 0
                  ? "text-[#C4EEF0] bg-[rgba(196,238,240,0.06)] font-medium"
                  : "text-[#D2DCE5] hover:bg-[rgba(196,238,240,0.06)]"
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors",
                  values.length === 0
                    ? "bg-[#C4EEF0] border-[#C4EEF0]"
                    : "border-[rgba(54,62,69,1)] bg-transparent"
                )}
              >
                {values.length === 0 && <Check size={11} className="text-[#262C31] stroke-[3]" />}
              </span>
              All
            </button>
            <div className="mx-3 my-1 border-t border-[rgba(54,62,69,0.6)]" />
            {options.map((opt) => {
              const isSelected = values.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => toggleOption(opt)}
                  className={cn(
                    "w-full text-left px-4 py-2 font-sans text-[13px] transition-colors flex items-center gap-2",
                    isSelected
                      ? "text-[#C4EEF0] bg-[rgba(196,238,240,0.06)] font-medium"
                      : "text-[#D2DCE5] hover:bg-[rgba(196,238,240,0.06)]"
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors",
                      isSelected
                        ? "bg-[#C4EEF0] border-[#C4EEF0]"
                        : "border-[rgba(54,62,69,1)] bg-transparent"
                    )}
                  >
                    {isSelected && <Check size={11} className="text-[#262C31] stroke-[3]" />}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
