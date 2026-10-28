import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { FilterDropdown } from "./FilterDropdown";
import { MultiSelectDropdown } from "./MultiSelectDropdown";
import { ExperienceSidebar } from "./ExperienceSidebar";
import { EXPERIENCES, ALL_SKILLS, ALL_TYPES, type Experience } from "@/data/experiences";
import { cn } from "@/lib/utils";
import { IDCard } from "./IDCard";
import { ExperienceCard } from "./ExperienceCard";
import type { AnimState } from "../App";

export type SidebarAnimState = 'hidden' | 'flight_in' | 'pausing' | 'expanding' | 'open' | 'fading_out' | 'collapsing' | 'flight_out';

interface ExperiencesPanelProps {
  onClose: () => void;
  cardRect: DOMRect | null;
  /** Zoom applied to the landing's ID card, so the flying copy matches it */
  cardZoom?: number;
  animState: AnimState;
  onOpenViewer?: (viewerData: any, startRect: DOMRect, originEl?: Element) => void;
  viewerOpen?: boolean;
}

export function ExperiencesPanel({ onClose, cardRect, cardZoom = 1, animState, onOpenViewer, viewerOpen = false }: ExperiencesPanelProps) {
  const [selectedExperience, setSelectedExperience] = useState<Experience | null>(null);
  const [previousExperience, setPreviousExperience] = useState<Experience | null>(null);
  const [sidebarAnimState, setSidebarAnimState] = useState<SidebarAnimState>('hidden');
  const [prevSidebarAnimState, setPrevSidebarAnimState] = useState<SidebarAnimState>('hidden');
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [prevTargetRect, setPrevTargetRect] = useState<DOMRect | null>(null);
  const [targetRectScaled, setTargetRectScaled] = useState<DOMRect | null>(null);
  const [prevTargetRectScaled, setPrevTargetRectScaled] = useState<DOMRect | null>(null);

  const isParallaxed = (state: string) => {
    return ['flight_in', 'pausing', 'expanding', 'open', 'fading_out', 'collapsing'].includes(state);
  };
  const isListScaledDown = isParallaxed(sidebarAnimState) || isParallaxed(prevSidebarAnimState);

  const [skillFilter, setSkillFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState("All");

  const listRef = useRef<HTMLDivElement>(null);

  // Sidebar animations are timer-driven. Track every timer so a reset can cancel it,
  // and lock out new selections until the current animation finishes. A click made
  // during an animation is remembered (latest wins) and played once it ends.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const busyRef = useRef(false);
  const pendingRef = useRef<{ kind: 'select'; exp: Experience } | { kind: 'close' } | null>(null);
  const actionsRef = useRef<{ select: (exp: Experience) => void; close: () => void }>({ select: () => {}, close: () => {} });

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  };

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    busyRef.current = false;
    pendingRef.current = null;
  };

  const lockFor = (ms: number) => {
    busyRef.current = true;
    later(() => {
      busyRef.current = false;
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next?.kind === 'select') actionsRef.current.select(next.exp);
      else if (next?.kind === 'close') actionsRef.current.close();
    }, ms);
  };

  useEffect(() => clearTimers, []);

  // The open sidebar takes its width from the selected list card, and flies back into it
  // on close. After a resize, measure the card again (at the list's unscaled size).
  useEffect(() => {
    if (!selectedExperience || sidebarAnimState !== 'open') return;
    const onResize = () => {
      const el = document.getElementById(`exp-card-${selectedExperience.id}`)?.firstElementChild;
      const listWrapper = document.getElementById('list-column-wrapper');
      if (!el || !listWrapper) return;
      const oldTransform = listWrapper.style.transform;
      const oldTransition = listWrapper.style.transition;
      listWrapper.style.transition = 'none';
      listWrapper.style.transform = 'scale(1)';
      const rect = el.getBoundingClientRect();
      listWrapper.style.transform = oldTransform;
      listWrapper.style.transition = oldTransition;
      setTargetRect(rect);
      setTargetRectScaled(null);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [selectedExperience, sidebarAnimState]);

  const filteredExperiences = EXPERIENCES.filter((exp) => {
    if (skillFilter.length > 0 && !skillFilter.some((s) => exp.skills.includes(s))) return false;
    if (typeFilter !== "All" && exp.type !== typeFilter) return false;
    return true;
  });

  const handlePanelWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0 && listRef.current?.scrollTop === 0 && sidebarAnimState === 'hidden' && prevSidebarAnimState === 'hidden') {
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
      clearTimers();
      setSelectedExperience(null);
      setPreviousExperience(null);
      setSidebarAnimState('hidden');
      setPrevSidebarAnimState('hidden');
      setTargetRect(null);
      setPrevTargetRect(null);
      setTargetRectScaled(null);
      setPrevTargetRectScaled(null);
      setSkillFilter([]);
      setTypeFilter("All");
      if (listRef.current) listRef.current.scrollTop = 0;
    }
  }, [animState]);

  const handleItemClick = (exp: Experience) => {
    if (busyRef.current) {
      pendingRef.current = { kind: 'select', exp };
      return;
    }
    actionsRef.current.select(exp);
  };

  const requestCloseSidebar = () => {
    if (busyRef.current) {
      pendingRef.current = { kind: 'close' };
      return;
    }
    actionsRef.current.close();
  };

  const selectExperience = (exp: Experience) => {
    if (selectedExperience?.id === exp.id && sidebarAnimState !== 'hidden') return;

    const cardEl = document.getElementById(`exp-card-${exp.id}`)?.firstElementChild;
    if (!cardEl) return; // filtered out of the list while waiting

    let scaledRect = cardEl.getBoundingClientRect();
    let unscaledRect = scaledRect;
    
    let scaledOldRect = targetRect;
    let unscaledOldRect = targetRect;

    const listWrapper = document.getElementById('list-column-wrapper');
    if (listWrapper) {
      if (selectedExperience) {
        const prevWrapperEl = document.getElementById(`exp-card-${selectedExperience.id}`);
        const prevEl = prevWrapperEl?.firstElementChild;
        if (prevEl) {
          scaledOldRect = prevEl.getBoundingClientRect();
        }
      }

      const oldTransform = listWrapper.style.transform;
      const oldTransition = listWrapper.style.transition;
      
      listWrapper.style.transition = 'none';
      listWrapper.style.transform = 'scale(1)';
      
      unscaledRect = cardEl.getBoundingClientRect();
      
      if (selectedExperience) {
        const prevWrapperEl = document.getElementById(`exp-card-${selectedExperience.id}`);
        const prevEl = prevWrapperEl?.firstElementChild;
        if (prevEl) {
          unscaledOldRect = prevEl.getBoundingClientRect();
        }
      }
      
      listWrapper.style.transform = oldTransform;
      listWrapper.style.transition = oldTransition;
    }

    if (sidebarAnimState !== 'hidden' || prevSidebarAnimState !== 'hidden') {
      // Simultaneous swap
      setPrevSidebarAnimState('fading_out');
      setPreviousExperience(selectedExperience);
      setPrevTargetRect(unscaledOldRect);
      setPrevTargetRectScaled(scaledOldRect);
      
      later(() => setPrevSidebarAnimState('collapsing'), 200);
      later(() => setPrevSidebarAnimState('flight_out'), 600);
      later(() => {
        setPrevSidebarAnimState('hidden');
        setPreviousExperience(null);
        setPrevTargetRect(null);
        setPrevTargetRectScaled(null);
      }, 1250);

      setSelectedExperience(exp);
      setTargetRect(unscaledRect);
      setTargetRectScaled(scaledRect);
      setSidebarAnimState('hidden');
      
      later(() => setSidebarAnimState('flight_in'), 30);
      later(() => setSidebarAnimState('pausing'), 630);
      later(() => setSidebarAnimState('expanding'), 830);
      later(() => setSidebarAnimState('open'), 1230);
    } else {
      // Normal open
      setSelectedExperience(exp);
      setTargetRect(unscaledRect);
      setTargetRectScaled(null);
      setSidebarAnimState('hidden');
      
      later(() => setSidebarAnimState('flight_in'), 30);
      later(() => setSidebarAnimState('pausing'), 630);
      later(() => setSidebarAnimState('expanding'), 830);
      later(() => setSidebarAnimState('open'), 1230);
    }
    lockFor(1250);
  };

  const closeSidebar = () => {
    if (!selectedExperience || sidebarAnimState === 'hidden') return;
    setTargetRectScaled(null);
    setPrevTargetRectScaled(null);
    // Update targetRect right as we start closing to account for any scrolling that happened
    if (selectedExperience) {
      const listWrapper = document.getElementById('list-column-wrapper');
      const wrapperEl = document.getElementById(`exp-card-${selectedExperience.id}`);
      const el = wrapperEl?.firstElementChild;
      
      if (el && listWrapper) {
        const oldTransform = listWrapper.style.transform;
        const oldTransition = listWrapper.style.transition;
        
        listWrapper.style.transition = 'none';
        listWrapper.style.transform = 'scale(1)';
        
        setTargetRect(el.getBoundingClientRect());
        
        listWrapper.style.transform = oldTransform;
        listWrapper.style.transition = oldTransition;
      }
    }
    
    setSidebarAnimState('fading_out');
    later(() => setSidebarAnimState('collapsing'), 200);
    later(() => setSidebarAnimState('flight_out'), 600);
    // Set hidden first so the list card becomes visible, then unmount 150ms later
    // so the sidebar can fade out (via its hidden-state opacity transition) concurrently.
    later(() => setSidebarAnimState('hidden'), 1250);
    later(() => {
      setSelectedExperience(null);
      setTargetRect(null);
    }, 1400);
    lockFor(1400);
  };

  actionsRef.current = { select: selectExperience, close: closeSidebar };

  const getContainerStyles = (): React.CSSProperties => {
    const rectTop = cardRect ? cardRect.top : 0;
    const rectLeft = cardRect ? cardRect.left : 0;
    const rectWidth = cardRect ? cardRect.width : 340;
    const rectHeight = cardRect ? cardRect.height : 476;

    const cw = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const ch = typeof window !== 'undefined' ? window.innerHeight : 1000;

    const isAnimating = animState === 'flipping_in' || animState === 'expanding' || animState === 'collapsing' || animState === 'flipping_out';
    const baseStyle: React.CSSProperties = {
      position: "fixed",
      top: "50%",
      left: "50%",
      zIndex: 50,
      transformStyle: "preserve-3d",
      pointerEvents: animState === "hidden" ? "none" : "auto",
      willChange: isAnimating ? "transform, width, height" : "auto",
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
          transform: `perspective(1200px) translate3d(${hiddenX}px, ${hiddenY}px, 0) translate(-50%, -50%) rotateY(0deg) scale(1)`,
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
          transform: `perspective(1200px) translate3d(0px, 0px, 0) translate(-50%, -50%) rotateY(180deg) scale(1.2)`,
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
          transform: `perspective(1200px) translate3d(0px, 0px, 0) translate(-50%, -50%) rotateY(180deg) scale(1)`,
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
          transform: `perspective(1200px) translate3d(0px, 0px, 0) translate(-50%, -50%) rotateY(180deg) scale(1.2)`,
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
          transform: `perspective(1200px) translate3d(${hiddenX}px, ${hiddenY}px, 0) translate(-50%, -50%) rotateY(0deg) scale(1)`,
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
        style={{ 
          transform: 'rotateY(0deg)',
          display: animState === 'hidden' ? 'none' : undefined,
        }}
      >
        <div style={{ zoom: cardZoom }}>
          <IDCard interactive={false} />
        </div>
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
        {/* Static Shadow Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{ 
            zIndex: 0,
            background: 'radial-gradient(ellipse at 50% 150%, rgba(15, 20, 25, 0.45) 0%, transparent 60%)',
            display: animState === 'hidden' ? 'none' : undefined,
          }}
        />

        {/* Fixed inner wrapper to prevent layout thrashing during panel resize */}
        <div 
          className="absolute top-1/2 left-1/2 pointer-events-none"
          style={{
            width: '100vw',
            height: '100vh',
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative w-full h-full pointer-events-auto">
            {/* Top Bar */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-[60px] z-10 flex items-center px-4 sm:px-6",
                "bg-[rgba(38,44,49,0.5)] backdrop-blur-[12px] border-b border-[rgba(54,62,69,0.8)]",
                "transition-opacity duration-300"
              )}
              style={{ 
                opacity: showContents ? 1 : 0, 
                pointerEvents: showContents ? "auto" : "none",
                visibility: showContents ? "visible" : "hidden",
                display: showContents ? undefined : 'none',
              }}
            >
          {/* The title gives way to the filters on narrow screens */}
          <div className="flex-1 min-w-0">
            <h2 className="hidden min-[440px]:block truncate font-sans text-[18px] font-bold text-[#D2DCE5]">Experiences</h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <MultiSelectDropdown
              label="Skill"
              options={ALL_SKILLS}
              values={skillFilter}
              onChange={setSkillFilter}
            />
            <FilterDropdown
              label="Type"
              options={["All", ...ALL_TYPES]}
              value={typeFilter}
              onChange={setTypeFilter}
            />

            <div className="hidden sm:block w-[1px] h-6 bg-[rgba(54,62,69,0.8)] mx-2" />

            <button
              onClick={onClose}
              className="btn-icon w-8 h-8 rounded-full"
              aria-label="Return to landing"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scroll Up Hint */}
        <div
          className="absolute top-[60px] left-0 right-0 py-2 flex justify-center pointer-events-none z-10 transition-opacity duration-300"
          style={{ 
            opacity: (showContents && sidebarAnimState === 'hidden' && prevSidebarAnimState === 'hidden') ? 1 : 0,
            visibility: (showContents && sidebarAnimState === 'hidden' && prevSidebarAnimState === 'hidden') ? "visible" : "hidden",
            display: showContents ? undefined : 'none',
          }}
        >
          <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-[rgba(210,220,229,0.2)]">
            Scroll up to return
          </span>
        </div>

        {/* Main Content Area */}
        <div
          className="absolute top-[60px] left-0 right-0 bottom-0 flex overflow-hidden transition-opacity duration-300"
          style={{ 
            opacity: showContents ? 1 : 0, 
            pointerEvents: showContents ? "auto" : "none",
            visibility: showContents ? "visible" : "hidden",
            display: showContents ? undefined : 'none',
          }}
        >
          {/* List Column */}
          <div
            id="list-column-wrapper"
            className="h-full w-full relative flex flex-col items-end pt-6 md:pt-12 transition-all duration-[600ms] ease-[cubic-bezier(0.25,1,0.5,1)]"
            style={{ 
              paddingRight: "clamp(1rem, calc(100vw - 650px - 1rem), 660px)", 
              paddingLeft: "1rem",
              transform: isListScaledDown ? "scale(0.95)" : "scale(1)",
              opacity: isListScaledDown ? 0.5 : 1,
              transformOrigin: "center center"
            }}
          >
            <div
              ref={listRef}
              className="flex-1 w-full max-w-[650px] overflow-y-auto minimal-scrollbar pr-4 md:pr-8 pb-24"
              onWheel={handleListWheel}
            >
              <div className="w-full">
                {filteredExperiences.map((exp, index) => {
                  const isSelected = selectedExperience?.id === exp.id;
                  const isPrevious = previousExperience?.id === exp.id;
                  
                  // Hide the DOM node physically when it's flying around
                  const isFlying = (isSelected && sidebarAnimState !== 'hidden') || (isPrevious && prevSidebarAnimState !== 'hidden');

                  return (
                    <div
                      key={exp.id}
                      id={`exp-card-${exp.id}`}
                      style={{
                        visibility: isFlying ? "hidden" : "visible",
                        animation: showContents ? `card-enter 300ms ease-out ${index * 60}ms both` : "none",
                      }}
                      className="relative"
                    >
                      <ExperienceCard 
                        experience={exp} 
                        isSelected={false} 
                        onClick={() => handleItemClick(exp)} 
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </div>

          {/* Sidebars (Moved outside overflow-hidden to prevent clipping) */}
          <div className="absolute inset-0 pointer-events-none">
          {selectedExperience && (
            <ExperienceSidebar
              experience={selectedExperience}
              animState={sidebarAnimState}
              startRect={targetRect}
              scaledRect={targetRectScaled}
              isListScaledDown={isListScaledDown}
              onClose={requestCloseSidebar}
              onOpenViewer={onOpenViewer}
              position={filteredExperiences.findIndex(e => e.id === selectedExperience.id) + 1}
              total={filteredExperiences.length}
              keyboardEnabled={!viewerOpen}
              hasPrev={filteredExperiences.findIndex(e => e.id === selectedExperience.id) > 0}
              hasNext={filteredExperiences.findIndex(e => e.id === selectedExperience.id) < filteredExperiences.length - 1}
              onPrev={() => {
                const currentIndex = filteredExperiences.findIndex(e => e.id === selectedExperience.id);
                if (currentIndex > 0) {
                  const prevExp = filteredExperiences[currentIndex - 1];
                  handleItemClick(prevExp);
                }
              }}
              onNext={() => {
                const currentIndex = filteredExperiences.findIndex(e => e.id === selectedExperience.id);
                if (currentIndex < filteredExperiences.length - 1) {
                  const nextExp = filteredExperiences[currentIndex + 1];
                  handleItemClick(nextExp);
                }
              }}
            />
          )}

          {previousExperience && (
            <ExperienceSidebar
              experience={previousExperience}
              animState={prevSidebarAnimState}
              startRect={prevTargetRect}
              scaledRect={prevTargetRectScaled}
              isListScaledDown={isListScaledDown}
              zIndex={5}
              onClose={() => {}}
            />
          )}
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}
