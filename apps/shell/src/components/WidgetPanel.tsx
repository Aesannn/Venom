import React, { useState, useEffect, useRef } from 'react';
import { useSystemState } from '../store/systemStore';
import { playSound } from '../utils/audio';
import * as Icons from 'lucide-react';

interface WidgetPanelProps {
  onClose: () => void;
}

export const WidgetPanel: React.FC<WidgetPanelProps> = ({ onClose }) => {
  const state = useSystemState();
  const [ping, setPing] = useState(14);
  const [cpuThreads, setCpuThreads] = useState([8, 12, 6, 9]);
  
  const pingCanvasRef = useRef<HTMLCanvasElement>(null);
  const pingHistoryRef = useRef<number[]>(Array(24).fill(15));

  // Biometric / Production Checklist state
  const checklist = [
    { label: 'Core Kernel Integrity', desc: 'Secure signature verification', status: 'Passed' },
    { label: 'Virtual VFS Partition', desc: 'Read/write structures mapped', status: 'Active' },
    { label: 'Audio Engine Context', desc: 'Procedural oscillators ready', status: 'Idle' },
    { label: 'Holographic Render Dial', desc: 'Hardware mesh loaded', status: 'Valid' }
  ];

  // Ping tracking & mini chart loop
  useEffect(() => {
    const canvas = pingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const interval = setInterval(() => {
      const nextPing = Math.max(10, Math.min(60, Math.round(15 + Math.random() * 8 - (Math.random() > 0.95 ? 5 : 0))));
      setPing(nextPing);
      pingHistoryRef.current.push(nextPing);
      if (pingHistoryRef.current.length > 24) {
        pingHistoryRef.current.shift();
      }

      // Draw clean minimal Vercel-style line chart
      const w = (canvas.width = canvas.clientWidth);
      const h = (canvas.height = canvas.clientHeight);
      ctx.clearRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.33); ctx.lineTo(w, h * 0.33);
      ctx.moveTo(0, h * 0.66); ctx.lineTo(w, h * 0.66);
      ctx.stroke();

      // Chart Path
      ctx.beginPath();
      ctx.strokeStyle = '#71717a'; // Quiet zinc-500 line
      ctx.lineWidth = 1.2;

      const step = w / 23;
      pingHistoryRef.current.forEach((p, idx) => {
        const x = idx * step;
        const y = h - (p / 80) * (h - 6) - 3;
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Flat shadow backdrop
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.015)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fill();

    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Activity Monitor CPU Core threads load loops
  useEffect(() => {
    const interval = setInterval(() => {
      setCpuThreads(Array(4).fill(0).map(() => Math.round(4 + Math.random() * 15 + (state.cpuUsage * 0.15))));
    }, 2000);
    return () => clearInterval(interval);
  }, [state.cpuUsage]);

  return (
    <div 
      className="absolute inset-y-0 left-0 z-[1200] w-80 border-r border-white/8 shadow-2xl flex flex-col justify-between p-5 animate-slideInLeft font-sans select-none"
      style={{
        background: 'rgba(15, 15, 22, 0.65)',
        backdropFilter: 'blur(32px) saturate(160%)',
        WebkitBackdropFilter: 'blur(32px) saturate(160%)',
      }}
    >
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-white/8 pb-3">
        <div className="flex items-center space-x-2 text-white/90">
          <Icons.LayoutGrid className="w-4 h-4 text-white/60" />
          <span className="font-semibold text-xs tracking-normal">Telemetry Center</span>
        </div>
        <button
          onClick={() => { playSound.click(); onClose(); }}
          className="p-1 rounded-lg hover:bg-white/8 text-white/40 hover:text-white/80 transition"
        >
          <Icons.X className="w-4 h-4" />
        </button>
      </div>

      {/* Widgets Scrollable Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin pr-1 text-white/60">
        
        {/* Widget 1: Notion System Health Checklist */}
        <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-3">
          <div className="flex justify-between items-center text-[10px] text-white/40 font-semibold tracking-wide uppercase">
            <span>System Checklist</span>
            <Icons.CheckCircle2 className="w-3.5 h-3.5 text-white/40" />
          </div>
          
          <div className="space-y-2">
            {checklist.map((item, idx) => (
              <div key={idx} className="flex items-start space-x-2.5 p-1">
                <Icons.CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs font-medium text-white/90">{item.label}</div>
                  <div className="text-[10px] text-white/40">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 2: Vercel Latency Analytics */}
        <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-3">
          <div className="flex justify-between items-center text-[10px] text-white/40 font-semibold tracking-wide uppercase">
            <span>Network Latency</span>
            <span className="font-mono text-white/80 text-xs font-semibold">{ping} ms</span>
          </div>
 
          {/* Clean Analytics Canvas */}
          <div className="h-14 w-full relative">
            <canvas ref={pingCanvasRef} className="w-full h-full" />
          </div>
          
          <div className="flex justify-between text-[10px] text-white/40 font-sans">
            <span>Core: Standard</span>
            <span>Packet Loss: 0%</span>
          </div>
        </div>

        {/* Widget 3: CPU Activity Monitor (Mac style) */}
        <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-3">
          <div className="flex justify-between items-center text-[10px] text-white/40 font-semibold tracking-wide uppercase">
            <span>Active Thread Loads</span>
            <Icons.Cpu className="w-3.5 h-3.5 text-white/40" />
          </div>
 
          <div className="space-y-2.5">
            {cpuThreads.map((t, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-[10px] text-white/60 font-medium">
                  <span>Core Thread {idx}</span>
                  <span>{t}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white/40 rounded-full transition-all duration-1000"
                    style={{ width: `${t * 2}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Widget 4: Chronologies (Maintenance Schedules) */}
        <div className="p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl space-y-3">
          <div className="flex justify-between items-center text-[10px] text-white/40 font-semibold tracking-wide uppercase">
            <span>Scheduled Maintenance</span>
            <Icons.Calendar className="w-3.5 h-3.5 text-white/40" />
          </div>
 
          <div className="space-y-2">
            {[
              { time: '02:00 UTC', task: 'Entropy Pool Rotation', status: 'Pending', active: false },
              { time: '06:30 UTC', task: 'VFS Cache Garbage Purge', status: 'Standby', active: false },
              { time: '14:00 UTC', task: 'Overlay Recalibration', status: 'Queued', active: false },
              { time: '21:15 UTC', task: 'Biometric Hash Shakehand', status: 'Auto', active: true }
            ].map((op, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-white/[0.02] border border-white/5 rounded-lg text-xs">
                <div>
                  <div className="text-white/80 font-medium text-xs">{op.task}</div>
                  <div className="text-[10px] text-white/40 mt-0.5">{op.time}</div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  op.active 
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' 
                    : 'border-white/10 bg-white/[0.02] text-white/40'
                }`}>
                  {op.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer System Specs */}
      <div className="text-[10px] text-white/30 border-t border-white/8 pt-2 flex justify-between uppercase font-sans">
        <span>AETHER Workspace Node</span>
        <span>Secure Session</span>
      </div>
    </div>
  );
};
