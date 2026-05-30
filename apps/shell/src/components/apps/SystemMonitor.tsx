import React, { useEffect, useRef, useState } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { Cpu, Activity, X, CloudLightning, Sun } from 'lucide-react';

export const SystemMonitor: React.FC = () => {
  const state = useSystemState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Keep history of last 30 telemetry data points
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(10));
  const [ramHistory, setRamHistory] = useState<number[]>(Array(30).fill(30));

  // Push current values to history lists
  useEffect(() => {
    setCpuHistory(prev => [...prev.slice(1), state.cpuUsage]);
    setRamHistory(prev => [...prev.slice(1), state.ramUsage]);
  }, [state.cpuUsage, state.ramUsage]);

  // Live Climate API fetch
  const [weather, setWeather] = useState<{ temp: string; desc: string; city: string } | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoadingWeather(true);
      try {
        const res = await fetch('https://wttr.in/Delhi?format=j1');
        if (res.ok) {
          const data = await res.json();
          const temp = data.current_condition?.[0]?.temp_C || '32';
          const desc = data.current_condition?.[0]?.weatherDesc?.[0]?.value || 'Optimal';
          const city = data.nearest_area?.[0]?.areaName?.[0]?.value || 'Delhi';
          setWeather({ temp, desc, city });
        }
      } catch (err) {
        console.error('Failed to fetch weather telemetry', err);
      } finally {
        setLoadingWeather(false);
      }
    };
    fetchWeather();
  }, []);

  // Telemetry graph canvas painter
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 550);
    let height = (canvas.height = 180);

    const drawGraph = () => {
      ctx.clearRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      const gridCount = 6;
      for (let i = 1; i < gridCount; i++) {
        // Horizontal grid
        const y = (height / gridCount) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // Vertical grid
        const x = (width / gridCount) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Theme Color Selection (Subtle, clean colors)
      let themeColor = '#3b82f6'; // Blue
      let themeRgb = '59, 130, 246';
      switch (state.theme) {
        case 'purple': themeColor = '#8b5cf6'; themeRgb = '139, 92, 246'; break;
        case 'green': themeColor = '#10b981'; themeRgb = '16, 185, 129'; break;
        case 'orange': themeColor = '#f97316'; themeRgb = '249, 115, 22'; break;
      }

      // Draw CPU/RAM curves (crisp 1px paths, no heavy glows)
      const drawWave = (history: number[], strokeStyle: string, fillStyle: string | CanvasGradient) => {
        ctx.beginPath();
        const step = width / (history.length - 1);
        
        history.forEach((val, idx) => {
          const x = idx * step;
          const y = height - (val / 100) * (height - 30) - 15;
          
          if (idx === 0) {
            ctx.moveTo(x, y);
          } else {
            const prevX = (idx - 1) * step;
            const prevY = height - (history[idx - 1] / 100) * (height - 30) - 15;
            const cpX = prevX + step / 2;
            ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
          }
        });
        
        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Close path for very soft subtle under-fill
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fillStyle = fillStyle;
        ctx.fill();
      };

      // Draw CPU
      const cpuGrad = ctx.createLinearGradient(0, 0, 0, height);
      cpuGrad.addColorStop(0, `rgba(${themeRgb}, 0.04)`);
      cpuGrad.addColorStop(1, `rgba(${themeRgb}, 0)`);
      drawWave(cpuHistory, themeColor, cpuGrad);

      // Draw Memory (Soft Zinc/Gray line)
      const ramGrad = ctx.createLinearGradient(0, 0, 0, height);
      ramGrad.addColorStop(0, 'rgba(113, 113, 122, 0.04)');
      ramGrad.addColorStop(1, 'rgba(113, 113, 122, 0)');
      drawWave(ramHistory, '#71717a', ramGrad);
    };

    drawGraph();

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        drawGraph();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [cpuHistory, ramHistory, state.theme]);

  const handleKillProcess = (pid: number) => {
    playSound.warning();
    store.executeTerminalCommand(`kill ${pid}`);
  };

  const textActive = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const borderActive = 'border-white/5';

  return (
    <div className={`flex-1 p-5 text-xs font-sans h-full overflow-y-auto space-y-5 select-none scrollbar-thin bg-transparent`}>
      
      {/* Activity Dials Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* CPU Usage Card */}
        <div className={`p-4 rounded-xl border ${borderActive} bg-[#121216]/20 backdrop-blur-md flex items-center justify-between shadow-sm relative overflow-hidden transition-all duration-350 hover:border-white/10 hover:bg-white/5 group`}>
          <div className="space-y-1 z-10">
            <h4 className="text-[10px] text-white/40 uppercase tracking-wider flex items-center space-x-1.5 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-white/50 group-hover:text-white/80 transition-colors" />
              <span>CPU Usage</span>
            </h4>
            <div className={`text-2xl font-semibold font-sans tracking-tight text-white ${textActive}`}>
              {state.cpuUsage}%
            </div>
            <p className="text-[9px] text-white/30">THREADS: {state.processes.length} ACTIVE</p>
          </div>
          {/* Subtle Mini Bar Graph */}
          <div className="w-12 h-10 flex items-end space-x-0.5 opacity-30 group-hover:opacity-50 transition-opacity">
            {cpuHistory.slice(-6).map((val, idx) => (
              <div
                key={idx}
                className="w-1.5 rounded-t-sm bg-white/20 group-hover:bg-white/40"
                style={{
                  height: `${Math.max(15, val)}%`,
                  transition: 'height 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            ))}
          </div>
        </div>

        {/* System Memory Card */}
        <div className={`p-4 rounded-xl border ${borderActive} bg-[#121216]/20 backdrop-blur-md flex items-center justify-between shadow-sm relative overflow-hidden transition-all duration-350 hover:border-white/10 hover:bg-white/5 group`}>
          <div className="space-y-1 z-10">
            <h4 className="text-[10px] text-white/40 uppercase tracking-wider flex items-center space-x-1.5 font-semibold">
              <Activity className="w-3.5 h-3.5 text-white/50 group-hover:text-white/80 transition-colors" />
              <span>System Memory</span>
            </h4>
            <div className={`text-2xl font-semibold font-sans tracking-tight text-white`}>
              {state.ramUsage}%
            </div>
            <p className="text-[9px] text-white/30">USED: {Math.round(state.ramUsage * 163.8)} MB</p>
          </div>
          {/* Subtle Memory Progress Ring */}
          <svg className="w-10 h-10 transform -rotate-90 opacity-30 group-hover:opacity-60 transition-opacity">
            <circle cx="20" cy="20" r="16" fill="transparent" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
            <circle 
              cx="20" cy="20" r="16" 
              fill="transparent" 
              stroke="rgba(255,255,255,0.6)" 
              strokeWidth="2"
              strokeDasharray={100.5}
              strokeDashoffset={100.5 - (100.5 * state.ramUsage) / 100}
              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
            />
          </svg>
        </div>

        {/* Processor Temperature Card */}
        <div className={`p-4 rounded-xl border ${borderActive} bg-[#121216]/20 backdrop-blur-md flex items-center justify-between shadow-sm relative overflow-hidden transition-all duration-350 hover:border-white/10 hover:bg-white/5 group`}>
          <div className="space-y-1 z-10 overflow-hidden max-w-[70%]">
            <h4 className="text-[10px] text-white/40 uppercase tracking-wider flex items-center space-x-1.5 font-semibold">
              <CloudLightning className="w-3.5 h-3.5 text-white/50 group-hover:text-white/80 transition-colors" />
              <span>Core Temp</span>
            </h4>
            {loadingWeather ? (
              <div className="text-white/20 text-[10px] animate-pulse tracking-wide py-1 font-sans uppercase">Checking...</div>
            ) : (
              <div className="text-2xl font-semibold font-sans tracking-tight text-white">
                {weather ? `${weather.temp}°C` : '32°C'}
              </div>
            )}
            <p className="text-[9px] text-white/30 truncate uppercase">{weather ? `${weather.city} // ${weather.desc}` : 'Optimal'}</p>
          </div>
          <div className="opacity-20 group-hover:opacity-40 transition-opacity">
            <Sun className="w-9 h-9 text-white" />
          </div>
        </div>

      </div>

      {/* Main Canvas Curves plotting */}
      <div className="space-y-2">
        <h4 className="text-[10px] text-white/40 uppercase tracking-wider font-semibold pl-1">Activity History</h4>
        <div className="border border-white/5 bg-[#121216]/20 backdrop-blur-md rounded-xl p-3 overflow-hidden h-48 flex items-center relative shadow-sm">
          <canvas ref={canvasRef} className="w-full h-full block" />
          
          {/* Key Overlays */}
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-white/5 flex space-x-4 text-[9px] select-none pointer-events-none font-medium">
            <div className="flex items-center space-x-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${textActive} bg-current`} />
              <span className="text-white/60">CPU Usage</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
              <span className="text-white/60">Memory Usage</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Process manager table */}
      <div className="space-y-2">
        <h4 className="text-[10px] text-white/40 uppercase tracking-wider font-semibold pl-1">Active Processes</h4>
        <div className="border border-white/5 bg-[#121216]/10 backdrop-blur-md rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[10px] text-white/40 uppercase font-semibold select-none">
                <th className="p-3 pl-4">PID</th>
                <th className="p-3">Process Name</th>
                <th className="p-3">CPU</th>
                <th className="p-3">Memory</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right pr-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80">
              {state.processes.map((proc) => {
                const isCritical = proc.name === 'kernel' || proc.name === 'display_compositor';
                
                return (
                  <tr key={proc.pid} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 pl-4 text-white/30 font-mono">{proc.pid}</td>
                    <td className="p-3 text-white font-medium truncate max-w-[150px]">{proc.name}</td>
                    <td className={`p-3 font-mono font-medium ${textActive}`}>{proc.cpu}%</td>
                    <td className="p-3 text-white/60 font-mono">{proc.mem} MB</td>
                    <td className="p-3 select-none">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium ${
                        proc.status === 'running' 
                          ? 'bg-white/10 text-white border border-white/10' 
                          : 'bg-white/5 text-white/40 border border-white/5'
                      }`}>
                        {proc.status}
                      </span>
                    </td>
                    <td className="p-3 text-right pr-4">
                      {isCritical ? (
                        <span className="text-[9px] text-white/20 select-none font-medium uppercase tracking-wider">System</span>
                      ) : (
                        <button
                          onClick={() => handleKillProcess(proc.pid)}
                          className="p-1 hover:bg-rose-500/20 text-rose-450 text-rose-400 hover:text-rose-500 border border-rose-500/20 rounded-md transition active:scale-95"
                          title="Terminate Process"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
