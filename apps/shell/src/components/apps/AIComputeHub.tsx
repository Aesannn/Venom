import React, { useEffect, useRef, useState } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { 
  Cpu, Activity, Shield, Zap, Play, Square, 
  Database, Sparkles, Network, Layers, Loader 
} from 'lucide-react';

export const AIComputeHub: React.FC = () => {
  const state = useSystemState();
  const routingCanvasRef = useRef<HTMLCanvasElement>(null);
  const telemetryCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Routing input form states
  const [promptText, setPromptText] = useState('Analyze system VFS memory logs and optimize sandbox security...');
  const [privacyShield, setPrivacyShield] = useState(true);
  const [complexity, setComplexity] = useState<'low' | 'high'>('low');
  
  // Simulation logs
  const [routingLogs, setRoutingLogs] = useState<string[]>([
    '[System Orchestrator] Router initialized.',
    '[System Orchestrator] Standby telemetry loop running.',
    '[System Orchestrator] CPU affinity map calibrated.'
  ]);

  // Particles for canvas routing animation
  const [, setParticles] = useState<Array<{ x: number; y: number; targetX: number; targetY: number; progress: number; color: string }>>([]);
  const [activeRoute, setActiveRoute] = useState<'local' | 'cloud' | 'edge' | null>(null);

  // Keep telemetry history
  const [latencyHistory, setLatencyHistory] = useState<number[]>(Array(20).fill(120));
  const [tokenSpeedHistory, setTokenSpeedHistory] = useState<number[]>(Array(20).fill(58));

  // Update telemetry history dynamically
  useEffect(() => {
    setLatencyHistory(prev => [...prev.slice(1), state.computeMetrics.latencyMs]);
    
    const activeLocalModel = state.localModels.find(m => m.status === 'LOADED');
    const currentSpeed = activeLocalModel ? state.computeMetrics.localTokensPerSec : state.computeMetrics.cloudTokensPerSec;
    setTokenSpeedHistory(prev => [...prev.slice(1), currentSpeed]);
  }, [state.computeMetrics.latencyMs, state.computeMetrics.localTokensPerSec, state.computeMetrics.cloudTokensPerSec, state.localModels]);

  // HTML5 Canvas routing animation loop
  useEffect(() => {
    const canvas = routingCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = 220);

    // Nodes coordinate map
    const clientNode = { x: 50, y: height / 2, label: 'Client Node', icon: '💻' };
    const routerNode = { x: width / 2 - 20, y: height / 2, label: 'Compute Router', icon: '🧠' };
    const localNode = { x: width - 80, y: 40, label: 'Local VRAM LLM', icon: '🎛️' };
    const edgeNode = { x: width - 80, y: height / 2, label: 'Edge Core API', icon: '📡' };
    const cloudNode = { x: width - 80, y: height - 40, label: 'Cloud Tensor Cluster', icon: '☁️' };

    let animationId: number;

    // Shift theme colors
    let themeColor = '#22d3ee'; // cyan
    switch (state.theme) {
      case 'purple': themeColor = '#a78bfa'; break;
      case 'green': themeColor = '#34d399'; break;
      case 'orange': themeColor = '#fb923c'; break;
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw grid system in background
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
      ctx.lineWidth = 1;
      for (let i = 20; i < width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let i = 20; i < height; i += 20) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }

      // Draw connection channels
      ctx.lineWidth = 1.5;
      
      const drawChannel = (from: { x: number; y: number }, to: { x: number; y: number }, active: boolean) => {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = active ? `${themeColor}44` : 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();
      };

      // Channels from Client -> Router
      drawChannel(clientNode, routerNode, activeRoute !== null);

      // Channels from Router -> Targets
      drawChannel(routerNode, localNode, activeRoute === 'local');
      drawChannel(routerNode, edgeNode, activeRoute === 'edge');
      drawChannel(routerNode, cloudNode, activeRoute === 'cloud');

      // Draw particles flowing along active routes
      setParticles(prev => {
        const next = prev.map(p => {
          const nextProg = p.progress + 0.02;
          const currX = p.x + (p.targetX - p.x) * nextProg;
          const currY = p.y + (p.targetY - p.y) * nextProg;

          // Draw neon particle
          ctx.beginPath();
          ctx.arc(currX, currY, 3, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0; // reset

          return { ...p, progress: nextProg };
        }).filter(p => p.progress < 1.0);
        
        return next;
      });

      // Draw target nodes
      const drawNode = (node: { x: number; y: number; label: string; icon: string }, isHighlighted: boolean) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 16, 0, Math.PI * 2);
        ctx.fillStyle = isHighlighted ? `${themeColor}15` : 'rgba(10, 10, 12, 0.6)';
        ctx.strokeStyle = isHighlighted ? themeColor : 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = isHighlighted ? 2 : 1;
        ctx.fill();
        ctx.stroke();

        ctx.font = '12px Courier New';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.icon, node.x, node.y);

        // Label
        ctx.font = '9px system-ui';
        ctx.fillStyle = isHighlighted ? themeColor : 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = node.x > width / 2 ? 'right' : 'left';
        const textOffset = node.x > width / 2 ? -24 : 24;
        
        // Adjust for center router label
        const alignment = node.x === width / 2 - 20 ? 'center' : (node.x > width / 2 ? 'right' : 'left');
        ctx.textAlign = alignment as CanvasTextAlign;
        const xPos = alignment === 'center' ? node.x : node.x + textOffset;
        const yPos = alignment === 'center' ? node.y - 24 : node.y;

        ctx.fillText(node.label, xPos, yPos);
      };

      drawNode(clientNode, activeRoute !== null);
      drawNode(routerNode, activeRoute !== null);
      drawNode(localNode, activeRoute === 'local');
      drawNode(edgeNode, activeRoute === 'edge');
      drawNode(cloudNode, activeRoute === 'cloud');

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        drawGraphLines();
      }
    };
    const drawGraphLines = () => {
      clientNode.x = 40;
      routerNode.x = width / 2 - 10;
      localNode.x = width - 40;
      edgeNode.x = width - 40;
      cloudNode.x = width - 40;
    };
    drawGraphLines();
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [activeRoute, state.theme]);

  // Telemetry painter canvas loop
  useEffect(() => {
    const canvas = telemetryCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = 100);

    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    let themeColor = '#22d3ee';
    let themeRgb = '34, 211, 238';
    switch (state.theme) {
      case 'purple': themeColor = '#a78bfa'; themeRgb = '167, 139, 250'; break;
      case 'green': themeColor = '#34d399'; themeRgb = '52, 211, 153'; break;
      case 'orange': themeColor = '#fb923c'; themeRgb = '251, 146, 60'; break;
    }

    const drawLineCurve = (history: number[], stroke: string, fill: string | CanvasGradient, maxVal: number) => {
      ctx.beginPath();
      const step = width / (history.length - 1);
      
      history.forEach((val, idx) => {
        const x = idx * step;
        const y = height - (val / maxVal) * (height - 20) - 10;
        
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = (idx - 1) * step;
          const prevY = height - (history[idx - 1] / maxVal) * (height - 20) - 10;
          const cpX = prevX + step / 2;
          ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
        }
      });

      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
    };

    // Draw Latency Graph (Theme Colored)
    const latGrad = ctx.createLinearGradient(0, 0, 0, height);
    latGrad.addColorStop(0, `rgba(${themeRgb}, 0.06)`);
    latGrad.addColorStop(1, `rgba(${themeRgb}, 0)`);
    drawLineCurve(latencyHistory, themeColor, latGrad, 500);

    // Draw Token speed curve (White/Gray)
    const speedGrad = ctx.createLinearGradient(0, 0, 0, height);
    speedGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
    speedGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    drawLineCurve(tokenSpeedHistory, 'rgba(255, 255, 255, 0.3)', speedGrad, 100);

    const handleResize = () => {
      if (canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth;
        // redraw
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [latencyHistory, tokenSpeedHistory, state.theme]);

  // Route workload handler
  const handleRouteWorkload = () => {
    if (!promptText.trim()) return;
    
    // Choose route
    const isPrivate = privacyShield;
    const finalRoute = (isPrivate ? 'local' : (complexity === 'high' ? 'cloud' : 'local')) as 'local' | 'cloud' | 'edge';

    setActiveRoute(finalRoute);
    playSound.click();

    // Trigger simulation log logs
    const newLogs = [
      `[Compute Router] Analyzing workload constraints...`,
      `[Compute Router] Parameters: complexity=${complexity.toUpperCase()} privacyShield=${isPrivate ? 'HIGH' : 'STANDARD'}`,
      `[Compute Router] Decision path matching rules...`,
      isPrivate 
        ? `[Compute Router] Privacy Shield [ACTIVE]: Dynamic routing bypassed, forced LOCAL fallback.` 
        : `[Compute Router] Decision matched rule: Complexity ${complexity.toUpperCase()} -> routing to ${finalRoute.toUpperCase()}`,
      `[Compute Router] Scheduling network packets...`,
    ];

    newLogs.forEach((log, i) => {
      setTimeout(() => {
        setRoutingLogs(prev => [...prev, log].slice(-10));
      }, i * 200);
    });

    // Spawn canvas flowing particles
    const canvas = routingCanvasRef.current;
    if (canvas) {
      const width = canvas.width;
      const height = canvas.height;
      const startX = 40;
      const startY = height / 2;
      const routerX = width / 2 - 10;
      const routerY = height / 2;

      let targetX = width - 40;
      let targetY = 40;
      if (finalRoute === 'edge') targetY = height / 2;
      if (finalRoute === 'cloud') targetY = height - 40;

      let themeColor = '#22d3ee';
      switch (state.theme) {
        case 'purple': themeColor = '#a78bfa'; break;
        case 'green': themeColor = '#34d399'; break;
        case 'orange': themeColor = '#fb923c'; break;
      }

      // Add particles
      setTimeout(() => {
        // Client to Router particle
        setParticles(prev => [
          ...prev, 
          { x: startX, y: startY, targetX: routerX, targetY: routerY, progress: 0, color: '#ffffff' }
        ]);
      }, 50);

      setTimeout(() => {
        // Router to Endpoint particle
        setParticles(prev => [
          ...prev, 
          { x: routerX, y: routerY, targetX: targetX, targetY: targetY, progress: 0, color: themeColor }
        ]);
      }, 600);
    }

    // Invoke state action
    setTimeout(() => {
      store.routeWorkload(promptText, isPrivate ? 'high' : 'standard', complexity);
      setRoutingLogs(prev => [
        ...prev,
        `[Orchestrator] Telemetry metrics synced: latency=${state.computeMetrics.latencyMs}ms, tokens/s=${isPrivate ? state.computeMetrics.localTokensPerSec : state.computeMetrics.cloudTokensPerSec}`
      ].slice(-10));
    }, 1200);
  };

  const activeThemeText = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const activeThemeBorder = 
    state.theme === 'purple' ? 'border-purple-500/20 hover:border-purple-500/40' :
    state.theme === 'green' ? 'border-emerald-500/20 hover:border-emerald-500/40' :
    state.theme === 'orange' ? 'border-orange-500/20 hover:border-orange-500/40' :
    'border-cyan-500/20 hover:border-cyan-500/40';

  const activeThemeBg = 
    state.theme === 'purple' ? 'bg-purple-500' :
    state.theme === 'green' ? 'bg-emerald-500' :
    state.theme === 'orange' ? 'bg-orange-500' :
    'bg-cyan-500';

  return (
    <div className="flex-1 p-5 text-xs font-sans h-full overflow-y-auto space-y-5 bg-transparent select-none scrollbar-thin">
      
      {/* Top Header Panel */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/5 pb-4 space-y-2 sm:space-y-0">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Cpu className={`w-5 h-5 ${activeThemeText}`} />
            <h1 className="text-sm font-semibold tracking-tight text-white uppercase">Aether Distributed AI Compute Engine</h1>
          </div>
          <p className="text-[10px] text-white/40">Intelligent workload scheduler, local weight tuner, and VRAM memory calibrator</p>
        </div>
        
        {/* Core Stats Overview */}
        <div className="flex items-center space-x-6 text-[10px] bg-white/5 border border-white/5 rounded-xl px-4 py-2">
          <div className="space-y-0.5">
            <span className="text-white/30 block uppercase tracking-wider">Router Load</span>
            <span className="font-semibold text-white font-mono">{state.cpuUsage}% CPU // {state.computeMetrics.gpuLoad}% GPU</span>
          </div>
          <div className="w-px h-6 bg-white/10" />
          <div className="space-y-0.5">
            <span className="text-white/30 block uppercase tracking-wider">VRAM Occupancy</span>
            <span className="font-semibold text-white font-mono">{state.computeMetrics.vramUsage} MB</span>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Local GGUF Model Orchestrator & Telemetry (7/12) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Section: Local LLM Registry */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pl-1">
              <h2 className="text-[10px] text-white/50 uppercase tracking-widest font-semibold flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5" />
                <span>Local GGUF Models Registry</span>
              </h2>
              <span className="text-[9px] text-white/30 uppercase tracking-wider">GPU Affinity active</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {state.localModels.map((model) => {
                const isLoaded = model.status === 'LOADED';
                const isLoading = model.status === 'LOADING';
                
                return (
                  <div 
                    key={model.id}
                    className={`p-4 rounded-xl border transition-all duration-350 bg-[#121216]/35 backdrop-blur-md relative overflow-hidden flex flex-col space-y-3 ${
                      isLoaded ? `border-white/10 ${activeThemeBorder}` : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Background Soft Glow if Loaded */}
                    {isLoaded && (
                      <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 pointer-events-none rounded-full blur-2xl ${activeThemeBg}`} />
                    )}

                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isLoaded ? 'bg-emerald-400' : isLoading ? 'bg-orange-400 animate-ping' : 'bg-white/20'
                          }`} />
                          <span className="font-medium text-white">{model.name}</span>
                          <span className="text-[9px] text-white/30 font-mono">({model.size})</span>
                        </div>
                        <p className="text-[9px] text-white/40">Hardware Profile: 16-bit Quantized GGUF tensor weights</p>
                      </div>

                      {/* Loading status text */}
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono ${
                        isLoaded ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        isLoading ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                        'bg-white/5 text-white/40 border border-white/5'
                      }`}>
                        {model.status}
                      </span>
                    </div>

                    {/* VRAM & Calibration Sliders */}
                    <div className="flex items-center justify-between text-[10px] pt-1">
                      <div className="flex items-center space-x-4">
                        <div className="space-y-0.5">
                          <span className="text-white/30 block text-[9px] uppercase tracking-wider">VRAM Buffer</span>
                          <span className="font-mono text-white/80">{model.vram > 0 ? `${model.vram} MB` : '0 MB'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-white/30 block text-[9px] uppercase tracking-wider">GPU Allocation</span>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-white/80 uppercase">{model.gpuPriority}</span>
                            <select
                              value={model.gpuPriority}
                              onChange={(e) => store.setLocalModelPriority(model.id, e.target.value as any)}
                              className="bg-black/80 text-white/60 border border-white/10 rounded px-1 text-[9px] cursor-pointer hover:text-white"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Med</option>
                              <option value="HIGH">High</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-2">
                        {isLoaded ? (
                          <button
                            onClick={() => store.unloadLocalModel(model.id)}
                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:text-rose-350 rounded-lg font-medium transition active:scale-95 flex items-center space-x-1"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            <span>Unload Weights</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => store.loadLocalModel(model.id)}
                            disabled={isLoading}
                            className={`px-3 py-1.5 rounded-lg font-medium transition active:scale-95 flex items-center space-x-1 ${
                              isLoading 
                                ? 'bg-white/5 text-white/30 border border-white/5 cursor-not-allowed'
                                : `bg-white/5 hover:bg-white/10 border border-white/10 text-white`
                            }`}
                          >
                            {isLoading ? (
                              <>
                                <Loader className="w-3 h-3 animate-spin" />
                                <span>Loading GGUF...</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>Calibrate & Load</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Loading gauge bar */}
                    {isLoading && (
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden relative">
                        <div className={`h-full animate-[shimmer_1.5s_infinite] ${activeThemeBg} rounded-full`} style={{ width: '60%' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Live Sentient Telemetry */}
          <div className="space-y-2">
            <h2 className="text-[10px] text-white/50 uppercase tracking-widest font-semibold pl-1 flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Sentient AI Core Telemetry</span>
            </h2>
            
            <div className="border border-white/5 bg-[#121216]/20 backdrop-blur-md rounded-xl p-4 space-y-4">
              {/* Telemetry charts row */}
              <div className="h-28 flex items-center justify-center relative">
                <canvas ref={telemetryCanvasRef} className="w-full h-full block" />
                
                {/* Stats overlays */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5 flex space-x-4 text-[8px] font-medium">
                  <div className="flex items-center space-x-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeThemeBg}`} />
                    <span className="text-white/60">Execution Latency ({state.computeMetrics.latencyMs}ms)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    <span className="text-white/60">Token Speed ({state.localModels.find(m => m.status === 'LOADED') ? state.computeMetrics.localTokensPerSec : state.computeMetrics.cloudTokensPerSec} t/s)</span>
                  </div>
                </div>
              </div>

              {/* Hardware diagnostics metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 space-y-0.5">
                  <span className="text-white/30 text-[8px] uppercase tracking-wider">GPU Clock Speed</span>
                  <p className="font-mono text-white text-[11px] font-semibold">1850 MHz</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 space-y-0.5">
                  <span className="text-white/30 text-[8px] uppercase tracking-wider">Thermal Sensor</span>
                  <p className="font-mono text-emerald-400 text-[11px] font-semibold">48.2°C</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 space-y-0.5">
                  <span className="text-white/30 text-[8px] uppercase tracking-wider">Quantum Affinity</span>
                  <p className="font-mono text-white text-[11px] font-semibold">16-thread AVX2</p>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-lg p-2.5 space-y-0.5">
                  <span className="text-white/30 text-[8px] uppercase tracking-wider">Sandboxed Ports</span>
                  <p className="font-mono text-white text-[11px] font-semibold">IPC Socket 4920</p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Workload Router, Active Agents & Diagnostics (5/12) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Section: Hybrid Compute Router */}
          <div className="space-y-2">
            <h2 className="text-[10px] text-white/50 uppercase tracking-widest font-semibold pl-1 flex items-center space-x-1.5">
              <Network className="w-3.5 h-3.5" />
              <span>Hybrid Compute Router Engine</span>
            </h2>

            <div className="border border-white/5 bg-[#121216]/20 backdrop-blur-md rounded-xl p-4 space-y-4">
              
              {/* Form Input prompt */}
              <div className="space-y-1">
                <label className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Inference Dispatch Input</label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Input inference prompt..."
                  rows={2}
                  className="w-full bg-black/55 border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20 resize-none font-sans"
                />
              </div>

              {/* Switches Row */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Privacy Shield switch */}
                <div 
                  onClick={() => setPrivacyShield(!privacyShield)}
                  className={`p-2.5 rounded-lg border cursor-pointer select-none transition flex items-center justify-between ${
                    privacyShield ? `bg-emerald-500/5 ${activeThemeBorder}` : 'bg-white/5 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-white/30 block uppercase tracking-wider">Privacy Shield</span>
                    <span className="font-medium text-white">{privacyShield ? 'HIGH (Forced Local)' : 'STANDARD'}</span>
                  </div>
                  <Shield className={`w-4 h-4 ${privacyShield ? 'text-emerald-400' : 'text-white/25'}`} />
                </div>

                {/* Complexity toggle */}
                <div 
                  onClick={() => setComplexity(complexity === 'low' ? 'high' : 'low')}
                  className={`p-2.5 rounded-lg border cursor-pointer select-none transition flex items-center justify-between bg-white/5 border-white/5 hover:border-white/10`}
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-white/30 block uppercase tracking-wider">Complexity Rule</span>
                    <span className="font-medium text-white">{complexity.toUpperCase()}</span>
                  </div>
                  <Zap className={`w-4 h-4 ${complexity === 'high' ? activeThemeText : 'text-white/25'}`} />
                </div>

              </div>

              {/* Action Button to Dispatch */}
              <button
                onClick={handleRouteWorkload}
                className={`w-full py-2.5 rounded-lg text-white font-medium flex items-center justify-center space-x-2 transition hover:opacity-90 active:scale-95 ${activeThemeBg}`}
              >
                <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>Analyze & Dispatch Workload</span>
              </button>

              {/* Visual Routing Canvas Block */}
              <div className="space-y-1">
                <label className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Distributed Topology Routing Flow</label>
                <div className="border border-white/5 bg-black/60 rounded-xl overflow-hidden h-56 flex items-center relative shadow-sm">
                  <canvas ref={routingCanvasRef} className="w-full h-full block" />
                  
                  {/* Routing statistics absolute labels */}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5 flex space-x-3 text-[8px] text-white/50 select-none pointer-events-none font-mono">
                    <span>LCL: {state.routingStats.localCount}</span>
                    <span>CLD: {state.routingStats.cloudCount}</span>
                    <span>SHLD: {state.routingStats.privacyShieldedCount}</span>
                  </div>
                </div>
              </div>

              {/* Simulation router console log */}
              <div className="space-y-1">
                <label className="text-[9px] text-white/40 uppercase tracking-wider font-medium">Router Console Logs</label>
                <div className="bg-black/55 border border-white/5 rounded-lg p-2.5 h-28 overflow-y-auto font-mono text-[9px] text-white/60 space-y-1 scrollbar-thin">
                  {routingLogs.map((log, index) => (
                    <div key={index} className={`truncate ${log.includes('Forced LOCAL') || log.includes('Privacy Shield') ? 'text-emerald-400 font-semibold' : log.includes('routing to') ? activeThemeText : ''}`}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Section: Autonomous Agent Distribution Console */}
          <div className="space-y-2">
            <h2 className="text-[10px] text-white/50 uppercase tracking-widest font-semibold pl-1 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Agent Distribution Slices</span>
            </h2>

            <div className="border border-white/5 bg-[#121216]/20 backdrop-blur-md rounded-xl p-3 space-y-3">
              <div className="divide-y divide-white/5 text-[11px] text-white/80">
                {state.computeAgents.map((agent) => (
                  <div key={agent.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          agent.status === 'BUSY' ? 'bg-orange-400 animate-ping' : 'bg-white/20'
                        }`} />
                        <span className="font-medium text-white">{agent.name}</span>
                      </div>
                      <p className="text-[9px] text-white/40">{agent.desc}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] text-white/30 font-mono uppercase bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {agent.status}
                      </span>
                      
                      {/* Priority slice adjustment drop down */}
                      <select
                        value={agent.priority}
                        onChange={(e) => store.setAgentPriority(agent.id, e.target.value as any)}
                        className="bg-black text-white/70 border border-white/10 rounded px-1.5 py-0.5 text-[9px] cursor-pointer hover:text-white"
                      >
                        <option value="BACKGROUND">Background</option>
                        <option value="NORMAL">Normal</option>
                        <option value="REALTIME">Real-time</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
