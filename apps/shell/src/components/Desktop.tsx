import React, { useState, useEffect, useRef } from 'react';
import { store, useSystemState } from '../store/systemStore';
import { playSound, bootVenomVoiceCore } from '../utils/audio';
import { WindowFrame } from './WindowFrame';
import { getVenomEngineInstance } from '../utils/VenomSpeechCore';

// Apps imports
import { AIChatCenter } from './apps/AIChatCenter';
import { QuantumTerminal } from './apps/QuantumTerminal';
import { CyberExplorer } from './apps/CyberExplorer';
import { SystemMonitor } from './apps/SystemMonitor';
import { HolonetBrowser } from './apps/HolonetBrowser';
import { NeuralNotes } from './apps/NeuralNotes';
import { AetherAudioPlayer } from './apps/AetherAudioPlayer';
import { GridBypassGame } from './apps/GridBypassGame';
import { CognitiveLink } from './apps/CognitiveLink';
import { SystemPreferences } from './apps/SystemPreferences';
import { QuantumCalculator } from './apps/QuantumCalculator';
import { AetherCodeEditor } from './apps/AetherCodeEditor';
import { AetherMarketplace } from './apps/AetherMarketplace';
import { AIComputeHub } from './apps/AIComputeHub';
import { SwarmPanel } from './apps/SwarmPanel';
import { SpatialVisualizer } from './apps/SpatialVisualizer';
import { TemporalLedger } from './apps/TemporalLedger';
import { ContextMenu } from './ContextMenu';
import { WidgetPanel } from './WidgetPanel';

import * as Icons from 'lucide-react';

// Shared glass inline-style factory for consistent material across all chrome
const glassStyle = (opacity = 0.18, blur = 24, border = 0.08): React.CSSProperties => ({
  background: `rgba(255, 255, 255, ${opacity})`,
  backdropFilter: `blur(${blur}px) saturate(140%)`,
  WebkitBackdropFilter: `blur(${blur}px) saturate(140%)`,
  border: `1px solid rgba(255, 255, 255, ${border})`,
  boxShadow: `0 2px 16px -4px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, ${opacity * 0.5})`,
});

// Premium dark glass style for System Settings & Telemetry
const darkGlassStyle = (opacity = 0.55, blur = 28, border = 0.08): React.CSSProperties => ({
  background: `rgba(15, 15, 22, ${opacity})`,
  backdropFilter: `blur(${blur}px) saturate(160%)`,
  WebkitBackdropFilter: `blur(${blur}px) saturate(160%)`,
  border: `1px solid rgba(255, 255, 255, ${border})`,
  boxShadow: `0 8px 32px -4px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.04)`,
});

const WALLPAPERS = [
  '/bgs/aerial-beautiful-shot-seashore-with-hills-background-sunset.jpg',
  '/bgs/artistic-blurry-colorful-wallpaper-background.jpg',
  '/bgs/bridge-sea-middle-mountains.jpg',
  '/bgs/large-cliff-pfeiffer-beach-usa-sunset.jpg',
  '/bgs/top-view-paper-autumn-leaves-arrangement-with-copy-space.jpg',
  '/bgs/view-old-tree-lake-with-snow-covered-mountains-cloudy-day.jpg',
  '/bgs/vivid-blurred-colorful-wallpaper-background.jpg'
];

export const Desktop: React.FC = () => {
  const state = useSystemState();

  // Track shutdown state so background threads know when to stay dead
  const isSystemShutdownRef = useRef<boolean>(false);

  // Voice OS Runtime states & refs
  const micRecognitionRef = useRef<any>(null);
  const activeRecognitionRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [localTranscript, setLocalTranscript] = useState('');
  const [activeDisplayUtterance, setActiveDisplayUtterance] = useState('Speak naturally...');
  const transcriptRef = useRef('');
  const particlesRef = useRef<{ x: number; y: number; r: number; speed: number; angle: number; alpha: number }[]>([]);
  const [needsWarmup, setNeedsWarmup] = useState(true);

  const voiceStateRef = useRef(state.voiceState);
  const themeRef = useRef(state.theme);
  const isVoiceActiveRef = useRef(state.isVoiceActive);
  const activeWorkspaceRef = useRef(state.activeWorkspace);

  const handleTransparentWarmup = () => {
    console.log("[Venom Speech Core] Transparent warmup triggered by user click gesture.");
    
    // Warm up Venom Voice core permission
    bootVenomVoiceCore();

    // Warm up wake word scanner
    const venomEngine = getVenomEngineInstance();
    if (venomEngine) {
      try {
        venomEngine.start();
        console.log("[Venom Speech Core] Background wake-word scanner successfully started on transparent click.");
      } catch (err) {
        // Ignore state conflicts (e.g. if already started)
      }
    }
    
    setNeedsWarmup(false);
  };

  useEffect(() => {
    transcriptRef.current = localTranscript;
  }, [localTranscript]);

  useEffect(() => {
    if (state.voiceState === 'LISTENING') {
      setActiveDisplayUtterance(localTranscript || 'Speak naturally...');
    } else if (state.voiceState === 'PROCESSING' || state.voiceState === 'EXECUTING') {
      setActiveDisplayUtterance(state.voiceTranscript || localTranscript || 'Thinking...');
    } else if (state.voiceState === 'RESPONDING') {
      setActiveDisplayUtterance(state.voiceResponseText || 'Responding...');
    } else if (state.voiceState === 'WAKE_DETECTED') {
      setActiveDisplayUtterance('AETHER WAKING...');
    } else if (state.voiceState === 'RETURN_TO_IDLE') {
      setActiveDisplayUtterance('Subsystem Standby...');
    } else {
      setActiveDisplayUtterance('Standby...');
    }
  }, [state.voiceState, localTranscript, state.voiceTranscript, state.voiceResponseText]);

  useEffect(() => {
    voiceStateRef.current = state.voiceState;
  }, [state.voiceState]);

  useEffect(() => {
    themeRef.current = state.theme;
  }, [state.theme]);

  useEffect(() => {
    isVoiceActiveRef.current = state.isVoiceActive;
  }, [state.isVoiceActive]);

  useEffect(() => {
    activeWorkspaceRef.current = state.activeWorkspace;
  }, [state.activeWorkspace]);

  // Actively kill all running speech recognition instances on shutdown or lock
  useEffect(() => {
    if (!state.isBooted) {
      isSystemShutdownRef.current = true;
    } else {
      isSystemShutdownRef.current = false;
    }

    if (!state.isBooted || state.isLocked) {
      console.log('[Ambient Voice OS] Active shutdown/lock detected. Killing all voice pipelines.');
      
      // Abort background wake-word scanner
      if (micRecognitionRef.current) {
        try {
          micRecognitionRef.current.abort();
        } catch (err) {}
      }

      // Abort active capture scanner
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.abort();
        } catch (err) {}
      }

      // Cancel TTS Speech Queue completely
      try {
        window.speechSynthesis.cancel();
      } catch (err) {}
      
      // Stop and clean up any media stream tracks
      if (micStreamRef.current) {
        try {
          micStreamRef.current.getTracks().forEach((track: any) => track.stop());
        } catch (err) {}
        micStreamRef.current = null;
      }

      // Close Audio Context
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch (err) {}
        audioCtxRef.current = null;
      }
    }
  }, [state.isBooted, state.isLocked]);

  const activeThemeText = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';
  const [timeStr, setTimeStr] = useState('');
  const [searchVal, setSearchVal] = useState('');
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [showWidgetPanel, setShowWidgetPanel] = useState(false);
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

  // Local clock sync
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Global key bindings: Alt+Space / Cmd+K Spotlight launcher / Ctrl+` Terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.code === 'Space') || ((e.metaKey || e.ctrlKey) && e.key === 'k')) {
        e.preventDefault();
        playSound.click();
        store.toggleSpotlight();
      } else if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        playSound.click();
        store.openWindow('terminal');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Background Wake Word daemon listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Ambient Voice OS] Speech Recognition API not supported in this browser.');
      return;
    }

    let hasStarted = false;
    let recognizer = getVenomEngineInstance();
    let isPrimedFromLogin = !!recognizer;

    if (!recognizer) {
      console.warn('[Ambient Voice OS] Speech engine was not primed at login stage. Instantiating fallback.');
      try {
        recognizer = new SpeechRecognition();
        recognizer.continuous = true;
        recognizer.interimResults = false;
        recognizer.lang = 'en-US';
      } catch (e) {
        console.warn('Failed to initialize wake-word recognizer', e);
        return;
      }
    }

    try {
      recognizer.onresult = (event: any) => {
        const resultIndex = event.resultIndex;
        const isVoiceActive = store.getState().isVoiceActive;

        // If active capture is running, discard wake word scanning events
        if (isVoiceActive) return;

        const transcript = event.results[resultIndex][0].transcript.trim();
        const cleanPrompt = transcript.toLowerCase();
        
        console.log(`[Wake Word Scanner] Heard Index ${resultIndex}: "${transcript}"`);

        if (
          cleanPrompt.includes('venom') || 
          cleanPrompt.includes('aether') || 
          cleanPrompt.includes('ether') || 
          cleanPrompt.includes('ather') || 
          cleanPrompt.includes('venum') || 
          cleanPrompt.includes('benom')
        ) {
          console.log(`[Wake Word Scanner] Wake trigger matched on index ${resultIndex}. Activating...`);
          
          // Abort background scanner to release mic immediately for active capture
          try { recognizer.abort(); } catch (e) {}
          hasStarted = false;

          store.activateVoiceEngine();
        }
      };

      recognizer.onerror = (e: any) => {
        if (e.error === 'not-allowed') {
          console.warn('[Wake Word Scanner] Microphone permission not allowed.');
          hasStarted = false;
        } else if (e.error !== 'no-speech') {
          console.warn('[Wake Word Scanner] Error:', e.error);
        }
      };

      recognizer.onend = () => {
        hasStarted = false;
        
        if (isSystemShutdownRef.current || !store.getState().isBooted) {
          console.log("Venom Core Shutdown complete. Speech loop terminated.");
          return;
        }

        // If voice active, we DO NOT restart the background wake word scanner!
        // We let the active capture have exclusive access to the microphone.
        if (store.getState().isVoiceActive) {
          console.log('[Wake Word Scanner] Standby mode active. Scanner paused for active capture.');
          return;
        }

        // Always restart scanner in permanent streaming mode if not active!
        setTimeout(() => {
          if (isSystemShutdownRef.current || !store.getState().isBooted || store.getState().isVoiceActive) return;
          if (!hasStarted) {
            try {
              recognizer.start();
              hasStarted = true;
            } catch (err) {}
          }
        }, 300);
      };

      micRecognitionRef.current = recognizer;

      const tryStartScanner = () => {
        if (hasStarted || store.getState().isVoiceActive) return;
        try {
          recognizer.start();
          hasStarted = true;
          console.log('[Ambient Voice OS] Background wake word listener started.');
        } catch (err) {}
      };

      // Try starting immediately if voice is not active
      if (!store.getState().isVoiceActive) {
        if (isPrimedFromLogin) {
          hasStarted = true;
          console.log('[Ambient Voice OS] Pre-primed speech engine successfully integrated.');
        } else {
          tryStartScanner();
        }
      }

      if (!isPrimedFromLogin) {
        window.addEventListener('click', tryStartScanner, { once: true });
        window.addEventListener('keydown', tryStartScanner, { once: true });
      }
    } catch (e) {
      console.warn('Failed to configure wake-word recognizer event listeners', e);
    }

    return () => {
      console.log('[Ambient Voice OS] Cleaning up background wake word listener.');
      if (micRecognitionRef.current) {
        try { micRecognitionRef.current.abort(); } catch (err) {}
      }
    };
  }, [state.isVoiceActive]);

  // Active single-shot capture SpeechRecognition loop
  useEffect(() => {
    if (!state.isVoiceActive || state.voiceState !== 'LISTENING') {
      if (activeRecognitionRef.current) {
        try {
          activeRecognitionRef.current.abort();
        } catch (e) {}
        activeRecognitionRef.current = null;
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[Ambient Voice OS] Speech Recognition API not supported for active capture.');
      return;
    }

    console.log('[Active Capture] Mounting single-shot active capture loop.');
    const activeRec = new SpeechRecognition();
    activeRec.continuous = false; // Single-shot mode to catch exactly ONE complete command string
    activeRec.interimResults = false; // Capture only final transcript
    activeRec.lang = 'en-US';

    activeRec.onresult = (event: any) => {
      // Guard against late events or invalid states
      const currentVoiceState = store.getState().voiceState;
      if (currentVoiceState !== 'LISTENING' || !store.getState().isVoiceActive) {
        return;
      }

      const lastIndex = event.results.length - 1;
      const finalPrompt = event.results[lastIndex][0].transcript.trim();

      if (!finalPrompt || finalPrompt === '...') return;

      console.log(`[Active Capture] Captured command: "${finalPrompt}". Locking and processing...`);

      // 1. Transition voiceState to PROCESSING
      store.setVoiceState('PROCESSING');
      setLocalTranscript(finalPrompt);

      // 2. Proactively stop microphone capture
      try { activeRec.stop(); } catch (err) {}

      // 3. Hand off the command to the system store orchestrator
      store.processVoiceCommand(finalPrompt);
    };

    activeRec.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        console.warn('[Active Capture] SpeechRecognition error:', e.error);
      }
    };

    activeRec.onend = () => {
      console.log('[Active Capture] Active capture session ended.');
      activeRecognitionRef.current = null;
      
      // If the loop finished without producing a result, and we are still LISTENING,
      // let's deactivate or restart. Here we'll just deactivate the voice engine to standby.
      const currentVoiceState = store.getState().voiceState;
      if (currentVoiceState === 'LISTENING') {
        console.log('[Active Capture] Active capture session ended with silence. Returning to standby.');
        store.deactivateVoiceEngine();
      }
    };

    activeRecognitionRef.current = activeRec;

    try {
      activeRec.start();
      console.log('[Active Capture] Active capture scanner successfully started.');
    } catch (err) {
      console.warn('[Active Capture] Failed to start active capture scanner:', err);
    }

    return () => {
      console.log('[Active Capture] Cleaning up active capture.');
      if (activeRec) {
        try { activeRec.abort(); } catch (e) {}
      }
      if (activeRecognitionRef.current === activeRec) {
        activeRecognitionRef.current = null;
      }
    };
  }, [state.isVoiceActive, state.voiceState]);

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active Voice recording setup for volumetric visualizer orb (no SpeechRecognition recreation)
  useEffect(() => {
    if (!state.isVoiceActive) {
      // Clean up active streams when voice turns off
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track: any) => track.stop());
        micStreamRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      setLocalTranscript('');
      return;
    }

    // Setup Web Audio analyser
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        micStreamRef.current = stream;
        
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        source.connect(analyser);
      })
      .catch(err => {
        console.warn('Microphone inaccessible for active capture.', err);
      });
  }, [state.isVoiceActive]);

  // Silence Auto-Close Watchdog Hook (Closes Venom overlay if user is silent for 15s)
  useEffect(() => {
    if (!state.isVoiceActive) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      return;
    }

    if (state.voiceState === 'LISTENING') {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = setTimeout(() => {
        if (store.getState().voiceState === 'LISTENING' && store.getState().isVoiceActive) {
          console.log('[Ambient Voice OS] Silence watchdog triggered - entering standby');
          store.deactivateVoiceEngine();
        }
      }, 15000); // 15s continuous conversation silence timeout
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  }, [state.isVoiceActive, state.voiceState]);

  // HTML5 canvas visualizer drawing loop (Premium Volumetric Glassmorphic Siri Orb!)
  useEffect(() => {
    if (!state.isVoiceActive) return;

    let animationFrameId: number;
    let timeOffset = 0;

    const canvas = waveCanvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!canvasCtx) return;

    // Create a lightweight, offline rendering canvas cache memory block for GPU blur rasterization
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 160; // Compress blur resolution to 160x160 for 75% processing overhead reduction
    offscreenCanvas.height = 160;
    const offCtx = offscreenCanvas.getContext('2d');

    // High-DPI screen configuration to ensure razor-sharp canvas boundaries
    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      const size = 320;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvasCtx.scale(dpr, dpr);
    };
    resizeCanvas();

    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);

    // Initialize cinematic noise particles once if empty
    const size = 320;
    const centerX = size / 2;
    const centerY = size / 2;
    if (particlesRef.current.length === 0) {
      const arr = [];
      for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * 140;
        arr.push({
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          r: 0.5 + Math.random() * 1.5,
          speed: 0.3 + Math.random() * 0.8,
          angle: angle,
          alpha: 0.15 + Math.random() * 0.55
        });
      }
      particlesRef.current = arr;
    }

    const drawOrb = (ctx: CanvasRenderingContext2D, volume: number) => {
      ctx.clearRect(0, 0, size, size);

      const currentVoiceState = voiceStateRef.current;
      const currentTheme = themeRef.current;

      // Base radius controlled dynamically by active assistant phases
      let baseRadius = 60;
      if (currentVoiceState === 'WAKE_DETECTED') baseRadius = 75;
      else if (currentVoiceState === 'PROCESSING' || currentVoiceState === 'EXECUTING') baseRadius = 65 + Math.sin(timeOffset * 5) * 5;
      else if (currentVoiceState === 'RESPONDING') baseRadius = 60 + Math.sin(timeOffset * 2.2) * 6;
      else if (currentVoiceState === 'RETURN_TO_IDLE') baseRadius = 25;
      else if (currentVoiceState === 'LISTENING') baseRadius = 65; // Lock base radius so the glass lens NEVER gets unnaturally huge

      timeOffset += currentVoiceState === 'LISTENING' ? 0.08 + volume * 0.1 : 0.03;

      // --- GPU GRAPHICS OPTIMIZATION: OFFSCREEN DRAWING FOR HEAVY BLURS ---
      if (offCtx) {
        offCtx.clearRect(0, 0, 160, 160);
        const offCX = 80;
        const offCY = 80;
        const offBaseRad = baseRadius * 0.5;

        // --- LAYER 1: BACKDROP NEBULA (The Soft Atmospheric Ambient Glow on offscreen canvas) ---
        offCtx.save();
        offCtx.globalCompositeOperation = 'screen';
        offCtx.filter = 'blur(20px)'; // Scaled down blur radius for 160x160 bounds
        
        const ambientGlow = offCtx.createRadialGradient(offCX, offCY, 5, offCX, offCY, offBaseRad * 2.5);
        
        // Dynamic core backlighting mapped to the system theme accent color
        let primaryColor = 'rgba(147, 51, 234, 0.4)'; // Purple default
        let secondaryColor = 'rgba(6, 182, 212, 0.2)'; // Cyan default
        if (currentTheme === 'green') {
          primaryColor = 'rgba(16, 185, 129, 0.4)';
          secondaryColor = 'rgba(52, 211, 153, 0.2)';
        } else if (currentTheme === 'orange') {
          primaryColor = 'rgba(249, 115, 22, 0.4)';
          secondaryColor = 'rgba(251, 146, 60, 0.2)';
        } else if (currentTheme === 'purple') {
          primaryColor = 'rgba(168, 85, 247, 0.4)';
          secondaryColor = 'rgba(192, 132, 252, 0.2)';
        }

        ambientGlow.addColorStop(0, primaryColor);
        ambientGlow.addColorStop(0.5, secondaryColor);
        ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        offCtx.fillStyle = ambientGlow;
        offCtx.beginPath();
        offCtx.arc(offCX, offCY, offBaseRad * 2.5, 0, Math.PI * 2);
        offCtx.fill();
        offCtx.restore();

        // --- LAYER 2: CHROMATIC LIQUID BLOBS (drawn on offscreen canvas) ---
        offCtx.save();
        offCtx.globalCompositeOperation = 'screen';
        offCtx.filter = 'blur(6px)'; // Scaled down blur radius for blobs

        let blobColors = [
          'rgba(6, 182, 212, 0.75)',  // Neon Cyan
          'rgba(236, 72, 153, 0.65)',  // Hot Pink
          'rgba(168, 85, 247, 0.7)',   // Electric Purple
          'rgba(249, 115, 22, 0.5)'    // Cyber Orange
        ];
        if (currentTheme === 'green') {
          blobColors = [
            'rgba(52, 211, 153, 0.75)',  // Emerald
            'rgba(16, 185, 129, 0.65)',  // Green
            'rgba(34, 197, 94, 0.7)',    // Lime
            'rgba(234, 179, 8, 0.5)'     // Gold Yellow
          ];
        } else if (currentTheme === 'orange') {
          blobColors = [
            'rgba(249, 115, 22, 0.75)',  // Orange
            'rgba(239, 68, 68, 0.65)',   // Red
            'rgba(245, 158, 11, 0.7)',   // Amber
            'rgba(234, 179, 8, 0.5)'     // Yellow
          ];
        }

        blobColors.forEach((color, index) => {
          offCtx.fillStyle = color;
          offCtx.beginPath();
          
          const numPoints = 8;
          const angleStep = (Math.PI * 2) / numPoints;
          const points: { x: number; y: number }[] = [];

          let blobCenterX = offCX;
          let blobCenterY = offCY;
          if (index === 0) { // Cyan channel offset
            blobCenterX -= (2.5 + volume * 4) * 0.5;
            blobCenterY -= (1.5 + volume * 2) * 0.5;
          } else if (index === 1) { // Pink channel offset
            blobCenterX += (2.5 + volume * 4) * 0.5;
            blobCenterY += (1.5 + volume * 2) * 0.5;
          } else if (index === 3) { // Orange channel offset
            blobCenterX -= (1.5 + volume * 2) * 0.5;
            blobCenterY += (2.5 + volume * 4) * 0.5;
          }

          let morphIntensity = 8;
          if (currentVoiceState === 'LISTENING') {
            morphIntensity = 8 + volume * 22; 
          }
          morphIntensity *= 0.5; // Scale down morph amplitude by 50%

          for (let i = 0; i < numPoints; i++) {
            const angle = i * angleStep;
            const offsetModifier = (index * 50) + (i * 35);
            const wave = Math.sin(timeOffset + offsetModifier) * morphIntensity;
            const r = offBaseRad + wave;
            
            points.push({
              x: blobCenterX + Math.cos(angle) * r,
              y: blobCenterY + Math.sin(angle) * r
            });
          }

          offCtx.moveTo(points[0].x, points[0].y);
          for (let i = 0; i < numPoints; i++) {
            const nextIndex = (i + 1) % numPoints;
            const xc = (points[i].x + points[nextIndex].x) / 2;
            const yc = (points[i].y + points[nextIndex].y) / 2;
            offCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
          }
          offCtx.closePath();
          offCtx.fill();
        });
        offCtx.restore();

        // --- DRAW THE BLURRED OFFSCREEN GLOW TEXTURE TO MAIN DISPLAY WITH GPU HACK ---
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.drawImage(offscreenCanvas, 0, 0, size, size);
        ctx.restore();
      }

      // --- LAYER 2.5: CINEMATIC NOISE PARTICLE FIELD (Drawn natively on main canvas for maximum crispness) ---
      ctx.save();
      particlesRef.current.forEach(p => {
        p.angle += 0.003 * p.speed;
        
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        const pullForce = volume > 0.5 ? (volume * 4.2) : -0.3;
        dist -= pullForce * p.speed;
        
        if (dist < baseRadius * 0.3) {
          dist = 110 + Math.random() * 90;
          p.angle = Math.random() * Math.PI * 2;
        } else if (dist > 220) {
          dist = baseRadius * 1.1 + Math.random() * 30;
        }
        
        p.x = centerX + Math.cos(p.angle) * dist;
        p.y = centerY + Math.sin(p.angle) * dist;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * (volume > 0.2 ? 0.95 : 0.4)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // --- LAYER 3: CLEAN FROSTED GLASS SURFACE (Perfect Circle Reset) ---
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 28;
      ctx.shadowOffsetY = 10;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2;

      const dynamicXOffset = Math.sin(timeOffset) * (currentVoiceState === 'LISTENING' ? 4 : 1.5);
      const dynamicYOffset = Math.cos(timeOffset) * (currentVoiceState === 'LISTENING' ? 4 : 1.5);

      const glassGradient = ctx.createRadialGradient(
        centerX - 12 + dynamicXOffset, 
        centerY - 12 + dynamicYOffset, 
        0, 
        centerX, 
        centerY, 
        baseRadius * 0.85
      );
      glassGradient.addColorStop(0, 'rgba(255, 255, 255, 0.85)'); 
      glassGradient.addColorStop(0.5, 'rgba(245, 248, 255, 0.35)'); 
      glassGradient.addColorStop(1, 'rgba(215, 225, 255, 0.15)'); 
      ctx.fillStyle = glassGradient;

      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // --- LAYER 4: FLOATING SPECULAR HIGHLIGHT ---
      ctx.save();
      const glintX = Math.sin(timeOffset * 1.2) * (currentVoiceState === 'LISTENING' ? 5 : 2);

      const reflection = ctx.createLinearGradient(
        centerX + glintX, 
        centerY - baseRadius, 
        centerX, 
        centerY
      );
      reflection.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      reflection.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = reflection;

      ctx.beginPath();
      ctx.ellipse(
        centerX + glintX, 
        centerY - (baseRadius * 0.42), 
        baseRadius * 0.38,
        baseRadius * 0.12, 
        0, 
        0, 
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    };

    const drawLoop = () => {
      if (!isVoiceActiveRef.current) return;

      // Fix 3: Capping frames in Development Mode when assistant is idle
      if (activeWorkspaceRef.current === 'dev' && voiceStateRef.current === 'IDLE') {
        const canvasNode = waveCanvasRef.current;
        if (canvasNode && canvasCtx) {
          drawOrb(canvasCtx, 0);
        }
        return; 
      }

      let normalizedVol = 0;

      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate overall volume amplitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const avgVolume = sum / bufferLength;
        normalizedVol = Math.min(6.0, avgVolume / 18.0);
        store.setMicVolume(Math.round(avgVolume));
      } else {
        // Fallback simulated breathing spikes if microphone failed or is blocked
        const currentVoiceState = voiceStateRef.current;
        if (currentVoiceState === 'LISTENING') {
          normalizedVol = 1.2 + Math.sin(timeOffset * 1.5) * 0.8 + Math.cos(timeOffset * 3.1) * 0.4;
        } else if (currentVoiceState === 'RESPONDING') {
          normalizedVol = 1.0 + Math.sin(timeOffset * 2.5) * 0.6;
        } else if (currentVoiceState === 'PROCESSING' || currentVoiceState === 'EXECUTING') {
          normalizedVol = 0.15;
        } else {
          normalizedVol = 0.5 + Math.sin(timeOffset * 0.8) * 0.3;
        }
      }

      const canvasNode = waveCanvasRef.current;
      if (canvasNode && canvasCtx) {
        drawOrb(canvasCtx, normalizedVol);
      }

      animationFrameId = requestAnimationFrame(drawLoop);
    };

    drawLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state.isVoiceActive, state.activeWorkspace, state.voiceState]);

  if (!state.isBooted || state.isLocked) return null;

  // Icon getter

  // Icon getter
  const getIcon = (iconName: string, className: string = "w-5 h-5") => {
    const IconComponent = (Icons as any)[iconName];
    if (!IconComponent) return <Icons.AppWindow className={className} />;
    return <IconComponent className={className} />;
  };

  const handleLaunchApp = (id: string) => {
    playSound.click();
    const app = state.windows.find(w => w.id === id);
    if (!app) return;

    // Check workspace mapping
    const category = ['ai-chat', 'terminal', 'explorer', 'notes', 'calculator', 'editor', 'git-integrator', 'llama-tuner', 'telemetry', 'temporal-ledger'].includes(id) ? 'dev' 
      : ['player', 'visualizer', 'browser', 'docker-manager', 'device-mesh'].includes(id) ? 'media'
      : 'sys';

    // Window is active if it is open, NOT minimized, currently focused, and its workspace is active
    const isFullyActive = app.isOpen && !app.isMinimized && state.activeAppId === id && state.activeWorkspace === category;

    if (isFullyActive) {
      playSound.windowRecede();
      store.minimizeWindow(id);
    } else {
      store.openWindow(id);
    }
  };

  // Spotlight search results
  const filteredApps = state.windows.filter(w => 
    w.title.toLowerCase().includes(searchVal.toLowerCase())
  );

  const filteredFiles = searchVal.trim() ? (store as any).searchFiles(searchVal) : [];

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const handleContextMenu = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isWindow = target.closest('.window-frame') || target.closest('footer') || target.closest('input') || target.closest('textarea') || target.closest('button');
    if (isWindow) return;

    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const contextMenuItems = [
    {
      label: 'Change Wallpaper',
      icon: 'Palette',
      submenu: [
        { label: 'Mesh Gradient', icon: 'Sparkles', onClick: () => store.setWallpaper('particles') },
        { label: 'Dot Grid', icon: 'Code2', onClick: () => store.setWallpaper('matrix') },
        { label: 'Breathing Stars', icon: 'Stars', onClick: () => store.setWallpaper('stars') },
        { label: 'Studio Grid', icon: 'Grid', onClick: () => store.setWallpaper('scanlines') },
      ]
    },
    { label: 'Open Terminal', icon: 'Terminal', onClick: () => store.openWindow('terminal'), shortcut: 'Ctrl+`' },
    { label: 'System Settings', icon: 'Settings', onClick: () => store.openWindow('settings') },
    { label: 'Calculator', icon: 'Calculator', onClick: () => store.openWindow('calculator') },
    { label: 'Reset Window Layout', icon: 'RefreshCw', onClick: () => store.resetWindowPositions() },
    { label: 'Toggle Sound', icon: state.soundEnabled ? 'Volume2' : 'VolumeX', onClick: () => store.toggleSound() },
    { divider: true },
    { label: 'Lock Workspace', icon: 'Lock', onClick: () => store.lockSystem() },
    { label: 'Shut Down...', icon: 'Power', onClick: () => {
        playSound.warning();
        setTimeout(() => store.shutdownSystem(), 1500);
      } 
    },
  ];

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const parallaxBgX = (mousePos.x - windowWidth / 2) * -0.005;
  const parallaxBgY = (mousePos.y - windowHeight / 2) * -0.005;

  return (
    <div 
      onMouseMove={handleMouseMove}
      className={`absolute inset-0 z-10 flex flex-col h-full overflow-hidden select-none theme-${state.theme} mode-${state.activeWorkspace || 'dev'}`}
    >
      {/* 🔮 Transparent wallpaper overlay to warm up Venom Speech Recognition on very first desktop click */}
      {needsWarmup && (
        <div 
          onClick={handleTransparentWarmup}
          className="fixed inset-0 z-[9999] bg-transparent cursor-default pointer-events-auto"
          title="Click workspace to focus"
        />
      )}

      {/* 🌌 High-fidelity 4K Wallpaper Background with Parallax and Workspace-Reactive Blur */}
      <div 
        className="absolute inset-0 bg-cover bg-center pointer-events-none z-0"
        style={{
          backgroundImage: `url("${currentBg}")`,
          transform: `scale(1.06) translate3d(${parallaxBgX}px, ${parallaxBgY}px, 0)`,
          transition: 'transform 0.4s ease-out, background-image 1s ease-in-out, filter 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: state.isVoiceActive && state.voiceState === 'LISTENING'
            ? 'blur(28px) brightness(0.2) saturate(70%)'
            : state.activeWorkspace === 'dev' 
            ? 'blur(0px) brightness(0.65) saturate(100%)' 
            : state.activeWorkspace === 'media' 
            ? 'blur(12px) brightness(0.48) saturate(135%)' 
            : 'blur(24px) brightness(0.32) saturate(85%)'
        }}
      />
      {/* Subtle vignette for depth */}
      <div className="absolute inset-0 pointer-events-none z-[1] bg-gradient-to-b from-black/10 via-transparent to-black/20" />

      {/* Ultra-faint noise grain for glass material realism */}
      <div 
        className="absolute inset-0 pointer-events-none z-[2] opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.012'/%3E%3C/svg%3E")`
        }}
      />

      {/* ===== TOP WORKSPACE SWITCHER (Futuristic Spatial Selector) ===== */}
      <div 
        className={`absolute top-3.5 left-1/2 -translate-x-1/2 z-[400] flex items-center p-1 rounded-2xl font-sans text-[11px] font-semibold tracking-wider uppercase select-none transition-all duration-700 shadow-dock border border-white/10 ${
          state.isVoiceActive && state.voiceState === 'LISTENING' ? 'opacity-20 scale-95 pointer-events-none -translate-y-3' 
          : state.isTheaterMode ? 'opacity-0 scale-95 pointer-events-none -translate-y-3'
          : ''
        }`}
        style={{
          background: 'rgba(10, 10, 15, 0.65)',
          backdropFilter: 'blur(30px) saturate(160%)',
          WebkitBackdropFilter: 'blur(30px) saturate(160%)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}
      >
        {[
          { id: 'dev', label: 'Development', icon: 'Code', activeColor: 'text-cyan-400' },
          { id: 'media', label: 'Media', icon: 'Music', activeColor: 'text-orange-400' },
          { id: 'sys', label: 'SystemCore', icon: 'Activity', activeColor: 'text-emerald-400' },
        ].map((ws) => {
          const isActive = (state.activeWorkspace || 'dev') === ws.id;
          return (
            <button
              key={ws.id}
              onClick={() => { playSound.workspaceSweep(); store.setWorkspace(ws.id as any); }}
              data-magnetic
              className={`px-4 py-2 rounded-xl transition-all duration-300 flex items-center space-x-2 relative group active:scale-95 ${
                isActive 
                  ? 'text-white font-bold' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.02]'
              }`}
            >
              {/* Highlight Glow underneath active item */}
              {isActive && (
                <div 
                  className="absolute inset-0 rounded-xl bg-white/[0.04] border border-white/10 transition-all duration-500"
                  style={{
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 12px rgba(255, 255, 255, 0.03)'
                  }}
                />
              )}
              
              <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? ws.activeColor : 'text-white/30 group-hover:text-white/60'}`}>
                {getIcon(ws.icon, "w-3.5 h-3.5")}
              </span>
              <span className="text-[10px] tracking-widest">{ws.label}</span>
              
              {/* Animated active indicator line at the bottom of the active button */}
              {isActive && (
                <span 
                  className="absolute bottom-0.5 left-1/3 right-1/3 h-[2px] rounded-full transition-all duration-500"
                  style={{
                    background: ws.id === 'dev' ? '#22d3ee' : ws.id === 'media' ? '#fb923c' : '#34d399',
                    boxShadow: `0 0 8px ${ws.id === 'dev' ? 'rgba(34, 211, 238, 0.8)' : ws.id === 'media' ? 'rgba(251, 146, 60, 0.8)' : 'rgba(52, 211, 153, 0.8)'}`
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ===== MAIN WORKSPACE where draggable window sheets reside ===== */}
      <main 
        onContextMenu={handleContextMenu}
        className={`flex-1 w-full h-full relative overflow-hidden p-4 z-10 transition-all duration-700 ease-out origin-center ${
          state.isVoiceActive && state.voiceState === 'LISTENING' ? 'scale-[0.96] opacity-15 blur-[2px] pointer-events-none' : ''
        }`}
      >
        {/* ====================================================
           SPATIAL DESKTOP HUDS (ENVIRONMENT-REACTIVE WIDGETS)
           ==================================================== */}

        {/* 1. Development Mode: Live System Telemetry */}
        {state.activeWorkspace === 'dev' && (
          <div className={`absolute top-16 right-4 w-72 rounded-2xl p-4 font-mono select-none pointer-events-auto border border-white/5 space-y-4 shadow-2xl transition-all duration-700 ${
            state.isTheaterMode ? 'opacity-0 scale-95 pointer-events-none translate-x-4' : 'animate-fadeIn'
          }`}
               style={{
                 background: 'rgba(10, 10, 14, 0.48)',
                 backdropFilter: 'blur(24px) saturate(140%)',
                 WebkitBackdropFilter: 'blur(24px) saturate(140%)',
               }}>
            <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[9px] font-bold text-white/40 uppercase tracking-widest">
              <span>System Telemetry</span>
              <Icons.Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1 text-left">
                <div className="flex justify-between text-[9px] text-white/50 font-bold uppercase tracking-wider">
                  <span>Core CPU load</span>
                  <span className="text-cyan-400 font-bold">{state.cpuUsage}%</span>
                </div>
                <div className="h-1 bg-white/[0.04] border border-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${state.cpuUsage}%` }} />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between text-[9px] text-white/50 font-bold uppercase tracking-wider">
                  <span>Memory Mesh</span>
                  <span className="text-cyan-400 font-bold">{state.ramUsage}%</span>
                </div>
                <div className="h-1 bg-white/[0.04] border border-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${state.ramUsage}%` }} />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between text-[9px] text-white/50 font-bold uppercase tracking-wider">
                  <span>Aether AI Core</span>
                  <span className="text-cyan-400 font-bold">1.2 GFLOPS</span>
                </div>
                <div className="h-1 bg-white/[0.04] border border-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full animate-pulse" style={{ width: '42%' }} />
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] text-white/40 pt-1.5 border-t border-white/5">
                <span className="uppercase">Core Thermal</span>
                <span className="text-cyan-300 font-bold font-mono">42.8°C</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. Media Mode: Floating Cinematic Album HUD */}
        {state.activeWorkspace === 'media' && (
          <div className={`absolute top-16 right-4 w-72 rounded-2xl p-4 font-sans select-none pointer-events-auto border border-white/5 space-y-4 shadow-2xl transition-all duration-700 ${
            state.isTheaterMode ? 'opacity-0 scale-95 pointer-events-none translate-x-4' : 'animate-fadeIn'
          }`}
               style={{
                 background: 'rgba(18, 14, 10, 0.42)',
                 backdropFilter: 'blur(24px) saturate(160%)',
                 WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                 boxShadow: '0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
               }}>
            <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[9px] font-bold text-white/40 uppercase tracking-widest">
              <span>Now Playing</span>
              <Icons.Music className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center relative overflow-hidden group shadow-lg">
                <Icons.Disc className="w-7 h-7 text-orange-400 animate-spin" style={{ animationDuration: '6s' }} />
                <div className="absolute w-2.5 h-2.5 rounded-full bg-black/60 border border-white/10" />
              </div>
              <div className="space-y-0.5 overflow-hidden flex-1 text-left">
                <span className="text-[8px] text-orange-400 font-bold uppercase tracking-widest animate-pulse">AMB_HUM</span>
                <h4 className="text-[11px] font-bold text-white uppercase tracking-wider truncate">generative_hum.qsh</h4>
                <p className="text-[9px] text-white/40 leading-normal truncate">Resonant Procedural Synthesizer</p>
              </div>
            </div>

            <div className="h-6 flex items-end space-x-[2.5px] px-1 bg-black/25 rounded-lg border border-white/5 overflow-hidden py-1">
              {Array(18).fill(0).map((_, idx) => (
                <div key={idx} 
                     className="flex-1 bg-orange-400/80 rounded-full"
                     style={{ 
                       height: `${15 + Math.sin(idx * 0.5) * 45 + Math.random() * 20}%`,
                       animation: 'pulse 1.2s ease-in-out infinite',
                       animationDelay: `${idx * 80}ms`
                     }} />
              ))}
            </div>

            <div className="flex items-center justify-between text-[9px] text-white/40 border-t border-white/5 pt-3">
              <span className="uppercase">Spatial Sound</span>
              <div className="flex items-center space-x-1.5">
                <Icons.Volume2 className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-white/80 font-bold font-mono">100% radial</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. System Mode: Central Sentient Neural Core */}
        {state.activeWorkspace === 'sys' && (
          <div className={`absolute top-16 right-4 w-72 rounded-2xl p-4 font-sans select-none pointer-events-auto border border-white/5 space-y-4 shadow-2xl transition-all duration-700 ${
            state.isTheaterMode ? 'opacity-0 scale-95 pointer-events-none translate-x-4' : 'animate-fadeIn'
          }`}
               style={{
                 background: 'rgba(10, 14, 12, 0.45)',
                 backdropFilter: 'blur(28px) saturate(150%)',
                 WebkitBackdropFilter: 'blur(28px) saturate(150%)',
                 boxShadow: '0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
               }}>
            <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[9px] font-bold text-white/40 uppercase tracking-widest">
              <span>Neural Consciousness</span>
              <Icons.Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            </div>

            <div className="flex justify-center items-center py-2.5 relative">
              <svg width="110" height="110" viewBox="0 0 100 100" className="animate-spin text-emerald-400/80" style={{ animationDuration: '30s' }}>
                <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="0.8" strokeDasharray="3 3" className="opacity-30" />
                <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1.2" strokeDasharray="12 4" className="opacity-60" />
                <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 5" className="opacity-40" />
                <circle cx="50" cy="12" r="3" fill="currentColor" />
                <circle cx="88" cy="50" r="3" fill="currentColor" />
                <circle cx="12" cy="50" r="3" fill="currentColor" />
                <circle cx="50" cy="88" r="3" fill="currentColor" />
              </svg>
              <div className="absolute flex flex-col items-center justify-center space-y-0.5">
                <span className="text-[14px] font-bold text-white tracking-wide animate-pulse">AETHER</span>
                <span className="text-[7.5px] text-emerald-400 font-bold uppercase tracking-widest">Sentient</span>
              </div>
            </div>

            <div className="space-y-2 pt-1.5 border-t border-white/5 text-left">
              <div className="flex justify-between text-[9px] text-white/40 uppercase">
                <span>Ecology State</span>
                <span className="text-emerald-400 font-bold">100% Optimal</span>
              </div>
              <div className="flex justify-between text-[9px] text-white/40 uppercase">
                <span>Memory mesh</span>
                <span className="text-white/70 font-mono">4 Connected Nodes</span>
              </div>
              <div className="flex justify-between text-[9px] text-white/40 uppercase">
                <span>Security Shield</span>
                <span className="text-emerald-400 font-bold">SECURE SHELL</span>
              </div>
              <div className="flex justify-between text-[9px] text-white/40 uppercase">
                <span>Local Weather</span>
                <span className="text-white/70 font-mono">37°C Sunny</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Render each application wrapper */}
        <WindowFrame id="ai-chat">
          <AIChatCenter />
        </WindowFrame>

        <WindowFrame id="terminal">
          <QuantumTerminal />
        </WindowFrame>

        <WindowFrame id="explorer">
          <CyberExplorer />
        </WindowFrame>

        <WindowFrame id="telemetry">
          <SystemMonitor />
        </WindowFrame>

        <WindowFrame id="browser">
          <HolonetBrowser />
        </WindowFrame>

        <WindowFrame id="notes">
          <NeuralNotes />
        </WindowFrame>

        <WindowFrame id="player">
          <AetherAudioPlayer />
        </WindowFrame>

        <WindowFrame id="game">
          <GridBypassGame />
        </WindowFrame>

        <WindowFrame id="visualizer">
          <CognitiveLink />
        </WindowFrame>

        <WindowFrame id="settings">
          <SystemPreferences />
        </WindowFrame>

        <WindowFrame id="calculator">
          <QuantumCalculator />
        </WindowFrame>

        <WindowFrame id="editor">
          <AetherCodeEditor />
        </WindowFrame>

        <WindowFrame id="marketplace">
          <AetherMarketplace />
        </WindowFrame>

        <WindowFrame id="ai-compute-hub">
          <AIComputeHub />
        </WindowFrame>

        <WindowFrame id="swarm-command">
          <SwarmPanel />
        </WindowFrame>

        <WindowFrame id="device-mesh">
          <SpatialVisualizer />
        </WindowFrame>

        <WindowFrame id="temporal-ledger">
          <TemporalLedger />
        </WindowFrame>

      </main>

      {/* ===== QUICK SETTINGS PANEL (Glass overlay) ===== */}
      {state.showQuickSettings && (
        <div 
          onClick={() => store.toggleQuickSettings(false)}
          className="absolute inset-0 z-[800]"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-20 left-4 w-72 rounded-2xl p-4 flex flex-col space-y-4 font-sans animate-menuFadeIn"
            style={darkGlassStyle(0.65, 32, 0.08)}
          >
            <div className="border-b border-white/8 pb-2 text-[11px] font-semibold text-white/60 flex items-center justify-between">
              <span>System Settings</span>
              <Icons.Sliders className="w-3.5 h-3.5 text-white/40" />
            </div>

            {/* Accent Theme Color selector */}
            <div className="space-y-2">
              <span className="text-[10px] text-white/40 font-medium">Accent Color</span>
              <div className="grid grid-cols-4 gap-2">
                {(['cyan', 'purple', 'green', 'orange'] as const).map((t) => {
                  const isActive = state.theme === t;
                  const colorMap = {
                    cyan: 'bg-blue-500',
                    purple: 'bg-violet-500',
                    green: 'bg-emerald-500',
                    orange: 'bg-amber-500'
                  };
                  return (
                    <button
                      key={t}
                      onClick={() => { playSound.click(); store.setTheme(t); }}
                      className={`h-7 rounded-lg transition-all duration-200 flex items-center justify-center relative active:scale-95 ${colorMap[t]} ${
                        isActive ? 'ring-2 ring-white scale-105 shadow-md' : 'opacity-50 hover:opacity-90'
                      }`}
                    >
                      {isActive && <Icons.Check className="w-3.5 h-3.5 text-white font-bold" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wallpaper Background selector */}
            <div className="space-y-2 border-t border-white/6 pt-3">
              <span className="text-[10px] text-white/40 font-medium">Desktop Wallpaper</span>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { id: 'particles', label: 'Dynamic Mesh' },
                  { id: 'matrix', label: 'Dot Grid' },
                  { id: 'stars', label: 'Breathing Stars' },
                  { id: 'scanlines', label: 'Studio Grid' }
                ] as const).map((wp) => {
                  const isActive = (state.wallpaper || 'particles') === wp.id;
                  return (
                    <button
                      key={wp.id}
                      onClick={() => { playSound.click(); store.setWallpaper(wp.id); }}
                      className={`py-1.5 rounded-lg text-[10px] font-medium transition duration-200 active:scale-95 ${
                        isActive 
                          ? 'text-white font-semibold' 
                          : 'text-white/40 hover:text-white/70'
                      }`}
                      style={isActive ? {
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {wp.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sounds Switch */}
            <div className="flex items-center justify-between border-t border-white/6 pt-3 select-none">
              <span className="text-[10px] text-white/40 font-medium">Sound Feedback</span>
              <button
                onClick={() => { playSound.click(); store.toggleSound(); }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition active:scale-95 ${
                  state.soundEnabled 
                    ? 'text-emerald-300' 
                    : 'text-white/40'
                }`}
                style={{
                  background: state.soundEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${state.soundEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                {state.soundEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>

            {/* Lock Device trigger */}
            <button
              onClick={() => { playSound.warning(); store.lockSystem(); }}
              className="w-full py-2 text-white/70 hover:text-white text-[10px] rounded-lg font-medium transition flex items-center justify-center space-x-1.5 active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Icons.Lock className="w-3.5 h-3.5 text-white/50" />
              <span>Lock Environment</span>
            </button>
          </div>
        </div>
      )}

      {/* ===== SPOTLIGHT SEARCH (Glass Raycast overlay) ===== */}
      {state.showSpotlight && (
        <div 
          onClick={() => store.toggleSpotlight(false)}
          className="absolute inset-0 z-[1000] flex justify-center pt-[15vh] px-4 font-sans select-none"
          style={{ background: 'rgba(0,0,0,0.25)' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl p-3 flex flex-col space-y-3 h-fit max-h-[50vh]"
            style={{
              ...glassStyle(0.1, 36, 0.08),
              boxShadow: '0 16px 60px -8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex flex-col space-y-3">
              <div className="flex justify-between items-center text-[10px] text-white/30 uppercase tracking-widest pl-1 font-bold">
                <span>{state.activeWorkspace === 'dev' ? 'Ask Aether AI Command Center' : 'System Search'}</span>
                <Icons.Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              </div>
              <div className="flex items-center relative select-text">
                <Icons.Search className="w-4 h-4 text-white/40 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder={state.activeWorkspace === 'dev' ? "Ask AETHER to optimize, scan, or launch workflows..." : "Search apps and commands..."}
                  className="w-full rounded-xl px-3 py-2.5 pl-9 text-white text-sm outline-none placeholder-white/30 font-sans"
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                  autoFocus
                />
              </div>
            </div>

            {/* Quick Action Workflows */}
            {state.activeWorkspace === 'dev' && (
              <div className="space-y-1.5 pr-1 select-none border-t border-white/6 pt-2">
                <span className="text-[9px] text-cyan-400 font-bold tracking-wide uppercase pl-1">Ask Aether AI Workflows</span>
                <div className="grid grid-cols-2 gap-2 text-left">
                  {[
                    { label: 'Run Diagnostic Shell', cmd: 'run diagnostic' },
                    { label: 'Scan Network Ports', cmd: 'network scan' },
                    { label: 'Re-initialize Workspace', cmd: 'clear' },
                    { label: 'Optimize System RAM', cmd: 'kill 104' }
                  ].map((act, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        playSound.success();
                        store.toggleSpotlight(false);
                        store.sendAiMessage(act.cmd);
                      }}
                      className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-[9px] text-white/60 hover:text-white hover:bg-white/[0.06] hover:border-white/10 transition text-left flex items-center justify-between"
                    >
                      <span>{act.label}</span>
                      <Icons.ChevronRight className="w-3 h-3 text-white/30" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results listing */}
            <div className="overflow-y-auto space-y-1 scrollbar-thin max-h-60 pr-1 select-none">
              <span className="text-[10px] text-white/40 font-semibold tracking-wide pl-1">Applications</span>
              {filteredApps.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No matching applications</p>
              ) : (
                filteredApps.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => { store.toggleSpotlight(false); handleLaunchApp(app.id); }}
                    className="p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition group"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.03)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)';
                    }}
                  >
                    <div className="flex items-center space-x-3">
                      <div 
                        className="p-1.5 rounded-lg text-white/60"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        {getIcon(app.icon, "w-4 h-4")}
                      </div>
                      <span className="text-white/80 group-hover:text-white text-xs font-medium">{app.title}</span>
                    </div>
                    <span 
                      className="text-[10px] text-white/30 font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      Open
                    </span>
                  </div>
                ))
              )}

              {filteredFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  <span className="text-[10px] text-white/40 font-semibold tracking-wide pl-1">Workspace Files & Folders</span>
                  {filteredFiles.map((res: any) => {
                    const isDir = res.node.type === 'dir';
                    return (
                      <div
                        key={res.path}
                        onClick={() => {
                          store.toggleSpotlight(false);
                          if (isDir) {
                            store.openWindow('explorer');
                          } else {
                            (window as any).AetherActiveEditFilePath = res.path;
                            store.openWindow('editor');
                          }
                        }}
                        className="p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition group"
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.02)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.02)';
                        }}
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <div 
                            className="p-1.5 rounded-lg text-white/50"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.03)' }}
                          >
                            {isDir ? <Icons.Folder className="w-3.5 h-3.5 text-cyan-400" /> : <Icons.FileText className="w-3.5 h-3.5 text-white/40" />}
                          </div>
                          <div className="flex flex-col truncate text-left">
                            <span className="text-white/80 group-hover:text-white text-xs font-semibold truncate leading-normal">{res.node.name}</span>
                            <span className="text-[9px] text-white/30 truncate leading-normal">{res.path}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {res.node.type === 'file' && res.node.tags && res.node.tags.slice(0, 1).map((tag: string) => (
                            <span key={tag} className="text-[8px] text-cyan-400 bg-cyan-500/10 px-1 py-0.2 rounded uppercase border border-cyan-500/15">{tag}</span>
                          ))}
                          <span 
                            className="text-[9px] text-white/30 font-mono px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                          >
                            {isDir ? 'Browse' : 'Edit'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-white/30 border-t border-white/6 pt-2 flex justify-between">
              <span>Press ⌥ Space to toggle</span>
              <span>AETHER-OS</span>
            </div>
          </div>
        </div>
      )}

      {/* ===== NOTIFICATION CENTER DRAWER (Glass) ===== */}
      {showNotificationDrawer && (
        <div 
          onClick={() => setShowNotificationDrawer(false)}
          className="absolute inset-0 z-[1200] flex justify-end font-sans select-none"
          style={{ background: 'rgba(0,0,0,0.15)' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-80 h-full flex flex-col justify-between p-5"
            style={{
              ...glassStyle(0.08, 32, 0.06),
              borderLeft: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 0,
              animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Drawer Header */}
            <div className="flex justify-between items-center border-b border-white/8 pb-3">
              <div className="flex items-center space-x-2 text-white/90">
                <Icons.Activity className={`w-4 h-4 ${textTheme}`} />
                <span className="font-semibold uppercase tracking-wider text-[10px]">System Logs</span>
              </div>
              <button
                onClick={() => { playSound.click(); setShowNotificationDrawer(false); }}
                className="p-1 rounded-lg text-white/40 hover:text-white/80 transition"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications Registry List */}
            <div className="flex-1 overflow-y-auto space-y-3.5 py-4 scrollbar-thin pr-1 select-text">
              <div className="text-[9px] text-white/30 uppercase tracking-wider pl-1 font-semibold">Chronological Logs</div>
              {state.notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/30 text-center uppercase py-12">
                  <Icons.ShieldCheck className="w-9 h-9 stroke-[1.2] mb-2" />
                  <p className="text-[10px] tracking-wider font-semibold">No active logs</p>
                </div>
              ) : (
                state.notifications.map((log) => (
                  <div 
                    key={log.id} 
                    className="p-3 rounded-xl space-y-1 transition-all duration-300"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div className="flex justify-between items-center text-[9px]">
                      <span className={`font-semibold uppercase tracking-wide ${textTheme}`}>{log.title}</span>
                      <span className="text-white/25 font-mono text-[8px]">{log.time}</span>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed font-sans">{log.desc}</p>
                  </div>
                ))
              )}
            </div>

            {/* Clear Logs Action Footer */}
            <div className="border-t border-white/6 pt-3">
              <button
                onClick={() => {
                  playSound.warning();
                  store.getState().notifications = [];
                  store.addNotification('Logs Purged', 'Workspace notification history cleared.', 'Just now');
                }}
                className="w-full py-2 text-white/50 hover:text-white/80 text-[10px] rounded-xl font-semibold uppercase tracking-wider transition flex items-center justify-center space-x-1.5 active:scale-95"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <Icons.Trash2 className="w-3.5 h-3.5" />
                <span>Clear Logs</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ===== BOTTOM LEFT: Quick Settings HUD (Glass) ===== */}
      <div 
        className={`absolute bottom-3 left-3 z-[500] h-11 px-2 rounded-2xl flex items-center space-x-1 select-none transition-all duration-700 ease-out ${
          state.isVoiceActive && state.voiceState === 'LISTENING' ? 'opacity-15 scale-90 -translate-x-5 translate-y-5 pointer-events-none' 
          : state.isTheaterMode ? 'opacity-0 scale-90 -translate-x-5 translate-y-5 pointer-events-none'
          : ''
        }`}
        style={glassStyle(0.12, 24, 0.08)}
      >
        <button
          onClick={() => { playSound.click(); store.toggleQuickSettings(); }}
          className={`p-2 rounded-xl transition-all duration-200 active:scale-95 ${
            state.showQuickSettings ? 'text-white bg-white/12' : 'text-white/50 hover:text-white/80 hover:bg-white/8'
          }`}
          title="System Preferences"
        >
          <Icons.Sliders className="w-4 h-4" />
        </button>

        <button
          onClick={() => { playSound.click(); setShowWidgetPanel(!showWidgetPanel); }}
          className={`p-2 rounded-xl transition-all duration-200 active:scale-95 ${
            showWidgetPanel ? 'text-white bg-white/12' : 'text-white/50 hover:text-white/80 hover:bg-white/8'
          }`}
          title="Widgets"
        >
          <Icons.LayoutGrid className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => { playSound.click(); store.toggleSpotlight(true); }}
          className="px-2.5 py-1.5 rounded-xl text-white/50 hover:text-white/80 hover:bg-white/8 transition-all flex items-center space-x-1.5 active:scale-95 font-sans text-[11px] font-medium"
          title="Search"
        >
          <Icons.Search className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Search</span>
        </button>
      </div>

      {/* ===== CENTER DOCK (macOS-style Glass Capsule) ===== */}
      <footer 
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-[500] h-12 px-3 rounded-2xl flex items-center space-x-1 select-none transition-all duration-700 ease-out ${
          state.isVoiceActive && state.voiceState === 'LISTENING' ? 'opacity-15 scale-90 translate-y-5 pointer-events-none' 
          : state.isTheaterMode ? 'opacity-0 scale-90 translate-y-5 pointer-events-none'
          : 'animate-fadeIn'
        }`}
        style={{
          background: state.activeWorkspace === 'dev' ? 'rgba(10, 10, 15, 0.72)' :
                     state.activeWorkspace === 'media' ? 'rgba(25, 15, 8, 0.35)' :
                     'rgba(10, 20, 15, 0.42)',
          backdropFilter: state.activeWorkspace === 'dev' ? 'blur(28px) saturate(130%)' :
                          state.activeWorkspace === 'media' ? 'blur(24px) saturate(160%)' :
                          'blur(30px) saturate(150%)',
          WebkitBackdropFilter: state.activeWorkspace === 'dev' ? 'blur(28px) saturate(130%)' :
                                state.activeWorkspace === 'media' ? 'blur(24px) saturate(160%)' :
                                'blur(30px) saturate(150%)',
          border: state.activeWorkspace === 'dev' ? '1px solid rgba(255, 255, 255, 0.08)' :
                  state.activeWorkspace === 'media' ? '1px solid rgba(251, 146, 60, 0.25)' :
                  '1px solid rgba(52, 211, 153, 0.2)',
          boxShadow: state.activeWorkspace === 'dev' ? '0 12px 40px -4px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)' :
                     state.activeWorkspace === 'media' ? '0 12px 40px -4px rgba(251, 146, 60, 0.12), inset 0 1px 0 rgba(255,255,255,0.05)' :
                     '0 12px 40px -4px rgba(52, 211, 153, 0.1), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {state.windows.filter(app => state.installedAppIds?.includes(app.id)).map((app) => {
          const isOpen = app.isOpen;
          const isFocused = state.activeAppId === app.id;
          
          return (
            <button
              key={app.id}
              onClick={() => handleLaunchApp(app.id)}
              data-magnetic
              className={`p-2 rounded-xl transition-all duration-300 relative group flex items-center justify-center hover:-translate-y-0.5 active:scale-95 ${
                isFocused 
                  ? 'text-white' 
                  : isOpen
                  ? 'text-white/60 hover:text-white/90'
                  : 'text-white/35 hover:text-white/70'
              }`}
              style={isFocused ? {
                background: 'rgba(255, 255, 255, 0.14)',
                boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
              } : undefined}
              onMouseEnter={(e) => {
                if (!isFocused) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onMouseLeave={(e) => {
                if (!isFocused) e.currentTarget.style.background = 'transparent';
              }}
              title={app.title}
            >
              {getIcon(app.icon, "w-[18px] h-[18px]")}

              {/* Open state dot indicator */}
              {isOpen && (
                <span 
                  className={`absolute -bottom-0.5 w-1 h-1 rounded-full transition-colors ${
                    isFocused ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              )}
              
              {/* Tooltip on hover */}
              <span className={`absolute -top-9 scale-0 group-hover:scale-100 transition-transform text-[10px] text-white/90 px-2.5 py-1 rounded-lg pointer-events-none select-none z-[100] whitespace-nowrap ${
                state.activeWorkspace === 'dev' ? 'font-mono' : 'font-sans'
              }`}
                style={{
                  background: state.activeWorkspace === 'dev' ? '#0c0c10' : 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(12px)',
                  border: state.activeWorkspace === 'dev' ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                }}
              >
                {state.activeWorkspace === 'dev' ? `» ${app.title.toUpperCase()}` : app.title}
              </span>
            </button>
          );
        })}
      </footer>

      {/* ===== BOTTOM RIGHT: System Tray (Glass) ===== */}
      <div 
        onClick={() => { playSound.click(); setShowNotificationDrawer(true); }}
        className={`absolute bottom-3 right-3 z-[500] h-11 px-3 rounded-2xl flex items-center space-x-3.5 font-sans text-xs select-none cursor-pointer transition-all duration-700 ease-out ${
          state.isVoiceActive && state.voiceState === 'LISTENING' ? 'opacity-15 scale-90 translate-x-5 translate-y-5 pointer-events-none' 
          : state.isTheaterMode ? 'opacity-0 scale-90 translate-x-5 translate-y-5 pointer-events-none'
          : 'transition-colors'
        }`}
        style={glassStyle(0.12, 24, 0.08)}
      >
        <div className="hidden sm:flex items-center space-x-3 border-r border-white/8 pr-3.5">
          {/* WiFi Icon */}
          <div className="flex items-center space-x-1 text-white/40 hover:text-white/70 transition cursor-help" title="Connected (5.8 GHz)">
            <Icons.Wifi className="w-3.5 h-3.5" />
          </div>
          
          {/* Battery Icon */}
          <div className="flex items-center space-x-1 text-emerald-400/70 hover:text-emerald-300 transition cursor-help" title="100% Charged">
            <Icons.Battery className="w-3.5 h-3.5" />
          </div>

          {/* Status */}
          <div className="flex items-center space-x-1 pr-1.5">
            <Icons.CheckCircle className="w-3 h-3 text-emerald-400/60" />
          </div>


          {/* Aether Ambient Orb In System Tray */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              playSound.click();
              if (state.isVoiceActive) {
                store.deactivateVoiceEngine();
              } else {
                store.activateVoiceEngine();
              }
            }}
            className="p-2 relative flex items-center justify-center rounded-xl hover:bg-white/5 active:scale-95 group transition-all"
            title="Aether Operating Intelligence (Say 'Hi Venom')"
          >
            {/* The Tiny Orb Bloom */}
            <div 
              className={`w-2.5 h-2.5 rounded-full transition-all duration-500 relative ${
                state.isVoiceActive ? 'scale-125' : 'animate-[pulse_3s_infinite]'
              }`}
              style={{
                background: state.theme === 'purple' ? 'radial-gradient(circle, #c084fc 0%, #8b5cf6 100%)' :
                             state.theme === 'green' ? 'radial-gradient(circle, #34d399 0%, #059669 100%)' :
                             state.theme === 'orange' ? 'radial-gradient(circle, #fb923c 0%, #ea580c 100%)' :
                             'radial-gradient(circle, #22d3ee 0%, #0891b2 100%)',
                boxShadow: state.theme === 'purple' ? '0 0 10px #a855f7, 0 0 20px rgba(168, 85, 247, 0.4)' :
                           state.theme === 'green' ? '0 0 10px #10b981, 0 0 20px rgba(16, 185, 129, 0.4)' :
                           state.theme === 'orange' ? '0 0 10px #f97316, 0 0 20px rgba(249, 115, 22, 0.4)' :
                           '0 0 10px #06b6d4, 0 0 20px rgba(6, 182, 212, 0.4)',
              }}
            />
          </button>
        </div>
        
        {/* System Clock */}
        <div 
          title={new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          className="flex items-center space-x-1.5 font-medium text-white/80 cursor-help"
        >
          <span className="text-[11px]">{timeStr || '13:00'}</span>
        </div>
      </div>

      {/* Right-click desktop Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={contextMenuItems}
        />
      )}

      {/* Widget Panel */}
      {showWidgetPanel && (
        <WidgetPanel onClose={() => setShowWidgetPanel(false)} />
      )}

      {/* ===== GLOBAL AMBIENT VOICE OVERLAY ===== */}
      {state.isVoiceActive && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 animate-fadeIn transition-all duration-700 pointer-events-none"
          style={{
            background: 'rgba(3, 3, 5, 0.45)',
            backdropFilter: 'blur(28px) saturate(140%)',
            WebkitBackdropFilter: 'blur(28px) saturate(140%)'
          }}
        >
          {/* Click background to sleep */}
          <div className="absolute inset-0 z-0 pointer-events-auto cursor-pointer" onClick={() => store.deactivateVoiceEngine()} />

          {/* Centered Glowing Volumetric Orb */}
          <div className="flex flex-col items-center justify-center space-y-8 relative z-10 pointer-events-none w-full max-w-lg">
            
            {/* The Fluid Orb Canvas */}
            <div className="w-[320px] h-[320px] flex items-center justify-center relative pointer-events-auto overflow-visible">
              <canvas 
                ref={waveCanvasRef} 
                onClick={() => store.deactivateVoiceEngine()}
                className="w-full h-full block cursor-pointer transition-transform duration-500 hover:scale-105 active:scale-95 overflow-visible mix-blend-screen" 
                title="Tap to Standby"
              />
            </div>

            {/* Minimalist Floating Typography Display */}
            <div className="space-y-3 min-h-[90px] px-6 text-center select-none w-full animate-fadeIn flex flex-col items-center justify-center">
              
              {/* 1. Unified Status Metadata */}
              <p className={`text-[10px] font-mono tracking-[0.4em] uppercase animate-pulse mb-2
                ${state.voiceState === 'WAKE_DETECTED' ? activeThemeText : ''}
                ${state.voiceState === 'LISTENING' ? 'text-neutral-400 bg-gradient-to-r from-neutral-500 via-white to-neutral-500 bg-clip-text text-transparent animate-gradient' : ''}
                ${state.voiceState === 'PROCESSING' || state.voiceState === 'EXECUTING' ? 'text-white/30' : ''}
                ${state.voiceState === 'RESPONDING' ? 'text-neutral-500' : ''}
                ${state.voiceState === 'RETURN_TO_IDLE' ? 'text-white/20' : ''}
              `}>
                {state.voiceState === 'WAKE_DETECTED' && 'AETHER WAKING...'}
                {state.voiceState === 'LISTENING' && 'CAPTURING FEED'}
                {state.voiceState === 'PROCESSING' && 'THINKING'}
                {state.voiceState === 'EXECUTING' && 'SYNCING INTENT'}
                {state.voiceState === 'RESPONDING' && 'TRANSMITTING'}
                {state.voiceState === 'RETURN_TO_IDLE' && 'Subsystem Standby...'}
              </p>

              {/* 2. THE SUBTITLE COMPONENT FIX */}
              {/* Renders whatever string is alive in memory (User prompt OR Assistant reply) */}
              <div className="max-w-xl mx-auto px-6">
                <p className={`font-sans font-light italic text-base tracking-wide transition-all duration-300 max-w-md
                  ${state.voiceState === 'RESPONDING' 
                    ? 'text-cyan-100 drop-shadow-[0_0_12px_rgba(6,182,212,0.35)] font-normal' 
                    : 'text-white/90'}
                `}>
                  {activeDisplayUtterance === 'Speak naturally...' || 
                   activeDisplayUtterance === 'Standby...' || 
                   activeDisplayUtterance === 'AETHER WAKING...' || 
                   activeDisplayUtterance === 'Subsystem Standby...'
                    ? activeDisplayUtterance 
                    : `"${activeDisplayUtterance}"`}
                </p>
              </div>

            </div>
          </div>

          {/* ===== ULTRA-MINIMALIST FLOATING DEVELOPER SANDBOX TRIGGER (Collapsible, almost invisible on hover) ===== */}
          <div 
            className="absolute bottom-6 left-6 z-[10000] pointer-events-auto select-none opacity-20 hover:opacity-100 transition-opacity duration-300 flex flex-col space-y-2 p-3.5 rounded-2xl border border-white/5 bg-[#0c0c12]/40 backdrop-blur-xl max-w-[280px]"
          >
            <span className="text-[8px] text-white/30 uppercase tracking-widest pl-1 font-bold">Simulator Override Commands</span>
            
            <div className="grid grid-cols-2 gap-1.5 text-[9px]">
              <button 
                onClick={() => store.processVoiceCommand('Open terminal window')}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 hover:text-white transition text-left truncate active:scale-95"
              >
                💻 Terminal
              </button>
              <button 
                onClick={() => store.processVoiceCommand('Continue backend workspace')}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 hover:text-white transition text-left truncate active:scale-95"
              >
                🚀 dev Workspace
              </button>
              <button 
                onClick={() => store.processVoiceCommand('Enable Focus Mode')}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 hover:text-white transition text-left truncate active:scale-95"
              >
                👁️ Focus Mode
              </button>
              <button 
                onClick={() => store.processVoiceCommand('Optimize performance')}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 hover:text-white transition text-left truncate active:scale-95"
              >
                ⚙️ Optimize VRAM
              </button>
              <button 
                onClick={() => store.processVoiceCommand('Enter cinematic mode')}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 hover:text-white transition text-left truncate active:scale-95"
              >
                🎬 Cinematic
              </button>
              <button 
                onClick={() => store.processVoiceCommand('toggle theater mode')}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 hover:text-white transition text-left truncate active:scale-95"
              >
                🎭 Theater Dim
              </button>
              <button 
                onClick={() => store.processVoiceCommand('tile windows')}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 hover:text-white transition text-left truncate active:scale-95"
              >
                📐 Tile Snaps
              </button>
              <button 
                onClick={() => store.processVoiceCommand('reset layout')}
                className="px-2 py-1 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/60 hover:text-white transition text-left truncate active:scale-95"
              >
                🔄 Reset Layout
              </button>
              <button 
                onClick={() => store.processVoiceCommand('Shutdown system')}
                className="col-span-2 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/5 hover:bg-rose-500/20 text-rose-400 hover:text-rose-350 transition text-center truncate active:scale-95"
              >
                🛑 Shutdown
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
