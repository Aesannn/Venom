import React, { useRef, useState, useEffect } from 'react';
import { store, useSystemState } from '../store/systemStore';
import { playSound } from '../utils/audio';
import * as Icons from 'lucide-react';

interface WindowFrameProps {
  id: string;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = ({ id, children }) => {
  const state = useSystemState();
  const win = state.windows.find(w => w.id === id);
  const isActive = state.activeAppId === id;

  const appManifest = state.manifests?.find(m => m.id === id);
  const renderingMode = appManifest ? appManifest.renderingMode : 'glassmorphic';

  const category = ['ai-chat', 'terminal', 'explorer', 'notes', 'calculator', 'editor', 'git-integrator', 'llama-tuner', 'telemetry', 'temporal-ledger'].includes(id) ? 'dev' 
    : ['player', 'visualizer', 'browser', 'docker-manager', 'device-mesh'].includes(id) ? 'media'
    : 'sys';
  const isCurrentWorkspace = (state.activeWorkspace || 'dev') === category;

  const dragRef = useRef<HTMLDivElement>(null);
  const [isSnapping, setIsSnapping] = useState<'none' | 'left' | 'right' | 'top'>('none');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Specular sheen & spatial tilt coordinate values
  const [reflectionPos, setReflectionPos] = useState({ x: 0, y: 0 });
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  // Spatial Inertia & Snap tracking variables
  const [dragTilt, setDragTilt] = useState({ rx: 0, ry: 0 });
  const [isMagnetSnapped, setIsMagnetSnapped] = useState(false);
  const isSnappedX = useRef(false);
  const isSnappedY = useRef(false);

  // Real-time compiler warning check for editor window glowing border
  const [hasCompilerWarning, setHasCompilerWarning] = useState(false);
  const [compilationStatus, setCompilationStatus] = useState<'idle' | 'compiling' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (id !== 'editor') return;
    
    const interval = setInterval(() => {
      const warning = (window as any).AetherEditorCompilationWarning;
      setHasCompilerWarning(!!warning);
      
      const status = (window as any).AetherEditorCompilationStatus || 'idle';
      setCompilationStatus(status);
    }, 200);

    return () => clearInterval(interval);
  }, [id]);

  // Keyboard Snap Listeners
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          playSound.click();
          store.updateWindowSize(id, window.innerWidth / 2, window.innerHeight - 56, 0, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          playSound.click();
          store.updateWindowSize(id, window.innerWidth / 2, window.innerHeight - 56, window.innerWidth / 2, 0);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          playSound.click();
          store.maximizeWindow(id);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          playSound.click();
          store.minimizeWindow(id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, id]);

  if (!win || !win.isOpen || win.isMinimized) return null;

  // Icon mapping
  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    if (!IconComponent) return <Icons.AppWindow className="w-4 h-4" />;
    return <IconComponent className="w-4 h-4" />;
  };

  // DRAG EVENT HANDLER (With physical velocity inertia and magnetic snapping)
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (win.isMaximized) return;
    e.preventDefault();
    store.focusWindow(id);
    playSound.click();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = win.x;
    const initialY = win.y;

    let lastTime = Date.now();
    let lastX = e.clientX;
    let lastY = e.clientY;
    let vx = 0;
    let vy = 0;

    const handleDragMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      let newX = initialX + deltaX;
      let newY = initialY + deltaY;

      // Calculate instantaneous dragging velocity
      const currentTime = Date.now();
      const timeDelta = currentTime - lastTime || 1;
      vx = (moveEvent.clientX - lastX) / timeDelta;
      vy = (moveEvent.clientY - lastY) / timeDelta;

      lastTime = currentTime;
      lastX = moveEvent.clientX;
      lastY = moveEvent.clientY;

      // Apply dynamic inertia drag tilt physics (clamped to prevent extremes)
      const ry = Math.min(8, Math.max(-8, -vx * 7));
      const rx = Math.min(8, Math.max(-8, vy * 7));
      setDragTilt({ rx, ry });

      // Bounding box snap alignment checks against adjacent open windows on the same workspace
      const currentWorkspace = state.activeWorkspace || 'dev';
      const otherWins = state.windows.filter(w => 
        w.id !== id && 
        w.isOpen && 
        !w.isMinimized &&
        (['ai-chat', 'terminal', 'explorer', 'notes', 'calculator', 'editor', 'git-integrator', 'llama-tuner', 'telemetry', 'temporal-ledger'].includes(w.id) ? 'dev' 
          : ['player', 'visualizer', 'browser', 'docker-manager', 'device-mesh'].includes(w.id) ? 'media'
          : 'sys') === currentWorkspace
      );

      let snapX = null;
      let snapY = null;
      const snapThreshold = 20;

      for (const other of otherWins) {
        // Horizontal snaps
        if (Math.abs(newX - (other.x + other.width)) < snapThreshold) {
          snapX = other.x + other.width;
        } else if (Math.abs((newX + win.width) - other.x) < snapThreshold) {
          snapX = other.x - win.width;
        } else if (Math.abs(newX - other.x) < snapThreshold) {
          snapX = other.x;
        } else if (Math.abs((newX + win.width) - (other.x + other.width)) < snapThreshold) {
          snapX = other.x + other.width - win.width;
        }

        // Vertical snaps
        if (Math.abs(newY - (other.y + other.height)) < snapThreshold) {
          snapY = other.y + other.height;
        } else if (Math.abs((newY + win.height) - other.y) < snapThreshold) {
          snapY = other.y - win.height;
        } else if (Math.abs(newY - other.y) < snapThreshold) {
          snapY = other.y;
        } else if (Math.abs((newY + win.height) - (other.x + other.width)) < snapThreshold) {
          // snap to other's height align
          snapY = other.y + other.height - win.height;
        }
      }

      // Proximity snap locks with dynamic audio microinteractions
      if (snapX !== null) {
        newX = snapX;
        if (!isSnappedX.current) {
          playSound.click();
          isSnappedX.current = true;
        }
      } else {
        isSnappedX.current = false;
      }

      if (snapY !== null) {
        newY = snapY;
        if (!isSnappedY.current) {
          playSound.click();
          isSnappedY.current = true;
        }
      } else {
        isSnappedY.current = false;
      }

      setIsMagnetSnapped(snapX !== null || snapY !== null);

      // Bound within screen limits
      newX = Math.max(-win.width + 100, Math.min(window.innerWidth - 100, newX));
      newY = Math.max(0, Math.min(window.innerHeight - 80, newY));

      // Snapping Previews (standard full-size zones)
      if (moveEvent.clientY < 15) {
        setIsSnapping('top');
      } else if (moveEvent.clientX < 20) {
        setIsSnapping('left');
      } else if (moveEvent.clientX > window.innerWidth - 20) {
        setIsSnapping('right');
      } else {
        setIsSnapping('none');
      }

      store.updateWindowPosition(id, newX, newY);
    };

    const handleDragEnd = (endEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      setIsDragging(false);

      // Smoothly spring tilts back to flat
      setDragTilt({ rx: 0, ry: 0 });
      setIsMagnetSnapped(false);
      isSnappedX.current = false;
      isSnappedY.current = false;

      // Perform snaps
      if (endEvent.clientY < 15) {
        store.maximizeWindow(id);
        setIsSnapping('none');
        return;
      } else if (endEvent.clientX < 20) {
        store.updateWindowSize(id, window.innerWidth / 2, window.innerHeight - 56, 0, 0);
        setIsSnapping('none');
        return;
      } else if (endEvent.clientX > window.innerWidth - 20) {
        store.updateWindowSize(id, window.innerWidth / 2, window.innerHeight - 56, window.innerWidth / 2, 0);
        setIsSnapping('none');
        return;
      }
      setIsSnapping('none');

      // Drag inertia sliding loop
      if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
        let slideVx = vx * 12;
        let slideVy = vy * 12;

        const decayLoop = () => {
          if (Math.abs(slideVx) < 0.05 && Math.abs(slideVy) < 0.05) {
            return;
          }

          // Friction decay coefficient
          slideVx *= 0.91;
          slideVy *= 0.91;

          const currentWin = store.getState().windows.find(w => w.id === id);
          if (currentWin && currentWin.isOpen && !currentWin.isMinimized && !currentWin.isMaximized) {
            let nextX = currentWin.x + slideVx;
            let nextY = currentWin.y + slideVy;

            // Elastic screen boundary bouncing checks
            if (nextX < 0) {
              nextX = 0;
              slideVx = -slideVx * 0.35;
              playSound.click();
            } else if (nextX > window.innerWidth - currentWin.width) {
              nextX = window.innerWidth - currentWin.width;
              slideVx = -slideVx * 0.35;
              playSound.click();
            }

            if (nextY < 0) {
              nextY = 0;
              slideVy = -slideVy * 0.35;
              playSound.click();
            } else if (nextY > window.innerHeight - 80) {
              nextY = window.innerHeight - 80;
              slideVy = -slideVy * 0.35;
              playSound.click();
            }

            store.updateWindowPosition(id, nextX, nextY);
            requestAnimationFrame(decayLoop);
          }
        };

        requestAnimationFrame(decayLoop);
      }
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  };

  // RESIZE EVENT HANDLER
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    store.focusWindow(id);
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = win.width;
    const initialH = win.height;

    const handleResizeMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      const newW = Math.max(win.minWidth, initialW + deltaX);
      const newH = Math.max(win.minHeight, initialH + deltaY);

      store.updateWindowSize(id, newW, newH);
    };

    const handleResizeEnd = () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleResizeEnd);
  };

  // Specular sheen and spatial spring coordinates updater
  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      const lx = e.clientX - rect.left;
      const ly = e.clientY - rect.top;
      setReflectionPos({ x: lx, y: ly });

      // Highly dampened 3D spatial parallax tilt (Apple display plate feel)
      if (isActive && !win.isMaximized) {
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const dx = lx - cx;
        const dy = ly - cy;
        
        const maxTilt = 0.8; // Restrained to 0.8 degrees to prevent motion sickness
        const rx = -(dy / cy) * maxTilt;
        const ry = (dx / cx) * maxTilt;
        setTilt({ rx, ry });
      }
    }
  };

  const handleMouseLeave = () => {
    // Reset spatial tilts smoothly
    setTilt({ rx: 0, ry: 0 });
  };

  // Calculate dynamic border highlights & physical casting shadows (Spotlight shadow parallax)
  const dx = reflectionPos.x - win.width / 2;
  const dy = reflectionPos.y - win.height / 2;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  const getBoxShadow = () => {
    if (id === 'editor' && compilationStatus === 'compiling') {
      return `inset 0 1px 0 0 rgba(255, 255, 255, 0.09), inset 1px 0 0 0 rgba(255, 255, 255, 0.03), 0 20px 50px -10px rgba(34, 211, 238, 0.45), 0 0 32px rgba(34, 211, 238, 0.35)`;
    }
    if (id === 'editor' && compilationStatus === 'success') {
      return `inset 0 1px 0 0 rgba(255, 255, 255, 0.09), inset 1px 0 0 0 rgba(255, 255, 255, 0.03), 0 20px 50px -10px rgba(16, 185, 129, 0.45), 0 0 32px rgba(16, 185, 129, 0.35)`;
    }
    if (id === 'editor' && compilationStatus === 'error') {
      return `inset 0 1px 0 0 rgba(255, 255, 255, 0.09), inset 1px 0 0 0 rgba(255, 255, 255, 0.03), 0 20px 50px -10px rgba(239, 68, 68, 0.45), 0 0 32px rgba(239, 68, 68, 0.35)`;
    }

    if (id === 'editor' && hasCompilerWarning) {
      return `inset 0 1px 0 0 rgba(255, 255, 255, 0.09), inset 1px 0 0 0 rgba(255, 255, 255, 0.03), 0 20px 50px -10px rgba(245, 158, 11, 0.38), 0 0 24px rgba(245, 158, 11, 0.25)`;
    }

    const snapGlow = isMagnetSnapped 
      ? (state.activeWorkspace === 'dev' ? ', 0 0 24px rgba(34, 211, 238, 0.25)' 
         : state.activeWorkspace === 'media' ? ', 0 0 24px rgba(251, 146, 60, 0.25)' 
         : ', 0 0 24px rgba(52, 211, 153, 0.25)')
      : '';

    // Calculate light source offset (cursor-reactive spotlight shadow)
    const shadowX = Math.round((dx / (win.width / 2)) * -14);
    const shadowY = Math.round((dy / (win.height / 2)) * -14);

    if (isActive) {
      if (renderingMode === 'depth-aware') {
        // High Z-depth layered physical shadows
        return `inset 0 1px 0 0 rgba(255, 255, 255, 0.15), inset 1px 0 0 0 rgba(255, 255, 255, 0.04), ${shadowX}px ${shadowY + 28}px 48px -8px rgba(0, 0, 0, 0.8), ${shadowX * 0.5}px ${shadowY + 12}px 18px -4px rgba(0, 0, 0, 0.6)${snapGlow}`;
      }
      return `inset 0 1px 0 0 rgba(255, 255, 255, 0.09), inset 1px 0 0 0 rgba(255, 255, 255, 0.03), 0 20px 50px -10px rgba(0, 0, 0, 0.75)${snapGlow}`;
    } else {
      return 'inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 12px 32px -12px rgba(0, 0, 0, 0.6)';
    }
  };

  const getWorkspaceSlideOffset = () => {
    if (isCurrentWorkspace) return 'translateX(0)';
    const workspaces = ['dev', 'media', 'sys'];
    const currentIdx = workspaces.indexOf(state.activeWorkspace || 'dev');
    const targetIdx = workspaces.indexOf(category);
    
    if (targetIdx > currentIdx) {
      return 'translateX(150vw)';
    } else {
      return 'translateX(-150vw)';
    }
  };

  const workspaceTransform = getWorkspaceSlideOffset();

  const windowStyle: React.CSSProperties = win.isMaximized 
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(100vh - 56px)',
        zIndex: win.zIndex,
        transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
        transform: workspaceTransform,
        opacity: isCurrentWorkspace ? (isActive ? 1 : 0.75) : 0,
        filter: isCurrentWorkspace ? (isActive ? 'brightness(1)' : 'brightness(0.85) contrast(0.96) saturate(85%)') : 'none',
        pointerEvents: isCurrentWorkspace ? 'auto' : 'none',
        willChange: 'transform, opacity'
      }
    : {
        position: 'absolute',
        top: 0,
        left: 0,
        width: win.width,
        height: win.height,
        zIndex: win.zIndex,
        transform: isCurrentWorkspace 
          ? `translate3d(${win.x}px, ${win.y}px, 0) perspective(1200px) rotateX(${tilt.rx + dragTilt.rx}deg) rotateY(${tilt.ry + dragTilt.ry}deg) translateZ(${renderingMode === 'depth-aware' ? (isActive ? 32 : -20) : (isActive ? 0 : -40)}px) scale(${isActive ? 1 : 0.965})`
          : workspaceTransform,
        boxShadow: getBoxShadow(),
        transition: isDragging || isResizing 
          ? 'opacity 0.3s ease' 
          : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
        opacity: isCurrentWorkspace ? (isActive ? 1 : 0.75) : 0,
        filter: isCurrentWorkspace ? (isActive ? 'none' : 'brightness(0.85) contrast(0.96) saturate(85%)') : 'none',
        pointerEvents: isCurrentWorkspace ? 'auto' : 'none',
        willChange: 'transform, opacity'
      };

  return (
    <>
      {/* Snap Overlay Preview */}
      {isSnapping !== 'none' && (
        <div 
          className="absolute z-[998] border border-dashed border-zinc-700 bg-zinc-950/10 backdrop-blur-xs pointer-events-none transition-all duration-200"
          style={{
            top: 0,
            left: isSnapping === 'right' ? '50%' : 0,
            width: isSnapping === 'top' ? '100%' : '50%',
            height: 'calc(100vh - 56px)',
          }}
        />
      )}

      {/* Main Window Frame wrapper */}
      <div
        ref={dragRef}
        onMouseDown={() => store.focusWindow(id)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`flex flex-col rounded-xl transition-shadow duration-300 select-none group relative window-frame`}
        style={{
          ...windowStyle,
          background: renderingMode === 'flat' ? 'rgba(10, 10, 14, 0.94)'
            : renderingMode === 'crt-shell' ? 'rgba(6, 8, 6, 0.95)'
            : 'rgba(10, 10, 12, 0.45)',
          backdropFilter: renderingMode === 'flat' ? 'none'
            : renderingMode === 'crt-shell' ? 'blur(10px)'
            : 'none', // completely bypass backdrop-filter: blur refraction bottlenecks
          WebkitBackdropFilter: renderingMode === 'flat' ? 'none'
            : renderingMode === 'crt-shell' ? 'blur(10px)'
            : 'none',
          border: id === 'editor' && compilationStatus === 'compiling'
            ? '1.5px solid #22d3ee'
            : id === 'editor' && compilationStatus === 'success'
            ? '1.5px solid #10b981'
            : id === 'editor' && compilationStatus === 'error'
            ? '1.5px solid #ef4444'
            : renderingMode === 'crt-shell' 
              ? (isActive ? '1px solid #34d399' : '1px solid #065f46')
              : hasCompilerWarning 
                ? '1px solid rgba(245, 158, 11, 0.65)' 
                : (isActive ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.05)'),
          boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.08), 0 8px 32px rgba(0, 0, 0, 0.5)',
          backfaceVisibility: 'hidden',
        }}
      >
        {/* Dynamic Light-Reflective Glass Border Highlight */}
        {isActive && !win.isMaximized && (
          <div 
            className="absolute inset-0 rounded-lg pointer-events-none z-50"
            style={{
              padding: '1px',
              background: `linear-gradient(${angle + 180}deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.02) 60%, rgba(255, 255, 255, 0) 100%)`,
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
            }}
          />
        )}

        {/* Title Bar header */}
        <div
          onMouseDown={handleDragStart}
          onDoubleClick={() => { store.maximizeWindow(id); }}
          className={`h-9 border-b border-white/5 rounded-t-xl flex items-center justify-between px-3.5 cursor-grab active:cursor-grabbing select-none`}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
          }}
        >
          {/* App Info & Title (Left Side) */}
          <div className="flex items-center space-x-2">
            <span className="text-white/40">{getIcon(win.icon)}</span>
            <span className="font-sans text-[11px] font-medium tracking-wide normal-case text-white/70">{win.title}</span>
          </div>

          {/* Action Buttons (Right Side) */}
          <div className="flex items-center space-x-1" onMouseDown={(e) => e.stopPropagation()}>
            {/* Minimize */}
            <button
              onClick={() => { store.minimizeWindow(id); }}
              className="p-1 rounded-md text-white/35 hover:text-white hover:bg-white/5 transition flex items-center justify-center"
              title="Minimize"
            >
              <Icons.Minus className="w-3.5 h-3.5" />
            </button>
            {/* Close */}
            <button
              onClick={() => { store.closeWindow(id); }}
              className="p-1 rounded-md text-white/35 hover:text-rose-400 hover:bg-rose-500/10 transition flex items-center justify-center"
              title="Close"
            >
              <Icons.X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Window Content container (with frosted glass grain and specular reflection layer) */}
        <div 
          className="flex-1 overflow-hidden relative text-sm font-sans flex flex-col rounded-b-xl"
          style={{
            background: 'rgba(12, 12, 16, 0.55)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.008'/%3E%3C/svg%3E")`
          }}
        >
          {children}

          {/* Specular sheen reflection overlay */}
          <div 
            className="absolute inset-0 pointer-events-none z-50 mix-blend-screen transition-opacity duration-300 opacity-20 group-hover:opacity-30"
            style={{
              background: `radial-gradient(circle 240px at ${reflectionPos.x}px ${reflectionPos.y}px, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0) 100%)`
            }}
          />
        </div>

        {/* Resize Handle - visible only when NOT maximized */}
        {!win.isMaximized && (
          <div
            onMouseDown={handleResizeStart}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 pointer-events-auto z-[60]"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" className="text-white/20 hover:text-white/60 transition-colors">
              <line x1="6" y1="0" x2="6" y2="6" stroke="currentColor" strokeWidth="1" />
              <line x1="0" y1="6" x2="6" y2="6" stroke="currentColor" strokeWidth="1" />
              <line x1="4" y1="2" x2="4" y2="4" stroke="currentColor" strokeWidth="1" />
              <line x1="2" y1="4" x2="4" y2="4" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
        )}
      </div>
    </>
  );
};
