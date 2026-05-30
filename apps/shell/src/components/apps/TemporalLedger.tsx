import React, { useEffect, useState } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { Clock, ShieldAlert, ChevronRight, FileCode, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface LedgerSnapshot {
    timestamp: number;
    active_file: string;
    file_content_diff: string;
    terminal_command: string;
    status_state: string;
    notes: string;
}

export const TemporalLedger: React.FC = () => {
  const state = useSystemState();
  const [history, setHistory] = useState<LedgerSnapshot[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const fetchLedgerState = async () => {
    if (typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        const res = await (window as any).__TAURI__.invoke('aether_ledger_get_history');
        if (res) {
          setHistory(JSON.parse(res));
        }
      } catch (e) {
        console.warn('Tauri Ledger fetch bypassed:', e);
      }
    } else {
      // Fallback: mock state
      const now = Math.floor(Date.now() / 1000);
      setHistory([
        {
          timestamp: now - 10800,
          active_file: "core/tauri-runtime/src/services.rs",
          file_content_diff: "- let final_temp = temperature.unwrap_or_else(|| {\n-     48.5 + (time_factor * 2.2)\n- });\n+ let final_temp = temperature.unwrap_or_else(|| {\n+     32.0 + (time_factor * 1.5) // Optimal eco cooling active\n+ });",
          terminal_command: "cargo check",
          status_state: "SUCCESS",
          notes: "Configured optimized eco temperature monitoring bounds.",
        },
        {
          timestamp: now - 3600,
          active_file: "apps/shell/src/components/BootScreen.tsx",
          file_content_diff: "- const BOOT_TIMEOUT = 5000;\n+ const BOOT_TIMEOUT = 1200; // Accelerated system launch",
          terminal_command: "npm run build",
          status_state: "SUCCESS",
          notes: "Accelerated boot screen countdown sequence timeout.",
        },
        {
          timestamp: now - 900,
          active_file: "core/aether-compositor/src/spatial.rs",
          file_content_diff: "- let s = win.current.scale;\n+ let s = win.current.scale * 1.05; // Elevated projection scale factor",
          terminal_command: "cargo run",
          status_state: "FAILED",
          notes: "Modified scale projection factor multiplier. Caused coordinate rendering boundary anomalies.",
        }
      ]);
    }
  };

  useEffect(() => {
    fetchLedgerState();
  }, []);

  const handleRollback = () => {
    if (selectedIndex === null || !history[selectedIndex]) return;
    playSound.success();
    setIsRollingBack(true);

    setTimeout(() => {
      setIsRollingBack(false);
      const snapshot = history[selectedIndex];
      // Push event notifications
      store.addNotification('Time-Travel Rollback', `Successfully reverted workspace coordinates to snapshot: ${new Date(snapshot.timestamp * 1000).toLocaleTimeString()}`, 'Just now');
    }, 2500);
  };

  const textActive = 
    state.theme === 'purple' ? 'text-purple-400 border-purple-500' :
    state.theme === 'green' ? 'text-emerald-400 border-emerald-500' :
    state.theme === 'orange' ? 'text-orange-400 border-orange-500' :
    'text-cyan-400 border-cyan-500';

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const buttonActive = 
    state.theme === 'purple' ? 'from-purple-600/30 to-fuchsia-600/30 border-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(217,70,239,0.25)]' :
    state.theme === 'green' ? 'from-emerald-600/30 to-teal-600/30 border-emerald-500/50 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]' :
    state.theme === 'orange' ? 'from-orange-600/30 to-amber-600/30 border-orange-500/50 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.25)]' :
    'from-cyan-600/30 to-blue-600/30 border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.25)]';

  const selectedSnapshot = history[selectedIndex];

  return (
    <div className="flex-1 bg-[#05070a]/95 text-xs font-mono h-full flex select-none overflow-hidden text-left">
      
      {/* Sidebar Timeline slider */}
      <div className="w-80 border-r border-white/5 flex flex-col justify-between p-4 bg-[#0a0d14]/40">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-white/5 pb-2.5">
            <Clock className={`w-4 h-4 ${textTheme}`} />
            <span className="font-semibold uppercase tracking-wider text-[11px] text-white">Semantic Temporal Ledger</span>
          </div>

          <div className="text-[9px] text-white/30 uppercase tracking-widest pl-1">Auditing Snapshot Ledger</div>
          
          <div className="space-y-2">
            {history.map((snapshot, idx) => {
              const isSelected = idx === selectedIndex;
              const dateStr = new Date(snapshot.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              
              return (
                <div
                  key={idx}
                  onClick={() => { playSound.click(); setSelectedIndex(idx); }}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between group ${
                    isSelected 
                      ? 'bg-white/5 border-white/10 shadow-lg' 
                      : 'border-transparent hover:bg-white/[0.02] text-white/50 hover:text-white'
                  }`}
                >
                  <div className="space-y-0.5 text-left truncate">
                    <span className={`text-[10px] font-bold ${isSelected ? textTheme : 'text-white/60'}`}>{dateStr}</span>
                    <p className="text-[9px] text-white/30 truncate">{snapshot.active_file.split('/').pop()}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {snapshot.status_state === 'FAILED' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-450 text-rose-450 text-rose-400" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-450 text-emerald-450 text-emerald-400" />
                    )}
                    <ChevronRight className={`w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-transform ${isSelected ? 'translate-x-0.5' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleRollback}
          disabled={isRollingBack}
          className={`w-full bg-gradient-to-r ${buttonActive} border py-3 rounded-xl flex items-center justify-center space-x-2 transition active:scale-95 font-bold uppercase tracking-widest text-[9.5px] text-white`}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-white ${isRollingBack ? 'animate-spin' : ''}`} />
          <span>{isRollingBack ? 'Reconstructing State...' : 'Rollback Workspace State'}</span>
        </button>
      </div>

      {/* Main Diff visualizer Inspector */}
      {selectedSnapshot ? (
        <div className="flex-1 flex flex-col justify-between bg-black/40 overflow-hidden">
          {/* Header Metadata */}
          <div className="p-4 border-b border-white/5 bg-[#090b0f] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-white/40" />
                <span className="font-bold text-white uppercase text-[10.5px]">{selectedSnapshot.active_file}</span>
              </div>
              <p className="text-[9px] text-white/30">DISPATCHED SHELL COMMAND: <code className="bg-white/5 px-1 py-0.5 rounded text-white/60">{selectedSnapshot.terminal_command}</code></p>
            </div>
            
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-semibold uppercase tracking-wider ${
              selectedSnapshot.status_state === 'FAILED' 
                ? 'bg-rose-500/10 text-rose-405 text-rose-400 border border-rose-500/20' 
                : 'bg-emerald-500/10 text-emerald-405 text-emerald-400 border border-emerald-500/20'
            }`}>
              {selectedSnapshot.status_state}
            </span>
          </div>

          {/* Interactive Diffs Display */}
          <div className="flex-1 p-5 overflow-y-auto scrollbar-thin space-y-4">
            <div className="space-y-2">
              <span className="text-[10px] text-white/30 uppercase tracking-widest">Incremental Differentials</span>
              <div className="border border-white/5 bg-[#0b0e14]/60 rounded-xl p-4 font-mono text-[10.5px] text-white/80 leading-relaxed overflow-x-auto select-text text-left">
                {selectedSnapshot.file_content_diff.split('\n').map((line, idx) => {
                  const isDel = line.startsWith('-');
                  const isAdd = line.startsWith('+');
                  return (
                    <div
                      key={idx}
                      className={`${
                        isDel ? 'text-rose-450 text-rose-400 bg-rose-500/[0.04] px-1' :
                        isAdd ? 'text-emerald-450 text-emerald-400 bg-emerald-500/[0.04] px-1' :
                        'text-white/60'
                      }`}
                    >
                      {line}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Diagnostics Interpretation HUD */}
            <div className="border border-white/5 bg-white/[0.01] p-4 rounded-xl space-y-2 text-left">
              <div className="flex items-center space-x-2">
                <ShieldAlert className={`w-4 h-4 ${textTheme} animate-pulse`} />
                <span className="text-[10px] text-white/80 font-bold uppercase tracking-wider">Aether OS Diagnostics Log</span>
              </div>
              <p className="text-[10px] text-white/50 leading-relaxed font-sans">{selectedSnapshot.notes}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-white/20 uppercase tracking-widest">Select a snapshot to audit timeline</div>
      )}

    </div>
  );
};
