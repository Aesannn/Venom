import React, { useState, useEffect } from 'react';
import { store, useSystemState } from '../store/systemStore';
// import { playSound } from '../utils/audio';

const WALLPAPERS = [
  '/bgs/aerial-beautiful-shot-seashore-with-hills-background-sunset.jpg',
  '/bgs/artistic-blurry-colorful-wallpaper-background.jpg',
  '/bgs/bridge-sea-middle-mountains.jpg',
  '/bgs/large-cliff-pfeiffer-beach-usa-sunset.jpg',
  '/bgs/top-view-paper-autumn-leaves-arrangement-with-copy-space.jpg',
  '/bgs/view-old-tree-lake-with-snow-covered-mountains-cloudy-day.jpg',
  '/bgs/vivid-blurred-colorful-wallpaper-background.jpg'
];

export const BootScreen: React.FC = () => {
  const state = useSystemState();
  const [progress, setProgress] = useState(0);
  const [bootStep, setBootStep] = useState<'idle' | 'running' | 'complete'>('idle');
  const [statusText, setStatusText] = useState('System ready');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [mousePos, setMousePos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540
  }));

  // Random wallpaper background slideshow
  const [currentBg, setCurrentBg] = useState(() => {
    const randomIndex = Math.floor(Math.random() * WALLPAPERS.length);
    return WALLPAPERS[randomIndex];
  });

  useEffect(() => {
    const rotateWallpaper = () => {
      setCurrentBg((prevBg) => {
        const choices = WALLPAPERS.filter(bg => bg !== prevBg);
        const randomIndex = Math.floor(Math.random() * choices.length);
        return choices[randomIndex];
      });
    };
    const interval = setInterval(rotateWallpaper, 45000);
    return () => clearInterval(interval);
  }, []);

  // Smooth loading progress simulation
  useEffect(() => {
    if (bootStep !== 'running') return;

    let currentProgress = 0;
    const interval = setInterval(() => {
      // Simulate real, variable disk-read progression speeds
      const increment = Math.max(1.5, Math.floor(Math.random() * 4) + 1);
      currentProgress = Math.min(100, currentProgress + increment);
      setProgress(currentProgress);

      // Status text updating at different progress stages
      if (currentProgress < 25) {
        setStatusText('Starting system');
      } else if (currentProgress < 55) {
        setStatusText('Preparing workspace');
      } else if (currentProgress < 80) {
        setStatusText('Restoring session');
      } else {
        setStatusText('Loading intelligence layer');
      }

      if (currentProgress >= 100) {
        clearInterval(interval);
        setStatusText('System initialized');
        
        // Play final unlock sweep sound
        // playSound.unlock();
        
        // Start fading out the boot overlay
        setTimeout(() => {
          setIsFadingOut(true);
          // Wait for fade transition, then unlock system store
          setTimeout(() => {
            store.bootSystem();
          }, 800);
        }, 500);
      }
    }, 90);

    return () => clearInterval(interval);
  }, [bootStep]);

  const handleStartBoot = () => {
    // Play startup chime and initialize background sound
    // playSound.boot();
    // playSound.startAmbientHum();
    
    // Begin loading sequence
    setBootStep('running');
  };

  // Auto-restart: if the store has autoRestart flag set, auto-trigger boot
  useEffect(() => {
    if (!state.isBooted && state.autoRestart && bootStep === 'idle') {
      store.clearAutoRestart();
      // Small delay so the boot screen renders first
      const timer = setTimeout(() => {
        handleStartBoot();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [state.isBooted, state.autoRestart, bootStep]);

  // Reset local state when system shuts down (re-entering boot screen)
  useEffect(() => {
    if (!state.isBooted) {
      setProgress(0);
      setBootStep('idle');
      setStatusText('System ready');
      setIsFadingOut(false);
    }
  }, [state.isBooted]);

  if (state.isBooted) return null;

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const parallaxBgX = (mousePos.x - windowWidth / 2) * -0.005;
  const parallaxBgY = (mousePos.y - windowHeight / 2) * -0.005;

  // Get active diagnostic logs based on progress loading stages
  const getLogs = () => {
    const activeLogs = [];
    if (progress > 12) activeLogs.push('SPAWNING SECURE KERNEL ENTRPOOL (V3.2.1-STABLE)...');
    if (progress > 32) activeLogs.push('MOUNTING VIRTUAL DEVS & VFS PARTITIONS AT 0x7FFF...');
    if (progress > 52) activeLogs.push('SPAWNING NATIVE DISPLAY GRAPHICS COMPOSITOR (60HZ)...');
    if (progress > 72) activeLogs.push('VERIFYING BIOMETRIC HASH REGISTRIES...');
    if (progress > 85) activeLogs.push('CONNECTING PROCEDURAL synth OSCILLATOR DRIVERS...');
    if (progress >= 100) activeLogs.push('COMPILING SECURE WORKSPACE HUB. INIT BOOT SUCCESS.');
    return activeLogs;
  };

  const activeLogs = getLogs();

  return (
    <div
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
      className={`absolute inset-0 bg-[#09090b] z-[99999] flex flex-col items-center justify-center p-6 select-none transition-opacity duration-700 ease-in-out overflow-hidden ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* 🌌 High-fidelity Blurred Wallpaper Background with Parallax (Ambient Color Wash) */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
        style={{
          backgroundImage: `url("${currentBg}")`,
          transform: `scale(1.08) translate3d(${parallaxBgX}px, ${parallaxBgY}px, 0)`,
          transition: 'transform 0.4s ease-out, background-image 1s ease-in-out',
          filter: 'blur(16px) brightness(0.55) saturate(130%)'
        }}
      />

      {/* 🕶️ Atmospheric volumetric breathing lighting clouds */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] rounded-full bg-zinc-900/10 blur-[130px] animate-pulse" 
          style={{ animationDuration: '6s' }} 
        />
        {bootStep === 'running' && (
          <div 
            className="absolute top-[45%] left-[45%] w-[320px] h-[320px] rounded-full bg-zinc-800/15 blur-[100px] animate-pulse" 
            style={{ animationDuration: '4s', animationDelay: '1s' }} 
          />
        )}
      </div>

      {/* 🔦 Cursor-Reactive spotlight highlight */}
      <div 
        className="absolute inset-0 pointer-events-none z-20 transition-all duration-300 ease-out"
        style={{
          background: `radial-gradient(circle 320px at ${mousePos.x || windowWidth / 2}px ${mousePos.y || windowHeight / 2}px, rgba(255,255,255,0.015) 0%, rgba(0,0,0,0) 100%)`
        }}
      />

      {/* 🪙 Micro-noise glass material overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-30 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.012'/%3E%3C/svg%3E")`
        }}
      />

      <div className="flex flex-col items-center max-w-sm w-full text-center space-y-12 z-40">
        
        {/* Centered Minimalist Interlocking AETHER Glyph (Breathes softly during boot) */}
        <div className="flex flex-col items-center space-y-4">
          <div className={`transition-all duration-[2000ms] ease-in-out ${
            bootStep === 'running' ? 'animate-pulse scale-102 opacity-95' : 'opacity-75'
          }`}>
            <svg 
              className="w-16 h-16 text-zinc-100" 
              viewBox="0 0 100 100" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer thin circular details */}
              <circle cx="50" cy="50" r="42" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" className="opacity-20" />
              
              {/* V geometry lines */}
              <path 
                d="M32 42L50 70L68 42" 
                stroke="currentColor" 
                strokeWidth="4" 
                strokeLinejoin="round" 
                strokeLinecap="round" 
              />
              
              {/* Perfect dot indicator */}
              <circle cx="50" cy="36" r="5" fill="currentColor" />
            </svg>
          </div>
          
          {/* OS Branding (Quiet, premium tracking) */}
          <h1 className="text-zinc-200 text-xs font-medium tracking-[0.25em] uppercase font-sans select-none">
            AETHER-OS
          </h1>
        </div>

        {/* Dynamic Display Slots */}
        <div className="h-44 flex flex-col items-center justify-start w-full">
          {bootStep === 'idle' ? (
            /* Tactile initiation flow for browser autoplay chime alignment */
            <button
              onClick={handleStartBoot}
              className="px-6 py-2.5 bg-white/[0.03] hover:bg-white/[0.08] text-zinc-300 hover:text-zinc-100 border border-white/10 hover:border-white/20 font-sans tracking-wide text-xs font-medium rounded-lg transition-all duration-300 active:scale-98 shadow-sm backdrop-blur-md"
            >
              Initialize Workspace
            </button>
          ) : (
            /* Smooth loading indicators */
            <div className="w-full flex flex-col items-center space-y-4 font-sans animate-fadeIn">
              
              {/* Simple progress bar track */}
              <div className="w-56 bg-white/[0.04] border border-white/10 h-[3px] rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-white/70 rounded-full transition-all duration-200 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              
              {/* Subtle status caption */}
              <span className="text-[9px] text-white/40 font-semibold tracking-wider uppercase font-sans opacity-70">
                {statusText}...
              </span>

              {/* Frosted glass Console Diagnostic Terminal */}
              {progress > 12 && (
                <div className="w-64 bg-[#0a0a0f]/45 border border-white/5 rounded-xl p-3.5 font-mono text-[8px] text-zinc-400 text-left space-y-1.5 select-none animate-fadeIn backdrop-blur-xl shadow-2xl">
                  {activeLogs.map((log, idx) => (
                    <div key={idx} className="truncate flex items-center space-x-2">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span className="text-[7.5px] uppercase tracking-wide">{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
