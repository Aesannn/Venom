import React, { useEffect, useState, useRef } from 'react';
import { playSound } from '../utils/audio';

export const AetherCursor: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  // Position tracks
  const mouse = useRef({ x: 0, y: 0, vx: 0, vy: 0, lastX: 0, lastY: 0 });
  const dotPos = useRef({ x: 0, y: 0 });
  const ringPos = useRef({ x: 0, y: 0 });

  // Magnetic lock states
  const magnetTarget = useRef<HTMLElement | null>(null);
  const isSnapped = useRef(false);

  // Cursor depth tracking
  const [hoverDepth, setHoverDepth] = useState<'desktop' | 'window' | 'raised'>('desktop');

  useEffect(() => {
    // Hide default system cursor dynamically to let custom seat take precedence
    document.body.style.cursor = 'none';

    // Show custom cursor when mouse starts moving
    const handleMouseEnter = () => setVisible(true);
    const handleMouseLeave = () => setVisible(false);

    const handleMouseMove = (e: MouseEvent) => {
      if (!visible) setVisible(true);

      const m = mouse.current;
      m.x = e.clientX;
      m.y = e.clientY;

      // Calculate velocity vector
      const dx = e.clientX - m.lastX;
      const dy = e.clientY - m.lastY;
      m.vx = dx;
      m.vy = dy;
      m.lastX = e.clientX;
      m.lastY = e.clientY;

      // Scan for active elements depth
      const target = e.target as HTMLElement | null;
      if (target) {
        // Depth-awareness layers
        if (target.closest('.window-frame-container')) {
          setHoverDepth('window');
        } else if (target.closest('button') || target.closest('a') || target.closest('.interactive-raised')) {
          setHoverDepth('raised');
        } else {
          setHoverDepth('desktop');
        }

        // Magnetic Attraction Scanner
        const magneticElement = target.closest('[data-magnetic]') as HTMLElement | null;
        if (magneticElement) {
          if (magnetTarget.current !== magneticElement) {
            magnetTarget.current = magneticElement;
          }
        } else {
          if (magnetTarget.current) {
            // Relieve elastic tug from element
            magnetTarget.current.style.transform = '';
            magnetTarget.current = null;
            isSnapped.current = false;
          }
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('mouseleave', handleMouseLeave);

    // ==========================================
    // PHYSICS SOLVER TICK (requestAnimationFrame)
    // ==========================================
    let animId: number;

    const tick = () => {
      const m = mouse.current;
      const dot = dotRef.current;
      const ring = ringRef.current;

      if (!dot || !ring) {
        animId = requestAnimationFrame(tick);
        return;
      }

      // Smooth decay of velocity values
      m.vx *= 0.88;
      m.vy *= 0.88;

      let targetX = m.x;
      let targetY = m.y;

      if (magnetTarget.current) {
        const rect = magnetTarget.current.getBoundingClientRect();
        const center = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        // Distance from cursor to button center
        const distDX = m.x - center.x;
        const distDY = m.y - center.y;
        const dist = Math.sqrt(distDX * distDX + distDY * distDY);

        if (dist < 48) {
          // Snapped! Lock target coordinates
          targetX = center.x + distDX * 0.15; // Muted elastic drag inside snapping
          targetY = center.y + distDY * 0.15;

          if (!isSnapped.current) {
            // Trigger soft procedural snap chime!
            playSound.click();
            isSnapped.current = true;
          }

          // Apply mutual magnetic warp to the element itself!
          const pullX = distDX * 0.28;
          const pullY = distDY * 0.28;
          magnetTarget.current.style.transform = `translate3d(${pullX}px, ${pullY}px, 0) scale(1.02)`;
          magnetTarget.current.style.transition = 'transform 0.08s ease-out';
        } else {
          // Break snap
          if (isSnapped.current) {
            magnetTarget.current.style.transform = '';
            isSnapped.current = false;
          }
        }
      }

      // 1. Core Pointer Dot: Higher-speed immediate tracking with spring offset
      dotPos.current.x += (targetX - dotPos.current.x) * 0.45;
      dotPos.current.y += (targetY - dotPos.current.y) * 0.45;

      // 2. Surrounding Parallax Ring: Slower drift with inertial lag
      ringPos.current.x += (targetX - ringPos.current.x) * 0.18;
      ringPos.current.y += (targetY - ringPos.current.y) * 0.18;

      // Render physical transform matrices
      dot.style.transform = `translate3d(${dotPos.current.x - 3}px, ${dotPos.current.y - 3}px, 0)`;

      // Dynamic stretch calculation: preserve total volume/mass
      const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
      const stretch = Math.min(1 + speed * 0.025, 1.8);
      const scaleX = stretch;
      const scaleY = 1 / Math.sqrt(stretch); // volume conservation
      const angle = Math.atan2(m.vy, m.vx) * (180 / Math.PI);

      // Render outer ring with physical constraints
      ring.style.transform = `translate3d(${ringPos.current.x - 14}px, ${ringPos.current.y - 14}px, 0) rotate(${angle}deg) scale(${scaleX}, ${scaleY})`;

      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.body.style.cursor = 'default';
    };
  }, [visible]);

  if (!visible) return null;

  // Custom depth classes
  const depthDotStyles = {
    desktop: 'bg-cyan-400/90 shadow-[0_0_8px_rgba(34,211,238,0.45)]',
    window: 'bg-white/95 shadow-[0_0_8px_rgba(255,255,255,0.6)]',
    raised: 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)] scale-110',
  };

  const depthRingStyles = {
    desktop: 'border-cyan-500/25 bg-cyan-500/[0.02]',
    window: 'border-white/30 bg-white/[0.02]',
    raised: 'border-emerald-400/50 bg-emerald-500/[0.04] w-[34px] h-[34px] -left-1 -top-1',
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-[99999] overflow-hidden">
      {/* 1. Core Pointer Dot */}
      <div
        ref={dotRef}
        className={`fixed w-1.5 h-1.5 rounded-full transition-colors duration-300 ease-out ${depthDotStyles[hoverDepth]}`}
        style={{ willChange: 'transform' }}
      />
      {/* 2. Surrounding Elastic Parallax Ring */}
      <div
        ref={ringRef}
        className={`fixed w-7 h-7 rounded-full border border-dashed transition-all duration-300 ease-out ${depthRingStyles[hoverDepth]}`}
        style={{ willChange: 'transform, width, height, left, top' }}
      />
    </div>
  );
};
