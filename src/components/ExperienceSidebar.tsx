import { useState, useEffect } from "react";
import { X, Maximize2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Experience } from "@/data/experiences";

interface ExperienceSidebarProps {
  experience: Experience | null;
  onClose: () => void;
}

export function ExperienceSidebar({ experience, onClose }: ExperienceSidebarProps) {
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    if (experience && experience.files.length > 0) {
      setActiveTab(experience.files[0].name);
    } else {
      setActiveTab("");
    }
  }, [experience]);

  if (!experience) return null;

  return (
    <div
      className={cn(
        "absolute top-0 right-0 h-full w-full sm:w-[400px] z-20 bg-[#2E353B]",
        "border-l border-[rgba(54,62,69,0.8)] flex flex-col",
      )}
      style={{
        boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        animation: "sidebar-enter 350ms cubic-bezier(0.76, 0, 0.24, 1) forwards",
      }}
    >
      <style>{`
        @keyframes sidebar-enter {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Top Bar */}
      <div className="h-[52px] shrink-0 border-b border-[rgba(54,62,69,0.8)] flex items-center justify-between px-4">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[rgba(196,238,240,0.06)] text-[rgba(210,220,229,0.6)] hover:text-[#C4EEF0] transition-colors"
          aria-label="Close details"
        >
          <X size={16} />
        </button>

        <h3 className="font-sans text-[14px] font-semibold text-[#D2DCE5] truncate px-4 flex-1 text-center">
          {experience.title}
        </h3>

        <button
          className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-[rgba(196,238,240,0.06)] text-[rgba(210,220,229,0.6)] transition-colors"
          aria-label="Fullscreen"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* File Switcher (Tabs) */}
      {experience.files.length > 0 && (
        <div className="flex px-2 border-b border-[rgba(54,62,69,0.4)] shrink-0 overflow-x-auto no-scrollbar">
          {experience.files.map((file) => (
            <button
              key={file.name}
              onClick={() => setActiveTab(file.name)}
              className={cn(
                "px-[14px] py-[8px] font-sans text-[12px] whitespace-nowrap transition-colors",
                activeTab === file.name
                  ? "text-[#C4EEF0] border-b-2 border-[#C4EEF0] font-medium"
                  : "text-[rgba(210,220,229,0.4)] hover:text-[rgba(210,220,229,0.8)] border-b-2 border-transparent"
              )}
            >
              {file.name}
            </button>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-[24px] space-y-8">
        <div>
          <p className="font-sans text-[14px] leading-[1.7] text-[rgba(210,220,229,0.8)]">
            {experience.details}
          </p>
        </div>

        <div>
          <h4 className="font-sans text-[11px] uppercase tracking-wider text-[rgba(210,220,229,0.4)] mb-3">
            Skills used
          </h4>
          <div className="flex flex-wrap gap-2">
            {experience.skills.map((skill) => (
              <span
                key={skill}
                className="px-[8px] py-[4px] rounded-full bg-[rgba(54,62,69,0.8)] text-[rgba(210,220,229,0.6)] font-sans text-[10px] tracking-wider"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {experience.files.length > 0 && (
          <div>
            <h4 className="font-sans text-[11px] uppercase tracking-wider text-[rgba(210,220,229,0.4)] mb-3">
              Attached File
            </h4>
            <div className="bg-[#262C31] border border-[rgba(54,62,69,0.8)] rounded-[10px] p-[48px] flex flex-col items-center justify-center">
              <FileText size={32} className="text-[rgba(210,220,229,0.2)] mb-4" />
              <span className="font-mono text-[12px] text-[rgba(210,220,229,0.4)]">
                {activeTab}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
