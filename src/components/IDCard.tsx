import { useEffect, useRef, useState } from "react";
import photoPng from "@/assets/photo.png";

interface IDCardProps {
  photoSrc?: string;
  interactive?: boolean;
}

export function IDCard({ photoSrc = photoPng, interactive = true }: IDCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const frontFaceRef = useRef<HTMLDivElement>(null);

  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!interactive) return;

    const card = cardRef.current;
    const frontFace = frontFaceRef.current;
    if (!card || !frontFace) return;

    let currentRotX = 0;
    let currentRotY = 0;
    let targetRotX = 0;
    let targetRotY = 0;
    let animationFrameId: number;

    const lerp = (start: number, end: number, amt: number) => {
      return (1 - amt) * start + amt * end;
    };

    const updateRotation = () => {
      currentRotX = lerp(currentRotX, targetRotX, 0.07);
      currentRotY = lerp(currentRotY, targetRotY, 0.07);

      card.style.transform = `rotateX(${currentRotX}deg) rotateY(${currentRotY}deg)`;
      
      animationFrameId = requestAnimationFrame(updateRotation);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Calculate target rotation clamped
      const percentX = (mouseX - centerX) / (rect.width / 2);
      const percentY = (mouseY - centerY) / (rect.height / 2);
      
      targetRotY = Math.max(Math.min(percentX * 10, 10), -10);
      targetRotX = Math.max(Math.min(percentY * -14, 14), -14); // Invert Y for correct tilt

      // Update sheen position
      // Position is relative to frontFace top-left
      const frontRect = frontFace.getBoundingClientRect();
      const frontX = e.clientX - frontRect.left;
      const frontY = e.clientY - frontRect.top;
      frontFace.style.setProperty('--mouse-x', `${frontX}px`);
      frontFace.style.setProperty('--mouse-y', `${frontY}px`);
    };

    const handleMouseLeave = () => {
      targetRotX = 0;
      targetRotY = 0;
      frontFace.style.setProperty('--mouse-x', `50%`);
      frontFace.style.setProperty('--mouse-y', `50%`);
    };

    // We can track mouse movement over the container or the card itself.
    // Tracking over the card's parent container makes the interaction broader.
    const container = card.parentElement;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    animationFrameId = requestAnimationFrame(updateRotation);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  return (
    <div style={{ perspective: "1200px" }} className="w-[240px] h-[336px] sm:w-[340px] sm:h-[476px] mx-auto group">
      <div
        ref={cardRef}
        className="w-full h-full relative preserve-3d will-change-transform rounded-[16px]"
        style={{
          boxShadow: `
            0 30px 60px -15px rgba(0, 0, 0, 0.7),
            0 10px 20px -8px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(196, 238, 240, 0.06)
          `
        }}
      >
        {/* Inner layers for 3D thickness */}
        {[-2, -1, 0, 1].map((offset) => (
          <div
            key={offset}
            className="absolute inset-0 rounded-[16px]"
            style={{
              transform: `translateZ(${offset}px)`,
              background: "#4B6376",
              border: "1px solid rgba(75, 99, 118, 0.8)",
            }}
          />
        ))}

        {/* Front Face */}
        <div
          ref={frontFaceRef}
          className="absolute inset-0 rounded-[16px] overflow-hidden bg-[linear-gradient(160deg,#2E353B_0%,#262C31_100%)] border border-[rgba(196,238,240,0.1)] preserve-3d"
          style={{ transform: "translateZ(2px)" }}
        >
          {/* Dynamic Sheen */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: `radial-gradient(
                400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                rgba(196, 238, 240, 0.07) 0%,
                transparent 60%
              )`
            }}
          />

          {/* Grain Texture */}
          <div
            className="absolute inset-0 z-[9] pointer-events-none opacity-[0.04] mix-blend-overlay"
            style={{
              backgroundImage: "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")"
            }}
          />

          {/* Name Row */}
          <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-20">
            <div
              className="text-[12px] tracking-[0.2em] font-semibold text-[rgba(196,238,240,0.7)] uppercase font-sans"
            >
              Sahil Sahran
            </div>
            <div className="w-8 h-8 rounded-full border border-[rgba(196,238,240,0.2)] flex items-center justify-center font-sans">
              <span className="text-[8px] text-[rgba(196,238,240,0.7)] font-semibold tracking-wider">SS</span>
            </div>
          </div>

          {/* Photo Area */}
          <div className="absolute top-0 left-0 right-0 h-[60%] z-[5]">
            {!hasError && photoSrc ? (
              <img
                src={photoSrc}
                alt="Sahil Sahran"
                className="w-full h-full object-cover object-[top_center] grayscale"
                onError={() => setHasError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[80px] font-[800] text-[rgba(196,238,240,0.15)] font-sans">SS</span>
              </div>
            )}
            {/* Color Tint Overlay */}
            <div className="absolute inset-0 mix-blend-multiply bg-[rgba(75,99,118,0.5)] pointer-events-none" />
            <div className="absolute inset-0 bg-[#262C31]/20 pointer-events-none" />
            {/* Bottom Gradient Fade */}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_60%,#262C31_100%)] pointer-events-none" />
          </div>

          {/* Bio Text Area */}
          <div className="absolute bottom-0 left-0 right-0 h-[24%] px-5 pb-4 flex flex-col justify-end z-20">
            <p className="text-[13px] leading-[1.6] text-[rgba(210,220,229,0.75)] font-sans">
              Software developer & designer building thoughtful interfaces.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
