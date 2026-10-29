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

// Scrolling past either end of the list stretches it like a rubber band (Apple's
// rubber-band curve), and it springs back the moment they let go. Pulling the list far
// enough down past the top leaves the page, but only with a scroll that started at the
// top: trackpad coasting and scrolls that began further down can't do it
const RUBBER_COEFF = 0.55;         // Apple UIScrollView rubber-band resistance
const EXIT_THRESHOLD = 110;        // px the list must visibly stretch down to leave the page
const MAX_BOTTOM_STRETCH = 35;     // px the list can stretch up past the bottom
const TRACKPAD_STEP_MAX = 60;      // px of pull one trackpad event can add, so it's about distance, not speed
const WHEEL_NOTCH_PULL = 62;       // px of pull one mouse-wheel notch adds
const FOLLOW_MS = 30;              // how quickly the stretch catches up with the pull
const MAX_RISE = 0.5;              // px/ms; however hard they swipe, leaving takes a visible pull
const SPRING_K = 320;              // spring-back stiffness
const SPRING_C = 32;               // spring-back damping
const RELEASE_IDLE_MS = 90;        // without a finger-up signal, this much silence means they let go
const GESTURE_GAP_MS = 200;        // a pause this long between wheel events starts a new gesture

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
  const listContentRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // The band: pull is the scrolling taken past the edge (+ top, - bottom), shown is how
  // far the list is drawn stretched
  const stretch = useRef({
    pull: 0,
    shown: 0,
    velocity: 0,     // px/s, while springing back
    frame: 0,        // rAF handle
    lastTime: 0,
    mode: 'idle' as 'idle' | 'pulling' | 'returning',
    canLeave: false,
    releaseTimer: null as ReturnType<typeof setTimeout> | null,
  });
  // The wheel gesture in progress (see readGesture)
  const gesture = useRef({
    last: 0,
    lastSize: 0,
    startedAtTop: false,
    momentum: false,
    liftedFinger: false,
    coasted: 0,           // coasting events since the finger lifted
    sendsFingerUp: false, // this touchpad reports finger lifts (Windows precision touchpads)
    dir: 0,
    merged: [] as number[][],
    mergedAt: 0,
    velocity: 0,
    decels: [] as number[],
  });
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

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

  const getDimension = () => listRef.current?.clientHeight || window.innerHeight || 800;

  // Apple UIScrollView rubber-band resistance formula
  const rubberBand = (rawPx: number, dimension: number) => {
    const sign = Math.sign(rawPx);
    const abs = Math.abs(rawPx);
    return sign * dimension * (1 - 1 / ((abs * RUBBER_COEFF) / dimension + 1));
  };

  // Inverse rubber-band mapping: calculates raw scroll travel from visible stretch
  const pullFor = (stretchPx: number, dimension: number) => {
    const sign = Math.sign(stretchPx);
    const abs = Math.min(Math.abs(stretchPx), dimension * 0.95);
    return sign * (dimension / RUBBER_COEFF) * (1 / (1 - abs / dimension) - 1);
  };

  const drawStretch = (y: number) => {
    const content = listContentRef.current;
    if (content) {
      content.style.transform = y ? `translate3d(0, ${y}px, 0)` : '';
    }
    const hint = hintRef.current;
    if (hint) {
      if (y > 0) {
        const progress = Math.min(y / EXIT_THRESHOLD, 1);
        hint.style.transform = `translate3d(0, ${y * 0.4}px, 0) scale(${1 + 0.3 * progress})`;
        hint.style.color = `rgb(var(--c-text) / ${0.25 + 0.75 * progress})`;
      } else {
        hint.style.transform = '';
        hint.style.color = '';
      }
    }
  };

  const resetStretch = () => {
    const st = stretch.current;
    cancelAnimationFrame(st.frame);
    if (st.releaseTimer) clearTimeout(st.releaseTimer);
    Object.assign(st, { pull: 0, shown: 0, velocity: 0, frame: 0, mode: 'idle', releaseTimer: null });
    drawStretch(0);
    if (listContentRef.current) listContentRef.current.style.willChange = '';
  };

  // One loop drives the stretch: while pulling it eases toward the pull (so separate
  // wheel notches blend into one motion); once released it springs back to 0
  const runStretch = () => {
    const st = stretch.current;
    if (st.frame) return;
    st.lastTime = performance.now();
    if (listContentRef.current) listContentRef.current.style.willChange = 'transform';
    const step = (now: number) => {
      const dtMs = Math.min(now - st.lastTime, 32);
      st.lastTime = now;
      const dim = getDimension();
      if (st.mode === 'pulling') {
        const target = rubberBand(st.pull, dim);
        st.shown += Math.min((target - st.shown) * (1 - Math.exp(-dtMs / FOLLOW_MS)), MAX_RISE * dtMs);
        if (st.canLeave && st.shown >= EXIT_THRESHOLD) {
          resetStretch();
          onCloseRef.current();
          return;
        }
      } else {
        // Damped spring back to 0: F = -k*x - c*v
        const dt = dtMs / 1000;
        st.velocity += (-SPRING_K * st.shown - SPRING_C * st.velocity) * dt;
        st.shown += st.velocity * dt;
        st.pull = pullFor(st.shown, dim);
        if (Math.abs(st.shown) < 0.3 && Math.abs(st.velocity) < 15) {
          resetStretch();
          return;
        }
      }
      drawStretch(st.shown);
      st.frame = requestAnimationFrame(step);
    };
    st.frame = requestAnimationFrame(step);
  };

  // They let go: spring back from wherever the list is now. If they already pulled far
  // enough (a quick swipe can get there before the stretch catches up), let the stretch
  // finish playing out and leave instead
  const releaseStretch = () => {
    const st = stretch.current;
    if (st.releaseTimer) clearTimeout(st.releaseTimer);
    st.releaseTimer = null;
    if (st.mode !== 'pulling') return;
    if (st.canLeave && st.pull > 0 && rubberBand(st.pull, getDimension()) >= EXIT_THRESHOLD) return;
    st.mode = 'returning';
    st.velocity = 0;
    runStretch();
  };

  // Move the band by px of pull (+ stretches past the top, - past the bottom)
  const pullStretch = (px: number) => {
    const st = stretch.current;
    const dim = getDimension();
    if (st.mode === 'returning') st.velocity = 0;
    st.mode = 'pulling';
    const wasTop = st.pull > 0 || (st.pull === 0 && px > 0);
    st.pull += px;
    if (wasTop) {
      // A scroll that started down in the list can stretch the band but never break it
      st.pull = Math.max(0, Math.min(st.pull, st.canLeave ? Infinity : pullFor(EXIT_THRESHOLD * 0.8, dim)));
    } else {
      st.pull = Math.min(0, Math.max(st.pull, pullFor(-MAX_BOTTOM_STRETCH, dim)));
    }
    // Without a finger-up signal (mouse wheels, Macs), a short silence means they let go
    if (st.releaseTimer) clearTimeout(st.releaseTimer);
    st.releaseTimer = setTimeout(releaseStretch, RELEASE_IDLE_MS);
    runStretch();
  };

  const wheelPx = (e: WheelEvent) =>
    e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;

  // Works out what each wheel event is, the way the wheel-gestures library does:
  // - a new gesture starts after a pause, or when a strong push interrupts coasting
  // - Windows precision touchpads send an empty event the moment the finger lifts, and
  //   everything after it is coasting until a pause or a clearly new swipe (coasting
  //   often starts bigger than the last finger movement, so the first few don't count)
  // - elsewhere, a steady deceleration means coasting. A touchpad that sends finger-up
  //   events doesn't need this guess, and slowing down mid-swipe would trip it
  // - coasting never changes direction, so a reversal is always the finger
  // Coasting (momentum) only ever scrolls the list, never pulls the band
  const readGesture = (e: WheelEvent, dy: number, list: HTMLElement) => {
    const g = gesture.current;
    const now = performance.now();
    const size = Math.abs(dy);
    const newGesture = () => {
      Object.assign(g, { momentum: false, liftedFinger: false, coasted: 0, merged: [] as number[][], mergedAt: 0, velocity: 0, decels: [] as number[] });
      g.startedAtTop = list.scrollTop <= 0;
    };
    const gap = now - g.last;
    const dir = Math.sign(dy);
    if (gap > GESTURE_GAP_MS || (g.liftedFinger && gap > 100)) newGesture();
    else if (dir && g.dir && dir !== g.dir) newGesture();
    else if (g.momentum && !g.liftedFinger && size > Math.max(2, g.lastSize * 2)) newGesture();
    // A swipe that interrupts coasting jumps well above the shrinking coasting deltas
    else if (g.liftedFinger && g.coasted >= 3 && size >= 4 && size > g.lastSize * 2.5) newGesture();
    g.last = now;

    const fingerUp = e.deltaY === 0 && e.deltaX === 0;
    if (fingerUp) {
      g.momentum = true;
      g.liftedFinger = true;
      g.sendsFingerUp = true;
      return { fingerUp, isNotch: false };
    }
    if (dir) g.dir = dir;
    if (g.liftedFinger) g.coasted++;
    // A mouse wheel notch: a whole multiple of the browser's notch size
    const notch = 100 * (window.devicePixelRatio || 1);
    const isNotch = e.deltaMode === 1 || (size >= 50 && (size % notch === 0 || size % 120 === 0));
    g.lastSize = size;

    // Merge events in pairs, then compare speeds: three decelerations in a row in the
    // range real coasting uses (each pair 4% to 40% slower) means momentum
    g.merged.push([size, now]);
    if (g.merged.length === 2) {
      const t = (g.merged[0][1] + g.merged[1][1]) / 2;
      const sum = g.merged[0][0] + g.merged[1][0];
      if (g.mergedAt && t > g.mergedAt) {
        const v = sum / (t - g.mergedAt);
        if (g.velocity) g.decels = [...g.decels.slice(-2), v / g.velocity];
        g.velocity = v;
      }
      g.mergedAt = t;
      g.merged = [];
      if (!isNotch && !g.sendsFingerUp && g.decels.length === 3 && g.decels.every((f) => f >= 0.6 && f <= 0.96)) g.momentum = true;
    }
    return { fingerUp, isNotch };
  };

  // A native (non-passive) listener, so the list can be held still while the band is
  // stretched, the way native overscroll works
  const handleWheel = (e: WheelEvent) => {
    const list = listRef.current;
    if (!list || sidebarAnimState !== 'hidden' || prevSidebarAnimState !== 'hidden') return;
    // Sub-scrollers (e.g. dropdown menus) handle their own scrolling
    const otherScroller = (e.target as Element).closest?.('.overflow-y-auto');
    if (otherScroller && otherScroller !== list) return;

    const st = stretch.current;
    const dy = wheelPx(e);
    const { fingerUp, isNotch } = readGesture(e, dy, list);
    const stretched = st.mode !== 'idle';

    if (fingerUp || gesture.current.momentum) {
      if (stretched) {
        e.preventDefault();
        releaseStretch();
      }
      return;
    }

    // Distance, not speed: each event can only pull so far
    const step = isNotch ? WHEEL_NOTCH_PULL * Math.sign(dy) : Math.sign(dy) * Math.min(Math.abs(dy), TRACKPAD_STEP_MAX);

    // While stretched, scrolling back the other way relaxes the band first
    if ((st.pull > 0 && dy > 0) || (st.pull < 0 && dy < 0)) {
      e.preventDefault();
      const relaxed = st.pull - step;
      pullStretch(Math.sign(st.pull) === Math.sign(relaxed) ? -step : -st.pull);
      return;
    }

    const atTop = list.scrollTop <= 0;
    const atBottom = list.scrollTop >= list.scrollHeight - list.clientHeight - 1;
    if (dy < 0 && (atTop || st.pull > 0)) {
      e.preventDefault();
      if (st.pull <= 0) st.canLeave = gesture.current.startedAtTop;
      pullStretch(-step);
    } else if (dy > 0 && list.contains(e.target as Node) && (atBottom || st.pull < 0)) {
      e.preventDefault();
      pullStretch(-step * 0.4);
    }
  };
  const handleWheelRef = useRef(handleWheel);
  handleWheelRef.current = handleWheel;

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onWheel = (e: WheelEvent) => handleWheelRef.current(e);
    panel.addEventListener('wheel', onWheel, { passive: false });
    return () => panel.removeEventListener('wheel', onWheel);
  }, []);

  // Touch: the band follows the finger and springs back when it lifts
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let lastY = 0;
    let tracking = false;

    const onTouchStart = (e: TouchEvent) => {
      if (sidebarAnimState !== 'hidden' || prevSidebarAnimState !== 'hidden' || e.touches.length !== 1) return;
      lastY = e.touches[0].clientY;
      tracking = true;
      stretch.current.canLeave = list.scrollTop <= 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tracking || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = y - lastY;
      lastY = y;
      const st = stretch.current;
      const atTop = list.scrollTop <= 0;
      const atBottom = list.scrollTop >= list.scrollHeight - list.clientHeight - 1;
      if ((atTop && dy > 0) || st.pull > 0) {
        if (e.cancelable) e.preventDefault();
        pullStretch(st.pull + dy > 0 ? dy : -st.pull);
      } else if ((atBottom && dy < 0) || st.pull < 0) {
        if (e.cancelable) e.preventDefault();
        pullStretch(st.pull + dy < 0 ? dy : -st.pull);
      }
      // The finger is still down, so don't let the idle timer release the band
      if (st.releaseTimer) clearTimeout(st.releaseTimer);
      st.releaseTimer = null;
    };
    const onTouchEnd = () => {
      if (!tracking) return;
      tracking = false;
      releaseStretch();
    };

    list.addEventListener('touchstart', onTouchStart, { passive: true });
    list.addEventListener('touchmove', onTouchMove, { passive: false });
    list.addEventListener('touchend', onTouchEnd, { passive: true });
    list.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      list.removeEventListener('touchstart', onTouchStart);
      list.removeEventListener('touchmove', onTouchMove);
      list.removeEventListener('touchend', onTouchEnd);
      list.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [sidebarAnimState, prevSidebarAnimState]);

  useEffect(() => {
    const st = stretch.current;
    return () => {
      cancelAnimationFrame(st.frame);
      if (st.releaseTimer) clearTimeout(st.releaseTimer);
    };
  }, []);

  useEffect(() => {
    if (animState === 'hidden') {
      clearTimers();
      resetStretch();
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
          boxShadow: "0 0 0 rgb(var(--c-shadow)/calc(0*var(--shadow)))",
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
          boxShadow: "0 60px 120px -20px rgb(var(--c-shadow)/calc(0.9*var(--shadow))), 0 20px 40px rgb(var(--c-shadow)/calc(0.6*var(--shadow)))",
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
          boxShadow: "0 60px 120px -20px rgb(var(--c-shadow)/calc(0.9*var(--shadow))), 0 20px 40px rgb(var(--c-shadow)/calc(0.6*var(--shadow)))",
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
          boxShadow: "0 0 0 rgb(var(--c-shadow)/calc(0*var(--shadow)))",
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
        className="absolute inset-0 backface-hidden bg-[rgb(var(--c-bg))] overflow-hidden"
        style={{ 
          transform: 'rotateY(180deg)',
          borderRadius: animState === 'expanding' || animState === 'open' ? '0' : '16px',
          transition: "border-radius 400ms cubic-bezier(0.76, 0, 0.24, 1)"
        }}
        ref={panelRef}
      >
        {/* Static Shadow Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[inherit]"
          style={{ 
            zIndex: 0,
            background: 'radial-gradient(ellipse at 50% 150%, rgb(var(--c-deep)/calc(0.45*var(--shade))) 0%, transparent 60%)',
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
                "bg-[rgb(var(--c-bg)/0.5)] backdrop-blur-[12px] border-b border-[rgb(var(--c-border)/0.8)]",
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
            <h2 className="hidden min-[440px]:block truncate font-sans text-[18px] font-bold text-[rgb(var(--c-text))]">Experiences</h2>
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

            <div className="hidden sm:block w-[1px] h-6 bg-[rgb(var(--c-border)/0.8)] mx-2" />

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
          <span
            ref={hintRef}
            className="inline-block origin-top font-sans text-[10px] tracking-[0.14em] uppercase text-[rgb(var(--c-text)/0.2)]"
          >
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
              style={{ overscrollBehaviorY: 'contain' }}
            >
              <div ref={listContentRef} className="w-full">
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
