import React, { useState, useEffect, useRef, useCallback } from 'react';
import { store, useSystemState } from '../store/systemStore';
import { bootVenomVoiceCore } from '../utils/audio';
import { initializeVenomEngineOnClick } from '../utils/VenomSpeechCore';
import { 
  Wifi, 
  Moon, 
  RotateCw, 
  Power, 
  ArrowLeft, 
  AlertCircle 
} from 'lucide-react';

const WALLPAPERS = [
  '/bgs/aerial-beautiful-shot-seashore-with-hills-background-sunset.jpg',
  '/bgs/artistic-blurry-colorful-wallpaper-background.jpg',
  '/bgs/bridge-sea-middle-mountains.jpg',
  '/bgs/large-cliff-pfeiffer-beach-usa-sunset.jpg',
  '/bgs/top-view-paper-autumn-leaves-arrangement-with-copy-space.jpg',
  '/bgs/view-old-tree-lake-with-snow-covered-mountains-cloudy-day.jpg',
  '/bgs/vivid-blurred-colorful-wallpaper-background.jpg'
];

export const LockScreen: React.FC = () => {
  const state = useSystemState();
  const [timeStr, setTimeStr] = useState('');

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
  
  // Login form states
  const [nameInput, setNameInput] = useState('aether');
  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState(false);

  const [mousePos, setMousePos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540
  }));

  // Power states
  const [screenState, setScreenState] = useState<'active' | 'sleep' | 'off'>('active');

  // Tap tracking for wake gestures
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clock tick interval for top right menu bar
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePasskeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      // playSound.warning();
      setPasskeyError(true);
      setTimeout(() => setPasskeyError(false), 2000);
      return;
    }

    // Accept AETHER or blank for developer convenience
    if (passkeyInput.toUpperCase() === 'AETHER' || passkeyInput.trim() === '') {
      // CRITICAL: The browser tracks this execution block as a direct user action.
      // By invoking the SpeechRecognition start synchronously before any async await statement,
      // the microphone channel is successfully unlocked.
      const venomEngine = initializeVenomEngineOnClick();
      if (venomEngine) {
        try {
          venomEngine.start();
          console.log("[Venom Speech Core] background wake word scanner successfully warmed up and started synchronously.");
        } catch (err) {
          console.warn("[Venom Speech Core] Recognizer failed to start synchronously", err);
        }
      }

      // Satisfies browser microphone permission click-gesture gating policy
      await bootVenomVoiceCore();

      // playSound.success();
      setPasskeyError(false);
      store.unlockSystem();
    } else {
      // playSound.warning();
      setPasskeyError(true);
      setPasskeyInput('');
      setTimeout(() => setPasskeyError(false), 2200);
    }
  };

  const handleRestart = () => {
    // playSound.boot();
    // Go to boot screen with autoRestart flag → auto-initializes → comes back to login
    store.restartSystem();
  };

  const handleShutdown = () => {
    // playSound.warning();
    // Power off → black screen overlay, wake with triple-tap
    setScreenState('off');
  };

  const handleSleep = () => {
    // playSound.click();
    // Sleep → blur overlay, wake with double-tap
    setScreenState('sleep');
  };

  const handleReturnToBoot = () => {
    // playSound.click();
    // Go back to the initial boot/initialization screen
    store.shutdownSystem();
  };

  // Handle taps on sleep/off overlays for wake gestures
  const handleOverlayTap = useCallback(() => {
    tapCountRef.current += 1;

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }

    tapTimerRef.current = setTimeout(() => {
      const taps = tapCountRef.current;
      tapCountRef.current = 0;

      if (screenState === 'sleep' && taps >= 2) {
        // Double-tap wakes from sleep
        // playSound.click();
        setScreenState('active');
      } else if (screenState === 'off' && taps >= 3) {
        // Triple-tap wakes from shutdown (power on)
        // playSound.boot();
        setScreenState('active');
      }
    }, 400); // 400ms window to register multi-taps
  }, [screenState]);

  if (!state.isBooted || !state.isLocked) return null;

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // Inertial parallax coordinates
  const parallaxBgX = (mousePos.x - windowWidth / 2) * -0.005;
  const parallaxBgY = (mousePos.y - windowHeight / 2) * -0.005;

  return (
    <div
      onMouseMove={handleMouseMove}
      className={`absolute inset-0 z-[999] select-none theme-${state.theme} overflow-hidden font-sans w-full h-full bg-[#030304]`}
    >
      {/* 📸 4K Vivid Blurred Wallpaper Background with Parallax */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
        style={{
          backgroundImage: `url("${currentBg}")`,
          transform: `scale(1.05) translate3d(${parallaxBgX}px, ${parallaxBgY}px, 0)`,
          transition: 'transform 0.4s ease-out, background-image 1s ease-in-out'
        }}
      />

      {/* 🕶️ Ambient Vignette & Contrast Overlay (Cinematic Shading) */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-b from-black/25 via-transparent to-black/40 backdrop-brightness-[0.95] backdrop-contrast-[1.01]" />

      {/* 🪙 Frosted Glass Micro-Noise overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-20 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.015'/%3E%3C/svg%3E")`
        }}
      />

      {/* ================= TOP RIGHT MENU BAR ================= */}
      <div className="absolute top-0 left-0 right-0 h-10 px-8 flex justify-end items-center text-xs text-white font-sans space-x-5 bg-transparent select-none z-50 font-normal">
        <span className="opacity-95 text-[11px] tracking-wide">U.S.</span>
        
        {/* Battery Status outline indicator */}
        <div className="flex items-center space-x-1.5 opacity-95">
          <span className="text-[11px] tracking-wide">30%</span>
          <div className="w-5.5 h-3 border border-white/75 rounded-[3px] p-[1px] flex items-center relative">
            <div className="h-full bg-white rounded-[1px]" style={{ width: '30%' }} />
            <div className="w-0.5 h-1 bg-white/75 absolute -right-[2px] rounded-r-[1px]" />
          </div>
        </div>

        {/* WiFi signal */}
        <Wifi className="w-4 h-4 text-white opacity-95" />

        {/* Time String */}
        <span className="opacity-95 text-[11px] font-medium tracking-wide">{timeStr || '11:30 PM'}</span>
      </div>

      {/* ================= MAIN CENTER CREDENTIALS LAYOUT ================= */}
      {/* Absolutely centered on both axes */}
      <div className="absolute inset-0 flex items-center justify-center z-40">
        <form onSubmit={handlePasskeySubmit} className="flex flex-col items-center w-64" style={{ gap: '10px' }}>
          
          {/* Username Box (Glass theme) */}
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Name"
            className="w-full bg-[#121216]/30 border border-white/10 backdrop-blur-xl rounded-lg py-2 px-4 text-center text-[13px] text-white outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 placeholder-white/30 transition duration-250 shadow-inner font-sans tracking-wide"
          />

          {/* Password Box (Glass theme) */}
          <div className="w-full relative flex items-center">
            <input
              type="password"
              value={passkeyInput}
              onChange={(e) => setPasskeyInput(e.target.value)}
              placeholder="Enter Password"
              className="w-full bg-[#121216]/30 border border-white/10 backdrop-blur-xl rounded-lg py-2 px-4 text-center text-[13px] text-white outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 placeholder-white/30 transition duration-250 shadow-inner font-sans tracking-wide"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-3 p-1 rounded-md text-white/40 hover:text-white transition duration-200 active:scale-90"
            >
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>

          {/* Errors alert */}
          {passkeyError && (
            <div className="flex items-center space-x-1.5 text-rose-400 text-[10px] font-semibold pl-1 animate-bounce mt-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              <span>Validation failed. Try AETHER.</span>
            </div>
          )}
        </form>
      </div>

      {/* ================= BOTTOM CENTER POWER ACTIONS ================= */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center justify-center z-40 font-sans select-none" style={{ gap: '20px' }}>
        
        {/* Sleep */}
        <button 
          onClick={handleSleep}
          className="group w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(16px) saturate(120%)',
            WebkitBackdropFilter: 'blur(16px) saturate(120%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
          }}
          title="Sleep"
        >
          <Moon className="w-[17px] h-[17px] text-white/70 group-hover:text-white transition-colors duration-200" />
        </button>

        {/* Restart */}
        <button 
          onClick={handleRestart}
          className="group w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(16px) saturate(120%)',
            WebkitBackdropFilter: 'blur(16px) saturate(120%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
          }}
          title="Restart"
        >
          <RotateCw className="w-[17px] h-[17px] text-white/70 group-hover:text-white transition-colors duration-200" />
        </button>

        {/* Shut Down */}
        <button 
          onClick={handleShutdown}
          className="group w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(16px) saturate(120%)',
            WebkitBackdropFilter: 'blur(16px) saturate(120%)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)'
          }}
          title="Shut Down"
        >
          <Power className="w-[17px] h-[17px] text-white/70 group-hover:text-white transition-colors duration-200" />
        </button>

      </div>

      {/* ================= BOTTOM LEFT: RETURN BUTTON ================= */}
      <div className="absolute bottom-6 left-8 z-40 select-none">
        <button
          onClick={handleReturnToBoot}
          className="flex items-center space-x-2 text-[10px] font-medium text-white/60 hover:text-white/90 px-3.5 py-2 rounded-xl transition-all duration-300 active:scale-95 font-sans tracking-wider uppercase"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Boot Runner</span>
        </button>
      </div>

      {/* ================= BOTTOM RIGHT: DIAGNOSTICS CARD ================= */}
      <div className="absolute bottom-6 right-8 z-40 select-none text-left">
        <div className="bg-[#0c0c10]/45 border border-white/5 rounded-xl p-3.5 backdrop-blur-xl shadow-2xl font-mono text-[9px] text-zinc-400 space-y-0.5 leading-normal max-w-[200px]">
          <div className="font-semibold text-white">Boot Runner 3.2.1 (29029)</div>
          <div>AETHER-OS Workstation</div>
          <div>Security: SHIELD_ON</div>
        </div>
      </div>

      {/* ================= SLEEP OVERLAY (double-tap to wake) ================= */}
      {screenState === 'sleep' && (
        <div 
          onClick={handleOverlayTap}
          className="absolute inset-0 z-[10000] flex flex-col items-center justify-center cursor-pointer font-sans text-zinc-600 transition-all duration-500"
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(40px) brightness(0.3)',
            WebkitBackdropFilter: 'blur(40px) brightness(0.3)',
            animation: 'fadeIn 0.6s ease-out'
          }}
        >
          <Moon className="w-7 h-7 animate-pulse mb-3 opacity-40" />
          <span className="text-[11px] font-light tracking-[0.2em] uppercase select-none opacity-40">
            Double-tap to wake
          </span>
        </div>
      )}

      {/* ================= SHUTDOWN OVERLAY (triple-tap to power on) ================= */}
      {screenState === 'off' && (
        <div 
          onClick={handleOverlayTap}
          className="absolute inset-0 z-[10000] cursor-pointer"
          style={{
            background: '#000000',
            animation: 'fadeIn 0.8s ease-out'
          }}
        />
      )}

    </div>
  );
};
