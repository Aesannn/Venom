import React, { useState, useEffect } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { Cpu, Terminal, ShieldAlert, Trophy, ShieldCheck } from 'lucide-react';

interface GridCell {
  val: string;
  row: number;
  col: number;
}

export const GridBypassGame: React.FC = () => {
  const state = useSystemState();
  const [grid, setGrid] = useState<GridCell[]>([]);
  const [targetSeq, setTargetSeq] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [score, setScore] = useState(0);
  
  // Align clicks to active row/col
  const [activeRow, setActiveRow] = useState<number | null>(0); // start at row 0
  const [activeCol, setActiveCol] = useState<number | null>(null); // alternates

  const hexPool = ['5A', 'E9', '7F', '1C', 'BD', 'D0', 'F3', 'A4'];

  // Initialize new diagnostic calibration
  const startNewGame = () => {
    playSound.click();
    
    // Generate 5x5 grid
    const newGrid: GridCell[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        newGrid.push({
          val: hexPool[Math.floor(Math.random() * hexPool.length)],
          row: r,
          col: c
        });
      }
    }

    // Generate random 3-step target sequence from grid values
    const target: string[] = [];
    for (let i = 0; i < 3; i++) {
      target.push(hexPool[Math.floor(Math.random() * hexPool.length)]);
    }

    setGrid(newGrid);
    setTargetSeq(target);
    setCurrentStep(0);
    setTimeRemaining(30);
    setActiveRow(0); // Start on first row
    setActiveCol(null);
    setGameStatus('playing');
    store.addNotification('Memory Debugger Open', 'Register diagnostics routine active...', 'Just now');
  };

  // Timer tick
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    if (timeRemaining <= 0) {
      playSound.warning();
      setGameStatus('lost');
      store.addNotification('Diagnostics Error', 'Register alignment timeout.', 'Just now');
      return;
    }

    const timer = setTimeout(() => {
      setTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeRemaining, gameStatus]);

  // Click handler
  const handleCellClick = (cell: GridCell) => {
    if (gameStatus !== 'playing') return;

    // Check click validation (must match row or col constraint)
    if (activeRow !== null && cell.row !== activeRow) {
      playSound.warning();
      return;
    }
    if (activeCol !== null && cell.col !== activeCol) {
      playSound.warning();
      return;
    }

    // Check if symbol matches current sequence step
    if (cell.val === targetSeq[currentStep]) {
      playSound.keypress();
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      if (nextStep >= targetSeq.length) {
        // Calibration Success!
        playSound.success();
        setGameStatus('won');
        setScore(prev => prev + 100);

        // Write decrypted calibration log file to VFS
        const timestamp = new Date().toISOString();
        const caliblog = [
          `AETHER-OS MEMORY DIAGNOSTIC LOG // CALIBRATED OK @ ${timestamp}`,
          '============================================================',
          `[STATUS] Memory block signature alignment: PASSED`,
          `[SIG]    Validated sequence: ${targetSeq.join(' > ')}`,
          `[LOGIC]  Parity checks validated, gate closed`,
          `[KERN]   suppressed kernel ring overflow anomalies`,
          `[SYS]    Calibrating next register block...`,
        ].join('\n');

        store.writeVfsFile('/home/aether/memory_calibrations.log', caliblog);
        store.addNotification('Calibration Succeeded', 'Memory signature aligned, log written to /home/aether.', 'Just now');
      } else {
        // Alternate selection axes
        if (activeRow !== null) {
          setActiveRow(null);
          setActiveCol(cell.col);
        } else {
          setActiveCol(null);
          setActiveRow(cell.row);
        }
      }
    } else {
      // Mistake! Reset sequence steps, but keep constraints
      playSound.warning();
      setCurrentStep(0);
    }
  };

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const accentTheme = 
    state.theme === 'purple' ? 'border-purple-500 text-purple-400 focus:border-purple-400' :
    state.theme === 'green' ? 'border-emerald-500 text-emerald-400 focus:border-emerald-400' :
    state.theme === 'orange' ? 'border-orange-500 text-orange-400 focus:border-orange-400' :
    'border-cyan-500 text-cyan-400 focus:border-cyan-400';

  return (
    <div className={`flex-1 p-4 bg-[#07090c]/90 text-xs font-mono h-full flex flex-col justify-between select-none theme-${state.theme} overflow-y-auto scrollbar-thin`}>
      
      {/* Top Game HUD Info */}
      <div className="flex justify-between items-center bg-[#090b0e] p-3 border border-white/5 rounded">
        <div className="space-y-0.5">
          <h4 className="text-[10px] text-white/40 uppercase tracking-widest">Hex Alignment Debugger</h4>
          <div className="flex items-center space-x-1.5 text-white">
            <Cpu className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-bold">MEMORY_DIAGNOSTICS_v1.0</span>
          </div>
        </div>
        
        {/* Score & Timer panel */}
        <div className="text-right space-y-0.5">
          <h4 className="text-[9px] text-white/40 uppercase tracking-widest">Alignment Timeout</h4>
          <span className={`text-sm font-bold ${timeRemaining < 10 ? 'text-rose-500 animate-pulse' : textTheme}`}>
            {timeRemaining}s
          </span>
        </div>
      </div>

      {/* Main Grid container */}
      <div className="flex-1 flex flex-col justify-center items-center py-4 space-y-4">
        {gameStatus === 'idle' && (
          <div className="text-center space-y-4">
            <Terminal className={`w-12 h-12 ${textTheme} mx-auto animate-pulse`} />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Memory Registry Lock</h3>
              <p className="text-[10px] text-white/40 max-w-xs leading-normal font-sans">
                Align hexadecimal memory signatures vertically or horizontally to calibrate memory registers and validate the block.
              </p>
            </div>
            <button
              onClick={startNewGame}
              className={`px-8 py-2.5 border rounded text-black bg-current hover:opacity-90 font-bold transition uppercase tracking-widest text-[10px] active:scale-95 ${accentTheme}`}
            >
              Start Diagnostics Check
            </button>
          </div>
        )}

        {gameStatus === 'playing' && (
          <div className="flex flex-col items-center space-y-4 w-full">
            {/* Sequence Targets panel */}
            <div className="flex items-center space-x-3 bg-black/40 border border-white/5 px-4 py-2.5 rounded">
              <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">Target Signature:</span>
              <div className="flex space-x-2">
                {targetSeq.map((val, idx) => {
                  const isDone = idx < currentStep;
                  const isActive = idx === currentStep;
                  return (
                    <span
                      key={idx}
                      className={`px-2.5 py-1 rounded border text-[10px] font-bold ${
                        isDone 
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                          : isActive
                          ? 'border-current bg-current/10 font-black scale-110 ' + textTheme
                          : 'border-white/10 text-white/30'
                      }`}
                    >
                      {val}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Matrix 5x5 Selector grid */}
            <div className="grid grid-cols-5 gap-1.5 bg-[#030406] p-2.5 border border-white/5 rounded shadow-2xl relative">
              
              {/* Highlight selector guide strip for Active Axis */}
              {activeRow !== null && (
                <div 
                  className={`absolute left-1 right-1 border border-dashed border-current opacity-10 bg-current pointer-events-none rounded ${textTheme}`}
                  style={{
                    top: `${10 + activeRow * 35}px`,
                    height: '32px'
                  }}
                />
              )}
              {activeCol !== null && (
                <div 
                  className={`absolute top-1 bottom-1 border border-dashed border-current opacity-10 bg-current pointer-events-none rounded ${textTheme}`}
                  style={{
                    left: `${10 + activeCol * 41}px`,
                    width: '38px'
                  }}
                />
              )}

              {grid.map((cell, idx) => {
                const isClickable = (activeRow !== null && cell.row === activeRow) || (activeCol !== null && cell.col === activeCol);
                
                return (
                  <button
                    key={idx}
                    onClick={() => handleCellClick(cell)}
                    className={`w-9 h-8 border rounded font-mono text-[11px] font-bold transition flex items-center justify-center relative active:scale-95 ${
                      isClickable
                        ? 'border-white/20 text-white hover:border-current hover:bg-current/10 ' + textTheme
                        : 'border-white/5 text-white/15 cursor-not-allowed'
                    }`}
                  >
                    {cell.val}
                  </button>
                );
              })}
            </div>

            {/* Instruction tooltip */}
            <p className="text-[8px] text-white/30 uppercase tracking-widest text-center">
              Active constraint: {activeRow !== null ? `ROW ${activeRow + 1} AXIS` : `COLUMN ${activeCol! + 1} AXIS`}
            </p>
          </div>
        )}

        {/* Won State */}
        {gameStatus === 'won' && (
          <div className="text-center space-y-4 py-6">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full w-fit mx-auto animate-bounce">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Calibration Succeeded</h3>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest font-mono">Hexadecimal memory block calibrated successfully.</p>
            </div>
            <div className="flex justify-center space-x-2">
              <button
                onClick={startNewGame}
                className={`px-8 py-2 border rounded text-black bg-current hover:opacity-90 font-bold transition uppercase tracking-widest text-[10px] ${accentTheme}`}
              >
                Next Register
              </button>
            </div>
          </div>
        )}

        {/* Lost State */}
        {gameStatus === 'lost' && (
          <div className="text-center space-y-4 py-6">
            <div className="p-3 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full w-fit mx-auto animate-bounce">
              <ShieldAlert className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Diagnostics Failure</h3>
              <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest font-mono">Register alignment timeout.</p>
            </div>
            <div className="flex justify-center space-x-2">
              <button
                onClick={startNewGame}
                className={`px-8 py-2 border rounded text-black bg-current hover:opacity-90 font-bold transition uppercase tracking-widest text-[10px] ${accentTheme}`}
              >
                Restart Diagnostics
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom score board panel */}
      <div className="border-t border-white/5 pt-3 flex justify-between items-center text-[9px] text-white/30 uppercase">
        <div className="flex items-center space-x-1">
          <Trophy className="w-3.5 h-3.5 text-zinc-500" />
          <span>VALIDATED SEGMENTS: {score / 100}</span>
        </div>
        <span>REGISTER CALIBRATION: COMPLETE</span>
      </div>

    </div>
  );
};
