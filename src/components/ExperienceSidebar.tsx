import { useState, useEffect, useRef } from "react";
import { X, Maximize2, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExperienceCard } from "./ExperienceCard";
import type { Experience, ExperienceFile } from "@/data/experiences";
import type { SidebarAnimState } from "./ExperiencesPanel";

interface ExperienceSidebarProps {
  experience: Experience | null;
  animState: SidebarAnimState;
  startRect: DOMRect | null;
  onClose: () => void;
  scaledRect?: DOMRect | null;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  isListScaledDown?: boolean;
  zIndex?: number;
  onOpenViewer?: (viewerData: any, startRect: DOMRect) => void;
}

export function ExperienceSidebar({ 
  experience, 
  animState, 
  startRect, 
  scaledRect,
  isListScaledDown,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  zIndex = 50,
  onOpenViewer
}: ExperienceSidebarProps) {
  const [activeFile, setActiveFile] = useState<ExperienceFile | null>(null);
  const previewBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (experience?.files.length) {
      setActiveFile(experience.files[0]);
    }
  }, [experience]);

  const handleFullscreen = () => {
    if (!activeFile || !previewBoxRef.current || !onOpenViewer) return;
    const rect = previewBoxRef.current.getBoundingClientRect();
    onOpenViewer({
      type: 'custom',
      title: activeFile.name,
      fileUrl: activeFile.path,
      fileType: activeFile.type
    }, rect);
  };

  if (!experience) return null;

  const getContainerStyles = (): React.CSSProperties => {
    const cw = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const ch = typeof window !== 'undefined' ? window.innerHeight : 1000;

    const rectWidth = startRect ? startRect.width : 300;
    const rectHeight = startRect ? startRect.height : 400;

    const finalRect = scaledRect || startRect;

    const sidebarWidth = rectWidth;
    const targetX = cw / 2 - sidebarWidth / 2;
    const targetY = 0;

    const hiddenX = finalRect ? finalRect.left + finalRect.width / 2 - cw / 2 : 0;
    const hiddenY = finalRect ? finalRect.top + finalRect.height / 2 - ch / 2 : 0;
    const targetScale = finalRect && startRect ? (finalRect.width / startRect.width) : 1;

    const isAnimating = animState === 'flight_in' || animState === 'expanding' || animState === 'collapsing' || animState === 'flight_out';
    const baseStyle: React.CSSProperties = {
      position: "fixed",
      top: "50%",
      left: "50%",
      zIndex: zIndex,
      transformStyle: "preserve-3d",
      pointerEvents: animState === "hidden" ? "none" : "auto",
      willChange: isAnimating ? "transform, width, height" : "auto",
    };

    const targetHeight = ch;

    switch (animState) {
      case "hidden":
        return {
          ...baseStyle,
          width: rectWidth,
          height: rectHeight,
          transform: `translate3d(${hiddenX}px, ${hiddenY}px, 0) translate(-50%, -50%) rotateX(0deg) scale(${targetScale})`,
          borderRadius: "12px",
          transition: "opacity 100ms ease-out",
          opacity: 0,
          boxShadow: "0 0 0 rgba(0,0,0,0)",
        };
      case "flight_in":
        return {
          ...baseStyle,
          width: sidebarWidth,
          height: rectHeight,
          transform: `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) rotateX(180deg) scale(1)`,
          borderRadius: "12px",
          transition: "all 600ms cubic-bezier(0.25, 1, 0.5, 1), opacity 0ms",
          opacity: 1,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        };
      case "pausing":
        return {
          ...baseStyle,
          width: sidebarWidth,
          height: rectHeight,
          transform: `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) rotateX(180deg) scale(1)`,
          borderRadius: "12px",
          transition: "none",
          opacity: 1,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        };
      case "expanding":
        return {
          ...baseStyle,
          width: sidebarWidth,
          height: targetHeight,
          transform: `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) rotateX(180deg) scale(1)`,
          borderRadius: "12px",
          transition: "all 400ms cubic-bezier(0.76, 0, 0.24, 1), opacity 0ms",
          opacity: 1,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        };
      case "open":
      case "fading_out":
        return {
          ...baseStyle,
          width: sidebarWidth,
          height: targetHeight,
          transform: `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) rotateX(180deg) scale(1)`,
          borderRadius: "12px",
          transition: "none",
          opacity: 1,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        };
      case "collapsing":
        return {
          ...baseStyle,
          width: sidebarWidth,
          height: rectHeight,
          transform: `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%) rotateX(180deg) scale(1)`,
          borderRadius: "12px",
          transition: "all 400ms cubic-bezier(0.76, 0, 0.24, 1), opacity 0ms",
          opacity: 1,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        };
      case "flight_out":
        return {
          ...baseStyle,
          width: rectWidth,
          height: rectHeight,
          transform: `translate3d(${hiddenX}px, ${hiddenY}px, 0) translate(-50%, -50%) rotateX(0deg) scale(${targetScale})`,
          borderRadius: "12px",
          transition: "all 600ms cubic-bezier(0.25, 1, 0.5, 1), opacity 0ms",
          opacity: 1,
          boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
        };
    }
  };

  return (
    <div style={getContainerStyles()}>
      {/* Front Face */}
      <div 
        className="absolute inset-0 bg-[#2E353B] rounded-[12px]"
        style={{ 
          transform: 'rotateX(0deg) translateZ(1px)',
        }}
      >
        <ExperienceCard experience={experience} isFrontFace />
        
        {/* Darkening Overlay for Parallax Match During Swaps */}
        <div 
          className="absolute inset-0 bg-[#262c31] rounded-[12px] pointer-events-none transition-opacity duration-[600ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
          style={{ opacity: (animState === 'flight_out' && isListScaledDown) ? 0.5 : 0 }}
        />
      </div>

      {/* Back Face (Sidebar Content) */}
      <div
        className="absolute inset-0"
        style={{ 
          transform: 'rotateX(180deg) translateZ(1px)',
        }}
      >
        <div 
          className="absolute inset-0 bg-[#2E353B] flex flex-col border-l border-[rgba(54,62,69,0.8)] overflow-hidden rounded-[12px]"
        >
        <div 
          className="flex flex-col h-full w-full transition-opacity duration-200"
          style={{ opacity: animState === "open" ? 1 : 0 }}
        >
          {/* Top Bar */}
      <div className="h-[52px] shrink-0 border-b border-[rgba(54,62,69,0.8)] flex items-center justify-between px-4">
        <button
          onClick={onClose}
          className="btn-icon w-8 h-8 hover:text-[#C4EEF0]"
          aria-label="Close details"
        >
          <X size={16} />
        </button>

        <h3 className="font-sans text-[14px] font-semibold text-[#D2DCE5] truncate px-4 flex-1 text-center">
          {experience.title}
        </h3>

        {activeFile && (
          <button
            className="btn-icon w-8 h-8 hover:text-[#C4EEF0]"
            aria-label="Fullscreen"
            onClick={handleFullscreen}
          >
            <Maximize2 size={16} />
          </button>
        )}
      </div>

      {/* File Switcher (Tabs) */}
      {experience.files.length > 0 && (
        <div className="flex px-2 border-b border-[rgba(54,62,69,0.4)] shrink-0 overflow-x-auto no-scrollbar">
          {experience.files.map((file) => (
            <button
              key={file.path}
              onClick={() => setActiveFile(file)}
              className={cn(
                "px-[14px] py-[8px] font-sans text-[12px] whitespace-nowrap transition-colors",
                activeFile?.path === file.path
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

        {experience.files.length > 0 && activeFile && (
          <div ref={previewBoxRef}>
            <h4 className="font-sans text-[11px] uppercase tracking-wider text-[rgba(210,220,229,0.4)] mb-3">
              Attached File
            </h4>
            {activeFile.type === "image" ? (
              <div className="bg-[#262C31] border border-[rgba(54,62,69,0.8)] rounded-[10px] p-[16px] flex items-center justify-center">
                <img
                  src={activeFile.path}
                  alt={activeFile.name}
                  className="max-h-[400px] w-full object-contain rounded-[8px]"
                />
              </div>
            ) : (
              <div className="bg-[#262C31] border border-[rgba(54,62,69,0.8)] rounded-[10px] p-[48px] flex flex-col items-center justify-center">
                <FileText size={32} className="text-[rgba(210,220,229,0.2)] mb-4" />
                <span className="font-mono text-[12px] text-[rgba(210,220,229,0.4)]">
                  {activeFile.name}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between px-[24px] py-[16px] border-t border-[rgba(54,62,69,0.4)] shrink-0">
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          className="btn-icon w-10 h-10 rounded-full bg-[rgba(54,62,69,0.4)] text-[#D2DCE5] disabled:opacity-30 disabled:hover:bg-[rgba(54,62,69,0.4)] hover:text-[#C4EEF0]"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={onNext}
          disabled={!hasNext}
          className="btn-icon w-10 h-10 rounded-full bg-[rgba(54,62,69,0.4)] text-[#D2DCE5] disabled:opacity-30 disabled:hover:bg-[rgba(54,62,69,0.4)] hover:text-[#C4EEF0]"
        >
          <ChevronRight size={20} />
        </button>
      </div>
      </div>
      </div>
      </div>
    </div>
  );
}
