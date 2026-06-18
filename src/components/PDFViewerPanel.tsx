import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import type { PdfAnimState } from "../App";

interface PDFViewerPanelProps {
  animState: PdfAnimState;
  startRect: DOMRect | null;
  title: string;
  fileUrl: string;
  onClose: () => void;
}

export function PDFViewerPanel({ animState, startRect, title, fileUrl, onClose }: PDFViewerPanelProps) {
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (animState !== 'hidden') {
      const raf = requestAnimationFrame(() => {
        setMounted(true);
      });
      return () => cancelAnimationFrame(raf);
    } else {
      setMounted(false);
    }
  }, [animState]);

  if (!startRect || animState === 'hidden') return null;

  const isMobile = windowSize.w < 640;
  const targetWidth = isMobile ? windowSize.w * 0.95 : Math.min(1000, windowSize.w * 0.85);
  const targetHeight = isMobile ? windowSize.h * 0.9 : Math.min(900, windowSize.h * 0.85);

  const startX = startRect.left;
  const startY = startRect.top;
  const startW = startRect.width;
  const startH = startRect.height;

  const btnCenterX = startX + startW / 2;
  const btnCenterY = startY + startH / 2;
  const screenCenterX = windowSize.w / 2;
  const screenCenterY = windowSize.h / 2;

  const offsetXBtn = btnCenterX - screenCenterX;
  const offsetYBtn = btnCenterY - screenCenterY;

  const getWrapperStyle = (): React.CSSProperties => {
    let offsetX = offsetXBtn;
    let offsetY = offsetYBtn;
    let w = startW;
    let h = startH;
    let opacity = 1;
    let transitionDuration = '800ms';
    let easing = 'cubic-bezier(0.25, 1, 0.5, 1)';

    if (!mounted) {
      return {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: w,
        height: h,
        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
        opacity: 1, // Start fully visible, covering the real button
        transformOrigin: 'center center',
        perspective: '1200px',
        zIndex: 100,
        borderRadius: '10px',
      };
    }

    switch (animState) {
      case 'flipping_in':
        offsetX = 0;
        offsetY = 0;
        transitionDuration = '800ms';
        easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
        break;
      case 'expanding':
      case 'open':
        offsetX = 0;
        offsetY = 0;
        w = targetWidth;
        h = targetHeight;
        transitionDuration = '600ms';
        easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
        break;
      case 'collapsing':
        offsetX = 0;
        offsetY = 0;
        w = startW;
        h = startH;
        transitionDuration = '600ms';
        easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
        break;
      case 'flipping_out':
        offsetX = offsetXBtn;
        offsetY = offsetYBtn;
        transitionDuration = '800ms';
        easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
        break;
    }

    return {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: w,
      height: h,
      transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`,
      transition: `all ${transitionDuration} ${easing}`,
      opacity,
      transformOrigin: 'center center',
      perspective: '1200px',
      zIndex: 100,
      borderRadius: '10px',
    };
  };

  const getFlipperStyle = (): React.CSSProperties => {
    if (!mounted) {
      return {
        transform: `rotateX(0deg)`,
        transformStyle: 'preserve-3d',
      };
    }

    const isExpanding = ['expanding', 'open', 'collapsing'].includes(animState);
    const transitionDuration = isExpanding ? '600ms' : (['flipping_in', 'flipping_out'].includes(animState) ? '800ms' : '0ms');
    let easing = 'cubic-bezier(0.4, 0, 0.2, 1)';
    if (isExpanding) easing = 'cubic-bezier(0.76, 0, 0.24, 1)';

    return {
      transform: `rotateX(${['flipping_in', 'expanding', 'open', 'collapsing'].includes(animState) ? 180 : 0}deg)`,
      transition: `transform ${transitionDuration} ${easing}`,
      transformStyle: 'preserve-3d',
    };
  };

  const isModalOpen = animState === 'open';

  // Dynamic shadow that grows when moving to the center — matches FlipButton multi-layer style
  const faceShadow = ['hidden', 'flipping_out', 'collapsing'].includes(animState)
    ? '0 20px 40px -10px rgba(0,0,0,0.7), 0 8px 16px -4px rgba(0,0,0,0.5), 0 0 0 1px rgba(196,238,240,0.05)'
    : '0 30px 60px -10px rgba(0,0,0,0.9), 0 12px 24px -6px rgba(0,0,0,0.7), 0 0 0 2px rgba(196,238,240,0.1)';

  return (
    <div style={getWrapperStyle()} className="pointer-events-none">
      <div 
        className="relative w-full h-full pointer-events-auto"
        style={getFlipperStyle()}
      >
        {/* FRONT FACE (Button Clone) - Starts Blue because it was hovered */}
        <div 
          className="absolute inset-0 flex items-center justify-center bg-[#A4C6D3] text-[#262C31] rounded-[10px]"
          style={{ 
            backfaceVisibility: 'hidden', 
            WebkitBackfaceVisibility: 'hidden',
            boxShadow: faceShadow,
            opacity: ['expanding', 'open', 'collapsing'].includes(animState) ? 0 : 1,
            transition: 'opacity 200ms ease, box-shadow 800ms ease',
          }}
        >
          <span className="font-sans text-[14px] font-semibold tracking-[0.06em]">
            {title}
          </span>
        </div>

        {/* BACK FACE (Blank / Modal Container) - Main Background Color */}
        <div 
          className="absolute inset-0 bg-[#2E353B] rounded-[10px] overflow-hidden flex flex-col border border-[rgba(54,62,69,0.8)]"
          style={{ 
            backfaceVisibility: 'hidden', 
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateX(180deg)',
            boxShadow: faceShadow,
            transition: 'box-shadow 800ms ease',
          }}
        >
          {/* Top Bar - only visible when expanding/open */}
          <div 
            className="flex items-center justify-between px-4 py-3 shrink-0 transition-opacity duration-300 border-b border-[rgba(54,62,69,0.4)]"
            style={{ opacity: isModalOpen ? 1 : 0 }}
          >
            <span className="font-sans font-bold text-[#D2DCE5] text-[15px] uppercase tracking-wider">
              {title}
            </span>
            <div className="flex items-center gap-3">
              <a 
                href={fileUrl}
                download
                className="btn-icon w-8 h-8 text-[#D2DCE5] hover:text-[#C4EEF0] hover:bg-[rgba(196,238,240,0.06)]"
                aria-label="Download PDF"
              >
                <Download size={18} />
              </a>
              <button 
                onClick={onClose}
                className="btn-icon w-8 h-8 text-[#D2DCE5] hover:text-[#C4EEF0] hover:bg-[rgba(196,238,240,0.06)]"
                aria-label="Close PDF"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div 
            className="flex-1 w-full bg-[#2E353B] transition-opacity duration-500 delay-100"
            style={{ opacity: isModalOpen ? 1 : 0 }}
          >
            {isModalOpen && (
              <iframe 
                src={`${fileUrl}#toolbar=0`} 
                className="w-full h-full border-none"
                title={title}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
