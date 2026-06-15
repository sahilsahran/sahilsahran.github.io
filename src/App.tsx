import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { BGPattern } from "@/components/ui/bg-pattern";
import { IDCard } from "@/components/IDCard";
import { ExperiencesPanel } from "@/components/ExperiencesPanel";

export type AnimState = 'hidden' | 'flipping_in' | 'expanding' | 'open' | 'collapsing' | 'flipping_out';

function App() {
  const [section, setSection] = useState<'landing' | 'experiences'>('landing');
  const [transitioning, setTransitioning] = useState(false);
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const [animState, setAnimState] = useState<AnimState>('hidden');
  const [nameTransform, setNameTransform] = useState({ x: 0, y: 0 });
  const [centerOffsets, setCenterOffsets] = useState([0, 0, 0]);

  // Initial capture
  useEffect(() => {
    if (cardWrapperRef.current && !cardRect) {
      setCardRect(cardWrapperRef.current.getBoundingClientRect());
    }
  }, []);

  // Dynamically calculate exact center distance for the Name text
  useEffect(() => {
    const updateNameCenter = () => {
      if (!nameRef.current) return;

      const currentTransform = nameRef.current.style.transform;
      const currentTransition = nameRef.current.style.transition;
      nameRef.current.style.transform = 'none';
      nameRef.current.style.transition = 'none';
      
      // Force reflow
      void nameRef.current.offsetHeight;

      const rect = nameRef.current.getBoundingClientRect();
      
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;
      
      setNameTransform({
        x: viewportCenterX - centerX,
        y: viewportCenterY - centerY
      });

      // Calculate the offset required to move each right-aligned text child to the exact center of the container
      const children = Array.from(nameRef.current.children) as HTMLElement[];
      const isMobile = window.innerWidth < 640;
      const maxWidth = rect.width;

      const offsets = children.map(child => {
        // On mobile, the container uses items-center, so they are already centered! No offset needed.
        if (isMobile) return 0;
        const childWidth = child.getBoundingClientRect().width;
        return (maxWidth - childWidth) / 2;
      });
      
      setCenterOffsets(offsets);

      nameRef.current.style.transform = currentTransform;
      nameRef.current.style.transition = currentTransition;
    };
    
    // Ensure fonts are loaded before measuring text widths
    document.fonts.ready.then(updateNameCenter);
    updateNameCenter();
    window.addEventListener('resize', updateNameCenter);
    return () => window.removeEventListener('resize', updateNameCenter);
  }, []);

  // Multi-stage orchestration from App.tsx
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let raf1: number;
    let raf2: number;
    
    if (section === 'experiences') {
      if (animState === 'hidden' || animState === 'flipping_out' || animState === 'collapsing') {
        raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(() => {
            setAnimState('flipping_in');
          });
        });
      } else if (animState === 'flipping_in') {
        t = setTimeout(() => setAnimState('expanding'), 800);
      } else if (animState === 'expanding') {
        t = setTimeout(() => setAnimState('open'), 400);
      }
    } else {
      if (animState === 'open' || animState === 'expanding') {
        setAnimState('collapsing');
      } else if (animState === 'collapsing') {
        t = setTimeout(() => setAnimState('flipping_out'), 400);
      } else if (animState === 'flipping_out') {
        t = setTimeout(() => setAnimState('hidden'), 800);
      } else if (animState === 'flipping_in') {
        setAnimState('flipping_out');
      }
    }

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [section, animState]);

  function goToExperiences() {
    if (transitioning || section === 'experiences') return;
    if (cardWrapperRef.current) {
      setCardRect(cardWrapperRef.current.getBoundingClientRect());
    }
    setTransitioning(true);
    setSection('experiences');
    setTimeout(() => setTransitioning(false), 1200); // 800+400
  }

  function goToLanding() {
    if (transitioning || section === 'landing') return;
    setTransitioning(true);
    setSection('landing');
    setTimeout(() => setTransitioning(false), 1200); // 400+800
  }

  const isOriginalCardVisible = animState === 'hidden';

  const handleLandingWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0 && section === 'landing') {
      goToExperiences();
    }
  };

  const getRootStyle = (): React.CSSProperties => {
    let bgOpacity = 0;
    let transitionDuration = '800ms';
    let easing = (animState === 'flipping_out' || animState === 'hidden') 
      ? 'cubic-bezier(0.5, 0, 0.2, 1)' 
      : 'cubic-bezier(0.25, 1, 0.5, 1)';

    switch (animState) {
      case 'hidden':
        bgOpacity = 0;
        break;
      case 'flipping_in':
        bgOpacity = 0.3; // Subtle dimming
        transitionDuration = '800ms';
        break;
      case 'expanding':
      case 'open':
        bgOpacity = 0.85; // Dramatic shadowing
        transitionDuration = '400ms';
        easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
        break;
      case 'collapsing':
        bgOpacity = 0.3;
        transitionDuration = '400ms';
        easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
        break;
      case 'flipping_out':
        bgOpacity = 0;
        transitionDuration = '800ms';
        break;
    }

    return {
      backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
      transition: `background-color ${transitionDuration} ${easing}`,
    };
  };

  const getLandingStyle = (): React.CSSProperties => {
    let scale = 1;
    let transitionDuration = '800ms';
    // Preserve ease-in during hidden state so the CSS transition property doesn't change exactly as the animation finishes
    let easing = (animState === 'flipping_out' || animState === 'hidden') 
      ? 'cubic-bezier(0.5, 0, 0.2, 1)' 
      : 'cubic-bezier(0.25, 1, 0.5, 1)';
    let filter = 'brightness(1)';

    switch (animState) {
      case 'hidden':
        scale = 1;
        filter = 'brightness(1)';
        break;
      case 'flipping_in':
        scale = 0.8;
        filter = 'brightness(0.7)'; // Subtle dimming
        transitionDuration = '800ms';
        break;
      case 'expanding':
      case 'open':
        scale = 0.7;
        filter = 'brightness(0.15)'; // Dramatic shadowing
        transitionDuration = '400ms';
        easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
        break;
      case 'collapsing':
        scale = 0.8;
        filter = 'brightness(0.7)';
        transitionDuration = '400ms';
        easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
        break;
      case 'flipping_out':
        scale = 1;
        filter = 'brightness(1)';
        transitionDuration = '800ms';
        break;
    }

    return {
      transform: `scale(${scale})`,
      filter,
      transition: `transform ${transitionDuration} ${easing}, filter ${transitionDuration} ${easing}`,
      transformOrigin: 'center center',
    };
  };

  return (
    <div className="relative min-h-screen overflow-hidden" style={getRootStyle()}>
      {/* LANDING SECTION */}
      <section
        className="relative h-[100vh] w-full flex flex-col justify-center will-change-transform"
        style={getLandingStyle()}
        onWheel={handleLandingWheel}
      >
        <BGPattern variant="grid" mask="fade-edges" size={40} fill="#1a2227" />
        
        <main className="relative z-10 w-full max-w-[1200px] mx-auto px-6 flex flex-col items-center">
          {/* Top layout: Card (Right) + Name (Left) */}
          <div className="flex flex-col sm:flex-row-reverse items-center justify-center gap-12 sm:gap-24 w-full">
            {/* Right Col - Card (First in DOM so it stacks on top for mobile) */}
            <div ref={cardWrapperRef} className="flex-shrink-0 z-20">
              <div style={{ opacity: isOriginalCardVisible ? 1 : 0, transition: 'opacity 0ms' }}>
                <IDCard />
              </div>
            </div>

            {/* Left Col - Name */}
            <div 
              ref={nameRef}
              className="flex flex-col items-center sm:items-end z-20 will-change-transform"
              style={{
                transition: `transform 800ms ${animState === 'flipping_out' || animState === 'hidden' ? 'cubic-bezier(0.5, 0, 0.2, 1)' : 'cubic-bezier(0.25, 1, 0.5, 1)'}`,
                transform: ['flipping_in', 'expanding', 'open', 'collapsing'].includes(animState) 
                  ? `translate(${nameTransform.x}px, ${nameTransform.y}px)` 
                  : 'translate(0px, 0px)'
              }}
            >
              <div className="relative w-max will-change-transform" style={{
                transform: ['flipping_in', 'expanding', 'open', 'collapsing'].includes(animState) ? `translateX(-${centerOffsets[0] || 0}px)` : 'translateX(0px)',
                transition: `transform 800ms ${animState === 'flipping_out' || animState === 'hidden' ? 'cubic-bezier(0.5, 0, 0.2, 1)' : 'cubic-bezier(0.25, 1, 0.5, 1)'}`
              }}>
                <h1
                  className="font-sans font-[800] uppercase text-[#D2DCE5] leading-[0.92] tracking-[-0.02em] transition-all duration-250 ease-out will-change-transform cursor-default"
                  style={{
                    fontSize: "clamp(5rem, 9vw, 9rem)",
                    textShadow: `
                      0 2px 0 #4B6376,
                      0 4px 0 rgba(75, 99, 118, 0.6),
                      0 8px 16px rgba(0, 0, 0, 0.5),
                      0 16px 32px rgba(0, 0, 0, 0.3)
                    `,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.textShadow = `
                      0 5px 0 #4B6376,
                      0 8px 0 rgba(75, 99, 118, 0.5),
                      0 12px 20px rgba(0, 0, 0, 0.6),
                      0 24px 40px rgba(0, 0, 0, 0.3)
                    `;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.textShadow = `
                      0 2px 0 #4B6376,
                      0 4px 0 rgba(75, 99, 118, 0.6),
                      0 8px 16px rgba(0, 0, 0, 0.5),
                      0 16px 32px rgba(0, 0, 0, 0.3)
                    `;
                  }}
                >
                  SAHIL
                </h1>
              </div>

              <div className="relative w-max will-change-transform" style={{
                transform: ['flipping_in', 'expanding', 'open', 'collapsing'].includes(animState) ? `translateX(-${centerOffsets[1] || 0}px)` : 'translateX(0px)',
                transition: `transform 800ms ${animState === 'flipping_out' || animState === 'hidden' ? 'cubic-bezier(0.5, 0, 0.2, 1)' : 'cubic-bezier(0.25, 1, 0.5, 1)'}`
              }}>
                <h1
                  className="font-sans font-[800] uppercase text-[#D2DCE5] leading-[0.92] tracking-[-0.02em] transition-all duration-250 ease-out will-change-transform cursor-default"
                  style={{
                    fontSize: "clamp(5rem, 9vw, 9rem)",
                    textShadow: `
                      0 2px 0 #4B6376,
                      0 4px 0 rgba(75, 99, 118, 0.6),
                      0 8px 16px rgba(0, 0, 0, 0.5),
                      0 16px 32px rgba(0, 0, 0, 0.3)
                    `,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.textShadow = `
                      0 5px 0 #4B6376,
                      0 8px 0 rgba(75, 99, 118, 0.5),
                      0 12px 20px rgba(0, 0, 0, 0.6),
                      0 24px 40px rgba(0, 0, 0, 0.3)
                    `;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.textShadow = `
                      0 2px 0 #4B6376,
                      0 4px 0 rgba(75, 99, 118, 0.6),
                      0 8px 16px rgba(0, 0, 0, 0.5),
                      0 16px 32px rgba(0, 0, 0, 0.3)
                    `;
                  }}
                >
                  SAHRAN
                </h1>
              </div>

              <div className="relative w-max will-change-transform mt-4" style={{
                transform: ['flipping_in', 'expanding', 'open', 'collapsing'].includes(animState) ? `translateX(-${centerOffsets[2] || 0}px)` : 'translateX(0px)',
                transition: `transform 800ms ${animState === 'flipping_out' || animState === 'hidden' ? 'cubic-bezier(0.5, 0, 0.2, 1)' : 'cubic-bezier(0.25, 1, 0.5, 1)'}`
              }}>
                <p className="font-sans font-normal text-[clamp(1rem,1.5vw,1.25rem)] text-[rgba(164,198,211,0.7)] tracking-[0.05em]">
                  Full-stack developer & designer
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-[16px] mt-16 z-20">
            <button
              className="font-sans text-[14px] font-semibold tracking-[0.06em] px-[32px] py-[12px] rounded-[10px] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-[2px] active:translate-y-[1px]"
              aria-label="View Resume"
              style={{
                background: "#D2DCE5",
                color: "#262C31",
                boxShadow: `
                  0 0 0 1px rgba(0,0,0,0.08),
                  0 2px 4px rgba(0,0,0,0.2),
                  0 8px 16px -4px rgba(0,0,0,0.4),
                  inset 0 1px 0 rgba(255,255,255,0.9),
                  inset 0 -2px 4px rgba(0,0,0,0.08)
                `,
              }}
            >
              Resume
            </button>
            <button
              className="font-sans text-[14px] font-semibold tracking-[0.06em] px-[32px] py-[12px] rounded-[10px] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-[2px] active:translate-y-[1px]"
              aria-label="View Transcript"
              style={{
                background: "#2E353B",
                color: "#D2DCE5",
                boxShadow: `
                  0 0 0 1px rgba(196, 238, 240, 0.12),
                  0 2px 4px rgba(0,0,0,0.4),
                  0 8px 16px -4px rgba(0,0,0,0.7),
                  inset 0 1px 0 rgba(196, 238, 240, 0.08),
                  inset 0 -2px 4px rgba(0,0,0,0.5)
                `,
              }}
            >
              Transcript
            </button>
          </div>
        </main>

        {/* Scroll Indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer z-20"
          onClick={goToExperiences}
        >
          <div style={{ animation: "bob 2s ease-in-out infinite" }}>
            <ChevronDown size={20} className="text-[rgba(210,220,229,0.5)]" />
          </div>
          <span className="font-sans text-[11px] tracking-[0.12em] uppercase text-[rgba(210,220,229,0.3)]">
            Scroll to view Experiences
          </span>
        </div>
      </section>

      {/* EXPERIENCES PANEL SECTION */}
      <ExperiencesPanel 
        onClose={goToLanding} 
        cardRect={cardRect}
        animState={animState}
      />
    </div>
  );
}

export default App;
