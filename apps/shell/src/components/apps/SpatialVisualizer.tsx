import React, { useEffect, useRef, useState } from 'react';
import { useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { Waypoints, Activity, Link, Compass, Monitor, Smartphone, Cpu } from 'lucide-react';

interface DeviceNode {
  id: string;
  name: string;
  type: string;
  status: string;
  ip: string;
  telemetry: {
    cpu: number;
    ram: number;
    temperature: number;
    activeProcesses: number;
  };
}

export const SpatialVisualizer: React.FC = () => {
  const state = useSystemState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<DeviceNode[]>([]);
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'STANDBY'>('STANDBY');

  const fetchMeshState = async () => {
    // Standard high-tech mock devices matching the Cross-device Exocortex blueprint
    const now = Date.now();
    const defaultNodes: DeviceNode[] = [
      {
        id: 'aether-desktop',
        name: 'AETHER-DESKTOP',
        type: 'workstation',
        status: 'online',
        ip: '192.168.1.100',
        telemetry: { cpu: state.cpuUsage, ram: state.ramUsage, temperature: 42.8, activeProcesses: state.processes.length }
      },
      {
        id: 'aether-deck',
        name: 'AETHER-MOBILE-DECK',
        type: 'mobile',
        status: 'online',
        ip: '192.168.1.102',
        telemetry: { cpu: 14, ram: 45, temperature: 34.2, activeProcesses: 18 }
      },
      {
        id: 'aether-cloud',
        name: 'AETHER-CLOUD-NODE',
        type: 'server',
        status: 'online',
        ip: '35.224.12.98',
        telemetry: { cpu: 28, ram: 52, temperature: 39.5, activeProcesses: 142 }
      }
    ];
    setNodes(defaultNodes);
  };

  useEffect(() => {
    fetchMeshState();
    const interval = setInterval(fetchMeshState, 3000);
    return () => clearInterval(interval);
  }, [state.cpuUsage, state.ramUsage, state.processes]);

  // WebSocket telemetry bridge setup
  useEffect(() => {
    // Attempt local websocket connect to rust backend server
    const socket = new WebSocket('ws://localhost:4444');
    socket.onopen = () => {
      setWsStatus('CONNECTED');
      console.log('[SPATIAL SYNC] Connected to Rust WebSocket server.');
    };
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'HEARTBEAT') {
          // Keepalive
        }
      } catch (e) {}
    };
    socket.onerror = () => {
      setWsStatus('STANDBY');
    };
    socket.onclose = () => {
      setWsStatus('DISCONNECTED');
    };
    return () => socket.close();
  }, []);

  // 3D Canvas visualizer logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = 320);

    const drawMesh = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      // 1. Draw glowing background grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.01)';
      ctx.lineWidth = 0.8;
      const size = 30;
      for (let x = 0; x < width; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw faint orbit tracks
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.beginPath();
      ctx.arc(cx, cy, 70, 0, Math.PI * 2);
      ctx.arc(cx, cy, 140, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Draw connections between nodes
      ctx.lineWidth = 1.0;
      const angleStep = (Math.PI * 2) / Math.max(1, nodes.length);
      const points: { x: number; y: number; name: string; node: DeviceNode }[] = [];

      nodes.forEach((node, idx) => {
        let radius = 100;
        if (node.type === 'mobile') radius = 70;
        if (node.type === 'server') radius = 140;

        const time = Date.now() * 0.0005 * (idx === 0 ? 1 : idx === 1 ? -0.8 : 1.2);
        const angle = (idx * angleStep) + time;
        const nx = cx + Math.cos(angle) * radius;
        const ny = cy + Math.sin(angle) * radius;
        points.push({ x: nx, y: ny, name: node.name, node });
      });

      // Draw interconnect lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        for (let j = i + 1; j < points.length; j++) {
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
        }
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Draw nodes styled as orbital telemetry nodes
      points.forEach((p, idx) => {
        let nodeColor = '#06b6d4'; // Cyan default
        let rgb = '6, 182, 212';
        if (p.node.type === 'mobile') {
          nodeColor = '#fb923c'; // Orange
          rgb = '251, 146, 60';
        } else if (p.node.type === 'server') {
          nodeColor = '#10b981'; // Green
          rgb = '16, 185, 129';
        }

        // Pulse scale
        const pulse = 1.0 + Math.sin(Date.now() * 0.003 + idx) * 0.08;

        // Glowing backdrop
        ctx.fillStyle = `rgba(${rgb}, 0.08)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 25 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Core Circle
        ctx.fillStyle = '#090c10';
        ctx.strokeStyle = nodeColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Inner center core
        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();

        // Text Tags
        ctx.font = '8.5px "Fira Code", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, p.x, p.y - 22);

        ctx.font = '7.5px "Fira Code", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillText(`${p.node.telemetry.cpu}% CPU // ${p.node.telemetry.temperature}°C`, p.x, p.y + 24);
      });
    };

    let frameId: number;
    const loop = () => {
      drawMesh();
      frameId = requestAnimationFrame(loop);
    };
    loop();

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        drawMesh();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [nodes]);

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const textActive = 
    state.theme === 'purple' ? 'text-purple-400 border-purple-500' :
    state.theme === 'green' ? 'text-emerald-400 border-emerald-500' :
    state.theme === 'orange' ? 'text-orange-400 border-orange-500' :
    'text-cyan-400 border-cyan-500';

  const borderActive = 'border-white/5';

  return (
    <div className="flex-1 bg-[#06080a]/95 text-xs font-mono h-full flex flex-col select-none overflow-hidden text-left">
      
      {/* Header telemetry sync */}
      <div className="border-b border-white/5 bg-white/[0.01] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Waypoints className={`w-4 h-4 ${textTheme} animate-pulse`} />
          <span className="font-semibold uppercase tracking-wider text-[11px] text-white">Cross-Device Exocortex Telemetry Mesh</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-semibold uppercase tracking-wider ${
            wsStatus === 'CONNECTED' 
              ? 'bg-emerald-500/10 text-emerald-450 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-450 text-amber-400 border border-amber-500/20'
          }`}>
            SYNC SERVER: {wsStatus} (127.0.0.1:4444)
          </span>
        </div>
      </div>

      {/* Main split dashboard panels */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Side: Real-time 3D Canvas visualizer */}
        <div className="flex-1 border-r border-white/5 relative p-4 flex items-center justify-center bg-black/10">
          <canvas ref={canvasRef} className="w-full h-full block" />
          
          {/* Faint HUD directions */}
          <div className="absolute bottom-3 left-3 flex items-center space-x-2 text-[8px] text-white/30 uppercase tracking-widest pointer-events-none">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active exocortex mesh topology auto-discovered</span>
          </div>
        </div>

        {/* Right Side: Network Node checklist */}
        <div className="w-80 flex flex-col p-5 bg-[#080a0f]/40 space-y-4 overflow-y-auto scrollbar-thin">
          <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider border-b border-white/5 pb-2">Active Node Inventory</span>
          
          <div className="space-y-3">
            {nodes.map((node) => (
              <div 
                key={node.id} 
                className="p-3 border border-white/5 bg-[#0a0d13]/60 rounded-xl space-y-2 hover:border-white/10 transition text-left"
              >
                <div className="flex justify-between items-center text-[9px] font-bold">
                  <div className="flex items-center space-x-1.5 text-white">
                    {node.type === 'mobile' ? <Smartphone className="w-3.5 h-3.5 text-orange-400" /> : 
                     node.type === 'server' ? <Cpu className="w-3.5 h-3.5 text-emerald-400" /> : 
                     <Monitor className="w-3.5 h-3.5 text-cyan-400" />}
                    <span className="uppercase">{node.name}</span>
                  </div>
                  <span className="text-white/30 font-mono text-[8px]">{node.ip}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[8px] text-white/40 uppercase tracking-wider font-semibold border-t border-white/5 pt-2">
                  <div>
                    <span>CPU LOAD</span>
                    <p className={`text-[10px] font-bold ${textTheme} font-mono mt-0.5`}>{node.telemetry.cpu}%</p>
                  </div>
                  <div>
                    <span>TEMPERATURE</span>
                    <p className="text-[10px] font-bold text-white font-mono mt-0.5">{node.telemetry.temperature}°C</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
