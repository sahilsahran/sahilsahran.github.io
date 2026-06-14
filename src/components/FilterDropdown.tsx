import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-[8px] bg-[#2E353B] border border-[rgba(54,62,69,1)]",
          "px-[14px] py-[6px] font-sans text-[13px] text-[#D2DCE5] transition-all",
          "hover:bg-[rgba(196,238,240,0.04)]",
        )}
        style={{
          boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(196, 238, 240, 0.05)",
        }}
      >
        <span className="opacity-60">{label}:</span>
        <span className="font-semibold">{value}</span>
        <ChevronDown
          size={14}
          className={cn(
            "text-[rgba(210,220,229,0.4)] transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[160px] origin-top bg-[#2E353B] border border-[rgba(54,62,69,1)] rounded-[10px] overflow-hidden"
          style={{
            boxShadow: "0 16px 40px rgba(0,0,0,0.7), 0 4px 12px rgba(0,0,0,0.4)",
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
                    ? "text-[#C4EEF0] bg-[rgba(196,238,240,0.06)] font-medium"
                    : "text-[#D2DCE5] hover:bg-[rgba(196,238,240,0.06)]"
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
