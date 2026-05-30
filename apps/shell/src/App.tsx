import { useState, useEffect } from 'react';
import { BootScreen } from './components/BootScreen';
import { LockScreen } from './components/LockScreen';
import { Desktop } from './components/Desktop';
import { useSystemState } from './store/systemStore';

function App() {
  const state = useSystemState();
  const isGlitched = state.isGlitched;

  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      const isClickable = target.closest('button') || 
                          target.closest('a') || 
                          target.closest('input') || 
                          target.closest('select') || 
                          target.closest('textarea') || 
                          target.closest('[role="button"]') ||
                          window.getComputedStyle(target).cursor === 'pointer';
      
      setIsHovered(!!isClickable);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  const themeGlow = 
    state.activeWorkspace === 'dev' ? 'rgba(34, 211, 238, 0.55)' :
    state.activeWorkspace === 'media' ? 'rgba(251, 146, 60, 0.55)' :
    'rgba(52, 211, 153, 0.55)';

  return (
    <div className={`w-screen h-screen overflow-hidden bg-[#030406] text-gray-200 font-sans select-none relative scanlines crt-flicker ${isGlitched ? 'crt-glitch' : ''}`}>
      
      {/* Booting Loader Diagnostic Sequence */}
      <BootScreen />

      {/* Holographic Security Authentication Gate */}
      <LockScreen />

      {/* Master Draggable Spatial Workspace HUD */}
      <Desktop />

      {/* 3D Glass Cursor */}
      <div
        className="fixed pointer-events-none z-[1000000] select-none hidden md:block"
        style={{
          left: cursorPos.x,
          top: cursorPos.y,
          transform: `translate3d(0, 0, 0) scale(${isHovered ? 1.15 : 1})`,
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.4)) drop-shadow(0 6px 14px rgba(0, 0, 0, 0.45))',
          transition: 'transform 0.1s ease-out',
        }}
      >
        {/* Dynamic theme-colored ambient backlighting glow */}
        <div 
          className="absolute -left-1.5 -top-1.5 w-6 h-6 rounded-full blur-md opacity-75"
          style={{
            background: `radial-gradient(circle, ${themeGlow} 0%, transparent 70%)`
          }}
        />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4.5 3V20.5L9.5 15.5H18.5L4.5 3Z"
            fill="rgba(15, 15, 22, 0.68)"
            stroke="white"
            strokeWidth="1.5"
            strokeLinejoin="round"
            style={{
              backdropFilter: 'blur(8px) saturate(150%)',
            }}
          />
        </svg>
      </div>

    </div>
  );
}

export default App;
