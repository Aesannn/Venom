import React, { useEffect, useRef } from 'react';
import { useSystemState } from '../store/systemStore';

export const CanvasWallpaper: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useSystemState();
  const wallpaper = state.wallpaper || 'particles';

  // Smooth mouse interpolation refs (Organic fluid tracking with LERP)
  const mouseRef = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
    tx: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    ty: typeof window !== 'undefined' ? window.innerHeight / 2 : 0
  });

  // Track state in refs for latency-free canvas rendering loop access
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Smoothly interpolated colors to cross-fade between themes, workspaces, and AI states
  const currentColorsRef = useRef({
    r: 59, g: 130, b: 246,    // Base accent (starts at cyan/blue)
    ar: 79, ag: 70, ab: 229,  // Secondary ambient wash
    br: 113, bg: 113, bb: 122 // Tertiary ambient accent
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.tx = e.clientX;
      mouseRef.current.ty = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Map themes and workspaces to rich, premium HSL/RGB targets
    const getTargetColors = () => {
      const activeState = stateRef.current;
      const currentTheme = activeState.theme;
      const ws = activeState.activeWorkspace || 'dev';
      const ai = activeState.isAiThinking;

      // Base accent colors
      let baseAcc = { r: 59, g: 130, b: 246 }; // cyan / default
      if (currentTheme === 'purple') baseAcc = { r: 139, g: 92, b: 246 };
      else if (currentTheme === 'green') baseAcc = { r: 16, g: 185, b: 129 };
      else if (currentTheme === 'orange') baseAcc = { r: 245, g: 158, b: 11 };

      // Secondary ambient color based on active workspace (spatial composition)
      let secAmb = { r: 79, g: 70, b: 229 }; // Indigo base
      if (ws === 'media') secAmb = { r: 13, g: 148, b: 136 }; // Teal
      else if (ws === 'sys') secAmb = { r: 71, g: 85, b: 105 }; // Slate gray

      // Tertiary color based on active workspace
      let tertColor = { r: 113, g: 113, b: 122 }; // Zinc base
      if (ws === 'media') tertColor = { r: 6, g: 95, b: 70 }; // Emerald deep
      else if (ws === 'sys') tertColor = { r: 39, g: 39, b: 42 }; // Graphite

      // AI Native emotional lighting override: blend in a breathing royal indigo/vibrant magenta glow
      if (ai) {
        secAmb = { r: 219, g: 39, b: 119 }; // Vibrant pink/magenta
        tertColor = { r: 99, g: 102, b: 241 }; // Bright indigo
      }

      return { baseAcc, secAmb, tertColor };
    };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // ==========================================
    // DATA CONFIG FOR STATIC MODES (Stars & Dots)
    // ==========================================
    const dotSpacing = 40;
    const starCount = 90;
    const stars: Array<{ x: number; y: number; size: number; phase: number; speed: number }> = [];
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 0.7 + 0.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.003 + Math.random() * 0.007
      });
    }

    let shootingStar: { x: number; y: number; dx: number; dy: number; len: number; opacity: number } | null = null;

    // Dynamic gradient mesh points (Mode 1)
    const meshPoints = [
      { x: width * 0.2, y: height * 0.3, tx: width * 0.2, ty: height * 0.3, radius: Math.max(width, height) * 0.65, speed: 0.0006 },
      { x: width * 0.8, y: height * 0.7, tx: width * 0.8, ty: height * 0.7, radius: Math.max(width, height) * 0.75, speed: 0.0004 },
      { x: width * 0.5, y: height * 0.4, tx: width * 0.5, ty: height * 0.4, radius: Math.max(width, height) * 0.55, speed: 0.0005 }
    ];

    let time = 0;

    // ==========================================
    // MAIN RENDER LOOP
    // ==========================================
    const animate = () => {
      time += 0.4;
      
      const targets = getTargetColors();

      // Buttery-smooth linear color interpolation (LERP factor 0.025)
      currentColorsRef.current.r += (targets.baseAcc.r - currentColorsRef.current.r) * 0.025;
      currentColorsRef.current.g += (targets.baseAcc.g - currentColorsRef.current.g) * 0.025;
      currentColorsRef.current.b += (targets.baseAcc.b - currentColorsRef.current.b) * 0.025;

      currentColorsRef.current.ar += (targets.secAmb.r - currentColorsRef.current.ar) * 0.025;
      currentColorsRef.current.ag += (targets.secAmb.g - currentColorsRef.current.ag) * 0.025;
      currentColorsRef.current.ab += (targets.secAmb.b - currentColorsRef.current.ab) * 0.025;

      currentColorsRef.current.br += (targets.tertColor.r - currentColorsRef.current.br) * 0.025;
      currentColorsRef.current.bg += (targets.tertColor.g - currentColorsRef.current.bg) * 0.025;
      currentColorsRef.current.bb += (targets.tertColor.b - currentColorsRef.current.bb) * 0.025;

      const themeColor = {
        r: Math.round(currentColorsRef.current.r),
        g: Math.round(currentColorsRef.current.g),
        b: Math.round(currentColorsRef.current.b)
      };

      const secondaryColor = {
        r: Math.round(currentColorsRef.current.ar),
        g: Math.round(currentColorsRef.current.ag),
        b: Math.round(currentColorsRef.current.ab)
      };

      const tertiaryColor = {
        r: Math.round(currentColorsRef.current.br),
        g: Math.round(currentColorsRef.current.bg),
        b: Math.round(currentColorsRef.current.bb)
      };

      // Smooth lag-lerp for cursor spotlight and spatial parallax values
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.07;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.07;

      // Apply highly refined hardware-accelerated 3D spatial parallax scrolling
      canvas.style.transform = `translate3d(${(mouseRef.current.x - width / 2) * -0.012}px, ${(mouseRef.current.y - height / 2) * -0.012}px, 0) scale(1.025)`;
      
      // Draw background base color (Extremely deep luxurious matte black)
      ctx.fillStyle = '#08080a';
      ctx.fillRect(0, 0, width, height);

      // Save drawing context state
      ctx.save();

      // Living sinusoidal breathing factor
      const breathe = Math.sin(time * 0.008) * 0.1 + 1.0;

      // Draw soft ambient Ambilight backglows behind window positions
      const activeState = stateRef.current;
      const activeWin = activeState.windows.find(w => w.id === activeState.activeAppId);
      if (activeWin && activeWin.isOpen && !activeWin.isMinimized) {
        const winCenterX = activeWin.isMaximized ? width / 2 : activeWin.x + activeWin.width / 2;
        const winCenterY = activeWin.isMaximized ? (height - 56) / 2 : activeWin.y + activeWin.height / 2;
        const winRadius = Math.max(activeWin.width, activeWin.height) * 0.65;

        // Slow pulsing Ambilight breath
        const ambBreathe = Math.sin(time * 0.012) * 0.06 + 0.95;
        const ambGlow = ctx.createRadialGradient(
          winCenterX, winCenterY, 0,
          winCenterX, winCenterY, winRadius * ambBreathe
        );
        ambGlow.addColorStop(0, `rgba(${themeColor.r}, ${themeColor.g}, ${themeColor.b}, ${0.045 * ambBreathe})`);
        ambGlow.addColorStop(0.4, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${0.01 * ambBreathe})`);
        ambGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = ambGlow;
        ctx.beginPath();
        ctx.arc(winCenterX, winCenterY, winRadius * ambBreathe, 0, Math.PI * 2);
        ctx.fill();
      }

      // 🔦 Background spotlight pool (Always active in low opacity for depth)
      const spotlight = ctx.createRadialGradient(
        mouseRef.current.x, mouseRef.current.y, 0,
        mouseRef.current.x, mouseRef.current.y, 500
      );
      spotlight.addColorStop(0, `rgba(${themeColor.r}, ${themeColor.g}, ${themeColor.b}, 0.02)`);
      spotlight.addColorStop(0.5, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.004)`);
      spotlight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, width, height);

      // Render quiet ambient liquid/wind curves drifting across the space
      ctx.strokeStyle = `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, 0.025)`;
      ctx.lineWidth = 1.6;
      for (let line = 0; line < 3; line++) {
        ctx.beginPath();
        const offset = line * 220;
        ctx.moveTo(0, height * 0.3 + Math.sin(time * 0.002 + line) * 90 + offset * 0.1);
        ctx.bezierCurveTo(
          width * 0.35, height * 0.1 + Math.cos(time * 0.003 + line) * 130 + offset * 0.25,
          width * 0.65, height * 0.8 + Math.sin(time * 0.002 + line * 1.4) * 130 - offset * 0.25,
          width, height * 0.45 + Math.cos(time * 0.0018 + line * 1.8) * 90
        );
        ctx.stroke();
      }

      switch (wallpaper) {
        
        // ----------------------------------------
        // MODE 1: Living Volumetric Mesh (Breathing & Drifting)
        // ----------------------------------------
        case 'particles':
          meshPoints.forEach((p, idx) => {
            const angle = time * p.speed + idx * 2.5;
            p.x = p.tx + Math.cos(angle) * 120;
            p.y = p.ty + Math.sin(angle) * 80;

            const activeRadius = p.radius * breathe;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, activeRadius);
            
            if (idx === 0) {
              // Accent theme wash (layered breathing depth)
              grad.addColorStop(0, `rgba(${themeColor.r}, ${themeColor.g}, ${themeColor.b}, ${0.055 * breathe})`);
              grad.addColorStop(0.4, `rgba(${themeColor.r}, ${themeColor.g}, ${themeColor.b}, ${0.015 * breathe})`);
            } else if (idx === 1) {
              // Secondary ambient wash
              grad.addColorStop(0, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${0.045 * breathe})`);
              grad.addColorStop(0.5, `rgba(${secondaryColor.r}, ${secondaryColor.g}, ${secondaryColor.b}, ${0.005 * breathe})`);
            } else {
              // Tertiary wash
              grad.addColorStop(0, `rgba(${tertiaryColor.r}, ${tertiaryColor.g}, ${tertiaryColor.b}, ${0.04 * breathe})`);
              grad.addColorStop(0.5, `rgba(${tertiaryColor.r}, ${tertiaryColor.g}, ${tertiaryColor.b}, ${0.005 * breathe})`);
            }
            grad.addColorStop(1, 'rgba(8, 8, 10, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, activeRadius, 0, Math.PI * 2);
            ctx.fill();
          });
          break;

        // ----------------------------------------
        // MODE 2: Tactile Responsive Dotted Grid
        // ----------------------------------------
        case 'matrix':
          const colsCount = Math.ceil(width / dotSpacing);
          const rowsCount = Math.ceil(height / dotSpacing);
          
          for (let c = 0; c < colsCount; c++) {
            for (let r = 0; r < rowsCount; r++) {
              const x = c * dotSpacing;
              const y = r * dotSpacing;
              
              // Calculate proximity to cursor spotlight
              const dist = Math.hypot(x - mouseRef.current.x, y - mouseRef.current.y);
              const factor = Math.max(0, 1 - dist / 220); // 220px field of effect
              
              // Proximity scaling
              const radius = 0.6 + factor * 1.2;
              const opacity = 0.02 + factor * 0.08;
              
              // Dot color blends based on accent colors
              ctx.fillStyle = `rgba(${themeColor.r * factor + 255 * (1 - factor)}, ${themeColor.g * factor + 255 * (1 - factor)}, ${themeColor.b * factor + 255 * (1 - factor)}, ${opacity})`;
              ctx.beginPath();
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          break;

        // ----------------------------------------
        // MODE 3: Celestial Deep Starfield & Shooters
        // ----------------------------------------
        case 'stars':
          // Slow celestial horizontal drift
          stars.forEach((star) => {
            star.phase += star.speed;
            star.x -= 0.012; // Slow ambient cosmic drift
            if (star.x < 0) star.x = width;

            const alpha = 0.04 + Math.sin(star.phase) * 0.08;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
          });

          // Rare cinematic shooting star sweeps
          if (!shootingStar && Math.random() < 0.0015) {
            shootingStar = {
              x: Math.random() * width * 0.6,
              y: Math.random() * height * 0.4,
              dx: 5 + Math.random() * 7,
              dy: 2.5 + Math.random() * 3.5,
              len: 70 + Math.random() * 70,
              opacity: 1.0
            };
          }

          if (shootingStar) {
            ctx.strokeStyle = `rgba(${themeColor.r}, ${themeColor.g}, ${themeColor.b}, ${shootingStar.opacity * 0.35})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(shootingStar.x, shootingStar.y);
            ctx.lineTo(
              shootingStar.x - shootingStar.dx * (shootingStar.len / 20),
              shootingStar.y - shootingStar.dy * (shootingStar.len / 20)
            );
            ctx.stroke();

            // Progress the trajectory
            shootingStar.x += shootingStar.dx;
            shootingStar.y += shootingStar.dy;
            shootingStar.opacity -= 0.015;

            if (shootingStar.opacity <= 0 || shootingStar.x > width || shootingStar.y > height) {
              shootingStar = null;
            }
          }
          break;

        // ----------------------------------------
        // MODE 4: Drifting Horizon baseline (Stripe Dashboard visual style)
        // ----------------------------------------
        case 'scanlines':
          const driftY = Math.sin(time * 0.004) * 25;
          const centerY = height * 0.5 + driftY;

          const horizonGrad = ctx.createLinearGradient(0, centerY - 300, 0, centerY + 300);
          horizonGrad.addColorStop(0, 'rgba(8, 8, 10, 0)');
          horizonGrad.addColorStop(0.5, `rgba(${themeColor.r}, ${themeColor.g}, ${themeColor.b}, ${0.03 * breathe})`);
          horizonGrad.addColorStop(1, 'rgba(8, 8, 10, 0)');
          
          ctx.fillStyle = horizonGrad;
          ctx.fillRect(0, 0, width, height);

          // Horizon light highlight baseline line
          ctx.strokeStyle = `rgba(${themeColor.r}, ${themeColor.g}, ${themeColor.b}, 0.06)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, centerY);
          ctx.lineTo(width, centerY);
          ctx.stroke();

          // Faint, thin grid baseline lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.004)';
          ctx.lineWidth = 0.8;
          const spacing = 48;
          for (let y = 0; y < height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }
          break;
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [wallpaper]);

  return <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none z-0 bg-[#08080a]" />;
};
