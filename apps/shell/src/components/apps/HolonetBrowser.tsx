import React, { useState } from 'react';
import { useSystemState } from '../../store/systemStore';
import { playSound } from '../../utils/audio';
import { Globe, ArrowLeft, ArrowRight, RotateCw, Plus, X, Search, Terminal, Radio } from 'lucide-react';
import * as Icons from 'lucide-react';

interface BrowserTab {
  id: string;
  title: string;
  url: string;
  contentKey: 'neural-net' | 'github-core' | 'synth-radio' | 'custom';
}

export const HolonetBrowser: React.FC = () => {
  const state = useSystemState();

  const getIcon = (iconName: string, className: string = "w-4 h-4") => {
    const IconComponent = (Icons as any)[iconName];
    if (!IconComponent) return <Globe className={className} />;
    return <IconComponent className={className} />;
  };
  
  // Custom Browser tabs list
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: 'tab-1', title: 'Start Page', url: 'aether://start', contentKey: 'neural-net' },
    { id: 'tab-2', title: 'GitHub Local', url: 'aether://github.local/aether-os', contentKey: 'github-core' },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');
  const [inputUrl, setInputUrl] = useState('aether://start');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<string | null>(null);



  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  const handleTabChange = (id: string) => {
    playSound.click();
    setActiveTabId(id);
    const targetTab = tabs.find(t => t.id === id);
    if (targetTab) setInputUrl(targetTab.url);
  };

  const handleNewTab = () => {
    playSound.click();
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: 'Blank Tab',
      url: 'aether://search',
      contentKey: 'synth-radio'
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
    setInputUrl(newTab.url);
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // keep at least one tab
    
    playSound.click();
    const filtered = tabs.filter(t => t.id !== id);
    setTabs(filtered);
    if (activeTabId === id) {
      setActiveTabId(filtered[0].id);
      setInputUrl(filtered[0].url);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playSound.click();
    
    const urlLower = inputUrl.toLowerCase().trim();
    let contentKey: BrowserTab['contentKey'] = 'custom';
    let title = 'Web Page';

    if (urlLower.includes('news') || urlLower.includes('hub') || urlLower.includes('start')) {
      contentKey = 'neural-net';
      title = 'Start Page';
    } else if (urlLower.includes('git') || urlLower.includes('local')) {
      contentKey = 'github-core';
      title = 'GitHub Local';
    } else if (urlLower.includes('synth') || urlLower.includes('radio') || urlLower.includes('search')) {
      contentKey = 'synth-radio';
      title = 'Sandbox Search';
    }

    setTabs(prev => prev.map(t => {
      if (t.id === activeTabId) {
        return { ...t, title, url: inputUrl, contentKey };
      }
      return t;
    }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    playSound.success();
    const queries: { [key: string]: string } = {
      'quantum': 'Search Result: Local sandboxing is active. Core nodes mounted at memory segment 0x7F.',
      'aether': 'Search Result: AETHER v3.5 workspace environment loaded under secure shell policies.',
      'theme': 'Search Result: System color palette configured. Active themes: Linear Blue, Royal Purple, Emerald Green, Amber Gold.',
      'default': `Search Result: No direct matches found for "${searchQuery}". Local sandbox registry updated.`
    };

    const normQuery = searchQuery.toLowerCase();
    const matched = Object.keys(queries).find(k => normQuery.includes(k));
    setSearchResult(queries[matched || 'default']);
  };

  const textTheme = 
    state.theme === 'purple' ? 'text-purple-400' :
    state.theme === 'green' ? 'text-emerald-400' :
    state.theme === 'orange' ? 'text-orange-400' :
    'text-cyan-400';
  return (
    <div className={`flex-1 flex flex-col bg-[#07090c]/90 text-xs font-mono h-full relative theme-${state.theme}`}>
      
      {/* Browser Tabs header */}
      <div className="flex items-end bg-[#050608] border-b border-white/5 pr-4 select-none">
        <div className="flex items-center overflow-x-auto scrollbar-none flex-1 max-w-[90%]">
          {tabs.map((tab) => {
            const isTabActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 border-r border-white/5 flex items-center space-x-2 cursor-pointer transition max-w-[150px] truncate ${
                  isTabActive ? 'bg-[#07090c] text-white border-t border-t-current' : 'text-white/40 hover:text-white/80'
                }`}
              >
                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate font-semibold text-[10px] uppercase tracking-wide">{tab.title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 rounded hover:bg-white/10 text-white/30 hover:text-white transition flex-shrink-0"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        
        {/* New Tab Button */}
        <button
          onClick={handleNewTab}
          className="p-1 rounded hover:bg-white/5 text-white/40 hover:text-white transition ml-2 mb-1.5"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation Tools Address bar */}
      <div className="p-2.5 bg-[#090b0e] border-b border-white/5 flex items-center space-x-2">
        <div className="flex items-center space-x-1.5 text-white/40">
          <button className="p-1 rounded hover:bg-white/5 transition hover:text-white disabled:opacity-30" disabled>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 rounded hover:bg-white/5 transition hover:text-white disabled:opacity-30" disabled>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => { playSound.click(); }}
            className="p-1 rounded hover:bg-white/5 transition hover:text-white"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* URL Input Form */}
        <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center relative select-text">
          <Globe className="w-3.5 h-3.5 text-white/20 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="w-full bg-[#050608] border border-white/10 rounded-full pl-9 pr-4 py-1.5 text-white outline-none focus:border-current focus:ring-1 focus:ring-current text-xs uppercase animate-none"
          />
        </form>
      </div>

      {/* Webview Content Canvas simulation */}
      <div className="flex-1 overflow-y-auto bg-[#07080a]/40 p-5 select-text leading-relaxed">
        
        {activeTab.contentKey === 'neural-net' && (
          /* Site 1: macOS Safari-style Start Page */
          <div className="space-y-8 max-w-2xl mx-auto py-6 font-sans">
            <div className="flex flex-col items-center justify-center text-center space-y-6 pt-2">
              <div className="flex items-center space-x-2 text-white/90">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <Globe className={`w-8 h-8 ${textTheme}`} />
                </div>
                <span className="text-xl font-bold tracking-tight uppercase">Aether Browser</span>
              </div>
              <form onSubmit={handleSearchSubmit} className="w-full max-w-lg relative select-text">
                <Search className="w-4 h-4 text-white/30 absolute left-4 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search or enter website name..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-full py-3.5 pl-11 pr-5 text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-xs shadow-lg font-sans transition-all duration-300"
                />
              </form>
            </div>

            {/* Favorites Grid */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[10px] text-white/30 uppercase tracking-widest pl-1 font-bold">Favorites</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {[
                  { label: 'GitHub', icon: 'GitPullRequest', url: 'https://github.com' },
                  { label: 'YouTube', icon: 'Tv', url: 'https://youtube.com' },
                  { label: 'Dribbble', icon: 'Layout', url: 'https://dribbble.com' },
                  { label: 'Figma', icon: 'PenTool', url: 'https://figma.com' },
                  { label: 'Spotify', icon: 'Music', url: 'https://spotify.com' },
                  { label: 'Aether Dev', icon: 'Code', url: 'aether://github.local/aether-os' }
                ].map((fav, idx) => (
                  <a
                    key={idx}
                    href={fav.url}
                    onClick={(e) => {
                      if (fav.url.startsWith('aether://')) {
                        e.preventDefault();
                        setInputUrl(fav.url);
                        handleUrlSubmit(e);
                      }
                    }}
                    target="_blank"
                    rel="noreferrer"
                    className="flex flex-col items-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.08] hover:border-white/10 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group"
                  >
                    <div className="p-2.5 rounded-xl bg-white/[0.03] text-white/50 group-hover:text-white transition duration-300">
                      {getIcon(fav.icon, "w-5 h-5")}
                    </div>
                    <span className="text-[9px] text-white/40 group-hover:text-white/80 font-medium tracking-wide mt-2">{fav.label}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Privacy Report & Siri Suggestions Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Privacy Report widget */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Privacy Report</h4>
                  <p className="text-lg font-bold text-emerald-400 tracking-tight">142 Trackers Blocked</p>
                  <p className="text-[10px] text-white/40 leading-normal">Aether Shield actively prevented data profiling across all local nodes.</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Icons.ShieldAlert className="w-8 h-8 stroke-[1.2]" />
                </div>
              </div>
              
              {/* Siri suggestions widget */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Siri Suggestions</h4>
                  <p className="text-xs font-bold text-white uppercase hover:underline cursor-pointer">The Art of Cybernetic OS Design</p>
                  <p className="text-[10px] text-white/40 leading-normal">Explore spatial depth overlays, glass shaders, and dynamic shadows.</p>
                </div>
                <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Icons.Compass className="w-8 h-8 stroke-[1.2] animate-spin" style={{ animationDuration: '20s' }} />
                </div>
              </div>
            </div>

            {/* Reading List Carousel */}
            <div className="space-y-3 pt-2">
              <h3 className="text-[10px] text-white/30 uppercase tracking-widest pl-1 font-bold">Reading List</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[
                  { title: 'Micro-animations & LERP tracking', desc: 'How to build smooth, fluid custom cursor trails in React using spring physics.', tag: 'UX DESIGN' },
                  { title: 'The power of backdrop-filter blur', desc: 'An audit of CSS performance when compositing overlapping translucent materials.', tag: 'PERFORMANCE' }
                ].map((article, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2 hover:bg-white/[0.04] transition-colors cursor-pointer group"
                  >
                    <span className="text-[8px] font-bold uppercase tracking-widest text-cyan-400">{article.tag}</span>
                    <h4 className="text-[11px] font-bold text-white/90 group-hover:text-white uppercase tracking-wide">{article.title}</h4>
                    <p className="text-[10px] text-white/50 leading-relaxed">{article.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab.contentKey === 'github-core' && (
          /* Site 2: GitHub Local */
          <div className="max-w-3xl mx-auto space-y-5 py-4 select-none">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-current" />
                <span className="text-base font-bold text-white">git.local / aethercorp / aether-os</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px]">
                PUBLIC_REPO
              </span>
            </div>

            {/* Commit Log */}
            <div className="border border-white/5 bg-[#0a0c10]/40 rounded divide-y divide-white/5 font-mono text-[11px]">
              <div className="p-3 bg-[#090b0e] text-white/50 text-[10px] font-bold uppercase select-none">
                Recent Commit Operations
              </div>
              
              <div className="p-3 hover:bg-white/5 flex justify-between">
                <div className="space-y-0.5">
                  <p className="text-white font-bold">feat: integrate WebAudio procedural synthesizer framework</p>
                  <p className="text-white/40 text-[9px]">Authored by Developer // 2 hours ago</p>
                </div>
                <span className={`text-[10px] font-semibold ${textTheme}`}>ae711cb</span>
              </div>

              <div className="p-3 hover:bg-white/5 flex justify-between">
                <div className="space-y-0.5">
                  <p className="text-white font-bold">fix: resolve spatial drag resize multi-window telemetry overlap</p>
                  <p className="text-white/40 text-[9px]">Authored by Developer // 6 hours ago</p>
                </div>
                <span className={`text-[10px] font-semibold ${textTheme}`}>9fa410b</span>
              </div>

              <div className="p-3 hover:bg-white/5 flex justify-between">
                <div className="space-y-0.5">
                  <p className="text-white font-bold">chore: compile base VFS folder trees in localStorage</p>
                  <p className="text-white/40 text-[9px]">Authored by SystemCore // 1 day ago</p>
                </div>
                <span className={`text-[10px] font-semibold ${textTheme}`}>3c55de1</span>
              </div>
            </div>
          </div>
        )}

        {activeTab.contentKey === 'synth-radio' && (
          /* Site 3: Sandbox Search Hub */
          <div className="max-w-md mx-auto space-y-6 py-6 text-center select-none">
            <div className="space-y-1.5 flex flex-col items-center">
              <div className="p-3 rounded-full border bg-white/5 border-white/10 mb-2">
                <Radio className={`w-8 h-8 ${textTheme} animate-pulse`} />
              </div>
              <h2 className="text-lg font-bold text-white uppercase tracking-wider">SANDBOX SEARCH</h2>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Search local indices and diagnostics</p>
            </div>

            <form onSubmit={handleSearchSubmit} className="flex space-x-2 relative select-text">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Query keyword (e.g. quantum, aether)..."
                className="flex-1 bg-black/40 border border-white/10 rounded px-3 py-2 text-white outline-none focus:border-current focus:ring-1 focus:ring-current uppercase"
              />
              <button
                type="submit"
                className={`px-4 py-2 border rounded text-black bg-current hover:opacity-90 font-bold transition flex items-center space-x-1 ${textTheme}`}
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Results display panel */}
            {searchResult && (
              <div className="border border-white/5 bg-[#0a0c10]/40 rounded p-4 text-left font-mono text-[11px] leading-relaxed relative animate-fadeIn">
                <p className="text-gray-300 whitespace-pre-wrap">{searchResult}</p>
                <button
                  onClick={() => setSearchResult(null)}
                  className="absolute top-2 right-2 text-white/30 hover:text-white transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab.contentKey === 'custom' && (
          /* Custom site placeholder fallback */
          <div className="h-full flex flex-col items-center justify-center text-white/30 py-16 space-y-4">
            <Globe className="w-16 h-16 stroke-[1] animate-spin" style={{ animationDuration: '6s' }} />
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold text-white uppercase">SANDBOX ADDR</h3>
              <p className="text-[10px] uppercase tracking-wider text-white/40">Connection to remote hosts is restricted inside this simulated environment.</p>
              <p className="text-[9px] font-mono text-amber-500/80 uppercase">Navigate to aether://news.hub or search topics above.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
