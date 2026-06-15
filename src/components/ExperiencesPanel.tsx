import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { FilterDropdown } from "./FilterDropdown";
import { ExperienceSidebar } from "./ExperienceSidebar";
import { EXPERIENCES, type Experience } from "@/data/experiences";
import { cn } from "@/lib/utils";
import { IDCard } from "./IDCard";
import type { AnimState } from "../App";

interface ExperiencesPanelProps {
  onClose: () => void;
  cardRect: DOMRect | null;
  animState: AnimState;
}

export function ExperiencesPanel({ onClose, cardRect, animState }: ExperiencesPanelProps) {
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [skillFilter, setSkillFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const listRef = useRef<HTMLDivElement>(null);

  const SKILLS = ["All", "React", "TypeScript", "Python", "Machine Learning", "Node.js", "Design"];
  const TYPES = ["All", "Work", "Project", "Research"];

  const filteredExperiences = EXPERIENCES.filter((exp) => {
    if (skillFilter !== "All" && !exp.skills.includes(skillFilter)) return false;
    if (typeFilter !== "All" && exp.type !== typeFilter) return false;
    return true;
  });

  const handlePanelWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0 && listRef.current?.scrollTop === 0) {
      onClose();
    }
  };

  const handleListWheel = (e: React.WheelEvent) => {
    if (listRef.current) {
      if (!(e.deltaY < 0 && listRef.current.scrollTop === 0)) {
        e.stopPropagation();
      }
    }
  };

  useEffect(() => {
    if (animState === 'hidden') {
      setSelectedExperience(null);
      setSkillFilter("All");
      setTypeFilter("All");
      if (listRef.current) listRef.current.scrollTop = 0;
    }
  }, [animState]);

  const getContainerStyles = (): React.CSSProperties => {
    const rectTop = cardRect ? cardRect.top : 0;
    const rectLeft = cardRect ? cardRect.left : 0;
    const rectWidth = cardRect ? cardRect.width : 340;
    const rectHeight = cardRect ? cardRect.height : 476;

    const cw = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const ch = typeof window !== 'undefined' ? window.innerHeight : 1000;

    const baseStyle: React.CSSProperties = {
      position: "fixed",
      top: "50%",
      left: "50%",
      zIndex: 50,
      transformStyle: "preserve-3d",
      pointerEvents: animState === "hidden" ? "none" : "auto",
    };

    // Calculate the distance from the screen center to the card's original center
    const hiddenX = rectLeft + rectWidth / 2 - cw / 2;
    const hiddenY = rectTop + rectHeight / 2 - ch / 2;

    switch (animState) {
      case "hidden":
        return {
          ...baseStyle,
          width: rectWidth,
          height: rectHeight,
          transform: `translate3d(${hiddenX}px, ${hiddenY}px, 0) translate(-50%, -50%) rotateY(0deg) scale(1)`,
          borderRadius: "16px",
          transition: "none",
          opacity: 0,
          boxShadow: "0 0 0 rgba(0,0,0,0)",
        };
      case "flipping_in":
        return {
          ...baseStyle,
          width: rectWidth,
          height: rectHeight,
          transform: `translate3d(0px, 0px, 0) translate(-50%, -50%) rotateY(180deg) scale(1.2)`,
          borderRadius: "16px",
          transition: "all 800ms cubic-bezier(0.25, 1, 0.5, 1), opacity 0ms",
          opacity: 1,
          boxShadow: "0 60px 120px -20px rgba(0,0,0,0.9), 0 20px 40px rgba(0,0,0,0.6)",
        };
      case "expanding":
      case "open":
        return {
          ...baseStyle,
          width: "100%",
          height: "100%",
          transform: `translate3d(0px, 0px, 0) translate(-50%, -50%) rotateY(180deg) scale(1)`,
          borderRadius: "0px",
          transition: "all 400ms cubic-bezier(0.76, 0, 0.24, 1), opacity 0ms",
          opacity: 1,
          boxShadow: "none",
        };
      case "collapsing":
        return {
          ...baseStyle,
          width: rectWidth,
          height: rectHeight,
          transform: `translate3d(0px, 0px, 0) translate(-50%, -50%) rotateY(180deg) scale(1.2)`,
          borderRadius: "16px",
          transition: "all 400ms cubic-bezier(0.76, 0, 0.24, 1), opacity 0ms",
          opacity: 1,
          boxShadow: "0 60px 120px -20px rgba(0,0,0,0.9), 0 20px 40px rgba(0,0,0,0.6)",
        };
      case "flipping_out":
        return {
          ...baseStyle,
          width: rectWidth,
          height: rectHeight,
          transform: `translate3d(${hiddenX}px, ${hiddenY}px, 0) translate(-50%, -50%) rotateY(0deg) scale(1)`,
          borderRadius: "16px",
          transition: "all 800ms cubic-bezier(0.5, 0, 0.2, 1), opacity 0ms",
          opacity: 1,
          boxShadow: "0 0 0 rgba(0,0,0,0)",
        };
    }
  };

  const showContents = animState === 'open';

  return (
    <div style={getContainerStyles()}>
      {/* FRONT FACE (Static ID Card Clone) */}
      <div 
        className="absolute inset-0 backface-hidden rounded-[16px]"
        style={{ transform: 'rotateY(0deg)' }}
      >
        <IDCard interactive={false} />
      </div>

      {/* BACK FACE (Experiences Panel) */}
      <div 
        className="absolute inset-0 backface-hidden bg-[#262C31] overflow-hidden"
        style={{ 
          transform: 'rotateY(180deg)',
          borderRadius: animState === 'expanding' || animState === 'open' ? '0' : '16px',
          transition: "border-radius 400ms cubic-bezier(0.76, 0, 0.24, 1)"
        }}
        onWheel={handlePanelWheel}
      >
        {/* Top Bar */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-[60px] z-10 flex items-center px-6",
            "bg-[rgba(38,44,49,0.95)] backdrop-blur-[12px] border-b border-[rgba(54,62,69,0.8)]",
            "transition-opacity duration-300"
          )}
          style={{ opacity: showContents ? 1 : 0, pointerEvents: showContents ? "auto" : "none" }}
        >
          <div className="flex-1">
            <h2 className="font-sans text-[18px] font-bold text-[#D2DCE5]">Experiences</h2>
          </div>

          <div className="flex items-center gap-4">
            <FilterDropdown
              label="Skill"
              options={SKILLS}
              value={skillFilter}
              onChange={setSkillFilter}
            />
            <FilterDropdown
              label="Type"
              options={TYPES}
              value={typeFilter}
              onChange={setTypeFilter}
            />

            <div className="w-[1px] h-6 bg-[rgba(54,62,69,0.8)] mx-2" />

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[rgba(196,238,240,0.05)] hover:bg-[rgba(196,238,240,0.1)] flex items-center justify-center text-[#D2DCE5] transition-colors border border-[rgba(196,238,240,0.1)]"
              aria-label="Return to landing"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scroll Up Hint */}
        <div
          className="absolute top-[60px] left-0 right-0 py-2 flex justify-center pointer-events-none z-10 transition-opacity duration-300"
          style={{ opacity: showContents ? 1 : 0 }}
        >
          <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-[rgba(210,220,229,0.2)]">
            Scroll up to return
          </span>
        </div>

        {/* Main Content Area */}
        <div
          className="absolute top-[60px] left-0 right-0 bottom-0 flex overflow-hidden transition-opacity duration-300"
          style={{ opacity: showContents ? 1 : 0, pointerEvents: showContents ? "auto" : "none" }}
        >
          {/* List Column */}
          <div
            className="h-full relative transition-[width] duration-350 ease-[cubic-bezier(0.76,0,0.24,1)]"
            style={{ width: selectedExperience ? "calc(100% - 400px)" : "100%" }}
          >
            <div
              ref={listRef}
              className="absolute inset-0 overflow-y-auto p-6 md:p-12 pb-24"
              onWheel={handleListWheel}
            >
              <div className="max-w-[800px] mx-auto">
                {filteredExperiences.map((exp, index) => {
                  const isSelected = selectedExperience?.id === exp.id;
                  
                  // Type badge styling
                  let badgeStyle = {};
                  if (exp.type === "Work") badgeStyle = { background: "rgba(196, 238, 240, 0.12)", color: "#C4EEF0" };
                  else if (exp.type === "Project") badgeStyle = { background: "rgba(164, 198, 211, 0.12)", color: "#A4C6D3" };
                  else if (exp.type === "Research") badgeStyle = { background: "rgba(75, 99, 118, 0.2)", color: "#A4C6D3" };

                  return (
                    <div
                      key={exp.id}
                      onClick={() => setSelectedExperience(exp)}
                      className={cn(
                        "rounded-[12px] p-[20px] sm:p-[24px] mb-[12px] cursor-pointer transition-all duration-200 border",
                        isSelected
                          ? "bg-[rgba(196,238,240,0.04)] border-[rgba(196,238,240,0.4)]"
                          : "bg-[#2E353B] border-[rgba(54,62,69,0.8)] hover:border-[rgba(196,238,240,0.2)] hover:-translate-y-[2px]"
                      )}
                      style={{
                        boxShadow: isSelected ? "0 8px 24px rgba(0,0,0,0.5)" : "0 2px 8px rgba(0,0,0,0.3)",
                        animation: showContents ? `card-enter 300ms ease-out ${index * 60}ms both` : "none",
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span
                          className="px-[8px] py-[2px] rounded-full font-sans text-[10px] font-semibold tracking-[0.08em] uppercase"
                          style={badgeStyle}
                        >
                          {exp.type}
                        </span>
                        <span className="font-mono text-[11px] text-[rgba(210,220,229,0.35)]">
                          {exp.date}
                        </span>
                      </div>

                      <h3 className="font-sans text-[16px] font-bold text-[#D2DCE5] mb-1">
                        {exp.title}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                        <span className="font-sans text-[13px] text-[rgba(210,220,229,0.6)]">
                          {exp.company}
                        </span>
                        <div className="flex gap-1.5 flex-wrap">
                          {exp.skills.slice(0, 3).map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 rounded-full bg-[rgba(54,62,69,0.8)] text-[rgba(210,220,229,0.5)] font-sans text-[9px] font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="font-sans text-[13px] text-[rgba(210,220,229,0.6)] mt-[6px]">
                        {exp.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          {selectedExperience && (
            <ExperienceSidebar
              experience={selectedExperience}
              onClose={() => setSelectedExperience(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
