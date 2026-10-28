import { useState, useEffect, useRef } from "react";
import { X, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExperienceCard } from "./ExperienceCard";
import { toYouTubeEmbed, type Experience, type ExperienceFile } from "@/data/experiences";
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
  /** 1-based position of this experience in the filtered list, and the list length */
  position?: number;
  total?: number;
  /** False while the fullscreen viewer is up, so its own arrow keys don't also switch experiences */
  keyboardEnabled?: boolean;
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
  onOpenViewer,
  position,
  total,
  keyboardEnabled = true,
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
      fileType: activeFile.type,
      gallery: experience?.files,
      index: experience?.files.findIndex((f) => f.path === activeFile.path),
    }, rect);
  };

  // Left/right arrow keys cycle experiences while this panel is open
  useEffect(() => {
    if (animState !== 'open' || !keyboardEnabled) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      // Leave arrow keys alone for text fields and media controls (video seeking)
      if (target?.closest('input, textarea, select, video, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      else if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [animState, keyboardEnabled, hasPrev, hasNext, onPrev, onNext]);

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

        {/* Spacer that balances the close button so the title stays centered */}
        <div className="w-8 h-8" aria-hidden="true" />
      </div>

      {/* Experience Navigation */}
      {(onPrev || onNext) && (
        <div className="h-[40px] shrink-0 border-b border-[rgba(54,62,69,0.4)] flex items-center justify-between px-3">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="btn-icon h-7 gap-1 font-sans text-[11px] disabled:opacity-30 disabled:pointer-events-none"
            style={{ padding: "0 8px", borderRadius: "6px" }}
            aria-label="Previous experience"
          >
            <ChevronLeft size={14} />
            Previous
          </button>
          {position !== undefined && total !== undefined && (
            <span className="font-mono text-[11px] text-[rgba(210,220,229,0.4)]">
              {position} / {total}
            </span>
          )}
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="btn-icon h-7 gap-1 font-sans text-[11px] disabled:opacity-30 disabled:pointer-events-none"
            style={{ padding: "0 8px", borderRadius: "6px" }}
            aria-label="Next experience"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-[24px] space-y-8">
        <div className="space-y-5">
          {experience.details.split("\n\n").map((section, i) => {
            const [heading, ...body] = section.split("\n");
            const hasHeading = body.length > 0;
            return (
              <div key={i}>
                {hasHeading && (
                  <h4 className="font-sans text-[13px] font-medium text-[#d2dce5] mb-1">
                    {heading}
                  </h4>
                )}
                <p className="font-sans text-[14px] leading-[1.7] text-[rgba(210,220,229,0.8)]">
                  {hasHeading ? body.join(" ") : heading}
                </p>
              </div>
            );
          })}
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
          <div>
            <h4 className="font-sans text-[11px] uppercase tracking-wider text-[rgba(210,220,229,0.4)] mb-2">
              {experience.files.length > 1 ? "Attachments" : "Attachment"}
            </h4>

            {/* File Switcher (Tabs) */}
            {experience.files.length > 1 && (
              <div
                className="flex mb-3 border-b border-[rgba(54,62,69,0.6)] overflow-x-auto overflow-y-hidden"
                style={{ scrollbarWidth: "none" }}
              >
                {experience.files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setActiveFile(file)}
                    className={cn(
                      "px-[12px] py-[6px] font-sans text-[12px] whitespace-nowrap transition-colors",
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

            <div className="flex justify-end mb-2">
              <button
                className="btn-icon h-7 gap-1.5 font-sans text-[11px]"
                style={{ padding: "0 8px", borderRadius: "6px" }}
                aria-label="View attachment fullscreen"
                onClick={handleFullscreen}
              >
                <Maximize2 size={13} />
                Fullscreen
              </button>
            </div>

            <div ref={previewBoxRef}>
            {activeFile.type === "image" ? (
              <div className="bg-[#262C31] border border-[rgba(54,62,69,0.8)] rounded-[10px] p-[16px] flex items-center justify-center">
                <img
                  src={activeFile.path}
                  alt={activeFile.name}
                  className="max-h-[400px] w-full object-contain rounded-[8px]"
                />
              </div>
            ) : activeFile.type === "youtube" ? (
              <div className="bg-[#262C31] border border-[rgba(54,62,69,0.8)] rounded-[10px] p-[16px]">
                <iframe
                  key={activeFile.path}
                  src={toYouTubeEmbed(activeFile.path)}
                  title={activeFile.name}
                  className="w-full aspect-video border-none rounded-[8px]"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : activeFile.type === "video" ? (
              <div className="bg-[#262C31] border border-[rgba(54,62,69,0.8)] rounded-[10px] p-[16px] flex items-center justify-center">
                <video
                  key={activeFile.path}
                  src={activeFile.path}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[400px] w-full object-contain rounded-[8px]"
                />
              </div>
            ) : (
              <div className="bg-[#262C31] border border-[rgba(54,62,69,0.8)] rounded-[10px] p-[8px]">
                <iframe
                  key={activeFile.path}
                  src={`${activeFile.path}#view=FitH&toolbar=0`}
                  title={activeFile.name}
                  className="w-full h-[460px] border-none rounded-[6px] bg-white"
                />
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      </div>
      </div>
      </div>
    </div>
  );
}
