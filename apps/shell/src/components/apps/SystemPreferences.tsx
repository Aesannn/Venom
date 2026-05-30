import React, { useState, useEffect } from 'react';
import { store, useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { Palette, Volume2, Info, HardDrive, Check, Sun, Moon } from 'lucide-react';

type TabId = 'appearance' | 'audio' | 'about' | 'storage';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'appearance', label: 'Appearance', icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'audio', label: 'Audio', icon: <Volume2 className="w-3.5 h-3.5" /> },
  { id: 'about', label: 'About', icon: <Info className="w-3.5 h-3.5" /> },
  { id: 'storage', label: 'Storage', icon: <HardDrive className="w-3.5 h-3.5" /> },
];

const THEMES = [
  { id: 'cyan' as const, label: 'Linear Blue', color: '#3b82f6', ring: 'ring-blue-500/50' },
  { id: 'purple' as const, label: 'Royal Purple', color: '#8b5cf6', ring: 'ring-purple-500/50' },
  { id: 'green' as const, label: 'Emerald Green', color: '#10b981', ring: 'ring-emerald-500/50' },
  { id: 'orange' as const, label: 'Amber Gold', color: '#f59e0b', ring: 'ring-orange-500/50' },
];

const WALLPAPERS = [
  { id: 'particles' as const, label: 'Dynamic Mesh', desc: 'Subtle drifting color mesh' },
  { id: 'matrix' as const, label: 'Dot Grid', desc: 'Figma-style architectural grid' },
  { id: 'stars' as const, label: 'Midnight Stars', desc: 'Breathing quiet sky constellation' },
  { id: 'scanlines' as const, label: 'Horizon Grid', desc: 'Studio horizon light & baseline' },
];

export const SystemPreferences: React.FC = () => {
  const state = useSystemState();
  const [activeTab, setActiveTab] = useState<TabId>('appearance');
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setUptime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Count VFS nodes
  const countVFS = (node: any): { files: number; dirs: number } => {
    if (node.type === 'file') return { files: 1, dirs: 0 };
    let files = 0, dirs = 1;
    if (node.children) {
      Object.values(node.children).forEach((child: any) => {
        const c = countVFS(child);
        files += c.files;
        dirs += c.dirs;
      });
    }
    return { files, dirs };
  };
  const vfsStats = countVFS(state.vfs);

  const textTheme =
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';

  const bgAccent =
    state.theme === 'purple' ? 'bg-purple-500' :
    state.theme === 'green' ? 'bg-emerald-500' :
    state.theme === 'orange' ? 'bg-orange-500' :
    'bg-cyan-500';

  const borderAccent =
    state.theme === 'purple' ? 'border-purple-500/30' :
    state.theme === 'green' ? 'border-emerald-500/30' :
    state.theme === 'orange' ? 'border-orange-500/30' :
    'border-cyan-500/30';

  const renderTab = () => {
    switch (activeTab) {
      case 'appearance':
        return (
          <div className="space-y-5 animate-fadeIn">
            {/* Theme Color Picker */}
            <section className="space-y-2.5">
              <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-bold flex items-center space-x-1.5">
                <Sun className="w-3 h-3" />
                <span>System Accent Theme</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { playSound.click(); store.setTheme(t.id); }}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-lg border transition-all duration-200 ${
                      state.theme === t.id
                        ? `border-white/20 bg-white/5 ring-1 ${t.ring}`
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        state.theme === t.id ? 'border-white' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: t.color }}
                    >
                      {state.theme === t.id && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold">
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Wallpaper Selector */}
            <section className="space-y-2.5">
              <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-bold flex items-center space-x-1.5">
                <Moon className="w-3 h-3" />
                <span>Desktop Wallpaper</span>
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {WALLPAPERS.map(w => (
                  <button
                    key={w.id}
                    onClick={() => { playSound.click(); store.setWallpaper(w.id); }}
                    className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                      state.wallpaper === w.id
                        ? `${borderAccent} bg-white/5 ring-1 ring-current`
                        : 'border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${
                      state.wallpaper === w.id ? textTheme : 'text-white/60'
                    }`}>
                      {w.label}
                    </div>
                    <div className="text-[8px] text-white/30 mt-0.5">{w.desc}</div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-5 animate-fadeIn">
            <section className="space-y-3">
              <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-bold flex items-center space-x-1.5">
                <Volume2 className="w-3 h-3" />
                <span>Audio Engine</span>
              </h3>

              {/* Sound toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                <div>
                  <div className="text-[10px] text-white/70 font-bold uppercase">System Sounds</div>
                  <div className="text-[8px] text-white/30">UI feedback, notifications, alerts</div>
                </div>
                <button
                  onClick={() => { playSound.click(); store.toggleSound(); }}
                  className={`w-10 h-5 rounded-full relative transition-all duration-300 ${
                    state.soundEnabled ? bgAccent : 'bg-white/10'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${
                    state.soundEnabled ? 'left-[22px]' : 'left-0.5'
                  }`} />
                </button>
              </div>

              {/* Visualizer bars (decorative) */}
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="text-[10px] text-white/70 font-bold uppercase mb-2">Audio Spectrum</div>
                <div className="flex items-end justify-center space-x-1 h-16">
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = state.soundEnabled
                      ? 8 + Math.random() * 48
                      : 4;
                    return (
                      <div
                        key={i}
                        className={`w-1.5 rounded-t transition-all duration-500 ${bgAccent} opacity-60`}
                        style={{ height: `${h}px` }}
                      />
                    );
                  })}
                </div>
                <div className="text-[8px] text-white/20 text-center mt-1.5">
                  {state.soundEnabled ? 'AUDIO INTERFACE: ACTIVE' : 'AUDIO INTERFACE: MUTED'}
                </div>
              </div>

              {/* Test Sound */}
              <button
                onClick={() => playSound.success()}
                className="w-full py-2 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-wider transition hover:bg-white/5 text-white/60"
              >
                ▶ Test System Sound
              </button>
            </section>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-4 animate-fadeIn">
            {/* Logo / Branding */}
            <div className="text-center py-4 border-b border-white/5">
              <div className={`text-2xl font-black tracking-[0.3em] uppercase ${textTheme}`}>
                AETHER
              </div>
              <div className="text-[9px] text-white/30 tracking-[0.5em] uppercase mt-0.5">
                WORKSPACE ENVIRONMENT
              </div>
              <div className="text-[8px] text-white/20 mt-2 font-mono">
                Version 3.5.2-stable // Build 20260523
              </div>
            </div>

            {/* System Info Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Kernel', value: 'Aether Core v9.1-stable' },
                { label: 'Compositor', value: 'WebGL Canvas Compositor' },
                { label: 'Uptime', value: formatUptime(uptime) },
                { label: 'Architecture', value: 'x86_64-local' },
                { label: 'Active Theme', value: state.theme.toUpperCase() },
                { label: 'Wallpaper', value: state.wallpaper.toUpperCase() },
                { label: 'CPU Load', value: `${state.cpuUsage.toFixed(1)}%` },
                { label: 'RAM Usage', value: `${state.ramUsage.toFixed(0)} MB` },
              ].map((item, i) => (
                <div key={i} className="p-2 rounded border border-white/5 bg-white/[0.02]">
                  <div className="text-[8px] text-white/30 uppercase">{item.label}</div>
                  <div className={`text-[10px] font-bold font-mono ${textTheme}`}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Credits */}
            <div className="text-center text-[8px] text-white/15 uppercase tracking-widest pt-2 border-t border-white/5">
              © 2026 AetherCorp Systems — All Neural Rights Reserved
            </div>
          </div>
        );

      case 'storage':
        return (
          <div className="space-y-4 animate-fadeIn">
            <section className="space-y-3">
              <h3 className="text-[10px] text-white/40 uppercase tracking-widest font-bold flex items-center space-x-1.5">
                <HardDrive className="w-3 h-3" />
                <span>Virtual Filesystem Overview</span>
              </h3>

              {/* VFS Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] text-center">
                  <div className={`text-xl font-black font-mono ${textTheme}`}>{vfsStats.files}</div>
                  <div className="text-[8px] text-white/30 uppercase tracking-wider">Files</div>
                </div>
                <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] text-center">
                  <div className={`text-xl font-black font-mono ${textTheme}`}>{vfsStats.dirs}</div>
                  <div className="text-[8px] text-white/30 uppercase tracking-wider">Directories</div>
                </div>
              </div>

              {/* Usage bar */}
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02] space-y-2">
                <div className="flex justify-between text-[9px]">
                  <span className="text-white/50 font-bold uppercase">Disk Usage</span>
                  <span className="text-white/40 font-mono">{((vfsStats.files * 2.4 + vfsStats.dirs * 0.1)).toFixed(1)} KB / 512 KB</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bgAccent} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(100, (vfsStats.files * 2.4 + vfsStats.dirs * 0.1) / 512 * 100)}%` }}
                  />
                </div>
              </div>

              {/* Process count */}
              <div className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                <div className="text-[9px] text-white/50 font-bold uppercase mb-1.5">Active Processes</div>
                <div className="space-y-1">
                  {state.processes.map(p => (
                    <div key={p.pid} className="flex justify-between text-[9px]">
                      <span className="text-white/60 font-mono">{p.name}</span>
                      <span className={`font-mono ${p.status === 'running' ? 'text-emerald-400/70' : 'text-white/30'}`}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clear VFS */}
              <button
                onClick={() => {
                  playSound.warning();
                  localStorage.removeItem('aether_vfs');
                  store.addNotification('VFS Reset', 'Virtual filesystem cleared. Reload to apply.', 'Just now');
                }}
                className="w-full py-2 rounded-lg border border-rose-500/20 text-rose-400/70 text-[10px] font-bold uppercase tracking-wider transition hover:bg-rose-500/10 hover:border-rose-500/30"
              >
                ⚠ Factory Reset VFS
              </button>
            </section>
          </div>
        );
    }
  };

  return (
    <div className={`flex-1 bg-[#07090c]/90 text-xs font-mono h-full flex select-none overflow-hidden theme-${state.theme}`}>
      {/* Sidebar tabs */}
      <div className="w-40 flex-shrink-0 bg-[#0a0d11]/95 border-r border-white/5 flex flex-col py-3">
        <div className="px-3 pb-3 border-b border-white/5 mb-2">
          <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Settings</div>
        </div>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { playSound.click(); setActiveTab(tab.id); }}
            className={`flex items-center space-x-2 px-3 py-2 mx-1.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? `${textTheme} bg-white/5 border-l-2 ${borderAccent}`
                : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03] border-l-2 border-transparent'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        {renderTab()}
      </div>
    </div>
  );
};
