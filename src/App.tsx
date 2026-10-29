import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChevronDown } from "lucide-react";
import { ParallaxGrid } from "@/components/ParallaxGrid";
import { IDCard } from "@/components/IDCard";
import { ExperiencesPanel } from "@/components/ExperiencesPanel";
import { FlipButton } from "@/components/ui/FlipButton";
import { PDFViewerPanel, type ViewerData } from "@/components/PDFViewerPanel";
import { applyTheme, getInitialTheme } from "@/lib/theme";

export type AnimState = 'hidden' | 'flipping_in' | 'expanding' | 'open' | 'collapsing' | 'flipping_out';
export type PdfAnimState = 'hidden' | 'flipping_in' | 'expanding' | 'open' | 'collapsing' | 'flipping_out';

// Space kept clear above and below the landing content (the scroll hint sits in the bottom one)
const LANDING_PAD_BOTTOM = 84;
const landingPadTop = () => (window.innerWidth < 640 || window.innerHeight < 500 ? 24 : LANDING_PAD_BOTTOM);

// Where an element sits when the landing section is at rest. While a panel is open the
// section is scaled around its center, so getBoundingClientRect alone gives a shrunken rect.
function restingRect(el: Element, section: Element): DOMRect {
  const r = el.getBoundingClientRect();
  const t = getComputedStyle(section).transform;
  const s = t && t !== 'none' ? new DOMMatrixReadOnly(t).a || 1 : 1;
  const sr = section.getBoundingClientRect();
  const cx = sr.left + sr.width / 2;
  const cy = sr.top + sr.height / 2;
  return new DOMRect(cx + (r.left - cx) / s, cy + (r.top - cy) / s, r.width / s, r.height / s);
}

function App() {
  const [section, setSection] = useState<'landing' | 'experiences'>('landing');
  useEffect(() => applyTheme(getInitialTheme()), []);
  const [transitioning, setTransitioning] = useState(false);
  const cardWrapperRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const nameWrapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  // Landing content is zoomed down to fit short or narrow windows
  const [fitZoom, setFitZoom] = useState(1);
  const fitZoomRef = useRef(1);
  fitZoomRef.current = fitZoom;
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const [animState, setAnimState] = useState<AnimState>('hidden');
  const [nameTransform, setNameTransform] = useState({ x: 0, y: 0 });
  const [centerOffsets, setCenterOffsets] = useState([0, 0, 0]);

  // PDF Viewer state
  const [pdfAnimState, setPdfAnimState] = useState<PdfAnimState>('hidden');
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [viewerData, setViewerData] = useState<ViewerData>({
    type: 'resume',
    title: 'Resume',
    fileUrl: '/resume/sahil-sahran-resume.pdf',
    fileType: 'pdf'
  });
  const [pdfStartRect, setPdfStartRect] = useState<DOMRect | null>(null);
  const resumeBtnRef = useRef<HTMLButtonElement>(null);
  const transcriptBtnRef = useRef<HTMLButtonElement>(null);
  // What the open viewer grew out of, so its rect can be re-measured after a resize
  const pdfOriginRef = useRef<{ el: Element; onLanding: boolean } | null>(null);
  const pdfAnimStateRef = useRef<PdfAnimState>('hidden');
  pdfAnimStateRef.current = pdfAnimState;

  const measureLayoutRef = useRef<() => void>(() => {});

  // Measure the landing layout: how far to zoom it to fit the window, where the ID card
  // rests (the experiences panel flies out of and back into it), and how far the name
  // moves to reach the center. The landing stays laid out (only hidden) while a panel is
  // open, so this runs on every resize and the return animations land in the right place.
  useEffect(() => {
    const measureLayout = () => {
      const section = sectionRef.current;
      const main = mainRef.current;
      const nameWrap = nameWrapRef.current;
      const name = nameRef.current;
      const cardWrap = cardWrapperRef.current;
      if (!section || !main || !nameWrap || !name || !cardWrap) return;

      const mainRect = restingRect(main, section);
      if (mainRect.width === 0 || mainRect.height === 0) return;

      // 1. Zoom to fit. Sizes are measured at the current zoom and scaled back to zoom 1.
      const z = fitZoomRef.current;
      const isMobile = window.innerWidth < 640;
      const card = restingRect(cardWrap, section);
      const nameChildren = Array.from(name.children) as HTMLElement[];
      const nameWidth = Math.max(...nameChildren.map((c) => restingRect(c, section).width));
      const buttonsWidth = buttonsRef.current ? restingRect(buttonsRef.current, section).width : 0;
      const gap = rowRef.current ? parseFloat(getComputedStyle(rowRef.current).columnGap) || 0 : 0;
      const contentWidth = isMobile
        ? Math.max(card.width, nameWidth, buttonsWidth)
        : Math.max(card.width + gap * z + nameWidth, buttonsWidth);
      const availH = window.innerHeight - landingPadTop() - LANDING_PAD_BOTTOM;
      const fitH = availH / (mainRect.height / z);
      const fitW = window.innerWidth / (contentWidth / z + 48); // main has 24px side padding
      const nextZoom = Math.max(0.4, Math.min(1, fitH, fitW));
      if (Math.abs(nextZoom - z) > 0.005) {
        fitZoomRef.current = nextZoom;
        setFitZoom(nextZoom); // re-measures once the new zoom is laid out
        return;
      }

      // 2. Card position (screen coordinates, zoom included)
      setCardRect(card);

      // 3. Move the name block's center to the viewport's center. Translations are
      // applied inside the zoomed content, so screen distances are divided by the zoom.
      const nameRect = restingRect(nameWrap, section);
      setNameTransform({
        x: (window.innerWidth / 2 - (nameRect.left + nameRect.width / 2)) / z,
        y: (window.innerHeight / 2 - (nameRect.top + nameRect.height / 2)) / z,
      });

      // Shift each right-aligned line so it centers within the block
      setCenterOffsets(nameChildren.map((child) => {
        if (isMobile) return 0;
        return (nameRect.width - restingRect(child, section).width) / 2 / z;
      }));

      // 4. Keep the viewer's return target current
      const origin = pdfOriginRef.current;
      if (origin && pdfAnimStateRef.current !== 'hidden' && origin.el.isConnected) {
        setPdfStartRect(origin.onLanding ? restingRect(origin.el, section) : origin.el.getBoundingClientRect());
      }
    };

    measureLayoutRef.current = measureLayout;
    // Ensure fonts are loaded before measuring text widths
    document.fonts.ready.then(measureLayout);
    measureLayout();
    window.addEventListener('resize', measureLayout);
    return () => window.removeEventListener('resize', measureLayout);
  }, []);

  // A new zoom changes every measurement, so take them again once it's applied
  useLayoutEffect(() => {
    measureLayoutRef.current();
  }, [fitZoom]);

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

  // PDF Animation Orchestration
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    
    if (isPdfOpen) {
      if (pdfAnimState === 'hidden' || pdfAnimState === 'flipping_out' || pdfAnimState === 'collapsing') {
        setPdfAnimState('flipping_in');
      } else if (pdfAnimState === 'flipping_in') {
        t = setTimeout(() => setPdfAnimState('expanding'), 800);
      } else if (pdfAnimState === 'expanding') {
        t = setTimeout(() => setPdfAnimState('open'), 600); // 400ms for card, 600ms for PDF
      }
    } else {
      if (pdfAnimState === 'open' || pdfAnimState === 'expanding') {
        setPdfAnimState('collapsing');
      } else if (pdfAnimState === 'collapsing') {
        t = setTimeout(() => setPdfAnimState('flipping_out'), 600);
      } else if (pdfAnimState === 'flipping_out') {
        t = setTimeout(() => setPdfAnimState('hidden'), 800);
      } else if (pdfAnimState === 'flipping_in') {
        setPdfAnimState('flipping_out');
      }
    }

    return () => clearTimeout(t);
  }, [isPdfOpen, pdfAnimState]);

  const openPdf = (type: 'resume' | 'transcript') => {
    if (transitioning || section === 'experiences' || isPdfOpen) return;
    const ref = type === 'resume' ? resumeBtnRef : transcriptBtnRef;
    if (ref.current) {
      setPdfStartRect(ref.current.getBoundingClientRect());
      pdfOriginRef.current = { el: ref.current, onLanding: true };
    }
    setViewerData({
      type,
      title: type === 'resume' ? 'Resume' : 'Transcript',
      fileUrl: type === 'resume' ? '/resume/sahil-sahran-resume.pdf' : '/documents/academic-history.pdf',
      fileType: 'pdf'
    });
    setIsPdfOpen(true);
  };

  const handleOpenCustomViewer = (data: typeof viewerData, rect: DOMRect, originEl?: Element) => {
    if (transitioning || isPdfOpen) return;
    setPdfStartRect(rect);
    pdfOriginRef.current = originEl ? { el: originEl, onLanding: false } : null;
    setViewerData(data);
    setIsPdfOpen(true);
  };

  const navigateViewer = (step: 1 | -1) => {
    setViewerData((d) => {
      if (!d.gallery || d.gallery.length < 2) return d;
      const n = d.gallery.length;
      const index = ((d.index ?? 0) + step + n) % n;
      const file = d.gallery[index];
      return { ...d, index, title: file.name, fileUrl: file.path, fileType: file.type };
    });
  };

  const closePdf = () => {
    setIsPdfOpen(false);
  };

  function goToExperiences() {
    if (transitioning || section === 'experiences') return;
    // Re-measure right before the card and name animate, in case the window changed since
    measureLayoutRef.current();
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

    if (pdfAnimState !== 'hidden') {
      switch (pdfAnimState) {
        case 'flipping_in':
          bgOpacity = 0.3; // Subtle dimming
          transitionDuration = '800ms';
          easing = 'cubic-bezier(0.25, 1, 0.5, 1)';
          break;
        case 'expanding':
        case 'open':
          bgOpacity = 0.85; // Dramatic shadowing
          transitionDuration = '600ms';
          easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
          break;
        case 'collapsing':
          bgOpacity = 0.3;
          transitionDuration = '600ms';
          easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
          break;
        case 'flipping_out':
          bgOpacity = 0;
          transitionDuration = '800ms';
          easing = 'cubic-bezier(0.5, 0, 0.2, 1)';
          break;
      }
      return {
        backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
        transition: `background-color ${transitionDuration} ${easing}`,
      };
    }

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

    if (pdfAnimState !== 'hidden') {
      switch (pdfAnimState) {
        case 'flipping_in':
        case 'collapsing':
          scale = 0.8;
          filter = 'brightness(0.7)';
          transitionDuration = pdfAnimState === 'collapsing' ? '600ms' : '800ms';
          easing = pdfAnimState === 'collapsing' ? 'cubic-bezier(0.76, 0, 0.24, 1)' : 'cubic-bezier(0.25, 1, 0.5, 1)';
          break;
        case 'expanding':
        case 'open':
          scale = 0.7;
          filter = 'brightness(0.15)';
          transitionDuration = '600ms';
          easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
          break;
        case 'flipping_out':
          scale = 1;
          filter = 'brightness(1)';
          transitionDuration = '800ms';
          easing = 'cubic-bezier(0.5, 0, 0.2, 1)';
          break;
      }
      return {
        transform: `scale(${scale})`,
        filter,
        transition: `transform ${transitionDuration} ${easing}, filter ${transitionDuration} ${easing}`,
        transformOrigin: 'center center',
      };
    }

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

  const isLandingHidden = animState === 'expanding' || animState === 'open';

  return (
    <div 
      className={`relative min-h-screen overflow-hidden ${pdfAnimState !== 'hidden' ? 'animations-paused' : ''}`}
      style={getRootStyle()}
    >
      {/* LANDING SECTION */}
      <section
        ref={sectionRef}
        className="relative h-dvh w-full flex flex-col justify-center"
        style={{ ...getLandingStyle(), paddingTop: landingPadTop(), paddingBottom: LANDING_PAD_BOTTOM }}
        onWheel={handleLandingWheel}
      >
        {/* WebGL parallax: fragment shader computes grid per-pixel — zero rasterization */}
        <ParallaxGrid 
          visible={!isLandingHidden} 
          paused={pdfAnimState !== 'hidden'}
        />
        <div 
          className="absolute inset-0 pointer-events-none z-[1]"
          style={{ 
            background: 'radial-gradient(ellipse at center, transparent 0%, rgb(var(--c-bg)) 75%)',
            visibility: isLandingHidden ? 'hidden' : undefined,
          }}
        />
        
        {/* Hidden rather than display:none while a panel is open, so it can still be measured */}
        <main
          ref={mainRef}
          className="relative z-10 w-full max-w-[1200px] mx-auto px-6 flex flex-col items-center"
          style={{ visibility: isLandingHidden ? 'hidden' : undefined, zoom: fitZoom }}
        >
          {/* Top layout: Card (Right) + Name (Left) */}
          <div ref={rowRef} className="flex flex-col sm:flex-row-reverse items-center justify-center gap-12 sm:gap-24 w-full">
            {/* Right Col - Card (First in DOM so it stacks on top for mobile) */}
            <div ref={cardWrapperRef} className="flex-shrink-0 z-20">
              <div style={{ opacity: isOriginalCardVisible ? 1 : 0, transition: 'opacity 0ms' }}>
                <IDCard />
              </div>
            </div>

            {/* Left Col - Name (the outer div is never transformed, so it can be measured) */}
            <div ref={nameWrapRef} className="z-20">
            <div 
              ref={nameRef}
              className="flex flex-col items-center sm:items-end z-20"
              style={{
                transition: `transform 800ms ${animState === 'flipping_out' || animState === 'hidden' ? 'cubic-bezier(0.5, 0, 0.2, 1)' : 'cubic-bezier(0.25, 1, 0.5, 1)'}`,
                transform: ['flipping_in', 'expanding', 'open', 'collapsing'].includes(animState) 
                  ? `translate(${nameTransform.x}px, ${nameTransform.y}px)` 
                  : `translate(0px, 0px)`,
                willChange: ['flipping_in', 'flipping_out', 'expanding', 'collapsing'].includes(animState) ? 'transform' : 'auto',
              }}
            >
              <div className="relative w-max" style={{
                transform: ['flipping_in', 'expanding', 'open', 'collapsing'].includes(animState) ? `translateX(-${centerOffsets[0] || 0}px)` : 'translateX(0px)',
                transition: `transform 800ms ${animState === 'flipping_out' || animState === 'hidden' ? 'cubic-bezier(0.5, 0, 0.2, 1)' : 'cubic-bezier(0.25, 1, 0.5, 1)'}`,
                perspective: '1200px'
              }}>
                <div 
                  className="relative preserve-3d cursor-default group"
                  style={{ 
                    animation: 'float-bob 16s ease-in-out infinite',
                    animationPlayState: animState === 'hidden' ? 'running' : 'paused',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.animationPlayState = 'paused';
                    const inner = e.currentTarget.querySelector('.flip-inner-sahil') as HTMLElement;
                    if (inner) inner.style.transform = `rotateX(180deg)`;
                  }}
                  onMouseLeave={(e) => {
                    if (animState === 'hidden') e.currentTarget.style.animationPlayState = 'running';
                    const inner = e.currentTarget.querySelector('.flip-inner-sahil') as HTMLElement;
                    if (inner) inner.style.transform = `rotateX(0deg)`;
                  }}
                >
                  <h1 
                    className="absolute top-[20px] left-0 w-full h-full font-sans font-[800] uppercase text-transparent leading-[0.92] tracking-[-0.02em] pointer-events-none transition-opacity duration-500 group-hover:opacity-10"
                    style={{ 
                      fontSize: "clamp(5rem, 9vw, 9rem)",
                      textShadow: '0 20px 40px rgb(var(--c-shadow)/calc(0.5*var(--shadow)))',
                      transform: 'translateZ(-50px)',
                    }}
                  >
                    SAHIL
                  </h1>

                  <div 
                    className="flip-inner-sahil relative preserve-3d transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ transformOrigin: 'center center' }}
                  >
                    <h1 
                      className="font-sans font-[800] uppercase text-transparent leading-[0.92] tracking-[-0.02em] pointer-events-none"
                      style={{ fontSize: "clamp(5rem, 9vw, 9rem)" }}
                    >
                      SAHIL
                    </h1>

                    <h1 
                      className="absolute inset-0 font-sans font-[800] uppercase text-[rgb(var(--c-text))] leading-[0.92] tracking-[-0.02em] pointer-events-none"
                      style={{ fontSize: "clamp(5rem, 9vw, 9rem)", transform: 'translateZ(0px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                      SAHIL
                    </h1>

                    {/* Back face — visible only when flipped */}
                    <h1 
                      className="absolute inset-0 font-sans font-[800] uppercase leading-[0.92] tracking-[-0.02em] pointer-events-none"
                      style={{
                        fontSize: "clamp(5rem, 9vw, 9rem)",
                        transform: 'rotateX(180deg) translateZ(0px)',
                        color: 'rgb(var(--c-accent-2))',
                        textShadow: '0 0 2px rgb(var(--c-surface)/0.6), 0 0 8px rgb(var(--c-surface)/0.3), 0 2px 4px rgb(var(--c-shadow)/calc(0.3*var(--shadow))), 0 4px 8px rgb(var(--c-shadow)/calc(0.2*var(--shadow))), 0 8px 16px rgb(var(--c-shadow)/calc(0.1*var(--shadow)))',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                    >
                      SAHIL
                    </h1>

                    {[ -4, -20 ].map((z) => (
                      <h1 
                        key={z}
                        className="absolute inset-0 font-sans font-[800] uppercase leading-[0.92] tracking-[-0.02em] pointer-events-none"
                        style={{
                          fontSize: "clamp(5rem, 9vw, 9rem)",
                          transform: `translateZ(${z}px)`,
                          textShadow: '0 0 1px rgb(var(--c-surface)/0.5), 0 2px 4px rgb(var(--c-shadow)/calc(0.25*var(--shadow)))',
                          color: z === -20 ? 'rgb(var(--c-accent-2))' : 'rgb(var(--c-depth))',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        SAHIL
                      </h1>
                    ))}
                    <div className="extra-depth preserve-3d absolute inset-0">
                      {[ -8, -12, -16 ].map((z) => (
                        <h1 
                          key={z}
                          className="absolute inset-0 font-sans font-[800] uppercase leading-[0.92] tracking-[-0.02em] pointer-events-none"
                          style={{
                            fontSize: "clamp(5rem, 9vw, 9rem)",
                            transform: `translateZ(${z}px)`,
                            color: 'rgb(var(--c-depth))',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                          }}
                        >
                          SAHIL
                        </h1>
                      ))}
                    </div>
                    {[4, 8, 12].map((z) => (
                      <h1 
                        key={`b${z}`}
                        className="absolute inset-0 font-sans font-[800] uppercase leading-[0.92] tracking-[-0.02em] pointer-events-none"
                        style={{
                          fontSize: "clamp(5rem, 9vw, 9rem)",
                          transform: `rotateX(180deg) translateZ(-${z}px)`,
                          color: z === 12 ? 'rgb(var(--c-accent-2))' : 'rgb(var(--c-depth))',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        SAHIL
                      </h1>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative w-max" style={{
                transform: ['flipping_in', 'expanding', 'open', 'collapsing'].includes(animState) ? `translateX(-${centerOffsets[1] || 0}px)` : 'translateX(0px)',
                transition: `transform 800ms ${animState === 'flipping_out' || animState === 'hidden' ? 'cubic-bezier(0.5, 0, 0.2, 1)' : 'cubic-bezier(0.25, 1, 0.5, 1)'}`,
                perspective: '1200px'
              }}>
                <div 
                  className="relative preserve-3d cursor-default group"
                  style={{ 
                    animation: 'float-bob-reverse 13.5s ease-in-out infinite',
                    animationPlayState: animState === 'hidden' ? 'running' : 'paused',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.animationPlayState = 'paused';
                    const inner = e.currentTarget.querySelector('.flip-inner-sahran') as HTMLElement;
                    if (inner) inner.style.transform = `rotateX(-180deg)`;
                  }}
                  onMouseLeave={(e) => {
                    if (animState === 'hidden') e.currentTarget.style.animationPlayState = 'running';
                    const inner = e.currentTarget.querySelector('.flip-inner-sahran') as HTMLElement;
                    if (inner) inner.style.transform = `rotateX(0deg)`;
                  }}
                >
                  <h1 
                    className="absolute top-[20px] left-0 w-full h-full font-sans font-[800] uppercase text-transparent leading-[0.92] tracking-[-0.02em] pointer-events-none transition-opacity duration-500 group-hover:opacity-10"
                    style={{ 
                      fontSize: "clamp(5rem, 9vw, 9rem)",
                      textShadow: '0 20px 40px rgb(var(--c-shadow)/calc(0.5*var(--shadow)))',
                      transform: 'translateZ(-50px)',
                    }}
                  >
                    SAHRAN
                  </h1>

                  <div 
                    className="flip-inner-sahran relative preserve-3d transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ transformOrigin: 'center center' }}
                  >
                    <h1 
                      className="font-sans font-[800] uppercase text-transparent leading-[0.92] tracking-[-0.02em] pointer-events-none"
                      style={{ fontSize: "clamp(5rem, 9vw, 9rem)" }}
                    >
                      SAHRAN
                    </h1>

                    <h1 
                      className="absolute inset-0 font-sans font-[800] uppercase text-[rgb(var(--c-text))] leading-[0.92] tracking-[-0.02em] pointer-events-none"
                      style={{ fontSize: "clamp(5rem, 9vw, 9rem)", transform: 'translateZ(0px)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                    >
                      SAHRAN
                    </h1>

                    {/* Back face — visible only when flipped */}
                    <h1 
                      className="absolute inset-0 font-sans font-[800] uppercase leading-[0.92] tracking-[-0.02em] pointer-events-none"
                      style={{
                        fontSize: "clamp(5rem, 9vw, 9rem)",
                        transform: 'rotateX(180deg) translateZ(0px)',
                        color: 'rgb(var(--c-accent-2))',
                        textShadow: '0 0 2px rgb(var(--c-surface)/0.6), 0 0 8px rgb(var(--c-surface)/0.3), 0 2px 4px rgb(var(--c-shadow)/calc(0.3*var(--shadow))), 0 4px 8px rgb(var(--c-shadow)/calc(0.2*var(--shadow))), 0 8px 16px rgb(var(--c-shadow)/calc(0.1*var(--shadow)))',
                        backfaceVisibility: 'hidden',
                        WebkitBackfaceVisibility: 'hidden',
                      }}
                    >
                      SAHRAN
                    </h1>

                    {[ -4, -20 ].map((z) => (
                      <h1 
                        key={z}
                        className="absolute inset-0 font-sans font-[800] uppercase leading-[0.92] tracking-[-0.02em] pointer-events-none"
                        style={{
                          fontSize: "clamp(5rem, 9vw, 9rem)",
                          transform: `translateZ(${z}px)`,
                          textShadow: '0 0 1px rgb(var(--c-surface)/0.5), 0 2px 4px rgb(var(--c-shadow)/calc(0.25*var(--shadow)))',
                          color: z === -20 ? 'rgb(var(--c-accent-2))' : 'rgb(var(--c-depth))',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        SAHRAN
                      </h1>
                    ))}
                    <div className="extra-depth preserve-3d absolute inset-0">
                      {[ -8, -12, -16 ].map((z) => (
                        <h1 
                          key={z}
                          className="absolute inset-0 font-sans font-[800] uppercase leading-[0.92] tracking-[-0.02em] pointer-events-none"
                          style={{
                            fontSize: "clamp(5rem, 9vw, 9rem)",
                            transform: `translateZ(${z}px)`,
                            color: 'rgb(var(--c-depth))',
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                          }}
                        >
                          SAHRAN
                        </h1>
                      ))}
                    </div>
                    {[4, 8, 12].map((z) => (
                      <h1 
                        key={`b${z}`}
                        className="absolute inset-0 font-sans font-[800] uppercase leading-[0.92] tracking-[-0.02em] pointer-events-none"
                        style={{
                          fontSize: "clamp(5rem, 9vw, 9rem)",
                          transform: `rotateX(180deg) translateZ(-${z}px)`,
                          color: z === 12 ? 'rgb(var(--c-accent-2))' : 'rgb(var(--c-depth))',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        SAHRAN
                      </h1>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative w-max mt-4" style={{
                transform: ['flipping_in', 'expanding', 'open', 'collapsing'].includes(animState) ? `translateX(-${centerOffsets[2] || 0}px)` : 'translateX(0px)',
                transition: `transform 800ms ${animState === 'flipping_out' || animState === 'hidden' ? 'cubic-bezier(0.5, 0, 0.2, 1)' : 'cubic-bezier(0.25, 1, 0.5, 1)'}`,
              }}>
                <p className="font-sans font-normal text-[clamp(1rem,1.5vw,1.25rem)] text-[rgb(var(--c-accent-2)/0.7)] tracking-[0.05em]">
                  Electrical Engineering · University of Toronto
                </p>
              </div>
            </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div ref={buttonsRef} className="flex flex-row items-center gap-[16px] mt-16 z-20">
            <FlipButton
              ref={resumeBtnRef}
              wrapperClassName="w-auto h-auto"
              className="btn-flip-primary"
              aria-label="View Resume"
              onClick={() => openPdf('resume')}
              style={{ opacity: (viewerData.type === 'resume' && pdfAnimState !== 'hidden') ? 0 : 1, transition: 'opacity 0ms, transform 250ms ease-in-out' }}
            >
              Resume
            </FlipButton>
            <FlipButton
              ref={transcriptBtnRef}
              wrapperClassName="w-auto h-auto"
              className="btn-flip-primary"
              aria-label="View Transcript"
              onClick={() => openPdf('transcript')}
              style={{ opacity: (viewerData.type === 'transcript' && pdfAnimState !== 'hidden') ? 0 : 1, transition: 'opacity 0ms, transform 250ms ease-in-out' }}
            >
              Transcript
            </FlipButton>
          </div>
        </main>

        {/* Scroll Indicator */}
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer z-20"
          style={{ visibility: isLandingHidden ? 'hidden' : undefined }}
          onClick={goToExperiences}
        >
          <div style={{ animation: "bob 2s ease-in-out infinite" }}>
            <ChevronDown size={20} className="text-[rgb(var(--c-text)/0.5)]" />
          </div>
          <span className="font-sans text-[11px] tracking-[0.12em] uppercase whitespace-nowrap text-[rgb(var(--c-text)/0.3)]">
            Scroll to view Experiences
          </span>
        </div>
      </section>

      {/* EXPERIENCES PANEL SECTION */}
      <ExperiencesPanel 
        onClose={goToLanding} 
        cardRect={cardRect}
        cardZoom={fitZoom}
        animState={animState}
        onOpenViewer={handleOpenCustomViewer}
        viewerOpen={pdfAnimState !== 'hidden'}
      />

      {/* PDF VIEWER OVERLAY */}
      <PDFViewerPanel
        animState={pdfAnimState}
        startRect={pdfStartRect}
        viewerData={viewerData}
        onClose={closePdf}
        onNavigate={navigateViewer}
      />
    </div>
  );
}

export default App;
