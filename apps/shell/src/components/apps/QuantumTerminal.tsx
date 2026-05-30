import React, { useState, useRef, useEffect } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';

export const QuantumTerminal: React.FC = () => {
  const state = useSystemState();
  const [input, setInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [matrixActive, setMatrixActive] = useState(false);
  const [hackActive, setHackActive] = useState(false);
  const [targetHash, setTargetHash] = useState('0x0000');
  const [choices, setChoices] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(30);
  const [hackAttempts, setHackAttempts] = useState(3);
  const [hackStatus, setHackStatus] = useState<'idle' | 'won' | 'lost'>('idle');

  const logsEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const initializeHackingGame = () => {
    const keys = ['0xF34A', '0x8BC2', '0xA7D9', '0x4FE3', '0x99B1', '0x22D8', '0xC5E0', '0xE89D'];
    const target = keys[Math.floor(Math.random() * keys.length)];
    setTargetHash(target);
    setTimeLeft(30);
    setHackAttempts(3);
    setHackStatus('idle');
    
    const otherChoices = keys.filter(k => k !== target);
    const scrambled = [target, ...otherChoices.sort(() => 0.5 - Math.random()).slice(0, 3)].sort(() => 0.5 - Math.random());
    setChoices(scrambled);
  };

  // Auto-scroll logs & terminal command observers
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    const lastLog = state.terminalHistory[state.terminalHistory.length - 1];
    if (lastLog && lastLog.includes('INITIALIZING FULL SCREEN DIGITAL WATERFALL')) {
      setMatrixActive(true);
    } else if (lastLog && lastLog.includes('INITIALIZING TERMINAL SECURITY BYPASS DECRYPTION')) {
      setHackActive(true);
      initializeHackingGame();
    }
  }, [state.terminalHistory]);

  // Game countdown timer
  useEffect(() => {
    if (!hackActive || hackStatus !== 'idle') return;
    if (timeLeft <= 0) {
      handleHackingLoss();
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [hackActive, timeLeft, hackStatus]);

  const handleChoiceClick = (choice: string) => {
    if (hackStatus !== 'idle') return;
    if (choice === targetHash) {
      playSound.success();
      setHackStatus('won');
      store.logToTerminal('DECRYPTION SUCCESSFUL // VAULT ACCESS DECRYPTED.');
      store.createVfsNode('terminal_breach.log', 'file', `AETHER DECRYPTION BREACH LOG // ARCHITECT LOGGED IN\n---------------------------------------\nTIMESTAMP: ${new Date().toISOString()}\nBYPASS METHOD: HEX DECRYPTION HARMONIC SHAKEHAND\nSTATUS: VERIFIED BYPASS GRANTED.`);
      store.addNotification('Terminal Bypass Successful', 'Security decryptor validated, system log generated.', 'Just now');
      
      setTimeout(() => {
        setHackActive(false);
        store.logToTerminal('Closing security decryptor overlay. Quantum Shell restored.');
      }, 2500);
    } else {
      playSound.warning();
      setHackAttempts(a => {
        const nextAttempts = a - 1;
        if (nextAttempts <= 0) {
          handleHackingLoss();
          return 0;
        }
        return nextAttempts;
      });
      setTimeLeft(t => Math.max(1, t - 5));
    }
  };

  const handleHackingLoss = () => {
    playSound.warning();
    setHackStatus('lost');
    store.triggerGlitch();
    store.logToTerminal('DECRYPTION SWEEP DETECTED // SECURITY LOCKOUT INITIATED.');
    store.addNotification('Bypass Lockout Triggered', 'Unauthorized sequence detected. Core rebooting.', 'Just now');
    setTimeout(() => {
      setHackActive(false);
      store.lockSystem();
    }, 2500);
  };

  // Focus input on click anywhere in terminal
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Play clicking noise
    playSound.keypress();

    if (e.key === 'Enter') {
      const trimmed = input.trim();
      store.executeTerminalCommand(input);
      if (trimmed) {
        setCommandHistory(prev => [trimmed, ...prev].slice(0, 30));
      }
      setInput('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = historyIndex - 1;
      if (nextIndex >= 0) {
        setHistoryIndex(nextIndex);
        setInput(commandHistory[nextIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion helper
      const parts = input.split(' ');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const candidates = ['help', 'neofetch', 'ls', 'cd', 'cat', 'mkdir', 'touch', 'rm', 'theme', 'matrix', 'clear', 'kill'];
        const match = candidates.find(c => c.startsWith(lastPart.toLowerCase()));
        if (match) {
          parts[parts.length - 1] = match;
          setInput(parts.join(' '));
        }
      }
    }
  };

  // Matrix falling rain effect
  useEffect(() => {
    if (!matrixActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const cols = Math.floor(width / 14);
    const ypos = Array(cols).fill(0);

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const matrixRain = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      // Set matrix colors matching theme
      let textGlow = '#00f0ff';
      switch (state.theme) {
        case 'purple': textGlow = '#d946ef'; break;
        case 'green': textGlow = '#10b981'; break;
        case 'orange': textGlow = '#f97316'; break;
        default: textGlow = '#00f0ff'; break;
      }

      ctx.fillStyle = textGlow;
      ctx.font = '11px Courier New';

      ypos.forEach((y, index) => {
        const char = String.fromCharCode(33 + Math.floor(Math.random() * 93));
        const x = index * 14;
        ctx.fillText(char, x, y);

        if (y > 100 + Math.random() * 10000) {
          ypos[index] = 0;
        } else {
          ypos[index] = y + 14;
        }
      });
    };

    const interval = setInterval(matrixRain, 40);

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, [matrixActive, state.theme]);

  // Exit matrix handler
  const handleExitMatrix = () => {
    playSound.click();
    setMatrixActive(false);
    store.logToTerminal('Matrix warp dissolved. Quantum Shell operational.');
  };

  const caretTheme = 'bg-zinc-400';
  const scrollbarColor = 'scrollbar-thumb-zinc-800';

  return (
    <div 
      onClick={handleTerminalClick}
      className="flex-1 bg-[#09090b] p-4 text-xs font-mono select-text relative overflow-hidden flex flex-col cursor-text h-full"
    >
      {matrixActive ? (
        /* Fullscreen matrix rain cover overlay */
        <div className="absolute inset-0 bg-black z-50 flex flex-col">
          <canvas ref={canvasRef} className="flex-1 block" />
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center select-none z-[100] px-4 py-2 border border-zinc-800/80 bg-zinc-900 rounded-lg">
            <span className="font-mono text-[10px] tracking-widest text-zinc-400 animate-pulse">
              MATRIX_WARP_LOOP_RUNNING
            </span>
            <button
              onClick={handleExitMatrix}
              className="px-4 py-1 border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] uppercase rounded-lg transition active:scale-95"
            >
              Wipe Screen [Exit]
            </button>
          </div>
        </div>
      ) : hackActive ? (
        /* Hacking decryption puzzle screen overlay (Cryptographic Debugger style) */
        <div className="absolute inset-0 bg-[#0c0c10] z-50 flex flex-col p-6 font-mono select-none">
          <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3 mb-4">
            <span className="text-[10px] tracking-widest text-zinc-400 font-semibold flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-1" />
              <span>CRYPTOGRAPHIC_KEY_DECODER_s3.5</span>
            </span>
            <div className="text-[10px] text-zinc-500">
              Handshake Anomalies Allowed: <span className="text-amber-500 font-bold">{hackAttempts}</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-5">
            {/* ASCII memory grid */}
            <div className="w-full max-w-sm p-4 bg-zinc-950 border border-zinc-800/50 rounded-lg text-[10px] text-zinc-500 leading-relaxed text-center tracking-wider">
              <div>0x8F4A  FF E3 22 D8 4F 11 02 A4</div>
              <div>0x8F52  C5 E0 E8 9D 0A B7 77 F2</div>
              <div className="my-1.5 text-xs font-bold text-zinc-300 uppercase tracking-widest border-y border-zinc-800/40 py-1">
                Target Handshake Key: {targetHash}
              </div>
              <div>0x8F5A  99 B1 8B C2 F3 4A A7 D9</div>
              <div>0x8F62  3B 99 AC F4 A1 0C 33 08</div>
            </div>

            {/* Time Ticker */}
            <div className="text-center space-y-1">
              <div className="text-[9px] text-zinc-500 uppercase tracking-widest">Time Remaining</div>
              <div className={`text-2xl font-semibold ${
                timeLeft <= 8 ? 'text-amber-500 animate-pulse' : 'text-zinc-200'
              }`}>
                {timeLeft}s
              </div>
            </div>

            {/* Scrambled hex choices */}
            {hackStatus === 'idle' && (
              <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                {choices.map((c) => (
                  <button
                    key={c}
                    onClick={() => handleChoiceClick(c)}
                    className="p-3 border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800 hover:border-zinc-700 rounded-lg transition text-center text-xs font-bold text-zinc-300 active:scale-95 uppercase tracking-widest"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Won/Lost states */}
            {hackStatus === 'won' && (
              <div className="text-emerald-500 font-bold text-center text-xs uppercase tracking-widest">
                ✓ handshake established // keys written to syslog
              </div>
            )}

            {hackStatus === 'lost' && (
              <div className="text-rose-500 font-bold text-center text-xs uppercase tracking-widest animate-pulse">
                ⚠ handshake failed // node lockdown active
              </div>
            )}
          </div>

          <div className="text-center text-[9px] text-zinc-600 uppercase tracking-widest border-t border-zinc-800/50 pt-3">
            Handshake failure initiates localized virtual environment lockdown
          </div>
        </div>
      ) : (
        /* Standard Shell Terminal UI */
        <>
          {/* Scrollable logs list */}
          <div className={`flex-1 overflow-y-auto space-y-1 pr-2 ${scrollbarColor}`}>
            {state.terminalHistory.map((line, idx) => {
              const isCommand = line.includes('aether@quantum-core');
              return (
                <div 
                  key={idx} 
                  className={`leading-relaxed whitespace-pre-wrap ${
                    isCommand 
                      ? 'text-zinc-200 font-semibold' 
                      : line.includes('Error') || line.includes('unrecognized')
                      ? 'text-rose-500' 
                      : line.includes('created') || line.includes('mounted') || line.includes('synthesized')
                      ? 'text-emerald-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {line}
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>

          {/* Interactive input field */}
          <div className="flex items-center space-x-1 mt-2 border-t border-zinc-800/60 pt-2 select-none">
            <span className="text-zinc-500 font-medium">aether@system ~ $</span>
            <div className="flex-1 relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-zinc-100 outline-none border-none caret-transparent relative z-10 font-mono text-xs uppercase"
                autoFocus
              />
              {/* Custom blinking caret */}
              <div 
                className="absolute text-zinc-200 font-mono pointer-events-none flex items-center"
                style={{ left: `${input.length * 7.2}px` }}
              >
                <span className={`w-1.5 h-3.5 ${caretTheme} animate-pulse`} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
