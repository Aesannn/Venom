import React, { useState } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import type { AppManifest } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { 
  ShoppingBag, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  Trash2,
  Grid,
  Zap,
  Info
} from 'lucide-react';

export const AetherMarketplace: React.FC = () => {
  const state = useSystemState();
  const [selectedApp, setSelectedApp] = useState<AppManifest | null>(null);
  const [activeTab, setActiveTab] = useState<'apps' | 'services'>('apps');

  // Hot-swappable background daemons / services
  const [daemons, setDaemons] = useState([
    { id: 'git-sync', name: 'GitSync Staging Daemon', desc: 'Auto-syncs local VFS modifications with git indices.', status: 'STANDBY', version: '1.2.0', cpu: 0.0, mem: 4 },
    { id: 'llama-inf', name: 'Llama.cpp Inference Server', desc: 'Spawns local weight evaluation threads for sandbox queries.', status: 'ACTIVE', version: '2.1.0', cpu: 1.4, mem: 512 },
    { id: 'docker-sup', name: 'Docker Compositor Watchdog', desc: 'Monitors container processes rendering to Wayland.', status: 'STANDBY', version: '1.0.4', cpu: 0.0, mem: 8 }
  ]);

  const allManifests = state.manifests || [];
  
  // Apps that are not built-in by default in state.windows initial load, or are extensions
  const marketplaceApps = allManifests.filter(m => 
    ['docker-manager', 'git-integrator', 'llama-tuner', 'cyber-terminal'].includes(m.id)
  );

  const isInstalled = (id: string) => {
    return state.installedAppIds.includes(id);
  };

  const handleInstall = (app: AppManifest) => {
    playSound.success();
    store.installAppManifest(app);
    // Refresh selected view details if open
    if (selectedApp?.id === app.id) {
      setSelectedApp({ ...app });
    }
  };

  const handleUninstall = (id: string) => {
    playSound.warning();
    store.uninstallApp(id);
    if (selectedApp?.id === id) {
      setSelectedApp(null);
    }
  };

  const toggleDaemon = (id: string) => {
    playSound.click();
    setDaemons(prev => prev.map(d => {
      if (d.id === id) {
        const nextStatus = d.status === 'ACTIVE' ? 'STANDBY' : 'ACTIVE';
        const nextCpu = nextStatus === 'ACTIVE' ? 0.8 : 0.0;
        const nextMem = nextStatus === 'ACTIVE' ? Math.round(d.mem * 10) : Math.round(d.mem / 10) || 4;
        
        store.addNotification(
          `${d.name} Updated`, 
          `Service status transitioned to ${nextStatus}.`, 
          'Just now'
        );
        
        return { ...d, status: nextStatus, cpu: nextCpu, mem: nextMem };
      }
      return d;
    }));
  };

  const getTrustBadge = (status: 'verified' | 'partner' | 'unverified') => {
    if (status === 'verified') {
      return (
        <span className="flex items-center space-x-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Verified System Core</span>
        </span>
      );
    }
    if (status === 'partner') {
      return (
        <span className="flex items-center space-x-1 text-[9px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase tracking-wider">
          <CheckCircle2 className="w-3 h-3 text-cyan-400" />
          <span>Signed Developer Module</span>
        </span>
      );
    }
    return (
      <span className="flex items-center space-x-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase tracking-wider animate-pulse">
        <AlertTriangle className="w-3 h-3 text-amber-400" />
        <span>Unverified Sandbox</span>
      </span>
    );
  };

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const bgGradient = 
    state.theme === 'purple' ? 'from-purple-500/10 to-indigo-500/5' :
    state.theme === 'green' ? 'from-emerald-500/10 to-teal-500/5' :
    state.theme === 'orange' ? 'from-orange-500/10 to-yellow-500/5' :
    'from-cyan-500/10 to-blue-500/5';

  const accentBorder = 
    state.theme === 'purple' ? 'border-purple-500/25' :
    state.theme === 'green' ? 'border-emerald-500/25' :
    state.theme === 'orange' ? 'border-orange-500/25' :
    'border-cyan-500/25';

  const activeBtnStyle = 
    state.theme === 'purple' ? 'bg-purple-600/20 border-purple-500/40 text-white' :
    state.theme === 'green' ? 'bg-emerald-600/20 border-emerald-500/40 text-white' :
    state.theme === 'orange' ? 'bg-orange-600/20 border-orange-500/40 text-white' :
    'bg-cyan-600/20 border-cyan-500/40 text-white';

  return (
    <div className="flex-1 bg-[#06080b]/96 text-xs font-mono h-full flex flex-col select-none overflow-hidden relative">
      
      {/* 🔮 MARKETPLACE HEADBAR HUD */}
      <div className="h-12 border-b border-white/5 px-4 flex items-center justify-between bg-white/[0.01] flex-shrink-0">
        <div className="flex items-center space-x-2.5">
          <ShoppingBag className={`w-4.5 h-4.5 ${textTheme} animate-pulse`} />
          <span className="text-white font-bold tracking-widest text-[11px] uppercase">AETHER PLATFORM MARKETPLACE</span>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1">
          <button 
            onClick={() => { playSound.click(); setActiveTab('apps'); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-all ${
              activeTab === 'apps' ? activeBtnStyle : 'border-transparent text-white/40 hover:text-white/80'
            }`}
          >
            Applications
          </button>
          <button 
            onClick={() => { playSound.click(); setActiveTab('services'); }}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-all ${
              activeTab === 'services' ? activeBtnStyle : 'border-transparent text-white/40 hover:text-white/80'
            }`}
          >
            System Services
          </button>
        </div>
      </div>

      {/* 🚀 MAIN CONTENT SPLIT WINDOW */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* TAB 1: APPLICATIONS DIRECTORY */}
        {activeTab === 'apps' && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Grid listings of available modules */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              <div className="flex justify-between items-center text-[9px] text-white/30 uppercase tracking-wider pl-1 border-b border-white/5 pb-1">
                <span>Ecosystem extensions & modular binaries</span>
                <span>{marketplaceApps.length} Modules cataloged</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {marketplaceApps.map(app => {
                  const installed = isInstalled(app.id);
                  const isSelected = selectedApp?.id === app.id;
                  
                  return (
                    <div 
                      key={app.id}
                      onClick={() => { playSound.click(); setSelectedApp(app); }}
                      className={`p-3.5 rounded-xl border bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300 flex flex-col justify-between cursor-pointer space-y-3 relative group overflow-hidden ${
                        isSelected ? `bg-white/[0.04] ${accentBorder}` : 'border-white/5'
                      }`}
                    >
                      {/* Sub-glow effect on active color theme */}
                      {isSelected && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-30 pointer-events-none`} />
                      )}

                      {/* Header row */}
                      <div className="flex items-start justify-between relative z-10">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center text-white/60">
                            {/* Dynamically fallback to generic rendering */}
                            <Grid className="w-5 h-5 text-white/60" />
                          </div>
                          <div className="text-left space-y-0.5">
                            <h4 className="text-white font-bold text-[11px] uppercase tracking-wide leading-normal truncate max-w-[130px]">{app.name}</h4>
                            <span className="text-[8.5px] text-white/30 font-mono leading-none block">v{app.version}</span>
                          </div>
                        </div>
                        {getTrustBadge(app.developer.trustStatus)}
                      </div>

                      {/* Description */}
                      <p className="text-[10px] text-white/50 leading-relaxed text-left font-sans truncate-2-lines relative z-10">
                        {app.description}
                      </p>

                      {/* Footer Actions */}
                      <div className="flex justify-between items-center pt-2.5 border-t border-white/5 relative z-10">
                        <span className="text-[8px] text-white/30 uppercase tracking-widest">
                          Rendering: <span className="text-cyan-400 font-semibold">{app.renderingMode}</span>
                        </span>
                        {installed ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15 uppercase tracking-wide">
                              Installed
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleUninstall(app.id); }}
                              className="p-1 rounded-md text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition"
                              title="Uninstall"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleInstall(app); }}
                            className={`px-3 py-1 text-[9px] font-bold rounded-lg border transition-all active:scale-95 ${
                              state.theme === 'purple' ? 'bg-purple-600/30 border-purple-500/50 hover:bg-purple-500/50 hover:border-purple-400 hover:shadow-[0_0_8px_rgba(168,85,247,0.3)]' :
                              state.theme === 'green' ? 'bg-emerald-600/30 border-emerald-500/50 hover:bg-emerald-500/50 hover:border-emerald-400 hover:shadow-[0_0_8px_rgba(16,185,129,0.3)]' :
                              state.theme === 'orange' ? 'bg-orange-600/30 border-orange-500/50 hover:bg-orange-500/50 hover:border-orange-400 hover:shadow-[0_0_8px_rgba(249,115,22,0.3)]' :
                              'bg-cyan-600/30 border-cyan-500/50 hover:bg-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                            } text-white`}
                          >
                            Install Module
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Application detailed manifest inspector (Right Sidebar panel) */}
            <div className="w-80 border-l border-white/5 bg-[#080a0e]/95 p-4 flex flex-col justify-between overflow-y-auto scrollbar-none text-left">
              {selectedApp ? (
                <div className="space-y-5">
                  <div className="space-y-2 border-b border-white/5 pb-4">
                    {getTrustBadge(selectedApp.developer.trustStatus)}
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider">{selectedApp.name}</h3>
                    <div className="flex justify-between items-center text-[9px] text-white/30 font-mono">
                      <span>Developer: <span className="text-white/60">{selectedApp.developer.name}</span></span>
                      <span>Version: {selectedApp.version}</span>
                    </div>
                  </div>

                  {/* Capabilities / SDK access requirements list */}
                  <div className="space-y-2">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Permissions Requested</span>
                    <div className="space-y-1.5">
                      {selectedApp.permissions.map(perm => {
                        const permLabels: Record<string, string> = {
                          'fs:read': 'VFS read file contents',
                          'fs:write': 'VFS write & modify documents',
                          'ai:query': 'Query Aether sentient AI core',
                          'ai:memory': 'Inject custom facts in neural memory',
                          'telemetry:read': 'Access host temperature & threads',
                          'workspace:write': 'Trigger dynamic workspace transformations',
                          'notifications:write': 'Post platform alerts & notifications'
                        };
                        return (
                          <div key={perm} className="flex items-start space-x-2 text-[9.5px]">
                            <Zap className="w-3.5 h-3.5 text-cyan-400 mt-0.5 flex-shrink-0 animate-pulse" />
                            <div className="flex flex-col">
                              <span className="text-white/80 font-bold uppercase tracking-wider text-[8px]">{perm}</span>
                              <span className="text-white/40 leading-tight font-sans text-[8.5px]">{permLabels[perm] || perm}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Programmatic Capabilities */}
                  <div className="space-y-2">
                    <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Platform Capabilities</span>
                    <div className="space-y-1 pl-1">
                      {selectedApp.capabilities.map((cap, idx) => (
                        <div key={idx} className="flex items-center space-x-2 text-[9.5px] text-white/60 font-sans">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warning for unverified software */}
                  {selectedApp.developer.trustStatus === 'unverified' && (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-1.5 text-[9.5px] leading-relaxed">
                      <div className="flex items-center space-x-1.5 text-amber-400 font-bold uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Security Sandbox Warning</span>
                      </div>
                      <p className="text-white/50 font-sans">
                        This module has not been signed with an AetherCorp platform key. Executing this code allows sandboxed SDK token capabilities to access VFS local folders. Approve with caution.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-white/20 uppercase py-20 space-y-2">
                  <Info className="w-8 h-8 text-white/10" />
                  <span className="text-[9px] tracking-widest">Select a module manifest<br />to inspect sandbox specs</span>
                </div>
              )}

              {selectedApp && (
                <div className="pt-4 border-t border-white/5">
                  {isInstalled(selectedApp.id) ? (
                    <button
                      onClick={() => handleUninstall(selectedApp.id)}
                      className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Uninstall Application</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInstall(selectedApp)}
                      className={`w-full py-2 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition active:scale-95 flex items-center justify-center space-x-1.5 ${
                        state.theme === 'purple' ? 'bg-purple-600/20 border-purple-500/40 hover:bg-purple-600/40 text-purple-300' :
                        state.theme === 'green' ? 'bg-emerald-600/20 border-emerald-500/40 hover:bg-emerald-600/40 text-emerald-300' :
                        state.theme === 'orange' ? 'bg-orange-600/20 border-orange-500/40 hover:bg-orange-600/40 text-orange-300' :
                        'bg-cyan-600/20 border-cyan-500/40 hover:bg-cyan-600/40 text-cyan-300'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Approve & Install App</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: NATIVE SYSTEM DAEMONS & SERVICE HOOKS */}
        {activeTab === 'services' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            <div className="flex justify-between items-center text-[9px] text-white/30 uppercase tracking-wider pl-1 border-b border-white/5 pb-1">
              <span>Background runtimes and hot-swappable daemons</span>
              <span>{daemons.filter(d => d.status === 'ACTIVE').length} Runtimes online</span>
            </div>

            <div className="space-y-3">
              {daemons.map(daemon => {
                const isActive = daemon.status === 'ACTIVE';
                return (
                  <div 
                    key={daemon.id}
                    className={`p-4 rounded-xl border bg-white/[0.01] transition-all duration-300 flex items-center justify-between border-white/5 hover:border-white/10 ${
                      isActive ? accentBorder : 'border-white/5'
                    }`}
                  >
                    {/* Left details */}
                    <div className="flex items-center space-x-4 flex-1 pr-4">
                      <div className={`p-2.5 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center ${
                        isActive ? textTheme : 'text-white/30'
                      }`}>
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div className="text-left space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-bold text-xs uppercase tracking-wide leading-none">{daemon.name}</span>
                          <span className="text-[8.5px] text-white/30 font-mono">v{daemon.version}</span>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed font-sans">{daemon.desc}</p>
                        
                        {/* Process metrics info */}
                        {isActive && (
                          <div className="flex items-center space-x-3 pt-1 text-[8.5px] font-mono text-white/30">
                            <span>CPU: <span className="text-emerald-400 font-bold">{daemon.cpu}%</span></span>
                            <span>MEM: <span className="text-emerald-400 font-bold">{daemon.mem}MB</span></span>
                            <span className="animate-pulse flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>DAEMON ONLINE</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Toggle */}
                    <button
                      onClick={() => toggleDaemon(daemon.id)}
                      className={`px-4 py-2 rounded-lg text-[9px] font-bold uppercase tracking-wider border transition active:scale-95 ${
                        isActive 
                          ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/35 hover:bg-emerald-500/20' 
                          : 'text-white/40 bg-white/5 border-white/5 hover:text-white/70 hover:bg-white/[0.08]'
                      }`}
                    >
                      {isActive ? 'Terminate' : 'Hot-Swap In'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
